# Word Fall: Game Specification

Nov 17, 2026 · @Anurag

## Overview

Word Fall is a browser game for practising vocabulary in Spanish or Simplified Chinese. A word falls from the top of the screen and the player picks its match from three options at the bottom before it lands. It tests vocabulary only, not grammar. "Word Fall" is a working title.

Decisions confirmed so far:

| Topic | Decision |
| --- | --- |
| Platform | One web game for desktop and mobile browsers |
| Languages | Spanish and Simplified Chinese, chosen at the start |
| Spanish matching | Spanish to English and English to Spanish, mixed at random |
| Chinese matching | Player picks one of four modes: character to meaning, character to pinyin, meaning to character, or a random mix |
| Correct answer | +5 points |
| Wrong answer | Lose 1 life |
| Word lands unanswered | Lose 1 life |
| Lives | 7 per game |
| Level length | 250 points (50 correct answers) |
| Word source | Every entry in the two supplied PDFs, reshuffled each game |
| Background | Retro for now, built so more can be added |

## Screen flow

The player passes through six screens, with play and level-up repeating until the lives run out.

1. **Welcome.** Game title, a name field (required, up to 16 characters) and a Start button.
2. **Language.** Two large buttons: Español and 中文.
3. **Mode (Chinese only).** Four buttons: Character → Meaning, Character → Pinyin, Meaning → Character, Mix. Spanish skips this screen.
4. **Play.** A 3-2-1 countdown, then words fall one at a time. The top bar shows name, score, level, lives and elapsed time.
5. **Level up.** Reached at every 250 points. The game pauses and shows the share image, a Download button and a Continue button. Continue returns to Play at the next level.
6. **Game over.** Reached when the seventh life is lost. Shows the final share image, a Download button and a Play Again button. Play Again returns to the Language screen and keeps the name.

## Gameplay rules

One word is on screen at a time, and each word ends in exactly one of three outcomes.

| Outcome | Score | Lives | What the player sees |
| --- | --- | --- | --- |
| Correct option chosen | +5 | No change | Word bursts, chosen option flashes green, next word drops |
| Wrong option chosen | No change | −1 | Chosen option flashes red, correct option shows green for 1.2 seconds |
| Word reaches the bottom | No change | −1 | Correct option shows green for 1.2 seconds |

Other rules:

- **Options.** Three per word: one correct, two wrong, in random left-to-right order.
- **Reveal.** After every Chinese word, the full entry (character, pinyin, meaning) shows briefly so the player learns all three.
- **Lives.** The game starts with 7. Lives carry over between levels and are not refilled.
- **Levels.** Level 1 runs from 0 to 245 points, level 2 from 250 to 495, and so on with no upper limit.
- **Speed.** A word takes 8 seconds to fall in level 1. Each level cuts 0.5 seconds, down to a floor of 3.5 seconds from level 10 onward.
- **Timer.** Counts active play only. It stops during the countdown, the level-up screen and any pause.
- **Pause.** A pause button (and the P key) freezes the game and hides the word and options so pausing gives no advantage.
- **Running out of words.** If a player gets through the whole list, it reshuffles and continues.

## Question modes

Each mode defines what falls and what the three options show.

| Language | Mode | Falling item | Options |
| --- | --- | --- | --- |
| Spanish | Spanish → English | Spanish word or phrase | Three English meanings |
| Spanish | English → Spanish | English meaning | Three Spanish words or phrases |
| Chinese | Character → Meaning | Chinese characters | Three English meanings |
| Chinese | Character → Pinyin | Chinese characters | Three tone-marked pinyin readings |
| Chinese | Meaning → Character | English meaning | Three sets of Chinese characters |

Spanish picks one of its two modes at random for every word, at 50/50. Chinese Mix picks one of its three modes at random for every word, at equal odds.

Wrong options are chosen so the question is fair but not trivial:

- They come from the same list as the falling word, and from the same topic where the topic has enough entries.
- They never show the same text as the correct answer. Some entries share a meaning (for example, two words that both mean "blanket"), so those are excluded as wrong options for each other.
- In Character → Pinyin, wrong options have the same number of syllables as the correct reading.
- In Meaning → Character, wrong options have the same number of characters as the correct word.
- In Character → Meaning, pinyin is hidden while the word falls and shown in the reveal afterwards.

## Controls

Every action works by keyboard on desktop and by tap on mobile, and both work at once on touch laptops.

| Action | Desktop | Mobile |
| --- | --- | --- |
| Pick left option | 1 or A | Tap the option |
| Pick middle option | 2 or S | Tap the option |
| Pick right option | 3 or D | Tap the option |
| Continue or confirm | Enter or Space | Tap the button |
| Pause | P | Tap the pause button |

Each option shows its key label (1/A, 2/S, 3/D) on desktop only. On phones the three options stack as full-width buttons at least 56 pixels tall, within thumb reach. Long phrases shrink to fit, so no option is cut off.

