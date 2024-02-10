'use strict';

const NORMAL_EMOJI =
  '<img class="game-emoji" src="img/smiling-emoji.webp" alt="emoji" onclick="onRestart()"/>';
const LOSE_EMOJI =
  '<img class="game-emoji" src="img/crying-emoji.png" alt="emoji" onclick="onRestart()"/>';
const WIN_EMOJI =
  '<img class="game-emoji" src="img/sunglass-emoji.png" alt="emoji" onclick="onRestart()"/>';

const WIN_SOUND = 'win.mp3';
const LOSE_SOUND = 'lose.mp3';
const EXPLOSION_SOUND = 'explosion.mp3';
const HINT_SOUND = 'hint.mp3';
const MEGA_HINT_SOUND = 'mega-hint.mp3';

const MINE = '💣';
const MARK = '⛳️';

////////////////////////////////////////////////////

var gBoard;
var gTimerInterval;
const gGame = {};

const gLevels = [
  { TITLE: 'Beginner', SIZE: 4, MINES: 2, LIVES: 1 },
  { TITLE: 'Medium', SIZE: 8, MINES: 14, LIVES: 3 },
  { TITLE: 'Expert', SIZE: 12, MINES: 32, LIVES: 5 },
];
var gCurrLevelIdx = 0;

////////////////////////////////////////////////////

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

function onRestart() {
  if (checkForVictory()) {
    hideWinModal();
  } else {
    hideLoseModal();
  }

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
  gGame.megaHint = {
    isOn: false,
    uses: 0,
    pos1: {},
    pos2: {},
  };
  gGame.isUsedExterminator = false;
  gGame.moves = [];

  // Need to prevent clicks after the game is over (isOn works differently)
  gGame.isOver = false;
}

////////////////////////////////////////////////////

// ! User Actions

