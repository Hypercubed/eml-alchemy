const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2] || require('path').join(__dirname, '..', 'index.html'), 'utf8');
const errors = [];
const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', {
  runScripts: 'dangerously', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.addEventListener('error', e => errors.push(e.message)); },
});
const d = dom.window.document;
const live = label => Array.from(d.querySelectorAll('#pad .key, #extras .key')).find(k => k.textContent === label && !k.classList.contains('ghost'));
const press = label => { const b = live(label); if (!b) throw new Error('no live key ' + label); b.click(); };
const ghost = label => Array.from(d.querySelectorAll('#pad .key.ghost')).some(k => k.textContent === label);
const rows = () => Array.from(d.querySelectorAll('#stack .lvl')).map(r => r.textContent.replace(/\s+/g, ' ').trim());
const slate = () => d.getElementById('slate').textContent;
const log = (...a) => console.log(...a);

log('extras row:', Array.from(d.querySelectorAll('#extras .key')).map(k => k.textContent).join(' | '),
    '| pad starts:', Array.from(d.querySelectorAll('#pad .key')).slice(0, 5).map(k => k.textContent).join(' '),
    '| eml wide:', d.querySelector('#pad .key.wide').textContent, '| extras above pad:', !!(d.getElementById('extras').compareDocumentPosition(d.getElementById('pad')) & 4),
    '| actions:', Array.from(d.querySelectorAll('.actions .act')).map(b => b.textContent).join(' '),
    '| x/y/swap/drop left in pad:', Array.from(d.querySelectorAll('#pad .key')).filter(k => ['x', 'y', 'swap', 'drop'].includes(k.textContent)).length);
log('keys', d.querySelectorAll('#pad .key, #extras .key').length, '| lit at start:', d.querySelectorAll('#pad .key:not(.ghost), #extras .key:not(.ghost)').length, '| brackets/equals present:',
  !!d.getElementById('bEq') || Array.from(d.querySelectorAll('#pad .key, #extras .key')).some(k => k.textContent === '(' || k.textContent === ')'));
log('stack at start:', rows());

press('1'); press('1');
log('after 1 1:', rows());
press('eml');
log('after eml:', rows(), '| e is ghost?', ghost('e'));
log('slate:', slate().slice(0, 70), '| fresh:', Array.from(d.querySelectorAll('.key.fresh')).map(k => k.textContent));

d.getElementById('bClear').click();
press('x'); press('1'); press('eml');
log('x 1 eml -> exp is ghost?', ghost('exp'), '| progress:', d.getElementById('pcount').textContent);

// error: operation without enough operands
d.getElementById('bClear').click();
press('1'); press('eml');
log('error:', slate().slice(0, 90), '| stack still:', rows()[3]);

// undo / drop / dup / swap
d.getElementById('bClear').click();
press('x'); press('y'); press('swap');
log('x y swap:', rows().slice(2).join(' || '));
d.getElementById('bUndo').click();
log('undo:    ', rows().slice(2).join(' || '));
press('dup');
log('dup:     ', rows().slice(1).join(' || '));
d.getElementById('bDrop').click();
log('drop:    ', rows().slice(2).join(' || '));

// ghost hint, then "Press them for me" plays a recipe through the real keys
d.getElementById('bClear').click();
Array.from(d.querySelectorAll('#pad .key.ghost')).find(k => k.textContent === 'ln').click();
Array.from(d.querySelectorAll('#slate button')).find(b => b.textContent === 'Show recipe').click();
log('recipe:', slate().slice(0, 100));
Array.from(d.querySelectorAll('#slate button')).find(b => b.textContent === 'Press them for me').click();
log('ln is ghost after recipe?', ghost('ln'), '| progress:', d.getElementById('pcount').textContent, '| top:', rows()[3]);

