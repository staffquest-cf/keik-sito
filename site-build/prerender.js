const { chromium } = require('playwright');
const fs = require('fs');
const RX = /assets\/img\/([0-9a-f]{32})[.-]/;
(async () => {
  const b = await chromium.launch();
  for (const f of fs.readdirSync('dist').filter(x => x.endsWith('.html'))) {
    // 1) immagini visibili nella prima schermata (telefono e computer)
    const seen = new Map();
    for (const [w, h] of [[390, 844], [1440, 900]]) {
      const p = await b.newPage({ viewport: { width: w, height: h } });
      await p.goto('http://localhost:8765/dist/' + f + '?lang=it'); await p.waitForTimeout(700);
      const list = await p.evaluate(() => [...document.querySelectorAll('#dc-root img')].map(i => { const r = i.getBoundingClientRect(); return { src: i.getAttribute('src') || '', top: r.top, area: r.width * r.height }; }).filter(x => x.area > 0 && x.top < innerHeight));
      for (const x of list) { const m = RX.exec(x.src); if (m) seen.set(m[1], Math.max(seen.get(m[1]) || 0, x.area * (w === 390 ? 2 : 1))); }
      await p.close();
    }
    const eager = [...seen.entries()].sort((a, c) => c[1] - a[1]).map(x => x[0]);
    let src = fs.readFileSync('dist/' + f, 'utf8').replace(/<script>window\.__KEAGER__=[^<]*<\/script>\n?/, '');
    src = src.replace('<script src="assets/js/kimg.js"></script>', () => '<script>window.__KEAGER__=' + JSON.stringify(eager) + ';</script>\n<script src="assets/js/kimg.js"></script>');
    fs.writeFileSync('dist/' + f, src);
    // 2) HTML pronto per Google
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto('http://localhost:8765/dist/' + f + '?lang=it'); await p.waitForTimeout(800);
    let html = await p.evaluate(() => document.getElementById('dc-root').innerHTML);
    html = html.replace(/ data-dc-[a-z]+="\d+"/g, '');
    let s2 = fs.readFileSync('dist/' + f, 'utf8');
    // GEO: dati strutturati del menu (schema.org Menu) generati dalla pagina
    const ld = await p.evaluate(() => window.__KK_LD__ ? JSON.stringify(window.__KK_LD__) : '');
    if (ld && f === 'menu.html') s2 = s2.replace('</head>', () => '<script type="application/ld+json">' + ld.replace(/</g, '\\u003c') + '</script>\n</head>');
    fs.writeFileSync('dist/' + f, s2.replace('<div id="dc-root"></div>', () => '<div id="dc-root">' + html + '</div>'));
    console.log(f, html.length, 'eager:', eager.length);
    await p.close();
  }
  await b.close();
})();
