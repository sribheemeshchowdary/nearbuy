import { MapPin, Clock, Phone, MessageCircle, Share2, Bookmark, Check, ExternalLink, Users, Navigation as NavigationIcon } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import VerifiedBadge from "@/components/VerifiedBadge";
import type { Listing } from "@/components/ListingCard";
import { useState } from "react";
import { getPlaceholderLogo } from "@/lib/placeholder-logos";
import { toast } from "sonner";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface BusinessHeaderProps {
  listing: Listing & { verified?: boolean; featured?: boolean };
  shareUrl: string;
  viewCount?: number;
  liveViewers?: number;
  distanceKm?: number | null;
}

const BusinessHeader = ({ listing, shareUrl, viewCount = 0, liveViewers = 0, distanceKm }: BusinessHeaderProps) => {
  const [copied, setCopied] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const addressLine = [
    listing.address,
    listing.postalCode && !listing.address?.includes(listing.postalCode) && `Singapore ${listing.postalCode}`,
    listing.district && !listing.address?.includes(listing.district) ? listing.district : null,
  ].filter(Boolean).join(", ");

  const locationQuery = [
    listing.address,
    listing.postalCode && !listing.address?.includes(listing.postalCode) ? listing.postalCode : null,
    !listing.address?.toLowerCase().includes("singapore") ? "Singapore" : null,
  ].filter(Boolean).join(", ");
  const storedLocation = (listing as Listing & {
    location?: { latitude?: number; longitude?: number; _lat?: number; _long?: number };
  }).location;
  const registeredLat = Number(listing.lat ?? storedLocation?.latitude ?? storedLocation?._lat);
  const registeredLng = Number(listing.lng ?? storedLocation?.longitude ?? storedLocation?._long);
  const hasRegisteredCoordinates = Number.isFinite(registeredLat) && Number.isFinite(registeredLng);
  const mapDestination = hasRegisteredCoordinates
    ? `${registeredLat},${registeredLng}`
    : locationQuery || "Singapore";
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapDestination)}`;

  // Keyless Google Maps embed — avoids depending on the Maps API key.
  const embedUrl = GOOGLE_MAPS_API_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&q=${encodeURIComponent(mapDestination)}&zoom=19&maptype=roadmap`
    : `https://maps.google.com/maps?q=${encodeURIComponent(mapDestination)}&z=19&output=embed`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.name, url: shareUrl });
      } catch {}
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Name + key info — compact */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <img
              src={listing.logoUrl || getPlaceholderLogo(listing.id || listing.name)}
              alt={listing.name}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-border/50 shadow-sm shrink-0"
            />
            <div className="min-w-0 space-y-1">
              {/* Business name */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-foreground leading-tight">{listing.name}</h1>
                {listing.verified && <VerifiedBadge size="sm" />}
              </div>
              {/* Category, UEN and distance as pills on a single row */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <Badge variant="secondary" className="rounded-full px-2.5 h-6 text-[11px] font-semibold bg-secondary text-secondary-foreground">
                  {listing.category}
                </Badge>

                {(listing as any).uen && (
                  <span className="inline-flex items-center h-6 rounded-full border border-border/60 bg-secondary/40 px-2.5 font-mono text-[10px] font-semibold text-muted-foreground">
                    UEN {(listing as any).uen}
                  </span>
                )}

                {distanceKm != null && (
                  <span className="inline-flex items-center h-6 rounded-full border border-primary/15 bg-primary/5 px-2.5 text-[10px] font-bold text-primary">
                    {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m away` : `${distanceKm.toFixed(1)} km away`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-secondary" onClick={handleShare}>
              {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Share2 className="w-3.5 h-3.5 text-muted-foreground" />}
            </Button>
          </div>
        </div>

        {/* Address strip — the whole strip is tappable and opens the map sheet */}
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          aria-label="View location on map"
          className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/25 px-3 py-2.5 text-left transition-colors hover:bg-secondary/45 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span className="w-9 h-9 rounded-lg bg-card border border-border/60 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Location</span>
            <span className="block text-xs sm:text-sm font-semibold text-foreground truncate">{addressLine}</span>
          </span>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-2.5 py-1.5 text-[11px] font-bold">
            <NavigationIcon className="w-3 h-3" />
            Map
          </span>
        </button>

        {/* Meta: live viewers */}
        {liveViewers > 1 && (
          <div className="flex items-center gap-2 flex-wrap pl-[56px] sm:pl-[60px] text-xs">
            <div className="flex items-center gap-1 font-medium text-primary">
              <Users className="w-3 h-3" />
              <span>{liveViewers} viewing now</span>
            </div>
          </div>
        )}
      </div>

      {/* CTA buttons - sticky bottom bar on mobile — frosted glass Apple-style */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border/50 px-4 py-3 safe-bottom">
        <div className="grid grid-cols-3 gap-2.5">
          {listing.phone && (
            <a href={`tel:${listing.phone}`} className="min-w-0">
              <Button className="w-full h-[52px] rounded-2xl bg-[#1a73e8] hover:bg-[#1765cc] text-white gap-1.5 font-bold text-[13px] shadow-lg shadow-[#1a73e8]/20 transition-all active:scale-95">
                <Phone className="w-5 h-5 shrink-0" />
                Call
              </Button>
            </a>
          )}
          {listing.lat && listing.lng && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`} target="_blank" rel="noopener noreferrer" className="min-w-0">
              <Button className="w-full h-[52px] rounded-2xl bg-[#34A853] hover:bg-[#2c9247] text-white gap-1.5 font-bold text-[13px] shadow-lg shadow-[#34A853]/20 transition-all active:scale-95">
                <MapPin className="w-5 h-5 shrink-0" />
                Map
              </Button>
            </a>
          )}
          {(listing.whatsapp || (listing as any).contactDetails?.whatsapp || listing.phone) && (() => {
            const num = ((listing as any).contactDetails?.whatsapp || listing.whatsapp || listing.phone || "").replace(/[^0-9]/g, "");
            const msg = (listing as any).contactDetails?.whatsappMessage;
            const q = msg ? `?text=${encodeURIComponent(msg)}` : "";
            return (
              <a href={`https://wa.me/${num}${q}`} target="_blank" rel="noopener noreferrer" className="min-w-0">
                <Button className="w-full h-[52px] rounded-2xl gap-1.5 font-bold text-[13px] shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-white" style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
                  <WhatsAppIcon className="w-5 h-5 shrink-0" />
                  WhatsApp
                </Button>
              </a>
            );
          })()}
        </div>
      </div>

      {/* Map sheet — opened by tapping the address strip */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl" aria-describedby="map-sheet-address">
          <DialogHeader>
            <DialogTitle className="text-base font-bold leading-tight">{listing.name}</DialogTitle>
          </DialogHeader>

          <p id="map-sheet-address" className="text-sm text-muted-foreground -mt-1">{addressLine}</p>

          <div className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-border/60 bg-secondary/40">
            <iframe
              title={`Map showing ${listing.name}`}
              src={embedUrl}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full h-11 rounded-xl gap-2 font-semibold">
                <NavigationIcon className="w-4 h-4" />
                Get Directions
              </Button>
            </a>
            <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => setMapOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessHeader;
