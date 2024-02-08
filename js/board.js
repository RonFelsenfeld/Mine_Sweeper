'use strict';

function buildBoard(SIZE) {
  var board = [];

  for (var i = 0; i < SIZE; i++) {
    board[i] = [];

    for (var j = 0; j < SIZE; j++) {
      board[i][j] = {
        minesAroundCount: 0,
        isShown: false,
        isMine: false,
        isMarked: false,
      };
    }
  }

  return board;
}

function placeMines(minesCount) {
  while (minesCount > 0) {
    // Get rnd cell with rnd row and col
    const rndRowIdx = getRandomInt(0, gBoard.length);
    const rndColIdx = getRandomInt(0, gBoard[0].length);
    const rndCell = gBoard[rndRowIdx][rndColIdx];

    // Update model
    // Place mine only in a empty and not revealed
    if (!rndCell.isMine && !rndCell.isShown) rndCell.isMine = true;
    else continue;

    minesCount--;
  }

  return gBoard;
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

// Gets all empty cells
function getEmptyCellsPos() {
  const emptyCells = [];

  for (var i = 0; i < gBoard.length; i++) {
    for (var j = 0; j < gBoard[0].length; j++) {
      const cell = gBoard[i][j];
      if (!cell.isMine && !cell.isShown) emptyCells.push({ i, j });
    }
  }

  return emptyCells;
}

// Get a random empty and unrevealed cell position
function getRndEmptyPos() {
  const emptyCellsPos = getEmptyCellsPos();
  if (!emptyCellsPos) return;

  const rndIdx = getRandomInt(0, emptyCellsPos.length);
  const rndPos = emptyCellsPos[rndIdx];
  return rndPos;
}
