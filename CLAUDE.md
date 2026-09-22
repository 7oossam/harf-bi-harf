# حرف بحرف — project notes for Claude

Arabic roguelike word game. Letters fall one at a time; the player drops each into one of
three rows; a row that spells a real word can be sealed for points. Runs are 8 rounds with a
shop between them. Design language: Arabic morphology — **root × pattern** (الجذر × الوزن).

Owner: Hussam. All player-facing text is Arabic (RTL). Keep it that way.

## Commands

```bash
npm install      # once
npm run dev      # local dev server
npm run build    # production build into dist/
npm run preview  # serve dist/ (use this for Playwright smoke tests)
npm run typecheck# tsc --noEmit (not part of the build; build uses esbuild and ignores types)
npx cap sync     # copy the web build into android/ and ios/
```

Deploy: push to `main`. `.github/workflows/deploy.yml` builds and commits `dist/` onto the
`gh-pages` branch, which GitHub Pages serves at https://7oossam.github.io/harf-bi-harf/.
It deliberately does **not** use `actions/configure-pages`: the default `GITHUB_TOKEN` cannot
create a Pages site (`Resource not accessible by integration`), so that route needs a repo
admin to enable Pages in Settings first. Pushing a `gh-pages` branch enables Pages by itself.
`gh-pages` is generated output — never commit to it by hand.
An APK can be built without any local Android tooling: run the **Build Android APK** workflow
from the Actions tab and download the artifact.

## Layout

| path | what |
|---|---|
| `src/dict.ts` | dictionary load (fetch + gunzip), normalization, lookups, roots |
| `src/data.ts` | content tables: letter values, patterns, relics, row mods, bosses, starters |
| `src/game.ts` | state, actions, scoring, rendering (one module — split further if it grows) |
| `src/style.css` | all styling, single light theme (the manuscript page — see Conventions) |
| `public/dict.bin` | gzipped dictionary, ~1.4 MB, fetched at boot and cached by the service worker |
| `tools/` | the pipeline that produces `public/dict.bin`, plus `bot.mjs` (balance sim) |

`game.ts` renders by rebuilding `#app` innerHTML on every change, with delegated click
handling on `document`. This is fast enough (the board is small) and keeps the state model
simple. Do not introduce a framework without a reason.

## Dictionary

~432k word forms. Built from:

1. **OpenSubtitles Arabic frequency list** (hermitdave/FrequencyWords), filtered through
   **Hunspell ar** (LibreOffice ayaspell) — `tools/filter_hunspell.py`.
2. **Arramooz** lexicon (`arramooz-pysqlite`): 30k noun lemmas + 14k verb lemmas, each with a root.
3. **Qutrub** (`libqutrub`) conjugations of every verb — `tools/build_verbforms.py`.
4. `tools/build_dict.py` merges them. **Key rule:** any word of ≤4 letters must derive from a
   real lemma, conjugation, or clitic form of one. Longer words may come from the frequency
   list alone. This is what keeps out names (جاك، توم) and subtitle junk (ترا، كلن) while
   still accepting real short words. `tools/rescue.txt` is a hand-reviewed allow-list of real
   short words the lexicon misses (ربما، جدار، عاش…).

Roots come from Arramooz where known, ISRI stemmer as fallback. Normalization: أإآ→ا, ى→ي,
ؤئ→ء, diacritics stripped. **One ء tile covers all hamza seats.** Display keeps the original
spelling; matching uses the normalized form.

Rebuilding needs Python deps (`spylls`, `nltk`, `arramooz-pysqlite`, `libqutrub`) and the raw
source files, which are not committed. See the header of each tool.

## Design state

**The game is a card game about trilateral roots.** A row holds at most three **أصول**
(radical cards) — that is the root — and up to one **زيادة** (affix card) in each of four
seats hung around them. This is not a scoring bonus laid over a word game; it is الجذر × الوزن
as the literal rule, and it is the one design here that only Arabic can support.

