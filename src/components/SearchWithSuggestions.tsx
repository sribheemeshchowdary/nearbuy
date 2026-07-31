import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, MapPin, Building2, Navigation, Tags } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/contexts/SearchContext";
import { getBusinessUrl } from "@/lib/url-helpers";
import { cn } from "@/lib/utils";
import { SINGAPORE_DISTRICTS } from "@/lib/districts";
import { getSubcategorySuggestions, listingMatchesSearch } from "@/lib/listing-search";

interface SearchWithSuggestionsProps {
  compact?: boolean;
  placeholder?: string;
  className?: string;
}

const SearchWithSuggestions = ({ compact, placeholder = "Search businesses, categories, or postal code...", className }: SearchWithSuggestionsProps) => {
  const { searchQuery, setSearchQuery, listings, onPincodeSearch, onDistrictSelect } = useSearch();
  const navigate = useNavigate();
  const location = useLocation();
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect if input looks like a Singapore postal code
  const isPincodeQuery = useMemo(() => /^\d{4,6}$/.test(searchQuery.trim()), [searchQuery]);
  const isFullPincode = useMemo(() => /^\d{6}$/.test(searchQuery.trim()), [searchQuery]);

  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const matches = listings.filter((listing) => listingMatchesSearch(listing, searchQuery));

    return matches.slice(0, 6);
  }, [searchQuery, listings]);

  const subcategoryMatches = useMemo(
    () => isPincodeQuery ? [] : getSubcategorySuggestions(searchQuery),
    [searchQuery, isPincodeQuery],
  );

  const categoryMatches = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2 || isPincodeQuery) return [];
    const q = searchQuery.toLowerCase();
    const cats = [...new Set(listings.map((l) => l.category))];
    return cats.filter((c) => c.toLowerCase().includes(q)).slice(0, 3);
  }, [searchQuery, listings, isPincodeQuery]);

  const districtMatches = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2 || isPincodeQuery) return [];
    const q = searchQuery.toLowerCase();
    return SINGAPORE_DISTRICTS.filter((d) => d !== "All Districts" && d.toLowerCase().includes(q)).slice(0, 3);
  }, [searchQuery, isPincodeQuery]);

  const showDropdown = focused && searchQuery.length >= 2 && (suggestions.length > 0 || categoryMatches.length > 0 || subcategoryMatches.length > 0 || districtMatches.length > 0 || isPincodeQuery);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (name: string) => {
    setSearchQuery(name);
    setFocused(false);
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const handleBusinessSelect = (item: { name: string; category: string; district: string }) => {
    setSearchQuery("");
    setFocused(false);
    navigate(getBusinessUrl(item));
  };

  const handlePincodeSelect = async () => {
    const code = searchQuery.trim();
    if (onPincodeSearch && /^\d{6}$/.test(code)) {
      setFocused(false);
      await onPincodeSearch(code);
      setSearchQuery("");
      if (location.pathname !== "/") {
        navigate("/");
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setFocused(false);
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    // 1) Full SG postal code → trigger pincode search
    if (isFullPincode && onPincodeSearch) {
      handlePincodeSelect();
      return;
    }
    // 2) Exact business match → navigate to business page
    const exactBiz = suggestions.find((s) => s.name.toLowerCase() === q.toLowerCase());
    if (exactBiz) {
      handleBusinessSelect(exactBiz);
      return;
    }
    // 3) Exact district match → apply district filter
    const exactDistrict = districtMatches.find((d) => d.toLowerCase() === q.toLowerCase());
    if (exactDistrict && onDistrictSelect) {
      onDistrictSelect(exactDistrict);
      setSearchQuery("");
      setFocused(false);
      if (location.pathname !== "/") navigate("/");
      return;
    }
    // 4) Single business suggestion → pick it
    if (suggestions.length === 1 && categoryMatches.length === 0 && subcategoryMatches.length === 0 && districtMatches.length === 0) {
      handleBusinessSelect(suggestions[0]);
      return;
    }
    // 5) Otherwise: keep query, ensure on home so list filters update
    setFocused(false);
    if (location.pathname !== "/") navigate("/");
  };


  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {compact ? (
        <Input
          placeholder={placeholder}
          className="h-9 border-0 bg-transparent pl-0 pr-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <Input
          placeholder={placeholder}
          className="h-full min-h-[40px] rounded-lg border-0 bg-transparent pl-2 pr-4 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
        />
      )}

      {showDropdown && (
        <div className={cn(
          "absolute left-0 right-0 bg-card border border-border/80 rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200",
          compact ? "top-10 -left-8" : "top-full mt-1",
          compact ? "min-w-[280px]" : ""
        )}>
          {/* Pincode suggestion */}
          {isPincodeQuery && (
            <div className="px-3 pt-2.5 pb-1.5">
              <button
                onClick={handlePincodeSelect}
                disabled={!isFullPincode}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left",
                  isFullPincode
                    ? "bg-primary/10 hover:bg-primary/20 cursor-pointer"
                    : "bg-muted/50 opacity-60 cursor-default"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {isFullPincode ? `Search near postal code ${searchQuery}` : `Type 6 digits for postal code search`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isFullPincode ? "Find businesses near this location" : `${6 - searchQuery.trim().length} more digit${6 - searchQuery.trim().length !== 1 ? 's' : ''} needed`}
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* District / Area suggestions */}
          {districtMatches.length > 0 && (
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Areas</p>
              <div className="flex flex-wrap gap-1.5">
                {districtMatches.map((d) => (
                  <button
                    key={d}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 text-foreground text-xs font-medium hover:bg-accent/20 transition-colors"
                    onClick={() => {
                      if (onDistrictSelect) {
                        onDistrictSelect(d);
                        setSearchQuery("");
                        setFocused(false);
                        if (location.pathname !== "/") navigate("/");
                      } else {
                        handleSelect(d);
                      }
                    }}
                  >
                    <Navigation className="w-3 h-3" />
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category suggestions */}
          {categoryMatches.length > 0 && (
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {categoryMatches.map((cat) => (
                  <button
                    key={cat}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    onClick={() => handleSelect(cat)}
                  >
                    <Building2 className="w-3 h-3" />
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subcategory suggestions */}
          {subcategoryMatches.length > 0 && (
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Subcategories</p>
              <div className="flex flex-wrap gap-1.5">
                {subcategoryMatches.map((subcategory) => (
                  <button
                    key={`${subcategory.category}-${subcategory.value}`}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                    onClick={() => handleSelect(subcategory.label)}
                  >
                    <Tags className="w-3 h-3" />
                    {subcategory.label}
                    <span className="text-muted-foreground">in {subcategory.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Business suggestions */}
          {suggestions.length > 0 && !isPincodeQuery && (
            <div className="py-1.5">
              {(categoryMatches.length > 0 || subcategoryMatches.length > 0) && (
                <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Businesses</p>
              )}
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent/10 transition-colors text-left"
                  onClick={() => handleBusinessSelect(item)}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center shrink-0">
                    <Search className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {item.category} · {item.district}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchWithSuggestions;
