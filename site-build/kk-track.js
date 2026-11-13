/* KK-TRACK · azioni importanti di keik.it per Google Analytics (eventi da segnare come "eventi chiave").
 * Parte solo se Google Analytics è attivo, cioè solo su keik.it e solo dopo il consenso ai cookie di misurazione
 * (window.gtag esiste solo in quel caso). Nell'anteprima e senza consenso non registra niente.
 * Con ?kkdebug nell'indirizzo scrive gli eventi nella console, per le prove.
 *
 * Eventi:
 *   prenota_apri_modulo   apertura del modulo Pienissimo dentro la pagina (modulo: tavolo / evento / matcha)
 *   prenota_click         clic su un link "Prenota" verso la pagina Prenota o il modulo
 *   modulo_esterno_click  apertura del modulo Pienissimo in una nuova pagina
 *   whatsapp_click        clic su un link WhatsApp
 *   telefono_click        clic sul numero di telefono
 *   indicazioni_click     clic su Google Maps / indicazioni
 *   buono_regalo_click    clic su "acquista" del buono regalo (Gift Up)
 *   passaporto_click      clic sul Passaporto del Gusto
 *   brady_apri            clic sul pulsante "Chiedi a Brady" della home
 *   brady_messaggio       messaggio inviato al Capitano Brady
 *   brady_carta_imbarco   Brady mostra la carta d'imbarco con i pulsanti di prenotazione
 *
 * Gli stessi eventi vanno anche al pixel di Meta (solo se window.fbq esiste, cioè su keik.it dopo il consenso
 * ai cookie di marketing), tradotti negli eventi standard di Meta secondo la tabella META qui sotto.
 */
(function () {
  'use strict';
  var debug = /[?&]kkdebug\b/.test(location.search);
  var pagina = (location.pathname.replace(/^\/+|\.html$/g, '') || 'home');

  var META = {
    prenota_apri_modulo: 'Schedule',
    modulo_esterno_click: 'Schedule',
    whatsapp_click: 'Contact',
    telefono_click: 'Contact',
    indicazioni_click: 'FindLocation',
    buono_regalo_click: 'InitiateCheckout',
    brady_carta_imbarco: 'Lead'
  };

  function kkTrack(name, params) {
    var p = Object.assign({ pagina: pagina }, params || {});
    if (debug) try { console.log('[kk-track]', name, p, META[name] ? '→ Meta ' + META[name] : ''); } catch (e) {}
    if (typeof window.gtag === 'function') {
      try { window.gtag('event', name, p); } catch (e) {}
    }
    if (META[name] && typeof window.fbq === 'function') {
      try { window.fbq('track', META[name], Object.assign({ content_name: name }, p)); } catch (e) {}
    }
  }
  window.kkTrack = kkTrack;

  var MODULI = { kpOpen: 'tavolo', kpEv: 'evento', kpMt: 'matcha' };
  window.kkTrackModulo = function (k) { kkTrack('prenota_apri_modulo', { modulo: MODULI[k] || k }); };

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var host = '';
    try { host = new URL(a.href, location.href).hostname; } catch (e) {}
    var testo = (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (a.classList.contains('k-brady') || /brady\.html/.test(href)) return kkTrack('brady_apri', { testo: testo });
    if (/^tel:/i.test(href)) return kkTrack('telefono_click', { testo: testo });
    if (/(^|\.)wa\.me$|whatsapp\.com$/i.test(host)) return kkTrack('whatsapp_click', { testo: testo });
    if (/pnssm\.pro$|forms\.pienissimo\.pro$/i.test(host)) return kkTrack('modulo_esterno_click', { testo: testo });
    if (/pro\.pns\.sm$/i.test(host)) return kkTrack('passaporto_click', { testo: testo });
    if (/yourgift\.cards$|giftup/i.test(host)) return kkTrack('buono_regalo_click', { testo: testo });
    if (/maps\.google\.|google\.[a-z.]+$/i.test(host) && /maps/i.test(a.href)) return kkTrack('indicazioni_click', { testo: testo });
    if (/prenota(\.html)?([?#]|$)|^#(modulo|prenota)/i.test(href) || /^#prenota-/.test(href)) return kkTrack('prenota_click', { testo: testo });
  }, true);
})();