An affix card knows its seat, because in Arabic position IS meaning: the same ا makes كاتب in
seat 1 and كتاب in seat 2. The word assembles seat by seat, `A0 + R0 + A1 + R1 + A2 + R2 + A3`
(`asmLine` in `game.ts`):

| cards | word |
|---|---|
| ك ت ب | كَتَب |
| + ا@1 | كاتب |
| + ال@0 + ون@3 | الكاتبون |
| ك ت ب + م@0 + و@2 | مكتوب |

Measured against the real lexicon before any of it was built: **74%** of single-affix
attachments land on a real word, **29%** of two-affix stacks do. So one زيادة is nearly safe
and stacking is a genuine gamble — which is where the push-your-luck lives. 4,108 roots are
fertile enough to build a run on (`fertileRoots` in `dict.ts`, ≥25 forms, no ء/ة, three
distinct letters).

**Why one affix per seat, when the brief said "any number".** Truly unlimited was built first
and it produced rows like `ومراوااوالالاال` that still read as *alive*, because the liveness
test only ever looks at the radicals. Arabic hangs one زيادة per seat anyway — كاتب has one
ألف after the فاء, not three. One-per-seat makes the row a template you watch filling
(`seatsUsed`/`seatFree`), and turns every affix into a real choice of *where*, not just
whether. A row therefore tops out at three radicals + four affixes.

**Two piles, and the player chooses which to draw from.** أصول and زوائد are drawn from
separate piles (`freshPiles`, `S.radDraw`/`S.affDraw`), both face up, one selected
(`S.sel`, `syncHand`). This fixed a real flaw and replaced it with a decision. The flaw: with
one shuffled pile, every زيادة bought thinned the أصول needed to close a root, so buying cards
past four seats made you *weaker* — measured, التاجر and الشاعر both died before the first shop.
What replaces it is better than neutral: every turn you choose between advancing the root and
lengthening the word, with the randomness living inside each pile. `S.cur` stays synced to the
selected card so drop/stateOf/scoring never need to know about piles.

**A relic must rewrite a rule, not add a number.** Hussam, after playing: "I don't mean the
shop's shape, I mean its CONTENT — the relics, marks, rows and tools are mostly boring and
don't excite or change the game at all." He was right, and the failure was mine: the research
at the top of this project found that a good relic *pushes you somewhere* (Dead Branch does
not add damage, it makes exhausting cards a strategy), and then I wrote 29 relics of which
half were `+2 burns`, `see 2 cards ahead`, `+0.5 mult` — the exact modifiers I had diagnosed.

So the pool is now built around eight **كاسرات** (`rare: 1` in `RELICS`), each of which
rewrites a rule of the loop. The bar is that owning one should make a player say *"wait, now
I can…"*:

| relic | the rule it rewrites |
|---|---|
| **التَّصريف** | the seal spends the زوائد and LEAVES the root standing — conjugate one جذر over and over |
| **الارتجال** | the dictionary stops being the wall: any assembly on a real root counts, at half score |
| **القالَب** | you may only seal the round's وزن — and it pays ×5 |
| **المِعراج** | consecutive seals on the same root compound: ×2, ×4, ×8… |
| **الكَشْف** | the زوائد stop being a queue and become a hand you pick from |
| **الصَّمت** | no زوائد fall at all, and the bare root pays ×6 |
| **النَّحت** | زوائد are never consumed, but every seal costs 2 gold |
| **الشَّجرة** | every new root you seal joins your bag with its three أصول |

Verified with the `?dev=1` hook: التَّصريف scored **4718** and الصَّمت **2147** against a ~400
baseline, and the row log shows `"سخر" 3/3→3/3` — the root staying put, which is the whole
point. The rare tier in `genOffers` is bound to these, so a "rare" offer is a rule-changer and
not a price bump.

**`?dev=1` exposes `window.__dev`** (`grant`, `give`, `state`). Granting a relic is otherwise a
whole run of shopping, and the first attempt to verify these eight "passed" all of them without
granting a single one — the rows behaved identically and I nearly believed it.

