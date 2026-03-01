import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

type TestStatus = "idle" | "running" | "success" | "error";

interface TestResult {
  success: boolean;
  detail?: string;
  error?: string;
}

interface Integration {
  key: string;
  name: string;
  description: string;
  tag: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: any;
}

const INTEGRATIONS: Integration[] = [
  {
    key: "brave",
    name: "Brave Search",
    description: "Web search via Brave API",
    tag: "web_search",
    action: api.integrationTests.testBraveSearch,
  },
  {
    key: "browser",
    name: "Browser Use",
    description: "Cloud browser automation (auth check)",
    tag: "browser_action",
    action: api.integrationTests.testBrowserUse,
  },
  {
    key: "maigret",
    name: "Maigret Sidecar",
    description: "Username OSINT via Python sidecar",
    tag: "maigret_search",
    action: api.integrationTests.testMaigret,
  },
  {
    key: "picarta",
    name: "Picarta AI",
    description: "Photo geolocation",
    tag: "geo_locate",
    action: api.integrationTests.testPicarta,
  },
  {
    key: "serpapi",
    name: "Reverse Image Search",
    description: "Google Lens via SerpAPI",
    tag: "reverse_image",
    action: api.integrationTests.testReverseImageSearch,
  },
  {
    key: "whitepages",
    name: "WhitePages",
    description: "Person lookup (extreme mode)",
    tag: "whitepages",
    action: api.integrationTests.testWhitePages,
  },
  {
    key: "intelx",
    name: "IntelX",
    description: "Dark web / breach search (extreme mode)",
    tag: "darkweb",
    action: api.integrationTests.testIntelX,
  },
];

const STATUS_STYLES: Record<TestStatus, { bg: string; border: string; text: string; dot: string }> = {
  idle: {
    bg: "bg-bg-card/60",
    border: "border-border",
    text: "text-text-secondary",
    dot: "bg-text-muted",
  },
  running: {
    bg: "bg-bg-card/80",
    border: "border-info/40",
    text: "text-info",
    dot: "bg-info",
  },
  success: {
    bg: "bg-bg-card/80",
    border: "border-accent/40",
    text: "text-accent",
    dot: "bg-accent",
  },
  error: {
    bg: "bg-bg-card/80",
    border: "border-danger/40",
    text: "text-danger",
    dot: "bg-danger",
  },
};

export default function IntegrationTests() {
  const [statuses, setStatuses] = useState<Record<string, TestStatus>>({});
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [allRunning, setAllRunning] = useState(false);

  const braveAction = useAction(api.integrationTests.testBraveSearch);
  const browserAction = useAction(api.integrationTests.testBrowserUse);
  const maigretAction = useAction(api.integrationTests.testMaigret);
  const picartaAction = useAction(api.integrationTests.testPicarta);
  const serpapiAction = useAction(api.integrationTests.testReverseImageSearch);
  const whitepagesAction = useAction(api.integrationTests.testWhitePages);
  const intelxAction = useAction(api.integrationTests.testIntelX);

  const actionMap: Record<string, () => Promise<TestResult>> = {
    brave: braveAction,
    browser: browserAction,
    maigret: maigretAction,
    picarta: picartaAction,
    serpapi: serpapiAction,
    whitepages: whitepagesAction,
    intelx: intelxAction,
  };

  const runTest = useCallback(
    async (key: string) => {
      setStatuses((s) => ({ ...s, [key]: "running" }));
      setResults((r) => {
        const next = { ...r };
        delete next[key];
        return next;
      });

      try {
        const result = await actionMap[key]();
        setStatuses((s) => ({ ...s, [key]: result.success ? "success" : "error" }));
        setResults((r) => ({ ...r, [key]: result }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setStatuses((s) => ({ ...s, [key]: "error" }));
        setResults((r) => ({ ...r, [key]: { success: false, error: msg } }));
      }
    },
    [actionMap],
  );

  const runAll = useCallback(async () => {
    setAllRunning(true);
    const promises = INTEGRATIONS.map((i) => runTest(i.key));
    await Promise.allSettled(promises);
    setAllRunning(false);
  }, [runTest]);

  const successCount = Object.values(statuses).filter((s) => s === "success").length;
  const errorCount = Object.values(statuses).filter((s) => s === "error").length;
  const runningCount = Object.values(statuses).filter((s) => s === "running").length;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Grid background */}
      <div className="grid-bg fixed inset-0 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link
              to="/"
              className="text-text-muted hover:text-text-secondary text-sm font-mono tracking-wider mb-3 block transition-colors"
            >
              &larr; TRACE
            </Link>
            <h1 className="text-3xl font-display font-semibold text-text-primary tracking-tight">
              Integration Tests
            </h1>
            <p className="text-text-secondary mt-1 font-mono text-sm">
              Verify connectivity for all external services
            </p>
          </div>

          <button
            onClick={runAll}
            disabled={allRunning}
            className="h-11 px-6 rounded-lg font-mono text-sm font-medium
              bg-accent/10 border border-accent/30 text-accent
              hover:bg-accent/20 hover:border-accent/50
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200"
          >
            {allRunning ? "Running..." : "Test All"}
          </button>
        </div>

        {/* Summary bar */}
        <AnimatePresence>
          {(successCount > 0 || errorCount > 0 || runningCount > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-5 mb-8 px-4 py-3 rounded-lg glass border border-border"
            >
              <span className="font-mono text-xs text-text-muted uppercase tracking-wider">
                Status
              </span>
              {successCount > 0 && (
                <span className="font-mono text-sm text-accent">
                  {successCount} passed
                </span>
              )}
              {errorCount > 0 && (
                <span className="font-mono text-sm text-danger">
                  {errorCount} failed
                </span>
              )}
              {runningCount > 0 && (
                <span className="font-mono text-sm text-info">
                  {runningCount} running
                </span>
              )}
              <span className="font-mono text-xs text-text-muted ml-auto">
                {successCount + errorCount} / {INTEGRATIONS.length}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Integration cards */}
        <div className="flex flex-col gap-3">
          {INTEGRATIONS.map((integration, i) => {
            const status = statuses[integration.key] ?? "idle";
            const result = results[integration.key];
            const styles = STATUS_STYLES[status];

            return (
              <motion.div
                key={integration.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`relative rounded-lg border ${styles.border} ${styles.bg} transition-all duration-300`}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Status dot */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${styles.dot} transition-colors duration-300`}
                    />
                    {status === "running" && (
                      <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-info animate-ping opacity-40" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-display font-medium text-text-primary">
                        {integration.name}
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 text-text-muted uppercase tracking-wider">
                        {integration.tag}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm mt-0.5">
                      {integration.description}
                    </p>
                  </div>

                  {/* Action button */}
                  <button
                    onClick={() => runTest(integration.key)}
                    disabled={status === "running"}
                    className={`flex-shrink-0 h-9 px-4 rounded font-mono text-xs font-medium
                      border transition-all duration-200
                      ${
                        status === "running"
                          ? "border-info/30 text-info/50 cursor-not-allowed"
                          : "border-border-bright hover:border-accent/40 text-text-secondary hover:text-accent hover:bg-accent/5"
                      }`}
                  >
                    {status === "running" ? "Testing..." : "Test"}
                  </button>
                </div>

                {/* Result detail */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={`mx-5 mb-4 px-3 py-2 rounded text-xs font-mono ${
                          result.success
                            ? "bg-accent/5 text-accent/80"
                            : "bg-danger/5 text-danger/80"
                        }`}
                      >
                        {result.success ? result.detail : result.error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
