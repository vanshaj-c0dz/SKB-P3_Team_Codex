from __future__ import annotations

import logging
from collections.abc import Mapping
from copy import deepcopy
from typing import Any

import torch
from torch.cuda.amp import GradScaler, autocast
from torch import Tensor, nn
from torch.utils.data import DataLoader

from ai_models.transfer_learning import MultiTraitPredictor


logger = logging.getLogger(__name__)


def _move_targets_to_device(targets: Mapping[str, Any], device: torch.device) -> dict[str, Tensor]:
    moved_targets: dict[str, Tensor] = {}
    for trait_name, target_value in targets.items():
        if isinstance(target_value, Tensor):
            moved_targets[trait_name] = target_value.to(device)
        else:
            moved_targets[trait_name] = torch.as_tensor(target_value, dtype=torch.float32, device=device)
    return moved_targets


def _unpack_batch(batch: Any, device: torch.device) -> tuple[Tensor, dict[str, Tensor]]:
    """Support common dataloader batch formats for multitask regression."""
    if isinstance(batch, Mapping):
        inputs = batch.get("x")
        if inputs is None:
            inputs = batch.get("inputs")
        if inputs is None:
            inputs = batch.get("features")
        if inputs is None:
            inputs = batch.get("snps")

        targets = batch.get("y")
        if targets is None:
            targets = batch.get("targets")
        if targets is None:
            targets = batch.get("labels")

        if inputs is None or targets is None:
            raise ValueError("Dictionary batch must contain input and target keys.")
        if not isinstance(inputs, Tensor):
            inputs = torch.as_tensor(inputs, dtype=torch.float32)
        if not isinstance(targets, Mapping):
            raise ValueError("Dictionary batch targets must be a mapping of trait names to tensors.")
        return inputs.to(device), _move_targets_to_device(targets, device)

    if isinstance(batch, (tuple, list)) and len(batch) == 2:
        inputs, targets = batch
        if not isinstance(inputs, Tensor):
            inputs = torch.as_tensor(inputs, dtype=torch.float32)
        if not isinstance(targets, Mapping):
            raise ValueError("Batch targets must be a mapping of trait names to tensors.")
        return inputs.to(device), _move_targets_to_device(targets, device)

    raise ValueError("Unsupported batch format. Expected a mapping or a 2-tuple.")


def _compute_multitask_mse_loss(predictions: dict[str, Tensor], targets: dict[str, Tensor]) -> Tensor:
    mse = nn.MSELoss()
    loss_terms: list[Tensor] = []

    for trait_name, prediction in predictions.items():
        if trait_name not in targets:
            raise KeyError(f"Missing target tensor for trait '{trait_name}'.")
        target_tensor = targets[trait_name].float()
        prediction_tensor = prediction.float()
        if target_tensor.ndim == 1:
            target_tensor = target_tensor.unsqueeze(-1)
        if prediction_tensor.ndim == 1:
            prediction_tensor = prediction_tensor.unsqueeze(-1)
        loss_terms.append(mse(prediction_tensor, target_tensor))

    if not loss_terms:
        raise ValueError("No loss terms were produced. Check trait configuration.")

    return torch.stack(loss_terms).sum()


def _run_validation(
    model: MultiTraitPredictor,
    val_loader: DataLoader,
    device: torch.device,
    *,
    amp_enabled: bool,
) -> float:
    model.eval()
    total_loss = 0.0
    num_batches = 0

    with torch.no_grad():
        for batch in val_loader:
            inputs, targets = _unpack_batch(batch, device)
            with autocast(enabled=amp_enabled):
                predictions = model(inputs)
                loss = _compute_multitask_mse_loss(predictions, targets)
            total_loss += float(loss.item())
            num_batches += 1

    return total_loss / max(num_batches, 1)


def train_model(
    model: MultiTraitPredictor,
    train_loader: DataLoader,
    val_loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    num_epochs: int,
    device: torch.device | str,
    *,
    use_amp: bool = True,
) -> dict[str, Any]:
    """Train a multitrait genomic model with MSE and early stopping.

    Returns a history dictionary containing training and validation losses.
    """
    if num_epochs < 1:
        raise ValueError("num_epochs must be >= 1")

    device_obj = torch.device(device)
    model.to(device_obj)
    amp_enabled = use_amp and device_obj.type == "cuda"
    scaler = GradScaler(enabled=amp_enabled)

    best_val_loss = float("inf")
    best_state = deepcopy(model.state_dict())
    patience = 5
    epochs_without_improvement = 0

    history: dict[str, Any] = {
        "train_loss": [],
        "val_loss": [],
    }

    logger.info(
        "Starting training for %d epochs on device %s (AMP enabled: %s)",
        num_epochs,
        device_obj,
        amp_enabled,
    )

    for epoch_index in range(1, num_epochs + 1):
        model.train()
        running_train_loss = 0.0
        num_train_batches = 0

        for batch in train_loader:
            inputs, targets = _unpack_batch(batch, device_obj)

            optimizer.zero_grad(set_to_none=True)
            with autocast(enabled=amp_enabled):
                predictions = model(inputs)
                loss = _compute_multitask_mse_loss(predictions, targets)

            if amp_enabled:
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()
            else:
                loss.backward()
                optimizer.step()

            running_train_loss += float(loss.item())
            num_train_batches += 1

        avg_train_loss = running_train_loss / max(num_train_batches, 1)
        avg_val_loss = _run_validation(model, val_loader, device_obj, amp_enabled=amp_enabled)

        history["train_loss"].append(avg_train_loss)
        history["val_loss"].append(avg_val_loss)

        logger.info(
            "Epoch %d/%d - train_loss=%.6f - val_loss=%.6f",
            epoch_index,
            num_epochs,
            avg_train_loss,
            avg_val_loss,
        )

        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            best_state = deepcopy(model.state_dict())
            epochs_without_improvement = 0
            logger.info("Validation improved; checkpoint state updated.")
        else:
            epochs_without_improvement += 1
            logger.info("No validation improvement for %d epoch(s).", epochs_without_improvement)
            if epochs_without_improvement >= patience:
                logger.warning("Early stopping triggered after %d epochs without improvement.", patience)
                break

    model.load_state_dict(best_state)
    model.to(device_obj)
    history["best_val_loss"] = best_val_loss
    history["epochs_ran"] = len(history["train_loss"])
    return history


__all__: list[str] = ["train_model"]
