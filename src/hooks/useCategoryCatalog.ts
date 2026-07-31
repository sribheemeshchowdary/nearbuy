import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BUSINESS_CATEGORIES } from "@/lib/districts";
import { getSubcategoriesForCategory, type MultiSelectOption } from "@/lib/listing-form-config";

export interface CategoryCatalogItem {
  name: string;
  subcategories: MultiSelectOption[];
}

const DEV_CATALOG_STORAGE_KEY = "nearbuy_dev_category_catalog";
const DEV_CATALOG_UPDATED_EVENT = "nearbuy:category-catalog-updated";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const createSubcategoryOption = (label: string): MultiSelectOption => ({
  label: label.trim(),
  value: slugify(label),
});

export const DEFAULT_CATEGORY_CATALOG: CategoryCatalogItem[] = BUSINESS_CATEGORIES
  .filter((category) => category !== "All Categories")
  .map((name) => ({
    name,
    subcategories: getSubcategoriesForCategory(name) || [],
  }));

const normalizeCatalog = (value: unknown): CategoryCatalogItem[] => {
  if (!Array.isArray(value)) return DEFAULT_CATEGORY_CATALOG;

  const normalized = value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => {
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const rawSubcategories = Array.isArray(item.subcategories) ? item.subcategories : [];
      const subcategories = rawSubcategories
        .filter((sub): sub is Record<string, unknown> => !!sub && typeof sub === "object")
        .map((sub) => ({
          label: typeof sub.label === "string" ? sub.label.trim() : "",
          value: typeof sub.value === "string" && sub.value.trim()
            ? sub.value.trim()
            : slugify(typeof sub.label === "string" ? sub.label : ""),
        }))
        .filter((sub) => sub.label && sub.value);
      return { name, subcategories };
    })
    .filter((item) => item.name);

  return normalized.length ? normalized : DEFAULT_CATEGORY_CATALOG;
};

const readDevelopmentCatalog = (): CategoryCatalogItem[] | null => {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(DEV_CATALOG_STORAGE_KEY);
    return stored ? normalizeCatalog(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
};

export const useCategoryCatalog = () => {
  const [catalog, setCatalog] = useState<CategoryCatalogItem[]>(
    () => readDevelopmentCatalog() || DEFAULT_CATEGORY_CATALOG,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The development Super Admin uses a simulated account, so it cannot wait
    // for an authenticated Firestore snapshot before enabling catalogue tools.
    // The local/default catalogue is already ready to use synchronously.
    if (import.meta.env.DEV) setLoading(false);

    const catalogRef = doc(db, "configuration", "categoryCatalog");
    const applyDevelopmentCatalog = () => {
      const developmentCatalog = readDevelopmentCatalog();
      if (developmentCatalog) {
        setCatalog(developmentCatalog);
        setLoading(false);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DEV_CATALOG_STORAGE_KEY) applyDevelopmentCatalog();
    };

    window.addEventListener(DEV_CATALOG_UPDATED_EVENT, applyDevelopmentCatalog);
    window.addEventListener("storage", handleStorage);

    const unsubscribe = onSnapshot(
      catalogRef,
      (snapshot) => {
        const developmentCatalog = readDevelopmentCatalog();
        setCatalog(
          developmentCatalog
          || (snapshot.exists() ? normalizeCatalog(snapshot.data().categories) : DEFAULT_CATEGORY_CATALOG),
        );
        setLoading(false);
      },
      () => {
        setCatalog(readDevelopmentCatalog() || DEFAULT_CATEGORY_CATALOG);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
      window.removeEventListener(DEV_CATALOG_UPDATED_EVENT, applyDevelopmentCatalog);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const categoryNames = useMemo(() => catalog.map((item) => item.name), [catalog]);
  const getSubcategories = (category: string) =>
    catalog.find((item) => item.name === category)?.subcategories || [];

  return { catalog, categoryNames, getSubcategories, loading };
};

export const saveCategoryCatalog = async (
  catalog: CategoryCatalogItem[],
  updatedBy: string,
) => {
  const normalized = normalizeCatalog(catalog);

  if (import.meta.env.DEV && updatedBy.startsWith("dev-") && typeof window !== "undefined") {
    window.localStorage.setItem(DEV_CATALOG_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event(DEV_CATALOG_UPDATED_EVENT));
    return;
  }

  await setDoc(doc(db, "configuration", "categoryCatalog"), {
    categories: normalized,
    categoryNames: normalized.map((item) => item.name),
    updatedAt: serverTimestamp(),
    updatedBy,
  });
};
