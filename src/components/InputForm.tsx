import { useState } from "react";
import { motion } from "framer-motion";

interface InputFormProps {
  onSubmit: (data: {
    targetName: string;
    targetDescription?: string;
    targetPhone?: string;
    targetPhoto?: string;
    knownLinks: string[];
    instructions?: string;
    extremeMode: boolean;
    disabledTools: string[];
  }) => void;
  loading: boolean;
}

const STANDARD_TOOLS = [
  { name: "web_search", label: "Brave Search" },
  { name: "browser_action", label: "Browser Use" },
  { name: "maigret_search", label: "Maigret OSINT" },
  { name: "geo_locate", label: "Photo Geolocation" },
  { name: "reverse_image_search", label: "Reverse Image Search" },
] as const;

const EXTREME_TOOLS = [
  { name: "whitepages_lookup", label: "WhitePages Lookup" },
  { name: "darkweb_search", label: "Dark Web Search" },
] as const;

function FormField({
  label,
  required,
  children,
  delay = 0,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <label className="flex items-center gap-2 mb-2">
        <div className="h-px w-3 bg-accent/30" />
        <span className="text-[10px] text-text-secondary tracking-[0.2em] uppercase font-mono">
          {label}
          {required && <span className="text-accent ml-1">*</span>}
        </span>
      </label>
      {children}
    </motion.div>
  );
}

