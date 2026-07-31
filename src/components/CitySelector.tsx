import { MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CITIES, type City } from "@/lib/cities";

interface CitySelectorProps {
  selectedCity: string;
  onCityChange: (citySlug: string) => void;
  iconOnly?: boolean;
}

const CitySelector = ({ selectedCity, onCityChange, iconOnly }: CitySelectorProps) => {
  return (
    <Select value={selectedCity} onValueChange={onCityChange}>
      <SelectTrigger className={iconOnly ? "w-9 h-9 p-0 justify-center border-0 bg-transparent hover:bg-primary/10 rounded-xl [&>svg:last-child]:hidden" : "w-[180px] h-9 text-sm"}>
        {iconOnly ? (
          <MapPin className="w-5 h-5 text-accent shrink-0" />
        ) : (
          <>
            <MapPin className="w-3.5 h-3.5 mr-1.5 text-primary shrink-0" />
            <SelectValue placeholder="Select City" />
          </>
        )}
      </SelectTrigger>
      <SelectContent>
        {CITIES.map((city) => (
          <SelectItem key={city.id} value={city.slug}>
            <span className="flex items-center gap-2">
              {city.name}
              <span className="text-xs text-muted-foreground">{city.country}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CitySelector;
