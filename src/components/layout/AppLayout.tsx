import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { layout } from "../../theme/layout";

export function AppLayout({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(layout.main, className)}>{children}</div>;
}
