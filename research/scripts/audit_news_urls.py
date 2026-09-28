"""
Audit the in-house news benchmark URLs (finding F11).

For every item: live HTTP status, whether the backend's article extractor gets
the text, and whether the Internet Archive holds any snapshot. Writes
research/results/news_url_audit.csv and a per-label summary.

Run with the backend venv (needs the extractor):
  backend/.venv/bin/python research/scripts/audit_news_urls.py
"""
import asyncio
import csv
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import EVAL, ROOT, read_rows  # noqa: E402
from detector.forensics.article import extract_article  # noqa: E402

OUT = ROOT / "research" / "results" / "news_url_audit.csv"
SUMMARY = ROOT / "research" / "results" / "news_url_audit_summary.csv"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


async def http_status(client, url):
    try:
        r = await client.get(url)
        return str(r.status_code), str(r.url)
    except Exception as exc:
        return type(exc).__name__, ""


async def wayback(client, url, sem):
    async with sem:
        for _ in range(3):
            try:
                r = await client.get("https://archive.org/wayback/available", params={"url": url})
                snap = r.json().get("archived_snapshots", {}).get("closest") or {}
                return snap.get("timestamp") or "", snap.get("status") or ""
            except Exception:
                await asyncio.sleep(3)
        return "ERROR", ""


async def main():
    rows = read_rows(EVAL / "news" / "metadata.csv")
    sem = asyncio.Semaphore(4)
    async with httpx.AsyncClient(follow_redirects=True, timeout=25, headers={"User-Agent": UA}) as web, \
            httpx.AsyncClient(timeout=40) as ia:
        live = await asyncio.gather(*[http_status(web, r["url"]) for r in rows])
        extracted = await asyncio.gather(*[extract_article(r["url"]) for r in rows])
        archived = await asyncio.gather(*[wayback(ia, r["url"], sem) for r in rows])

    out = []
    for r, (status, final), (ex, _text), (ts, snap_status) in zip(rows, live, extracted, archived):
        out.append({
            "id": r["id"], "label": r["label"], "source_type": r.get("source_type", ""),
            "domain": httpx.URL(r["url"]).host.removeprefix("www."),
            "http_status": status, "final_url": final,
            "extraction_status": ex.status, "text_chars": ex.text_chars,
            "wayback_timestamp": ts, "wayback_status": snap_status,
            "url": r["url"],
        })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(out[0])); w.writeheader(); w.writerows(out)

    summary = []
    for label in ("REAL", "FAKE"):
        sub = [o for o in out if o["label"] == label]
        st = Counter(o["http_status"] for o in sub)
        summary.append({
            "label": label, "n": len(sub),
            "http_200": st.get("200", 0), "http_404": st.get("404", 0),
            "http_401_403": st.get("401", 0) + st.get("403", 0),
            "http_other": len(sub) - st.get("200", 0) - st.get("404", 0) - st.get("401", 0) - st.get("403", 0),
            "extraction_success": sum(o["extraction_status"] == "SUCCESS" for o in sub),
            "wayback_archived": sum(bool(o["wayback_timestamp"]) and o["wayback_timestamp"] != "ERROR" for o in sub),
            "distinct_domains": len({o["domain"] for o in sub}),
            "checked_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        })
    with open(SUMMARY, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(summary[0])); w.writeheader(); w.writerows(summary)
    for s in summary:
        print(s)
    print(f"-> {OUT}\n-> {SUMMARY}")


if __name__ == "__main__":
    asyncio.run(main())
