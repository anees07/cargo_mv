import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { typography } from "../../theme/typography";
import { AppCard } from "./AppCard";

export function StatCard({
  label,
  value,
  detail,
  icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <AppCard className={cn("p-4 md:p-5", className)}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn(typography.label, "truncate uppercase tracking-wider text-slate-500")}>{label}</p>
          <p className="mt-2 break-words text-xl font-semibold text-slate-950 md:text-2xl">{value}</p>
          {detail && <p className={cn(typography.muted, "mt-1 truncate")}>{detail}</p>}
        </div>
        {icon && <div className="shrink-0">{icon}</div>}
      </div>
    </AppCard>
  );
}
