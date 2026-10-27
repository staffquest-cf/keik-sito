#!/bin/bash
# Ricostruisce l'anteprima (site-build/dist, ramo main) e controlla le pagine. Uso: bash costruisci.sh
set -e
S="$(cd "$(dirname "$0")" && pwd)"; cd "$S/site-build"
mv dist/.git ../gitbak
trap 'cd "$S/site-build"; [ -d ../gitbak ] && { rm -rf dist/.git; mv ../gitbak dist/.git; }' EXIT
python3 build.py >/dev/null
(python3 -m http.server 8765 >/dev/null 2>&1 & echo $! > /tmp/srv.pid); sleep 1; NODE_PATH=$(npm root -g) timeout 300 node prerender.js | tail -1; kill $(cat /tmp/srv.pid)
rm -rf dist/.git; mv ../gitbak dist/.git
echo "Anteprima pronta in site-build/dist (da pubblicare con git add/commit/push nel ramo main)"
