#!/usr/bin/env python3
"""
Stamp canonical <title>, description and social tags onto every page.

Run this LAST in the build, after any page has been regenerated. It is
idempotent: it strips existing og/twitter tags and rewrites them, so a page
rebuilt from a template can never silently ship stale metadata.

    python3 apply-meta.py [output-dir]
"""
import re, sys, pathlib

BASE = "https://chinesereader.net/"
IMG  = BASE + "og-image-v2.png"
SITE = "一字一世界"

PAGES = {
 "index.html": dict(
   path="",
   title="一字一世界 · Learn the 1,000 Essential Words of Modern Chinese",
   desc="The 1,000 words that carry modern Chinese life — every HSK 1, 2 and 3 word plus the vocabulary the textbooks leave out. Three graded stories, flashcards and a recognition game."),
 "read.html": dict(
   path="read.html",
   title="读书 · The Beginner Reader — 一字一世界",
   desc="Start at zero. A graded story that introduces exactly one new word at a time, with pinyin, meaning and audio on every word."),
 "intermediate.html": dict(
   path="intermediate.html",
   title="北京有雨 · The Early Intermediate Reader — 一字一世界",
   desc="A novel of modern Beijing, written entirely in the 1,000 essential words. Tap any word for pinyin, meaning and audio, or reveal a whole line in English."),
 "awake.html": dict(
   path="awake.html",
   title="醒着的人 · The Early Intermediate Reader — 一字一世界",
   desc="A sequel to 北京有雨, written entirely in the 1,000 essential words. Tap any word for pinyin, meaning and audio, or reveal a whole line in English."),
 "game.html": dict(
   path="game.html",
   title="一字一格 · The Tile Game — 一字一世界",
   desc="A honeycomb of all 1,000 words. Clear a path from the easy centre out to the harder rim — how long a streak can you build?"),
 "cards.html": dict(
   path="cards.html",
   title="生词卡 · Flashcards — 一字一世界",
   desc="Drill any slice of the 1,000 words. Filter by HSK level or your starred words, and choose what goes on the front of the card."),
 "license.html": dict(
   path="license.html",
   title="License · 一字一世界",
   desc="一字一世界 is open source: MIT for the code, CC BY 4.0 for the stories, word list and artwork. Build on it freely, with attribution."),
}

def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;")

def block(title, desc, path):
    t, d = esc(title), esc(desc)
    return (
f'<meta name="description" content="{d}">\n'
f'<meta property="og:type" content="website">\n'
f'<meta property="og:site_name" content="{SITE}">\n'
f'<meta property="og:title" content="{t}">\n'
f'<meta property="og:description" content="{d}">\n'
f'<meta property="og:url" content="{BASE}{path}">\n'
f'<meta property="og:image" content="{IMG}">\n'
f'<meta property="og:image:type" content="image/png">\n'
f'<meta property="og:image:width" content="1200">\n'
f'<meta property="og:image:height" content="630">\n'
f'<meta property="og:image:alt" content="一字一世界 — the 1,000 words that carry modern Chinese life">\n'
f'<meta name="twitter:card" content="summary_large_image">\n'
f'<meta name="twitter:title" content="{t}">\n'
f'<meta name="twitter:description" content="{d}">\n'
f'<meta name="twitter:image" content="{IMG}">\n'
f'<meta name="twitter:image:alt" content="一字一世界 — the 1,000 words that carry modern Chinese life">\n'
f'<meta name="twitter:creator" content="@pourteaux">\n'
f'<link rel="canonical" href="{BASE}{path}">\n')

def main(outdir="."):
    out = pathlib.Path(outdir)
    problems = []
    for fname, meta in PAGES.items():
        f = out / fname
        if not f.exists():
            problems.append(f"missing: {fname}")
            continue
        s = f.read_text(encoding="utf8")

        # strip everything we are about to re-add
        s = re.sub(r'\s*<meta\s+(?:property="og:[^"]*"|name="twitter:[^"]*"|name="description")[^>]*>', "", s)
        s = re.sub(r'\s*<link\s+rel="canonical"[^>]*>', "", s)

        # canonical title
        s = re.sub(r"<title>.*?</title>", "<title>" + meta["title"] + "</title>",
                   s, count=1, flags=re.S)

        # insert fresh block before </head>
        if "</head>" not in s:
            problems.append(f"no </head>: {fname}")
            continue
        s = s.replace("</head>", block(meta["title"], meta["desc"], meta["path"]) + "</head>", 1)
        f.write_text(s, encoding="utf8")
        print(f"  stamped {fname}")

    # verify
    print("\nverifying…")
    for fname, meta in PAGES.items():
        f = out / fname
        if not f.exists():
            continue
        s = f.read_text(encoding="utf8")
        for label, pat, want in (
            ("og:title",       r'<meta property="og:title" content="([^"]*)"',       esc(meta["title"])),
            ("og:description", r'<meta property="og:description" content="([^"]*)"', esc(meta["desc"])),
            ("og:image",       r'<meta property="og:image" content="([^"]*)"',       IMG),
            ("twitter:card",   r'<meta name="twitter:card" content="([^"]*)"',       "summary_large_image"),
        ):
            m = re.search(pat, s)
            if not m:
                problems.append(f"{fname}: {label} MISSING")
            elif m.group(1) != want:
                problems.append(f"{fname}: {label} mismatch")
        if len(re.findall(r'<meta property="og:title"', s)) != 1:
            problems.append(f"{fname}: duplicate og:title")

    if problems:
        print("\n⚠ PROBLEMS:")
        for p in problems:
            print("   " + p)
        sys.exit(1)
    print("✓ all pages carry correct, single-copy social metadata")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
