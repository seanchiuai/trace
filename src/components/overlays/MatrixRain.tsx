import { useEffect, useRef } from "react";

const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
const ACCENT = [37, 244, 192]; // #25f4c0
const FONT_SIZE = 14;

interface Column {
  y: number;
  speed: number;
  brightness: number;
  trailLen: number;
  chars: string[];
}

export default function MatrixRain() {
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

    const colCount = Math.ceil(w / FONT_SIZE);
    const rowCount = Math.ceil(h / FONT_SIZE);

    const makeCol = (): Column => ({
      y: Math.random() * -rowCount * 2,
      speed: Math.random() * 0.6 + 0.3,
      brightness: Math.random() * 0.4 + 0.6,
      trailLen: Math.floor(Math.random() * 16) + 8,
      chars: Array.from({ length: 30 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
    });

    const columns: Column[] = Array.from({ length: colCount }, makeCol);

    // Surge columns — occasionally a column goes bright and fast
    let surgeCol = -1;
    let surgeTimer = 0;

    const draw = () => {
      // Semi-transparent clear for trail persistence
      ctx.fillStyle = `rgba(5, 7, 13, 0.08)`;
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${FONT_SIZE}px "IBM Plex Mono", monospace`;

      // Random surge trigger
      surgeTimer--;
      if (surgeTimer <= 0) {
        surgeCol = Math.floor(Math.random() * colCount);
        surgeTimer = Math.floor(Math.random() * 120) + 60;
      }

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const x = i * FONT_SIZE;
        const isSurge = i === surgeCol && surgeTimer > 50;
        const speed = isSurge ? col.speed * 3 : col.speed;
        const trailLen = col.trailLen;

        col.y += speed;
        const headRow = Math.floor(col.y);

        // Draw the trail — multiple characters per column
        for (let t = 0; t < trailLen; t++) {
          const row = headRow - t;
          if (row < 0 || row >= rowCount) continue;
          const py = row * FONT_SIZE;

          // Character cycles slowly
          const charIdx = (row + Math.floor(col.y * 0.5)) % col.chars.length;
          const char = col.chars[Math.abs(charIdx)];

          if (t === 0) {
            // Head — white-hot
            ctx.fillStyle = isSurge
              ? `rgba(255, 255, 255, 0.95)`
              : `rgba(${ACCENT[0] + 80}, 255, ${ACCENT[2] + 60}, 0.9)`;
          } else if (t === 1) {
            // Near-head — bright accent
            ctx.fillStyle = `rgba(${ACCENT.join(",")}, ${col.brightness * 0.85})`;
          } else {
            // Trail — exponential decay
            const fade = Math.pow(1 - t / trailLen, 1.8);
            ctx.fillStyle = `rgba(${ACCENT.join(",")}, ${fade * col.brightness * 0.6})`;
          }

          ctx.fillText(char, x, py);
        }

        // Reset when fully off screen
        if (headRow - trailLen > rowCount) {
          Object.assign(col, makeCol());
          col.y = -Math.random() * 10;
        }
      }

      // Subtle horizontal scan line
      const scanY = (performance.now() * 0.06) % h;
      ctx.fillStyle = `rgba(${ACCENT.join(",")}, 0.03)`;
      ctx.fillRect(0, scanY - 1, w, 2);

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
      className="absolute inset-0 opacity-50 pointer-events-none"
    />
  );
}
