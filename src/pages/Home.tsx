import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import InputForm from "../components/InputForm";

export default function Home() {
  const navigate = useNavigate();
  const createInvestigation = useMutation(api.investigations.create);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: {
    targetName: string;
    targetDescription?: string;
    targetPhone?: string;
    targetPhoto?: string;
    knownLinks: string[];
  }) => {
    setLoading(true);
    try {
      const id = await createInvestigation(data);
      navigate(`/investigate/${id}`);
    } catch (err) {
      console.error("Failed to create investigation:", err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
            T
          </div>
          <h1 className="text-lg font-bold tracking-tight text-text-primary">
            TRACE
          </h1>
          <span className="text-xs text-text-muted ml-2 tracking-widest uppercase">
            AI Investigation System
          </span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-2xl w-full text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-text-primary">
            Find anyone.
          </h2>
          <p className="text-text-secondary text-lg mb-2">
            AI-powered digital investigation. Provide a name, photo, or social
            link — our AI investigator explores the web autonomously and builds a
            comprehensive profile.
          </p>
          <p className="text-text-muted text-sm">
            Powered by Claude Opus, Browser Use, Maigret, and FaceCheck.id
          </p>
        </div>

        <InputForm onSubmit={handleSubmit} loading={loading} />

        {/* Legal disclaimer */}
        <div className="mt-12 max-w-lg text-center">
          <p className="text-xs text-text-muted leading-relaxed">
            For lawful purposes only. Not a consumer reporting agency. Do not use
            for employment, housing, or credit decisions. All data sourced from
            publicly available information. Missing persons & family reconnection
            use only.
          </p>
        </div>
      </main>
    </div>
  );
}
