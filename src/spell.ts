/* الرُّقية — a rough playable of the spell system.
 *
 * The thesis: in Arabic the ROOT carries the meaning across every derived form, and the
 * PATTERN (وزن) says how that meaning is aimed. So a word is not a score — it is a casting.
 *   الجذر  decides WHAT the spell does   (كسر breaks, شفي heals, حرق burns…)
 *   الوزن  decides HOW it lands          (مفعول falls on the enemy, فاعِل on you…)
 * English cannot do this; its words carry no systematic meaning. This prototype exists to
 * find out whether casting-by-morphology is actually fun before any of it touches the game.
 */
import { loadDict, isWord, isAlive, ROOTS, DISP, norm, rootOf, displayOf, spaced } from './dict';
import { patOf } from './data';
import './spell.css';

/* ---------- the six spells ---------- */
const SPELLS = {
  كسر: { n: 'كَسْر', d: 'ضرر مباشر', kind: 'dmg' },
  حرق: { n: 'حَرْق', d: 'لهب يأكل العدو كل دور', kind: 'burn' },
  شفي: { n: 'شِفاء', d: 'يرد إليك العافية', kind: 'heal' },
  حمي: { n: 'حِماية', d: 'درع يصد الضربة القادمة', kind: 'shield' },
  سرق: { n: 'سَرِقة', d: 'تأخذ من عمره وتضيفه لعمرك', kind: 'drain' },
  جمع: { n: 'جَمْع', d: 'تجمع حروفًا جديدة إلى يدك', kind: 'draw' },
};
const SPELL_ROOTS = Object.keys(SPELLS);

/* ---------- the four shapes: how a casting is aimed ---------- */
const SHAPES = [
  { id: 'mafuul', n: 'مفعول', x: 2.0, d: 'اسم المفعول — يقع على عدوك كاملًا',
    test: s => s.length === 5 && s[0] === 'م' && s[3] === 'و' },
  { id: 'istifaal', n: 'استفعال', x: 3.0, d: 'الاستفعال — طلبٌ عظيم، أقوى ما يكون',
    test: s => s.length === 7 && s.startsWith('است') },
  { id: 'tafiil', n: 'تفعيل', x: 2.0, d: 'التفعيل — تُضاعف أثر الجذر',
    test: s => s.length === 5 && s[0] === 'ت' && s[3] === 'ي' },
  { id: 'faail', n: 'فاعِل', x: 1.5, d: 'اسم الفاعل — أنت من يفعل',
    test: s => s.length === 4 && s[1] === 'ا' },
];
const shapeOf = s => SHAPES.find(p => p.test(s)) || null;

/* The pool is deliberately loaded with the radicals of the six spells, doubled, plus the
   augment letters that build the أوزان. Measured over 3000 hands: the first broad pool let
   only 20% of hands cast anything at all — the prototype was dead on arrival. This pool at
   a hand of ten reaches 69%, about one spell available per turn, and a hand that can cast
   nothing can still throw a plain word for base damage. */
const POOL = [...'كسرحرقشفيحميسرقجمعكسرحرقشفيحميسرقجمعاالمتنوي'];
const HAND = 10;

let S: any = null;
const rnd = n => Math.floor(Math.random() * n);
const formsByRoot: Record<string, string[]> = {};

/* which of the six can I actually cast with the letters in my hand right now?
   (the whole lesson of this project: never make the player guess what is possible) */
function canMake(word: string, hand: string[]) {
  const pool: Record<string, number> = {};
  for (const c of hand) pool[c] = (pool[c] || 0) + 1;
  for (const c of word) { if (!pool[c]) return false; pool[c]--; }
  return true;
}
/* The dictionary's roots come from a stemmer where the lexicon is silent, and the stemmer
   is noisy: it files كواشح under كسر. Scoring never noticed — a wrong root was a slightly
   wrong bonus. Casting would: "break" fired by an unrelated word destroys the whole fiction.
   A genuine derived form keeps its radicals in order, so that is the filter. */
const keepsRadicals = (w: string, root: string) => {
  let i = 0;
  for (const c of w) if (c === root[i]) i++;
  return i === root.length;
};
const bestForm = (root: string) =>
  (formsByRoot[root] || []).filter(w => canMake(w, S.hand))
    .sort((a, b) => (shapeOf(b) ? b.length * shapeOf(b)!.x : b.length) - (shapeOf(a) ? a.length * shapeOf(a)!.x : a.length))[0] || null;
