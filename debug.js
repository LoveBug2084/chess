/* ------------------------------------------------------------------ *
 *  DEBUG: TEST POSITIONS
 *
 *  Loaded only when the page is opened with ?test=enpassant or ?test=castle
 *  in the URL, so normal play is completely unaffected.
 *
 *  BOARD GEOMETRY (14x14, C0=3, C1=10, N=14):
 *  Plus shape: centre 8x8 (rows/cols 3-10) + four 8x3 arms.
 *  Dead corners (3x3): rows 0-2/cols 0-2, rows 0-2/cols 11-13,
 *                       rows 11-13/cols 0-2, rows 11-13/cols 11-13.
 *
 *  PAWN STARTING RANKS (one rank in from outer edge):
 *  South: row 12, cols 3-10  (moves UP toward centre, decreasing row)
 *  North: row 1,  cols 3-10  (moves DOWN toward centre, increasing row)
 *  West:  col 1,  rows 3-10  (moves RIGHT toward centre, increasing col)
 *  East:  col 12, rows 3-10  (moves LEFT toward centre, decreasing col)
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 *  EN PASSANT TEST — exact original 4-pawn configuration
 *
 *  Layout (4 pawns total):
 *    South pawn at G-12 (12,6): the two-square mover.
 *      Its two-square advance goes G-12 -> G-10, skipping G-11.
 *    West  pawn at F-10 (10,5): adjacent to G-11 (skipped square),
 *      so it may capture en passant onto the skipped square G-11.
 *    East  pawn at H-10 (10,7): also adjacent to G-11,
 *      a second capturer (tests multiple partners).
 *    North pawn at G-11 (9,6): a spare, so North always has a move
 *      and the turn order can never softlock on North's turn.
 *
 *  Turn order: South → West → North → East
 *  Usage:
 *    1. Open index.html?test=enpassant
 *    2. South moves G-12 -> G-10 (two squares). This creates the pairing.
 *    3. West's turn: F-10 -> G-11 captures en passant (South removed).
 *       (Or wait for East: H-10 -> G-11 — either may capture.)
 *    4. Reload with ?test=enpassant to reset.
 * ------------------------------------------------------------------ */
function loadEnPassantTest() {
  // Wipe every piece currently on the board.
  for (const key in boardState) {
    const p = boardState[key];
    if (p && p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
    delete boardState[key];
  }
  // Reset piece counts for all players.
  for (const player of PLAYERS) pieceCounts[player.colour] = 0;

  // Use the ACTUAL colours assigned this session.
  const colSouth = PLAYERS[0].colour;
  const colWest  = PLAYERS[1].colour;
  const colNorth = PLAYERS[2].colour;
  const colEast  = PLAYERS[3].colour;

  // South pawn at G-12 (12,6): eligible for its two-square first move.
  placePiece(12, 6, 'pawn', colSouth, 'south');
  boardState['12,6'].hasMoved = false;

  // West pawn at F-10 (10,5): adjacent to G-11, the capturer.
  placePiece(10, 5, 'pawn', colWest, 'west');
  boardState['10,5'].hasMoved = true;

  // North pawn at G-11 (9,6): a spare, so North always has a move.
  placePiece(9, 6, 'pawn', colNorth, 'north');
  boardState['9,6'].hasMoved = true;

  // East pawn at H-10 (10,7): also adjacent to G-11, second capturer.
  placePiece(10, 7, 'pawn', colEast, 'east');
  boardState['10,7'].hasMoved = true;

  // South to move first (the two-square mover).
  turnIndex = 0;
  renderTurn();
  updatePieceCountDisplay();
}

/* ------------------------------------------------------------------ *
 *  CASTLE TEST — all 4 players
 *
 *  Each player has their king and both rooks on their back rank,
 *  with all pieces unmoved (hasMoved = false).
 *
 *  Back ranks (internal coords):
 *    South: row 13, cols 3-10  (king G-1=13,6, rooks D-1=13,3 & K-1=13,10)
 *    North: row 0,  cols 3-10  (king G-14=0,6, rooks D-14=0,3 & K-14=0,10)
 *    West:  col 0,  rows 3-10  (king A-8=7,0, rooks A-4=3,0 & A-11=10,0)
 *    East:  col 13, rows 3-10  (king N-7=6,13, rooks N-4=3,13 & N-11=10,13)
 * ------------------------------------------------------------------ */
function loadCastleTest() {
  // Wipe the board.
  for (const key in boardState) {
    const p = boardState[key];
    if (p && p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
    delete boardState[key];
  }
  // Reset piece counts for all players.
  for (const player of PLAYERS) pieceCounts[player.colour] = 0;

  // Use the ACTUAL colours from the session.
  const colSouth = PLAYERS[0].colour;
  const colWest  = PLAYERS[1].colour;
  const colNorth = PLAYERS[2].colour;
  const colEast  = PLAYERS[3].colour;

  // --- SOUTH (horizontal, row 13, cols 3-10) ---
  placePiece(13, 6, 'king', colSouth, 'south'); boardState['13,6'].hasMoved = false;
  placePiece(13, 3, 'rook', colSouth, 'south'); boardState['13,3'].hasMoved = false;
  placePiece(13, 10, 'rook', colSouth, 'south'); boardState['13,10'].hasMoved = false;

  // --- NORTH (horizontal, row 0, cols 3-10) ---
  placePiece(0, 6, 'king', colNorth, 'north'); boardState['0,6'].hasMoved = false;
  placePiece(0, 3, 'rook', colNorth, 'north'); boardState['0,3'].hasMoved = false;
  placePiece(0, 10, 'rook', colNorth, 'north'); boardState['0,10'].hasMoved = false;

  // --- WEST (vertical, col 0, rows 3-10) ---
  // King at A-8 = (7,0), rooks at A-4 = (3,0) and A-11 = (10,0)
  placePiece(7, 0, 'king', colWest, 'west'); boardState['7,0'].hasMoved = false;
  placePiece(3, 0, 'rook', colWest, 'west'); boardState['3,0'].hasMoved = false;
  placePiece(10, 0, 'rook', colWest, 'west'); boardState['10,0'].hasMoved = false;

  // --- EAST (vertical, col 13, rows 3-10) ---
  // King at N-7 = (6,13), rooks at N-4 = (3,13) and N-11 = (10,13)
  placePiece(6, 13, 'king', colEast, 'east'); boardState['6,13'].hasMoved = false;
  placePiece(3, 13, 'rook', colEast, 'east'); boardState['3,13'].hasMoved = false;
  placePiece(10, 13, 'rook', colEast, 'east'); boardState['10,13'].hasMoved = false;

  // South to move first.
  turnIndex = 0;
  renderTurn();
  updatePieceCountDisplay();
}