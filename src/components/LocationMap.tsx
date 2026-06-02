"use client";

import { useState, useEffect } from "react";
import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";

interface LocationMapProps {
  lat: number;
  lng: number;
  zoom?: number;
}

const MAPBOX_TOKEN = "pk.eyJ1IjoiZmxhc2gwMDAiLCJhIjoiY21vOWQ3d3dzMDlrdDJxc2NhcGV5YnUyZyJ9.kUHEZi3QwJKE_iZ1ztG_Ig";

export default function LocationMap({ lat, lng, zoom = 16 }: LocationMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-white/5 animate-pulse rounded-xl" />;

  // Mapbox expects coordinates in an array or object format
  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-white/10 relative">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: lng,
          latitude: lat,
          zoom: zoom,
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        attributionControl={false}
      >
        <Marker longitude={lng} latitude={lat} anchor="bottom">
          <div className="relative flex items-center justify-center">
            {/* Pulsing ring for geofencing visualization */}
            <div className="absolute w-24 h-24 bg-blue-500/20 rounded-full animate-ping pointer-events-none" />
            <div className="absolute w-32 h-32 bg-blue-500/10 rounded-full pointer-events-none" />
            {/* Map pin */}
            <MapPin className="text-red-500 w-8 h-8 filter drop-shadow-md relative z-10" />
          </div>
        </Marker>
      </Map>
      
      {/* Overlay to prevent accidental panning on mobile while scrolling the page */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      
      <div className="absolute bottom-2 left-2 z-10 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white/80 font-medium">
        Live Classroom Location
      </div>
    </div>
  );
}
