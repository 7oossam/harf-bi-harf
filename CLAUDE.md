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

Working: the drop/seal loop, colored row hints, roots × patterns scoring, notebook roots,
row inscriptions, 25 relics, 8 tools, 5 characters, 6 bosses, the shop, the bag, and four named **Paths**
(`PATHS` in `data.ts`) — الجذر (notebook/resonance), الوزن (patterns), السلسلة (chain), الكيس
(bag/enchants). A path's level is computed live from what you already own (notebook levels,
pattern levels, max chain reached, enchanted letters/small bag), not chosen from a menu. Words
matching a path's condition get an extra multiplier (`x *= 1 + .15*level`) that stacks with
resonance/chain/row-mods in the same multiplicative tier — this is the "synergies multiply"
fix. The leading path is shown as a badge strip under the notebook, on the round-intro card,
and at run end; the shop (`genOffers`) biases its relic pool and tags offers ("✓ يخدم مسارك")
toward the leading path, and `pathFeedback()` toasts the path + level after a purchase feeds
it — that's the "direction/payoff" fix. Two new relics (`collector`, `ember`) exist purely to
give the pattern and chain paths a build-defining hook, mirroring the bag path's `orphan` and
the root path's `inkwell`.

**The seal-or-push rebalance.** The round used to end the instant you crossed the target, and
unused drops paid gold — so the game paid you to stop playing, and sealing 3-letter words fast
was optimal. Now the round always runs its 20 drops, and beating the target buys gold instead
(`winRound`, capped at +8). A broken row pays scrap equal to its letter values, so pushing is a
gradient rather than a cliff. Rows have their own ceilings (`LINE_CAPS` = 4/6/8) so "which row?"
is a real choice; a full row refuses the drop rather than breaking.

**The letter economy — what makes a decision cost something.** Sid Meier's test for an
interesting decision is that no option is clearly best and the player *gives something up*.
The old round failed that: sealing was free, letters always came back, and you could seal as
often as you liked. Two scarcities fix it, taken from the two games that solve this best:

- **Spent letters (Scrabble's "leave").** The round's pile is every bag letter `COPIES` (3)
  times, shuffled, and it *never refills*. Sealing strikes the word's letters out of what is
  still to fall (`spendLetters`). A long word scores more and shortens your own round — that
  is the trade.
- **Five seals (Balatro's hand budget).** `SEALS` per round. "Can I make a word" stops being
  the question; "is this word worth one of my five" starts being it. The round ends when the
  pile runs dry or the seals run out.

الرسوخ was removed to make room: it weighted the draw pile, which must now deplete strictly,
and it drifted the bag automatically, which fought the bag-building it was meant to serve.

**The content categories, and why there are five.** The old set was seventeen relics that
were almost all scoring modifiers, so no two runs felt different: a multiplier changes what
the number says afterwards, not what you *do*. The rewrite separates content by **who decides
and when**, which is the only axis that makes five categories five things instead of one:

| table | Arabic | acts | decided by |
|---|---|---|---|
| `CHARS` | الكُتّاب | the whole run | you, before you know anything |
| `RELICS` | الحُروز | on its own trigger | the game, via the shop |
| `TOOLS` | الأدوات | when you spend a charge | **you, mid-round** |
| `ROWMODS` | السطور | all round, one row | you, by inscribing |
| `ENCH` | الوسوم | one letter, forever | you, by choosing the letter |

**Combos are a table, not a hope** (`COMBOS` in `data.ts`). Hades names its duo boons, and
that is most of why its builds read as builds: a synergy the player cannot see is a
coincidence. Each entry is a named pair (or trio) worth more than its parts, with parts
namespaced across categories — `char:` `relic:` `tool:` `row:` `mark:` — because the crossing
is the point. Three things read this table:

- `comboState()` splits them into **live** (all parts owned, shown in the margin) and **near**
  (exactly one part missing).
- `genOffers()` pulls anything that completes a *near* combo to the front of its pool, so a
  build you start is a build you can finish rather than one the shuffle has to hand you. The
  leading path is now the weaker tiebreak behind that.
- The shop card names the combo an offer would complete ("يُكمل: الطاحونة"), and `comboCheck()`
  toasts one the moment it closes.

Adding content means adding to `COMBOS` too, or the new thing is an island. Two relics exist
purely as bridges to categories that had none: المِسَنّ recharges tools on every seal (tools
had zero relic support), and الرَّماد banks burned letters into the next seal (burning was
pure loss, so الغِربال's +2 burns bought nothing).

**Watch for anti-synergies** — two of the first draft's were real traps, both found by audit
rather than play: القلم stops rows breaking so حجر الرحى never fired, though the chain path
recommended both (fixed by paying الرحى for *any* row lost, via `rowLost()`); and القَلْب
accepted a mirrored row but scored the unmirrored string, so `rootOf`/`patOf` ran on the
meaningless direction and the relic paid nothing.

`TOOLS` is the new one and the point of the exercise: before it, the only answer to a bad
letter was "which row hurts least" plus the burn button. Charges reset each round, so a tool
is a budget inside the round rather than a permanent edge. Tools that target a row (`ROW_TOOLS`)
arm `S.aim` and resolve on the next row click; the rest act on the tile in hand.

Relics carry a `hook` field naming where in the loop they fire — `pile` / `hand` / `row` /
`word` / `seal` / `score` — so the wiring stays findable as the pool grows. The `word` hook is
the interesting one and the one a word game uniquely has: القَلْب accepts a row whose mirror is
a word, الشّاذّ accepts two letters, الجَذْر الأعمى treats every root as if it were in your
notebook. `wordOK()` is the single acceptance test all of them flow through — `stateOf`,
the seal button, auto-seal and `canAct` must never call `isWord` directly or the relics
silently stop applying to one of them.

Two old relics were **promoted out of the pool** rather than rewritten. المُعَرِّب (build toward
the start of the word) is base Arabic — words build right-to-left, and only ever appending was
an arbitrary restriction — so it is always on. النقطة became a tool, because cycling a letter
through its dot-family (ب ت ث ن ي) is too good a verb to be a passive you might never be offered.

**Letters are not given invented properties.** Arabic already assigned the one that matters:
`ZAWAID` (سألتمونيها) marks the ten augment letters that build a وزن onto a root; everything
else is a radical that carries meaning. `letterTag()` states which, so the shop's "why this
letter?" has an answer — a زائدة widens the أوزان you can reach, a radical deepens the roots
you keep spelling. Do not bolt game-stats onto letters; surface what the language already says.

**الأوزان: one per round, not eleven.** `S.wazn` commissions a single pattern each round, shown
in the head margin and on the round-intro card, and it pays double. `waznHint(i)` scans the
letters still undrawn and tells a row which one would finish it on that wazn — recall becomes
perception, so the player never has to memorise the eleven templates.

**Known gaps — the next work:**
- Round targets past round 1 are still guesses.
- Path level thresholds (`pathLvl`: level = floor(progress/3), cap 5) and the +15%/level bonus
  are first-pass numbers.

When changing scoring, re-run `tools/bot.mjs` before trusting the numbers. Measured 2026-09-21
after the rebalance: sealing as soon as a word exists (`MINLEN=0`) averages 99 and wins 0/6
round ones; holding out for 5+ letters (`MINLEN=5`) averages 410 and wins 5/6. Pushing should
stay clearly ahead — if that gap closes, the gamble is broken again.

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
