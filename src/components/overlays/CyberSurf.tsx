import { useEffect, useRef } from "react";

const CYAN = [34, 211, 238]; // #22d3ee
const ACCENT = [37, 244, 192]; // #25f4c0
const URL_FRAGMENTS = [
  "https://", "www.", ".com", ".org", ".net", "/api/v2",
  "/search?q=", "user/profile", "/data", "GET /",
  "302 →", "200 OK", "SSL ✓", "DNS ↻",
];

interface DataPacket {
  x: number; y: number;
  targetX: number; targetY: number;
  progress: number; speed: number;
  life: number;
}

interface FloatingText {
  text: string; x: number; y: number;
  vx: number; life: number; maxLife: number;
}

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

    const packets: DataPacket[] = [];
    const texts: FloatingText[] = [];
    let scroll = 0;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;
      scroll += 0.5;

      // ── Perspective grid floor (Tron-style) ──
      const horizon = h * 0.42;
      const vanishX = w * 0.5;
      const gridLines = 20;
      const gridSpacing = 60;

      // Horizontal lines receding into distance
      for (let i = 0; i < gridLines; i++) {
        const rawZ = (i * gridSpacing + scroll * 2) % (gridLines * gridSpacing);
        const z = rawZ / (gridLines * gridSpacing); // 0..1 depth
        const screenY = horizon + z * z * (h - horizon);
        const spread = 1 + z * 3;
        const alpha = (1 - z) * 0.12;

        ctx.strokeStyle = `rgba(${CYAN.join(",")}, ${alpha})`;
        ctx.lineWidth = z < 0.3 ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(vanishX - w * spread * 0.6, screenY);
        ctx.lineTo(vanishX + w * spread * 0.6, screenY);
        ctx.stroke();
      }

      // Vertical lines converging to vanishing point
      for (let i = -8; i <= 8; i++) {
        const alpha = Math.max(0.02, 0.08 - Math.abs(i) * 0.008);
        ctx.strokeStyle = `rgba(${CYAN.join(",")}, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(vanishX + i * 80, h);
        ctx.lineTo(vanishX + i * 5, horizon);
        ctx.stroke();
      }

      // Vanishing point glow
      const vg = ctx.createRadialGradient(vanishX, horizon, 0, vanishX, horizon, 120);
      vg.addColorStop(0, `rgba(${ACCENT.join(",")}, 0.08)`);
      vg.addColorStop(1, "transparent");
      ctx.fillStyle = vg;
      ctx.fillRect(vanishX - 120, horizon - 120, 240, 240);

      // ── CRT scan lines ──
      ctx.fillStyle = `rgba(${CYAN.join(",")}, 0.015)`;
      for (let y = 0; y < h; y += 3) {
        ctx.fillRect(0, y, w, 1);
      }

      // Moving scan bar
      const scanY = (frame * 1.5) % h;
      const scanGrad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
      scanGrad.addColorStop(0, "transparent");
      scanGrad.addColorStop(0.5, `rgba(${CYAN.join(",")}, 0.06)`);
      scanGrad.addColorStop(1, "transparent");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 15, w, 30);

      // ── Data packets traveling along grid ──
      if (Math.random() > 0.93) {
        const startSide = Math.random() > 0.5;
        packets.push({
          x: startSide ? Math.random() * w * 0.3 : w * 0.7 + Math.random() * w * 0.3,
          y: h * 0.7 + Math.random() * h * 0.25,
          targetX: vanishX + (Math.random() - 0.5) * 100,
          targetY: horizon + Math.random() * 30,
          progress: 0,
          speed: Math.random() * 0.008 + 0.005,
          life: 1,
        });
      }

      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.progress += p.speed;
        const t = p.progress;
        const px = p.x + (p.targetX - p.x) * t;
        const py = p.y + (p.targetY - p.y) * t * t;
        const size = 3 * (1 - t) + 1;

        // Packet trail
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ACCENT.join(",")}, ${(1 - t) * 0.7})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(px, py, size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ACCENT.join(",")}, ${(1 - t) * 0.1})`;
        ctx.fill();

        if (t >= 1) packets.splice(i, 1);
      }

      // ── Floating URL/protocol text ──
      if (frame % 30 === 0) {
        const side = Math.random() > 0.5 ? 1 : -1;
        texts.push({
          text: URL_FRAGMENTS[Math.floor(Math.random() * URL_FRAGMENTS.length)],
          x: side > 0 ? -100 : w + 100,
          y: Math.random() * h * 0.5 + h * 0.1,
          vx: side > 0 ? Math.random() * 1.5 + 0.5 : -(Math.random() * 1.5 + 0.5),
          life: 1,
          maxLife: 180,
        });
      }

      ctx.font = '10px "IBM Plex Mono", monospace';
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        t.x += t.vx;
        t.life -= 1 / t.maxLife;
        const alpha = Math.min(t.life, 0.3);
        ctx.fillStyle = `rgba(${CYAN.join(",")}, ${alpha})`;
        ctx.fillText(t.text, t.x, t.y);
        if (t.life <= 0) texts.splice(i, 1);
      }

      // ── Connection node in top area ──
      const nodeX = w * 0.5 + Math.sin(frame * 0.01) * 30;
      const nodeY = h * 0.15 + Math.cos(frame * 0.015) * 10;
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, 20, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${CYAN.join(",")}, 0.1)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CYAN.join(",")}, 0.3)`;
      ctx.fill();

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
      className="absolute inset-0 opacity-22 pointer-events-none"
    />
  );
}
