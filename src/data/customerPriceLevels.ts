import type { CustomerPriceLevel, CustomerPriceLevelCode, ID, ISODate } from "../types";

export const CUSTOMER_PRICE_LEVEL_DEFINITIONS: Array<Omit<CustomerPriceLevel, "businessProfileId" | "createdAt" | "updatedAt">> = [
  {
    id: "pl_business",
    code: "business",
    name: "Business",
    description: "Registered companies and repeat trade customers.",
    adjustmentType: "percentage",
    adjustmentValue: 0,
    activeStatus: true,
    sortOrder: 10,
  },
  {
    id: "pl_government",
    code: "government",
    name: "Government",
    description: "Councils, ministries, authorities, and public institutions.",
    adjustmentType: "percentage",
    adjustmentValue: 0,
    activeStatus: true,
    sortOrder: 20,
  },
  {
    id: "pl_individual",
    code: "individual",
    name: "Individual",
    description: "Personal cargo customers with named customer records.",
    adjustmentType: "percentage",
    adjustmentValue: 0,
    activeStatus: true,
    sortOrder: 30,
  },
  {
    id: "pl_walk_in",
    code: "walk_in",
    name: "Walk-In",
    description: "One-off counter customers without credit terms.",
    adjustmentType: "percentage",
    adjustmentValue: 0,
    activeStatus: true,
    sortOrder: 40,
  },
];

export function buildCustomerPriceLevel(
  businessProfileId: ID,
  code: CustomerPriceLevelCode,
  overrides: Partial<CustomerPriceLevel> = {},
  timestamp: ISODate = new Date().toISOString()
): CustomerPriceLevel {
  const definition = CUSTOMER_PRICE_LEVEL_DEFINITIONS.find(level => level.code === code);
  if (!definition) {
    throw new Error(`Unsupported customer price level: ${code}`);
  }
  return {
    ...definition,
    ...overrides,
    id: definition.id,
    code: definition.code,
    businessProfileId,
    adjustmentType: overrides.adjustmentType || definition.adjustmentType,
    adjustmentValue: Number.isFinite(overrides.adjustmentValue) ? Number(overrides.adjustmentValue) : definition.adjustmentValue,
    createdAt: overrides.createdAt || timestamp,
    updatedAt: timestamp,
  };
}

export function describePriceLevelAdjustment(priceLevel: Pick<CustomerPriceLevel, "adjustmentType" | "adjustmentValue">): string {
  const value = Number(priceLevel.adjustmentValue);
  if (value === 0) return "Same as standard price";
  const direction = value > 0 ? "+" : "";
  return priceLevel.adjustmentType === "percentage"
    ? `${direction}${value}% on standard price`
    : `${direction}MVR ${value} on standard price`;
}

export function calculatePriceFromStandard(
  standardPrice: number,
  priceLevel?: Pick<CustomerPriceLevel, "adjustmentType" | "adjustmentValue" | "activeStatus"> | null
): number {
  if (!priceLevel || priceLevel.activeStatus === false) return standardPrice;
  const adjusted = priceLevel.adjustmentType === "percentage"
    ? standardPrice + (standardPrice * priceLevel.adjustmentValue / 100)
    : standardPrice + priceLevel.adjustmentValue;
  return Math.max(0, Number(adjusted.toFixed(2)));
}

export function toFirestoreCustomerPriceLevel(priceLevel: CustomerPriceLevel): CustomerPriceLevel {
  return {
    id: priceLevel.id,
    businessProfileId: priceLevel.businessProfileId,
    code: priceLevel.code,
    name: priceLevel.name,
    description: priceLevel.description,
    adjustmentType: priceLevel.adjustmentType,
    adjustmentValue: priceLevel.adjustmentValue,
    activeStatus: priceLevel.activeStatus,
    sortOrder: priceLevel.sortOrder,
    createdAt: priceLevel.createdAt,
    updatedAt: priceLevel.updatedAt,
  };
}
