import { FixturePlatformAdminService } from "./fixtureAdapter";
import { LivePlatformAdminService } from "./liveAdapter";
import type { PlatformAdminService } from "./contracts";

export const dataMode = (import.meta.env.VITE_PLATFORM_ADMIN_DATA_MODE as string | undefined) === "live" ? "live" : "fixtures";
export const platformAdminService: PlatformAdminService = dataMode === "live" ? new LivePlatformAdminService() : new FixturePlatformAdminService();
