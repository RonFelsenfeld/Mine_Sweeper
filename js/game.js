'use strict';

const NORMAL_EMOJI =
  '<img class="game-emoji" src="img/smiling-emoji.webp" alt="emoji" onclick="onRestart()"/>';
const LOSE_EMOJI =
  '<img class="game-emoji" src="img/crying-emoji.png" alt="emoji" onclick="onRestart()"/>';
const WIN_EMOJI =
  '<img class="game-emoji" src="img/sunglass-emoji.png" alt="emoji" onclick="onRestart()"/>';

const MINE = '💣';
const MARK = '⛳️';

var gBoard;
var gTimerInterval;

const gLevels = [
  { SIZE: 4, MINES: 2, LIVES: 1 },
  { SIZE: 8, MINES: 14, LIVES: 3 },
  { SIZE: 12, MINES: 32, LIVES: 3 },
];
var gCurrLevelIdx = 0;

const gGame = {
  isOn: false,
  showCount: 0,
  markedCount: 0,
  secsPassed: 0,
  initialLife: gLevels[gCurrLevelIdx].LIVES,
  lifeUsed: 0,
  hintsUsed: 0,
  inHintMode: false,
};

////////////////////////////////////////////////////

// ! Main Functions

function onInit() {
  gBoard = buildBoard(gLevels[gCurrLevelIdx].SIZE);
  renderBoard(gBoard);
  renderLives();
  renderEmoji(NORMAL_EMOJI);
  resetTimer();
}

function finishBuildBoard() {
  gBoard = placeMines(gLevels[gCurrLevelIdx].MINES);
  setMinesNegsCount(gBoard);
  renderBoard(gBoard);
}

function onRestart() {
  gGame.isOn = false;
  gGame.showCount = 0;
  gGame.markedCount = 0;
  gGame.secsPassed = 0;
  gGame.initialLife = gLevels[gCurrLevelIdx].LIVES;
  gGame.lifeUsed = 0;
  gGame.inHintMode = false;

  stopTimer();
  hideLoseModal();
  renderEmoji(NORMAL_EMOJI);
  onInit();
}

////////////////////////////////////////////////////

// ! User Actions

function onCellMarked(elCell, i, j, ev) {
  ev.preventDefault();

  if (!gGame.isOn) return;

  const cell = gBoard[i][j];
  if (cell.isShown) return;

  if (!cell.isMarked) {
    // Update model
    markCell(cell);

    // Update dom
    elCell.classList.add('marked');
    renderCell({ i, j }, MARK);

    if (checkForVictory()) {
      handleVictory();
      return;
    }
  } else {
    // Update model
    unmarkCell(cell);

    // Update dom
    elCell.classList.remove('marked');
    renderCell({ i, j }, '');
  }
}

function onCellClicked(elCell, i, j) {
  const cell = gBoard[i][j];
  if (cell.isShown) return;
  if (cell.isMarked) return;

  if (gGame.inHintMode) {
    gGame.hintsUsed++;
    revealCell(elCell);
    handleHintMode({ i, j });
    return;
  }

  // Update model
  handleClick(cell);

  // Update dom
  revealCell(elCell);

  if (cell.isMine) {
    handleClickOnMine(elCell);

    if (isOutOfLives()) {
      handleLose();
      return;
    }
  } else {
    if (!cell.minesAroundCount) {
      // Only if the cell doesn't have mines around --> shows his negs
      expandShown({ i, j });
    }
  }

  if (checkForVictory()) {
    handleVictory();
    return;
  }

  // If !isOn, that means this is the first click
  // Set isOn = true; Finish build the board
  if (!gGame.isOn) {
    handleFirstClick();
  }
}

function onChangeLevel(elLevelBtn) {
  const selectedLevel = +elLevelBtn.dataset.level;
  gCurrLevelIdx = selectedLevel;

  const elLevelBtns = document.querySelectorAll('.btn-level');

  for (var i = 0; i < elLevelBtns.length; i++) {
    elLevelBtns[i].classList.remove('selected');
  }
  elLevelBtn.classList.add('selected');
  onRestart();
}