## Vocabulary data

The game uses every vocabulary entry in the two supplied PDFs: 9,060 entries in total.

| Source file | Entries | Fields per entry | Grouping |
| --- | --- | --- | --- |
| Spanish\_B2\_Study\_Guide.pdf | 5,511 | Spanish, English meaning | Level (A1, A2, B1, B2) and topic |
| Simplified\_Chinese\_HSK4plus\_Printable\_Vocabulary.pdf | 3,549 | Characters, pinyin, English meaning | 13 themes |

- **Extraction.** The words are pulled from the PDFs once, during the build, and stored inside the game. The PDFs are not needed to play.
- **Check.** The build must produce exactly 5,511 Spanish and 3,549 Chinese entries. Any shortfall is reported with the missing entries, not silently skipped.
- **Left out.** Cover and how-to pages, blank practice and tracker sheets, the 30-day recall pack (repeats of the main list) and the 140 Chinese sample sentences (sentences, not vocabulary).
- **Kept as written.** Multi-word phrases, articles ("la beca") and combined meanings ("PhD / doctorate") appear exactly as in the PDF.
- **Randomising.** The full list for the chosen language is shuffled at the start of every game. No word repeats within a game until the whole list has been used.
- **Mixed difficulty.** Spanish A1 to B2 words are mixed together, so an early word can be hard and a late one easy.

## Share image

The game produces a 1080 × 1920 PNG (Instagram story size) at every level-up and at game over. It is drawn in the player's browser in the current background theme.

Content, top to bottom:

1. Game title and the language played (Español or 中文, plus the Chinese mode).
2. Headline: "Level 3 complete" on a level-up image, "Game over" on the final image, written in the chosen language.
3. Player name.
4. Score, as the largest element on the image.
5. Stat row: level reached, time taken (minutes:seconds), correct answers and accuracy, lives left.
6. Motivational line in the chosen language.
7. Day and date in the chosen language, for example "martes, 17 de noviembre de 2026" or "2026年11月17日 星期二".

Motivational lines are picked at random from a set of at least 10 per language, with separate sets for level-up (keep going) and game over (try again). Examples: "Poco a poco se llega lejos." and "千里之行，始于足下。"

Download behaviour:

- The Download button saves the file as `wordfall-<name>-<score>-<date>.png`.
- On phones that support it, the button opens the system share sheet, so the player can send the image straight to Instagram.
- Where neither works, the image shows full-screen for a long-press save.
- The game does not post to Instagram itself. The player shares the saved image.

## Modular backgrounds

Each background is a self-contained theme, and adding or swapping one needs no change to the game logic.

A theme defines five things:

| Part | What it controls |
| --- | --- |
| Name and id | Label shown in the theme picker |
| Colour palette | Background, text, accent, correct, wrong and button colours |
| Fonts | Display font for titles and scores, text font for words (with full Spanish accents and Chinese characters) |
| Play background | The animated scene behind the falling word |
| Share card style | How the same look is drawn on the 1080 × 1920 image |

- **First theme: Retro Sunset.** Dark purple sky, neon sun with scan lines, a pink and cyan perspective grid scrolling toward the player, and pixel-style lettering.
- **Adding a theme.** A new theme is one added block in the theme list. A background image file can be used in place of a drawn scene.
- **Theme picker.** Appears on the Welcome screen automatically once there are two or more themes. With one theme it stays hidden.
- **Readability rule.** Every theme must keep the falling word and options readable, so the word always sits on a solid or dimmed panel.

## Technical approach and limits

The game is a single self-contained web page with no server, account or install.

- **Delivery.** One HTML file holding the game, both word lists and the theme. It can be opened from a link or hosted on any website.
- **Screens.** Scales from a 360-pixel-wide phone in portrait to a desktop monitor. The play area stays a centred column on wide screens.
- **Sound.** Short retro beeps for correct, wrong and level-up, with a mute button. Sound starts on.
- **Privacy.** The name is used only on screen and on the share image. Nothing is sent anywhere.
- **Not in this version.** Leaderboards, saved progress between sessions, user accounts, grammar exercises, audio pronunciation and languages beyond the two supplied.

## Open points

These five are set to a default in this spec. Change any of them before the build starts.

- [ ] **Lives at level-up.** Default: lives carry over. Alternatives: refill to 7, or +1 bonus life per level.
- [ ] **Spanish level filter.** Default: all levels mixed. Alternative: let the player pick A1, A2, B1, B2 or all.
- [ ] **Speed curve.** Default: 8 seconds falling to 3.5 seconds by level 10. Easy to tune after a first play.
- [ ] **Pinyin hint.** Default: hidden in Character → Meaning. Alternative: show it under the falling characters.
- [ ] **Game name.** Default: Word Fall. It appears on the title screen and every share image.
