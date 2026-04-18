"use client";

import { motion } from "framer-motion";

/**
 * XAIDriversPanel
 * ──────────────
 * Renders Explainable AI feature attributions from Captum Integrated Gradients.
 *
 * Props:
 *   drivers       – Physics-model drivers array (fallback when no XAI data)
 *   xaiInsights   – Real backend xai_insights object (snp_importance_scores, critical_weather_days)
 *   fatalDays     – fatal_weather_days string array from xai_insights
 */
export function XAIDriversPanel({ drivers, xaiInsights, fatalDays }) {
    // ── Prefer real Captum XAI SNP data when available ──────────────────────
    const hasRealXAI = xaiInsights?.snp_importance_scores?.length > 0;

    const snpRows = hasRealXAI
        ? xaiInsights.snp_importance_scores.slice(0, 5).map((s) => ({
              name: s.snp_id,
              importance: s.importance,
              role: s.role, // "beneficial" | "risk"
              raw_score: s.raw_score,
          }))
        : null;

    const criticalDays = fatalDays ?? xaiInsights?.fatal_weather_days ?? [];

    // ── Fallback: physics model drivers ─────────────────────────────────────
    const totalImpact = drivers?.length
        ? drivers.reduce((acc, d) => acc + Math.abs(d.impact), 0) || 1
        : 1;

    // ── If neither source, show awaiting ────────────────────────────────────
    if (!snpRows && (!drivers || drivers.length === 0)) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-4">
                <span className="material-symbols-outlined text-outline text-3xl">psychology</span>
                <p className="text-sm font-label font-bold text-on-surface-variant">Explainable AI (XAI)</p>
                <p className="text-xs text-on-surface-variant/60 max-w-[200px]">
                    Run a simulation to generate Captum Integrated Gradient attributions.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">psychology</span>
                <div>
                    <h4 className="font-headline font-bold text-primary-container text-sm">Explainable AI (XAI)</h4>
                    <p className="text-[10px] text-stone-500">
                        {hasRealXAI ? "Captum Integrated Gradients · Real genomic attribution" : "Physics-guided stress attribution"}
                    </p>
                </div>
                {hasRealXAI && (
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-widest bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                        Live AI
                    </span>
                )}
            </div>

            {/* ── Real SNP Attribution Panel ── */}
            {hasRealXAI ? (
                <div className="flex flex-col gap-3 flex-1">
                    {snpRows.map((snp, idx) => {
                        const pct = snpRows.reduce((s, x) => s + x.importance, 0);
                        const barWidth = pct > 0 ? (snp.importance / pct) * 100 : 0;
                        const isBeneficial = snp.role === "beneficial";
                        return (
                            <motion.div
                                key={`${snp.name}-${idx}`}
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.07 }}
                                className="space-y-1.5"
                            >
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-on-surface">{snp.name}</span>
                                    <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded-sm ${isBeneficial ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"}`}>
                                        {isBeneficial ? "↑ Yield Booster" : "↓ Risk Marker"}
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${barWidth}%` }}
                                        transition={{ duration: 0.6, ease: "easeOut" }}
                                        className={`h-full rounded-full ${isBeneficial ? "bg-secondary" : "bg-error/70"}`}
                                    />
                                </div>
                                <p className="text-[9px] text-stone-500 uppercase tracking-wider">
                                    Attribution: {snp.importance.toFixed(4)} · Score: {snp.raw_score > 0 ? "+" : ""}{snp.raw_score.toFixed(4)}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                /* ── Physics-model drivers fallback ── */
                <div className="space-y-4 flex-1">
                    {drivers.map((driver, idx) => (
                        <motion.div
                            key={`${driver.name}-${idx}`}
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="space-y-2"
                        >
                            <div className="flex justify-between text-sm font-bold">
                                <span>{driver.name}</span>
                                <span className="text-error">-{((Math.abs(driver.impact) / totalImpact) * 100).toFixed(0)}% impact</span>
                            </div>
                            <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(Math.abs(driver.impact) / totalImpact) * 100}%` }}
                                    className="h-full bg-error/70 rounded-full"
                                />
                            </div>
                            <p className="text-[10px] text-stone-500 uppercase tracking-wider">{driver.threshold}</p>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ── Critical Weather Days from XAI ── */}
            {criticalDays.length > 0 && (
                <div className="mt-auto pt-3 border-t border-outline-variant/20">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                        {hasRealXAI ? "XAI Critical Weather Days" : "🧬 Genomic Insight"}
                    </p>
                    <div className="flex flex-col gap-1">
                        {criticalDays.slice(0, 3).map((day, i) => (
                            <div key={i} className="bg-error-container/10 px-3 py-2 rounded-lg border border-error/15 text-xs text-error font-medium flex items-center gap-2">
                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                {day}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Fallback genomic insight footer ── */}
            {!hasRealXAI && criticalDays.length === 0 && drivers?.length > 0 && (
                <div className="mt-auto pt-3 border-t border-outline-variant/20">
                    <div className="bg-tertiary-container/10 p-3 rounded-xl border border-tertiary-container/20">
                        <span className="text-xs font-bold text-tertiary-container block mb-1">🧬 Genomic Insight (SNP rs104)</span>
                        <p className="text-xs text-stone-600">
                            {parseFloat(drivers[0]?.impact) > 20
                                ? "Heat shock protein expression detected. Cross with line B-7 to enhance thermotolerance."
                                : "Standard drought response. Root architecture gene GmNAC active."}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}