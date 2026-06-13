import type { FormHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { responsive } from "../../theme/responsive";

export function ResponsiveForm({ children, className, ...props }: FormHTMLAttributes<HTMLFormElement> & { children: ReactNode }) {
  return (
    <form {...props} className={cn(responsive.formGrid, className)}>
      {children}
    </form>
  );
}
