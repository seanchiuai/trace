import { useEffect, useRef } from "react";

const RED = [255, 59, 79]; // #ff3b4f
const PURPLE = [168, 85, 247]; // #a855f7
const PHRASES = [
  "ACCESS DENIED", "BREACH DETECTED", "DARK NET", "ENCRYPTED",
  "TRACE BLOCKED", "PROXY CHAIN", "ONION ROUTE", "ZERO DAY",
  "EXPLOIT", "CLASSIFIED", "REDACTED", "CORRUPTED",
];
const SYMBOLS = "☠⚠☣⚡◉▲◆✕⬡⏣⎔⏢";

interface GlitchBlock {
  x: number; y: number; w: number; h: number;
  dx: number; life: number; maxLife: number;
  color: number[];
}

interface TextFlash {
  text: string; x: number; y: number;
  life: number; maxLife: number; size: number;
}

export default function DarkwebGlitch() {
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

    const glitchBlocks: GlitchBlock[] = [];
    const textFlashes: TextFlash[] = [];
    let frameCount = 0;
    let flashIntensity = 0;

    const draw = () => {
      frameCount++;
      ctx.clearRect(0, 0, w, h);

      // Occasional full-screen flash
      if (flashIntensity > 0) {
        ctx.fillStyle = `rgba(${RED.join(",")}, ${flashIntensity * 0.08})`;
        ctx.fillRect(0, 0, w, h);
        flashIntensity -= 0.15;
      }
      if (Math.random() > 0.995) flashIntensity = 1;

      // Spawn glitch displacement blocks
      if (Math.random() > 0.75) {
        const count = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < count; i++) {
          glitchBlocks.push({
            x: Math.random() * w,
            y: Math.random() * h,
            w: Math.random() * w * 0.5 + 40,
            h: Math.random() * 12 + 2,
            dx: (Math.random() - 0.5) * 30,
            life: 1,
            maxLife: Math.floor(Math.random() * 8) + 3,
            color: Math.random() > 0.5 ? RED : PURPLE,
          });
        }
      }

      // Render glitch blocks with chromatic aberration
      for (let i = glitchBlocks.length - 1; i >= 0; i--) {
        const b = glitchBlocks[i];
        const alpha = (b.life / b.maxLife) * 0.2;

        // Red channel offset
        ctx.fillStyle = `rgba(${RED.join(",")}, ${alpha})`;
        ctx.fillRect(b.x + b.dx + 3, b.y, b.w, b.h);

        // Blue/purple channel offset
        ctx.fillStyle = `rgba(${PURPLE.join(",")}, ${alpha * 0.7})`;
        ctx.fillRect(b.x + b.dx - 3, b.y + 1, b.w, b.h);

        // Core block
        ctx.fillStyle = `rgba(${b.color.join(",")}, ${alpha * 1.5})`;
        ctx.fillRect(b.x + b.dx, b.y, b.w, b.h);

        b.life--;
        if (b.life <= 0) glitchBlocks.splice(i, 1);
      }

      // Dual scan lines — different speeds
      const scan1 = (performance.now() * 0.08) % h;
      const scan2 = ((performance.now() * 0.13) + h * 0.4) % h;
      ctx.fillStyle = `rgba(${RED.join(",")}, 0.06)`;
      ctx.fillRect(0, scan1, w, 2);
      ctx.fillStyle = `rgba(${PURPLE.join(",")}, 0.04)`;
      ctx.fillRect(0, scan2, w, 1);

      // CRT horizontal line noise
      if (Math.random() > 0.85) {
        const noiseY = Math.random() * h;
        const noiseH = Math.random() * 3 + 1;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.04})`;
        ctx.fillRect(0, noiseY, w, noiseH);
      }

      // Spawn text flashes
      if (frameCount % 40 === 0 || (Math.random() > 0.97)) {
        textFlashes.push({
          text: Math.random() > 0.3
            ? PHRASES[Math.floor(Math.random() * PHRASES.length)]
            : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          x: Math.random() * w * 0.8 + w * 0.1,
          y: Math.random() * h * 0.8 + h * 0.1,
          life: 1,
          maxLife: Math.random() * 30 + 10,
          size: Math.random() > 0.7 ? Math.random() * 24 + 28 : Math.random() * 12 + 11,
        });
      }

      // Render text flashes with chromatic split
      ctx.textAlign = "center";
      for (let i = textFlashes.length - 1; i >= 0; i--) {
        const t = textFlashes[i];
        const progress = t.life / t.maxLife;
        // Flicker — randomly skip frames
        if (Math.random() > 0.7) {
          ctx.font = `bold ${t.size}px "IBM Plex Mono", monospace`;

          // Chromatic aberration on text
          ctx.fillStyle = `rgba(${RED.join(",")}, ${progress * 0.25})`;
          ctx.fillText(t.text, t.x + 2, t.y);
          ctx.fillStyle = `rgba(${PURPLE.join(",")}, ${progress * 0.2})`;
          ctx.fillText(t.text, t.x - 2, t.y + 1);
          ctx.fillStyle = `rgba(255, 255, 255, ${progress * 0.15})`;
          ctx.fillText(t.text, t.x, t.y);
        }

        t.life--;
        if (t.life <= 0) textFlashes.splice(i, 1);
      }
      ctx.textAlign = "start";

      // Floating symbols — rendered as canvas text (not DOM)
      const symbolTime = performance.now() * 0.001;
      for (let i = 0; i < 6; i++) {
        const sx = (Math.sin(symbolTime * (0.3 + i * 0.1) + i * 2) * 0.4 + 0.5) * w;
        const sy = (Math.cos(symbolTime * (0.2 + i * 0.15) + i * 1.5) * 0.35 + 0.5) * h;
        const symbol = SYMBOLS[i % SYMBOLS.length];
        const pulse = Math.sin(symbolTime * 2 + i) * 0.3 + 0.3;

        ctx.font = `${20 + i * 3}px monospace`;
        ctx.fillStyle = `rgba(${RED.join(",")}, ${pulse * 0.35})`;
        ctx.fillText(symbol, sx + 2, sy);
        ctx.fillStyle = `rgba(${PURPLE.join(",")}, ${pulse * 0.3})`;
        ctx.fillText(symbol, sx - 2, sy + 1);
      }

      // Vignette — sinister red/purple edges
      const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
      vg.addColorStop(0, "transparent");
      vg.addColorStop(1, `rgba(${RED.join(",")}, 0.07)`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

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
      className="absolute inset-0 opacity-55 pointer-events-none"
    />
  );
}
