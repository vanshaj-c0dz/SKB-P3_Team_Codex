from __future__ import annotations

from typing import Any

import torch
from captum.attr import IntegratedGradients
from torch import Tensor, nn


class ModelExplainer:
	"""Explain multimodal model predictions with Integrated Gradients.

	Expected model signature:
		model(genomic_tensor, env_tensor) -> dict[str, Tensor]

	Where each output tensor is expected to be shape (batch_size, 1) or (batch_size,).
	"""

	def explain_prediction(
		self,
		model: nn.Module,
		genomic_tensor: Tensor,
		env_tensor: Tensor,
		target_trait_index: int = 0,
	) -> tuple[Tensor, Tensor]:
		"""Compute integrated-gradient attributions for genomic and weather inputs.

		Args:
			model: Trained multimodal model returning trait dictionary.
			genomic_tensor: DNA tensor of shape (B, C, H, W) or legacy SNP tensor (B, 1, Num_SNPs).
			env_tensor: Weather tensor of shape (B, Seq_Len, Num_Features).
			target_trait_index: Index of trait to explain from model output ordering.

		Returns:
			Tuple (genomic_attr, env_attr) where:
			- genomic_attr has shape matching genomic_tensor
			- env_attr has shape matching env_tensor
		"""
		if genomic_tensor.ndim != 3:
			if genomic_tensor.ndim != 4:
				raise ValueError(
					f"genomic_tensor must have shape (batch, 1, num_snps) or (batch, channels, height, width), got {tuple(genomic_tensor.shape)}"
				)
		if env_tensor.ndim != 3:
			raise ValueError(
				f"env_tensor must have shape (batch, sequence, num_features), got {tuple(env_tensor.shape)}"
			)
		if genomic_tensor.size(0) != env_tensor.size(0):
			raise ValueError("genomic_tensor and env_tensor must have same batch size")
		if target_trait_index < 0:
			raise ValueError("target_trait_index must be >= 0")

		model_device = next(model.parameters()).device
		genomic_input = genomic_tensor.to(model_device)
		env_input = env_tensor.to(model_device)
		genomic_baseline = torch.zeros_like(genomic_input)
		env_baseline = torch.zeros_like(env_input)

		# Prefer model-declared trait ordering when available.
		configured_traits: list[str] = list(getattr(model, "target_traits", []))

		def forward_func(genomic_x: Tensor, env_x: Tensor) -> Tensor:
			outputs: Any = model(genomic_x, env_x)
			if not isinstance(outputs, dict) or not outputs:
				raise TypeError("Model must return a non-empty dictionary of trait predictions")

			trait_names = configured_traits if configured_traits else sorted(outputs.keys())
			if target_trait_index >= len(trait_names):
				raise IndexError(
					f"target_trait_index {target_trait_index} out of range for {len(trait_names)} traits"
				)

			trait_name = trait_names[target_trait_index]
			if trait_name not in outputs:
				raise KeyError(f"Trait '{trait_name}' is not present in model outputs")

			trait_pred = outputs[trait_name]
			if trait_pred.ndim == 2 and trait_pred.size(-1) == 1:
				return trait_pred.squeeze(-1)
			if trait_pred.ndim == 1:
				return trait_pred
			raise ValueError(
				f"Trait prediction must have shape (batch,) or (batch,1), got {tuple(trait_pred.shape)}"
			)

		model.eval()
		ig = IntegratedGradients(forward_func)
		attrs = ig.attribute(
			inputs=(genomic_input, env_input),
			baselines=(genomic_baseline, env_baseline),
		)

		if not isinstance(attrs, tuple) or len(attrs) != 2:
			raise RuntimeError("Captum IntegratedGradients did not return a (genomic_attr, env_attr) tuple")

		genomic_attr, env_attr = attrs
		return genomic_attr, env_attr

	def extract_top_features(
		self,
		genomic_attr: Tensor,
		env_attr: Tensor,
		top_k: int = 5,
	) -> dict[str, list[int]]:
		"""Extract top SNP indices and most critical weather days.

		Args:
			genomic_attr: Tensor shaped like genomic input, expected (B, 1, Num_SNPs).
			env_attr: Tensor shaped like environment input, expected (B, Seq_Len, Num_Features).
			top_k: Number of top attributions to return.

		Returns:
			Dictionary containing:
			- top_snps: SNP indices with highest absolute attribution
			- critical_weather_days: day indices with highest importance
		"""
		if genomic_attr.ndim != 3:
			if genomic_attr.ndim != 4:
				raise ValueError(
					f"genomic_attr must have shape (batch, 1, num_snps) or (batch, channels, height, width), got {tuple(genomic_attr.shape)}"
				)
		if env_attr.ndim != 3:
			raise ValueError(
				f"env_attr must have shape (batch, sequence, num_features), got {tuple(env_attr.shape)}"
			)
		if top_k < 1:
			raise ValueError("top_k must be >= 1")

		# Aggregate absolute genomic attribution across the non-feature dimensions to rank loci.
		if genomic_attr.ndim == 3:
			genomic_importance = genomic_attr.abs().mean(dim=0).mean(dim=0)  # (Num_SNPs,)
		else:
			genomic_importance = genomic_attr.abs().mean(dim=0).reshape(-1)  # flattened image importance
		k_snp = min(top_k, int(genomic_importance.numel()))
		top_snp_indices = torch.topk(genomic_importance, k=k_snp).indices.tolist()

		# Convert env attribution to day importance by summing across weather features,
		# then averaging across batch for robust ranking.
		day_importance = env_attr.abs().sum(dim=-1).mean(dim=0)  # (Seq_Len,)
		k_days = min(top_k, int(day_importance.numel()))
		top_day_indices = torch.topk(day_importance, k=k_days).indices.tolist()

		return {
			"top_snps": [int(i) for i in top_snp_indices],
			"critical_weather_days": [int(i) for i in top_day_indices],
		}


__all__: list[str] = ["ModelExplainer"]
