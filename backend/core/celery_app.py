from __future__ import annotations

from celery import Celery

from core.config import settings


celery_app: Celery = Celery(
	"crop_ai_worker",
	broker=settings.redis_url,
	backend=settings.redis_url,
	include=["worker.tasks"],
)

celery_app.conf.update(
	task_serializer="json",
	result_serializer="json",
	accept_content=["json"],
	timezone="UTC",
	enable_utc=True,
	task_track_started=True,
)
