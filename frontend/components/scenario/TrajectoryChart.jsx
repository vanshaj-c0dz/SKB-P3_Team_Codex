"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

export function TrajectoryChart({ params }) {
  // Generate a dynamic trajectory based on params.
  // Base line: constant resilience over time.
  // Modifier line: decreases based on heat and drought.
  
  const basePoints = [
    { x: 0, y: 80 }, { x: 20, y: 78 }, { x: 40, y: 82 }, 
    { x: 60, y: 85 }, { x: 80, y: 80 }, { x: 100, y: 88 }
  ];

  const dynamicPoints = useMemo(() => {
    // A simple math modifier to shift the "resilience" line
    // heatDelta = 0..4 (max penalty = 30)
    // droughtDays = 10..60 (max penalty = 40)
    const heatPenalty = params.heatDelta * 7.5; 
    const droughtPenalty = ((params.droughtDays - 10) / 50) * 40; 
    
    // Total max drop is around 70 at the end of the timeline
    return basePoints.map((pt, i) => {
      // The penalty scales up over time (x access)
      const scale = pt.x / 100;
      return {
        x: pt.x,
        y: pt.y - ((heatPenalty + droughtPenalty) * scale)
      };
    });
  }, [params]);

  const generateSvgPath = (points) => {
    if (points.length === 0) return "";
    const d = points.map((p, i) => {
      // Convert abstract 0-100 coords to SVG 0-400w 0-200h coords
      const sx = (p.x / 100) * 400;
      // Invert Y axis for SVG
      const sy = 200 - ((p.y / 100) * 200);
      return `${i === 0 ? 'M' : 'L'} ${sx} ${sy}`;
    }).join(" ");
    return d;
  };

  const dynamicPath = generateSvgPath(dynamicPoints);
  const basePath = generateSvgPath(basePoints);

  return (
    <div className="bg-surface-container rounded-2xl p-6 flex flex-col min-h-[300px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-headline font-bold text-primary-container text-lg">Resilience Trajectory</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-secondary rounded-full"></div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Base Control</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-tertiary-container rounded-full"></div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Scenario Test</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative w-full h-full min-h-[200px]">
        {/* Y Axis Labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] font-medium text-stone-500 pb-6 pr-2">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>

        {/* Chart Area */}
        <div className="ml-8 h-full border-l border-b border-outline-variant/30 relative overflow-hidden">
          {/* Grid lines */}
          <div className="absolute top-[50%] w-full border-t border-dashed border-outline-variant/20 -mt-[1px]"></div>
          
          <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
            {/* Filter for glow */}
            <defs>
              <filter id="glowD" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Base line */}
            <path 
              d={basePath} 
              fill="none" 
              stroke="#b4cdb8" 
              strokeWidth="2" 
              strokeOpacity="0.4"
            />
            
            {/* Dynamic line */}
            <motion.path 
              d={dynamicPath} 
              fill="none" 
              stroke="#caeece" 
              strokeWidth="3"
              filter="url(#glowD)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1, d: dynamicPath }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
            />
            
            {/* End Point Dot */}
            <motion.circle
              cx={(dynamicPoints[dynamicPoints.length - 1].x / 100) * 400}
              cy={200 - ((dynamicPoints[dynamicPoints.length - 1].y / 100) * 200)}
              r="4"
              fill="#caeece"
              animate={{
                cy: 200 - ((dynamicPoints[dynamicPoints.length - 1].y / 100) * 200)
              }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
            />
          </svg>
        </div>
        
        {/* X Axis Labels */}
        <div className="ml-8 flex justify-between text-[10px] font-medium text-stone-500 pt-2">
          <span>Jan</span>
          <span>Mar</span>
          <span>May</span>
          <span>Jul</span>
          <span>Sep</span>
          <span>Nov</span>
        </div>
      </div>
    </div>
  );
}
