import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { spacing } from "../../theme/spacing";

export function AppCard({ children, className, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div {...props} className={cn("w-full min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm", spacing.card, className)}>
      {children}
    </div>
  );
}

export function InfoCard(props: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <AppCard {...props} />;
}

export function ListCard({ children, className, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <AppCard {...props} className={cn("p-0 md:p-0 lg:p-0 overflow-hidden", className)}>{children}</AppCard>;
}

export function SummaryCard(props: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <AppCard {...props} />;
}

export function ActionCard({ children, className, ...props }: HTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button {...props} className={cn("w-full min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500", className)}>
      {children}
    </button>
  );
}
