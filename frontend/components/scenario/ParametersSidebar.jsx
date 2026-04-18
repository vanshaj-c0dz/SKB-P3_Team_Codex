"use client";

import { motion } from "framer-motion";

export function ParametersSidebar({ params, setParams, onRunSimulation, isSimulating }) {
  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: Number(value) }));
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="bg-surface-container w-80 rounded-r-2xl border-r border-y border-outline-variant/10 p-6 flex flex-col gap-6 shadow-xl"
    >
      <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
        <span className="material-symbols-outlined text-primary text-xl">tune</span>
        <h3 className="font-headline font-bold text-primary-container">Scenario Parameters</h3>
        <span className="ml-auto flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-secondary px-2 py-0.5 bg-secondary/10 rounded-full border border-secondary/20">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block animate-pulse" />
          Live
        </span>
      </div>

      <div className="flex flex-col gap-5">

        {/* Heat Intensity Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Global Heat Delta (°C)</label>
            <span className="text-sm font-bold text-tertiary-container">{`+${params.heatDelta.toFixed(1)}`}</span>
          </div>
          <input
            type="range"
            min="0"
            max="4"
            step="0.1"
            value={params.heatDelta}
            onChange={(e) => handleParamChange('heatDelta', e.target.value)}
            className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-tertiary-container"
          />
          <div className="flex justify-between text-[9px] text-stone-400">
            <span>Baseline</span>
            <span>+2°C (Moderate)</span>
            <span>+4°C (Extreme)</span>
          </div>
          {/* Live effect label */}
          <p className="text-[9px] text-stone-400 italic">
            Heat stress: {params.heatDelta > 2.5
              ? `${(Math.pow(params.heatDelta - 2.0, 2) * 4.5).toFixed(1)} bu/ac loss (exponential)`
              : `${(params.heatDelta * 2.0).toFixed(1)} bu/ac loss (linear)`
            }
          </p>
        </div>

        {/* Drought Duration Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">No-Rain Days</label>
            <span className="text-sm font-bold text-secondary">{params.droughtDays}</span>
          </div>
          <input
            type="range"
            min="10"
            max="60"
            step="1"
            value={params.droughtDays}
            onChange={(e) => handleParamChange('droughtDays', e.target.value)}
            className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-secondary"
          />
          <div className="flex justify-between text-[9px] text-stone-400">
            <span>Mild</span>
            <span>30d (Severe)</span>
            <span>60d (Catastrophic)</span>
          </div>
          <p className="text-[9px] text-stone-400 italic">
            Drought stress: {((params.droughtDays / 50) * 22).toFixed(1)} bu/ac loss
          </p>
        </div>

        {/* Pest Risk Level Slider */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Pest Migration Risk</label>
            <span className="text-sm font-bold text-[#EAB308]">{`${params.pestRisk}%`}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={params.pestRisk}
            onChange={(e) => handleParamChange('pestRisk', e.target.value)}
            className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-[#EAB308]"
          />
          <div className="flex justify-between text-[9px] text-stone-400">
            <span>No Risk</span>
            <span>50% (High)</span>
            <span>100% (Critical)</span>
          </div>
          <p className="text-[9px] text-stone-400 italic">
            Pests exploit weakened plants — multiplicative with heat + drought.
          </p>
        </div>
      </div>

      {/* Multi-Omics Status Box */}
      <div className="bg-tertiary-container/5 p-4 rounded-xl border border-tertiary-container/10">
        <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">Active Models</p>
        <div className="flex gap-2 text-[10px]">
          <span className="bg-surface-container-highest px-2 py-1 rounded">1D-CNN (Genomic)</span>
          <span className="bg-surface-container-highest px-2 py-1 rounded">LSTM (Enviromics)</span>
        </div>
        <p className="text-[10px] text-stone-500 mt-2">Cross-Modal Attention active. Physics Loss enabled.</p>
      </div>

      <div className="mt-auto pt-6 border-t border-outline-variant/20 flex flex-col gap-3">
        <button
          onClick={() => setParams({ heatDelta: 2.0, droughtDays: 30, pestRisk: 50 })}
          className="w-full py-2 bg-surface-container-highest hover:bg-surface-tint text-stone-400 font-bold text-sm rounded-lg transition-colors border border-outline-variant/20"
        >
          Reset Defaults
        </button>
        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className="w-full py-2 bg-primary-container text-on-primary-container font-bold text-sm rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSimulating ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              Processing...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              Run Full AI Pipeline
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}