from __future__ import annotations

import time

from core.celery_app import celery_app


@celery_app.task(name="worker.test_long_running_task")
def test_long_running_task(seconds: int) -> str:
	time.sleep(seconds)
	return f"Task completed successfully after {seconds} seconds."
