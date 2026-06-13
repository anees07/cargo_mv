import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function TopBar({
  leading,
  title,
  subtitle,
  trailing,
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur safe-top md:min-h-16 md:px-4", className)}>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-slate-950 md:text-lg">{title}</div>
        {subtitle && <div className="truncate text-xs text-slate-500 md:text-sm">{subtitle}</div>}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </header>
  );
}

export function UserMenu({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0", className)}>{children}</div>;
}

export function NotificationButton({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("relative", className)}>{children}</div>;
}
