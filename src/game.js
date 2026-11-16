"use strict";

/* ======================================================================
 * WordRain: game logic. Word lists come from VOCAB (built from the PDFs),
 * looks come from THEMES (themes.js).
 * ====================================================================== */

const GAME_TITLE = "WordRain";

const CONFIG = {
  lives: 7,
  pointsPerCorrect: 5,
  pointsPerLevel: 250,
  fallStartSeconds: 8,
  fallStepSeconds: 0.5,
  fallMinSeconds: 3.5,
  correctPauseMs: 450, // Spanish: word bursts, next word drops
  revealCorrectMs: 1300, // Chinese: full entry shown after a correct answer
  showAnswerMs: 1200, // wrong or missed: correct option shows green
  revealMissMs: 1800, // Chinese wrong or missed: green option plus the full entry
  countdownSeconds: 3,
};

const fallSeconds = (level) =>
  Math.max(CONFIG.fallMinSeconds, CONFIG.fallStartSeconds - CONFIG.fallStepSeconds * (level - 1));

/* ---------------------------------------------------------------- data */

function normalise(s) {
  return s.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}
function meaningParts(s) {
  return new Set(normalise(s).split(/\s*[\/,;]\s*/).map((x) => x.trim()).filter(Boolean));
}
function overlaps(a, b) {
  for (const x of a) if (b.has(x)) return true;
  return false;
}
function syllableCount(hz, py) {
  let n = [...hz].length;
  // Erhua: 儿 merges into the previous syllable ("nǎr") unless written out ("nǚér").
  if (n > 1 && hz.endsWith("儿") && /r$/.test(py) && !/[eéèěē]r$/.test(py)) n--;
  return n;
}

const LANGS = {
  es: {
    entries: VOCAB.es.entries.map(([es, en, topic], id) => ({
      id, es, en, topic, esKey: normalise(es), enParts: meaningParts(en),
    })),
    topics: VOCAB.es.topics,
  },
  zh: {
    entries: VOCAB.zh.entries.map(([hz, py, en, topic], id) => ({
      id, hz, py, en, topic,
      pyKey: py.replace(/\s+/g, "").toLowerCase(),
      enParts: meaningParts(en),
      chars: [...hz].length,
      syllables: syllableCount(hz, py),
    })),
    topics: VOCAB.zh.topics,
  },
};
for (const lang of Object.values(LANGS)) {
  lang.byTopic = lang.topics.map(() => []);
  for (const e of lang.entries) lang.byTopic[e.topic].push(e);
}

/* What falls and what the options show, per question mode. */
const MODES = {
  es2en: { lang: "es", chip: "ES → EN", prompt: (e) => e.es, option: (e) => e.en, promptLang: "es", optionLang: "en" },
  en2es: { lang: "es", chip: "EN → ES", prompt: (e) => e.en, option: (e) => e.es, promptLang: "en", optionLang: "es" },
  cm: { lang: "zh", chip: "汉字 → EN", prompt: (e) => e.hz, option: (e) => e.en, promptLang: "zh-CN", optionLang: "en", hzPrompt: true },
  cp: { lang: "zh", chip: "汉字 → PINYIN", prompt: (e) => e.hz, option: (e) => e.py, promptLang: "zh-CN", optionLang: "zh-Latn-pinyin", hzPrompt: true,
    same: (a, b) => a.syllables === b.syllables },
  mc: { lang: "zh", chip: "EN → 汉字", prompt: (e) => e.en, option: (e) => e.hz, promptLang: "en", optionLang: "zh-CN", hzOptions: true,
    same: (a, b) => a.chars === b.chars },
};

