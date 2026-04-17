"""MVP Micro-Training Script - Real DNA + Weather on Low-End Hardware"""
from __future__ import annotations
import sys, torch, torch.optim as optim, time, warnings
from pathlib import Path

warnings.filterwarnings('ignore')

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_DIR))
sys.path.insert(0, str(ROOT_DIR / "backend"))

try:
    from backend.ai_models.multimodal_fuse import MasterBreedingModel
    from backend.ai_models.physics_loss import PhysicsGuidedLoss
    from backend.data_pipeline.ingest_vcf import get_real_genomic_tensor
    from backend.data_pipeline.ingest_weather import get_real_weather_tensor
    print("✅ All modules imported!")
except Exception as e:
    print(f"❌ Import Error: {e}")
    sys.exit(1)


def train_mvp_model(epochs=15, micro_batch_size=16, lr=0.001, output_path="best_mvp_model.pth"):
    print("\n" + "="*80)
    print("🏃 MICRO-TRAINING: MVP Model (15 epochs on 16 real samples)")
    print("="*80 + "\n")
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🖥️  Device: {device.type.upper()}\n")
    
    print("📥 Loading Real Soybean DNA & Weather...")
    vcf_path = ROOT_DIR.parent / "SoyDNGPNext" / "soydngpnext" / "data" / "train_example.vcf"
    full_dna = get_real_genomic_tensor(vcf_path)
    print(f"   Loaded {full_dna.shape[0]} samples, taking {micro_batch_size}...")
    
    micro_dna = full_dna[:micro_batch_size].to(device)
    single_weather = get_real_weather_tensor(lat=21.03, lon=79.03, year=2023)
    micro_weather = single_weather.repeat(micro_batch_size, 1, 1).to(device)
    print(f"   DNA: {micro_dna.shape} | Weather: {micro_weather.shape}\n")
    
    print("🎯 Creating targets...")
    targets = {
        "yield": torch.linspace(15.0, 55.0, steps=micro_batch_size).unsqueeze(1).to(device),
        "drought_score": torch.linspace(0.7, 0.1, steps=micro_batch_size).unsqueeze(1).to(device)
    }
    print(f"   Yield range: [{targets['yield'].min():.2f}, {targets['yield'].max():.2f}]\n")
    
    print("🧠 Initializing Model...")
    model = MasterBreedingModel(target_traits=["yield", "drought_score"], num_weather_features=5).to(device)
    print(f"   Parameters: {sum(p.numel() for p in model.parameters()):,}\n")
    
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=1e-5)
    loss_fn = PhysicsGuidedLoss(
        lambda_penalty=0.5,
        biological_thresholds={"min_water_mm": 500.0, "max_dry_yield": 20.0}
    )
    
    print("🔥 Training Loop...\n")
    print("Epoch | Loss (Total) | MSE Loss | Physics Penalty | Time")
    print("-" * 65)
    
    best_loss, best_epoch = float('inf'), 0
    loss_history = []
    model.train()
    start_time = time.time()
    
    for epoch in range(1, epochs + 1):
        epoch_start = time.time()
        optimizer.zero_grad()
        
        predictions = model(micro_dna, micro_weather)
        total_loss, metrics = loss_fn(predictions, targets, micro_weather)
        
        total_loss.backward()
        optimizer.step()
        
        loss_val, mse_val, penalty_val = total_loss.item(), metrics['mse_loss'].item(), metrics['physics_penalty'].item()
        epoch_time = time.time() - epoch_start
        loss_history.append(loss_val)
        
        print(f"{epoch:5d} | {loss_val:12.4f} | {mse_val:8.4f} | {penalty_val:15.4f} | {epoch_time:.2f}s")
        
        if loss_val < best_loss:
            best_loss, best_epoch = loss_val, epoch
            torch.save(model.state_dict(), str(ROOT_DIR / output_path))
    
    total_time = time.time() - start_time
    print("-" * 65)
    print(f"\n✅ Training Complete!")
    loss_reduction = (1 - loss_history[-1]/loss_history[0]) * 100
    print(f"⏱️  Time: {total_time:.2f}s | Loss Reduction: {loss_reduction:.1f}%")
    print(f"📉 {loss_history[0]:.4f} → {loss_history[-1]:.4f}")
    print(f"🌟 Best: {best_loss:.4f} (Epoch {best_epoch})")
    print(f"\n💾 Saved: {ROOT_DIR / output_path}")
    print(f"✨ Next: Use in run_ai_engine.py with model_weights_path parameter!\n")
    
    return {"status": "success", "best_loss": best_loss, "time": total_time}


if __name__ == "__main__":
    result = train_mvp_model()
    if result["status"] == "success":
        print("="*80)
        print("🎉 MVP TRAINING SUCCESSFUL - Ready for Hackathon!")
        print("="*80)
