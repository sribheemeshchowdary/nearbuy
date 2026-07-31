import { BUSINESS_CATEGORIES } from "@/lib/districts";
import { getSubcategoriesForCategory } from "@/lib/listing-form-config";

export interface SearchableListingFields {
  name: string;
  category: string;
  district: string;
  subcategoryList?: string[];
  subcategoryData?: Record<string, unknown>;
  subcategory?: string;
  subcategories?: string[];
  subjects?: string[];
}

const normalize = (value: string) =>
  value.toLowerCase().replace(/[-_/]+/g, " ").replace(/\s+/g, " ").trim();

const collectStrings = (value: unknown, target: string[]) => {
  if (typeof value === "string") {
    target.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectStrings(item, target));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach(item => collectStrings(item, target));
  }
};

export const getListingSearchText = (listing: SearchableListingFields) => {
  const values: string[] = [listing.name, listing.category, listing.district];
  collectStrings(listing.subcategoryList, values);
  collectStrings(listing.subcategoryData, values);
  collectStrings(listing.subcategory, values);
  collectStrings(listing.subcategories, values);
  collectStrings(listing.subjects, values);

  const configuredOptions = getSubcategoriesForCategory(listing.category) || [];
  const storedValues = new Set(values.map(normalize));
  configuredOptions.forEach(option => {
    if (storedValues.has(normalize(option.value)) || storedValues.has(normalize(option.label))) {
      values.push(option.label, option.value);
    }
  });

  return normalize(values.join(" "));
};

export const listingMatchesSearch = (listing: SearchableListingFields, query: string) => {
  const normalizedQuery = normalize(query);
  return !normalizedQuery || getListingSearchText(listing).includes(normalizedQuery);
};

export interface SubcategorySuggestion {
  label: string;
  value: string;
  category: string;
}

export const getSubcategorySuggestions = (query: string, limit = 5): SubcategorySuggestion[] => {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) return [];

  const suggestions: SubcategorySuggestion[] = [];
  BUSINESS_CATEGORIES
    .filter(category => category !== "All Categories")
    .forEach(category => {
      (getSubcategoriesForCategory(category) || []).forEach(option => {
        if (
          normalize(option.label).includes(normalizedQuery) ||
          normalize(option.value).includes(normalizedQuery)
        ) {
          suggestions.push({ ...option, category });
        }
      });
    });

  return suggestions.slice(0, limit);
};
