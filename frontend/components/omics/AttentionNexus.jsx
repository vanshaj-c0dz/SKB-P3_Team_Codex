"use client";

import { motion } from "framer-motion";

export function AttentionNexus() {
  return (
    <div className="flex flex-col gap-6 bg-surface-container rounded-2xl p-6 min-h-[500px] h-full relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4">
        <span className="material-symbols-outlined text-stone-600">center_focus_strong</span>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <h3 className="font-headline font-bold text-primary-container text-xl absolute top-0 left-0">Cross-Modal Viz</h3>
        <p className="text-stone-500 font-label text-xs absolute top-8 left-0">Attention Nexus Heatmap</p>
        
        {/* Abstract Node Structure */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 + 0.5, type: "spring" }}
              className="absolute w-4 h-4 rounded-full bg-secondary shadow-[0_0_15px_rgba(180,205,184,0.6)]"
              style={{
                transform: `rotate(${i * 60}deg) translateY(-80px) rotate(-${i * 60}deg)`
              }}
            />
          ))}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-24 h-24 rounded-full bg-tertiary-container border border-tertiary-fixed opacity-80 flex items-center justify-center shadow-[0_0_30px_rgba(202,238,206,0.3)] z-10"
          >
            <span className="material-symbols-outlined text-2xl text-on-tertiary-container">hub</span>
          </motion.div>
          
          {/* SVG Connecting Lines */}
          <svg className="absolute w-full h-full left-0 top-0 pointer-events-none" viewBox="0 0 256 256">
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const angle = (i * 60 - 90) * (Math.PI / 180);
              const x = 128 + 80 * Math.cos(angle);
              const y = 128 + 80 * Math.sin(angle);
              return (
                <motion.line
                  key={`line-${i}`}
                  x1="128" y1="128" x2={x} y2={y}
                  stroke="#3C692B"
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: i * 0.1 + 0.8, duration: 1 }}
                />
              )
            })}
          </svg>
        </div>
      </div>

      <div className="bg-surface-container-highest rounded-xl p-4 mt-auto">
        <h4 className="text-sm font-bold text-stone-300 mb-4 tracking-tight">Parameters Console</h4>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Similarity Threshold</span>
          <div className="flex items-center gap-3 w-1/2">
            <input type="range" min="0" max="100" defaultValue="85" className="w-full h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-secondary" />
            <span className="text-xs font-bold text-secondary">85%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