export default function InputForm({ onSubmit, loading }: InputFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [links, setLinks] = useState("");
  const [instructions, setInstructions] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [extremeMode, setExtremeMode] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [disabledTools, setDisabledTools] = useState<Set<string>>(new Set());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const knownLinks = links
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    onSubmit({
      targetName: name.trim(),
      targetDescription: description.trim() || undefined,
      targetPhone: phone.trim() || undefined,
      knownLinks,
      instructions: instructions.trim() || undefined,
      extremeMode,
      disabledTools: Array.from(disabledTools),
    });
  };

  const inputBase =
    "w-full px-4 py-3 bg-bg-card/80 border rounded-lg text-text-primary text-sm placeholder:text-text-muted/60 focus:outline-none transition-all duration-300";
  const inputIdle = "border-border hover:border-border-bright";
  const inputFocus = "border-accent/40 shadow-[0_0_20px_rgba(0,255,136,0.06)]";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      {/* Form container with HUD corners */}
      <div className="relative p-6 rounded-xl border border-border/60 bg-bg-secondary/40 backdrop-blur-sm">
        {/* HUD corner brackets */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-accent/30 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-accent/30 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-accent/30 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-accent/30 rounded-br-xl" />

        <div className="space-y-5">
          {/* Name */}
          <FormField label="Target Name" required delay={0.1}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              placeholder="John Doe"
              required
              className={`${inputBase} ${focused === "name" ? inputFocus : inputIdle}`}
            />
          </FormField>

          {/* Description */}
          <FormField label="Description" delay={0.15}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={() => setFocused("desc")}
              onBlur={() => setFocused(null)}
              placeholder="25 years old, last seen in San Francisco, brown hair, works in tech..."
              rows={3}
              className={`${inputBase} resize-none ${focused === "desc" ? inputFocus : inputIdle}`}
            />
          </FormField>

          {/* Phone */}
          <FormField label="Phone Number" delay={0.2}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={() => setFocused("phone")}
              onBlur={() => setFocused(null)}
              placeholder="+1 (555) 123-4567"
              className={`${inputBase} ${focused === "phone" ? inputFocus : inputIdle}`}
            />
          </FormField>

          {/* Known Links */}
          <FormField label="Known Social Links" delay={0.25}>
            <textarea
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              onFocus={() => setFocused("links")}
              onBlur={() => setFocused(null)}
              placeholder={"imginn.com/johndoe123\ntwitter.com/johndoe\ngithub.com/johndoe"}
              rows={3}
              className={`${inputBase} resize-none font-mono text-xs ${focused === "links" ? inputFocus : inputIdle}`}
            />
            <p className="text-[10px] text-text-muted mt-1.5 tracking-wide">
              One URL per line
            </p>
          </FormField>

          {/* Investigation Instructions */}
          <FormField label="Instructions" delay={0.3}>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onFocus={() => setFocused("instructions")}
              onBlur={() => setFocused(null)}
              placeholder={"Find their current address\nLocate contact email or phone\nFocus on their professional background"}
              rows={3}
              className={`${inputBase} resize-none ${focused === "instructions" ? inputFocus : inputIdle}`}
            />
            <p className="text-[10px] text-text-muted mt-1.5 tracking-wide">
              Tell the investigator what to focus on
            </p>
          </FormField>

          {/* Photo upload placeholder */}
          <FormField label="Photo" delay={0.35}>
            <div className="relative w-full px-4 py-8 bg-bg-card/50 border border-dashed border-border rounded-lg text-center cursor-pointer hover:border-accent/30 hover:bg-bg-card/80 transition-all duration-300 group">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-bg-primary border border-border flex items-center justify-center group-hover:border-accent/20 transition-colors">
                <svg
                  className="w-5 h-5 text-text-muted group-hover:text-accent/60 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-text-muted text-xs">
                Drag & drop or click to upload
              </p>
              <p className="text-text-muted/60 text-[10px] mt-1">
                Used for facial recognition matching
              </p>
            </div>
          </FormField>
        </div>

        {/* Integrations section */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.38 }}
          className="mt-6"
        >
          <button
            type="button"
            onClick={() => setIntegrationsOpen(!integrationsOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:border-border-bright bg-bg-card/50 transition-all duration-300"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-text-muted">
                Integrations
              </span>
              {disabledTools.size > 0 && (
                <span className="text-[9px] font-mono text-accent/60 tracking-wide">
                  {disabledTools.size} disabled
                </span>
              )}
            </div>
            <svg
              className={`w-3.5 h-3.5 text-text-muted transition-transform duration-300 ${integrationsOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {integrationsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-2 space-y-1"
            >
              {[...STANDARD_TOOLS, ...(extremeMode ? EXTREME_TOOLS : [])].map((tool) => {
                const enabled = !disabledTools.has(tool.name);
                const extreme = EXTREME_TOOLS.some((t) => t.name === tool.name);
                const onColor = extreme ? "bg-red-500/25" : "bg-accent/25";
                const onBorder = extreme ? "border-red-500/40" : "border-accent/40";
                const onDot = extreme
                  ? "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.4)]"
                  : "bg-accent shadow-[0_0_6px_rgba(0,255,136,0.4)]";
                const labelColor = !enabled ? "text-text-muted/50"
                  : extreme ? "text-red-400/80" : "text-text-secondary";
                return (
                  <button
                    key={tool.name}
                    type="button"
                    onClick={() => {
                      setDisabledTools((prev) => {
                        const next = new Set(prev);
                        if (next.has(tool.name)) next.delete(tool.name);
                        else next.add(tool.name);
                        return next;
                      });
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 rounded-md hover:bg-bg-card/60 transition-colors"
                  >
                    <span className={`text-[11px] font-mono ${labelColor}`}>
                      {tool.label}
                    </span>
                    <div
                      className={`relative w-8 h-4 rounded-full transition-colors duration-300 ${
                        enabled ? onColor : "bg-bg-primary"
                      } border ${enabled ? onBorder : "border-border"}`}
                    >
                      <div
                        className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${
                          enabled
                            ? `left-[calc(100%-14px)] ${onDot}`
                            : "left-0.5 bg-text-muted/40"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {/* Extreme Mode toggle */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-4"
        >
          <button
            type="button"
            onClick={() => {
              setExtremeMode((prev) => {
                if (prev) {
                  // Turning off: clear extreme tools from disabled set
                  setDisabledTools((dt) => {
                    const next = new Set(dt);
                    EXTREME_TOOLS.forEach((t) => next.delete(t.name));
                    return next;
                  });
                }
                return !prev;
              });
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all duration-300 ${
              extremeMode
                ? "border-red-500/50 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.08)]"
                : "border-border hover:border-border-bright bg-bg-card/50"
            }`}
          >
            <div className="flex flex-col items-start gap-0.5">
              <span
                className={`text-[10px] font-mono font-bold tracking-[0.2em] uppercase ${
                  extremeMode ? "text-red-400" : "text-text-muted"
                }`}
              >
                EXTREME MODE
              </span>
              <span className="text-[10px] text-text-muted/70">
                Enables WhitePages deep lookup & dark web search (leaked data, breach records)
              </span>
            </div>
            <div
              className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${
                extremeMode ? "bg-red-500/30" : "bg-bg-primary"
              } border ${extremeMode ? "border-red-500/50" : "border-border"}`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${
                  extremeMode
                    ? "left-[calc(100%-18px)] bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    : "left-0.5 bg-text-muted/40"
                }`}
              />
            </div>
          </button>
          {extremeMode && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-[10px] text-red-400/70 mt-2 px-1 font-mono"
            >
              Warning: Extreme mode accesses private data sources and leaked databases. Use responsibly.
            </motion.p>
          )}
        </motion.div>

        {/* Submit button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mt-4"
        >
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="relative w-full py-4 bg-accent text-bg-primary font-display font-bold rounded-lg text-sm uppercase tracking-[0.15em] hover:bg-accent-bright disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 overflow-hidden group"
          >
            {/* Hover scan effect */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                animation: "horizontalScan 2s ease-in-out infinite",
              }}
            />

            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="w-4 h-4 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
                <span>Initializing Investigation...</span>
              </span>
            ) : (
              "Begin Investigation"
            )}
          </button>
        </motion.div>
      </div>
    </form>
  );
}
