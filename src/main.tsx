import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { getFirebaseFirestore, getFirebaseProjectId, isFirebaseConfigured } from "./lib/firebase";

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
