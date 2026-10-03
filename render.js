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
      // Advance to the next player who still has pieces.
      // Players with 0 pieces are eliminated and skipped.
      do {
        turnIndex = (turnIndex + 1) % PLAYERS.length;
      } while (pieceCounts[PLAYERS[turnIndex].colour] === 0);
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
    // Kings start with an empty checkFlags array.
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
        enPassantFlags: [],
        checkFlags: []
      };
      pieceCounts[colour]++;
    }

    window.placePiece = placePiece;
    window.fitBoard = fitBoard;
    window.renderTurn = renderTurn;
    window.nextTurn = nextTurn;
    window.squareEl = squareEl;
    window.makePieceEl = makePieceEl;
    window.setOverlayColour = setOverlayColour;
    window.clearHighlights = clearHighlights;
    window.removeHeldFromBoard = removeHeldFromBoard;
    window.addGhost = addGhost;
    window.removeGhost = removeGhost;
    window.refreshEnPassantMarkers = refreshEnPassantMarkers;

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
      board.querySelectorAll('.square.ep-flagged')
        .forEach(s => s.classList.remove('ep-flagged'));

      for (const key in boardState) {
        const p = boardState[key];
        if (p.enPassantFlags && p.enPassantFlags.length) {
          const [r, c] = key.split(',');
          const sq = squareEl(r, c);
          if (sq) {
            sq.classList.add('ep-flagged');
            const flags = p.enPassantFlags;
            const segments = flags.map((f, i) => {
              const start = (360 / flags.length) * i;
              const end = (360 / flags.length) * (i + 1);
              const color = COLOUR_HEX[f.creatorColour];
              return `${color} ${start}deg, ${color} ${end}deg`;
            }).join(', ');
            sq.style.setProperty('--ep-ring-gradient', `conic-gradient(${segments})`);
          }
        }
      }
    }

    /* ------------------------------------------------------------------ *
     *  CHECK MARKERS (visual aid)
     *
     *  Draws rings on king squares and attacker squares based on
     *  king.checkFlags. Mirrors the en passant marker system.
     *  Refreshed after every move via updateCheckFlags() + refreshCheckMarkers().
     *
     *  King rings show attacker colours (which players are checking the king).
     *  Attacker rings show king colours (which kings the piece is attacking).
     *  Both use conic-gradient segments: 360°/n per colour.
     * ------------------------------------------------------------------ */
    function refreshCheckMarkers() {
      // Clear old visuals first
      board.querySelectorAll('.square.in-check, .square.checking')
        .forEach(s => {
          s.classList.remove('in-check', 'checking');
          s.style.removeProperty('--check-color');
          s.style.removeProperty('--check-ring-gradient');
        });

      // 1. Build attackerMap: "r,c" -> [kingColour1, kingColour2, ...]
      // Maps each attacking piece's square to the king colours it's attacking.
      const attackerMap = new Map();
      for (const key in boardState) {
        const king = boardState[key];
        if (king && king.pieceType === 'king' && king.checkFlags?.length) {
          const kingColour = COLOUR_HEX[king.colour];
          for (const flag of king.checkFlags) {
            const posKey = `${flag.attackerR},${flag.attackerC}`;
            if (!attackerMap.has(posKey)) attackerMap.set(posKey, []);
            const colors = attackerMap.get(posKey);
            if (!colors.includes(kingColour)) {
              colors.push(kingColour);
            }
          }
        }
      }

      // 2. Render king rings (show attacker colours - which players are checking)
      for (const key in boardState) {
        const piece = boardState[key];
        if (piece && piece.pieceType === 'king' && piece.checkFlags?.length) {
          const [r, c] = key.split(',').map(Number);
          const kingSq = squareEl(r, c);
          if (!kingSq) continue;

          const flags = piece.checkFlags;
          const n = flags.length;
          const segments = flags.map((f, i) => {
            const start = (360 / n) * i;
            const end = (360 / n) * (i + 1);
            const color = COLOUR_HEX[f.attackerColour];
            return `${color} ${start}deg, ${color} ${end}deg`;
          }).join(', ');

          kingSq.style.setProperty('--check-ring-gradient', `conic-gradient(${segments})`);
          kingSq.classList.add('in-check');
        }
      }

      // 3. Render attacker rings (show king colours - which kings are being attacked)
      for (const [posKey, kingColors] of attackerMap) {
        const [r, c] = posKey.split(',').map(Number);
        const sq = squareEl(r, c);
        if (!sq) continue;

        const n = kingColors.length;
        const segments = kingColors.map((color, i) => {
          const start = (360 / n) * i;
          const end = (360 / n) * (i + 1);
          return `${color} ${start}deg, ${color} ${end}deg`;
        }).join(', ');

        sq.style.setProperty('--check-ring-gradient', `conic-gradient(${segments})`);
        sq.classList.add('checking');
      }
    }

    window.refreshCheckMarkers = refreshCheckMarkers;

    /* ------------------------------------------------------------------ *
     *  CLEAR CHECK VISUALS
     *  Removes all check-related visual markers from the board.
     * ------------------------------------------------------------------ */
    function clearCheckVisuals() {
      board.querySelectorAll('.square.in-check, .square.checking')
        .forEach(s => {
          s.classList.remove('in-check', 'checking');
          s.style.removeProperty('--check-color');
          s.style.removeProperty('--check-ring-gradient');
        });
    }

    window.clearCheckVisuals = clearCheckVisuals;