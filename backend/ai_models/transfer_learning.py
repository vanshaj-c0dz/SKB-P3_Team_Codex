from __future__ import annotations

from collections.abc import Iterable

import torch
from torch import Tensor, nn

from ai_models.crop_dngp import CropDNGPBackbone


class TraitHead(nn.Module):
	"""Small regression head for a single crop trait."""

	def __init__(self, input_dim: int, hidden_dim: int, dropout: float = 0.25) -> None:
		super().__init__()

		if input_dim < 1:
			raise ValueError("input_dim must be >= 1")
		if hidden_dim < 1:
			raise ValueError("hidden_dim must be >= 1")
		if not 0.0 <= dropout <= 1.0:
			raise ValueError("dropout must be between 0 and 1")

		self.network = nn.Sequential(
			nn.Linear(input_dim, hidden_dim),
			nn.ReLU(inplace=True),
			nn.Dropout(p=dropout),
			nn.Linear(hidden_dim, hidden_dim // 2 if hidden_dim >= 2 else 1),
			nn.ReLU(inplace=True),
			nn.Dropout(p=dropout),
			nn.Linear(hidden_dim // 2 if hidden_dim >= 2 else 1, 1),
		)

	def forward(self, x: Tensor) -> Tensor:
		return self.network(x)


class MultiTraitPredictor(nn.Module):
	"""Transfer-learning wrapper that adds dynamic regression heads.

	The backbone produces a shared genomic representation, while each trait gets
	its own lightweight MLP head for continuous prediction.
	"""

	def __init__(
		self,
		backbone: CropDNGPBackbone,
		hidden_dim: int,
		target_traits: Iterable[str],
		*,
		freeze_backbone: bool = False,
		dropout: float = 0.25,
	) -> None:
		super().__init__()

		traits: list[str] = [trait.strip().lower() for trait in target_traits if trait.strip()]
		if not traits:
			raise ValueError("target_traits must contain at least one non-empty trait name")
		if hidden_dim < 1:
			raise ValueError("hidden_dim must be >= 1")

		self.backbone: CropDNGPBackbone = backbone
		self.hidden_dim: int = hidden_dim
		self.target_traits: list[str] = traits

		# Infer the feature width from the backbone projection layer.
		feature_dim: int | None = None
		for module in self.backbone.modules():
			if isinstance(module, nn.Linear):
				feature_dim = module.out_features
		if feature_dim is None:
			raise ValueError("Could not infer backbone feature_dim from the provided backbone")

		self.heads: nn.ModuleDict = nn.ModuleDict(
			{
				trait: TraitHead(input_dim=feature_dim, hidden_dim=hidden_dim, dropout=dropout)
				for trait in self.target_traits
			}
		)

		if freeze_backbone:
			self.freeze_backbone()

	def freeze_backbone(self) -> None:
		"""Freeze all backbone parameters for transfer learning."""
		for param in self.backbone.parameters():
			param.requires_grad = False

	def unfreeze_backbone(self) -> None:
		"""Unfreeze all backbone parameters for fine-tuning."""
		for param in self.backbone.parameters():
			param.requires_grad = True

	def forward(self, x: Tensor) -> dict[str, Tensor]:
		"""Predict all configured traits from the shared genomic feature vector.

		Args:
			x: Input DNA image tensor of shape (batch_size, 3, 206, 206).

		Returns:
			A dictionary mapping each trait name to a tensor of shape
			(batch_size, 1) containing the regression output for that trait.
		"""
		features: Tensor = self.backbone(x)
		predictions: dict[str, Tensor] = {}

		for trait_name, head in self.heads.items():
			predictions[trait_name] = head(features)

		return predictions


__all__: list[str] = ["MultiTraitPredictor"]
