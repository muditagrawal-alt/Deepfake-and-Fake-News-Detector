"""
Comprehensive Whitebox Test Suite.
Verifies internal components, branch coverage, concurrent synchronization,
caching, auth edge cases, quota gate mechanics, and traffic scaling.
"""
import asyncio
import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient

from detector import accounts
from detector.auth import require_user
from detector.cache import AsyncTTLCache
from detector.config import Settings, get_settings
from detector.main import app
from detector.quota import Busy, LLMGate, QuotaExhausted

TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef"


# ============================================================================
# 1. CACHE & SINGLE-FLIGHT WHITEBOX TESTS
# ============================================================================

def test_cache_basic_get_set_and_expiry():
    async def _test():
        cache = AsyncTTLCache(max_items=5, default_ttl=1)
        await cache.set("key1", "val1", ttl=1)
        assert await cache.get("key1") == "val1"

        # Verify hit counter
        stats = await cache.stats()
        assert stats["hits"] == 1
        assert stats["misses"] == 0

        # Wait for TTL expiry
        await asyncio.sleep(1.05)
        assert await cache.get("key1") is None
        stats = await cache.stats()
        assert stats["misses"] == 1

    asyncio.run(_test())


def test_cache_lru_eviction_under_capacity():
    async def _test():
        cache = AsyncTTLCache(max_items=3, default_ttl=60)
        await cache.set("k1", "v1")
        await cache.set("k2", "v2")
        await cache.set("k3", "v3")

        stats = await cache.stats()
        assert stats["items_count"] == 3
        assert stats["evictions"] == 0

        # Adding 4th item should evict k1
        await cache.set("k4", "v4")
        stats = await cache.stats()
        assert stats["items_count"] == 3
        assert stats["evictions"] == 1
        assert await cache.get("k1") is None
        assert await cache.get("k4") == "v4"

    asyncio.run(_test())


def test_single_flight_request_coalescing_under_concurrency():
    """Verify that N concurrent tasks for the same key execute compute_fn exactly ONCE."""
    async def _test():
        cache = AsyncTTLCache(max_items=100, default_ttl=60)
        compute_count = 0

        async def expensive_computation():
            nonlocal compute_count
            compute_count += 1
            await asyncio.sleep(0.05)  # simulate LLM latency
            return {"data": "verified_result"}

        # Launch 20 concurrent requests for the exact same key
        tasks = [
            cache.get_or_compute("breaking_news_url", expensive_computation)
            for _ in range(20)
        ]
        results = await asyncio.gather(*tasks)

        # All 20 callers must receive the exact result
        for res, was_hit in results:
            assert res == {"data": "verified_result"}

        # Exactly ONE computation must have taken place!
        assert compute_count == 1

        stats = await cache.stats()
        assert stats["misses"] == 1
        assert stats["coalesced_requests"] == 19

    asyncio.run(_test())


def test_single_flight_exception_propagation():
    """Verify that if compute_fn raises, the exception propagates cleanly to all coalesced callers."""
    async def _test():
        cache = AsyncTTLCache(max_items=100, default_ttl=60)

        async def failing_computation():
            await asyncio.sleep(0.02)
            raise ValueError("External upstream timeout")

        tasks = [
            cache.get_or_compute("failing_key", failing_computation)
            for _ in range(5)
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)
        for res in results:
            assert isinstance(res, ValueError)
            assert "External upstream timeout" in str(res)

        # Cache should not store failed results
        stats = await cache.stats()
        assert stats["items_count"] == 0

    asyncio.run(_test())


# ============================================================================
# 2. AUTH & CRYPTOGRAPHIC TOKEN WHITEBOX TESTS
# ============================================================================

