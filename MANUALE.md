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
- Font: Montserrat, Big Shoulders Display, Space Mono, Caveat (ospitati sul sito). Mermaid e Local Brewery non hanno licenza web: non usarli.

## Cartelle

- `keikcanvas/project/*.dc.html`: **le pagine** (una per pagina del sito). Qui si fanno le modifiche.
- `blobs/`: foto originali, chiamate dalle pagine come `/_blob/<codice>`.
- `imgcache/`: versioni leggere delle foto (`<codice>-480.webp`, `-960.webp`) + `manifest.json` con larghezza e altezza.
- `og/`: immagini di anteprima per i social.
- `site-build/build.py`: costruisce il sito. `prerender.js`: scrive l'HTML finale (per Google). `dict_all.json`: traduzioni. `restaurant_ld.json`: dati del ristorante per Google (orari, premi...). `prod_extra/`: file solo per keik.it (`.htaccess` con i rimandi da Shopify, `robots.txt`, `sitemap.xml`, `llms.txt`).
- `deploy/aggiorna-keik.sh`: lo script che gira su FastComet (cron ogni 5 minuti).
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
- Google Analytics: `G-8TJZ0BY97T` · Microsoft Clarity: `z4auk6y1db` (partono solo su keik.it e solo dopo il consenso ai cookie di misurazione).
- iubenda: siteId 418012, cookiePolicyId 680124. Google Maps si carica con il consenso "Esperienza" o al clic.
- Moduli Pienissimo: `https://forms.pienissimo.pro/?hashform=pw2h42fpguiftebdugzkzw6g3ce2zowg&id=<ID>` · generale `MbjDTW` · Aperitivo in lingua `58ayJR` · Friendsgiving `QLRP7p` · panino del giorno dopo `ULHn9C`.
- Buoni regalo: Gift Up. Clienti: Pienissimo. WhatsApp: 353 4732354. Telefono: 059 8396468.
- Search Console: proprietà Dominio `keik.it` (verificata con TXT), sitemap inviata.

## Da fare / in sospeso

- Eventi: la pagina passa da ottobre a novembre da sola il 1/11; entro inizio dicembre serve la pagina di dicembre. Dopo novembre togliere la riga Merenda Social Club dalla home.
- Zone Editor: rimettere su `192.250.229.195` le righe `cpanel`, `webmail`, `ftp`, `whm`, `webdisk`, `cpcalendars`, `cpcontacts` (oggi puntano ancora a Shopify).
- Fra 2–3 settimane dalla migrazione (27/10/2026): togliere il dominio da Shopify, chiudere il piano, cancellare `public_html-backup-2026-10-27` su FastComet.
- Domande aperte per Elena: prezzo delle sole patatine Crispy; interpretazione del "menu in sei atti".
- Idee: sezione "Torte e box" nella pagina Pomeriggio; pagine statiche in inglese; FAQ/schema nelle pagine dei momenti.
