/*
 * WordRain themes.
 *
 * Each theme is one self-contained block in the THEMES list. The game reads
 * only the fields below, so adding or swapping a theme needs no change to
 * the game logic. When THEMES holds two or more entries, a picker appears on
 * the Welcome screen automatically.
 *
 *   id, name   Identifier and the label shown in the theme picker.
 *   palette    Colours for the background, text, accent, correct, wrong
 *              and buttons. `panel` is the solid or dimmed backing behind
 *              the falling word and options, which keeps them readable.
 *   fonts      `display` for titles and scores, `text` for words. The text
 *              font must cover Spanish accents and Chinese characters.
 *              `load` lists fonts to wait for before drawing a share image.
 *   scene      The animated play background: draw(ctx, w, h, timeSeconds).
 *              Or give `image: "url-or-data-uri"` instead of a drawn scene.
 *   card       How the same look is drawn on the 1080 x 1920 share image:
 *              drawBackground(ctx, W, H) plus colours for the content.
 *
 * A theme with a background image instead of a drawn scene looks like:
 *
 *   {
 *     id: "night-city",
 *     name: "Night City",
 *     palette: { ...same keys as below... },
 *     fonts: { display: "...", text: "..." },
 *     image: "data:image/jpeg;base64,...",   // or "backgrounds/city.jpg"
 *     card: { panel: "rgba(0,0,0,0.7)", title: "#fff", score: "#ffd23f",
 *             text: "#fff", muted: "#ccc", accent: "#ffd23f" },
 *   }
 */

const TEXT_FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans SC", "PingFang SC", ' +
  '"Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif';

/* ---------- Retro Sunset ---------- */

const retroSunset = (() => {
  // Fixed star field so the sky does not jump between frames.
  const stars = [];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) stars.push({ x: rand(), y: rand(), r: rand() * 1.4 + 0.4, p: rand() * 6.28 });

  const mountains = [0, 0.55, 0.08, 0.35, 0.16, 0.62, 0.27, 0.3, 0.36, 0.5, 0.45, 0.2, 0.55, 0.45,
    0.64, 0.25, 0.73, 0.58, 0.82, 0.3, 0.9, 0.48, 1, 0.22];

  function draw(ctx, w, h, t, opts = {}) {
    const horizon = Math.round(h * (opts.horizon || 0.6));
    const unit = Math.min(w, h);

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#0d0221");
    sky.addColorStop(0.55, "#2b0b4f");
    sky.addColorStop(0.85, "#6a1b6e");
    sky.addColorStop(1, "#c1286f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon);

    // Stars
    for (const s of stars) {
      if (s.y * horizon > horizon * 0.8) continue;
      ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.3 + s.p));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(s.x * w, s.y * horizon * 0.8, s.r * (unit / 500), s.r * (unit / 500));
    }
    ctx.globalAlpha = 1;

    // Neon sun with scan-line gaps that drift downward
    const r = unit * 0.24;
    const cx = w / 2;
    const cy = horizon - r * 0.38;
    ctx.save();
    ctx.shadowColor = "#ff3ea5";
    ctx.shadowBlur = unit * 0.08;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,62,165,0.35)";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    const sunGrad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    sunGrad.addColorStop(0, "#ffe66d");
    sunGrad.addColorStop(0.45, "#ff9f43");
    sunGrad.addColorStop(1, "#ff2e88");
    ctx.fillStyle = sunGrad;
    const top = cy - r;
    const band = r * 0.16;
    const drift = (t * band * 0.5) % band;
    let y = top;
    ctx.fillRect(cx - r, top, r * 2, r * 0.95);
    y = top + r * 0.95 - drift;
    let i = 0;
    while (y < cy + r) {
      const gap = Math.max(1, band * (0.12 + 0.11 * i));
      ctx.fillRect(cx - r, y, r * 2, band - gap);
      y += band;
      i++;
    }
    ctx.restore();

    // Mountains
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (let m = 0; m < mountains.length; m += 2) {
      ctx.lineTo(mountains[m] * w, horizon - mountains[m + 1] * unit * 0.12);
    }
    ctx.lineTo(w, horizon);
    ctx.closePath();
    ctx.fillStyle = "#1b0633";
    ctx.fill();
    ctx.strokeStyle = "rgba(45,226,230,0.55)";
    ctx.lineWidth = Math.max(1, unit / 400);
    ctx.stroke();

    // Ground
    const ground = ctx.createLinearGradient(0, horizon, 0, h);
    ground.addColorStop(0, "#1a0533");
    ground.addColorStop(1, "#090014");
    ctx.fillStyle = ground;
    ctx.fillRect(0, horizon, w, h - horizon);

    // Perspective grid scrolling toward the player
    const gh = h - horizon;
    const lw = Math.max(1, unit / 360);
    ctx.lineWidth = lw;
    ctx.strokeStyle = "rgba(255,62,165,0.85)";
    const phase = (t * 0.9) % 1;
    ctx.beginPath();
    for (let k = 1; k < 40; k++) {
      const z = k - phase;
      if (z < 0.6) continue;
      const yy = horizon + gh * (0.6 / z);
      if (yy > h) continue;
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(45,226,230,0.75)";
    ctx.beginPath();
    const spread = w * 0.11;
    for (let k = -18; k <= 18; k++) {
      ctx.moveTo(cx + k * spread * 0.12, horizon);
      ctx.lineTo(cx + k * spread * 1.6, h);
    }
    ctx.stroke();

    // Horizon glow
    const glow = ctx.createLinearGradient(0, horizon - 6, 0, horizon + unit * 0.05);
    glow.addColorStop(0, "rgba(255,62,165,0.9)");
    glow.addColorStop(1, "rgba(255,62,165,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizon - 2, w, unit * 0.05);

    // CRT scan lines
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    const step = Math.max(3, Math.round(unit / 220));
    for (let sy = 0; sy < h; sy += step) ctx.fillRect(0, sy, w, 1);
  }

  return {
    id: "retro-sunset",
    name: "Retro Sunset",
    palette: {
      bg: "#1a0b2e",
      text: "#fdf2ff",
      muted: "#c9b6e4",
      accent: "#ff3ea5",
      accent2: "#2de2e6",
      correct: "#3dff8a",
      wrong: "#ff4d4d",
      btn: "#2a1248",
      btnText: "#fdf2ff",
      btnBorder: "#2de2e6",
      panel: "rgba(16, 6, 32, 0.84)",
    },
    fonts: {
      display: '"Press Start 2P", ui-monospace, monospace',
      text: TEXT_FONT,
      load: ['32px "Press Start 2P"'],
    },
    scene: { draw },
    card: {
      drawBackground(ctx, W, H) {
        draw(ctx, W, H, 0.35, { horizon: 0.7 });
      },
      panel: "rgba(13, 2, 33, 0.80)",
      border: "#2de2e6",
      title: "#ff3ea5",
      titleShadow: "#2de2e6",
      score: "#ffe66d",
      text: "#fdf2ff",
      muted: "#c9b6e4",
      accent: "#2de2e6",
      glow: "#ff3ea5",
    },
  };
})();

const THEMES = [
  retroSunset,
  // Add new themes here, one block each.
];
