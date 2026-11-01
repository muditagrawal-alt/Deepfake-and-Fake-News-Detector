"""
Traffic, Jitter & High-Concurrency Load Testing Suite (Traffic J Tests).

Simulates high-traffic scenarios across Veritas endpoints:
- Burst traffic testing
- Concurrent worker pools
- Latency percentiles (min, p50, p90, p95, p99, max)
- Latency Jitter (standard deviation and successive request delta)
- Throughput (RPS)
- Cache hit ratio under repeated requests
"""
import asyncio
import json
import math
import os
import sys
import time
from pathlib import Path
import httpx

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
os.chdir(ROOT / "backend")

# Configure environment for high traffic testing
os.environ["RATE_LIMIT_PER_IP"] = "10000/minute"
os.environ["BACKEND_TOKEN_SECRET"] = "0123456789abcdef0123456789abcdef0123456789abcdef"
os.environ["BYOK_ENCRYPTION_KEY"] = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="

from detector.accounts import init_store
from detector.config import get_settings
from detector.main import app
from tests.test_whitebox_traffic import make_test_token


async def run_traffic_load_test(
    concurrency: int = 50,
    total_requests: int = 200,
    endpoint: str = "/metrics",
    use_auth: bool = False,
    method: str = "GET",
    payload: dict = None,
):
    print(f"\n{'='*70}")
    print(f"TRAFFIC J-TEST: {method} {endpoint}")
    print(f"Concurrency: {concurrency} workers | Total Requests: {total_requests}")
    print(f"{'='*70}")

    settings = get_settings()
    init_store(settings)
    auth_header = {"Authorization": f"Bearer {make_test_token()}"} if use_auth else {}

    transport = httpx.ASGITransport(app=app)
    latencies: list[float] = []
    status_codes: dict[int, int] = {}
    cache_headers: dict[str, int] = {"HIT": 0, "MISS": 0, "NONE": 0}
    sem = asyncio.Semaphore(concurrency)

    async with httpx.AsyncClient(transport=transport, base_url="http://testserver", timeout=30.0) as client:
        async def make_request(req_id: int):
            async with sem:
                t0 = time.perf_counter()
                headers = dict(auth_header)
                headers["Accept-Encoding"] = "gzip"
                try:
                    if method == "GET":
                        resp = await client.get(endpoint, headers=headers)
                    else:
                        resp = await client.post(endpoint, json=payload, headers=headers)
                    dur_ms = (time.perf_counter() - t0) * 1000.0
                    status = resp.status_code
                    xcache = resp.headers.get("X-Cache", "NONE").upper()
                except Exception as exc:
                    dur_ms = (time.perf_counter() - t0) * 1000.0
                    status = 599
                    xcache = "ERROR"
                return req_id, status, dur_ms, xcache

        wall_start = time.perf_counter()
        tasks = [make_request(i) for i in range(total_requests)]
        results = await asyncio.gather(*tasks)
        total_wall_time = time.perf_counter() - wall_start

    for _, status, dur, xcache in results:
        latencies.append(dur)
        status_codes[status] = status_codes.get(status, 0) + 1
        cache_headers[xcache] = cache_headers.get(xcache, 0) + 1

    latencies.sort()
    n = len(latencies)
    min_lat = latencies[0]
    max_lat = latencies[-1]
    mean_lat = sum(latencies) / n
    p50 = latencies[int(n * 0.50)]
    p90 = latencies[int(n * 0.90)]
    p95 = latencies[int(n * 0.95)]
    p99 = latencies[min(int(n * 0.99), n - 1)]

    # Compute Statistical Variance & Jitter
    variance = sum((x - mean_lat) ** 2 for x in latencies) / n
    std_dev = math.sqrt(variance)
    # Jitter as mean successive latency difference
    jitter = sum(abs(latencies[i] - latencies[i - 1]) for i in range(1, n)) / (n - 1) if n > 1 else 0.0
    rps = total_requests / total_wall_time

    print(f"Total Completed:   {n}/{total_requests} in {total_wall_time:.2f}s")
    print(f"Throughput:        {rps:.1f} Requests/Sec")
    print(f"Status Codes:      {dict(status_codes)}")
    print(f"Latency Min:       {min_lat:.2f} ms")
    print(f"Latency p50:       {p50:.2f} ms")
    print(f"Latency p90:       {p90:.2f} ms")
    print(f"Latency p95:       {p95:.2f} ms")
    print(f"Latency p99:       {p99:.2f} ms")
    print(f"Latency Max:       {max_lat:.2f} ms")
    print(f"Std Deviation:     {std_dev:.2f} ms")
    print(f"Traffic Jitter:    {jitter:.2f} ms")
    print(f"Cache Performance: {dict(cache_headers)}")

    return {
        "endpoint": endpoint,
        "concurrency": concurrency,
        "total_requests": total_requests,
        "wall_time_s": round(total_wall_time, 3),
        "rps": round(rps, 1),
        "status_codes": status_codes,
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
        "cache": cache_headers,
    }


async def main():
    print("STARTING FULL TRAFFIC J-TEST SUITE ON VERITAS BACKEND")
    reports = []

    # Test 1: Light Traffic - Baseline Health (20 concurrent, 100 requests)
    r1 = await run_traffic_load_test(
        concurrency=20,
        total_requests=100,
        endpoint="/health",
        method="GET"
    )
    reports.append(r1)

    # Test 2: High Traffic Burst - Metrics & Telemetry (50 concurrent, 250 requests)
    r2 = await run_traffic_load_test(
        concurrency=50,
        total_requests=250,
        endpoint="/metrics",
        method="GET"
    )
    reports.append(r2)

    # Test 3: Heavy Traffic Spike - Service Card & Docs (100 concurrent, 500 requests)
    r3 = await run_traffic_load_test(
        concurrency=100,
        total_requests=500,
        endpoint="/",
        method="GET"
    )
    reports.append(r3)

    # Test 4: Authenticated Endpoint Traffic - Account Status (40 concurrent, 200 requests)
    r4 = await run_traffic_load_test(
        concurrency=40,
        total_requests=200,
        endpoint="/account",
        use_auth=True,
        method="GET"
    )
    reports.append(r4)

    # Test 5: Cache & Single-Flight Coalescing Test under High Traffic (30 concurrent, 90 requests)
    # Using cached / repeated news URL to verify sub-5ms response under traffic
    mock_url = "https://www.reuters.com/business/energy/india-crude-oil-supplies-secured"
    # Prime cache first
    from detector.cache import response_cache
    from detector.schemas import AnalysisResult, Provenance
    primed_res = AnalysisResult(
        id="traffic_test_cached_entry",
        modality="news",
        verdict="LIKELY_REAL",
        confidence=0.95,
        summary="India crude oil supplies secured via verified long-term delivery contracts.",
        reasoning="Independent wire reporting confirms the Ministry of Petroleum dispatch.",
        provenance=Provenance(provider="gemini", model="gemini-3.5-flash-lite")
    )
    await response_cache.set(f"news:{mock_url.lower()}", primed_res, ttl=3600)

    r5 = await run_traffic_load_test(
        concurrency=30,
        total_requests=90,
        endpoint="/analyze/news",
        use_auth=True,
        method="POST",
        payload={"url": mock_url}
    )
    reports.append(r5)

    out_file = ROOT / "research" / "results" / "traffic_benchmark_report.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w") as f:
        json.dump(reports, f, indent=2)

    print(f"\n{'='*70}")
    print(f"TRAFFIC J-TEST SUMMARY SAVED TO: {out_file}")
    print(f"{'='*70}")


if __name__ == "__main__":
    asyncio.run(main())

