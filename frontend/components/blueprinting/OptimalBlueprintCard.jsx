"use client";

import { motion } from "framer-motion";

export function OptimalBlueprintCard({ id, yieldGain, waterEfficiency, confidence, onExportFASTA }) {
  // Use passed in props or fallback to defaults
  const yieldDisplay = yieldGain !== undefined ? yieldGain : "+14.2%";
  const waterDisplay = waterEfficiency !== undefined ? waterEfficiency : "Optimal";
  const confDisplay = confidence !== undefined ? confidence : "98%";

  return (
    <div className="bg-surface-container rounded-3xl p-8 flex flex-col justify-between h-full relative overflow-hidden border border-outline-variant/10">
      <div className="z-10 w-full md:w-2/3">
        <h3 className="font-headline font-bold text-primary-container text-3xl leading-tight mb-2">
          {id}
        </h3>
        <p className="text-stone-400 font-body text-sm mb-6">
          Synthesized from over 4,000 parameter simulations across 3 active climate models.
        </p>

        <div className="flex gap-4">
          <button
            onClick={onExportFASTA}
            className="bg-primary-container text-on-primary-container font-label font-bold text-sm px-6 py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">rocket_launch</span>
            Push to Lab
          </button>
        </div>

      </div>

      <div className="mt-12 z-10 flex gap-8 border-t border-outline-variant/20 pt-6">
        <div>
          <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Estimated Yield Gain</span>
          <span className="text-3xl font-headline font-bold text-secondary">{yieldDisplay}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Water Efficiency</span>
          <span className="text-3xl font-headline font-bold text-tertiary-container">{waterDisplay}</span>
        </div>
        <div>
          <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">Confidence Score</span>
          <span className="text-3xl font-headline font-bold text-primary-fixed-dim">{confDisplay}</span>
        </div>
      </div>

      {/* Abstract Background Design */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        className="absolute -right-32 -bottom-24 w-[400px] h-[400px] pointer-events-none opacity-20"
      >
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" stroke="#b4cdb8" strokeWidth="0.5" strokeDasharray="2 4"/>
          <circle cx="50" cy="50" r="35" stroke="#caeece" strokeWidth="1" />
          <path d="M50 15V85M15 50H85M25 25L75 75M75 25L25 75" stroke="#caeece" strokeWidth="0.5" />
        </svg>
      </motion.div>
    </div>
  );
}
