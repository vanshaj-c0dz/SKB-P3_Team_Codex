from __future__ import annotations

import asyncio
import json
import tempfile
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/v1", tags=["async-pipeline"])

# In-memory job store (replace with Redis in production)
_JOBS: dict[str, dict[str, Any]] = {}
UPLOAD_DIR = Path(tempfile.gettempdir()) / "vcf_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# POST /api/v1/predict/breeding/async  — start job, return task_id immediately
# ---------------------------------------------------------------------------
@router.post("/predict/breeding/async")
async def start_async_prediction(
    vcf_file: UploadFile = File(...),
    lat: float = Form(21.03),
    lon: float = Form(79.03),
    crop_type: str = Form("Soybean"),
    stress_scenario: str = Form("Extreme Drought + Heatwave"),
    max_samples: int = Form(None),
):
    task_id = str(uuid.uuid4())
    content = await vcf_file.read()
    vcf_path = UPLOAD_DIR / f"{task_id}.vcf"
    vcf_path.write_bytes(content)

    _JOBS[task_id] = {"status": "queued", "pct": 0, "stage": "QUEUED", "result": None, "error": None}
    asyncio.create_task(
        _run_pipeline(
            task_id=task_id, vcf_path=str(vcf_path),
            lat=lat, lon=lon, crop_type=crop_type,
            stress_scenario=stress_scenario, max_samples=max_samples,
        )
    )
    return JSONResponse({"task_id": task_id, "status": "queued"})


# ---------------------------------------------------------------------------
# WebSocket /ws/progress/{task_id}
# ---------------------------------------------------------------------------
@router.websocket("/ws/progress/{task_id}")
async def ws_progress(websocket: WebSocket, task_id: str):
    await websocket.accept()
    try:
        while True:
            job = _JOBS.get(task_id)
            if not job:
                await websocket.send_json({"stage": "ERROR", "pct": 0, "message": "Task not found"})
                break
            await websocket.send_json({
                "stage":   job["stage"],
                "pct":     job["pct"],
                "message": _STAGE_LABELS.get(job["stage"], job["stage"]),
                "result":  job["result"] if job["status"] == "complete" else None,
                "error":   job["error"],
            })
            if job["status"] in ("complete", "error"):
                break
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass


# ---------------------------------------------------------------------------
# GET /api/v1/predict/breeding/status/{task_id}  — HTTP poll fallback
# ---------------------------------------------------------------------------
@router.get("/predict/breeding/status/{task_id}")
async def get_job_status(task_id: str):
    job = _JOBS.get(task_id)
    if not job:
        return JSONResponse({"error": "Task not found"}, status_code=404)
    return JSONResponse({
        "task_id": task_id, "stage": job["stage"], "pct": job["pct"],
        "status": job["status"],
        "result": job["result"] if job["status"] == "complete" else None,
        "error": job["error"],
    })

# ---------------------------------------------------------------------------
# GET /api/v1/export-report/{task_id}  — generate markdown report
# ---------------------------------------------------------------------------
@router.get("/export-report/{task_id}")
async def export_report(task_id: str):
    from fastapi.responses import PlainTextResponse

    job = _JOBS.get(task_id)
    if not job or job["status"] != "complete" or not job.get("result"):
        return JSONResponse({"error": "Task not found or incomplete"}, status_code=404)

    res = job["result"]
    md = f"""# Climate-Resilient Crop Intelligence Report
**Task ID**: {task_id}
**Target Location**: Lat {res.get('location', {}).get('latitude', '?')}, Lon {res.get('location', {}).get('longitude', '?')}
**Crop Type**: {res.get('crop_type', 'Unknown')}
**Stress Scenario**: {res.get('stress_scenario', 'None')}

## 1. Executive Summary
- **Climate Resilience Score**: {res.get('climate_resilience_score', '?')}/100
- **Baseline Yield Predict**: {res.get('baseline_yield', '?')} kg/ha
- **Analyzed Genotypes**: {res.get('genotype_count', '?')}

## 2. Smart Parental Matchmaker (Top 3 Crosses)
"""
    crosses = res.get("top_parental_crosses", [])
    for idx, c in enumerate(crosses[:3]):
        md += f"{idx+1}. **{c['cross_id']}** ({c['parent_1_id']} x {c['parent_2_id']}) - Resilience: {c['resilience_score']}%, Projected Yield: {c['yield_pred']} kg/ha\n"

    md += "\n## 3. Agronomic Blueprint\n"
    blueprint = res.get("agronomic_blueprint", [])
    for rec in blueprint:
        md += f"- [ ] {rec}\n"

    md += "\n## 4. XAI Top Influential SNPs\n"
    snps = res.get("xai_insights", {}).get("top_positive_genes", [])
    md += ", ".join(snps) + "\n"
    
    headers = {
        "Content-Disposition": f"attachment; filename=Crop_Intelligence_Report_{task_id}.md"
    }

    return PlainTextResponse(content=md, media_type="text/markdown", headers=headers)

_STAGE_LABELS = {
    "QUEUED":           "Job queued, starting soon…",
    "INGESTING_DNA":    "Parsing VCF genotype file…",
    "FETCHING_WEATHER": "Fetching NASA POWER weather data…",
    "RUNNING_SCENARIOS":"Running 50 extreme climate scenarios…",
    "XAI_ANALYSIS":     "Extracting Captum XAI genomic insights…",
    "BLUEPRINTING":     "Generating agronomic blueprints…",
    "COMPLETE":         "Pipeline complete!",
    "ERROR":            "Pipeline encountered an error.",
}


async def _run_pipeline(task_id, vcf_path, lat, lon, crop_type, stress_scenario, max_samples):
    def _update(stage, pct):
        _JOBS[task_id]["stage"] = stage
        _JOBS[task_id]["pct"] = pct

    try:
        _update("INGESTING_DNA", 10); await asyncio.sleep(0)
        _update("FETCHING_WEATHER", 25); await asyncio.sleep(0)
        _update("RUNNING_SCENARIOS", 45); await asyncio.sleep(0)

        repo_root = Path(vcf_path).resolve().parents[2]
        weights_path = repo_root / "best_mvp_model.pth"

        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None, _blocking_pipeline,
            vcf_path, lat, lon, crop_type, stress_scenario, max_samples,
            str(weights_path) if weights_path.exists() else None,
        )

        _update("XAI_ANALYSIS", 85); await asyncio.sleep(0)
        _update("BLUEPRINTING", 95); await asyncio.sleep(0)
        
        if isinstance(result, dict):
            result["task_id"] = task_id
            
        _JOBS[task_id].update({"stage": "COMPLETE", "pct": 100, "status": "complete", "result": result})

    except Exception as exc:
        _JOBS[task_id].update({"stage": "ERROR", "pct": 0, "status": "error", "error": str(exc)})
    finally:
        Path(vcf_path).unlink(missing_ok=True)


def _blocking_pipeline(vcf_path, lat, lon, crop_type, stress_scenario, max_samples, weights_path):
    from engines.run_ai_engine import generate_breeding_insights
    return generate_breeding_insights(
        vcf_filepath=vcf_path, lat=lat, lon=lon,
        crop_type=crop_type, stress_scenario=stress_scenario,
        max_samples=max_samples, batch_inference_size=8,
        model_weights_path=weights_path,
    )
