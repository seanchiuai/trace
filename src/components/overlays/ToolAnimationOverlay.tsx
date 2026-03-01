import React, { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MatrixRain = React.lazy(() => import("./MatrixRain"));
const DarkwebGlitch = React.lazy(() => import("./DarkwebGlitch"));
const NeuralNetwork = React.lazy(() => import("./NeuralNetwork"));
const CyberSurf = React.lazy(() => import("./CyberSurf"));
const IdentityScan = React.lazy(() => import("./IdentityScan"));
const EvidenceCapture = React.lazy(() => import("./EvidenceCapture"));
const GpsTargeting = React.lazy(() => import("./GpsTargeting"));
const PersonScan = React.lazy(() => import("./PersonScan"));
const PixelAnalysis = React.lazy(() => import("./PixelAnalysis"));
const AwaitingInput = React.lazy(() => import("./AwaitingInput"));

const TOOL_OVERLAY_MAP: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  web_search: MatrixRain,
  darkweb: DarkwebGlitch,
  reasoning: NeuralNetwork,
  browser_action: CyberSurf,
  maigret: IdentityScan,
  save_finding: EvidenceCapture,
  geo_locate: GpsTargeting,
  whitepages: PersonScan,
  reverse_image: PixelAnalysis,
  ask_user: AwaitingInput,
};

interface Props {
  activeTool: string | null;
  stepId: string | null;
}

export default function ToolAnimationOverlay({ activeTool, stepId }: Props) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const OverlayComponent = activeTool ? TOOL_OVERLAY_MAP[activeTool] : null;

  if (reducedMotion) return null;

  return (
    <div className="absolute inset-0 z-5 pointer-events-none">
      <AnimatePresence mode="wait">
        {OverlayComponent && stepId && (
          <motion.div
            key={stepId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <Suspense fallback={null}>
              <OverlayComponent />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
