from __future__ import annotations

import json
from urllib.parse import urlencode
from urllib.request import urlopen

import torch


def _fetch_openlandmap_soil_json(lat: float, lon: float) -> dict:
    """Fetch 12 core soil features from ISRIC SoilGrids REST API (v2.0)."""
    query = urlencode(
        {
            "lon": f"{lon}",
            "lat": f"{lat}",
            "property": ["clay", "sand", "silt", "phh2o"],
            "depth": ["0-5cm", "5-15cm", "15-30cm"],
            "value": "Q0.5",  # 50th percentile (median)
        },
        doseq=True,
    )
    url = f"https://rest.isric.org/soilgrids/v2.0/properties/query?{query}"
    try:
        with urlopen(url, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Failed to fetch soil data from OpenLandMap: {e}")
        return {}


def get_real_soil_tensor(lat: float = 21.03, lon: float = 79.03) -> torch.Tensor:
    """Fetch ISRIC SoilGrids data and convert to a flat 1D tensor [1, 12].
    
    Feature Order:
    0-2: clay (0-5, 5-15, 15-30)
    3-5: sand (0-5, 5-15, 15-30)
    6-8: silt (0-5, 5-15, 15-30)
    9-11: phh2o (0-5, 5-15, 15-30)
    """
    payload = _fetch_openlandmap_soil_json(lat=lat, lon=lon)
    layers = payload.get("properties", {}).get("layers", [])
    
    features = []
    expected_properties = ["clay", "sand", "silt", "phh2o"]
    
    layer_map = {layer["name"]: layer for layer in layers if "name" in layer}
    
    for prop in expected_properties:
        layer = layer_map.get(prop, {})
        depths = layer.get("depths", [])
        
        # We expect exactly 3 depths.
        depth_vals = []
        for d in depths:
            values = d.get("values", {})
            val = values.get("Q0.5")
            if val is None:
                val = 0.0
            depth_vals.append(float(val))
            
        # Pad if missing
        while len(depth_vals) < 3:
            depth_vals.append(0.0)
            
        # Truncate if too many (should be exactly 3)
        features.extend(depth_vals[:3])
        
    soil_tensor = torch.tensor(features, dtype=torch.float32)
    return soil_tensor.unsqueeze(0)  # Shape: (1, 12)


__all__ = ["get_real_soil_tensor"]
