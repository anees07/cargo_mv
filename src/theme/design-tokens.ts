import { navigation } from "./navigation";
import { responsive } from "./responsive";
import { sizing } from "./sizing";
import { spacing } from "./spacing";
import { typography } from "./typography";

export const tokens = {
  color: {
    bg: "bg-slate-50",
    surface: "bg-white",
    card: "bg-white",
    border: "border-slate-200",
    text: "text-slate-950",
    muted: "text-slate-500",
    primary: "bg-ocean-700 text-white",
    primaryHover: "hover:bg-ocean-800",
    destructive: "bg-rose-600 text-white",
    success: "bg-emerald-600 text-white",
    warning: "bg-amber-500 text-white",
  },
  radius: {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    full: "rounded-full",
  },
  shadow: {
    card: "shadow-sm",
    raised: "shadow-md",
    modal: "shadow-2xl",
  },
  focus: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2",
  responsive,
  spacing,
  sizing,
  typography,
  navigation,
} as const;
