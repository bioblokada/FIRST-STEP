/* Звук: мягкие тоны, всё синтезируется через WebAudio — внешних файлов нет. */
window.SFX = (function () {
  'use strict';

  var ctx = null;
  var enabled = localStorage.getItem('sw-ttt-sound') !== 'off';

  function ac() {
    if (!ctx) {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Одиночный тон с огибающей. */
  function tone(opts) {
    var a = enabled && ac();
    if (!a) return;
    var t0 = a.currentTime + (opts.delay || 0);
    var osc = a.createOscillator();
    var gain = a.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.from, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(opts.vol || 0.2, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  /** Шум с фильтром — основа для стука блока, шипения и взрыва. */
  function noise(opts) {
    var a = enabled && ac();
    if (!a) return;
    var t0 = a.currentTime + (opts.delay || 0);
    var len = Math.max(1, Math.floor(a.sampleRate * opts.dur));
    var buf = a.createBuffer(1, len, a.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      var env = opts.swell ? i / len : 1 - i / len;   // шипение нарастает, стук затухает
      data[i] = (Math.random() * 2 - 1) * env;
    }
    var src = a.createBufferSource();
    src.buffer = buf;
    var filter = a.createBiquadFilter();
    filter.type = opts.type || 'lowpass';
    filter.frequency.setValueAtTime(opts.freq || 800, t0);
    if (opts.freqTo) filter.frequency.linearRampToValueAtTime(opts.freqTo, t0 + opts.dur);
    var gain = a.createGain();
    gain.gain.value = opts.vol || 0.2;
    src.connect(filter).connect(gain).connect(a.destination);
    src.start(t0);
  }

  return {
    /** Мягкий «пуф» — ход Кошечки. */
    place: function () {
      tone({ type: 'sine', from: 620, to: 940, dur: 0.12, vol: 0.14 });
      tone({ type: 'triangle', from: 1240, dur: 0.06, vol: 0.05, delay: 0.02 });
    },
    /** Тот же «пуф», но ниже — ход Зайки. */
    placeMob: function () {
      tone({ type: 'sine', from: 480, to: 720, dur: 0.13, vol: 0.14 });
      tone({ type: 'triangle', from: 960, dur: 0.06, vol: 0.05, delay: 0.02 });
    },
    /** Колокольчик — линия собрана. */
    orb: function () {
      tone({ type: 'sine', from: 1046, dur: 0.16, vol: 0.1 });
      tone({ type: 'sine', from: 1568, dur: 0.2, vol: 0.08, delay: 0.09 });
    },
    /** Радостная трель — победа. */
    levelUp: function () {
      [659, 784, 988, 1319, 1568].forEach(function (f, i) {
        tone({ type: 'sine', from: f, dur: 0.26, vol: 0.11, delay: i * 0.09 });
        tone({ type: 'triangle', from: f * 2, dur: 0.14, vol: 0.04, delay: i * 0.09 });
      });
    },
    /** Огорчённое «у-у» — поражение. */
    explode: function () {
      tone({ type: 'sine', from: 520, to: 300, dur: 0.4, vol: 0.12 });
      tone({ type: 'sine', from: 390, to: 220, dur: 0.5, vol: 0.1, delay: 0.28 });
    },
    /** Ничья — спокойный аккорд. */
    draw: function () {
      tone({ type: 'sine', from: 587, dur: 0.35, vol: 0.09 });
      tone({ type: 'sine', from: 880, dur: 0.35, vol: 0.07, delay: 0.05 });
    },
    /** Щелчок по кнопке. */
    click: function () { tone({ type: 'sine', from: 900, to: 1200, dur: 0.06, vol: 0.07 }); },
    /** Клетка уже занята. */
    denied: function () { tone({ type: 'sine', from: 330, to: 240, dur: 0.14, vol: 0.09 }); },

    isEnabled: function () { return enabled; },
    toggle: function () {
      enabled = !enabled;
      localStorage.setItem('sw-ttt-sound', enabled ? 'on' : 'off');
      if (enabled) { ac(); this.click(); }
      return enabled;
    }
  };
})();
