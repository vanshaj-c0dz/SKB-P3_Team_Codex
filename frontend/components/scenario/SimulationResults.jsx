"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { YieldStressChart } from "./YieldStressChart";
import { XAIDriversPanel } from "./XAIDriversPanel";

export function SimulationResults({ params, result }) {
    const [activeMetric, setActiveMetric] = useState('yield'); // 'yield' or 'resilience'

    // Calculate Multi-Scenario Distribution (Mock 50 scenarios)
    const scenarioDistribution = useMemo(() => {
        const baseResilience = parseFloat(result.resilience);
        return [
            { label: "P10 Worst-Case", value: Math.max(0, baseResilience - 22).toFixed(0) },
            { label: "Median Scenario", value: baseResilience },
            { label: "P90 Best-Case", value: Math.min(100, baseResilience + 12).toFixed(0) }
        ];
    }, [result.resilience]);

    return (
        <div className="flex flex-col gap-6">

            {/* KPI Cards - Quick Breeder Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-surface-container rounded-2xl p-5 border border-outline-variant/10 shadow-sm"
                >
                    <div className="flex items-center gap-2 text-stone-500 mb-2">
                        <span className="material-symbols-outlined text-[20px]">grass</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Predicted Yield</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-headline font-bold text-primary">{result.yield}</span>
                        <span className="text-sm text-stone-500">bu/ac</span>
                    </div>
                    <div className="text-xs text-stone-500 mt-2">
                        Baseline: 75.0 bu/ac • Loss: {(75.0 - parseFloat(result.yield)).toFixed(1)} bu
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-surface-container rounded-2xl p-5 border border-outline-variant/10 shadow-sm"
                >
                    <div className="flex items-center gap-2 text-stone-500 mb-2">
                        <span className="material-symbols-outlined text-[20px]">shield</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Resilience Score</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-headline font-bold ${parseFloat(result.resilience) > 60 ? 'text-secondary' :
                                parseFloat(result.resilience) > 30 ? 'text-[#EAB308]' : 'text-error'
                            }`}>
                            {result.resilience}
                        </span>
                        <span className="text-sm text-stone-500">/100</span>
                    </div>
                    <div className="flex gap-3 mt-2 text-[10px] font-bold">
                        {scenarioDistribution.map((s, i) => (
                            <div key={i} className="flex flex-col">
                                <span className="text-stone-400">{s.label}</span>
                                <span className="text-sm text-on-surface">{s.value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -2 }}
                    className="bg-surface-container rounded-2xl p-5 border border-outline-variant/10 shadow-sm"
                >
                    <div className="flex items-center gap-2 text-stone-500 mb-2">
                        <span className="material-symbols-outlined text-[20px]">science</span>
                        <span className="text-xs font-bold uppercase tracking-wider">Top Recommendation</span>
                    </div>
                    <div className="font-bold text-primary-container">
                        {parseFloat(result.resilience) < 40 ? "Avoid Planting" : "Select Parent A-12"}
                    </div>
                    <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                        {parseFloat(result.resilience) < 40
                            ? "CRS below threshold. Recommend drought-tolerant GM line."
                            : "SNP rs104 (Heat Shock Protein) active. Increase K by 12%."}
                    </p>
                </motion.div>
            </div>

            {/* Interactive Chart & XAI Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-surface-container rounded-2xl p-6 border border-outline-variant/10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-headline font-bold text-primary-container">Interactive GxE Stress Response</h3>
                        <div className="flex bg-surface-container-highest rounded-lg p-1">
                            <button
                                onClick={() => setActiveMetric('yield')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${activeMetric === 'yield' ? 'bg-primary-container text-on-primary-container' : 'text-stone-500'}`}
                            >
                                Yield (bu/ac)
                            </button>
                            <button
                                onClick={() => setActiveMetric('resilience')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${activeMetric === 'resilience' ? 'bg-primary-container text-on-primary-container' : 'text-stone-500'}`}
                            >
                                Resilience (%)
                            </button>
                        </div>
                    </div>
                    <YieldStressChart params={params} result={result} metric={activeMetric} />
                </div>

                <div className="bg-surface-container rounded-2xl p-6 border border-outline-variant/10">
                    <XAIDriversPanel drivers={result.drivers} />
                </div>
            </div>
        </div>
    );
}