import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PLATFORMS = [
  "instagram", "twitter", "facebook", "linkedin", "github",
  "reddit", "tiktok", "telegram", "discord", "snapchat",
  "pinterest", "tumblr", "medium", "vk", "flickr",
];

const USERNAMES = [
  "shadow_user", "darknet_42", "johndoe99", "anonymous_x",
  "cyber_ghost", "null_ptr", "root_admin", "phantom_0x",
  "the_real_one", "not_found", "trace_me", "digital_nomad",
];

interface ScrollItem {
  id: number;
  text: string;
  platform: string;
  x: number;
  speed: number;
}

export default function IdentityScan() {
  const [items, setItems] = useState<ScrollItem[]>([]);

  useEffect(() => {
    let id = 0;
    const spawn = () => {
      setItems((prev) => {
        const fresh = prev.slice(-20);
        fresh.push({
          id: id++,
          text: USERNAMES[Math.floor(Math.random() * USERNAMES.length)],
          platform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
          x: Math.random() * 80 + 5,
          speed: Math.random() * 2 + 3,
        });
        return fresh;
      });
    };

    const interval = setInterval(spawn, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 opacity-25 pointer-events-none overflow-hidden">
      {/* Username scroll stream */}
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: window.innerHeight + 30, opacity: [0, 0.8, 0.8, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: item.speed, ease: "linear" }}
            className="absolute font-mono text-xs whitespace-nowrap"
            style={{
              left: `${item.x}%`,
              color: "#3b82f6",
              textShadow: "0 0 8px rgba(59, 130, 246, 0.4)",
            }}
          >
            <span className="opacity-50">@</span>
            {item.text}
            <span className="ml-2 opacity-30 text-[10px]">[{item.platform}]</span>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Center fingerprint SVG */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="opacity-10"
        >
          {/* Concentric arcs representing fingerprint ridges */}
          {[30, 45, 60, 75, 90].map((r, i) => (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1"
              strokeDasharray={`${r * 0.8} ${r * 0.5}`}
              opacity={0.3 + i * 0.1}
            />
          ))}
        </motion.svg>
      </div>

      {/* Blue vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(59, 130, 246, 0.06) 100%)",
        }}
      />
    </div>
  );
}
