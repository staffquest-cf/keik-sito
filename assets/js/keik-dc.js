/* keik-dc.js — runtime minimo per le pagine KEIK (template {{ }}, sc-for, sc-if, eventi, ref, stato). */
(function () {
  'use strict';
  var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
  var BOOL = { checked: 1, disabled: 1, selected: 1, hidden: 1, open: 1, readonly: 1, required: 1, multiple: 1, autofocus: 1 };
  var EVENTS = { onclick: 'click', oninput: 'input', onchange: 'change', onsubmit: 'submit', onkeydown: 'keydown', onkeyup: 'keyup', onfocus: 'focus', onblur: 'blur' };
  var HOLE = /\{\{\s*([^{}]+?)\s*\}\}/g;
  var ONE = /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function lookup(expr, scopes) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    if (/^'.*'$|^".*"$/.test(expr)) return expr.slice(1, -1);
    var parts = expr.split('.');
    var head = parts[0];
    var base;
    for (var i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i] && Object.prototype.hasOwnProperty.call(scopes[i], head)) { base = scopes[i][head]; break; }
    }
    for (var j = 1; j < parts.length; j++) { if (base == null) return undefined; base = base[parts[j]]; }
    return base;
  }

  // --- i18n: dizionario caricato da assets/i18n/<lingua>.js (window.__KI18N__), lingua in window.__KLANG__
  var LANG = window.__KLANG__ || 'it';
  var DICT = LANG !== 'it' ? (window.__KI18N__ || null) : null;
  var TRA = { alt: 1, 'aria-label': 1, placeholder: 1, title: 1 };
  function norm(s) { return s.replace(/\s+/g, ' ').replace(/'/g, '\u2019').trim(); }
  function t(s) {
    if (!DICT || typeof s !== 'string') return s;
    var k = norm(s);
    if (!k) return s;
    var v = DICT[k];
    if (v == null) {
      // ripiego: stessa frase con numeri diversi (es. "4 persone" -> "{n} persone")
      var nums = k.match(/\d+/g);
      if (!nums || nums.length > 2) return s;
      v = DICT[k.replace(/\d+/g, '{n}')];
      if (v == null) return s;
      var j = 0;
      v = v.replace(/\{n\}/g, function () { return nums[j++]; });
    }
    return /^\s*/.exec(s)[0] + v + /\s*$/.exec(s)[0];
  }
  window.KEIK_T = t;

  function str(v) { return v == null || v === false ? (v === false ? 'false' : '') : String(v); }
  function interp(text, scopes, tr) { return text.replace(HOLE, function (_, e) { var v = lookup(e, scopes); return str(tr ? t(v) : v); }); }

  // --- M1 immagini: srcset WebP, dimensioni, lazy (manifest in assets/js/kimg.js, primi elementi visibili in __KEAGER__)
  var KIMG = window.__KIMG__ || {};
  var KEAGER = window.__KEAGER__ || [];
  var IMGRX = /^(.*?assets\/img\/)([0-9a-f]{32})\.(jpe?g|png|webp)$/;
  function imgEnhance(out, start) {
    var html = out.slice(start).join('');
    var m = / src="([^"]*)"/.exec(html);
    if (!m) return;
    var mm = IMGRX.exec(m[1]);
    if (!mm || !KIMG[mm[2]]) return;
    var info = KIMG[mm[2]], base = mm[1] + mm[2] + '-';
    var mid = info.v.filter(function (w) { return w <= 960; }).pop() || info.v[0];
    html = html.replace(' src="' + m[1] + '"', ' src="' + base + mid + '.webp"');
    var add = ' srcset="' + info.v.map(function (w) { return base + w + '.webp ' + w + 'w'; }).join(', ') + '"';
    var sw = /style="[^"]*?(?:^|[;\s])width:\s*(\d+)px/.exec(html);
    var sh = /style="[^"]*?(?:^|[;\s])height:\s*(\d+)px/.exec(html);
    var sz = '(max-width: 700px) 100vw, 50vw';
    if (sw && +sw[1] <= 600) sz = sw[1] + 'px';
    else if (sh && +sh[1] <= 300 && !sw && !/width:\s*[\d.]+%/.test(html)) sz = Math.round(+sh[1] * info.w / info.h) + 'px';
    add += ' sizes="' + sz + '"';
    if (!/ width="/.test(html)) add += ' width="' + info.w + '"';
    if (!/ height="/.test(html)) add += ' height="' + info.h + '"';
    if (!/ decoding="/.test(html)) add += ' decoding="async"';
    var ei = KEAGER.indexOf(mm[2]);
    if (!/ loading="/.test(html)) add += ei >= 0 ? ' loading="eager"' : ' loading="lazy"';
    if (ei === 0 && !/ fetchpriority="/.test(html)) add += ' fetchpriority="high"';
    add += ' data-kki';
    out.splice(start, out.length - start, html + add);
  }

  function Renderer() { this.handlers = []; this.refs = []; this.notr = 0; }
  Renderer.prototype.node = function (n, scopes, out) {
    if (n.nodeType === 3) {
      var tx = this.notr ? n.nodeValue : t(n.nodeValue);
      out.push(esc(interp(tx, scopes, !this.notr)).replace(/&quot;/g, '"'));
      return;
    }
    if (n.nodeType !== 1) return;
    var tag = n.localName;
    if (tag === 'sc-for') {
      var list = lookup((n.getAttribute('list') || '').replace(/^\s*\{\{|\}\}\s*$/g, ''), scopes) || [];
      var as = n.getAttribute('as') || 'item';
      for (var k = 0; k < list.length; k++) {
        var sc = {}; sc[as] = list[k];
        this.kids(n, scopes.concat([sc]), out);
      }
      return;
    }
    if (tag === 'sc-if') {
      var v = lookup((n.getAttribute('value') || '').replace(/^\s*\{\{|\}\}\s*$/g, ''), scopes);
      if (v) this.kids(n, scopes, out);
      return;
    }
    var nt = n.hasAttribute && n.hasAttribute('data-notr');
    if (nt) this.notr++;
    var trA = !this.notr;
    var start = out.length;
    out.push('<' + tag);
    for (var a = 0; a < n.attributes.length; a++) {
      var at = n.attributes[a], name = at.name, val = at.value, lname = name.toLowerCase();
      if (lname.indexOf('hint-') === 0) continue;
      var m = ONE.exec(val);
      if (EVENTS[lname] && m) {
        var fn = lookup(m[1], scopes);
        if (typeof fn === 'function') { this.handlers.push(fn); out.push(' data-dc-' + EVENTS[lname] + '="' + (this.handlers.length - 1) + '"'); }
        continue;
      }
      if (lname === 'ref' && m) {
        var rf = lookup(m[1], scopes);
        if (typeof rf === 'function') { this.refs.push(rf); out.push(' data-dc-ref="' + (this.refs.length - 1) + '"'); }
        continue;
      }
      if (m) {
        var raw = lookup(m[1], scopes);
        if (BOOL[lname]) { if (raw && raw !== 'false') out.push(' ' + name); continue; }
        if (raw == null) continue;
        out.push(' ' + name + '="' + esc(trA && TRA[lname] ? t(raw) : raw) + '"');
        continue;
      }
      var tv = trA && TRA[lname];
      if (tv) val = t(val);
      out.push(' ' + name + '="' + esc(val.indexOf('{{') >= 0 ? interp(val, scopes, tv) : val) + '"');
    }
    if (tag === 'img') imgEnhance(out, start);
    out.push('>');
    if (VOID[tag]) { if (nt) this.notr--; return; }
    if (tag === 'template') { out.push(n.innerHTML); } else { this.kids(n.content || n, scopes, out); }
    out.push('</' + tag + '>');
    if (nt) this.notr--;
  };
  Renderer.prototype.kids = function (n, scopes, out) {
    for (var c = n.firstChild; c; c = c.nextSibling) this.node(c, scopes, out);
  };

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (patch) {
    var self = this;
    if (typeof patch === 'function') patch = patch(self.state, self.props);
    self.state = Object.assign({}, self.state, patch || {});
    if (!self.__queued) { self.__queued = true; Promise.resolve().then(function () { self.__queued = false; self.__render(); }); }
  };
  DCLogic.prototype.forceUpdate = function () { this.__render(); };
  DCLogic.prototype.renderVals = function () { return {}; };
  DCLogic.prototype.t = t;
  DCLogic.prototype.lang = LANG;

  function syncLang() {
    var b = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < b.length; i++) b[i].setAttribute('aria-pressed', b[i].getAttribute('data-lang') === LANG ? 'true' : 'false');
  }
  document.addEventListener('click', function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest('[data-lang]') : null;
    if (!el) return;
    ev.preventDefault();
    var l = el.getAttribute('data-lang');
    if (l === LANG) return;
    var ok = false;
    try { localStorage.setItem('keik-lang', l); ok = localStorage.getItem('keik-lang') === l; } catch (e) {}
    var u = new URL(location.href);
    if (ok) u.searchParams.delete('lang'); else u.searchParams.set('lang', l);
    location.href = u.toString();
  });
  // A: barra pagine scorrevole: sfumatura dove continua, voce attiva sempre visibile
  function kkBar(first) {
    var bar = document.querySelector('.kk-bar');
    if (!bar) return;
    var upd = function () {
      var more = bar.scrollWidth - bar.clientWidth - bar.scrollLeft > 4;
      var less = bar.scrollLeft > 4;
      if (more) bar.setAttribute('data-more', ''); else bar.removeAttribute('data-more');
      if (less) bar.setAttribute('data-less', ''); else bar.removeAttribute('data-less');
    };
    if (first) {
      var cur = bar.querySelector('[aria-current="page"]');
      if (cur && bar.scrollWidth > bar.clientWidth) {
        var x = cur.offsetLeft - (bar.clientWidth - cur.offsetWidth) / 2;
        bar.scrollLeft = Math.max(0, x);
      }
      bar.addEventListener('scroll', upd, { passive: true });
      window.addEventListener('resize', upd);
    }
    upd();
  }
  function translateHead() {
    if (!DICT) return;
    document.title = t(document.title);
    var ms = document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]');
    for (var i = 0; i < ms.length; i++) ms[i].setAttribute('content', t(ms[i].getAttribute('content') || ''));
  }
  window.DCLogic = DCLogic;

  function boot() {
    var tpl = document.getElementById('dc-tpl');
    var codeEl = document.getElementById('dc-code');
    var root = document.getElementById('dc-root');
    if (!tpl || !root) return;
    var props = {};
    var defs = window.__DC_PROPS__ || {};
    Object.keys(defs).forEach(function (k) { if (k.charAt(0) !== '$') props[k] = defs[k] && typeof defs[k] === 'object' && 'default' in defs[k] ? defs[k].default : defs[k]; });
    Object.assign(props, window.__DC_OVERRIDE__ || {});
    var Comp = DCLogic;
    if (codeEl) {
      try { Comp = new Function('DCLogic', codeEl.textContent + '\n;return typeof Component !== "undefined" ? Component : DCLogic;')(DCLogic); }
      catch (err) { console.error('[keik-dc] errore nel codice della pagina', err); }
    }
    var inst = new Comp(props);
    if (!inst.state) inst.state = {};
    inst.props = props;
    var current = { handlers: [], refs: [] };
    var mounted = false;
    inst.__render = function () {
      var vals;
      try { vals = inst.renderVals() || {}; } catch (err) { console.error('[keik-dc] renderVals', err); vals = {}; }
      var r = new Renderer();
      var out = [];
      r.kids(tpl.content, [props, vals], out);
      current = r;
      var next = document.createElement('div');
      next.id = 'dc-root';
      next.innerHTML = out.join('');
      window.morphdom(root, next, {
        onBeforeElUpdated: function (from, to) {
          if (from === document.activeElement && (from.tagName === 'INPUT' || from.tagName === 'TEXTAREA')) {
            to.value = from.value;
          }
          if (from.tagName === 'IFRAME' && from.getAttribute('src') === to.getAttribute('src')) return false;
          if (from.tagName === 'DETAILS' && mounted) { if (from.open) to.setAttribute('open', ''); else to.removeAttribute('open'); }
          return true;
        }
      });
      syncLang();
      kkBar(!mounted);
      var refEls = root.querySelectorAll('[data-dc-ref]');
      for (var i = 0; i < refEls.length; i++) {
        var fn = current.refs[+refEls[i].getAttribute('data-dc-ref')];
        if (fn) { try { fn(refEls[i]); } catch (e) { console.error(e); } }
      }
      if (!mounted) {
        mounted = true;
        if (typeof inst.componentDidMount === 'function') { try { inst.componentDidMount(); } catch (e) { console.error(e); } }
      } else if (typeof inst.componentDidUpdate === 'function') {
        try { inst.componentDidUpdate(); } catch (e2) { console.error(e2); }
      }
    };
    Object.keys(EVENTS).forEach(function (k) {
      var type = EVENTS[k];
      var capture = type === 'focus' || type === 'blur';
      root.addEventListener(type, function (ev) {
        var el = ev.target;
        while (el && el !== root) {
          if (el.nodeType === 1 && el.hasAttribute('data-dc-' + type)) {
            var fn = current.handlers[+el.getAttribute('data-dc-' + type)];
            if (fn) fn.call(inst, ev);
            return;
          }
          el = el.parentNode;
        }
      }, capture);
    });
    window.addEventListener('pagehide', function () { if (typeof inst.componentWillUnmount === 'function') inst.componentWillUnmount(); });
    translateHead();
    inst.__render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
