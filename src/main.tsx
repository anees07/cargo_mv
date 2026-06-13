import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { getFirebaseFirestore, getFirebaseProjectId, isFirebaseConfigured } from "./lib/firebase";

const syncAppHeight = () => {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
};

syncAppHeight();
window.visualViewport?.addEventListener("resize", syncAppHeight);
window.addEventListener("resize", syncAppHeight);

if (isFirebaseConfigured) {
  getFirebaseFirestore();
  console.info(`Firebase Firestore configured for project ${getFirebaseProjectId()}`);
} else {
  console.warn("Firebase Firestore is not configured. Add VITE_FIREBASE_* values to .env.local.");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
