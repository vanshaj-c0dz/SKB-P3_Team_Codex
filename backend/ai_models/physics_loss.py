from __future__ import annotations

from typing import Any

import torch
from torch import Tensor, nn


class PhysicsGuidedLoss(nn.Module):
	"""Combine statistical loss with biology-aware penalty terms.

	This loss adds a drought realism penalty on the `yield` prediction:
	if total rainfall is below `min_water_mm`, predicted yield should not exceed
	`max_dry_yield`.
	"""

	def __init__(self, lambda_penalty: float, biological_thresholds: dict[str, float]) -> None:
		super().__init__()

		if lambda_penalty < 0.0:
			raise ValueError("lambda_penalty must be >= 0")
		if "min_water_mm" not in biological_thresholds:
			raise ValueError("biological_thresholds must include 'min_water_mm'")
		if "max_dry_yield" not in biological_thresholds:
			raise ValueError("biological_thresholds must include 'max_dry_yield'")

		self.lambda_penalty: float = float(lambda_penalty)
		self.min_water_mm: float = float(biological_thresholds["min_water_mm"])
		self.max_dry_yield: float = float(biological_thresholds["max_dry_yield"])
		self.mse = nn.MSELoss()

	def forward(
		self,
		preds_dict: dict[str, Tensor],
		targets_dict: dict[str, Tensor],
		raw_env_data: Tensor,
	) -> tuple[Tensor, dict[str, Tensor]]:
		"""Compute total loss = MSE + lambda * physics_penalty.

		Args:
			preds_dict: Predicted trait tensors. Each value is shape (B, 1) or (B,).
			targets_dict: Ground-truth trait tensors matching keys from preds_dict.
			raw_env_data: Environmental tensor of shape (B, T, F), where rainfall
				is feature index 2.

		Returns:
			total_loss: Scalar differentiable tensor.
			metrics: Dict containing detached values for `mse_loss` and
				`physics_penalty` for logging.
		"""
		if "yield" not in preds_dict:
			raise KeyError("preds_dict must include a 'yield' key for physics penalty")
		if raw_env_data.ndim != 3:
			raise ValueError(
				f"Expected raw_env_data shape (batch, sequence, features), got {tuple(raw_env_data.shape)}"
			)
		if raw_env_data.size(-1) <= 2:
			raise ValueError("raw_env_data must contain rainfall at feature index 2")

		mse_terms: list[Tensor] = []
		for trait_name, preds in preds_dict.items():
			if trait_name not in targets_dict:
				raise KeyError(f"Missing target tensor for trait '{trait_name}'")

			target = targets_dict[trait_name]
			pred_tensor = preds.float()
			target_tensor = target.float()

			if pred_tensor.ndim == 1:
				pred_tensor = pred_tensor.unsqueeze(-1)
			if target_tensor.ndim == 1:
				target_tensor = target_tensor.unsqueeze(-1)

			mse_terms.append(self.mse(pred_tensor, target_tensor))

		if not mse_terms:
			raise ValueError("preds_dict is empty; cannot compute loss")

		mse_loss = torch.stack(mse_terms).sum()

		rainfall = raw_env_data[:, :, 2].float()  # (B, T)
		total_rainfall = rainfall.sum(dim=1)  # (B,)
		drought_mask = total_rainfall < self.min_water_mm  # (B,)

		yield_pred = preds_dict["yield"].float()
		if yield_pred.ndim == 2 and yield_pred.size(-1) == 1:
			yield_pred = yield_pred.squeeze(-1)
		elif yield_pred.ndim != 1:
			raise ValueError("preds_dict['yield'] must have shape (B,) or (B, 1)")

		max_dry_yield = torch.tensor(self.max_dry_yield, device=yield_pred.device, dtype=yield_pred.dtype)
		violation = torch.relu(yield_pred - max_dry_yield)  # (B,)

		drought_mask_f = drought_mask.to(dtype=violation.dtype)
		masked_violation = violation * drought_mask_f
		physics_penalty = masked_violation.mean()

		total_loss = mse_loss + (self.lambda_penalty * physics_penalty)

		metrics: dict[str, Tensor] = {
			"mse_loss": mse_loss.detach(),
			"physics_penalty": physics_penalty.detach(),
		}
		return total_loss, metrics


__all__: list[str] = ["PhysicsGuidedLoss"]
