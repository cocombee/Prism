#!/bin/bash
set -euo pipefail

APP_PATH="${1:?usage: camera-package-smoke.sh /path/to/Prism.app}"
RESOURCES="$APP_PATH/Contents/Resources"
FFMPEG="$RESOURCES/app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg"

[ -d "$APP_PATH" ]
test -f "$FFMPEG"
test -x "$FFMPEG"
file "$FFMPEG"
ARCH="$(file "$FFMPEG")"
case "$ARCH" in
  *"Mach-O 64-bit executable arm64"*) ;;
  *) printf 'unexpected FFmpeg architecture: %s\n' "$ARCH" >&2; exit 1 ;;
esac

VERSION_OUTPUT="$("$FFMPEG" -version 2>&1)"
printf '%s\n' "$VERSION_OUTPUT" | sed -n '1p'
case "$VERSION_OUTPUT" in
  ffmpeg\ version\ *) ;;
  *) printf 'missing FFmpeg version header\n' >&2; exit 1 ;;
esac
