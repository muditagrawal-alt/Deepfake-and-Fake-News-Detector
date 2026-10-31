"""
50-Item News Benchmark (25 Real, 25 Fake) to test Veritas detection logic.
Runs all 50 items, collects detailed verdicts, evidence, queries, and failure modes.
"""
import asyncio
import csv
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
os.chdir(ROOT / "backend")
os.environ["PIN_MODEL"] = "true"

from detector.config import get_settings
from detector.pipeline import analyze, analyze_news_text
from detector.services import get_services

TEST_ITEMS = [
    # --- 25 REAL NEWS ---
    {"id": "REAL_01", "type": "url", "url": "https://www.newsonair.gov.in/india-strongly-condemns-remarks-of-pakistani-army-chief-on-potential-nuclear-threat/", "label": "REAL", "category": "diplomacy", "title": "India Condemns Pakistan Army Chief Nuclear Threat"},
    {"id": "REAL_02", "type": "url", "url": "https://www.reuters.com/business/energy/india-says-crude-oil-supplies-secured-no-payment-issues-iran-imports-2026-04-04/", "label": "REAL", "category": "energy", "title": "India Crude Oil Supplies Secured"},
    {"id": "REAL_03", "type": "url", "url": "https://m.economictimes.com/news/new-updates/pakistan-minister-khawaja-asif-says-we-will-take-it-to-kolkata-pushes-false-flag-narrative-after-rajnath-singhs-stern-warning/articleshow/130034148.cms", "label": "REAL", "category": "politics", "title": "Pakistan Minister Khawaja Asif Statement"},
    {"id": "REAL_04", "type": "url", "url": "https://timesofindia.indiatimes.com/city/guwahati/assam-cm-announces-free-lpg-cylinders-amid-election-code-controversy/articleshow/130024513.cms", "label": "REAL", "category": "politics", "title": "Assam CM Free LPG Cylinders"},
    {"id": "REAL_05", "type": "url", "url": "https://timesofindia.indiatimes.com/etimes/trending/no-more-gutkha-spits-on-roads-meet-the-young-innovators-who-have-found-an-innovative-and-bio-friendly-device-for-indias-spitting-problem/articleshow/130038404.cms", "label": "REAL", "category": "technology", "title": "Innovators Bio-Friendly Spittoon Device"},
    {"id": "REAL_06", "type": "url", "url": "https://m.economictimes.com/news/new-updates/india-post-gds-result-2026-2nd-merit-list-likely-to-be-released-this-week-at-indiapostgdsonline-gov-in-check-steps-to-download-state-wise-pdf-details-and-more/articleshow/130035279.cms", "label": "REAL", "category": "education", "title": "India Post GDS Merit List"},
    {"id": "REAL_07", "type": "url", "url": "https://timesofindia.indiatimes.com/city/mumbai/2-women-rescued-from-prostitution-at-spa-in-navi-mumbai-husband-wife-duo-arrested/articleshow/130025148.cms", "label": "REAL", "category": "crime", "title": "Navi Mumbai Spa Rescue Police Operation"},
    {"id": "REAL_08", "type": "url", "url": "https://timesofindia.indiatimes.com/city/chandigarh/five-held-for-grenade-attack-at-bjps-chd-headquarters/articleshow/130026160.cms", "label": "REAL", "category": "crime", "title": "Chandigarh BJP HQ Grenade Attack Arrests"},
    {"id": "REAL_09", "type": "url", "url": "https://m.economictimes.com/news/sports/whose-world-cup-is-it-as-visas-tighten-prices-soar-and-teams-fall-away-the-global-game-feels-increasingly-exclusive/articleshow/130024867.cms", "label": "REAL", "category": "sports", "title": "World Cup Visa and Prices Article"},
    {"id": "REAL_10", "type": "url", "url": "https://timesofindia.indiatimes.com/sports/football/top-stories/fifa-agrees-to-three-month-delay-in-aiff-elections/articleshow/130033702.cms", "label": "REAL", "category": "sports", "title": "FIFA Delay AIFF Elections"},
    {"id": "REAL_11", "type": "url", "url": "https://timesofindia.indiatimes.com/india/jihadi-module-with-links-to-foreign-handlers-andhra-pradesh-police-bust-suspected-isis-linked-network-with-multi-state-links/articleshow/130038924.cms", "label": "REAL", "category": "security", "title": "Andhra Police Terror Module Bust"},
    {"id": "REAL_12", "type": "url", "url": "https://indianexpress.com/article/education/today-news-headlines-for-school-assembly-6-april-2026-india-lpg-tanker-crosses-strait-of-hormuz-trump-us-iran-war-ipl-evacuation-10620378/", "label": "REAL", "category": "news_roundup", "title": "Indian Express Morning News Headlines"},
    {"id": "REAL_13", "type": "url", "url": "https://timesofindia.indiatimes.com/india/for-a-very-important-bill-parliament-panel-seeking-public-feedback-on-waqf-amendment-receives-record-9-crore-submissions/articleshow/130037812.cms", "label": "REAL", "category": "governance", "title": "Waqf Amendment Bill Parliamentary Panel"},
    {"id": "REAL_14", "type": "url", "url": "https://indianexpress.com/article/entertainment/bollywood/chetak-screening-bollywood-event-mumbai-10620192/", "label": "REAL", "category": "entertainment", "title": "Chetak Screening Bollywood Event"},
    {"id": "REAL_15", "type": "url", "url": "https://www.bbc.com/news/articles/cj0vn30574no", "label": "REAL", "category": "international", "title": "BBC International Reporting Article"},
    {"id": "REAL_16", "type": "url", "url": "https://www.wionews.com/sports/ipl-2026-why-nitish-rana-and-ruturaj-gaikwad-have-underwhelmed-for-rr-csk-in-ongoing-campaign-130040182", "label": "REAL", "category": "sports", "title": "WION IPL Cricket Campaign Analysis"},
    {"id": "REAL_17", "type": "url", "url": "https://www.aajtak.in/business/utility/story/silver-price-crash-from-highs-market-analysis-1300401", "label": "REAL", "category": "markets", "title": "Aaj Tak Silver Price Market Movement"},
    {"id": "REAL_18", "type": "url", "url": "https://www.ndtv.com/jaipur-news/arrested-driver-who-ran-audi-over-pedestrians-in-jaipur-granted-bail-11346091", "label": "REAL", "category": "legal", "title": "NDTV Jaipur Audi Hit and Run Bail"},
    {"id": "REAL_19", "type": "url", "url": "https://japantoday.com/category/politics/japan-pm-takaichi-keen-on-early-diplomatic-summit", "label": "REAL", "category": "international", "title": "Japan Today PM Takaichi Summit"},
    {"id": "REAL_20", "type": "url", "url": "https://www.nbcnews.com/world/iran/live-blog/live-updates-us-iran-fails-to-reach-accord-13004", "label": "REAL", "category": "diplomacy", "title": "NBC News US Iran Negotiations"},
    {"id": "REAL_21", "type": "url", "url": "https://www.goodreturns.in/news/bengaluru-power-cut-today-residents-complain-scheduled-maintenance-130040192.html", "label": "REAL", "category": "infrastructure", "title": "Bengaluru Scheduled Power Maintenance"},
    {"id": "REAL_22", "type": "url", "url": "https://www.livemint.com/news/world/jd-vance-says-iran-refused-to-commit-on-nuclear-weapons-calls-21-hour-islamabad-ceasefire-talks-breakdown-bad-news-11775959423571.html", "label": "REAL", "category": "geopolitics", "title": "Livemint JD Vance Islamabad Talks"},
    {"id": "REAL_23", "type": "text", "text": "ISRO's Chandrayaan-3 successfully soft-landed on the south pole region of the Moon on August 23, 2023, making India the fourth country to achieve a soft lunar landing and the first near the lunar south pole. The landing site was officially named 'Shiv Shakti Point' by Prime Minister Narendra Modi during his address at ISRO Telemetry Tracking and Command Network in Bengaluru.", "label": "REAL", "category": "science", "title": "Chandrayaan-3 Lunar Landing at Shiv Shakti Point"},
    {"id": "REAL_24", "type": "text", "text": "The Reserve Bank of India's Monetary Policy Committee voted unanimously to keep the policy repo rate unchanged at 6.50 percent, maintaining its policy stance of withdrawal of accommodation to ensure inflation progressively aligns with the target while supporting growth, announced RBI Governor Shaktikanta Das in the bi-monthly monetary policy statement.", "label": "REAL", "category": "economy", "title": "RBI Keeps Repo Rate Unchanged at 6.5 Percent"},
    {"id": "REAL_25", "type": "text", "text": "The World Health Assembly declared the global eradication of smallpox on May 8, 1980, following an intense ten-year global immunization campaign led by the World Health Organization. Smallpox remains the only human infectious disease to date to have been completely eradicated from the wild through global public health cooperation.", "label": "REAL", "category": "health", "title": "WHO Eradication of Smallpox Global Milestone"},

    # --- 25 FAKE NEWS ---
    {"id": "FAKE_01", "type": "url", "url": "https://youtube.com/shorts/wzKrnb7sy3s", "label": "FAKE", "category": "false_context", "title": "Akhilesh Yadav Wore Saffron Turban Replacing Red Cap (False Color Context)"},
    {"id": "FAKE_02", "type": "url", "url": "https://www.theonion.com/no-way-to-prevent-this-says-only-nation-where-this-r-1819576527", "label": "FAKE", "category": "satire", "title": "The Onion: No Way To Prevent This"},
    {"id": "FAKE_03", "type": "url", "url": "https://www.theonion.com/congress-takes-group-of-schoolchildren-hostage-1819576078", "label": "FAKE", "category": "satire", "title": "The Onion: Congress Hostage Crisis"},
    {"id": "FAKE_04", "type": "url", "url": "https://www.theonion.com/study-finds-98-of-u-s-commuters-favor-public-transporta-1819578072", "label": "FAKE", "category": "satire", "title": "The Onion: Commuters Favor Transit"},
    {"id": "FAKE_05", "type": "url", "url": "https://babylonbee.com/news/man-accidentally-starts-thinking-for-himself", "label": "FAKE", "category": "satire", "title": "Babylon Bee: Man Thinks For Himself"},
    {"id": "FAKE_06", "type": "url", "url": "https://babylonbee.com/news/local-man-thinks-he-could-probably-run-country-better", "label": "FAKE", "category": "satire", "title": "Babylon Bee: Man Runs Country"},
    {"id": "FAKE_07", "type": "url", "url": "https://babylonbee.com/news/government-introduces-new-tax-for-existing", "label": "FAKE", "category": "satire", "title": "Babylon Bee: Tax On Existing"},
    {"id": "FAKE_08", "type": "url", "url": "https://babylonbee.com/news/study-shows-98-of-americans-are-now-experts-on-everything", "label": "FAKE", "category": "satire", "title": "Babylon Bee: Americans Experts On Everything"},
    {"id": "FAKE_09", "type": "url", "url": "https://babylonbee.com/news/nation-wonders-if-anyone-actually-reads-terms-and-conditions", "label": "FAKE", "category": "satire", "title": "Babylon Bee: Terms and Conditions"},
    {"id": "FAKE_10", "type": "url", "url": "https://www.theonion.com/area-man-concerned-he-might-be-only-one-not-enjoying-li-1819575974", "label": "FAKE", "category": "satire", "title": "The Onion: Area Man Concern"},
    {"id": "FAKE_11", "type": "url", "url": "https://www.theonion.com/god-answers-prayers-of-paralyzed-little-boy-1819577047", "label": "FAKE", "category": "satire", "title": "The Onion: God Answers Prayers"},
    {"id": "FAKE_12", "type": "url", "url": "https://www.theonion.com/report-majority-of-americans-now-too-dumb-to-realize-th-1819575868", "label": "FAKE", "category": "satire", "title": "The Onion: Majority of Americans Report"},
    {"id": "FAKE_13", "type": "text", "text": "UNESCO has officially declared India's National Anthem, 'Jana Gana Mana', as the best national anthem in the world, praising its poetic cadence, inclusivity, and spiritual message following a worldwide competition of 193 nations evaluated by musical linguists.", "label": "FAKE", "category": "viral_hoax", "title": "UNESCO Declared Indian Anthem Best in the World"},
    {"id": "FAKE_14", "type": "text", "text": "The Reserve Bank of India has announced that all newly printed Rs 2,000 currency notes feature an embedded NGC (Nano GPS Chip) that operates without power. Satellites can pinpoint the exact location and currency volume of these notes even when buried 120 meters underground, eliminating all black money hoards.", "label": "FAKE", "category": "hoax_technology", "title": "Rs 2000 Currency Notes Contain GPS Nano-Chips"},
    {"id": "FAKE_15", "type": "text", "text": "According to senior physicians at Stanford Medical School, drinking a bowl of boiled water infused with eight crushed cloves of garlic cures COVID-19 and destroys coronavirus within 12 hours of ingestion due to allicin's instantaneous virucidal properties.", "label": "FAKE", "category": "medical_misinformation", "title": "Boiled Garlic Water Cures COVID in 12 Hours"},
    {"id": "FAKE_16", "type": "text", "text": "Breaking news footage confirms the Eiffel Tower in Paris has suffered a catastrophic structural collapse after being engulfed in a multi-alarm arson fire ignited by coordinated terrorist operatives on Saturday night, reducing the landmark to molten twisted steel.", "label": "FAKE", "category": "fabricated_disaster", "title": "Eiffel Tower Collapses in Terrorist Fire Attack"},
    {"id": "FAKE_17", "type": "text", "text": "Industrialist Ratan Tata issued an official decree announcing that the Tata Group will completely discontinue all commercial ties with businesses that sell alcoholic beverages, asserting that intoxicating substances cause moral decay and calling on the central government to impose immediate nationwide alcohol prohibition.", "label": "FAKE", "category": "fabricated_statement", "title": "Ratan Tata Demands Nationwide Alcohol Ban"},
    {"id": "FAKE_18", "type": "text", "text": "Investigative reporters in England reveal that iconic Indian playback singer Lata Mangeshkar did not actually pass away in 2022; her death was staged by family handlers to avoid public scrutiny, and she is currently living under an assumed identity in Kensington, London.", "label": "FAKE", "category": "conspiracy_hoax", "title": "Lata Mangeshkar Secretly Alive in London"},
    {"id": "FAKE_19", "type": "text", "text": "The Election Commission of India has launched a new remote digital voting system permitting all registered citizens to cast their binding parliamentary vote in the 2024 General Elections simply by sending an SMS with their Voter ID and preferred party symbol to the toll-free number 1950.", "label": "FAKE", "category": "election_misinformation", "title": "Election Commission Allows Voting Via SMS to 1950"},
    {"id": "FAKE_20", "type": "text", "text": "NASA scientists have issued an urgent global advisory confirming that planet Earth will experience six days of total darkness starting December 16, caused by a massive celestial alignment and a rare cosmic dust storm that will block out 90 percent of solar radiation worldwide.", "label": "FAKE", "category": "cosmic_hoax", "title": "NASA Warns Earth Will Experience 6 Days of Darkness"},
    {"id": "FAKE_21", "type": "text", "text": "United Nations Geological Survey has warned Maharashtra state authorities that an impending magnitude 9.8 earthquake centered off the Konkan coast will strike next Tuesday, triggering a 50-meter tsunami that will permanently submerge the city of Mumbai into the Arabian Sea.", "label": "FAKE", "category": "fabricated_disaster", "title": "UN Warns Mega Earthquake Will Submerge Mumbai Next Week"},
    {"id": "FAKE_22", "type": "text", "text": "A viral medical remedy widely circulating confirms that placing raw onion slices in your socks while sleeping overnight draws out all biological toxins, purifies the bloodstream through foot reflexology points, and provides complete immunity against seasonal influenza and systemic infections.", "label": "FAKE", "category": "health_hoax", "title": "Onions in Socks Draw Out All Toxins and Cure Flu"},
    {"id": "FAKE_23", "type": "text", "text": "The Supreme Court of India passed a landmark penal guideline stating that group administrators and users who forward political WhatsApp messages without prior authorization from the District Cyber Crime Cell will face immediate arrest without bail and mandatory 3 years rigorous imprisonment.", "label": "FAKE", "category": "legal_hoax", "title": "Supreme Court Rules Unregistered WhatsApp Forwards Carry 3 Year Jail"},
    {"id": "FAKE_24", "type": "text", "text": "Congress leader Rahul Gandhi made an absurd campaign speech promising farmers that if his party comes to power, he will construct high-tech machines where 'you put potato in this side and gold will come out from the other side', proving his complete ignorance of scientific reality.", "label": "FAKE", "category": "misleading_spin", "title": "Rahul Gandhi Promised Machine that Turns Potatoes into Gold"},
    {"id": "FAKE_25", "type": "text", "text": "The United States Congress has quietly signed into law a mandatory biometrics bill mandating that all American citizens and legal residents must have an RFID microchip implanted beneath the skin of their right hand by December 2026 or face forfeiture of bank accounts and federal identification.", "label": "FAKE", "category": "conspiracy_hoax", "title": "US Passes Law Mandating Subdermal Microchips for All Citizens"},
]

