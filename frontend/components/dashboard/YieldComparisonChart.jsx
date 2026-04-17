"use client";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Cell
} from "recharts";

function BigKPI({ label, value, unit, color, icon, subtitle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex-1 rounded-2xl p-6 border ${color.border} ${color.bg} flex flex-col gap-2`}
    >
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined text-2xl ${color.icon}`}>{icon}</span>
        <span className={`text-xs font-label uppercase tracking-widest ${color.label}`}>{label}</span>
      </div>
      <div className={`text-4xl font-headline font-bold ${color.value} leading-none`}>
        {typeof value === "number" ? value.toLocaleString() : value}
        <span className="text-lg font-normal ml-1">{unit}</span>
      </div>
      {subtitle && <p className={`text-xs ${color.label} mt-1`}>{subtitle}</p>}
    </motion.div>
  );
}

export function YieldComparisonChart({ results }) {
  if (!results) return null;

  const baseline  = results.baseline_yield ?? 0;
  const scenarios = results.scenario_chart_data ?? [];
  const extreme   = scenarios.length > 0 ? Math.round(Math.min(...scenarios.map((s) => s.yield))) : 0;
  const yieldLoss = baseline > 0 ? Math.round(((baseline - extreme) / baseline) * 100) : 0;

  // Bar chart data — pair baseline vs extreme for up to 4 scenario groups
  const chartData = [
    { name: "Baseline",       yield: baseline,        fill: "#3c692b" },
    { name: "Extreme Stress", yield: extreme,         fill: "#ba1a1a" },
    { name: "Heatwave Avg",   yield: _avg(scenarios, 0,  10), fill: "#e84935" },
    { name: "Drought Avg",    yield: _avg(scenarios, 10, 20), fill: "#d97706" },
    { name: "Flood Avg",      yield: _avg(scenarios, 20, 30), fill: "#2563eb" },
    { name: "Combined Avg",   yield: _avg(scenarios, 30, 50), fill: "#7c3aed" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 tincture-shadow p-6 flex flex-col gap-6"
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary-container">bar_chart_4_bars</span>
        <h3 className="font-headline font-bold text-lg text-on-surface">Baseline vs. Extreme Yield</h3>
      </div>

      {/* Big KPI pair */}
      <div className="flex gap-4">
        <BigKPI
          label="Normal Yield"
          value={baseline}
          unit="kg/ha"
          icon="eco"
          subtitle={`${results.crop_type ?? "Crop"} · Baseline conditions`}
          color={{ bg: "bg-secondary-container/20", border: "border-secondary/20", icon: "text-secondary", label: "text-secondary/70", value: "text-secondary" }}
        />
        <BigKPI
          label="Extreme Stress Yield"
          value={extreme}
          unit="kg/ha"
          icon="thunderstorm"
          subtitle={`${yieldLoss}% drop under worst-case scenario`}
          color={{ bg: "bg-error-container/20", border: "border-error/20", icon: "text-error", label: "text-error/70", value: "text-error" }}
        />
      </div>

      {/* Grouped comparison bar chart */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={46} unit=" kg" />
            <Tooltip formatter={(v) => [`${Math.round(v).toLocaleString()} kg/ha`, "Yield"]} />
            <ReferenceLine y={baseline} stroke="#3c692b" strokeDasharray="4 2" label={{ value: "Baseline", fill: "#3c692b", fontSize: 10 }} />
            <Bar dataKey="yield" radius={[4, 4, 0, 0]} isAnimationActive>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

function _avg(scenarios, from, to) {
  const slice = scenarios.slice(from, to);
  if (!slice.length) return 0;
  return Math.round(slice.reduce((s, x) => s + x.yield, 0) / slice.length);
}
