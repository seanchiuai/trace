interface BrowserViewProps {
  liveUrl?: string;
  status: string;
}

export default function BrowserView({ liveUrl, status }: BrowserViewProps) {
  if (!liveUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-xl bg-bg-card border border-border flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
        </div>
        <p className="text-text-secondary text-sm mb-1">Browser View</p>
        <p className="text-text-muted text-xs">
          {status === "planning"
            ? "Waiting for investigation to start..."
            : "Browser session will appear here when the agent starts browsing."}
        </p>
        {status === "investigating" && (
          <div className="mt-4 flex items-center gap-2 text-accent text-xs">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            Connecting to browser...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* URL bar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="text-xs text-text-muted font-mono truncate">
          {liveUrl}
        </span>
        <span className="ml-auto text-xs text-accent uppercase tracking-wider font-bold">
          Live
        </span>
      </div>
      {/* iframe */}
      <iframe
        src={liveUrl}
        className="flex-1 w-full bg-black"
        title="Browser Use Live View"
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
}
