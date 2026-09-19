    /* ------------------------------------------------------------------ *
     *  DEBUG: TEST POSITIONS
     *
     *  Loaded only when the page is opened with ?test=ep in the URL, so
     *  normal play is completely unaffected and the loader can never be
     *  triggered by accident. It clears the board and places a minimal
     *  set of pawns so an en-passant pairing can be set up in ONE move,
     *  instead of walking pawns halfway across a full board first.
     *
     *  IMPORTANT: one pawn is placed for EACH of the four players, using
     *  that player's ACTUAL randomly-assigned colour from this session.
     *    - Hard-coding colour names would fail whenever the random
     *      assignment doesn't include them (the pawn could never be
     *      picked up on its owner's turn).
     *    - Placing fewer than four pawns would SOFTLOCK the game: when
     *      turn order reached a player with no movable piece, no move
     *      could be made and the turn could never advance.
     *
     *  Layout:
     *    - South pawn on G-13 (12,6): the two-square mover. Its two-square
     *      advance goes G-13 -> G-11, skipping G-12.
     *    - West  pawn on F-11 (10,5): perpendicular-adjacent to G-11,
     *      so it may capture en passant onto the skipped square G-12.
     *    - East  pawn on H-11 (10,7): also perpendicular-adjacent, a
     *      second capturer (tests multiple partners).
     *    - North pawn on G-10 (9,6): a spare, so North always has a move
     *      and the turn order can never softlock on North's turn.
     *
     *  Usage:
     *    1. Open index.html?test=ep
     *    2. South moves G-13 -> G-11 (two squares). This creates the pairing.
     *    3. West's turn: F-11 -> G-12 captures en passant (South removed).
     *       (Or wait for East: H-11 -> G-12 — either may capture.)
     *    4. Reload with ?test=ep to reset.
     * ------------------------------------------------------------------ */
    function loadEnPassantTest() {
      // Wipe every piece currently on the board.
      for (const key in boardState) {
        const p = boardState[key];
        if (p && p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
        delete boardState[key];
      }

      // Use the ACTUAL colours assigned this session, so each pawn belongs
      // to a real player and can be picked up on that player's turn.
      const colSouth = PLAYERS[0].colour;
      const colWest  = PLAYERS[1].colour;
      const colNorth = PLAYERS[2].colour;
      const colEast  = PLAYERS[3].colour;

      // South pawn at G-13 (12,6): eligible for its two-square first move.
      placePiece(12, 6, 'pawn', colSouth, 'south');
      boardState['12,6'].hasMoved = false;

      // West pawn at F-11 (10,5): adjacent to G-11, the capturer.
      placePiece(10, 5, 'pawn', colWest, 'west');
      boardState['10,5'].hasMoved = true;

      // North pawn at G-10 (9,6): a spare, so North always has a move.
      placePiece(9, 6, 'pawn', colNorth, 'north');
      boardState['9,6'].hasMoved = true;

      // East pawn at H-11 (10,7): also adjacent to G-11, second capturer.
      placePiece(10, 7, 'pawn', colEast, 'east');
      boardState['10,7'].hasMoved = true;

      // South to move first (the two-square mover).
      turnIndex = 0;
      renderTurn();
    }

    // Only run the loader when ?test=ep is present in the URL.
    if (new URLSearchParams(location.search).get('test') === 'ep') {
      loadEnPassantTest();
    }