const castableRoots = () => SPELL_ROOTS.filter(r => bestForm(r));

function newGame() {
  S = {
    hp: 40, maxHp: 40, shield: 0,
    foe: { n: 'العِفريت', hp: 70, maxHp: 70, burn: 0, intent: 0 },
    hand: Array.from({ length: HAND }, () => POOL[rnd(POOL.length)]),
    word: [] as number[], turn: 1, log: [] as string[], over: null as string | null,
  };
  rollIntent();
}
const rollIntent = () => { S.foe.intent = 6 + rnd(6); };
const wordStr = () => S.word.map(i => S.hand[i]).join('');

/* power comes from the casting itself: its length, shaped by the وزن */
function preview() {
  const s = wordStr();
  if (s.length < 2 || !isWord(s)) return null;
  const root = rootOf(s), shape = shapeOf(s);
  const spell = root && SPELLS[root] ? SPELLS[root] : null;
  const base = s.length * 2;
  const power = Math.round(base * (shape ? shape.x : 1));
  return { s, root, shape, spell, power };
}

function cast() {
  const p = preview();
  if (!p || S.over) return;
  const f = S.foe;
  let line = `<b>${displayOf(p.s)}</b> `;
  if (p.spell) {
    line += `— ${p.spell.n}`;
    if (p.shape) line += ` على وزن ${p.shape.n}`;
    switch (p.spell.kind) {
      case 'dmg': f.hp -= p.power; line += ` · ${p.power} ضررًا`; break;
      case 'burn': f.burn += Math.ceil(p.power / 3); line += ` · لهب ${Math.ceil(p.power / 3)}`; break;
      case 'heal': S.hp = Math.min(S.maxHp, S.hp + p.power); line += ` · ${p.power} عافية`; break;
      case 'shield': S.shield += p.power; line += ` · درع ${p.power}`; break;
      case 'drain': { const d = Math.ceil(p.power / 2); f.hp -= d; S.hp = Math.min(S.maxHp, S.hp + d); line += ` · ${d} سرقة`; break; }
      case 'draw': { const k = Math.ceil(p.power / 4); for (let i = 0; i < k; i++) S.hand.push(POOL[rnd(POOL.length)]); line += ` · ${k} حروف`; break; }
    }
  } else {
    f.hp -= p.power; line += `— ضربة عادية · ${p.power} ضررًا`;
  }
  S.log.unshift(line); S.log = S.log.slice(0, 5);

  // spend the letters, refill the hand
  const used = [...S.word].sort((a, b) => b - a);
  for (const i of used) S.hand.splice(i, 1);
  S.word = [];
  while (S.hand.length < HAND) S.hand.push(POOL[rnd(POOL.length)]);
  endTurn();
}

function endTurn() {
  const f = S.foe;
  if (f.burn > 0) { f.hp -= f.burn; S.log.unshift(`اللهب يأكل <b>${f.burn}</b>`); f.burn--; }
  if (f.hp <= 0) { S.over = 'win'; return render(); }
  const hit = Math.max(0, f.intent - S.shield);
  S.shield = Math.max(0, S.shield - f.intent);
  S.hp -= hit;
  S.log.unshift(`<b>${f.n}</b> يضرب ${hit}${hit < f.intent ? ' (صدّ الدرع الباقي)' : ''}`);
  S.log = S.log.slice(0, 5);
  if (S.hp <= 0) { S.over = 'lose'; return render(); }
  S.turn++; rollIntent(); render();
}

