#!/usr/bin/env bash
# Draait als "post deployment action" in Plesk na elke git-pull.
set -uo pipefail

# Deze Plesk-omgeving gebruikt nodenv: npm/node zitten in de nodenv-shims.
# In de niet-interactieve deploy-shell staat die map niet op PATH, dus toevoegen.
export PATH="${HOME:-/var/www/vhosts/rotarykerstkrans.nl}/.nodenv/shims:$PATH"
# Welke node-versie nodenv moet gebruiken (ook vastgelegd in .node-version).
export NODENV_VERSION="${NODENV_VERSION:-24}"

# Terugval op de Plesk-node-pakketten als nodenv ontbreekt.
command -v npm >/dev/null 2>&1 || for p in $(ls -d /opt/plesk/node/*/bin 2>/dev/null); do
  [ -x "$p/npm" ] && { export PATH="$p:$PATH"; break; }
done

echo "node: $(command -v node || echo MISSING)  $(node -v 2>/dev/null)"
echo "npm:  $(command -v npm  || echo MISSING)  $(npm -v  2>/dev/null)"
command -v npm >/dev/null 2>&1 || { echo '!! npm niet gevonden — check de Node.js-extensie / nodenv.'; exit 1; }

set -e
echo "→ Dependencies installeren (npm ci)..."
npm ci
echo "→ Site bouwen (astro build)..."
npm run build
echo "→ Node-app herstarten (Passenger)..."
mkdir -p tmp
touch tmp/restart.txt
echo "✓ Uitrol klaar."
