import json, os, re, shutil, sys, glob

# B1: anteprima GitHub = noindex. Per FastComet: KEIK_TARGET=fastcomet python3 build.py (C2)
SITE = 'https://keik.it'
PREVIEW = os.environ.get('KEIK_TARGET', 'preview') != 'fastcomet'
# Cartella principale del progetto (quella che contiene keikcanvas/, site-build/, blobs/ ...)
SCR = os.environ.get('KEIK_ROOT') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = SCR + '/keikcanvas/project'
BLOBS = SCR + '/blobs'
OUT = SCR + '/site-build/dist'

PAGES = {
    'Main': 'index', 'Brunch': 'brunch', 'Pranzo': 'pranzo', 'Aperitivo': 'aperitivo', 'Merenda': 'merenda',
    'Vegano': 'vegano-senza-glutine', 'ChiSiamo': 'chi-siamo', 'Eventi': 'eventi', 'Menu': 'menu',
    'Aziende': 'aziende', 'BuoniRegalo': 'buoni-regalo', 'LavoraConNoi': 'lavora-con-noi',
    'Contatti': 'contatti', 'Prenota': 'prenota', 'FAQ': 'faq', '404': '404',
    'EventiOttobre': 'eventi-ottobre',
}
# Cambio mese automatico della pagina Eventi: fino a questa data si vede eventi-ottobre.html
EV_SWITCH = '2026-11-01T00:00:00+01:00'

if os.path.exists(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT + '/assets/img')
os.makedirs(OUT + '/assets/js')
os.makedirs(OUT + '/assets/i18n')
shutil.copytree(SCR + '/og', OUT + '/assets/img/og')

# dizionari EN/ES/FR (chiave = testo italiano normalizzato)
def _norm(x):
    return re.sub(r'\s+', ' ', x).replace("'", '\u2019').strip()
_D = json.load(open(SCR + '/site-build/dict_all.json', encoding='utf-8'))
for _i, _l in enumerate(['en', 'es', 'fr']):
    _m = {}
    for _k, _v in _D.items():
        if _v[_i] and _v[_i] != _k:
            _m[_norm(_k)] = _v[_i]
    open(f'{OUT}/assets/i18n/{_l}.js', 'w', encoding='utf-8').write('window.__KI18N__=' + json.dumps(_m, ensure_ascii=False, separators=(',', ':')) + ';\n')

LANG_JS = ("<script>(function(){var L=['it','en','es','fr'],l=null,q=(location.search.match(/[?&]lang=([a-z]{2})/)||[])[1];"
  "if(q&&L.indexOf(q)>=0){l=q;try{localStorage.setItem('keik-lang',q)}catch(e){}}"
  "if(!l){try{l=localStorage.getItem('keik-lang')}catch(e){}if(L.indexOf(l)<0)l=null;}"
  "if(!l&&/bot|crawl|spider|slurp|lighthouse|headless/i.test(navigator.userAgent))l='it';"
  "if(!l){var n=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'it'],f=null;"
  "for(var i=0;i<n.length;i++){var c=String(n[i]).slice(0,2).toLowerCase();if(c==='it'){f='it';break;}if(!f&&L.indexOf(c)>0)f=c;}l=f||'en';}"
  "window.__KLANG__=l;document.documentElement.lang=l;"
  "if(l!=='it')document.write('<script src=\"assets/i18n/'+l+'.js\"><\\/script>');})();</script>\n")

blobmap = {}
for f in os.listdir(BLOBS):
    bid, ext = os.path.splitext(f)
    blobmap[bid] = 'assets/img/' + bid + ext
    shutil.copy(os.path.join(BLOBS, f), OUT + '/assets/img/' + f)

shutil.copy(SCR + '/site-build/node_modules/morphdom/dist/morphdom-umd.min.js', OUT + '/assets/js/morphdom.min.js')
shutil.copy(SCR + '/site-build/keik-dc.js', OUT + '/assets/js/keik-dc.js')

# M1: versioni WebP ridimensionate (480/960/1600) + manifest per srcset
_man = json.load(open(SCR + '/imgcache/manifest.json'))
for _f in os.listdir(SCR + '/imgcache'):
    if _f.endswith('.webp'):
        shutil.copy(SCR + '/imgcache/' + _f, OUT + '/assets/img/' + _f)
