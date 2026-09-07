/* Звук: всё синтезируется через WebAudio, внешних файлов нет. */
window.SFX = (function () {
  'use strict';

  var ctx = null;
  var enabled = Store.get('sw-ttt-sound') !== 'off';

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
    /** Стук поставленного блока — ход Стива. */
    place: function () {
      tone({ type: 'sine', from: 220, to: 110, dur: 0.09, vol: 0.16 });
      noise({ dur: 0.07, vol: 0.1, freq: 700 });
    },
    /** Глухой шаг мобa — ход крипера. */
    placeMob: function () {
      tone({ type: 'triangle', from: 150, to: 80, dur: 0.13, vol: 0.15 });
      noise({ dur: 0.09, vol: 0.09, freq: 420 });
    },
    /** Подбор опыта — линия собрана. */
    orb: function () {
      tone({ type: 'square', from: 880, dur: 0.07, vol: 0.09 });
      tone({ type: 'square', from: 1320, dur: 0.09, vol: 0.08, delay: 0.08 });
    },
    /** Новый уровень — победа игрока. */
    levelUp: function () {
      [523, 784, 1047, 1568].forEach(function (f, i) {
        tone({ type: 'triangle', from: f, dur: 0.22, vol: 0.13, delay: i * 0.1 });
      });
    },
    /** Шипение и взрыв крипера — поражение. */
    explode: function () {
      noise({ dur: 0.55, vol: 0.14, freq: 900, freqTo: 3200, type: 'bandpass', swell: true });
      noise({ dur: 0.7, vol: 0.3, freq: 320, freqTo: 60, delay: 0.55 });
      tone({ type: 'sine', from: 120, to: 35, dur: 0.7, vol: 0.22, delay: 0.55 });
    },
    /**
     * Костёр: вспышка, ровный гул на всё время горения, потрескивание
     * и обрушение головёшек в конце.
     */
    fire: function (ms) {
      var seconds = (ms || 3000) / 1000;

      // Поджиг.
      noise({ dur: 0.6, vol: 0.24, freq: 260, freqTo: 2600, type: 'bandpass', swell: true });
      tone({ type: 'sawtooth', from: 80, to: 260, dur: 0.5, vol: 0.12 });

      // Гул пламени: низкий рокот и шипящий верх, оба затухают к концу.
      noise({ dur: seconds, vol: 0.18, freq: 900, freqTo: 200, type: 'lowpass' });
      noise({ dur: seconds - 0.2, vol: 0.09, freq: 1900, freqTo: 600, type: 'bandpass', delay: 0.2 });

      // Потрескивание: короткие щелчки со случайными паузами.
      for (var t = 0.12; t < seconds - 0.4; t += 0.05 + Math.random() * 0.13) {
        noise({ dur: 0.04 + Math.random() * 0.05,
                vol: 0.08 + Math.random() * 0.09,
                freq: 1400 + Math.random() * 3000,
                type: 'bandpass', delay: t });
      }

      // Блок обрушается в угли.
      tone({ type: 'sine', from: 160, to: 45, dur: 0.5, vol: 0.2, delay: seconds - 0.55 });
      noise({ dur: 0.45, vol: 0.2, freq: 500, freqTo: 90, delay: seconds - 0.55 });
    },
    /** Ничья — нейтральный сигнал. */
    draw: function () { tone({ type: 'sine', from: 440, to: 330, dur: 0.35, vol: 0.1 }); },
    /** Щелчок кнопки меню. */
    click: function () { tone({ type: 'square', from: 700, dur: 0.05, vol: 0.07 }); },
    /** Блок уже занят. */
    denied: function () { tone({ type: 'square', from: 150, to: 100, dur: 0.12, vol: 0.1 }); },

    isEnabled: function () { return enabled; },
    toggle: function () {
      enabled = !enabled;
      Store.set('sw-ttt-sound', enabled ? 'on' : 'off');
      if (enabled) { ac(); this.click(); }
      return enabled;
    }
  };
})();
