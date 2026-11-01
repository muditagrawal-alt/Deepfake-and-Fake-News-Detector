"""
Website Traffic, Concurrency & Jitter Benchmark Suite.
Tests the Next.js production web server under realistic high-traffic scenarios:
- Landing Page (/) under concurrent load
- Architecture Page (/architecture)
- Tech Stack Showcase (/tech-stack)
- Static Assets (/icon.svg)
- Multi-route mixed traffic simulation
Measures RPS, p50/p90/p95/p99 latency, jitter, and HTTP status distributions.
"""
import asyncio
import json
import math
import os
import random
import sys
import time
from pathlib import Path
import httpx

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3847")
ROOT = Path(__file__).resolve().parents[2]


async def benchmark_route(
    name: str,
    path: str,
    concurrency: int = 50,
    total_requests: int = 250,
    headers: dict = None,
):
    print(f"\n{'='*70}")
    print(f"WEBSITE TRAFFIC TEST: {name} ({path})")
    print(f"Concurrency: {concurrency} concurrent visitors | Total Requests: {total_requests}")
    print(f"{'='*70}")

    url = f"{FRONTEND_URL}{path}"
    req_headers = {"Accept-Encoding": "gzip, deflate, br", "User-Agent": "VeritasTrafficBot/1.0"}
    if headers:
        req_headers.update(headers)

    latencies: list[float] = []
    status_codes: dict[int, int] = {}
    content_lengths: list[int] = []
    encodings: dict[str, int] = {}
    sem = asyncio.Semaphore(concurrency)

    # Use connection pooling
    limits = httpx.Limits(max_keepalive_connections=concurrency, max_connections=concurrency + 10)
    async with httpx.AsyncClient(limits=limits, timeout=15.0) as client:
        async def fetch(req_id: int):
            async with sem:
                t0 = time.perf_counter()
                try:
                    resp = await client.get(url, headers=req_headers)
                    dur_ms = (time.perf_counter() - t0) * 1000.0
                    status = resp.status_code
                    length = len(resp.content)
                    enc = resp.headers.get("content-encoding", "none")
                except Exception as exc:
                    dur_ms = (time.perf_counter() - t0) * 1000.0
                    status = 599
                    length = 0
                    enc = "error"
                return req_id, status, dur_ms, length, enc

        wall_start = time.perf_counter()
        tasks = [fetch(i) for i in range(total_requests)]
        results = await asyncio.gather(*tasks)
        total_wall_time = time.perf_counter() - wall_start

    for _, status, dur, length, enc in results:
        latencies.append(dur)
        status_codes[status] = status_codes.get(status, 0) + 1
        content_lengths.append(length)
        encodings[enc] = encodings.get(enc, 0) + 1

    latencies.sort()
    n = len(latencies)
    min_lat = latencies[0]
    max_lat = latencies[-1]
    mean_lat = sum(latencies) / n
    p50 = latencies[int(n * 0.50)]
    p90 = latencies[int(n * 0.90)]
    p95 = latencies[int(n * 0.95)]
    p99 = latencies[min(int(n * 0.99), n - 1)]

    variance = sum((x - mean_lat) ** 2 for x in latencies) / n
    std_dev = math.sqrt(variance)
    jitter = sum(abs(latencies[i] - latencies[i - 1]) for i in range(1, n)) / (n - 1) if n > 1 else 0.0
    rps = total_requests / total_wall_time
    avg_len_kb = (sum(content_lengths) / n) / 1024.0

    print(f"Total Requests:     {n}/{total_requests} in {total_wall_time:.2f}s")
    print(f"Throughput:         {rps:.1f} Requests/Sec")
    print(f"Status Codes:       {dict(status_codes)}")
    print(f"Content Encodings:  {dict(encodings)}")
    print(f"Average Payload:    {avg_len_kb:.1f} KB")
    print(f"Latency Min:        {min_lat:.2f} ms")
    print(f"Latency p50:        {p50:.2f} ms")
    print(f"Latency p90:        {p90:.2f} ms")
    print(f"Latency p95:        {p95:.2f} ms")
    print(f"Latency p99:        {p99:.2f} ms")
    print(f"Latency Max:        {max_lat:.2f} ms")
    print(f"Std Deviation:      {std_dev:.2f} ms")
    print(f"Traffic Jitter:     {jitter:.2f} ms")

    return {
        "name": name,
        "path": path,
        "concurrency": concurrency,
        "total_requests": total_requests,
        "wall_time_s": round(total_wall_time, 3),
        "rps": round(rps, 1),
        "status_codes": status_codes,
        "avg_payload_kb": round(avg_len_kb, 1),
        "encodings": encodings,
        "latency_ms": {
            "min": round(min_lat, 2),
            "p50": round(p50, 2),
            "p90": round(p90, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
            "max": round(max_lat, 2),
            "mean": round(mean_lat, 2),
            "std_dev": round(std_dev, 2),
            "jitter": round(jitter, 2),
        },
    }


async def benchmark_mixed_traffic(concurrency: int = 60, total_requests: int = 300):
    """Simulates mixed real-world traffic where users navigate across different pages simultaneously."""
    print(f"\n{'='*70}")
    print(f"WEBSITE MIXED TRAFFIC SIMULATION (Real-World User Sessions)")
    print(f"Concurrency: {concurrency} users | Total Requests: {total_requests}")
    print(f"{'='*70}")

    routes = ["/", "/architecture", "/tech-stack", "/about", "/icon.svg"]
    weights = [0.45, 0.20, 0.15, 0.10, 0.10]  # Realistic traffic weighting

    sem = asyncio.Semaphore(concurrency)
    limits = httpx.Limits(max_keepalive_connections=concurrency, max_connections=concurrency + 10)
    latencies: list[float] = []
    status_codes: dict[int, int] = {}

    async with httpx.AsyncClient(limits=limits, timeout=15.0) as client:
        async def user_session(req_id: int):
            chosen_route = random.choices(routes, weights=weights)[0]
            url = f"{FRONTEND_URL}{chosen_route}"
            async with sem:
                t0 = time.perf_counter()
                try:
                    resp = await client.get(url, headers={"Accept-Encoding": "gzip, deflate, br"})
                    dur_ms = (time.perf_counter() - t0) * 1000.0
                    status = resp.status_code
                except Exception:
                    dur_ms = (time.perf_counter() - t0) * 1000.0
                    status = 599
                return status, dur_ms

        wall_start = time.perf_counter()
        tasks = [user_session(i) for i in range(total_requests)]
        results = await asyncio.gather(*tasks)
        total_wall_time = time.perf_counter() - wall_start

    for status, dur in results:
        latencies.append(dur)
        status_codes[status] = status_codes.get(status, 0) + 1

    latencies.sort()
    n = len(latencies)
    mean_lat = sum(latencies) / n
    p50 = latencies[int(n * 0.50)]
    p95 = latencies[int(n * 0.95)]
    p99 = latencies[min(int(n * 0.99), n - 1)]
    rps = total_requests / total_wall_time
    jitter = sum(abs(latencies[i] - latencies[i - 1]) for i in range(1, n)) / (n - 1) if n > 1 else 0.0

    print(f"Total Requests:     {n}/{total_requests} in {total_wall_time:.2f}s")
    print(f"Throughput:         {rps:.1f} Requests/Sec")
    print(f"Status Codes:       {dict(status_codes)}")
    print(f"Latency p50:        {p50:.2f} ms")
    print(f"Latency p95:        {p95:.2f} ms")
    print(f"Latency p99:        {p99:.2f} ms")
    print(f"Traffic Jitter:     {jitter:.2f} ms")

    return {
        "name": "Mixed Real-World User Sessions",
        "concurrency": concurrency,
        "total_requests": total_requests,
        "wall_time_s": round(total_wall_time, 3),
        "rps": round(rps, 1),
        "status_codes": status_codes,
        "latency_ms": {
            "p50": round(p50, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
            "mean": round(mean_lat, 2),
            "jitter": round(jitter, 2),
        },
    }


async def main():
    print("STARTING FULL WEBSITE TRAFFIC & JITTER TEST SUITE")
    reports = []

    # 1. Landing Page
    r1 = await benchmark_route("Landing Page", "/", concurrency=50, total_requests=200)
    reports.append(r1)

    # 2. Architecture 3D Interactive DAG
    r2 = await benchmark_route("Architecture Page", "/architecture", concurrency=40, total_requests=150)
    reports.append(r2)

    # 3. Tech Stack Showcase
    r3 = await benchmark_route("Tech Stack Page", "/tech-stack", concurrency=40, total_requests=150)
    reports.append(r3)

    # 4. Static Asset (icon.svg)
    r4 = await benchmark_route("Static Asset", "/icon.svg", concurrency=80, total_requests=400)
    reports.append(r4)

    # 5. Mixed Real-World Traffic
    r5 = await benchmark_mixed_traffic(concurrency=60, total_requests=300)
    reports.append(r5)

    out_file = ROOT / "research" / "results" / "website_traffic_benchmark.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w") as f:
        json.dump(reports, f, indent=2)

    print(f"\n{'='*70}")
    print(f"WEBSITE TRAFFIC BENCHMARK SAVED TO: {out_file}")
    print(f"{'='*70}")


if __name__ == "__main__":
    asyncio.run(main())
