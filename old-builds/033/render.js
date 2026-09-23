    /* ------------------------------------------------------------------ *
     *  RESPONSIVE SIZING
     *
     *  The board must fit inside the space left after the header, the
     *  side gutters and the top/bottom strips. Labels line up with the
     *  grid because they share --square-size, --gutter and --strip.
     * ------------------------------------------------------------------ */
    function fitBoard() {
      const wrap = document.querySelector('.board-wrap');
      const gutter = 22, strip = 22;
      const availW = Math.max(0, wrap.clientWidth  - 12 - gutter * 2);
      const availH = Math.max(0, wrap.clientHeight - 12 - strip  * 2);
      const size = Math.max(1, Math.floor(Math.min(availW, availH) / N));
      document.documentElement.style.setProperty('--square-size', size + 'px');
      document.documentElement.style.setProperty('--gutter', gutter + 'px');
      document.documentElement.style.setProperty('--strip', strip + 'px');
    }

    /* ------------------------------------------------------------------ *
     *  TURN INDICATOR
     *  Pill filled with the player's colour; text in black or white
     *  chosen by the colour's perceived luminance.
     * ------------------------------------------------------------------ */
    function renderTurn() {
      const p = currentPlayer();
      const colourHex = COLOUR_HEX[p.colour];
      const pill = document.getElementById('turnPill');
      pill.style.background = colourHex;
      pill.style.color = readableTextColour(colourHex);
      document.getElementById('turnText').textContent = `${colourLabel(p.colour)} to move`;
    }

    function nextTurn() {
      turnIndex = (turnIndex + 1) % PLAYERS.length;
      renderTurn();
    }

    /* ------------------------------------------------------------------ *
     *  SQUARES AND PIECES
     *  Locating squares, building piece sprites, and placing pieces.
     * ------------------------------------------------------------------ */
    function squareEl(r, c) {
      return board.querySelector(`.square[data-row="${r}"][data-col="${c}"]`);
    }

    function makePieceEl(pieceType, colour) {
      const el = document.createElement('div');
      el.className = 'piece';
      el.dataset.piece = pieceType;
      el.dataset.colour = colour;
      // 10-row sheet now: one cell is 1/10 of the height.
      el.style.backgroundSize = '600% 1000%';
      el.style.backgroundPosition =
        `${PIECE_COLS.indexOf(pieceType) * (100 / 5)}% ${colourIndex(colour) * (100 / 9)}%`;
      return el;
    }

    // Place a piece belonging to `side`, with `colour`, at (r,c).
    // The side is recorded on the piece so movement rules need no lookup.
    // Pawns start with hasMoved = false (they may still make a 2-square move).
    // Every piece starts with an empty enPassantFlags array (see state.js).
    function placePiece(r, c, pieceType, colour, side) {
      const sq = squareEl(r, c);
      if (!sq) return;
      const el = makePieceEl(pieceType, colour);
      sq.appendChild(el);
      boardState[r + ',' + c] = {
        pieceType,
        colour,
        side,
        hasMoved: false,
        el,
        enPassantFlags: []
      };
    }

    /* ------------------------------------------------------------------ *
     *  HIGHLIGHTS
     * ------------------------------------------------------------------ */
    function setOverlayColour(sq, colourKey) {
      sq.style.setProperty('--overlay-color', COLOUR_HEX[colourKey]);
    }

    function clearHighlights() {
      board.querySelectorAll('.square.selected, .square.hover-dest')
        .forEach(s => s.classList.remove('selected', 'hover-dest'));
    }

    function removeHeldFromBoard() {
      if (heldPiece && heldPiece.el.parentNode) {
        heldPiece.el.parentNode.removeChild(heldPiece.el);
      }
    }

    /* ------------------------------------------------------------------ *
     *  GHOST PIECE
     *  A 50%-opacity clone left on the origin square while the real piece
     *  is in hand. DISPLAY ONLY — never added to boardState, carries no
     *  en-passant flags, so it cannot affect game logic.
     * ------------------------------------------------------------------ */
    function addGhost(piece, sq) {
      removeGhost();
      const g = piece.el.cloneNode(true);
      g.classList.add('ghost');
      sq.appendChild(g);
      ghostEl = g;
      ghostSquare = sq;
    }

    // Remove the ghost, wherever it is. Called on drop AND on cancel,
    // so every exit path cleans up (otherwise a cancelled move would
    // leave a faint copy sitting on the origin square).
    function removeGhost() {
      if (ghostEl && ghostEl.parentNode) ghostEl.parentNode.removeChild(ghostEl);
      ghostEl = null;
      ghostSquare = null;
    }

    /* ------------------------------------------------------------------ *
     *  EN PASSANT MARKERS (debug aid)
     *
     *  Draws a ring on every square whose pawn currently holds an
     *  en-passant flag, so a pairing can be seen at a glance instead of
     *  inspecting boardState by hand. Purely cosmetic — it reads the
     *  flags, never changes them.
     *
     *  The markers are refreshed after every move (see dropOn in moves.js)
     *  and once at start-up, so a loaded test position is marked immediately.
     * ------------------------------------------------------------------ */
    function refreshEnPassantMarkers() {
      // Clear any existing rings.
      board.querySelectorAll('.square.ep-flagged')
        .forEach(s => s.classList.remove('ep-flagged'));

      // Ring every square whose pawn holds at least one flag.
      for (const key in boardState) {
        const p = boardState[key];
        if (p.enPassantFlags && p.enPassantFlags.length) {
          const [r, c] = key.split(',');
          const sq = squareEl(r, c);
          if (sq) sq.classList.add('ep-flagged');
        }
      }
    }
