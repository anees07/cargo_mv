import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function AppTabs({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("no-scrollbar flex max-w-full gap-2 overflow-x-auto", className)}>{children}</div>;
}

export function AppTab({ active, children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition", active ? "bg-ocean-700 text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200", className)}
    >
      {children}
    </button>
  );
}
