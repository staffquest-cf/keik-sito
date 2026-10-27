#!/bin/bash
# Ricostruisce la versione keik.it (produzione) e la pubblica sul ramo keik-it. Uso: bash pubprod.sh "messaggio"
set -e
S="$(cd "$(dirname "$0")" && pwd)"
cd $S/site-build
mv dist/.git ../gitbak
trap 'cd $S/site-build; [ -d ../gitbak ] && { rm -rf dist/.git; mv ../gitbak dist/.git; }' EXIT
KEIK_TARGET=fastcomet python3 build.py >/dev/null
(python3 -m http.server 8765 >/dev/null 2>&1 & echo $! > /tmp/srv.pid); sleep 1; timeout 300 node prerender.js | tail -1; kill $(cat /tmp/srv.pid)
rm -rf ../prod && cp -a dist ../prod && rm -f ../prod/README.md ../prod/.nojekyll && cp prod_extra/.htaccess prod_extra/robots.txt prod_extra/sitemap.xml prod_extra/llms.txt ../prod/
python3 build.py >/dev/null
(python3 -m http.server 8765 >/dev/null 2>&1 & echo $! > /tmp/srv.pid); sleep 1; timeout 300 node prerender.js | tail -1; kill $(cat /tmp/srv.pid)
rm -rf dist/.git; mv ../gitbak dist/.git; (cd dist && git checkout -q . && git clean -qfd)
cd $S/keikit && git rm -rq --cached . >/dev/null; find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +; cp -a ../prod/. .
git add -A; git diff --cached --quiet && { echo "keik-it: niente da pubblicare"; exit 0; }
git -c user.name="$(git -C ../site-build/dist log -1 --format=%an)" -c user.email="$(git -C ../site-build/dist log -1 --format=%ae)" commit -qm "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01U88Anhr7fhm4FL8XkLKqud"
git push -q origin keik-it; git log --oneline -1
