#!/bin/sh
# Installs ZUNO-CHAT for the current user (no root needed):
#   app      ~/.local/share/zuno-chat/zuno-chat
#   command  ~/.local/bin/zuno-chat
#   menu     ~/.local/share/applications/zuno-chat.desktop
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
APPDIR="$DATA/zuno-chat"
BINDIR="$HOME/.local/bin"

pkill -x zuno-chat 2>/dev/null || true
mkdir -p "$APPDIR" "$BINDIR" "$DATA/applications" "$DATA/icons/hicolor/256x256/apps"
install -m755 "$HERE/zuno-chat" "$APPDIR/zuno-chat"
ln -sf "$APPDIR/zuno-chat" "$BINDIR/zuno-chat"
install -m644 "$HERE/zuno-chat.png" "$DATA/icons/hicolor/256x256/apps/zuno-chat.png"
sed "s#@EXEC@#$APPDIR/zuno-chat#" "$HERE/zuno-chat.desktop" > "$DATA/applications/zuno-chat.desktop"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q "$DATA/applications" || true

echo "ZUNO-CHAT is installed."
echo "Open it from your app menu, or run: zuno-chat"
command -v curl >/dev/null 2>&1 || echo "Note: Kick chat needs 'curl'. Install it with your package manager (e.g. sudo apt install curl)."
case ":$PATH:" in *":$BINDIR:"*) ;; *) echo "Tip: add $BINDIR to your PATH to use the 'zuno-chat' command." ;; esac
