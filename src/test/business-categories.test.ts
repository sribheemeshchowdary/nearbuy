import { describe, expect, it } from "vitest";
import { BUSINESS_CATEGORIES } from "@/lib/districts";
import {
  getSubcategoriesForCategory,
  needsSubcategoryScreen,
} from "@/lib/listing-form-config";

describe("business category configuration", () => {
  it.each(["Sports", "Retail"])("exposes %s in registration and admin category lists", (category) => {
    expect(BUSINESS_CATEGORIES).toContain(category);
  });

  it.each(["Sports", "Retail"])("requires configured subcategories for %s", (category) => {
    expect(needsSubcategoryScreen(category)).toBe(true);
    expect(getSubcategoriesForCategory(category)?.length).toBeGreaterThan(0);
  });

  it("includes Snacks under Home Food", () => {
    expect(getSubcategoriesForCategory("Home Food")).toContainEqual({
      label: "Snacks",
      value: "snacks",
    });
  });
});