/* ---------- render ---------- */
const app = document.getElementById('app')!;
function render() {
  const p = preview(), s = wordStr(), live = s.length >= 2 && isAlive(s);
  const ready = castableRoots();
  const f = S.foe;
  app.innerHTML = `
  <div class="foe">
    <div class="foename">${f.n}<span>${f.hp} / ${f.maxHp}</span></div>
    <div class="hpbar"><i style="width:${Math.max(0, f.hp / f.maxHp * 100)}%"></i></div>
    <div class="intent">ينوي أن يضربك بـ <b>${f.intent}</b>${f.burn ? ` · محترق ${f.burn}` : ''}</div>
  </div>

  <div class="spells">${SPELL_ROOTS.map(r => {
    const ok = ready.includes(r), w = ok ? bestForm(r) : null;
    return `<button class="spell ${ok ? 'ok' : ''}" data-info="${r}">
      <b>${spaced(r)}</b><span>${SPELLS[r].n}</span>
      <small>${w ? displayOf(w) : SPELLS[r].d}</small></button>`;
  }).join('')}</div>

  <div class="castbox">
    <div class="cast ${p ? 'good' : live ? 'live' : s ? 'dead' : ''}">${s ? (p ? displayOf(s) : s) : '<span class="ph">اختر حروفًا</span>'}</div>
    <div class="readout">${p
      ? `${p.spell ? `<b>${p.spell.n}</b> من جذر ${spaced(p.root)}` : `جذر ${p.root ? spaced(p.root) : '—'} · لا تعويذة فيه`}
         ${p.shape ? `<span class="shape">وزن ${p.shape.n} ×${p.shape.x}</span>` : ''}
         <span class="pw">قوة ${p.power}</span>`
      : live ? 'كلمة لم تكتمل بعد' : s ? 'ليست كلمة' : 'الجذر يقرر الأثر، والوزن يقرر كيف يقع'}</div>
    <div class="acts">
      <button class="btn" data-act="cast" ${p ? '' : 'disabled'}>اقرأ التعويذة</button>
      <button class="btn ghost" data-act="clear" ${s ? '' : 'disabled'}>امسح</button>
    </div>
  </div>

  <div class="hand">${S.hand.map((c, i) =>
    `<button class="tile ${S.word.includes(i) ? 'used' : ''}" data-tile="${i}">${c}</button>`).join('')}</div>

  <div class="me">
    <span>عافيتك <b>${Math.max(0, S.hp)}</b> / ${S.maxHp}</span>
    ${S.shield ? `<span class="sh">درع ${S.shield}</span>` : ''}
    <span class="turn">الدور ${S.turn}</span>
  </div>
  <div class="log">${S.log.map(l => `<div>${l}</div>`).join('')}</div>
  ${S.over ? `<div class="ov"><div class="card">
      <h2>${S.over === 'win' ? 'انكسرت الرقية' : 'سقطت'}</h2>
      <p>${S.over === 'win' ? 'هزمت العفريت بالكلام وحده.' : 'العفريت أقوى هذه المرة.'}</p>
      <button class="btn" data-act="again">من جديد</button></div></div>` : ''}`;
}

document.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('[data-tile],[data-act],[data-info]') as HTMLElement;
  if (!b || !S) return;
  const d = b.dataset;
  if (d.tile != null) {
    const i = +d.tile;
    if (S.word.includes(i)) S.word = S.word.filter(k => k !== i); else S.word.push(i);
    return render();
  }
  if (d.info) {
    const w = bestForm(d.info);
    if (!w) return;
    const pool = [...S.hand], picked: number[] = [];
    for (const ch of w) { const i = pool.findIndex((c, k) => c === ch && !picked.includes(k)); if (i >= 0) picked.push(i); }
    S.word = picked;
    return render();
  }
  if (d.act === 'cast') return cast();
  if (d.act === 'clear') { S.word = []; return render(); }
  if (d.act === 'again') { newGame(); return render(); }
});

loadDict('../dict.bin').then(() => {
  for (let i = 0; i < ROOTS.length; i++) {
    const r = ROOTS[i];
    if (r && SPELLS[r]) {
      const w = norm(DISP[i]);
      if (w.length >= 3 && w.length <= 8 && keepsRadicals(w, r)) (formsByRoot[r] = formsByRoot[r] || []).push(w);
    }
  }
  /* The dictionary files جمع with a null root — the bare trilateral is not recorded as a form
     of itself. It is also the easiest casting there is (three radicals, nothing else), so
     leaving it out was quietly starving every spell of its most reachable word. */
  for (const r of SPELL_ROOTS) if (isWord(r)) (formsByRoot[r] = formsByRoot[r] || []).unshift(r);
  document.getElementById('boot')!.remove();
  newGame(); render();
}).catch(err => {
  document.getElementById('boot')!.textContent = 'تعذّر تحميل القاموس';
  console.error(err);
});