**زوائد are ammunition, not upgrades.** Hussam, after playing: "affix cards, once bought, are
unlimited — I expect that is wrong." So أصول and زوائد are now economically different things,
which is also what they are linguistically:

- **أصول are a rack.** Every radical card falls `COPIES` times and the pile refills each round.
  A root is a permanent part of who you are.
- **زوائد are a magazine.** The affix pile is literally the cards you own, one entry each, and
  sealing a word SPENDS its زوائد out of the bag for good (`consumeAffixes`). A purchase is
  three cards, not one, because it has to be worth several words.

A permanent affix is an upgrade you buy once and forget. A spent one asks the seal-budget
question every single time: *is THIS word worth my «ال»?* Gold had to become a supply line to
match (base 6, over-target up to 12) — you re-stock every round or the engine stalls.
التَّضعيف (first زيادة per word returns) and طَليق (that card never spends) are what they are
worth owning for now.

**The commission is only ever something you can build** (`reachableWazns`). Hussam again:
"whether I can hit the wazn depends on which زوائد I happen to own — so am I buying an affix
for the score, or on the CHANCE it fits a required وزن?" A commission you cannot build is not
a goal, it is a lottery ticket. The round now draws its wazn from the patterns your cards can
actually assemble: round one, with no زوائد, commissions ثلاثي — the bare root, exactly what
you can do — and every زيادة you buy widens that pool. That is the answer to his question:
**you buy the affix to open the أوزان.**

**A root in the notebook brings its cards.** `adoptRoot` — writing, replacing or buying a root
puts its three أصول in the bag, and a replaced root takes its cards out again. A notebook root
whose cards you cannot draw is a bonus on a word you will never spell again.

**A run opens with NO زوائد, and "beat the target" is not the measure.** Hussam's correction,
and it invalidated part of the measurement below: beating round one with a two-affix word is
not evidence of anything, because in round one the player is not supposed to own زوائد at all.
An earlier draft handed out three affix cards at start — a band-aid for the single mixed pile
thinning the أصول — and splitting the piles removed the reason for it, so it is gone. Round one
is bare roots: three cards, a real word, a small sure score. Every زيادة after that is bought,
and that IS the progression — the word gets longer because you made it longer.

So `tools/bot.mjs` no longer reports whether a round was beaten. It reports
`r3:378/175(x2.2)+6z` — the score, that round's target, the ratio, and how many affix cards
the run owned at the time. A round read without its target says nothing: crushing round one is
expected, limping over round six is the run. The question the ratio answers is the one that
matters — **does the player's power grow in step with the ladder, or fall behind it?**

**The engine works; acquisition is what fails.** First clean sample (2026-09-22, no stalls,
`MINLEN=3`, وَرّاق, 6 runs) settled the open question, and it retired two of my own wrong
diagnoses — "it became a lottery" and "player power does not grow":

| run | زوائد owned | score path | reached |
|---|---|---|---|
| 1 | **0z** | 226 · 238 · 252 · 196 | round 4 |
| 2 | **0z** | 168 · 213 · 292 · 249 | round 4 |
| 3 | **10z** | 247 · 228 · **714** · **971** · **1218** · 742 · 864 · 952 | **cleared all 8** |
| 5 | **10z** | 234 · 226 · 196 · **830** · 467 | round 6 |
| 6 | **10z** | 163 · 226 · 195 · **5127** · 1860 · **5088** | round 8 |

Every run that reached ten affix cards survived. Every run that did not died at round 4. Power
does not fail to grow — it grows *explosively*, 3-20×, the moment زوائد arrive. So the design
is sound and the failure mode is upstream of it: **a run that does not acquire زوائد early is
dead, and there is no catch-up.** Both dead runs reached round 4 holding ZERO affix cards
despite them costing 2 gold.

**Round 4 is therefore a sorting wall, not a difficulty step.** The target jumps 175 → 300
exactly when the engine has either caught or not: caught runs score ×2.8 to ×17, uncaught ones
×0.7 and die. Nothing in between, and nothing gradual about it.