async def run_single_test(item, services, sem):
    async with sem:
        t0 = time.time()
        try:
            if item["type"] == "url":
                res = await analyze(url=item["url"], services=services)
            else:
                res = await analyze_news_text(item["text"], services, title=item.get("title"))
            dur = time.time() - t0
            
            # Map verdict
            raw_v = res.verdict
            pred = "FAKE" if "FAKE" in raw_v else ("REAL" if "REAL" in raw_v else "UNCERTAIN")
            conf = float(res.confidence)
            correct = (pred == item["label"])
            print(f"[{item['id']}] Done in {dur:.1f}s -> {pred} (truth: {item['label']}) | {item['title'][:45]}", flush=True)
            
            return {
                "id": item["id"],
                "label": item["label"],
                "predicted": pred,
                "raw_verdict": raw_v,
                "correct": correct,
                "confidence": conf,
                "category": item["category"],
                "title": item["title"],
                "input_type": item["type"],
                "target": item.get("url") or item.get("text")[:60],
                "summary": res.summary[:150] if res.summary else "",
                "queries": res.provenance.search_queries if res.provenance else [],
                "n_sources": len(res.evidence) if res.evidence else 0,
                "extraction_status": res.extraction.status if res.extraction else "N/A",
                "duration_s": round(dur, 2),
                "error": None
            }
        except Exception as e:
            dur = time.time() - t0
            return {
                "id": item["id"],
                "label": item["label"],
                "predicted": "ERROR",
                "raw_verdict": "ERROR",
                "correct": False,
                "confidence": 0.0,
                "category": item["category"],
                "title": item["title"],
                "input_type": item["type"],
                "target": item.get("url") or item.get("text")[:60],
                "summary": "",
                "queries": [],
                "n_sources": 0,
                "extraction_status": "EXCEPTION",
                "duration_s": round(dur, 2),
                "error": str(e)
            }

