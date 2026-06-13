import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function AppBadge({ children, className, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return (
    <span {...props} className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5", className)}>
      {children}
    </span>
  );
}
