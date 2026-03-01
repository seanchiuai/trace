import { type ReactNode } from "react";
import { motion } from "framer-motion";

export type ViewMode = "browser" | "graph" | "map";

interface Props {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  hasConnections: boolean;
  hasLocations: boolean;
}

const views: { id: ViewMode; label: string; icon: ReactNode }[] = [
  {
    id: "browser",
    label: "Browser",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
      </svg>
    ),
  },
  {
    id: "graph",
    label: "Graph",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: "map",
    label: "Map",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
];

export default function ViewSwitcher({
  activeView,
  onViewChange,
  hasConnections,
  hasLocations,
}: Props) {
  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5">
      {views.map((view) => {
        const isActive = activeView === view.id;
        const shouldPulse =
          (view.id === "graph" && hasConnections && activeView !== "graph") ||
          (view.id === "map" && hasLocations && activeView !== "map");

        return (
          <motion.button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer
              ${
                isActive
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "bg-bg-card/60 text-text-muted/50 border border-border/30 hover:text-text-primary hover:border-border-bright"
              }`}
            title={view.label}
          >
            {view.icon}
            {shouldPulse && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
