"use client";

import { motion } from "framer-motion";

export function ChromosomeViz({ data }) {
  // We can simulate a vertical chromosome graph
  return (
    <div className="flex flex-col gap-4 bg-surface-container rounded-2xl p-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-headline font-bold text-primary-container text-lg">Genomic Sequence Viz</h3>
        <span className="material-symbols-outlined text-stone-400">more_vert</span>
      </div>

      <div className="space-y-4">
        {data.map((chr, idx) => (
          <div key={chr.id} className="relative group cursor-pointer">
            <div className="flex justify-between text-xs font-label text-stone-500 font-medium mb-1">
              <span>{chr.label}</span>
              <span>{chr.coverage}% Coverage</span>
            </div>
            
            <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden flex relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${chr.coverage}%` }}
                transition={{ duration: 1, delay: idx * 0.2 }}
                className={`h-full rounded-full ${chr.active ? 'bg-secondary' : 'bg-primary-fixed-dim opacity-50'}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-outline-variant/20">
        <h4 className="text-sm font-bold text-stone-400 mb-3">Variant Filters</h4>
        <div className="flex gap-2 flex-wrap">
          {["SNP", "InDel", "CNV", "Frameshift"].map(filter => (
            <button key={filter} className="text-xs px-3 py-1.5 rounded-lg border border-outline-variant/30 text-stone-500 font-medium hover:border-secondary hover:text-secondary transition-colors duration-200">
              {filter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
