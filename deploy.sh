#!/usr/bin/env bash
# Draait als "post deployment action" in Plesk na elke git-pull.
set -uo pipefail

echo "== Node/npm zoeken =="
echo "PATH (begin)=$PATH"

# 1) Bekende Plesk-locaties + systeempaden
for p in $(ls -d /opt/plesk/node/*/bin 2>/dev/null) /usr/local/bin /usr/bin /bin; do
  [ -x "$p/npm" ] && PATH="$p:$PATH"
done

# 2) Nog niet gevonden? Zoek breder naar een npm-binary.
if ! command -v npm >/dev/null 2>&1; then
  found=$(find /opt/plesk/node /opt/plesk /usr/local /usr/lib/node_modules -maxdepth 5 -name npm -type f 2>/dev/null | head -1)
  [ -n "$found" ] && PATH="$(dirname "$found"):$PATH"
fi
export PATH

echo "node: $(command -v node || echo MISSING)  $(node -v 2>/dev/null)"
echo "npm:  $(command -v npm  || echo MISSING)  $(npm -v  2>/dev/null)"

if ! command -v npm >/dev/null 2>&1; then
  echo "!! npm niet gevonden. Beschikbare Plesk Node-versies:"
  ls -d /opt/plesk/node/*/ 2>/dev/null || echo "   (geen /opt/plesk/node — Node.js-extensie mogelijk niet geinstalleerd)"
  exit 1
fi

set -e
echo "→ Dependencies installeren (npm ci)..."
npm ci
echo "→ Site bouwen (astro build)..."
npm run build
echo "→ Node-app herstarten (Passenger)..."
mkdir -p tmp
touch tmp/restart.txt
echo "✓ Uitrol klaar."
