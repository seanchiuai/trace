import { useEffect, useRef } from "react";

const PINK = [244, 114, 182]; // #f472b6

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

    const CELL_SIZE = 30;
    const cols = Math.ceil(w / CELL_SIZE);
    const rows = Math.ceil(h / CELL_SIZE);
    const activatedCells = new Set<string>();
    let scanX = 0;
    let frameCount = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      frameCount++;

      // Advance scan beam
      if (frameCount % 2 === 0) {
        scanX = (scanX + 1) % cols;
        if (scanX === 0) activatedCells.clear();

        // Activate cells in the scan column
        for (let row = 0; row < rows; row++) {
          if (Math.random() > 0.5) {
            activatedCells.add(`${scanX},${row}`);
          }
        }
      }

      // Draw grid cells
      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          const key = `${col},${row}`;
          const isActive = activatedCells.has(key);
          const x = col * CELL_SIZE;
          const y = row * CELL_SIZE;

          if (isActive) {
            ctx.fillStyle = `rgba(${PINK.join(",")}, ${Math.random() * 0.15 + 0.05})`;
            ctx.fillRect(x, y, CELL_SIZE - 1, CELL_SIZE - 1);
          }

          // Grid lines
          ctx.strokeStyle = `rgba(${PINK.join(",")}, 0.03)`;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }

      // Vertical scan beam
      const beamX = scanX * CELL_SIZE;
      ctx.fillStyle = `rgba(${PINK.join(",")}, 0.15)`;
      ctx.fillRect(beamX, 0, 2, h);

      // Beam glow
      const gradient = ctx.createLinearGradient(beamX - 20, 0, beamX + 20, 0);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(0.5, `rgba(${PINK.join(",")}, 0.08)`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(beamX - 20, 0, 40, h);

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
