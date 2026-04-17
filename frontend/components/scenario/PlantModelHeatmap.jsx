"use client";

import { motion } from "framer-motion";

export function PlantModelHeatmap({ params }) {
  // We can use params to tint the heatmap red (risk) vs green (healthy)
  const riskScore = params.heatDelta * 10 + (params.droughtDays - 10) + (params.pestRisk * 0.3);
  const isHighRisk = riskScore > 60;
  
  return (
    <div className="bg-surface-container rounded-2xl p-6 flex flex-col lg:flex-row gap-6">
      <div className="flex-1 flex items-center justify-center relative min-h-[250px] bg-stone-900/10 dark:bg-[#111111] rounded-xl overflow-hidden border border-outline-variant/10">
        <h4 className="absolute top-4 left-4 font-headline text-sm font-bold text-stone-500">Plant Morph Heatmap</h4>
        
        <motion.div 
          animate={{ scale: [1, 1.02, 1] }} 
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="relative w-40 h-40"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Abstract Plant Representation */}
            <span className={`material-symbols-outlined text-[100px] transition-colors duration-1000 ${isHighRisk ? 'text-error/80' : 'text-secondary/80'}`} style={{fontVariationSettings: "'FILL' 1"}}>
              local_florist
            </span>
          </div>

          <motion.div 
            animate={{ opacity: isHighRisk ? 0.7 : 0 }}
            className="absolute inset-0 bg-error/20 rounded-full blur-2xl transition-opacity duration-1000"
          />
        </motion.div>
      </div>

      <div className="w-full lg:w-64 flex flex-col gap-4">
        <h4 className="font-headline font-bold text-primary-container">Morphological Risk Metrics</h4>
        
        <div className="space-y-3">
          <MetricRow label="Root Biomass Loss" value={`${Math.min(100, Math.round(params.droughtDays * 0.8))}%`} isRisk={true} />
          <MetricRow label="Leaf Surface Drop" value={`${Math.min(100, Math.round(params.heatDelta * 12))}%`} isRisk={true} />
          <MetricRow label="Vigor Quotient" value={Math.max(10, 100 - riskScore).toFixed(1)} isRisk={false} />
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, isRisk }) {
  return (
    <div className="flex justify-between items-center bg-surface-container-highest p-3 rounded-lg border border-outline-variant/10">
      <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">{label}</span>
      <span className={`text-sm font-bold ${isRisk ? 'text-error' : 'text-secondary'}`}>{value}</span>
    </div>
  );
}
