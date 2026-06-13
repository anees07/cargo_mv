export const breakpoints = {
  mobile: "below 640px",
  tablet: "640px to 1024px",
  desktop: "above 1024px",
  largeDesktop: "above 1280px",
} as const;

export const responsive = {
  page: "w-full max-w-screen-2xl mx-auto px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8",
  content: "w-full min-w-0 space-y-4 md:space-y-6 lg:space-y-8",
  grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6",
  statsGrid: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6",
  formGrid: "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6",
  actions: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end",
  safeRow: "flex min-w-0 items-center gap-3",
  scrollTabs: "no-scrollbar flex max-w-full gap-2 overflow-x-auto px-4 py-2",
  tableWrap: "w-full overflow-x-auto rounded-xl border border-slate-200 bg-white",
} as const;
