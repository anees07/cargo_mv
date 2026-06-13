import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { sizing } from "../../theme/sizing";

export function DesktopNav({ children, className }: { children: ReactNode; className?: string }) {
  return <nav className={cn("hidden min-h-0 shrink-0 flex-col bg-slate-900 text-white lg:flex", sizing.sidebar, className)}>{children}</nav>;
}
