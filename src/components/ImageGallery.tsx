interface ImageGalleryProps {
  images: { url: string; caption?: string; source?: string }[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div className="p-4">
      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
        Found Images
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <div
            key={i}
            className="group relative aspect-square bg-bg-card border border-border rounded-lg overflow-hidden"
          >
            <img
              src={img.url}
              alt={img.caption || "Found image"}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
              {img.caption && (
                <p className="text-xs text-white leading-tight">
                  {img.caption}
                </p>
              )}
            </div>
            {img.source && (
              <div className="absolute top-2 right-2 bg-black/60 rounded px-1.5 py-0.5">
                <span className="text-xs text-white/80">{img.source}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
