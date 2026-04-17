from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any

import torch

from ai_models.crop_dngp import CropDNGPBackbone
from ai_models.transfer_learning import MultiTraitPredictor


logger = logging.getLogger(__name__)

BACKEND_ROOT: Path = Path(__file__).resolve().parents[1]
CHECKPOINT_DIR: Path = BACKEND_ROOT / "checkpoints"


def _candidate_weight_files(crop_name: str) -> list[Path]:
	"""Return possible checkpoint paths for a crop model."""
	normalized_name: str = crop_name.strip().lower().replace(" ", "_")
	return [
		CHECKPOINT_DIR / f"{normalized_name}.pth",
		CHECKPOINT_DIR / f"{normalized_name}.pt",
		CHECKPOINT_DIR / f"{normalized_name}_weights.pth",
		CHECKPOINT_DIR / f"{normalized_name}_weights.pt",
	]


def _build_model(traits: list[str], *, hidden_dim: int = 256, freeze_backbone: bool = False) -> MultiTraitPredictor:
	"""Construct a fresh multitrait model with the default backbone shape."""
	backbone = CropDNGPBackbone(input_channels=3, feature_dim=1024, image_size=206, dropout=0.3)
	return MultiTraitPredictor(
		backbone=backbone,
		hidden_dim=hidden_dim,
		target_traits=traits,
		freeze_backbone=freeze_backbone,
	)


async def load_or_initialize_model(crop_name: str, traits: list[str]) -> MultiTraitPredictor:
	"""Load a crop-specific model checkpoint if present, otherwise initialize from scratch.

	Args:
		crop_name: Crop identifier used to locate a local checkpoint file.
		traits: Trait names for the dynamic prediction heads.

	Returns:
		A ready-to-use MultiTraitPredictor instance.
	"""

	def _load_sync() -> MultiTraitPredictor:
		CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)

		for checkpoint_path in _candidate_weight_files(crop_name):
			if not checkpoint_path.exists():
				continue

			logger.info("Loading model weights from %s", checkpoint_path)
			model = _build_model(traits)
			state_dict: Any = torch.load(checkpoint_path, map_location="cpu")

			if isinstance(state_dict, dict) and "model_state_dict" in state_dict:
				state_dict = state_dict["model_state_dict"]

			model.load_state_dict(state_dict)
			model.eval()
			return model

		logger.warning(
			"No checkpoint found for crop '%s'; initializing model from scratch.",
			crop_name,
		)
		model = _build_model(traits)
		model.eval()
		return model

	return await asyncio.to_thread(_load_sync)


def save_model(model: MultiTraitPredictor, filepath: str | Path) -> None:
	"""Persist model weights to disk in a reusable checkpoint format."""
	output_path = Path(filepath)
	output_path.parent.mkdir(parents=True, exist_ok=True)

	checkpoint = {
		"model_state_dict": model.state_dict(),
		"target_traits": getattr(model, "target_traits", []),
		"hidden_dim": getattr(model, "hidden_dim", None),
	}
	torch.save(checkpoint, output_path)
	logger.info("Saved model checkpoint to %s", output_path)


__all__: list[str] = ["load_or_initialize_model", "save_model"]
