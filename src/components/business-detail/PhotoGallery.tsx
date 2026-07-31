import { useState, useEffect, useCallback } from "react";
import { Camera, X, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";

interface PhotoGalleryProps {
  photos: string[];
  businessName: string;
}

const DEMO_PHOTOS = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop",
];

const PhotoGallery = ({ photos, businessName }: PhotoGalleryProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const allPhotos = photos.length > 0 ? photos : DEMO_PHOTOS;
  const visiblePhotos = allPhotos.slice(0, 4);
  const remaining = allPhotos.length - 4;

  const goPrev = useCallback(() => setActiveIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setActiveIndex((i) => Math.min(allPhotos.length - 1, i + 1)), [allPhotos.length]);

  const openLightbox = (idx: number) => {
    setActiveIndex(idx);
    setLightboxOpen(true);
  };

  // Keyboard navigation + body scroll lock
  useEffect(() => {
    if (!lightboxOpen) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      else if (e.key === "Escape") { setLightboxOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, goPrev, goNext]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 sm:grid-rows-2 gap-1 sm:gap-1.5 h-[200px] sm:h-[300px] md:h-[360px] rounded-2xl overflow-hidden">
        {/* Large main photo */}
        <div
          className="col-span-2 row-span-2 relative cursor-pointer group"
          onClick={() => openLightbox(0)}
        >
          <img
            src={visiblePhotos[0]}
            alt={businessName}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Smaller photos */}
        {visiblePhotos.slice(1, 4).map((photo, idx) => (
          <div
            key={idx}
            className="relative cursor-pointer group overflow-hidden"
            onClick={() => openLightbox(idx + 1)}
          >
            <img
              src={photo}
              alt={`${businessName} photo ${idx + 2}`}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {idx === 2 && remaining > 0 && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center text-white cursor-pointer transition-colors hover:bg-black/60">
                <span className="text-2xl sm:text-3xl font-bold">+{remaining}</span>
                <span className="text-xs sm:text-sm font-medium opacity-80">Photos</span>
              </div>
            )}
          </div>
        ))}

        {/* Fill empty slots */}
        {visiblePhotos.length < 4 &&
          Array.from({ length: 4 - visiblePhotos.length }).map((_, idx) => (
            <div key={`empty-${idx}`} className="bg-secondary/50 flex items-center justify-center">
              <Camera className="w-6 h-6 text-muted-foreground/20" />
            </div>
          ))}
      </div>

      {/* Full-screen Lightbox via Portal */}
      {lightboxOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Image */}
            <img
              src={allPhotos[activeIndex]}
              alt={`${businessName} photo`}
              className="max-w-[85vw] max-h-[85vh] object-contain select-none"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Counter */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white/15 backdrop-blur-md text-white text-sm font-semibold pointer-events-none">
              {activeIndex + 1} / {allPhotos.length}
            </div>

            {/* Close */}
            <button
              className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 flex items-center justify-center transition-colors"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Prev */}
            {activeIndex > 0 && (
              <button
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/25 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/45 active:scale-95 transition-all shadow-2xl border border-white/20"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}

            {/* Next */}
            {activeIndex < allPhotos.length - 1 && (
              <button
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/25 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/45 active:scale-95 transition-all shadow-2xl border border-white/20"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                aria-label="Next photo"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            )}

            {/* Dots */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {allPhotos.map((_, idx) => (
                <button
                  key={idx}
                  aria-label={`Go to photo ${idx + 1}`}
                  className={`rounded-full transition-all duration-300 ${idx === activeIndex ? "w-7 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/60"}`}
                  onClick={(e) => { e.stopPropagation(); setActiveIndex(idx); }}
                />
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default PhotoGallery;
