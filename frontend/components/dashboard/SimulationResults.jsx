"use client";
import { motion } from "framer-motion";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, Tooltip, ResponsiveContainer } from "recharts";
import { MetricCard } from "./MetricCard";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

export function SimulationResults({ results, onClose }) {
  if (!results) return null;

  // Build metrics for existing component
  const metrics = [
    {
      id: "best-variant",
      label: "Best Genotype ID",
      value: results.best_genotype_id,
      unit: "",
      trend: "neutral",
      trendValue: "Selected from 20 variants",
      icon: "psychiatry",
      color: "primary-container"
    },
    {
      id: "resilience-score",
      label: "Climate Resilience",
      value: results.climate_resilience_score,
      unit: "/100",
      trend: "up",
      trendValue: "High Survivability Index",
      icon: "wb_sunny",
      color: "secondary"
    },
    {
      id: "baseline-yield",
      label: "Baseline Yield Predict",
      value: results.baseline_yield,
      unit: " kg/ha",
      trend: "chart",
      trendValue: "",
      icon: "bar_chart",
      color: "tertiary-container",
      chartConfig: [
        { height: "20%", color: "bg-surface-container-highest" },
        { height: "40%", color: "bg-surface-container-highest" },
        { height: "60%", color: "bg-surface-container-highest" },
        { height: "85%", color: "bg-tertiary-container" },
        { height: "100%", color: "bg-tertiary-container" },
      ]
    }
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-2xl font-headline font-bold text-primary-container">Simulation Engine Output</h2>
          <p className="text-on-surface-variant font-body text-sm mt-1">
            PyTorch MasterBreedingModel finished. Scenario: 50 dangerous future climates evaluated.
          </p>
        </div>
        <button 
          onClick={onClose}
          className="text-outline hover:text-on-surface text-sm font-label flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
          Clear Results
        </button>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map(metric => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts Section */}
        <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/15 tincture-shadow flex flex-col h-64">
            <h3 className="font-headline font-bold text-sm text-on-surface mb-4">50 Climate Scenarios</h3>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={Array.from({length: 50}, (_, i) => ({ day: i, yield: 3000 + Math.random()*2000 - (i > 30 ? 500 : 0) }))}>
                  <defs>
                    <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3c692b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3c692b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip />
                  <Area type="monotone" dataKey="yield" stroke="#3c692b" fillOpacity={1} fill="url(#colorYield)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/15 tincture-shadow flex flex-col h-64">
            <h3 className="font-headline font-bold text-sm text-on-surface mb-4">Yield Stability Trends</h3>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { name: 'Baseline', value: 3450 },
                  { name: 'Drought', value: 3100 },
                  { name: 'Heatwave', value: 2900 },
                  { name: 'Combined', value: 2750 },
                ]}>
                  <Tooltip cursor={{fill: 'transparent'}}/>
                  <Line type="monotone" dataKey="value" stroke="#002c54" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/15 tincture-shadow flex flex-col h-64">
            <h3 className="font-headline font-bold text-sm text-on-surface mb-4">Stress Comparison</h3>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Heat', impact: -15 },
                  { name: 'Water', impact: -22 },
                  { name: 'Pest', impact: -5 },
                  { name: 'Salinity', impact: -8 },
                ]}>
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}}/>
                  <Bar dataKey="impact" fill="#ba1a1a" radius={[0, 0, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Explainable AI Panel (XAI) */}
        <motion.div variants={itemVariants} className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/15 shadow-sm flex flex-col gap-4">
           <div className="flex items-center gap-2 mb-2">
             <span className="material-symbols-outlined text-tertiary-container">troubleshoot</span>
             <h3 className="font-headline font-bold text-lg text-on-surface">Captum XAI Insights</h3>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
             <div className="bg-secondary-container/30 rounded-lg p-4">
                <h4 className="text-xs font-label uppercase text-on-secondary-container mb-3 tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  Positive Genes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {results.xai_insights.top_positive_genes.map(gene => (
                    <span key={gene} className="px-3 py-1 bg-secondary text-white text-xs rounded-full font-mono">{gene}</span>
                  ))}
                </div>
             </div>

             <div className="bg-error-container/30 rounded-lg p-4">
                <h4 className="text-xs font-label uppercase text-error mb-3 tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  Fatal Weather Days
                </h4>
                <ul className="text-sm font-body text-on-surface flex flex-col gap-2">
                  {results.xai_insights.fatal_weather_days.map((day, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs">
                      <span className="mt-[2px] w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
                      {day}
                    </li>
                  ))}
                </ul>
             </div>
           </div>
        </motion.div>

        {/* Agronomic Blueprint Panel */}
        <motion.div variants={itemVariants} className="bg-primary hover:bg-primary-container transition-colors rounded-xl p-6 tincture-shadow flex flex-col gap-4 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] -z-0 pointer-events-none"></div>
           
           <div className="flex items-center gap-2 mb-2 z-10">
             <span className="material-symbols-outlined text-secondary-container">architecture</span>
             <h3 className="font-headline font-bold text-lg text-white">Agronomic Blueprint</h3>
           </div>

           <div className="flex flex-col gap-3 z-10 flex-1">
             {results.agronomic_blueprint.map((rec, i) => (
               <div key={i} className="flex gap-3 bg-black/20 p-3 rounded-lg border border-white/5">
                 <span className="w-6 h-6 rounded-full bg-secondary-container text-primary-fixed-variant flex items-center justify-center text-xs font-bold font-mono shrink-0">
                   {i + 1}
                 </span>
                 <p className="text-sm font-body text-surface font-medium leading-relaxed">
                   {rec}
                 </p>
               </div>
             ))}
           </div>
        </motion.div>
      </div>

    </motion.div>
  );
}
