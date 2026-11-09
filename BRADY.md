# Capitano Brady · chat eventi di keik.it

Brady risponde alle domande sugli eventi del mese e su KEIK, e quando qualcuno vuole prenotare mostra la carta d'imbarco con il modulo giusto (Pienissimo) e l'alternativa WhatsApp.

Pagina: `https://keik.it/brady.html` (`noindex`). Si arriva dai QR dei poster (`?da=bancone`, `?da=muro`…) e, dal 9/11/2026, dal pulsante galleggiante "Chiedi a Brady" **solo nella home** (`?da=home`, si apre in un'altra scheda). Scelta di Elena: nelle altre pagine no, chi ci arriva sa già cosa cerca. Non mettere il pulsante "Chiedi al Capitano Brady" nella pagina Eventi.
Link con domanda già scritta, utile per i QR: `https://keik.it/brady.html?chiedi=Friendsgiving`

## Come è fatto

Nel laboratorio (ramo `sorgente`) i file di Brady stanno nella cartella `brady/`:

- `brady/sito/` → va sia nell'anteprima (`main`) sia su keik.it: pagina, script, foto, `dati/eventi.json`. La copia `costruisci.sh` (dopo il prerender).
- `brady/solo-keikit/` → va **solo** su keik.it (`pubprod.sh`): il ponte `api/` e la cartella `dati/privato/`. Nell'anteprima su GitHub Pages il PHP non gira: Brady usa le risposte di base.

Si modificano **solo qui**, mai direttamente su FastComet: a ogni pubblicazione lo script del server copia il ramo `keik-it` sopra `public_html` (con `rsync --delete`), quindi un file cambiato o aggiunto solo sul server verrebbe sovrascritto o cancellato.

| File (dentro `brady/sito/` o `brady/solo-keikit/`) | A cosa serve |
|---|---|
| `brady.html` + `assets/js/brady.js` | La pagina della chat |
| `dati/eventi.json` | **Fonte unica degli eventi del mese**: date, testi, prezzi, link dei moduli |
| `dati/privato/crispy-gusti.json` | Gusti del Crispy Friday: Brady li dice solo dopo la data di svelamento |
| `dati/privato/brady-keik.txt` | Tutto il resto su KEIK (orari, menu, allergie, parcheggio…), preso dalle pagine del sito |
| `dati/privato/brady-istruzioni.txt` | Carattere e regole di Brady |
| `api/brady.php` | Il ponte su FastComet: tiene nascosta la chiave e parla con l'AI |

La cartella `dati/privato` non è leggibile dal web (file `.htaccess`). Se il ponte non risponde (chiave mancante, problema di rete, troppi messaggi), Brady passa alle risposte di base costruite da `eventi.json`, così la pagina non si blocca mai.

## Da fare una volta sola, su FastComet (fatto il 3/11/2026, qui per riferimento)

1. **Chiave API.** Vai su console.anthropic.com → Settings → API Keys → crea una chiave chiamata "keik-brady". In Billing → Limits imposta un limite di spesa mensile (per esempio 20 €).
2. **File di configurazione fuori dal sito.** In cPanel → File Manager apri la cartella home (quella che contiene `public_html`, **non** dentro `public_html`). Crea il file `brady-config.php` con questo contenuto e incolla la tua chiave al posto di `INCOLLA-QUI`:

   ```php
   <?php
   return [
       'anthropic_api_key' => 'INCOLLA-QUI',
       'model' => 'claude-haiku-5-5',
       'max_messaggi_per_ip_10min' => 20,
       'max_messaggi_al_giorno' => 1500,
   ];
   ```

   Questo file non va mai su GitHub.
3. **PHP.** In cPanel → Select PHP Version controlla che sia 8.0 o più recente, con l'estensione `curl` attiva (di solito lo è già).
4. **Prova.** Apri `https://keik.it/api/brady.php?stato`: deve rispondere `{"ok":true,...}`. Poi apri `https://keik.it/brady.html` e scrivi una domanda.

## Ogni mese

Quando si aggiorna la pagina Eventi (`keikcanvas/project/Eventi.dc.html`), aggiornare nello stesso giro `brady/sito/dati/eventi.json` (date, testi, prezzi, link dei moduli Pienissimo) (e i gusti in `brady/solo-keikit/dati/privato/crispy-gusti.json` se c'è un rituale con sorprese). Poi si pubblica come sempre (main, `pubprod.sh`, sorgente): Brady legge i dati nuovi alla domanda successiva. Gli eventi con data passata li considera "già partiti" da solo.

## Privacy

Le conversazioni non vengono salvate da KEIK: il ponte tiene solo contatori anonimi per limitare l'uso. I messaggi passano dall'AI di Anthropic per generare la risposta: va aggiunto alla privacy policy su iubenda (fornitore: Anthropic, finalità: assistente informativo sul sito).
