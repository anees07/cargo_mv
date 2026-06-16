import { DEFAULT_CATALOG_CATEGORY_DEFINITIONS } from "../data/catalogCategories";

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

const categoryIcons: Record<string, string> = Object.fromEntries(
  DEFAULT_CATALOG_CATEGORY_DEFINITIONS.map(category => [category.code, category.icon])
);

export function catalogIconForItem(
  itemName: string,
  category: string = "general_cargo",
  categoryIcon?: string,
) {
  const normalized = itemName.toLowerCase();
  const match = iconRules.find(rule => rule.keywords.some(keyword => normalized.includes(keyword)));
  return match?.icon || categoryIcon || categoryIcons[category] || DEFAULT_CATALOG_ICON;
}

export function isCatalogAutoIcon(icon: string, categoryIconsOverride: string[] = []) {
  return !icon || iconRules.some(rule => rule.icon === icon) || Object.values(categoryIcons).includes(icon) || categoryIconsOverride.includes(icon);
}
