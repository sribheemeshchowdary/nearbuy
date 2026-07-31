import { Search, MapPin, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SINGAPORE_DISTRICTS, BUSINESS_CATEGORIES } from "@/lib/districts";

interface SearchFiltersProps {
  query: string;
  onQueryChange: (val: string) => void;
  district: string;
  onDistrictChange: (val: string) => void;
  category: string;
  onCategoryChange: (val: string) => void;
  onDetectLocation?: () => void;
}

const SearchFilters = ({
  query,
  onQueryChange,
  district,
  onDistrictChange,
  category,
  onCategoryChange,
  onDetectLocation,
}: SearchFiltersProps) => {
  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search businesses by name or keyword..."
          className="pl-10 h-11 bg-background"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={district} onValueChange={onDistrictChange}>
          <SelectTrigger className="flex-1 h-10">
            <SelectValue placeholder="All Districts" />
          </SelectTrigger>
          <SelectContent>
            {SINGAPORE_DISTRICTS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="flex-1 h-10">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {onDetectLocation && (
          <Button variant="outline" size="sm" className="h-10 shrink-0" onClick={onDetectLocation}>
            <MapPin className="w-4 h-4 mr-1.5" />
            Near Me
          </Button>
        )}
      </div>
    </div>
  );
};

export default SearchFilters;
