import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { chunkListingStatusesForFirestore, isPubliclyVisibleListing } from "@/lib/listing-status";

export interface SearchableListing {
  id: string;
  name: string;
  category: string;
  district: string;
  subcategoryList?: string[];
  subcategoryData?: Record<string, unknown>;
  subcategory?: string;
  subcategories?: string[];
  subjects?: string[];
}

export interface DetectedLocation {
  lat: number;
  lng: number;
  address: string;
  postal: string;
  district: string;
  block?: string;
  building?: string;
  road?: string;
}

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  listings: SearchableListing[];
  setListings: (listings: SearchableListing[]) => void;
  activeLocation: DetectedLocation | null;
  setActiveLocation: (loc: DetectedLocation | null) => void;
  onPincodeSearch: (code: string) => Promise<boolean>;
  onDistrictSelect: (district: string) => void;
}

const SearchContext = createContext<SearchContextType>({
  searchQuery: "",
  setSearchQuery: () => {},
  listings: [],
  setListings: () => {},
  activeLocation: null,
  setActiveLocation: () => {},
  onPincodeSearch: async () => false,
  onDistrictSelect: () => {},
});

export const SearchProvider = ({ children }: { children: ReactNode }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<SearchableListing[]>([]);
  const [activeLocation, setActiveLocationState] = useState<DetectedLocation | null>(null);

  // Initialize activeLocation from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nearbuy_active_location");
      if (saved) {
        setActiveLocationState(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  const setActiveLocation = (loc: DetectedLocation | null) => {
    setActiveLocationState(loc);
    try {
      if (loc) {
        localStorage.setItem("nearbuy_active_location", JSON.stringify(loc));
      } else {
        localStorage.removeItem("nearbuy_active_location");
      }
    } catch {
      // Ignore
    }
  };

  const onPincodeSearch = async (code: string): Promise<boolean> => {
    if (!/^\d{6}$/.test(code)) return false;
    try {
      const { geocodeSingaporePostalCode } = await import("@/lib/geocode-pincode");
      const result = await geocodeSingaporePostalCode(code);
      if (result) {
        setActiveLocation({
          lat: result.lat,
          lng: result.lng,
          address: result.address,
          postal: result.postal,
          district: result.district,
          block: result.block,
          building: result.building,
          road: result.road,
        });
        return true;
      }
    } catch (e) {
      console.error("onPincodeSearch error:", e);
    }
    return false;
  };

  const onDistrictSelect = async (district: string) => {
    if (district === "All Districts") {
      setActiveLocation(null);
    } else {
      const { DISTRICT_COORDINATES } = await import("@/lib/districts");
      const coords = DISTRICT_COORDINATES[district] || { lat: 1.3521, lng: 103.8198 };
      setActiveLocation({
        lat: coords.lat,
        lng: coords.lng,
        address: district,
        postal: "",
        district: district,
        block: "",
        building: "",
        road: "",
      });
    }
  };

  // Try to fetch real listings for suggestions
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const snaps = await Promise.all(
          chunkListingStatusesForFirestore().map((statuses) =>
            getDocs(query(collection(db, "listings"), where("status", "in", statuses)))
          )
        );
        const byId = new Map<string, SearchableListing>();
        snaps.forEach((snap) => {
          snap.docs.forEach((doc) => {
            const d = doc.data();
            if (!isPubliclyVisibleListing(d)) return;
            byId.set(doc.id, {
              id: doc.id,
              name: d.name,
              category: d.category,
              district: d.district,
              subcategoryList: d.subcategoryList,
              subcategoryData: d.subcategoryData,
              subcategory: d.subcategory,
              subcategories: d.subcategories,
              subjects: d.subjects,
            } as SearchableListing);
          });
        });
        setListings([...byId.values()]);
      } catch {
      // Keep the current Firebase-backed suggestions if a transient request fails.
      }
    };
    fetchListings();
  }, []);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        listings,
        setListings,
        activeLocation,
        setActiveLocation,
        onPincodeSearch,
        onDistrictSelect,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => useContext(SearchContext);
