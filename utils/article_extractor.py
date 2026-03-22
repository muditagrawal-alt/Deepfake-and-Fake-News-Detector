from newspaper import Article


def extract_article(url):
    try:
        article = Article(url)
        article.download()
        article.parse()

        title = article.title
        text = article.text

        return title, text

    except Exception as e:
        print("Error extracting article:", e)
        return None, None