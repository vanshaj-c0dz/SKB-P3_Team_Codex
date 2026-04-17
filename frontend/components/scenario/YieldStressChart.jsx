"use client";

import { useMemo, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea,
    Legend
} from 'recharts';
import { motion } from "framer-motion";

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-surface-container-highest p-4 rounded-xl shadow-2xl border border-outline-variant/30 backdrop-blur-sm">
                <p className="font-bold text-primary-container mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-stone-400">{entry.name}:</span>
                        <span className="font-bold text-on-surface">{entry.value.toFixed(1)} {entry.unit}</span>
                    </div>
                ))}
                <p className="text-[10px] text-stone-500 mt-2 border-t border-outline-variant/20 pt-2">
                    Physics Constraint: {payload[0]?.payload?.constraint || "Standard GxE"}
                </p>
            </div>
        );
    }
    return null;
};

export function YieldStressChart({ params, result, metric }) {
    // Generate dynamic data points showing the relationship between stress and yield
    const data = useMemo(() => {
        const points = [];
        const baseYield = 75.0;

        // Generate a smooth curve showing how yield drops as heat/drought increases
        for (let i = 0; i <= 20; i++) {
            const stressLevel = i * 5; // 0 to 100

            // Physics-guided decay curve (exponential penalty at high stress)
            let yieldValue;
            let resilienceValue;
            let constraint;

            if (stressLevel < 30) {
                yieldValue = baseYield - (stressLevel * 0.4);
                resilienceValue = 100 - (stressLevel * 0.8);
                constraint = "Linear decline (Physiological buffer)";
            } else if (stressLevel < 60) {
                yieldValue = baseYield - 12 - Math.pow((stressLevel - 30) / 10, 2) * 8;
                resilienceValue = 76 - Math.pow((stressLevel - 30) / 5, 1.5) * 10;
                constraint = "Accelerated loss (Stomatal closure)";
            } else {
                yieldValue = Math.max(18, baseYield - 30 - Math.pow((stressLevel - 60) / 8, 2) * 25);
                resilienceValue = Math.max(10, 40 - Math.pow((stressLevel - 60) / 10, 1.8) * 20);
                constraint = "Critical threshold (Protein denaturation)";
            }

            points.push({
                stressLevel,
                yield: parseFloat(yieldValue.toFixed(1)),
                resilience: parseFloat(resilienceValue.toFixed(0)),
                constraint
            });
        }

        // Mark the current scenario point
        const currentStressIndex = Math.min(19, Math.floor(parseFloat(result.heatStress) + parseFloat(result.droughtStress)) / 5);

        return points.map((p, idx) => ({
            ...p,
            isCurrent: idx === currentStressIndex
        }));
    }, [result]);

    const currentStressValue = parseFloat(result.heatStress) + parseFloat(result.droughtStress);

    return (
        <div className="w-full h-[300px] relative">
            {/* Highlight the critical threshold zone */}
            <div className="absolute bottom-8 left-0 right-0 h-[40px] bg-error/5 border-t border-dashed border-error/30 pointer-events-none z-0"
                style={{ bottom: '32px', height: '40px' }} />

            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb20" />
                    <XAxis
                        dataKey="stressLevel"
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: '#78716c' }}
                        tickFormatter={(value) => `${value}%`}
                        label={{ value: 'Combined Environmental Stress Index', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#a8a29e' }}
                    />
                    <YAxis
                        yAxisId="left"
                        domain={metric === 'yield' ? [0, 90] : [0, 100]}
                        tick={{ fontSize: 10, fill: '#78716c' }}
                        tickFormatter={(value) => metric === 'yield' ? `${value} bu` : `${value}%`}
                    />

                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />

                    {/* The Physics-Guided Curve */}
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey={metric}
                        stroke={metric === 'yield' ? '#caeece' : '#b4cdb8'}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: '#caeece', stroke: '#1c1917' }}
                        name={metric === 'yield' ? 'Predicted Yield' : 'Resilience Score'}
                        unit={metric === 'yield' ? 'bu/ac' : '%'}
                    />

                    {/* Current Scenario Marker */}
                    <ReferenceArea
                        yAxisId="left"
                        x1={currentStressValue - 2}
                        x2={currentStressValue + 2}
                        fill="#EAB30820"
                        stroke="#EAB308"
                        strokeWidth={1}
                        label={{ value: 'Current Scenario', position: 'insideTop', fontSize: 9, fill: '#EAB308' }}
                    />
                </LineChart>
            </ResponsiveContainer>

            <div className="flex justify-between mt-2 text-[10px] text-stone-500">
                <span>Optimal Conditions</span>
                <span className="text-error/70">Critical Threshold (Heat 32°C + Drought)</span>
                <span>Yield Failure Zone</span>
            </div>
        </div>
    );
}