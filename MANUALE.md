# Sito keik.it: manuale del progetto

Questo ramo (`sorgente`) contiene **tutto il necessario per modificare il sito keik.it**: i testi e le pagine, le foto, le traduzioni, gli strumenti per costruire il sito e le istruzioni per pubblicarlo. Chi lavora sul sito (Elena o Claude) parte sempre da qui.

## Come è fatto

| Ramo GitHub | Cosa contiene | Dove va |
|---|---|---|
| `sorgente` | Le pagine da modificare, foto, traduzioni, strumenti | Solo qui (è il "laboratorio") |
| `main` | Il sito costruito, versione anteprima (noindex) | https://staffquest-cf.github.io/keik-sito/ |
| `keik-it` | Il sito costruito, versione definitiva (Analytics, Clarity, banner iubenda, rimandi) | https://keik.it (FastComet lo scarica da solo ogni 5 minuti) |

Repository: `staffquest-cf/keik-sito` (pubblico).

## Regole del sito (da rispettare sempre)

- Una modifica alla volta; dire sempre quali file cambiano.
- Ogni testo esiste sia nel template sia nei dati dello script: cambiarlo in tutti e due.
- Ogni testo nuovo va tradotto in `site-build/dict_all.json` (formato `"testo italiano": ["inglese", "spagnolo", "francese"]`).
- Se manca un'informazione, chiederla a Elena: mai inventare prezzi, orari, ingredienti.
- KEIK non è una "bakery" e non fa bubble tea. Il sito accompagna un soft rebrand verso bistrot/ristorante, non bar-pasticceria.
- Orari: tutti i giorni 10–20, venerdì e sabato fino alle 22. Cucina fino alle 19:30, venerdì e sabato fino alle 21:30.
- Non scrivere mai "niente coperto" (in futuro potrebbe esserci).
- Il panino del giorno dopo il Ringraziamento: mai la parola "avanzi".
- L'asterisco `*` sui piatti = "prodotto surgelato all'origine".
- Senza glutine: sempre la nota "può contenere tracce, non adatto ai celiaci".
- Nella pagina "Verifiche ancora necessarie" non toccare niente.
- Capitano Brady (chat per i QR dei poster e pulsante galleggiante "Chiedi a Brady" solo nella home, classe `k-brady` in `Main.dc.html`): vedi `BRADY.md`. I suoi file si cambiano solo in `brady/`, mai direttamente su FastComet. Ogni volta che cambia la pagina Eventi, aggiornare anche `brady/sito/dati/eventi.json` (e, se serve, `brady/solo-keikit/dati/privato/crispy-gusti.json`).
- `brady.html` su keik.it riceve da `pubprod.sh` (con `deploy/brady-head.py`) gli stessi script iubenda + Analytics/Clarity delle altre pagine; il `noindex, nofollow` resta. Il pulsante "Chiedi al Capitano Brady" non va messo nella pagina Eventi.
- Il file `brady-config.php` (chiave API) sta su FastComet **fuori** da `public_html` (`/home/keikbake/`): non va mai su GitHub, non va sovrascritto.
- Font: Montserrat, Big Shoulders Display, Space Mono, Caveat (ospitati sul sito). Mermaid e Local Brewery non hanno licenza web: non usarli.

## Cartelle

- `keikcanvas/project/*.dc.html`: **le pagine** (una per pagina del sito). Qui si fanno le modifiche.
- `blobs/`: foto originali, chiamate dalle pagine come `/_blob/<codice>`.
- `imgcache/`: versioni leggere delle foto (`<codice>-480.webp`, `-960.webp`) + `manifest.json` con larghezza e altezza.
- `og/`: immagini di anteprima per i social.
- `site-build/build.py`: costruisce il sito. `prerender.js`: scrive l'HTML finale (per Google). `dict_all.json`: traduzioni. `restaurant_ld.json`: dati del ristorante per Google (orari, premi...). `prod_extra/`: file solo per keik.it (`.htaccess` con i rimandi da Shopify, `robots.txt`, `sitemap.xml`, `llms.txt`).
- `brady/`: il Capitano Brady. `brady/sito/` va in anteprima e su keik.it (pagina `brady.html`, script, foto, `dati/eventi.json`); `brady/solo-keikit/` va solo su keik.it (ponte `api/brady.php`, `dati/privato/` bloccata al web). Istruzioni in `BRADY.md`.
- `deploy/aggiorna-keik.sh`: lo script che gira su FastComet (cron ogni 5 minuti). Copia il ramo `keik-it` in `public_html` con `rsync --delete`: tutto ciò che non è nel ramo (e non è nella lista KEEP) viene cancellato dal server. Per questo ogni file del sito, Brady compreso, deve stare nel laboratorio.
: lo script che gira su FastComet (cron ogni 5 minuti).
- `prepara.sh`, `costruisci.sh`, `pubprod.sh`: comandi di lavoro (sotto).

