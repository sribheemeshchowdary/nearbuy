import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MapPin, Building2, ArrowLeft, ChevronRight, Loader2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCityBySlug, CITIES } from "@/lib/cities";
import { BUSINESS_CATEGORIES } from "@/lib/districts";
import { getSubcategoriesForCategory } from "@/lib/listing-form-config";
import ListingCard, { type Listing } from "@/components/ListingCard";
import { getBusinessUrl, toSlug } from "@/lib/url-helpers";
import SEOHead from "@/components/SEOHead";

const LIVE_LISTING_STATUSES = ["approved", "active", "published"] as const;

// Category images
import tuitionImg from "@/assets/categories/education.webp";
import bakingImg from "@/assets/categories/food.webp";
import musicArtImg from "@/assets/categories/events.webp";
import homeFoodImg from "@/assets/categories/home.webp";
import beautyImg from "@/assets/categories/beauty.webp";
import petImg from "@/assets/categories/pet.webp";
import eventImg from "@/assets/categories/events.webp";
import tailoringImg from "@/assets/categories/retail.webp";
import cleaningImg from "@/assets/categories/cleaning.webp";
import handymanImg from "@/assets/categories/construction.webp";
import photographyImg from "@/assets/categories/photography.webp";

const CATEGORY_IMAGE_MAP: Record<string, string> = {
  "Tuition": tuitionImg,
  "Baking": bakingImg,
  "Music/Art/Craft": musicArtImg,
  "Home Food": homeFoodImg,
  "Wellness": beautyImg,
  "Beauty": beautyImg,
  "Pet Services": petImg,
  "Event Services": eventImg,
  "Tailoring": tailoringImg,
  "Cleaning": cleaningImg,
  "Handyman": handymanImg,
  "Photography / Videography": photographyImg,
  "Sports": eventImg,
  "Retail": tailoringImg,
};
// Subcategory images — all WebP for fast loading
// Beauty
import nailsImg from "@/assets/subcategories/nails.webp";
import lashesImg from "@/assets/subcategories/lashes.webp";
import browsImg from "@/assets/subcategories/brows.webp";
import hairImg from "@/assets/subcategories/hair.webp";
import makeupImg from "@/assets/subcategories/makeup.webp";
// Music/Art/Craft
import musicImg from "@/assets/subcategories/music.webp";
import artImg from "@/assets/subcategories/art.webp";
import craftImg from "@/assets/subcategories/craft.webp";
// Pet Services
import dogWalkingImg from "@/assets/subcategories/dog-walking.webp";
import petSittingImg from "@/assets/subcategories/pet-sitting.webp";
import groomingImg from "@/assets/subcategories/basic-grooming.webp";
// Handyman
import carpenterImg from "@/assets/subcategories/carpenter.webp";
import plumberImg from "@/assets/subcategories/plumber.webp";
import electricalImg from "@/assets/subcategories/minor-electrical.webp";
import paintingImg from "@/assets/subcategories/patching-painting.webp";
// Tuition
import mathsImg from "@/assets/subcategories/maths.webp";
import englishImg from "@/assets/subcategories/english.webp";
import biologyImg from "@/assets/subcategories/biology.webp";
import physicsImg from "@/assets/subcategories/physics.webp";
import chemistryImg from "@/assets/subcategories/chemistry.webp";
import economicsImg from "@/assets/subcategories/economics.webp";
import languagesImg from "@/assets/subcategories/languages.webp";
// Home Food
import malayCuisineImg from "@/assets/subcategories/malay-cuisine.webp";
import indianCuisineImg from "@/assets/subcategories/indian-cuisine.webp";
import chineseCuisineImg from "@/assets/subcategories/chinese-cuisine.webp";
import westernCuisineImg from "@/assets/subcategories/western-cuisine.webp";
import vegetarianVeganImg from "@/assets/subcategories/vegetarian-vegan.webp";
import mealPrepImg from "@/assets/subcategories/meal-prep.webp";
// Baking
import cakesImg from "@/assets/subcategories/cakes.webp";
import cookiesImg from "@/assets/subcategories/cookies.webp";
import pastriesImg from "@/assets/subcategories/pastries.webp";
import breadImg from "@/assets/subcategories/bread.webp";
import cupcakesImg from "@/assets/subcategories/cupcakes.webp";
import customCakesImg from "@/assets/subcategories/custom-cakes.webp";
// Photography / Videography
import portraitImg from "@/assets/subcategories/portrait.webp";
import eventWeddingImg from "@/assets/subcategories/event-wedding.webp";
import productImg from "@/assets/subcategories/product.webp";
import videographyImg from "@/assets/subcategories/videography.webp";
import droneImg from "@/assets/subcategories/drone.webp";
// Tailoring
import alterationsImg from "@/assets/subcategories/alterations.webp";
import customClothingImg from "@/assets/subcategories/custom-clothing.webp";
import curtainsImg from "@/assets/subcategories/curtains.webp";
import traditionalWearImg from "@/assets/subcategories/traditional-wear.webp";
// Event Services
import balloonDecorationImg from "@/assets/subcategories/balloon-decoration.webp";
import partyPlanningImg from "@/assets/subcategories/party-planning.webp";
import cateringCoordinationImg from "@/assets/subcategories/catering-coordination.webp";
import floralImg from "@/assets/subcategories/floral.webp";
import photoBoothImg from "@/assets/subcategories/photo-booth.webp";
// Cleaning
import regularCleaningImg from "@/assets/subcategories/regular-cleaning.webp";
import deepCleaningImg from "@/assets/subcategories/deep-cleaning.webp";
import moveInOutImg from "@/assets/subcategories/move-in-out.webp";
import postRenovationImg from "@/assets/subcategories/post-renovation.webp";
import springCleaningImg from "@/assets/subcategories/spring-cleaning.webp";

