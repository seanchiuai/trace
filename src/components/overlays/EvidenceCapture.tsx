import { motion } from "framer-motion";

export default function EvidenceCapture() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Camera flash */}
      <motion.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      {/* Evidence stamp */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 3, rotate: -15, opacity: 0 }}
        animate={{
          scale: [3, 0.9, 1.05, 1],
          rotate: [-15, -3, -5, -4],
          opacity: [0, 0.9, 0.9, 0.7],
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div
          className="border-4 border-yellow-400 px-8 py-4 rounded-sm"
          style={{
            textShadow: "0 0 20px rgba(250, 204, 21, 0.5)",
          }}
        >
          <span className="text-yellow-400 font-mono text-2xl font-bold tracking-[0.3em]">
            EVIDENCE LOGGED
          </span>
        </div>
      </motion.div>

      {/* Yellow vignette flash */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{
          boxShadow: "inset 0 0 100px rgba(250, 204, 21, 0.3)",
        }}
      />
    </div>
  );
}
