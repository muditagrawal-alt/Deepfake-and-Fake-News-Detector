import requests
from bs4 import BeautifulSoup
from urllib.parse import quote


def verify_youtube(query):
    try:
        search_url = f"https://duckduckgo.com/html/?q={quote('site:youtube.com ' + query)}"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(search_url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")

        results = []
        links = soup.find_all("a", class_="result__a")

        for link in links[:5]:
            title = link.get_text(strip=True)
            href = link.get("href", "")
            if "youtube" in href.lower():
                results.append({
                    "title": title,
                    "url": href,
                    "score": 1.0
                })

        signal = "NONE"
        if len(results) >= 3:
            signal = "STRONG"
        elif len(results) > 0:
            signal = "WEAK"

        return {
            "platform": "youtube",
            "query": query,
            "num_results": len(results),
            "matches": results,
            "signal": signal
        }

    except Exception as e:
        return {
            "platform": "youtube",
            "query": query,
            "num_results": 0,
            "matches": [],
            "signal": "ERROR",
            "error": str(e)
        }