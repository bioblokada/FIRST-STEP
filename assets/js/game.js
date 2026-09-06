/* Игровой контроллер: состояние партии, отрисовка поля, счёт и сценарии. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var SIDES = {
    X: { name: 'Альянс повстанцев', short: 'Повстанцы', emblem: '#emb-rebel',  mod: 'rebel'  },
    O: { name: 'Галактическая Империя', short: 'Империя', emblem: '#emb-empire', mod: 'empire' }
  };

  var WIN_TEXT = {
    X: ['Звезда Смерти уничтожена.', 'Флот Империи отступает к Внешнему кольцу.', 'Сила была на твоей стороне.'],
    O: ['Порядок восстановлен во всей галактике.', 'База повстанцев обращена в пыль.', 'Тёмная сторона оказалась сильнее.']
  };

  var LEVEL_HINTS = [
    'Только что собран на Татуине: ходит почти наугад.',
    'Иногда ошибается — у него ещё нет полного доступа к Силе.',
    'Просчитывает партию до конца. Победить его нельзя, ничья — уже подвиг.'
  ];

  var state = {
    side: 'X',        // сторона игрока
    mode: 'ai',       // 'ai' | 'human'
    level: 1,
    board: new Array(9).fill(null),
    turn: 'X',        // ходят всегда первыми повстанцы
    over: false,
    busy: false,      // дроид «думает» — ввод заблокирован
    score: { X: 0, O: 0, D: 0 }
  };

  /* ------------------------- Счёт ------------------------- */

  var SCORE_KEY = 'sw-ttt-score';
  var LEVEL_KEY = 'sw-ttt-level';

  function loadScore() {
    try {
      var raw = JSON.parse(localStorage.getItem(SCORE_KEY));
      if (raw && typeof raw.X === 'number') state.score = raw;
    } catch (e) { /* повреждённые данные просто игнорируем */ }
  }

  function saveScore() {
    try { localStorage.setItem(SCORE_KEY, JSON.stringify(state.score)); } catch (e) {}
  }

  function renderScore() {
    $('value-x').textContent = state.score.X;
    $('value-o').textContent = state.score.O;
    $('value-d').textContent = state.score.D;

    var opponentIsDroid = state.mode === 'ai';
    var droidMark = state.side === 'X' ? 'O' : 'X';
    ['X', 'O'].forEach(function (mark) {
      var label = $('label-' + mark.toLowerCase());
      var suffix = '';
      if (opponentIsDroid) suffix = mark === droidMark ? ' (дроид)' : ' (ты)';
      label.textContent = SIDES[mark].short + suffix;
    });
  }

  /* ------------------------- Уровень дроида ------------------------- */

  /**
   * Уровень выбирается и в меню, и прямо в бою: обе группы чипов помечены
   * data-level, поэтому одна функция синхронизирует их разом.
   * Смена посреди партии действует со следующего хода дроида.
   */
  function setLevel(level) {
    state.level = level;
    document.querySelectorAll('[data-level]').forEach(function (btn) {
      var active = Number(btn.dataset.level) === level;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', String(active));
    });
    $('level-hint').textContent = LEVEL_HINTS[level];
    try { localStorage.setItem(LEVEL_KEY, String(level)); } catch (e) {}
  }

  function loadLevel() {
    var saved = Number(localStorage.getItem(LEVEL_KEY));
    setLevel(saved === 0 || saved === 1 || saved === 2 ? saved : state.level);
  }

  /* ------------------------- Поле ------------------------- */

  var boardEl = $('board');

  function buildBoard() {
    boardEl.innerHTML = '';
    for (var i = 0; i < 9; i++) {
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.index = String(i);
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', 'Сектор ' + (i + 1) + ', свободен');
      cell.addEventListener('click', onCellClick);
      boardEl.appendChild(cell);
    }
  }

  function renderCell(index) {
    var cell = boardEl.children[index];
    var mark = state.board[index];
    if (!mark) {
      cell.innerHTML = '';
      cell.classList.remove('is-taken');
      cell.setAttribute('aria-label', 'Сектор ' + (index + 1) + ', свободен');
      cell.disabled = false;
      return;
    }
    cell.innerHTML =
      '<svg class="cell__mark cell__mark--' + mark + '" viewBox="0 0 100 100" aria-hidden="true">' +
      '<use href="' + SIDES[mark].emblem + '"></use></svg>';
    cell.classList.add('is-taken');
    cell.disabled = true;
    cell.setAttribute('aria-label', 'Сектор ' + (index + 1) + ', занят: ' + SIDES[mark].short);
  }

  function renderBoard() {
    for (var i = 0; i < 9; i++) renderCell(i);
  }

  /** Луч по выигрышной линии: клетки в viewBox 300×300 — центры 50/150/250. */
  function drawSaber(line, mark) {
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
    var saber = $('saber');
    saber.classList.toggle('is-empire', mark === 'O');
    saber.classList.add('is-on');

    line.forEach(function (i) { boardEl.children[i].classList.add('is-win'); });
  }

  function clearSaber() {
    $('saber').classList.remove('is-on', 'is-empire');
    Array.prototype.forEach.call(boardEl.children, function (c) { c.classList.remove('is-win'); });
  }

  /* ------------------------- Статус ------------------------- */

  function setStatus(text, mark) {
    var el = $('status');
    el.textContent = text;
    el.className = 'status' + (mark ? ' status--' + SIDES[mark].mod : '');
  }

  function updateStatus() {
    if (state.over) return;
    if (state.mode === 'ai' && state.turn !== state.side) {
      setStatus('Дроид просчитывает варианты…', state.turn);
    } else if (state.mode === 'ai') {
      setStatus('Твой ход, ' + SIDES[state.turn].short.toLowerCase(), state.turn);
    } else {
      setStatus('Ход: ' + SIDES[state.turn].name, state.turn);
    }
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
    mark === 'X' ? SFX.blaster() : SFX.turbo();

    var line = AI.winningLine(state.board, mark);
    if (line) return finish(mark, line);
    if (AI.isFull(state.board)) return finish(null, null);

    state.turn = mark === 'X' ? 'O' : 'X';
    updateStatus();

    if (state.mode === 'ai' && state.turn !== state.side) scheduleDroid();
  }

  function scheduleDroid() {
    state.busy = true;
    var droid = state.turn;
    setTimeout(function () {
      state.busy = false;
      if (state.over) return;
      commit(AI.move(state.board.slice(), droid, state.level), droid);
    }, 420 + Math.random() * 350);
  }

  /* ------------------------- Финал раунда ------------------------- */

  function finish(winner, line) {
    state.over = true;

    if (winner) {
      state.score[winner]++;
      drawSaber(line, winner);
      SFX.saber();
      var playerWon = state.mode === 'human' || winner === state.side;
      setTimeout(playerWon ? SFX.victory : SFX.defeat, 380);
      setStatus(winner === 'X' ? 'Победа Альянса!' : 'Империя торжествует!', winner);
    } else {
      state.score.D++;
      SFX.draw();
      setStatus('Равновесие Силы', null);
    }

    saveScore();
    renderScore();
    setTimeout(function () { showOverlay(winner); }, winner ? 900 : 500);
  }

  function showOverlay(winner) {
    var overlay = $('overlay');
    var title = $('overlay-title');
    var text = $('overlay-text');
    var emblem = $('overlay-emblem').querySelector('use');

    overlay.className = 'overlay';
    if (winner) {
      overlay.classList.add(winner === 'O' ? 'overlay--empire' : 'overlay--rebel');
      title.textContent = winner === 'X' ? 'Победа Альянса!' : 'Империя торжествует!';
      var lines = WIN_TEXT[winner];
      text.textContent = lines[Math.floor(Math.random() * lines.length)];
      emblem.setAttribute('href', SIDES[winner].emblem);
    } else {
      overlay.classList.add('overlay--draw');
      title.textContent = 'Равновесие Силы';
      text.textContent = 'Ни одна из сторон не уступила. Девять секторов остались нейтральными.';
      emblem.setAttribute('href', '#emb-rebel');
    }
    overlay.hidden = false;
    $('overlay-again').focus();
  }

  function hideOverlay() { $('overlay').hidden = true; }

  /* ------------------------- Раунд и экраны ------------------------- */

  function newRound() {
    hideOverlay();
    clearSaber();
    state.board = new Array(9).fill(null);
    state.turn = 'X';
    state.over = false;
    state.busy = false;
    renderBoard();
    updateStatus();
    if (state.mode === 'ai' && state.side === 'O') scheduleDroid();
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
    Array.prototype.forEach.call(document.querySelectorAll('.side'), function (btn) {
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
          setStatus('Дроид перепрошит: ' + AI.levelName(state.level), null);
          setTimeout(updateStatus, 1400);
        }
      });
    });
  }

  /* ------------------------- Общие обработчики ------------------------- */

  function bindControls() {
    $('start-game').addEventListener('click', function () { SFX.click(); startGame(); });
    $('restart').addEventListener('click', function () { SFX.click(); newRound(); });
    $('back').addEventListener('click', function () { SFX.click(); showSetup(); });
    $('reset-score').addEventListener('click', function () {
      state.score = { X: 0, O: 0, D: 0 };
      saveScore();
      renderScore();
      SFX.click();
    });
    $('overlay-again').addEventListener('click', function () { SFX.click(); newRound(); });
    $('overlay-menu').addEventListener('click', function () { SFX.click(); showSetup(); });

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

  /* ------------------------- Вступление ------------------------- */

  function endIntro() {
    var intro = $('intro');
    if (!intro || intro.classList.contains('is-leaving')) return;
    intro.classList.add('is-leaving');
    $('app').hidden = false;
    setTimeout(function () { intro.remove(); }, 800);
  }

  function bindIntro() {
    var intro = $('intro');
    if (!intro) { $('app').hidden = false; return; }
    $('skip-intro').addEventListener('click', endIntro);
    intro.addEventListener('click', function (e) {
      if (e.target.id !== 'skip-intro') endIntro();
    });
    var crawl = intro.querySelector('.intro__crawl');
    crawl.addEventListener('animationend', endIntro);
    // Страховка, если анимация не запустилась (reduced motion, фоновая вкладка).
    setTimeout(endIntro, 20000);
  }

  /* ------------------------- Старт ------------------------- */

  loadScore();
  loadLevel();
  buildBoard();
  bindSetup();
  bindControls();
  bindIntro();
  renderScore();
})();