const SUBCATEGORY_IMAGES: Record<string, string> = {
  // Beauty
  nails: nailsImg, lashes: lashesImg, brows: browsImg, hair: hairImg, makeup: makeupImg,
  // Music/Art/Craft
  music: musicImg, art: artImg, craft: craftImg,
  // Pet Services
  "dog-walking": dogWalkingImg, "pet-sitting": petSittingImg, "basic-grooming": groomingImg,
  // Handyman
  carpenter: carpenterImg, plumber: plumberImg, "minor-electrical": electricalImg, "patching-painting": paintingImg,
  // Tuition
  maths: mathsImg, english: englishImg, biology: biologyImg, physics: physicsImg,
  chemistry: chemistryImg, economics: economicsImg,
  hindi: languagesImg, chinese: languagesImg, spanish: languagesImg,
  french: languagesImg, tamil: languagesImg, malay: languagesImg,
  // Home Food
  "malay-cuisine": malayCuisineImg, "indian-cuisine": indianCuisineImg,
  "chinese-cuisine": chineseCuisineImg, "western-cuisine": westernCuisineImg,
  "vegetarian-vegan": vegetarianVeganImg, "meal-prep": mealPrepImg,
  // Baking
  cakes: cakesImg, cookies: cookiesImg, pastries: pastriesImg,
  bread: breadImg, cupcakes: cupcakesImg, "custom-cakes": customCakesImg,
  // Photography / Videography
  portrait: portraitImg, "event-wedding": eventWeddingImg, product: productImg,
  videography: videographyImg, drone: droneImg,
  // Tailoring
  alterations: alterationsImg, "custom-clothing": customClothingImg,
  curtains: curtainsImg, "traditional-wear": traditionalWearImg,
  // Event Services
  "balloon-decoration": balloonDecorationImg, "party-planning": partyPlanningImg,
  "catering-coordination": cateringCoordinationImg, floral: floralImg, "photo-booth": photoBoothImg,
  // Cleaning
  "regular-cleaning": regularCleaningImg, "deep-cleaning": deepCleaningImg,
  "move-in-out": moveInOutImg, "post-renovation": postRenovationImg, "spring-cleaning": springCleaningImg,
};



