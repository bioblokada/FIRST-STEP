/*
 * Фон под интерфейсом. Две картины на выбор:
 *   mc    — блочный мир: небо, солнце, облака, рельеф и деревья;
 *   kitty — пастельный градиент с горошком и плывущими сердечками.
 */
window.World = (function () {
  'use strict';

  var canvas = null;
  var ctx = null;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var theme = 'mc';
  var raf = 0;
  var w = 0, h = 0;

  function rand(min, max) { return min + Math.random() * (max - min); }

  /* ----------------------- Блочный мир ----------------------- */

  var BLOCK = 16;
  var GRASS = ['#5fa84e', '#68b355', '#569c45'];
  var DIRT  = ['#6b4a2f', '#755234', '#5f412a'];
  var STONE = ['#8a8a8a', '#7e7e7e', '#949494'];

  var cols = 0, rows = 0;
  var terrain = [];
  var trees = [];
  var clouds = [];
  var still = null;

  function shade(palette, x, y) { return palette[(x * 7 + y * 13) % palette.length]; }

  function buildTerrain() {
    terrain = [];
    trees = [];
    var base = Math.max(4, Math.round(rows * 0.22));
    var height = base;
    for (var x = 0; x < cols; x++) {
      if (Math.random() < 0.26) height += Math.random() < 0.5 ? -1 : 1;
      height = Math.max(base - 3, Math.min(base + 4, height));
      terrain.push(height);
    }
    for (var t = 3; t < cols - 3; t++) {
      if (Math.random() < 0.09 && terrain[t] === terrain[t - 1] && terrain[t] === terrain[t + 1]) {
        trees.push(t);
        t += 4;
      }
    }
  }

  function buildClouds() {
    clouds = [];
    var count = Math.max(3, Math.round(cols / 14));
    for (var i = 0; i < count; i++) {
      clouds.push({
        x: Math.random() * w,
        y: (0.06 + Math.random() * 0.3) * h,
        blocks: 3 + Math.floor(Math.random() * 4),
        thick: 1 + Math.floor(Math.random() * 2),
        v: 0.12 + Math.random() * 0.18
      });
    }
  }

  /** Дерево: ствол в три блока и крона 5x3. */
  function paintTree(c, x) {
    var groundY = rows - terrain[x];
    for (var i = 1; i <= 3; i++) {
      c.fillStyle = shade(['#5b4128', '#4d3721'], x, i);
      c.fillRect(x * BLOCK, (groundY - i) * BLOCK, BLOCK, BLOCK);
    }
    for (var ly = 0; ly < 3; ly++) {
      var half = ly === 0 ? 1 : 2;
      for (var lx = -half; lx <= half; lx++) {
        c.fillStyle = shade(['#3f7a34', '#4a8c3c', '#356b2c'], x + lx, ly);
        c.fillRect((x + lx) * BLOCK, (groundY - 4 - ly) * BLOCK, BLOCK, BLOCK);
      }
    }
  }

  /** Небо, солнце и рельеф меняются редко — рисуем их один раз в буфер. */
  function paintStill() {
    still = document.createElement('canvas');
    still.width = canvas.width;
    still.height = canvas.height;
    var c = still.getContext('2d');
    c.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);

    var sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#4d7fd6');
    sky.addColorStop(0.55, '#79a6ff');
    sky.addColorStop(1, '#bcd6ff');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);

    var sx = Math.round(w * 0.8 / BLOCK) * BLOCK;
    var sy = Math.round(h * 0.12 / BLOCK) * BLOCK;
    c.fillStyle = 'rgba(255, 250, 205, .4)';
    c.fillRect(sx - BLOCK, sy - BLOCK, BLOCK * 6, BLOCK * 6);
    c.fillStyle = '#fffbd0';
    c.fillRect(sx, sy, BLOCK * 4, BLOCK * 4);

    for (var x = 0; x < cols; x++) {
      var top = rows - terrain[x];
      for (var y = top; y < rows; y++) {
        var depth = y - top;
        var palette = depth === 0 ? GRASS : (depth < 3 ? DIRT : STONE);
        c.fillStyle = shade(palette, x, y);
        c.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
      }
      c.fillStyle = 'rgba(0,0,0,.18)';
      c.fillRect(x * BLOCK, top * BLOCK, BLOCK, 3);
    }
    for (var t = 0; t < trees.length; t++) paintTree(c, trees[t]);
  }

  function paintMc() {
    ctx.drawImage(still, 0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      var bx = Math.round(cl.x / BLOCK) * BLOCK;
      var by = Math.round(cl.y / BLOCK) * BLOCK;
      ctx.fillRect(bx, by, cl.blocks * BLOCK, cl.thick * BLOCK);
      ctx.fillRect(bx + BLOCK, by - BLOCK, (cl.blocks - 2) * BLOCK, BLOCK);
      cl.x += cl.v;
      if (cl.x > w + BLOCK * 6) cl.x = -cl.blocks * BLOCK * 2;
    }
  }

  /* ----------------------- Пастельный фон ----------------------- */

  var COLORS = ['#ffa8cd', '#ff8ab8', '#ffc7de', '#ffd980', '#8fdcc2'];
  var floaters = [];
  var dots = [];

  function buildFloaters() {
    floaters = [];
    var count = Math.round(Math.max(10, Math.min(26, w / 46)));
    for (var i = 0; i < count; i++) {
      floaters.push({
        x: Math.random() * w, y: Math.random() * h,
        size: rand(9, 22), v: rand(0.15, 0.45), sway: rand(0.4, 1.2),
        phase: Math.random() * Math.PI * 2, spin: rand(-0.4, 0.4),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        kind: Math.random() < 0.62 ? 'heart' : (Math.random() < 0.5 ? 'star' : 'bow'),
        alpha: rand(0.5, 0.9)
      });
    }
    dots = [];
    var gap = 74;
    for (var y = gap / 2; y < h + gap; y += gap) {
      for (var x = (y / gap % 2 ? gap / 2 : 0); x < w + gap; x += gap) dots.push({ x: x, y: y });
    }
  }

  function heart(c, size) {
    var s = size / 16;
    c.beginPath();
    c.moveTo(0, 5 * s);
    c.bezierCurveTo(-9 * s, -3 * s, -4 * s, -11 * s, 0, -5 * s);
    c.bezierCurveTo(4 * s, -11 * s, 9 * s, -3 * s, 0, 5 * s);
    c.closePath();
    c.fill();
  }

  function star(c, size) {
    var s = size / 2;
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? s * 0.42 : s;
      var a = (Math.PI / 5) * i - Math.PI / 2;
      c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
  }

  /** Бантик: две треугольные петли и узелок. */
  function bow(c, size) {
    var s = size / 2;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-s, -s * 0.75); c.lineTo(-s, s * 0.75); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0, 0); c.lineTo(s, -s * 0.75); c.lineTo(s, s * 0.75); c.closePath(); c.fill();
    c.beginPath(); c.arc(0, 0, s * 0.3, 0, Math.PI * 2); c.fill();
  }

  function paintKitty(t) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffe3ef');
    g.addColorStop(0.55, '#fff1f5');
    g.addColorStop(1, '#fff9fb');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 168, 205, .35)';
    for (var d = 0; d < dots.length; d++) {
      ctx.beginPath();
      ctx.arc(dots[d].x, dots[d].y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var i = 0; i < floaters.length; i++) {
      var f = floaters[i];
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = f.color;
      ctx.translate(f.x + Math.sin(t / 900 + f.phase) * f.sway * 12, f.y);
      ctx.rotate(Math.sin(t / 1400 + f.phase) * f.spin);
      if (f.kind === 'heart') heart(ctx, f.size);
      else if (f.kind === 'star') star(ctx, f.size);
      else bow(ctx, f.size);
      ctx.restore();
      f.y -= f.v;
      if (f.y < -30) { f.y = h + 30; f.x = Math.random() * w; }
    }
    ctx.globalAlpha = 1;
  }

  /* ----------------------- Общее ----------------------- */

  function paint(t) {
    if (theme === 'kitty') paintKitty(t || 0);
    else paintMc();
  }

  function frame(t) {
    paint(t);
    raf = requestAnimationFrame(frame);
  }

  function build() {
    cols = Math.ceil(w / BLOCK) + 1;
    rows = Math.ceil(h / BLOCK) + 1;
    if (theme === 'kitty') {
      buildFloaters();
    } else {
      buildTerrain();
      buildClouds();
      paintStill();
    }
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = theme !== 'mc';
    build();
    if (reduced) paint(0);
  }

  return {
    init: function (el, name) {
      canvas = el;
      ctx = canvas.getContext('2d');
      theme = name;
      window.addEventListener('resize', resize);
      resize();
      if (!reduced) raf = requestAnimationFrame(frame);
    },
    /** Смена темы: пересобираем картину под новый стиль. */
    setTheme: function (name) {
      if (name === theme) return;
      theme = name;
      ctx.imageSmoothingEnabled = theme !== 'mc';
      build();
      if (reduced) paint(0);
    }
  };
})();
