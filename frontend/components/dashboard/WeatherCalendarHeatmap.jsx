"use client";
import { motion } from "framer-motion";

export function WeatherCalendarHeatmap({ results }) {
  if (!results || !results.xai_insights || !results.xai_insights.env_daily_importance || results.xai_insights.env_daily_importance.length === 0) {
    return (
      <div className="bg-surface-container rounded-2xl p-6 h-[250px] flex flex-col items-center justify-center gap-3 border border-outline-variant/15">
        <span className="material-symbols-outlined text-outline text-4xl">calendar_month</span>
        <p className="text-sm font-label font-bold text-on-surface-variant">Enviromics Vulnerability Calendar</p>
        <p className="text-xs text-on-surface-variant/60 text-center max-w-[230px]">
          Awaiting 365-day XAI attribution data — run a simulation to reveal critical stress windows.
        </p>
      </div>
    );
  }

  const importanceData = results.xai_insights.env_daily_importance;
  // Pad data if not exactly 365
  const fullYear = Array.from({ length: 365 }, (_, i) => importanceData[i] || 0);

  // Normalize scores 0 to 1
  const maxScore = Math.max(...fullYear) || 1;
  const normalized = fullYear.map(v => v / maxScore);

  // Group into 52 weeks of 7 days
  const weeks = [];
  for (let i = 0; i < 365; i += 7) {
    weeks.push(normalized.slice(i, i + 7));
  }

  // Get color based on threshold. Above 85% is critical danger (red).
  const getColor = (val) => {
    if (val > 0.85) return "bg-error animate-pulse shadow-[0_0_8px_rgba(186,26,26,0.6)] z-10 relative";
    if (val > 0.6) return "bg-secondary";
    if (val > 0.3) return "bg-secondary-container";
    if (val > 0.1) return "bg-primary-fixed-dim";
    return "bg-surface-container-highest";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 overflow-x-auto relative"
    >
      <div className="flex justify-between items-start mb-6 min-w-[700px]">
        <div>
          <h3 className="font-headline font-bold text-lg text-primary-container">Enviromics Vulnerability Calendar</h3>
          <p className="text-xs text-on-surface-variant">365-Day timeline of critical stress periods (XAI Attributed Risk)</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-stone-500 uppercase">
          <span>Safe</span>
          <div className="flex gap-1">
            <span className="w-3 h-3 rounded-sm bg-surface-container-highest"></span>
            <span className="w-3 h-3 rounded-sm bg-primary-fixed-dim"></span>
            <span className="w-3 h-3 rounded-sm bg-secondary-container"></span>
            <span className="w-3 h-3 rounded-sm bg-secondary"></span>
            <span className="w-3 h-3 rounded-sm bg-error ml-2"></span>
          </div>
          <span>Fatal</span>
        </div>
      </div>

      <div className="flex gap-1 min-w-[750px]">
        {weeks.map((week, wIdx) => (
          <div key={`w-${wIdx}`} className="flex flex-col gap-1">
            {week.map((val, dIdx) => {
              const dayOfYear = wIdx * 7 + dIdx + 1;
              return (
                <div
                  key={`w${wIdx}-d${dIdx}`}
                  className={`w-3 h-3 rounded-sm group relative cursor-crosshair transition-colors duration-200 ${getColor(val)}`}
                >
                  <div className="absolute opacity-0 group-hover:opacity-100 bg-surface-container-highest border border-outline/20 text-on-surface text-[10px] px-2 py-1 rounded shadow-lg bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none whitespace-nowrap z-50">
                    Day {dayOfYear}
                    {val > 0.85 && <span className="text-error font-bold ml-1">· Critical</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
