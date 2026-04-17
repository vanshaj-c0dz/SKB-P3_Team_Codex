from __future__ import annotations

from dataclasses import dataclass

import torch


@dataclass(frozen=True)
class TensorShapeCheck:
	name: str
	actual_shape: tuple[int, ...]


def validate_genomic_tensor(genomic_tensor: torch.Tensor) -> None:
	if genomic_tensor.ndim != 4:
		raise ValueError(f"genomic_tensor must have shape (B, 3, 206, 206), got {tuple(genomic_tensor.shape)}")
	if genomic_tensor.size(1) != 3:
		raise ValueError(f"genomic_tensor must have 3 channels, got {genomic_tensor.size(1)}")
	if genomic_tensor.size(2) != 206 or genomic_tensor.size(3) != 206:
		raise ValueError(f"genomic_tensor must be 206x206, got {(genomic_tensor.size(2), genomic_tensor.size(3))}")


def validate_weather_tensor(weather_tensor: torch.Tensor, *, min_sequence_length: int = 100) -> None:
	if weather_tensor.ndim != 3:
		raise ValueError(
			f"weather_tensor must have shape (B, T, F), got {tuple(weather_tensor.shape)}"
		)
	if weather_tensor.size(1) < min_sequence_length:
		raise ValueError(
			f"weather_tensor sequence length must be >= {min_sequence_length}, got {weather_tensor.size(1)}"
		)
	if weather_tensor.size(2) < 3:
		raise ValueError("weather_tensor must include at least 3 features so rainfall can sit at index 2")


def validate_multimodal_pair(genomic_tensor: torch.Tensor, weather_tensor: torch.Tensor) -> None:
	validate_genomic_tensor(genomic_tensor)
	validate_weather_tensor(weather_tensor)
	if genomic_tensor.size(0) not in {1, weather_tensor.size(0)}:
		raise ValueError(
			"genomic_tensor batch size must match weather_tensor batch size, or be 1 for broadcasting"
		)
	if weather_tensor.size(0) not in {1, genomic_tensor.size(0)}:
		raise ValueError(
			"weather_tensor batch size must match genomic_tensor batch size, or be 1 for broadcasting"
		)


__all__ = [
	"TensorShapeCheck",
	"validate_genomic_tensor",
	"validate_multimodal_pair",
	"validate_weather_tensor",
]
