#!/bin/sh
# Builds the Linux packages (called by `npm run package` on Linux):
#   ZUNO-CHAT-linux-x64.deb     Debian / Ubuntu / Mint / Pop!_OS (installs to /opt/zuno-chat, adds a menu entry)
#   ZUNO-CHAT-linux-x64.tar.gz  any distro: unpack and run ./install.sh (no root needed)
# Usage: make-packages.sh <version> <binary> <out_dir>
set -eu
VERSION="$1"; BIN="$2"; OUT="$3"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
WORK="$ROOT/build/linux"
case "$(uname -m)" in x86_64) ARCH=x64; DEBARCH=amd64 ;; aarch64) ARCH=arm64; DEBARCH=arm64 ;; *) ARCH="$(uname -m)"; DEBARCH="$ARCH" ;; esac
rm -rf "$WORK"; mkdir -p "$WORK" "$OUT"

# ---------- .deb ----------
DEB="$WORK/deb"
install -Dm755 "$BIN" "$DEB/opt/zuno-chat/zuno-chat"
mkdir -p "$DEB/usr/bin"; ln -s /opt/zuno-chat/zuno-chat "$DEB/usr/bin/zuno-chat"
sed "s#@EXEC@#/opt/zuno-chat/zuno-chat#" "$HERE/zuno-chat.desktop" > "$WORK/zuno-chat.desktop"
install -Dm644 "$WORK/zuno-chat.desktop" "$DEB/usr/share/applications/zuno-chat.desktop"
install -Dm644 "$ROOT/assets/icon-256.png" "$DEB/usr/share/icons/hicolor/256x256/apps/zuno-chat.png"
install -Dm644 "$ROOT/assets/brand/zuno-chat-mark.svg" "$DEB/usr/share/icons/hicolor/scalable/apps/zuno-chat.svg"
install -Dm644 "$ROOT/LICENSE" "$DEB/usr/share/doc/zuno-chat/copyright"
mkdir -p "$DEB/DEBIAN"
SIZE="$(du -sk "$DEB" | cut -f1)"
cat > "$DEB/DEBIAN/control" <<EOF
Package: zuno-chat
Version: $VERSION
Architecture: $DEBARCH
Maintainer: Ruchira Edirisinghe <noreply@github.com>
Installed-Size: $SIZE
Depends: curl, xdg-utils
Section: video
Priority: optional
Homepage: https://github.com/ruchira-edirisinghe/zuno-chat
Description: Every live chat in one OBS overlay
 ZUNO-CHAT merges YouTube, Twitch, Kick, TikTok and Facebook live chats into
 one browser-source overlay for OBS, with alerts for gifts, subs, follows,
 Bits and Super Chats. Runs in the background; open it from the app menu to
 reach the control panel.
EOF
cat > "$DEB/DEBIAN/postinst" <<'EOF'
#!/bin/sh
set -e
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q /usr/share/applications || true
command -v gtk-update-icon-cache >/dev/null 2>&1 && gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
exit 0
EOF
cat > "$DEB/DEBIAN/prerm" <<'EOF'
#!/bin/sh
pkill -x zuno-chat 2>/dev/null || true
exit 0
EOF
chmod 755 "$DEB/DEBIAN/postinst" "$DEB/DEBIAN/prerm"
dpkg-deb --build --root-owner-group "$DEB" "$OUT/ZUNO-CHAT-linux-$ARCH.deb" >/dev/null
echo "Created $OUT/ZUNO-CHAT-linux-$ARCH.deb"

# ---------- portable tar.gz with install.sh ----------
NAME="ZUNO-CHAT-linux-$ARCH"
T="$WORK/$NAME"; mkdir -p "$T"
install -m755 "$BIN" "$T/zuno-chat"
install -m755 "$HERE/install.sh" "$T/install.sh"
install -m755 "$HERE/uninstall.sh" "$T/uninstall.sh"
install -m644 "$HERE/zuno-chat.desktop" "$T/zuno-chat.desktop"
install -m644 "$ROOT/assets/icon-256.png" "$T/zuno-chat.png"
install -m644 "$ROOT/README.md" "$ROOT/LICENSE" "$T/"
tar -czf "$OUT/$NAME.tar.gz" -C "$WORK" "$NAME"
echo "Created $OUT/$NAME.tar.gz"
