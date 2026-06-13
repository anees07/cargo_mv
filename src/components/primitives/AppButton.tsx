import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export type AppButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success" | "warning";
export type AppButtonSize = "sm" | "md" | "lg";

const variants: Record<AppButtonVariant, string> = {
  primary: "bg-ocean-700 text-white hover:bg-ocean-800 active:bg-ocean-900",
  secondary: "bg-slate-100 text-slate-950 hover:bg-slate-200 active:bg-slate-300",
  outline: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100",
  ghost: "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
  destructive: "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
  warning: "bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700",
};

const sizes: Record<AppButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

export function AppButton({
  children,
  className,
  variant = "primary",
  size = "md",
  fullWidth,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  fullWidth?: boolean;
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2",
        sizes[size],
        variants[variant],
        fullWidth && "w-full",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 active:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500", className)}
    >
      {children}
    </button>
  );
}
