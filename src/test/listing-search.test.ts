import { describe, expect, it } from "vitest";
import { getSubcategorySuggestions, listingMatchesSearch } from "@/lib/listing-search";

describe("listing subcategory search", () => {
  const yogaListing = {
    name: "Calm Studio",
    category: "Wellness",
    district: "Tampines",
    subcategoryList: ["yoga", "meditation"],
    subcategoryData: { subcategories: ["yoga", "meditation"] },
  };

  it("matches a listing by its subcategory label", () => {
    expect(listingMatchesSearch(yogaListing, "Yoga")).toBe(true);
  });

  it("matches human-readable searches against slugged subcategories", () => {
    expect(listingMatchesSearch({
      ...yogaListing,
      subcategoryList: ["personal-training"],
      subcategoryData: {},
    }, "personal training")).toBe(true);
  });

  it("suggests subcategories with their parent category", () => {
    expect(getSubcategorySuggestions("yog")).toContainEqual({
      label: "Yoga",
      value: "yoga",
      category: "Wellness",
    });
  });

  it("does not match an unrelated subcategory", () => {
    expect(listingMatchesSearch(yogaListing, "plumber")).toBe(false);
  });
});
