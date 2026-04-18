"use client";
import { motion } from "framer-motion";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
import { MetricCard } from "./MetricCard";
import { YieldComparisonChart } from "./YieldComparisonChart";
import { GenomicManhattanChart } from "./GenomicManhattanChart";
import { WeatherCalendarHeatmap } from "./WeatherCalendarHeatmap";
import { ParentalMatchmaker } from "./ParentalMatchmaker";
import { BlueprintKanban } from "./BlueprintKanban";


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

export function SimulationResults({ results, onClose }) {
  if (!results) return null;

  const metrics = [
    {
      id: "best-variant",
      title: "Best Parental Cross",
      value: results.best_genotype_id,
      unit: "",
      subtitle: `From ${results.genotype_count ?? "?"} genotypes analysed`,
      icon: "psychiatry",
      iconColorClass: "text-primary-container"
    },
    {
      id: "resilience-score",
      title: "Climate Resilience",
      value: results.climate_resilience_score,
      unit: "/100",
      trend: { direction: "up", value: "High", label: "Survivability Index" },
      icon: "wb_sunny",
      iconColorClass: "text-secondary"
    },
    {
      id: "baseline-yield",
      title: "Baseline Yield Predict",
      value: results.baseline_yield,
      unit: " kg/ha",
      subtitle: `${results.crop_type ?? "Crop"} · AI Model Output`,
      icon: "bar_chart",
      iconColorClass: "text-tertiary-container"
    }
  ];

  // Yield stability from parental crosses data for line chart
  const yieldStabilityData = (results.top_parental_crosses ?? []).map((c) => ({
    name: c.cross_id,
    yield: c.yield_pred,
    resilience: c.resilience_score,
  }));

  // Stress comparison — dynamic: compute % impact vs baseline from scenario data
  const baseline = results.baseline_yield ?? 0;
  const scenarios = results.scenario_chart_data ?? [];
  const _avgYield = (from, to) => {
    const slice = scenarios.slice(from, to);
    if (!slice.length || !baseline) return 0;
    const avg = slice.reduce((s, x) => s + x.yield, 0) / slice.length;
    return Math.round(((avg - baseline) / baseline) * 100);
  };
  const stressData = [
    { name: "Heat",     impact: _avgYield(0, 10) },
    { name: "Drought",  impact: _avgYield(10, 20) },
    { name: "Flood",    impact: _avgYield(20, 30) },
    { name: "Combined", impact: _avgYield(30, 50) },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      <div className="flex justify-between items-end mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-headline font-bold text-primary-container">Simulation Engine Output</h2>
            {results._data_source === "mock" ? (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-300 rounded-full">
                Demo Mode
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 border border-green-300 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
                Live AI
              </span>
            )}
          </div>
          <p className="text-on-surface-variant font-body text-sm mt-1">
            PyTorch MasterBreedingModel · 50 climate scenarios · Captum XAI active
            {results.stress_scenario && (
              <> · <span className="text-error font-medium">{results.stress_scenario}</span></>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-outline hover:text-on-surface text-sm font-label flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
          Clear Results
        </button>
      </div>

      {/* 🌊 Ocean Location Warning Banner */}
      {results.location_warning && (
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3"
        >
          <span className="material-symbols-outlined text-amber-500 text-[22px]">water</span>
          <div>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Ocean/Marine Zone Detected</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/70">{results.location_warning} — Scores reflect severely reduced agricultural viability.</p>
          </div>
        </motion.div>
      )}

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map(metric => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Baseline vs Extreme Yield Dashboard (Task 4) */}
      <YieldComparisonChart results={results} />

      {/* XAI Genomic Inspector — full width */}
      <GenomicManhattanChart results={results} />

      {/* Batch 4: Enviromics Calendar and Parental Matchmaker */}
      <WeatherCalendarHeatmap results={results} />
      <ParentalMatchmaker results={results} />

      {/* Batch 5: Agronomic Blueprint Kanban */}
      <BlueprintKanban results={results} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 50 Climate Scenarios Area Chart — uses real scenario_chart_data */}
        <motion.div variants={itemVariants} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/15 tincture-shadow flex flex-col" style={{ height: 260 }}>
          <h3 className="font-headline font-bold text-sm text-on-surface mb-3">50 Climate Scenarios (Yield)</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={results.scenario_chart_data ?? []}>
                <defs>
                  <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3c692b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3c692b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="scenario" tick={{ fontSize: 10 }} hide />
                <YAxis tick={{ fontSize: 10 }} width={36} />
                <Tooltip formatter={(v) => [`${Math.round(v)} kg/ha`, "Yield"]} />
                <Area type="monotone" dataKey="yield" stroke="#3c692b" strokeWidth={2} fillOpacity={1} fill="url(#colorYield)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Yield Stability — from real parental crosses */}
        <motion.div variants={itemVariants} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/15 tincture-shadow flex flex-col" style={{ height: 260 }}>
          <h3 className="font-headline font-bold text-sm text-on-surface mb-3">Top Cross Yield Performance</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yieldStabilityData.length > 0 ? yieldStabilityData : [{ name: "—", yield: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={36} />
                <Tooltip formatter={(v) => [`${v} kg/ha`, "Predicted Yield"]} />
                <Bar dataKey="yield" fill="#3c692b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stress Comparison */}
        <motion.div variants={itemVariants} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/15 tincture-shadow flex flex-col" style={{ height: 260 }}>
          <h3 className="font-headline font-bold text-sm text-on-surface mb-3">Stress Impact on Yield (%)</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={36} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="impact" fill="#ba1a1a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Charts Row ends here */}



    </motion.div>
  );
}
