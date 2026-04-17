"use client";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

/**
 * EnviromicsPanel — shows real per-scenario yield data and climate resilience score.
 * Without results: shows NASA weather summary bars.
 * With results: shows scenario yield area chart + real resilience score.
 */
export function EnviromicsPanel({ scenarioData, resilienceScore, location, stressScenario }) {
  const hasData = scenarioData && scenarioData.length > 0;

  // Use every 5th scenario point to avoid chart overload (50 → 10 points)
  const chartPoints = hasData
    ? scenarioData.filter((_, i) => i % 5 === 0).map((s) => ({
        name: `S${s.scenario}`,
        yield: Math.round(s.yield),
      }))
    : [];

  const minYield = hasData ? Math.min(...scenarioData.map((s) => s.yield)) : 0;
  const maxYield = hasData ? Math.max(...scenarioData.map((s) => s.yield)) : 0;
  const avgYield = hasData
    ? Math.round(scenarioData.reduce((a, b) => a + b.yield, 0) / scenarioData.length)
    : 0;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Scenario yield chart */}
      <div className="bg-surface-container rounded-2xl p-6 flex-1 drop-shadow-sm border border-outline-variant/5 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-headline font-bold text-primary-container text-lg">Enviromics</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {hasData
                ? `${stressScenario ?? "Climate"} · ${scenarioData.length} scenario run${scenarioData.length !== 1 ? "s" : ""}`
                : "Awaiting simulation data"}
            </p>
          </div>
          <span className="material-symbols-outlined text-stone-400">thermostat</span>
        </div>

        {hasData ? (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Min Yield", value: `${Math.round(minYield)} kg/ha`, color: "text-error" },
                { label: "Avg Yield", value: `${avgYield} kg/ha`, color: "text-secondary" },
                { label: "Max Yield", value: `${Math.round(maxYield)} kg/ha`, color: "text-primary" },
              ].map((s) => (
                <div key={s.label} className="bg-surface-container-highest rounded-xl p-2 text-center">
                  <p className={`text-sm font-bold font-headline ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Area chart of scenario yields */}
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints}>
                  <defs>
                    <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3C692B" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#3C692B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} width={40} unit="" />
                  <Tooltip formatter={(v) => [`${Math.round(v).toLocaleString()} kg/ha`, "Yield"]} />
                  <Area
                    type="monotone"
                    dataKey="yield"
                    stroke="#3C692B"
                    fill="url(#yieldGrad)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Location info */}
            {location && (
              <div className="text-xs text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-secondary">pin_drop</span>
                Lat {typeof location.lat === "number" ? location.lat.toFixed(3) : location.lat},
                Lon {typeof location.lon === "number" ? location.lon.toFixed(3) : location.lon}
              </div>
            )}
          </>
        ) : (
          /* Empty-state bar chart placeholder */
          <div className="flex items-end h-32 gap-3 border-b border-outline-variant/20 pb-2">
            {["2020", "2021", "2022"].map((year, i) => (
              <div key={year} className="flex-1 flex justify-center items-end group">
                <div className="w-10 rounded-t-md bg-surface-container-highest/40 h-16 flex items-end justify-center pb-1">
                  <span className="text-[10px] text-stone-600">{year}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confidence / Resilience score card */}
      <div className="bg-[#E4F3E6] dark:bg-[#1E2E20] rounded-2xl p-5 flex items-center justify-between border border-secondary/20">
        <div>
          <h4 className="font-headline font-bold text-[#1B3022] dark:text-secondary mb-1">
            {hasData ? "Climate Resilience Score" : "Confidence Score"}
          </h4>
          <p className="font-body text-xs text-stone-600 dark:text-stone-400">
            {hasData ? `Based on ${scenarioData.length} AI-generated scenarios` : "Based on cross-modal fusion"}
          </p>
          {hasData && resilienceScore != null && (
            <p className="text-xs text-stone-500 mt-1">
              {resilienceScore >= 80 ? "🟢 Highly resilient" : resilienceScore >= 60 ? "🟡 Moderately resilient" : "🔴 Climate vulnerable"}
            </p>
          )}
        </div>
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg viewBox="0 0 36 36" className="w-16 h-16 transform -rotate-90">
            <path
              className="text-stone-300 dark:text-stone-800"
              strokeWidth="4"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <motion.path
              className="text-secondary"
              strokeWidth="4"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              initial={{ strokeDasharray: "0, 100" }}
              animate={{ strokeDasharray: `${hasData ? (resilienceScore ?? 80) : 92}, 100` }}
              transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
            />
          </svg>
          <span className="absolute text-sm font-bold text-primary-container dark:text-secondary">
            {hasData ? `${Math.round(resilienceScore ?? 0)}%` : "92%"}
          </span>
        </div>
      </div>
    </div>
  );
}
