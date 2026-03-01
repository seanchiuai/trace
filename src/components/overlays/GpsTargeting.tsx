import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const GREEN = "#22c55e";

export default function GpsTargeting() {
  const [coords, setCoords] = useState({ lat: "38.8977", lng: "-77.0365" });

  // Scroll through random coordinates
  useEffect(() => {
    const interval = setInterval(() => {
      setCoords({
        lat: (Math.random() * 180 - 90).toFixed(4),
        lng: (Math.random() * 360 - 180).toFixed(4),
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 opacity-25 pointer-events-none">
      {/* Center targeting reticle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="300" height="300" viewBox="0 0 300 300">
          {/* Crosshairs */}
          <line x1="150" y1="50" x2="150" y2="120" stroke={GREEN} strokeWidth="1" opacity="0.5" />
          <line x1="150" y1="180" x2="150" y2="250" stroke={GREEN} strokeWidth="1" opacity="0.5" />
          <line x1="50" y1="150" x2="120" y2="150" stroke={GREEN} strokeWidth="1" opacity="0.5" />
          <line x1="180" y1="150" x2="250" y2="150" stroke={GREEN} strokeWidth="1" opacity="0.5" />

          {/* Corner brackets */}
          <path d="M 90 90 L 90 110 M 90 90 L 110 90" stroke={GREEN} strokeWidth="2" fill="none" opacity="0.7" />
          <path d="M 210 90 L 210 110 M 210 90 L 190 90" stroke={GREEN} strokeWidth="2" fill="none" opacity="0.7" />
          <path d="M 90 210 L 90 190 M 90 210 L 110 210" stroke={GREEN} strokeWidth="2" fill="none" opacity="0.7" />
          <path d="M 210 210 L 210 190 M 210 210 L 190 210" stroke={GREEN} strokeWidth="2" fill="none" opacity="0.7" />

          {/* Concentric pulsing rings */}
          {[40, 70, 100].map((r, i) => (
            <motion.circle
              key={i}
              cx="150"
              cy="150"
              r={r}
              fill="none"
              stroke={GREEN}
              strokeWidth="1"
              initial={{ opacity: 0.4, scale: 1 }}
              animate={{
                opacity: [0.4, 0.1, 0.4],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                delay: i * 0.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Center dot */}
          <motion.circle
            cx="150"
            cy="150"
            r="3"
            fill={GREEN}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </svg>
      </div>

      {/* Scrolling coordinate readout */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
        <motion.div
          className="font-mono text-xs tracking-wider"
          style={{ color: GREEN, textShadow: `0 0 8px ${GREEN}40` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.3, repeat: Infinity }}
        >
          LAT {coords.lat}° &nbsp; LNG {coords.lng}°
        </motion.div>
      </div>

      {/* Radar sweep */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-[200px] h-[200px]"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${GREEN}15 30deg, transparent 60deg)`,
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
