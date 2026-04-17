"use client";

import { motion } from "framer-motion";

export function XAIDriversPanel({ drivers }) {
    const totalImpact = drivers.reduce((acc, d) => acc + d.impact, 0);

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary-container">psychology</span>
                <h4 className="font-headline font-bold text-primary-container">Explainable AI (SHAP)</h4>
            </div>

            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
                Feature attribution for yield deviation. Physics loss applied during backpropagation.
            </p>

            <div className="space-y-6 flex-1">
                {drivers.map((driver, idx) => (
                    <motion.div
                        key={driver.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="space-y-2"
                    >
                        <div className="flex justify-between text-sm font-bold">
                            <span>{driver.name}</span>
                            <span className="text-error">-{(driver.impact / totalImpact * 100).toFixed(0)}% impact</span>
                        </div>

                        <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(driver.impact / totalImpact) * 100}%` }}
                                className="h-full bg-error/70 rounded-full"
                            />
                        </div>

                        <p className="text-[10px] text-stone-500 uppercase tracking-wider">
                            {driver.threshold}
                        </p>
                    </motion.div>
                ))}
            </div>

            <div className="mt-auto pt-6 border-t border-outline-variant/20">
                <div className="bg-tertiary-container/10 p-4 rounded-xl border border-tertiary-container/20">
                    <span className="text-xs font-bold text-tertiary-container block mb-1">🧬 Genomic Insight (SNP rs104)</span>
                    <p className="text-xs text-stone-600">
                        {parseFloat(drivers[0]?.impact) > 20
                            ? "Heat shock protein expression detected. Cross with line B-7 to enhance thermotolerance."
                            : "Standard drought response. Root architecture gene GmNAC active."}
                    </p>
                </div>
            </div>
        </div>
    );
}