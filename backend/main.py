from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from api.routes_predict import router as predict_router
from api.routes_upload import router as upload_router
from api.routes_environment import router as environment_router
from api.ws_progress import router as ws_router


app: FastAPI = FastAPI(title="SKB P3 Backend", version="0.1.0")

# Allow the Next.js dev server to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(predict_router)
app.include_router(upload_router)
app.include_router(environment_router)
app.include_router(ws_router)


@app.get("/api/health")
async def health_check() -> dict[str, str | list[str]]:
    active_crops: list[str] = list(settings.crop_configs.keys())
    return {"status": "ok", "active_crops": active_crops}
