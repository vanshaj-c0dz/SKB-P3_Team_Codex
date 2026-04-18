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
  if (lat < 23 && lon > 88) return "ocean_east"; // Broadened to capture full Bay of Bengal

  // Sahara Desert roughly bounding box
  if (lat >= 13 && lat <= 35 && lon >= -18 && lon <= 40) return "sahara_desert";

  return "land";
}

/**
 * Returns an extreme environment object if the pin is in the sea or desert, else null.
 * penalty: 0.3–0.9 multiplier (higher = further from land = worse scores)
 */
function getExtremeEnvironment(lat, lon) {
  const zone = classifyLocation(lat, lon);
  if (zone === "land" || zone === "outside_north" || zone === "unknown") return null;

  if (zone === "sahara_desert") {
    return {
      type: "desert",
      penalty: 0.8,
      label: "Sahara Desert — Hyper-arid Environment"
    };
  }

  const distBelowIndia = Math.max(0, 8.08 - (lat ?? 8.08));
  const penalty = Math.min(0.9, distBelowIndia * 0.08 + 0.3);

  return {
    type: "ocean",
    zone,
    penalty,
    label:
      zone === "ocean_south"
        ? "Indian Ocean — Deep Marine Environment"
        : zone === "ocean_west"
        ? "Arabian Sea — Saline Marine Environment"
        : "Bay of Bengal — Marine Zone",
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
  const { file, locationCoords, locationInput, crop, stress, heatDelta, droughtDays } = inputData;

  const formData = new FormData();
  formData.append("vcf_file", file);
  formData.append("lat",  locationCoords?.lat ?? 21.03);
  formData.append("lon",  locationCoords?.lng ?? 79.03);
  formData.append("crop_type", crop);
  formData.append("stress_scenario", stress);
  
  if (heatDelta !== undefined) {
    formData.append("heat_delta", heatDelta);
  }
  if (droughtDays !== undefined) {
    // scale days to multiplier (rough proxy used in frontend)
    const drought_multiplier = 0.5 - (droughtDays / 120); // eg. 30 days -> 0.25
    formData.append("drought_multiplier", drought_multiplier);
  }

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

  // 🌍 Extreme Environment penalty applied to real backend results
  const extremeEnv = getExtremeEnvironment(locationCoords?.lat, locationCoords?.lng);
  let locationWarning = null;
  if (extremeEnv) {
    const pseudoRng = Math.abs(Math.sin((locationCoords?.lat || 1) * (locationCoords?.lng || 1)));
    if (extremeEnv.type === "ocean") {
      resilienceScore = parseFloat((1 + pseudoRng * 10).toFixed(1)); // 1-11
    } else {
      resilienceScore = parseFloat((5 + pseudoRng * 15).toFixed(1)); // 5-20 for desert
    }
    baselineYield   = Math.max(10, Math.round(baselineYield * (1 - extremeEnv.penalty)));
    locationWarning = extremeEnv.label;
  }

  const topSNPs       = raw.xai_insights?.top_snp_indices ?? [];
  const criticalDays  = raw.xai_insights?.critical_weather_days ?? [];
  const topPositiveGenes = topSNPs.slice(0, 5).map((idx) => `SNP_${idx}`);
  const fatalWeatherDays = criticalDays.slice(0, 3).map((day) => `Day ${day} (Critical Period)`);

  const blueprint = raw.soil_fixation_blueprint?.recommended_practices ?? [];

  const scenarioChartData = (raw.scenario_yield_scores ?? []).map((s) => ({
    scenario: s.scenario,
    yield: extremeEnv ? Math.round(s.yield * (1 - extremeEnv.penalty)) : s.yield,
    drought_score: s.drought_score,
  }));

  const topParentalCrosses = (raw.top_parental_crosses ?? []).map((c) => ({
    cross_id: c.cross_id,
    parent_1_id: c.parent_1_id,
    parent_2_id: c.parent_2_id,
    resilience_score: extremeEnv
      ? parseFloat(((extremeEnv.type === "ocean" ? 1 : 5) + Math.abs(Math.sin((c.parent_1_yield_pred || 1) * 100)) * (extremeEnv.type === "ocean" ? 10 : 15)).toFixed(1))
      : parseFloat(c.climate_resilience_score.toFixed(1)),
    yield_pred: extremeEnv
      ? Math.round(c.parent_1_yield_pred * 1000 * (1 - extremeEnv.penalty))
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

    // Pass through raw baseline_predictions for ClimateRadarChart survival computation
    baseline_predictions: raw.baseline_predictions ?? null,

    next_steps:   raw.next_steps ?? [],
    _data_source: "backend",
  };
}

/** Input-seeded mock fallback — different inputs produce different (consistent) results */
function getMockResult(locationCoords, crop, stress) {
  const lat = locationCoords?.lat ?? 21.03;
  const lng = locationCoords?.lng ?? 79.03;

  // 🌊 Check if pin is in extreme environment FIRST
  const extremeEnv = getExtremeEnvironment(lat, lng);

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

  // 🌊 Extreme Environment penalty collapses values, forcing resilience bounds
  if (extremeEnv) {
    baseYield  = Math.max(10, Math.round(baseYield * (1 - extremeEnv.penalty)));
    resilience = extremeEnv.type === "ocean" 
      ? parseFloat((1 + rng(10)).toFixed(1)) // strictly between 1.0 and 11.0
      : parseFloat((5 + rng(15)).toFixed(1)); // strictly between 5.0 and 20.0
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
    location_warning: extremeEnv ? extremeEnv.label : null,

    scenario_chart_data: Array.from({ length: 50 }, (_, i) => ({
      scenario: i + 1,
      yield: Math.max(
        extremeEnv ? 10 : 400,
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
      // Full scored list for GenomicManhattanChart
      snp_importance_scores: [
        { snp_id: `SNP_${g1}`, index: g1, importance: parseFloat((0.04 + rng(0.06)).toFixed(4)), role: rng(1) > 0.4 ? "beneficial" : "risk", raw_score: parseFloat((rng(0.1) - 0.05).toFixed(4)) },
        { snp_id: `SNP_${g2}`, index: g2, importance: parseFloat((0.03 + rng(0.05)).toFixed(4)), role: rng(1) > 0.5 ? "beneficial" : "risk", raw_score: parseFloat((rng(0.1) - 0.05).toFixed(4)) },
        { snp_id: `SNP_${g3}`, index: g3, importance: parseFloat((0.02 + rng(0.04)).toFixed(4)), role: rng(1) > 0.6 ? "beneficial" : "risk", raw_score: parseFloat((rng(0.1) - 0.05).toFixed(4)) },
        { snp_id: `SNP_${Math.round(rng(900))}`, index: Math.round(rng(900)), importance: parseFloat((0.01 + rng(0.03)).toFixed(4)), role: "risk", raw_score: parseFloat((-rng(0.05)).toFixed(4)) },
        { snp_id: `SNP_${Math.round(rng(900))}`, index: Math.round(rng(900)), importance: parseFloat((0.005 + rng(0.02)).toFixed(4)), role: "beneficial", raw_score: parseFloat((rng(0.04)).toFixed(4)) },
      ],
      // 365-day importance array for WeatherCalendarHeatmap
      env_daily_importance: Array.from({ length: 365 }, (_, i) => {
        // Spike around the critical days to simulate real XAI output
        const distD1 = Math.abs(i - day1);
        const distD2 = Math.abs(i - day2);
        const spike = Math.exp(-distD1 / 12) * 0.9 + Math.exp(-distD2 / 12) * 0.7;
        const noise = ((seed = (seed * 1664525 + 1013904223) >>> 0), (seed / 0xFFFFFFFF) * 0.15);
        return parseFloat(Math.max(0, spike + noise).toFixed(4));
      }),
    },

    // baseline_predictions for ClimateRadarChart
    baseline_predictions: {
      yield: {
        mean: baseYield / 1000, // in raw model units (0–5 range)
        std:  0.05 + rng(0.1),
        min:  baseYield * 0.85 / 1000,
        max:  baseYield * 1.1  / 1000,
      }
    },

    top_parental_crosses: [
      {
        cross_id: "Cross_1",
        parent_1_id: `Genotype_${Math.round(rng(20))}`,
        parent_2_id: `Genotype_${Math.round(rng(20))}`,
        resilience_score: resilience,
        yield_pred: baseYield,
        recommended_for: "high_yield",
      },
      {
        cross_id: "Cross_2",
        parent_1_id: `Genotype_${Math.round(rng(20))}`,
        parent_2_id: `Genotype_${Math.round(rng(20))}`,
        resilience_score: extremeEnv ? parseFloat(Math.max(extremeEnv.type === "ocean" ? 1 : 5, resilience - rng(2)).toFixed(1)) : parseFloat(Math.max(1, resilience - rng(10)).toFixed(1)),
        yield_pred: Math.max(extremeEnv ? 10 : 50, Math.round(baseYield - rng(400))),
        recommended_for: "drought_tolerance",
      },
      {
        cross_id: "Cross_3",
        parent_1_id: `Genotype_${Math.round(rng(20))}`,
        parent_2_id: `Genotype_${Math.round(rng(20))}`,
        resilience_score: extremeEnv ? parseFloat(Math.max(extremeEnv.type === "ocean" ? 1 : 5, resilience - rng(4)).toFixed(1)) : parseFloat(Math.max(1, resilience - rng(15)).toFixed(1)),
        yield_pred: Math.max(extremeEnv ? 10 : 50, Math.round(baseYield - rng(600))),
        recommended_for: "high_yield",
      },
    ],

    // Full blueprint with action_plan for BlueprintKanban
    soil_fixation_blueprint: {
      location: { lat, lon: lng },
      crop_type: crop,
      stress_scenario: stress,
      critical_growth_stages: ["Pod Filling (Most Critical)"],
      action_plan: extremeEnv
        ? [
            {
              id: "kan-1",
              risk: `⚠️ ${extremeEnv.label} — Extreme environment detected`,
              recommendation: extremeEnv.type === "ocean"
                ? "Redirect breeding program to salt-tolerant mangrove/aquatic crop variants only."
                : "Consider controlled environment agriculture (greenhouses) or drought-evasive extremophiles.",
              priority: "HIGH",
            },
            {
              id: "kan-2",
              risk: extremeEnv.type === "ocean"
                ? "Soil salinity incompatible with terrestrial crop cultivation"
                : "Extreme arid conditions — soil carbon near zero",
              recommendation: "Standard agricultural development is not viable. Redirect R&D budget to stress-tolerant extremophile varieties.",
              priority: "HIGH",
            },
          ]
        : [
            {
              id: "kan-1",
              risk: `Severe Heatwave during Pod Filling (Day ${day1})`,
              recommendation: `Apply mulch immediately. Delay top-dressing until Day ${day1 + 5}. Shade netting advised for temperatures >38°C.`,
              priority: "HIGH",
            },
            {
              id: "kan-2",
              risk: "Root Water Stress detected in XAI Attributions",
              recommendation: `Schedule deep irrigation for Days ${day1}–${day1 + 4}. Trigger 40mm/day flood-pulse for ${crop}.`,
              priority: "HIGH",
            },
            {
              id: "kan-3",
              risk: "Nutrient Leaching Risk vs Reduced Transpiration",
              recommendation: `Monitor soil N/P/K during ${stress} period. Shift to foliar spray if root uptake collapses.`,
              priority: "MEDIUM",
            },
          ],
    },

    agronomic_blueprint: extremeEnv
      ? [
          `⚠️ Location Warning: ${extremeEnv.label}. Extreme environment detected.`,
          extremeEnv.type === "ocean" ? "Soil salinity levels are incompatible with terrestrial crop cultivation." : "Extreme arid conditions and lack of arable soil detected.",
          extremeEnv.type === "ocean" ? "Redirect breeding program to salt-tolerant mangrove/aquatic crop variants only." : "Consider controlled environment agriculture (greenhouses) or drought-evasive extremophiles.",
          "Standard agricultural development is not viable at these coordinates.",
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
