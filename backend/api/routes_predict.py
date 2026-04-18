from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from engines.run_ai_engine import generate_breeding_insights

router = APIRouter(prefix="/api/v1", tags=["predictions"])


@router.post("/predict/breeding")
async def predict_breeding(
    vcf_file: UploadFile = File(..., description="Genotype VCF file (.vcf)"),
    lat: float = Form(21.03, description="Latitude"),
    lon: float = Form(79.03, description="Longitude"),
    crop_type: str = Form("Soybean", description="Crop type"),
    stress_scenario: str = Form("Extreme Drought + Heatwave", description="Stress scenario label"),
    max_samples: int = Form(None, description="Max samples (optional)"),
    heat_delta: float = Form(None, description="Custom heat delta for scenarios"),
    drought_multiplier: float = Form(None, description="Custom drought multiplier for scenarios"),
):
    """
    Main prediction endpoint.
    Accepts a VCF file + location + crop parameters,
    runs the full AI pipeline and returns structured breeding insights.
    """
    tmp_path: str | None = None
    try:
        # Save uploaded VCF to a temp file
        with tempfile.NamedTemporaryFile(suffix=".vcf", delete=False) as tmp:
            contents = await vcf_file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        # Locate the pre-trained model weights from repo root
        repo_root = Path(__file__).resolve().parents[2]
        weights_path = repo_root / "best_mvp_model.pth"

        result = generate_breeding_insights(
            vcf_filepath=tmp_path,
            lat=lat,
            lon=lon,
            crop_type=crop_type,
            stress_scenario=stress_scenario,
            max_samples=max_samples if max_samples else None,
            batch_inference_size=8,
            model_weights_path=str(weights_path) if weights_path.exists() else None,
            heat_delta=heat_delta,
            drought_multiplier=drought_multiplier,
        )

        return JSONResponse(result)

    except Exception as e:
        return JSONResponse(
            {
                "status": "error",
                "error_msg": str(e),
                "error_type": type(e).__name__,
            },
            status_code=500,
        )
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)
