'use strict';

function handleFirstClick() {
  gGame.isOn = true;
  startTimer();

  if (!gGame.manualMode.isOn) finishBuildBoard();
}

function handleClickOnMine(elCell) {
  // When the user click on a cell, gGame.showCount increases by 1
  // If it's a mine, we will decrease it back
  gGame.showCount--;
  gGame.lifeUsed++;
  renderLives();
}

function handleVictory() {
  // todo - play sound
  gGame.isOn = false;
  setTimeout(showWinModal, 900);
  renderEmoji(WIN_EMOJI);
  stopTimer();
  updateScoreInStorage();
}

function handleLose() {
  // todo - play sound
  gGame.isOn = false;
  setTimeout(showLoseModal, 900);
  renderEmoji(LOSE_EMOJI);
  stopTimer();
  revealAllMines();
}

function handleHintMode(location) {
  for (var i = location.i - 1; i <= location.i + 1; i++) {
    if (i < 0 || i >= gBoard.length) continue;

    for (var j = location.j - 1; j <= location.j + 1; j++) {
      if (j < 0 || j >= gBoard[0].length) continue;
      const cellSelector = getClassName({ i, j });
      const elCell = document.querySelector(cellSelector);
      const cell = gBoard[i][j];

      revealCell(elCell);

      setTimeout(() => {
        if (!cell.isShown) elCell.classList.remove('revealed', 'mine');
      }, 1000);
    }
  }
  gGame.inHintMode = false;
}

function handleSafeClick() {
  const rndEmptyPos = getRndEmptyPos();
  const cellSelector = getClassName({ i: rndEmptyPos.i, j: rndEmptyPos.j });
  const elRndCell = document.querySelector(cellSelector);
  elRndCell.classList.add('flash');

  setTimeout(() => {
    elRndCell.classList.remove('flash');
  }, 2500);
}

function handleMegaHint() {
  // Removing the hint class
  const pos1Selector = getClassName(gGame.megaHint.pos1);
  const elCellInPos1 = document.querySelector(pos1Selector);

  const pos2Selector = getClassName(gGame.megaHint.pos2);
  const elCellInPos2 = document.querySelector(pos2Selector);

  elCellInPos1.classList.remove('hint');
  elCellInPos2.classList.remove('hint');

  const topRow = gGame.megaHint.pos1.i;
  const bottomRow = gGame.megaHint.pos2.i;
  const leftCol = gGame.megaHint.pos1.j;
  const rightCol = gGame.megaHint.pos2.j;

  for (var i = topRow; i <= bottomRow; i++) {
    for (var j = leftCol; j <= rightCol; j++) {
      const cellSelector = getClassName({ i, j });
      const elCell = document.querySelector(cellSelector);
      const cell = gBoard[i][j];

      revealCell(elCell);

      setTimeout(() => {
        if (!cell.isShown) elCell.classList.remove('revealed', 'mine');
      }, 2000);
    }
  }
  gGame.megaHint.isOn = false;
  gGame.megaHint.uses++;

  const elMegaHintBtn = document.querySelector('.btn-mega-hint');
  elMegaHintBtn.classList.remove('clicked');
  elMegaHintBtn.style.cursor = 'not-allowed';
}

function renderManualMode() {
  const elManualBtn = document.querySelector('.btn-manual-mode');
  if (!gGame.manualMode.minesLeft || !gGame.manualMode.isOn) {
    elManualBtn.innerText = 'Manual Mode';
  } else {
    elManualBtn.innerText = `${gGame.manualMode.minesLeft} Mines Left`;
  }
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
