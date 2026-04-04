import requests
from bs4 import BeautifulSoup


def check_twitter(title):
    try:
        query = title.replace(" ", "%20")
        url = f"https://twitter.com/search?q={query}&src=typed_query"

        headers = {
            "User-Agent": "Mozilla/5.0"
        }

        response = requests.get(url, headers=headers)

        # crude signal: page length = activity
        content_length = len(response.text)

        if content_length > 200000:
            return "HIGH ACTIVITY"
        elif content_length > 100000:
            return "MODERATE ACTIVITY"
        else:
            return "LOW ACTIVITY"

    except Exception as e:
        print("Twitter check error:", e)
        return "UNKNOWN"