def make_test_token(sub: str = "a" * 64, email: str = "test@example.com", exp_offset: int = 300,
                    iat_offset: int = 0, alg: str = "HS256", typ: str = "JWT", secret: str = TEST_SECRET) -> str:
    sec = secret.encode()
    now = int(time.time())
    header = base64.urlsafe_b64encode(json.dumps({"alg": alg, "typ": typ}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({
        "iss": "veritas-web",
        "aud": "veritas-api",
        "sub": sub,
        "auth_iat": (now + iat_offset) * 1000,
        "email": email,
        "iat": now + iat_offset,
        "exp": now + exp_offset,
    }).encode()).decode().rstrip("=")
    sig = base64.urlsafe_b64encode(hmac.new(sec, f"{header}.{payload}".encode(), hashlib.sha256).digest()).decode().rstrip("=")
    return f"{header}.{payload}.{sig}"


@pytest.fixture(autouse=True)
def configure_auth_environment(monkeypatch, tmp_path):
    monkeypatch.setenv("BACKEND_TOKEN_SECRET", TEST_SECRET)
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'whitebox.sqlite3'}")
    monkeypatch.setenv("BYOK_ENCRYPTION_KEY", "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=")
    # Clear settings cache so new env takes effect
    get_settings.cache_clear()
    settings = get_settings()
    accounts.init_store(settings)
    yield
    get_settings.cache_clear()


def test_auth_valid_token_parses():
    token = make_test_token()
    user = require_user(f"Bearer {token}")
    assert user["sub"] == "a" * 64
    assert user["email"] == "test@example.com"


def test_auth_expired_token_rejected():
    token = make_test_token(exp_offset=-10)
    with pytest.raises(Exception) as exc:
        require_user(f"Bearer {token}")
    assert "Session expired" in str(exc.value)


def test_auth_future_iat_rejected():
    token = make_test_token(iat_offset=120)
    with pytest.raises(Exception) as exc:
        require_user(f"Bearer {token}")
    assert "Session expired" in str(exc.value) or "Invalid session" in str(exc.value)


def test_auth_tampered_signature_rejected():
    token = make_test_token()
    tampered = token[:-4] + "xxxx"
    with pytest.raises(Exception) as exc:
        require_user(f"Bearer {tampered}")
    assert "Invalid session token" in str(exc.value)


def test_auth_none_alg_attack_rejected():
    token = make_test_token(alg="none")
    with pytest.raises(Exception) as exc:
        require_user(f"Bearer {token}")
    assert "Invalid session token" in str(exc.value)


def test_auth_invalid_sub_length_rejected():
    token = make_test_token(sub="short_id")
    with pytest.raises(Exception) as exc:
        require_user(f"Bearer {token}")
    assert "Invalid session identity" in str(exc.value)


# ============================================================================
# 3. QUOTA GATE & CONCURRENCY WHITEBOX TESTS
# ============================================================================

def test_llm_gate_concurrency_semaphore():
    async def _test():
        gate = LLMGate(rpm=60, daily=100, concurrency=2)
        active = 0
        max_active = 0

        async def worker():
            nonlocal active, max_active
            async with gate.slot():
                active += 1
                max_active = max(max_active, active)
                await asyncio.sleep(0.05)
                active -= 1

        await asyncio.gather(*[worker() for _ in range(6)])
        assert max_active <= 2

    asyncio.run(_test())


def test_llm_gate_daily_quota_exhaustion():
    async def _test():
        gate = LLMGate(rpm=60, daily=3, concurrency=5)
        async with gate.slot():
            pass
        async with gate.slot():
            pass
        async with gate.slot():
            pass

        with pytest.raises(QuotaExhausted):
            async with gate.slot():
                pass

    asyncio.run(_test())


def test_llm_gate_busy_timeout():
    async def _test():
        # Saturated RPM with short max_wait should raise Busy
        gate = LLMGate(rpm=1, daily=100, concurrency=5, max_wait=0.1)
        async with gate.slot():
            pass
        with pytest.raises(Busy):
            async with gate.slot():
                pass

    asyncio.run(_test())


# ============================================================================
# 4. API METRICS & TRAFFIC TELEMETRY ENDPOINT
# ============================================================================

def test_metrics_endpoint_telemetry():
    client = TestClient(app)
    resp = client.get("/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "cache" in data
    assert "items_count" in data["cache"]
    assert "hits" in data["cache"]
    assert "memory_rss_mb" in data
    assert "traffic_concurrency" in data
    assert data["traffic_concurrency"]["response_cache_enabled"] is True


def test_health_endpoint_contract():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "engine" in data
    assert "quota" in data


def test_gzip_compression_on_metrics():
    client = TestClient(app)
    headers = {"Accept-Encoding": "gzip"}
    resp = client.get("/metrics", headers=headers)
    assert resp.status_code == 200
    # Client transparently decompresses, verify response was successful
    assert "status" in resp.json()
