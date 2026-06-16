import type { CatalogItem, ID, ISODate, ItemPriceRate } from "../types";

export const SYSTEM_OTHER_ITEM_ID = "system_other";
export const SYSTEM_OTHER_ITEM_CODE = "OTHERS";

export function isSystemOtherItem(item: Pick<CatalogItem, "id" | "itemCode">) {
  return item.id === SYSTEM_OTHER_ITEM_ID || item.itemCode === SYSTEM_OTHER_ITEM_CODE;
}

export function buildSystemOtherCatalogItem(
  businessProfileId: ID,
  timestamp: ISODate = new Date().toISOString(),
): CatalogItem {
  return {
    id: SYSTEM_OTHER_ITEM_ID,
    businessProfileId,
    itemName: "Others",
    itemCode: SYSTEM_OTHER_ITEM_CODE,
    category: "other",
    unitType: "piece",
    defaultTaxRate: 8,
    taxInclusive: true,
    activeStatus: true,
    icon: "📦",
    systemItemType: "other",
    createdAt: timestamp,
  };
}

export function buildSystemOtherStandardRate(
  businessProfileId: ID,
  timestamp: ISODate = new Date().toISOString(),
): ItemPriceRate {
  return {
    id: "price_system_other_standard",
    businessProfileId,
    itemId: SYSTEM_OTHER_ITEM_ID,
    priceLevel: "standard",
    priceTaxInclusive: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
