from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from urllib.request import urlopen

import torch


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_VCF_NAME = "10_test_examples.vcf"
DEFAULT_VCF_URL = f"http://xtlab.hzau.edu.cn/downloads/{DEFAULT_VCF_NAME}"


@dataclass(frozen=True)
class VCFExtractionResult:
	genomic_tensor: torch.Tensor
	sample_ids: list[str]
	variant_ids: list[str]
	vcf_path: Path


def _resolve_default_vcf_path() -> Path:
	backend_sample = PROJECT_ROOT / "backend" / "data" / DEFAULT_VCF_NAME
	soy_sample = PROJECT_ROOT.parent / "SoyDNGPNext" / "soydngpnext" / "data" / "train_example.vcf"
	if backend_sample.exists():
		return backend_sample
	if soy_sample.exists():
		return soy_sample
	return backend_sample


def download_vcf(destination_dir: str | Path, *, filename: str = DEFAULT_VCF_NAME, url: str = DEFAULT_VCF_URL) -> Path:
	"""Download the reference VCF used by the original SoyDNGPNext examples."""
	destination = Path(destination_dir)
	destination.mkdir(parents=True, exist_ok=True)
	target_path = destination / filename

	with urlopen(url) as response, target_path.open("wb") as file_handle:
		file_handle.write(response.read())

	return target_path


def _encode_genotype_token(token: str) -> int:
	clean_token = (token or "").split(":", 1)[0].strip()[:3]
	if clean_token in {"1/1", "1|1"}:
		return 1
	if clean_token in {"0/1", "0|1"}:
		return 2
	return 3


def read_vcf_matrix(vcf_path: str | Path) -> tuple[list[list[int]], list[str], list[str]]:
	"""Read a VCF into a sample-by-variant integer matrix."""
	path = Path(vcf_path)
	if not path.exists():
		raise FileNotFoundError(f"VCF file not found: {path}")

	with path.open("r", encoding="utf-8", newline="") as file_handle:
		reader = csv.reader(file_handle, delimiter="\t")
		header_row: list[str] | None = None
		rows: list[list[str]] = []
		for row in reader:
			if not row:
				continue
			if row[0].startswith("##"):
				continue
			if header_row is None:
				header_row = row
				continue
			rows.append(row)

	if header_row is None:
		raise ValueError(f"No VCF header row found in {path}")
	if len(header_row) < 10:
		raise ValueError("VCF header must include at least 10 columns")
	if not rows:
		raise ValueError(f"No variant rows found in {path}")

	sample_ids = header_row[9:]
	variant_ids: list[str] = []
	variant_matrix: list[list[int]] = []

	for row in rows:
		if len(row) < 10:
			continue
		variant_ids.append(f"{row[0]}_{row[1]}")
		genotype_values = [_encode_genotype_token(cell) for cell in row[9:9 + len(sample_ids)]]
		if len(genotype_values) < len(sample_ids):
			genotype_values.extend([3] * (len(sample_ids) - len(genotype_values)))
		variant_matrix.append(genotype_values)

	if not variant_matrix:
		raise ValueError(f"No usable genotype columns found in {path}")

	matrix = [list(column) for column in zip(*variant_matrix)]
	return matrix, sample_ids, variant_ids


def one_hot_genotypes(matrix: list[list[int]]) -> torch.Tensor:
	"""Convert a sample-by-variant genotype matrix into [B, 3, 206, 206]."""
	if not matrix or not matrix[0]:
		raise ValueError("Expected a non-empty 2D genotype matrix")

	samples = len(matrix)
	variants = len(matrix[0])
	encoded = torch.zeros((samples, variants, 3), dtype=torch.float32)
	genotype_tensor = torch.tensor(matrix, dtype=torch.int32)
	encoded[:, :, 0] = torch.where(torch.isin(genotype_tensor, torch.tensor([1, 2], dtype=torch.int32)), 1.0, 0.0)
	encoded[:, :, 1] = torch.where(torch.isin(genotype_tensor, torch.tensor([2], dtype=torch.int32)), 0.0, 1.0)
	encoded[:, :, 2] = torch.where(torch.isin(genotype_tensor, torch.tensor([1], dtype=torch.int32)), 0.0, 1.0)

	sample_resized = torch.empty((samples, 3, 206, 206), dtype=torch.float32)
	for index, sample in enumerate(encoded):
		flat_sample = sample.reshape(-1)
		repeat_count = (206 * 206 * 3 + flat_sample.numel() - 1) // flat_sample.numel()
		resized = flat_sample.repeat(repeat_count)[: 206 * 206 * 3]
		sample = resized.reshape(206, 206, 3).permute(2, 0, 1)
		sample_resized[index] = sample
	return sample_resized


def get_real_genomic_tensor(
	vcf_path: str | Path | None = None,
	*,
	download_if_missing: bool = True,
	return_metadata: bool = False,
	output_dir: str | Path | None = None,
) -> torch.Tensor | VCFExtractionResult:
	"""Load a real soybean VCF and convert it to the SoyDNGP input tensor."""
	resolved_path = Path(vcf_path) if vcf_path is not None else _resolve_default_vcf_path()
	if not resolved_path.exists():
		fallback_path = _resolve_default_vcf_path()
		if fallback_path.exists():
			resolved_path = fallback_path
		else:
			if not download_if_missing:
				raise FileNotFoundError(f"VCF file not found: {resolved_path}")
			cache_dir = Path(output_dir) if output_dir is not None else (PROJECT_ROOT / "backend" / "data")
			resolved_path = download_vcf(cache_dir)

	genotype_matrix, sample_ids, variant_ids = read_vcf_matrix(resolved_path)
	genomic_numpy = one_hot_genotypes(genotype_matrix)
	genomic_tensor = genomic_numpy

	if return_metadata:
		return VCFExtractionResult(
			genomic_tensor=genomic_tensor,
			sample_ids=sample_ids,
			variant_ids=variant_ids,
			vcf_path=resolved_path,
		)
	return genomic_tensor


__all__ = [
	"DEFAULT_VCF_NAME",
	"DEFAULT_VCF_URL",
	"VCFExtractionResult",
	"download_vcf",
	"get_real_genomic_tensor",
	"one_hot_genotypes",
	"read_vcf_matrix",
]
