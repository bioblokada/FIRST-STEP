/* Мод-бот: минимакс с альфа-бета отсечением и тремя уровнями сложности. */
window.AI = (function () {
  'use strict';

  var LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  /** Победившая линия для символа, либо null. */
  function winningLine(board, mark) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (board[l[0]] === mark && board[l[1]] === mark && board[l[2]] === mark) return l;
    }
    return null;
  }

  function isFull(board) {
    return board.every(function (c) { return c !== null; });
  }

  function free(board) {
    var out = [];
    for (var i = 0; i < 9; i++) if (board[i] === null) out.push(i);
    return out;
  }

  function other(mark) { return mark === 'X' ? 'O' : 'X'; }

  /**
   * Оценка позиции с точки зрения `me`.
   * Чем быстрее победа, тем выше балл — дроид не тянет с добиванием.
   */
  function minimax(board, me, turn, depth, alpha, beta) {
    if (winningLine(board, me)) return 10 - depth;
    if (winningLine(board, other(me))) return depth - 10;
    if (isFull(board)) return 0;

    var moves = free(board);
    var best;

    if (turn === me) {
      best = -Infinity;
      for (var i = 0; i < moves.length; i++) {
        board[moves[i]] = turn;
        best = Math.max(best, minimax(board, me, other(turn), depth + 1, alpha, beta));
        board[moves[i]] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    } else {
      best = Infinity;
      for (var j = 0; j < moves.length; j++) {
        board[moves[j]] = turn;
        best = Math.min(best, minimax(board, me, other(turn), depth + 1, alpha, beta));
        board[moves[j]] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }

  /** Идеальный ход: перебираем все свободные клетки и берём лучший балл. */
  function bestMove(board, me) {
    var moves = free(board);
    var bestScore = -Infinity;
    var best = moves[0];
    for (var i = 0; i < moves.length; i++) {
      board[moves[i]] = me;
      var score = minimax(board, me, other(me), 0, -Infinity, Infinity);
      board[moves[i]] = null;
      if (score > bestScore) { bestScore = score; best = moves[i]; }
    }
    return best;
  }

  function randomMove(board) {
    var moves = free(board);
    return moves[Math.floor(Math.random() * moves.length)];
  }

  /** Ход, который завершает или блокирует линию — «жадная» тактика падавана. */
  function tacticalMove(board, me) {
    var moves = free(board);
    var i;
    for (i = 0; i < moves.length; i++) {           // выиграть сейчас
      board[moves[i]] = me;
      var win = winningLine(board, me);
      board[moves[i]] = null;
      if (win) return moves[i];
    }
    for (i = 0; i < moves.length; i++) {           // не дать выиграть сопернику
      board[moves[i]] = other(me);
      var block = winningLine(board, other(me));
      board[moves[i]] = null;
      if (block) return moves[i];
    }
    return null;
  }

  var LEVELS = [
    { name: 'Мирный',     mistake: 1.00 },  // только тактика и случайность
    { name: 'Нормальный', mistake: 0.28 },  // иногда зевает
    { name: 'Хардкор',    mistake: 0.00 }   // непобедим
  ];

  return {
    LINES: LINES,
    winningLine: winningLine,
    isFull: isFull,
    free: free,
    levelName: function (level) { return LEVELS[level].name; },

    /** Ход бота для выбранного уровня сложности. */
    move: function (board, me, level) {
      var cfg = LEVELS[level] || LEVELS[1];
      if (level === 0) {
        // Мирный: половину ходов делает наугад, иначе — простая тактика.
        if (Math.random() < 0.5) return randomMove(board);
        var t = tacticalMove(board, me);
        return t === null ? randomMove(board) : t;
      }
      if (Math.random() < cfg.mistake) {
        var tactical = tacticalMove(board, me);
        return tactical === null ? randomMove(board) : tactical;
      }
      return bestMove(board, me);
    }
  };
})();
