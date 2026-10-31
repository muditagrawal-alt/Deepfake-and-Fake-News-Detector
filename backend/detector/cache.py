"""
High-performance asynchronous in-memory TTL cache with single-flight request coalescing.

Under heavy traffic or viral breaking news spikes, multiple concurrent requests often query
the identical URL or content. This module guarantees:
1. Fast in-memory responses for hot items (< 2ms) without repeated LLM/search calls.
2. Single-flight request coalescing: concurrent requests for the same item await a single
   underlying compute task instead of duplicating upstream work or triggering rate limits.
3. Bounded memory: LRU-style eviction when capacity is exceeded, plus automatic TTL expiration.
"""
import asyncio
import logging
import time
from typing import Any, Callable, Coroutine, Optional

log = logging.getLogger("detector.cache")


class AsyncTTLCache:
    def __init__(self, max_items: int = 1000, default_ttl: int = 3600):
        self.max_items = max_items
        self.default_ttl = default_ttl
        self._store: dict[str, tuple[Any, float]] = {}  # key -> (value, expiry_monotonic)
        self._inflight: dict[str, asyncio.Future] = {}
        self._lock = asyncio.Lock()
        self._hits = 0
        self._misses = 0
        self._coalesced = 0
        self._evictions = 0

    def _purge_expired(self, now: float) -> None:
        """Remove expired entries."""
        expired = [k for k, (_, exp) in self._store.items() if exp <= now]
        for k in expired:
            del self._store[k]

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve a value if present and not expired."""
        now = time.monotonic()
        async with self._lock:
            if key in self._store:
                val, exp = self._store[key]
                if exp > now:
                    self._hits += 1
                    return val
                del self._store[key]
            self._misses += 1
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Store a value with an expiration timestamp."""
        duration = ttl if ttl is not None else self.default_ttl
        now = time.monotonic()
        expiry = now + duration

        async with self._lock:
            self._purge_expired(now)
            if len(self._store) >= self.max_items and key not in self._store:
                # Evict oldest entry
                oldest_key = next(iter(self._store))
                del self._store[oldest_key]
                self._evictions += 1
            self._store[key] = (value, expiry)

    async def get_or_compute(
        self,
        key: str,
        compute_fn: Callable[[], Coroutine[Any, Any, Any]],
        ttl: Optional[int] = None,
    ) -> tuple[Any, bool]:
        """
        Get cached value or compute it.
        If multiple concurrent tasks request the same key while it is computing,
        they coalesce and await the same in-flight task (Single-Flight).
        Returns: (value, was_cache_hit)
        """
        now = time.monotonic()

        # 1. Quick check in cache
        async with self._lock:
            if key in self._store:
                val, exp = self._store[key]
                if exp > now:
                    self._hits += 1
                    return val, True
                del self._store[key]

            # 2. Check if a calculation is already in-flight for this key
            if key in self._inflight:
                future = self._inflight[key]
                self._coalesced += 1
                is_leader = False
            else:
                loop = asyncio.get_running_loop()
                future = loop.create_future()
                self._inflight[key] = future
                self._misses += 1
                is_leader = True

        # 3. If coalesced, await the leader's computation
        if not is_leader:
            result = await future
            return result, True

        # 4. As leader, execute the computation and broadcast to coalesced callers
        try:
            result = await compute_fn()
            await self.set(key, result, ttl=ttl)
            if not future.done():
                future.set_result(result)
            return result, False
        except Exception as exc:
            if not future.done():
                future.set_exception(exc)
            raise
        finally:
            async with self._lock:
                self._inflight.pop(key, None)

    async def stats(self) -> dict[str, Any]:
        """Return cache health and performance statistics."""
        now = time.monotonic()
        async with self._lock:
            self._purge_expired(now)
            total = self._hits + self._misses
            hit_ratio = (self._hits / total) if total > 0 else 0.0
            return {
                "items_count": len(self._store),
                "max_items": self.max_items,
                "hits": self._hits,
                "misses": self._misses,
                "coalesced_requests": self._coalesced,
                "evictions": self._evictions,
                "hit_ratio": round(hit_ratio, 4),
                "inflight_count": len(self._inflight),
            }

    async def clear(self) -> None:
        """Clear all stored entries and stats."""
        async with self._lock:
            self._store.clear()
            self._inflight.clear()
            self._hits = 0
            self._misses = 0
            self._coalesced = 0
            self._evictions = 0


# Default global instance
response_cache = AsyncTTLCache(max_items=1000, default_ttl=3600)
