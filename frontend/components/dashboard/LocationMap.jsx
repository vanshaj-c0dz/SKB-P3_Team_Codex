"use client";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function LocationPicker({ position, onLocationChange }) {
  const map = useMapEvents({
    click(e) {
      onLocationChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      map.flyTo(e.latlng, Math.max(map.getZoom(), 8));
    },
  });
  return position ? <Marker position={[position.lat, position.lng]} icon={customIcon} /> : null;
}

export default function LocationMap({ position, onLocationChange }) {
  const [envData, setEnvData] = useState(null);
  const [envLoading, setEnvLoading] = useState(false);
  const defaultCenter = [21.03, 79.03];

  // Fetch environment metadata whenever the pin is dropped
  useEffect(() => {
    if (!position) { setEnvData(null); return; }
    const controller = new AbortController();
    setEnvLoading(true);

    fetch(`${API_BASE}/api/environment-data?lat=${position.lat.toFixed(4)}&lon=${position.lng.toFixed(4)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => { setEnvData(data); setEnvLoading(false); })
      .catch((e) => {
        if (e.name !== "AbortError") {
          // Synthetic fallback
          setEnvData({
            lat: position.lat,
            lon: position.lng,
            elevation_m: "N/A",
            climate_zone: "Unknown (API unavailable)",
            mean_temp_c: "—",
            annual_rainfall_mm: "—",
            data_source: "Demo mode",
          });
          setEnvLoading(false);
        }
      });

    return () => controller.abort();
  }, [position?.lat, position?.lng]);

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Map container */}
      <div className="relative flex-1 min-h-[220px] rounded-xl overflow-hidden z-0">
        <MapContainer
          center={position ? [position.lat, position.lng] : defaultCenter}
          zoom={position ? 9 : 4}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationPicker position={position} onLocationChange={onLocationChange} />
        </MapContainer>

        {/* Search overlay — z-index above the map tiles */}
        <div className="absolute top-3 left-12 right-3 z-[1000] flex flex-col gap-1 pointer-events-none">
          {position && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-auto px-3 py-1 bg-primary/90 text-white text-xs font-mono rounded-md shadow self-start flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[12px]">my_location</span>
              {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
            </motion.div>
          )}
        </div>

        {!position && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none z-[1000]">
            <div className="bg-surface-container-lowest/80 backdrop-blur rounded-lg px-4 py-2 text-xs text-on-surface-variant border border-outline-variant/20">
              <span className="material-symbols-outlined text-sm align-middle mr-1">touch_app</span>
              Click anywhere on the map to drop your farm pin
            </div>
          </div>
        )}
      </div>

      {/* Environment data card — slides in after pin drop */}
      <AnimatePresence>
        {position && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-container rounded-xl border border-outline-variant/15 p-3">
              {envLoading ? (
                <div className="flex items-center gap-2 text-xs text-on-surface-variant animate-pulse">
                  <span className="material-symbols-outlined text-sm">cloud_download</span>
                  Fetching NASA climate data…
                </div>
              ) : envData ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <EnvStat icon="terrain" label="Elevation" value={envData.elevation_m !== null ? `${envData.elevation_m} m` : "—"} />
                  <EnvStat icon="device_thermostat" label="Mean Temp" value={envData.mean_temp_c !== "—" ? `${envData.mean_temp_c}°C` : "—"} />
                  <EnvStat icon="water_drop" label="Annual Rainfall" value={envData.annual_rainfall_mm !== "—" ? `${envData.annual_rainfall_mm} mm` : "—"} />
                  <EnvStat icon="cloud" label="Climate Zone" value={envData.climate_zone ?? "—"} />
                  {envData.data_source && (
                    <div className="col-span-2 pt-1 text-[10px] text-on-surface-variant/60">
                      Source: {envData.data_source}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EnvStat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="material-symbols-outlined text-secondary text-sm">{icon}</span>
      <span className="text-on-surface-variant">{label}:</span>
      <span className="text-on-surface font-medium">{value}</span>
    </div>
  );
}
