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
const STARTER = process.env.STARTER || 'katib';
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

  let round = 1, guard = 0, scores = [];
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
    scores[round] = Math.max(scores[round] || 0, num(await page.locator('.tally .now').innerText()));
    if (seals <= 0) { await page.waitForTimeout(500); continue; }

    try {
      const sealBtn = page.locator('[data-seal]').first();
      if (await sealBtn.count()) {
        const row = await sealBtn.getAttribute('data-seal');
        const wlen = (await page.locator(`.line[data-line="${row}"] .word`).innerText()).replace(/\s/g, '').length;
        const capTxt = (await page.locator(`.line[data-line="${row}"] .cap`).innerText()).split('/');
        const full = +capTxt[0] >= +capTxt[1];
        // an unspent seal is worth nothing, so cash out when the pile is nearly gone
        const desperate = left <= seals * 3;
        if (wlen >= MINLEN || full || desperate) {
          await sealBtn.click({ force: true, timeout: 2500 });
          await page.waitForTimeout(120); continue;
        }
      }
      const cls = await page.locator('.line').evaluateAll(ns => ns.map(n => n.className));
      let k = cls.findIndex(c => c.includes('h-word'));
      if (k < 0) k = cls.findIndex(c => c.includes('h-alive'));
      if (k < 0) k = cls.findIndex(c => !c.includes('h-dead') && !c.includes('h-full'));
      if (k < 0) k = 0;
      await page.locator(`.line[data-line="${k}"]`).click({ force: true, timeout: 2500 });
    } catch { /* the board re-rendered mid-click; re-read it next pass */ }
    await page.waitForTimeout(60);
  }
  reached.push(round);
  const peaks = scores.map((v, i) => v == null ? null : `r${i}:${v}`).filter(Boolean).join(' ');
  console.log(`run ${run + 1}: reached round ${round} | peak score per round -> ${peaks}` + (errs.length ? ` (JS errors: ${errs.length})` : ''));
  await page.close();
}

const hist = {};
for (const r of reached) hist[r] = (hist[r] || 0) + 1;
console.log('\nMINLEN=' + MINLEN, 'starter=' + STARTER);
console.log('furthest round reached:', JSON.stringify(hist));
console.log('reached round 6 or better:', reached.filter(r => r >= 6).length + '/' + RUNS);
await browser.close();
