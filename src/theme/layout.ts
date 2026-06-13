import { responsive } from "./responsive";
import { spacing } from "./spacing";

export const layout = {
  appShell: "flex h-[var(--app-height)] w-full overflow-hidden bg-slate-100 text-slate-950",
  main: "relative flex h-full min-w-0 flex-1 flex-col bg-slate-50 lg:border-l lg:border-slate-200",
  pageContainer: responsive.page,
  pageScroll: "flex-1 overflow-y-auto overscroll-contain no-scrollbar",
  pageSpacing: spacing.section,
  toolbar: "flex flex-col gap-3 border-b border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between md:p-4",
} as const;
