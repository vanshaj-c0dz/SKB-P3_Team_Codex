"""
🔗 FASTAPI INTEGRATION GUIDE
============================
How the Full Stack Dev will wire this AI engine into the FastAPI backend.

Location: backend/routes/predict.py (or routes_predict.py)
"""

# ============================================================================
# EXAMPLE 1: Basic Integration (Simplest)
# ============================================================================

from fastapi import APIRouter, File, UploadFile, Query
from fastapi.responses import JSONResponse
import tempfile
from pathlib import Path
from backend.engines.run_ai_engine import generate_breeding_insights

router = APIRouter(prefix="/api/v1", tags=["predictions"])

@router.post("/predict/breeding")
async def predict_breeding(
    vcf_file: UploadFile = File(..., description="Genotype VCF file"),
    lat: float = Query(21.03, description="Latitude for weather data"),
    lon: float = Query(79.03, description="Longitude for weather data"),
    crop_type: str = Query("Soybean", description="Crop type"),
    max_samples: int = Query(None, description="Limit samples for testing")
):
    """
    🎯 Main Prediction Endpoint
    
    Accepts uploaded VCF genotype file and returns breeding recommendations.
    
    Example curl:
        curl -X POST http://localhost:8000/api/v1/predict/breeding \
          -F "vcf_file=@genotypes.vcf" \
          -F "lat=21.03" \
          -F "lon=79.03" \
          -F "crop_type=Soybean"
    """
    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(suffix=".vcf", delete=False) as tmp:
            contents = await vcf_file.read()
            tmp.write(contents)
            vcf_path = tmp.name
        
        # Call the AI engine
        result = generate_breeding_insights(
            vcf_filepath=vcf_path,
            lat=lat,
            lon=lon,
            crop_type=crop_type,
            max_samples=max_samples,
            batch_inference_size=8
        )
        
        # Cleanup
        Path(vcf_path).unlink(missing_ok=True)
        
        return JSONResponse(result)
    
    except Exception as e:
        return JSONResponse({
            "status": "error",
            "error_msg": str(e),
            "error_type": type(e).__name__
        }, status_code=500)


# ============================================================================
# EXAMPLE 2: Advanced - With Database Storage (Optional)
# ============================================================================

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from database import SessionLocal, Prediction  # Your DB models

@router.post("/predict/breeding/with-storage")
async def predict_breeding_with_db(
    vcf_file: UploadFile = File(...),
    lat: float = Query(21.03),
    lon: float = Query(79.03),
    crop_type: str = Query("Soybean"),
    user_id: str = Query(None)
):
    """
    Same as above, but also stores result in database for audit trail.
    """
    try:
        with tempfile.NamedTemporaryFile(suffix=".vcf", delete=False) as tmp:
            contents = await vcf_file.read()
            tmp.write(contents)
            vcf_path = tmp.name
        
        # Get predictions
        result = generate_breeding_insights(
            vcf_filepath=vcf_path,
            lat=lat,
            lon=lon,
            crop_type=crop_type
        )
        
        # Store in DB (pseudo-code)
        db = SessionLocal()
        prediction_record = Prediction(
            user_id=user_id,
            crop_type=crop_type,
            location_lat=lat,
            location_lon=lon,
            vcf_filename=vcf_file.filename,
            result_json=result,
            status=result.get("status")
        )
        db.add(prediction_record)
        db.commit()
        db.close()
        
        # Cleanup
        Path(vcf_path).unlink(missing_ok=True)
        
        return JSONResponse(result)
    
    except Exception as e:
        return JSONResponse({
            "status": "error",
            "error_msg": str(e)
        }, status_code=500)


# ============================================================================
# EXAMPLE 3: Batch Processing (For multiple VCFs)
# ============================================================================

@router.post("/predict/breeding/batch")
async def predict_breeding_batch(
    vcf_files: list[UploadFile] = File(...),
    lat: float = Query(21.03),
    lon: float = Query(79.03):
):
    """
    Process multiple VCF files in sequence.
    Returns list of results.
    """
    results = []
    
    for vcf_file in vcf_files:
        try:
            with tempfile.NamedTemporaryFile(suffix=".vcf", delete=False) as tmp:
                contents = await vcf_file.read()
                tmp.write(contents)
                vcf_path = tmp.name
            
            result = generate_breeding_insights(
                vcf_filepath=vcf_path,
                lat=lat,
                lon=lon
            )
            results.append({
                "filename": vcf_file.filename,
                "result": result
            })
            
            Path(vcf_path).unlink(missing_ok=True)
        
        except Exception as e:
            results.append({
                "filename": vcf_file.filename,
                "error": str(e)
            })
    
    return JSONResponse({
        "status": "batch_complete",
        "total_files": len(vcf_files),
        "results": results
    })


# ============================================================================
# NEXT STEPS FOR FULL STACK DEV
# ============================================================================

"""
1. Import run_ai_engine in your FastAPI main file or routes
2. Add one of the endpoint examples above (start with EXAMPLE 1 - Basic)
3. Test with curl or Postman:

    POST http://localhost:8000/api/v1/predict/breeding
    Form Data:
      - vcf_file: [upload your VCF]
      - lat: 21.03
      - lon: 79.03
      - crop_type: Soybean

4. Expected Response (JSON):
    {
      "status": "success",
      "genotype_count": 32,
      "baseline_predictions": {...},
      "top_parental_crosses": [...],
      "climate_scenarios": {...},
      "xai_insights": {...},
      "soil_fixation_blueprint": {...}
    }

5. Optional Enhancements:
   - Add authentication (user_id validation)
   - Store results in PostgreSQL/MongoDB
   - Add WebSocket for real-time progress updates
   - Cache NASA API calls for same lat/lon/year
   - Implement model weight download on startup
   - Add OpenAPI documentation with examples
"""
