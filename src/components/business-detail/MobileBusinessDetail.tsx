import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Listing } from "@/components/ListingCard";
import { DEFAULT_OPERATING_HOURS } from "@/components/ListingCard";
import BusinessEnquiryForm from "@/components/BusinessEnquiryForm";
import { PreviewBanner } from "@/components/PreviewBanner";
import { resolveInstagram } from "@/lib/contact-links";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

/* Faithful port of Nearbuy_Mobile_Listing_Detail.html, wired to real data.
   All styles are scoped under `.nb-md` so they never leak into the desktop tree. */

const CATEGORY_EMOJI: Record<string, string> = {
  "Tuition": "📚", "Baking": "🧁", "Music/Art/Craft": "🎨", "Music & Arts": "🎨",
  "Home Food": "🍱", "Wellness": "🧘", "Beauty": "💅", "Pet Services": "🐾",
  "Event Services": "🎉", "Tailoring": "🧵", "Cleaning": "🧹", "Handyman": "🔧",
  "Photography / Videography": "📸", "Sports": "⚽", "Retail": "🛍️",
};
const emojiFor = (c: string) => CATEGORY_EMOJI[c] || "🏢";

const formatTime = (time: string) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const buildSocialUrl = (val: string | undefined, base: string) => {
  if (!val) return "";
  const v = val.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `${base}${v.replace(/^@/, "")}`;
};

interface Props {
  listing: Listing;
  galleryPhotos: string[];
  shareUrl: string;
  areaSlug?: string;
  categorySlug?: string;
  catalogueVisible: boolean;
  isPreview?: boolean;
}

type Tab = "ov" | "cat" | "inf" | "ph";

