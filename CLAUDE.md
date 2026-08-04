# 一字一世界 · chinesereader.net

A static site teaching the 1,000 most essential words for modern Chinese life.
Hosted on GitHub Pages. No framework, no bundler, no runtime dependencies —
every page is self-contained HTML with its data inlined at build time.

## Pages

| File | What it is |
|---|---|
| `index.html` | Landing page — four choices |
| `read.html` | 读书 · beginner reader (508 words, one new word at a time) |
| `intermediate.html` | 北京有雨 · early intermediate reader (a novel, 10 chapters) |
| `game.html` | 一字一格 · hex-tile recognition game (all 1,000 words) |
| `cards.html` | 生词卡 · flashcards |
| `license.html` | MIT (code) + CC BY 4.0 (content) |

Templates: `int-template.html` -> `intermediate.html`,
`cards-template.html` -> `cards.html`. `index.html`, `game.html` and
`read.html` are edited directly.

## Build

Everything lives flat at the repo root — sources, build scripts and built pages
together. Always run the full sequence; later steps depend on earlier ones.

```bash
node build-vocab.js              # merges vocab fragments -> vocab-1000.json
node tokenize.js story-int.txt   # tokenizes the novel + merges translations
# then inline VOCAB/STORY into the templates to produce the built pages
python3 apply-meta.py .          # MUST BE LAST — stamps social metadata
```

### Invariants — these must hold, and the scripts enforce them

1. **`build-vocab.js` must report exactly 1,000 teachable words** (names excluded).
   If it says "NOT 1000 — off by N", fix the vocabulary before continuing.
2. **`tokenize.js` must report "every character covered by the vocabulary."**
   Any uncovered character means a word in the story has no definition and will
   render unclickable. Add it to `vocab-reader.js` or rephrase the prose.
3. **`tokenize.js` must report "N translations aligned."** The English file
   `story-int-en.txt` is line-for-line with the Chinese paragraphs in
   `story-int.txt`. A mismatch shifts every subsequent translation.
4. **`apply-meta.py` must exit 0.** It verifies every page has exactly one
   correct copy of each social tag.

## The bug that keeps recurring — read this

Some pages exist twice: a template (`int-template.html`, `cards-template.html`)
and the built file (`intermediate.html`, `cards.html`). **Editing one and
copying it over the other silently reverts whatever was patched into the
destination.** This has already shipped bad metadata twice: once reverting
`index.html` to a stale description, once wiping `game.html`'s social tags.

Rules:
- Where a template exists, edit the **template** and rebuild — never hand-patch
  the built file.
- Run `apply-meta.py` last, every time, so metadata cannot drift.
- After any change, verify all six pages load with no console errors.

## Known gap: the beginner reader has no template

`read.html` is a built artifact whose original template and per-chapter source
files (`template.html`, `vocab1-5.js`, `story1-5.js`) were lost. It can only be
edited directly as built HTML. Its 508 words were recovered into
`vocab-508.json`, which is why that file exists. If `read.html` ever needs
substantial work, the first task is reconstructing a template from it.

## Vocabulary

`src/vocab-1000.json` is canonical. It is *generated* — do not edit it directly.
Edit the fragments and rebuild:

- `vocab-508.json` — the original beginner-reader words
- `vocab-hsk3.js` — official HSK 3 additions
- `vocab-story.js` — adult-drama vocabulary the HSK lists lack
- `vocab-reader.js` — words the novel needed that nothing else covered
- `vocab-final.js` — the last 23, chosen to land exactly on 1,000
- `vocab-names.js` — proper names (excluded from the 1,000 count and the game board)

Entry shape: `"房租":{p:"fángzū",d:"rent",l:"essential"}` — hanzi key, `p` pinyin
with tone marks, `d` English, `l` one of `HSK 1` / `HSK 2` / `HSK 3` /
`essential` / `bonus` / `name`.

Merging is **non-destructive**: existing entries always win. This is deliberate —
a careless merge once silently overwrote HSK 1 words and dropped the count to 147.

## Shared progress store

`src/store.js` (inlined into every page) is the single source of truth for
starred words, known words, and words seen while reading. It migrates the old
per-page keys automatically and offers JSON export plus a base64 transfer code.
Do not add new per-page localStorage keys for progress — extend `YZYG` instead.

## Testing

Playwright, run against the built files over `file://`. Two recurring gotchas:

- Synthetic pointer events flood the log with harmless
  `setPointerCapture` errors. Filter them out; they don't occur with real input.
- The pages use `scroll-behavior: smooth`, so a click issued immediately after
  a scroll can land on the wrong element. Wait for the scroll to settle.

Always check for real JS errors on all six pages after any change.

## Style

Paper-and-seal aesthetic: `--paper #f7f3ea`, `--seal #b02e20`, `--jade #3e6b5a`,
Kaiti for hanzi, Georgia for Latin. Forced light mode (`color-scheme: only light`)
so iOS dark mode can't invert it. Chinese in the UI is paired with pinyin.

## Direction

Stories are meant to become the focus, with more of them over time. The game and
flashcards are supporting tools. When a third story lands, replace the four-card
landing grid with a stories index.
