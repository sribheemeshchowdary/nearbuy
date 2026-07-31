import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import type { Listing } from "@/components/ListingCard";
import { getBusinessUrl } from "@/lib/url-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

/* Faithful port of Nearbuy_Mobile_Home.html, wired to real data.
   All styles are scoped under `.nb-mh`. Built for cross-device parity
   (iOS/Android): safe-area insets, non-passive drag, JS-measured snaps. */

const CATS: [string, string][] = [
  ["Tuition", "📚"], ["Baking", "🧁"], ["Music/Art/Craft", "🎨"], ["Home Food", "🍱"],
  ["Wellness", "🧘"], ["Beauty", "💅"], ["Pet Services", "🐾"], ["Event Services", "🎉"],
  ["Tailoring", "🧵"], ["Cleaning", "🧹"], ["Handyman", "🔧"], ["Photography / Videography", "📸"],
  ["Sports", "⚽"], ["Retail", "🛍️"],
];
const emojiFor = (c: string) => (CATS.find(([v]) => v === c)?.[1]) || "🏢";

const R_STEPS: (number | null)[] = [0.5, 1, 2, 3, 5, null];
const R_LABELS = ["500m", "1 km", "2 km", "3 km", "5 km", "All SG"];
const radiusPhrase = (r: number | null) => (r === null ? "all of SG" : r < 1 ? `${Math.round(r * 1000)}m` : `${r} km`);

type Sheet = "menu" | "loc" | "filters" | null;

interface Props {
  map: ReactNode;
  listings: Listing[];
  resultsCount: number;
  loading?: boolean;
  /** Currently selected listing — set when a map pin is tapped, so the
   *  matching result card can highlight and scroll into view. */
  selectedId?: string;
  onSelectListing: (l: Listing) => void;
  getListingDistance: (l: { lat?: number; lng?: number }) => number | null;
  categories: string[];
  availableCategories: Array<{ value: string; label: string; icon: string }>;
  toggleCategory: (v: string) => void;
  onClearCategories: () => void;
  radiusKm: number | null;
  onRadiusChange: (v: number | null) => void;
  resetAllFilters: () => void;
  onDetectLocation: () => void;
  onApplyPostal: (code: string) => void;
  postal: string;
  originLabel: string;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
}

