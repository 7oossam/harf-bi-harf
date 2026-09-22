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

**The bag is four roots you can name.** Twelve radical cards, not an alphabet — you know what
is in there. All four start in your notebook, which is what keeps them yours: twelve radicals
throw up plenty of *accidental* roots (خ+ت+م from three different roots is real), and that is
a good discovery, but without the notebook bonus paying more for your own roots the four
would be decoration.

**Known gaps — the next work:**
- `TARGETS` were measured for the *letter* game and are certainly wrong for the card game.
- Affixes are ~20-25% of the pile at run start; whether that is the right ratio is unmeasured.
- An affix whose seat is taken in every row is unplayable — burn, المِفَكّ, or a seal clears
  it. Whether that friction is interesting or just annoying needs play, not a bot.

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
