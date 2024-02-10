'use strict';

// Board Functions

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

function renderBoard(board) {
  var strHTML = '';

  for (var i = 0; i < board.length; i++) {
    strHTML += '<tr>';

    for (var j = 0; j < board[0].length; j++) {
      const cell = board[i][j];
      var className = `cell cell-${i}-${j} `;
      var cellContent = MINE;

      if (!cell.isMine) {
        className += `num-${cell.minesAroundCount}`;
        cellContent = cell.minesAroundCount ? cell.minesAroundCount : '';
      }

      // After the first click, the board will render again
      // therefore, need to reveal the first click cells
      className += cell.isShown ? ' revealed' : '';

      strHTML += `<td class="${className}" onclick="onCellClicked(this, ${i}, ${j})" oncontextmenu="onCellMarked(this, ${i}, ${j}, event)">${cellContent}</td>`;
    }

    strHTML += '</tr>';
  }

  const elGameBoard = document.querySelector('.game-board');
  elGameBoard.innerHTML = strHTML;
}

function finishBuildBoard() {
  gBoard = placeMines(gLevels[gCurrLevelIdx].MINES);
  setMinesNegsCount(gBoard);
  renderBoard(gBoard);
}

function expandShown(location) {
  const rowIdx = location.i;
  const colIdx = location.j;

  // If new location is out of board --> return
  if (
    rowIdx < 0 ||
    rowIdx >= gBoard.length ||
    colIdx < 0 ||
    colIdx >= gBoard[0].length
  )
    return;

  const cell = gBoard[rowIdx][colIdx];

  // While cell is not a mine and hasn't been revealed
  if (!cell.isMine && !cell.isShown && !cell.isMarked) {
    // Update model
    processClick(cell);
    storeInMoves(rowIdx, colIdx);

    // Update dom
    const cellSelector = getClassName({ i: rowIdx, j: colIdx });
    const elCell = document.querySelector(cellSelector);
    revealCell(elCell);

    // If reached a cell with mines around --> return
    if (cell.minesAroundCount) return;

    expandShown({ i: rowIdx + 1, j: colIdx });
    expandShown({ i: rowIdx - 1, j: colIdx });
    expandShown({ i: rowIdx, j: colIdx + 1 });
    expandShown({ i: rowIdx, j: colIdx - 1 });
    expandShown({ i: rowIdx + 1, j: colIdx + 1 });
    expandShown({ i: rowIdx + 1, j: colIdx - 1 });
    expandShown({ i: rowIdx - 1, j: colIdx + 1 });
    expandShown({ i: rowIdx - 1, j: colIdx - 1 });
  }
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

function placeMineInCell(i, j) {
  const cell = gBoard[i][j];
  if (!cell.isMine) {
    cell.isMine = true;
    gGame.manualMode.minesLeft--;
  }

  return;
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

// Gets a random empty and unrevealed cell position
function getRndEmptyPos() {
  const emptyCellsPos = getEmptyCellsPos();
  if (!emptyCellsPos) return;

  const rndIdx = getRandomInt(0, emptyCellsPos.length);
  const rndPos = emptyCellsPos[rndIdx];
  return rndPos;
}

function revealAllMines() {
  for (var i = 0; i < gBoard.length; i++) {
    for (var j = 0; j < gBoard[0].length; j++) {
      const cell = gBoard[i][j];

      if (cell.isMine) {
        const cellSelector = getClassName({ i, j });
        const elCell = document.querySelector(cellSelector);
        revealCell(elCell);
        // Even if the cell has been marked --> show it as mine
        renderCell({ i, j }, MINE);
        elCell.style.backgroundColor = 'red';
      }
    }
  }
}

// Gets all mines positions
function getHiddenMinesPos() {
  const minesPos = [];

  for (var i = 0; i < gBoard.length; i++) {
    for (var j = 0; j < gBoard[0].length; j++) {
      const cell = gBoard[i][j];
      if (cell.isMine && !cell.isShown) minesPos.push({ i, j });
    }
  }

  return minesPos;
}

// Choose 3 random mines position (Exterminator)
function getRandomMinesPos(minesPos) {
  const minesPosCopy = minesPos.slice();
  const rndMinesPos = [];

  while (rndMinesPos.length !== 3) {
    const rndIdx = getRandomInt(0, minesPosCopy.length);
    const rndPos = minesPosCopy[rndIdx];
    const rndCell = gBoard[rndPos.i][rndPos.j];

    // Only if the mine negs are unshown --> add the mine's position
    // if (!hasShownNeighbor(rndCell)) {
    rndMinesPos.push(rndPos);

    // Make sure that the bomb won't get selected twice + rndIdx will be in range
    minesPosCopy.splice(rndIdx, 1);
    // }
  }

  return rndMinesPos;
}
