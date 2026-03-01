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

const TYPE_COLORS: Record<string, string> = {
  person: "border-purple-400 bg-purple-400/10",
  profile: "border-blue-400 bg-blue-400/10",
  location: "border-green-400 bg-green-400/10",
  activity: "border-yellow-400 bg-yellow-400/10",
};

export default function LeadTree({ leads }: LeadTreeProps) {
  if (leads.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-text-muted text-sm">
          Lead connections will appear here as they're discovered...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
        Lead Network
      </h3>
      <div className="flex flex-wrap gap-3">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className={`px-3 py-2 rounded-lg border ${TYPE_COLORS[lead.type] || "border-border bg-bg-card"}`}
          >
            <p className="text-sm text-text-primary font-medium">
              {lead.label}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-text-muted">{lead.type}</span>
              <span className="text-xs text-accent">{lead.confidence}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
