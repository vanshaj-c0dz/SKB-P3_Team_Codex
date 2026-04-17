const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ===========================================================================
// 🌍 GEOGRAPHIC INTELLIGENCE — India's Coastal Boundary
// ===========================================================================
/**
 * Classify a lat/lon as "land" or one of the ocean zones around India.
 * India mainland bounding box:
 *   South: 8.08°N (Kanyakumari)   North: 35.5°N
 *   West:  68.16°E (Sir Creek)    East:  97.5°E
 */
function classifyLocation(lat, lon) {
  if (lat == null || lon == null) return "unknown";

  const INDIA = { south: 8.08, north: 35.5, west: 68.16, east: 97.5 };

  if (lat < INDIA.south) return "ocean_south"; // Indian Ocean below Kanyakumari
  if (lat > INDIA.north) return "outside_north";
  if (lon < INDIA.west)  return "ocean_west";  // Arabian Sea
  if (lon > INDIA.east)  return "ocean_east";  // Bay of Bengal / beyond

  // Within bounding box but near coastal waters
  if (lat < 22 && lon < 70) return "ocean_west";
  if (lat < 22 && lon > 90) return "ocean_east";

  return "land";
}

/**
 * Returns an ocean penalty object if the pin is in the sea, else null.
 * penalty: 0.3–0.9 multiplier (higher = further from land = worse scores)
 */
function getOceanPenalty(lat, lon) {
  const zone = classifyLocation(lat, lon);
  if (zone === "land" || zone === "outside_north" || zone === "unknown") return null;

  const distBelowIndia = Math.max(0, 8.08 - (lat ?? 8.08));
  const penalty = Math.min(0.9, distBelowIndia * 0.08 + 0.3);

  return {
    zone,
    penalty,
    label:
      zone === "ocean_south"
        ? "Indian Ocean — No agricultural land"
        : zone === "ocean_west"
        ? "Arabian Sea — Saline marine environment"
        : "Bay of Bengal — Marine zone",
  };
}

// ===========================================================================
// PUBLIC API
// ===========================================================================

/**
 * Sends form data to the FastAPI AI engine and returns structured results.
 * Falls back to mock data if the backend is unreachable (dev mode).
 */
export const runSimulation = async (inputData) => {
  const { file, locationCoords, locationInput, crop, stress } = inputData;

  const formData = new FormData();
  formData.append("vcf_file", file);
  formData.append("lat",  locationCoords?.lat ?? 21.03);
  formData.append("lon",  locationCoords?.lng ?? 79.03);
  formData.append("crop_type", crop);
  formData.append("stress_scenario", stress);

  let raw;
  try {
    const response = await fetch(`${API_BASE}/api/v1/predict/breeding`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error_msg || `Server error ${response.status}`);
    }

    raw = await response.json();
  } catch (networkErr) {
    console.warn("⚠️ Backend unreachable, falling back to mock data.", networkErr);
    return getMockResult(locationCoords, crop, stress);
  }

  if (raw.status === "error") {
    throw new Error(raw.error_msg || "AI pipeline failed");
  }

  return mapApiResponseToResults(raw, locationCoords, locationInput, crop);
};

// ===========================================================================
// PRIVATE HELPERS
// ===========================================================================

/**
 * Maps the raw backend JSON to the shape expected by <SimulationResults />.
 * Applies a geographic ocean penalty if coordinates are outside India's landmass.
 */
function mapApiResponseToResults(raw, locationCoords, locationInput, crop) {
  const bestCross = raw.top_parental_crosses?.[0];
  const bestGenotypeId = bestCross
    ? `${bestCross.parent_1_id} × ${bestCross.parent_2_id}`
    : "No cross found";

  let resilienceScore = raw.climate_scenarios?.climate_resilience_score ?? 0;

  const yieldPred = raw.baseline_predictions?.yield;
  let baselineYield = yieldPred ? Math.round(yieldPred.mean * 1000) : 0;

  // 🌊 Ocean penalty applied to real backend results
  const ocean = getOceanPenalty(locationCoords?.lat, locationCoords?.lng);
  let locationWarning = null;
  if (ocean) {
    resilienceScore = parseFloat((resilienceScore * (1 - ocean.penalty)).toFixed(1));
    baselineYield   = Math.round(baselineYield * (1 - ocean.penalty));
    locationWarning = ocean.label;
  }

  const topSNPs       = raw.xai_insights?.top_snp_indices ?? [];
  const criticalDays  = raw.xai_insights?.critical_weather_days ?? [];
  const topPositiveGenes = topSNPs.slice(0, 5).map((idx) => `SNP_${idx}`);
  const fatalWeatherDays = criticalDays.slice(0, 3).map((day) => `Day ${day} (Critical Period)`);

  const blueprint = raw.soil_fixation_blueprint?.recommended_practices ?? [];

  const scenarioChartData = (raw.scenario_yield_scores ?? []).map((s) => ({
    scenario: s.scenario,
    yield: ocean ? Math.round(s.yield * (1 - ocean.penalty)) : s.yield,
    drought_score: s.drought_score,
  }));

  const topParentalCrosses = (raw.top_parental_crosses ?? []).map((c) => ({
    cross_id: c.cross_id,
    parent_1_id: c.parent_1_id,
    parent_2_id: c.parent_2_id,
    resilience_score: ocean
      ? parseFloat((c.climate_resilience_score * (1 - ocean.penalty)).toFixed(1))
      : parseFloat(c.climate_resilience_score.toFixed(1)),
    yield_pred: ocean
      ? Math.round(c.parent_1_yield_pred * 1000 * (1 - ocean.penalty))
      : Math.round(c.parent_1_yield_pred * 1000),
  }));

  return {
    task_id: raw.task_id,
    best_genotype_id: bestGenotypeId,
    climate_resilience_score: resilienceScore,
    baseline_yield: baselineYield,
    genotype_count: raw.genotype_count ?? 0,
    crop_type: raw.crop_type ?? crop,
    stress_scenario: raw.stress_scenario ?? "",
    location: raw.location ?? locationCoords,
    location_warning: locationWarning,

    scenario_chart_data: scenarioChartData,
    scenario_yield_scores: raw.scenario_yield_scores ?? [],

    xai_insights: {
      top_snp_indices:       topSNPs,
      snp_importance_scores: raw.xai_insights?.snp_importance_scores ?? [],
      env_daily_importance:  raw.xai_insights?.env_daily_importance ?? [],
      top_positive_genes:    topPositiveGenes,
      fatal_weather_days:    fatalWeatherDays,
    },

    top_parental_crosses:     topParentalCrosses,
    top_parental_crosses_raw: raw.top_parental_crosses,

    agronomic_blueprint:  blueprint,
    soil_fixation_blueprint: raw.soil_fixation_blueprint,

    next_steps:   raw.next_steps ?? [],
    _data_source: "backend",
  };
}

