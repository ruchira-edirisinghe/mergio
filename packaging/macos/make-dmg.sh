#!/bin/sh
# Builds Mergio.app and a drag-to-Applications disk image. Runs on macOS (called by `npm run package`).
# Usage: make-dmg.sh <version> <binary> <out_dir>
set -eu
VERSION="$1"; BIN="$2"; OUT="$3"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
WORK="$ROOT/build/macos"
APP="$WORK/stage/Mergio.app"
ARCH="$(uname -m)"; [ "$ARCH" = "x86_64" ] && ARCH=x64

rm -rf "$WORK"; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$OUT"

# The real server lives in Resources; the bundle's executable is a tiny launcher that starts it in the
# background and exits. That way clicking the app again (while it runs) simply opens the control panel.
cp "$BIN" "$APP/Contents/Resources/mergio"
chmod 755 "$APP/Contents/Resources/mergio"
cp "$HERE/launcher.sh" "$APP/Contents/MacOS/Mergio"
chmod 755 "$APP/Contents/MacOS/Mergio"
sed "s/@VERSION@/$VERSION/g" "$HERE/Info.plist" > "$APP/Contents/Info.plist"

# App icon from the 1024 px logo mark
ICONSET="$WORK/AppIcon.iconset"; mkdir -p "$ICONSET"
SRC="$ROOT/assets/brand/mergio-icon.png"
for s in 16 32 128 256 512; do
  sips -z $s $s "$SRC" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  d=$((s * 2)); sips -z $d $d "$SRC" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"

# Ad-hoc signature (no Apple developer account): required for Apple Silicon to run it at all.
codesign --force --deep --sign - "$APP"

ln -s /Applications "$WORK/stage/Applications"
DMG="$OUT/Mergio-macos-$ARCH.dmg"
rm -f "$DMG"
hdiutil create -volname "Mergio" -srcfolder "$WORK/stage" -ov -format UDZO "$DMG" >/dev/null
echo "Created $DMG"
