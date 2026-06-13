import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { typography } from "../../theme/typography";

export function PageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryActions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className={cn(typography.pageTitle, "break-words")}>{title}</h1>
        {subtitle && <p className={cn(typography.muted, "mt-1 max-w-3xl break-words")}>{subtitle}</p>}
      </div>
      {(primaryAction || secondaryActions) && (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {secondaryActions}
          {primaryAction}
        </div>
      )}
    </header>
  );
}
