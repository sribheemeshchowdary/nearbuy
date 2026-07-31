import { useMemo, useState, useEffect } from "react";
import { useViewTracking } from "@/hooks/useViewTracking";
import { useParams, useNavigate } from "react-router-dom";
import { Building2, Clock, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Listing } from "@/components/ListingCard";
import { DEFAULT_OPERATING_HOURS } from "@/components/ListingCard";
import { toSlug } from "@/lib/url-helpers";
import { getDistance } from "@/lib/utils";
import PhotoGallery from "@/components/business-detail/PhotoGallery";
import BusinessHeader from "@/components/business-detail/BusinessHeader";
import CatalogueSection from "@/components/business-detail/CatalogueSection";
import QuickInfo from "@/components/business-detail/QuickInfo";
import ContactSidebar from "@/components/business-detail/ContactSidebar";
import BusinessEnquiryForm from "@/components/BusinessEnquiryForm";
import MobileBusinessDetail from "@/components/business-detail/MobileBusinessDetail";
import SEOHead from "@/components/SEOHead";
import { PreviewBanner } from "@/components/PreviewBanner";
import { GALLERY_MAP } from "@/lib/demo-listings";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { DEMO_ALL_LISTINGS } from "@/lib/demo-data";

const USE_DEMO_BUSINESSES =
  import.meta.env.DEV && import.meta.env.VITE_USE_DEMO_BUSINESSES === "true";

const formatTime = (time: string) => {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
};

/**
 * Default rule: catalogue is visible UNLESS the owner has explicitly turned it off
 * via the dashboard toggle (which writes `catalogueEnabled: false`).
 * Mirrors the dashboard's default state (`useState(true)`) so legacy listings
 * without the field behave identically to a newly created one.
 */
const CATALOGUE_DEFAULT_ENABLED = true;
const isCatalogueVisible = (listing: { catalogueEnabled?: boolean }): boolean =>
  listing.catalogueEnabled ?? CATALOGUE_DEFAULT_ENABLED;

