import { GoogleMap, MarkerF, InfoWindowF, OverlayViewF, OverlayView, CircleF, PolylineF } from "@react-google-maps/api";
import { Listing } from "./ListingCard";
import { getDistance } from "@/lib/utils";
import { getBusinessUrl } from "@/lib/url-helpers";
import { loadGoogleMapsApi } from "@/lib/google-maps-loader";
import { Loader2, MapPin } from "lucide-react";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";

export interface MapViewProps {
  listings: Listing[];
  selectedId?: string;
  hoveredId?: string | null;
  onSelectListing?: (listing: Listing) => void;
  onHoverListing?: (id: string | null) => void;
  center?: { lat: number; lng: number };
  radiusKm?: number | null;
  origin?: { lat: number; lng: number } | null;
}

const radiusToZoom = (km: number): number => {
  if (km <= 0.5) return 16;
  if (km <= 1) return 15;
  if (km <= 2) return 14;
  if (km <= 3) return 13;
  if (km <= 5) return 12;
  return 11;
};

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const DEFAULT_CENTER = { lat: 1.3521, lng: 103.8198 };
const MAP_STYLES = [
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [
      { "color": "#cce5f0" }
    ]
  },
  {
    "featureType": "landscape",
    "elementType": "geometry.fill",
    "stylers": [
      { "color": "#f7f7f4" }
    ]
  },
  {
    "featureType": "landscape.man_made",
    "elementType": "geometry.fill",
    "stylers": [
      { "color": "#f1f1eb" }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [
      { "color": "#e2ebd4" }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      { "color": "#ffffff" }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#e6e6e0" }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.fill",
    "stylers": [
      { "color": "#ffe3a8" }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      { "color": "#ffd47f" }
    ]
  },
  {
    "featureType": "poi.business",
    "elementType": "all",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "poi.medical",
    "elementType": "all",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "poi.school",
    "elementType": "all",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "all",
    "stylers": [
      { "visibility": "off" }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "labels.text.fill",
    "stylers": [
      { "color": "#3c5047" }
    ]
  }
];
const CATEGORY_EMOJI: Record<string, string> = {
  "Tuition": "📚",
  "Baking": "🧁",
  "Music/Art/Craft": "🎨",
  "Home Food": "🍱",
  "Wellness": "🧘",
  "Beauty": "💄",
  "Pet Services": "🐾",
  "Event Services": "🎉",
  "Tailoring": "🧵",
  "Cleaning": "🧹",
  "Handyman": "🔧",
  "Photography / Videography": "📷",
  "Sports": "⚽",
  "Retail": "🛍️",
};

const MapView = ({ listings, selectedId, hoveredId, onSelectListing, onHoverListing, center, radiusKm, origin }: MapViewProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pinClickRef = useRef(false);
  const clickedRef = useRef(false); // true when user explicitly clicked a pin
  const lastAppliedCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastAppliedRadiusRef = useRef<number | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [imgLoaded, setImgLoaded] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const circleCenter = origin || center;
  const displayRadius = radiusKm || (origin ? 5 : null);

  // Points around the radius for a dashed ring outline.
  const circlePath = useMemo(() => {
    if (!circleCenter || !displayRadius) return [] as { lat: number; lng: number }[];
    const latK = displayRadius / 110.574;
    const lngK = displayRadius / (111.32 * Math.cos((circleCenter.lat * Math.PI) / 180));
    const pts: { lat: number; lng: number }[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * 2 * Math.PI;
      pts.push({ lat: circleCenter.lat + latK * Math.cos(a), lng: circleCenter.lng + lngK * Math.sin(a) });
    }
    return pts;
  }, [circleCenter?.lat, circleCenter?.lng, displayRadius]);

  const mapOptions = useMemo(() => ({
    styles: MAP_STYLES,
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
    gestureHandling: "greedy",
  }), []);

  // Reset gallery index when active listing changes
  useEffect(() => { setGalleryIdx(0); }, [activeId]);

  const zoomIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const smoothZoomTo = useCallback((map: google.maps.Map, target: { lat: number; lng: number }, targetZoom: number) => {
    if (zoomIntervalRef.current) {
      clearInterval(zoomIntervalRef.current);
    }
    const currentZoom = map.getZoom() ?? 14;
    map.panTo(target);
    if (currentZoom === targetZoom) return;
    const step = targetZoom > currentZoom ? 1 : -1;
    let z = currentZoom;
    zoomIntervalRef.current = setInterval(() => {
      z += step;
      if ((step === 1 && z >= targetZoom) || (step === -1 && z <= targetZoom)) {
        map.setZoom(targetZoom);
        if (zoomIntervalRef.current) {
          clearInterval(zoomIntervalRef.current);
          zoomIntervalRef.current = null;
        }
        return;
      }
      map.setZoom(z);
    }, 120);
  }, []);

  // Clean up zoom intervals on unmount
  useEffect(() => {
    return () => {
      if (zoomIntervalRef.current) {
        clearInterval(zoomIntervalRef.current);
      }
    };
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.setCenter(center || DEFAULT_CENTER);
    map.setZoom(center ? (radiusKm ? radiusToZoom(radiusKm) : 17) : 14);
  }, [center, radiusKm]);

  // Sync hoveredId from parent → auto-open that marker's popup & flyTo (debounced)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (hoveredId) {
      setActiveId(hoveredId);
      hoverTimerRef.current = setTimeout(() => {
        const listing = listings.find(l => l.id === hoveredId);
        if (listing?.lat && listing?.lng && mapRef.current) {
          mapRef.current.panTo({ lat: listing.lat, lng: listing.lng });
        }
      }, 80);
    }
    return () => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); };
  }, [hoveredId, listings]);

  // Sync selectedId from parent
  useEffect(() => {
    if (selectedId) {
      setActiveId(selectedId);
      const listing = listings.find(l => l.id === selectedId);
      if (listing?.lat && listing?.lng && mapRef.current) {
        smoothZoomTo(mapRef.current, { lat: listing.lat, lng: listing.lng }, 16);
      }
    }
  }, [selectedId, listings]);

  // Sync center and radiusKm programmatically
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    if (!center) return;

    const centerChanged = !lastAppliedCenterRef.current ||
      lastAppliedCenterRef.current.lat !== center.lat ||
      lastAppliedCenterRef.current.lng !== center.lng;
    const radiusChanged = lastAppliedRadiusRef.current !== radiusKm;

    if (centerChanged || radiusChanged) {
      mapRef.current.panTo(center);
      mapRef.current.setZoom(radiusKm ? radiusToZoom(radiusKm) : 17);
      lastAppliedCenterRef.current = { lat: center.lat, lng: center.lng };
      lastAppliedRadiusRef.current = radiusKm;
    }
  }, [center, radiusKm, isLoaded]);

  // Auto-fit map bounds to filtered listings (when listings change)
  const listingsKey = listings.map(l => l.id).join(",");
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    if (center && radiusKm) return; // Managed by the center syncing hook above

    const pts = listings.filter(l => l.lat && l.lng);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      const p = pts[0];
      mapRef.current.panTo({ lat: p.lat!, lng: p.lng! });
      mapRef.current.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    pts.forEach(p => bounds.extend({ lat: p.lat!, lng: p.lng! }));
    mapRef.current.fitBounds(bounds, 60);
  }, [listingsKey, isLoaded]);

  // Zoom/pan to active location circle when no pins to fit
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !circleCenter || !displayRadius) return;
    const hasPins = listings.some(l => l.lat && l.lng);
    if (!hasPins) {
      smoothZoomTo(mapRef.current, circleCenter, radiusToZoom(displayRadius));
    }
  }, [circleCenter, displayRadius, listings, isLoaded]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setLoadError("Missing Google Maps API key");
      return;
    }

    let active = true;
    void loadGoogleMapsApi(GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (active) setIsLoaded(true);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Failed to load Google Maps");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary rounded-xl">
        <div className="text-center text-muted-foreground p-4">
          <p className="text-sm">Map temporarily unavailable</p>
          <p className="text-xs mt-1">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary rounded-xl">
        <div className="text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  const previewListing = listings.find(l => l.id === activeId);
  return (
    <GoogleMap
      onLoad={onMapLoad}
      mapContainerClassName="w-full h-full rounded-xl"
      options={mapOptions}
      onClick={() => { if (pinClickRef.current) { pinClickRef.current = false; return; } setActiveId(null); clickedRef.current = false; }}
    >
      {/* Distance radius — soft fill with a dashed on-brand ring */}
      {circleCenter && displayRadius && (
        <CircleF
          center={circleCenter}
          radius={displayRadius * 1000}
          options={{
            fillColor: "#1f3a2e",
            fillOpacity: 0.05,
            strokeOpacity: 0,
            clickable: false,
          }}
        />
      )}
      {circleCenter && displayRadius && circlePath.length > 0 && (
        <PolylineF
          path={circlePath}
          options={{
            strokeOpacity: 0,
            clickable: false,
            icons: [{
              icon: { path: "M 0,-1 0,1", strokeColor: "#1f3a2e", strokeOpacity: 0.7, strokeWeight: 2, scale: 3 },
              offset: "0",
              repeat: "16px",
            }],
          }}
        />
      )}
      {/* Minimal radius label resting on the top edge of the circle */}
      {circleCenter && displayRadius && (
        <OverlayViewF
          position={{ lat: circleCenter.lat + displayRadius / 110.574, lng: circleCenter.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div style={{ transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 1002 }}>
            <div className="bg-white/95 text-[#1f3a2e] font-semibold px-2.5 py-1 rounded-full shadow-[0_2px_10px_rgba(2,6,23,0.16)] text-[11px] leading-none whitespace-nowrap backdrop-blur-sm">
              {displayRadius >= 1 ? `${displayRadius} km` : `${Math.round(displayRadius * 1000)} m`} radius
            </div>
          </div>
        </OverlayViewF>
      )}

      {/* Selected location point marker */}
      {origin && (
        <OverlayViewF
          position={origin}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#2563eb",
              border: "2px solid white",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.25)",
              transform: "translate(-50%, -50%)",
              zIndex: 999,
              pointerEvents: "none",
            }}
            title="Selected Search Location"
          />
        </OverlayViewF>
      )}

      {/* Custom pin markers */}
      {listings.map((listing) => {
        if (!listing.lat || !listing.lng) return null;
        const isActive = listing.id === activeId || listing.id === hoveredId || listing.id === selectedId;
        const emoji = CATEGORY_EMOJI[listing.category] || "📍";

        return (
          <OverlayViewF
            key={listing.id}
            position={{ lat: listing.lat, lng: listing.lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                pinClickRef.current = true;
                clickedRef.current = true;
                setActiveId(listing.id);
                onSelectListing?.(listing);
                const card = document.querySelector(`[data-listing-id="${listing.id}"]`);
                if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              onMouseEnter={() => {
                if (!clickedRef.current) setActiveId(listing.id);
                onHoverListing?.(listing.id);
              }}
              onMouseLeave={() => {
                if (!clickedRef.current) setActiveId(null);
                onHoverListing?.(null);
              }}
              style={{
                width: isActive ? 46 : 38,
                height: isActive ? 46 : 38,
                borderRadius: "50%",
                background: "#1e352b",
                border: isActive ? "4.5px solid white" : "3.5px solid white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isActive ? 20 : 17,
                lineHeight: 1,
                boxShadow: isActive
                  ? "0 0 0 1px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.35), 0 4px 8px rgba(0,0,0,0.2)"
                  : "0 0 0 1px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.25)",
                cursor: "pointer",
                transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                transform: "translate(-50%, -50%)",
                zIndex: isActive ? 1000 : 1,
                position: "relative",
              }}
            >
              {emoji}
            </div>
          </OverlayViewF>
        );
      })}

      {/* InfoWindow popup for active marker */}
      {activeId && previewListing && previewListing.lat && previewListing.lng && (
        <InfoWindowF
          position={{ lat: previewListing.lat, lng: previewListing.lng }}
          onCloseClick={() => setActiveId(null)}
          options={{ pixelOffset: new google.maps.Size(0, -24), maxWidth: 220, disableAutoPan: false }}
        >
          <div style={{ width: 200, padding: 0 }}>
            {(() => {
              const gallery = [
                ...(previewListing.imageUrls || []),
                ...(previewListing.coverImage ? [previewListing.coverImage] : []),
                ...(previewListing.logoUrl ? [previewListing.logoUrl] : []),
              ].filter(Boolean) as string[];
              const unique = Array.from(new Set(gallery));
              const idx = Math.min(galleryIdx, Math.max(0, unique.length - 1));
              if (unique.length === 0) {
                return (
                  <div
                    onClick={() => navigate(getBusinessUrl(previewListing))}
                    style={{
                      width: "100%", height: 110, borderRadius: 8, marginBottom: 8,
                      background: "linear-gradient(135deg, #e8f1ee, #f5faf8)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 40, cursor: "pointer",
                    }}
                  >
                    {CATEGORY_EMOJI[previewListing.category] || "🏠"}
                  </div>
                );
              }
              return (
                <div style={{ position: "relative", marginBottom: 8 }}>
                  {!imgLoaded[unique[idx]] && (
                    <div
                      style={{
                        position: "absolute", inset: 0, height: 110, borderRadius: 8,
                        background: "linear-gradient(90deg, #eef3f1 0%, #f7faf9 50%, #eef3f1 100%)",
                        backgroundSize: "200% 100%",
                        animation: "mapImgShimmer 1.2s linear infinite",
                      }}
                    />
                  )}
                  <img
                    src={unique[idx]}
                    alt={previewListing.name}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setImgLoaded(prev => ({ ...prev, [unique[idx]]: true }))}
                    onClick={() => navigate(getBusinessUrl(previewListing))}
                    style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8, display: "block", cursor: "pointer", opacity: imgLoaded[unique[idx]] ? 1 : 0, transition: "opacity 0.2s ease" }}
                  />
                  {/* Preload next image */}
                  {unique.length > 1 && (
                    <img
                      src={unique[(idx + 1) % unique.length]}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onLoad={() => setImgLoaded(prev => ({ ...prev, [unique[(idx + 1) % unique.length]]: true }))}
                      style={{ display: "none" }}
                    />
                  )}
                  {unique.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setGalleryIdx((idx - 1 + unique.length) % unique.length); }}
                        style={{
                          position: "absolute", top: "50%", left: 4, transform: "translateY(-50%)",
                          width: 22, height: 22, borderRadius: "50%", border: "none",
                          background: "rgba(255,255,255,0.92)", color: "#19443c",
                          cursor: "pointer", fontSize: 14, fontWeight: 700, lineHeight: 1,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                        }}
                        aria-label="Previous"
                      >‹</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setGalleryIdx((idx + 1) % unique.length); }}
                        style={{
                          position: "absolute", top: "50%", right: 4, transform: "translateY(-50%)",
                          width: 22, height: 22, borderRadius: "50%", border: "none",
                          background: "rgba(255,255,255,0.92)", color: "#19443c",
                          cursor: "pointer", fontSize: 14, fontWeight: 700, lineHeight: 1,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                        }}
                        aria-label="Next"
                      >›</button>
                      <div style={{
                        position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
                        display: "flex", gap: 3,
                      }}>
                        {unique.map((_, i) => (
                          <span key={i} style={{
                            width: i === idx ? 12 : 5, height: 5, borderRadius: 3,
                            background: i === idx ? "#fff" : "rgba(255,255,255,0.6)",
                            transition: "all 0.2s",
                          }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            <div onClick={() => navigate(getBusinessUrl(previewListing))} style={{ cursor: "pointer" }}>
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#1f3a2e", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {previewListing.name}
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(31,58,46,0.6)", marginTop: 2 }}>
                {previewListing.category}
              </div>
            </div>
            {origin && previewListing.lat && previewListing.lng && (
              <div style={{ fontSize: 10, fontWeight: 600, color: "#19443c", marginTop: 2 }}>
                📍 {getDistance(origin.lat, origin.lng, previewListing.lat, previewListing.lng).toFixed(1)} km away
              </div>
            )}
            </div>
          </div>
        </InfoWindowF>
      )}


    </GoogleMap>
  );
};

export default MapView;