function onHint(elHint) {
  if (gGame.hintsUsed === 3) return;
  if (!gGame.isOn) return;

  const elHintTheme = elHint.closest('.hint-theme');
  elHintTheme.classList.add('used');
  gGame.inHintMode = true;
}
////////////////////////////////////////////////////

// ! Game State

function isOutOfLives() {
  return gGame.initialLife === gGame.lifeUsed;
}

function checkForVictory() {
  const totalMines = gLevels[gCurrLevelIdx].MINES;
  const totalMarked = gGame.markedCount;

  const totalRevealed = gGame.showCount;
  const totalCellsToReveal = gLevels[gCurrLevelIdx].SIZE ** 2 - totalMines;

  const isMarkedAll = totalMarked + gGame.lifeUsed === totalMines;
  const isRevealedAll = totalRevealed === totalCellsToReveal;

  return isMarkedAll && isRevealedAll;
}

////////////////////////////////////////////////////

// ! Rendering

function renderBoard(board) {
  var strHTML = '';

  for (var i = 0; i < board.length; i++) {
    strHTML += '<tr>';

    for (var j = 0; j < board[0].length; j++) {
      const cell = board[i][j];
      var className = `cell cell-${i}-${j} `;
      var cellContent = MINE;

      if (!cell.isMine) {
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

function renderLives() {
  const lifeRemained = gGame.initialLife - gGame.lifeUsed;
  var strHTML = '';

  for (var i = 0; i < lifeRemained; i++) {
    strHTML += '<img class="live-icon" src="img/heart.png" alt="heart-img" />';
  }

  const elLives = document.querySelector('.lives-container');
  elLives.innerHTML = strHTML;
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
      revealCell(elCell);
    }
  }
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

function revealCell(elCell) {
  elCell.classList.add('revealed');
}

function renderEmoji(emoji) {
  const elEmoji = document.querySelector('.emoji-container');
  elEmoji.innerHTML = emoji;
}

function showLoseModal() {
  const elModalOverlay = document.querySelector('.modal-overlay');
  const elLoseModal = document.querySelector('.lose-modal');
  elModalOverlay.classList.remove('hide');
  elLoseModal.classList.remove('hide');
}

function hideLoseModal() {
  const elModalOverlay = document.querySelector('.modal-overlay');
  const elLoseModal = document.querySelector('.lose-modal');
  elModalOverlay.classList.add('hide');
  elLoseModal.classList.add('hide');
}

function showWinModal() {
  const elModalOverlay = document.querySelector('.modal-overlay');
  const elWinModal = document.querySelector('.win-modal');
  elModalOverlay.classList.remove('hide');
  elWinModal.classList.remove('hide');
}

function hideWinModal() {
  const elModalOverlay = document.querySelector('.modal-overlay');
  const elWinModal = document.querySelector('.win-modal');
  elModalOverlay.classList.add('hide');
  elWinModal.classList.add('hide');
}

////////////////////////////////////////////////////

// ! Model updates

function markCell(cell) {
  cell.isMarked = true;
  gGame.markedCount++;
}

function unmarkCell(cell) {
  cell.isMarked = false;
  gGame.markedCount--;
}

////////////////////////////////////////////////////

// ! Timer

function startTimer() {
  if (gTimerInterval) clearInterval(gTimerInterval);

  gTimerInterval = setInterval(() => {
    gGame.secsPassed++;
    document.querySelector('.seconds').innerText = (
      gGame.secsPassed + ''
    ).padStart(2, '0');
  }, 1000);
}

function stopTimer() {
  clearInterval(gTimerInterval);
}

function resetTimer() {
  document.querySelector('.seconds').innerText = '00';
}

////////////////////////////////////////////////////

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

  const color = `style="color:${colorMap[num]} ;"`;
  return `<span ${color}>${num}</span>`;
}
