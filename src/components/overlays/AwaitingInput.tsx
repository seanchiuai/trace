import { useEffect, useRef } from "react";

const AMBER = [251, 191, 36]; // #fbbf24

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  phase: number;
  char: string;
}

const CHARS = "?¿⁇‽?";

export default function AwaitingInput() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Floating question mark particles
    const particles: Particle[] = Array.from({ length: 18 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3 - 0.15,
      size: Math.random() * 18 + 12,
      phase: Math.random() * Math.PI * 2,
      char: CHARS[Math.floor(Math.random() * CHARS.length)],
    }));

    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;

      // ── Ambient border pulse ──
      const pulseAlpha = Math.sin(frame * 0.02) * 0.03 + 0.04;
      const borderGrad = ctx.createLinearGradient(0, 0, w, 0);
      borderGrad.addColorStop(0, `rgba(${AMBER.join(",")}, ${pulseAlpha})`);
      borderGrad.addColorStop(0.5, "transparent");
      borderGrad.addColorStop(1, `rgba(${AMBER.join(",")}, ${pulseAlpha})`);
      ctx.fillStyle = borderGrad;
      ctx.fillRect(0, 0, w, h);

      // Top/bottom edge glow
      const edgeGrad = ctx.createLinearGradient(0, 0, 0, 30);
      edgeGrad.addColorStop(0, `rgba(${AMBER.join(",")}, ${pulseAlpha * 1.5})`);
      edgeGrad.addColorStop(1, "transparent");
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, 0, w, 30);

      const bottomGrad = ctx.createLinearGradient(0, h - 30, 0, h);
      bottomGrad.addColorStop(0, "transparent");
      bottomGrad.addColorStop(1, `rgba(${AMBER.join(",")}, ${pulseAlpha * 1.5})`);
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(0, h - 30, w, 30);

      // ── Central attention ring ──
      const cx = w / 2;
      const cy = h / 2;
      const ringPulse = Math.sin(frame * 0.025) * 0.5 + 0.5;

      for (let i = 0; i < 3; i++) {
        const r = 60 + i * 25 + ringPulse * 10;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${AMBER.join(",")}, ${(0.04 - i * 0.01) * (1 + ringPulse * 0.5)})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 12]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Central "?" with glow
      ctx.font = 'bold 48px "IBM Plex Mono", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const mainAlpha = Math.sin(frame * 0.03) * 0.1 + 0.15;
      ctx.fillStyle = `rgba(${AMBER.join(",")}, ${mainAlpha})`;
      ctx.fillText("?", cx, cy);

      // ── Floating particles ──
      ctx.textBaseline = "alphabetic";
      for (const p of particles) {
        p.x += p.vx + Math.sin(frame * 0.01 + p.phase) * 0.2;
        p.y += p.vy + Math.cos(frame * 0.008 + p.phase) * 0.15;

        // Wrap around
        if (p.x < -30) p.x = w + 30;
        if (p.x > w + 30) p.x = -30;
        if (p.y < -30) p.y = h + 30;
        if (p.y > h + 30) p.y = -30;

        const alpha = Math.sin(frame * 0.02 + p.phase) * 0.15 + 0.2;
        const rotation = Math.sin(frame * 0.01 + p.phase) * 0.15;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(rotation);
        ctx.font = `${p.size}px "IBM Plex Mono", monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(${AMBER.join(",")}, ${alpha})`;
        ctx.fillText(p.char, 0, 0);
        ctx.restore();
      }

      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";

      // ── "AWAITING INPUT" text pulse ──
      const textAlpha = Math.sin(frame * 0.04) * 0.08 + 0.12;
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillStyle = `rgba(${AMBER.join(",")}, ${textAlpha})`;
      ctx.textAlign = "center";
      ctx.fillText("AWAITING INPUT", cx, cy + 70);
      ctx.textAlign = "start";

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 opacity-38 pointer-events-none"
    />
  );
}
