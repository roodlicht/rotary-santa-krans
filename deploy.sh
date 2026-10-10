#!/usr/bin/env bash
# Draait als "post deployment action" in Plesk na elke git-pull.
set -euo pipefail

# Plesk zet node/npm niet altijd op PATH in deployment-acties — voeg de
# Node-bin van de Plesk Node.js-extensie toe (hoogste versie wint).
for p in /opt/plesk/node/*/bin; do [ -d "$p" ] && PATH="$p:$PATH"; done
export PATH

echo "→ Node: $(command -v node || echo 'niet gevonden') ($(node -v 2>/dev/null || true))"
echo "→ Dependencies installeren (npm ci)..."
npm ci

echo "→ Site bouwen (astro build)..."
npm run build

echo "→ Node-app herstarten (Passenger)..."
mkdir -p tmp
touch tmp/restart.txt

echo "✓ Uitrol klaar."
