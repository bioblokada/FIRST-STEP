/* Игровой контроллер: тема оформления, состояние партии, поле, счёт. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var BURN_MS = 3000;   // сколько горят клетки проигравшего
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SCORE_KEY = 'sw-ttt-score';
  var LEVEL_KEY = 'sw-ttt-level';
  var THEME_KEY = 'sw-ttt-theme';

  var state = {
    theme: 'mc',
    side: 'X',        // сторона игрока
    mode: 'ai',       // 'ai' | 'human'
    level: 1,
    board: new Array(9).fill(null),
    turn: 'X',        // первым ходит X
    over: false,
    busy: false,      // бот «думает» — ввод заблокирован
    score: { X: 0, O: 0, D: 0 }
  };

  function T() { return window.THEMES[state.theme]; }

  var boardEl = $('board');

  /* ------------------------- Тема оформления ------------------------- */

  /** Подставляет фигурку нужной темы в любой svg с <use>. */
  function setSkin(svg, mark) {
    if (!svg) return;
    var theme = T();
    svg.setAttribute('viewBox', theme.viewBox);
    svg.setAttribute('shape-rendering', theme.crisp ? 'crispEdges' : 'auto');
    var use = svg.querySelector('use');
    if (use) use.setAttribute('href', theme.skins[mark]);
  }

  function applyTheme(name, silent) {
    state.theme = window.THEMES[name] ? name : 'mc';
    var theme = T();

    document.documentElement.setAttribute('data-theme', state.theme);
    Store.set(THEME_KEY, state.theme);

    // Тексты интерфейса.
    document.querySelectorAll('[data-t]').forEach(function (el) {
      var value = theme.text[el.dataset.t];
      if (value) el.textContent = value;
    });

    // Названия уровней в обеих группах чипов.
    document.querySelectorAll('[data-level]').forEach(function (btn) {
      btn.textContent = theme.levels[Number(btn.dataset.level)];
    });
    $('level-hint').textContent = theme.levelHints[state.level];

    // Фигурки.
    setSkin($('mascot'), 'X');
    document.querySelectorAll('.side').forEach(function (btn) {
      setSkin(btn.querySelector('.side__emblem'), btn.dataset.side);
    });
    setSkin(document.querySelector('#score-x .score__emblem'), 'X');
    setSkin(document.querySelector('#score-o .score__emblem'), 'O');
    setSkin($('overlay-emblem'), 'X');
    retintMarks();

    document.querySelectorAll('[data-theme-btn]').forEach(function (btn) {
      var active = btn.dataset.themeBtn === state.theme;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', String(active));
    });

    // Заставку удаляют после старта игры — её элементов может уже не быть.
    var splash = $('splash');
    if (splash) splash.textContent = theme.splashes[Math.floor(Math.random() * theme.splashes.length)];

    SFX.setTheme(state.theme);
    World.setTheme(state.theme);

    renderScore();
    if (!silent) updateStatus();
  }

  /** Меняет фигурки уже поставленных блоков, не трогая их состояние. */
  function retintMarks() {
    for (var i = 0; i < 9; i++) {
      if (!state.board[i]) continue;
      setSkin(boardEl.children[i].querySelector('.cell__mark'), state.board[i]);
    }
  }

  /* ------------------------- Счёт ------------------------- */

  function loadScore() {
    try {
      var raw = JSON.parse(Store.get(SCORE_KEY));
      if (raw && typeof raw.X === 'number') state.score = raw;
    } catch (e) { /* повреждённые данные просто игнорируем */ }
  }

  function saveScore() { Store.set(SCORE_KEY, JSON.stringify(state.score)); }

  function renderScore() {
    $('value-x').textContent = state.score.X;
    $('value-o').textContent = state.score.O;
    $('value-d').textContent = state.score.D;

    var vsBot = state.mode === 'ai';
    var botMark = state.side === 'X' ? 'O' : 'X';
    ['X', 'O'].forEach(function (mark) {
      var suffix = vsBot ? (mark === botMark ? ' (бот)' : ' (ты)') : '';
      $('label-' + mark.toLowerCase()).textContent = T().sides[mark].short + suffix;
    });
  }

  /* ------------------------- Сложность ------------------------- */

  /**
   * Уровень выбирается и в меню, и прямо в бою: обе группы чипов помечены
   * data-level, поэтому одна функция синхронизирует их разом.
   */
  function setLevel(level) {
    state.level = level;
    document.querySelectorAll('[data-level]').forEach(function (btn) {
      var active = Number(btn.dataset.level) === level;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', String(active));
    });
    $('level-hint').textContent = T().levelHints[level];
    Store.set(LEVEL_KEY, String(level));
  }

  function loadLevel() {
    // Number(null) === 0, поэтому пустое хранилище иначе выбрало бы лёгкий уровень.
    var raw = Store.get(LEVEL_KEY);
    var saved = raw === null ? NaN : Number(raw);
    setLevel(saved === 0 || saved === 1 || saved === 2 ? saved : state.level);
  }

  /* ------------------------- Поле ------------------------- */

  function buildBoard() {
    boardEl.innerHTML = '';
    for (var i = 0; i < 9; i++) {
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.index = String(i);
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', 'Клетка ' + (i + 1) + ', свободна');
      // Боковые грани блока: передняя и две боковые — нужны при повороте поля.
      cell.innerHTML =
        '<span class="face face--front"></span>' +
        '<span class="face face--left"></span>' +
        '<span class="face face--right"></span>' +
        '<span class="mark-slot"></span>';
      cell.addEventListener('click', onCellClick);
      boardEl.appendChild(cell);
    }
  }

  function renderCell(index) {
    var cell = boardEl.children[index];
    var slot = cell.querySelector('.mark-slot');
    var mark = state.board[index];

    if (!mark) {
      slot.innerHTML = '';
      cell.className = 'cell';
      cell.disabled = false;
      cell.setAttribute('aria-label', 'Клетка ' + (index + 1) + ', свободна');
      return;
    }
    slot.innerHTML = '<svg class="cell__mark" aria-hidden="true"><use href=""></use></svg>';
    setSkin(slot.querySelector('.cell__mark'), mark);
    cell.className = 'cell is-taken cell--' + mark;
    cell.disabled = true;
    cell.setAttribute('aria-label', 'Клетка ' + (index + 1) + ', занята: ' + T().sides[mark].short);
  }

  function renderBoard() {
    for (var i = 0; i < 9; i++) renderCell(i);
  }

  /** Луч по выигрышной линии: клетки в viewBox 300×300 — центры 50/150/250. */
  function drawBeam(line) {
    var center = function (idx) {
      return { x: (idx % 3) * 100 + 50, y: Math.floor(idx / 3) * 100 + 50 };
    };
    var a = center(line[0]);
    var b = center(line[2]);
    var lineEl = $('saber-line');
    lineEl.setAttribute('x1', a.x);
    lineEl.setAttribute('y1', a.y);
    lineEl.setAttribute('x2', b.x);
    lineEl.setAttribute('y2', b.y);
    $('saber').classList.add('is-on');
    line.forEach(function (i) { boardEl.children[i].classList.add('is-win'); });
  }

  function clearBeam() {
    $('saber').classList.remove('is-on');
    Array.prototype.forEach.call(boardEl.children, function (c) { c.classList.remove('is-win'); });
  }

  /* ------------------------- Статус ------------------------- */

  function setStatus(text, mark) {
    var el = $('status');
    el.textContent = text;
    el.className = 'status' + (mark ? ' status--' + mark.toLowerCase() : '');
  }

  function updateStatus() {
    if (state.over) return;
    var s = T().status;
    if (state.mode === 'ai' && state.turn !== state.side) setStatus(s.botThinking, state.turn);
    else if (state.mode === 'ai') setStatus(s.yourTurn[state.turn], state.turn);
    else setStatus(s.turn + T().sides[state.turn].name, state.turn);
  }

  /* ------------------------- Ход ------------------------- */

  function onCellClick(event) {
    play(Number(event.currentTarget.dataset.index));
  }

  function play(index) {
    if (state.over || state.busy) return;
    if (state.board[index] !== null) { SFX.denied(); return; }
    if (state.mode === 'ai' && state.turn !== state.side) return;
    commit(index, state.turn);
  }

  function commit(index, mark) {
    state.board[index] = mark;
    renderCell(index);
    mark === 'X' ? SFX.place() : SFX.placeMob();

    var line = AI.winningLine(state.board, mark);
    if (line) return finish(mark, line);
    if (AI.isFull(state.board)) return finish(null, null);

    state.turn = mark === 'X' ? 'O' : 'X';
    updateStatus();

    if (state.mode === 'ai' && state.turn !== state.side) scheduleBot();
  }

  function scheduleBot() {
    state.busy = true;
    var bot = state.turn;
    setTimeout(function () {
      state.busy = false;
      if (state.over) return;
      commit(AI.move(state.board.slice(), bot, state.level), bot);
    }, 420 + Math.random() * 350);
  }

  /* ------------------------- Финал раунда ------------------------- */

  function finish(winner, line) {
    state.over = true;

    if (winner) {
      state.score[winner]++;
      drawBeam(line);
      SFX.orb();
      var playerWon = state.mode === 'human' || winner === state.side;
      setTimeout(playerWon ? SFX.levelUp : SFX.explode, 320);
      setStatus(T().sides[winner].name + T().status.win, winner);
    } else {
      state.score.D++;
      SFX.draw();
      setStatus(T().status.draw, null);
    }

    saveScore();
    renderScore();

    if (winner) burnLoser(winner, function () { showOverlay(winner); });
    else setTimeout(function () { showOverlay(null); }, 500);
  }

  /** Клетки проигравшего вспыхивают и за три секунды выгорают дотла. */
  function burnLoser(winner, onDone) {
    var loser = winner === 'X' ? 'O' : 'X';
    // Координаты считаем от холста: он выступает выше поля, а не совпадает с ним.
    var origin = $('fire').getBoundingClientRect();
    var rects = [];

    for (var i = 0; i < 9; i++) {
      if (state.board[i] !== loser) continue;
      var cell = boardEl.children[i];
      cell.classList.add('is-burning');
      var r = cell.getBoundingClientRect();
      rects.push({ x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height });
    }

    if (!rects.length || REDUCED) { setTimeout(onDone, 600); return; }
    SFX.fire(BURN_MS);
    Fire.burn($('fire'), rects, BURN_MS, onDone);
  }

  function showOverlay(winner) {
    var o = T().overlay;
    if (winner) {
      $('overlay-eyebrow').textContent = o.eyebrow;
      $('overlay-title').textContent = T().sides[winner].name + T().status.win;
      var lines = T().winText[winner];
      $('overlay-text').textContent = lines[Math.floor(Math.random() * lines.length)];
      setSkin($('overlay-emblem'), winner);
    } else {
      $('overlay-eyebrow').textContent = o.drawEyebrow;
      $('overlay-title').textContent = o.drawTitle;
      $('overlay-text').textContent = o.drawText;
      setSkin($('overlay-emblem'), 'X');
    }
    $('overlay').hidden = false;
    $('overlay-again').focus();
  }

  function hideOverlay() { $('overlay').hidden = true; }

  /* ------------------------- Раунд и экраны ------------------------- */

  function newRound() {
    hideOverlay();
    clearBeam();
    Fire.stop();
    state.board = new Array(9).fill(null);
    state.turn = 'X';
    state.over = false;
    state.busy = false;
    renderBoard();
    updateStatus();
    if (state.mode === 'ai' && state.side === 'O') scheduleBot();
  }

  function showSetup() {
    hideOverlay();
    $('game').hidden = true;
    $('setup').hidden = false;
  }

  function startGame() {
    $('setup').hidden = true;
    $('game').hidden = false;
    $('level-bar').hidden = state.mode !== 'ai';
    renderScore();
    newRound();
  }

  /* ------------------------- Настройки ------------------------- */

  function bindSetup() {
    document.querySelectorAll('.side').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.side = btn.dataset.side;
        document.querySelectorAll('.side').forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        SFX.click();
      });
    });

    document.querySelectorAll('[data-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.mode = btn.dataset.mode;
        document.querySelectorAll('[data-mode]').forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-checked', String(active));
        });
        $('difficulty-block').hidden = state.mode !== 'ai';
        SFX.click();
      });
    });

    document.querySelectorAll('[data-level]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLevel(Number(btn.dataset.level));
        SFX.click();
        if (!$('game').hidden && !state.over) {
          setStatus('Сложность: ' + T().levels[state.level], null);
          setTimeout(updateStatus, 1400);
        }
      });
    });

    document.querySelectorAll('[data-theme-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(btn.dataset.themeBtn);
        SFX.click();
      });
    });
  }

  /* ------------------------- Общие обработчики ------------------------- */

  function bindControls() {
    $('start-game').addEventListener('click', function () { SFX.click(); startGame(); });
    $('restart').addEventListener('click', function () { SFX.click(); newRound(); });
    $('back').addEventListener('click', function () { SFX.click(); showSetup(); });
    $('reset-view').addEventListener('click', function () { SFX.click(); Orbit.reset(); });
    $('reset-score').addEventListener('click', function () {
      state.score = { X: 0, O: 0, D: 0 };
      saveScore();
      renderScore();
      SFX.click();
    });
    $('overlay-again').addEventListener('click', function () { SFX.click(); newRound(); });
    $('overlay-menu').addEventListener('click', function () { SFX.click(); showSetup(); });

    $('theme-toggle').addEventListener('click', function () {
      applyTheme(state.theme === 'mc' ? 'kitty' : 'mc');
      SFX.click();
    });

    var sound = $('sound-toggle');
    sound.setAttribute('aria-pressed', String(SFX.isEnabled()));
    sound.addEventListener('click', function () {
      var on = SFX.toggle();
      sound.setAttribute('aria-pressed', String(on));
      sound.setAttribute('aria-label', on ? 'Выключить звук' : 'Включить звук');
    });

    document.addEventListener('keydown', function (e) {
      if ($('game').hidden) return;
      if (e.key >= '1' && e.key <= '9') { play(Number(e.key) - 1); return; }
      if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') newRound();
      if (e.key === 'Escape' && !$('overlay').hidden) hideOverlay();
    });
  }

  /* ------------------------- Заставка ------------------------- */

  function enterWorld() {
    var menu = $('intro');
    if (!menu || menu.classList.contains('is-leaving')) return;
    SFX.click();
    menu.classList.add('is-leaving');
    $('app').hidden = false;
    setTimeout(function () { menu.remove(); }, 350);
  }

  function bindMenu() {
    var menu = $('intro');
    if (!menu) { $('app').hidden = false; return; }
    $('enter-world').addEventListener('click', enterWorld);
    document.addEventListener('keydown', function (e) {
      if (!$('intro') || $('intro').classList.contains('is-leaving')) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterWorld(); }
    });
  }

  /* ------------------------- Старт ------------------------- */

  bindMenu();          // первым делом — чтобы кнопка «Начать игру» жила всегда
  buildBoard();
  World.init($('world'), Store.get(THEME_KEY) === 'kitty' ? 'kitty' : 'mc');
  Orbit.attach($('board-wrap'));
  loadScore();
  loadLevel();
  bindSetup();
  bindControls();
  applyTheme(Store.get(THEME_KEY) || 'mc', true);
})();
