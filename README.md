# حرف بحرف

An Arabic roguelike word game for phones. Letters fall one at a time, you choose which of three
rows each one joins, and a row that spells a real word can be sealed for points. Between rounds
you reshape a ten-letter bag, write roots into a notebook, level up word patterns, and buy relics
that break the rules.

- **Play:** https://USERNAME.github.io/harf-bi-harf/ (set after the first deploy)
- **Stack:** Vite + TypeScript, no game engine — the DOM handles Arabic shaping and RTL best.
- **Dictionary:** ~432,000 real Arabic word forms with roots, built from OpenSubtitles frequency
  data, Hunspell, the Arramooz lexicon and Qutrub verb conjugations. See `CLAUDE.md`.
- **Mobile:** installable as a PWA; Android and iOS wrappers via Capacitor.

## Development

```bash
npm install
npm run dev
```

## Deploy

Push to `main`; GitHub Actions builds and publishes to GitHub Pages.
For an Android APK, run the "Build Android APK" workflow from the Actions tab and download the
artifact — no local Android tooling needed.
