/*
 * Вращение поля мышкой или пальцем.
 * Углы живут в CSS-переменных --rot-x / --rot-y на обёртке поля,
 * поэтому и плита, и луч по выигрышной линии поворачиваются вместе.
 */
window.Orbit = (function () {
  'use strict';

  var DEFAULT_X = 34;
  var DEFAULT_Y = 0;
  var LIMIT_X = [2, 74];        // ниже — вид «сверху вниз», выше — почти с ребра
  var LIMIT_Y = [-52, 52];
  var DRAG_SLOP = 6;            // меньше этого — считаем кликом, а не перетаскиванием

  var wrap = null;
  var rotX = DEFAULT_X;
  var rotY = DEFAULT_Y;
  var dragging = false;
  var moved = false;
  var startX = 0, startY = 0, baseX = 0, baseY = 0;
  var pointerId = null;

  function clamp(v, range) { return Math.max(range[0], Math.min(range[1], v)); }

  function apply() {
    wrap.style.setProperty('--rot-x', rotX.toFixed(2) + 'deg');
    wrap.style.setProperty('--rot-y', rotY.toFixed(2) + 'deg');
  }

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    moved = false;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    baseX = rotX;
    baseY = rotY;
    wrap.classList.remove('is-animating');
    wrap.classList.add('is-dragging');
  }

  function onMove(e) {
    if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if (!moved && Math.abs(dx) + Math.abs(dy) > DRAG_SLOP) {
      moved = true;
      // Захватываем указатель только когда стало ясно, что это перетаскивание,
      // иначе обычный клик по клетке не дошёл бы до кнопки.
      if (wrap.setPointerCapture && e.pointerId !== undefined) {
        try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
      }
    }
    if (!moved) return;
    rotY = clamp(baseY + dx * 0.4, LIMIT_Y);
    rotX = clamp(baseX - dy * 0.35, LIMIT_X);
    apply();
    e.preventDefault();
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    pointerId = null;
    wrap.classList.remove('is-dragging');
  }

  /** Клик после перетаскивания не должен ставить фигурку. */
  function onClickCapture(e) {
    if (!moved) return;
    moved = false;
    e.stopPropagation();
    e.preventDefault();
  }

  return {
    attach: function (el) {
      wrap = el;
      apply();
      wrap.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      wrap.addEventListener('click', onClickCapture, true);
      wrap.addEventListener('dblclick', function () { window.Orbit.reset(); });
    },

    /** Плавно возвращает поле в исходный ракурс. */
    reset: function () {
      if (!wrap) return;
      wrap.classList.add('is-animating');
      rotX = DEFAULT_X;
      rotY = DEFAULT_Y;
      apply();
      setTimeout(function () { wrap.classList.remove('is-animating'); }, 400);
    },

    isDefault: function () { return rotX === DEFAULT_X && rotY === DEFAULT_Y; }
  };
})();
