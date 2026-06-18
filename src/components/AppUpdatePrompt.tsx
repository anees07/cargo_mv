import { useCallback, useEffect, useState } from "react";
import { Btn, Icon } from "./ui";
import {
  appUpdateCheckIntervalMs,
  checkForAppUpdate,
  installAppUpdate,
  installedReleaseLabel,
  type AvailableAppUpdate,
} from "../lib/appUpdate";

const dismissedKey = "cargomv.dismissedUpdateBuild";

export function AppUpdatePrompt() {
  const [update, setUpdate] = useState<AvailableAppUpdate | null>(null);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState("");

  const check = useCallback(async () => {
    try {
      const nextUpdate = await checkForAppUpdate();
      const dismissedBuild = Number(window.localStorage.getItem(dismissedKey) || "0");
      if (nextUpdate && (nextUpdate.mandatory || nextUpdate.buildNumber !== dismissedBuild)) {
        setUpdate(nextUpdate);
      }
    } catch {
      // Update checks must never block the cargo workflow.
    }
  }, []);

  useEffect(() => {
    void check();
    const interval = window.setInterval(check, appUpdateCheckIntervalMs);
    const onFocus = () => void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  if (!update) return null;

  const isNativeApkUpdate = update.platform === "android";

  const dismiss = () => {
    window.localStorage.setItem(dismissedKey, String(update.buildNumber));
    setUpdate(null);
  };

  const install = async () => {
    setInstalling(true);
    setMessage("");
    try {
      const result = await installAppUpdate(update);
      if (result.openedSettings) {
        setMessage("Allow APK installs, then tap Install again.");
      } else if (update.platform === "android") {
        setMessage("Installer opened.");
      }
    } catch {
      setMessage("Update could not start.");
    } finally {
      setInstalling(false);
    }
  };

  if (isNativeApkUpdate) {
    return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 pb-4 pt-12 safe-x sm:items-center sm:pb-12">
        <div className="w-full max-w-md rounded-2xl border border-ocean-200 bg-white p-4 shadow-2xl">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ocean-50 text-ocean-700">
              <Icon name="download" className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-slate-950">App update available</p>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                Version {update.versionName} build {update.buildNumber} is ready to install.
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{installedReleaseLabel()}</p>
              {update.notes.length > 0 && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{update.notes[0]}</p>
              )}
              {message && <p className="mt-2 text-xs font-semibold text-amber-700">{message}</p>}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {!update.mandatory && (
              <Btn variant="outline" className="flex-1" onClick={dismiss}>
                Later
              </Btn>
            )}
            <Btn className="flex-1" icon="download" loading={installing} onClick={install}>
              Install update
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-50 px-3 pb-2 safe-x lg:bottom-4">
      <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-ocean-200 bg-white p-3 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ocean-50 text-ocean-700">
            <Icon name="download" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Update ready: v{update.versionName}</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              {installedReleaseLabel()} • {update.platform === "android" ? "APK installer" : "Web refresh"}
            </p>
            {update.notes.length > 0 && (
              <p className="mt-0.5 truncate text-xs text-slate-500">{update.notes[0]}</p>
            )}
            {message && <p className="mt-1 text-xs font-medium text-amber-700">{message}</p>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {!update.mandatory && (
            <Btn variant="outline" size="sm" onClick={dismiss}>
              Later
            </Btn>
          )}
          <Btn size="sm" icon={update.platform === "android" ? "download" : "refresh"} loading={installing} onClick={install}>
            {update.platform === "android" ? "Install" : "Refresh"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
