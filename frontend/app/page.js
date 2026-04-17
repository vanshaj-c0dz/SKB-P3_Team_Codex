"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SimulationForm } from "@/components/dashboard/SimulationForm";
import { SimulationResults } from "@/components/dashboard/SimulationResults";
import { runSimulation } from "@/lib/simulation";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    }
  }
};

export default function Dashboard() {
  const [simStatus, setSimStatus] = useState("idle"); // 'idle' | 'loading' | 'complete'
  const [simResults, setSimResults] = useState(null);

  const handleSimulate = async (formData) => {
    setSimStatus("loading");
    try {
      const results = await runSimulation(formData);
      setSimResults(results);
      setSimStatus("complete");
    } catch (e) {
       console.error(e);
       setSimStatus("idle");
    }
  };

  const handleClear = () => {
    setSimStatus("idle");
    setSimResults(null);
  };

  return (
    <main className="p-8 overflow-y-auto flex-1 flex flex-col gap-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-between items-end"
      >
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary-container">Global Intelligence & Simulation</h2>
          <p className="text-on-surface-variant font-body text-sm mt-1">Real-time macro-analysis & predictive scenarios.</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-label font-medium">
            <span className="w-2 h-2 rounded-full bg-secondary"></span> Live Sync
          </span>
        </div>
      </motion.div>

      {/* Simulation Form Panel */}
      <SimulationForm onSimulate={handleSimulate} isSimulating={simStatus === "loading"} />

      <AnimatePresence mode="wait">
        {simStatus === "complete" && simResults ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
          >
            <SimulationResults results={simResults} onClose={handleClear} />
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className={`flex flex-col items-center justify-center min-h-[300px] border border-dashed border-outline-variant rounded-xl mt-4 transition-opacity duration-500 ${
              simStatus === "loading" ? "opacity-30 pointer-events-none select-none blur-[2px]" : ""
            }`}
          >
            <span className="material-symbols-outlined text-outline text-5xl mb-4">analytics</span>
            <p className="text-on-surface-variant font-label text-sm uppercase tracking-wider">Awaiting Simulation Parameters</p>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