const CityCategory = () => {
  const { citySlug, categorySlug } = useParams<{ citySlug: string; categorySlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const city = getCityBySlug(citySlug || "singapore");
  const activeSub = searchParams.get("sub");

  // Fetch live listings from Firestore, including older records that used
  // legacy live statuses before the current "approved" workflow.
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const q = query(collection(db, "listings"), where("status", "in", LIVE_LISTING_STATUSES));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Listing));
          setListings(data);
        } else {
          setListings([]);
        }
      } catch {
        setListings([]);
      }
      setLoadingListings(false);
    };
    fetchListings();
  }, []);

  const matchedCategory = useMemo(() => {
    if (!categorySlug) return null;
    return BUSINESS_CATEGORIES.find(
      (c) => c !== "All Categories" && toSlug(c) === categorySlug
    ) || null;
  }, [categorySlug]);

  // Get subcategories for the matched category
  const subcategories = useMemo(() => {
    if (!matchedCategory) return null;
    return getSubcategoriesForCategory(matchedCategory);
  }, [matchedCategory]);

  // Show subcategory selection if category has subs and none is selected yet
  const showSubcategoryPicker = !!subcategories && !activeSub;

  const routeDistrictSlug = city ? null : (citySlug || null);

  const scopedListings = useMemo(() => {
    if (!routeDistrictSlug) return listings;
    return listings.filter((l) => toSlug(l.district) === routeDistrictSlug);
  }, [listings, routeDistrictSlug]);

  const filtered = useMemo(() => {
    let result = scopedListings;

    if (matchedCategory) {
      result = result.filter((l) => l.category === matchedCategory);
    }

    if (activeSub && activeSub !== "all") {
      result = result.filter((l) => {
        const data = (l as any).subcategoryData;
        const flatList: string[] = (l as any).subcategoryList || [];
        if (flatList.includes(activeSub)) return true;
        if (data?.subcategory === activeSub) return true;
        if (data?.subcategories?.includes(activeSub)) return true;
        if (data?.subjects?.includes(activeSub)) return true;
        return false;
      });
    }

    return result;
  }, [matchedCategory, scopedListings, activeSub]);

  const categories = BUSINESS_CATEGORIES.filter((c) => c !== "All Categories");

  const subLabel = subcategories?.find((s) => s.value === activeSub)?.label;

  const locationName = routeDistrictSlug
    ? scopedListings[0]?.district || citySlug?.replace(/-/g, " ") || "this area"
    : city?.name || "Singapore";

  const pageTitle = activeSub && subLabel
    ? `${subLabel} — ${matchedCategory} in ${locationName}`
    : matchedCategory
      ? `${matchedCategory} in ${locationName}`
      : `Businesses in ${locationName}`;

  const pageDescription = matchedCategory
    ? `Find the best ${matchedCategory.toLowerCase()} businesses in ${locationName}. Browse verified listings, read reviews, and connect directly.`
    : `Explore top businesses across all categories in ${locationName}. Your trusted local business directory.`;

  const canonicalUrl = typeof window !== "undefined"
    ? `${window.location.origin}/${citySlug}${categorySlug ? `/${categorySlug}` : ""}${activeSub ? `?sub=${activeSub}` : ""}`
    : undefined;

  // ItemList JSON-LD for category pages
  const itemListJsonLd = matchedCategory && filtered.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: pageTitle,
    description: pageDescription,
    numberOfItems: filtered.length,
    itemListElement: filtered.slice(0, 20).map((l, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: typeof window !== "undefined" ? `${window.location.origin}${getBusinessUrl(l)}` : undefined,
      name: l.name,
    })),
  } : undefined;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        url={canonicalUrl}
        canonical={canonicalUrl}
        jsonLd={itemListJsonLd}
      />
      {/* Breadcrumb */}
      <div className="border-b border-border/50 bg-secondary/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/${citySlug}`} className="hover:text-primary transition-colors">{locationName}</Link>
            {matchedCategory && (
              <>
                <ChevronRight className="w-3 h-3" />
                {activeSub ? (
                  <Link to={`/${citySlug}/${categorySlug}`} className="hover:text-primary transition-colors">{matchedCategory}</Link>
                ) : (
                  <span className="text-foreground">{matchedCategory}</span>
                )}
              </>
            )}
            {activeSub && subLabel && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span className="text-foreground">{subLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8" onMouseLeave={() => !matchedCategory && setHoveredCategory(null)}>
          {/* Sidebar - Categories */}
          {!matchedCategory && (
            <aside className="hidden lg:block w-64 shrink-0">
              <h2 className="text-sm font-semibold text-foreground mb-3">Browse by Category</h2>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    to={`/${citySlug}/${toSlug(cat)}`}
                    onMouseEnter={() => setHoveredCategory(cat)}
                    onFocus={() => setHoveredCategory(cat)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      hoveredCategory === cat
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span>{cat}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                ))}
              </div>
            </aside>
          )}

          {/* Listings or Subcategory Picker */}
          <div className="flex-1">
            {(matchedCategory || activeSub) && (
              <div className="flex items-center justify-between mb-6">
                {showSubcategoryPicker ? (
                  <p className="text-sm text-muted-foreground">
                    Choose a <span className="font-medium text-foreground">{matchedCategory}</span> subcategory
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{filtered.length}</span> businesses found
                  </p>
                )}
                <div className="flex gap-2">
                  {activeSub && (
                    <Button variant="outline" size="sm" onClick={() => setSearchParams({})}>
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      All {matchedCategory}
                    </Button>
                  )}
                  {matchedCategory && !activeSub && (
                    <Button variant="outline" size="sm" onClick={() => navigate(`/${citySlug}`)}>
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      All Categories
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Subcategory picker cards */}
            {showSubcategoryPicker ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {subcategories.map((sub) => {
                  const img = SUBCATEGORY_IMAGES[sub.value];
                  return (
                    <button
                      key={sub.value}
                      onClick={() => setSearchParams({ sub: sub.value })}
                      className="relative overflow-hidden rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 group active:scale-95"
                    >
                      <div className="aspect-square overflow-hidden">
                        {img ? (
                          <img
                            src={img}
                            alt={sub.label}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-1.5 text-center">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{sub.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {listings.filter((l) => {
                            if (l.category !== matchedCategory) return false;
                            const list: string[] = (l as any).subcategoryList || [];
                            const data = (l as any).subcategoryData;
                            return list.includes(sub.value) || data?.subcategory === sub.value || data?.subcategories?.includes(sub.value) || data?.subjects?.includes(sub.value);
                          }).length} listings
                        </p>
                      </div>
                    </button>
                  );
                })}
                {/* View all option */}
                <button
                  onClick={() => setSearchParams({ sub: "all" })}
                  className="relative overflow-hidden rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:shadow-md transition-all duration-200 active:scale-95"
                >
                  <div className="aspect-square flex items-center justify-center bg-primary/10">
                    <LayoutGrid className="w-6 h-6 text-primary" />
                  </div>
                  <div className="p-1.5 text-center">
                    <p className="text-xs font-semibold text-primary">View All</p>
                    <p className="text-[10px] text-muted-foreground">
                      {listings.filter((l) => l.category === matchedCategory).length} listings
                    </p>
                  </div>
                </button>
              </div>
            ) : matchedCategory ? (
              filtered.length === 0 ? (
                <div className="text-center py-16">
                  <Building2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No businesses found</p>
                  <p className="text-sm text-muted-foreground">Check back soon for new listings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onSelect={(l) => navigate(getBusinessUrl(l))}
                    />
                  ))}
                </div>
              )
            ) : null}

            {/* Hovered category preview */}
            {!matchedCategory && (
              <div>
                {(() => {
                  const previewCat = hoveredCategory;
                  if (!previewCat) {
                    return (
                      <div className="flex items-center justify-center min-h-[300px] rounded-xl border border-dashed border-border bg-card/40">
                        <p className="text-sm text-muted-foreground">Hover a category on the left to preview</p>
                      </div>
                    );
                  }
                  const subs = getSubcategoriesForCategory(previewCat);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-foreground">{previewCat}</h2>
                        <Link
                          to={`/${citySlug}/${toSlug(previewCat)}`}
                          className="text-sm text-primary hover:underline"
                        >
                          View all
                        </Link>
                      </div>
                      {subs && subs.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {subs.map((sub) => {
                            const img = SUBCATEGORY_IMAGES[sub.value];
                            return (
                              <Link
                                key={sub.value}
                                to={`/${citySlug}/${toSlug(previewCat)}?sub=${sub.value}`}
                                className="relative overflow-hidden rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 group"
                              >
                                <div className="aspect-square overflow-hidden bg-muted">
                                  {img ? (
                                    <img
                                      src={img}
                                      alt={sub.label}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Building2 className="w-6 h-6 text-muted-foreground/40" />
                                    </div>
                                  )}
                                </div>
                                <div className="p-2 text-center">
                                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{sub.label}</p>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border bg-card p-8 text-center">
                          <p className="text-sm text-muted-foreground mb-3">No subcategories — browse all {previewCat} listings.</p>
                          <Link
                            to={`/${citySlug}/${toSlug(previewCat)}`}
                            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                          >
                            Explore {previewCat} <ChevronRight className="w-4 h-4 ml-1" />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CityCategory;
