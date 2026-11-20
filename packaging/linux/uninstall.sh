#!/bin/sh
# Removes a Mergio install made with install.sh, including its settings
# (they live in ~/.local/share/mergio/data). Export your style first if you want to keep it.
set -u
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
pkill -x mergio 2>/dev/null || true
rm -rf "$DATA/mergio"
rm -f "$HOME/.local/bin/mergio" "$DATA/applications/mergio.desktop" "$DATA/icons/hicolor/256x256/apps/mergio.png"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q "$DATA/applications" || true
echo "Mergio has been removed."