open(OUT + '/assets/js/kimg.js', 'w').write('window.__KIMG__=' + json.dumps(_man, separators=(',', ':')) + ';\n')


def rewrite(t):
    t = re.sub(r'/_blob/([0-9a-f]{32})', lambda m: blobmap.get(m.group(1), m.group(0)), t)
    t = re.sub(r'\b(\w+)\.dc\.html', lambda m: (PAGES[m.group(1)] + '.html') if m.group(1) in PAGES else m.group(0), t)
    t = t.replace('menutelefono.html', 'menu-tavolo.html')
    return t


def build(name, slug, override=None):
    s = open(f'{SRC}/{name}.dc.html', encoding='utf-8').read()
    title = re.search(r'<title>(.*?)</title>', s, re.S).group(1)
    helmet = re.search(r'<helmet>(.*?)</helmet>', s, re.S)
    helmet = helmet.group(1) if helmet else ''
    body = re.search(r'</helmet>(.*?)</x-dc>', s, re.S) or re.search(r'<x-dc>(.*?)</x-dc>', s, re.S)
    body = body.group(1)
    sm = re.search(r"<script type=\"text/x-dc\"[^>]*?(?:data-props='([^']*)')?[^>]*>(.*?)</script>", s, re.S)
    props = json.loads(sm.group(1)) if sm.group(1) else {}
    code = sm.group(2)
    head_extra = ''
    if slug == '404' and not PREVIEW:
        head_extra = '<base href="/">\n'
    elif slug == '404':
        head_extra = ("<script>(function(){var p=location.pathname.split('/');"
                      "if(/github\\.io$/.test(location.hostname)&&p.length>2&&p[1]){document.write('<base href=\"/'+p[1]+'/\">');}})();</script>\n")
    if slug == 'eventi':
        head_extra += ("<script>if(!navigator.webdriver&&Date.now()<Date.parse('" + EV_SWITCH + "'))location.replace('eventi-ottobre.html'+location.search+location.hash);</script>\n")
    if slug == 'eventi-ottobre':
        head_extra += ("<script>if(!navigator.webdriver&&Date.now()>=Date.parse('" + EV_SWITCH + "'))location.replace('eventi.html'+location.search+location.hash);</script>\n")
    if slug == 'menu-tavolo':
        _tm = json.load(open(SCR + '/site-build/tavolo_meta.json', encoding='utf-8'))
        title = _tm['title']
        helmet = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="' + _tm['desc'] + '">', helmet)
    # B3 Open Graph
    OG = ''
    if slug != '404':
        _md = re.search(r'<meta name="description" content="([^"]*)"', helmet)
        _desc = _md.group(1) if _md else ''
        _img = slug if slug in ('brunch', 'pranzo', 'merenda', 'aperitivo') else 'home'
        _url = SITE + ('/' if slug == 'index' else '/' + slug + '.html')
        OG = ('<meta property="og:type" content="website">\n<meta property="og:site_name" content="KEIK">\n'
              '<meta property="og:locale" content="it_IT">\n'
              f'<meta property="og:url" content="{_url}">\n<meta property="og:title" content="{title}">\n'
              f'<meta property="og:description" content="{_desc}">\n'
              f'<meta property="og:image" content="{SITE}/assets/img/og/{_img}.jpg">\n'
              '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
              '<meta name="twitter:card" content="summary_large_image">\n')
    # B4 schema Restaurant
    if slug in ('index', 'contatti', 'menu'):
        OG += '<script type="application/ld+json">' + json.dumps(json.load(open(SCR + '/site-build/restaurant_ld.json', encoding='utf-8')), ensure_ascii=False) + '</script>\n'
    ROBOTS = '<meta name="robots" content="noindex, nofollow">\n' if PREVIEW and 'name="robots"' not in helmet else ''
    # Blocco C: banner cookie iubenda solo sul sito vero (keik.it), non sull'anteprima
    if not PREVIEW:
        OG += ('<script type="text/javascript">var _iub = _iub || []; _iub.csConfiguration = {"askConsentAtCookiePolicyUpdate":true,"floatingPreferencesButtonDisplay":false,"perPurposeConsent":true,"siteId":418012,"whitelabel":false,"cookiePolicyId":680124,"lang":"it","banner":{"acceptButtonDisplay":true,"closeButtonRejects":true,"customizeButtonDisplay":true,"explicitWithdrawal":true,"listPurposes":true}}; _iub.csLangConfiguration = {"it":{"cookiePolicyId":680124}}; _iub.csConfiguration.callback = {onPreferenceExpressedOrNotNeeded: function (p) { window.__kkConsent = p; document.dispatchEvent(new CustomEvent("kk-consent", {detail: p})); }};</script>\n'
               '<script type="text/javascript" src="https://cs.iubenda.com/sync/418012.js"></script>\n'
               '<script type="text/javascript" src="https://cdn.iubenda.com/cs/iubenda_cs.js" charset="UTF-8" async></script>\n')
        # Statistiche (Google Analytics 4 + Microsoft Clarity): partono solo su keik.it e solo dopo il consenso ai cookie di misurazione (finalità 4 iubenda)
        OG += ('<script>(function(){var GA="G-8TJZ0BY97T",CL="z4auk6y1db",done=false;'
               'function ok(p){if(!p)return false;if(p.consent===true)return true;var u=p.purposes||{};return u[4]===true||u["4"]===true;}'
               'function go(){if(done)return;if(location.hostname.replace(/^www\\./,"")!=="keik.it")return;done=true;'
               'var s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id="+GA;document.head.appendChild(s);'
               'window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};gtag("js",new Date());gtag("config",GA,{anonymize_ip:true});'
               '(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",CL);}'
               'if(ok(window.__kkConsent))go();document.addEventListener("kk-consent",function(e){if(ok(e.detail))go();});})();</script>\n')
    # B6: menu al tavolo (QR) mai indicizzato, canonical verso menu.html (anche su FastComet)
    if slug == 'eventi-ottobre':
        ROBOTS = '<meta name="robots" content="noindex, follow">\n<link rel="canonical" href="' + SITE + '/eventi.html">\n'
    if slug == 'menu-tavolo':
        ROBOTS = '<meta name="robots" content="noindex, follow">\n<link rel="canonical" href="' + SITE + '/menu.html">\n'
    html = f'''<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
{ROBOTS}{head_extra}{LANG_JS}<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
{OG}<style>html,body{{overflow-x:clip}}summary{{cursor:pointer}}summary::-webkit-details-marker{{display:none}}details[open]>summary .kk-s1,details:not([open])>summary .kk-s2{{display:none}}:where(img[data-kki]){{height:auto}}body{{padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}}@media (max-width:960px){{body:has([class$="-sticky"]) footer,body:has(.m-bar) footer{{padding-bottom:calc(112px + env(safe-area-inset-bottom)) !important}}[class$="-sticky"],.m-bar{{transition:transform .25s ease,visibility 0s}}html.kk-down [class$="-sticky"],html.kk-down .m-bar{{transform:translateY(160%);visibility:hidden;transition:transform .25s ease,visibility 0s .25s}}#dc-root a:not([style*="padding"]):not([style*="min-height"]):not(.m-dot){{padding-top:14px;padding-bottom:14px;margin-top:-14px;margin-bottom:-14px}}.kk-sitemap>div,.k-foot>div{{gap:0!important}}.kk-sitemap a,.k-foot a{{display:flex!important;align-items:center;min-height:44px;padding:0!important;margin:0!important}}.kk-bar{{padding-top:1px!important;padding-bottom:1px!important}}.kk-bar a{{min-height:44px!important}}.kk-lang button,.kk-langm{{min-height:44px!important;min-width:44px!important}}.m-catnav a,.m-explore button,.m-row button,.m-bar button{{min-height:44px!important}}.m-dot::after{{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}}[style*="font-size: 9px"],[style*="font-size: 10px"],[style*="font-size: 11px"],.m-dotlabel{{font-size:12px!important}}input[type=checkbox],input[type=radio]{{width:24px!important;height:24px!important;min-width:24px;flex-shrink:0}}input[type=range]{{min-height:44px}}input[type=search],input[type=text],input[type=email],input[type=tel]{{min-height:44px;font-size:max(16px,1em)}}}}</style>
<link rel="icon" type="image/png" href="{blobmap['cab2c85a72f518cbd8df0064e68be490']}">
{rewrite(helmet).strip()}
</head>
<body>
<div id="dc-root"></div>
<template id="dc-tpl">{rewrite(body)}</template>
<script type="text/x-dc" id="dc-code">{rewrite(code)}</script>
<script>window.__DC_PROPS__ = {json.dumps(props, ensure_ascii=False)};window.__DC_OVERRIDE__ = {json.dumps(override or {}, ensure_ascii=False)};</script>
<script src="assets/js/morphdom.min.js"></script>
<script src="assets/js/kimg.js"></script>
<script src="assets/js/keik-dc.js"></script>
<script>/* KK-HIDE: su iPhone la barra Prenota si nasconde scorrendo giù (Safari 26 la copre) e riappare scorrendo su */(function(){{var y=0,d=document.documentElement;addEventListener("scroll",function(){{var n=scrollY;if(Math.abs(n-y)<8)return;d.classList.toggle("kk-down",n>y&&n>160);y=n;}},{{passive:true}});}})();</script>
</body>
</html>
'''
    # Caratteri sul nostro server (niente Google Fonts: GDPR e velocità)
    html = html.replace('<link rel="preconnect" href="https://fonts.googleapis.com">\n', '')
    html = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/css2[^"]*">',
                  '<link rel="preload" href="assets/fonts/montserrat-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="assets/fonts/big-shoulders-display-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="stylesheet" href="assets/fonts/fonts.css">', html)
    open(f'{OUT}/{slug}.html', 'w', encoding='utf-8').write(html)


