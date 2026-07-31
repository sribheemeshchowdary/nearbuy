import { useMemo, useState } from "react";
import { MapPin, Clock, Heart, Globe, Phone, Navigation, MessageCircle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import VerifiedBadge from "./VerifiedBadge";
import { useNavigate } from "react-router-dom";
import { getBusinessUrl } from "@/lib/url-helpers";
import { getPlaceholderLogo } from "@/lib/placeholder-logos";

export interface ListingOffer {
  id: string;
  title: string;
  description: string;
  discount: string;
  validUntil: string;
  code?: string;
}

export interface OperatingHours {
  [key: string]: { open: string; close: string; closed?: boolean };
}

export interface SpecialHours {
  date: string;
  label: string;
  open: string;
  close: string;
  closed?: boolean;
}

export const DEFAULT_OPERATING_HOURS: OperatingHours = {
  Monday: { open: "09:00", close: "18:00" },
  Tuesday: { open: "09:00", close: "18:00" },
  Wednesday: { open: "09:00", close: "18:00" },
  Thursday: { open: "09:00", close: "18:00" },
  Friday: { open: "09:00", close: "18:00" },
  Saturday: { open: "10:00", close: "16:00" },
  Sunday: { open: "", close: "", closed: true },
};

export interface Listing {
  id: string;
  name: string;
  uen: string;
  category: string;
  district: string;
  address: string;
  postalCode: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  email?: string;
  description?: string;
  status: "pending_approval" | "approved" | "active" | "published" | "rejected";
  rejectionReason?: string;
  ownerId: string;
  documentsUrl?: string[];
  lat?: number;
  lng?: number;
  createdAt?: any;
  verified?: boolean;
  featured?: boolean;
  city?: string;
  customSlug?: string;
  logoUrl?: string;
  coverImage?: string;
  instagramUrl?: string;
  xUrl?: string;
  youtubeUrl?: string;
  offers?: ListingOffer[];
  operatingHours?: OperatingHours;
  specialHours?: SpecialHours[];
  priceRange?: string;
  imageUrls?: string[];
  ownerName?: string;
  ownerEmail?: string;
  contactEmail?: string;
  contactDetails?: {
    whatsapp?: string;
    whatsappMessage?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    website?: string;
    secondary?: { method: string; value: string } | null;
  };
  catalogueEnabled?: boolean;
  catalogueItems?: { id: string; title: string; description: string; price: string; image?: string }[];
  pendingLogoUrl?: string;
  pendingImageUrls?: string[];
  subcategoryData?: Record<string, any>;
  subcategoryList?: string[];
  previousApproved?: Record<string, any>;
}

interface ListingCardProps {
  listing: Listing;
  compact?: boolean;
  highlighted?: boolean;
  onSelect?: (listing: Listing) => void;
  onHover?: (id: string | null) => void;
  distanceKm?: number | null;
  index?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Tuition": "from-blue-500 to-indigo-600",
  "Baking": "from-amber-400 to-orange-500",
  "Music/Art/Craft": "from-purple-500 to-pink-600",
  "Home Food": "from-orange-500 to-red-500",
  "Wellness": "from-teal-500 to-emerald-600",
  "Beauty": "from-pink-500 to-rose-600",
  "Pet Services": "from-emerald-500 to-teal-600",
  "Event Services": "from-rose-500 to-pink-700",
  "Tailoring": "from-violet-500 to-purple-700",
  "Cleaning": "from-sky-500 to-blue-600",
  "Handyman": "from-amber-500 to-orange-600",
  "Photography / Videography": "from-slate-500 to-slate-700",
  "Sports": "from-green-500 to-emerald-700",
  "Retail": "from-indigo-500 to-violet-700",
};

const CATEGORY_BORDER: Record<string, string> = {
  "Tuition": "border-l-blue-400",
  "Baking": "border-l-amber-400",
  "Music/Art/Craft": "border-l-purple-400",
  "Home Food": "border-l-orange-400",
  "Wellness": "border-l-teal-400",
  "Beauty": "border-l-pink-400",
  "Pet Services": "border-l-emerald-400",
  "Event Services": "border-l-rose-400",
  "Tailoring": "border-l-violet-400",
  "Cleaning": "border-l-sky-400",
  "Handyman": "border-l-yellow-400",
  "Photography / Videography": "border-l-slate-400",
  "Sports": "border-l-green-400",
  "Retail": "border-l-indigo-400",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  "Tuition": "📚",
  "Baking": "🧁",
  "Music/Art/Craft": "🎨",
  "Home Food": "🍱",
  "Wellness": "🧘",
  "Beauty": "💅",
  "Pet Services": "🐾",
  "Event Services": "🎉",
  "Tailoring": "🧵",
  "Cleaning": "🧹",
  "Handyman": "🔧",
  "Photography / Videography": "📸",
  "Sports": "⚽",
  "Retail": "🛍️",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function getIsOpenNow(listing: Listing): boolean | null {
  const hours = listing.operatingHours;
  if (!hours) return null;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  if (listing.specialHours) {
    const special = listing.specialHours.find((sh) => sh.date === todayStr);
    if (special) {
      if (special.closed) return false;
      return isWithinTime(now, special.open, special.close);
    }
  }
  const dayName = DAYS[now.getDay()];
  const todayHours = hours[dayName];
  if (!todayHours || todayHours.closed) return false;
  return isWithinTime(now, todayHours.open, todayHours.close);
}

function isWithinTime(now: Date, open: string, close: string): boolean {
  if (!open || !close) return false;
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= oh * 60 + om && nowMin < ch * 60 + cm;
}

function formatTime12(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function getNextOpenInfo(listing: Listing): string | null {
  const hours = listing.operatingHours;
  if (!hours) return null;
  const now = new Date();
  const currentDayIndex = now.getDay();
  const todayName = DAYS[currentDayIndex];
  const todayHours = hours[todayName];
  if (todayHours && !todayHours.closed && todayHours.open) {
    const [oh, om] = todayHours.open.split(":").map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (nowMin < oh * 60 + om) {
      return `Opens today at ${formatTime12(todayHours.open)}`;
    }
  }
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7;
    const dayName = DAYS[nextDayIndex];
    const dayHours = hours[dayName];
    if (dayHours && !dayHours.closed && dayHours.open) {
      const label = i === 1 ? "tomorrow" : dayName;
      return `Opens ${label} at ${formatTime12(dayHours.open)}`;
    }
  }
  return null;
}

const ListingCard = ({ listing, compact, highlighted, onSelect, onHover, distanceKm, index }: ListingCardProps) => {
  const navigate = useNavigate();
  const gradient = CATEGORY_COLORS[listing.category] || "from-primary to-accent";
  const isOpen = useMemo(() => getIsOpenNow(listing), [listing]);
  const nextOpenInfo = useMemo(() => (isOpen === false ? getNextOpenInfo(listing) : null), [listing, isOpen]);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleClick = () => {
    if (onSelect) onSelect(listing);
    navigate(getBusinessUrl(listing));
  };

  const heroImage = listing.coverImage || (listing.imageUrls && listing.imageUrls.length > 0 ? listing.imageUrls[0] : null);
  const logoImage = listing.logoUrl || getPlaceholderLogo(listing.id || listing.name);

  return (
    <div
      data-listing-id={listing.id}
      className={`group cursor-pointer transition-all duration-200 border border-foreground/[0.06] rounded-2xl bg-card hover:bg-secondary/20 hover:border-primary/20 hover:shadow-[0_4px_16px_rgba(0,0,0,0.02)] ${
        highlighted ? "border-primary/40 bg-secondary/30 scale-[1.01]" : ""
      }`}
      onClick={handleClick}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
    >

      {/* ── MOBILE ── */}
      <div className="flex items-center gap-2 p-1.5 md:hidden">
        <div className="w-8 h-8 shrink-0 rounded-lg overflow-hidden bg-secondary/40 ring-1 ring-border/50 flex items-center justify-center">
          <img
            src={listing.logoUrl || listing.coverImage || getPlaceholderLogo(listing.id || listing.name)}
            alt={listing.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <h3 className="font-semibold text-foreground text-[11px] leading-tight truncate">{listing.name}</h3>
            {listing.verified && (
              <span className="inline-flex items-center text-[8px] font-semibold text-primary bg-primary/10 border border-primary/30 px-1 py-0 rounded-full">
                ✓
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground truncate">
            <span className="font-medium">{listing.category}</span>
            <span className="mx-1">·</span>
            <span>{listing.district}</span>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-center gap-0.5">
          {distanceKm != null && (
            <span className="text-[9px] font-semibold text-primary leading-none">
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
            </span>
          )}
          <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* ── DESKTOP (Modernized Compact Row) ── */}
      <div className="hidden md:block p-3">
        <div className="flex items-center gap-3.5">
          {/* Logo on the left */}
          <div className="w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-secondary border border-foreground/[0.06] flex items-center justify-center relative">
            <img
              src={logoImage}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details in the middle */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-[13px] text-foreground leading-snug truncate group-hover:underline decoration-foreground/20 underline-offset-2">
                {listing.name}
              </h3>
              {listing.verified && (
                <span className="inline-flex items-center text-[9px] font-bold text-primary bg-primary/10 border border-primary/25 px-1.5 py-0.25 rounded-md">
                  ✓ Verified
                </span>
              )}
              {isOpen !== null && (
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.25 rounded-md ${
                  isOpen ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-muted-foreground"
                }`}>
                  {isOpen ? "Open" : "Closed"}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
              <span className="font-medium text-foreground/80">{listing.category}</span>
              <span className="text-foreground/[0.15]">|</span>
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {listing.district}
              </span>
              {listing.priceRange && (
                <>
                  <span className="text-foreground/[0.15]">|</span>
                  <span className="font-semibold text-foreground/90">{listing.priceRange}</span>
                </>
              )}
            </div>
          </div>

          {/* Action indicator on the right */}
          <div className="shrink-0 flex items-center gap-2.5">
            {distanceKm != null && (
              <span className="text-[11px] font-semibold text-primary">
                {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
              </span>
            )}
            <div className="w-8 h-8 rounded-full bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center transition-all duration-200">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
