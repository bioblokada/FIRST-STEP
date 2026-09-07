/*
 * Безопасный доступ к localStorage.
 * В приватном окне, при блокировке данных сайта или внутри песочницы iframe
 * само обращение к window.localStorage бросает исключение — без этой обёртки
 * игра падала бы на старте и не запускалась вовсе.
 */
window.Store = (function () {
  'use strict';

  return {
    get: function (key) {
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; }
    }
  };
})();
