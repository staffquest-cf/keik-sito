#!/bin/bash
# =====================================================================
#  aggiorna-keik.sh  ·  GitHub → FastComet
#
#  Controlla se su GitHub c'è una versione nuova del sito keik.it e,
#  se c'è, la copia in public_html. Se non è cambiato niente non fa
#  nulla (e non scrive niente).
#
#  Dove va:   nella cartella principale del tuo account FastComet
#             (la stessa che contiene public_html), permessi 755.
#  Come parte: cPanel → Cron Jobs, ogni 10 minuti:
#             */10 * * * * /bin/bash $HOME/aggiorna-keik.sh
#  Registro:  $HOME/.keik-deploy/registro.txt  (ultimi aggiornamenti)
# =====================================================================

set -u

# ---- Impostazioni --------------------------------------------------
REPO="staffquest-cf/keik-sito"     # progetto su GitHub (pubblico)
BRANCH="keik-it"                   # ramo con la versione definitiva per keik.it
DEST="$HOME/public_html"           # cartella del sito sul server
STATE="$HOME/.keik-deploy"         # qui lo script ricorda cosa ha già pubblicato

# Cose sul server che lo script non tocca mai (né sovrascrive né cancella)
KEEP=(
  ".well-known"        # certificati SSL / verifiche Google
  "cgi-bin"
  "shop"               # futuro WooCommerce
  "wp-admin" "wp-content" "wp-includes" "wp-*.php" "xmlrpc.php"
  ".user.ini" "php.ini" "error_log"
  ".htpasswd"
  "google*.html"       # verifica Google Search Console
  # cartelle già presenti su FastComet (altri domini e vecchio WordPress): restano dove sono
  ".wp-cli" "app.keik.it" "keik.it" "keikbakery.it" "wordpress-backups"
)
# File del progetto che non servono sul sito
SKIP=( "README.md" ".git" ".github" ".nojekyll" "CNAME" )

# ---- Da qui in giù non serve modificare niente --------------------
mkdir -p "$STATE"
LOG="$STATE/registro.txt"
log() { echo "$(date '+%Y-%m-%d %H:%M') · $*" >> "$LOG"; }

# Un solo aggiornamento alla volta
LOCK="$STATE/in-corso"
if ! mkdir "$LOCK" 2>/dev/null; then
  # se il blocco è rimasto da un errore di più di 30 minuti fa, lo togliamo
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +30 2>/dev/null)" ]; then rmdir "$LOCK"; mkdir "$LOCK" || exit 0; else exit 0; fi
fi
TMP=""
cleanup() { [ -n "$TMP" ] && rm -rf "$TMP"; rmdir "$LOCK" 2>/dev/null; }
trap cleanup EXIT

# 1) Qual è l'ultima versione su GitHub?
SHA=""
if command -v git >/dev/null 2>&1; then
  SHA=$(git ls-remote "https://github.com/$REPO.git" "refs/heads/$BRANCH" 2>/dev/null | cut -f1)
fi
if [ -z "$SHA" ]; then
  SHA=$(curl -fsS --max-time 30 -H "Accept: application/vnd.github.sha" \
        "https://api.github.com/repos/$REPO/commits/$BRANCH" 2>/dev/null)
fi
if ! [[ "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
  log "ERRORE: non riesco a leggere GitHub (ramo $BRANCH). Riprovo al prossimo giro."
  exit 1
fi

# 2) È già pubblicata? Allora non c'è niente da fare.
LAST=$(cat "$STATE/versione" 2>/dev/null || true)
[ "$SHA" = "$LAST" ] && exit 0

# 3) Scarico la versione nuova in una cartella temporanea
TMP=$(mktemp -d "$STATE/nuova.XXXXXX")
if ! curl -fsSL --max-time 300 "https://codeload.github.com/$REPO/tar.gz/$SHA" -o "$TMP/sito.tar.gz"; then
  log "ERRORE: download non riuscito (${SHA:0:7}). Riprovo al prossimo giro."
  exit 1
fi
mkdir "$TMP/sito"
if ! tar -xzf "$TMP/sito.tar.gz" -C "$TMP/sito" --strip-components=1; then
  log "ERRORE: archivio non valido (${SHA:0:7})."
  exit 1
fi

# 4) Controllo di sicurezza: non pubblico mai un sito vuoto o rotto
NEW="$TMP/sito"
PAGES=$(ls "$NEW"/*.html 2>/dev/null | wc -l)
if [ ! -s "$NEW/index.html" ] || [ "$PAGES" -lt 5 ] || ! grep -q "KEIK" "$NEW/index.html"; then
  log "ERRORE: la versione ${SHA:0:7} sembra incompleta ($PAGES pagine). Non la pubblico."
  exit 1
fi
for f in "${SKIP[@]}"; do rm -rf "${NEW:?}/$f"; done

# 5) Copia in public_html
mkdir -p "$DEST"
if command -v rsync >/dev/null 2>&1; then
  EXC=()
  for k in "${KEEP[@]}"; do EXC+=( "--exclude=/$k" ); done
  # --delete toglie dal server le pagine eliminate dal progetto, tranne quelle in KEEP
  if ! rsync -a --delete "${EXC[@]}" "$NEW/" "$DEST/"; then
    log "ERRORE: copia con rsync non riuscita (${SHA:0:7})."
    exit 1
  fi
else
  # senza rsync: copio sopra ai file esistenti (non cancello niente)
  if ! cp -a "$NEW/." "$DEST/"; then
    log "ERRORE: copia non riuscita (${SHA:0:7})."
    exit 1
  fi
fi

echo "$SHA" > "$STATE/versione"
log "OK: pubblicata la versione ${SHA:0:7} ($PAGES pagine)."

# Il registro tiene solo le ultime 300 righe
tail -n 300 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
exit 0
