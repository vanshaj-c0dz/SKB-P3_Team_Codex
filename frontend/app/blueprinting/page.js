"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { OptimalBlueprintCard } from "@/components/blueprinting/OptimalBlueprintCard";
import { PriorityTraits } from "@/components/blueprinting/PriorityTraits";
import { getDashboardData } from "@/lib/mockData";

import { useSimulation } from "@/lib/SimulationContext";

// ─── FASTA Generator ────────────────────────────────────────────────────────
/**
 * Builds a synthetic FASTA file from simulation results.
 * Uses the best genotype's SNP indices to seed realistic nucleotide sequences.
 */
function generateFASTA(blueprintId, globalResults, traits) {
  const timestamp = new Date().toISOString();
  const genotypeId = globalResults?.best_genotype_id ?? "AX-72_x_B-901";
  const snpIndices = globalResults?.xai_insights?.top_snp_indices ?? [101, 204, 378];
  const parentalCrosses = globalResults?.top_parental_crosses ?? [];
  const resilience = globalResults?.climate_resilience_score ?? 72;
  const yieldKg = globalResults?.baseline_yield ?? 3000;

  const BASES = ["A", "T", "G", "C"];
  const seededSeq = (seed, len = 80) => {
    let s = seed;
    return Array.from({ length: len }, () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return BASES[s % 4];
    }).join("");
  };

  let fasta = `; FASTA Export — Climate-Resilient Crop Intelligence Platform
; Blueprint: ${blueprintId}
; Generated: ${timestamp}
; CRS: ${resilience}  |  Baseline Yield: ${yieldKg} kg/ha
;\n`;

  // Primary optimized sequence — derived from best genotype
  const primarySeed = snpIndices.reduce((acc, v) => acc + v, 0) * 31;
  fasta += `>${genotypeId} | Optimized Sequence | Heat-Tolerance Locus | CRS=${resilience}\n`;
  // 240 bp in 3 lines of 80
  for (let i = 0; i < 3; i++) {
    fasta += seededSeq(primarySeed + i * 997, 80) + "\n";
  }

  // SNP loci sequences
  snpIndices.slice(0, 3).forEach((snpIdx, i) => {
    const snpSeed = snpIdx * 137 + i * 53;
    fasta += `\n>SNP_${snpIdx} | XAI Top-${i + 1} Driver | Importance=${((0.04 + i * 0.01)).toFixed(3)} | ${traits[i]?.name ?? "Trait"}\n`;
    fasta += seededSeq(snpSeed, 60) + "\n";
  });

  // Parental cross sequences
  parentalCrosses.slice(0, 2).forEach((cross, i) => {
    const crossSeed = (cross.cross_id?.charCodeAt(0) ?? 67) * 211 + i * 71;
    fasta += `\n>${cross.cross_id ?? `Cross_${i + 1}`} | ${cross.parent_1_id} × ${cross.parent_2_id} | YieldPred=${cross.yield_pred ?? yieldKg} kg/ha\n`;
    fasta += seededSeq(crossSeed, 80) + "\n";
  });

  return fasta;
}

// ─── JSON Report Generator ───────────────────────────────────────────────────
function generateJSONReport(blueprintId, globalResults, traits, target) {
  return JSON.stringify(
    {
      report_type: "Breeding Blueprint Export",
      blueprint_id: blueprintId,
      export_target: target,
      generated_at: new Date().toISOString(),
      climate_resilience_score: globalResults?.climate_resilience_score ?? null,
      baseline_yield_kg_ha: globalResults?.baseline_yield ?? null,
      best_genotype_id: globalResults?.best_genotype_id ?? null,
      priority_traits: traits,
      top_parental_crosses: globalResults?.top_parental_crosses ?? [],
      xai_insights: globalResults?.xai_insights ?? {},
      agronomic_blueprint: globalResults?.agronomic_blueprint ?? [],
    },
    null,
    2
  );
}

// ─── Toast Component ─────────────────────────────────────────────────────────
function ExportToast({ message, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-surface-container border border-secondary/30 shadow-2xl px-5 py-4 rounded-2xl"
    >
      <span className="material-symbols-outlined text-secondary text-xl">check_circle</span>
      <div>
        <p className="text-sm font-bold text-primary-container">{message}</p>
        <p className="text-[11px] text-stone-500 mt-0.5">File saved to your Downloads folder</p>
      </div>
      <button
        onClick={onDone}
        className="ml-2 text-stone-500 hover:text-stone-300 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BlueprintingPage() {
  const data = getDashboardData();
  const mockBlueprintingData = data.blueprinting;
  const { results: globalResults } = useSimulation();

  const [toastMsg, setToastMsg] = useState(null);


  let blueprintId = mockBlueprintingData.blueprintId;
  let traits = mockBlueprintingData.traits;
  let yieldGain, waterEfficiency, confidence;

  if (globalResults) {
    blueprintId = `${globalResults.best_genotype_id} Optimal Blueprint`;

    const resilience = globalResults.climate_resilience_score || 0;
    const yieldKg = globalResults.baseline_yield || 3000;

    yieldGain = `+${((resilience / 10) + 5).toFixed(1)}%`;
    waterEfficiency = resilience > 70 ? "Optimal" : resilience > 40 ? "Adequate" : "Sub-Optimal";
    confidence = `${Math.min(99, Math.round(resilience + 12))}%`;

    traits = [
      { name: "Heat Tolerance (SNP Match)", weight: Math.min(1.0, (resilience / 100) * 0.9 + 0.1) },
      { name: "Yield Potential",            weight: Math.min(1.0, yieldKg / 5000) },
      { name: "Drought Resilience",         weight: resilience > 50 ? 0.85 : 0.4 },
    ];
  }

  // ── Export Handlers ──────────────────────────────────────────────────────
  const triggerDownload = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportFASTA = () => {
    const filename = `blueprint_${blueprintId.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.fasta`;
    const content = generateFASTA(blueprintId, globalResults, traits);
    triggerDownload(content, filename, "text/plain");
    setToastMsg("FASTA export successful!");
  };

  const handleExportJSON = () => {
    const filename = `blueprint_report_${Date.now()}.json`;
    const content = generateJSONReport(blueprintId, globalResults, traits, exportTarget);
    triggerDownload(content, filename, "application/json");
    setToastMsg("JSON report exported!");
  };

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
          <p className="text-on-surface-variant font-body text-sm mt-1">
            Export optimized variant sequences back to wet-lab environment.
          </p>
        </div>

        <div className="flex gap-3 items-center">
          {/* JSON Report Button */}
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 border border-outline-variant/30 hover:border-secondary/50 text-stone-300 hover:text-secondary transition-colors px-4 py-2 rounded-lg text-sm font-label font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            JSON Report
          </button>


          {/* FASTA Export Button */}
          <button
            onClick={handleExportFASTA}
            className="flex items-center gap-2 bg-secondary text-on-secondary hover:brightness-110 active:scale-95 transition-all px-4 py-2 rounded-lg text-sm font-label font-bold"
          >
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
          <OptimalBlueprintCard
            id={blueprintId}
            yieldGain={yieldGain}
            waterEfficiency={waterEfficiency}
            confidence={confidence}
            onExportFASTA={handleExportFASTA}
          />
        </div>

        <div className="lg:col-span-4">
          <PriorityTraits traits={traits} />
        </div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <ExportToast message={toastMsg} onDone={() => setToastMsg(null)} />
        )}
      </AnimatePresence>
    </main>
  );
}
