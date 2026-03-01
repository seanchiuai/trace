import { useEffect, useRef } from "react";

const BLUE = [78, 168, 255]; // #4ea8ff
const ACCENT = [37, 244, 192]; // #25f4c0

const PLATFORMS = [
  "instagram", "twitter/X", "facebook", "linkedin", "github",
  "reddit", "tiktok", "telegram", "discord", "snapchat",
  "pinterest", "medium", "mastodon", "youtube", "twitch",
];

const USERNAMES = [
  "shadow_user", "jdoe_1992", "anon_x42", "cyber_ghost",
  "null_ptr", "root_admin", "phantom_0x", "the_real_one",
  "not.found", "trace.me", "digital_nomad", "dark_pixel",
  "silent.watcher", "glitch_404", "neo_drifter", "data_miner",
];

interface UsernameStream {
  col: number;
  y: number;
  speed: number;
  username: string;
  platform: string;
  brightness: number;
}

export default function IdentityScan() {
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

    // Username streams — column-based like a waterfall
    const streams: UsernameStream[] = [];
    const colWidth = 180;
    const colCount = Math.ceil(w / colWidth);

    const spawnStream = () => {
      const col = Math.floor(Math.random() * colCount);
      streams.push({
        col,
        y: -20,
        speed: Math.random() * 1.5 + 0.8,
        username: USERNAMES[Math.floor(Math.random() * USERNAMES.length)],
        platform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
        brightness: Math.random() * 0.5 + 0.3,
      });
    };

    // Scan bar state
    let scanX = -50;
    let scanSpeed = 2;
    let frame = 0;

    // Fingerprint parameters
    const fpCx = w * 0.5;
    const fpCy = h * 0.5;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;

      // Spawn new username streams
      if (frame % 6 === 0) spawnStream();

      // ── Username waterfall ──
      ctx.font = '11px "IBM Plex Mono", monospace';
      for (let i = streams.length - 1; i >= 0; i--) {
        const s = streams[i];
        s.y += s.speed;
        const x = s.col * colWidth + 20;

        // @ prefix
        ctx.fillStyle = `rgba(${BLUE.join(",")}, ${s.brightness * 0.4})`;
        ctx.fillText("@", x, s.y);

        // Username
        ctx.fillStyle = `rgba(${BLUE.join(",")}, ${s.brightness * 0.7})`;
        ctx.fillText(s.username, x + 12, s.y);

        // Platform tag
        ctx.font = '9px "IBM Plex Mono", monospace';
        ctx.fillStyle = `rgba(${BLUE.join(",")}, ${s.brightness * 0.25})`;
        ctx.fillText(`[${s.platform}]`, x + 12 + ctx.measureText(s.username).width + 6, s.y);
        ctx.font = '11px "IBM Plex Mono", monospace';

        // Occasional "MATCH" highlight
        if (s.brightness > 0.7 && Math.sin(frame * 0.1 + i) > 0.8) {
          ctx.fillStyle = `rgba(${ACCENT.join(",")}, 0.5)`;
          ctx.fillText("● MATCH", x + colWidth - 80, s.y);
        }

        if (s.y > h + 20) streams.splice(i, 1);
      }

      // ── Central fingerprint ──
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.translate(fpCx, fpCy);

      // Fingerprint ridges — offset concentric arcs
      for (let ring = 0; ring < 12; ring++) {
        const r = 20 + ring * 12;
        const offset = Math.sin(ring * 0.7) * 8;
        const startAngle = ring * 0.3;
        const arcLen = Math.PI * (1.2 + ring * 0.05);

        ctx.beginPath();
        ctx.arc(offset, ring * 2 - 12, r, startAngle, startAngle + arcLen);
        ctx.strokeStyle = `rgba(${BLUE.join(",")}, ${0.4 - ring * 0.02})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Fingerprint whorl center
      ctx.beginPath();
      for (let t = 0; t < Math.PI * 6; t += 0.05) {
        const spiralR = t * 2.5;
        const x = Math.cos(t) * spiralR;
        const y = Math.sin(t) * spiralR;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${BLUE.join(",")}, 0.3)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();

      // ── Horizontal scan bar ──
      scanX += scanSpeed;
      if (scanX > w + 50) {
        scanX = -50;
        scanSpeed = Math.random() * 2 + 1.5;
      }

      const scanGrad = ctx.createLinearGradient(scanX - 30, 0, scanX + 30, 0);
      scanGrad.addColorStop(0, "transparent");
      scanGrad.addColorStop(0.5, `rgba(${ACCENT.join(",")}, 0.12)`);
      scanGrad.addColorStop(1, "transparent");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(scanX - 30, 0, 60, h);

      // Scan line
      ctx.fillStyle = `rgba(${ACCENT.join(",")}, 0.25)`;
      ctx.fillRect(scanX, 0, 1, h);

      // ── Platform icons strip (top) ──
      ctx.font = '9px "IBM Plex Mono", monospace';
      const stripY = 30;
      for (let i = 0; i < PLATFORMS.length; i++) {
        const px = ((i * 110 - frame * 0.5) % (PLATFORMS.length * 110 + w)) - 100;
        if (px < -100 || px > w + 100) continue;
        const alpha = Math.sin(frame * 0.02 + i * 0.5) * 0.1 + 0.12;
        ctx.fillStyle = `rgba(${BLUE.join(",")}, ${alpha})`;
        ctx.fillText(PLATFORMS[i].toUpperCase(), px, stripY);
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
      className="absolute inset-0 opacity-28 pointer-events-none"
    />
  );
}
