from __future__ import annotations

from pathlib import Path
from typing import Any

import torch
from torch import Tensor, nn


class SEBlock(nn.Module):
    """Squeeze-and-Excitation attention block for channel-wise recalibration."""

    def __init__(self, in_channels: int, reduction: int = 16) -> None:
        super().__init__()
        if in_channels < 1:
            raise ValueError("in_channels must be >= 1")
        if reduction < 1:
            raise ValueError("reduction must be >= 1")

        squeezed_channels = max(in_channels // reduction, 1)
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Sequential(
            nn.Linear(in_channels, squeezed_channels, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(squeezed_channels, in_channels, bias=False),
            nn.Sigmoid(),
        )

    def forward(self, x: Tensor) -> Tensor:
        if x.ndim != 4:
            raise ValueError(f"SEBlock expects 4D input (B, C, H, W), got {tuple(x.shape)}")
        batch_size, channels, _, _ = x.size()
        y = self.avg_pool(x).view(batch_size, channels)
        y = self.fc(y).view(batch_size, channels, 1, 1)
        return x * y.expand_as(x)


class CropDNGPBackbone(nn.Module):
    """SoyDNGP-style 2D CNN backbone extracted from the reference architecture.

    Expected input shape:
        x: Tensor of shape (batch_size, 3, 206, 206)

    Output shape:
        Tensor of shape (batch_size, feature_dim)

    Notes:
        - This backbone is intentionally feature-extractor only.
        - It mirrors the extracted 2D model structure used in the official package.
        - A final projection layer is kept configurable so downstream heads can use
          a stable feature size even if a different embedding dimensionality is desired.
    """

    def __init__(
        self,
        input_channels: int = 3,
        feature_dim: int = 1024,
        image_size: int = 206,
        dropout: float = 0.3,
        strict_image_size: bool = False,
        pretrained_weights_path: str | Path | None = None,
    ) -> None:
        super().__init__()

        if input_channels < 1:
            raise ValueError("input_channels must be >= 1")
        if feature_dim < 1:
            raise ValueError("feature_dim must be >= 1")
        if image_size < 1:
            raise ValueError("image_size must be >= 1")
        if not 0.0 <= dropout <= 1.0:
            raise ValueError("dropout must be between 0 and 1")

        self.input_channels = input_channels
        self.feature_dim = feature_dim
        self.image_size = image_size
        self.strict_image_size = strict_image_size

        # The extracted model starts with SE attention on the raw 3-channel DNA image.
        self.se1 = SEBlock(input_channels, reduction=16)

        # CNN_Block.1: (3 -> 32, kernel=3, stride=1, padding=1)
        self.conv1 = nn.Conv2d(input_channels, 32, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(32)
        self.drop1 = nn.Dropout2d(dropout)
        self.relu1 = nn.ReLU(inplace=True)

        # CNN_Block.2: (32 -> 64, kernel=4, stride=2, padding=1)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=4, stride=2, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(64)
        self.drop2 = nn.Dropout2d(dropout)
        self.relu2 = nn.ReLU(inplace=True)

        self.se2 = SEBlock(64, reduction=16)

        # Feature extractor tail. Adaptive pooling makes the feature vector robust.
        self.adaptive_pool = nn.AdaptiveAvgPool2d((4, 4))
        self.flatten = nn.Flatten()

        self.output_projection: nn.Module
        base_feature_dim = 64 * 4 * 4  # 1024
        if feature_dim == base_feature_dim:
            self.output_projection = nn.Identity()
        else:
            self.output_projection = nn.Sequential(
                nn.Linear(base_feature_dim, feature_dim, bias=False),
                nn.BatchNorm1d(feature_dim),
                nn.ReLU(inplace=True),
                nn.Dropout(dropout),
            )

        self._reset_parameters()

        if pretrained_weights_path is not None:
            self.load_soydngp_weights(pretrained_weights_path, strict=False)

    def _reset_parameters(self) -> None:
        """Initialize weights in a stable, CNN-friendly way."""
        for module in self.modules():
            if isinstance(module, nn.Conv2d):
                nn.init.kaiming_normal_(module.weight, nonlinearity="relu")
            elif isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)

    def load_soydngp_weights(self, weights_path: str | Path, *, strict: bool = False) -> None:
        """Load a state_dict extracted from the Dockerized SoyDNGP model."""
        path = Path(weights_path)
        if not path.exists():
            raise FileNotFoundError(f"Weights file not found: {path}")

        state_dict: Any = torch.load(path, map_location="cpu")
        if isinstance(state_dict, dict) and "model_state_dict" in state_dict:
            state_dict = state_dict["model_state_dict"]
        if not isinstance(state_dict, dict):
            raise TypeError("Expected a state_dict or checkpoint dict with 'model_state_dict'.")

        self.load_state_dict(state_dict, strict=strict)

    def forward(self, x: Tensor) -> Tensor:
        """Convert a DNA image tensor into a compact feature vector.

        Args:
            x: Tensor of shape (batch_size, 3, 206, 206) by default.

        Returns:
            Tensor of shape (batch_size, feature_dim).
        """
        if x.ndim != 4:
            raise ValueError(
                f"Expected 4D input tensor (batch, channels, height, width), got shape {tuple(x.shape)}"
            )
        if x.size(1) != self.input_channels:
            raise ValueError(f"Expected {self.input_channels} input channels, got {x.size(1)}")
        if self.strict_image_size and (x.size(2) != self.image_size or x.size(3) != self.image_size):
            raise ValueError(
                f"Expected image size ({self.image_size}, {self.image_size}), got ({x.size(2)}, {x.size(3)})"
            )

        x = x.float()
        x = self.se1(x)
        x = self.relu1(self.drop1(self.bn1(self.conv1(x))))
        x = self.relu2(self.drop2(self.bn2(self.conv2(x))))
        x = self.se2(x)
        x = self.adaptive_pool(x)
        features = self.flatten(x)
        features = self.output_projection(features)
        return features


__all__: list[str] = ["SEBlock", "CropDNGPBackbone"]
