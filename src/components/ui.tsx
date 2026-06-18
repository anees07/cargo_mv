import { useEffect, type ReactNode, type ButtonHTMLAttributes, type ReactElement } from "react";
import { statusColor, statusLabel } from "../utils/format";
import type { TripStatus, BillStatus } from "../types";
import { cn } from "../lib/cn";
import { typography } from "../theme/typography";
import { spacing } from "../theme/spacing";

export { AppLayout } from "./layout/AppLayout";
export { AppShell } from "./layout/AppShell";
export { PageContainer } from "./layout/PageContainer";
export { PageHeader } from "./layout/PageHeader";
export { ResponsiveForm } from "./layout/ResponsiveForm";
export { ResponsiveGrid } from "./layout/ResponsiveGrid";
export { ResponsiveStack } from "./layout/ResponsiveStack";
export { SectionHeader } from "./layout/SectionHeader";
export { AppSidebar } from "./navigation/AppSidebar";
export { DesktopNav } from "./navigation/DesktopNav";
export { MobileNav } from "./navigation/MobileNav";
export { NavigationItem } from "./navigation/NavigationItem";
export { NotificationButton, UserMenu } from "./navigation/TopBar";
export { ActionCard, AppCard, InfoCard, ListCard, SummaryCard } from "./primitives/AppCard";
export { AppBadge } from "./primitives/AppBadge";
export { AppButton, IconButton } from "./primitives/AppButton";
export { AppInput, AppSearchInput, AppSelect, AppTextarea, FieldLabel } from "./primitives/AppFormControls";
export { AppTab, AppTabs } from "./primitives/AppTabs";
export { AppTable, MobileCardTable } from "./primitives/AppTable";
export { ConfirmDialog } from "./primitives/AppModal";
export { EmptyState, ErrorState, LoadingState } from "./primitives/States";

// ============================================================================
// Reusable atomic UI components — modeled after Flutter Material widgets
// ============================================================================

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const icons: Record<string, ReactElement> = {
    home: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2V9z" />,
    trip: <><path d="M3 13l2-5h14l2 5" /><path d="M5 17v2a1 1 0 001 1h12a1 1 0 001-1v-2" /><path d="M12 3v3" /><path d="M9 6h6" /></>,
    package: <><path d="M16.5 9.4l-9-5.19" /><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><path d="M3.27 6.96L12 12.01l8.73-5.05" /><path d="M12 22.08V12" /></>,
    map: <><path d="M1 6v16l7-3 8 3 7-3V3l-7 3-8-3-7 3z" /><path d="M8 3v15" /><path d="M16 6v15" /></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></>,
    receipt: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h6" /></>,
    chart: <><path d="M3 3v18h18" /><path d="M7 12l4-4 4 4 5-5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 8a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    check: <path d="M20 6L9 17l-5-5" />,
    x: <><path d="M18 6L6 18" /><path d="M6 6l12 12" /></>,
    back: <><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></>,
    menu: <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>,
    bell: <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></>,
    search: <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>,
    filter: <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />,
    printer: <><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.59 13.51l6.83 3.98" /><path d="M15.41 6.51l-6.82 3.98" /></>,
    download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></>,
    anchor: <><circle cx="12" cy="5" r="3" /><path d="M12 22V8" /><path d="M5 12H2a10 10 0 0020 0h-3" /></>,
    wifi: <><path d="M5 12.55a11 11 0 0114 0" /><path d="M1.42 9a16 16 0 0121.16 0" /><path d="M8.53 16.11a6 6 0 016.95 0" /><path d="M12 20h.01" /></>,
    wifi_off: <><path d="M1 1l22 22" /><path d="M16.72 11.06A10.94 10.94 0 0119 12.55" /><path d="M5 12.55a10.94 10.94 0 015.17-2.39" /><path d="M10.71 5.05A16 16 0 0122.58 9" /><path d="M1.42 9a15.91 15.91 0 014.7-2.88" /><path d="M8.53 16.11a6 6 0 016.95 0" /><path d="M12 20h.01" /></>,
    dollar: <><path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
    ship: <><path d="M3 18l2 2h14l2-2" /><path d="M5 18V8l7-4 7 4v10" /><path d="M12 4v14" /><path d="M9 8h6" /></>,
    island: <><path d="M12 2l3 5 5 1-4 4 1 5-5-3-5 3 1-5-4-4 5-1z" /></>,
    layers: <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>,
    sync: <><path d="M21 12a9 9 0 11-6-8.49" /><path d="M21 4v6h-6" /></>,
    chevron_right: <path d="M9 18l6-6-6-6" />,
    chevron_down: <path d="M6 9l6 6 6-6" />,
    log: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M9 13h6" /><path d="M9 17h6" /></>,
    building: <><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v.01" /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" /></>,
    database: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" /><path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" /></>,
    truck: <><path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
    more: <><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></>,
    arrow_up: <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>,
    arrow_down: <><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></>,
    cash: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01" /><path d="M18 12h.01" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
    save: <><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></>,
    link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></>,
    refresh: <><path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></>,
    check_circle: <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></>,
    warning: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
    info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
    pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></>,
    list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>,
    file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></>,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  );
}

