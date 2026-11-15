const fs = require('fs');
const html = fs.readFileSync(process.argv[2] || require('path').join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/\/\*ENGINE-START\*\/([\s\S]*?)\/\*ENGINE-END\*\//);
const Engine = new Function(m[1] + '\nreturn Engine;')();
const { T, run, lexRecipe, findMatches, PRIM, fmt, evalNode, C, step } = Engine;

let fail = 0;
const unlockedSoFar = new Set();
const tok2t = {};
T.forEach(t => (tok2t[t.tok] = t));

for (const t of T) {
  const toks = lexRecipe(t.recipe);
  const missing = toks.filter(k => !PRIM.has(k) && !(tok2t[k] && unlockedSoFar.has(tok2t[k].id)));
  let stack, hits = [];
  try {
    // replay token by token, collecting every key that unlocks along the way
    let s = [];
    for (const tok of toks) {
      const r = step(s, tok);
      s = r.stack;
      if (r.made) findMatches(r.made.ast).forEach(h => { if (!hits.includes(h.id)) hits.push(h.id); });
    }
    stack = s;
  } catch (e) { console.log('RUN FAIL', t.id, e.message); fail++; continue; }
  const topHits = findMatches(stack[stack.length - 1].ast).map(x => x.id);
  const ok = stack.length === 1 && topHits.includes(t.id);
  const extra = topHits.filter(h => h !== t.id);
  console.log((ok ? 'ok  ' : 'FAIL') + ' ' + t.id.padEnd(5) + ' depth=' + stack.length + ' final=' + topHits.join(',') +
    (missing.length ? '  MISSING PREREQ: ' + missing.join(' ') : ''));
  if (!ok || missing.length || extra.length) fail++;
  unlockedSoFar.add(t.id);
}

const probe = s => { const st = run(lexRecipe(s)); return findMatches(st[st.length - 1].ast).map(x => x.id); };
console.log('1 1 eml          ->', probe('1 1 eml'));
console.log('x 1 eml          ->', probe('x 1 eml'));
console.log('1 e eml          ->', probe('1 e eml'), '(= e - 1 =', fmt(evalNode(run(lexRecipe('1 e eml'))[0].ast, { x: C(2), y: C(3) })) + ')');
console.log('1 1 eml 1 eml    ->', probe('1 1 eml 1 eml'));
console.log('x dup * (square) ->', probe('x dup *'));
console.log('y x swap -       ->', probe('y x swap -'), '(y x swap - = x - y)');

for (const toks of [['eml'], ['1', 'eml'], ['swap'], ['dup'], ['exp']]) {
  try { run(toks); console.log('no error for', toks); } catch (e) { console.log(JSON.stringify(toks.join(' ')), '->', e.message); }
}

const G = Engine.graph();
const rows = T.map(t => [t.id, G[t.id].depth, G[t.id].cost, G[t.id].deps.length]).sort((a, b) => b[2] - a[2]);
console.log('\nid\tdepth\tcost\tdeps');
rows.forEach(r => console.log(r.join('\t')));
const anc = id => { const s = new Set(); const go = k => G[k].deps.forEach(d => { if (!s.has(d)) { s.add(d); go(d); } }); go(id); return s; };
const hard = T.filter(t => G[t.id].cost >= 150).map(t => t.id);
console.log('very hard (>=150):', hard.join(' '), '| all need i:', hard.every(h => anc(h).has('i')));
console.log('max depth:', Math.max(...T.map(t => G[t.id].depth)));
console.log('keys', T.length, fail ? 'FAILURES: ' + fail : 'ALL RECIPES OK');
process.exit(fail ? 1 : 0);
