from __future__ import annotations

from collections.abc import Iterable

import torch
from torch import Tensor, nn

from ai_models.crop_dngp import CropDNGPBackbone
from ai_models.env_encoder import EnvTransformerEncoder


class TraitHead(nn.Module):
	"""Regression head for one trait from fused multimodal features."""

	def __init__(self, input_dim: int, hidden_dim: int, dropout: float = 0.25) -> None:
		super().__init__()
		if input_dim < 1:
			raise ValueError("input_dim must be >= 1")
		if hidden_dim < 1:
			raise ValueError("hidden_dim must be >= 1")
		if not 0.0 <= dropout <= 1.0:
			raise ValueError("dropout must be between 0 and 1")

		mid_dim = max(hidden_dim // 2, 1)
		self.net = nn.Sequential(
			nn.Linear(input_dim, hidden_dim),
			nn.ReLU(inplace=True),
			nn.Dropout(p=dropout),
			nn.Linear(hidden_dim, mid_dim),
			nn.ReLU(inplace=True),
			nn.Dropout(p=dropout),
			nn.Linear(mid_dim, 1),
		)

	def forward(self, x: Tensor) -> Tensor:
		return self.net(x)


class CrossModalFusion(nn.Module):
	"""Cross-attention fusion for genomic and environmental feature vectors.

	Input:
		genomic_features: (batch_size, genomic_dim)
		env_features: (batch_size, env_dim)

	Output:
		fused_features: (batch_size, fusion_dim)

	Mechanism:
		1) Project both modalities to a shared fusion dimension
		2) Use cross-attention where genomic query attends to environmental key/value
		3) Apply a learned gate to blend residual genomic signal with attended context
	"""

	def __init__(
		self,
		genomic_dim: int,
		env_dim: int,
		fusion_dim: int = 256,
		num_heads: int = 4,
		dropout: float = 0.2,
	) -> None:
		super().__init__()

		if genomic_dim < 1:
			raise ValueError("genomic_dim must be >= 1")
		if env_dim < 1:
			raise ValueError("env_dim must be >= 1")
		if fusion_dim < 1:
			raise ValueError("fusion_dim must be >= 1")
		if num_heads < 1:
			raise ValueError("num_heads must be >= 1")
		if fusion_dim % num_heads != 0:
			raise ValueError("fusion_dim must be divisible by num_heads")

		self.genomic_proj = nn.Linear(genomic_dim, fusion_dim)
		self.env_proj = nn.Linear(env_dim, fusion_dim)
		self.cross_attn = nn.MultiheadAttention(
			embed_dim=fusion_dim,
			num_heads=num_heads,
			dropout=dropout,
			batch_first=True,
		)

		# Gate decides how much attended env signal should influence genomic state.
		self.gate = nn.Sequential(
			nn.Linear(fusion_dim * 2, fusion_dim),
			nn.Sigmoid(),
		)

		self.output_norm = nn.LayerNorm(fusion_dim)
		self.output_mlp = nn.Sequential(
			nn.Linear(fusion_dim, fusion_dim),
			nn.GELU(),
			nn.Dropout(p=dropout),
		)

	def forward(self, genomic_features: Tensor, env_features: Tensor) -> Tensor:
		"""Fuse genomic and environment embeddings with cross-attention.

		Args:
			genomic_features: Tensor of shape (B, G)
			env_features: Tensor of shape (B, E)

		Returns:
			Tensor of shape (B, F), where F is fusion_dim.
		"""
		if genomic_features.ndim != 2:
			raise ValueError(f"Expected genomic_features with shape (B, G), got {tuple(genomic_features.shape)}")
		if env_features.ndim != 2:
			raise ValueError(f"Expected env_features with shape (B, E), got {tuple(env_features.shape)}")
		if genomic_features.size(0) != env_features.size(0):
			raise ValueError("Batch size mismatch between genomic and environmental features")

		g = self.genomic_proj(genomic_features)  # (B, F)
		e = self.env_proj(env_features)  # (B, F)

		# MultiheadAttention expects sequence form, so treat each modality as a 1-token sequence.
		g_tokens = g.unsqueeze(1)  # (B, 1, F)
		e_tokens = e.unsqueeze(1)  # (B, 1, F)

		attended, _ = self.cross_attn(query=g_tokens, key=e_tokens, value=e_tokens)  # (B, 1, F)
		attended = attended.squeeze(1)  # (B, F)

		gate_value = self.gate(torch.cat([g, attended], dim=-1))  # (B, F)
		fused = gate_value * attended + (1.0 - gate_value) * g
		fused = self.output_norm(fused)
		fused = fused + self.output_mlp(fused)
		return fused


class MasterBreedingModel(nn.Module):
	"""End-to-end multimodal model for genotype × environment prediction.

	Inputs:
		genomic_x: (batch_size, 3, 206, 206)
		env_x: (batch_size, sequence_length, num_weather_features)

	Outputs:
		Dictionary[str, Tensor] with trait-specific tensors of shape (batch_size, 1)
	"""

	def __init__(
		self,
		target_traits: Iterable[str],
		*,
		num_weather_features: int,
		genomic_feature_dim: int = 256,
		env_feature_dim: int = 128,
		fusion_dim: int = 256,
		trait_hidden_dim: int = 128,
		dropout: float = 0.25,
	) -> None:
		super().__init__()

		traits: list[str] = [t.strip().lower() for t in target_traits if t.strip()]
		if not traits:
			raise ValueError("target_traits must contain at least one non-empty trait")

		self.target_traits: list[str] = traits

		self.genomic_backbone = CropDNGPBackbone(
			input_channels=3,
			feature_dim=genomic_feature_dim,
			image_size=206,
			strict_image_size=False,
			dropout=dropout,
		)
		self.env_encoder = EnvTransformerEncoder(
			num_weather_features=num_weather_features,
			d_model=env_feature_dim,
			nhead=4,
			num_layers=3,
			dim_feedforward=max(env_feature_dim * 2, 128),
			dropout=dropout,
		)

		self.fusion = CrossModalFusion(
			genomic_dim=genomic_feature_dim,
			env_dim=env_feature_dim,
			fusion_dim=fusion_dim,
			num_heads=4,
			dropout=dropout,
		)

		self.trait_heads: nn.ModuleDict = nn.ModuleDict(
			{
				trait: TraitHead(input_dim=fusion_dim, hidden_dim=trait_hidden_dim, dropout=dropout)
				for trait in self.target_traits
			}
		)

	def forward(self, genomic_x: Tensor, env_x: Tensor) -> dict[str, Tensor]:
		"""Run full multimodal forward pass.

		Args:
			genomic_x: SNP tensor with shape (B, 1, N).
			env_x: Weather tensor with shape (B, T, Fw).

		Returns:
			Dict mapping trait names to regression outputs of shape (B, 1).
		"""
		genomic_features = self.genomic_backbone(genomic_x)  # (B, G)
		env_features = self.env_encoder(env_x)  # (B, E)
		fused_features = self.fusion(genomic_features, env_features)  # (B, F)

		outputs: dict[str, Tensor] = {}
		for trait_name, head in self.trait_heads.items():
			outputs[trait_name] = head(fused_features)
		return outputs


__all__: list[str] = ["CrossModalFusion", "MasterBreedingModel"]
