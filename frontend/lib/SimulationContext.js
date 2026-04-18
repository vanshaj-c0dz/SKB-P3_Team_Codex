"use client";
/**
 * SimulationContext — global store that shares simulation results
 * between the main simulation form (/) and all sub-pages (omics-fusion, scenario-engine, blueprinting).
 *
 * Usage:
 *   const { results, setResults } = useSimulation();
 */
import { createContext, useContext, useState } from "react";

const SimulationContext = createContext(null);

export function SimulationProvider({ children }) {
  const [results, setResults]     = useState(null);    // Full backend JSON response
  const [formInputs, setFormInputs] = useState(null);  // What the user submitted
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null); // File metadata for VcfDropzone

  return (
    <SimulationContext.Provider value={{ results, setResults, formInputs, setFormInputs, uploadedFileInfo, setUploadedFileInfo }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used inside <SimulationProvider>");
  return ctx;
}
