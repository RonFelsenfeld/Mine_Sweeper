'use strict';

function handleClick(cell) {
  gGame.showCount++;
  cell.isShown = true;
}

function handleFirstClick() {
  gGame.isOn = true;
  startTimer();
  finishBuildBoard();
}

function handleClickOnMine(elCell) {
  // When the user click on a cell, gGame.showCount increases by 1
  // If it's a mine, we will decrease it back
  gGame.showCount--;
  gGame.lifeUsed++;
  elCell.style.backgroundColor = 'red';
  renderLives();
}

function handleVictory() {
  // todo - play sound
  gGame.isOn = false;
  setTimeout(showWinModal, 900);
  renderEmoji(WIN_EMOJI);
  stopTimer();
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
      elCell.classList.add('revealed');

      setTimeout(() => {
        if (!cell.isShown) elCell.classList.remove('revealed');
        gGame.inHintMode = false;
      }, 1000);
    }
  }
}
