import { useEffect, useRef } from "react";

const RED = [248, 113, 113]; // #f87171
const CORAL = [255, 100, 100];
const FIELDS = [
  { label: "FULL NAME", width: 14 },
  { label: "DOB", width: 10 },
  { label: "ADDRESS", width: 20 },
  { label: "PHONE", width: 12 },
  { label: "EMAIL", width: 18 },
  { label: "EMPLOYER", width: 16 },
  { label: "RELATIVES", width: 15 },
  { label: "ASSOCIATES", width: 13 },
  { label: "ALIASES", width: 11 },
  { label: "SSN", width: 9 },
];

export default function PersonScan() {
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

    let frame = 0;
    let scanPhase = 0; // which field we're scanning

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      frame++;

      const cx = w * 0.38;
      const cy = h * 0.48;

      // ── Human silhouette — proper proportions ──
      ctx.save();
      ctx.translate(cx, cy);

      // Head
      ctx.beginPath();
      ctx.ellipse(0, -90, 32, 38, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${RED.join(",")}, 0.15)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Face recognition brackets
      const faceSize = 34;
      const bracketLen = 12;
      ctx.strokeStyle = `rgba(${RED.join(",")}, 0.3)`;
      ctx.lineWidth = 1.5;
      // TL
      ctx.beginPath();
      ctx.moveTo(-faceSize, -90 - faceSize + bracketLen); ctx.lineTo(-faceSize, -90 - faceSize); ctx.lineTo(-faceSize + bracketLen, -90 - faceSize);
      ctx.stroke();
      // TR
      ctx.beginPath();
      ctx.moveTo(faceSize - bracketLen, -90 - faceSize); ctx.lineTo(faceSize, -90 - faceSize); ctx.lineTo(faceSize, -90 - faceSize + bracketLen);
      ctx.stroke();
      // BL
      ctx.beginPath();
      ctx.moveTo(-faceSize, -90 + faceSize - bracketLen); ctx.lineTo(-faceSize, -90 + faceSize); ctx.lineTo(-faceSize + bracketLen, -90 + faceSize);
      ctx.stroke();
      // BR
      ctx.beginPath();
      ctx.moveTo(faceSize - bracketLen, -90 + faceSize); ctx.lineTo(faceSize, -90 + faceSize); ctx.lineTo(faceSize, -90 + faceSize - bracketLen);
      ctx.stroke();

      // Shoulders
      ctx.beginPath();
      ctx.moveTo(-55, -45);
      ctx.quadraticCurveTo(-50, -55, 0, -55);
      ctx.quadraticCurveTo(50, -55, 55, -45);
      ctx.strokeStyle = `rgba(${RED.join(",")}, 0.12)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Torso
      ctx.beginPath();
      ctx.moveTo(-55, -45); ctx.lineTo(-45, 80);
      ctx.moveTo(55, -45); ctx.lineTo(45, 80);
      ctx.lineTo(-45, 80);
      ctx.strokeStyle = `rgba(${RED.join(",")}, 0.1)`;
      ctx.stroke();

      // ── Biometric scan line ──
      const scanY = Math.sin(frame * 0.03) * 130;
      ctx.beginPath();
      ctx.moveTo(-70, scanY); ctx.lineTo(70, scanY);
      ctx.strokeStyle = `rgba(${CORAL.join(",")}, 0.35)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Scan glow
      const scanGrad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15);
      scanGrad.addColorStop(0, "transparent");
      scanGrad.addColorStop(0.5, `rgba(${RED.join(",")}, 0.06)`);
      scanGrad.addColorStop(1, "transparent");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(-80, scanY - 15, 160, 30);

      ctx.restore();

      // ── Data fields — typewriter resolve ──
      scanPhase = Math.floor(frame / 40) % (FIELDS.length + 3);

      const fieldX = w * 0.6;
      const fieldStartY = h * 0.2;
      const fieldSpacing = 28;

      ctx.font = '10px "IBM Plex Mono", monospace';

      for (let i = 0; i < FIELDS.length; i++) {
        const f = FIELDS[i];
        const fy = fieldStartY + i * fieldSpacing;

        // Label
        ctx.fillStyle = `rgba(${RED.join(",")}, 0.25)`;
        ctx.fillText(f.label, fieldX, fy);

        // Separator
        ctx.fillStyle = `rgba(${RED.join(",")}, 0.15)`;
        ctx.fillText(":", fieldX + 80, fy);

        // Value
        if (i < scanPhase) {
          // Resolved — redacted blocks
          const blockWidth = f.width;
          ctx.fillStyle = `rgba(${RED.join(",")}, 0.2)`;
          ctx.fillRect(fieldX + 90, fy - 9, blockWidth * 6, 12);

          // Occasional character reveal flicker
          if (Math.random() > 0.95) {
            ctx.fillStyle = `rgba(${RED.join(",")}, 0.4)`;
            const chars = "█▓▒░ABCDEFX0123456789";
            let revealed = "";
            for (let c = 0; c < Math.min(blockWidth, 8); c++) {
              revealed += chars[Math.floor(Math.random() * chars.length)];
            }
            ctx.fillText(revealed, fieldX + 92, fy);
          }
        } else if (i === scanPhase) {
          // Currently scanning
          const blink = Math.sin(frame * 0.15) > 0;
          ctx.fillStyle = `rgba(${CORAL.join(",")}, ${blink ? 0.5 : 0.2})`;
          ctx.fillText("SCANNING...", fieldX + 90, fy);

          // Progress bar
          const scanProgress = (frame % 40) / 40;
          ctx.fillStyle = `rgba(${RED.join(",")}, 0.15)`;
          ctx.fillRect(fieldX + 90, fy + 3, 80, 2);
          ctx.fillStyle = `rgba(${RED.join(",")}, 0.4)`;
          ctx.fillRect(fieldX + 90, fy + 3, 80 * scanProgress, 2);
        } else {
          // Pending
          ctx.fillStyle = `rgba(${RED.join(",")}, 0.1)`;
          ctx.fillText("—", fieldX + 90, fy);
        }
      }

      // ── Match confidence meter ──
      if (scanPhase > 2) {
        const meterX = fieldX;
        const meterY = fieldStartY + FIELDS.length * fieldSpacing + 20;
        const confidence = Math.min(scanPhase * 10, 87);

        ctx.fillStyle = `rgba(${RED.join(",")}, 0.2)`;
        ctx.fillText("MATCH CONFIDENCE", meterX, meterY);

        ctx.fillStyle = `rgba(${RED.join(",")}, 0.1)`;
        ctx.fillRect(meterX, meterY + 5, 120, 4);
        ctx.fillStyle = `rgba(${RED.join(",")}, 0.4)`;
        ctx.fillRect(meterX, meterY + 5, 120 * (confidence / 100), 4);

        ctx.fillStyle = `rgba(${RED.join(",")}, 0.35)`;
        ctx.fillText(`${confidence}%`, meterX + 130, meterY + 10);
      }

      // ── Red vignette ──
      const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
      vg.addColorStop(0, "transparent");
      vg.addColorStop(1, `rgba(${RED.join(",")}, 0.04)`);
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
      className="absolute inset-0 opacity-50 pointer-events-none"
    />
  );
}
