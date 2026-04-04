import requests
from bs4 import BeautifulSoup


def verify_news(title):
    try:
        query = title.replace(" ", "+")
        url = f"https://duckduckgo.com/html/?q={query}"

        headers = {
            "User-Agent": "Mozilla/5.0"
        }

        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, "html.parser")

        results = soup.find_all("a", class_="result__a")

        sources = [r.text for r in results[:5]]

        return sources

    except Exception as e:
        print("Web verification error:", e)
        return []