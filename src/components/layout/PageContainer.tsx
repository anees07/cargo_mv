import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { layout } from "../../theme/layout";

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(layout.pageContainer, layout.pageSpacing, className)}>{children}</div>;
}
