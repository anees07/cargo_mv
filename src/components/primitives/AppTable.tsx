import type { ReactNode, TableHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { responsive } from "../../theme/responsive";

export function AppTable({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className={responsive.tableWrap}>
      <table {...props} className={cn("min-w-full divide-y divide-slate-200 text-left text-sm", className)} />
    </div>
  );
}

export function MobileCardTable({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-3 md:hidden", className)}>{children}</div>;
}