const BusinessDetail = () => {
  const { areaSlug, categorySlug, businessSlug } = useParams<{
    areaSlug: string;
    categorySlug: string;
    businessSlug: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [firestoreListing, setFirestoreListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const slugMatch = (l: Listing) =>
      toSlug(l.district) === areaSlug &&
      toSlug(l.category) === categorySlug &&
      (l.customSlug || toSlug(l.name)) === businessSlug;

    const fetchListing = async () => {
      if (USE_DEMO_BUSINESSES) {
        setFirestoreListing(DEMO_ALL_LISTINGS.find(slugMatch) ?? null);
        setIsPreview(false);
        setLoading(false);
        return;
      }

      try {
        // Public path: approved listings, visible to everyone.
        const q = query(collection(db, "listings"), where("status", "==", "approved"));
        const snap = await getDocs(q);
        const match = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Listing))
          .find(slugMatch);
        if (match) {
          setFirestoreListing(match);
          setIsPreview(false);
          setLoading(false);
          return;
        }

        // Owner preview: if not publicly live, the signed-in owner can still
        // view their own listing (pending approval or rejected). Firestore
        // rules only return listings owned by this user for this query, so a
        // non-owner never sees an unapproved listing.
        if (user) {
          const ownQ = query(collection(db, "listings"), where("ownerId", "==", user.uid));
          const ownSnap = await getDocs(ownQ);
          const ownMatch = ownSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Listing))
            .find(slugMatch);
          if (ownMatch) {
            setFirestoreListing(ownMatch);
            setIsPreview(ownMatch.status !== "approved");
          }
        }
      } catch { /* fallback */ }
      setLoading(false);
    };
    fetchListing();
  }, [areaSlug, categorySlug, businessSlug, user]);

  // Always start business pages at the top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [businessSlug]);

  // Get user location for distance calculation — try saved location first, then geolocation
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nearbuy_location");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.lat && parsed?.lng) {
          setUserLocation({ lat: parsed.lat, lng: parsed.lng });
          return;
        }
      }
    } catch { /* ignore */ }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* silent fail */ }
    );
  }, []);

  const listing = firestoreListing;
  const { viewCount, liveViewers } = useViewTracking(listing?.id);

  const distanceKm = useMemo(() => {
    if (!userLocation || !listing?.lat || !listing?.lng) return null;
    return getDistance(userLocation.lat, userLocation.lng, listing.lat, listing.lng);
  }, [userLocation, listing]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border/40">
          <div className="container mx-auto px-4 py-3">
            <div className="h-3 w-64 bg-secondary rounded animate-pulse" />
          </div>
        </div>
        <div className="container mx-auto px-4 pt-5">
          <div className="aspect-[16/9] sm:aspect-[21/9] w-full rounded-2xl bg-secondary animate-pulse" />
        </div>
        <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-7 w-2/3 bg-secondary rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-secondary rounded animate-pulse" />
            <div className="h-32 w-full bg-secondary/60 rounded-2xl animate-pulse mt-6" />
          </div>
          <div className="space-y-4">
            <div className="h-[250px] w-full bg-secondary rounded-2xl animate-pulse" />
            <div className="h-40 w-full bg-secondary/60 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Business Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">The business you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/")} className="rounded-full px-6">Back to Directory</Button>
        </div>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/${areaSlug}/${categorySlug}/${businessSlug}`;
  const galleryPhotos = listing.imageUrls?.length
    ? listing.imageUrls
    : GALLERY_MAP[listing.id] || [];

  const ogImage = listing.coverImage || listing.imageUrls?.[0] || galleryPhotos[0];

  // JSON-LD LocalBusiness schema for SEO
  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: listing.name,
    description: listing.description,
    url: shareUrl,
    image: ogImage,
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address,
      addressLocality: listing.district,
      postalCode: listing.postalCode,
      addressCountry: "SG",
    },
    ...(listing.phone && { telephone: listing.phone }),
    ...(listing.website && { sameAs: [listing.website] }),
    ...(listing.lat && listing.lng && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: listing.lat,
        longitude: listing.lng,
      },
    }),
    ...(listing.category && {
      "@type": ["LocalBusiness"],
      additionalType: listing.category,
    }),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={listing.name}
        description={listing.description || `${listing.name} — ${listing.category} in ${listing.district}, Singapore`}
        image={ogImage}
        url={shareUrl}
        canonical={shareUrl}
        type="business.business"
        jsonLd={jsonLd}
      />

      {/* ═══ MOBILE LAYOUT (≤ 768px) ═══ */}
      <div className="md:hidden">
        <MobileBusinessDetail
          listing={listing}
          galleryPhotos={galleryPhotos}
          shareUrl={shareUrl}
          areaSlug={areaSlug}
          categorySlug={categorySlug}
          catalogueVisible={isCatalogueVisible(listing)}
          isPreview={isPreview}
        />
      </div>

      {/* ═══ DESKTOP LAYOUT ═══ */}
      <div className="hidden md:block pb-24 sm:pb-0">
      {isPreview && (
        <div className="container mx-auto px-4 pt-4">
          <PreviewBanner status={listing.status} />
        </div>
      )}
      {/* Photo Gallery */}
      <div className="container mx-auto px-4 pt-5">
        <PhotoGallery photos={galleryPhotos} businessName={listing.name} />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: Header + Tabs */}
          <div className="lg:col-span-2 space-y-8">
            <BusinessHeader listing={listing} shareUrl={shareUrl} viewCount={viewCount} liveViewers={liveViewers} distanceKm={distanceKm} />

            {/* Tabs — Apple-style clean segmented control */}
            <Tabs defaultValue="overview">
              <TabsList className="bg-secondary/60 border border-border/40 w-full justify-start overflow-x-auto scrollbar-hide flex-nowrap rounded-full p-1 h-auto">
                <TabsTrigger value="overview" className="rounded-full text-xs sm:text-sm px-4 py-2 data-[state=active]:shadow-sm">Overview</TabsTrigger>
                {isCatalogueVisible(listing) && (
                  <TabsTrigger value="catalogue" className="rounded-full text-xs sm:text-sm px-4 py-2 data-[state=active]:shadow-sm relative">
                    Catalogue
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  </TabsTrigger>
                )}
                <TabsTrigger value="quick-info" className="rounded-full text-xs sm:text-sm px-4 py-2 data-[state=active]:shadow-sm">Info</TabsTrigger>
                <TabsTrigger value="photos" className="rounded-full text-xs sm:text-sm px-4 py-2 data-[state=active]:shadow-sm">Photos</TabsTrigger>
                
              </TabsList>

              <TabsContent value="overview" className="mt-8 space-y-8">
                {/* About — clean typography */}
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground mb-3">Our Story</h3>
                  <p className="text-[15px] text-muted-foreground leading-[1.7]">{listing.description}</p>
                </div>

                {isCatalogueVisible(listing) && <CatalogueSection items={listing.catalogueItems} whatsappNumber={listing.whatsapp || listing.phone} businessName={listing.name} defaultMessage={listing.contactDetails?.whatsappMessage} />}

                {/* Operating Hours — Apple-style card */}
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground mb-4 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Operating Hours
                  </h3>
                  <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
                    <div className="space-y-1">
                      {(() => {
                        const hours = listing.operatingHours || DEFAULT_OPERATING_HOURS;
                        const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                        const shortName: Record<string, string> = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };
                        const todayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
                        const keyOf = (d: string) => {
                          const i = hours[d];
                          if (!i || i.closed) return "CLOSED";
                          return `${i.open}-${i.close}`;
                        };
                        // Group consecutive days with identical timings
                        const groups: { days: string[]; key: string }[] = [];
                        order.forEach((d) => {
                          const k = keyOf(d);
                          const last = groups[groups.length - 1];
                          if (last && last.key === k) last.days.push(d);
                          else groups.push({ days: [d], key: k });
                        });
                        return groups.map(({ days, key }) => {
                          const first = days[0];
                          const last = days[days.length - 1];
                          const label = days.length === 1 ? shortName[first] : `${shortName[first]} – ${shortName[last]}`;
                          const info = hours[first];
                          const time = key === "CLOSED" ? "Closed" : `${formatTime(info.open)} – ${formatTime(info.close)}`;
                          const isToday = days.includes(todayName);
                          return (
                            <div
                              key={label}
                              className={`flex items-center justify-between py-2 px-3 rounded-lg ${isToday ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
                            >
                              <span className={`text-sm ${isToday ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                                {label}
                                {isToday && <span className="ml-2 text-[10px] uppercase tracking-wider">Today</span>}
                              </span>
                              <span className={`text-sm font-semibold tabular-nums ${time === "Closed" ? "text-destructive" : "text-foreground"}`}>
                                {time}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Special / Holiday Hours */}
                    {listing.specialHours && listing.specialHours.length > 0 && (
                      <div className="mt-5 pt-5 border-t border-border/40">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" />
                          Special Hours
                        </h4>
                        <div className="space-y-2">
                          {listing.specialHours.map((sh, i) => {
                            const dateStr = sh.date ? new Date(sh.date + "T00:00:00").toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) : "";
                            const time = sh.closed ? "Closed" : `${formatTime(sh.open)} – ${formatTime(sh.close)}`;
                            return (
                              <div key={i} className="flex items-center justify-between py-1">
                                <span className="text-sm text-muted-foreground">{sh.label || dateStr}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground/70">{dateStr}</span>
                                  <span className={`text-sm font-semibold ${time === "Closed" ? "text-destructive" : "text-foreground"}`}>{time}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {isCatalogueVisible(listing) && (
                <TabsContent value="catalogue" className="mt-8">
                  <CatalogueSection items={listing.catalogueItems} whatsappNumber={listing.whatsapp || listing.phone} businessName={listing.name} defaultMessage={listing.contactDetails?.whatsappMessage} />
                </TabsContent>
              )}

              <TabsContent value="quick-info" className="mt-8">
                <QuickInfo listing={listing} />
              </TabsContent>

              <TabsContent value="photos" className="mt-8">
                <PhotoGallery photos={galleryPhotos} businessName={listing.name} />
              </TabsContent>


            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">

            <ContactSidebar listing={listing} />
            <BusinessEnquiryForm listingId={listing.id} listingName={listing.name} ownerId={listing.ownerId} />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default BusinessDetail;
