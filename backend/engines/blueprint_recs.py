from __future__ import annotations

from typing import Any

import numpy as np

try:
	import torch
	from torch import Tensor
except Exception:  # pragma: no cover - keeps module importable even without torch runtime
	torch = None
	Tensor = Any  # type: ignore[assignment]


def _to_numpy_2d(predictions_matrix: np.ndarray | Tensor) -> np.ndarray:
	"""Convert numpy/torch input matrix into a validated 2D numpy array."""
	if torch is not None and isinstance(predictions_matrix, torch.Tensor):
		array = predictions_matrix.detach().cpu().numpy()
	else:
		array = np.asarray(predictions_matrix)

	if array.ndim != 2:
		raise ValueError(
			f"predictions_matrix must be 2D with shape (num_genotypes, num_scenarios), got {array.shape}"
		)
	if array.shape[1] == 0:
		raise ValueError("predictions_matrix must contain at least one scenario column")
	return array.astype(np.float64, copy=False)


def calculate_resilience_score(predictions_matrix: np.ndarray | Tensor) -> np.ndarray:
	"""Compute climate resilience scores (0-100) per genotype.

	The score rewards high mean yield while penalizing instability and worst-case
	failures, then normalizes scores to a 0-100 range.

	Formula before normalization:
		raw = (mean_yield * 0.7) - (std_dev * 0.3) - (worst_case_penalty * 0.2)

	Returns:
		1D numpy array of shape (num_genotypes,) with values in [0, 100].
	"""
	matrix = _to_numpy_2d(predictions_matrix)

	mean_yield = matrix.mean(axis=1)
	std_dev = matrix.std(axis=1)
	worst_case = matrix.min(axis=1)

	# Penalize poor behavior in extreme scenarios via gap from mean to worst-case.
	worst_case_penalty = np.maximum(mean_yield - worst_case, 0.0)

	raw_scores = (mean_yield * 0.7) - (std_dev * 0.3) - (worst_case_penalty * 0.2)

	raw_min = float(raw_scores.min())
	raw_max = float(raw_scores.max())

	if np.isclose(raw_min, raw_max):
		return np.full_like(raw_scores, 50.0, dtype=np.float64)

	normalized = (raw_scores - raw_min) / (raw_max - raw_min)
	return normalized * 100.0


def rank_parents(resilience_scores: np.ndarray | Tensor, top_n: int = 2) -> list[int]:
	"""Return top genotype indices sorted by descending resilience score."""
	if top_n < 1:
		raise ValueError("top_n must be >= 1")

	if torch is not None and isinstance(resilience_scores, torch.Tensor):
		scores = resilience_scores.detach().cpu().numpy().astype(np.float64, copy=False)
	else:
		scores = np.asarray(resilience_scores, dtype=np.float64)

	if scores.ndim != 1:
		raise ValueError(f"resilience_scores must be 1D, got shape {scores.shape}")
	if scores.size == 0:
		raise ValueError("resilience_scores cannot be empty")

	# Stable descending sort to keep deterministic ordering for ties.
	ranked_indices = np.argsort(-scores, kind="mergesort")
	n = min(top_n, int(scores.size))
	return [int(idx) for idx in ranked_indices[:n]]


def generate_soil_blueprint(genotype_id: str, top_env_vulnerabilities: list[str]) -> list[str]:
	"""Generate actionable rule-based recommendations from vulnerability tags."""
	if not genotype_id.strip():
		raise ValueError("genotype_id must be a non-empty string")

	vulnerability_text = " ".join(top_env_vulnerabilities).lower()
	recommendations: list[str] = [f"Blueprint for genotype {genotype_id}:"]

	if "drought" in vulnerability_text:
		recommendations.append(
			"Recommendation: Increase soil organic matter and apply potassium to improve water retention."
		)

	if "heatwave" in vulnerability_text or "heat" in vulnerability_text:
		recommendations.append(
			"Recommendation: Shift sowing window by +10 days to avoid peak heat during anthesis."
		)

	if len(recommendations) == 1:
		recommendations.append(
			"Recommendation: Maintain balanced NPK and monitor in-season weather advisories for adaptive management."
		)

	return recommendations


__all__: list[str] = [
	"calculate_resilience_score",
	"rank_parents",
	"generate_soil_blueprint",
]
