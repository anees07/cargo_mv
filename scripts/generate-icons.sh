#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_SVG="$ROOT_DIR/assets/app-icon.svg"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ ! -f "$SOURCE_SVG" ]]; then
  echo "Missing source icon: $SOURCE_SVG" >&2
  exit 1
fi

qlmanage -t -s 1024 -o "$TMP_DIR" "$SOURCE_SVG" >/dev/null 2>&1
SOURCE_PNG="$TMP_DIR/app-icon.svg.png"
if [[ ! -f "$SOURCE_PNG" ]]; then
  echo "Failed to render $SOURCE_SVG with qlmanage" >&2
  exit 1
fi

make_png() {
  local size="$1"
  local target="$2"
  mkdir -p "$(dirname "$target")"
  cp "$SOURCE_PNG" "$target"
  sips -z "$size" "$size" "$target" >/dev/null
}

make_png 512 "$ROOT_DIR/public/icon-512.png"
make_png 512 "$ROOT_DIR/public/favicon.png"
make_png 512 "$ROOT_DIR/dist/icon-512.png"
make_png 512 "$ROOT_DIR/dist/favicon.png"

make_png 48 "$ROOT_DIR/android/app/src/main/res/mipmap-mdpi/ic_launcher.png"
make_png 48 "$ROOT_DIR/android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png"
make_png 72 "$ROOT_DIR/android/app/src/main/res/mipmap-hdpi/ic_launcher.png"
make_png 72 "$ROOT_DIR/android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png"
make_png 96 "$ROOT_DIR/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png"
make_png 96 "$ROOT_DIR/android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png"
make_png 144 "$ROOT_DIR/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png"
make_png 144 "$ROOT_DIR/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png"
make_png 192 "$ROOT_DIR/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"
make_png 192 "$ROOT_DIR/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png"

make_png 108 "$ROOT_DIR/android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png"
make_png 162 "$ROOT_DIR/android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png"
make_png 216 "$ROOT_DIR/android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png"
make_png 324 "$ROOT_DIR/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png"
make_png 432 "$ROOT_DIR/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png"

echo "Generated app icons from $SOURCE_SVG"
