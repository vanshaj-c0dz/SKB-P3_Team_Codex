"use client";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

// Fix for default marker icon in next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function LocationPicker({ position, onLocationChange }) {
  const map = useMapEvents({
    click(e) {
      onLocationChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position ? (
    <Marker position={[position.lat, position.lng]} icon={customIcon} />
  ) : null;
}

export default function LocationMap({ position, onLocationChange }) {
  // Default fallback center if no position selected
  const defaultCenter = [21.03, 79.03]; // Jamtha, Maharashtra

  return (
    <div className="w-full h-full relative z-0 rounded-xl overflow-hidden shadow-inner">
      <MapContainer 
        center={position ? [position.lat, position.lng] : defaultCenter} 
        zoom={position ? 11 : 4} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationPicker position={position} onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}
