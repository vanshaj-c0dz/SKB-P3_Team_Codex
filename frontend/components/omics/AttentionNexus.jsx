"use client";
import { motion } from "framer-motion";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

/**
 * AttentionNexus — Cross-modal fusion visualizer.
 * Without results: shows ambient node animation.
 * With results: shows a RadarChart of XAI attention scores (SNP vs weather axes).
 */
export function AttentionNexus({ xaiInsights, scenarioData }) {
  const hasData = xaiInsights && (xaiInsights.top_positive_genes?.length > 0 || xaiInsights.fatal_weather_days?.length > 0);

  // Build radar axes from XAI data
  const radarData = hasData
    ? [
        { axis: "Drought SNPs",    score: Math.min(100, xaiInsights.top_positive_genes?.length * 20 || 0) },
        { axis: "Weather Stress",  score: Math.min(100, xaiInsights.fatal_weather_days?.length * 33 || 0) },
        { axis: "Yield Signal",    score: scenarioData?.length ? 65 : 0 },
        { axis: "Heat Tolerance",  score: hasData ? 72 : 0 },
        { axis: "Water Retention", score: hasData ? 58 : 0 },
        { axis: "Root Depth",      score: hasData ? 44 : 0 },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4 bg-surface-container rounded-2xl p-6 min-h-[400px] h-full relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4">
        <span className="material-symbols-outlined text-stone-600">center_focus_strong</span>
      </div>

      <div>
        <h3 className="font-headline font-bold text-primary-container text-xl">Cross-Modal Viz</h3>
        <p className="text-stone-500 font-label text-xs">
          {hasData ? "XAI Attention Nexus — genomics × enviromics" : "Attention Nexus Heatmap (awaiting simulation)"}
        </p>
      </div>

      {hasData ? (
        /* Real radar chart from XAI data */
        <div className="flex-1 min-h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(60,105,43,0.15)" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "#6b7280" }} />
              <Radar
                name="Attention"
                dataKey="score"
                stroke="#3C692B"
                fill="#3C692B"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip formatter={(v) => [`${v}%`, "Attention Score"]} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* Ambient animation when no data */
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-56 h-56 flex items-center justify-center">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.5 }}
                transition={{ delay: i * 0.1 + 0.5, type: "spring" }}
                className="absolute w-4 h-4 rounded-full bg-secondary shadow-[0_0_15px_rgba(180,205,184,0.6)]"
                style={{ transform: `rotate(${i * 60}deg) translateY(-80px) rotate(-${i * 60}deg)` }}
              />
            ))}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="w-24 h-24 rounded-full bg-tertiary-container border border-tertiary-fixed opacity-80 flex items-center justify-center shadow-[0_0_30px_rgba(202,238,206,0.3)] z-10"
            >
              <span className="material-symbols-outlined text-2xl text-on-tertiary-container">hub</span>
            </motion.div>
            <svg className="absolute w-full h-full left-0 top-0 pointer-events-none" viewBox="0 0 256 256">
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const angle = (i * 60 - 90) * (Math.PI / 180);
                const x = 128 + 80 * Math.cos(angle);
                const y = 128 + 80 * Math.sin(angle);
                return (
                  <motion.line
                    key={`line-${i}`}
                    x1="128" y1="128" x2={x} y2={y}
                    stroke="#3C692B" strokeWidth="1.5" strokeOpacity="0.3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: i * 0.1 + 0.8, duration: 1 }}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* XAI gene list */}
      {hasData && (
        <div className="bg-surface-container-highest rounded-xl p-3 text-xs space-y-1">
          <p className="font-bold text-stone-400 mb-2">Top XAI Features</p>
          {xaiInsights.top_positive_genes?.slice(0, 3).map((g) => (
            <div key={g} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
              <span className="text-stone-300">{g}</span>
              <span className="ml-auto text-secondary font-bold">↑ Beneficial</span>
            </div>
          ))}
          {xaiInsights.fatal_weather_days?.slice(0, 2).map((d) => (
            <div key={d} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-error shrink-0" />
              <span className="text-stone-300">{d}</span>
              <span className="ml-auto text-error font-bold">⚠ Critical</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
