#!/bin/sh
# ZUNO-CHAT.app launcher: starts the background app (or, if it is already running, it just opens the control panel).
DIR="$(cd "$(dirname "$0")/../Resources" && pwd)"
nohup "$DIR/zuno-chat" >/dev/null 2>&1 &
exit 0
