"use client";
import { motion } from "framer-motion";

export function ParentalMatchmaker({ results }) {
  if (!results || !results.top_parental_crosses) {
    return (
      <div className="bg-surface-container rounded-2xl p-6 h-[300px] flex items-center justify-center border border-outline-variant/15">
        <p className="text-sm font-label text-on-surface-variant">Awaiting parental matchmaking data...</p>
      </div>
    );
  }

  const crosses = results.top_parental_crosses;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 flex flex-col"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-headline font-bold text-lg text-primary-container">Smart Parental Matchmaker</h3>
          <p className="text-xs text-on-surface-variant">Top AI-recommended crosses for next-generation breeding</p>
        </div>
        <span className="material-symbols-outlined text-secondary">family_history</span>
      </div>

      <div className="overflow-x-auto relative">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/20">
              <th className="pb-3 text-xs font-bold text-stone-400 uppercase tracking-wider w-12 text-center">Rank</th>
              <th className="pb-3 text-xs font-bold text-stone-400 uppercase tracking-wider pl-2">Cross ID</th>
              <th className="pb-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Parent 1 (High Yield)</th>
              <th className="pb-3 text-xs font-bold text-stone-400 uppercase tracking-wider">Parent 2 (Resilient)</th>
              <th className="pb-3 text-xs font-bold text-stone-400 uppercase tracking-wider text-right">Resilience Score</th>
            </tr>
          </thead>
          <tbody>
            {crosses.map((cross, idx) => {
              const p1Yield = cross.parent_1_yield_pred !== undefined ? (cross.parent_1_yield_pred * 1000).toFixed(0) : cross.yield_pred;
              const trait = (cross.recommended_for || "High_Yield").replace("_", " ");
              const resilience = cross.climate_resilience_score ?? cross.resilience_score ?? 0;
              return (
              <tr key={cross.cross_id} className="border-b border-outline-variant/10 hover:bg-surface-container/30 transition-colors group">
                <td className="py-4 text-center">
                  {idx === 0 ? (
                    <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-[#f59e0b] text-white text-xs font-bold shadow-md">1</span>
                  ) : idx === 1 ? (
                    <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-[#94a3b8] text-white text-xs font-bold shadow-md">2</span>
                  ) : idx === 2 ? (
                    <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-[#b45309] text-white text-xs font-bold shadow-md">3</span>
                  ) : (
                    <span className="text-stone-500 text-sm font-bold">{idx + 1}</span>
                  )}
                </td>
                <td className="py-4 pl-2 font-mono text-sm text-on-surface font-bold">
                  {(cross.cross_id || "").replace("Cross_", "CX-")}
                </td>
                <td className="py-4 text-sm text-stone-600 dark:text-stone-300">
                  <div className="flex flex-col">
                    <span className="font-medium">{(cross.parent_1_id || "").replace("Genotype_", "GT-")}</span>
                    <span className="text-[10px] text-primary">{p1Yield} kg/ha pt.</span>
                  </div>
                </td>
                <td className="py-4 text-sm text-stone-600 dark:text-stone-300">
                   <div className="flex flex-col">
                    <span className="font-medium">{(cross.parent_2_id || "").replace("Genotype_", "GT-")}</span>
                    <span className="text-[10px] text-tertiary">{trait}</span>
                  </div>
                </td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${resilience > 80 ? 'bg-secondary' : 'bg-tertiary-container'}`} 
                        style={{ width: `${resilience}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-on-surface w-10">{Math.round(resilience)}%</span>
                  </div>
                </td>
              </tr>
            )
            })}
          </tbody>
        </table>
      </div>
      
      {crosses.length > 0 && (
         <div className="mt-4 pt-3 border-t border-outline-variant/10 text-xs text-on-surface-variant flex items-center justify-center gap-2">
           <span className="material-symbols-outlined text-[14px]">info</span>
           Selecting any cross will export its genome block configuration to Blueprinting.
         </div>
      )}
    </motion.div>
  );
}
