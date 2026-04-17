"use client";

import { motion } from "framer-motion";
import { OptimalBlueprintCard } from "@/components/blueprinting/OptimalBlueprintCard";
import { PriorityTraits } from "@/components/blueprinting/PriorityTraits";
import { getDashboardData } from "@/lib/mockData";

export default function BlueprintingPage() {
  const data = getDashboardData();
  const blueprintingData = data.blueprinting;

  return (
    <main className="p-8 overflow-y-auto flex-1 flex flex-col gap-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-between items-end border-b border-outline-variant/20 pb-4"
      >
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary-container">Blueprinting Action Center</h2>
          <p className="text-on-surface-variant font-body text-sm mt-1">Export optimized variant sequences back to wet-lab environment.</p>
        </div>
        <div className="flex gap-4">
          <select className="bg-surface-container border border-outline-variant/20 text-stone-300 text-sm rounded-lg px-4 py-2 font-medium appearance-none min-w-[200px]">
            <option>Target: Central Hub</option>
            <option>Target: Latam Array</option>
          </select>
          <button className="flex items-center gap-2 bg-secondary text-on-secondary hover:brightness-110 transition-colors px-4 py-2 rounded-lg text-sm font-label font-bold">
            <span className="material-symbols-outlined text-[20px]">download</span>
            Export FASTA
          </button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[450px]"
      >
        <div className="lg:col-span-8">
          <OptimalBlueprintCard id={blueprintingData.blueprintId} />
        </div>
        
        <div className="lg:col-span-4">
          <PriorityTraits traits={blueprintingData.traits} />
        </div>
      </motion.div>
    </main>
  );
}
