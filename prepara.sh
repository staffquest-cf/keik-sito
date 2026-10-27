#!/bin/bash
# Prepara una sessione nuova: scarica le due versioni pubblicate e installa gli strumenti.
# Uso (dalla cartella del progetto, ramo "sorgente"): bash prepara.sh
set -e
S="$(cd "$(dirname "$0")" && pwd)"; cd "$S"
REPO=$(git remote get-url origin)
[ -d site-build/dist/.git ] || git clone -q --branch main "$REPO" site-build/dist
[ -d keikit/.git ] || git clone -q --branch keik-it "$REPO" keikit
(cd site-build && npm install --silent >/dev/null 2>&1)
(cd fonts && npm install --silent >/dev/null 2>&1)
echo "Pronto. Anteprima: python3 site-build/build.py · Pubblica: vedi MANUALE.md"