const MobileBusinessDetail = ({ listing, galleryPhotos, shareUrl, areaSlug, categorySlug, catalogueVisible, isPreview }: Props) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("ov");
  const [mapOpen, setMapOpen] = useState(false);
  const [barShown, setBarShown] = useState(false);
  const [galIndex, setGalIndex] = useState(0);
  const topActsRef = useRef<HTMLDivElement>(null);
  const enqRef = useRef<HTMLDivElement>(null);
  const galRef = useRef<HTMLDivElement>(null);

  const phone = listing.phone;
  const whatsappNumber = listing.contactDetails?.whatsapp || listing.whatsapp || listing.phone;
  const whatsappMessage = listing.contactDetails?.whatsappMessage || "";
  const email = listing.email || listing.contactEmail || listing.ownerEmail;
  const instagramUrl = buildSocialUrl(resolveInstagram(listing.contactDetails, listing.instagramUrl), "https://instagram.com/");
  const catalogueItems = listing.catalogueItems || [];
  // Show the Catalogue tab whenever the owner has catalogue enabled (matches desktop),
  // even before any items are added.
  const hasCatalogue = catalogueVisible;

  const openWhatsApp = () => {
    if (!whatsappNumber) return;
    const cleaned = whatsappNumber.replace(/[^0-9]/g, "");
    const q = whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : "";
    window.open(`https://wa.me/${cleaned}${q}`, "_blank", "noopener");
  };
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
  const embedUrl = GOOGLE_MAPS_API_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&q=${encodeURIComponent(mapDestination)}&zoom=19&maptype=roadmap`
    : `https://maps.google.com/maps?q=${encodeURIComponent(mapDestination)}&z=19&output=embed`;

  const doShare = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: listing.name, url: shareUrl }); return; }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
    } catch { /* user cancelled share */ }
  };

  const openMapSheet = () => setMapOpen(true);

  /* scroll-aware bottom contact bar: shows only once the top action row scrolls off.
     Capture phase is required because this app scrolls document.body (not the window),
     and body scroll events don't reach a bubble-phase window listener. */
  useEffect(() => {
    const onScroll = () => {
      const el = topActsRef.current;
      if (!el) return;
      setBarShown(el.getBoundingClientRect().bottom < 60);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [tab]);

  /* gallery counter */
  const onGalScroll = () => {
    const el = galRef.current;
    if (!el || el.clientWidth === 0) return;
    setGalIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const hours = listing.operatingHours || DEFAULT_OPERATING_HOURS;
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const shortName: Record<string, string> = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
  const keyOf = (d: string) => {
    const i = hours[d];
    if (!i || i.closed) return "CLOSED";
    return `${i.open}-${i.close}`;
  };
  const hourGroups: { days: string[]; key: string }[] = [];
  dayOrder.forEach((d) => {
    const k = keyOf(d);
    const last = hourGroups[hourGroups.length - 1];
    if (last && last.key === k) last.days.push(d);
    else hourGroups.push({ days: [d], key: k });
  });

  const totalSlides = galleryPhotos.length || 1;

  return (
    <div className="nb-md" style={{ paddingBottom: barShown ? "88px" : undefined }}>
      <style>{`
        .nb-md{--g900:hsl(var(--primary));--g800:hsl(var(--primary-glow));--g500:hsl(var(--primary-glow));--g300:hsl(var(--primary)/0.4);--mint:hsl(var(--primary)/0.06);--mint2:hsl(var(--primary)/0.1);--ink:hsl(var(--foreground));--muted:hsl(var(--muted-foreground));--line:hsl(var(--border));--wa:#25D366;--ig:#E1306C;--call:#2563EB;--safe-top:env(safe-area-inset-top,0px);--safe-bot:env(safe-area-inset-bottom,0px);font-family:'DM Sans',system-ui,sans-serif;color:var(--ink);background:hsl(var(--background))}
        .nb-md *{box-sizing:border-box}
        .nb-md .crumb{position:sticky;top:0;z-index:14;background:hsl(var(--card)/0.9);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);padding:calc(10px + var(--safe-top)) 12px 9px;display:flex;align-items:center;gap:8px}
        .nb-md .icb{width:32px;height:32px;border-radius:10px;border:1px solid var(--line);background:hsl(var(--card));color:hsl(var(--foreground));display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer}
        .nb-md .crumbs{flex:1;min-width:0;overflow-x:auto;white-space:nowrap;font-size:11px;font-weight:700;color:hsl(var(--muted-foreground));scrollbar-width:none}
        .nb-md .crumbs::-webkit-scrollbar{display:none}
        .nb-md .crumbs a{color:inherit;text-decoration:none}
        .nb-md .crumbs b{color:var(--ink);font-weight:800}
        .nb-md .galwrap{position:relative}
        .nb-md .gal{height:200px;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;background:hsl(var(--card))}
        .nb-md .gal::-webkit-scrollbar{display:none}
        .nb-md .gsl{min-width:100%;scroll-snap-align:start;display:flex;align-items:center;justify-content:center;background:var(--mint2);overflow:hidden}
        .nb-md .gsl img{width:100%;height:100%;object-fit:cover}
        .nb-md .gsl.empty{background:hsl(var(--secondary));flex-direction:column;gap:5px;font-size:24px;color:hsl(var(--muted-foreground))}
        .nb-md .gsl.empty span{font-size:10.5px;font-weight:700}
        .nb-md .gcount{position:absolute;bottom:10px;right:12px;background:rgba(15,23,42,.62);color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px}
        .nb-md .ident{background:hsl(var(--card));padding:16px 16px 0;border-bottom:1px solid var(--line)}
        .nb-md .id-row{display:flex;align-items:flex-start;gap:13px}
        .nb-md .id-ic{width:56px;height:56px;border-radius:16px;background:var(--mint2);border:1px solid rgba(161,190,149,.4);display:flex;align-items:center;justify-content:center;font-size:27px;flex-shrink:0;overflow:hidden}
        .nb-md .id-ic img{width:100%;height:100%;object-fit:cover}
        .nb-md .id-nm{font-family:'DM Serif Display',serif;font-size:25px;line-height:1.12;color:var(--g900)}
        .nb-md .id-tags{display:flex;align-items:center;gap:6px;margin-top:7px;flex-wrap:wrap}
        .nb-md .id-cat{font-size:11.5px;font-weight:800;color:var(--g900);background:var(--mint2);border:1px solid rgba(161,190,149,.45);border-radius:999px;padding:3px 11px}
        .nb-md .id-uen{font-size:11px;font-weight:800;color:var(--g500);background:var(--mint);border:1px solid var(--line);border-radius:999px;padding:3px 10px}
        .nb-md .addr{display:flex;align-items:center;gap:10px;margin-top:14px;padding:11px 12px;border-radius:13px;background:var(--mint);border:1px solid var(--line);cursor:pointer;width:100%;text-align:left;font-family:inherit}
        .nb-md .addr-ic{width:34px;height:34px;border-radius:10px;background:hsl(var(--card));border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .nb-md .addr-t{flex:1;min-width:0}
        .nb-md .addr-l{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:hsl(var(--muted-foreground))}
        .nb-md .addr-v{font-size:12.5px;font-weight:700;color:var(--ink);margin-top:2px;line-height:1.4}
        .nb-md .addr-go{flex-shrink:0;display:flex;align-items:center;gap:4px;font-size:11.5px;font-weight:800;color:var(--g900);background:var(--mint2);border:1px solid rgba(161,190,149,.45);border-radius:9px;padding:6px 10px}
        .nb-md .actrow{display:flex;gap:8px;padding:14px 0}
        .nb-md .act-ic{flex:1;min-width:0;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;border:1.5px solid;background:hsl(var(--card));font-family:inherit;font-size:13px;font-weight:800;text-decoration:none;white-space:nowrap}
        .nb-md .act-ic svg{flex-shrink:0}
        .nb-md .act-ic.call{border-color:rgba(37,99,235,.35);color:#2563EB}
        .nb-md .act-ic.wa{border-color:rgba(18,140,75,.35);color:#128C4B}
        .nb-md .act-ic.ig{border-color:rgba(225,48,108,.3);color:#C1306C}
        .nb-md .tabs{position:sticky;top:calc(51px + var(--safe-top));z-index:13;background:hsl(var(--card)/0.9);backdrop-filter:blur(10px);display:flex;gap:4px;padding:8px 12px;border-bottom:1px solid var(--line)}
        .nb-md .tab{flex:1;text-align:center;padding:9px 4px;border-radius:10px;font-size:12px;font-weight:800;color:hsl(var(--muted-foreground));cursor:pointer;position:relative;white-space:nowrap;transition:all .15s;background:none;border:none;font-family:inherit}
        .nb-md .tab.on{background:var(--g900);color:#fff}
        .nb-md .tab .dt{position:absolute;top:5px;right:6px;width:6px;height:6px;border-radius:50%;background:var(--g500)}
        .nb-md .tab.on .dt{background:var(--g300)}
        .nb-md .body{padding:12px 14px calc(20px + var(--safe-bot))}
        .nb-md .tp{display:none}
        .nb-md .tp.on{display:block;animation:nbfade .22s ease}
        @keyframes nbfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .nb-md .c{background:hsl(var(--card));border:1px solid var(--line);border-radius:16px;padding:15px;margin-bottom:11px}
        .nb-md .ch{font-family:'DM Serif Display',serif;font-size:17px;color:var(--g900);display:flex;align-items:center;justify-content:space-between}
        .nb-md .ch-sm{font-size:11.5px;font-weight:800;letter-spacing:.07em;color:hsl(var(--muted-foreground));margin-bottom:11px}
        .nb-md .empty-note{font-size:12.5px;font-weight:600;color:hsl(var(--muted-foreground));padding:6px 0 2px}
        .nb-md .story{font-size:13.5px;font-weight:500;color:var(--muted);line-height:1.65;padding:4px 0 2px}
        .nb-md .pkg{border:1px solid var(--line);border-radius:13px;padding:13px;margin-top:11px;display:flex;align-items:flex-start;gap:12px}
        .nb-md .pkg-m{flex:1;min-width:0}
        .nb-md .pkg-n{font-size:14px;font-weight:800;color:var(--ink)}
        .nb-md .pkg-d{font-size:12px;font-weight:600;color:var(--muted);margin-top:4px;line-height:1.5}
        .nb-md .pkg-p{font-size:15px;font-weight:800;color:var(--g900);flex-shrink:0;white-space:nowrap;text-align:right}
        .nb-md .pkg-p small{display:block;font-size:9px;font-weight:800;color:hsl(var(--muted-foreground));letter-spacing:.05em;margin-top:1px}
        .nb-md .hr{display:flex;justify-content:space-between;align-items:center;padding:11px 12px;border-radius:10px;font-size:13px;font-weight:600;color:var(--muted)}
        .nb-md .hr.today{background:var(--mint);border:1px solid var(--line)}
        .nb-md .hr b{color:var(--ink);font-weight:800}
        .nb-md .hr .td{font-size:9px;font-weight:800;letter-spacing:.06em;color:var(--g500);margin-left:6px}
        .nb-md .hr .cl{color:#dc2626;font-weight:800}
        .nb-md .cc-row{display:flex;align-items:center;gap:11px;padding:11px;border-radius:12px;border:1px solid var(--line);margin-bottom:8px;cursor:pointer;background:hsl(var(--card));width:100%;text-align:left;font-family:inherit;text-decoration:none;color:inherit}
        .nb-md .cc-row:last-child{margin-bottom:0}
        .nb-md .cc-i{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px}
        .nb-md .cc-i.call{background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.22)}
        .nb-md .cc-i.wa{background:rgba(37,211,102,.1);border:1px solid rgba(37,211,102,.3)}
        .nb-md .cc-i.ig{background:rgba(225,48,108,.08);border:1px solid rgba(225,48,108,.22)}
        .nb-md .cc-i.em{background:var(--mint);border:1px solid var(--line)}
        .nb-md .cc-t{flex:1;min-width:0}
        .nb-md .cc-l{font-size:13.5px;font-weight:800;color:var(--ink)}
        .nb-md .cc-s{font-size:11.5px;font-weight:600;color:var(--muted);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .nb-md .cc-a{font-size:14px;color:hsl(var(--muted-foreground));flex-shrink:0}
        .nb-md .pgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .nb-md .pcell{aspect-ratio:1;border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--mint2);cursor:pointer}
        .nb-md .pcell img{width:100%;height:100%;object-fit:cover}
        .nb-md .pcell.empty{background:hsl(var(--secondary));flex-direction:column;gap:4px;font-size:22px;color:hsl(var(--muted-foreground))}
        .nb-md .pcell.empty span{font-size:10px;font-weight:700}
        .nb-md .foot{background:hsl(var(--secondary));margin:6px -14px calc(-20px - var(--safe-bot));padding:22px 16px calc(26px + var(--safe-bot));border-top:1px solid var(--line)}
        .nb-md .fb{display:flex;align-items:center;gap:7px;margin-bottom:8px}
        .nb-md .fb .fn{font-family:'DM Serif Display',serif;font-size:16px;color:var(--g900)}
        .nb-md .fd{font-size:12px;font-weight:600;color:var(--muted);line-height:1.55;margin-bottom:12px}
        .nb-md .fcopy{font-size:10.5px;font-weight:600;color:hsl(var(--muted-foreground));padding-top:14px;border-top:1px solid var(--line);display:flex;justify-content:space-between;flex-wrap:wrap;gap:5px}
        .nb-md .sticky{position:fixed;left:0;right:0;bottom:0;z-index:70;background:hsl(var(--card)/0.9);backdrop-filter:blur(14px);border-top:1px solid var(--line);padding:11px 12px calc(15px + var(--safe-bot));display:flex;gap:7px;align-items:center;transform:translateY(120%);transition:transform .3s cubic-bezier(.32,.72,0,1)}
        .nb-md .sticky.show{transform:translateY(0)}
        .nb-md .s-ic{flex:1;min-width:0;height:50px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;border:none;color:#fff;font-family:inherit;font-size:13.5px;font-weight:800;text-decoration:none;white-space:nowrap;box-shadow:0 4px 14px rgba(31,58,46,.18)}
        .nb-md .s-ic svg{flex-shrink:0}
        .nb-md .s-ic.call{background:var(--call)}
        .nb-md .s-ic.wa{background:var(--wa)}
        .nb-md .s-ic.ig{background:linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)}
        .nb-md .scrim{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:150;opacity:0;pointer-events:none;transition:opacity .22s}
        .nb-md .scrim.show{opacity:1;pointer-events:auto}
        .nb-md .ms{position:fixed;left:0;right:0;bottom:0;z-index:160;background:hsl(var(--card));border-radius:24px 24px 0 0;transform:translateY(100%);transition:transform .3s cubic-bezier(.32,.72,0,1);padding:8px 20px calc(26px + var(--safe-bot));max-height:86vh;overflow-y:auto}
        .nb-md .ms.show{transform:translateY(0)}
        .nb-md .mg{padding:8px 0 14px;display:flex;justify-content:center}
        .nb-md .mg span{width:38px;height:5px;border-radius:3px;background:rgba(2,6,23,.16)}
        .nb-md .mh{font-family:'DM Serif Display',serif;font-size:20px;color:var(--g900);margin-bottom:3px}
        .nb-md .msb{font-size:12.5px;font-weight:600;color:var(--muted);margin-bottom:12px}
        .nb-md .mapbox{height:180px;border-radius:14px;overflow:hidden;position:relative;background:radial-gradient(circle at 50% 45%,#e8ecdf,#dce2d4);margin-bottom:12px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:34px}
        .nb-md .mbtn{width:100%;padding:14px;border-radius:13px;background:var(--g900);color:#fff;border:none;font-family:inherit;font-size:14.5px;font-weight:800;cursor:pointer;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none}
        .nb-md .mbtn.ghost{background:hsl(var(--card));border:1.5px solid hsl(var(--border));color:var(--g900);margin-top:9px}

        /* ── Airbnb-style tap / press interactions ── */
        .nb-md button,.nb-md a,.nb-md .cc-row,.nb-md .addr,.nb-md .pkg,.nb-md .pcell,.nb-md .gsl,.nb-md .tab{transition:transform .2s cubic-bezier(.2,.8,.2,1),background-color .18s ease,box-shadow .2s ease,border-color .18s ease,filter .15s ease}
        .nb-md .icb:active{transform:scale(.9);background:hsl(var(--muted))}
        .nb-md .act-ic:active{transform:scale(.97);filter:brightness(.97)}
        .nb-md .tab:active{transform:scale(.96)}
        .nb-md .addr:active{background:hsl(var(--muted))}
        .nb-md .cc-row:active{transform:scale(.99);background:hsl(var(--muted)/.5)}
        .nb-md .pcell:active,.nb-md .gsl:active{filter:brightness(.94)}
        .nb-md .mbtn:active{transform:scale(.985);filter:brightness(1.08)}
        .nb-md .mbtn.ghost:active{filter:none;background:hsl(var(--muted))}
        .nb-md .sendb:active{transform:scale(.985);filter:brightness(1.08)}
        .nb-md .s-ic:active{transform:scale(.97);filter:brightness(1.05)}
        .nb-md .cc-a{transition:transform .2s cubic-bezier(.2,.8,.2,1)}
        .nb-md .cc-row:active .cc-a{transform:translateX(2px)}
        @media (hover:hover){
          .nb-md .cc-row:hover{border-color:hsl(var(--primary)/.3);background:hsl(var(--muted)/.4)}
          .nb-md .cc-row:hover .cc-a{transform:translateX(2px)}
          .nb-md .addr:hover{border-color:hsl(var(--primary)/.35)}
          .nb-md .pkg:hover{border-color:hsl(var(--primary)/.3)}
          .nb-md .mbtn:hover,.nb-md .sendb:hover{filter:brightness(1.06)}
          .nb-md .act-ic:hover{background:hsl(var(--muted)/.5)}
          .nb-md .s-ic:hover{filter:brightness(1.05)}
          .nb-md .tab:hover:not(.on){background:hsl(var(--muted)/.6)}
          .nb-md .icb:hover{background:hsl(var(--muted))}
        }
        @media (prefers-reduced-motion:reduce){.nb-md *{transition:none!important}}
      `}</style>

      {/* sticky top bar */}
      <div className="crumb">
        <button className="icb" onClick={() => navigate(-1)} aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="crumbs">
          <b>{listing.name}</b>
        </div>
        <button className="icb" onClick={doShare} aria-label="Share">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
        </button>
      </div>

      {isPreview && (
        <div style={{ padding: "12px 16px 0" }}>
          <PreviewBanner status={listing.status} />
        </div>
      )}

      {/* gallery */}
      <div className="galwrap">
        <div className="gal" ref={galRef} onScroll={onGalScroll}>
          {galleryPhotos.length > 0 ? (
            galleryPhotos.map((src, i) => (
              <div className="gsl" key={i}><img src={src} alt={`${listing.name} photo ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} /></div>
            ))
          ) : (
            <div className="gsl empty">📷<span>No photos yet</span></div>
          )}
        </div>
        {galleryPhotos.length > 0 && <div className="gcount">{galIndex + 1} / {totalSlides}</div>}
      </div>

      {/* identity */}
      <div className="ident">
        <div className="id-row">
          <div className="id-ic">{listing.logoUrl ? <img src={listing.logoUrl} alt="" /> : emojiFor(listing.category)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="id-nm">{listing.name}</div>
            <div className="id-tags">
              <span className="id-cat">{listing.category}</span>
              {listing.uen && <span className="id-uen">UEN {listing.uen}</span>}
            </div>
          </div>
        </div>

        <button className="addr" onClick={openMapSheet}>
          <span className="addr-ic">📍</span>
          <span className="addr-t">
            <span className="addr-l">Location</span>
            <span className="addr-v">
              {[locationQuery, listing.district && !locationQuery.includes(listing.district) ? listing.district : null].filter(Boolean).join(", ")}
            </span>
          </span>
          <span className="addr-go">➤ Map</span>
        </button>

        <div className="actrow" ref={topActsRef}>
          {phone && (
            <a className="act-ic call" href={`tel:${phone}`} aria-label="Call">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .3 1.9.6 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.1a2 2 0 012.1-.5c.9.3 1.8.5 2.8.6a2 2 0 011.7 2z" /></svg>
              <span>Call</span>
            </a>
          )}
          {whatsappNumber && (
            <button className="act-ic wa" onClick={openWhatsApp} aria-label="WhatsApp">
              <WhatsAppIcon style={{ width: 20, height: 20 }} />
              <span>WhatsApp</span>
            </button>
          )}
          {instagramUrl && (
            <a className="act-ic ig" href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#C1306C" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.2" fill="#C1306C" stroke="none" /></svg>
              <span>Instagram</span>
            </a>
          )}
        </div>
      </div>

      {/* sticky tabs */}
      <div className="tabs">
        <button className={`tab ${tab === "ov" ? "on" : ""}`} onClick={() => setTab("ov")}>Overview</button>
        {hasCatalogue && <button className={`tab ${tab === "cat" ? "on" : ""}`} onClick={() => setTab("cat")}>Catalogue {catalogueItems.length > 0 && <span className="dt" />}</button>}
        <button className={`tab ${tab === "inf" ? "on" : ""}`} onClick={() => setTab("inf")}>Info</button>
        <button className={`tab ${tab === "ph" ? "on" : ""}`} onClick={() => setTab("ph")}>Photos</button>
      </div>

      <div className="body">
        {/* OVERVIEW */}
        <div className={`tp ${tab === "ov" ? "on" : ""}`}>
          <div className="c">
            <div className="ch">Our Story</div>
            {listing.description
              ? <div className="story">{listing.description}</div>
              : <div className="empty-note">This business hasn't added a story yet.</div>}
          </div>
        </div>

        {/* CATALOGUE */}
        {hasCatalogue && (
          <div className={`tp ${tab === "cat" ? "on" : ""}`}>
            <div className="c">
              <div className="ch">Catalogue</div>
              {catalogueItems.length > 0 ? (
                catalogueItems.map((it) => (
                  <div className="pkg" key={it.id}>
                    <div className="pkg-m">
                      <div className="pkg-n">{it.title}</div>
                      {it.description && <div className="pkg-d">{it.description}</div>}
                    </div>
                    {it.price && <div className="pkg-p">{it.price}</div>}
                  </div>
                ))
              ) : (
                <div className="empty-note">This business hasn't added any catalogue items yet.</div>
              )}
            </div>
          </div>
        )}

        {/* INFO */}
        <div className={`tp ${tab === "inf" ? "on" : ""}`}>
          <div className="c">
            <div className="ch" style={{ marginBottom: 9 }}>🕐 Operating Hours</div>
            {hourGroups.map(({ days, key }) => {
              const label = days.length === 1 ? shortName[days[0]] : `${shortName[days[0]]} – ${shortName[days[days.length - 1]]}`;
              const info = hours[days[0]];
              const isToday = days.includes(todayName);
              return (
                <div className={`hr ${isToday ? "today" : ""}`} key={label}>
                  <span>{label}{isToday && <span className="td">TODAY</span>}</span>
                  {key === "CLOSED" ? <span className="cl">Closed</span> : <b>{formatTime(info.open)} – {formatTime(info.close)}</b>}
                </div>
              );
            })}
          </div>
          <div className="c">
            <div className="ch-sm">LOCATION</div>
            <button className="addr" style={{ marginTop: 0 }} onClick={openMapSheet}>
              <span className="addr-ic">📍</span>
              <span className="addr-t"><span className="addr-v">
                {[locationQuery, listing.district && !locationQuery.includes(listing.district) ? listing.district : null].filter(Boolean).join(", ")}
              </span></span>
              <span className="addr-go">➤ Map</span>
            </button>
          </div>
          <div className="c">
            <div className="ch-sm">BUSINESS DETAILS</div>
            <div className="hr" style={{ padding: "9px 0" }}><span>Category</span><b>{listing.category}</b></div>
            {listing.uen && <div className="hr" style={{ padding: "9px 0" }}><span>UEN</span><b>{listing.uen}</b></div>}
          </div>
        </div>

        {/* PHOTOS */}
        <div className={`tp ${tab === "ph" ? "on" : ""}`}>
          <div className="c">
            <div className="ch" style={{ marginBottom: 12 }}>Photos</div>
            {galleryPhotos.length > 0 ? (
              <div className="pgrid">
                {galleryPhotos.map((src, i) => (
                  <div className="pcell" key={i}><img src={src} alt={`${listing.name} photo ${i + 1}`} loading="lazy" /></div>
                ))}
              </div>
            ) : (
              <div className="empty-note">No photos have been added yet.</div>
            )}
          </div>
        </div>

        {/* ENQUIRY FORM (visible under every tab) */}
        <div ref={enqRef}>
          <BusinessEnquiryForm listingId={listing.id} listingName={listing.name} ownerId={listing.ownerId} />
        </div>

      </div>

      {/* scroll-aware contact bar */}
      <div className={`sticky ${barShown ? "show" : ""}`}>
        {phone && <a className="s-ic call" href={`tel:${phone}`} aria-label="Call"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .3 1.9.6 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.1a2 2 0 012.1-.5c.9.3 1.8.5 2.8.6a2 2 0 011.7 2z" /></svg><span>Call</span></a>}
        {whatsappNumber && <button className="s-ic wa" onClick={openWhatsApp} aria-label="WhatsApp"><WhatsAppIcon style={{ width: 21, height: 21 }} /><span>WhatsApp</span></button>}
        {instagramUrl && <a className="s-ic ig" href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.2" fill="#fff" stroke="none" /></svg><span>Instagram</span></a>}
      </div>

      {/* map sheet */}
      <div className={`scrim ${mapOpen ? "show" : ""}`} onClick={() => setMapOpen(false)} />
      <div className={`ms ${mapOpen ? "show" : ""}`}>
        <div className="mg"><span /></div>
        <div className="mh">{listing.name}</div>
        <div className="msb">
          {[locationQuery, listing.district && !locationQuery.includes(listing.district) ? listing.district : null].filter(Boolean).join(", ")}
        </div>
        <div className="mapbox">
          <iframe
            title={`Map showing ${listing.name}`}
            src={embedUrl}
            style={{ width: "100%", height: "100%", border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <a className="mbtn" href={directionsUrl} target="_blank" rel="noopener noreferrer">➤ Get directions</a>
        <button className="mbtn ghost" onClick={() => setMapOpen(false)}>Close</button>
      </div>
    </div>
  );
};

export default MobileBusinessDetail;