const MobileHome = ({
  map, listings, resultsCount, loading, selectedId, onSelectListing, getListingDistance,
  categories, availableCategories, toggleCategory, onClearCategories, radiusKm, onRadiusChange,
  resetAllFilters, onDetectLocation, onApplyPostal, postal, originLabel,
  searchQuery, setSearchQuery,
}: Props) => {
  const categoryIcon = (category: string) =>
    availableCategories.find((item) => item.value === category)?.icon || emojiFor(category);
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin, isDevMode, devLogout } = useAuth();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [locInput, setLocInput] = useState(postal || "");

  const sheetRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const showmapRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef<HTMLDivElement>(null);
  const shdRef = useRef<HTMLDivElement>(null);

  // sheet drag state kept in a ref so listeners read fresh values
  const st = useRef({ H: 0, SNAPS: [0, 0, 0], snap: 1, dragging: false, startY: 0, startT: 0, moved: false });

  useEffect(() => {
    const S = st.current;
    const computeSnaps = () => {
      S.H = window.innerHeight;
      S.SNAPS = [S.H - 140, Math.round(S.H * 0.56), 150];
    };
    const place = (t: number) => {
      if (sheetRef.current) sheetRef.current.style.transform = `translateY(${t}px)`;
      if (fabRef.current) fabRef.current.style.bottom = `${S.H - t + 12}px`;
      if (showmapRef.current) {
        showmapRef.current.style.bottom = `${S.H - t + 12}px`;
        showmapRef.current.classList.toggle("show", t < S.H * 0.35);
      }
    };
    const snapTo = (i: number) => {
      S.snap = Math.max(0, Math.min(2, i));
      const tr = "transform .3s cubic-bezier(.32,.72,0,1)";
      if (sheetRef.current) sheetRef.current.style.transition = tr;
      if (fabRef.current) fabRef.current.style.transition = "bottom .3s cubic-bezier(.32,.72,0,1), transform .15s ease";
      if (showmapRef.current) showmapRef.current.style.transition = "bottom .3s cubic-bezier(.32,.72,0,1),opacity .2s,transform .2s";
      place(S.SNAPS[S.snap]);
      if (i < 2 && scrollRef.current) scrollRef.current.scrollTop = 0;
    };
    const clientY = (e: TouchEvent | MouseEvent) => ("touches" in e && e.touches[0] ? e.touches[0].clientY : (e as MouseEvent).clientY);
    const down = (e: TouchEvent | MouseEvent) => {
      S.dragging = true; S.moved = false;
      S.startY = clientY(e); S.startT = S.SNAPS[S.snap];
      if (sheetRef.current) sheetRef.current.style.transition = "none";
      if (fabRef.current) fabRef.current.style.transition = "none";
    };
    const move = (e: TouchEvent | MouseEvent) => {
      if (!S.dragging) return;
      const y = clientY(e);
      if (Math.abs(y - S.startY) > 4) S.moved = true;
      const t = Math.max(150, Math.min(S.H - 140, S.startT + (y - S.startY)));
      place(t);
      if ("cancelable" in e && e.cancelable) e.preventDefault();
    };
    const up = (e: TouchEvent | MouseEvent) => {
      if (!S.dragging) return;
      S.dragging = false;
      const y = "changedTouches" in e && e.changedTouches[0] ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;
      if (!S.moved) { snapTo(S.snap === 2 ? 1 : S.snap + 1); return; }
      const t = S.startT + (y - S.startY);
      let best = 0, bd = 1e9;
      S.SNAPS.forEach((s, i) => { const d = Math.abs(s - t); if (d < bd) { bd = d; best = i; } });
      snapTo(best);
    };
    const onResize = () => { computeSnaps(); place(S.SNAPS[S.snap]); };

    computeSnaps();
    const handles = [grabRef.current, shdRef.current].filter(Boolean) as HTMLElement[];
    handles.forEach((el) => {
      el.addEventListener("mousedown", down);
      el.addEventListener("touchstart", down, { passive: false });
      el.addEventListener("touchmove", move, { passive: false });
      el.addEventListener("touchend", up);
    });
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("resize", onResize);
    // expose snapTo for the "Show map" / logo buttons
    (st.current as any).snapTo = snapTo;
    snapTo(1);

    return () => {
      handles.forEach((el) => {
        el.removeEventListener("mousedown", down);
        el.removeEventListener("touchstart", down);
        el.removeEventListener("touchmove", move);
        el.removeEventListener("touchend", up);
      });
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const snapTo = (i: number) => (st.current as any).snapTo?.(i);

  // A map pin was tapped — surface its result card: lift the sheet out of the
  // collapsed peek state and scroll the matching card into view.
  useEffect(() => {
    if (!selectedId) return;
    const el = document.getElementById(`card-${selectedId}`);
    if (!el) return;
    if (st.current.snap === 0) snapTo(1);
    requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }, [selectedId]);

  const openSheet = (s: Sheet) => setSheet(s);
  const closeSheet = () => setSheet(null);
  const handleSignOut = async () => {
    closeSheet();
    if (isDevMode) {
      devLogout();
    } else {
      await signOut(auth);
    }
    navigate("/");
  };

  const applyPostal = () => {
    const v = locInput.trim();
    if (/^\d{6}$/.test(v)) onApplyPostal(v);
    closeSheet();
  };
  const useCurrentLocation = () => { onDetectLocation(); closeSheet(); };

  const filterCount = categories.length;
  const locLabel = /^\d{6}$/.test(postal) ? postal : (originLabel || "Singapore");

  return (
    <div className="nb-mh">
      <style>{`
        .nb-mh{--g900:hsl(var(--primary));--g800:hsl(var(--primary-glow));--g500:hsl(var(--primary-glow));--g300:hsl(var(--primary)/0.4);--mint:hsl(var(--primary)/0.06);--mint2:hsl(var(--primary)/0.1);--ink:hsl(var(--foreground));--muted:hsl(var(--muted-foreground));--line:hsl(var(--border));--safe-top:env(safe-area-inset-top,0px);font-family:'DM Sans',system-ui,sans-serif;color:var(--ink)}
        .nb-mh *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        .nb-mh .map{position:fixed;inset:0;z-index:1;overflow:hidden}
        .nb-mh .topscrim{position:fixed;top:0;left:0;right:0;height:120px;z-index:8;background:linear-gradient(180deg,rgba(240,243,238,.94),rgba(240,243,238,0));pointer-events:none}
        .nb-mh .fhead{position:fixed;top:calc(12px + var(--safe-top));left:12px;right:12px;z-index:45;display:flex;align-items:center;gap:7px}
        .nb-mh .logo{width:44px;height:44px;border-radius:14px;background:#fff;box-shadow:0 6px 20px rgba(2,6,23,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;border:none}
        .nb-mh .bar{flex:1;display:flex;align-items:stretch;height:44px;background:hsl(var(--card));border-radius:14px;box-shadow:0 6px 20px rgba(2,6,23,.15);overflow:hidden;min-width:0}
        .nb-mh .b-loc{display:flex;align-items:center;gap:5px;padding:0 9px 0 10px;cursor:pointer;flex-shrink:0;background:none;border:none;font-family:inherit;max-width:52%}
        .nb-mh .b-loc .ic{width:20px;height:20px;border-radius:50%;background:var(--g900);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .nb-mh .b-loc .pc{font-size:13.5px;font-weight:800;color:var(--g900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .nb-mh .b-loc .car{font-size:6px;color:hsl(var(--muted-foreground));flex-shrink:0}
        .nb-mh .b-div{width:1.5px;background:hsl(var(--border));margin:10px 0}
        .nb-mh .b-search{flex:1;display:flex;align-items:center;gap:6px;padding:0 10px;min-width:0;background:none;border:none;font-family:inherit;margin:0}
        .nb-mh .b-search-inp{flex:1;min-width:0;background:none;border:none;outline:none;font-family:inherit;font-size:13px;font-weight:600;color:var(--g900);padding:0}
        .nb-mh .b-search-inp::placeholder{color:hsl(var(--muted-foreground));font-weight:600}
        .nb-mh .b-search-inp::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
        .nb-mh .b-clear{flex-shrink:0;width:19px;height:19px;border:none;background:hsl(var(--muted));color:hsl(var(--muted-foreground));border-radius:50%;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;padding:0}
        .nb-mh .burger{width:44px;height:44px;border-radius:14px;background:hsl(var(--card));color:hsl(var(--foreground));box-shadow:0 6px 20px rgba(2,6,23,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;border:none}
        .nb-mh .fpill{position:fixed;top:calc(68px + var(--safe-top));left:12px;z-index:24;display:flex;align-items:center;gap:6px;padding:8px 13px;border-radius:11px;background:hsl(var(--card));box-shadow:0 4px 16px rgba(2,6,23,.16);font-size:12.5px;font-weight:800;color:var(--g900);cursor:pointer;border:none;font-family:inherit}
        .nb-mh .fpill .cnt{min-width:17px;height:17px;border-radius:9px;background:var(--g900);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 5px}
        .nb-mh .fab{position:fixed;right:12px;z-index:24;width:40px;height:40px;border-radius:12px;background:hsl(var(--card));color:hsl(var(--foreground));box-shadow:0 4px 16px rgba(2,6,23,.16);display:flex;align-items:center;justify-content:center;cursor:pointer;border:none}
        .nb-mh .showmap{position:fixed;left:50%;z-index:80;display:flex;align-items:center;gap:7px;padding:10px 18px;border-radius:999px;background:var(--g900);color:#fff;font-size:13px;font-weight:800;box-shadow:0 6px 20px rgba(31,58,46,.4);cursor:pointer;border:none;font-family:inherit;white-space:nowrap;opacity:0;pointer-events:none;transform:translateX(-50%) translateY(-6px);transition:opacity .2s,transform .2s}
        .nb-mh .showmap.show{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}
        .nb-mh .sheet{position:fixed;left:0;right:0;top:0;height:100vh;z-index:35;background:hsl(var(--card));border-radius:22px 22px 0 0;box-shadow:0 -8px 30px rgba(2,6,23,.18);display:flex;flex-direction:column;will-change:transform}
        .nb-mh .grab{padding:11px 0 7px;display:flex;justify-content:center;flex-shrink:0;cursor:grab;touch-action:none}
        .nb-mh .grab span{width:40px;height:5px;border-radius:3px;background:rgba(2,6,23,.18)}
        .nb-mh .shd{padding:0 18px 10px;display:flex;align-items:baseline;justify-content:space-between;flex-shrink:0;border-bottom:1px solid var(--line);touch-action:none;cursor:grab;gap:10px}
        .nb-mh .rad-line{font-family:'DM Serif Display',serif;font-size:15.5px;color:var(--g900)}
        .nb-mh .rad-line b{font-weight:400;font-style:italic;color:var(--g500)}
        .nb-mh .res-n{font-size:11.5px;font-weight:800;color:hsl(var(--muted-foreground));flex-shrink:0}
        .nb-mh .scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
        .nb-mh .card{display:flex;align-items:center;gap:11px;padding:11px;border-radius:14px;border:1.5px solid var(--line);margin:0 14px 9px;cursor:pointer;background:hsl(var(--card))}
        .nb-mh .card:first-child{margin-top:10px}
        .nb-mh .card.on{border-color:var(--g300);box-shadow:0 0 0 3px rgba(161,190,149,.2)}
        .nb-mh .card .ic{width:46px;height:46px;border-radius:12px;background:var(--mint2);border:1px solid rgba(161,190,149,.35);display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0;overflow:hidden}
        .nb-mh .card .ic img{width:100%;height:100%;object-fit:cover}
        .nb-mh .cnm{font-size:14.5px;font-weight:800;color:var(--ink)}
        .nb-mh .cmeta{font-size:11.5px;font-weight:600;color:var(--muted);margin-top:3px}
        .nb-mh .cd{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}
        .nb-mh .cdist{font-size:12.5px;font-weight:800;color:var(--g500)}
        .nb-mh .cgo{width:32px;height:32px;border-radius:50%;background:var(--g900);display:flex;align-items:center;justify-content:center}
        .nb-mh .empty{text-align:center;padding:40px 24px}
        .nb-mh .empty p{color:var(--muted);font-size:13.5px;font-weight:600}
        .nb-mh .spinner{width:26px;height:26px;margin:0 auto 12px;border-radius:50%;border:2.5px solid hsl(var(--primary)/0.15);border-top-color:hsl(var(--primary));animation:nbspin .7s linear infinite}
        @keyframes nbspin{to{transform:rotate(360deg)}}
        .nb-mh .empty button{margin-top:14px;padding:9px 16px;background:var(--g900);color:#fff;font-size:12px;font-weight:800;border:none;border-radius:12px;font-family:inherit;cursor:pointer}
        .nb-mh .sec{padding:18px 14px 4px}
        .nb-mh .sec-t{font-size:11px;font-weight:800;letter-spacing:.09em;color:hsl(var(--muted-foreground));text-align:center;margin-bottom:12px}
        .nb-mh .catgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .nb-mh .catc{border:1px solid var(--line);border-radius:13px;padding:12px 6px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;background:hsl(var(--card));font-family:inherit}
        .nb-mh .catc.on{border-color:var(--g300);background:var(--mint2)}
        .nb-mh .catc .ci{width:38px;height:38px;border-radius:10px;background:var(--mint);display:flex;align-items:center;justify-content:center;font-size:19px}
        .nb-mh .catc .cl{font-size:9.5px;font-weight:800;letter-spacing:.03em;color:var(--ink);text-align:center;line-height:1.25}
        .nb-mh .promos{padding:16px 14px 4px;display:flex;flex-direction:column;gap:10px}
        .nb-mh .promo{border-radius:16px;padding:16px;color:#fff;position:relative;min-height:92px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;overflow:hidden;border:none;font-family:inherit;text-align:left;width:100%}
        .nb-mh .promo .pt{font-size:16px;font-weight:800;line-height:1.2}
        .nb-mh .promo .ps{font-size:12px;font-weight:600;opacity:.9;margin-top:3px}
        .nb-mh .promo .pa{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:13px;margin-top:12px}
        .nb-mh .promo .pe{position:absolute;right:14px;bottom:10px;font-size:42px;opacity:.9}
        .nb-mh .foot{background:hsl(var(--secondary));margin-top:18px;padding:22px 16px calc(34px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line)}
        .nb-mh .fb{display:flex;align-items:center;gap:7px;margin-bottom:8px}
        .nb-mh .fb .fn{font-family:'DM Serif Display',serif;font-size:16px;color:var(--g900)}
        .nb-mh .fd{font-size:12px;font-weight:600;color:var(--muted);line-height:1.55;margin-bottom:12px}
        .nb-mh .fcopy{font-size:10.5px;font-weight:600;color:hsl(var(--muted-foreground));padding-top:14px;border-top:1px solid var(--line);display:flex;justify-content:space-between;flex-wrap:wrap;gap:5px;margin-top:12px}
        .nb-mh .scrim{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:150;opacity:0;pointer-events:none;transition:opacity .22s}
        .nb-mh .scrim.show{opacity:1;pointer-events:auto}
        .nb-mh .ms{position:fixed;left:0;right:0;bottom:0;z-index:160;background:hsl(var(--card));border-radius:24px 24px 0 0;transform:translateY(100%);transition:transform .3s cubic-bezier(.32,.72,0,1);padding:8px 20px calc(26px + env(safe-area-inset-bottom,0px));max-height:82vh;overflow-y:auto}
        .nb-mh .ms.show{transform:translateY(0)}
        .nb-mh .mg{padding:8px 0 14px;display:flex;justify-content:center}
        .nb-mh .mg span{width:38px;height:5px;border-radius:3px;background:rgba(2,6,23,.16)}
        .nb-mh .mh{font-family:'DM Serif Display',serif;font-size:20px;color:var(--g900);margin-bottom:3px}
        .nb-mh .msb{font-size:12.5px;font-weight:600;color:var(--muted);margin-bottom:12px}
        .nb-mh .mrow{display:flex;align-items:center;gap:12px;padding:15px 2px;font-size:14.5px;font-weight:700;color:var(--ink);cursor:pointer;border-top:1px solid var(--line);background:none;border-left:none;border-right:none;border-bottom:none;width:100%;font-family:inherit;text-align:left;text-decoration:none}
        .nb-mh .mrow .mi{width:24px;text-align:center;font-size:17px}
        .nb-mh .mrow .sub{font-size:11px;font-weight:600;color:var(--muted);margin-top:1px}
        .nb-mh .mrow .col{display:flex;flex-direction:column}
        .nb-mh .mrow .arr{margin-left:auto;font-size:12px;color:hsl(var(--muted-foreground))}
        .nb-mh .inp{width:100%;padding:12px 13px;border-radius:12px;border:1.5px solid hsl(var(--border));font-size:14px;font-weight:700;font-family:inherit;outline:none;margin-bottom:10px}
        .nb-mh .inp:focus{border-color:var(--g300)}
        .nb-mh .flab{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:hsl(var(--muted-foreground));margin:12px 0 9px}
        .nb-mh .chips{display:flex;flex-wrap:wrap;gap:7px}
        .nb-mh .chip{padding:7px 13px;border-radius:999px;font-size:12.5px;font-weight:700;border:1.5px solid var(--line);background:hsl(var(--card));color:hsl(var(--muted-foreground));cursor:pointer;font-family:inherit}
        .nb-mh .chip.on{background:linear-gradient(135deg,var(--g800),var(--g900));color:#fff;border-color:transparent}
        .nb-mh .mbtn{width:100%;padding:14px;border-radius:13px;background:var(--g900);color:#fff;border:none;font-family:inherit;font-size:14.5px;font-weight:800;cursor:pointer;margin-top:14px}
        .nb-mh .mbtn.ghost{background:hsl(var(--card));border:1.5px solid hsl(var(--border));color:var(--g900);margin-top:9px}
        .nb-mh .rval{font-size:13px;font-weight:700;color:var(--g900);margin-bottom:8px}
        .nb-mh .rval b{color:var(--g500)}
        .nb-mh input[type=range]{width:100%;-webkit-appearance:none;height:5px;border-radius:3px;background:hsl(var(--border));outline:none}
        .nb-mh input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:hsl(var(--card));border:2.5px solid var(--g500);box-shadow:0 2px 8px rgba(2,6,23,.2)}
        .nb-mh .ticks{display:flex;justify-content:space-between;margin-top:6px;font-size:10px;font-weight:600;color:hsl(var(--muted-foreground))}

        /* ── Airbnb-style tap / press interactions ── */
        .nb-mh button,.nb-mh a,.nb-mh .card,.nb-mh .catc,.nb-mh .chip,.nb-mh .promo,.nb-mh .mrow{transition:transform .2s cubic-bezier(.2,.8,.2,1),background-color .18s ease,box-shadow .2s ease,border-color .18s ease,filter .15s ease;-webkit-user-select:none;user-select:none}
        .nb-mh .logo:active,.nb-mh .burger:active,.nb-mh .fab:active{transform:scale(.9)}
        .nb-mh .fpill:active{transform:scale(.93)}
        .nb-mh .b-loc:active{background:hsl(var(--muted))}
        .nb-mh .b-clear:active{background:hsl(var(--border))}
        .nb-mh .card:active{transform:scale(.975);background:hsl(var(--muted)/.4)}
        .nb-mh .catc:active{transform:scale(.94)}
        .nb-mh .chip:active{transform:scale(.93)}
        .nb-mh .promo:active{transform:scale(.97);filter:brightness(.94)}
        .nb-mh .mrow:active{background:hsl(var(--muted)/.55)}
        .nb-mh .mbtn:active{transform:scale(.985);filter:brightness(1.08)}
        .nb-mh .mbtn.ghost:active{filter:none;background:hsl(var(--muted))}
        .nb-mh .showmap:active{filter:brightness(1.12)}
        .nb-mh .cgo{transition:transform .2s cubic-bezier(.2,.8,.2,1)}
        .nb-mh .card:active .cgo{transform:translateX(2px)}
        @media (hover:hover){
          .nb-mh .card:hover{border-color:hsl(var(--primary)/.3);box-shadow:0 6px 20px hsl(var(--foreground)/.07)}
          .nb-mh .card:hover .cgo{transform:translateX(2px)}
          .nb-mh .catc:hover{border-color:hsl(var(--primary)/.35);background:hsl(var(--primary)/.05)}
          .nb-mh .chip:hover{border-color:hsl(var(--primary)/.4)}
          .nb-mh .promo:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(2,6,23,.2)}
          .nb-mh .mbtn:hover{filter:brightness(1.06)}
          .nb-mh .mrow:hover{background:hsl(var(--muted)/.45)}
          .nb-mh .logo:hover,.nb-mh .burger:hover,.nb-mh .fpill:hover,.nb-mh .fab:hover{box-shadow:0 8px 26px rgba(2,6,23,.22)}
          .nb-mh .b-loc:hover{background:hsl(var(--muted)/.5)}
        }
        @media (prefers-reduced-motion:reduce){.nb-mh *{transition:none!important}}
      `}</style>

      {/* MAP (real MapView) */}
      <div className="map">{map}</div>
      <div className="topscrim" />

      {/* FLOATING HEADER */}
      <div className="fhead">
        <button className="logo" onClick={() => snapTo(1)} aria-label="Nearbuy home">
          <svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <path d="M20 4c-6.1 0-11 4.9-11 11 0 7.5 11 21 11 21s11-13.5 11-21c0-6.1-4.9-11-11-11z" fill="#1f3a2e" />
            <circle cx="20" cy="14.5" r="6.6" fill="#fff" />
            <rect x="16.4" y="12.4" width="1.9" height="5" rx=".5" fill="#4f7a5c" />
            <rect x="19.1" y="10.6" width="1.9" height="6.8" rx=".5" fill="#A1BE95" />
            <rect x="21.8" y="13.4" width="1.9" height="4" rx=".5" fill="#4f7a5c" />
            <path d="M24.9 19.3l3.4 3.4" stroke="#1f3a2e" strokeWidth="2.1" strokeLinecap="round" />
          </svg>
        </button>
        <div className="bar">
          <button className="b-loc" onClick={() => { setLocInput(postal || ""); openSheet("loc"); }} aria-label="Change location">
            <span className="ic"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg></span>
            <span className="pc">{locLabel}</span><span className="car">▼</span>
          </button>
          <div className="b-div" />
          <form className="b-search" onSubmit={(e) => { e.preventDefault(); (document.activeElement as HTMLElement | null)?.blur(); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(15,23,42,.35)" strokeWidth="2.2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input
              className="b-search-inp"
              type="search"
              enterKeyHint="search"
              placeholder="Search for a business"
              aria-label="Search for a business"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => snapTo(2)}
            />
            {searchQuery && (
              <button type="button" className="b-clear" aria-label="Clear search" onClick={() => setSearchQuery("")}>×</button>
            )}
          </form>
        </div>
        <button className="burger" onClick={() => openSheet("menu")} aria-label="Menu">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>

      <button className="fpill" onClick={() => openSheet("filters")}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
        Filters {filterCount > 0 && <span className="cnt">{filterCount}</span>}
      </button>
      <button className="fab" ref={fabRef} onClick={onDetectLocation} aria-label="Recenter map">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
      </button>

      <button className="showmap" ref={showmapRef} onClick={() => snapTo(1)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z" /><path d="M9 4v13M15 7v13" /></svg>
        Show map
      </button>

      {/* RESULTS SHEET */}
      <div className="sheet" ref={sheetRef}>
        <div className="grab" ref={grabRef}><span /></div>
        <div className="shd" ref={shdRef}>
          <div className="rad-line">
            {loading && resultsCount === 0
              ? <b>Finding businesses…</b>
              : <>{resultsCount} <b>businesses within {radiusPhrase(radiusKm)}</b></>}
          </div>
          <div className="res-n">{loading && resultsCount === 0 ? "" : `${resultsCount} results`}</div>
        </div>
        <div className="scroll" ref={scrollRef}>
          {loading && listings.length === 0 ? (
            <div className="empty">
              <div className="spinner" />
              <p>Loading businesses…</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="empty">
              <p>No businesses found. Try widening your distance or clearing filters.</p>
              <button onClick={resetAllFilters}>Reset Filters</button>
            </div>
          ) : (
            listings.map((b) => {
              const dist = getListingDistance(b);
              const distStr = dist !== null ? (dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`) : "";
              return (
                <div className={`card ${selectedId === b.id ? "on" : ""}`} id={`card-${b.id}`} key={b.id}
                  onClick={() => { onSelectListing(b); navigate(getBusinessUrl(b)); }}>
                  <div className="ic">{b.logoUrl ? <img src={b.logoUrl} alt="" /> : categoryIcon(b.category)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cnm">{b.name}</div>
                    <div className="cmeta">📍 {b.category} · {b.district}</div>
                  </div>
                  <div className="cd">
                    {distStr && <div className="cdist">{distStr}</div>}
                    <div className="cgo"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg></div>
                  </div>
                </div>
              );
            })
          )}

          <div className="sec">
            <div className="sec-t">BROWSE BY CATEGORY</div>
            <div className="catgrid">
              {availableCategories.map(({ value, icon }) => (
                <button className={`catc ${categories.includes(value) ? "on" : ""}`} key={value} onClick={() => { toggleCategory(value); snapTo(1); }}>
                  <div className="ci">{icon}</div>
                  <div className="cl">{value.toUpperCase()}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="promos">
            <button className="promo" style={{ background: "#2563EB" }} onClick={() => { onClearCategories(); toggleCategory("Home Food"); snapTo(1); }}><div><div className="pt">HOME FOOD</div><div className="ps">Fresh Home-cooked</div></div><div className="pa">→</div><div className="pe">🧑‍🍳</div></button>
            <button className="promo" style={{ background: "#0F9D58" }} onClick={() => { onClearCategories(); toggleCategory("Beauty"); snapTo(1); }}><div><div className="pt">BEAUTY</div><div className="ps">Book Now</div></div><div className="pa">→</div><div className="pe">💄</div></button>
            <button className="promo" style={{ background: "#9333EA" }} onClick={() => { onClearCategories(); toggleCategory("Cleaning"); snapTo(1); }}><div><div className="pt">CLEANING</div><div className="ps">Professional Services</div></div><div className="pa">→</div><div className="pe">🧹</div></button>
            <button className="promo" style={{ background: "#312E81" }} onClick={() => { onClearCategories(); toggleCategory("Pet Services"); snapTo(1); }}><div><div className="pt">PET SERVICES</div><div className="ps">Grooming &amp; Walking</div></div><div className="pa">→</div><div className="pe">🐕</div></button>
          </div>

          <div className="foot">
            <div className="fb">
              <svg width="22" height="22" viewBox="0 0 40 40" fill="none"><path d="M20 4c-6.1 0-11 4.9-11 11 0 7.5 11 21 11 21s11-13.5 11-21c0-6.1-4.9-11-11-11z" fill="#1f3a2e" /><circle cx="20" cy="14.5" r="6.6" fill="#fff" /></svg>
              <div className="fn">NearBuy</div>
            </div>
            <div className="fd">Singapore's trusted business directory. Discover, connect, and grow with local businesses.</div>
            <div className="fcopy"><span>© 2026 Nearbuy.SG. All rights reserved.</span><span>Privacy · Terms</span></div>
          </div>
        </div>
      </div>

      {/* MODAL SHEETS */}
      <div className={`scrim ${sheet ? "show" : ""}`} onClick={closeSheet} />

      <div className={`ms ${sheet === "menu" ? "show" : ""}`}>
        <div className="mg"><span /></div>
        <div className="mh">Menu</div>
        <div className="msb">{authLoading ? "Checking your account..." : user ? "You're signed in." : "Browse freely — no account needed."}</div>
        <Link className="mrow" to="/add-listing" onClick={closeSheet}><span className="mi">＋</span><span className="col"><span>List Your Business</span><span className="sub">Get discovered by nearby customers</span></span><span className="arr">›</span></Link>
        {!authLoading && user ? (
          <>
            <Link className="mrow" to={isAdmin ? "/admin" : "/dashboard"} onClick={closeSheet}><span className="mi">📊</span><span className="col"><span>{isAdmin ? "Admin Console" : "My Dashboard"}</span><span className="sub">Manage your listings</span></span><span className="arr">›</span></Link>
            <button className="mrow" type="button" onClick={handleSignOut}>
              <span className="mi"><LogOut size={17} aria-hidden="true" /></span>
              <span className="col"><span>Log out</span><span className="sub">Sign out of your account</span></span>
              <span className="arr">›</span>
            </button>
          </>
        ) : !authLoading ? (
          <Link className="mrow" to="/login" onClick={closeSheet}><span className="mi">👤</span><span className="col"><span>Log in</span><span className="sub">For business owners</span></span><span className="arr">›</span></Link>
        ) : null}
      </div>

      <div className={`ms ${sheet === "loc" ? "show" : ""}`}>
        <div className="mg"><span /></div>
        <div className="mh">Location</div>
        <div className="msb">Enter a 6-digit postal code.</div>
        <input className="inp" inputMode="numeric" maxLength={6} value={locInput}
          onChange={(e) => setLocInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => { if (e.key === "Enter") applyPostal(); }} />
        <button className="mbtn" onClick={applyPostal}>Apply</button>
        <button className="mbtn ghost" onClick={useCurrentLocation}>📡 Use my current location</button>
      </div>

      <div className={`ms ${sheet === "filters" ? "show" : ""}`}>
        <div className="mg"><span /></div>
        <div className="mh">Filters</div>
        <div className="flab">Category</div>
        <div className="chips">
          <button className={`chip ${categories.length === 0 ? "on" : ""}`} onClick={onClearCategories}>All</button>
          {availableCategories.map(({ value, label }) => (
            <button className={`chip ${categories.includes(value) ? "on" : ""}`} key={value} onClick={() => toggleCategory(value)}>{label}</button>
          ))}
        </div>
        <div className="flab">Distance</div>
        <div className="rval">Within <b>{radiusKm === null ? "All SG" : R_LABELS[R_STEPS.indexOf(radiusKm)] || `${radiusKm} km`}</b></div>
        <input type="range" min={0} max={5} value={radiusKm === null ? 5 : R_STEPS.indexOf(radiusKm)}
          onChange={(e) => onRadiusChange(R_STEPS[parseInt(e.target.value)])} />
        <div className="ticks"><span>500m</span><span>1km</span><span>2km</span><span>3km</span><span>5km</span><span>All SG</span></div>
        <button className="mbtn" onClick={closeSheet}>Show {resultsCount} results</button>
      </div>
    </div>
  );
};

export default MobileHome;
