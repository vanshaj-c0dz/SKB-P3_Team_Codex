from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api", tags=["environment"])

# Lazy import so the backend can start even without optional NASA deps
def _get_weather_module():
    try:
        from data_pipeline.ingest_weather import get_real_weather_tensor  # noqa: F401
        return True
    except Exception:
        return False


# Rough elevation lookup via open-elevation API (no key needed)
async def _fetch_elevation(lat: float, lon: float) -> float | None:
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(
                "https://api.open-elevation.com/api/v1/lookup",
                params={"locations": f"{lat},{lon}"},
            )
            data = r.json()
            return data["results"][0]["elevation"]
    except Exception:
        return None


@router.get("/environment-data")
async def get_environment_data(lat: float = 21.03, lon: float = 79.03):
    """
    Returns real-time climate metadata for a given lat/lon.
    Calls NASA POWER API via ingest_weather.py where available.
    Falls back to open-elevation + synthetic climate summary if not.
    """
    elevation = await _fetch_elevation(lat, lon)

    # Try pulling a year's worth of weather from NASA POWER for summary stats
    climate_summary: dict = {}
    try:
        from data_pipeline.ingest_weather import get_real_weather_tensor
        import torch

        weather_tensor = get_real_weather_tensor(lat=lat, lon=lon, year=2023)
        # Shape: [365, 5] — features: T2M, T2M_MAX, PRECTOTCORR, RH2M, WS2M
        arr = weather_tensor.numpy()
        climate_summary = {
            "mean_temp_c": round(float(arr[:, 0].mean()), 1),
            "max_temp_c": round(float(arr[:, 1].max()), 1),
            "annual_rainfall_mm": round(float(arr[:, 2].sum()), 1),
            "mean_humidity_pct": round(float(arr[:, 3].mean()), 1),
            "data_source": "NASA POWER API (2023)",
        }
    except Exception as exc:
        # Synthetic fallback using lat-based climate zone heuristic
        is_tropical = abs(lat) < 23.5
        climate_summary = {
            "mean_temp_c": round(25.0 - abs(lat - 23) * 0.4, 1) if is_tropical else round(15.0 - abs(lat - 40) * 0.3, 1),
            "max_temp_c": round(38.0 - abs(lat - 20) * 0.3, 1),
            "annual_rainfall_mm": round(800 + (lon % 50) * 3, 1),
            "mean_humidity_pct": round(60 + (lat % 15), 1),
            "data_source": f"Synthetic estimate (NASA unavailable: {type(exc).__name__})",
        }

    return JSONResponse(
        {
            "lat": lat,
            "lon": lon,
            "elevation_m": elevation,
            "climate_zone": _classify_climate(lat, lon),
            **climate_summary,
        }
    )


def _classify_climate(lat: float, lon: float) -> str:
    if abs(lat) < 10:
        return "Tropical Rainforest"
    if abs(lat) < 23.5:
        return "Tropical / Sub-tropical"
    if abs(lat) < 35:
        return "Semi-Arid / Savanna"
    if abs(lat) < 50:
        return "Temperate Continental"
    return "Boreal / Sub-polar"
