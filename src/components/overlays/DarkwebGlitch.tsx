import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SYMBOLS = ["☠", "⚠", "☣", "⚡", "◉", "▲", "◆", "✕"];
const GLITCH_COLORS = ["#ff3b4f", "#a855f7", "#ff0040"];

interface FloatingSymbol {
  id: number;
  char: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export default function DarkwebGlitch() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);

  // Spawn floating symbols
  useEffect(() => {
    let id = 0;
    const spawn = () => {
      setSymbols((prev) => {
        const fresh = prev.filter((s) => Date.now() - s.delay < s.duration * 1000 + 3000);
        if (fresh.length < 8) {
          fresh.push({
            id: id++,
            char: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
            x: Math.random() * 90 + 5,
            y: Math.random() * 80 + 10,
            size: Math.random() * 24 + 16,
            duration: Math.random() * 3 + 2,
            delay: Date.now(),
          });
        }
        return fresh;
      });
    };
    const interval = setInterval(spawn, 800);
    spawn();
    return () => clearInterval(interval);
  }, []);

  // Canvas glitch rectangles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Random glitch rectangles
      if (Math.random() > 0.7) {
        const count = Math.floor(Math.random() * 4) + 1;
        for (let i = 0; i < count; i++) {
          const color = GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)];
          ctx.fillStyle = color;
          ctx.globalAlpha = Math.random() * 0.15 + 0.05;
          const w = Math.random() * window.innerWidth * 0.4 + 20;
          const h = Math.random() * 8 + 2;
          const x = Math.random() * window.innerWidth;
          const y = Math.random() * window.innerHeight;
          ctx.fillRect(x, y, w, h);
        }
      }

      // Horizontal scan line
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#ff3b4f";
      const scanY = (Date.now() * 0.1) % window.innerHeight;
      ctx.fillRect(0, scanY, window.innerWidth, 2);

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 opacity-30 pointer-events-none screen-shake">
      {/* Canvas glitch layer */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Chromatic aberration border */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow:
            "inset 3px 0 20px rgba(255, 59, 79, 0.15), inset -3px 0 20px rgba(168, 85, 247, 0.15)",
        }}
      />

      {/* Floating sinister symbols */}
      <AnimatePresence>
        {symbols.map((s) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.6, 0.3, 0.7, 0], scale: [0.5, 1.2, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: s.duration, ease: "easeInOut" }}
            className="absolute font-mono"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              fontSize: s.size,
              color: GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)],
              textShadow: `0 0 10px rgba(255, 59, 79, 0.5)`,
            }}
          >
            {s.char}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Vignette — sinister red */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(255, 59, 79, 0.08) 100%)",
        }}
      />
    </div>
  );
}
