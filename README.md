# WordRain

A browser game for practising Spanish and Simplified Chinese vocabulary. A word falls from the top of the screen; pick its match from three options before it lands.

**Play:** open `index.html` in any modern browser, or host it on any static site (GitHub Pages works as-is). No server, account or install. Nothing is sent anywhere.

## What's in it

- 9,060 words from the two source PDFs: 5,511 Spanish (A1 to B2, 50 topics) and 3,549 Chinese (HSK 4+, 13 themes).
- Spanish mixes Spanish → English and English → Spanish at random. Chinese offers Character → Meaning, Character → Pinyin, Meaning → Character, or Mix.
- +5 per correct answer, 7 lives, a new level every 250 points. Words fall in 8 s at level 1, 0.5 s faster per level, down to 3.5 s from level 10.
- Share image (1080 × 1920 PNG) at each level-up and at game over, with a Download button that opens the share sheet on phones.
- Keyboard: `1`/`A`, `2`/`S`, `3`/`D` to answer, `P` to pause, `Enter`/`Space` to continue. Tap on mobile.

Full rules: [docs/specification.md](docs/specification.md).

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html` | The built game. One self-contained file. |
| `src/index.html` | Page template |
| `src/style.css` | Layout and styles (colours come from the theme) |
| `src/themes.js` | Background themes. Add a theme by adding one block to `THEMES`. |
| `src/game.js` | Game logic, question builder, share image |
| `data/*.md` | Vocabulary extracted from the two PDFs |
| `tools/build.py` | Checks the word counts and builds `index.html` |
| `.github/workflows/pages.yml` | Builds and deploys to GitHub Pages |

## Building

```bash
python3 tools/build.py
```

The build stops and lists what's missing if it doesn't find exactly 5,511 Spanish and 3,549 Chinese entries.

## Publishing on GitHub Pages

`.github/workflows/pages.yml` runs the build on every push and pull request. A run fails if the word counts are wrong. Pushes to `main` are deployed to GitHub Pages.

One-time setup: in the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. After the next push to `main`, or a manual run from the Actions tab, the game is live at `https://<owner>.github.io/<repo>/`.

## Adding a background theme

Add one block to the `THEMES` list in `src/themes.js`, giving it an id and name, a colour palette, fonts, a `scene.draw()` function or an `image`, and a `card` style for the share image. The comment at the top of that file shows the shape. Once there are two or more themes, a picker appears on the Welcome screen. Rebuild afterwards.

## Tuning

Speeds, lives, points and feedback durations are in `CONFIG` at the top of `src/game.js`.
