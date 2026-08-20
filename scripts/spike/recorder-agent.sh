#!/usr/bin/env bash
# scripts/spike/recorder-agent.sh {install|uninstall|status}
#
# Manages a per-user LaunchAgent that runs recorder-session.sh TWICE DAILY.
#
# This is what makes the cross-day number obtainable without depending on anyone
# remembering. SPIKE-10's deliverable is the CROSS-DAY content-hash cache hit
# rate — a property of how sites version and re-serve bundles across deploys.
# It is wall-clock-bound: it cannot be synthesised from a burst, and it cannot
# be produced on demand at the end of the phase. Sessions therefore accumulate
# while plans 00-02 and 00-03 execute. Plan 00-04 uninstalls this agent.
#
# Per-user agent only. No sudo, no LaunchDaemon, nothing system-wide.
set -euo pipefail

LABEL="com.defminer.spike.recorder"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"

usage() { echo "usage: recorder-agent.sh {install|uninstall|status}" >&2; exit 2; }

case "${1:-}" in
  install)
    mkdir -p "$HOME/Library/LaunchAgents" "$REPO/.spike"
    cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$REPO/scripts/spike/recorder-session.sh</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>StandardOutPath</key><string>$REPO/.spike/agent.out.log</string>
  <key>StandardErrorPath</key><string>$REPO/.spike/agent.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <!-- Twice daily. Not RunAtLoad: a session takes minutes and should not fire
       on every login. Not StartInterval: fixed times of day spread the samples
       across the working day rather than clustering them. -->
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Hour</key><integer>10</integer><key>Minute</key><integer>30</integer></dict>
    <dict><key>Hour</key><integer>18</integer><key>Minute</key><integer>30</integer></dict>
  </array>
</dict>
</plist>
PLIST
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load "$PLIST"
    echo "installed and loaded: $LABEL"
    launchctl list | grep -F "$LABEL" || { echo "FATAL: agent did not load" >&2; exit 1; }
    ;;
  uninstall)
    launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$PLIST"
    echo "uninstalled: $LABEL"
    ;;
  status)
    launchctl list | grep -F "$LABEL" || echo "not loaded"
    ;;
  *) usage ;;
esac