The good news inside that: run 3's late rounds read ×1.6, ×1.2, ×1.3 — a *well-tuned* curve.
The late `TARGETS` are right for an equipped run. So do not retune the ladder to rescue
unequipped runs; that would flatten a curve that already works. The work is making acquisition
certain enough that round 4 stops sorting runs into "has an engine" and "has none" —
guaranteeing زوائد reach the player in the first two shops, not repricing round 4.

**The bag is four roots you can name.** Twelve radical cards, not an alphabet — you know what
is in there. All four start in your notebook, which is what keeps them yours: twelve radicals
throw up plenty of *accidental* roots (خ+ت+م from three different roots is real), and that is
a good discovery, but without the notebook bonus paying more for your own roots the four
would be decoration.

**Measure with suspicion: every "balance problem" here has been a bug in disguise.**
Re-run `tools/bot.mjs` before trusting any number, and read the stall line and the zero-score
rounds FIRST. The first question is never "are the targets wrong", it is "is the thing I am
measuring even working". Five times now, and not once was it the curve:

- the bot deadlocked on full rows (`h-dead` is a legal move, `h-full` is not) and reported
  frozen runs as "reached round 3" — three of six runs, every number polluted;
- the round could freeze forever when every row refused the tile and burns were spent;
- `floatAt` threw inside `seal()`, aborting it before `S.lines[i]=[]`, so the same row could
  be sealed again and again for score — which read as "the new content is far too strong"
  (6/6 clears, round-8 scores of 7395) and was a scoring exploit;
- `drop()` did not bail on an empty hand, and `render`'s end-of-round guard was
  `S.cur && !canAct()`, so a dry pile *skipped* the check instead of triggering it;
- `canAct()` looked only at the SELECTED card after the two-pile split, so an affix whose seat
  was taken everywhere ended the round although switching piles was free and legal — whole
  rounds scored 0 while the run held 22 affix cards.

The last two share a moral: **a guard written for one card in hand does not survive a second
card appearing.** When the core model changes, re-read every guard, not just the code you
edited. `bot.mjs` reports `BOT STALLED` and drops that run from the denominator; a run that
hits the iteration cap is not a result.

**Known gaps — the next work:**
- `TARGETS` are still the letter game's numbers, and they are the LAST thing to tune. Measured
  with the fixed build: raw scores are nearly flat across rounds (~250, 210, 230, 280) while
  the ladder triples, so the score/target ratio decays 2.5 → 1.4 → 1.3 → 0.9 → 0.6 in every
  run. Fitting a curve to that just picks which rounds you lose in.
- The open question is therefore **why player power does not grow.** Affix cost went 4 → 2 with
  two offers per shop and two cards per purchase, and it barely moved. Next suspects, in order:
  one زيادة may not change a word enough to matter; four seats may cap growth too early; or the
  bot never plans toward a root and the floor is a bot artifact — which only play can settle.
- `STACK` (1/1/2/3.5/6) is a first pass. The MINLEN=3 vs MINLEN=5 gap is how to check it, and
  it is the single most important number in the game. Fix the floor before touching the spike.
- An affix whose seat is taken in every row is still unplayable — but it now costs nothing to
  leave it on its pile and draw أصول instead, which is most of why the split works.

## Conventions

- Arabic UI text, RTL, Western digits for scores (tabular-nums).
- Single light theme on purpose — "the manuscript page": ink on laid paper, the board is a ruled
  text block, everything else is marginalia. Tokens live in `:root` in `style.css` and are named
  after pigments, and colour is semantic, never decorative: verdigris = the row stays alive,
  ochre = a word completes (and the seal), madder = it breaks. Adding a colour means adding a
  meaning. (Superseded the original dark lapis/saffron theme.)
- Fonts are self-hosted in `src/fonts` (Amiri for words, Reem Kufi for headings, IBM Plex Sans
  Arabic for UI). No Google Fonts requests — the game must work offline and in the app shell.
- Keep the page one screen, no page scrolling during play.
