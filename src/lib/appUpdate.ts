import { Capacitor, registerPlugin } from "@capacitor/core";
import { APP_BUILD, APP_VERSION } from "../appVersion";
import { selectAvailableAppUpdate, type AppUpdateManifest, type AvailableAppUpdate } from "./appUpdatePolicy";

export type { AvailableAppUpdate } from "./appUpdatePolicy";

type AppUpdaterPlugin = {
  downloadAndInstall(options: { url: string; fileName: string }): Promise<{ openedSettings?: boolean }>;
};

const AppUpdater = registerPlugin<AppUpdaterPlugin>("AppUpdater");
const currentBuildNumber = Number(APP_BUILD);
const remoteManifestUrl = "https://cargomv-d41f8.web.app/app-update.json";

export const appUpdateCheckIntervalMs = 60000;

function updateManifestUrl() {
  const baseUrl = Capacitor.isNativePlatform() ? remoteManifestUrl : "/app-update.json";
  return `${baseUrl}?ts=${Date.now()}`;
}

function currentPlatform(): "android" | "web" {
  return Capacitor.getPlatform() === "android" ? "android" : "web";
}

export async function checkForAppUpdate(): Promise<AvailableAppUpdate | null> {
  const response = await fetch(updateManifestUrl(), { cache: "no-store" });
  if (!response.ok) return null;

  const manifest = await response.json() as AppUpdateManifest;
  const platform = currentPlatform();
  return selectAvailableAppUpdate(manifest, platform, currentBuildNumber);
}

export async function installAppUpdate(update: AvailableAppUpdate) {
  if (update.platform === "android" && Capacitor.isNativePlatform()) {
    return AppUpdater.downloadAndInstall({
      url: update.installUrl,
      fileName: `maldives-cargo-${update.versionName}-build-${update.buildNumber}.apk`,
    });
  }

  if (update.installUrl) {
    window.location.assign(update.installUrl);
    return {};
  }

  window.location.reload();
  return {};
}

export function installedReleaseLabel() {
  return `Installed v${APP_VERSION} (${APP_BUILD})`;
}
