"use client";
import { motion, AnimatePresence } from "framer-motion";

export function BlueprintKanban({ results }) {
  if (!results || !results.soil_fixation_blueprint || !results.soil_fixation_blueprint.action_plan) {
    return (
      <div className="bg-surface-container rounded-2xl p-6 h-[250px] flex items-center justify-center border border-outline-variant/15">
        <p className="text-sm font-label text-on-surface-variant">Awaiting Agronomic Blueprint generation...</p>
      </div>
    );
  }

  const actions = results.soil_fixation_blueprint.action_plan;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-headline font-bold text-lg text-primary-container">Agronomic Action Blueprint</h3>
          <p className="text-xs text-on-surface-variant">AI-generated Kanban matrix based on XAI genome-weather interactions.</p>
        </div>
        <span className="material-symbols-outlined text-secondary">assignment_turned_in</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-container/30 p-4 rounded-xl border border-outline-variant/10">
        
        {/* Column 1: Identified Risk */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-warning/30 text-warning">
             <span className="material-symbols-outlined text-[18px]">warning</span>
             <h4 className="font-bold text-sm tracking-wide">Identified Stress Vectors</h4>
          </div>
          
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-3">
            {actions.map(action => (
              <motion.div key={`${action.id}-risk`} variants={itemVariants} className="bg-error-container/10 p-4 rounded-lg border border-error/20 flex gap-3 h-full">
                 <div className="mt-0.5">
                   {action.priority === 'HIGH' ? (
                     <span className="material-symbols-outlined text-error text-[18px]">gpp_bad</span>
                   ) : (
                     <span className="material-symbols-outlined text-warning text-[18px]">error</span>
                   )}
                 </div>
                 <div>
                   <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider mb-1 inline-block ${
                     action.priority === 'HIGH' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
                   }`}>
                     {action.priority} Priority
                   </span>
                   <p className="text-sm font-medium text-on-surface leading-tight mt-1">{action.risk}</p>
                 </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Column 2: AI Recommendation */}
        <div className="flex flex-col gap-3">
           <div className="flex items-center gap-2 mb-2 pb-2 border-b border-secondary/30 text-secondary">
             <span className="material-symbols-outlined text-[18px]">check_circle</span>
             <h4 className="font-bold text-sm tracking-wide">Agronomic Re-Routing</h4>
          </div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-3">
            {actions.map(action => (
              <motion.div key={`${action.id}-rec`} variants={itemVariants} className="bg-secondary-container/10 p-4 rounded-lg border border-secondary/20 flex gap-3 h-full">
                 <div className="mt-0.5">
                    <span className="material-symbols-outlined text-secondary text-[18px]">auto_awesome</span>
                 </div>
                 <div>
                   <p className="text-sm font-medium text-on-surface leading-tight mt-1">{action.recommendation}</p>
                 </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}
