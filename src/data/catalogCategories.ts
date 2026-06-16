import type { CatalogCategory, ID, ISODate } from "../types";

export const DEFAULT_CATALOG_CATEGORY_DEFINITIONS: Array<Omit<CatalogCategory, "businessProfileId" | "createdAt" | "updatedAt">> = [
  { id: "general_cargo", code: "general_cargo", name: "General cargo", icon: "📦", activeStatus: true, sortOrder: 10 },
  { id: "perishable", code: "perishable", name: "Perishable", icon: "🥬", activeStatus: true, sortOrder: 20 },
  { id: "construction", code: "construction", name: "Construction", icon: "🧱", activeStatus: true, sortOrder: 30 },
  { id: "fuel", code: "fuel", name: "Fuel", icon: "⛽", activeStatus: true, sortOrder: 40 },
  { id: "vehicle", code: "vehicle", name: "Vehicle", icon: "🛵", activeStatus: true, sortOrder: 50 },
  { id: "other", code: "other", name: "Other", icon: "📦", activeStatus: true, sortOrder: 60 },
];

export function slugifyCatalogCategoryCode(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 32) || "category";
}

export function makeUniqueCatalogCategoryCode(name: string, existingCodes: Iterable<string>) {
  const base = slugifyCatalogCategoryCode(name);
  const taken = new Set(existingCodes);
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

export function buildCatalogCategory(
  businessProfileId: ID,
  code: string,
  overrides: Partial<CatalogCategory> = {},
  timestamp: ISODate = new Date().toISOString()
): CatalogCategory {
  const definition = DEFAULT_CATALOG_CATEGORY_DEFINITIONS.find(category => category.code === code);
  const base = definition || { id: code, code, name: overrides.name || code, icon: overrides.icon || "📦", activeStatus: true, sortOrder: 999 };
  return {
    ...base,
    ...overrides,
    id: code,
    code,
    businessProfileId,
    name: overrides.name?.trim() || base.name,
    icon: overrides.icon || base.icon,
    activeStatus: overrides.activeStatus ?? base.activeStatus,
    sortOrder: overrides.sortOrder ?? base.sortOrder,
    createdAt: overrides.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

export function toFirestoreCatalogCategory(category: CatalogCategory): CatalogCategory {
  return {
    id: category.id,
    businessProfileId: category.businessProfileId,
    code: category.code,
    name: category.name,
    icon: category.icon,
    activeStatus: category.activeStatus,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export function catalogCategoryLabel(category: string) {
  return DEFAULT_CATALOG_CATEGORY_DEFINITIONS.find(item => item.code === category)?.name || category.replace(/_/g, " ");
}
