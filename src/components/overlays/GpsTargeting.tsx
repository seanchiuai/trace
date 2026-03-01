import { useEffect, useRef } from "react";

const GREEN = [37, 244, 192]; // #25f4c0 accent
const DIM_GREEN = [34, 197, 94]; // #22c55e

export default function GpsTargeting() {
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

    // Ping ripples
    interface Ping { x: number; y: number; radius: number; maxRadius: number; life: number; }
    const pings: Ping[] = [];

    let frame = 0;
    const cx = () => w / 2;
    const cy = () => h / 2;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;

      const centerX = cx();
      const centerY = cy();
      const reticleSize = Math.min(w, h) * 0.22;

      // ── Topographic grid ──
      ctx.strokeStyle = `rgba(${DIM_GREEN.join(",")}, 0.04)`;
      ctx.lineWidth = 0.5;
      const gridSize = 50;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // ── Concentric range rings ──
      for (let i = 1; i <= 5; i++) {
        const r = reticleSize * 0.3 * i;
        const pulse = Math.sin(frame * 0.02 + i * 0.8) * 0.03;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${GREEN.join(",")}, ${0.06 + pulse})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // ── Radar sweep ──
      const sweepAngle = (frame * 0.02) % (Math.PI * 2);
      const sweepGrad = ctx.createConicGradient(sweepAngle, centerX, centerY);
      sweepGrad.addColorStop(0, `rgba(${GREEN.join(",")}, 0.12)`);
      sweepGrad.addColorStop(0.08, `rgba(${GREEN.join(",")}, 0.02)`);
      sweepGrad.addColorStop(0.15, "transparent");
      sweepGrad.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(centerX, centerY, reticleSize * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // ── Targeting crosshair ──
      const armLen = reticleSize * 0.45;
      const gap = reticleSize * 0.12;
      ctx.strokeStyle = `rgba(${GREEN.join(",")}, 0.4)`;
      ctx.lineWidth = 1.5;

      // Four arms with gap in center
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - gap); ctx.lineTo(centerX, centerY - armLen);
      ctx.moveTo(centerX, centerY + gap); ctx.lineTo(centerX, centerY + armLen);
      ctx.moveTo(centerX - gap, centerY); ctx.lineTo(centerX - armLen, centerY);
      ctx.moveTo(centerX + gap, centerY); ctx.lineTo(centerX + armLen, centerY);
      ctx.stroke();

      // Tick marks on crosshair arms
      ctx.strokeStyle = `rgba(${GREEN.join(",")}, 0.2)`;
      ctx.lineWidth = 1;
      for (let t = 1; t <= 3; t++) {
        const d = gap + (armLen - gap) * (t / 4);
        const tickLen = 4;
        // Vertical arm ticks
        ctx.beginPath();
        ctx.moveTo(centerX - tickLen, centerY - d); ctx.lineTo(centerX + tickLen, centerY - d);
        ctx.moveTo(centerX - tickLen, centerY + d); ctx.lineTo(centerX + tickLen, centerY + d);
        // Horizontal arm ticks
        ctx.moveTo(centerX - d, centerY - tickLen); ctx.lineTo(centerX - d, centerY + tickLen);
        ctx.moveTo(centerX + d, centerY - tickLen); ctx.lineTo(centerX + d, centerY + tickLen);
        ctx.stroke();
      }

      // ── Corner targeting brackets ──
      const bracketR = reticleSize * 0.5;
      const bracketLen = reticleSize * 0.15;
      ctx.strokeStyle = `rgba(${GREEN.join(",")}, 0.5)`;
      ctx.lineWidth = 2;

      const corners = [[-1,-1], [1,-1], [-1,1], [1,1]];
      for (const [dx, dy] of corners) {
        const bx = centerX + dx * bracketR;
        const by = centerY + dy * bracketR;
        ctx.beginPath();
        ctx.moveTo(bx, by + dy * -bracketLen); ctx.lineTo(bx, by); ctx.lineTo(bx + dx * -bracketLen, by);
        ctx.stroke();
      }

      // ── Center dot with pulse ──
      const dotPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${GREEN.join(",")}, ${dotPulse})`;
      ctx.fill();

      // Center glow
      const cg = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 25);
      cg.addColorStop(0, `rgba(${GREEN.join(",")}, ${dotPulse * 0.2})`);
      cg.addColorStop(1, "transparent");
      ctx.fillStyle = cg;
      ctx.fillRect(centerX - 25, centerY - 25, 50, 50);

      // ── Ping ripples ──
      if (frame % 60 === 0) {
        pings.push({
          x: centerX, y: centerY,
          radius: 5, maxRadius: reticleSize * 1.2,
          life: 1,
        });
      }

      for (let i = pings.length - 1; i >= 0; i--) {
        const p = pings[i];
        p.radius += 2;
        p.life -= 0.015;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${GREEN.join(",")}, ${p.life * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (p.life <= 0) pings.splice(i, 1);
      }

      // ── Coordinate readout ──
      const lat = (Math.sin(frame * 0.007) * 50 + 20).toFixed(4);
      const lng = (Math.cos(frame * 0.005) * 120 - 40).toFixed(4);
      const alt = (Math.sin(frame * 0.01) * 200 + 300).toFixed(0);

      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillStyle = `rgba(${GREEN.join(",")}, 0.4)`;
      ctx.fillText(`LAT  ${lat}°`, 30, h - 55);
      ctx.fillText(`LNG  ${lng}°`, 30, h - 40);
      ctx.fillText(`ALT  ${alt}m`, 30, h - 25);

      // Accuracy indicator — top right
      ctx.fillText(`ACCURACY: ±${(Math.sin(frame * 0.03) * 3 + 5).toFixed(1)}m`, w - 180, 30);
      ctx.fillText(`SAT: ${Math.floor(Math.sin(frame * 0.01) * 3 + 9)}/12`, w - 180, 45);

      // Bearing readout
      const bearing = ((frame * 0.5) % 360).toFixed(1);
      ctx.fillText(`BRG ${bearing}°`, centerX - 25, centerY + reticleSize * 0.7);

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
      className="absolute inset-0 opacity-28 pointer-events-none"
    />
  );
}