## Come si lavora (per Claude)

1. **Inizio sessione:** clona il ramo `sorgente`, poi `bash prepara.sh` (scarica `main` in `site-build/dist` e `keik-it` in `keikit`, installa gli strumenti).
2. **Modifica** i file in `keikcanvas/project/` (e `dict_all.json` per le traduzioni).
3. **Anteprima:** `bash costruisci.sh`, controlla le pagine (Playwright, con `p.clock.setFixedTime` per provare date diverse), poi nel ramo `main` (`site-build/dist`): `git add -A && git commit && git push`.
4. **Online su keik.it:** `bash pubprod.sh "messaggio"` (ricostruisce la versione definitiva e la pubblica su `keik-it`; FastComet la prende entro 5 minuti). Farlo **dopo** il commit su `main`.
5. **Salva il laboratorio:** commit e push del ramo `sorgente`, così la prossima sessione riparte da qui.
6. Le foto nuove: originale in `blobs/<codice>.jpg`, versioni in `imgcache/`, riga in `imgcache/manifest.json`.

## Dati utili

- Indirizzo principale: **https://keik.it** (senza www; www e http rimandano qui).
- Hosting: FastComet, server `s13610.fra1.stableserver.net`, IP `192.250.229.195`, utente cPanel `keikbake`, cartella `public_html`. DNS gestito nel Zone Editor di FastComet (nameserver ns1/ns2.de1.fcomet.com). Dominio registrato su VHosting. Email @keik.it su FastComet (MX: non toccare).
- Eventi per Google Analytics (`site-build/kk-track.js`, partono solo su keik.it dopo il consenso): `prenota_apri_modulo`, `prenota_click`, `modulo_esterno_click`, `whatsapp_click`, `telefono_click`, `indicazioni_click`, `buono_regalo_click`, `passaporto_click`, `brady_apri`, `brady_messaggio`, `brady_carta_imbarco`. Prova con `?kkdebug` (li scrive nella console). In GA la proprietà raccoglie anche la pagina Google degli annunci (host `business.google.com`): per il solo sito filtrare "Nome host = keik.it".
- Pixel di Meta (ID 1066522540533719, lo stesso che usava Shopify): in `site-build/build.py`, solo su keik.it e solo dopo il consenso iubenda ai cookie di marketing (finalità 5; il servizio "pixel di Meta" è nella policy iubenda). Anche in brady.html tramite `deploy/brady-head.py`. Gli eventi di `kk-track.js` vanno anche a Meta: prenota_apri_modulo/modulo_esterno_click → Schedule, whatsapp/telefono → Contact, indicazioni → FindLocation, buono_regalo → InitiateCheckout, brady_carta_imbarco → Lead. Il pixel "KEIK PIENISSIMO" è di Pienissimo (dentro il modulo), non è nel nostro codice.
- Google Analytics: `G-8TJZ0BY97T` · Microsoft Clarity: `z4auk6y1db` (partono solo su keik.it e solo dopo il consenso ai cookie di misurazione).
- iubenda: siteId 418012, cookiePolicyId 680124. Google Maps si carica con il consenso "Esperienza" o al clic.
- Moduli Pienissimo: `https://forms.pienissimo.pro/?hashform=pw2h42fpguiftebdugzkzw6g3ce2zowg&id=<ID>` · generale (tutto il sito) `vLZP8Y` · KEIK by Night (solo la pagina bynight) `MbjDTW` · Aperitivo in lingua `58ayJR` · Friendsgiving `QLRP7p` · panino del giorno dopo `ULHn9C`.
- Buoni regalo: Gift Up. Clienti: Pienissimo. WhatsApp: 353 4732354. Telefono: 059 8396468.
- Search Console: proprietà Dominio `keik.it` (verificata con TXT), sitemap inviata.

