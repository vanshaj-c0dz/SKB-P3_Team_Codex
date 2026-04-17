"use client";

import { motion } from "framer-motion";
import { ChromosomeViz } from "@/components/omics/ChromosomeViz";
import { AttentionNexus } from "@/components/omics/AttentionNexus";
import { EnviromicsPanel } from "@/components/omics/EnviromicsPanel";
import { useSimulation } from "@/lib/SimulationContext";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function OmicsFusionPage() {
  const { results, formInputs } = useSimulation();

  // Extract relevant props for sub-components safely
  const snpIndices = results?.xai_insights?.top_snp_indices || [];
  const genotypeCount = results?.genotype_count ?? null;
  const xaiInsights = results?.xai_insights;
  const scenarioData = results?.scenario_chart_data;
  const resilienceScore = results?.climate_resilience_score;

  return (
    <main className="p-8 overflow-y-auto flex-1 flex flex-col gap-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-between items-end border-b border-outline-variant/20 pb-4"
      >
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary-container">Omics Fusion</h2>
          <p className="text-on-surface-variant font-body text-sm mt-1">Multi-modal integration of genomics, transcriptomics, and enviromics.</p>
        </div>
        <div className="flex gap-2">
          {results ? (
             <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-label font-medium">
               <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span> Analyzing VCF Input
             </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-surface-container-highest text-on-surface-variant rounded-full text-xs font-label font-medium">
               Awaiting Simulation
            </span>
          )}
          <button className="flex items-center gap-2 bg-surface-container hover:bg-surface-container-highest transition-colors px-4 py-2 rounded-xl border border-outline-variant/20 text-sm font-label font-bold text-stone-500">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            Configure Modalities
          </button>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]"
      >
        <motion.div variants={itemVariants} className="h-full">
          <ChromosomeViz snpIndices={snpIndices} genotypeCount={genotypeCount} />
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <AttentionNexus xaiInsights={xaiInsights} scenarioData={scenarioData} />
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <EnviromicsPanel 
            scenarioData={scenarioData} 
            resilienceScore={resilienceScore} 
            location={results?.location}
            stressScenario={results?.stress_scenario ?? formInputs?.stress}
          />
        </motion.div>
      </motion.div>
    </main>
  );
}
