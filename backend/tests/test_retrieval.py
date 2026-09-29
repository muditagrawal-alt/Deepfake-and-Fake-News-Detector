"""Retrieval filters: what may and may not count as independent evidence. No network: pages are not read."""
import asyncio

import pytest

from detector.engine import retrieval
from detector.engine.retrieval import retrieve
from detector.providers.research import Hit

ARTICLE = ("The city council voted on Tuesday to approve a new budget of 4.2 million dollars for the "
           "renovation of the central library, which has been closed since the flood in March last year.")


class FakeResearcher:
    name = "fake"

    def __init__(self, hits):
        self.hits = hits

    async def search(self, query, max_results=8):
        return list(self.hits)


@pytest.fixture(autouse=True)
def no_page_reads(monkeypatch):
    async def _read(client, url, max_chars):
        return ""
    monkeypatch.setattr(retrieval, "_read", _read)


def run(hits, **kw):
    args = dict(publisher=None, blocklist=frozenset(), exclude_fact_checks=False, item_text="")
    args.update(kw)
    return asyncio.run(retrieve(FakeResearcher(hits), ["q"], **args))


def test_publisher_excluded_including_subdomains():
    r = run([Hit("a", "https://www.example.com/a"), Hit("b", "https://news.example.com/b"), Hit("c", "https://other.org/c")],
            publisher="https://example.com/story")
    assert [h.url for h in r.hits] == ["https://other.org/c"]
    assert r.dropped["publisher"] == 2


def test_blocklist_domain_and_path_prefix():
    r = run([Hit("a", "https://reuters.com/fact-check/x"), Hit("b", "https://reuters.com/world/y"), Hit("c", "https://bad.net/z")],
            blocklist=frozenset({"bad.net", "reuters.com/fact-check"}))
    assert [h.url for h in r.hits] == ["https://reuters.com/world/y"]
    assert r.dropped["blocklist"] == 2


def test_fact_checks_only_dropped_when_enabled():
    hits = [Hit("a", "https://www.politifact.com/factchecks/2020/x"), Hit("b", "https://apnews.com/article/fact-check-123"),
            Hit("c", "https://apnews.com/article/politics-456")]
    assert len(run(hits).hits) == 3
    r = run(hits, exclude_fact_checks=True)
    assert [h.url for h in r.hits] == ["https://apnews.com/article/politics-456"]
    assert r.dropped["fact_check"] == 2


def test_near_copy_of_item_is_not_evidence():
    copy = Hit("copy", "https://mirror.net/x", snippet=ARTICLE[:160])
    other = Hit("other", "https://paper.com/y", snippet="Library renovation budget debated; critics question the flood repair costs and timeline.")
    r = run([copy, other], item_text=ARTICLE)
    assert [h.url for h in r.hits] == ["https://paper.com/y"]
    assert r.dropped["duplicate"] == 1


def test_duplicate_urls_across_queries_counted_once():
    h = Hit("a", "https://x.org/a")
    r = asyncio.run(retrieve(FakeResearcher([h]), ["q1", "q2"], publisher=None, blocklist=frozenset(),
                             exclude_fact_checks=False))
    assert len(r.hits) == 1


class FailingResearcher:
    name = "failing"

    def __init__(self, fail_on):
        self.fail_on = fail_on

    async def search(self, query, max_results=8):
        if query in self.fail_on:
            raise RuntimeError("refused")
        return [Hit(query, f"https://x.org/{query}")]


def test_all_searches_failing_is_an_error_not_missing_evidence():
    with pytest.raises(retrieval.RetrievalUnavailable):
        asyncio.run(retrieve(FailingResearcher({"a", "b"}), ["a", "b"], publisher=None,
                             blocklist=frozenset(), exclude_fact_checks=False))


def test_partial_search_failure_is_counted():
    r = asyncio.run(retrieve(FailingResearcher({"a"}), ["a", "b"], publisher=None,
                             blocklist=frozenset(), exclude_fact_checks=False))
    assert r.dropped["search_error"] == 1 and len(r.hits) == 1
