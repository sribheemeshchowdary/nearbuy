import { Gift, Clock, Tag, ArrowRight, Percent, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { getBusinessUrl } from "@/lib/url-helpers";
import type { Listing } from "./ListingCard";

interface ExclusiveDealsProps {
  listings: Listing[];
}

const dealColors = [
  { bg: "from-rose-500/15 to-pink-500/10", solid: "bg-blue-600", accent: "text-rose-600 dark:text-rose-400", badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400", icon: "text-rose-500", glow: "bg-rose-500/10" },
  { bg: "from-violet-500/15 to-purple-500/10", solid: "bg-indigo-700", accent: "text-violet-600 dark:text-violet-400", badge: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400", icon: "text-violet-500", glow: "bg-violet-500/10" },
  { bg: "from-amber-500/15 to-orange-500/10", solid: "bg-purple-600", accent: "text-amber-600 dark:text-amber-400", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400", icon: "text-amber-500", glow: "bg-amber-500/10" },
  { bg: "from-cyan-500/15 to-teal-500/10", solid: "bg-emerald-600", accent: "text-cyan-600 dark:text-cyan-400", badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400", icon: "text-cyan-500", glow: "bg-cyan-500/10" },
  { bg: "from-emerald-500/15 to-green-500/10", solid: "bg-sky-600", accent: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400", icon: "text-emerald-500", glow: "bg-emerald-500/10" },
  { bg: "from-blue-500/15 to-indigo-500/10", solid: "bg-orange-600", accent: "text-blue-600 dark:text-blue-400", badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400", icon: "text-blue-500", glow: "bg-blue-500/10" },
];

const ExclusiveDeals = ({ listings }: ExclusiveDealsProps) => {
  const navigate = useNavigate();
  const now = new Date().toISOString().split("T")[0];

  const dealsListings = listings.filter(
    (l) =>
      l.offers &&
      l.offers.length > 0 &&
      l.offers.some((o) => !o.validUntil || o.validUntil >= now)
  );

  if (dealsListings.length === 0) return null;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const displayCount = isMobile ? 3 : 6;

  return (
    <section className="mb-4 md:mb-10">
      <div className="flex items-center gap-2 mb-2.5 md:mb-5">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-rose-500/20 flex items-center justify-center">
          <Flame className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500" />
        </div>
        <div>
          <h2 className="text-sm md:text-lg font-bold text-foreground">Exclusive Deals This Week</h2>
          <p className="text-[10px] md:text-xs text-muted-foreground">Limited-time offers from top businesses</p>
        </div>
      </div>

      {/* Mobile: 2-col block grid */}
      <div className="grid grid-cols-2 gap-2 md:hidden">
        {dealsListings.slice(0, displayCount).map((listing, i) => {
          const color = dealColors[i % dealColors.length];
          const activeOffers = listing.offers!.filter((o) => !o.validUntil || o.validUntil >= now);
          const topOffer = activeOffers[0];

          return (
            <div
              key={listing.id}
              className="relative overflow-hidden rounded-2xl cursor-pointer active:scale-[0.97] transition-transform min-h-[200px] flex flex-col justify-between"
              onClick={() => navigate(getBusinessUrl(listing))}
            >
              {/* Cover image background */}
              {listing.coverImage && (
                <img
                  src={listing.coverImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              {/* Gradient overlay */}
              <div className={`absolute inset-0 ${color.solid} ${listing.coverImage ? "opacity-70" : "opacity-100"}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              <div className="relative z-10 p-4">
                <h3 className="font-extrabold text-white text-lg leading-tight tracking-tight uppercase">
                  {topOffer.discount}
                </h3>
                <p className="text-white/90 text-sm mt-1.5 font-semibold leading-snug">
                  {listing.name}
                </p>
                <p className="text-white/70 text-xs mt-1 line-clamp-2">
                  {topOffer.title}
                </p>
              </div>

              <div className="relative z-10 p-4 pt-0 flex items-center justify-between">
                <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
                {topOffer.code && (
                  <span className="font-mono text-[10px] text-white/80 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    {topOffer.code}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
        {dealsListings.slice(0, 6).map((listing, i) => {
          const color = dealColors[i % dealColors.length];
          const activeOffers = listing.offers!.filter((o) => !o.validUntil || o.validUntil >= now);
          const topOffer = activeOffers[0];

          return (
            <div
              key={listing.id}
              className="group relative overflow-hidden rounded-2xl cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-200 min-h-[260px] flex flex-col justify-between"
              onClick={() => navigate(getBusinessUrl(listing))}
            >
              {/* Cover image background */}
              {listing.coverImage && (
                <img
                  src={listing.coverImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
              {/* Color overlay */}
              <div className={`absolute inset-0 ${color.solid} ${listing.coverImage ? "opacity-65" : "opacity-100"}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Top content */}
              <div className="relative z-10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden border border-white/20">
                      {listing.logoUrl ? (
                        <img src={listing.logoUrl} alt={listing.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base font-bold text-white">{listing.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white truncate text-sm group-hover:text-white/90 transition-colors">
                        {listing.name}
                      </h3>
                      <p className="text-xs text-white/70">{listing.category}</p>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white border-transparent font-bold backdrop-blur-sm">
                    {topOffer.discount}
                  </Badge>
                </div>

                <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-sm font-medium text-white">{topOffer.title}</span>
                  </div>
                  <p className="text-xs text-white/70 line-clamp-2">{topOffer.description}</p>
                </div>
              </div>

              {/* Bottom content */}
              <div className="relative z-10 p-5 pt-0 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-white/70">
                  {topOffer.validUntil && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Until {topOffer.validUntil}
                    </span>
                  )}
                  {topOffer.code && (
                    <span className="font-mono bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full text-white/80">
                      <Tag className="w-3 h-3 inline mr-1" />
                      {topOffer.code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ExclusiveDeals;
