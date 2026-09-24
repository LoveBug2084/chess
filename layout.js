/* ------------------------------------------------------------------ *
 *  STARTING LAYOUT
 *
 *  Queen/king squares are specified per arm so that each queen stands
 *  on a light square and each king on a dark square:
 *    North : queen G-14  (0,6)  light   king H-14  (0,7)  dark
 *    South : queen H-1   (13,7) light   king G-1   (13,6) dark
 *    West  : queen A-8   (6,0)  light   king A-7   (7,0)  dark
 *    East  : queen N-7   (7,13) light   king N-8   (6,13) dark
 * ------------------------------------------------------------------ */
const BACK_RANK_Q4 = ['rook','knight','bishop','queen','king','bishop','knight','rook'];
const BACK_RANK_Q5 = ['rook','knight','bishop','king','queen','bishop','knight','rook'];
const pawnRank = Array(8).fill('pawn');
const layout = {
  south: { colour: southColour, backRank: BACK_RANK_Q5, cells: [
    ...Array.from({length:8},(_,i)=>[13, C0+i]),
    ...Array.from({length:8},(_,i)=>[12, C0+i])
  ]},
  north: { colour: northColour, backRank: BACK_RANK_Q4, cells: [
    ...Array.from({length:8},(_,i)=>[0, C0+i]),
    ...Array.from({length:8},(_,i)=>[1, C0+i])
  ]},
  west: { colour: westColour, backRank: BACK_RANK_Q4, cells: [
    ...Array.from({length:8},(_,i)=>[C0+i, 0]),
    ...Array.from({length:8},(_,i)=>[C0+i, 1])
  ]},
  east: { colour: eastColour, backRank: BACK_RANK_Q5, cells: [
    ...Array.from({length:8},(_,i)=>[C0+i, 13]),
    ...Array.from({length:8},(_,i)=>[C0+i, 12])
  ]}
};

/* ------------------------------------------------------------------ *
 *  BUILD LABELS
 *  Column letters A..N (left to right) and row numbers 1..14 (bottom to
 *    top). Each label cell is one square wide/tall, so labels align
 *    with the board grid. Col 0 = A, row 0 = 14 (bottom row).
 * ------------------------------------------------------------------ */
(function buildLabels() {
  const LETTERS = 'ABCDEFGHIJKLMN';
  const colsTop    = document.getElementById('colsTop');
  const colsBottom = document.getElementById('colsBottom');
  const rowsLeft   = document.getElementById('rowsLeft');
  const rowsRight  = document.getElementById('rowsRight');

  for (let c = 0; c < N; c++) {
    const letter = LETTERS[c];
    for (const strip of [colsTop, colsBottom]) {
      const el = document.createElement('div');
      el.className = 'col-label';
      el.textContent = letter;
      strip.appendChild(el);
    }
  }

  for (let r = 0; r < N; r++) {
    const num = N - r;
    for (const strip of [rowsLeft, rowsRight]) {
      const el = document.createElement('div');
      el.className = 'row-label';
      el.textContent = num;
      strip.appendChild(el);
    }
  }
})();

/* ------------------------------------------------------------------ *
 *  BUILD DOM
 * ------------------------------------------------------------------ */
const board = document.getElementById('chessBoard');

for (let r = 0; r < N; r++) {
  for (let c = 0; c < N; c++) {
    if (!isBoard(r, c)) continue;
    const sq = document.createElement('div');
    sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
    sq.style.left = `calc(var(--square-size) * ${c})`;
    sq.style.top  = `calc(var(--square-size) * ${r})`;
    sq.dataset.row = r;
    sq.dataset.col = c;

    // DEFAULT ARM TINT: squares outside the centre carry a permanent
    // 30% wash of their arm owner's colour.
    const arm = armOf(r, c);
    if (arm) {
      sq.classList.add('arm-tint');
      sq.style.setProperty('--tint-color', armOwnerColour(arm));
    }

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    sq.appendChild(overlay);

    sq.addEventListener('click', () => onSquareClick(sq));
    sq.addEventListener('mouseenter', () => onSquareEnter(sq));
    sq.addEventListener('mouseleave', () => onSquareLeave(sq));

    board.appendChild(sq);
  }
}

// Suppress the context menu while a piece is in hand (right-click = cancel)
board.addEventListener('contextmenu', e => {
  if (heldPiece) { e.preventDefault(); cancelMove(); }
});

// Keyboard cancel
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && heldPiece) cancelMove();
});

/* ------------------------------------------------------------------ *
 *  PLACE THE FOUR ARMIES
 *
 *  Each army uses its own back rank (queen on a light square, king on
 *    a dark square — see STARTING LAYOUT above), and the same pawn rank.
 *    The first 8 cells are the back rank, the next 8 the pawns, so the
 *    layout arrays are ordered back-rank-first.
 * ------------------------------------------------------------------ */
for (const side in layout) {
  const { colour, backRank, cells } = layout[side];
  cells.forEach((rc, i) => {
    const type = i < 8 ? backRank[i] : pawnRank[i - 8];
    placePiece(rc[0], rc[1], type, colour, side);
  });
}