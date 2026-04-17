from __future__ import annotations

from pathlib import Path

import torch
from torch import Tensor, nn


class _OnnxWrapper(nn.Module):
    """Wrap dict-output model to ONNX-friendly tuple output."""

    def __init__(self, model: nn.Module, trait_names: list[str]) -> None:
        super().__init__()
        self.model = model
        self.trait_names = trait_names

    def forward(self, genomic_x: Tensor, env_x: Tensor) -> tuple[Tensor, ...]:
        outputs = self.model(genomic_x, env_x)
        return tuple(outputs[name] for name in self.trait_names)


def export_master_model_to_onnx(
    model: nn.Module,
    genomic_example: Tensor,
    env_example: Tensor,
    output_path: str | Path,
    *,
    opset_version: int = 17,
) -> Path:
    """Export a multimodal model to ONNX for faster inference serving."""
    trait_names = list(getattr(model, "target_traits", []))
    if not trait_names:
        raise ValueError("Model must expose non-empty 'target_traits' for ONNX export")

    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    wrapper = _OnnxWrapper(model.eval(), trait_names)
    dynamic_axes = {
        "genomic_x": {0: "batch_size", 2: "num_snps"},
        "env_x": {0: "batch_size", 1: "sequence_length"},
    }
    for name in trait_names:
        dynamic_axes[name] = {0: "batch_size"}

    torch.onnx.export(
        wrapper,
        (genomic_example, env_example),
        str(out_path),
        input_names=["genomic_x", "env_x"],
        output_names=trait_names,
        dynamic_axes=dynamic_axes,
        opset_version=opset_version,
        do_constant_folding=True,
    )
    return out_path


__all__: list[str] = ["export_master_model_to_onnx"]
