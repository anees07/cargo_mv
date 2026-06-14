import type { CatalogItem } from "../types";

export const DEFAULT_CATALOG_ICON = "📦";

const iconRules: { keywords: string[]; icon: string }[] = [
  { keywords: ["rice", "grain", "flour", "sack"], icon: "🌾" },
  { keywords: ["cement", "block", "brick"], icon: "🧱" },
  { keywords: ["gas", "cylinder"], icon: "🔥" },
  { keywords: ["water", "bottle"], icon: "💧" },
  { keywords: ["fish", "frozen", "seafood"], icon: "🐟" },
  { keywords: ["steel", "rod", "metal"], icon: "🔩" },
  { keywords: ["diesel", "fuel", "petrol"], icon: "⛽" },
  { keywords: ["motorbike", "bike", "motorcycle"], icon: "🛵" },
  { keywords: ["medical", "medicine", "supply"], icon: "🩺" },
  { keywords: ["pipe", "pvc"], icon: "🔧" },
  { keywords: ["oil", "drum"], icon: "🛢️" },
  { keywords: ["linen", "laundry", "cloth"], icon: "🧺" },
  { keywords: ["engine", "motor"], icon: "⚙️" },
  { keywords: ["carton", "box", "case", "cargo"], icon: DEFAULT_CATALOG_ICON },
];

const categoryIcons: Record<CatalogItem["category"], string> = {
  general_cargo: DEFAULT_CATALOG_ICON,
  perishable: "🥬",
  construction: "🧱",
  fuel: "⛽",
  vehicle: "🛵",
  other: DEFAULT_CATALOG_ICON,
};

export function catalogIconForItem(
  itemName: string,
  category: CatalogItem["category"] = "general_cargo",
) {
  const normalized = itemName.toLowerCase();
  const match = iconRules.find(rule => rule.keywords.some(keyword => normalized.includes(keyword)));
  return match?.icon || categoryIcons[category] || DEFAULT_CATALOG_ICON;
}

export function isCatalogAutoIcon(icon: string) {
  return !icon || iconRules.some(rule => rule.icon === icon) || Object.values(categoryIcons).includes(icon);
}