async def main():
    print("=" * 75)
    print("STARTING 50-ITEM REAL & FAKE NEWS BENCHMARK ON VERITAS")
    print(f"Total test items: {len(TEST_ITEMS)} (25 REAL, 25 FAKE)")
    print("=" * 75)
    
    services = get_services()
    sem = asyncio.Semaphore(5)  # run up to 5 concurrent tests
    
    tasks = [run_single_test(item, services, sem) for item in TEST_ITEMS]
    results = await asyncio.gather(*tasks)
    
    # Save results to CSV
    out_dir = ROOT / "research" / "results"
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = sys.argv[1] if len(sys.argv) > 1 else "benchmark_50_news_optimized.csv"
    out_csv = out_dir / filename
    
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "id", "label", "predicted", "raw_verdict", "correct", "confidence",
            "category", "title", "input_type", "extraction_status", "n_sources",
            "duration_s", "summary", "queries", "error", "target"
        ])
        writer.writeheader()
        for r in results:
            writer.writerow(r)
            
    print(f"\nSaved raw results to: {out_csv}\n")
    
    # Performance summary
    total = len(results)
    correct = sum(1 for r in results if r["correct"])
    uncertain = sum(1 for r in results if r["predicted"] == "UNCERTAIN")
    errors = sum(1 for r in results if r["predicted"] == "ERROR")
    
    real_items = [r for r in results if r["label"] == "REAL"]
    fake_items = [r for r in results if r["label"] == "FAKE"]
    
    real_tp = sum(1 for r in real_items if r["predicted"] == "REAL")
    fake_tp = sum(1 for r in fake_items if r["predicted"] == "FAKE")
    
    print("-" * 50)
    print("BENCHMARK METRICS SUMMARY")
    print("-" * 50)
    print(f"Total Items Tested: {total}")
    print(f"Overall Accuracy:   {correct}/{total} ({correct/total*100:.1f}%)")
    print(f"UNCERTAIN Count:    {uncertain} ({uncertain/total*100:.1f}%)")
    print(f"ERROR Count:        {errors} ({errors/total*100:.1f}%)")
    print(f"REAL News Accuracy: {real_tp}/{len(real_items)} ({real_tp/len(real_items)*100:.1f}%)")
    print(f"FAKE News Accuracy: {fake_tp}/{len(fake_items)} ({fake_tp/len(fake_items)*100:.1f}%)")
    
    print("\n" + "=" * 50)
    print("FAILURE MODE BREAKDOWN (Incorrect or Uncertain Items):")
    print("=" * 50)
    failures = [r for r in results if not r["correct"]]
    for f_item in failures:
        print(f"[{f_item['id']}] Truth: {f_item['label']} -> Pred: {f_item['predicted']} ({f_item['confidence']})")
        print(f"  Title: {f_item['title']}")
        print(f"  Category: {f_item['category']} | Extract: {f_item['extraction_status']} | Sources: {f_item['n_sources']}")
        print(f"  Summary: {f_item['summary']}")
        print(f"  Error: {f_item['error']}")
        print()

if __name__ == "__main__":
    asyncio.run(main())
