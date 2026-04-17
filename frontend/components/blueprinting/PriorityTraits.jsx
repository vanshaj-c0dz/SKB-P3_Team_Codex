"use client";

import { motion } from "framer-motion";

export function PriorityTraits({ traits }) {
  return (
    <div className="bg-surface-container rounded-3xl p-6 h-full border border-outline-variant/10 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <span className="material-symbols-outlined text-secondary text-xl">psychiatry</span>
        <h3 className="font-headline font-bold text-primary-container text-lg">Priority Traits Synthesized</h3>
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-6">
        {traits.map((trait, i) => (
          <div key={trait.name} className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-stone-300">{trait.name}</span>
              <span className="font-bold text-stone-500">{(trait.weight * 100).toFixed(0)}% Match</span>
            </div>
            <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden flex relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${trait.weight * 100}%` }}
                transition={{ duration: 1, delay: i * 0.2 + 0.5, type: "spring" }}
                className="h-full rounded-full bg-secondary"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-surface-container-highest p-4 rounded-xl">
        <span className="material-symbols-outlined text-tertiary-container mb-2 block">info</span>
        <p className="font-body text-xs text-stone-400">
          This blueprint emphasizes structural resilience over pure yield optimization based on recent Enviromics data projections.
        </p>
      </div>
    </div>
  );
}