function onCellMarked(elCell, i, j, ev) {
  ev.preventDefault();

  if (!gGame.isOn) return;
  if (gGame.isGameOver) return;

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
  if (gGame.isOver) return;

  const cell = gBoard[i][j];
  if (cell.isShown) return;
  if (cell.isMarked) return;

  // If mega hint mode is on
  if (gGame.megaHint.isOn) {
    // If the first position is empty --> insert i and j to pos1
    if (!Object.keys(gGame.megaHint.pos1).length) {
      gGame.megaHint.pos1.i = i;
      gGame.megaHint.pos1.j = j;
      elCell.classList.add('hint');
      return;
    } else if (!Object.keys(gGame.megaHint.pos2).length) {
      // If the second position is empty --> insert i and j to pos2
      gGame.megaHint.pos2.i = i;
      gGame.megaHint.pos2.j = j;
      elCell.classList.add('hint');
    }
    handleMegaHint();
    return;
  }

  // Only if manual mode is on and mines left to place
  if (gGame.manualMode.isOn && gGame.manualMode.minesLeft) {
    placeMineInCell(i, j);

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
    createNewMovesPortion();

    if (!cell.minesAroundCount) {
      // For the recursion to work, I need to undo the model update
      // The recursion works based on the cell.isShown property
      cell.isShown = false;
      gGame.showCount--;
      expandShown({ i, j });
    } else {
      // For the undo btn --> storing all moves in a moves array
      storeInMoves(i, j);
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
    createNewMovesPortion();
    expandShown({ i, j });

    if (checkForVictory()) {
      handleVictory();
    }
    return;
  }

  if (cell.isMine) {
    playSound(EXPLOSION_SOUND);
    handleClickOnMine(elCell);

    if (isOutOfLives()) {
      handleLose();
    }
  }

  // Update model
  processClick(cell);
  createNewMovesPortion();
  storeInMoves(i, j);

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
  if (!gGame.isOn) {
    showHintAlert(elHint.closest('.hint-container'));
    return;
  }
  if (gGame.hintsUsed === 3) return;
  if (gGame.megaHint.isOn) return;

  const elHintTheme = elHint.closest('.hint-theme');
  elHintTheme.classList.add('used');
  gGame.inHintMode = true;
  playSound(HINT_SOUND);
}

function onSafeClick(elSafeBtn) {
  if (gGame.safeClicksUsed >= 3) return;

  gGame.safeClicksUsed++;
  if (gGame.safeClicksUsed === 3) {
    elSafeBtn.style.cursor = 'not-allowed';
  }

  handleSafeClick();
  renderSafeClicks();
}

function onManualMode(elBtn) {
  onRestart();
  gGame.manualMode.isOn = true;
  renderManualMode();
}

function onMegaHint(elBtn) {
  if (!gGame.isOn) {
    showHintAlert(elBtn);
    return;
  }
  if (gGame.megaHint.uses === 1) return;
  if (gGame.inHintMode) return;

  gGame.megaHint.isOn = true;
  elBtn.classList.add('clicked');
  playSound(MEGA_HINT_SOUND);
}

function onToggleTheme(elBtn) {
  document.body.classList.toggle('dark-mode');
  elBtn.innerText = document.body.classList.contains('dark-mode')
    ? 'Dark mode'
    : 'Light mode';
}

function onExterminator(elBtn) {
  if (gGame.isUsedExterminator) return;
  // If on beginner level --> don't allow (exterminator removes 3 mines)
  if (gCurrLevelIdx === 0) return;
  if (!gGame.isOn) {
    showHintAlert(elBtn);
    return;
  }

  gGame.isUsedExterminator = true;
  elBtn.classList.add('used');

  const elHeader = document.querySelector('header');
  elHeader.classList.add('exterminator-msg');

  setTimeout(() => {
    elHeader.classList.remove('exterminator-msg');
  }, 2500);
  handleExterminator();
}

function onUndo() {
  if (gGame.moves.length === 0) return;
  if (!gGame.isOn) return;

  const lastMoves = gGame.moves.pop();
  handleUndo(lastMoves);
}

////////////////////////////////////////////////////

// ! Game State

function isOutOfLives() {
  return gGame.initialLife === gGame.lifeUsed;
}

function checkForVictory() {
  // If the user used the exterminator --> decrease total mines by 3
  const totalMines = gGame.isUsedExterminator
    ? gLevels[gCurrLevelIdx].MINES - 3
    : gLevels[gCurrLevelIdx].MINES;

  const totalRevealed = gGame.showCount;
  const totalCellsToReveal = gLevels[gCurrLevelIdx].SIZE ** 2 - totalMines;

  const totalMarked = gGame.markedCount;

  const isMarkedAll = totalMarked + gGame.lifeUsed === totalMines;
  const isRevealedAll = totalRevealed === totalCellsToReveal;

  return isMarkedAll && isRevealedAll;
}

////////////////////////////////////////////////////

// ! Render functions

function renderLives() {
  const lifeRemained = gGame.initialLife - gGame.lifeUsed;
  var strHTML = '';

  for (var i = 0; i < lifeRemained; i++) {
    strHTML += '<img class="live-icon" src="img/heart.png" alt="heart-img" />';
  }

  const elLives = document.querySelector('.lives-container');
  elLives.innerHTML = strHTML;
}

function revealCell(elCell) {
  if (elCell.innerText === MINE) {
    elCell.classList.add('mine');
  } else {
    elCell.classList.add('revealed');
  }
}

function hideCell(elCell) {
  if (elCell.innerText === MINE) {
    elCell.classList.remove('mine');
  } else {
    elCell.classList.remove('revealed');
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
  document.querySelector('.btn-mega-hint').classList.remove('used', 'clicked');
}

function renderSafeClicks() {
  document.querySelector('.clicks').innerText = 3 - gGame.safeClicksUsed;
}

function renderManualMode() {
  const elManualBtn = document.querySelector('.btn-manual-mode');
  if (!gGame.manualMode.minesLeft || !gGame.manualMode.isOn) {
    elManualBtn.innerText = 'Manual Mode';
  } else {
    elManualBtn.innerText = `${gGame.manualMode.minesLeft} Mines Left`;
  }
}

function renderBestScores() {
  const elBeginnerScore = document.querySelector('.score-beginner');
  const elMediumScore = document.querySelector('.score-medium');
  const elExpertScore = document.querySelector('.score-expert');
  const secondsStr = 's';

  const beginnerScore = localStorage.getItem('Beginner') || 0;
  const mediumScore = localStorage.getItem('Medium') || 0;
  const expertScore = localStorage.getItem('Expert') || 0;

  elBeginnerScore.innerText = beginnerScore + secondsStr;
  elMediumScore.innerText = mediumScore + secondsStr;
  elExpertScore.innerText = expertScore + secondsStr;
}

function showHintAlert(el) {
  el.classList.add('alert');
  setTimeout(() => {
    el.classList.remove('alert');
  }, 1500);
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

// Storing the moves in the gGame moves array
function storeInMoves(i, j) {
  gGame.moves[gGame.moves.length - 1].push({ i, j });
}

// Creating new array for the next moves (for the undo)
function createNewMovesPortion() {
  gGame.moves.push([]);
}

////////////////////////////////////////////////////

// ! Game extra data

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

function updateScoreInStorage() {
  const currLevelTitle = gLevels[gCurrLevelIdx].TITLE;
  const bestScore = localStorage.getItem(currLevelTitle);
  if (!bestScore) {
    localStorage.setItem(currLevelTitle, gGame.secsPassed);
  } else {
    const newBestScore =
      gGame.secsPassed < bestScore ? gGame.secsPassed : bestScore;
    localStorage.setItem(currLevelTitle, newBestScore);
  }
}