/** Input-seeded mock fallback — different inputs produce different (consistent) results */
function getMockResult(locationCoords, crop, stress) {
  const lat = locationCoords?.lat ?? 21.03;
  const lng = locationCoords?.lng ?? 79.03;

  // 🌊 Check if pin is in the ocean FIRST — before generating any scores
  const ocean = getOceanPenalty(lat, lng);

  const seedStr = `${lat}${lng}${crop}${stress}`;
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;

  const rng = (scale = 1, offset = 0) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return offset + (seed / 0xFFFFFFFF) * scale;
  };

  // Base land values
  let baseYield  = Math.round(2800 + rng(1400));          // 2800–4200 kg/ha
  let resilience = parseFloat((60 + rng(35)).toFixed(1)); // 60–95

  // 🌊 Ocean penalty collapses values to 3–18 range
  if (ocean) {
    baseYield  = Math.round(baseYield  * (1 - ocean.penalty));
    resilience = parseFloat((resilience * (1 - ocean.penalty)).toFixed(1));
  }

  const g1   = Math.round(rng(900));
  const g2   = Math.round(rng(900));
  const g3   = Math.round(rng(900));
  const day1 = Math.round(200 + rng(100));
  const day2 = Math.round(200 + rng(100));

  return {
    best_genotype_id: `Genotype_${Math.round(rng(20))} × Genotype_${Math.round(rng(20))}`,
    climate_resilience_score: resilience,
    baseline_yield: baseYield,
    genotype_count: Math.round(10 + rng(30)),
    crop_type: crop,
    stress_scenario: stress,
    location: locationCoords ?? { lat: 21.03, lon: 79.03 },
    location_warning: ocean ? ocean.label : null,

    scenario_chart_data: Array.from({ length: 50 }, (_, i) => ({
      scenario: i + 1,
      yield: Math.max(
        ocean ? 10 : 400,
        baseYield + (rng(800) - 400) - (i > 30 ? rng(600) : 0)
      ),
    })),

    xai_insights: {
      top_snp_indices:    [g1, g2, g3],
      top_positive_genes: [`SNP_${g1}`, `SNP_${g2}`, `SNP_${g3}`],
      fatal_weather_days: [
        `Day ${day1} (Critical Period)`,
        `Day ${day2} (Critical Period)`,
      ],
    },

    top_parental_crosses: [
      {
        cross_id: "Cross_1",
        parent_1_id: `Genotype_${Math.round(rng(20))}`,
        parent_2_id: `Genotype_${Math.round(rng(20))}`,
        resilience_score: resilience,
        yield_pred: baseYield,
      },
      {
        cross_id: "Cross_2",
        parent_1_id: `Genotype_${Math.round(rng(20))}`,
        parent_2_id: `Genotype_${Math.round(rng(20))}`,
        resilience_score: parseFloat(Math.max(1, resilience - rng(10)).toFixed(1)),
        yield_pred: Math.max(50, Math.round(baseYield - rng(400))),
      },
    ],

    agronomic_blueprint: ocean
      ? [
          `⚠️ Location Warning: ${ocean.label}. No viable agricultural zone detected.`,
          "Soil salinity levels are incompatible with terrestrial crop cultivation.",
          "Redirect breeding program to salt-tolerant mangrove/aquatic crop variants only.",
          "Consider evaluating coastal strips 40–60 km inland for viable farmland.",
        ]
      : [
          `Adequate soil moisture retention during critical Day ${day1} (${crop} growth window).`,
          "Apply mulch to regulate soil temperature during peak stress window.",
          "Ensure proper drainage to prevent waterlogging after rainfall events.",
          `Monitor N/P/K nutrients intensively during the ${stress} climate period.`,
        ],

    next_steps: [
      "Train model on historical phenotype data (yield, drought_score)",
      "Deploy recommended crosses in field trial",
    ],
    _data_source: "mock",
  };
}
