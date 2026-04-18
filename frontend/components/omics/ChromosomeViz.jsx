"use client";
import { motion } from "framer-motion";

/**
 * ChromosomeViz — shows per-chromosome SNP density derived from real XAI data.
 *
 * BUCKETING FIX:
 *   SNP indices from mock data range 0–900 (rng(900)), from backend they vary.
 *   Old formula `floor(idx / 20.6)` only mapped 0–205 → buckets 0–9.
 *   Anything above 205 fell outside all buckets → 0 hits everywhere.
 *   New formula: `idx % CHR_COUNT` maps ANY range uniformly into 0–9.
 *
 * INTENSITY WEIGHTING:
 *   When snpImportanceScores are present (real Captum XAI), bars are weighted
 *   by the importance magnitude rather than simple hit-count.
 */
export function ChromosomeViz({ snpIndices, genotypeCount, snpImportanceScores }) {
  const CHR_COUNT = 10;
  const hasSNPs = snpIndices && snpIndices.length > 0;

  // ─── Build per-chromosome intensity ─────────────────────────────────────
  let chromosomes;

  if (hasSNPs) {
    const hasScores =
      snpImportanceScores && snpImportanceScores.length > 0;

    // Accumulate intensity per bucket
    const chrIntensity = Array(CHR_COUNT).fill(0);

    if (hasScores) {
      // Importance-weighted: each SNP contributes its |importance| to its bucket
      snpImportanceScores.forEach(({ index, importance }) => {
        const idx = typeof index === "number" ? index : parseInt(index, 10);
        if (!isNaN(idx)) {
          const bucket = ((idx % CHR_COUNT) + CHR_COUNT) % CHR_COUNT; // safe modulo
          chrIntensity[bucket] += Math.abs(importance || 0);
        }
      });
    } else {
      // Hit-count: each SNP index contributes 1 to its bucket via modulo
      snpIndices.forEach((idx) => {
        const bucket = ((idx % CHR_COUNT) + CHR_COUNT) % CHR_COUNT;
        chrIntensity[bucket] += 1;
      });
    }

    const maxVal = Math.max(...chrIntensity, 1e-9);
    chromosomes = chrIntensity.map((val, i) => ({
      id: `Chr${i + 1}`,
      label: `Chromosome ${i + 1}`,
      coverage: Math.round((val / maxVal) * 100),
      active: val > 0 && val === maxVal,
    }));
  } else {
    // ─── Demo / awaiting state ────────────────────────────────────────────
    // Seeded non-zero pattern so the panel looks meaningful without any run
    const DEMO_INTENSITIES = [72, 45, 91, 33, 58, 81, 27, 64, 49, 76];
    const demoMax = Math.max(...DEMO_INTENSITIES);
    chromosomes = DEMO_INTENSITIES.map((v, i) => ({
      id: `Chr${i + 1}`,
      label: `Chromosome ${i + 1}`,
      coverage: Math.round((v / demoMax) * 100),
      active: v === demoMax,
    }));
  }

  return (
    <div className="flex flex-col gap-4 bg-surface-container rounded-2xl p-6 h-full">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="font-headline font-bold text-primary-container text-lg">
            Genomic Sequence Viz
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {hasSNPs
              ? `${snpIndices.length} top SNPs across ${CHR_COUNT} chromosomes · ${genotypeCount ?? "?"} genotypes`
              : "Demo pattern · Run simulation to see real SNP data"}
          </p>
        </div>
        <span className="material-symbols-outlined text-stone-400">more_vert</span>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {chromosomes.map((chr, idx) => (
          <div key={chr.id} className="relative group cursor-pointer">
            <div className="flex justify-between text-xs font-label text-stone-500 font-medium mb-1">
              <span className={chr.active ? "text-secondary font-bold" : ""}>
                {chr.label}
              </span>
              <span
                className={
                  chr.active
                    ? "text-secondary font-bold"
                    : chr.coverage > 0
                    ? "text-on-surface-variant"
                    : "text-stone-400"
                }
              >
                {chr.coverage}% Intensity
              </span>
            </div>
            <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${chr.coverage}%` }}
                transition={{ duration: 0.9, delay: idx * 0.07, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  chr.active
                    ? "bg-secondary shadow-[0_0_8px_rgba(60,105,43,0.5)]"
                    : chr.coverage > 50
                    ? "bg-primary-fixed-dim opacity-80"
                    : "bg-primary-fixed-dim opacity-50"
                }`}
              />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
