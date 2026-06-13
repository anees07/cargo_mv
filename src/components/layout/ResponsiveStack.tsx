import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { spacing } from "../../theme/spacing";

export function ResponsiveStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(spacing.stack, className)}>{children}</div>;
}
