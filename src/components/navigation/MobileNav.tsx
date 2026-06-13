import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function MobileNav({ children, className }: { children: ReactNode; className?: string }) {
  return <nav className={cn("lg:hidden", className)}>{children}</nav>;
}
