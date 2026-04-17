"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STAGES = [
  { key: "INGESTING_DNA",    icon: "science",       label: "Parsing VCF genomic file" },
  { key: "FETCHING_WEATHER", icon: "cloud_download", label: "Fetching NASA weather data" },
  { key: "RUNNING_SCENARIOS",icon: "cached",         label: "Running 50 extreme climate scenarios" },
  { key: "XAI_ANALYSIS",     icon: "troubleshoot",   label: "Extracting Captum XAI insights" },
  { key: "BLUEPRINTING",     icon: "architecture",   label: "Generating agronomic blueprints" },
  { key: "COMPLETE",         icon: "check_circle",   label: "Pipeline complete!" },
];

const STAGE_ORDER = STAGES.map((s) => s.key);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_BASE  = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws");

export function PipelineProgress({ taskId, onComplete, onError }) {
  const [currentStage, setCurrentStage] = useState("QUEUED");
  const [pct, setPct] = useState(0);
  const [message, setMessage] = useState("Initialising AI pipeline…");
  const wsRef = useRef(null);

  useEffect(() => {
    if (!taskId) return;

    // Try WebSocket first, fall back to HTTP polling
    let ws;
    try {
      ws = new WebSocket(`${WS_BASE}/api/v1/ws/progress/${taskId}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setCurrentStage(data.stage);
        setPct(data.pct ?? 0);
        setMessage(data.message || data.stage);

        if (data.stage === "COMPLETE" && data.result) {
          onComplete?.(data.result);
          ws.close();
        }
        if (data.stage === "ERROR") {
          onError?.(data.error || "Pipeline failed");
          ws.close();
        }
      };

      ws.onerror = () => {
        // Fall back to HTTP polling if WS fails
        ws.close();
        startPolling();
      };
    } catch {
      startPolling();
    }

    function startPolling() {
      const interval = setInterval(async () => {
        try {
          const r = await fetch(`${API_BASE}/api/v1/predict/breeding/status/${taskId}`);
          const data = await r.json();
          setCurrentStage(data.stage);
          setPct(data.pct ?? 0);
          setMessage(data.stage);

          if (data.status === "complete") {
            clearInterval(interval);
            onComplete?.(data.result);
          }
          if (data.status === "error") {
            clearInterval(interval);
            onError?.(data.error);
          }
        } catch { /* network hiccup, keep polling */ }
      }, 1000);
      return () => clearInterval(interval);
    }

    return () => { ws?.close(); };
  }, [taskId]);

  const activeIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 tincture-shadow p-8 flex flex-col gap-8"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-headline font-bold text-primary-container">AI Digital Twin Running</h3>
        <p className="text-sm text-on-surface-variant">{message}</p>
      </div>

      {/* Global progress bar */}
      <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-primary"
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", damping: 25 }}
        />
      </div>
      <span className="text-xs text-on-surface-variant -mt-6 text-right font-mono">{pct}%</span>

      {/* Stage stepper */}
      <div className="flex flex-col gap-4">
        {STAGES.map((stage, idx) => {
          const done    = idx < activeIdx;
          const active  = stage.key === currentStage;
          const pending = idx > activeIdx;

          return (
            <div key={stage.key} className="flex items-center gap-4">
              {/* Icon bubble */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                done   ? "bg-secondary/20 text-secondary" :
                active ? "bg-primary/20 text-primary ring-2 ring-primary/30" :
                         "bg-surface-container text-outline"
              }`}>
                {done ? (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                ) : active ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin">{stage.icon === "cached" ? "cached" : "refresh"}</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">{stage.icon}</span>
                )}
              </div>

              {/* Label */}
              <div className="flex-1">
                <p className={`text-sm font-medium ${done ? "text-secondary" : active ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                  {stage.label}
                </p>
                {active && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
                    className="h-0.5 bg-primary/40 rounded mt-1"
                  />
                )}
              </div>

              {/* Status badge */}
              {done && (
                <span className="text-[10px] font-bold uppercase text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">Done</span>
              )}
              {active && (
                <span className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">Running</span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
