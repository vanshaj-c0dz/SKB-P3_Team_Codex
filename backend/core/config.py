from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
CONFIG_YAML_PATH: Path = PROJECT_ROOT / "config.yaml"


class CropConfig(BaseModel):
	target_traits: list[str]
	physiological_constraints: dict[str, float | int | str | bool]


def parse_yaml_config(config_path: Path = CONFIG_YAML_PATH) -> dict[str, Any]:
	"""Load and validate the root YAML configuration into a dictionary."""
	if not config_path.exists():
		raise FileNotFoundError(f"YAML config not found at: {config_path}")

	with config_path.open("r", encoding="utf-8") as yaml_file:
		data: Any = yaml.safe_load(yaml_file) or {}

	if not isinstance(data, dict):
		raise ValueError("config.yaml must define a top-level mapping/object.")

	return data


class Settings(BaseSettings):
	model_config = SettingsConfigDict(
		env_file=str(PROJECT_ROOT / ".env"),
		env_file_encoding="utf-8",
		extra="ignore",
	)

	database_url: str = Field(..., alias="DATABASE_URL")
	redis_url: str = Field(..., alias="REDIS_URL")
	secret_key: str = Field(..., alias="SECRET_KEY")
	crop_configs: dict[str, CropConfig] = Field(default_factory=dict)


def build_settings() -> Settings:
	"""Build settings by combining .env secrets with YAML business configuration."""
	yaml_config: dict[str, Any] = parse_yaml_config()
	crop_config_data: Any = yaml_config.get("crops", {})

	if not isinstance(crop_config_data, dict):
		raise ValueError("The 'crops' key in config.yaml must be a mapping/object.")

	return Settings(crop_configs=crop_config_data)


settings: Settings = build_settings()
