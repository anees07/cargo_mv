import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { layout } from "../../theme/layout";

export function AppShell({ sidebar, children, drawer }: { sidebar?: ReactNode; children: ReactNode; drawer?: ReactNode }) {
  return (
    <div className={layout.appShell}>
      {sidebar}
      <main className={cn(layout.main)}>{children}</main>
      {drawer}
    </div>
  );
}
