export type AppUpdatePlatform = "android" | "web";

export type UpdateTarget = {
  enabled: boolean;
  url?: string;
  apkUrl?: string;
  requiresNativeUpdate?: boolean;
};

export type AppUpdateManifest = {
  latest: {
    versionName: string;
    buildNumber: number;
    releasedAt?: string;
    notes?: string[];
  };
  mandatory?: boolean;
  checkIntervalMs?: number;
  targets?: {
    web?: UpdateTarget;
    android?: UpdateTarget;
  };
};

export type AvailableAppUpdate = {
  versionName: string;
  buildNumber: number;
  notes: string[];
  mandatory: boolean;
  platform: AppUpdatePlatform;
  installUrl: string;
};

export function selectAvailableAppUpdate(
  manifest: AppUpdateManifest,
  platform: AppUpdatePlatform,
  currentBuildNumber: number,
): AvailableAppUpdate | null {
  const target = platform === "android" ? manifest.targets?.android : manifest.targets?.web;
  if (!target?.enabled || manifest.latest.buildNumber <= currentBuildNumber) return null;
  if (platform === "android" && target.requiresNativeUpdate !== true) return null;

  const installUrl = platform === "android" ? target.apkUrl : target.url;
  if (!installUrl) return null;

  return {
    versionName: manifest.latest.versionName,
    buildNumber: manifest.latest.buildNumber,
    notes: manifest.latest.notes || [],
    mandatory: manifest.mandatory === true,
    platform,
    installUrl,
  };
}
