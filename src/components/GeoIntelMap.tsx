import { Fragment, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Leaflet CSS must be imported for proper rendering
import "leaflet/dist/leaflet.css";

interface Finding {
  _id: string;
  source: string;
  category: string;
  platform?: string;
  data: string;
  confidence: number;
  latitude?: number;
  longitude?: number;
}

interface Props {
  findings: Finding[];
}

// Custom green marker icon matching noir theme
const createMarkerIcon = (confidence: number) => {
  const color = confidence >= 80 ? "#00ff88" : confidence >= 60 ? "#eab308" : "#f97316";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 12px; height: 12px;
      background: ${color};
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      box-shadow: 0 0 8px ${color}88, 0 0 16px ${color}44;
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

// Extract coordinates from finding data text via regex
function extractCoordsFromData(data: string): [number, number] | null {
  // Match patterns like (40.7128, -74.0060) or lat: 40.7128, lng: -74.0060
  const parenMatch = data.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/);
  if (parenMatch) {
    const lat = parseFloat(parenMatch[1]);
    const lng = parseFloat(parenMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [lat, lng];
    }
  }
  return null;
}

// Auto-fit bounds to markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (positions.length > 0 && positions.length !== prevLengthRef.current) {
      prevLengthRef.current = positions.length;
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [positions, map]);

  return null;
}

export default function GeoIntelMap({ findings }: Props) {
  // Gather all findings with coordinates
  const markers = useMemo(() => {
    const result: {
      id: string;
      lat: number;
      lng: number;
      data: string;
      source: string;
      confidence: number;
    }[] = [];

    for (const f of findings) {
      if (f.latitude != null && f.longitude != null) {
        result.push({
          id: f._id,
          lat: f.latitude,
          lng: f.longitude,
          data: f.data,
          source: f.source,
          confidence: f.confidence,
        });
      } else if (f.category === "location") {
        // Fallback: try extracting coords from text
        const coords = extractCoordsFromData(f.data);
        if (coords) {
          result.push({
            id: f._id,
            lat: coords[0],
            lng: coords[1],
            data: f.data,
            source: f.source,
            confidence: f.confidence,
          });
        }
      }
    }

    return result;
  }, [findings]);

  if (markers.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 opacity-40">
          <svg className="w-12 h-12 text-accent/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.893 13.393l-1.135-1.135a2.252 2.252 0 01-.421-.585l-1.08-2.16a.414.414 0 00-.663-.107.827.827 0 01-.812.21l-1.273-.363a.89.89 0 00-.738 1.595l.587.39c.59.395.674 1.23.172 1.732l-.2.2c-.212.212-.33.498-.33.796v.41c0 .409-.11.809-.32 1.158l-1.315 2.191a2.11 2.11 0 01-1.81 1.025 1.055 1.055 0 01-1.055-1.055v-1.172c0-.92-.56-1.747-1.414-2.089l-.655-.261a2.25 2.25 0 01-1.383-2.46l.007-.042a2.25 2.25 0 01.29-.787l.09-.15a2.25 2.25 0 012.37-1.048l1.178.236a1.125 1.125 0 001.302-.795l.208-.73a1.125 1.125 0 00-.578-1.315l-.665-.332-.091.091a2.25 2.25 0 01-1.591.659h-.18c-.249 0-.487.1-.662.274a.931.931 0 01-1.458-1.137l1.411-2.353a2.25 2.25 0 00.286-.76m11.928 9.869A9 9 0 008.965 3.525m11.928 9.868A9 9 0 118.965 3.525" />
          </svg>
          <span className="text-[10px] text-text-muted tracking-[0.3em] uppercase font-mono">
            No locations found
          </span>
        </div>
      </div>
    );
  }

  const positions = markers.map((m) => [m.lat, m.lng] as [number, number]);
  const center = positions[0];

  return (
    <div className="h-full w-full relative">
      {/* Dark theme overrides for leaflet */}
      <style>{`
        .leaflet-container { background: #0a0a0f !important; }
        .leaflet-popup-content-wrapper {
          background: rgba(15, 15, 25, 0.9) !important;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(0, 255, 136, 0.15) !important;
          border-radius: 12px !important;
          color: #e0e0e0 !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        }
        .leaflet-popup-tip { background: rgba(15, 15, 25, 0.9) !important; }
        .leaflet-popup-close-button { color: #666 !important; }
        .leaflet-popup-close-button:hover { color: #00ff88 !important; }
        .leaflet-control-zoom a {
          background: rgba(15, 15, 25, 0.8) !important;
          color: #888 !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover { color: #00ff88 !important; }
        .leaflet-control-attribution {
          background: rgba(10, 10, 15, 0.6) !important;
          color: rgba(255,255,255,0.2) !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: rgba(255,255,255,0.3) !important; }
      `}</style>

      <MapContainer
        center={center}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds positions={positions} />

        {markers.map((marker) => {
          // Confidence radius ring — lower confidence = larger radius
          const radiusMeters = Math.max(500, (100 - marker.confidence) * 100);
          const ringColor =
            marker.confidence >= 80
              ? "#00ff88"
              : marker.confidence >= 60
                ? "#eab308"
                : "#f97316";

          return (
            <Fragment key={marker.id}>
              <Circle
                center={[marker.lat, marker.lng]}
                radius={radiusMeters}
                pathOptions={{
                  color: ringColor,
                  fillColor: ringColor,
                  fillOpacity: 0.08,
                  weight: 1,
                  opacity: 0.3,
                }}
              />
              <Marker
                position={[marker.lat, marker.lng]}
                icon={createMarkerIcon(marker.confidence)}
              >
                <Popup>
                  <div className="font-mono text-xs space-y-1.5 max-w-[240px]">
                    <p className="text-white/90 leading-relaxed">
                      {marker.data.slice(0, 150)}
                    </p>
                    <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                      <span className="text-[9px] text-white/40 uppercase tracking-wider">
                        {marker.source}
                      </span>
                      <span className="text-[9px] font-bold" style={{ color: ringColor }}>
                        {marker.confidence}%
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
