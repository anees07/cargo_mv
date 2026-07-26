export const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "MVR", currencyDisplay: "code", maximumFractionDigits: 0 }).format(value);
export const compactNumber = (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
export const shortDate = (value: string) => new Intl.DateTimeFormat("en-MV", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
export const dateTime = (value: string) => new Intl.DateTimeFormat("en-MV", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
export const relativeTime = (value: string) => {
  const hours = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 3_600_000));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

export const titleCase = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
