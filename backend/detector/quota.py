"""
Free-tier guard rails for LLM calls.

- concurrency cap (semaphore) so parallel users don't fan out into 429s
- sliding-window RPM limiter
- hard daily counter (UTC) with a friendly exception when exhausted
"""
import asyncio
import time
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone


class QuotaExhausted(Exception):
    """Daily free quota is used up; caller should return a friendly 429."""


class Busy(Exception):
    """RPM window is saturated and the wait would be too long."""


class LLMGate:
    def __init__(self, *, rpm: int, daily: int, concurrency: int = 2, max_wait: float = 120.0):
        self.rpm = max(1, rpm)
        self.daily = max(1, daily)
        self.max_wait = max_wait
        self._sem = asyncio.Semaphore(max(1, concurrency))
        self._lock = asyncio.Lock()
        self._calls: deque[float] = deque()
        self._day = self._today()
        self._count = 0

    @staticmethod
    def _today() -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def _roll_day(self) -> None:
        today = self._today()
        if today != self._day:
            self._day = today
            self._count = 0

    def remaining(self) -> dict:
        self._roll_day()
        now = time.monotonic()
        while self._calls and now - self._calls[0] > 60:
            self._calls.popleft()
        return {
            "day": self._day,
            "daily_used": self._count,
            "daily_limit": self.daily,
            "daily_remaining": max(0, self.daily - self._count),
            "rpm_used": len(self._calls),
            "rpm_limit": self.rpm,
        }

    async def _wait_for_window(self) -> None:
        waited = 0.0
        while True:
            async with self._lock:
                now = time.monotonic()
                while self._calls and now - self._calls[0] > 60:
                    self._calls.popleft()
                if len(self._calls) < self.rpm:
                    self._calls.append(now)
                    return
                sleep_for = 60 - (now - self._calls[0]) + 0.05
            if waited + sleep_for > self.max_wait:
                raise Busy("Rate window saturated; try again in a minute.")
            await asyncio.sleep(sleep_for)
            waited += sleep_for

    @asynccontextmanager
    async def slot(self):
        """Reserve one LLM request. Counts against the daily quota on entry."""
        async with self._lock:
            self._roll_day()
            if self._count >= self.daily:
                raise QuotaExhausted(
                    f"Daily free quota ({self.daily} requests) is used up; resets at 00:00 UTC."
                )
            self._count += 1
        async with self._sem:
            await self._wait_for_window()
            yield


async def with_retries(fn, *, attempts: int = 3, base_delay: float = 2.0, retry_on=(Exception,), log=None):
    """
    Run `await fn()` with exponential backoff on `retry_on` exceptions.
    The last exception is re-raised.
    """
    last: Exception | None = None
    for i in range(attempts):
        try:
            return await fn()
        except retry_on as exc:  # noqa: PERF203
            last = exc
            if i == attempts - 1:
                break
            delay = base_delay * (2 ** i)
            if log:
                log.warning("retryable error (%s); sleeping %.1fs", exc, delay)
            await asyncio.sleep(delay)
    assert last is not None
    raise last
