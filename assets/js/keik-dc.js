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

  function str(v) { return v == null || v === false ? (v === false ? 'false' : '') : String(v); }
  function interp(text, scopes) { return text.replace(HOLE, function (_, e) { return str(lookup(e, scopes)); }); }

  function Renderer() { this.handlers = []; this.refs = []; }
  Renderer.prototype.node = function (n, scopes, out) {
    if (n.nodeType === 3) { out.push(esc(interp(n.nodeValue, scopes)).replace(/&quot;/g, '"')); return; }
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
        out.push(' ' + name + '="' + esc(raw) + '"');
        continue;
      }
      out.push(' ' + name + '="' + esc(val.indexOf('{{') >= 0 ? interp(val, scopes) : val) + '"');
    }
    out.push('>');
    if (VOID[tag]) return;
    if (tag === 'template') { out.push(n.innerHTML); } else { this.kids(n.content || n, scopes, out); }
    out.push('</' + tag + '>');
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
          return true;
        }
      });
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
    inst.__render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
