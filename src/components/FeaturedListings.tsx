import { Sparkles, MapPin, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import VerifiedBadge from "./VerifiedBadge";
import type { Listing } from "./ListingCard";
import { useNavigate } from "react-router-dom";
import { getBusinessUrl } from "@/lib/url-helpers";

interface FeaturedListingsProps {
  listings: Listing[];
  compact?: boolean;
}

const FeaturedListings = ({ listings, compact = false }: FeaturedListingsProps) => {
  const navigate = useNavigate();
  const featured = listings.slice(0, 8);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const displayCount = compact ? 4 : isMobile ? 4 : 8;

  if (featured.length === 0) return null;

  return (
    <section className={compact ? "" : "mb-6 md:mb-10"}>
      <div className="flex items-center justify-between mb-3 md:mb-5">
        <div>
          <h2 className="text-base md:text-lg font-bold text-foreground">Featured Businesses</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Handpicked top-rated businesses</p>
        </div>
        <Badge variant="secondary" className="text-[10px] md:text-xs">Sponsored</Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {featured.slice(0, displayCount).map((listing) => (
          <div
            key={listing.id}
            className="group relative overflow-hidden rounded-xl border border-border bg-card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            onClick={() => navigate(getBusinessUrl(listing))}
          >
            {/* Cover image */}
            {listing.coverImage && (
              <div className="h-24 md:h-36 overflow-hidden">
                <img
                  src={listing.coverImage}
                  alt={listing.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-2.5 md:p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="font-semibold text-xs md:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {listing.name}
                </h3>
                {listing.verified && <VerifiedBadge size="sm" />}
              </div>
              <Badge variant="secondary" className="text-[9px] md:text-[10px] mb-1.5 md:mb-2">{listing.category}</Badge>
              {listing.description && (
                <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1 md:line-clamp-2 mb-2 md:mb-3">{listing.description}</p>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{listing.district}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedListings;
