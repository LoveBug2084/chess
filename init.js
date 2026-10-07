/* ------------------------------------------------------------------ *
 *  SPRITE SANITY CHECK + INIT
 *
 *  The last script to load. Verifies the sprite sheet is reachable,
 *  then fires the start-up calls: draw the turn pill, size the board,
 *  mark any en-passant pairings, and keep the board fitted on resize.
 *  IMPORTANT: checks debug mode BEFORE placing pieces so only ONE
 *  board setup runs (normal or debug), keeping pieceCounts correct.
 * ------------------------------------------------------------------ */
const sprite = new Image();
sprite.onerror = () => console.error('Sprite sheet not found: img/sprites.png');
sprite.src = 'img/sprites.png';

// Check debug mode FIRST, before placing any pieces
const params = new URLSearchParams(location.search);
if (params.has('enpassant')) {
  loadEnPassantTest();
} else if (params.has('castle')) {
  loadCastleTest();
} else if (params.has('check')) {
  loadCheckTest();
} else if (params.has('checkmate')) {
  loadCheckmateTest();
} else {
  setupNormalBoard();
}

renderTurn();
fitBoard();
refreshEnPassantMarkers();

// Initialize check flags and markers on initial board
updateCheckFlags();
refreshCheckMarkers();

window.addEventListener('resize', fitBoard);
window.addEventListener('load', fitBoard);
if (window.ResizeObserver) {
  new ResizeObserver(fitBoard).observe(document.querySelector('.board-wrap'));
}

// Mode toggle
document.getElementById('modePill').addEventListener('click', () => {
  freeMode = !freeMode;
  window.freeMode = freeMode;
  if (!freeMode) {
    // Entering play mode: validate current player
    const currentPlayer = PLAYERS[turnIndex];
    const cnt = pieceCounts[currentPlayer.colour] || 0;
    if (cnt === 0) {
      nextTurn();  // Skip eliminated player (handles all-zero via fallback)
    } else {
      renderTurn();  // Keep current player
    }
  } else {
    renderTurn();  // Free mode: just update display
  }
});

// Suppress context menu in both modes
board.addEventListener('contextmenu', e => {
  e.preventDefault(); // Prevent browser context menu
  if (freeMode) {
    // In free mode, let onSquareClick handle right-click delete
    return;
  }
  // In play mode, right-click cancels move if holding piece
  if (heldPiece) { cancelMove(); }
});
