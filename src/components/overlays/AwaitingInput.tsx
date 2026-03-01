import { motion } from "framer-motion";

const QUESTION_MARKS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: Math.random() * 80 + 10,
  y: Math.random() * 70 + 15,
  size: Math.random() * 20 + 14,
  duration: Math.random() * 4 + 3,
  delay: Math.random() * 2,
}));

export default function AwaitingInput() {
  return (
    <div className="absolute inset-0 opacity-15 pointer-events-none">
      {/* Floating question marks */}
      {QUESTION_MARKS.map((q) => (
        <motion.div
          key={q.id}
          className="absolute font-mono font-bold"
          style={{
            left: `${q.x}%`,
            top: `${q.y}%`,
            fontSize: q.size,
            color: "#fbbf24",
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [0.2, 0.6, 0.2],
            rotate: [-5, 5, -5],
          }}
          transition={{
            duration: q.duration,
            delay: q.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          ?
        </motion.div>
      ))}

      {/* Amber border pulse */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        animate={{
          boxShadow: [
            "inset 0 0 30px rgba(251, 191, 36, 0.05)",
            "inset 0 0 60px rgba(251, 191, 36, 0.1)",
            "inset 0 0 30px rgba(251, 191, 36, 0.05)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
