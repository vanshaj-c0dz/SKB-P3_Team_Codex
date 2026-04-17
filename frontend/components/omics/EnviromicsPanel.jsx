"use client";

import { motion } from "framer-motion";

export function EnviromicsPanel({ enviromics }) {
  const maxTemp = Math.max(...enviromics.map(d => d.temp));
  
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="bg-surface-container rounded-2xl p-6 flex-1 drop-shadow-sm border border-outline-variant/5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline font-bold text-primary-container text-lg">Enviromics</h3>
          <span className="material-symbols-outlined text-stone-400">thermostat</span>
        </div>
        
        <div className="flex items-end h-40 gap-3 border-b border-outline-variant/20 pb-2 relative">
          {enviromics.map((data, i) => {
            const tempHeight = `${(data.temp / maxTemp) * 100}%`;
            return (
              <div key={data.year} className="flex-1 flex justify-center items-end group">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: tempHeight }}
                  transition={{ delay: i * 0.15, type: "spring" }}
                  className="w-10 bg-secondary-container rounded-t-md relative hover:bg-secondary transition-colors"
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    {data.temp}°
                  </span>
                </motion.div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 pt-2">
          {enviromics.map(data => (
            <div key={data.year} className="flex-1 text-center font-label text-xs text-stone-500 font-medium">
              {data.year}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#E4F3E6] dark:bg-[#1E2E20] rounded-2xl p-6 flex items-center justify-between border border-secondary/20">
        <div>
          <h4 className="font-headline font-bold text-[#1B3022] dark:text-secondary mb-1">Confidence Score</h4>
          <p className="font-body text-xs text-stone-600 dark:text-stone-400">Based on cross-modal fusion</p>
        </div>
        <div className="relative w-16 h-16 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-16 h-16 transform -rotate-90">
              <path
                className="text-stone-300 dark:text-stone-800"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <motion.path
                className="text-secondary"
                strokeWidth="4"
                strokeDasharray="92, 100"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: "92, 100" }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
              />
            </svg>
            <span className="absolute text-sm font-bold text-primary-container dark:text-secondary">92%</span>
        </div>
      </div>
    </div>
  );
}
