/* Звёздное поле: три слоя параллакса + редкие прыжки в гиперпространство. */
(function () {
  'use strict';

  var canvas = document.getElementById('starfield');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LAYERS = [
    { count: 90, speed: 0.02, size: 0.8, alpha: 0.45 },
    { count: 55, speed: 0.05, size: 1.3, alpha: 0.70 },
    { count: 25, speed: 0.10, size: 1.9, alpha: 1.00 }
  ];
  var stars = [];
  var streaks = [];
  var w = 0, h = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    stars = [];
    LAYERS.forEach(function (layer) {
      for (var i = 0; i < layer.count; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * layer.size + 0.3,
          a: layer.alpha * (0.4 + Math.random() * 0.6),
          v: layer.speed,
          tw: Math.random() * Math.PI * 2
        });
      }
    });
  }

  /** Луч гиперпространства — короткая белая черта, уходящая вниз. */
  function spawnStreak() {
    streaks.push({
      x: Math.random() * w,
      y: -40,
      len: 60 + Math.random() * 140,
      v: 6 + Math.random() * 10,
      a: 0.5 + Math.random() * 0.5
    });
  }

  var last = 0;
  function frame(now) {
    var dt = Math.min(now - last, 60);
    last = now;
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.y += s.v * dt;
      s.tw += 0.004 * dt;
      if (s.y > h + 2) { s.y = -2; s.x = Math.random() * w; }
      var alpha = s.a * (0.65 + 0.35 * Math.sin(s.tw));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#dfefff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var j = streaks.length - 1; j >= 0; j--) {
      var st = streaks[j];
      st.y += st.v * dt * 0.06 * 16;
      ctx.globalAlpha = st.a;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(st.x, st.y);
      ctx.lineTo(st.x, st.y - st.len);
      ctx.stroke();
      if (st.y - st.len > h) streaks.splice(j, 1);
    }

    ctx.globalAlpha = 1;
    if (Math.random() < 0.004) spawnStreak();
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();

  if (reduced) {
    // Статичное небо без движения.
    ctx.clearRect(0, 0, w, h);
    stars.forEach(function (s) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#dfefff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    requestAnimationFrame(frame);
  }
})();
