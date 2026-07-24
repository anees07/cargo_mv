# cargo_mv

## Release automation

Use these scripts so app versions, Android version codes, and update manifests stay in sync.

- `npm run build:ci` builds the web bundle without changing versions.
- `npm run deploy:web-update` builds and deploys the hosted web app for browser users.
- `npm run bump:release` increments patch version and build number, then updates `package.json`, `package-lock.json`, `src/appVersion.ts`, Android Gradle version fields, and `app-update.json`.
- `npm run build:release` bumps the release and builds a signed Android release APK locally.
- `npm run release:android` bumps, builds, uploads the APK to the matching GitHub Release, and deploys Firebase Hosting.

Production Android APKs bundle the `dist` web assets unless `CAPACITOR_SERVER_URL` is set before `npx cap sync android`. Use `npm run release:android` for changes that must reach installed Android apps; the script marks `app-update.json` with `requiresNativeUpdate: true` so existing Android installs show the APK update prompt. For browser-only fixes, `npm run deploy:web-update` is enough. For local native testing against a dev server, override the remote URL before syncing:

```sh
CAPACITOR_SERVER_URL=http://10.0.2.2:5173 npx cap sync android
```

The default release bump is patch, for example `1.0.8` to `1.0.9` and build `9` to `10`. To change the bump type locally:

```sh
RELEASE_BUMP_MODE=build npm run release:android
RELEASE_BUMP_MODE=minor npm run release:android
```

GitHub Actions has a manual `Build Android Release` workflow with `patch`, `minor`, `major`, and `build` options. It requires these repository secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `FIREBASE_SERVICE_ACCOUNT_CARGOMV_D41F8`
