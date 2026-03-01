import { useEffect, useRef } from "react";

const CYAN = "#22d3ee";

export default function CyberSurf() {
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

    let rotation = 0;

    // Spark particles
    interface Spark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
    }
    const sparks: Spark[] = [];

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      rotation += 0.003;

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.3;

      // Draw wireframe globe — latitude lines
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 0.5;

      for (let lat = -3; lat <= 3; lat++) {
        const latAngle = (lat / 4) * Math.PI * 0.5;
        const r = radius * Math.cos(latAngle);
        const yOffset = radius * Math.sin(latAngle);

        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.ellipse(cx, cy + yOffset, r, r * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Longitude lines
      for (let lon = 0; lon < 8; lon++) {
        const angle = (lon / 8) * Math.PI + rotation;
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        for (let t = 0; t <= 1; t += 0.02) {
          const theta = t * Math.PI * 2 - Math.PI;
          const x = cx + radius * Math.sin(theta) * Math.cos(angle);
          const y = cy + radius * Math.cos(theta);
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Scan lines (horizontal)
      ctx.globalAlpha = 0.04;
      for (let y = 0; y < h; y += 4) {
        ctx.fillStyle = CYAN;
        ctx.fillRect(0, y, w, 1);
      }

      // Connection sparks
      if (Math.random() > 0.92) {
        const angle = Math.random() * Math.PI * 2;
        sparks.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius * 0.6,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          life: 40,
        });
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life--;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = (s.life / 40) * 0.6;
        ctx.fillStyle = CYAN;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing center dot
      ctx.globalAlpha = 0.3;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.4);
      gradient.addColorStop(0, "rgba(34, 211, 238, 0.2)");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

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
    <canvas
      ref={canvasRef}
      className="absolute inset-0 opacity-20 pointer-events-none"
    />
  );
}
