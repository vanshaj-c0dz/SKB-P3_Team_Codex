from __future__ import annotations

import csv
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

import torch


DEFAULT_WEATHER_COLUMNS = ("temperature", "rainfall", "humidity", "solar_radiation", "wind_speed")
NASA_POWER_PARAMETERS = (
	"T2M_MAX",
	"T2M_MIN",
	"PRECTOTCORR",
	"ALLSKY_SFC_SW_DWN",
	"RH2M",
)


def _fetch_nasa_power_daily_json(*, lat: float, lon: float, year: int) -> dict:
	query = urlencode(
		{
			"parameters": ",".join(NASA_POWER_PARAMETERS),
			"community": "AG",
			"longitude": f"{lon}",
			"latitude": f"{lat}",
			"start": f"{year}0101",
			"end": f"{year}1231",
			"format": "JSON",
		}
	)
	url = f"https://power.larc.nasa.gov/api/temporal/daily/point?{query}"
	with urlopen(url) as response:
		return json.loads(response.read().decode("utf-8"))


def get_real_weather_tensor(lat: float = 21.03, lon: float = 79.03, year: int = 2023) -> torch.Tensor:
	"""Fetch one year of daily NASA POWER agroclimate data as [1, 365, 5].

	Feature order:
	0: T2M_MAX (max temperature)
	1: T2M_MIN (min temperature)
	2: PRECTOTCORR (precipitation)
	3: ALLSKY_SFC_SW_DWN (solar radiation)
	4: RH2M (relative humidity)
	"""
	payload = _fetch_nasa_power_daily_json(lat=lat, lon=lon, year=year)
	parameter_block = payload.get("properties", {}).get("parameter", {})
	if not parameter_block:
		raise ValueError("NASA POWER response does not contain properties.parameter")

	series_by_param: list[list[float]] = []
	for parameter in NASA_POWER_PARAMETERS:
		daily_values = parameter_block.get(parameter)
		if not isinstance(daily_values, dict) or not daily_values:
			raise ValueError(f"Missing or empty NASA parameter: {parameter}")

		sorted_days = sorted(daily_values.items(), key=lambda x: x[0])
		series: list[float] = []
		for _, value in sorted_days:
			try:
				float_value = float(value)
			except (TypeError, ValueError):
				float_value = 0.0
			if float_value <= -900.0:
				float_value = 0.0
			series.append(float_value)
		series_by_param.append(series)

	day_count = min(len(series) for series in series_by_param)
	if day_count < 365:
		raise ValueError(f"NASA POWER returned only {day_count} daily values; expected at least 365")

	matrix: list[list[float]] = []
	for day_index in range(365):
		row = [series_by_param[param_index][day_index] for param_index in range(len(NASA_POWER_PARAMETERS))]
		matrix.append(row)

	weather_tensor = torch.tensor(matrix, dtype=torch.float32)
	return weather_tensor.unsqueeze(0)


def _infer_feature_columns(header: list[str], *, requested_columns: list[str] | None = None) -> list[str]:
	if requested_columns:
		missing = [column for column in requested_columns if column not in header]
		if missing:
			raise KeyError(f"Weather CSV is missing columns: {missing}")
		return requested_columns

	skip_names = {"date", "day", "year", "month", "doy", "id", "sample"}
	feature_columns: list[str] = []
	for column in header:
		if column.strip().lower() in skip_names:
			continue
		feature_columns.append(column)
		if len(feature_columns) == 5:
			break

	if not feature_columns:
		raise ValueError("Could not infer weather feature columns from CSV header")
	return feature_columns


def load_weather_matrix(
	weather_csv_path: str | Path,
	*,
	feature_columns: list[str] | None = None,
	sequence_length: int = 365,
) -> tuple[list[list[float]], list[str]]:
	"""Load a daily weather CSV into a fixed-length time-series matrix."""
	path = Path(weather_csv_path)
	if not path.exists():
		raise FileNotFoundError(f"Weather CSV not found: {path}")

	with path.open("r", encoding="utf-8", newline="") as file_handle:
		reader = csv.DictReader(file_handle)
		if reader.fieldnames is None:
			raise ValueError(f"Weather CSV has no header row: {path}")
		columns = _infer_feature_columns(list(reader.fieldnames), requested_columns=feature_columns)

		rows: list[list[float]] = []
		for row in reader:
			values: list[float] = []
			for column in columns:
				raw_value = (row.get(column) or "").strip()
				values.append(float(raw_value) if raw_value else 0.0)
			rows.append(values)

	if not rows:
		raise ValueError(f"Weather CSV has no data rows: {path}")

	matrix = rows
	if len(matrix) < sequence_length:
		padding = [matrix[-1][:] for _ in range(sequence_length - len(matrix))]
		matrix = matrix + padding
	else:
		matrix = matrix[:sequence_length]

	return matrix, columns


def get_weather_tensor(
	weather_csv_path: str | Path,
	*,
	feature_columns: list[str] | None = None,
	sequence_length: int = 365,
	add_batch_dimension: bool = True,
) -> torch.Tensor:
	"""Convert a weather CSV into a float tensor of shape (1, T, F) by default."""
	matrix, _ = load_weather_matrix(
		weather_csv_path,
		feature_columns=feature_columns,
		sequence_length=sequence_length,
	)
	tensor = torch.tensor(matrix, dtype=torch.float32)
	if add_batch_dimension:
		tensor = tensor.unsqueeze(0)
	return tensor


__all__ = [
	"DEFAULT_WEATHER_COLUMNS",
	"NASA_POWER_PARAMETERS",
	"get_real_weather_tensor",
	"get_weather_tensor",
	"load_weather_matrix",
]
