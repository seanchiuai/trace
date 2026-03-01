import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function EvidenceCapture() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera aperture iris + scan line on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let animId: number;
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let done = false;
    const totalFrames = 60; // ~1 second

    const draw = () => {
      if (frame > totalFrames) { done = true; return; }
      ctx.clearRect(0, 0, w, h);
      frame++;

      const progress = frame / totalFrames;
      const cx = w / 2;
      const cy = h / 2;

      // ── Aperture iris — 6 blade shutter closing then opening ──
      if (progress < 0.4) {
        const irisProgress = progress / 0.4; // 0..1 during close
        const maxR = Math.max(w, h) * 0.8;
        const irisR = maxR * (1 - irisProgress * 0.85);
        const blades = 6;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        for (let i = 0; i < blades; i++) {
          const angle = (i / blades) * Math.PI * 2 - Math.PI / 2;
          const nextAngle = ((i + 1) / blades) * Math.PI * 2 - Math.PI / 2;
          const midAngle = (angle + nextAngle) / 2;

          ctx.moveTo(Math.cos(angle) * maxR * 2, Math.sin(angle) * maxR * 2);
          ctx.lineTo(Math.cos(midAngle) * irisR, Math.sin(midAngle) * irisR);
          ctx.lineTo(Math.cos(nextAngle) * maxR * 2, Math.sin(nextAngle) * maxR * 2);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 0, 0, ${irisProgress * 0.3})`;
        ctx.fill();
        ctx.restore();
      }

      // ── Scan line sweeps top to bottom during flash ──
      if (progress < 0.5) {
        const scanY = (progress / 0.5) * h;
        const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 5);
        scanGrad.addColorStop(0, "transparent");
        scanGrad.addColorStop(0.5, "rgba(250, 204, 21, 0.2)");
        scanGrad.addColorStop(1, "transparent");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, scanY - 20, w, 25);
      }

      // ── Corner evidence brackets ──
      const bracketSize = 40;
      const bracketAlpha = Math.min(progress * 3, 1) * 0.5;
      ctx.strokeStyle = `rgba(250, 204, 21, ${bracketAlpha})`;
      ctx.lineWidth = 2;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(30, 30 + bracketSize); ctx.lineTo(30, 30); ctx.lineTo(30 + bracketSize, 30);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(w - 30 - bracketSize, 30); ctx.lineTo(w - 30, 30); ctx.lineTo(w - 30, 30 + bracketSize);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(30, h - 30 - bracketSize); ctx.lineTo(30, h - 30); ctx.lineTo(30 + bracketSize, h - 30);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(w - 30 - bracketSize, h - 30); ctx.lineTo(w - 30, h - 30); ctx.lineTo(w - 30, h - 30 - bracketSize);
      ctx.stroke();

      // Evidence # counter
      if (progress > 0.3) {
        const counterAlpha = Math.min((progress - 0.3) * 5, 0.5);
        ctx.font = '9px "IBM Plex Mono", monospace';
        ctx.fillStyle = `rgba(250, 204, 21, ${counterAlpha})`;
        const evNum = `EV-${String(Math.floor(Date.now() / 1000) % 10000).padStart(4, "0")}`;
        ctx.fillText(evNum, 40, h - 40);

        const ts = new Date().toISOString().slice(11, 19);
        ctx.fillText(ts, w - 110, h - 40);
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      done = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Camera flash */}
      <motion.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0.7 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />

      {/* Canvas overlay */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Evidence stamp */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 4, rotate: -20, opacity: 0 }}
        animate={{
          scale: [4, 0.85, 1.08, 1],
          rotate: [-20, -2, -5, -4],
          opacity: [0, 1, 1, 0.8],
        }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
      >
        <div className="relative">
          <div
            className="border-[3px] border-yellow-400/70 px-10 py-5 rounded-sm"
            style={{ boxShadow: "0 0 40px rgba(250, 204, 21, 0.2)" }}
          >
            <span
              className="text-yellow-400 font-mono text-xl font-bold tracking-[0.4em] block"
              style={{ textShadow: "0 0 20px rgba(250, 204, 21, 0.4)" }}
            >
              EVIDENCE LOGGED
            </span>
          </div>
        </div>
      </motion.div>

      {/* Yellow vignette */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          boxShadow: "inset 0 0 120px rgba(250, 204, 21, 0.25)",
        }}
      />
    </div>
  );
}
