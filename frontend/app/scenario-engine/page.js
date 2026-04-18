"use client";

import { motion } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import { ParametersSidebar } from "@/components/scenario/ParametersSidebar";
import { SimulationResults } from "@/components/scenario/SimulationResults";

import { useSimulation } from "@/lib/SimulationContext";
import { runSimulation } from "@/lib/simulation";

// Mock Physics-Guided Yield Model
const runMultiOmicsSimulation = (params) => {
  // Base yield potential (Bushels/Acre) for a generic elite soybean line
  const baseYield = 75.0;

  // Physics Constraints: 
  // 1. Heat penalty accelerates exponentially after 32C threshold
  // 2. Drought penalty interacts non-linearly with heat
  // 3. Pest risk creates a multiplicative yield gap

  const heatStress = params.heatDelta > 2.5
    ? Math.pow(params.heatDelta - 2.0, 2) * 4.5
    : params.heatDelta * 2.0;

  const droughtStress = (params.droughtDays / 50) * 22;

  // Pest interaction logic (Physics guided: pests exploit weak plants)
  const plantVigor = 100 - (heatStress * 1.5) - (droughtStress * 0.8);
  const pestImpact = (params.pestRisk / 100) * Math.max(0, 45 - (plantVigor * 0.3));

  const totalStress = heatStress + droughtStress + pestImpact;

  // Final Yield
  const finalYield = Math.max(18, baseYield - totalStress).toFixed(1);

  // Resilience Score (0-100)
  const resilience = Math.max(10, 100 - (totalStress * 1.8)).toFixed(0);

  // XAI Drivers (What contributed most to the loss?)
  const drivers = [
    { name: "Heat Shock (Flowering)", impact: heatStress * 2.5, threshold: ">32°C threshold breached" },
    { name: "Root Water Stress", impact: droughtStress * 1.8, threshold: `${params.droughtDays} days no rain` },
    { name: "Pest Migration", impact: pestImpact * 2.2, threshold: `${params.pestRisk}% risk index` }
  ].sort((a, b) => b.impact - a.impact);

  return {
    yield: finalYield,
    resilience,
    drivers,
    heatStress: heatStress.toFixed(1),
    droughtStress: droughtStress.toFixed(1),
    pestImpact: pestImpact.toFixed(1)
  };
};

/**
 * Derives the scenario result by blending the physics model (always fresh from params)
 * with the global AI results (if available).  This is called inside a useMemo so it
 * runs every time params or globalResults change — giving fully live slider reactivity.
 */
const deriveScenarioResult = (globalResults, params) => {
  // Always recompute physics from current params
  const physics = runMultiOmicsSimulation(params);

  if (!globalResults) return physics;

  // If we have real AI results, blend them: use AI resilience/yield as anchors
  // but recompute stress components fresh from params so they always reflect sliders.
  const heatStress = params.heatDelta > 2.5
    ? Math.pow(params.heatDelta - 2.0, 2) * 4.5
    : params.heatDelta * 2.0;
  const droughtStress = (params.droughtDays / 50) * 22;
  const pestImpact    = (params.pestRisk  / 100) * Math.max(0, 45 - (parseFloat(physics.yield) * 0.3));

  // Compute total stress fraction to apply as a multiplier to the AI base values
  const stressFraction = Math.min(1, (heatStress + droughtStress + pestImpact) / 75.0);

  // AI baseline (convert kg/ha → bu/ac once)
  const aiBaseYield      = (globalResults.baseline_yield ?? 0) * 0.0148;
  const aiBaseResilience = globalResults.climate_resilience_score || 0;

  // Apply physics-guided stress on top of the AI anchor
  const blendedYield      = Math.max(18, aiBaseYield - stressFraction * (aiBaseYield - 18));
  const blendedResilience = Math.max(10, aiBaseResilience - stressFraction * (aiBaseResilience - 10));

  // Rebuild XAI drivers: prefer real SNP attribution, then weather days, then physics
  const snpScores = globalResults.xai_insights?.snp_importance_scores ?? [];
  const fatalDays = globalResults.xai_insights?.fatal_weather_days ?? [];

  let drivers;
  if (snpScores.length > 0) {
    // Real Captum attribution — keep as-is, XAIDriversPanel renders them directly
    drivers = snpScores.slice(0, 3).map((s) => ({
      name: s.snp_id,
      impact: s.importance * 100,
      threshold: s.role === "beneficial" ? "Yield-boosting allele" : "Risk marker",
      role: s.role,
    }));
  } else if (fatalDays.length > 0) {
    drivers = fatalDays.slice(0, 3).map((d, i) => ({
      name: ["Heat Shock (Flowering)", "Root Water Stress", "Pest Migration"][i] ?? "Critical Weather",
      impact: [heatStress * 2.5, droughtStress * 1.8, pestImpact * 2.2][i] ?? 10,
      threshold: d,
    }));
  } else {
    drivers = physics.drivers;
  }

  return {
    yield:        blendedYield.toFixed(1),
    resilience:   blendedResilience.toFixed(0),
    drivers,
    heatStress:   heatStress.toFixed(1),
    droughtStress: droughtStress.toFixed(1),
    pestImpact:   pestImpact.toFixed(1),
    raw:          globalResults
  };
};

