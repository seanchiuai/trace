import { useState } from "react";

interface InputFormProps {
  onSubmit: (data: {
    targetName: string;
    targetDescription?: string;
    targetPhone?: string;
    targetPhoto?: string;
    knownLinks: string[];
  }) => void;
  loading: boolean;
}

export default function InputForm({ onSubmit, loading }: InputFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [links, setLinks] = useState("");

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
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-lg space-y-4"
    >
      {/* Name */}
      <div>
        <label className="block text-xs text-text-secondary mb-1.5 uppercase tracking-wider">
          Target Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          required
          className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-text-secondary mb-1.5 uppercase tracking-wider">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="25 years old, last seen in San Francisco, brown hair, works in tech..."
          rows={3}
          className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs text-text-secondary mb-1.5 uppercase tracking-wider">
          Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 123-4567"
          className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Known Links */}
      <div>
        <label className="block text-xs text-text-secondary mb-1.5 uppercase tracking-wider">
          Known Social Links
        </label>
        <textarea
          value={links}
          onChange={(e) => setLinks(e.target.value)}
          placeholder={"instagram.com/johndoe123\ntwitter.com/johndoe\ngithub.com/johndoe"}
          rows={3}
          className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none font-mono text-sm"
        />
        <p className="text-xs text-text-muted mt-1">One per line</p>
      </div>

      {/* Photo upload placeholder */}
      <div>
        <label className="block text-xs text-text-secondary mb-1.5 uppercase tracking-wider">
          Photo
        </label>
        <div className="w-full px-4 py-8 bg-bg-card border border-dashed border-border rounded-lg text-center cursor-pointer hover:border-accent/50 transition-colors">
          <p className="text-text-muted text-sm">
            Drag & drop a photo or click to upload
          </p>
          <p className="text-text-muted text-xs mt-1">
            Used for facial recognition matching
          </p>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full py-4 bg-accent text-bg-primary font-bold rounded-lg text-sm uppercase tracking-wider hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
            Initializing Investigation...
          </span>
        ) : (
          "Investigate"
        )}
      </button>
    </form>
  );
}
