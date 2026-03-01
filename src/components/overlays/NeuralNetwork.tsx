import { useEffect, useRef } from "react";

const PURPLE = [168, 85, 247]; // #a855f7
const BLUE = [78, 168, 255]; // #4ea8ff (updated info color)
const ACCENT = [37, 244, 192]; // #25f4c0
const PARTICLE_COUNT = 80;
const CONNECTION_DIST = 140;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  phase: number;
  cluster: number;
}

interface Signal {
  fromIdx: number; toIdx: number;
  progress: number; speed: number;
  chain: number[];
  chainPos: number;
}

interface Ripple {
  x: number; y: number;
  radius: number; maxRadius: number;
  life: number;
}

export default function NeuralNetwork() {
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

    // Create particles in loose clusters
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const cluster = Math.floor(i / 16);
      const cx = (cluster % 3 + 0.5) * (w / 3) + (Math.random() - 0.5) * w * 0.25;
      const cy = (Math.floor(cluster / 3) + 0.5) * (h / 2) + (Math.random() - 0.5) * h * 0.3;
      return {
        x: cx, y: cy,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.5 + 1,
        phase: Math.random() * Math.PI * 2,
        cluster,
      };
    });

    const signals: Signal[] = [];
    const ripples: Ripple[] = [];
    let frame = 0;

    // Find connected neighbors for chain traversal
    const getNeighbors = (idx: number): number[] => {
      const p = particles[idx];
      const neighbors: number[] = [];
      for (let j = 0; j < particles.length; j++) {
        if (j === idx) continue;
        const dx = p.x - particles[j].x;
        const dy = p.y - particles[j].y;
        if (dx * dx + dy * dy < CONNECTION_DIST * CONNECTION_DIST) {
          neighbors.push(j);
        }
      }
      return neighbors;
    };

    // Build a signal chain that travels through connected nodes
    const fireSignal = () => {
      const start = Math.floor(Math.random() * PARTICLE_COUNT);
      const chain = [start];
      const visited = new Set([start]);
      let current = start;

      for (let step = 0; step < 6; step++) {
        const neighbors = getNeighbors(current).filter(n => !visited.has(n));
        if (neighbors.length === 0) break;
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        chain.push(next);
        visited.add(next);
        current = next;
      }

      if (chain.length >= 2) {
        signals.push({
          fromIdx: chain[0], toIdx: chain[1],
          progress: 0, speed: 0.04,
          chain, chainPos: 0,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;

      // Fire signals periodically
      if (frame % 50 === 0) fireSignal();

      // Update particles — gentle drift
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // Soft bounce
        if (p.x < 20) p.vx = Math.abs(p.vx);
        if (p.x > w - 20) p.vx = -Math.abs(p.vx);
        if (p.y < 20) p.vy = Math.abs(p.vy);
        if (p.y > h - 20) p.vy = -Math.abs(p.vy);
      }

      // Active signal edges — track which connections are "lit"
      const activeEdges = new Set<string>();
      for (const sig of signals) {
        const key = sig.fromIdx < sig.toIdx
          ? `${sig.fromIdx}-${sig.toIdx}` : `${sig.toIdx}-${sig.fromIdx}`;
        activeEdges.add(key);
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq > CONNECTION_DIST * CONNECTION_DIST) continue;
          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / CONNECTION_DIST);

          const edgeKey = `${i}-${j}`;
          const isActive = activeEdges.has(edgeKey);

          if (isActive) {
            // Firing connection — bright accent pulse
            ctx.strokeStyle = `rgba(${ACCENT.join(",")}, ${alpha * 0.7 + 0.2})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = `rgba(${ACCENT.join(",")}, 0.6)`;
            ctx.shadowBlur = 8;
          } else {
            ctx.strokeStyle = `rgba(${BLUE.join(",")}, ${alpha * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.shadowBlur = 0;
          }

          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      // Update and draw signals as traveling dots
      for (let i = signals.length - 1; i >= 0; i--) {
        const sig = signals[i];
        sig.progress += sig.speed;

        const from = particles[sig.fromIdx];
        const to = particles[sig.toIdx];
        const sx = from.x + (to.x - from.x) * sig.progress;
        const sy = from.y + (to.y - from.y) * sig.progress;

        // Signal dot with glow
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ACCENT.join(",")}, 0.9)`;
        ctx.fill();

        // Glow ring
        ctx.beginPath();
        ctx.arc(sx, sy, 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ACCENT.join(",")}, 0.15)`;
        ctx.fill();

        if (sig.progress >= 1) {
          // Spawn ripple at arrival
          ripples.push({
            x: to.x, y: to.y,
            radius: 0, maxRadius: 40,
            life: 1,
          });

          // Advance along chain
          sig.chainPos++;
          if (sig.chainPos < sig.chain.length - 1) {
            sig.fromIdx = sig.chain[sig.chainPos];
            sig.toIdx = sig.chain[sig.chainPos + 1];
            sig.progress = 0;
          } else {
            signals.splice(i, 1);
          }
        }
      }

      // Draw ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 1.5;
        r.life -= 0.03;

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${PURPLE.join(",")}, ${r.life * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        if (r.life <= 0) ripples.splice(i, 1);
      }

      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pulse = Math.sin(frame * 0.03 + p.phase) * 0.3 + 0.7;

        // Is this particle part of an active signal?
        const isActive = signals.some(s => s.fromIdx === i || s.toIdx === i);
        const color = isActive ? ACCENT : BLUE;
        const r = isActive ? p.radius * 2.5 : p.radius;

        // Outer glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.join(",")}, ${pulse * 0.06})`;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.join(",")}, ${pulse * 0.7})`;
        ctx.fill();
      }

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
      className="absolute inset-0 opacity-45 pointer-events-none"
    />
  );
}
