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
const testParam = new URLSearchParams(location.search).get('test');
if (testParam === 'enpassant') {
  loadEnPassantTest();
} else if (testParam === 'castle') {
  loadCastleTest();
} else {
  setupNormalBoard();
}

renderTurn();
fitBoard();
refreshEnPassantMarkers();

window.addEventListener('resize', fitBoard);
window.addEventListener('load', fitBoard);
if (window.ResizeObserver) {
  new ResizeObserver(fitBoard).observe(document.querySelector('.board-wrap'));
}
