import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { typography } from "../../theme/typography";

export function EmptyState({ icon, title, description, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-40 flex-col items-center justify-center rounded-xl px-4 py-10 text-center", className)}>
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">{icon}</div>}
      <p className={typography.cardTitle}>{title}</p>
      {description && <p className={cn(typography.muted, "mt-1 max-w-sm")}>{description}</p>}
    </div>
  );
}

export function LoadingState({ title = "Loading", className }: { title?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-40 items-center justify-center gap-3 text-sm text-slate-500", className)}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {title}
    </div>
  );
}

export function ErrorState({ title, description, className }: { title: ReactNode; description?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-rose-200 bg-rose-50 p-4", className)}>
      <p className="text-sm font-semibold text-rose-800">{title}</p>
      {description && <p className="mt-1 text-xs leading-5 text-rose-700">{description}</p>}
    </div>
  );
}
