from __future__ import annotations

import torch

from .validators import validate_multimodal_pair


def align_multimodal_batch(genomic_tensor: torch.Tensor, weather_tensor: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
	"""Broadcast either modality so both tensors share the same batch size."""
	validate_multimodal_pair(genomic_tensor, weather_tensor)

	genomic_batch = genomic_tensor.size(0)
	weather_batch = weather_tensor.size(0)
	if genomic_batch == weather_batch:
		return genomic_tensor, weather_tensor
	if genomic_batch == 1:
		genomic_tensor = genomic_tensor.expand(weather_batch, -1, -1, -1)
	elif weather_batch == 1:
		weather_tensor = weather_tensor.expand(genomic_batch, -1, -1)
	return genomic_tensor, weather_tensor


def build_multimodal_inputs(genomic_tensor: torch.Tensor, weather_tensor: torch.Tensor) -> dict[str, torch.Tensor]:
	"""Return a ready-to-feed multimodal batch dictionary."""
	aligned_genomic, aligned_weather = align_multimodal_batch(genomic_tensor, weather_tensor)
	return {
		"genomic": aligned_genomic,
		"weather": aligned_weather,
	}


__all__ = ["align_multimodal_batch", "build_multimodal_inputs"]
