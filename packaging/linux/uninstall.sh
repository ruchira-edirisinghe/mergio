#!/bin/sh
# Removes a ZUNO-CHAT install made with install.sh, including its settings
# (they live in ~/.local/share/zuno-chat/data). Export your style first if you want to keep it.
set -u
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
pkill -x zuno-chat 2>/dev/null || true
rm -rf "$DATA/zuno-chat"
rm -f "$HOME/.local/bin/zuno-chat" "$DATA/applications/zuno-chat.desktop" "$DATA/icons/hicolor/256x256/apps/zuno-chat.png"
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database -q "$DATA/applications" || true
echo "ZUNO-CHAT has been removed."
