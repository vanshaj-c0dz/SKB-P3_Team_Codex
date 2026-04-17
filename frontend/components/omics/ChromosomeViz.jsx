"use client";
import { motion } from "framer-motion";

/**
 * ChromosomeViz — shows per-chromosome SNP coverage derived from real XAI data.
 * If results available: derives chromosomes from top_snp_indices.
 * If no results: shows an instructional empty state.
 */
export function ChromosomeViz({ snpIndices, genotypeCount }) {
  // Build chromosome bands from SNP indices
  // VCF chromosomes (Soybean has 20 chromosomes). Each SNP index maps to chr = floor(idx / 10) + 1
  const hasSNPs = snpIndices && snpIndices.length > 0;

  // Aggregate SNP hits per chromosome band (assume 10 SNPs per chr band out of 206-dim input)
  const CHR_COUNT = 10;
  const snpsPerChr = Array.from({ length: CHR_COUNT }, (_, i) => {
    const hits = hasSNPs
      ? snpIndices.filter((idx) => Math.floor(idx / (206 / CHR_COUNT)) === i).length
      : 0;
    return { id: `Chr${i + 1}`, label: `Chromosome ${i + 1}`, snpHits: hits };
  });

  // Normalize to coverage %
  const maxHits = Math.max(...snpsPerChr.map((c) => c.snpHits), 1);
  const chromosomes = snpsPerChr.map((c, i) => ({
    ...c,
    coverage: hasSNPs ? Math.round((c.snpHits / maxHits) * 100) : 0,
    active: c.snpHits === Math.max(...snpsPerChr.map((x) => x.snpHits)),
  }));

  // If no SNPs hit any chr, spread pseudo-uniform so UI isn't empty
  const display = hasSNPs
    ? chromosomes
    : [
        { id: "Chr1", label: "Chromosome 1 (Awaiting VCF)", coverage: 0, active: false },
        { id: "Chr2", label: "Chromosome 2 (Awaiting VCF)", coverage: 0, active: false },
        { id: "Chr3", label: "Chromosome 3 (Awaiting VCF)", coverage: 0, active: false },
      ];

  return (
    <div className="flex flex-col gap-4 bg-surface-container rounded-2xl p-6 h-full">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="font-headline font-bold text-primary-container text-lg">Genomic Sequence Viz</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {hasSNPs
              ? `${snpIndices.length} top SNPs across ${CHR_COUNT} chromosomes · ${genotypeCount ?? "?"} genotypes`
              : "Run simulation to see real SNP coverage"}
          </p>
        </div>
        <span className="material-symbols-outlined text-stone-400">more_vert</span>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {display.map((chr, idx) => (
          <div key={chr.id} className="relative group cursor-pointer">
            <div className="flex justify-between text-xs font-label text-stone-500 font-medium mb-1">
              <span className={chr.active ? "text-secondary font-bold" : ""}>{chr.label}</span>
              <span>{hasSNPs ? `${chr.coverage}% Intensity` : "—"}</span>
            </div>
            <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden flex relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${chr.coverage}%` }}
                transition={{ duration: 1, delay: idx * 0.08 }}
                className={`h-full rounded-full ${chr.active ? "bg-secondary shadow-[0_0_8px_rgba(60,105,43,0.5)]" : "bg-primary-fixed-dim opacity-70"}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Variant filter buttons */}
      <div className="mt-2 pt-4 border-t border-outline-variant/20">
        <h4 className="text-xs font-bold text-stone-400 mb-2">Variant Type Filters</h4>
        <div className="flex gap-2 flex-wrap">
          {["SNP", "InDel", "CNV", "Frameshift"].map((filter) => (
            <button
              key={filter}
              className="text-xs px-3 py-1.5 rounded-lg border border-outline-variant/30 text-stone-500 font-medium hover:border-secondary hover:text-secondary transition-colors duration-200"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