export default function ScenarioEnginePage() {
  const { results: globalResults, formInputs, setResults } = useSimulation();

  const [params, setParams] = useState({
    heatDelta:   globalResults?.climate_scenarios?.stress_params?.max_temp_increase ?? 2.0,
    droughtDays: 30,
    pestRisk:    50
  });

  // ⚡ LIVE REACTIVITY — recompute every time params OR global AI results change.
  // No button press needed for sliders; the button triggers the full AI pipeline.
  const simulationResult = useMemo(
    () => deriveScenarioResult(globalResults, params),
    [globalResults, params]
  );

  const [isSimulating, setIsSimulating] = useState(false);

  const handleRunSimulation = useCallback(async () => {
    setIsSimulating(true);
    if (formInputs?.file || formInputs?.locationInput) {
      // Full AI pipeline run — passes current slider values to the backend
      try {
        const payload = {
          ...(formInputs || {}),
          heatDelta:   params.heatDelta,
          droughtDays: params.droughtDays
        };
        const result = await runSimulation(payload);
        setResults(result); // updates global context → triggers useMemo above
      } catch (err) {
        console.error("AI pipeline error:", err);
      }
    }
    // Always end simulation state (useMemo already reflects the latest params live)
    setIsSimulating(false);
  }, [formInputs, params, setResults]);

  return (
    <main className="flex h-full overflow-hidden bg-surface-dark">
      <ParametersSidebar
        params={params}
        setParams={setParams}
        onRunSimulation={handleRunSimulation}
        isSimulating={isSimulating}
      />

      <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6 h-full">
        {/* Header Section with AI Status */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-end border-b border-outline-variant/20 pb-4"
        >
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-headline font-bold text-primary-container">Translational Breeding Co-pilot</h2>
              <span className="bg-tertiary-container/20 text-tertiary-container text-[10px] font-bold px-2 py-1 rounded-full border border-tertiary-container/30">
                PHYSICS-GUIDED AI v2.4
              </span>
            </div>
            <p className="text-on-surface-variant font-body text-sm mt-1 max-w-2xl">
              Multi-Omics Fusion (1D-CNN + LSTM) active. Simulating 50 future climate scenarios to calculate
              <span className="font-bold text-primary-container"> Climate Resilience Score (CRS)</span>.
            </p>
          </div>

          <motion.div
            animate={isSimulating ? { backgroundColor: "#fef3c7" } : { backgroundColor: "#e6f7e6" }}
            className="flex gap-2 items-center text-stone-700 font-label text-xs font-bold px-4 py-2 rounded-full border transition-colors"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSimulating ? 'animate-spin' : ''}`}>
              {isSimulating ? 'autorenew' : 'neurology'}
            </span>
            <span>{isSimulating ? 'Processing GxE Attention...' : `CRS: ${simulationResult.resilience}`}</span>
          </motion.div>
        </motion.div>

        {/* Main Interactive Content */}
        <SimulationResults params={params} result={simulationResult} />
      </div>
    </main>
  );
}