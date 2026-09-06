/* Звук: всё синтезируется через WebAudio, внешних файлов нет. */
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
    gain.gain.exponentialRampToValueAtTime(opts.vol || 0.2, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  /** Шумовой всплеск — для «взрыва»/помех. */
  function noise(dur, vol, freq) {
    var a = enabled && ac();
    if (!a) return;
    var len = Math.floor(a.sampleRate * dur);
    var buf = a.createBuffer(1, len, a.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = a.createBufferSource();
    src.buffer = buf;
    var filter = a.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq || 900;
    var gain = a.createGain();
    gain.gain.value = vol || 0.2;
    src.connect(filter).connect(gain).connect(a.destination);
    src.start();
  }

  return {
    /** Выстрел бластера — ход повстанцев. */
    blaster: function () { tone({ type: 'square', from: 1400, to: 180, dur: 0.16, vol: 0.13 }); },
    /** Глухой залп турболазера — ход Империи. */
    turbo: function () { tone({ type: 'sawtooth', from: 700, to: 90, dur: 0.22, vol: 0.12 }); },
    /** Зажигание светового меча. */
    saber: function () {
      tone({ type: 'sawtooth', from: 90, to: 260, dur: 0.35, vol: 0.1 });
      tone({ type: 'sine', from: 180, to: 420, dur: 0.5, vol: 0.08, delay: 0.05 });
    },
    /** Фанфара победы. */
    victory: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        tone({ type: 'triangle', from: f, dur: 0.28, vol: 0.14, delay: i * 0.11 });
      });
    },
    /** Имперский марш-мотив на поражение. */
    defeat: function () {
      [196, 196, 196, 155].forEach(function (f, i) {
        tone({ type: 'sawtooth', from: f, dur: 0.3, vol: 0.13, delay: i * 0.2 });
      });
      noise(0.5, 0.1, 400);
    },
    /** Ничья — нейтральный сигнал. */
    draw: function () { tone({ type: 'sine', from: 440, to: 330, dur: 0.4, vol: 0.1 }); },
    /** Клик по интерфейсу. */
    click: function () { tone({ type: 'square', from: 900, to: 600, dur: 0.06, vol: 0.06 }); },
    /** Отказ — занятая клетка. */
    denied: function () { tone({ type: 'square', from: 160, to: 110, dur: 0.12, vol: 0.1 }); },

    isEnabled: function () { return enabled; },
    toggle: function () {
      enabled = !enabled;
      localStorage.setItem('sw-ttt-sound', enabled ? 'on' : 'off');
      if (enabled) { ac(); this.click(); }
      return enabled;
    }
  };
})();
