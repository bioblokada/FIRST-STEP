/* Фон: пастельный градиент, горошек и плывущие вверх сердечки со звёздочками. */
(function () {
  'use strict';

  var canvas = document.getElementById('world');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var COLORS = ['#ffa8cd', '#ff8ab8', '#ffc7de', '#ffd980', '#8fdcc2'];
  var w = 0, h = 0;
  var floaters = [];
  var dots = [];

  function rand(min, max) { return min + Math.random() * (max - min); }

  function seed() {
    floaters = [];
    var count = Math.round(Math.max(10, Math.min(26, w / 46)));
    for (var i = 0; i < count; i++) {
      floaters.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: rand(9, 22),
        v: rand(0.15, 0.45),
        sway: rand(0.4, 1.2),
        phase: Math.random() * Math.PI * 2,
        spin: rand(-0.4, 0.4),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        kind: Math.random() < 0.62 ? 'heart' : (Math.random() < 0.5 ? 'star' : 'bow'),
        alpha: rand(0.5, 0.9)
      });
    }
    dots = [];
    var gap = 74;
    for (var y = gap / 2; y < h + gap; y += gap) {
      for (var x = (y / gap % 2 ? gap / 2 : 0); x < w + gap; x += gap) {
        dots.push({ x: x, y: y, r: 4 });
      }
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

  /** Бантик: две треугольные петли и узелок — на мелком размере читается лучше эллипсов. */
  function bow(c, size) {
    var s = size / 2;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-s, -s * 0.75);
    c.lineTo(-s, s * 0.75);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(s, -s * 0.75);
    c.lineTo(s, s * 0.75);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    c.fill();
  }

  function paintBackdrop() {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffe3ef');
    g.addColorStop(0.55, '#fff1f5');
    g.addColorStop(1, '#fff9fb');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255, 168, 205, .35)';
    for (var i = 0; i < dots.length; i++) {
      ctx.beginPath();
      ctx.arc(dots[i].x, dots[i].y, dots[i].r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function paintFloaters(t) {
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
    }
    ctx.globalAlpha = 1;
  }

  function frame(t) {
    paintBackdrop();
    paintFloaters(t);
    for (var i = 0; i < floaters.length; i++) {
      var f = floaters[i];
      f.y -= f.v;
      if (f.y < -30) { f.y = h + 30; f.x = Math.random() * w; }
    }
    requestAnimationFrame(frame);
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    if (reduced) { paintBackdrop(); paintFloaters(0); }
  }

  window.addEventListener('resize', resize);
  resize();
  if (!reduced) requestAnimationFrame(frame);
})();
