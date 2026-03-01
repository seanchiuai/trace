import { useEffect, useRef } from "react";

const RED = [255, 59, 79]; // #ff3b4f
const PURPLE = [168, 85, 247]; // #a855f7
const BLOOD = [180, 0, 20];
const PHRASES = [
  "ACCESS DENIED", "BREACH DETECTED", "DARK NET", "ENCRYPTED",
  "TRACE BLOCKED", "PROXY CHAIN", "ONION ROUTE", "ZERO DAY",
  "EXPLOIT", "CLASSIFIED", "REDACTED", "CORRUPTED", "WARNING",
  "UNAUTHORIZED", "INTERCEPTED", "COMPROMISED",
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
  isLarge: boolean;
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
    let strobeTimer = 0;

    // Initial flash on mount — announce the darkweb
    flashIntensity = 1.5;

    const draw = () => {
      frameCount++;

      // ── Base layer: persistent dark red wash (never fully clears) ──
      ctx.fillStyle = `rgba(5, 2, 3, 0.3)`;
      ctx.fillRect(0, 0, w, h);

      // Constant sinister red ambient glow
      ctx.fillStyle = `rgba(${RED.join(",")}, 0.04)`;
      ctx.fillRect(0, 0, w, h);

      // ── Full-screen flash strobe ──
      if (flashIntensity > 0) {
        // Hard red flash that's actually visible
        ctx.fillStyle = `rgba(${RED.join(",")}, ${Math.min(flashIntensity * 0.35, 0.5)})`;
        ctx.fillRect(0, 0, w, h);

        // White core flash for maximum impact
        if (flashIntensity > 0.8) {
          ctx.fillStyle = `rgba(255, 200, 200, ${(flashIntensity - 0.8) * 0.4})`;
          ctx.fillRect(0, 0, w, h);
        }

        flashIntensity -= 0.06;
      }

      // Trigger flashes frequently — this is supposed to be alarming
      strobeTimer--;
      if (strobeTimer <= 0) {
        flashIntensity = Math.random() * 0.8 + 0.6;
        strobeTimer = Math.floor(Math.random() * 80) + 30;
      }

      // ── Heavy glitch displacement blocks ──
      if (Math.random() > 0.5) {
        const count = Math.floor(Math.random() * 5) + 2;
        for (let i = 0; i < count; i++) {
          glitchBlocks.push({
            x: Math.random() * w,
            y: Math.random() * h,
            w: Math.random() * w * 0.6 + 60,
            h: Math.random() * 20 + 3,
            dx: (Math.random() - 0.5) * 50,
            life: 1,
            maxLife: Math.floor(Math.random() * 6) + 2,
            color: Math.random() > 0.4 ? RED : PURPLE,
          });
        }
      }

      // Render glitch blocks — bright and aggressive
      for (let i = glitchBlocks.length - 1; i >= 0; i--) {
        const b = glitchBlocks[i];
        const alpha = (b.life / b.maxLife) * 0.5;

        // Red channel offset — wide
        ctx.fillStyle = `rgba(${RED.join(",")}, ${alpha * 0.8})`;
        ctx.fillRect(b.x + b.dx + 5, b.y, b.w, b.h);

        // Purple channel offset
        ctx.fillStyle = `rgba(${PURPLE.join(",")}, ${alpha * 0.6})`;
        ctx.fillRect(b.x + b.dx - 5, b.y + 2, b.w, b.h);

        // Core block — bright
        ctx.fillStyle = `rgba(${b.color.join(",")}, ${alpha})`;
        ctx.fillRect(b.x + b.dx, b.y, b.w, b.h);

        b.life--;
        if (b.life <= 0) glitchBlocks.splice(i, 1);
      }

      // ── Scan lines — thick and visible ──
      const scan1 = (performance.now() * 0.1) % h;
      const scan2 = ((performance.now() * 0.17) + h * 0.3) % h;
      const scan3 = ((performance.now() * 0.05) + h * 0.7) % h;

      ctx.fillStyle = `rgba(${RED.join(",")}, 0.15)`;
      ctx.fillRect(0, scan1, w, 3);
      ctx.fillStyle = `rgba(${PURPLE.join(",")}, 0.1)`;
      ctx.fillRect(0, scan2, w, 2);
      ctx.fillStyle = `rgba(${BLOOD.join(",")}, 0.08)`;
      ctx.fillRect(0, scan3, w, 4);

      // ── CRT noise — heavier ──
      if (Math.random() > 0.6) {
        const noiseCount = Math.floor(Math.random() * 4) + 1;
        for (let n = 0; n < noiseCount; n++) {
          const noiseY = Math.random() * h;
          const noiseH = Math.random() * 4 + 1;
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.08 + 0.02})`;
          ctx.fillRect(0, noiseY, w, noiseH);
        }
      }

      // ── Text flashes — more frequent, bigger ──
      if (frameCount % 20 === 0 || Math.random() > 0.92) {
        const isLarge = Math.random() > 0.6;
        textFlashes.push({
          text: Math.random() > 0.2
            ? PHRASES[Math.floor(Math.random() * PHRASES.length)]
            : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          x: Math.random() * w * 0.7 + w * 0.15,
          y: Math.random() * h * 0.7 + h * 0.15,
          life: 1,
          maxLife: Math.random() * 20 + 8,
          size: isLarge ? Math.random() * 30 + 36 : Math.random() * 14 + 12,
          isLarge,
        });
      }

      // Render text flashes — bright chromatic split
      ctx.textAlign = "center";
      for (let i = textFlashes.length - 1; i >= 0; i--) {
        const t = textFlashes[i];
        const progress = t.life / t.maxLife;
        const flicker = Math.random() > 0.3; // less skipping = more visible

        if (flicker) {
          ctx.font = `bold ${t.size}px "IBM Plex Mono", monospace`;
          const splitDist = t.isLarge ? 4 : 2;

          // Red ghost
          ctx.fillStyle = `rgba(${RED.join(",")}, ${progress * 0.6})`;
          ctx.fillText(t.text, t.x + splitDist, t.y);

          // Purple ghost
          ctx.fillStyle = `rgba(${PURPLE.join(",")}, ${progress * 0.5})`;
          ctx.fillText(t.text, t.x - splitDist, t.y + 2);

          // White core — readable
          ctx.fillStyle = `rgba(255, 240, 240, ${progress * 0.4})`;
          ctx.fillText(t.text, t.x, t.y);

          // Glow behind large text
          if (t.isLarge) {
            ctx.shadowColor = `rgba(${RED.join(",")}, 0.5)`;
            ctx.shadowBlur = 20;
            ctx.fillStyle = `rgba(${RED.join(",")}, ${progress * 0.15})`;
            ctx.fillText(t.text, t.x, t.y);
            ctx.shadowBlur = 0;
          }
        }

        t.life--;
        if (t.life <= 0) textFlashes.splice(i, 1);
      }
      ctx.textAlign = "start";

      // ── Floating sinister symbols — larger, brighter ──
      const symbolTime = performance.now() * 0.001;
      for (let i = 0; i < 8; i++) {
        const sx = (Math.sin(symbolTime * (0.3 + i * 0.08) + i * 2.2) * 0.4 + 0.5) * w;
        const sy = (Math.cos(symbolTime * (0.2 + i * 0.12) + i * 1.7) * 0.35 + 0.5) * h;
        const symbol = SYMBOLS[i % SYMBOLS.length];
        const pulse = Math.sin(symbolTime * 3 + i) * 0.4 + 0.5;
        const fontSize = 24 + i * 4;

        ctx.font = `${fontSize}px monospace`;

        // Red offset
        ctx.fillStyle = `rgba(${RED.join(",")}, ${pulse * 0.5})`;
        ctx.fillText(symbol, sx + 3, sy);

        // Purple offset
        ctx.fillStyle = `rgba(${PURPLE.join(",")}, ${pulse * 0.4})`;
        ctx.fillText(symbol, sx - 3, sy + 2);

        // Core glow
        ctx.shadowColor = `rgba(${RED.join(",")}, ${pulse * 0.6})`;
        ctx.shadowBlur = 15;
        ctx.fillStyle = `rgba(${RED.join(",")}, ${pulse * 0.6})`;
        ctx.fillText(symbol, sx, sy);
        ctx.shadowBlur = 0;
      }

      // ── Heavy vignette — sinister red/purple creep from edges ──
      const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.65);
      vg.addColorStop(0, "transparent");
      vg.addColorStop(0.6, `rgba(${BLOOD.join(",")}, 0.06)`);
      vg.addColorStop(1, `rgba(${RED.join(",")}, 0.18)`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      // Top/bottom edge bleed
      const edgeH = h * 0.15;
      const topGrad = ctx.createLinearGradient(0, 0, 0, edgeH);
      topGrad.addColorStop(0, `rgba(${RED.join(",")}, 0.12)`);
      topGrad.addColorStop(1, "transparent");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, w, edgeH);

      const botGrad = ctx.createLinearGradient(0, h - edgeH, 0, h);
      botGrad.addColorStop(0, "transparent");
      botGrad.addColorStop(1, `rgba(${PURPLE.join(",")}, 0.1)`);
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, h - edgeH, w, edgeH);

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
      className="absolute inset-0 opacity-80 pointer-events-none"
    />
  );
}
