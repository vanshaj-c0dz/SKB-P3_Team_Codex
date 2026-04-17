from __future__ import annotations

import logging
from dataclasses import dataclass

import torch
from torch import Tensor, nn


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class StressParameters:
	max_temp_increase: float = 5.0
	drought_multiplier: float = 0.3


class ClimateScenarioGenerator:
	"""Generate synthetic climate stress scenarios and run model inference.

	The baseline environmental tensor must have shape (1, sequence_length, num_features),
	where:
	- feature index 0 is max temperature
	- feature index 2 is rainfall
	"""

	def __init__(self, stress_parameters: dict[str, float] | None = None) -> None:
		params = stress_parameters or {}
		self.params = StressParameters(
			max_temp_increase=float(params.get("max_temp_increase", 5.0)),
			drought_multiplier=float(params.get("drought_multiplier", 0.3)),
		)
		self.num_scenarios: int = 50

	def generate_scenarios(self, baseline_env_tensor: Tensor) -> Tensor:
		"""Create 50 synthetic weather futures from one baseline environment tensor.

		Args:
			baseline_env_tensor: Shape (1, sequence_length, num_features).

		Returns:
			Tensor of shape (50, sequence_length, num_features).
		"""
		if baseline_env_tensor.ndim != 3:
			raise ValueError(
				"baseline_env_tensor must have shape (1, sequence_length, num_features)"
			)
		if baseline_env_tensor.size(0) != 1:
			raise ValueError("baseline_env_tensor batch dimension must be 1")
		if baseline_env_tensor.size(-1) <= 2:
			raise ValueError("baseline_env_tensor must include rainfall at feature index 2")

		sequence_length = baseline_env_tensor.size(1)
		if sequence_length < 100:
			raise ValueError("sequence_length should be at least 100 for stress windows")

		scenarios: list[Tensor] = []

		# Scenario 1-10: Heatwaves around flowering window (days 60-90 region).
		for i in range(10):
			scenario = baseline_env_tensor.clone()
			temp_boost = 2.0 + (3.0 * i / 9.0)  # +2.0 -> +5.0
			block_len = 10 + int((20 * i) / 9.0)  # 10 -> 30 days
			start = min(60 + i, max(0, sequence_length - block_len))
			end = start + block_len
			scenario[:, start:end, 0] = scenario[:, start:end, 0] + temp_boost
			scenarios.append(scenario.squeeze(0))

		# Scenario 11-20: Droughts with rainfall suppression for 40-day blocks.
		for i in range(10):
			scenario = baseline_env_tensor.clone()
			rainfall_multiplier = 0.1 + (0.4 * i / 9.0)  # 0.1 -> 0.5
			start = min(40 + (i * 8), max(0, sequence_length - 40))
			end = start + 40
			scenario[:, start:end, 2] = scenario[:, start:end, 2] * rainfall_multiplier
			scenarios.append(scenario.squeeze(0))

		# Scenario 21-30: Floods with rainfall spikes for 5-day blocks.
		for i in range(10):
			scenario = baseline_env_tensor.clone()
			flood_multiplier = 3.0 + (2.0 * i / 9.0)  # 3.0 -> 5.0
			start = min(30 + (i * 12), max(0, sequence_length - 5))
			end = start + 5
			scenario[:, start:end, 2] = scenario[:, start:end, 2] * flood_multiplier
			scenarios.append(scenario.squeeze(0))

		# Scenario 31-50: Combined heat + drought stress.
		for i in range(20):
			scenario = baseline_env_tensor.clone()

			# Heat block.
			temp_boost = 2.5 + (self.params.max_temp_increase - 2.5) * (i / 19.0)
			heat_len = 12 + int((18 * i) / 19.0)  # 12 -> 30
			heat_start = min(55 + (i % 8), max(0, sequence_length - heat_len))
			heat_end = heat_start + heat_len
			scenario[:, heat_start:heat_end, 0] = scenario[:, heat_start:heat_end, 0] + temp_boost

			# Drought block.
			drought_multiplier = max(0.1, min(0.5, self.params.drought_multiplier + (0.2 * i / 19.0)))
			dry_len = 40
			dry_start = min(70 + (i % 10), max(0, sequence_length - dry_len))
			dry_end = dry_start + dry_len
			scenario[:, dry_start:dry_end, 2] = scenario[:, dry_start:dry_end, 2] * drought_multiplier

			scenarios.append(scenario.squeeze(0))

		if len(scenarios) != self.num_scenarios:
			raise RuntimeError(f"Expected {self.num_scenarios} scenarios, got {len(scenarios)}")

		batch_env_tensors = torch.stack(scenarios, dim=0)
		logger.info("Generated %d climate scenarios with shape %s", self.num_scenarios, tuple(batch_env_tensors.shape))
		return batch_env_tensors

	def run_inference(self, model: nn.Module, genomic_tensor: Tensor, batch_env_tensors: Tensor) -> dict[str, Tensor]:
		"""Run no-grad inference across all generated climate scenarios.

		Args:
			model: Multimodal model with signature model(genomic_x, env_x) returning dict[str, Tensor].
			genomic_tensor: Tensor of shape (1, 3, 206, 206).
			batch_env_tensors: Tensor of shape (num_scenarios, sequence_length, num_features).

		Returns:
			Dictionary of trait predictions, where each tensor has first dimension
			equal to num_scenarios.
		"""
		if genomic_tensor.ndim != 4:
			raise ValueError("genomic_tensor must have shape (1, 3, 206, 206)")
		if genomic_tensor.size(0) != 1:
			raise ValueError("genomic_tensor batch dimension must be 1")
		if batch_env_tensors.ndim != 3:
			raise ValueError(
				"batch_env_tensors must have shape (num_scenarios, sequence_length, num_features)"
			)

		num_scenarios = batch_env_tensors.size(0)
		expanded_genomic = genomic_tensor.expand(num_scenarios, -1, -1, -1)

		model_device = next(model.parameters()).device
		expanded_genomic = expanded_genomic.to(model_device)
		batch_env_tensors = batch_env_tensors.to(model_device)

		model.eval()
		with torch.no_grad():
			predictions = model(expanded_genomic, batch_env_tensors)

		if not isinstance(predictions, dict):
			raise TypeError("Model output must be a dictionary of trait predictions")
		return predictions


__all__: list[str] = ["ClimateScenarioGenerator"]
