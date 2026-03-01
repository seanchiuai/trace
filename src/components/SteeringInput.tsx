import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";

interface SteeringInputProps {
  investigationId: Id<"investigations">;
  isLive: boolean;
}

export default function SteeringInput({
  investigationId,
  isLive,
}: SteeringInputProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const createDirective = useMutation(api.directives.createDirective);

  if (!isLive) return null;

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await createDirective({
        investigationId,
        type: "general",
        message: trimmed,
      });
      setMessage("");
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 2000);
    } catch (e) {
      console.error("Failed to send directive:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-[52px] inset-x-0 z-40 px-4 pb-2">
      <div className="relative flex items-center gap-2 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Steer the investigation..."
            disabled={submitting}
            className="w-full bg-bg-card/80 backdrop-blur-sm border border-border/60 rounded-lg px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all disabled:opacity-50 font-mono"
          />

          {/* Queued confirmation flash */}
          <AnimatePresence>
            {showConfirm && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-accent font-mono tracking-wide"
              >
                Directive queued
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!message.trim() || submitting}
          className="shrink-0 w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? (
            <div className="w-3.5 h-3.5 border border-accent/50 border-t-accent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
