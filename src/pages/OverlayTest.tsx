import { useState, useEffect, useCallback } from "react";
import ToolAnimationOverlay from "../components/overlays/ToolAnimationOverlay";

const TOOLS = [
  { key: "web_search", label: "Web Search", sublabel: "MatrixRain", color: "#25f4c0" },
  { key: "darkweb", label: "Dark Web", sublabel: "DarkwebGlitch", color: "#ff3b4f" },
  { key: "reasoning", label: "Reasoning", sublabel: "NeuralNetwork", color: "#a855f7" },
  { key: "browser_action", label: "Browser", sublabel: "CyberSurf", color: "#22d3ee" },
  { key: "maigret", label: "Maigret", sublabel: "IdentityScan", color: "#4ea8ff" },
  { key: "save_finding", label: "Save Finding", sublabel: "EvidenceCapture", color: "#facc15" },
  { key: "geo_locate", label: "Geo Locate", sublabel: "GpsTargeting", color: "#25f4c0" },
  { key: "whitepages", label: "WhitePages", sublabel: "PersonScan", color: "#f87171" },
  { key: "reverse_image", label: "Reverse Image", sublabel: "PixelAnalysis", color: "#f472b6" },
  { key: "ask_user", label: "Ask User", sublabel: "AwaitingInput", color: "#fbbf24" },
] as const;

const AUTOPLAY_DURATION = 5000; // ms per overlay in autoplay

export default function OverlayTest() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [stepId, setStepId] = useState("test-0");
  const [autoplay, setAutoplay] = useState(false);
  const [paused, setPaused] = useState(false);

  const activeTool = TOOLS[activeIndex].key;

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
    setStepId(`test-${Date.now()}`);
  }, []);

  const next = useCallback(() => {
    goTo((activeIndex + 1) % TOOLS.length);
  }, [activeIndex, goTo]);

  const prev = useCallback(() => {
    goTo((activeIndex - 1 + TOOLS.length) % TOOLS.length);
  }, [activeIndex, goTo]);

  // Autoplay timer
  useEffect(() => {
    if (!autoplay || paused) return;
    const timer = setInterval(next, AUTOPLAY_DURATION);
    return () => clearInterval(timer);
  }, [autoplay, paused, next]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "l") next();
      else if (e.key === "ArrowLeft" || e.key === "h") prev();
      else if (e.key === " ") { e.preventDefault(); setAutoplay(a => !a); }
      else if (e.key === "p") setPaused(p => !p);
      else if (e.key >= "1" && e.key <= "9") goTo(parseInt(e.key) - 1);
      else if (e.key === "0") goTo(9);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, goTo]);

  const tool = TOOLS[activeIndex];

  return (
    <div className="h-screen w-screen bg-bg-primary overflow-hidden relative investigation-shell">
      {/* Background layers to match Investigation page */}
      <div className="absolute inset-0 z-0 investigation-aurora" />
      <div className="absolute inset-0 z-0 investigation-grid" />
      <div className="absolute inset-0 z-0 investigation-vignette" />

      {/* The overlay under test */}
      <ToolAnimationOverlay activeTool={activeTool} stepId={stepId} />

      {/* Control panel — bottom */}
      <div className="absolute bottom-0 inset-x-0 z-30 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Tool selector pills */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-3">
            {TOOLS.map((t, i) => (
              <button
                key={t.key}
                onClick={() => goTo(i)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all"
                style={{
                  background: i === activeIndex
                    ? `${t.color}18`
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${i === activeIndex ? `${t.color}40` : "rgba(255,255,255,0.06)"}`,
                  color: i === activeIndex ? t.color : "rgba(255,255,255,0.4)",
                  boxShadow: i === activeIndex ? `0 0 12px ${t.color}15` : "none",
                }}
              >
                <span className="opacity-40 mr-1">{i + 1}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={prev}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              ← Prev
            </button>

            <button
              onClick={() => setAutoplay(a => !a)}
              className="px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all"
              style={{
                background: autoplay ? "rgba(37, 244, 192, 0.1)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${autoplay ? "rgba(37, 244, 192, 0.3)" : "rgba(255,255,255,0.08)"}`,
                color: autoplay ? "#25f4c0" : "rgba(255,255,255,0.5)",
              }}
            >
              {autoplay ? "■ Stop" : "▶ Autoplay"}
            </button>

            <button
              onClick={next}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Next →
            </button>
          </div>

          {/* Keyboard hints */}
          <div className="flex justify-center mt-2">
            <span className="text-[9px] text-text-muted font-mono tracking-wider">
              ← → navigate &nbsp;·&nbsp; SPACE autoplay &nbsp;·&nbsp; 1-0 jump
            </span>
          </div>
        </div>
      </div>

      {/* Current tool info — top */}
      <div className="absolute top-4 inset-x-0 z-30 flex justify-center">
        <div
          className="px-5 py-3 rounded-xl backdrop-blur-md"
          style={{
            background: "rgba(7, 11, 18, 0.7)",
            border: `1px solid ${tool.color}30`,
            boxShadow: `0 0 30px ${tool.color}08`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: tool.color, boxShadow: `0 0 8px ${tool.color}60` }}
            />
            <span className="text-sm font-mono font-semibold" style={{ color: tool.color }}>
              {tool.label}
            </span>
            <span className="text-[10px] text-text-muted font-mono">
              {tool.sublabel}
            </span>
            <span className="text-[10px] text-text-muted font-mono opacity-50">
              {activeIndex + 1}/{TOOLS.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
