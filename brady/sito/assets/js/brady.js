/* Capitano Brady · chat eventi di KEIK
 * Dati: dati/eventi.json (fonte unica). Risposte: api/brady.php (ponte su FastComet).
 * Se il ponte non risponde, Brady usa le risposte di base costruite dagli stessi dati. */
(() => {
  'use strict';
  const WA = '393534732354', WA_SHOW = '353 473 2354';
  const AVATAR = window.BRADY_AVATAR || 'assets/img/brady-capitano-96.webp';
  const API = window.BRADY_API || 'api/brady.php';
  const LANGS = ['it', 'en', 'es', 'fr'];
  const LOC = { it: 'it-IT', en: 'en-GB', es: 'es-ES', fr: 'fr-FR' };
  // Da quale poster arriva il cliente (?da=bacheca|muro|bancone): finisce nel messaggio WhatsApp
  const DA = ((location.search.match(/[?&]da=([a-z0-9-]{1,20})/) || [])[1]) || '';

  const pad = (n) => String(n).padStart(2, '0');
  const d0 = new Date();
  const TODAY = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`;
  const fmt = (iso, lang = 'it') => {
    try { return new Date(iso + 'T12:00:00').toLocaleDateString(LOC[lang] || 'it-IT', { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch (e) { return iso; }
  };

  let DATA = window.BRADY_DATA || null;
  const events = () => (DATA && DATA.eventi) || [];
  const byId = (id) => id === 'festa' ? (DATA && DATA.feste_private) : events().find((e) => e.id === id);
  const future = (e) => (e.date || []).filter((g) => g >= TODAY);
  const gone = (e) => (e.date || []).length > 0 && !future(e).length;

  /* ---------- Testi ---------- */
  const T = {
    it: {
      hello: () => "Ciao! Sono il Capitano Brady. Chiedimi degli eventi del mese o dimmi cosa vuoi prenotare: ti preparo la carta d'imbarco.",
      thinking: 'Il capitano controlla la rotta…', pass: "Carta d'imbarco", data: 'Data', turno: 'Turno', persone: 'Persone',
      form: 'Prenota il tuo posto', wa: 'Scrivi su WhatsApp', table: 'Prenota un tavolo',
      note: 'Il posto è confermato quando ricevi la conferma di KEIK.', all: "Cosa c'è questo mese?", party: 'Voglio fare una festa', book: 'Prenota ',
      which: 'Volentieri. Per quale evento?', gift: 'La gift card del Black Friday non si prenota: si compra in cassa il 26 e 27 novembre, fino a esaurimento.',
      ticket: "Ecco la carta d'imbarco: il pulsante ti porta al modulo giusto. Se preferisci, c'è anche WhatsApp.",
      unknown: `Questa preferisco chiederla allo staff, così non ti racconto rotte inventate. Scrivi su WhatsApp al ${WA_SHOW}.`,
      busy: 'Tanti passeggeri al gate in questo momento: ti rispondo con le informazioni di base.', gone: 'già partito', send: 'Invia', ph: 'Scrivi a Brady…'
    },
    en: {
      hello: () => "Hi! I'm Captain Brady. Ask me about this month's events or tell me what you'd like to book: I'll prepare your boarding pass.",
      thinking: 'The captain is checking the route…', pass: 'Boarding pass', data: 'Date', turno: 'Seating', persone: 'Guests',
      form: 'Book your seat', wa: 'Message on WhatsApp', table: 'Book a table',
      note: 'Your seat is confirmed once KEIK confirms it.', all: "What's on this month?", party: 'Private party', book: 'Book ',
      which: 'Happy to. Which event?', gift: "The Black Friday gift card can't be booked: you buy it at the till on 26 and 27 November, while they last.",
      ticket: "Here's your boarding pass: the button takes you to the right booking form. WhatsApp works too.",
      unknown: `I'd rather ask the staff than make up a route. Message them on WhatsApp at ${WA_SHOW}.`,
      busy: "Busy gate right now: here's the basic information.", gone: 'departed', send: 'Send', ph: 'Message Brady…'
    },
    es: {
      hello: () => '¡Hola! Soy el Capitán Brady. Pregúntame por los eventos del mes o dime qué quieres reservar: te preparo la tarjeta de embarque.',
      thinking: 'El capitán está revisando la ruta…', pass: 'Tarjeta de embarque', data: 'Fecha', turno: 'Turno', persone: 'Personas',
      form: 'Reserva tu plaza', wa: 'Escribir por WhatsApp', table: 'Reservar mesa',
      note: 'Tu plaza está confirmada cuando KEIK te la confirma.', all: '¿Qué hay este mes?', party: 'Fiesta privada', book: 'Reservar ',
      which: 'Claro. ¿Para qué evento?', gift: 'La gift card del Black Friday no se reserva: se compra en caja el 26 y 27 de noviembre, hasta agotar existencias.',
      ticket: 'Aquí tienes tu tarjeta de embarque: el botón te lleva al formulario correcto. También puedes usar WhatsApp.',
      unknown: `Prefiero preguntárselo al equipo antes que inventar una ruta. Escríbeles por WhatsApp al ${WA_SHOW}.`,
      busy: 'Mucha gente en la puerta ahora mismo: te respondo con la información básica.', gone: 'salido', send: 'Enviar', ph: 'Escribe a Brady…'
    },
    fr: {
      hello: () => "Bonjour ! Je suis le Capitaine Brady. Demandez-moi les événements du mois ou ce que vous voulez réserver : je prépare votre carte d'embarquement.",
      thinking: 'Le capitaine vérifie la route…', pass: "Carte d'embarquement", data: 'Date', turno: 'Service', persone: 'Personnes',
      form: 'Réserver ma place', wa: 'Écrire sur WhatsApp', table: 'Réserver une table',
      note: 'Votre place est confirmée quand KEIK vous la confirme.', all: 'Quoi de neuf ce mois-ci ?', party: 'Fête privée', book: 'Réserver ',
      which: 'Avec plaisir. Pour quel événement ?', gift: "La gift card du Black Friday ne se réserve pas : elle s'achète en caisse les 26 et 27 novembre, dans la limite des stocks.",
      ticket: "Voici votre carte d'embarquement : le bouton mène au bon formulaire. WhatsApp marche aussi.",
      unknown: `Je préfère demander à l'équipe plutôt qu'inventer une route. Écrivez-leur sur WhatsApp au ${WA_SHOW}.`,
      busy: "Beaucoup de monde à la porte : voici les informations de base.", gone: 'parti', send: 'Envoyer', ph: 'Écrire à Brady…'
    }
  };

  function detectLang(t) {
    if (/[¿¡ñ]|\b(hola|qué|cuándo|reservar|reserva|precio|dónde|cuánto|quiero|gracias|mesa|personas|hay)\b/i.test(t)) return 'es';
    if (/[çœ]|\b(bonjour|merci|réserver|quand|combien|je|vous|est-ce|quel|quelle|où)\b/i.test(t)) return 'fr';
    if (/\b(the|what|when|how|book|hi|hello|is|are|price|where|want|table|people|thanks|please|open|can)\b/i.test(t)) return 'en';
    return 'it';
  }

  /* ---------- Risposte di base (senza ponte) ---------- */
  function eventInfo(e) {
    return `${e.titolo}: ${e.quando}.\n${e.descrizione}\n${(e.dettagli || []).join('\n')}`;
  }
  function localAnswer(text, lang) {
    const t = text.toLowerCase(), f = T[lang];
    const pick =
      /friendsgiving|thanksgiving|ringraziamento|acci[oó]n de gracias|friends/.test(t) ? 'friendsgiving' :
      /crispy|patatin|fries|papas|patatas|frites/.test(t) ? 'crispy' :
      /lingua|language|idioma|langue|spagnol|spanish|español|intercambio|exchange|karaoke/.test(t) ? 'lingua' :
      /gift|regal|tarjeta|carte cadeau|black friday/.test(t) ? 'giftcard' :
      /panino|sandwich|bocadillo|moist maker|giorno dopo|day after/.test(t) ? 'panino' :
      /festa|compleann|party|birthday|cumplea|fiesta|f[eê]te|anniversaire|laurea/.test(t) ? 'festa' : null;
    const wantsBook = /prenot|book|reserv|réserv/.test(t);
    const ev = pick && byId(pick);
    if (wantsBook) {
      if (pick === 'giftcard') return { reply: f.gift };
      if (ev) {
        const m = t.match(/(?:per|for|para|pour|siamo|we are|somos|nous sommes)\s+(\d{1,2})\b|\b(\d{1,2})\s*(?:persone|people|personas|personnes|pax|ospiti|guests)/);
        const turno = /\b21(:00)?\b|9\s?pm/.test(t) ? '21:00' : (/\b19(:00)?\b|7\s?pm/.test(t) ? '19:00' : null);
        return { reply: f.ticket, booking: { event: pick, persone: m ? Number(m[1] || m[2]) : null, turno } };
      }
      if (/tavolo|table|mesa|brunch|pranzo|lunch|almuerzo|déjeuner|aperitivo|apéro/.test(t)) return { reply: f.ticket, booking: { event: 'tavolo' } };
      return { reply: f.which, chips: events().filter((e) => e.modulo && !gone(e)).map((e) => f.book + e.titolo).slice(0, 3) };
    }
    if (ev) return { reply: pick === 'festa' ? `${ev.descrizione}\n${ev.dettagli.join('\n')}` : eventInfo(ev), chips: pick !== 'giftcard' ? [f.book + ev.titolo] : null };
    if (/mese|month|mes\b|mois|eventi|events|eventos|événements|cosa c'|what's on|qué hay|programma/.test(t)) {
      const list = events().filter((e) => !gone(e));
      return { reply: list.map((e) => `${e.titolo} · ${e.quando}`).join('\n') || f.unknown, chips: list.filter((e) => e.modulo).slice(0, 2).map((e) => f.book + e.titolo) };
    }
    if (/orari|hours|horario|horaire|apert|open|abiert|ouvert|chiud|closed/.test(t)) return { reply: 'Aperti 7 giorni su 7: 10–20, venerdì e sabato fino alle 22. Cucina fino alle 19:30, venerdì e sabato fino alle 21:30.' };
    if (/parchegg|parking|aparca|garer|dove|where|d[oó]nde|où|indirizzo|address|direcci|adresse/.test(t)) return { reply: 'Via Canalino 51, Modena, in ZTL. Si parcheggia sui viali entrando da via Saragozza o da via Gallucci, poi pochi minuti a piedi.\nhttps://maps.google.com/?q=Via+Canalino+51+Modena' };
    if (/celiac|cel[ií]ac|coeliac|glutin|gluten/.test(t)) return { reply: 'Abbiamo un menu senza glutine, ma non è adatto ai celiaci: in cucina lavoriamo farine ogni giorno e non possiamo garantire l\'assenza di tracce.' };
    if (/^(ciao|salve|buongiorno|buonasera|hello|hi|hey|hola|bonjour)\b/.test(t)) return { reply: f.hello(null), chips: [f.all, f.party] };
    return { reply: f.unknown };
  }

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const log = $('b-log'), chipsEl = $('b-chips'), form = $('b-form'), input = $('b-msg'), sendBtn = $('b-send');
  let lang = 'it', turns = [], busy = false, tid = 0;
  try {
    const q = (location.search.match(/[?&]lang=([a-z]{2})/) || [])[1];
    const s = q || localStorage.getItem('keik-lang');
    if (LANGS.includes(s)) lang = s;
  } catch (e) { /* storage non disponibile */ }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const linkify = (s) => esc(s).replace(/https:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https:\/\//, '')}</a>`);
  const scrollDown = () => { log.scrollTop = log.scrollHeight; };

  function addMsg(role, text) {
    const d = document.createElement('div');
    if (role === 'bot') {
      d.className = 'b-row';
      d.innerHTML = `<img class="b-face" src="${AVATAR}" alt="" width="30" height="30"><div class="b-msg b-bot">${text === null ? '<span class="b-dots" aria-label="' + esc(T[lang].thinking) + '"><i></i><i></i><i></i></span>' : linkify(text)}</div>`;
    } else {
      d.className = 'b-msg b-me';
      d.textContent = text;
    }
    log.append(d); scrollDown(); return d;
  }
  function setChips(list) {
    if (!chipsEl) return;
    chipsEl.textContent = '';
    (list || []).slice(0, 4).forEach((c) => {
      if (!c || typeof c !== 'string') return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'b-chip'; b.textContent = c.slice(0, 60);
      b.addEventListener('click', () => send(c));
      chipsEl.append(b);
    });
  }
  function defaultChips() {
    const f = T[lang];
    const next = events().find((e) => e.modulo && !gone(e));
    return [f.all, next && f.book + next.titolo, f.party].filter(Boolean);
  }

  /* ---------- Carta d'imbarco ---------- */
  function waText(s, ev) {
    const n = s.persone, p = n === 1 ? '1 persona' : `${n} persone`;
    let t = ev.whatsapp_testo || 'Ciao KEIK!';
    if (s.event === 'tavolo') t = 'Ciao KEIK! Vorrei prenotare un tavolo';
    if (s.date && !(ev.date && ev.date.length === 1)) t += `, ${fmt(s.date)}`;
    if (s.turno) t += `, turno delle ${s.turno}`;
    t += `, ${p}.`;
    return `${t}\n(via Capitano Brady${DA ? ' · ' + DA : ''})`;
  }
  function renderTicket(b) {
    const u = T[lang];
    const ev = b.event === 'tavolo' ? { id: 'tavolo', titolo: u.table, modulo: 'prenota.html' } : byId(b.event);
    if (!ev || (ev.date && !future(ev).length)) return;
    const k = ++tid, days = ev.date ? future(ev) : null;
    const min = b.event === 'festa' ? 7 : 1, max = b.event === 'festa' ? 80 : 20;
    const s = {
      event: b.event,
      date: days ? (days.includes(b.date) ? b.date : days[0]) : (b.date && b.date >= TODAY ? b.date : ''),
      turno: ev.turni ? (ev.turni.includes(b.turno) ? b.turno : ev.turni[0]) : null,
      persone: Math.min(max, Math.max(min, parseInt(b.persone, 10) || (b.event === 'festa' ? 10 : 2)))
    };
    let dateField = '';
    if (days && days.length > 1) dateField = `<select id="t${k}-date">${days.map((d) => `<option value="${d}"${d === s.date ? ' selected' : ''}>${esc(fmt(d, lang))}</option>`).join('')}</select>`;
    else if (days) dateField = `<strong>${esc(fmt(s.date, lang))}</strong>`;
    else dateField = `<input type="date" id="t${k}-date" min="${TODAY}" value="${s.date}">`;
    const card = document.createElement('div');
    card.className = 'b-ticket';
    card.innerHTML = `
      <div class="b-band"><span>${esc(u.pass)}</span><b>KEIK · MOD</b></div>
      <div class="b-body">
        <h3>${esc(ev.titolo)}</h3>
        ${ev.quando ? `<p class="b-when">${esc(ev.quando)}</p>` : ''}
        <div class="b-fields">
          ${days && days.length === 1 ? '' : `<label class="b-field"><span>${esc(u.data)}</span>${dateField}</label>`}
          ${ev.turni ? `<div class="b-field"><span>${esc(u.turno)}</span><div class="b-seg">${ev.turni.map((t) => `<button type="button" aria-pressed="${t === s.turno}" data-t="${t}">${t}</button>`).join('')}</div></div>` : ''}
          <div class="b-field"><span>${esc(u.persone)}</span><div class="b-step"><button type="button" aria-label="−" data-d="-1">−</button><output id="t${k}-n">${s.persone}</output><button type="button" aria-label="+" data-d="1">+</button></div></div>
        </div>
        <div class="b-ctas">
          ${ev.modulo ? `<a class="b-cta" href="${esc(ev.modulo)}" target="_blank" rel="noopener">${esc(u.form)}</a>` : ''}
          <a class="${ev.modulo ? 'b-cta2' : 'b-cta'}" id="t${k}-wa" target="_blank" rel="noopener">${esc(u.wa)}</a>
        </div>
        <p class="b-small">${esc(u.note)} WhatsApp ${WA_SHOW}</p>
      </div>`;
    const wa = card.querySelector(`#t${k}-wa`), out = card.querySelector(`#t${k}-n`);
    const update = () => { wa.href = `https://wa.me/${WA}?text=${encodeURIComponent(waText(s, ev))}`; out.textContent = s.persone; };
    const dEl = card.querySelector(`#t${k}-date`);
    if (dEl) dEl.addEventListener('change', () => { s.date = dEl.value; update(); });
    card.querySelectorAll('.b-seg button').forEach((btn) => btn.addEventListener('click', () => {
      s.turno = btn.dataset.t;
      card.querySelectorAll('.b-seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
      update();
    }));
    card.querySelectorAll('.b-step button').forEach((btn) => btn.addEventListener('click', () => {
      s.persone = Math.min(max, Math.max(min, s.persone + Number(btn.dataset.d))); update();
    }));
    update();
    log.append(card);
    log.scrollTop = Math.max(0, card.offsetTop - log.offsetTop - 70);
  }

  /* ---------- Ponte ---------- */
  async function askBridge(messages) {
    if (typeof window.BRADY_TRANSPORT === 'function') return window.BRADY_TRANSPORT(messages);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 45000);
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }), signal: ctl.signal });
      const j = await r.json().catch(() => null);
      return j && j.ok ? j : { ok: false, error: (j && j.error) || 'http' };
    } catch (e) {
      return { ok: false, error: 'rete' };
    } finally { clearTimeout(timer); }
  }

  async function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true; sendBtn.disabled = true; setChips([]);
    input.value = '';
    addMsg('me', text);
    const dl = detectLang(text);
    if (!(dl === 'it' && lang !== 'it' && text.length < 25)) lang = dl;
    const wait = addMsg('bot', null);
    wait.classList.add('b-thinking');
    turns.push({ role: 'user', content: text });
    const r = await askBridge(turns.slice(-12));
    wait.remove();
    let res;
    if (r && r.ok && r.reply) {
      res = r;
      if (LANGS.includes(r.lang)) lang = r.lang;
      turns.push({ role: 'assistant', content: r.reply });
    } else {
      turns.pop();
      res = localAnswer(text, lang);
      if (r && (r.error === 'troppi_messaggi' || r.error === 'limite_giornaliero' || r.error === 'occupato')) res.reply = T[lang].busy + '\n\n' + res.reply;
    }
    addMsg('bot', res.reply);
    if (res.booking) renderTicket(res.booking);
    busy = false; sendBtn.disabled = false;
    if (window.matchMedia && matchMedia('(hover: hover)').matches) input.focus();
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });

  async function start() {
    if (!DATA) {
      try { DATA = await (await fetch('dati/eventi.json', { cache: 'no-cache' })).json(); } catch (e) { DATA = { eventi: [] }; }
    }
    input.placeholder = T[lang].ph;
    sendBtn.setAttribute('aria-label', T[lang].send);
    addMsg('bot', T[lang].hello(DATA));
    const q = (location.search.match(/[?&]chiedi=([^&]+)/) || [])[1];
    if (q) { try { send(decodeURIComponent(q.replace(/\+/g, ' '))); } catch (e) { /* ignora */ } }
  }
  start();
})();
