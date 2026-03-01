interface DetectiveReportProps {
  report: string;
  targetName: string;
  confidence?: number;
  findings: {
    _id: string;
    source: string;
    category: string;
    platform?: string;
    profileUrl?: string;
    data: string;
    confidence: number;
  }[];
}

export default function DetectiveReport({
  report,
  targetName,
  confidence,
  findings,
}: DetectiveReportProps) {
  const socialFindings = findings.filter((f) => f.category === "social");
  const connectionFindings = findings.filter((f) => f.category === "connection");
  const locationFindings = findings.filter((f) => f.category === "location");
  const activityFindings = findings.filter((f) => f.category === "activity");

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="border border-accent/30 rounded-xl p-6 bg-accent/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-text-primary">
            Investigation Report
          </h2>
          {confidence && (
            <div className="text-right">
              <span className="text-3xl font-bold text-accent">
                {confidence}%
              </span>
              <p className="text-xs text-text-muted">Overall Confidence</p>
            </div>
          )}
        </div>
        <p className="text-text-secondary">
          Subject: <span className="text-text-primary font-medium">{targetName}</span>
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Social Profiles", count: socialFindings.length, color: "text-blue-400" },
          { label: "Connections", count: connectionFindings.length, color: "text-purple-400" },
          { label: "Locations", count: locationFindings.length, color: "text-green-400" },
          { label: "Activity", count: activityFindings.length, color: "text-yellow-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-bg-card border border-border rounded-lg p-4 text-center"
          >
            <span className={`text-2xl font-bold ${stat.color}`}>
              {stat.count}
            </span>
            <p className="text-xs text-text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Full report */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
          Full Report
        </h3>
        <div className="prose prose-invert prose-sm max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-text-primary font-mono leading-relaxed">
            {report}
          </pre>
        </div>
      </div>

      {/* All findings */}
      {findings.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
            All Evidence ({findings.length} items)
          </h3>
          <div className="space-y-3">
            {findings.map((f) => (
              <div
                key={f._id}
                className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg"
              >
                <span
                  className={`text-xs font-bold mt-0.5 ${
                    f.confidence >= 80
                      ? "text-accent"
                      : f.confidence >= 50
                        ? "text-warning"
                        : "text-danger"
                  }`}
                >
                  {f.confidence}%
                </span>
                <div className="flex-1">
                  <p className="text-sm text-text-primary">{f.data}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-muted">{f.source}</span>
                    {f.platform && (
                      <span className="text-xs text-text-muted">
                        {f.platform}
                      </span>
                    )}
                    {f.profileUrl && (
                      <a
                        href={f.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent"
                      >
                        link
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
