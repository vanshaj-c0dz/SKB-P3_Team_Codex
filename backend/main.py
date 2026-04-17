from __future__ import annotations

from fastapi import FastAPI

from core.config import settings
from worker.tasks import test_long_running_task


app: FastAPI = FastAPI(title="SKB P3 Backend", version="0.1.0")


@app.get("/api/health")
async def health_check() -> dict[str, str | list[str]]:
	active_crops: list[str] = list(settings.crop_configs.keys())
	return {"status": "ok", "active_crops": active_crops}


@app.post("/api/test-task")
async def trigger_test_task() -> dict[str, str]:
	task = test_long_running_task.delay(5)
	task_id: str = task.id or ""
	return {"task_id": task_id}
