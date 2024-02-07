'use strict';

const MINE = '💣';
const MARK = '⛳️';
const NORMAL_EMOJI = '😁';
const LOSE_EMOJI = '😭';
const WIN_EMOJI = '😎';

var gBoard;

const gLevel = [
  { SIZE: 4, MINES: 2 },
  { SIZE: 8, MINES: 14 },
  { SIZE: 12, MINES: 32 },
];
var gCurrLevelIdx = 0;

const gGame = {
  isOn: false,
  showCount: 0,
  markedCount: 0,
  secsPassed: 0,
  livesCount: 3,
};

////////////////////////////////////////////////////

// ! Main Functions

function onInit() {
  gBoard = buildBoard(gLevel[gCurrLevelIdx].SIZE);
  renderBoard(gBoard);
}

function finishBuildBoard() {
  gBoard = placeMines(gLevel[gCurrLevelIdx].MINES);
  setMinesNegsCount(gBoard);
  renderBoard(gBoard);
}

function onRestart() {
  gGame.isOn = false;
  gGame.showCount = 0;
  gGame.markedCount = 0;
  gGame.secsPassed = 0;
  gGame.livesCount = 3;

  hideGameOverModal();
  onInit();
}

////////////////////////////////////////////////////

// ! Interactions

function onChangeLevel(elLevel) {
  const selectedLevel = +elLevel.dataset.level;
  gCurrLevelIdx = selectedLevel;
  onRestart();
}

function onCellMarked(elCell, i, j, ev) {
  ev.preventDefault();

  if (!gGame.isOn) return;

  const cell = gBoard[i][j];
  if (cell.isShown) return;

  if (!cell.isMarked) {
    // Update model
    cell.isMarked = true;
    gGame.markedCount++;

    // Update dom
    elCell.classList.add('marked');
    renderCell({ i, j }, MARK);

    if (checkForVictory()) {
      renderEmoji(WIN_EMOJI);
      alert('win!');
      return;
    }
  } else {
    // Update model
    cell.isMarked = false;
    gGame.markedCount--;

    // Update dom
    elCell.classList.remove('marked');
    renderCell({ i, j }, '');
  }
}

function onCellClicked(elCell, i, j) {
  const cell = gBoard[i][j];
  if (cell.isShown) return;
  if (cell.isMarked) return;

  // Update model
  gGame.showCount++;
  cell.isShown = true;

  // Update dom
  removeHideLayer(elCell);

  if (checkForVictory()) {
    renderEmoji(WIN_EMOJI);
    alert('win!');
    return;
  }

  if (cell.isMine) {
    // If no more lives remains
    if (!gGame.livesCount) {
      gameOver();
      return;
    } else {
      gGame.livesCount--;
      elCell.style.backgroundColor = 'red';
      return;
    }
  }

  if (!cell.minesAroundCount) {
    expandShown({ i, j });
  }

  // If !isOn, that means this is the first click
  // Set isOn = true; Finish build the board
  if (!gGame.isOn) {
    gGame.isOn = true;
    finishBuildBoard();
  }
}

////////////////////////////////////////////////////

function checkForVictory() {
  const totalMines = gLevel[gCurrLevelIdx].MINES;
  const totalMarked = gGame.markedCount;
  const livesUsed = 3 - gGame.livesCount;

  const totalRevealed = gGame.showCount;
  const totalCellsToReveal = gLevel[gCurrLevelIdx].SIZE ** 2 - totalMines;

  const isMarkedAll = totalMarked + livesUsed === totalMines;
  const isRevealedAll = totalRevealed === totalCellsToReveal;

  return isMarkedAll && isRevealedAll;
}

function gameOver() {
  // todo - play sound
  showGameOverModal();
  renderEmoji(LOSE_EMOJI);
  gGame.isOn = false;
}

////////////////////////////////////////////////////

// ! DONE

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

// !RENDER

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

function expandShown(location) {
  const rowIdx = location.i;
  const colIdx = location.j;

  for (var i = rowIdx - 1; i <= rowIdx + 1; i++) {
    if (i < 0 || i >= gBoard.length) continue;

    for (var j = colIdx - 1; j <= colIdx + 1; j++) {
      if (j < 0 || j >= gBoard[0].length) continue;
      if (i === rowIdx && j === colIdx) continue;

      // Update model
      const cell = gBoard[i][j];
      if (!cell.isShown) {
        cell.isShown = true;
        gGame.showCount++;
      }

      // Update dom
      const cellSelector = getClassName({ i, j });
      const elCell = document.querySelector(cellSelector);
      removeHideLayer(elCell);
    }
  }
}

function removeHideLayer(elCell) {
  elCell.classList.add('revealed');
}

function renderEmoji(emoji) {
  const elEmoji = document.querySelector('.emoji');
  elEmoji.innerText = emoji;
}

function getNumInColor(num) {
  // Max 8 neighbors
  const colorMap = {
    1: 'green',
    2: 'yellow',
    3: 'orange',
    4: 'red',
    5: 'purple',
    6: 'blue',
    7: 'pink',
    8: 'lightblue',
  };

  // const color = el === MINE ? 'red' : color[el];
  const color = `style="color:${colorMap[num]} ;"`;
  return `<span ${color}>${num}</span>`;
}

// function getMineHTML(mine) {
//   const bgColor = `style="background-color: red;"`;
//   return `<span ${bgColor}>${mine}</span>`;
// }

////////////////////////////////////////////////////

function renderBoard(board) {
  var strHTML = '';

  for (var i = 0; i < board.length; i++) {
    strHTML += '<tr>';

    for (var j = 0; j < board[0].length; j++) {
      const cell = board[i][j];
      var className = `cell cell-${i}-${j} `;
      var cellContent = MINE;

      if (!cell.isMine) {
        className += 'number';
        cellContent = cell.minesAroundCount ? cell.minesAroundCount : '';
        // cellContent = getNumInColor(cellContent);
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
