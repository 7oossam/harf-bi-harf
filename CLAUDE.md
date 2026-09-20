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

Deploy: push to `main`. `.github/workflows/deploy.yml` builds and publishes to GitHub Pages.
An APK can be built without any local Android tooling: run the **Build Android APK** workflow
from the Actions tab and download the artifact.

## Layout

| path | what |
|---|---|
| `src/dict.ts` | dictionary load (fetch + gunzip), normalization, lookups, roots |
| `src/data.ts` | content tables: letter values, patterns, relics, row mods, bosses, starters |
| `src/game.ts` | state, actions, scoring, rendering (one module — split further if it grows) |
| `src/style.css` | all styling, single dark theme (lapis + saffron + turquoise) |
| `public/dict.bin` | gzipped dictionary, ~1.4 MB, fetched at boot and cached by the service worker |
| `tools/` | the pipeline that produces `public/dict.bin` |

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

## Design state (as of the port)

Working: the drop/seal loop, colored row hints, roots × patterns scoring, notebook roots,
row inscriptions, 15 relics, 6 bosses, the shop, and the 10-letter bag.

**Known gaps — the next work:**
- Buying a letter or writing a root gives no visible direction and no felt payoff.
- Synergies are thin; there are no distinct, recognizable builds yet.
- Round targets past round 1 are guesses, never tested.

When changing scoring, re-run a bot simulation before trusting the numbers (an early one lives
in the session history: a greedy bot averaged ~270 per 20-drop round pre-notebook).

## Conventions

- Arabic UI text, RTL, Western digits for scores (tabular-nums).
- Single dark theme on purpose. Tokens live in `:root` in `style.css`.
- Fonts are self-hosted in `src/fonts` (Amiri for words, Reem Kufi for headings, IBM Plex Sans
  Arabic for UI). No Google Fonts requests — the game must work offline and in the app shell.
- Keep the page one screen, no page scrolling during play.
