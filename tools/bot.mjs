/* Balance bot for حرف بحرف — plays round 1 headlessly and reports scores.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   MINLEN=0 node tools/bot.mjs 6     # seal as soon as a word exists
 *   MINLEN=5 node tools/bot.mjs 6     # hold out for 5+ letter words
 *
 * MINLEN is the strategy knob: the smallest word the bot will settle for.
 * Needs playwright available to node (npm i -D playwright, or NODE_PATH to a global one).
 * Measured 2026-09-21 after the seal/push rebalance: MINLEN=0 -> avg 99, 0/6 rounds won;
 * MINLEN=5 -> avg 410, 5/6 won. Pushing should stay clearly ahead of sealing early.
 */
import { chromium } from 'playwright';

const RUNS = +(process.argv[2] || 5);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const results = [];
let continuedPastTarget = 0, sawHint = 0, sawScrap = 0;

for (let run = 0; run < RUNS; run++) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.click('[data-act="starters"]');
  await page.click('[data-starter="katib"]');
  await page.waitForSelector('[data-act="go"]');
  await page.click('[data-act="go"]');
  await page.waitForSelector('.lines');

  let crossed = false, keptPlaying = false, peak = 0;
  for (let i = 0; i < 80; i++) {
    if (await page.locator('.card h2').count()) break;
    if (!(await page.locator('.tally .now').count())) break;
    const score = +(await page.locator('.tally .now').innerText());
    peak = Math.max(peak, score);
    const target = +(await page.locator('.tally .goal').innerText());
    if (score >= target) { crossed = true; }
    else if (crossed) { /* unreachable */ }
    if (crossed && (await page.locator('.line').count())) keptPlaying = true;
    if (await page.locator('.waznhint').count()) sawHint++;

    try {
      const MINLEN = +(process.env.MINLEN || 0);
      const seal = page.locator('[data-seal]').first();
      if (await seal.count()) {
        const row = await seal.getAttribute('data-seal');
        const wlen = (await page.locator(`.line[data-line="${row}"] .word`).innerText()).replace(/\s/g,'').length;
        const atCap = (await page.locator(`.line[data-line="${row}"] .cap`).innerText()).split('/');
        const full = +atCap[0] >= +atCap[1];
        if (wlen >= MINLEN || full) { await seal.click({ force: true, timeout: 2500 }); await page.waitForTimeout(130); continue; }
      }
      // pick a row that survives this letter
      const cls = await page.locator('.line').evaluateAll(ns => ns.map(n => n.className));
      let pickIdx = cls.findIndex(c => c.includes('h-word'));
      if (pickIdx < 0) pickIdx = cls.findIndex(c => c.includes('h-alive'));
      if (pickIdx < 0) pickIdx = cls.findIndex(c => !c.includes('h-dead'));
      if (pickIdx < 0) pickIdx = 0;
      await page.locator(`.line[data-line="${pickIdx}"]`).click({ force: true, timeout: 2500 });
    } catch { /* re-render race */ }
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(900);
  const card = (await page.locator('.card').count()) ? await page.locator('.card').first().innerText() : '';
  const won = card.includes('عبرت');
  if (crossed && keptPlaying) continuedPastTarget++;
  if (card.includes('تجاوز الهدف')) sawScrap++;
  results.push({ peak, won, crossed, errs: errs.length });
  await page.close();
}

console.log('runs:', results);
console.log('avg peak score:', Math.round(results.reduce((a, r) => a + r.peak, 0) / results.length));
console.log('won round 1:', results.filter(r => r.won).length + '/' + RUNS);
console.log('kept playing after crossing target:', continuedPastTarget);
console.log('round-won card showed تجاوز الهدف:', sawScrap);
console.log('one-away hint sightings:', sawHint);
await browser.close();
