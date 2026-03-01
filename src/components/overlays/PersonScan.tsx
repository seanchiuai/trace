import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const FIELDS = [
  "NAME", "AGE", "ADDRESS", "PHONE", "EMAIL",
  "EMPLOYER", "RELATIVES", "ASSOCIATES", "ALIASES",
];
const RED = "#f87171";

export default function PersonScan() {
  const [activeField, setActiveField] = useState(0);
  const [resolvedValues, setResolvedValues] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveField((prev) => {
        const next = (prev + 1) % FIELDS.length;
        if (next === 0) setResolvedValues([]);
        return next;
      });
      setResolvedValues((prev) => [...prev, "█".repeat(Math.floor(Math.random() * 10) + 3)]);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 opacity-25 pointer-events-none">
      {/* Silhouette */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="200" height="300" viewBox="0 0 200 300" className="opacity-20">
          {/* Head */}
          <circle cx="100" cy="70" r="40" fill="none" stroke={RED} strokeWidth="1" />
          {/* Body */}
          <path
            d="M 60 120 Q 60 110, 100 110 Q 140 110, 140 120 L 150 280 L 50 280 Z"
            fill="none"
            stroke={RED}
            strokeWidth="1"
          />
          {/* Scan line */}
          <motion.line
            x1="30"
            x2="170"
            stroke={RED}
            strokeWidth="2"
            opacity="0.6"
            animate={{ y1: [0, 300, 0], y2: [0, 300, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </div>

      {/* Data fields typewriter */}
      <div className="absolute right-[15%] top-1/2 -translate-y-1/2 space-y-2">
        {FIELDS.map((field, i) => (
          <div key={field} className="font-mono text-[10px] flex gap-2" style={{ color: RED }}>
            <span className="opacity-40 w-20 text-right">{field}:</span>
            <span className={i <= activeField ? "opacity-80" : "opacity-20"}>
              {i < activeField
                ? resolvedValues[i] || "..."
                : i === activeField
                  ? <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      SCANNING...
                    </motion.span>
                  : "—"}
            </span>
          </div>
        ))}
      </div>

      {/* Red vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(248, 113, 113, 0.06) 100%)",
        }}
      />
    </div>
  );
}
