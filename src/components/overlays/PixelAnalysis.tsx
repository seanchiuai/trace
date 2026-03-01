import { useEffect, useRef } from "react";

const PINK = [244, 114, 182]; // #f472b6
const MAGENTA = [236, 72, 153]; // #ec4899
const CELL_SIZE = 28;

export default function PixelAnalysis() {
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

    const cols = Math.ceil(w / CELL_SIZE);
    const rows = Math.ceil(h / CELL_SIZE);
    const totalCells = cols * rows;

    // Use typed array for cell intensity (0..1, decays over time)
    const cells = new Float32Array(totalCells);

    let scanX = 0;
    let frame = 0;

    // Color sampling spots
    interface Sample { x: number; y: number; life: number; hue: number; }
    const samples: Sample[] = [];

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;

      // Advance scan beam — every other frame
      if (frame % 2 === 0) {
        scanX = (scanX + 1) % cols;

        // Activate cells in scan column with varying intensity
        for (let row = 0; row < rows; row++) {
          const idx = row * cols + scanX;
          if (Math.random() > 0.35) {
            cells[idx] = Math.random() * 0.7 + 0.3;
          }
        }

        // Spawn color sample at scan position
        if (Math.random() > 0.85) {
          samples.push({
            x: scanX * CELL_SIZE + CELL_SIZE / 2,
            y: Math.floor(Math.random() * rows) * CELL_SIZE + CELL_SIZE / 2,
            life: 1,
            hue: Math.random() * 60 + 300, // pink-magenta range
          });
        }
      }

      // Decay all cells
      for (let i = 0; i < totalCells; i++) {
        if (cells[i] > 0) cells[i] *= 0.985;
        if (cells[i] < 0.01) cells[i] = 0;
      }

      // ── Draw grid cells ──
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          const intensity = cells[idx];
          const x = col * CELL_SIZE;
          const y = row * CELL_SIZE;

          if (intensity > 0) {
            // Cell fill — brighter cells get a different shade
            const color = intensity > 0.5 ? MAGENTA : PINK;
            ctx.fillStyle = `rgba(${color.join(",")}, ${intensity * 0.18})`;
            ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

            // Inner highlight for high-intensity cells
            if (intensity > 0.6) {
              ctx.fillStyle = `rgba(255, 255, 255, ${(intensity - 0.6) * 0.1})`;
              ctx.fillRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);
            }
          }

          // Subtle grid lines
          ctx.strokeStyle = `rgba(${PINK.join(",")}, 0.025)`;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }

      // ── Vertical scan beam with glow ──
      const beamX = scanX * CELL_SIZE;

      // Wide glow
      const wideGrad = ctx.createLinearGradient(beamX - 40, 0, beamX + 40, 0);
      wideGrad.addColorStop(0, "transparent");
      wideGrad.addColorStop(0.5, `rgba(${PINK.join(",")}, 0.06)`);
      wideGrad.addColorStop(1, "transparent");
      ctx.fillStyle = wideGrad;
      ctx.fillRect(beamX - 40, 0, 80, h);

      // Core beam line
      ctx.fillStyle = `rgba(${MAGENTA.join(",")}, 0.3)`;
      ctx.fillRect(beamX, 0, 2, h);

      // Beam head glow
      const headGrad = ctx.createLinearGradient(beamX - 15, 0, beamX + 15, 0);
      headGrad.addColorStop(0, "transparent");
      headGrad.addColorStop(0.5, `rgba(${PINK.join(",")}, 0.15)`);
      headGrad.addColorStop(1, "transparent");
      ctx.fillStyle = headGrad;
      ctx.fillRect(beamX - 15, 0, 30, h);

      // ── Color sampling circles ──
      for (let i = samples.length - 1; i >= 0; i--) {
        const s = samples[i];
        s.life -= 0.012;

        if (s.life > 0) {
          const alpha = s.life * 0.5;

          // Outer ring
          ctx.beginPath();
          ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${PINK.join(",")}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Inner crosshair
          ctx.strokeStyle = `rgba(${PINK.join(",")}, ${alpha * 0.6})`;
          ctx.beginPath();
          ctx.moveTo(s.x - 6, s.y); ctx.lineTo(s.x + 6, s.y);
          ctx.moveTo(s.x, s.y - 6); ctx.lineTo(s.x, s.y + 6);
          ctx.stroke();

          // Color value text
          ctx.font = '8px "IBM Plex Mono", monospace';
          ctx.fillStyle = `rgba(${PINK.join(",")}, ${alpha * 0.4})`;
          const hex = `#${Math.floor(s.hue).toString(16).padStart(2, "0")}${Math.floor(Math.random() * 256).toString(16).padStart(2, "0")}${Math.floor(Math.random() * 256).toString(16).padStart(2, "0")}`;
          ctx.fillText(hex, s.x + 16, s.y + 3);
        } else {
          samples.splice(i, 1);
        }
      }

      // ── Analysis readout ──
      ctx.font = '9px "IBM Plex Mono", monospace';
      ctx.fillStyle = `rgba(${PINK.join(",")}, 0.25)`;
      const pxAnalyzed = Math.floor((scanX / cols) * 100);
      ctx.fillText(`PIXEL ANALYSIS: ${pxAnalyzed}%`, 20, 25);
      ctx.fillText(`RESOLUTION: ${w}×${h}`, 20, 38);
      ctx.fillText(`FEATURES: ${Math.floor(frame * 0.3) % 47 + 12}`, 20, 51);

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
      className="absolute inset-0 opacity-42 pointer-events-none"
    />
  );
}
