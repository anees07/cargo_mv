import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function NavigationItem({
  active,
  icon,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      {...props}
      className={cn(
        "flex min-w-0 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500",
        active ? "bg-ocean-600 text-white shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white",
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}
