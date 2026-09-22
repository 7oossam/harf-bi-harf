/* Balance bot for حرف بحرف — plays a full run headlessly and reports how far it gets.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   MINLEN=5 node tools/bot.mjs 6        # 6 runs, seal at 5+ letters
 *
 * MINLEN is the strategy knob: the smallest word the bot settles for when it still has
 * letters and seals to spare. It also seals early when the round is about to run out from
 * under it, since an unspent seal is worth nothing.
 * Needs playwright available to node (npm i -D playwright, or NODE_PATH to a global one).
 */
import { chromium } from 'playwright';

const RUNS = +(process.argv[2] || 5);
const MINLEN = +(process.env.MINLEN || 5);
const STARTER = process.env.STARTER || 'warraq';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const reached = [];

const num = t => +(String(t).match(/\d+/) || [0])[0];

for (let run = 0; run < RUNS; run++) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.click('[data-act="starters"]');
  await page.click(`[data-starter="${STARTER}"]`);

  let round = 1, guard = 0, scores = [], targets = [], affOwned = [], stuck = 0, stalled = '', lastSig = '';
  while (guard++ < 900) {
    // any overlay card takes priority
    if (await page.locator('.card').count()) {
      const h2 = (await page.locator('.card h2').first().innerText().catch(() => '')).trim();
      if (h2.includes('جفّ الحبر')) break;                       // lost
      if (h2.includes('اكتملت الرحلة')) { round = 9; break; }    // cleared all eight
      if (await page.locator('[data-act="go"]').count()) {
        round = num(h2) || round;
        await page.click('[data-act="go"]'); continue;
      }
      if (await page.locator('[data-write]').count()) { await page.locator('[data-write]').first().click(); continue; }
      if (await page.locator('[data-replace]').count()) { await page.locator('[data-replace]').first().click(); continue; }
      if (await page.locator('[data-act="shop"]').count()) { await page.click('[data-act="shop"]'); continue; }
      if (await page.locator('[data-act="cancelpick"]').count()) { await page.click('[data-act="cancelpick"]'); continue; }
      // in the shop: buy the first thing affordable, then move on
      const buy = page.locator('.offer:not([disabled]):not(.sold)');
      if (await buy.count() && Math.random() < 0.7) {
        await buy.first().click({ timeout: 2000 }).catch(() => {});
        if (await page.locator('[data-pick]').count()) await page.locator('[data-pick]').first().click().catch(() => {});
        else if (await page.locator('[data-letter]').count()) await page.locator('[data-letter]').first().click().catch(() => {});
        else if (await page.locator('[data-row]').count()) await page.locator('[data-row]').first().click().catch(() => {});
        continue;
      }
      if (await page.locator('[data-act="next"]').count()) { await page.click('[data-act="next"]'); continue; }
      break;
    }
    if (!(await page.locator('.tally .now').count())) break;

    const seals = num(await page.locator('.purse .seals').innerText().catch(() => '0'));
    const left = num((await page.locator('.purse').innerText()).split('ختم')[1] || '0');
    const score = num(await page.locator('.tally .now').innerText());
    scores[round] = Math.max(scores[round] || 0, score);
    if (!targets[round]) targets[round] = num(await page.locator('.tally .goal').innerText().catch(() => '0'));
    const affTxt = await page.locator('[data-sel="a"] .plabel').innerText().catch(() => '');
    affOwned[round] = Math.max(affOwned[round] || 0, num(affTxt));
    // a round that stops changing is a stall, not progress — say so instead of counting it
    const sig = `${round}/${seals}/${left}/${score}`;
    if (sig === lastSig) { if (++stuck > 40) { stalled = `round ${round} frozen at ${sig}`; break; } }
    else { stuck = 0; lastSig = sig; }
    if (seals <= 0) { await page.waitForTimeout(500); continue; }

    try {
      /* Two piles now, and choosing between them is the turn's first decision: take an أصل
         while the root is unfinished, take a زيادة once it is closed and only زوائد can
         lengthen the word. */
      const caps = await page.locator('.line .cap').evaluateAll(ns => ns.map(n => n.textContent || ''));
      const rootClosed = caps.some(c => { const m = c.match(/(\d+)\s*\/\s*(\d+)/); return m && +m[1] >= +m[2]; });
      const want = rootClosed ? 'a' : 'r';
      const selBtn = page.locator(`[data-sel="${want}"]:not([disabled])`);
      if (await selBtn.count()) { await selBtn.click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(35); }

      const sealBtn = page.locator('[data-seal]').first();
      if (await sealBtn.count()) {
        const row = await sealBtn.getAttribute('data-seal');
        const wlen = (await page.locator(`.line[data-line="${row}"] .word`).innerText()).replace(/\s/g, '').length;
        // the root is closed once it holds its three أصول; only زوائد can lengthen it further
        const capTxt = (await page.locator(`.line[data-line="${row}"] .cap`).innerText()).match(/\d+/g) || ['0','3'];
        const full = +capTxt[0] >= +capTxt[1];
        // an unspent seal is worth nothing, so cash out when the pile is nearly gone
        const desperate = left <= seals * 3;
        if (wlen >= MINLEN || full || desperate) {
          await sealBtn.click({ force: true, timeout: 2500 });
          await page.waitForTimeout(120); continue;
        }
      }
      const cls = await page.locator('.line').evaluateAll(ns => ns.map(n => n.className));
      // Order matters. 'dead' means the drop BREAKS the row — a legal move that clears it and
      // pays scrap, so it is a real fallback. 'full' and 'locked' refuse the drop outright, so
      // clicking one is a no-op: picking it as a last resort spins forever.
      let k = cls.findIndex(c => c.includes('h-word'));
      if (k < 0) k = cls.findIndex(c => c.includes('h-alive'));
      if (k < 0) k = cls.findIndex(c => c.includes('h-dead') || c.includes('h-bounce'));
      // a junk row still takes the drop (and wipes for scrap), so it is a fallback, not a wall
      if (k < 0) k = cls.findIndex(c => c.includes('h-junk') || c.includes('junk'));
      // h-full (root complete) and h-seat (that affix's seat is taken) both REFUSE the card:
      // clicking one is a no-op, so treating them as fallbacks spins forever.
      if (k < 0) k = cls.findIndex(c => !c.includes('h-full') && !c.includes('h-seat') && !c.includes('locked'));
      if (k < 0) {
        // every row refuses the tile — burn it, and if we cannot, the round cannot advance
        const burn = page.locator('[data-act="burn"]:not([disabled])');
        if (await burn.count()) { await burn.click({ force: true, timeout: 2000 }).catch(() => {}); await page.waitForTimeout(80); continue; }
        stuck++; if (stuck > 12) { stalled = `no legal move, rows=${JSON.stringify(cls)}`; break; }
        await page.waitForTimeout(150); continue;
      }
      await page.locator(`.line[data-line="${k}"]`).click({ force: true, timeout: 2500 });
    } catch { /* the board re-rendered mid-click; re-read it next pass */ }
    await page.waitForTimeout(60);
  }
  if (guard >= 900 && !stalled) stalled = 'hit the iteration cap';
  reached.push(stalled ? 0 : round);
  /* score/target, and ×N = how far over the bar. A round read without its target says nothing:
     crushing round 1 is expected, limping over round 6 is the run. */
  const peaks = scores.map((v, i) => {
    if (v == null) return null;
    const t = targets[i] || 0, r = t ? (v / t).toFixed(1) : '?';
    return `r${i}:${v}/${t}(x${r})${affOwned[i] ? '+' + affOwned[i] + 'z' : ''}`;
  }).filter(Boolean).join(' ');
  console.log(`run ${run + 1}: ${stalled ? 'BOT STALLED' : 'reached round ' + round} | peak score per round -> ${peaks}`
    + (stalled ? `\n   stall: ${stalled}` : '') + (errs.length ? `\n   JS error: ${errs[0].slice(0, 120)}` : ''));
  await page.close();
}

const hist = {};
for (const r of reached) hist[r] = (hist[r] || 0) + 1;
console.log('\nMINLEN=' + MINLEN, 'starter=' + STARTER);
console.log('furthest round reached:', JSON.stringify(hist), '(0 = bot stalled, run not counted)');
const valid = reached.filter(r => r > 0);
console.log('reached round 6 or better:', reached.filter(r => r >= 6).length + '/' + valid.length + ' valid runs'
  + (valid.length < RUNS ? ` (${RUNS - valid.length} stalled)` : ''));
await browser.close();
