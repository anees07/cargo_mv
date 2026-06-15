#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MODE="${RELEASE_BUMP_MODE:-patch}"
REPO_SLUG="${GITHUB_REPOSITORY:-anees07/cargo_mv}"

node scripts/bump-release.mjs --mode="$MODE" --repo="$REPO_SLUG"

VERSION="$(node -e "console.log(require('./package.json').version)")"
BUILD="$(node -e "const fs=require('fs'); const m=fs.readFileSync('src/appVersion.ts','utf8').match(/APP_BUILD = \"(\\d+)\"/); console.log(m[1])")"
APK_NAME="maldives-cargo-${VERSION}-build${BUILD}.apk"
TAG_NAME="v${VERSION}"
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
UPLOAD_PATH="/tmp/${APK_NAME}"

npm run build:ci
npx cap sync android
(cd android && ./gradlew :app:assembleRelease)

if [[ "${COMMIT_RELEASE:-0}" == "1" ]]; then
  git config user.name "${GIT_AUTHOR_NAME:-github-actions[bot]}"
  git config user.email "${GIT_AUTHOR_EMAIL:-41898282+github-actions[bot]@users.noreply.github.com}"
  git add android/app/build.gradle android/app/src/main/assets dist package.json package-lock.json public/app-update.json src/appVersion.ts src/components/AppUpdatePrompt.tsx src/lib/appUpdate.ts
  git commit -m "Release v${VERSION} build ${BUILD}"
  git push
fi

cp "$APK_PATH" "$UPLOAD_PATH"

if command -v gh >/dev/null 2>&1; then
  if gh release view "$TAG_NAME" --repo "$REPO_SLUG" >/dev/null 2>&1; then
    gh release upload "$TAG_NAME" "$UPLOAD_PATH" --repo "$REPO_SLUG" --clobber
  else
    gh release create "$TAG_NAME" "$UPLOAD_PATH" \
      --repo "$REPO_SLUG" \
      --title "Maldives Cargo ${VERSION}" \
      --notes "Release ${VERSION} build ${BUILD}"
  fi
else
  echo "gh is not installed; release APK built at $APK_PATH"
fi

if [[ "${DEPLOY_FIREBASE:-1}" == "1" ]]; then
  npx firebase-tools deploy --only hosting --project cargomv-d41f8
fi

echo "Release complete: ${VERSION} build ${BUILD}"
echo "Local APK: ${APK_PATH}"
echo "Uploaded APK filename: ${APK_NAME}"
