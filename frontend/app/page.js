"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimulationForm } from "@/components/dashboard/SimulationForm";
import { SimulationResults } from "@/components/dashboard/SimulationResults";
import { DiscoveriesList } from "@/components/dashboard/DiscoveriesList";
import { runSimulation } from "@/lib/simulation";
import { useSimulation } from "@/lib/SimulationContext";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

/** Build a live XAI discoveries feed from real simulation results */
function buildDiscoveries(results) {
  if (!results) return [];
  const discoveries = [];

  const snps = results.xai_insights?.snp_importance_scores ?? [];
  const days = results.xai_insights?.fatal_weather_days ?? [];
  const crosses = results.top_parental_crosses ?? [];
  const crs = results.climate_resilience_score ?? 0;

  // Top SNP discoveries
  snps.slice(0, 2).forEach((snp, i) => {
    discoveries.push({
      id: `snp-${i}`,
      tag: snp.role === "beneficial" ? "Yield Booster" : "Risk Marker",
      tagColor: snp.role === "beneficial" ? "bg-secondary-container" : "bg-error-container",
      tagTextColor: snp.role === "beneficial" ? "text-secondary" : "text-error",
      hoverColor: snp.role === "beneficial" ? "group-hover:text-secondary" : "group-hover:text-error",
      time: "XAI · Now",
      title: `${snp.snp_id} ${snp.role === "beneficial" ? "Boosts Yield" : "Flags Risk"}`,
      description: `Captum attribution: ${snp.importance.toFixed(4)} · ${snp.role === "beneficial" ? "Promotes heat tolerance." : "Vulnerability under stress."}`,
      progress: Math.min(100, Math.round(snp.importance * 10000)),
      progressColor: snp.role === "beneficial" ? "bg-secondary" : "bg-error",
    });
  });

  // Critical weather days
  days.slice(0, 1).forEach((day, i) => {
    discoveries.push({
      id: `day-${i}`,
      tag: "Critical Period",
      tagColor: "bg-amber-100",
      tagTextColor: "text-amber-700",
      hoverColor: "group-hover:text-amber-600",
      time: "Enviromics",
      title: day,
      description: "XAI-identified peak stress window in 365-day attribution model.",
      progress: 88,
      progressColor: "bg-amber-500",
    });
  });

  // Best cross
  if (crosses[0]) {
    discoveries.push({
      id: "cross-0",
      tag: "Top Cross",
      tagColor: "bg-tertiary-container/30",
      tagTextColor: "text-tertiary-container",
      hoverColor: "group-hover:text-tertiary-container",
      time: "AI Breeding",
      title: `${crosses[0].parent_1_id} × ${crosses[0].parent_2_id}`,
      description: `Resilience: ${crosses[0].resilience_score ?? crosses[0].climate_resilience_score ?? "—"}% · Recommended for field trial.`,
      progress: Math.min(100, Math.round(crosses[0].resilience_score ?? crosses[0].climate_resilience_score ?? 0)),
      progressColor: "bg-tertiary-container",
    });
  }

  // CRS summary
  discoveries.push({
    id: "crs",
    tag: crs > 60 ? "Resilient" : crs > 30 ? "At Risk" : "Critical",
    tagColor: crs > 60 ? "bg-secondary-container" : crs > 30 ? "bg-amber-100" : "bg-error-container",
    tagTextColor: crs > 60 ? "text-secondary" : crs > 30 ? "text-amber-700" : "text-error",
    hoverColor: "group-hover:text-primary-container",
    time: "Climate AI",
    title: `Climate Resilience Score: ${crs}/100`,
    description: `${results.climate_scenarios?.scenarios_survived ?? "—"} of 50 scenarios survived the ${results.stress_scenario ?? "stress"} threshold.`,
    progress: crs,
    progressColor: crs > 60 ? "bg-secondary" : crs > 30 ? "bg-amber-500" : "bg-error",
  });

  return discoveries;
}

export default function Dashboard() {
  const { results: globalResults, setResults: setGlobalResults, formInputs, setFormInputs } = useSimulation();

  const [simStatus, setSimStatus] = useState(globalResults ? "complete" : "idle");
  const [simResults, setSimResults] = useState(globalResults || null);

  const handleSimulate = async (formData) => {
    setSimStatus("loading");
    setFormInputs(formData);
    try {
      const results = await runSimulation(formData);
      setSimResults(results);
      setGlobalResults(results);
      setSimStatus("complete");
    } catch (e) {
      console.error(e);
      setSimStatus("idle");
    }
  };

  const handleClear = () => {
    setSimStatus("idle");
    setSimResults(null);
  };

  // Build live discoveries feed — updates whenever simResults changes
  const discoveries = useMemo(() => buildDiscoveries(simResults), [simResults]);

  return (
    <main className="p-8 overflow-y-auto flex-1 flex flex-col gap-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-between items-end"
      >
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary-container">Global Intelligence &amp; Simulation</h2>
          <p className="text-on-surface-variant font-body text-sm mt-1">Real-time macro-analysis &amp; predictive scenarios.</p>
        </div>
        <div className="flex gap-2 items-center">
          {simResults?._data_source === "backend" ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 border border-green-300 rounded-full text-xs font-label font-bold">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live AI
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-label font-medium">
              <span className="w-2 h-2 rounded-full bg-secondary" /> Live Sync
            </span>
          )}
        </div>
      </motion.div>

      {/* Simulation Form Panel */}
      <SimulationForm onSimulate={handleSimulate} isSimulating={simStatus === "loading"} />

      <AnimatePresence mode="wait">
        {simStatus === "complete" && simResults ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex flex-col gap-6"
          >
            {/* Live XAI Discoveries Feed — updates on every new simulation */}
            {discoveries.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <DiscoveriesList discoveries={discoveries} />
              </motion.div>
            )}

            <SimulationResults results={simResults} onClose={handleClear} />
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className={`flex flex-col items-center justify-center min-h-[300px] mt-4 transition-opacity duration-500 ${
              simStatus === "loading" ? "opacity-30 pointer-events-none select-none blur-[2px]" : ""
            }`}
          >
            <span className="material-symbols-outlined text-outline text-5xl mb-4">analytics</span>
            <p className="text-on-surface-variant font-label text-sm uppercase tracking-wider mb-1">Awaiting Simulation Parameters</p>
            <p className="text-on-surface-variant/60 text-xs mb-8">Upload a VCF file, drop a map pin, and hit Simulate &amp; Predict</p>

            {/* Pipeline preview chips — show what will activate after simulation */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl px-4">
              {[
                { icon: "bar_chart_4_bars", label: "Yield Comparison",         desc: "Baseline vs 50 climate scenarios" },
                { icon: "explore",          label: "Climate Radar",             desc: "Survival rate across stress types" },
                { icon: "genetics",         label: "XAI Genomic Inspector",     desc: "Captum SNP importance scores" },
                { icon: "calendar_month",   label: "Enviromics Calendar",       desc: "365-day XAI risk attribution" },
                { icon: "family_history",   label: "Parental Matchmaker",       desc: "Top AI-recommended crosses" },
                { icon: "assignment_turned_in", label: "Action Blueprint",      desc: "XAI-driven agronomic Kanban" },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="flex flex-col gap-1.5 bg-surface-container/60 border border-outline-variant/15 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-[18px]">{icon}</span>
                    <span className="font-label font-bold text-xs text-on-surface-variant">{label}</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant/50 leading-tight">{desc}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-outline/40" />
                    <span className="text-[9px] text-outline/60 uppercase tracking-wider font-bold">Pending simulation</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