// play the entire game through the UI in order
const Eng = dom.window.eval('Engine');
let n = 0;
for (const t of Eng.T) {
  if (ghost(t.label)) {
    d.getElementById('bClear').click();
    const toks = Eng.lexRecipe(t.recipe);
    const labelFor = tok => (Eng.T.find(x => x.tok === tok) || Object.values(Eng.KEYS).find(k => k.tok === tok)).label;
    for (const tok of toks) press(labelFor(tok));
    if (ghost(t.label)) { log('STILL LOCKED after recipe:', t.id); }
    n++;
  }
}
log('full playthrough via real key presses:', d.getElementById('pcount').textContent, '|', d.getElementById('pstate').textContent, '| ghosts left:', d.querySelectorAll('#pad .key.ghost').length);
log('final slate:', slate().slice(0, 80));
const store = JSON.parse(dom.window.localStorage.getItem('emlAlchemy.v1'));
log('saved:', Object.keys(store.unlocked).length, 'keys');

// ---- key map ----
const mapView = d.getElementById('viewMap'), calcView = d.getElementById('viewCalc');
log('\nmap hidden at start:', mapView.hidden, '| calc hidden:', calcView.hidden);
d.getElementById('tabMap').click();
log('after Key map tab -> map hidden:', mapView.hidden, '| calc hidden:', calcView.hidden, '| hash:', dom.window.location.hash, '| selected:', d.getElementById('tabMap').getAttribute('aria-selected'));
const nodes = d.querySelectorAll('#graph .node'), edges = d.querySelectorAll('#graph .edge');
log('nodes:', nodes.length, '| edges:', edges.length, '| rings:', d.querySelectorAll('#graph .ring').length,
    '| unlocked nodes:', d.querySelectorAll('#graph .node.st-on').length, '| ready:', d.querySelectorAll('#graph .node.st-ready').length);
log('rank cost rows:', Array.from(d.querySelectorAll('#rankCost .rrow')).slice(0, 4).map(r => r.textContent.replace(/\s+/g, ' ')));
log('rank depth rows:', Array.from(d.querySelectorAll('#rankDepth .rrow')).map(r => r.dataset.id).join(','));
log('why1:', d.getElementById('why1').textContent);
log('why2:', d.getElementById('why2').textContent);
d.querySelector('#graph .node[data-id="tan"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
log('select tan ->', d.getElementById('detail').textContent.replace(/\s+/g, ' ').slice(0, 170));
log('highlighted edges:', d.querySelectorAll('#graph .edge.hl').length, '| dimmed nodes:', d.querySelectorAll('#graph .node.dim').length, '| selring:', d.querySelectorAll('#graph .selring').length);
// keyboard select through a recipe chip
d.querySelector('#detail .nchip').click();
log('chip click ->', d.querySelector('#detail .dn').textContent);
d.querySelector('#graph .node[data-id="sub"]').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
log('Enter on sub ->', d.querySelector('#detail .dn').textContent);
d.querySelector('#graph .node[data-id="sub"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
log('tap again deselects:', d.getElementById('detail').textContent.slice(0, 40));
d.getElementById('reset').click(); d.getElementById('reset').click();
log('after reset -> unlocked:', d.querySelectorAll('#graph .node.st-on').length, '| ready:', Array.from(d.querySelectorAll('#graph .node.st-ready')).map(n => n.dataset.id).join(','), '| locked:', d.querySelectorAll('#graph .node.st-lock').length, '| edges on:', d.querySelectorAll('#graph .edge.on').length);
d.querySelector('#graph .node[data-id="acos"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
log('select acos (locked) ->', d.getElementById('detail').textContent.replace(/\s+/g, ' ').slice(0, 150));
d.getElementById('mapHint').click();
log('hint button -> calc visible:', !calcView.hidden, '| slate:', slate().slice(0, 60));
d.getElementById('tabCalc').click();
log('back to calc -> map hidden:', mapView.hidden);
log('JS errors:', errors.length ? errors : 'none');
