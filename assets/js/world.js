/* Фон: блочный мир — небо, квадратное солнце, пиксельные облака и рельеф. */
(function () {
  'use strict';

  var canvas = document.getElementById('world');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var BLOCK = 16;                 // сторона блока в пикселях
  var GRASS = ['#5fa84e', '#68b355', '#569c45'];
  var DIRT  = ['#6b4a2f', '#755234', '#5f412a'];
  var STONE = ['#8a8a8a', '#7e7e7e', '#949494'];

  var w = 0, h = 0, cols = 0, rows = 0;
  var terrain = [];               // высота колонки в блоках от низа
  var trees = [];                 // колонки, где растут деревья
  var clouds = [];
  var still = null;               // предрисованный слой неба и рельефа

  /** Детерминированный «шум»: одна и та же колонка всегда одного цвета. */
  function shade(palette, x, y) {
    return palette[(x * 7 + y * 13) % palette.length];
  }

  /** Рельеф: плавные ступени по высоте, как на равнине в игре. */
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
    // Деревья ставим на ровных участках, чтобы крона не срезала холм.
    for (var t = 3; t < cols - 3; t++) {
      if (Math.random() < 0.09 && terrain[t] === terrain[t - 1] && terrain[t] === terrain[t + 1]) {
        trees.push(t);
        t += 4;
      }
    }
  }

  /** Дерево: ствол в три блока и крона 5x3. */
  function paintTree(c, x) {
    var groundY = rows - terrain[x];
    var trunk = 3;
    for (var i = 1; i <= trunk; i++) {
      c.fillStyle = shade(['#5b4128', '#4d3721'], x, i);
      c.fillRect(x * BLOCK, (groundY - i) * BLOCK, BLOCK, BLOCK);
    }
    for (var ly = 0; ly < 3; ly++) {
      var half = ly === 0 ? 1 : 2;
      for (var lx = -half; lx <= half; lx++) {
        c.fillStyle = shade(['#3f7a34', '#4a8c3c', '#356b2c'], x + lx, ly);
        c.fillRect((x + lx) * BLOCK, (groundY - trunk - 1 - ly) * BLOCK, BLOCK, BLOCK);
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

    // Квадратное солнце с уступчатым ореолом.
    var sx = Math.round(w * 0.8 / BLOCK) * BLOCK;
    var sy = Math.round(h * 0.12 / BLOCK) * BLOCK;
    c.fillStyle = 'rgba(255, 250, 205, .4)';
    c.fillRect(sx - BLOCK, sy - BLOCK, BLOCK * 6, BLOCK * 6);
    c.fillStyle = '#fffbd0';
    c.fillRect(sx, sy, BLOCK * 4, BLOCK * 4);

    // Рельеф: трава сверху, ниже земля, глубже камень.
    for (var x = 0; x < cols; x++) {
      var top = rows - terrain[x];
      for (var y = top; y < rows; y++) {
        var depth = y - top;
        var palette = depth === 0 ? GRASS : (depth < 3 ? DIRT : STONE);
        c.fillStyle = shade(palette, x, y);
        c.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
      }
      // Тёмная кромка на верхней грани травы.
      c.fillStyle = 'rgba(0,0,0,.18)';
      c.fillRect(x * BLOCK, top * BLOCK, BLOCK, 3);
    }

    for (var t = 0; t < trees.length; t++) paintTree(c, trees[t]);
  }

  function drawClouds() {
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      var bx = Math.round(cl.x / BLOCK) * BLOCK;
      var by = Math.round(cl.y / BLOCK) * BLOCK;
      ctx.fillRect(bx, by, cl.blocks * BLOCK, cl.thick * BLOCK);
      ctx.fillRect(bx + BLOCK, by - BLOCK, (cl.blocks - 2) * BLOCK, BLOCK);
    }
  }

  function step() {
    for (var i = 0; i < clouds.length; i++) {
      var cl = clouds[i];
      cl.x += cl.v;
      if (cl.x > w + BLOCK * 6) cl.x = -cl.blocks * BLOCK * 2;
    }
  }

  function frame() {
    ctx.drawImage(still, 0, 0, w, h);
    drawClouds();
    step();
    requestAnimationFrame(frame);
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    cols = Math.ceil(w / BLOCK) + 1;
    rows = Math.ceil(h / BLOCK) + 1;
    buildTerrain();
    buildClouds();
    paintStill();
    if (reduced) { ctx.drawImage(still, 0, 0, w, h); drawClouds(); }
  }

  window.addEventListener('resize', resize);
  resize();
  if (!reduced) requestAnimationFrame(frame);
})();
