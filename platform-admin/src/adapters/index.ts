import { FixturePlatformAdminService } from "./fixtureAdapter";
import { LivePlatformAdminService } from "./liveAdapter";
import type { PlatformAdminService } from "./contracts";

const requestedMode = import.meta.env.VITE_PLATFORM_ADMIN_DATA_MODE as string | undefined;
const hasFirebaseConfig = Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID);
export const dataMode = requestedMode === "fixtures" || (!hasFirebaseConfig && requestedMode !== "live") ? "fixtures" : "live";
export const platformAdminService: PlatformAdminService = dataMode === "live" ? new LivePlatformAdminService() : new FixturePlatformAdminService();
