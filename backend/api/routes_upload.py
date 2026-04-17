from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api", tags=["upload"])

UPLOAD_DIR = Path(os.getenv("VCF_UPLOAD_DIR", "/tmp/vcf_uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE_MB = 500
ALLOWED_EXTENSIONS = {".vcf"}


@router.post("/upload-genomics")
async def upload_genomics(vcf_file: UploadFile = File(...)):
    """
    Upload a .vcf genomic file.
    Validates extension & size, saves to disk, returns session_id for downstream use.
    """
    # --- Extension validation ---
    suffix = Path(vcf_file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{suffix}'. Only .vcf files are accepted.",
        )

    # --- Read content (streaming-safe) ---
    content = await vcf_file.read()
    size_bytes = len(content)
    size_mb = round(size_bytes / (1024 * 1024), 2)

    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb} MB). Maximum allowed is {MAX_FILE_SIZE_MB} MB.",
        )

    # --- Quick genotype count (count non-header lines in VCF) ---
    try:
        text = content.decode("utf-8", errors="replace")
        data_lines = [l for l in text.splitlines() if l and not l.startswith("#")]
        genotype_count = len(data_lines)
    except Exception:
        genotype_count = 0

    # --- Persist with unique session ID ---
    session_id = str(uuid.uuid4())
    dest = UPLOAD_DIR / f"{session_id}.vcf"
    dest.write_bytes(content)

    return JSONResponse(
        {
            "status": "uploaded",
            "session_id": session_id,
            "filename": vcf_file.filename,
            "size_mb": size_mb,
            "genotype_count": genotype_count,
            "path": str(dest),
        }
    )


@router.get("/upload-genomics/{session_id}")
async def get_upload_status(session_id: str):
    """Check whether a previously uploaded VCF session still exists on disk."""
    dest = UPLOAD_DIR / f"{session_id}.vcf"
    if not dest.exists():
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    stat = dest.stat()
    return JSONResponse(
        {
            "session_id": session_id,
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "exists": True,
        }
    )
