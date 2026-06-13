import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { typography } from "../../theme/typography";

export function SectionHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center justify-between gap-3", className)}>
      <h2 className={cn(typography.sectionTitle, "min-w-0 truncate")}>{title}</h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
