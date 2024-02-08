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
const gGame = {};
var gTimerInterval;

const gLevels = [
  { TITLE: 'Beginner', SIZE: 4, MINES: 2, LIVES: 1 },
  { TITLE: 'Medium', SIZE: 8, MINES: 14, LIVES: 3 },
  { TITLE: 'Expert', SIZE: 12, MINES: 32, LIVES: 5 },
];
var gCurrLevelIdx = 0;

////////////////////////////////////////////////////

// ! Main Functions

function onInit() {
  initGameState();
  gBoard = buildBoard(gLevels[gCurrLevelIdx].SIZE);
  renderBoard(gBoard);
  renderLives();
  renderEmoji(NORMAL_EMOJI);
  resetTimer();
  resetHints();
  renderBestScores();
  renderSafeClicks();
  renderManualMode();
}

function finishBuildBoard() {
  gBoard = placeMines(gLevels[gCurrLevelIdx].MINES);
  setMinesNegsCount(gBoard);
  renderBoard(gBoard);
}

function onRestart() {
  if (checkForVictory()) {
    hideWinModal();
  } else {
    hideLoseModal();
  }

  initGameState();
  stopTimer();
  renderEmoji(NORMAL_EMOJI);
  onInit();
}

function initGameState() {
  gGame.isOn = false;
  gGame.showCount = 0;
  gGame.markedCount = 0;
  gGame.secsPassed = 0;
  gGame.initialLife = gLevels[gCurrLevelIdx].LIVES;
  gGame.lifeUsed = 0;
  gGame.inHintMode = false;
  gGame.hintsUsed = 0;
  gGame.safeClicksUsed = 0;
  gGame.manualMode = {
    isOn: false,
    minesLeft: gLevels[gCurrLevelIdx].MINES,
  };
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
    processMark(cell);

    // Update dom
    elCell.classList.add('marked');
    renderCell({ i, j }, MARK);

    if (checkForVictory()) {
      handleVictory();
      return;
    }
  } else {
    // Update model
    processUnmark(cell);

    // Update dom
    elCell.classList.remove('marked');

    // After unmark, need to retrieve the previous cell's content
    const prevContent = cell.isMine ? MINE : cell.minesAroundCount;
    renderCell({ i, j }, prevContent);
  }
}

function onCellClicked(elCell, i, j) {
  const cell = gBoard[i][j];
  if (cell.isShown) return;
  if (cell.isMarked) return;

  // Only if manual mode is on and mines left to place
  if (gGame.manualMode.isOn && gGame.manualMode.minesLeft) {
    placeMine(i, j);

    // If done placing mines --> finish the board
    if (!gGame.manualMode.minesLeft) {
      setMinesNegsCount(gBoard);
      renderBoard(gBoard);
    }
    renderManualMode();
    return;
  }

  // If !isOn, that means this is the first click
  // Set isOn = true; Finish build the board
  if (!gGame.isOn) {
    processClick(cell);
    revealCell(elCell);
    handleFirstClick();

    if (!cell.minesAroundCount) {
      // For the recursion to work, I need to undo the model update
      // The recursion works based on the cell.isShown property
      cell.isShown = false;
      gGame.showCount--;
      expandShown({ i, j });
    }

    return;
  }

  if (gGame.inHintMode) {
    gGame.hintsUsed++;
    revealCell(elCell);
    handleHintMode({ i, j });
    return;
  }

  if (!cell.minesAroundCount && !cell.isMine) {
    // If the cell is empty --> shows his negs
    expandShown({ i, j });
    return;
  }

  if (cell.isMine) {
    handleClickOnMine(elCell);

    if (isOutOfLives()) {
      handleLose();
    }
  }

  // Update model
  processClick(cell);

  // Update dom
  revealCell(elCell);

  // If the cell is flashing after safe click --> remove the flash indicator
  if (elCell.classList.contains('flash')) elCell.classList.remove('flash');

  if (checkForVictory()) {
    handleVictory();
    return;
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

function onSafeClick(elSafeBtn) {
  if (gGame.safeClicksUsed >= 3) return;

  gGame.safeClicksUsed++;
  if (gGame.safeClicksUsed === 3) {
    elSafeBtn.style.cursor = 'not-allowed';
  }

  const rndEmptyPos = getRndEmptyPos();
  const cellSelector = getClassName({ i: rndEmptyPos.i, j: rndEmptyPos.j });
  const elRndCell = document.querySelector(cellSelector);
  elRndCell.classList.add('flash');

  renderSafeClicks();

  setTimeout(() => {
    elRndCell.classList.remove('flash');
  }, 2500);
}

function onManualMode(elBtn) {
  onRestart();
  gGame.manualMode.isOn = true;
  renderManualMode();
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
  if (elCell.innerText === MINE) {
    elCell.classList.add('mine');
  } else {
    elCell.classList.add('revealed');
  }
}

function renderEmoji(emoji) {
  const elEmoji = document.querySelector('.emoji-box');
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

function resetHints() {
  const elHints = document.querySelectorAll('.hint-theme');
  for (var i = 0; i < elHints.length; i++) {
    elHints[i].classList.remove('used');
  }
}

function renderSafeClicks() {
  document.querySelector('.clicks').innerText = 3 - gGame.safeClicksUsed;
}

////////////////////////////////////////////////////

// ! Model updates

function processClick(cell) {
  cell.isShown = true;
  gGame.showCount++;
}

function processMark(cell) {
  cell.isMarked = true;
  gGame.markedCount++;
}

function processUnmark(cell) {
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

// function getNumInColor(num) {
//   // Max 8 neighbors
//   const colorMap = {
//     1: 'green',
//     2: 'yellow',
//     3: 'orange',
//     4: 'red',
//     5: 'purple',
//     6: 'blue',
//     7: 'pink',
//     8: 'lightblue',
//   };

//   const color = `style="color:${colorMap[num]} ;"`;
//   return `<span ${color}>${num}</span>`;
// }