export function StatusBadge({ status, className = "" }: { status: TripStatus | BillStatus | string; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize leading-5", statusColor(status), className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="truncate">{statusLabel(status)}</span>
    </span>
  );
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: string;
  iconRight?: string;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Btn({ variant = "primary", size = "md", icon, iconRight, loading, fullWidth, className = "", children, ...rest }: BtnProps) {
  const sizes = { sm: "min-h-9 px-3 text-sm", md: "min-h-11 px-4 text-sm", lg: "min-h-12 px-5 text-base" };
  const variants = {
    primary: "bg-ocean-700 text-white hover:bg-ocean-800 active:bg-ocean-900 shadow-sm",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300",
    ghost: "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
    danger: "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm",
    outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100",
  };
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={cn("inline-flex min-w-0 items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2", sizes[size], variants[variant], fullWidth && "w-full", className)}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon ? <Icon name={icon} className="h-4 w-4" /> : null}
      <span className="min-w-0 truncate">{children}</span>
      {iconRight ? <Icon name={iconRight} className="h-4 w-4" /> : null}
    </button>
  );
}

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn("w-full min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm", onClick && "cursor-pointer transition-shadow hover:shadow-md", className)}>
      {children}
    </div>
  );
}

export function Section({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {title && (
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3 px-1">
          <h3 className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-slate-500 md:text-sm">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, icon, color = "ocean" }: { label: string; value: string; sub?: string; icon?: string; color?: "ocean" | "emerald" | "amber" | "violet" | "rose" }) {
  const colors = {
    ocean: "from-ocean-500 to-ocean-700",
    emerald: "from-emerald-500 to-emerald-700",
    amber: "from-amber-500 to-amber-600",
    violet: "from-violet-500 to-violet-700",
    rose: "from-rose-500 to-rose-700",
  };
  return (
    <Card className="overflow-hidden p-0">
      <div className={cn(spacing.cardCompact)}>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-2 break-words text-xl font-semibold text-slate-900 md:text-2xl">{value}</p>
            {sub && <p className="mt-1 truncate text-xs text-slate-500 md:text-sm">{sub}</p>}
          </div>
          {icon && (
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${colors[color]} text-white shadow-sm`}>
              <Icon name={icon} className="h-5 w-5" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function Empty({ icon = "package", title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-4 py-10 text-center md:px-6 md:py-12">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 md:h-14 md:w-14">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <p className={typography.cardTitle}>{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 md:text-sm">{hint}</p>}
    </div>
  );
}

export function TopBar({ title, subtitle, leading, trailing, onBack }: { title: string; subtitle?: string; leading?: ReactNode; trailing?: ReactNode; onBack?: () => void }) {
  return (
    <div className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur safe-top md:min-h-16 md:px-4">
      {onBack ? (
        <button onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500">
          <Icon name="back" className="h-5 w-5" />
        </button>
      ) : leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-slate-900 md:text-lg">{title}</div>
        {subtitle && <div className="truncate text-xs text-slate-500 md:text-sm">{subtitle}</div>}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, full = false }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; full?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center safe-modal sm:items-center animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={cn("relative max-h-[92dvh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-slide-up sm:mx-4 sm:rounded-2xl sm:animate-scale-in", full ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        {title && (
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="min-w-0 truncate text-base font-semibold text-slate-900">{title}</h3>
            <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-slate-100">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="max-h-[calc(92dvh-56px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Toast({ toasts, onDismiss }: { toasts: { id: string; title: string; body?: string; variant: string }[]; onDismiss: (id: string) => void }) {
  const autoDismissMs = 2500;
  const variants: Record<string, string> = {
    success: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
    warning: "bg-amber-500 text-white",
    info: "bg-ocean-700 text-white",
  };
  const visibleToasts = toasts.filter((toast, index) => {
    const key = `${toast.variant}:${toast.title}:${toast.body || ""}`;
    return toasts.findIndex((item, itemIndex) =>
      itemIndex > index &&
      `${item.variant}:${item.title}:${item.body || ""}` === key
    ) === -1;
  });

  useEffect(() => {
    const timers = toasts.map(toast => window.setTimeout(() => onDismiss(toast.id), autoDismissMs));
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [toasts, onDismiss]);

  return (
    <div className="pointer-events-none fixed left-0 right-0 z-50 flex flex-col items-center gap-1.5 px-4 safe-toast-top safe-x sm:right-4 sm:left-auto sm:items-end">
      {visibleToasts.map(t => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className={cn("pointer-events-auto flex w-auto min-w-0 max-w-[260px] items-center gap-2 rounded-lg px-3 py-2 shadow-md animate-slide-down", variants[t.variant])}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{t.title}</p>
            {t.body && <p className="mt-0.5 truncate text-xs opacity-90">{t.body}</p>}
          </div>
          <button onClick={() => onDismiss(t.id)} className="shrink-0 opacity-70 hover:opacity-100">
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// DataListBuilder Pattern Implementation
// Standardized list rendering layout for CRUD screens, providing uniform 
// empty states and consistent list mappings.
// ============================================================================
export function DataListBuilder<T>({
  data,
  keyExtractor,
  renderItem,
  emptyTitle,
  emptyHint,
  icon = "list",
}: {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  emptyTitle: string;
  emptyHint?: string;
  icon?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center px-4 py-12 text-center md:px-6 md:py-16">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400 md:h-16 md:w-16">
          <Icon name={icon} className="h-7 w-7 md:h-8 md:w-8" />
        </div>
        <p className={typography.cardTitle}>{emptyTitle}</p>
        {emptyHint && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{emptyHint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {data.map((item, index) => (
        <div key={keyExtractor(item)}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
