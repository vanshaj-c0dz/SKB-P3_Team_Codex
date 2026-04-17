from __future__ import annotations

import math

import torch
from torch import Tensor, nn


class SinusoidalPositionalEncoding(nn.Module):
	"""Standard sinusoidal positional encoding for time-series tokens.

	This module adds a deterministic position signal to each time step so that
	temporal order is retained by attention layers.
	"""

	def __init__(self, d_model: int, max_len: int = 4096, dropout: float = 0.1) -> None:
		super().__init__()
		if d_model < 1:
			raise ValueError("d_model must be >= 1")
		if max_len < 1:
			raise ValueError("max_len must be >= 1")
		if not 0.0 <= dropout <= 1.0:
			raise ValueError("dropout must be between 0 and 1")

		position = torch.arange(0, max_len, dtype=torch.float32).unsqueeze(1)
		div_term = torch.exp(torch.arange(0, d_model, 2, dtype=torch.float32) * (-math.log(10000.0) / d_model))

		pe = torch.zeros(max_len, d_model, dtype=torch.float32)
		pe[:, 0::2] = torch.sin(position * div_term)
		if d_model % 2 == 1:
			pe[:, 1::2] = torch.cos(position * div_term[:-1])
		else:
			pe[:, 1::2] = torch.cos(position * div_term)

		# Buffer shape: (1, max_len, d_model) for batch-first addition.
		self.register_buffer("pe", pe.unsqueeze(0), persistent=False)
		self.dropout = nn.Dropout(p=dropout)

	def forward(self, x: Tensor) -> Tensor:
		"""Add position encoding.

		Args:
			x: Tensor of shape (batch_size, sequence_length, d_model).

		Returns:
			Tensor with the same shape after positional signal injection.
		"""
		if x.ndim != 3:
			raise ValueError(f"Expected 3D tensor (batch, seq, d_model), got shape {tuple(x.shape)}")
		seq_len = x.size(1)
		if seq_len > self.pe.size(1):
			raise ValueError(
				f"Sequence length {seq_len} exceeds max_len {self.pe.size(1)} configured for positional encoding"
			)
		x = x + self.pe[:, :seq_len, :]
		return self.dropout(x)


class EnvTransformerEncoder(nn.Module):
	"""Encode multivariate daily weather sequences into fixed-size embeddings.

	Input shape:
		(batch_size, sequence_length, num_weather_features)

	Output shape:
		(batch_size, d_model)

	Pipeline:
		1) Linear projection from weather feature space -> d_model
		2) Sinusoidal positional encoding
		3) Transformer encoder layers (self-attention over days)
		4) Mean pooling over sequence dimension for fixed-size representation
	"""

	def __init__(
		self,
		num_weather_features: int,
		d_model: int = 128,
		nhead: int = 4,
		num_layers: int = 3,
		dim_feedforward: int = 256,
		dropout: float = 0.1,
		max_seq_len: int = 1024,
	) -> None:
		super().__init__()

		if num_weather_features < 1:
			raise ValueError("num_weather_features must be >= 1")
		if d_model < 1:
			raise ValueError("d_model must be >= 1")
		if nhead < 1:
			raise ValueError("nhead must be >= 1")
		if d_model % nhead != 0:
			raise ValueError("d_model must be divisible by nhead")
		if num_layers < 1:
			raise ValueError("num_layers must be >= 1")
		if dim_feedforward < d_model:
			raise ValueError("dim_feedforward should be >= d_model")
		if max_seq_len < 1:
			raise ValueError("max_seq_len must be >= 1")

		self.num_weather_features = num_weather_features
		self.d_model = d_model

		self.input_projection = nn.Linear(num_weather_features, d_model)
		self.positional_encoding = SinusoidalPositionalEncoding(
			d_model=d_model,
			max_len=max_seq_len,
			dropout=dropout,
		)

		encoder_layer = nn.TransformerEncoderLayer(
			d_model=d_model,
			nhead=nhead,
			dim_feedforward=dim_feedforward,
			dropout=dropout,
			activation="gelu",
			batch_first=True,
			norm_first=True,
		)
		self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
		self.norm = nn.LayerNorm(d_model)

	def forward(self, x: Tensor) -> Tensor:
		"""Encode weather time-series into a fixed-size feature vector.

		Args:
			x: Input weather tensor with shape
			   (batch_size, sequence_length, num_weather_features).

		Returns:
			Encoded environmental embedding tensor with shape
			(batch_size, d_model).

		Tensor shape transitions:
			1) Input: (B, T, F)
			2) Projection: (B, T, D)
			3) +Positional Encoding: (B, T, D)
			4) Transformer Output: (B, T, D)
			5) Mean Pool over T: (B, D)
		"""
		if x.ndim != 3:
			raise ValueError(
				f"Expected input shape (batch_size, sequence_length, num_weather_features), got {tuple(x.shape)}"
			)
		if x.size(-1) != self.num_weather_features:
			raise ValueError(
				f"Expected num_weather_features={self.num_weather_features}, got {x.size(-1)}"
			)

		x = x.float()
		x = self.input_projection(x)
		x = self.positional_encoding(x)
		x = self.transformer(x)
		x = self.norm(x)

		# Mean pooling across the temporal axis gives a fixed-size sample embedding.
		return x.mean(dim=1)


__all__: list[str] = ["EnvTransformerEncoder"]