for name, slug in PAGES.items():
    build(name, slug)
build('Menu', 'menu-tavolo', {'contesto': 'tavolo'})
open(OUT + '/.nojekyll', 'w').write('')
# Caratteri: copia dei file (latin + latin-ext) e fonts.css con i nomi usati nel sito
import glob as _g
_FN = SCR + '/fonts/node_modules/'
os.makedirs(OUT + '/assets/fonts', exist_ok=True)
_css = []
for _fam, _pkg, _css_files in [('Big Shoulders Display', '@fontsource-variable/big-shoulders-display', ['wght.css']),
                               ('Montserrat', '@fontsource-variable/montserrat', ['wght.css']),
                               ('Caveat', '@fontsource-variable/caveat', ['wght.css']),
                               ('Space Mono', '@fontsource/space-mono', ['400.css', '700.css'])]:
    for _cf in _css_files:
        for _blk in re.findall(r'@font-face\s*\{.*?\}', open(_FN + _pkg + '/' + _cf).read(), re.S):
            _m = re.search(r'url\(\./files/([^)]+)\)', _blk)
            if not _m or not re.search(r'-latin(-ext)?-', _m.group(1)):
                continue
            shutil.copy(_FN + _pkg + '/files/' + _m.group(1), OUT + '/assets/fonts/' + _m.group(1))
            _blk = re.sub(r"font-family:\s*'[^']*'", "font-family: '" + _fam + "'", _blk)
            _blk = _blk.replace('./files/', '').replace("format('woff2-variations')", "format('woff2')")
            _css.append(_blk)
open(OUT + '/assets/fonts/fonts.css', 'w').write('\n'.join(_css) + '\n')
# Velocità: i caratteri dentro la pagina (niente richiesta che blocca) + precarico di Space Mono (tabellone)
_inl = '<style>' + re.sub(r'url\(([^)/]+\.woff2)\)', r'url(assets/fonts/\1)', '\n'.join(_css)) + '</style>'
for _h in glob.glob(OUT + '/*.html'):
    _t = open(_h, encoding='utf-8').read()
    _t = _t.replace('<link rel="stylesheet" href="assets/fonts/fonts.css">',
                    '<link rel="preload" href="assets/fonts/space-mono-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>\n' + _inl)
    open(_h, 'w', encoding='utf-8').write(_t)
shutil.copy(SCR + '/site-build/README.md', OUT + '/README.md')
print('ok', len(os.listdir(OUT)))
