/* Костёр: пиксельные частицы огня и дыма над указанными клетками. */
window.Fire = (function () {
  'use strict';

  var canvas = null;
  var ctx = null;
  var particles = [];
  var areas = [];
  var raf = 0;
  var startedAt = 0;
  var duration = 0;
  var done = null;

  var FLAME = ['#fff3b0', '#ffd54a', '#ff9c1a', '#ff5c00', '#c62f00'];
  var SMOKE = ['#6b6259', '#514a43', '#3b3630'];

  function rand(min, max) { return min + Math.random() * (max - min); }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  /** Пламя рождается по всей ширине клетки, у её нижней трети. */
  function spawnFlame(area) {
    particles.push({
      x: rand(area.x + 2, area.x + area.w - 2),
      y: rand(area.y + area.h * 0.35, area.y + area.h * 0.95),
      vx: rand(-0.22, 0.22),
      vy: rand(-1.7, -0.6),
      size: rand(6, 13),
      life: 0,
      max: rand(420, 900),
      kind: 'flame'
    });
  }

  function spawnSmoke(area) {
    particles.push({
      x: rand(area.x + 4, area.x + area.w - 4),
      y: rand(area.y + area.h * 0.2, area.y + area.h * 0.7),
      vx: rand(-0.35, 0.35),
      vy: rand(-0.9, -0.35),
      size: rand(7, 14),
      life: 0,
      max: rand(700, 1300),
      kind: 'smoke'
    });
  }

  function step(now) {
    var elapsed = now - startedAt;
    var progress = Math.min(1, elapsed / duration);
    var dt = 16;

    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    // Пламя разгорается, к концу затухает и сменяется дымом.
    var flameRate = progress < 0.12 ? progress / 0.12
                  : progress < 0.62 ? 1
                  : Math.max(0, 1 - (progress - 0.62) / 0.28);
    if (elapsed < duration) {
      for (var a = 0; a < areas.length; a++) {
        var count = Math.round(flameRate * 8);
        for (var i = 0; i < count; i++) spawnFlame(areas[a]);
        if (progress > 0.3 && Math.random() < 0.5 * (1 - flameRate * 0.5)) spawnSmoke(areas[a]);
      }
    }

    // Раскалённое основание: тёплое свечение по низу каждой горящей клетки.
    ctx.globalCompositeOperation = 'lighter';
    for (var g = 0; g < areas.length && elapsed < duration; g++) {
      var ar = areas[g];
      var glow = ctx.createLinearGradient(0, ar.y + ar.h, 0, ar.y + ar.h * 0.25);
      glow.addColorStop(0, 'rgba(255, 190, 60, ' + (0.5 * flameRate).toFixed(3) + ')');
      glow.addColorStop(1, 'rgba(255, 80, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(ar.x, ar.y + ar.h * 0.25, ar.w, ar.h * 0.75);
    }

    for (var p = particles.length - 1; p >= 0; p--) {
      var part = particles[p];
      part.life += dt;
      if (part.life > part.max) { particles.splice(p, 1); continue; }

      part.x += part.vx;
      part.y += part.vy;
      part.vy -= 0.012;                       // горячий воздух ускоряет частицу вверх
      part.vx += rand(-0.06, 0.06);

      var t = part.life / part.max;
      var size = Math.max(2, part.size * (1 - t * 0.75));
      var px = Math.round(part.x / 3) * 3;    // «пиксельная» сетка
      var py = Math.round(part.y / 3) * 3;

      if (part.kind === 'flame') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - t * 0.85;
        ctx.fillStyle = FLAME[Math.min(FLAME.length - 1, Math.floor(t * FLAME.length))];
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = (1 - t) * 0.3;
        ctx.fillStyle = SMOKE[Math.min(SMOKE.length - 1, Math.floor(t * SMOKE.length))];
      }
      ctx.fillRect(px, py, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (elapsed >= duration && done) {
      var cb = done;
      done = null;
      cb();
    }
    if (elapsed < duration || particles.length) raf = requestAnimationFrame(step);
    else stop();
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    particles = [];
    areas = [];
    if (ctx) ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }

  return {
    /**
     * Поджигает прямоугольники rects (координаты внутри canvas, в CSS-пикселях).
     * Через ms вызывает onDone — даже если частицы ещё догорают.
     */
    burn: function (el, rects, ms, onDone) {
      canvas = el;
      ctx = canvas.getContext('2d');
      stop();
      resize();
      areas = rects;
      duration = ms;
      startedAt = performance.now();
      done = onDone || null;
      raf = requestAnimationFrame(step);
    },
    stop: function () {
      done = null;
      stop();
    }
  };
})();
