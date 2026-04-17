"use client";
import { motion } from "framer-motion";

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

export function MetricCard({ metric }) {
  const { label, value, unit, trend, trendValue, icon, color, chartConfig } = metric;

  return (
    <motion.div 
      variants={itemVariants}
      whileHover={{ y: -5 }}
      className="bg-surface-container-lowest rounded-xl p-6 tincture-shadow border border-outline-variant/15 flex flex-col justify-between h-32 relative overflow-hidden group hover:bg-surface-bright transition-colors cursor-pointer"
    >
      <div className="flex justify-between items-start z-10">
        <h3 className="text-on-surface-variant font-label text-sm uppercase tracking-wider">{label}</h3>
        <span className={`material-symbols-outlined text-${color} text-sm`}>{icon}</span>
      </div>
      
      <div className={`z-10 ${trend === 'chart' ? 'flex items-end justify-between w-full' : ''}`}>
        <div>
          <span className={`text-3xl font-headline font-bold text-${color}`}>
            {value}
            {unit && <span className="text-lg text-outline">{unit}</span>}
          </span>
          {trend === 'up' && (
            <p className="text-secondary font-label text-xs mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px]">arrow_upward</span> {trendValue}
            </p>
          )}
          {trend === 'neutral' && (
            <p className="text-on-surface-variant font-label text-xs mt-1">{trendValue}</p>
          )}
        </div>

        {trend === 'chart' && chartConfig && (
          <div className="flex gap-1 items-end">
            {chartConfig.map((bar, i) => (
              <motion.span 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: bar.height }}
                transition={{ duration: 0.5, delay: 0.2 + (i * 0.1) }}
                className={`w-1 ${bar.color} rounded-t-sm`}
              />
            ))}
          </div>
        )}
      </div>

      {trend === 'up' && (
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-primary-fixed-dim/20 to-transparent opacity-50"></div>
      )}
    </motion.div>
  );
}
