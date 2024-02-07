'use strict';

const MINE = '💣';
const MARK = '⛳️';

var gBoard;

const gLevel = {
  SIZE: 4,
  MINES: 2,
};

const gGame = {
  isOn: false,
  showCount: 0,
  markedCount: 0,
  secsPassed: 0,
};

function onInit() {
  gGame.isOn = true;
  gBoard = buildBoard(4, 4);
  // gBoard = placeMines(gLevel.MINES);
  setMinesNegsCount(gBoard);
  renderBoard(gBoard);
}

////////////////////////////////////////////////////

function onCellMarked(elCell, i, j, ev) {
  ev.preventDefault();
  if (!gGame.isOn) return;
  if (elCell.classList.contains('marked')) return;

  const cell = gBoard[i][j];

  // Update model
  cell.isMarked = true;
  gGame.markedCount++;

  // Update dom
  elCell.classList.add('marked');
  renderCell({ i, j }, MARK);
}

function onCellClicked(elCell, i, j) {
  if (!gGame.isOn) return;
  const cell = gBoard[i][j];
  if (cell.isShown) return;

  removeHideLayer(elCell);
  gGame.showCount++;
  cell.isShown = true;

  if (cell.isMine) {
    gameOver();
    return;
  }

  if (!cell.minesAroundCount) {
    expandShown({ i, j });
  }
}

////////////////////////////////////////////////////

function expandShown(location) {
  const rowIdx = location.i;
  const colIdx = location.j;

  for (var i = rowIdx - 1; i <= rowIdx + 1; i++) {
    if (i < 0 || i >= gBoard.length) continue;

    for (var j = colIdx - 1; j <= colIdx + 1; j++) {
      if (j < 0 || j >= gBoard[0].length) continue;
      if (i === rowIdx && j === colIdx) continue;

      // Model
      const cell = gBoard[i][j];
      if (!cell.isShown) {
        cell.isShown = true;
        gGame.showCount++;
      }

      // Dom
      const cellSelector = getClassName({ i, j });
      const elCell = document.querySelector(cellSelector);
      removeHideLayer(elCell);
    }
  }
}

function gameOver() {
  // todo - play sound
  showGameOverModal();
  gGame.isOn = false;
}

function removeHideLayer(elCell) {
  elCell.classList.add('revealed');
}

////////////////////////////////////////////////////

function placeMines(minesCount) {
  while (minesCount > 0) {
    // Get rnd cell with rnd row and col
    const rndRowIdx = getRandomInt(0, gBoard.length);
    const rndColIdx = getRandomInt(0, gBoard[0].length);
    const rndCell = gBoard[rndRowIdx][rndColIdx];

    // Update model (place mine, only if there is no mine yet)
    if (!rndCell.isMine) rndCell.isMine = true;
    else continue;

    minesCount--;
  }

  return gBoard;
}

////////////////////////////////////////////////////

// ! DONE

function buildBoard(rows, cols) {
  var board = [];

  for (var i = 0; i < rows; i++) {
    board[i] = [];

    for (var j = 0; j < cols; j++) {
      board[i][j] = {
        minesAroundCount: 0,
        isShown: false,
        isMine: false,
        isMarked: false,
      };
    }
  }

  board[0][0].isMine = true;
  board[2][3].isMine = true;

  return board;
}

function renderBoard(board) {
  var strHTML = '';

  for (var i = 0; i < board.length; i++) {
    strHTML += '<tr>';

    for (var j = 0; j < board[0].length; j++) {
      const cell = board[i][j];
      var className = `cell cell-${i}-${j} `;

      className += !cell.isMine
        ? `number neg-${cell.minesAroundCount}`
        : 'mine';

      //   If cell doesn't have mine near by --> no number displayed
      const cellContent = cell.minesAroundCount ? cell.minesAroundCount : ' ';

      strHTML += `<td class="${className}" onclick="onCellClicked(this, ${i}, ${j})" oncontextmenu="onCellMarked(this, ${i}, ${j}, event)">${
        cell.isMine ? MINE : cellContent
      }</td>`;
    }

    strHTML += '</tr>';
  }

  const elGameBoard = document.querySelector('.game-board');
  elGameBoard.innerHTML = strHTML;
}

// Set all cell negs
function setMinesNegsCount(board) {
  for (var i = 0; i < board.length; i++) {
    for (var j = 0; j < board[0].length; j++) {
      const cell = board[i][j];
      cell.minesAroundCount = countCellMineAround(board, i, j);
    }
  }

  return board;
}

// Count negs around cell
function countCellMineAround(board, rowIdx, colIdx) {
  var mineNegsCount = 0;

  for (var i = rowIdx - 1; i <= rowIdx + 1; i++) {
    if (i < 0 || i >= board.length) continue;

    for (var j = colIdx - 1; j <= colIdx + 1; j++) {
      if (j < 0 || j >= board[0].length) continue;
      if (i === rowIdx && j === colIdx) continue;

      const cell = board[i][j];
      if (cell.isMine) mineNegsCount++;
    }
  }

  return mineNegsCount;
}

function showGameOverModal() {
  const elGameOver = document.querySelector('.modal-overlay');
  elGameOver.classList.remove('hide');
}

function hideGameOverModal() {
  const elGameOver = document.querySelector('.modal-overlay');
  elGameOver.classList.add('hide');
}