/* Two entries clash when one could pass for a right answer to the other. */
function clashes(a, b, mode) {
  if (a === b) return true;
  if (overlaps(a.enParts, b.enParts)) return true;
  if (MODES[mode].lang === "es") return a.esKey === b.esKey;
  return a.hz === b.hz || (mode === "cp" && a.pyKey === b.pyKey);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickWrongOptions(target, mode) {
  const lang = LANGS[MODES[mode].lang];
  const shape = MODES[mode].same || (() => true);
  const optText = MODES[mode].option;
  const picked = [];
  const fits = (c, strictShape) =>
    !clashes(target, c, mode) &&
    (!strictShape || shape(target, c)) &&
    picked.every((p) => p !== c && optText(p) !== optText(c));

  // 1) same topic, 2) whole list, 3) whole list without the length rule.
  const topicPool = shuffle(lang.byTopic[target.topic].slice());
  for (const c of topicPool) {
    if (picked.length === 2) break;
    if (fits(c, true)) picked.push(c);
  }
  for (let tries = 0; picked.length < 2 && tries < 600; tries++) {
    const c = lang.entries[Math.floor(Math.random() * lang.entries.length)];
    if (fits(c, true)) picked.push(c);
  }
  if (picked.length < 2) {
    for (const c of shuffle(lang.entries.slice())) {
      if (picked.length === 2) break;
      if (fits(c, false)) picked.push(c);
    }
  }
  return picked;
}

function buildQuestion(entry, mode) {
  const wrong = pickWrongOptions(entry, mode);
  const options = shuffle([entry, ...wrong]);
  return {
    entry,
    mode,
    prompt: MODES[mode].prompt(entry),
    options: options.map((e) => MODES[mode].option(e)),
    correct: options.indexOf(entry),
  };
}

/* ---------------------------------------------------------------- text */

const COPY = {
  es: {
    language: "Español",
    levelDone: (n) => `Nivel ${n} completado`,
    gameOver: "Fin del juego",
    score: "Puntos",
    level: "Nivel",
    time: "Tiempo",
    correct: "Aciertos · precisión",
    lives: "Vidas",
    keepGoing: [
      "Poco a poco se llega lejos.",
      "¡Sigue así, vas por buen camino!",
      "Cada palabra cuenta.",
      "El que la sigue, la consigue.",
      "Paso a paso se hace el camino.",
      "¡Qué bien lo estás haciendo!",
      "Tu español crece cada día.",
      "No pares ahora: lo mejor está por venir.",
      "Querer es poder.",
      "Más vale paso que dure que trote que canse.",
      "¡Imparable! A por el siguiente nivel.",
    ],
    tryAgain: [
      "Cada error es una lección.",
      "¡Inténtalo otra vez!",
      "Caerse está permitido; levantarse es obligatorio.",
      "La práctica hace al maestro.",
      "Mañana será otro día.",
      "No hay atajo sin trabajo.",
      "Hoy aprendiste algo nuevo.",
      "Lo importante es no rendirse.",
      "Roma no se hizo en un día.",
      "Vuelve a jugar y supera tu marca.",
      "Quien no arriesga, no gana.",
    ],
    date(d) {
      const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
      const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
        "septiembre", "octubre", "noviembre", "diciembre"];
      return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
    },
  },
  zh: {
    language: "中文",
    modes: { cm: "汉字 → 英文", cp: "汉字 → 拼音", mc: "英文 → 汉字", mix: "混合模式" },
    levelDone: (n) => `第${n}关完成`,
    gameOver: "游戏结束",
    score: "得分",
    level: "关卡",
    time: "用时",
    correct: "答对 · 正确率",
    lives: "生命",
    keepGoing: [
      "千里之行，始于足下。",
      "继续加油！",
      "学而不厌。",
      "一步一个脚印。",
      "你越来越棒了！",
      "坚持就是胜利。",
      "每天进步一点点。",
      "好好学习，天天向上。",
      "百尺竿头，更进一步。",
      "学无止境。",
      "熟能生巧。",
    ],
    tryAgain: [
      "失败是成功之母。",
      "再来一次吧！",
      "只要功夫深，铁杵磨成针。",
      "不怕慢，只怕站。",
      "明天会更好。",
      "有志者事竟成。",
      "温故而知新。",
      "别灰心，继续努力！",
      "冰冻三尺，非一日之寒。",
      "今天也学到了新词。",
      "吃一堑，长一智。",
    ],
    date(d) {
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${"日一二三四五六"[d.getDay()]}`;
    },
  },
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const formatTime = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* ---------------------------------------------------------------- sound */

const Sound = {
  ctx: null,
  muted: false,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },
  beep(freq, dur, { type = "square", at = 0, vol = 0.07, slide = 0 } = {}) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },
  correct() { this.beep(660, 0.07); this.beep(990, 0.12, { at: 0.07 }); },
  wrong() { this.beep(220, 0.28, { type: "sawtooth", slide: -90, vol: 0.06 }); },
  tick() { this.beep(440, 0.1); },
  go() { this.beep(880, 0.18); },
  levelUp() { [523, 659, 784, 1047].forEach((f, i) => this.beep(f, 0.14, { at: i * 0.11 })); },
  gameOver() { [392, 330, 262, 196].forEach((f, i) => this.beep(f, 0.2, { at: i * 0.16, type: "triangle", vol: 0.09 })); },
};

/* ---------------------------------------------------------------- dom */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const el = {
  scene: $("#scene"),
  nameInput: $("#name"),
  startBtn: $("#start-btn"),
  themePicker: $("#theme-picker"),
  themeSelect: $("#theme"),
  play: $("#screen-play"),
  field: $("#field"),
  word: $("#word"),
  wordText: $("#word-text"),
  modeChip: $("#mode-chip"),
  reveal: $("#reveal"),
  revealHz: $("#reveal-hz"),
  revealPy: $("#reveal-py"),
  revealEn: $("#reveal-en"),
  particles: $("#particles"),
  countdown: $("#countdown"),
  pauseOverlay: $("#pause-overlay"),
  options: $$(".option"),
  optionTexts: $$(".option .opt-text"),
  hudName: $("#hud-name"),
  hudScore: $("#hud-score"),
  hudLevel: $("#hud-level"),
  hudLives: $("#hud-lives"),
  hudTime: $("#hud-time"),
  pauseBtn: $("#pause-btn"),
  muteBtn: $("#mute-btn"),
  resultHeading: $("#result-heading"),
  shareImg: $("#share-img"),
  sharePreview: $("#share-preview"),
  downloadBtn: $("#download-btn"),
  continueBtn: $("#continue-btn"),
  resultHint: $("#result-hint"),
  fullscreen: $("#fullscreen"),
  fullscreenImg: $("#fullscreen-img"),
};

/* ---------------------------------------------------------------- theme */

let theme = THEMES[0];
let themeImage = null;

function applyTheme(t) {
  theme = t;
  const p = t.palette;
  const vars = {
    "--bg": p.bg, "--text": p.text, "--muted": p.muted, "--accent": p.accent, "--accent2": p.accent2,
    "--correct": p.correct, "--wrong": p.wrong, "--btn": p.btn, "--btn-text": p.btnText,
    "--btn-border": p.btnBorder || p.accent2, "--panel": p.panel,
    "--font-display": t.fonts.display, "--font-text": t.fonts.text,
  };
  for (const [k, v] of Object.entries(vars)) if (v) document.documentElement.style.setProperty(k, v);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", p.bg);
  themeImage = null;
  if (t.image) {
    const img = new Image();
    img.onload = () => { themeImage = img; sceneDirty = true; };
    img.src = t.image;
  }
  sceneDirty = true;
}

function drawImageCover(ctx, img, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s;
  const ih = img.height * s;
  ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
}

function drawThemeScene(ctx, w, h, t) {
  if (theme.image) {
    ctx.fillStyle = theme.palette.bg;
    ctx.fillRect(0, 0, w, h);
    if (themeImage) drawImageCover(ctx, themeImage, w, h);
  } else {
    theme.scene.draw(ctx, w, h, t);
  }
}

/* Background canvas */
const sceneCtx = el.scene.getContext("2d");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let sceneDirty = true;
let sceneW = 0;
let sceneH = 0;

function resizeScene() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  sceneW = window.innerWidth;
  sceneH = window.innerHeight;
  el.scene.width = Math.round(sceneW * dpr);
  el.scene.height = Math.round(sceneH * dpr);
  sceneCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sceneDirty = true;
}
window.addEventListener("resize", () => { resizeScene(); fitAll(); });

/* ---------------------------------------------------------------- state */

const g = {
  screen: "welcome",
  name: "",
  lang: "es",
  zhMode: "cm",
  score: 0,
  lives: CONFIG.lives,
  level: 1,
  correct: 0,
  answered: 0,
  elapsed: 0,
  deck: [],
  deckPos: 0,
  q: null,
  phase: "idle", // countdown | falling | feedback | result
  paused: false,
  fallT: 0,
  fallDur: 8,
  feedbackLeft: 0,
  countdownLeft: 0,
  countdownShown: 0,
  resultKind: null,
  cardBlob: null,
  cardUrl: null,
};

function showScreen(name) {
  g.screen = name;
  for (const s of $$(".screen")) s.hidden = s.dataset.screen !== name;
  const focusTarget = {
    welcome: el.nameInput,
    language: $('[data-lang="es"]'),
    mode: $('[data-mode="cm"]'),
    result: el.continueBtn,
  }[name];
  if (focusTarget && matchMedia("(pointer: fine)").matches) focusTarget.focus({ preventScroll: true });
}

/* ---------------------------------------------------------------- flow */

function startGame(lang, zhMode) {
  Sound.ensure();
  Object.assign(g, {
    lang, zhMode: zhMode || g.zhMode,
    score: 0, lives: CONFIG.lives, level: 1, correct: 0, answered: 0, elapsed: 0,
    deck: shuffle(LANGS[lang].entries.map((e) => e.id)), deckPos: 0,
    q: null, paused: false,
  });
  el.hudName.textContent = g.name;
  renderHud(true);
  clearWord();
  showScreen("play");
  startCountdown();
}

function startCountdown() {
  g.phase = "countdown";
  g.countdownLeft = CONFIG.countdownSeconds * 1000;
  g.countdownShown = 0;
  el.countdown.hidden = false;
  clearWord();
}

function nextEntry() {
  if (g.deckPos >= g.deck.length) {
    // Whole list used: reshuffle, avoiding an immediate repeat of the last word.
    const last = g.deck[g.deck.length - 1];
    g.deck = shuffle(g.deck);
    if (g.deck[0] === last && g.deck.length > 1) [g.deck[0], g.deck[1]] = [g.deck[1], g.deck[0]];
    g.deckPos = 0;
  }
  return LANGS[g.lang].entries[g.deck[g.deckPos++]];
}

function nextMode() {
  if (g.lang === "es") return Math.random() < 0.5 ? "es2en" : "en2es";
  if (g.zhMode === "mix") return pick(["cm", "cp", "mc"]);
  return g.zhMode;
}

function nextWord() {
  const q = buildQuestion(nextEntry(), nextMode());
  g.q = q;
  const m = MODES[q.mode];

  el.modeChip.textContent = m.chip;
  el.reveal.hidden = true;
  el.word.className = "word" + (m.hzPrompt ? " hz" : "");
  el.wordText.textContent = q.prompt;
  el.wordText.lang = m.promptLang;
  el.options.forEach((b, i) => {
    b.className = "option" + (m.hzOptions ? " hz" : "");
    b.disabled = false;
    el.optionTexts[i].textContent = q.options[i];
    el.optionTexts[i].lang = m.optionLang;
  });
  fitAll();

  g.fallT = 0;
  g.fallDur = fallSeconds(g.level);
  positionWord(0);
  g.phase = "falling";
}

function clearWord() {
  el.word.className = "word gone";
  el.reveal.hidden = true;
  el.modeChip.textContent = "";
  el.options.forEach((b, i) => {
    b.className = "option";
    b.disabled = true;
    el.optionTexts[i].textContent = "";
  });
}

function positionWord(progress) {
  const maxY = Math.max(0, el.field.clientHeight - el.word.offsetHeight - 6);
  el.word.style.transform = `translateY(${Math.round(progress * maxY)}px)`;
}

function choose(i) {
  if (g.screen !== "play" || g.paused || g.phase !== "falling") return;
  Sound.ensure();
  const q = g.q;
  g.answered++;
  el.options.forEach((b) => (b.disabled = true));
  if (i === q.correct) {
    g.score += CONFIG.pointsPerCorrect;
    g.correct++;
    el.options[i].classList.add("correct");
    burst();
    Sound.correct();
    endWord(g.lang === "zh" ? CONFIG.revealCorrectMs : CONFIG.correctPauseMs);
  } else {
    el.options[i].classList.add("wrong");
    el.options[q.correct].classList.add("correct");
    loseLife();
    endWord(g.lang === "zh" ? CONFIG.revealMissMs : CONFIG.showAnswerMs);
  }
  renderHud();
}

function missed() {
  g.answered++;
  el.word.classList.add("missed");
  el.options.forEach((b) => (b.disabled = true));
  el.options[g.q.correct].classList.add("correct");
  loseLife();
  renderHud();
  endWord(g.lang === "zh" ? CONFIG.revealMissMs : CONFIG.showAnswerMs);
}

function loseLife() {
  g.lives--;
  Sound.wrong();
  const heart = el.hudLives.children[g.lives];
  if (heart) {
    heart.classList.add("losing");
    setTimeout(() => heart.classList.remove("losing"), 650);
  }
}

function endWord(ms) {
  g.phase = "feedback";
  g.feedbackLeft = ms;
  if (g.lang === "zh") {
    const e = g.q.entry;
    el.revealHz.textContent = e.hz;
    el.revealPy.textContent = e.py;
    el.revealEn.textContent = e.en;
    el.reveal.hidden = false;
    if (!el.word.classList.contains("burst")) el.word.classList.add("gone");
  }
}

function afterFeedback() {
  if (g.lives <= 0) return finish("over");
  if (g.score >= g.level * CONFIG.pointsPerLevel) return finish("level");
  nextWord();
}

function burst() {
  el.word.classList.add("burst");
  const fr = el.field.getBoundingClientRect();
  const wr = el.word.getBoundingClientRect();
  const cx = wr.left + wr.width / 2 - fr.left;
  const cy = wr.top + wr.height / 2 - fr.top;
  const colours = [theme.palette.correct, theme.palette.accent, theme.palette.accent2];
  for (let i = 0; i < 16; i++) {
    const p = document.createElement("i");
    p.className = "particle";
    const a = (i / 16) * Math.PI * 2;
    const d = 50 + Math.random() * 70;
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.setProperty("--dx", `${Math.cos(a) * d}px`);
    p.style.setProperty("--dy", `${Math.sin(a) * d}px`);
    p.style.setProperty("--c", colours[i % 3]);
    el.particles.appendChild(p);
    setTimeout(() => p.remove(), 650);
  }
}

function finish(kind) {
  g.phase = "result";
  g.resultKind = kind;
  if (kind === "level") Sound.levelUp();
  else Sound.gameOver();
  clearWord();
  showResult(kind);
}

function continueFromResult() {
  if (g.screen !== "result") return;
  if (g.resultKind === "level") {
    g.level++;
    renderHud();
    showScreen("play");
    startCountdown();
  } else {
    showScreen("language");
  }
}

/* ---------------------------------------------------------------- pause */

function setPaused(on) {
  if (g.screen !== "play" || g.phase === "result") return;
  g.paused = on;
  el.play.classList.toggle("paused", on);
  el.pauseOverlay.hidden = !on;
  el.pauseBtn.textContent = on ? "▶" : "❚❚";
  el.pauseBtn.setAttribute("aria-label", on ? "Resume (P)" : "Pause (P)");
  if (on) $("#resume-btn").focus({ preventScroll: true });
  else if (document.activeElement) document.activeElement.blur();
}

/* ---------------------------------------------------------------- hud */

function renderHud(rebuildHearts) {
  el.hudScore.textContent = g.score;
  el.hudLevel.textContent = g.level;
  el.hudTime.textContent = formatTime(g.elapsed);
  if (rebuildHearts || el.hudLives.children.length !== CONFIG.lives) {
    el.hudLives.innerHTML = "";
    for (let i = 0; i < CONFIG.lives; i++) {
      const h = document.createElement("span");
      h.className = "heart";
      h.textContent = "♥";
      el.hudLives.appendChild(h);
    }
  }
  [...el.hudLives.children].forEach((h, i) => h.classList.toggle("lost", i >= g.lives));
  el.hudLives.setAttribute("aria-label", `${g.lives} of ${CONFIG.lives} lives`);
}

/* Shrink long text so nothing is cut off. */
function fitText(node, maxPx, minPx, maxHeight) {
  let size = maxPx;
  node.style.fontSize = `${size}px`;
  const tooBig = () =>
    node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > maxHeight() + 1;
  while (size > minPx && tooBig()) {
    size -= 1;
    node.style.fontSize = `${size}px`;
  }
}

function fitAll() {
  if (!g.q || g.screen !== "play") return;
  const phone = matchMedia("(max-width: 600px)").matches;
  const m = MODES[g.q.mode];
  const wordMax = m.hzPrompt ? (phone ? 36 : 40) : (phone ? 22 : 26);
  fitText(el.wordText, wordMax, 12, () => wordMax * 1.25 * (m.hzPrompt ? 1 : 3));
  const optMax = m.hzOptions ? (phone ? 24 : 26) : (phone ? 17 : 18);
  el.optionTexts.forEach((t) => {
    const btn = t.parentElement;
    const cs = getComputedStyle(btn);
    const avail = () => btn.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    fitText(t, optMax, 10, avail);
  });
}

/* ---------------------------------------------------------------- loop */

let last = performance.now();
function frame(now) {
  const dt = Math.min(100, now - last);
  last = now;

  if (!reduceMotion || sceneDirty) {
    drawThemeScene(sceneCtx, sceneW, sceneH, reduceMotion ? 0 : now / 1000);
    sceneDirty = false;
  }

  if (g.screen === "play" && !g.paused) tick(dt);
  requestAnimationFrame(frame);
}

function tick(dt) {
  if (g.phase === "countdown") {
    g.countdownLeft -= dt;
    const n = Math.ceil(g.countdownLeft / 1000);
    if (n !== g.countdownShown && n > 0) {
      g.countdownShown = n;
      el.countdown.innerHTML = `<span>${n}</span>`;
      Sound.tick();
    }
    if (g.countdownLeft <= 0) {
      el.countdown.hidden = true;
      Sound.go();
      nextWord();
    }
    return;
  }
  if (g.phase === "falling") {
    g.elapsed += dt;
    g.fallT += dt;
    const p = Math.min(1, g.fallT / (g.fallDur * 1000));
    positionWord(p);
    if (p >= 1) missed();
  } else if (g.phase === "feedback") {
    g.elapsed += dt;
    g.feedbackLeft -= dt;
    if (g.feedbackLeft <= 0) afterFeedback();
  }
  el.hudTime.textContent = formatTime(g.elapsed);
}

/* ---------------------------------------------------------------- share image */

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitFont(ctx, text, font, size, maxW, min = 16) {
  while (size > min) {
    ctx.font = font(size);
    if (ctx.measureText(text).width <= maxW) break;
    size -= 2;
  }
  ctx.font = font(size);
  return size;
}

function wrapLines(ctx, text, maxW) {
  const cjk = /[　-鿿＀-￯]/.test(text);
  const tokens = cjk ? [...text] : text.split(" ");
  const sep = cjk ? "" : " ";
  const lines = [];
  let line = "";
  for (const tok of tokens) {
    const tryLine = line ? line + sep + tok : tok;
    if (ctx.measureText(tryLine).width > maxW && line) {
      lines.push(line);
      line = tok;
    } else {
      line = tryLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function waitForFonts() {
  const loads = (theme.fonts.load || []).map((f) => document.fonts.load(f).catch(() => null));
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 1500))]);
}

async function drawShareCard(kind) {
  await waitForFonts();
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const c = theme.card;
  const copy = COPY[g.lang];
  const display = (px) => `${px}px ${theme.fonts.display}`;
  const text = (px, weight = 400) => `${weight} ${px}px ${theme.fonts.text}`;
  const cx = W / 2;

  // Background in the current theme
  if (theme.image) {
    ctx.fillStyle = theme.palette.bg;
    ctx.fillRect(0, 0, W, H);
    if (themeImage) drawImageCover(ctx, themeImage, W, H);
  } else {
    c.drawBackground(ctx, W, H);
  }

  // Dimmed panel keeps every line readable
  roundRect(ctx, 64, 120, W - 128, H - 240, 36);
  ctx.fillStyle = c.panel;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = c.border || c.accent;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const maxW = W - 220;

  // 1. Title and language
  fitFont(ctx, GAME_TITLE, display, 88, maxW);
  if (c.titleShadow) {
    ctx.fillStyle = c.titleShadow;
    ctx.fillText(GAME_TITLE, cx + 6, 290 + 6);
  }
  ctx.fillStyle = c.title;
  ctx.fillText(GAME_TITLE, cx, 290);

  const langLine = g.lang === "zh" ? `${copy.language} · ${copy.modes[g.zhMode]}` : copy.language;
  ctx.font = text(46, 600);
  ctx.fillStyle = c.accent;
  ctx.fillText(langLine, cx, 390);

  // 2. Headline in the chosen language
  const headline = kind === "level" ? copy.levelDone(g.level) : copy.gameOver;
  ctx.fillStyle = c.text;
  if (g.lang === "zh") fitFont(ctx, headline, (px) => text(px, 800), 96, maxW);
  else fitFont(ctx, headline, display, 56, maxW);
  ctx.fillText(headline, cx, 540);

  // 3. Player name
  fitFont(ctx, g.name, (px) => text(px, 700), 68, maxW);
  ctx.fillStyle = c.text;
  ctx.fillText(g.name, cx, 680);

  // 4. Score: the largest element
  ctx.font = text(40, 600);
  ctx.fillStyle = c.muted;
  ctx.fillText(copy.score.toUpperCase(), cx, 790);
  fitFont(ctx, String(g.score), display, 230, maxW);
  ctx.save();
  ctx.shadowColor = c.glow || c.score;
  ctx.shadowBlur = 40;
  ctx.fillStyle = c.score;
  ctx.fillText(String(g.score), cx, 1040);
  ctx.restore();

  // 5. Stats, two by two
  const accuracy = g.answered ? Math.min(100, Math.round((g.correct / g.answered) * 100)) : 0;
  const stats = [
    [copy.level, String(g.level)],
    [copy.time, formatTime(g.elapsed)],
    [copy.correct, `${g.correct} · ${accuracy}%`],
    [copy.lives, `${Math.max(0, g.lives)}/${CONFIG.lives}`],
  ];
  const colW = (W - 200) / 2;
  stats.forEach(([label, value], i) => {
    const x = 100 + colW * (i % 2) + colW / 2;
    const y = 1170 + Math.floor(i / 2) * 190;
    roundRect(ctx, x - colW / 2 + 12, y - 70, colW - 24, 160, 22);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = c.accent;
    ctx.stroke();
    fitFont(ctx, value, display, 50, colW - 70);
    ctx.fillStyle = c.text;
    ctx.fillText(value, x, y + 10);
    fitFont(ctx, label, (px) => text(px, 600), 32, colW - 70);
    ctx.fillStyle = c.muted;
    ctx.fillText(label, x, y + 66);
  });

  // 6. Motivational line
  const line = pick(kind === "level" ? copy.keepGoing : copy.tryAgain);
  ctx.font = text(52, 700);
  ctx.fillStyle = c.accent;
  const lines = wrapLines(ctx, line, maxW).slice(0, 3);
  lines.forEach((l, i) => ctx.fillText(l, cx, 1580 + i * 66 - (lines.length - 1) * 33));

  // 7. Day and date
  ctx.font = text(38, 500);
  ctx.fillStyle = c.muted;
  ctx.fillText(copy.date(new Date()), cx, 1730);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function showResult(kind) {
  const copy = { level: `Level ${g.level} complete!`, over: "Game over" };
  el.resultHeading.textContent = copy[kind];
  el.continueBtn.textContent = kind === "level" ? "Continue" : "Play again";
  el.resultHint.textContent =
    kind === "level"
      ? `Next: level ${g.level + 1}. Words fall a little faster.`
      : `Score ${g.score} · ${g.correct} correct · ${formatTime(g.elapsed)}`;
  el.downloadBtn.disabled = true;
  el.shareImg.removeAttribute("src");
  if (g.cardUrl) URL.revokeObjectURL(g.cardUrl);
  g.cardBlob = null;
  g.cardUrl = null;
  showScreen("result");

  const blob = await drawShareCard(kind);
  g.cardBlob = blob;
  g.cardUrl = URL.createObjectURL(blob);
  el.shareImg.src = g.cardUrl;
  el.downloadBtn.disabled = false;
}

function cardFileName() {
  const slug = g.name.normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "player";
  return `wordrain-${slug}-${g.score}-${isoDate(new Date())}.png`;
}

const inAppBrowser = /Instagram|FBAN|FBAV|Line\/|Twitter|Snapchat/i.test(navigator.userAgent);

async function downloadCard() {
  if (!g.cardBlob) return;
  const name = cardFileName();
  const file = new File([g.cardBlob], name, { type: "image/png" });
  const phone = matchMedia("(pointer: coarse)").matches;

  if (phone && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: GAME_TITLE });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  const a = document.createElement("a");
  if ("download" in a && !inAppBrowser) {
    a.href = g.cardUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  openFullscreen();
}

function openFullscreen() {
  if (!g.cardUrl) return;
  el.fullscreenImg.src = g.cardUrl;
  el.fullscreen.hidden = false;
  $("#fullscreen-close").focus({ preventScroll: true });
}
function closeFullscreen() {
  el.fullscreen.hidden = true;
  if (g.screen === "result") el.continueBtn.focus({ preventScroll: true });
}

/* ---------------------------------------------------------------- input */

el.nameInput.addEventListener("input", () => {
  el.startBtn.disabled = el.nameInput.value.trim().length === 0;
});
$("#welcome-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = el.nameInput.value.trim().slice(0, 16);
  if (!name) return;
  g.name = name;
  Sound.ensure();
  el.nameInput.blur();
  showScreen("language");
});

$$("[data-lang]").forEach((b) =>
  b.addEventListener("click", () => {
    if (b.dataset.lang === "es") startGame("es");
    else showScreen("mode");
  }),
);
$$("[data-mode]").forEach((b) => b.addEventListener("click", () => startGame("zh", b.dataset.mode)));
$$("[data-back]").forEach((b) => b.addEventListener("click", () => showScreen(b.dataset.back)));

el.options.forEach((b, i) =>
  b.addEventListener("click", () => {
    b.blur();
    choose(i);
  }),
);
el.pauseBtn.addEventListener("click", () => setPaused(!g.paused));
$("#resume-btn").addEventListener("click", () => setPaused(false));
el.muteBtn.addEventListener("click", () => {
  Sound.muted = !Sound.muted;
  el.muteBtn.classList.toggle("muted", Sound.muted);
  el.muteBtn.setAttribute("aria-label", Sound.muted ? "Unmute sound" : "Mute sound");
  el.muteBtn.blur();
});
el.downloadBtn.addEventListener("click", async () => {
  await downloadCard();
  // Keep Enter / Space mapped to Continue after a download.
  if (el.fullscreen.hidden && g.screen === "result") el.continueBtn.focus({ preventScroll: true });
});
el.continueBtn.addEventListener("click", continueFromResult);
el.sharePreview.addEventListener("click", openFullscreen);
$("#fullscreen-close").addEventListener("click", closeFullscreen);

const KEY_OPTION = { 1: 0, a: 0, 2: 1, s: 1, 3: 2, d: 2 };

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const confirmKey = k === "Enter" || k === " ";

  if (!el.fullscreen.hidden) {
    if (confirmKey || k === "Escape") {
      e.preventDefault();
      closeFullscreen();
    }
    return;
  }

  if (g.screen === "play") {
    if (k === "p" || k === "Escape") {
      e.preventDefault();
      if (k === "p" || !g.paused) setPaused(!g.paused);
      return;
    }
    if (g.paused) {
      if (confirmKey) {
        e.preventDefault();
        setPaused(false);
      }
      return;
    }
    if (k in KEY_OPTION) {
      e.preventDefault();
      choose(KEY_OPTION[k]);
    } else if (confirmKey) {
      e.preventDefault();
    }
    return;
  }

  if (!confirmKey) return;
  const tag = e.target && e.target.tagName;
  if (tag === "BUTTON" || tag === "SELECT" || tag === "INPUT" || tag === "A") return; // native handling
  if (g.screen === "result") {
    e.preventDefault();
    continueFromResult();
  } else if (g.screen === "welcome") {
    e.preventDefault();
    $("#welcome-form").requestSubmit();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && g.screen === "play" && !g.paused && g.phase !== "result") setPaused(true);
});

/* ---------------------------------------------------------------- boot */

function initThemes() {
  if (THEMES.length >= 2) {
    el.themePicker.hidden = false;
    for (const t of THEMES) {
      const o = document.createElement("option");
      o.value = t.id;
      o.textContent = t.name;
      el.themeSelect.appendChild(o);
    }
    el.themeSelect.addEventListener("change", () => {
      applyTheme(THEMES.find((t) => t.id === el.themeSelect.value) || THEMES[0]);
    });
  }
  applyTheme(THEMES[0]);
}

$$("[data-count]").forEach((n) => {
  n.textContent = LANGS[n.dataset.count].entries.length.toLocaleString("en-US");
});
$$("[data-game-title]").forEach((n) => (n.textContent = GAME_TITLE));

initThemes();
resizeScene();
renderHud(true);
requestAnimationFrame(frame);

// Small hook for automated checks; the game does not depend on it.
window.WordRain = { g, LANGS, MODES, buildQuestion, CONFIG };
