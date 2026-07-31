import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus, Menu, X, LogOut, Shield, LayoutDashboard,
  MapPin, User, Search, ChevronDown, Crosshair, Loader2, SlidersHorizontal,
} from "lucide-react";

import { useSearch } from "@/contexts/SearchContext";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import AuthModal from "./AuthModal";
import SearchWithSuggestions from "./SearchWithSuggestions";
import nearbuyLogo from "@/assets/nearbuy-logo.png";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  showMap?: boolean;
  onToggleMap?: () => void;
  onDetectLocation?: () => void;
}

const POPULAR_DISTRICTS = [
  "All Districts",
  "Ang Mo Kio",
  "Bedok",
  "Bishan",
  "Bukit Timah",
  "CBD / Raffles Place",
  "Clementi",
  "Hougang",
  "Jurong East",
  "Jurong West",
  "Orchard",
  "Punggol",
  "Sengkang",
  "Tampines",
  "Woodlands",
  "Yishun",
];

const Header = ({ showMap, onToggleMap, onDetectLocation }: HeaderProps) => {
  const { user, loading: authLoading, isAdmin, isSuperAdmin, isDevMode, devLogout, role } = useAuth();
  const { activeLocation, setActiveLocation, onDistrictSelect, onPincodeSearch } = useSearch();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAuth, setShowAuth] = useState(false);

  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [mobileLocationOpen, setMobileLocationOpen] = useState(false);
  const [desktopLocationOpen, setDesktopLocationOpen] = useState(false);
  const setLocationOpen = (v: boolean) => { setMobileLocationOpen(v); setDesktopLocationOpen(v); };
  const [pincode, setPincode] = useState("");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const [resolvedLocation, setResolvedLocation] = useState<{ address: string; pincode: string; plusCode?: string } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<Array<{ address: string; postal: string; lat: number; lng: number }>>([]);
  const [addressSearching, setAddressSearching] = useState(false);

  const locationLabel = detectingLocation
    ? "Detecting location..."
    : activeLocation?.postal
      ? `📮 ${activeLocation.postal}`
      : activeLocation?.district && activeLocation.district !== "All Districts"
        ? activeLocation.district
        : selectedDistrict !== "All Districts"
          ? selectedDistrict
          : "Singapore";


  // Singapore bounding box (approx, includes outer islands buffer)
  const SG_BOUNDS = { minLat: 1.15, maxLat: 1.48, minLng: 103.55, maxLng: 104.10 };
  const inSingapore = (lat: number, lng: number) =>
    lat >= SG_BOUNDS.minLat && lat <= SG_BOUNDS.maxLat &&
    lng >= SG_BOUNDS.minLng && lng <= SG_BOUNDS.maxLng;

  const tryResolveCoords = async (lat: number, lng: number) => {
    const { nearestDistrict, fetchOneMap } = await import('@/lib/geocode-pincode');
    const isSG = inSingapore(lat, lng);
    const district = isSG ? nearestDistrict(lat, lng) : "";
    let address = district;
    let postal = "";
    let locality = district;
    let building = "";
    let road = "";
    let blk = "";

    if (isSG) {
      try {
        const res = await fetchOneMap(
          `/api/public/revgeocode?location=${lat},${lng}&buffer=500&addressType=All`
        );
        if (res.ok) {
          const data = await res.json();
          const info = data?.GeocodeInfo?.[0];
          if (info) {
            if (info.POSTALCODE && /^\d{6}$/.test(info.POSTALCODE)) postal = info.POSTALCODE;
            building = info.BUILDINGNAME && info.BUILDINGNAME !== "NIL" ? info.BUILDINGNAME : "";
            road = info.ROAD && info.ROAD !== "NIL" ? info.ROAD : "";
            blk = info.BLOCK && info.BLOCK !== "NIL" ? info.BLOCK : "";

            // Enrich via search API by postal code (gives proper BUILDING/BLK name)
            if (postal) {
              try {
                const sres = await fetchOneMap(
                  `/api/common/elastic/search?searchVal=${postal}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
                );
                if (sres.ok) {
                  const sdata = await sres.json();
                  const hit = sdata?.results?.find((r: any) => r.POSTAL === postal) || sdata?.results?.[0];
                  if (hit) {
                    if (hit.BUILDING && hit.BUILDING !== "NIL") building = hit.BUILDING;
                    if (hit.ROAD_NAME && hit.ROAD_NAME !== "NIL") road = hit.ROAD_NAME;
                    if (hit.BLK_NO && hit.BLK_NO !== "NIL") blk = hit.BLK_NO;
                  }
                }
              } catch { /* ignore */ }
            }

            const toTitle = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
            building = building ? toTitle(building) : "";
            road = road ? toTitle(road) : "";
            const street = [blk ? `Block ${blk}` : "", road].filter(Boolean).join(" ");
            // Format: pincode, building, block + road, Singapore
            const parts = [postal, building, street, "Singapore"].filter(Boolean);
            if (parts.length) address = parts.join(", ");
          }
        }
      } catch {
        // ignore
      }
    } else {

      // Worldwide fallback: OpenStreetMap Nominatim reverse geocoding
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { 'Accept': 'application/json' } }
        );
        if (res.ok) {
          const data = await res.json();
          const a = data?.address || {};
          const street = [a.road, a.neighbourhood, a.suburb].filter(Boolean)[0] || "";
          locality = a.city || a.town || a.village || a.county || a.state || "";
          const built = [a.house_number, street, locality].filter(Boolean).join(", ");
          address = built || data?.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          if (a.postcode) postal = String(a.postcode);
        } else {
          address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
      } catch {
        address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    }
    return { district, address, postal, locality, isSG, block: blk, building, road };
  };

  const detectDeviceLocation = (silent = false) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (!silent) {
        toast({
          title: "Location not supported",
          description: "Your browser/device doesn't support GPS location.",
          variant: "destructive",
        });
      }
      return;
    }

    // Check permission state up-front (mobile-friendly UX)
    const startWatch = () => {
      setDetectingLocation(true);

      let resolved = false;
      let bestFix: GeolocationPosition | null = null;
      let watchId: number | null = null;

      const finish = async () => {
        if (resolved || !bestFix) return;
        resolved = true;
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);

        const { latitude, longitude, accuracy } = bestFix.coords;

        try {
          // 1. Primary: OneMap revgeocode (Singapore-specific, best for building names)
          let { district, address, postal, locality, isSG, block, building, road } = await tryResolveCoords(latitude, longitude);

          // 2. If in SG but no postal/building came back, enrich via Google Maps SDK
          if (isSG && (!postal || !address || address === district)) {
            try {
              const { reverseGeocodeLocation } = await import('@/lib/geocode-pincode');
              const g = await reverseGeocodeLocation(latitude, longitude);
              if (g) {
                if (!postal && g.postal) postal = g.postal;
                if (g.address) address = g.address;
                if (g.district) district = g.district;
                block = g.block || block;
                building = g.building || building;
                road = g.road || road;
              }
            } catch { /* ignore */ }
          }

          const { encodePlusCode, shortPlusCode } = await import('@/lib/plus-code');
          const plusCode = shortPlusCode(encodePlusCode(latitude, longitude), locality || district || undefined);

          if (isSG && district) setSelectedDistrict(district);

          if (postal && isSG) {
            setPincode(postal);
            setResolvedLocation({ address, pincode: postal, plusCode });
            setAddressQuery(postal);
          } else {
            setPincode("");
            setResolvedLocation({
              address: address || locality || "Current location",
              pincode: postal || "Current",
              plusCode,
            });
            setAddressQuery(postal || address || "");
          }

          setActiveLocation({
            lat: latitude,
            lng: longitude,
            address: address || locality || "Current location",
            postal: postal || "",
            district: district || "",
            block: block || "",
            building: building || "",
            road: road || "",
          });

          if (!silent) {
            toast({
              title: "Location detected",
              description: address || `±${Math.round(accuracy || 0)}m accuracy`,
            });
          }
        } finally {
          setDetectingLocation(false);
        }
      };

      // Watch for ~12s to allow GPS to converge to a better fix on mobile
      const TIMEOUT_MS = 12000;
      const ACCEPT_ACCURACY = 50; // meters — accept fix immediately if <=50m

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!bestFix || (pos.coords.accuracy || Infinity) < (bestFix.coords.accuracy || Infinity)) {
            bestFix = pos;
          }
          if (bestFix && (bestFix.coords.accuracy || Infinity) <= ACCEPT_ACCURACY) {
            finish();
          }
        },
        (err) => {
          if (watchId !== null) navigator.geolocation.clearWatch(watchId);
          if (bestFix) { finish(); return; }
          setDetectingLocation(false);
          if (silent) return;
          const map: Record<number, string> = {
            1: "Location permission was denied. Please enable it in your browser/device settings.",
            2: "GPS unavailable. Check that location services are on.",
            3: "Took too long to get a GPS fix. Try again outdoors.",
          };
          toast({
            title: "Couldn't detect location",
            description: map[err.code] || err.message || "Unknown error.",
            variant: "destructive",
          });
        },
        { timeout: TIMEOUT_MS, maximumAge: 0, enableHighAccuracy: true }
      );

      // Safety: force-finish after timeout using best fix so far
      setTimeout(() => { if (!resolved) finish(); else if (!bestFix) setDetectingLocation(false); }, TIMEOUT_MS + 500);
    };

    if (typeof navigator !== "undefined" && (navigator as any).permissions?.query) {
      (navigator as any).permissions.query({ name: "geolocation" }).then((p: any) => {
        if (p.state === "denied") {
          if (!silent) {
            toast({
              title: "Location access blocked",
              description: "Enable location for this site in your browser settings, then tap detect again.",
              variant: "destructive",
            });
          }
          return;
        }
        startWatch();
      }).catch(() => startWatch());
    } else {
      startWatch();
    }
  };

  // Synchronize Header UI states with global activeLocation
  useEffect(() => {
    if (activeLocation) {
      setSelectedDistrict(activeLocation.district || "All Districts");
      setPincode(activeLocation.postal);
      setResolvedLocation({
        address: activeLocation.address,
        pincode: activeLocation.postal || activeLocation.district,
      });
    } else {
      setSelectedDistrict("All Districts");
      setPincode("");
      setResolvedLocation(null);
    }
  }, [activeLocation]);

  // Auto-detect device location silently on first visit
  useEffect(() => {
    const checkPersisted = localStorage.getItem("nearbuy_active_location");
    if (!checkPersisted) {
      detectDeviceLocation(true);
    }
  }, []);

  const handleDistrictSelect = (d: string) => {
    setLocationOpen(false);
    onDistrictSelect(d);
  };

  const handleAddressSearch = async (q: string) => {
    const query = q.trim();
    if (query.length < 3) { setAddressResults([]); return; }
    setAddressSearching(true);
    try {
      const { fetchOneMap } = await import('@/lib/geocode-pincode');
      const res = await fetchOneMap(
        `/api/common/elastic/search?searchVal=${encodeURIComponent(query)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
      );
      if (res.ok) {
        const data = await res.json();
        const items = (data?.results || []).slice(0, 8).map((r: any) => ({
          address: r.ADDRESS || r.SEARCHVAL,
          postal: r.POSTAL && r.POSTAL !== "NIL" ? r.POSTAL : "",
          lat: parseFloat(r.LATITUDE),
          lng: parseFloat(r.LONGITUDE),
          building: r.BUILDING && r.BUILDING !== "NIL" ? r.BUILDING : "",
          road: r.ROAD_NAME && r.ROAD_NAME !== "NIL" ? r.ROAD_NAME : "",
          block: r.BLK_NO && r.BLK_NO !== "NIL" ? r.BLK_NO : "",
        }));
        setAddressResults(items);
      }
    } catch {
      setAddressResults([]);
    } finally {
      setAddressSearching(false);
    }
  };

  const applyAddressResult = async (r: {
    address: string;
    postal: string;
    lat: number;
    lng: number;
    building?: string;
    road?: string;
    block?: string;
  }) => {
    const { nearestDistrict } = await import('@/lib/geocode-pincode');
    const { encodePlusCode, shortPlusCode } = await import('@/lib/plus-code');
    const district = nearestDistrict(r.lat, r.lng, r.postal);
    const plusCode = shortPlusCode(encodePlusCode(r.lat, r.lng), district);
    setSelectedDistrict(district);
    setPincode(r.postal);
    setResolvedLocation({ address: r.address, pincode: r.postal || district, plusCode });
    setAddressQuery(r.postal || r.address);
    setAddressResults([]);
    setLocationOpen(false);

    let block = r.block || "";
    let building = r.building || "";
    let road = r.road || "";

    if (!block && !building && r.postal) {
      try {
        const { geocodeSingaporePostalCode } = await import('@/lib/geocode-pincode');
        const g = await geocodeSingaporePostalCode(r.postal);
        if (g) {
          block = g.block;
          building = g.building;
          road = g.road;
        }
      } catch { }
    }

    const toTitle = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    if (building) building = toTitle(building);
    if (road) road = toTitle(road);

    setActiveLocation({
      lat: r.lat,
      lng: r.lng,
      address: r.address,
      postal: r.postal,
      district: district,
      block,
      building,
      road,
    });
  };

  const handlePincodeLookup = async (val: string) => {
    setPincodeError("");
    if (!/^\d{6}$/.test(val)) {
      setPincodeError("Enter a valid 6-digit Singapore postal code");
      return;
    }
    setPincodeLoading(true);
    try {
      const wasOffHome = location.pathname !== "/";
      if (wasOffHome) navigate("/");

      const { geocodeSingaporePostalCode, nearestDistrict, fetchOneMap } = await import('@/lib/geocode-pincode');
      const result = await geocodeSingaporePostalCode(val);
      if (!result) {
        setPincodeError("Postal code not found");
        return;
      }
      const nearest = result.district;

      // Enrich with building/road for the same format as detect-location
      let building = "";
      let road = "";
      let blk = "";
      try {
        const sres = await fetchOneMap(
          `/api/common/elastic/search?searchVal=${val}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
        );
        if (sres.ok) {
          const sdata = await sres.json();
          const hit = sdata?.results?.find((r: any) => r.POSTAL === val) || sdata?.results?.[0];
          if (hit) {
            if (hit.BUILDING && hit.BUILDING !== "NIL") building = hit.BUILDING;
            if (hit.ROAD_NAME && hit.ROAD_NAME !== "NIL") road = hit.ROAD_NAME;
            if (hit.BLK_NO && hit.BLK_NO !== "NIL") blk = hit.BLK_NO;
          }
        }
      } catch { /* ignore */ }
      const toTitle = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
      const finalBlk = blk || result.block;
      const finalBuilding = building ? toTitle(building) : result.building;
      const finalRoad = road ? toTitle(road) : result.road;

      const street = [finalBlk ? `Block ${finalBlk}` : "", finalRoad].filter(Boolean).join(" ");
      const parts = [
        val,
        finalBuilding,
        street,
        "Singapore",
      ].filter(Boolean);
      const formatted = parts.length > 1 ? parts.join(", ") : result.address;

      setSelectedDistrict(nearest);
      setResolvedLocation({ address: formatted, pincode: val });
      setAddressQuery(val);
      setAddressResults([]);
      setLocationOpen(false);

      setActiveLocation({
        lat: result.lat,
        lng: result.lng,
        address: formatted,
        postal: val,
        district: nearest,
        block: finalBlk,
        building: finalBuilding,
        road: finalRoad,
      });
    } catch {
      setPincodeError("Lookup failed, try again");
    } finally {
      setPincodeLoading(false);
    }
  };

  const renderLocationOverride = () => (
    <div className="mb-3 pb-3 border-b border-border/40 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Change Location</label>
        <button
          type="button"
          onClick={() => detectDeviceLocation()}
          disabled={detectingLocation}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {detectingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
          {detectingLocation ? "Detecting…" : "Detect again"}
        </button>
      </div>
      <div className="relative">
        <input
          type="text"
          value={addressQuery}
          placeholder="Search address, area, building…"
          className="w-full h-8 px-2.5 pr-7 rounded-md border-2 border-border/60 bg-background text-sm focus:outline-none focus:border-primary/50"
          onChange={(e) => { setAddressQuery(e.target.value); handleAddressSearch(e.target.value); }}
        />
        {addressSearching && <Loader2 className="absolute right-2 top-2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>
      {addressResults.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border/60 bg-card divide-y divide-border/40">
          {addressResults.map((r, i) => (
            <button
              key={i}
              onClick={() => applyAddressResult(r)}
              className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-secondary transition-colors"
            >
              <p className="font-medium text-foreground line-clamp-2">{r.address}</p>
              {r.postal && <p className="text-muted-foreground text-[10px] mt-0.5">📮 {r.postal}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const handleClearLocation = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setPincodeError("");
    setActiveLocation(null);
  };

  const handleSignOut = async () => {
    if (isDevMode) { devLogout(); return; }
    await signOut(auth);
  };

  const isHome = location.pathname === "/";

  const locationPopoverContent = (
    <PopoverContent className="w-80 p-4 max-h-[460px] overflow-y-auto rounded-2xl shadow-xl border border-border bg-card space-y-4" align="start">
      {/* Active Location Header */}
      {resolvedLocation ? (
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Active Location
            </span>
            <button
              onClick={() => handleClearLocation()}
              className="text-[10px] font-bold text-destructive hover:underline"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-2">
            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-foreground">
              {resolvedLocation.pincode}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground font-medium">No custom location selected. Showing all SG.</p>
        </div>
      )}

      {/* Action 1: GPS Detect Button */}
      <button
        type="button"
        onClick={() => detectDeviceLocation()}
        disabled={detectingLocation}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 text-primary hover:border-primary/45 transition-colors disabled:opacity-50 text-xs font-semibold"
      >
        {detectingLocation ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Crosshair className="w-4 h-4" />
        )}
        {detectingLocation ? "Detecting GPS Location..." : "Use Current GPS Location"}
      </button>

      {/* Action 2: Standard Address / Postal Input */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search Postal Code or Area</label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={addressQuery}
            placeholder="Enter 6-digit postal code or street..."
            className="w-full h-9 pl-9 pr-8 rounded-xl border border-border/80 bg-background text-xs focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            onChange={(e) => {
              const v = e.target.value;
              setAddressQuery(v);
              setPincodeError("");
              const digits = v.replace(/\D/g, '');
              if (/^\d{6}$/.test(v.trim())) {
                setPincode(digits);
                handlePincodeLookup(digits);
                setAddressResults([]);
              } else {
                handleAddressSearch(v);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && /^\d{6}$/.test(addressQuery.trim())) {
                handlePincodeLookup(addressQuery.trim());
              }
            }}
          />
          {(addressSearching || pincodeLoading) && (
            <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {addressResults.length > 0 && (
          <div className="mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-border/60 bg-card divide-y divide-border/40 shadow-inner">
            {addressResults.map((r, i) => (
              <button
                key={i}
                onClick={() => applyAddressResult(r)}
                className="w-full text-left px-3 py-2 text-[11px] hover:bg-secondary transition-colors"
              >
                <p className="font-semibold text-foreground line-clamp-2 leading-tight">{r.address}</p>
                {r.postal && <p className="text-muted-foreground text-[10px] mt-0.5">📮 Postal {r.postal}</p>}
              </button>
            ))}
          </div>
        )}

        {pincodeError && (
          <p className="text-[11px] font-medium text-destructive mt-1 px-1">{pincodeError}</p>
        )}
      </div>

      {/* Action 3: Popular Districts */}
      <div className="border-t border-border/40 pt-3">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Popular Districts</label>
        <div className="grid grid-cols-2 gap-1.5">
          {POPULAR_DISTRICTS.map((d) => (
            <button
              key={d}
              onClick={() => handleDistrictSelect(d)}
              className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors border ${selectedDistrict === d
                  ? "bg-primary border-primary text-primary-foreground font-semibold"
                  : "hover:bg-secondary border-border/60 hover:border-border text-foreground"
                }`}
            >
              {d === "All Districts" ? "All of Singapore" : d}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Account Section */}
      <div className="md:hidden border-t border-border/40 pt-3">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Account</label>
        {!authLoading && user ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 px-2.5 py-1 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Link
                to="/dashboard"
                onClick={() => setLocationOpen(false)}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border border-border/60 hover:bg-secondary text-foreground transition-colors font-medium"
              >
                <LayoutDashboard className="w-3 h-3" /> Dashboard
              </Link>
              {isSuperAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setLocationOpen(false)}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border border-border/60 hover:bg-secondary text-foreground transition-colors font-medium"
                >
                  <Shield className="w-3 h-3" /> Admin
                </Link>
              )}
              <button
                onClick={() => {
                  setLocationOpen(false);
                  handleSignOut();
                }}
                className="col-span-2 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border border-destructive/20 hover:bg-destructive/5 text-destructive transition-colors font-semibold"
              >
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setLocationOpen(false);
              setShowAuth(true);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl border-2 border-primary/30 bg-card text-foreground font-semibold hover:bg-primary/5 hover:border-primary/50 transition-colors text-xs"
          >
            <User className="w-3.5 h-3.5" /> Log in / Sign up
          </button>
        )}
      </div>
    </PopoverContent>
  );

  const mobileTitle = detectingLocation
    ? "Detecting..."
    : activeLocation?.postal
      ? activeLocation.postal
      : activeLocation?.district && activeLocation.district !== "All Districts"
        ? activeLocation.district
        : "Singapore";

  const mobileSubtitle = detectingLocation
    ? "Searching GPS..."
    : activeLocation?.postal
      ? "Active Location"
      : activeLocation?.district && activeLocation.district !== "All Districts"
        ? "District in SG"
        : "All of Singapore";

  return (
    <>
      {/* ═══ MOBILE HEADER — Minimal ═══ */}
      <header className="md:hidden sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-foreground/[0.07] h-14 px-4 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link to="/" className="flex items-center shrink-0">
          <div
            role="img"
            aria-label="NearBuy"
            className="h-6 w-[68px] bg-foreground"
            style={{
              WebkitMaskImage: `url(${nearbuyLogo})`,
              maskImage: `url(${nearbuyLogo})`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskSize: "contain",
              maskSize: "contain",
              WebkitMaskPosition: "center",
              maskPosition: "center",
            }}
          />
        </Link>

        {/* Location — minimal text trigger */}
        <Popover open={mobileLocationOpen} onOpenChange={setMobileLocationOpen}>
          <PopoverTrigger asChild>
            <button
              title={mobileSubtitle}
              className="flex-1 min-w-0 flex items-center justify-center gap-1.5 h-9 px-3 rounded-full hover:bg-foreground/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
            >
              <MapPin className="w-3.5 h-3.5 text-foreground/50 shrink-0" />
              <span className="text-[13px] font-medium text-foreground truncate max-w-[140px]">{mobileTitle}</span>
              <ChevronDown className="w-3 h-3 text-foreground/40 shrink-0" />
            </button>
          </PopoverTrigger>
          {locationPopoverContent}
        </Popover>

        {/* Filters — minimal icon */}
        {isHome ? (
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-foreground hover:bg-foreground/[0.06] transition-colors"
            aria-label="Filters"
            onClick={() => window.dispatchEvent(new Event('toggleFiltersSheet'))}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-9 h-9 shrink-0" />
        )}

        {/* Show logout only after authentication has completed successfully. */}
        {!authLoading && user && (
          <button
            type="button"
            onClick={handleSignOut}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-destructive hover:bg-destructive/5 transition-colors"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* ═══ DESKTOP HEADER — Minimal ═══ */}
      <header className="hidden md:block sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-foreground/[0.07]">
        <div className="container mx-auto px-6 h-14 flex items-center gap-6">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center shrink-0 transition-opacity hover:opacity-70">
            <div
              role="img"
              aria-label="NearBuy"
              className="h-6 w-[76px] bg-foreground"
              style={{
                WebkitMaskImage: `url(${nearbuyLogo})`,
                maskImage: `url(${nearbuyLogo})`,
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
          </Link>

          {/* Center: Minimal inline search — shown on every page (desktop) */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center w-full max-w-md h-9 rounded-full border border-foreground/[0.12] bg-foreground/[0.02] hover:border-foreground/20 focus-within:border-foreground/30 transition-colors">
              {/* Location */}
              <Popover open={desktopLocationOpen} onOpenChange={setDesktopLocationOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 h-full pl-4 pr-3 rounded-l-full text-foreground/70 hover:text-foreground transition-colors">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[12.5px] font-medium truncate max-w-[110px]">{locationLabel}</span>
                    <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
                  </button>
                </PopoverTrigger>
                {locationPopoverContent}
              </Popover>

              <div className="h-4 w-px bg-foreground/10 shrink-0" />

              {/* Search input */}
              <div className="flex-1 flex items-center h-full pl-3 pr-4 min-w-0">
                <Search className="w-3.5 h-3.5 text-foreground/40 shrink-0 mr-2" />
                <SearchWithSuggestions placeholder="Search" className="flex-1" />
              </div>
            </div>
          </div>

          {/* Right: Minimal actions */}
          <div className="ml-auto flex items-center gap-5 shrink-0">
            <Link
              to="/add-listing"
              className="hidden lg:inline text-[13px] font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              List your business
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full bg-foreground text-background text-[11px] font-semibold flex items-center justify-center uppercase hover:opacity-85 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                    {user.email?.[0] ?? "U"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-lg border-border/60 mt-2 p-1.5">
                  <div className="px-2.5 py-2">
                    <p className="text-[11px] text-muted-foreground">Signed in as</p>
                    <p className="text-xs font-semibold text-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/add-listing"><Plus className="w-4 h-4 mr-2" />Add Listing</Link>
                  </DropdownMenuItem>
                  {isSuperAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin"><Shield className="w-4 h-4 mr-2" />Admin Panel</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="text-[13px] font-semibold text-foreground hover:opacity-60 transition-opacity"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
};

export default Header;
