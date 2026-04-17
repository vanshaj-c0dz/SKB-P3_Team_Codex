from __future__ import annotations

from typing import Any

import torch
from torch import Tensor, nn


def _set_dropout_train_mode(module: nn.Module) -> None:
    """Enable train mode only for dropout modules during MC inference."""
    if isinstance(module, (nn.Dropout, nn.Dropout1d, nn.Dropout2d, nn.Dropout3d)):
        module.train()


def mc_dropout_predict(
    model: nn.Module,
    genomic_x: Tensor,
    env_x: Tensor,
    *,
    num_samples: int = 10,
) -> dict[str, dict[str, Tensor]]:
    """Estimate predictive uncertainty via Monte Carlo Dropout.

    Runs the same input multiple times with dropout active at inference and
    returns per-trait mean and standard deviation tensors.
    """
    if num_samples < 2:
        raise ValueError("num_samples must be >= 2 for uncertainty estimation")
    if genomic_x.ndim != 3:
        raise ValueError(f"genomic_x must be 3D (B,1,N), got {tuple(genomic_x.shape)}")
    if env_x.ndim != 3:
        raise ValueError(f"env_x must be 3D (B,T,F), got {tuple(env_x.shape)}")
    if genomic_x.size(0) != env_x.size(0):
        raise ValueError("genomic_x and env_x batch sizes must match")

    device = next(model.parameters()).device
    genomic_input = genomic_x.to(device)
    env_input = env_x.to(device)

    model.eval()
    model.apply(_set_dropout_train_mode)

    trait_runs: dict[str, list[Tensor]] = {}
    with torch.no_grad():
        for _ in range(num_samples):
            outputs: Any = model(genomic_input, env_input)
            if not isinstance(outputs, dict):
                raise TypeError("Model output must be a dictionary for MC dropout")
            for trait_name, pred in outputs.items():
                pred_tensor = pred.float()
                if pred_tensor.ndim == 1:
                    pred_tensor = pred_tensor.unsqueeze(-1)
                trait_runs.setdefault(trait_name, []).append(pred_tensor)

    summary: dict[str, dict[str, Tensor]] = {}
    for trait_name, preds in trait_runs.items():
        stacked = torch.stack(preds, dim=0)  # (S, B, 1)
        summary[trait_name] = {
            "mean": stacked.mean(dim=0),
            "std": stacked.std(dim=0, unbiased=False),
        }

    return summary


__all__: list[str] = ["mc_dropout_predict"]
