#!/usr/bin/env bash
# Draait als "Additional deployment action" in Plesk na elke git-pull.
set -euo pipefail

echo "→ Dependencies installeren (npm ci)..."
npm ci

echo "→ Site bouwen (astro build)..."
npm run build

echo "→ Node-app herstarten (Passenger)..."
mkdir -p tmp
touch tmp/restart.txt

echo "✓ Uitrol klaar."
