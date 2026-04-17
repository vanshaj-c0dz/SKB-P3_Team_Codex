"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamically import map to avoid SSR window issues
const LocationMap = dynamic(() => import("./LocationMap"), { ssr: false, loading: () => <div className="w-full h-full bg-surface-container-low animate-pulse rounded-xl"></div> });

export function SimulationForm({ onSimulate, isSimulating }) {
  const [formData, setFormData] = useState({
    file: null,
    locationCoords: null, // {lat, lng}
    locationInput: "",
    crop: "Soybean",
    stress: "Extreme Drought + Heatwave"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.file || (!formData.locationInput && !formData.locationCoords)) {
      alert("Please upload a VCF file and specify a location either by searching or dropping a pin.");
      return;
    }
    
    // Construct final payload
    const finalLocationString = formData.locationCoords 
      ? `${formData.locationInput || 'Map Selection'} (Lat: ${formData.locationCoords.lat.toFixed(4)}, Lon: ${formData.locationCoords.lng.toFixed(4)})` 
      : formData.locationInput;

    onSimulate({
      ...formData,
      location: finalLocationString
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-lowest rounded-xl p-8 tincture-shadow border border-outline-variant/15 relative w-full flex flex-col z-0"
    >
      <h3 className="text-2xl font-headline font-bold text-primary-container mb-6">AI Engine Simulation</h3>
      
      <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-8 w-full">
        
        {/* Left Column: Data & Parameters */}
        <div className="flex-1 flex flex-col gap-6">
          {/* VCF Upload */}
          <div className="flex flex-col gap-2">
            <label className="text-on-surface-variant font-label text-sm uppercase tracking-wider">Genomic Data (.vcf)</label>
            <div className="border border-dashed border-outline-variant bg-surface-container-low rounded-xl p-6 flex items-center gap-4 cursor-pointer hover:bg-surface-bright transition-colors relative w-full">
               <div className="w-12 h-12 rounded-full bg-secondary-container/50 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-2xl">science</span>
               </div>
               <div className="flex flex-col">
                 <span className="font-headline font-bold text-on-surface">
                   {formData.file ? formData.file.name : "Upload DNA Variant File"}
                 </span>
                 <span className="text-sm font-medium text-on-surface-variant">
                   {formData.file ? "File ready for CNN ingestion" : "Drag & Drop or Click to Browse"}
                 </span>
               </div>
               <input 
                 type="file" 
                 accept=".vcf"
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                 onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
               />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Crop Type */}
            <div className="flex flex-col gap-2">
              <label className="text-on-surface-variant font-label text-sm uppercase tracking-wider">Crop Type</label>
              <div className="flex items-center bg-surface-container rounded-lg px-4 py-3 relative border border-outline-variant/20 hover:border-outline-variant/50 transition-colors">
                <span className="material-symbols-outlined text-outline mr-3">grass</span>
                <select 
                  className="bg-transparent border-none outline-none w-full text-on-surface appearance-none font-medium"
                  value={formData.crop}
                  onChange={(e) => setFormData({...formData, crop: e.target.value})}
                >
                  <option>Soybean</option>
                  <option>Wheat</option>
                  <option>Corn</option>
                  <option>Rice</option>
                </select>
                <span className="material-symbols-outlined text-outline absolute right-4 pointer-events-none">expand_more</span>
              </div>
            </div>

            {/* Stress Scenario */}
            <div className="flex flex-col gap-2">
              <label className="text-on-surface-variant font-label text-sm uppercase tracking-wider">Target Stress Scenario</label>
              <div className="flex items-center bg-surface-container rounded-lg px-4 py-3 relative border border-outline-variant/20 hover:border-outline-variant/50 transition-colors">
                <span className="material-symbols-outlined text-error/80 mr-3">warning</span>
                <select 
                  className="bg-transparent border-none outline-none w-full text-on-surface appearance-none font-medium"
                  value={formData.stress}
                  onChange={(e) => setFormData({...formData, stress: e.target.value})}
                >
                  <option>Extreme Drought + Heatwave</option>
                  <option>Flood Risk</option>
                  <option>Pest Invasion</option>
                  <option>Salinity Stress</option>
                </select>
                <span className="material-symbols-outlined text-outline absolute right-4 pointer-events-none">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Map Area */}
        <div className="flex-1 flex flex-col gap-2 relative">
          <label className="text-on-surface-variant font-label text-sm uppercase tracking-wider flex items-center justify-between">
            Target Location
            <span className="text-xs text-secondary normal-case pr-1">Drop a pin or search</span>
          </label>
          
          <div className="relative w-full h-48 lg:h-full min-h-[250px] rounded-xl overflow-hidden border border-outline-variant/20">
             {/* Map Component */}
             <LocationMap 
               position={formData.locationCoords}
               onLocationChange={(coords) => setFormData({...formData, locationCoords: coords, locationInput: ''})}
             />
             
             {/* Map UI Search Overlay */}
             <div className="absolute top-3 left-12 right-3 flex flex-col gap-1 z-[1000] pointer-events-none">
               <div className="flex items-center bg-surface-container-lowest/90 backdrop-blur rounded-lg px-4 py-2 shadow-md border border-outline-variant/20 pointer-events-auto">
                 <span className="material-symbols-outlined text-on-surface-variant mr-2 text-lg">search</span>
                 <input 
                   type="text"
                   className="bg-transparent border-none outline-none w-full text-sm font-medium text-on-surface"
                   placeholder="Search region or click on map..."
                   value={formData.locationInput}
                   onChange={(e) => setFormData({...formData, locationInput: e.target.value, locationCoords: null})}
                 />
               </div>
               
               {/* Display chosen coordinates if any */}
               {formData.locationCoords && (
                 <div className="px-3 py-1 bg-primary/90 text-white text-xs font-mono rounded-md shadow self-start pointer-events-auto flex items-center gap-1">
                   <span className="material-symbols-outlined text-[12px]">my_location</span>
                   {formData.locationCoords.lat.toFixed(4)}, {formData.locationCoords.lng.toFixed(4)}
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Submit */}
        <div className="w-full flex justify-end xl:col-span-2 pt-4 border-t border-outline-variant/10">
          <button 
            type="submit"
            disabled={isSimulating}
            className={`flex items-center gap-2 px-8 py-3 rounded-full font-label font-bold text-white transition-all ${
              isSimulating ? 'bg-outline cursor-not-allowed' : 'bg-primary hover:bg-primary-container shadow-md hover:-translate-y-0.5'
            }`}
          >
            {isSimulating ? (
              <>
                <span className="material-symbols-outlined animate-spin">memory</span>
                AI Pipeline Running...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">rocket_launch</span>
                Simulate & Predict
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
