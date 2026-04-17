from __future__ import annotations

import os
from pathlib import Path
import sys
import warnings

warnings.filterwarnings('ignore') # PyTorch warnings hide karne ke liye

ROOT_DIR = Path(__file__).resolve().parents[2]
PROJECT_PYTHON = ROOT_DIR / ".venv" / "Scripts" / "python.exe"

try:
    import torch
except ModuleNotFoundError:
    if PROJECT_PYTHON.exists() and Path(sys.executable).resolve() != PROJECT_PYTHON.resolve():
        os.execv(str(PROJECT_PYTHON), [str(PROJECT_PYTHON), str(Path(__file__).resolve()), *sys.argv[1:]])
    raise

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Apne banaye hue modules import kar (Make sure file paths correspond to your setup)
try:
    from backend.ai_models.crop_dngp import CropDNGPBackbone
    from backend.ai_models.env_encoder import EnvTransformerEncoder
    from backend.ai_models.multimodal_fuse import MasterBreedingModel
    from backend.ai_models.physics_loss import PhysicsGuidedLoss
    from backend.data_pipeline.ingest_vcf import get_real_genomic_tensor
    from backend.data_pipeline.ingest_weather import get_real_weather_tensor
    from backend.engines.scenario_sim import ClimateScenarioGenerator
    from backend.engines.explainability import ModelExplainer
    print("✅ All modules imported successfully!")
except Exception as e:
    print(f"❌ Import Error: {e}")
    exit()


def run_model_in_batches(model, genomic_tensor: torch.Tensor, weather_tensor: torch.Tensor, batch_size: int = 8):
    """Run the multimodal model in smaller slices to avoid CPU/GPU memory spikes."""
    if genomic_tensor.size(0) != weather_tensor.size(0):
        raise ValueError("genomic_tensor and weather_tensor must have matching batch sizes")

    trait_chunks: dict[str, list[torch.Tensor]] = {}
    model.eval()

    with torch.no_grad():
        for start in range(0, genomic_tensor.size(0), batch_size):
            end = min(start + batch_size, genomic_tensor.size(0))
            chunk_outputs = model(genomic_tensor[start:end], weather_tensor[start:end])

            if not isinstance(chunk_outputs, dict) or not chunk_outputs:
                raise TypeError("Model must return a non-empty dictionary of trait predictions")

            for trait_name, chunk_tensor in chunk_outputs.items():
                trait_chunks.setdefault(trait_name, []).append(chunk_tensor.detach().cpu())

    return {trait_name: torch.cat(chunk_list, dim=0) for trait_name, chunk_list in trait_chunks.items()}

def test_full_pipeline():
    print("\n🚀 Starting End-to-End AI Pipeline Test...\n")

    sample_vcf = ROOT_DIR.parent / "SoyDNGPNext" / "soydngpnext" / "data" / "train_example.vcf"
    
    # ---------------------------------------------------------
    # STEP 1: Load real genomic and weather tensors
    # ---------------------------------------------------------
    print("📥 Fetching Real DNA from VCF...")
    real_dna = get_real_genomic_tensor(sample_vcf)
    batch_size = min(real_dna.shape[0], 32)

    print("🌦️ Fetching Real Weather from NASA API...")
    single_weather = get_real_weather_tensor()
    real_dna = real_dna[:batch_size]
    real_weather = single_weather.repeat(batch_size, 1, 1)

    # Fake target yields for our loss function
    dummy_targets = {
        "yield": torch.linspace(15.0, 55.0, steps=batch_size).unsqueeze(1),
        "drought_score": torch.linspace(0.7, 0.1, steps=batch_size).unsqueeze(1),
    }

    print(f"📊 Real DNA Shape: {real_dna.shape}")
    print(f"🌦️ Real Weather Shape: {real_weather.shape}")

    # ---------------------------------------------------------
    # STEP 2: Initialize Master Model & Forward Pass
    # ---------------------------------------------------------
    print("\n🧠 Testing MasterBreedingModel (Forward Pass)...")
    try:
        # Pura model initialize kar rahe hain
        model = MasterBreedingModel(
            target_traits=["yield", "drought_score"],
            num_weather_features=5,
        )
        
        # NOTE: Agar tune weights extract kiye hain, toh yahan test kar:
        # model.genomic_backbone.load_state_dict(torch.load("soydngp_base_weights.pth"), strict=False)
        
        predictions = run_model_in_batches(model, real_dna, real_weather, batch_size=8)
        
        print(f"✅ Forward Pass Success! Outputs:")
        for trait, tensor in predictions.items():
            print(f"   -> {trait}: {tensor.shape} (Expected: [{batch_size}, 1])")
            
    except Exception as e:
        print(f"❌ Model Forward Pass Failed: {e}")
        return

    # ---------------------------------------------------------
    # STEP 3: Test Physics-Guided Loss
    # ---------------------------------------------------------
    print("\n⚖️ Testing Physics-Guided Loss...")
    try:
        loss_fn = PhysicsGuidedLoss(
            lambda_penalty=0.5,
            biological_thresholds={
                "min_water_mm": 500.0,
                "max_dry_yield": 20.0,
            },
        )
        # raw_env_data pass kar rahe hain constraints check karne ke liye
        total_loss, metrics = loss_fn(predictions, dummy_targets, real_weather)
        print(f"✅ Loss Calculated Successfully!")
        print(
            f"   -> Total Loss: {total_loss.item():.4f} "
            f"(MSE: {metrics['mse_loss'].item():.4f}, Penalty: {metrics['physics_penalty'].item():.4f})"
        )
    except Exception as e:
        print(f"❌ Physics Loss Calculation Failed: {e}")
        return

    # ---------------------------------------------------------
    # STEP 4: Test Scenario Generator
    # ---------------------------------------------------------
    print("\n🌪️ Testing 50-Scenario Generator...")
    try:
        scenario_engine = ClimateScenarioGenerator()
        # Single environment tensor passing for scenario generation
        single_env = real_weather[0].unsqueeze(0) 
        fifty_scenarios = scenario_engine.generate_scenarios(single_env)
        
        print(f"✅ Scenarios Generated! Shape: {fifty_scenarios.shape} (Expected: [50, 365, 5])")
    except Exception as e:
        print(f"❌ Scenario Generation Failed: {e}")
        return

    # ---------------------------------------------------------
    # STEP 5: Test Captum XAI (Explainability)
    # ---------------------------------------------------------
    print("\n🔍 Testing Captum XAI (Feature Attribution)...")
    try:
        explainer = ModelExplainer()
        # Explainer needs batch size 1 usually for clean outputs
        single_dna = real_dna[0].unsqueeze(0)
        
        # Test if it runs without crashing
        genomic_attr, env_attr = explainer.explain_prediction(
            model,
            single_dna,
            single_env,
            target_trait_index=0,
        )
        insights = explainer.extract_top_features(genomic_attr, env_attr)
        
        print(f"✅ XAI Successful! Top Features Extracted:")
        print(f"   -> Genomic Attributions Shape: {genomic_attr.shape}")
        print(f"   -> Weather Attributions Shape: {env_attr.shape}")
        print(f"   -> Top SNPs: {insights['top_snps']}")
        print(f"   -> Critical Weather Days: {insights['critical_weather_days']}")
    except Exception as e:
        print(f"❌ Captum XAI Failed: {e}")
        return

    print("\n🎉🎉 BINGO! Pura AI Pipeline bina kisi error ke pass ho gaya! 🎉🎉")

if __name__ == "__main__":
    test_full_pipeline()