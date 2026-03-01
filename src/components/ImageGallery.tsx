import { motion } from "framer-motion";

interface ImageGalleryProps {
  images: { url: string; caption?: string; source?: string }[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px w-3 bg-accent/30" />
        <h3 className="text-[10px] font-bold text-text-secondary tracking-[0.2em] uppercase font-mono">
          Found Images
        </h3>
        <span className="text-[10px] text-text-muted font-mono tabular-nums">
          {images.length} image{images.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {images.map((img, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="group relative aspect-square bg-bg-card border border-border/60 rounded-lg overflow-hidden hover:border-border-bright transition-all"
          >
            <img
              src={img.url}
              alt={img.caption || "Found image"}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
              {img.caption && (
                <p className="text-[11px] text-white/90 leading-snug font-display">
                  {img.caption}
                </p>
              )}
            </div>

            {/* Source badge */}
            {img.source && (
              <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded px-1.5 py-0.5 border border-white/10">
                <span className="text-[9px] text-white/70 font-mono tracking-wide">
                  {img.source}
                </span>
              </div>
            )}

            {/* Corner accent */}
            <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-accent/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-accent/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
