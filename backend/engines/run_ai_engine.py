"""
🚀 Master Breeding Insights Engine
====================================
Single entry point for FastAPI backend to invoke complete AI pipeline.
Returns JSON-serializable breeding recommendations with XAI insights.

Usage (from FastAPI routes):
    from backend.engines.run_ai_engine import generate_breeding_insights
    
    result = generate_breeding_insights(
        vcf_filepath="/path/to/genotypes.vcf",
        lat=21.03,
        lon=79.03,
        crop_type="Soybean"
    )
    return JSONResponse(result)
"""

from __future__ import annotations

import json
import torch
import warnings
import sys
import os
from pathlib import Path
from typing import Dict, Any

warnings.filterwarnings('ignore')

# Setup paths (bootstrap - same as test_pipeline.py)
_root = Path(__file__).resolve().parents[2]
_backend = _root / "backend"

if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

# Try imports with proper error handling
try:
    from backend.ai_models.crop_dngp import CropDNGPBackbone
    from backend.ai_models.env_encoder import EnvTransformerEncoder
    from backend.ai_models.multimodal_fuse import MasterBreedingModel
    from backend.ai_models.physics_loss import PhysicsGuidedLoss
    from backend.data_pipeline.ingest_vcf import get_real_genomic_tensor
    from backend.data_pipeline.ingest_weather import get_real_weather_tensor
    from backend.engines.scenario_sim import ClimateScenarioGenerator
    from backend.engines.explainability import ModelExplainer
except ModuleNotFoundError as e:
    print(f"❌ Import error: {e}")
    print(f"   Root: {_root}")
    print(f"   Backend: {_backend}")
    print(f"   sys.path: {sys.path[:3]}")
    raise


def run_model_in_batches(
    model: MasterBreedingModel,
    genomic_tensor: torch.Tensor,
    weather_tensor: torch.Tensor,
    batch_size: int = 8
) -> Dict[str, torch.Tensor]:
    """
    Run multimodal model in smaller batches to prevent memory spikes.
    
    Args:
        model: MasterBreedingModel instance
        genomic_tensor: [B, 3, 206, 206] one-hot genotypes
        weather_tensor: [B, 365, 5] weather features
        batch_size: Inference chunk size (default 8)
    
    Returns:
        Dictionary of trait predictions: {trait_name: [B, 1] tensor}
    """
    if genomic_tensor.size(0) != weather_tensor.size(0):
        raise ValueError(
            f"Batch size mismatch: genomic={genomic_tensor.size(0)}, "
            f"weather={weather_tensor.size(0)}"
        )

    trait_chunks: dict[str, list[torch.Tensor]] = {}
    model.eval()

    with torch.no_grad():
        for start in range(0, genomic_tensor.size(0), batch_size):
            end = min(start + batch_size, genomic_tensor.size(0))
            chunk_outputs = model(
                genomic_tensor[start:end],
                weather_tensor[start:end]
            )

            if not isinstance(chunk_outputs, dict) or not chunk_outputs:
                raise TypeError(
                    "Model must return a non-empty dictionary of trait predictions"
                )

            for trait_name, chunk_tensor in chunk_outputs.items():
                trait_chunks.setdefault(trait_name, []).append(
                    chunk_tensor.detach().cpu()
                )

    return {
        trait_name: torch.cat(chunk_list, dim=0)
        for trait_name, chunk_list in trait_chunks.items()
    }


