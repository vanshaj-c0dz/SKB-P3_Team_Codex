"use client";
import { motion } from "framer-motion";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

export function ClimateRadarChart({ results }) {
  if (!results) {
    return (
      <div className="bg-surface-container rounded-2xl p-6 h-[380px] flex flex-col items-center justify-center gap-3 border border-outline-variant/15">
        <span className="material-symbols-outlined text-outline text-4xl">explore</span>
        <p className="text-sm font-label font-bold text-on-surface-variant">Climate Resilience Matrix</p>
        <p className="text-xs text-on-surface-variant/60 text-center max-w-[230px]">
          Awaiting 50-scenario inference from the PyTorch climate engine to compute survival rates.
        </p>
      </div>
    );
  }

  const scenarios = results.scenario_yield_scores || [];
  const baseline = results.baseline_predictions?.yield?.mean || 0;
  const target = baseline * 0.5; // Survival line

  const calcSurvival = (slice) => {
    if (!slice || slice.length === 0) return 0;
    const survived = slice.filter((s) => s.yield * 1000 >= target || s.yield >= target).length; 
    // note: if already scaled in json to kg/ha, target needs to match
    return Math.round((survived / slice.length) * 100);
  };

  const radarData = [
    { axis: "Heatwave",        survival: calcSurvival(scenarios.slice(0, 10)) },
    { axis: "Drought",         survival: calcSurvival(scenarios.slice(10, 20)) },
    { axis: "Flood",           survival: calcSurvival(scenarios.slice(20, 30)) },
    { axis: "Combined Stress", survival: calcSurvival(scenarios.slice(30, 50)) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 h-[380px] flex flex-col relative"
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-headline font-bold text-lg text-primary-container">Climate Resilience Matrix</h3>
          <p className="text-xs text-on-surface-variant">% Survival rate under extreme conditions</p>
        </div>
        <span className="material-symbols-outlined text-secondary">explore</span>
      </div>

      <div className="flex-1 relative -mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="75%">
            <PolarGrid stroke="rgba(0,0,0,0.1)" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fontWeight: "bold", fill: "#57534e" }} />
            <Radar
              name="Survival Rate"
              dataKey="survival"
              stroke="#047857"
              fill="#10b981"
              fillOpacity={0.4}
              strokeWidth={3}
              isAnimationActive
            />
            <Tooltip
              formatter={(val) => [`${val}%`, "Survival Rate"]}
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="absolute bottom-4 right-4 text-xs font-bold font-mono text-stone-500 bg-surface-container px-2 py-1 rounded">
        50 FC
      </div>
    </motion.div>
  );
}
