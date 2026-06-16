import { createContext } from "react";
import type { AppActions, AppState } from "./store";

export type AppContextValue = AppState & AppActions;

export const AppContext = createContext<AppContextValue | null>(null);