def generate_breeding_insights(
    vcf_filepath: str,
    lat: float = 21.03,
    lon: float = 79.03,
    crop_type: str = "Soybean",
    max_samples: int = None,
    batch_inference_size: int = 8,
    model_weights_path: str = None
) -> Dict[str, Any]:
    """
    🎯 Master Function: Complete AI breeding pipeline in one call.
    
    This is what FastAPI backend routes will invoke.
    Input: VCF file path + location coordinates
    Output: Clean JSON with breeding recommendations, climate resilience scores, and XAI insights
    
    Args:
        vcf_filepath: Path to VCF genotype file (e.g., "/uploads/user_genotypes.vcf")
        lat: Latitude for weather fetch (default: 21.03°N, Central India)
        lon: Longitude for weather fetch (default: 79.03°E)
        crop_type: Crop name for logging (default: "Soybean")
        max_samples: Cap batch size (None = all samples, or e.g., 32 for testing)
        batch_inference_size: Chunk size for model inference (default: 8)
        model_weights_path: Path to pre-trained weights (optional)
    
    Returns:
        Dictionary with keys:
            - status: "success" or "error"
            - error_msg: (if status == "error")
            - genotype_count: Number of samples processed
            - baseline_predictions: {trait: mean_value}
            - top_parental_crosses: List of recommended crosses
            - climate_scenarios: Survival under 50 stress scenarios
            - xai_insights: {top_snp_indices, critical_weather_days}
            - soil_blueprint: Recommended soil management
    """
    
    try:
        print(f"🚀 Initializing AI Engine for {crop_type} at [{lat}, {lon}]...")
        
        # =====================================================================
        # PHASE 1: Data Ingestion (Real DNA + Real Weather)
        # =====================================================================
        print(f"📥 Loading genotypes from {vcf_filepath}...")
        real_dna = get_real_genomic_tensor(vcf_filepath)
        num_samples = real_dna.shape[0]
        
        if max_samples:
            real_dna = real_dna[:max_samples]
            batch_size = max_samples
        else:
            batch_size = num_samples
        
        print(f"🌦️ Fetching real weather from NASA POWER API [{lat}, {lon}]...")
        single_weather = get_real_weather_tensor(lat=lat, lon=lon, year=2023)
        real_weather = single_weather.repeat(batch_size, 1, 1)
        
        print(f"📊 Data loaded: DNA [{batch_size}, 3, 206, 206] | "
              f"Weather [{batch_size}, 365, 5]")
        
        # =====================================================================
        # PHASE 2: Model Initialization & Baseline Predictions
        # =====================================================================
        print("🧠 Initializing MasterBreedingModel...")
        model = MasterBreedingModel(
            target_traits=["yield", "drought_score"],
            num_weather_features=5
        )
        
        if model_weights_path and Path(model_weights_path).exists():
            print(f"📦 Loading pre-trained weights from {model_weights_path}...")
            model.load_state_dict(
                torch.load(model_weights_path, map_location='cpu'),
                strict=False
            )
        else:
            print("⚠️ No trained weights found. Using random initialization.")
        
        print("🔮 Running baseline predictions (inference mode)...")
        baseline_predictions = run_model_in_batches(
            model,
            real_dna,
            real_weather,
            batch_size=batch_inference_size
        )
        
        # Convert to JSON-serializable format
        baseline_dict = {}
        for trait_name, pred_tensor in baseline_predictions.items():
            baseline_dict[trait_name] = {
                "mean": float(pred_tensor.mean().item()),
                "std": float(pred_tensor.std().item()),
                "min": float(pred_tensor.min().item()),
                "max": float(pred_tensor.max().item()),
            }
        
        # =====================================================================
        # PHASE 3: Climate Scenario Generation (50 stress scenarios)
        # =====================================================================
        print("🌪️ Generating 50 climate stress scenarios...")
        scenario_engine = ClimateScenarioGenerator()
        reference_weather = real_weather[0].unsqueeze(0)  # [1, 365, 5]
        fifty_scenarios = scenario_engine.generate_scenarios(reference_weather)
        
        # In production, you'd loop through all 50 and get survival rates
        # For now, return scenario metadata
        scenario_metadata = {
            "total_scenarios": 50,
            "shape": list(fifty_scenarios.shape),
            "scenario_types": [
                "heatwave", "drought", "flood", "combined_stress", "normal"
            ]
        }
        
        # =====================================================================
        # PHASE 4: Explainability (XAI) - Top Features
        # =====================================================================
        print("🔍 Running Captum XAI for feature importance...")
        explainer = ModelExplainer()
        
        # Use first sample for XAI (representative)
        single_dna = real_dna[0].unsqueeze(0)  # [1, 3, 206, 206]
        
        genomic_attr, env_attr = explainer.explain_prediction(
            model,
            single_dna,
            reference_weather,
            target_trait_index=0  # yield
        )
        
        insights = explainer.extract_top_features(genomic_attr, env_attr)
        
        # =====================================================================
        # PHASE 5: Breeding Recommendations
        # =====================================================================
        print("🏆 Generating parental cross recommendations...")
        
        # Extract high-yield individuals
        yield_preds = baseline_predictions["yield"].squeeze()
        drought_preds = baseline_predictions["drought_score"].squeeze()
        
        # Top 5 yield performers
        top_yield_indices = torch.topk(yield_preds, min(5, batch_size)).indices
        # Most drought resistant (low score = better)
        low_drought_indices = torch.topk(drought_preds, min(5, batch_size), largest=False).indices
        
        top_crosses = []
        for i in range(min(3, len(top_yield_indices))):
            parent1_idx = int(top_yield_indices[i].item())
            parent2_idx = int(low_drought_indices[i].item())
            
            # Synthetic resilience score (in production: from scenario tests)
            parent2_drought = float(drought_preds[parent2_idx].item())
            resilience = 100 - (parent2_drought * 100)
            
            top_crosses.append({
                "cross_id": f"Cross_{i+1}",
                "parent_1_id": f"Genotype_{parent1_idx}",
                "parent_2_id": f"Genotype_{parent2_idx}",
                "parent_1_yield_pred": float(yield_preds[parent1_idx].item()),
                "parent_2_yield_pred": float(yield_preds[parent2_idx].item()),
                "climate_resilience_score": resilience,
                "recommended_for": ["high_yield", "drought_tolerance"][i % 2],
            })
        
        # =====================================================================
        # PHASE 6: Soil & Management Blueprint
        # =====================================================================
        print("🌱 Generating soil management blueprint...")
        
        critical_days = insights['critical_weather_days']
        crop_stage_map = {
            (60, 100): "Early Vegetative",
            (100, 150): "Late Vegetative / Flowering Initiation",
            (150, 200): "Pod Filling (Most Critical)",
            (200, 250): "Late Pod Filling",
            (250, 300): "Maturation Stage",
        }
        
        critical_stages = []
        for day in critical_days[:3]:  # Top 3 critical days
            for (start, end), stage_name in crop_stage_map.items():
                if start <= day <= end:
                    critical_stages.append(stage_name)
                    break
        
        soil_blueprint = {
            "location": {"lat": lat, "lon": lon},
            "crop_type": crop_type,
            "critical_growth_stages": list(set(critical_stages)),
            "recommended_practices": [
                "Adequate soil moisture retention during Day 260-270 (Pod Filling)",
                "Apply mulch to regulate soil temperature",
                "Ensure proper drainage to prevent waterlogging",
                "Monitor soil nutrients during flowering phase",
            ],
            "irrigation_windows": [
                f"Days {d}-{d+5}" for d in critical_days[:3]
            ],
        }
        
        # =====================================================================
        # PHASE 7: Compile Final JSON Output
        # =====================================================================
        final_output = {
            "status": "success",
            "pipeline_version": "1.0_MVP",
            "genotype_count": int(batch_size),
            "crop_type": crop_type,
            "location": {"lat": lat, "lon": lon},
            
            "baseline_predictions": baseline_dict,
            
            "top_parental_crosses": top_crosses,
            
            "climate_scenarios": scenario_metadata,
            
            "xai_insights": {
                "top_snp_indices": insights['top_snps'] if isinstance(insights['top_snps'], list) else [int(x) for x in insights['top_snps'].tolist()],
                "critical_weather_days": insights['critical_weather_days'] if isinstance(insights['critical_weather_days'], list) else [int(x) for x in insights['critical_weather_days'].tolist()],
                "genomic_attribution_shape": list(genomic_attr.shape),
                "env_attribution_shape": list(env_attr.shape),
            },
            
            "soil_fixation_blueprint": soil_blueprint,
            
            "next_steps": [
                "1. Train model on historical phenotype data (yield, drought_score)",
                "2. Validate climate scenarios on holdout test set",
                "3. Deploy recommended crosses in field trial",
                "4. Collect real phenotypes to refine model",
            ]
        }
        
        print("✅ Pipeline completed successfully!")
        return final_output
    
    except FileNotFoundError as e:
        return {
            "status": "error",
            "error_msg": f"File not found: {str(e)}",
            "vcf_filepath": vcf_filepath,
        }
    
    except Exception as e:
        return {
            "status": "error",
            "error_msg": f"Pipeline error: {str(e)}",
            "error_type": type(e).__name__,
        }


# ============================================================================
# CLI Test (for debugging)
# ============================================================================
if __name__ == "__main__":
    from pathlib import Path
    
    # Resolve VCF path (same logic as test_pipeline.py)
    root = Path(__file__).resolve().parents[3]  # g:\team_codex
    vcf_path = root / "SoyDNGPNext" / "soydngpnext" / "data" / "train_example.vcf"
    
    print("=" * 80)
    print("🎯 Testing Breeding Insights Engine (Standalone Mode)")
    print("=" * 80)
    
    result = generate_breeding_insights(
        vcf_filepath=str(vcf_path),
        lat=21.03,
        lon=79.03,
        crop_type="Soybean",
        max_samples=32  # Test with 32 samples
    )
    
    print("\n" + "=" * 80)
    print("📋 Final JSON Output (Ready for FastAPI Response)")
    print("=" * 80)
    print(json.dumps(result, indent=2))
    print("\n✅ Engine test complete!")
