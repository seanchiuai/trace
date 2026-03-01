import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulsePhase: number;
}

const PARTICLE_COUNT = 60;
const CONNECTION_DIST = 150;
const PURPLE = [168, 85, 247]; // #a855f7
const BLUE = [59, 130, 246]; // #3b82f6

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

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: Math.random() * 2 + 1,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    // Synaptic fire state
    let fireTime = 0;
    let fireFrom = 0;
    let fireTo = 0;

    const triggerFire = () => {
      fireFrom = Math.floor(Math.random() * PARTICLE_COUNT);
      fireTo = Math.floor(Math.random() * PARTICLE_COUNT);
      fireTime = 30; // frames
    };

    let frameCount = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      frameCount++;

      // Trigger synaptic fires periodically
      if (frameCount % 90 === 0) triggerFire();

      // Update particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        p.x = Math.max(0, Math.min(w, p.x));
        p.y = Math.max(0, Math.min(h, p.y));
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.3;
            const isFiring =
              fireTime > 0 &&
              ((i === fireFrom && j === fireTo) ||
                (j === fireFrom && i === fireTo));

            if (isFiring) {
              ctx.strokeStyle = `rgba(${PURPLE.join(",")}, ${alpha + 0.4})`;
              ctx.lineWidth = 2;
            } else {
              ctx.strokeStyle = `rgba(${BLUE.join(",")}, ${alpha})`;
              ctx.lineWidth = 0.5;
            }
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const pulse = Math.sin(frameCount * 0.05 + p.pulsePhase) * 0.3 + 0.7;
        const isFiringNode = fireTime > 0 && (i === fireFrom || i === fireTo);
        const color = isFiringNode ? PURPLE : BLUE;
        const radius = isFiringNode ? p.radius * 2 : p.radius;

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.join(",")}, ${pulse * 0.1})`;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.join(",")}, ${pulse * 0.8})`;
        ctx.fill();
      }

      if (fireTime > 0) fireTime--;

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
