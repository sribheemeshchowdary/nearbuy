import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

const DEMO_SEARCH_LISTINGS: SearchableListing[] = [
  { id: "1", name: "Singapore Delights Pte Ltd", category: "Food & Beverage", district: "Orchard" },
  { id: "1b", name: "Hawker King", category: "Food & Beverage", district: "Chinatown" },
  { id: "6", name: "Orchard Lifestyle Store", category: "Retail & Shopping", district: "Orchard" },
  { id: "6b", name: "ShopLocal SG", category: "Retail & Shopping", district: "Bugis" },
  { id: "7", name: "HealthFirst Medical Clinic", category: "Healthcare & Medical", district: "Novena" },
  { id: "7b", name: "SmileBright Dental", category: "Healthcare & Medical", district: "Toa Payoh" },
  { id: "4", name: "LearnSG Academy", category: "Education & Training", district: "Tampines" },
  { id: "4b", name: "TutorHub SG", category: "Education & Training", district: "Bishan" },
  { id: "8", name: "PrimeConsult Advisory", category: "Professional Services", district: "CBD / Raffles Place" },
  { id: "3", name: "Glow Aesthetics Clinic", category: "Beauty & Wellness", district: "Novena" },
  { id: "3b", name: "Zen Spa & Massage", category: "Beauty & Wellness", district: "Kallang" },
  { id: "5", name: "HomeFixSG Services", category: "Home Services", district: "Jurong East" },
  { id: "5b", name: "CleanPro SG", category: "Home Services", district: "Clementi" },
  { id: "9", name: "SpeedWorks Auto", category: "Automotive", district: "Bukit Merah" },
  { id: "2", name: "TechHub Solutions", category: "Technology & IT", district: "CBD / Raffles Place" },
  { id: "2b", name: "AppCraft Studio", category: "Technology & IT", district: "Queenstown" },
  { id: "10", name: "Prestige Properties SG", category: "Real Estate", district: "Marina Bay" },
  { id: "11", name: "LawPoint LLP", category: "Legal Services", district: "CBD / Raffles Place" },
  { id: "12", name: "WealthBridge Advisors", category: "Financial Services", district: "Bukit Timah" },
  { id: "13", name: "SwiftMove Logistics", category: "Logistics & Transport", district: "Changi" },
  { id: "14", name: "Celebrate! Events Co", category: "Events & Entertainment", district: "Kallang" },
  { id: "15", name: "BuildRight Contractors", category: "Construction & Renovation", district: "Ang Mo Kio" },
];

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
  const [listings, setListings] = useState<SearchableListing[]>(DEMO_SEARCH_LISTINGS);
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
        const q = query(collection(db, "listings"), where("status", "==", "approved"));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              name: d.name,
              category: d.category,
              district: d.district,
              subcategoryList: d.subcategoryList,
              subcategoryData: d.subcategoryData,
              subcategory: d.subcategory,
              subcategories: d.subcategories,
              subjects: d.subjects,
            } as SearchableListing;
          });
          setListings(data);
        }
      } catch {
        // Keep demo data
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
