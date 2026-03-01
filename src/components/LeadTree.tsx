import { motion } from "framer-motion";

interface Lead {
  id: string;
  label: string;
  type: "person" | "profile" | "location" | "activity";
  connections: string[];
  confidence: number;
}

interface LeadTreeProps {
  leads: Lead[];
}

const TYPE_STYLE: Record<
  string,
  { border: string; bg: string; dot: string; text: string }
> = {
  person: {
    border: "border-purple-400/20",
    bg: "bg-purple-400/5",
    dot: "bg-purple-400",
    text: "text-purple-400",
  },
  profile: {
    border: "border-blue-400/20",
    bg: "bg-blue-400/5",
    dot: "bg-blue-400",
    text: "text-blue-400",
  },
  location: {
    border: "border-green-400/20",
    bg: "bg-green-400/5",
    dot: "bg-green-400",
    text: "text-green-400",
  },
  activity: {
    border: "border-yellow-400/20",
    bg: "bg-yellow-400/5",
    dot: "bg-yellow-400",
    text: "text-yellow-400",
  },
};

export default function LeadTree({ leads }: LeadTreeProps) {
  if (leads.length === 0) {
    return (
      <div className="p-4 text-center py-10">
        <div className="w-8 h-8 mx-auto mb-3 rounded-lg bg-bg-card border border-border flex items-center justify-center">
          <svg
            className="w-3.5 h-3.5 text-text-muted/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.06a4.5 4.5 0 00-6.364-6.364L4.757 8.25a4.5 4.5 0 003.182 7.685"
            />
          </svg>
        </div>
        <p className="text-text-muted text-xs">
          Lead connections will appear as they're discovered...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px w-3 bg-accent/30" />
        <h3 className="text-[10px] font-bold text-text-secondary tracking-[0.2em] uppercase font-mono">
          Lead Network
        </h3>
        <span className="text-[10px] text-text-muted font-mono tabular-nums">
          {leads.length} nodes
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {leads.map((lead, i) => {
          const style =
            TYPE_STYLE[lead.type] || TYPE_STYLE.profile;

          return (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`relative px-3.5 py-2.5 rounded-lg border ${style.border} ${style.bg} hover:border-border-bright transition-all cursor-default group`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <p className="text-[13px] text-text-primary font-display font-medium">
                  {lead.label}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] tracking-wider uppercase font-mono ${style.text}`}>
                  {lead.type}
                </span>
                <span className="text-[9px] text-accent font-mono font-bold tabular-nums">
                  {lead.confidence}%
                </span>
                {lead.connections.length > 0 && (
                  <span className="text-[9px] text-text-muted/40 font-mono">
                    {lead.connections.length} link{lead.connections.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
