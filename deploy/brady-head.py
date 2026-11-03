#!/usr/bin/env python3
"""Solo per keik.it (lo chiama pubprod.sh): copia in brady.html gli script di iubenda
e delle statistiche (Analytics + Clarity) presi da index.html, così sono identici
a quelli di tutte le altre pagine. Il meta noindex di brady.html resta."""
import re, sys
prod = sys.argv[1]
idx = open(prod + '/index.html', encoding='utf-8').read()
m = re.search(r'<script type="text/javascript">var _iub = .*?G-8TJZ0BY97T.*?</script>\n', idx, re.S)
if not m:
    sys.exit('brady-head: script iubenda/statistiche non trovati in index.html')
p = prod + '/brady.html'
b = open(p, encoding='utf-8').read()
anchor = '<meta name="robots" content="noindex, nofollow">\n'
if anchor not in b or '_iub.csConfiguration' in b:
    sys.exit('brady-head: brady.html inatteso (manca noindex o ha già iubenda)')
open(p, 'w', encoding='utf-8').write(b.replace(anchor, anchor + m.group(0), 1))
print('brady-head: iubenda + statistiche aggiunti a brady.html')
