#!/usr/bin/env python3
"""Build WordRain into one self-contained HTML file.

Reads the vocabulary extracted from the two source PDFs (data/*.md),
checks that every entry is present, and inlines the word lists, styles,
themes and game code into index.html.

Usage: python3 tools/build.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SRC = ROOT / "src"
OUT = ROOT / "index.html"

EXPECTED_ES = 5511
EXPECTED_ZH = 3549

SECTION_RE = re.compile(r"^(#{2,3}) (.+?)(?: \((\d+)\))?\s*$")


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def is_header(row):
    return row[0] in ("Spanish", "ID") or set("".join(row)) <= set("- ")


def parse_spanish(path):
    levels, topics, entries, problems = [], [], [], []
    level = None
    declared = {}
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        m = SECTION_RE.match(line)
        if m:
            depth, title, count = m.groups()
            if depth == "##":
                levels.append(title)
                level = len(levels) - 1
            else:
                topics.append({"name": title, "level": level})
                declared[len(topics) - 1] = int(count) if count else None
            continue
        if not line.startswith("| "):
            continue
        row = cells(line)
        if is_header(row):
            continue
        if len(row) != 2 or not all(row):
            problems.append(f"line {n}: malformed row {row!r}")
            continue
        entries.append([row[0], row[1], len(topics) - 1])

    for t, want in declared.items():
        got = sum(1 for e in entries if e[2] == t)
        if want is not None and got != want:
            problems.append(f"topic '{topics[t]['name']}': expected {want}, found {got}")
    return levels, topics, entries, problems


def parse_chinese(path):
    themes, entries, problems = [], [], []
    declared = {}
    seen_ids = set()
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        m = SECTION_RE.match(line)
        if m and m.group(1) == "##":
            title = re.sub(r"^\d+\s+", "", m.group(2))
            themes.append(title)
            declared[len(themes) - 1] = int(m.group(3)) if m.group(3) else None
            continue
        if not line.startswith("| "):
            continue
        row = cells(line)
        if is_header(row):
            continue
        if len(row) != 4 or not all(row):
            problems.append(f"line {n}: malformed row {row!r}")
            continue
        seen_ids.add(int(row[0]))
        entries.append([row[1], row[2], row[3], len(themes) - 1])

    missing = sorted(set(range(1, EXPECTED_ZH + 1)) - seen_ids)
    if missing:
        problems.append("missing Chinese IDs: " + ", ".join(f"{i:04d}" for i in missing))
    for t, want in declared.items():
        got = sum(1 for e in entries if e[3] == t)
        if want is not None and got != want:
            problems.append(f"theme '{themes[t]}': expected {want}, found {got}")
    return themes, entries, problems


def main():
    levels, es_topics, es, es_problems = parse_spanish(DATA / "spanish_vocabulary.md")
    zh_themes, zh, zh_problems = parse_chinese(DATA / "chinese_vocabulary.md")

    ok = True
    for label, items, want, problems in (
        ("Spanish", es, EXPECTED_ES, es_problems),
        ("Chinese", zh, EXPECTED_ZH, zh_problems),
    ):
        status = "OK" if len(items) == want and not problems else "FAIL"
        print(f"{label}: {len(items)} / {want} entries  [{status}]")
        for p in problems:
            print("   ", p)
        if status != "OK":
            ok = False
    if not ok:
        print("Build stopped: vocabulary check failed.", file=sys.stderr)
        sys.exit(1)

    vocab = {
        "es": {"levels": levels, "topics": es_topics, "entries": es},
        "zh": {"topics": [{"name": t} for t in zh_themes], "entries": zh},
    }
    vocab_js = "const VOCAB = " + json.dumps(vocab, ensure_ascii=False, separators=(",", ":")) + ";"
    # Never let word data close the inline <script> early.
    vocab_js = vocab_js.replace("</", "<\\/")

    html = (SRC / "index.html").read_text(encoding="utf-8")
    parts = {
        "/*__STYLE__*/": (SRC / "style.css").read_text(encoding="utf-8"),
        "/*__VOCAB__*/": vocab_js,
        "/*__THEMES__*/": (SRC / "themes.js").read_text(encoding="utf-8"),
        "/*__GAME__*/": (SRC / "game.js").read_text(encoding="utf-8"),
    }
    for marker, content in parts.items():
        if marker not in html:
            sys.exit(f"template marker {marker} missing")
        html = html.replace(marker, content)
    OUT.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
