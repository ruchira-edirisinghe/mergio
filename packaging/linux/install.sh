#!/bin/sh
# Installs Mergio for the current user (no root needed):
#   app      ~/.local/share/mergio/mergio
#   command  ~/.local/bin/mergio
#   menu     ~/.local/share/applications/mergio.desktop
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
APPDIR="$DATA/mergio"
BINDIR="$HOME/.local/bin"

pkill -x mergio 2>/dev/null || true
mkdir -p "$APPDIR" "$BINDIR" "$DATA/applications" "$DATA/icons/hicolor/256x256/apps"
install -m755 "$HERE/mergio" "$APPDIR/mergio"
ln -sf "$APPDIR/mergio" "$BINDIR/mergio"
install -m644 "$HERE/mergio.png" "$DATA/icons/hicolor/256x256/apps/mergio.png"
sed "s#@EXEC@#$APPDIR/mergio#" "$HERE/mergio.desktop" > "$DATA/applications/mergio.desktop"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q "$DATA/applications" || true
command -v xdg-mime >/dev/null 2>&1 && xdg-mime default mergio.desktop x-scheme-handler/mergio || true

echo "Mergio is installed."
echo "Open it from your app menu, or run: mergio"
command -v curl >/dev/null 2>&1 || echo "Note: Kick chat needs 'curl'. Install it with your package manager (e.g. sudo apt install curl)."
case ":$PATH:" in *":$BINDIR:"*) ;; *) echo "Tip: add $BINDIR to your PATH to use the 'mergio' command." ;; esac
