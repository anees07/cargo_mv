import assert from "node:assert/strict";
import test from "node:test";

import { selectAvailableAppUpdate, type AppUpdateManifest } from "./appUpdatePolicy.js";

const manifest = (overrides: Partial<AppUpdateManifest> = {}): AppUpdateManifest => ({
  latest: {
    versionName: "1.0.11",
    buildNumber: 12,
    notes: ["Outstanding cards now calculate from active bills"],
  },
  mandatory: false,
  targets: {
    web: {
      enabled: true,
      url: "https://cargomv-d41f8.web.app/",
    },
    android: {
      enabled: true,
      apkUrl: "https://github.com/anees07/cargo_mv/releases/download/v1.0.11/maldives-cargo-1.0.11-build12.apk",
    },
  },
  ...overrides,
});

test("android does not show APK update for web-only releases", () => {
  assert.equal(selectAvailableAppUpdate(manifest(), "android", 11), null);
});

test("android shows APK update only when native update is explicitly required", () => {
  const update = selectAvailableAppUpdate(
    manifest({
      targets: {
        android: {
          enabled: true,
          requiresNativeUpdate: true,
          apkUrl: "https://github.com/anees07/cargo_mv/releases/download/v1.0.12/maldives-cargo-1.0.12-build13.apk",
        },
      },
    }),
    "android",
    11,
  );

  assert.equal(update?.platform, "android");
  assert.equal(update?.buildNumber, 12);
});

test("web still receives refresh updates from the hosted app", () => {
  const update = selectAvailableAppUpdate(manifest(), "web", 11);

  assert.equal(update?.platform, "web");
  assert.equal(update?.installUrl, "https://cargomv-d41f8.web.app/");
});
