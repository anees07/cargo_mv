import type { ReactNode } from "react";
import { DesktopNav } from "./DesktopNav";

export function AppSidebar({ children }: { children: ReactNode }) {
  return <DesktopNav>{children}</DesktopNav>;
}
