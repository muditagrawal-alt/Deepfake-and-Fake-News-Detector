from newspaper import Article
from urllib.parse import urlparse, parse_qs, unquote
import requests
from bs4 import BeautifulSoup


def normalize_url(url: str) -> str:
    """
    Convert Google redirect URLs into the actual article URL.
    """
    try:
        parsed = urlparse(url)

        if "google.com" in parsed.netloc and parsed.path == "/url":
            qs = parse_qs(parsed.query)
            if "url" in qs and len(qs["url"]) > 0:
                return unquote(qs["url"][0])

        return url
    except Exception:
        return url


def extract_with_newspaper(url: str):
    article = Article(url)
    article.download()
    article.parse()

    title = (article.title or "").strip()
    text = (article.text or "").strip()

    if title and text:
        return title, text

    return None, None


def extract_with_bs4(url: str):
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Title fallback
    title = ""
    if soup.title and soup.title.text:
        title = soup.title.text.strip()

    # Try common article containers first
    candidates = soup.find_all(["article", "p"])
    paragraphs = []

    for tag in candidates:
        text = tag.get_text(" ", strip=True)
        if text and len(text) > 40:
            paragraphs.append(text)

    full_text = "\n".join(paragraphs).strip()

    if title and full_text:
        return title, full_text

    return None, None


def extract_article(url):
    try:
        clean_url = normalize_url(url)

        # Try newspaper3k first
        title, text = extract_with_newspaper(clean_url)
        if title and text:
            return title, text

        # Fallback to requests + BeautifulSoup
        title, text = extract_with_bs4(clean_url)
        if title and text:
            return title, text

        return None, None

    except Exception as e:
        print("Error extracting article:", e)
        return None, None