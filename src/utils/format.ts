// Utility helpers — formatting, currency, calculations
export const MVR = (n: number) =>
  `MVR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const MVRShort = (n: number) =>
  `MVR ${Math.round(n).toLocaleString()}`;

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

export const formatDateTime = (iso: string) => `${formatDate(iso)} • ${formatTime(iso)}`;

export const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export const calcTaxBreakdown = (taxInclusive: number, taxRate: number) => {
  const base = taxInclusive / (1 + taxRate / 100);
  const tax = taxInclusive - base;
  return { base: Number(base.toFixed(2)), tax: Number(tax.toFixed(2)) };
};

export const roleLabel = (role: string) => ({
  owner: "Owner", admin: "Admin", manager: "Manager", cashier: "Cashier",
  loading_staff: "Loading Staff", offloading_staff: "Offloading Staff", viewer: "Viewer / Auditor",
}[role] || role);

export const roleColor = (role: string): string => ({
  owner: "bg-amber-100 text-amber-800 border-amber-200",
  admin: "bg-violet-100 text-violet-800 border-violet-200",
  manager: "bg-ocean-100 text-ocean-800 border-ocean-200",
  cashier: "bg-emerald-100 text-emerald-800 border-emerald-200",
  loading_staff: "bg-orange-100 text-orange-800 border-orange-200",
  offloading_staff: "bg-rose-100 text-rose-800 border-rose-200",
  viewer: "bg-slate-100 text-slate-700 border-slate-200",
}[role] || "bg-slate-100 text-slate-700 border-slate-200");

export const statusColor = (status: string): string => ({
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  open: "bg-ocean-100 text-ocean-800 border-ocean-200",
  loading: "bg-amber-100 text-amber-800 border-amber-200",
  sailing: "bg-indigo-100 text-indigo-800 border-indigo-200",
  offloading: "bg-orange-100 text-orange-800 border-orange-200",
  ended: "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed: "bg-slate-200 text-slate-700 border-slate-300",
  finalized: "bg-ocean-100 text-ocean-800 border-ocean-200",
  partially_paid: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  credit: "bg-violet-100 text-violet-800 border-violet-200",
  cancelled: "bg-rose-100 text-rose-800 border-rose-200",
  adjusted: "bg-slate-100 text-slate-700 border-slate-200",
  unpaid: "bg-rose-100 text-rose-800 border-rose-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
}[status] || "bg-slate-100 text-slate-700 border-slate-200");

export const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

export const groupBy = <T, K extends string | number>(arr: T[], key: (item: T) => K): Record<K, T[]> => {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
};

export const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
