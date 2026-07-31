import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import banner1 from "@/assets/banners/banner1.jpg";
import banner2 from "@/assets/banners/banner2.jpg";
import banner3 from "@/assets/banners/banner3.jpg";
import banner4 from "@/assets/banners/banner4.jpg";
import face1 from "@/assets/banners/face1.png";
import face2 from "@/assets/banners/face2.png";
import face3 from "@/assets/banners/face3.png";
import face4 from "@/assets/banners/face4.png";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  face: string;
}

const BANNERS: Banner[] = [
  {
    id: "1",
    title: "Find Curated Offerings For You",
    subtitle: "Discover top-rated businesses handpicked by our editors",
    cta: "Explore Now",
    image: banner1,
    face: face1,
  },
  {
    id: "2",
    title: "List Your Business for Free",
    subtitle: "Reach thousands of customers across Singapore — zero cost to get started",
    cta: "Add Listing",
    image: banner2,
    face: face2,
  },
  {
    id: "4",
    title: "Exclusive Deals This Week",
    subtitle: "Save up to 50% with partner businesses — limited time offers",
    cta: "View Deals",
    image: banner4,
    face: face4,
  },
];

const PromoBanner = () => {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % BANNERS.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
  }, []);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next, isHovered]);

  const banner = BANNERS[current];

  return (
    <section className="py-2 md:py-4">
      <div className="container mx-auto px-3 md:px-4">
        <div
          className="relative overflow-hidden rounded-2xl"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Banner with background image */}
          <div key={banner.id} className="relative h-[140px] md:h-[220px] flex items-center transition-all duration-500">
            {/* Background image */}
            <img
              src={banner.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/20" />

            <div className="relative z-10 flex-1 px-5 md:px-10">
              <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/80" />
                <span className="text-white/70 text-[10px] md:text-xs font-medium uppercase tracking-wider">
                  Featured
                </span>
              </div>
              <h3 className="text-white font-bold text-lg md:text-3xl leading-tight mb-1 md:mb-2 max-w-sm md:max-w-lg drop-shadow-lg">
                {banner.title}
              </h3>
              <p className="text-white/85 text-xs md:text-base mb-2.5 md:mb-4 max-w-xs md:max-w-md line-clamp-2 drop-shadow">
                {banner.subtitle}
              </p>
              <button className="inline-flex items-center gap-1.5 px-3.5 md:px-5 py-1.5 md:py-2.5 rounded-full bg-white text-foreground font-semibold text-xs md:text-sm hover:bg-white/90 transition-colors shadow-lg">
                {banner.cta}
              </button>
            </div>

            {/* Face image */}
            <div className="relative z-10 hidden sm:flex items-end justify-end pr-4 md:pr-10">
              <img
                src={banner.face}
                alt=""
                className="h-[130px] md:h-[210px] object-contain drop-shadow-2xl transition-all duration-500"
              />
            </div>
          </div>

          {/* Nav arrows - hidden on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 hidden md:flex h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm border-0"
            onClick={prev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm border-0"
            onClick={next}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Dots */}
          <div className="absolute bottom-2.5 md:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-5 md:w-6 h-1.5 md:h-2 bg-white"
                    : "w-1.5 md:w-2 h-1.5 md:h-2 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