## Da fare / in sospeso

- Orari speciali 16–22 novembre 2026 (come la settimana 9–15): popup in home e banner in Prenota (funzione `osRows` in `Main.dc.html` e `Prenota.dc.html`) spariscono da soli dopo sabato 21; il Crispy di venerdì 20 è 17–20 (6° elemento `'20:00'` nell'elenco `fridays` di `Eventi.dc.html`). Dopo il 22/11 si può togliere il codice e la riga "ORARI SPECIALI" da `brady/solo-keikit/dati/privato/brady-keik.txt`. Per un avviso futuro basta cambiare le righe di `osRows` (date, testi) e aggiungere le traduzioni. Il prerender imposta `window.__KK_PRERENDER__`: gli avvisi temporanei non finiscono nell'HTML per Google.
- Eventi: la pagina passa da ottobre a novembre da sola il 1/11; entro inizio dicembre serve la pagina di dicembre, e con lei `brady/sito/dati/eventi.json` di dicembre. Dopo novembre togliere la riga Merenda Social Club dalla home.
- SSL keik.it (Let's Encrypt con AutoSSL): il certificato attuale scade il 26/11/2026. Il 3/11 è stato tolto dal Zone Editor il record AAAA di keik.it che puntava ancora a Shopify (bloccava il rinnovo e mandava su Shopify chi si collega in IPv6); ora keik.it, www e mail superano il controllo. Sempre il 3/11 cpanel, webmail, ftp, whm, webdisk, cpcalendars, cpcontacts sono stati rimessi su `192.250.229.195` (`app.keik.it` punta ancora a Shopify, lasciato com'è). Verso il 20/11 controllare che il certificato nuovo sia installato (cPanel → SSL/TLS Status).
- Fra 2–3 settimane dalla migrazione (27/10/2026): togliere il dominio da Shopify, chiudere il piano, cancellare `public_html-backup-2026-10-27` su FastComet.
- Brady: aggiungere su iubenda il fornitore Anthropic (assistente informativo sul sito).
- Domande aperte per Elena: prezzo delle sole patatine Crispy.
- Idee: sezione "Torte e box" nella pagina Pomeriggio; pagine statiche in inglese; FAQ/schema nelle pagine dei momenti.

## KEIK by Night (pagina `bynight.html`, in preparazione)
- Il lavoro sta nel ramo `sorgente-bynight` (pagina `keikcanvas/project/ByNight.dc.html`, stile «notte al neon», logo orizzontale in `imgcache/keik-by-night-oriz-*.webp`). Il ramo `sorgente` resta senza By Night finché Elena non decide il lancio: così una pubblicazione normale non la manda online per sbaglio.
- Nel ramo: voce di menu «KEIK by Night» al posto di «Aperitivo» in tutte le pagine; nella mappa del sito (footer) «KEIK by Night» al posto di «Aperitivo e Il Turista».
- Fino al lancio la pagina Aperitivo (`aperitivo.html`) resta online e su Google (decisione di Elena, 17/11/2026).
- Da fare il giorno del lancio:
  1. unire `sorgente-bynight` in `sorgente` (se nel frattempo `sorgente` è cambiato, riportare le modifiche);
  2. reindirizzare tutto l'aperitivo su By Night, proposta serale del locale: in `site-build/prod_extra/.htaccess` `RewriteRule ^aperitivo(\.html)?/?$ https://keik.it/bynight.html [R=301,L,NC]`; nella home la foto «Aperitivo» dei momenti e la riga «KK 103» della pagina 404 puntano a `ByNight.dc.html`; nella `sitemap.xml` togliere aperitivo e aggiungere bynight;
  3. traduzioni EN/ES/FR dei testi della pagina in `site-build/dict_all.json`;
  4. foto vere di Seoul After Dark e Zermatt (ora provvisorie: burger di Halloween e Carlitos in mano) e, se arriva, una foto serale migliore per l'apertura;
  5. aggiornare Brady (`brady-keik.txt`, `eventi.json`) con il menu by Night e gli orari (gio–sab 19–22);
  6. controllare il tabellone «Prossime partenze» (date di dicembre) e gli orari in «Info e prenotazioni».
- Prenotazione serale: carta d'imbarco `#prenota` con il modulo Pienissimo dentro la pagina (in «Info e prenotazioni»); tutti i pulsanti «Prenota» della pagina la aprono. Il modulo è `id=MbjDTW`, il modulo serale dedicato (confermato da Elena il 21/11/2026: va usato SOLO in questa pagina; il resto del sito usa il generale `vLZP8Y`). Per cambiarlo: due punti di `ByNight.dc.html`, `pnsSrc` nel codice e il link «Aprilo in una nuova pagina». Niente turni: si sceglie la fascia oraria nel modulo.
- Video d'apertura (4 s, `blobs/6a2e549540d9ab30353261cb1b8436a2.mp4`, fatto da Elena): parte dentro il riquadro della foto principale e poi sfuma nella foto (`introCls`/`introDone` in `ByNight.dc.html`). Con animazioni ridotte o riproduzione automatica bloccata si vede subito la foto. Elena ha deciso: il video si vede solo fino al 2 dicembre 2026 compreso (`videoOn` in `ByNight.dc.html`), poi sparisce da solo e resta la foto. Dopo il 3/12 si possono togliere il blocco `bn-intro`, il suo codice e il file del video.

### SEO e AI di KEIK by Night (18/11/2026, già nel ramo `sorgente-bynight`)
- Pagina: titolo «Aperitivo e cena in centro a Modena · KEIK by Night», riga «Aperitivo e cena in centro a Modena» dentro l'H1, descrizione nuova, blocco «In breve» in Info, 3 domande frequenti in più, dati strutturati (Menu con prezzi + FAQPage, collegati a `https://keik.it/#restaurant`), descrizioni delle foto, immagine social `og/bynight.jpg`.
- Già pronti per il lancio (vanno online solo unendo il ramo): giovedì aperto fino alle 22 (cucina 21:30) in tutte le pagine, in `restaurant_ld.json`, in `llms.txt` (con sezione «La sera: KEIK by Night») e per Brady; `sitemap.xml` con bynight al posto di aperitivo; redirect 301 `aperitivo.html` → `bynight.html` (anche i vecchi link Shopify `/pages/aperitivo…`); home (momento «Sera» e miniatura «Aperitivo e cena»), riga della 404 e link nel testo del Menu portano a By Night. Traduzioni EN/ES/FR dei testi cambiati nelle altre pagine già aggiunte; quelle della pagina By Night ancora da fare.
- Il giorno del lancio: aggiornare anche la scheda Google Business (orari giovedì 10–22, foto serali, post) e controllare in Search Console le ricerche «aperitivo modena», «apericena modena», «cena centro modena».
## KEIK by Night (in preparazione)
- La pagina `bynight.html` e la nuova voce di menu sono nel ramo `sorgente-bynight`, non qui: leggere il MANUALE di quel ramo. Finché Elena non decide il lancio, la pagina Aperitivo resta online e su Google; al lancio si unisce il ramo e si reindirizza `aperitivo.html` su `bynight.html`.

## Antivirus del server (Imunify360): mai link brevi `pnssm.pro`
- Il 5/11 (menu-tavolo.html) e il 17 e 19/11 (menu.html) Imunify360 ha «ripulito» la pagina tagliando un blocco di codice dal primo all'ultimo link `https://pnssm.pro/a16isyw` (motivo: SMW-INJ-CLOUDAV-js.tool.remote). La pagina restava col modello grezzo (`{{exitSecond}}`, popup di Brady's Quest che non si chiude). Il server ricopia i file solo quando cambia il ramo keik-it, quindi la copia rotta restava online.
- Dal 19/11 il sito usa solo l'indirizzo completo `https://forms.pienissimo.pro/?hashform=pw2h42fpguiftebdugzkzw6g3ce2zowg&id=vLZP8Y` (dal 21/11; `MbjDTW` è il modulo serale di KEIK by Night e va SOLO nella pagina bynight) (negli attributi href con `&amp;`). Non usare più link brevi pnssm.pro.
- Se una pagina online sembra rotta: cPanel → Imunify360 → Malware Scanner (elenco «Cleaned») e confrontare la dimensione del file online con quella del ramo keik-it.
