(function () {
  'use strict';

  const SIZE = 4;
  const CELL_COUNT = SIZE * SIZE;
  const WIN_VALUE = 2048;
  const STORAGE_KEY_BEST = '2048-best';

  let grid = [];
  let score = 0;
  let best = 0;
  let won = false;
  let gameOver = false;

  const $score = document.getElementById('score');
  const $best = document.getElementById('best');
  const $tilesContainer = document.getElementById('tiles-container');
  const $overlayWin = document.getElementById('overlay-win');
  const $overlayGameOver = document.getElementById('overlay-gameover');

  function loadBest() {
    try {
      const v = localStorage.getItem(STORAGE_KEY_BEST);
      best = v ? Math.max(0, parseInt(v, 10)) : 0;
    } catch (_) {
      best = 0;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(STORAGE_KEY_BEST, String(best));
    } catch (_) {}
  }

  function getEmptyIndices() {
    const indices = [];
    for (let i = 0; i < CELL_COUNT; i++) {
      if (grid[i] === 0) indices.push(i);
    }
    return indices;
  }

  function spawnTile() {
    const empty = getEmptyIndices();
    if (empty.length === 0) return false;
    const index = empty[Math.floor(Math.random() * empty.length)];
    grid[index] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  /** Merge a line (array of 4 numbers) toward index 0. Returns new line and added score. */
  function mergeLine(line) {
    const filtered = line.filter(function (n) { return n !== 0; });
    const result = [];
    let added = 0;
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        result.push(filtered[i] * 2);
        added += filtered[i] * 2;
        i += 2;
      } else {
        result.push(filtered[i]);
        i += 1;
      }
    }
    while (result.length < SIZE) result.push(0);
    return { line: result.slice(0, SIZE), added: added };
  }

  function getRow(rowIndex) {
    const start = rowIndex * SIZE;
    return [grid[start], grid[start + 1], grid[start + 2], grid[start + 3]];
  }

  function setRow(rowIndex, line) {
    const start = rowIndex * SIZE;
    for (let c = 0; c < SIZE; c++) grid[start + c] = line[c];
  }

  function getCol(colIndex) {
    return [grid[colIndex], grid[colIndex + SIZE], grid[colIndex + SIZE * 2], grid[colIndex + SIZE * 3]];
  }

  function setCol(colIndex, line) {
    for (let r = 0; r < SIZE; r++) grid[r * SIZE + colIndex] = line[r];
  }

  function moveLeft() {
    let changed = false;
    let added = 0;
    for (let r = 0; r < SIZE; r++) {
      const row = getRow(r);
      const { line: newRow, added: a } = mergeLine(row);
      added += a;
      for (let c = 0; c < SIZE; c++) {
        if (row[c] !== newRow[c]) changed = true;
      }
      setRow(r, newRow);
    }
    return { changed, added };
  }

  function moveRight() {
    let changed = false;
    let added = 0;
    for (let r = 0; r < SIZE; r++) {
      const row = getRow(r).slice().reverse();
      const { line: merged, added: a } = mergeLine(row);
      added += a;
      const result = merged.reverse();
      for (let c = 0; c < SIZE; c++) {
        if (grid[r * SIZE + c] !== result[c]) changed = true;
      }
      setRow(r, result);
    }
    return { changed, added };
  }

  function moveUp() {
    let changed = false;
    let added = 0;
    for (let c = 0; c < SIZE; c++) {
      const col = getCol(c);
      const { line: newCol, added: a } = mergeLine(col);
      added += a;
      for (let r = 0; r < SIZE; r++) {
        if (col[r] !== newCol[r]) changed = true;
      }
      setCol(c, newCol);
    }
    return { changed, added };
  }

  function moveDown() {
    let changed = false;
    let added = 0;
    for (let c = 0; c < SIZE; c++) {
      const col = getCol(c);
      const reversed = col.slice().reverse();
      const { line: merged, added: a } = mergeLine(reversed);
      added += a;
      const result = merged.reverse();
      for (let r = 0; r < SIZE; r++) {
        if (col[r] !== result[r]) changed = true;
      }
      setCol(c, result);
    }
    return { changed, added };
  }

  function canMove() {
    for (let i = 0; i < CELL_COUNT; i++) {
      if (grid[i] === 0) return true;
    }
    for (let r = 0; r < SIZE; r++) {
      const row = getRow(r);
      for (let c = 0; c < SIZE - 1; c++) {
        if (row[c] === row[c + 1]) return true;
      }
    }
    for (let c = 0; c < SIZE; c++) {
      const col = getCol(c);
      for (let r = 0; r < SIZE - 1; r++) {
        if (col[r] === col[r + 1]) return true;
      }
    }
    return false;
  }

  function hasWon() {
    for (let i = 0; i < CELL_COUNT; i++) {
      if (grid[i] === WIN_VALUE) return true;
    }
    return false;
  }

  function performMove(direction) {
    if (gameOver) return;
    let result;
    switch (direction) {
      case 'left':
        result = moveLeft();
        break;
      case 'right':
        result = moveRight();
        break;
      case 'up':
        result = moveUp();
        break;
      case 'down':
        result = moveDown();
        break;
      default:
        return;
    }
    if (result.changed) {
      score += result.added;
      if (score > best) {
        best = score;
        saveBest();
      }
      spawnTile();
      render();
      updateScore();
      if (!won && hasWon()) {
        won = true;
        $overlayWin.setAttribute('aria-hidden', 'false');
      }
      if (!canMove()) {
        gameOver = true;
        $overlayGameOver.setAttribute('aria-hidden', 'false');
      }
    }
  }

  function updateScore() {
    $score.textContent = score;
    $best.textContent = best;
  }

  function getTileClass(value) {
    return 'tile tile-' + value;
  }

  function render() {
    $tilesContainer.innerHTML = '';
    for (let i = 0; i < CELL_COUNT; i++) {
      const value = grid[i];
      if (value === 0) continue;
      const cell = document.createElement('div');
      cell.className = getTileClass(value);
      cell.setAttribute('data-value', value);
      const row = Math.floor(i / SIZE);
      const col = i % SIZE;
      cell.style.setProperty('--row', row);
      cell.style.setProperty('--col', col);
      cell.textContent = value;
      $tilesContainer.appendChild(cell);
    }
  }

  function newGame() {
    grid = new Array(CELL_COUNT).fill(0);
    score = 0;
    won = false;
    gameOver = false;
    $overlayWin.setAttribute('aria-hidden', 'true');
    $overlayGameOver.setAttribute('aria-hidden', 'true');
    spawnTile();
    spawnTile();
    updateScore();
    render();
  }

  function init() {
    loadBest();
    newGame();

    document.getElementById('btn-new-game').addEventListener('click', newGame);
    document.getElementById('btn-restart-overlay').addEventListener('click', newGame);
    document.getElementById('btn-restart-win').addEventListener('click', function () {
      $overlayWin.setAttribute('aria-hidden', 'true');
      newGame();
    });
    document.getElementById('btn-keep-playing').addEventListener('click', function () {
      won = true;
      $overlayWin.setAttribute('aria-hidden', 'true');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        performMove('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        performMove('right');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        performMove('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        performMove('down');
      }
    });

    let touchStartX = 0;
    let touchStartY = 0;
    $tilesContainer.closest('.game-container').addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    $tilesContainer.closest('.game-container').addEventListener('touchend', function (e) {
      if (e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const min = 30;
      if (Math.abs(dx) >= min || Math.abs(dy) >= min) {
        if (Math.abs(dx) > Math.abs(dy)) {
          performMove(dx > 0 ? 'right' : 'left');
        } else {
          performMove(dy > 0 ? 'down' : 'up');
        }
      }
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
