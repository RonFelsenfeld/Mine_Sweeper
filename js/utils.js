'use strict';

// Utility Functions

function buildBoard(ROWS, COLS) {
  const mat = [];
  for (var i = 0; i < ROWS; i++) {
    const row = [];
    for (var j = 0; j < COLS; j++) {
      row.push('');
    }
    mat.push(row);
  }
  return mat;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function renderCell(location, value) {
  const cellSelector = getClassName(location);
  const elCell = document.querySelector(cellSelector);
  elCell.innerHTML = value;
}

function getClassName(location) {
  const cellClass = '.cell-' + location.i + '-' + location.j;
  return cellClass;
}

function getFormatSeconds(timeDiff) {
  const seconds = Math.floor(timeDiff / 1000);
  return (seconds + '').padStart(2, '0');
}

function playSound(URL) {
  const audio = new Audio(`sound/${URL}`);
  audio.play();
}
