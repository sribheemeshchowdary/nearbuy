import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useGoogleOneTap } from "@/hooks/useGoogleOneTap";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useSearch } from "@/contexts/SearchContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ListingCard, { Listing, DEFAULT_OPERATING_HOURS, getIsOpenNow } from "@/components/ListingCard";
import ListingCardSkeleton from "@/components/ListingCardSkeleton";
import FeaturedListings from "@/components/FeaturedListings";

import CategoryHighlights from "@/components/CategoryHighlights";
import CategoryGrid from "@/components/CategoryGrid";

import MapView from "@/components/MapView";
import { Link, useNavigate } from "react-router-dom";
import { getBusinessUrl } from "@/lib/url-helpers";
import MobileHome from "@/components/MobileHome";
import MobileFiltersMap from "@/components/MobileFiltersMap";
import DistanceFilterCard, { type ActiveChip } from "@/components/DistanceFilterCard";
import { MapPin, SlidersHorizontal, Search, Map as MapIcon, ChevronRight, Clock, ArrowUpDown } from "lucide-react";
import { geocodeSingaporePostalCode } from "@/lib/geocode-pincode";
import { getDistance } from "@/lib/utils";
import { listingMatchesSearch } from "@/lib/listing-search";
import { useCategoryCatalog } from "@/hooks/useCategoryCatalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SINGAPORE_DISTRICTS, BUSINESS_CATEGORIES, DISTRICT_COORDINATES } from "@/lib/districts";
import { toast } from "sonner";
type ApproximateIpLocation = { lat: number; lng: number };
let approximateIpLocationPromise: Promise<ApproximateIpLocation | null> | null = null;
const LIVE_LISTING_STATUSES = [
  "approved",
  "Approved",
  "active",
  "Active",
  "published",
  "Published",
  "live",
  "Live",
  "visible",
  "Visible",
] as const;

/**
 * GeoJS supports browser requests and is cached for the lifetime of this page,
 * preventing duplicate network-location calls from concurrent detection flows.
 */
const getApproximateIpLocation = () => {
  if (approximateIpLocationPromise) return approximateIpLocationPromise;

  approximateIpLocationPromise = fetch("https://get.geojs.io/v1/ip/geo.json", {
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json() as { latitude?: string | number; longitude?: string | number };
      const lat = Number(data.latitude);
      const lng = Number(data.longitude);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    })
    .catch(() => null);

  return approximateIpLocationPromise;
};

/**
 * Map container height configuration.
 * Adjust these values to control map size across breakpoints.
 * - mobile: shown above listings on small screens (<768px)
 * - desktop: shown beside listings on md+ (sticky, scroll-with-page)
 * Use any valid CSS height value (vh, px, calc()).
 */
/**
 * Layout spacing tokens.
 * Tweak these to fine-tune map/list top spacing across breakpoints.
 * - headerHeight: fixed header height (used to offset sticky map below header)
 * - topPadding: extra breathing room between header and map/list
 * - mapHeight: explicit container height (auto-derived from header + padding on desktop)
 */
const LAYOUT = {
  headerHeight: { mobile: 64, desktop: 80 },   // px
  topPadding: { mobile: 12, desktop: 32 },   // px
} as const;

const MAP_HEIGHT = {
  mobile: "48vh",
  // Full available viewport height (minus header, top padding and a small
  // bottom gap) so the map and the listings column form one aligned panel.
  desktop: `calc(100vh - ${LAYOUT.headerHeight.desktop + LAYOUT.topPadding.desktop + 24}px)`,
} as const;

// Sticky top offset = header height + top padding
const STICKY_TOP_DESKTOP = `${LAYOUT.headerHeight.desktop + LAYOUT.topPadding.desktop}px`;

