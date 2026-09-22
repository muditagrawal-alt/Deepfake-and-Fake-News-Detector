"""
Minimal in-memory job store for the async video endpoint.
Single-process only (fine for one Space replica).
"""
import asyncio
import logging
import time
import uuid
from typing import Any, Callable, Awaitable

from detector.schemas import JobStatus

log = logging.getLogger(__name__)


class JobStore:
    def __init__(self, ttl_seconds: int = 3600):
        self.ttl = ttl_seconds
        self._jobs: dict[str, dict[str, Any]] = {}

    def create(self) -> str:
        self._gc()
        job_id = uuid.uuid4().hex[:16]
        self._jobs[job_id] = {"status": "queued", "stage": None, "result": None, "error": None, "created": time.time()}
        return job_id

    def get(self, job_id: str) -> JobStatus | None:
        job = self._jobs.get(job_id)
        if not job:
            return None
        return JobStatus(job_id=job_id, status=job["status"], stage=job["stage"], result=job["result"], error=job["error"])

    def set_stage(self, job_id: str, stage: str) -> None:
        if job_id in self._jobs:
            self._jobs[job_id]["stage"] = stage

    async def run(self, job_id: str, coro_factory: Callable[[Callable[[str], None]], Awaitable[Any]], cleanup: Callable[[], None] | None = None) -> None:
        job = self._jobs[job_id]
        job["status"] = "running"
        try:
            job["result"] = await coro_factory(lambda stage: self.set_stage(job_id, stage))
            job["status"] = "done"
            job["stage"] = "complete"
        except Exception as exc:  # surfaced to the client as text
            log.exception("job %s failed", job_id)
            job["status"] = "error"
            job["error"] = f"{type(exc).__name__}: {exc}"
        finally:
            if cleanup:
                try:
                    cleanup()
                except Exception:
                    pass

    def _gc(self) -> None:
        cutoff = time.time() - self.ttl
        for k in [k for k, v in self._jobs.items() if v["created"] < cutoff]:
            self._jobs.pop(k, None)
