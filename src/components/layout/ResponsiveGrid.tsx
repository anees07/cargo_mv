import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { responsive } from "../../theme/responsive";

type Columns = "auto" | "stats" | "two" | "three";

export function ResponsiveGrid({ children, columns = "auto", className }: { children: ReactNode; columns?: Columns; className?: string }) {
  const variants: Record<Columns, string> = {
    auto: responsive.grid,
    stats: responsive.statsGrid,
    two: "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6",
    three: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6",
  };

  return <div className={cn(variants[columns], className)}>{children}</div>;
}