const CATEGORY_NAV = [
  { value: "Tuition", label: "Tuition", icon: "📚" },
  { value: "Baking", label: "Baking", icon: "🧁" },
  { value: "Music/Art/Craft", label: "Music/Art/Craft", icon: "🎨" },
  { value: "Home Food", label: "Home Food", icon: "🍱" },
  { value: "Wellness", label: "Wellness", icon: "🧘" },
  { value: "Beauty", label: "Beauty", icon: "💅" },
  { value: "Pet Services", label: "Pet Services", icon: "🐾" },
  { value: "Event Services", label: "Events", icon: "🎉" },
  { value: "Tailoring", label: "Tailoring", icon: "🧵" },
  { value: "Cleaning", label: "Cleaning", icon: "🧹" },
  { value: "Handyman", label: "Handyman", icon: "🔧" },
  { value: "Photography / Videography", label: "Photo / Video", icon: "📸" },
  { value: "Sports", label: "Sports", icon: "⚽" },
  { value: "Retail", label: "Retail", icon: "🛍️" },
];

interface IndexProps {
  showMap: boolean;
  setShowMap: (val: boolean) => void;
  registerDetectLocation: (fn: () => void) => void;
}

const Index = ({ showMap, setShowMap, registerDetectLocation }: IndexProps) => {
  const { searchQuery, setSearchQuery, setListings: setSearchListings, activeLocation, setActiveLocation, onDistrictSelect, onPincodeSearch } = useSearch();
  const { categoryNames } = useCategoryCatalog();
  const categoryNav = useMemo(
    () => categoryNames.map((name) => {
      const existing = CATEGORY_NAV.find((item) => item.value === name);
      return existing || { value: name, label: name, icon: "🏢" };
    }),
    [categoryNames],
  );
  const navigate = useNavigate();
  const [district, setDistrict] = useState("All Districts");
  const [categories, setCategories] = useState<string[]>([]);
  const toggleCategory = useCallback((val: string) => {
    setCategories((prev) => (prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]));
  }, []);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isFetchingListings, setIsFetchingListings] = useState(true);
  useEffect(() => { setShowMap(true); }, [setShowMap]);
  useGoogleOneTap(); // Show Google One Tap on homepage for returning users
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | undefined>({ lat: 1.3521, lng: 103.8198 });
  const [hoveredListingId, setHoveredListingId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(5);
  const radiusKmRef = useRef(radiusKm);
  radiusKmRef.current = radiusKm;
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [openNow, setOpenNow] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [pincode, setPincode] = useState("");
  const [pincodeAddress, setPincodeAddress] = useState("");
  const [pincodeLocation, setPincodeLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const listingsScrollRef = useRef<HTMLDivElement>(null);

  // --- Mobile Nearbuy Pattern States & Helpers ---
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);

  const [snap, setSnap] = useState(1); // 0: peek, 1: half, 2: full
  const [SH, setSH] = useState(() => typeof window !== "undefined" ? window.innerHeight : 760);
  const [translateY, setTranslateY] = useState(() => {
    const initialSH = typeof window !== "undefined" ? window.innerHeight : 760;
    return initialSH * 0.48;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartTranslateY = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSH(window.innerHeight);
      const handleResize = () => setSH(window.innerHeight);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const SNAPS = useMemo(() => [SH - 140, SH * 0.48, 70], [SH]);

  useEffect(() => {
    const handleToggleFilters = () => setIsFiltersSheetOpen(prev => !prev);
    window.addEventListener('toggleFiltersSheet', handleToggleFilters);
    return () => window.removeEventListener('toggleFiltersSheet', handleToggleFilters);
  }, []);

  useEffect(() => {
    if (!isDragging) {
      setTranslateY(SNAPS[snap]);
    }
  }, [snap, SNAPS, isDragging]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartY.current = e.touches[0].clientY;
    dragStartTranslateY.current = translateY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - dragStartY.current;
    let nextT = dragStartTranslateY.current + diff;
    nextT = Math.max(60, Math.min(SH - 100, nextT));
    setTranslateY(nextT);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    let closestIndex = 1;
    let minDiff = Infinity;
    SNAPS.forEach((s, idx) => {
      const diff = Math.abs(s - translateY);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });
    setSnap(closestIndex);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartTranslateY.current = translateY;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientY - dragStartY.current;
    let nextT = dragStartTranslateY.current + diff;
    nextT = Math.max(60, Math.min(SH - 100, nextT));
    setTranslateY(nextT);
  }, [isDragging, SH]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    let closestIndex = 1;
    let minDiff = Infinity;
    SNAPS.forEach((s, idx) => {
      const diff = Math.abs(s - translateY);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });
    setSnap(closestIndex);
  }, [isDragging, translateY, SNAPS]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getCategoryEmoji = (category: string) => {
    const map: Record<string, string> = {
      "Tuition": "📚",
      "Baking": "🧁",
      "Music/Art/Craft": "🎨",
      "Music & Arts": "🎨",
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
    return map[category] || "🏢";
  };

  const selectListing = (listing: Listing | null, fromPin = false) => {
    setSelectedListing(listing);
    if (listing) {
      if (listing.lat && listing.lng) {
        setMapCenter({ lat: listing.lat, lng: listing.lng });
      }
      if (fromPin) {
        setSnap(1); // snap to half view
        setTimeout(() => {
          const card = document.getElementById(`card-${listing.id}`);
          if (card) {
            card.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 120);
      }
    }
  };

  // Scroll to top on initial page load
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const mobileListingsRef = useRef<HTMLDivElement>(null);

  const scrollToListings = () => {
    setTimeout(() => {
      // Desktop: scroll the inner scrollable container to top
      if (listingsScrollRef.current) {
        listingsScrollRef.current.scrollTop = 0;
      }
      // Mobile: scroll the page so listings start at the top
      if (mobileListingsRef.current) {
        mobileListingsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const isInitialPageMount = useRef(true);
  useEffect(() => {
    if (isInitialPageMount.current) {
      isInitialPageMount.current = false;
      return;
    }
    requestAnimationFrame(() => {
      if (listingsScrollRef.current) {
        listingsScrollRef.current.scrollTop = 0;
        listingsScrollRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });
  }, [currentPage]);

  const handlePincodeSearch = useCallback(async (code: string) => {
    setPincode(code);
    if (code.length !== 6) { return; }
    const success = await onPincodeSearch(code);
    if (success) {
      if (!radiusKm) setRadiusKm(5);
      setShowMap(true);
      toast.success(`Searching near ${code}`);
    } else {
      toast.error("Invalid postal code — try a 6-digit Singapore postal code");
    }
  }, [onPincodeSearch, radiusKm, setShowMap]);

  const isInSingapore = (lat: number, lng: number) =>
    lat >= 1.15 && lat <= 1.48 && lng >= 103.6 && lng <= 104.1;

  const handleDetectLocation = useCallback(async (silent = false) => {
    const processCoordinates = async (latitude: number, longitude: number, source: string, accuracy: number) => {
      try {
        let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        let postal = "";
        let district = "";
        let block = "";
        let building = "";
        let road = "";

        const isSg = isInSingapore(latitude, longitude);
        const isHighAccuracy = accuracy <= 150;

        try {
          const { reverseGeocodeLocation } = await import("@/lib/geocode-pincode");
          const revGeo = await reverseGeocodeLocation(latitude, longitude);
          if (revGeo) {
            if (!isSg) {
              address = revGeo.address;
            } else if (isHighAccuracy) {
              address = revGeo.address;
            } else {
              address = revGeo.district
                ? `${revGeo.district}, Singapore (Approximate)`
                : `Singapore (Approximate)`;
            }
            postal = revGeo.postal;
            district = revGeo.district;
            block = revGeo.block || "";
            building = revGeo.building || "";
            road = revGeo.road || "";
          }
        } catch (err) {
          console.debug("Reverse geocoding failed", err);
        }

        setActiveLocation({ lat: latitude, lng: longitude, address, postal, district, block, building, road });

        if (!silent) {
          // One clean, non-technical confirmation instead of jargon-heavy toasts.
          if (source === "IP Geolocation") {
            toast.info("Using your approximate location.");
          } else {
            toast.success("Location updated.");
          }
        }
      } catch {
        if (!silent) toast.error("Couldn't pinpoint your location. Please try again.");
      }
    };

    const runTier3IPFallback = async () => {
      const location = await getApproximateIpLocation();
      if (location) {
        await processCoordinates(location.lat, location.lng, "IP Geolocation", 5000);
        return;
      }

      if (!silent) toast.error("Unable to acquire location.");
    };

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      await runTier3IPFallback();
      return;
    }

    let gpsPos: GeolocationPosition | null = null;
    let cellPos: GeolocationPosition | null = null;
    let gpsFinished = false;
    let cellFinished = false;

    const resolveBestLocation = () => {
      // Always prioritize GPS if it successfully returned a coordinate (highest real-world accuracy)
      if (gpsPos) {
        processCoordinates(gpsPos.coords.latitude, gpsPos.coords.longitude, "Hardware GPS", gpsPos.coords.accuracy);
      } else if (cellPos) {
        processCoordinates(cellPos.coords.latitude, cellPos.coords.longitude, "Mobile Network/Wi-Fi", cellPos.coords.accuracy);
      } else {
        runTier3IPFallback();
      }
    };

    // We set a 6-second window to resolve the location
    const timeoutId = setTimeout(() => {
      gpsFinished = true;
      cellFinished = true;
      resolveBestLocation();
    }, 6000);

    // Call 1: Hardware GPS (High Accuracy)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gpsPos = pos;
        gpsFinished = true;

        // If GPS returns exceptional accuracy (under 15m), we can resolve immediately
        if (pos.coords.accuracy <= 15) {
          clearTimeout(timeoutId);
          cellFinished = true;
          resolveBestLocation();
        } else if (cellFinished) {
          clearTimeout(timeoutId);
          resolveBestLocation();
        }
      },
      () => {
        gpsFinished = true;
        if (cellFinished) {
          clearTimeout(timeoutId);
          resolveBestLocation();
        }
      },
      { timeout: 5500, maximumAge: 0, enableHighAccuracy: true }
    );

    // Call 2: Mobile Network / Wi-Fi Triangulation (Low Accuracy)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cellPos = pos;
        cellFinished = true;

        if (gpsFinished) {
          clearTimeout(timeoutId);
          resolveBestLocation();
        }
      },
      () => {
        cellFinished = true;
        if (gpsFinished) {
          clearTimeout(timeoutId);
          resolveBestLocation();
        }
      },
      { timeout: 5500, maximumAge: 60000, enableHighAccuracy: false }
    );
  }, [setActiveLocation]);

  // Auto-detect high-accuracy location on initial load
  const hasAutoDetected = useRef(false);
  useEffect(() => {
    if (!hasAutoDetected.current) {
      hasAutoDetected.current = true;
      handleDetectLocation(true);
    }
  }, [handleDetectLocation]);



  useEffect(() => {
    setSearchListings(listings.map((l) => ({
      id: l.id,
      name: l.name,
      category: l.category,
      district: l.district,
      subcategoryList: l.subcategoryList,
      subcategoryData: l.subcategoryData,
      subcategory: (l as any).subcategory,
      subcategories: (l as any).subcategories,
      subjects: (l as any).subjects,
    })));
  }, [listings, setSearchListings]);

  // Synchronize component state with activeLocation from SearchContext
  useEffect(() => {
    if (activeLocation) {
      setUserLocation({ lat: activeLocation.lat, lng: activeLocation.lng });
      setMapCenter({ lat: activeLocation.lat, lng: activeLocation.lng });
      setDistrict(activeLocation.district || "All Districts");
      setPincode(activeLocation.postal);
      setPincodeAddress(activeLocation.address);
      setPincodeLocation(activeLocation.postal ? { lat: activeLocation.lat, lng: activeLocation.lng } : null);

      // If it is a district selection (no postal code), filter strictly by district name (radiusKm = null)
      if (!activeLocation.postal) {
        setRadiusKm(null);
      } else if (!radiusKmRef.current) {
        setRadiusKm(5);
      }
      setShowMap(true);
    } else {
      setPincode("");
      setPincodeAddress("");
      setPincodeLocation(null);
      setUserLocation(null);
      setDistrict("All Districts");
      setRadiusKm(null);
    }
  }, [activeLocation, setShowMap]);

  // Synchronize map coordinates when the district selection changes. Clearing
  // distance must remain "All SG" instead of being forced back to 3km.
  useEffect(() => {
    if (district !== "All Districts") {
      const coords = DISTRICT_COORDINATES[district];
      if (coords) {
        setMapCenter(coords);
        setRadiusKm(current => current === null ? 3 : current);
      }
    }
  }, [district]);


  useEffect(() => {
    // Real-time listener: unlike a one-shot getDocs (which fails and shows
    // "0 businesses" if Safari's first Firestore connection isn't ready yet),
    // onSnapshot waits for the connection and delivers data as soon as it's
    // available — no manual reload needed — and keeps the list live.
    const q = query(collection(db, "listings"), where("status", "in", LIVE_LISTING_STATUSES));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setListings(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Listing)));
        setIsFetchingListings(false);
      },
      (err) => {
        // Don't blank the list on a transient error; keep whatever we have.
        console.debug("listings listener error", err);
        setIsFetchingListings(false);
      },
    );
    return () => unsub();
  }, []);

  // Reset all active filters back to defaults (for empty-state CTA)
  const resetAllFilters = useCallback(() => {
    setSearchQuery("");
    setCategories([]);
    setRadiusKm(null);
    setOpenNow(false);
  }, [setSearchQuery]);


  // Priority: pincode > district > user GPS > map center. Ensures distances always render.
  const filterOrigin = useMemo(() =>
    pincodeLocation
    || (district !== "All Districts" ? DISTRICT_COORDINATES[district] : null)
    || userLocation
    || mapCenter
    || null,
    [pincodeLocation, district, userLocation, mapCenter]
  );


  const filtered = useMemo(() => {
    const result = listings.filter((l) => {
      const matchQ = listingMatchesSearch(l, searchQuery);
      // A postal code remains the search origin even when distance is set to
      // "All SG". Do not collapse it into a strict district-only filter.
      const matchD = (pincode || (radiusKm && filterOrigin))
        ? true
        : (district === "All Districts" || l.district === district);
      const matchC = categories.length === 0 || categories.includes(l.category);
      const matchR = !radiusKm || !filterOrigin
        ? true
        : (l.lat && l.lng ? getDistance(filterOrigin.lat, filterOrigin.lng, l.lat, l.lng) <= radiusKm : false);
      const matchO = !openNow || getIsOpenNow(l) === true;
      return matchQ && matchD && matchC && matchR && matchO;
    });
    if (filterOrigin) {
      result.sort((a, b) => {
        const distA = a.lat && a.lng ? getDistance(filterOrigin.lat, filterOrigin.lng, a.lat, a.lng) : Infinity;
        const distB = b.lat && b.lng ? getDistance(filterOrigin.lat, filterOrigin.lng, b.lat, b.lng) : Infinity;
        return distA - distB;
      });
    }
    return result;
  }, [listings, searchQuery, district, categories, radiusKm, filterOrigin, openNow, pincode]);

  const getListingDistance = (listing: { lat?: number; lng?: number }) => {
    if (!filterOrigin || !listing.lat || !listing.lng) return null;
    return getDistance(filterOrigin.lat, filterOrigin.lng, listing.lat, listing.lng);
  };

  // Live count of businesses within current radius of selected origin (also respects district + categories)
  const radiusCount = useMemo(() => {
    let base = categories.length === 0 ? listings : listings.filter(l => categories.includes(l.category));
    if (district !== "All Districts" && !pincode && !(radiusKm && filterOrigin)) {
      base = base.filter(l => l.district === district);
    }
    if (!filterOrigin) return base.length;
    const r = radiusKm ?? Infinity;
    return base.filter((l) => l.lat && l.lng && getDistance(filterOrigin.lat, filterOrigin.lng, l.lat, l.lng) <= r).length;
  }, [listings, filterOrigin, radiusKm, categories, district, pincode]);

  const originLabel = useMemo(() => {
    if (activeLocation) {
      if (activeLocation.postal) {
        return activeLocation.postal;
      }
      if (!activeLocation.postal && !activeLocation.block && !activeLocation.building && !activeLocation.road) {
        return activeLocation.district && activeLocation.district !== "All Districts" ? activeLocation.district : "Singapore";
      }
      const parts: string[] = [];
      if (activeLocation.block) parts.push(`Blk ${activeLocation.block}`);
      if (activeLocation.building) {
        parts.push(activeLocation.building);
      } else if (activeLocation.road) {
        parts.push(activeLocation.road);
      }
      if (activeLocation.district && activeLocation.district !== "All Districts") {
        parts.push(activeLocation.district);
      }
      return parts.length > 0 ? parts.join(", ") : activeLocation.address;
    }
    return district !== "All Districts" ? district : (userLocation ? "your location" : "Singapore");
  }, [activeLocation, district, userLocation]);




  const handleRadiusChange = useCallback((value: number | null) => {
    setRadiusKm(value);

    if (value === null) {
      setSelectedListing(null);
      return;
    }

    // Silent so background auto-detection never fires location toasts.
    if (!userLocation && !pincodeLocation && district === "All Districts") handleDetectLocation(true);
  }, [district, handleDetectLocation, pincodeLocation, userLocation]);

  useEffect(() => {
    registerDetectLocation(handleDetectLocation);
  }, [registerDetectLocation, handleDetectLocation]);

  const hasActiveFilters = searchQuery || district !== "All Districts" || categories.length > 0 || radiusKm !== null || openNow || pincode;
  const activeFilterCount = [district !== "All Districts", categories.length > 0, radiusKm !== null, openNow, !!searchQuery, !!pincode].filter(Boolean).length;

  const [sortBy, setSortBy] = useState<"default" | "name" | "distance">("default");

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [filtered, sortBy]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, categories, district, radiusKm, openNow, sortBy]);

  const totalPages = Math.ceil(sortedFiltered.length / ITEMS_PER_PAGE);
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedFiltered.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedFiltered, currentPage, ITEMS_PER_PAGE]);



  // Keyboard navigation for filter chip groups (roving focus)
  const handleChipKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const key = e.key;
    if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].includes(key)) return;
    const container = e.currentTarget.parentElement;
    if (!container) return;
    const chips = Array.from(container.querySelectorAll<HTMLButtonElement>("button[data-chip]"));
    const idx = chips.indexOf(e.currentTarget as HTMLButtonElement);
    if (idx === -1) return;
    e.preventDefault();
    let next = idx;
    if (key === "ArrowRight" || key === "ArrowDown") next = (idx + 1) % chips.length;
    else if (key === "ArrowLeft" || key === "ArrowUp") next = (idx - 1 + chips.length) % chips.length;
    else if (key === "Home") next = 0;
    else if (key === "End") next = chips.length - 1;
    chips[next]?.focus();
  };

  const scrollRevealRef = useScrollReveal<HTMLDivElement>();

  // Build active filter chips for the DistanceFilterCard
  const activeChips: ActiveChip[] = useMemo(() => {
    const chips: ActiveChip[] = [];
    if (pincode) {
      chips.push({
        key: "pincode",
        label: originLabel,
        emoji: "📍",
        onRemove: () => { setActiveLocation(null); },
      });
    } else if (district !== "All Districts") {
      chips.push({
        key: "district",
        label: district,
        emoji: "📍",
        onRemove: () => setDistrict("All Districts"),
      });
    }
    if (radiusKm !== null) {
      const lbl = radiusKm < 1 ? `${Math.round(radiusKm * 1000)}m` : `${radiusKm} km`;
      chips.push({
        key: "radius",
        label: `≤ ${lbl}`,
        onRemove: () => handleRadiusChange(null),
      });
    }
    categories.forEach((cat) => {
      const meta = categoryNav.find((c) => c.value === cat);
      chips.push({
        key: `cat-${cat}`,
        label: meta?.label ?? cat,
        emoji: meta?.icon,
        onRemove: () => toggleCategory(cat),
      });
    });
    if (openNow) {
      chips.push({ key: "open", label: "Open now", emoji: "⏰", onRemove: () => setOpenNow(false) });
    }
    if (searchQuery) {
      chips.push({ key: "q", label: `"${searchQuery}"`, emoji: "🔎", onRemove: () => setSearchQuery("") });
    }
    return chips;
  }, [pincode, district, radiusKm, categories, openNow, searchQuery, toggleCategory, setSearchQuery, originLabel, setActiveLocation, handleRadiusChange, categoryNav]);

  // On mobile, category pills are already shown above the distance bar — hide them from chips
  const mobileActiveChips = useMemo(
    () => activeChips.filter((c) => !c.key.startsWith("cat-")),
    [activeChips]
  );


  return (
    <div className="min-h-screen bg-background retro-dot-bg" ref={scrollRevealRef}>

      {/* ═══ MOBILE LAYOUT (≤ 768px) — faithful spec rebuild ═══ */}
      <div className="md:hidden">
        <MobileHome
          map={<MapView listings={sortedFiltered} selectedId={selectedListing?.id} hoveredId={hoveredListingId} onHoverListing={setHoveredListingId} onSelectListing={(l) => selectListing(l, true)} center={mapCenter} radiusKm={radiusKm} origin={filterOrigin} />}
          listings={sortedFiltered}
          resultsCount={sortedFiltered.length}
          loading={isFetchingListings}
          selectedId={selectedListing?.id}
          onSelectListing={(l) => selectListing(l, false)}
          getListingDistance={getListingDistance}
          categories={categories}
          availableCategories={categoryNav}
          toggleCategory={toggleCategory}
          onClearCategories={() => setCategories([])}
          radiusKm={radiusKm}
          onRadiusChange={handleRadiusChange}
          resetAllFilters={resetAllFilters}
          onDetectLocation={() => handleDetectLocation()}
          onApplyPostal={handlePincodeSearch}
          postal={pincode}
          originLabel={originLabel}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </div>

      {/* ═══ DESKTOP LAYOUT ═══ */}
      <div className="hidden md:block">

        {/* Desktop category chips — single horizontal scrollable line */}
        <div className="sticky top-14 z-30 bg-background border-b border-foreground/8">
          <div className="container mx-auto px-4 py-2.5 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 min-w-max" role="group" aria-label="Category filters">
              <button
                data-chip
                onClick={() => setCategories([])}
                onKeyDown={handleChipKeyDown}
                aria-pressed={categories.length === 0}
                className={`group inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border transition-all duration-300 shadow-[0_3px_10px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.12)] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 text-[11px] font-semibold whitespace-nowrap ${categories.length === 0
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-card border-border/80 text-foreground hover:bg-secondary/20"
                  }`}
              >
                All
              </button>
              {categoryNav.map((c) => (
                <button
                  key={c.value}
                  data-chip
                  onClick={() => toggleCategory(c.value)}
                  onKeyDown={handleChipKeyDown}
                  aria-pressed={categories.includes(c.value)}
                  aria-label={c.value}
                  className={`group inline-flex items-center gap-1.5 h-8 px-3 rounded-full border transition-all duration-300 shadow-[0_3px_10px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.12)] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 text-[11px] font-semibold whitespace-nowrap ${categories.includes(c.value)
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-card border-border/80 text-foreground hover:bg-secondary/20"
                    }`}
                >
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop split view */}
        <div className="container mx-auto px-4" style={{ paddingTop: LAYOUT.topPadding.desktop }}>
          <div className="flex gap-0">
            {/* LEFT: Listings — fixed-height pane, scrolls internally so the
                map beside it never moves while browsing businesses. */}
            <div className="min-w-0 w-[38%] border-r border-border pr-4 flex flex-col" style={{ height: MAP_HEIGHT.desktop }}>
              {/* Filter bar — pinned header of the pane */}
              <div className="shrink-0 bg-background pb-3">
                <DistanceFilterCard
                  count={sortedFiltered.length}
                  radiusKm={radiusKm}
                  setRadiusKm={handleRadiusChange}
                  chips={activeChips}
                  originLabel={originLabel}
                />
              </div>

              <div ref={listingsScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide pb-6">
                <div className="space-y-4">
                  {/* Results count */}
                  {!isFetchingListings && sortedFiltered.length > 0 && (
                    <div className="flex items-center justify-between pt-3 pb-1">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{sortedFiltered.length}</span> {sortedFiltered.length === 1 ? "result" : "results"}
                        {hasActiveFilters && " for your filters"}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={resetAllFilters}
                          className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  )}
                  {isFetchingListings ? (
                    <>
                      {Array.from({ length: 5 }).map((_, i) => <ListingCardSkeleton key={i} />)}
                    </>
                  ) : sortedFiltered.length === 0 ? (
                    <div className="text-center py-16 px-6 bg-card rounded-xl border-2 border-border/60 retro-shadow">
                      <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                      <p className="text-foreground font-semibold">No businesses found</p>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">Try widening your distance or clearing filters</p>
                      {hasActiveFilters && (
                        <Button onClick={resetAllFilters} size="sm" className="rounded-full">
                          Reset filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      {paginatedListings.map((listing, idx) => (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          index={(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                          highlighted={hoveredListingId === listing.id}
                          onHover={setHoveredListingId}
                          distanceKm={getListingDistance(listing)}
                          onSelect={(l) => {
                            setSelectedListing(l);
                            if (l.lat && l.lng) setMapCenter({ lat: l.lat, lng: l.lng });
                          }}
                        />
                      ))}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1.5 pt-4">
                          <button
                            onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); scrollToListings(); }}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-card text-foreground disabled:opacity-40 transition-colors hover:bg-secondary"
                          >
                            ‹ Prev
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                            .reduce<(number | "...")[]>((acc, p, i, arr) => {
                              if (i > 0 && p - (arr[i - 1]) > 1) acc.push("...");
                              acc.push(p);
                              return acc;
                            }, [])
                            .map((p, i) =>
                              p === "..." ? (
                                <span key={`dots-${i}`} className="px-1 text-sm text-muted-foreground">…</span>
                              ) : (
                                <button
                                  key={p}
                                  onClick={() => { setCurrentPage(p as number); scrollToListings(); }}
                                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${currentPage === p
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "border border-border bg-card text-foreground hover:bg-secondary"
                                    }`}
                                >
                                  {p}
                                </button>
                              )
                            )}
                          <button
                            onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); scrollToListings(); }}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border bg-card text-foreground disabled:opacity-40 transition-colors hover:bg-secondary"
                          >
                            Next ›
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Map — pinned beside the listings pane */}
            <div className="w-[62%] pl-4">
              <div className="sticky" style={{ top: STICKY_TOP_DESKTOP }}>
                <div className="w-full rounded-2xl overflow-hidden border border-border/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]" style={{ height: MAP_HEIGHT.desktop }}>
                  <MapView
                    listings={sortedFiltered}
                    selectedId={selectedListing?.id}
                    hoveredId={hoveredListingId}
                    onHoverListing={setHoveredListingId}
                    onSelectListing={setSelectedListing}
                    center={mapCenter}
                    radiusKm={radiusKm}
                    origin={filterOrigin}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop extras */}
        <section className="container mx-auto px-4 py-6" data-reveal>
          <CategoryGrid />
        </section>

        <section className="container mx-auto px-4 py-4" data-reveal>
          <CategoryHighlights />
        </section>
      </div>
    </div>
  );
};

export default Index;
