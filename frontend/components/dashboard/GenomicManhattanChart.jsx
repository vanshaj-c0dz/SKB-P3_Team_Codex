"use client";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

export function GenomicManhattanChart({ results }) {
  if (!results || !results.xai_insights || !results.xai_insights.snp_importance_scores) {
    return (
      <div className="bg-surface-container rounded-2xl p-6 h-[400px] flex items-center justify-center border border-outline-variant/15">
        <p className="text-sm font-label text-on-surface-variant">Awaiting XAI Genomic insights...</p>
      </div>
    );
  }

  // Pre-process SNP data from backend
  const snps = results.xai_insights.snp_importance_scores.map(snp => ({
    name: snp.snp_id,
    importance: snp.importance,
    role: snp.role, // "beneficial" or "risk"
    raw_score: snp.raw_score,
  }));

  // Limit to top 10 for display
  const displayData = snps.slice(0, 10).reverse(); // Reverse so top ranks appear at top in vertical

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface-container-highest p-3 rounded-lg border border-outline-variant/30 shadow-lg shadow-black/20 text-xs">
          <p className="font-bold text-on-surface mb-1">{data.name}</p>
          <p className="text-on-surface-variant">Importance: {data.importance.toFixed(4)}</p>
          <p className="mt-1">
            <span className={data.role === "beneficial" ? "text-secondary font-bold" : "text-error font-bold"}>
              {data.role === "beneficial" ? "↑ Yield Booster / Stress Tolerant" : "↓ Vulnerability Marker"}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 h-[380px] flex flex-col relative"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-headline font-bold text-lg text-primary-container">XAI Genomic Inspector</h3>
          <p className="text-xs text-on-surface-variant">Top Alleles by Attributed Impact</p>
        </div>
        <span className="material-symbols-outlined text-secondary opacity-70">troubleshoot</span>
      </div>

      <div className="flex-1 -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData} layout="vertical" margin={{ left: 20, right: 10, top: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 500, fill: "#78716c" }} 
              width={70} 
            />
            <Tooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} content={<CustomTooltip />} />
            <Bar dataKey="importance" radius={[0, 4, 4, 0]} isAnimationActive>
              {displayData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.role === "beneficial" ? "#3C692B" : "#ba1a1a"} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
