#!/usr/bin/env bash
# Summarize active sessions and dev-server state on macOS.
# Usage: bash scripts/mac-sessions.sh

set -u

hr() { printf '\n\033[1;36m== %s ==\033[0m\n' "$1"; }

hr "Logged-in user sessions (who)"
who

hr "Top processes by CPU (current user)"
ps -u "$(whoami)" -o pid,%cpu,%mem,etime,command \
  | sort -k2 -nr \
  | head -15

hr "Top processes by memory (current user)"
ps -u "$(whoami)" -o pid,%cpu,%mem,etime,command \
  | sort -k3 -nr \
  | head -15

hr "Claude Code CLI processes"
pgrep -fl "claude" | grep -Ev "pgrep|mac-sessions" || echo "(none found)"

hr "Node / Next.js / dev-server processes"
pgrep -fl -E "node|next|vite|webpack|bun|pnpm|deno" | grep -v pgrep || echo "(none found)"

hr "Listening TCP ports"
if command -v lsof >/dev/null 2>&1; then
  lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null \
    | awk 'NR==1 || $1 !~ /^(rapportd|ControlCe|sharingd|mDNSResp|launchd)$/'
else
  echo "lsof not available"
fi

hr "tmux / screen sessions"
if command -v tmux >/dev/null 2>&1; then
  tmux list-sessions 2>/dev/null || echo "tmux: no sessions"
fi
if command -v screen >/dev/null 2>&1; then
  screen -ls 2>/dev/null | grep -E "Detached|Attached" || echo "screen: no sessions"
fi

hr "Docker containers"
if command -v docker >/dev/null 2>&1; then
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null \
    || echo "docker: daemon not running"
fi

hr "Done"
