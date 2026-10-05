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
      const modePill = document.getElementById('modePill');
      const modeText = document.getElementById('modeText');
      const turnPill = document.getElementById('turnPill');
      const turnText = document.getElementById('turnText');

      // Update mode pill
      modePill.className = 'mode-toggle ' + (freeMode ? 'free' : 'play');
      modeText.textContent = freeMode ? 'Free' : 'Play';

      if (!freeMode) {
        const p = currentPlayer();
        const colourHex = COLOUR_HEX[p.colour];
        turnPill.style.background = colourHex;
        turnPill.style.color = readableTextColour(colourHex);
        turnText.textContent = `${colourLabel(p.colour)} to move`;
        turnPill.style.display = 'inline-flex';
      } else {
        turnPill.style.display = 'none';
      }
    }

    function nextTurn() {
      // Advance to the next player who still has pieces and is not checkmated/stalemated.
      // Checkmate and stalemate are evaluated each turn (not permanent).
      let attempts = 0;
      const maxAttempts = PLAYERS.length;
      
      do {
        turnIndex = (turnIndex + 1) % PLAYERS.length;
        const player = PLAYERS[turnIndex];
        const colour = player.colour;
        const cnt = pieceCounts[colour] || 0;
        attempts++;
        
        if (cnt === 0) continue; // Eliminated — permanent skip
        
        const inCheck = isKingInCheck(player.key);
        const hasMoves = hasLegalMoves(player.key);
        
        if (inCheck && !hasMoves) continue; // Checkmate — skip this turn
        if (!inCheck && !hasMoves) continue; // Stalemate — skip this turn
        
        // Valid turn found
        renderTurn();
        updatePieceCountDisplay(); // Status updated BEFORE player moves
        return;
      } while (attempts < maxAttempts);
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
      // Track squares that have kings in check (to avoid creating attacker rings on king squares)
      const kingSquaresInCheck = new Set();
      for (const key in boardState) {
        const king = boardState[key];
        if (king && king.pieceType === 'king' && king.checkFlags?.length) {
          const kingColour = COLOUR_HEX[king.colour];
          const [kr, kc] = key.split(',').map(Number);
          // Track king squares that are in check - we won't create attacker rings on these
          kingSquaresInCheck.add(`${kr},${kc}`);
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

      console.log('[DEBUG refreshCheckMarkers] attackerMap built:', [...attackerMap.entries()].map(([pos, colors]) => `${pos}: ${colors.join(', ')}`).join('; '));

      // 2. Render king rings (show attacker colours - which players are checking)
      for (const key in boardState) {
        const piece = boardState[key];
        if (piece && piece.pieceType === 'king' && piece.checkFlags?.length) {
          const [r, c] = key.split(',').map(Number);
          const kingSq = squareEl(r, c);
          if (!kingSq) continue;

          const flags = piece.checkFlags;
          console.log(`[DEBUG refreshCheckMarkers] King ${piece.side} at ${r},${c} has ${flags.length} checkFlags:`, flags.map(f => `${f.attackerR},${f.attackerC} (${f.attackerColour})`).join(', '));

          // Each flag gets its own segment (no color merging)
          const n = flags.length;
          const segments = flags.map((f, i) => {
            const start = (360 / n) * i;
            const end = (360 / n) * (i + 1);
            const color = COLOUR_HEX[f.attackerColour];
            return `${color} ${start}deg, ${color} ${end}deg`;
          }).join(', ');

          console.log(`[DEBUG refreshCheckMarkers] King ${piece.side} ring segments: ${segments}`);
          const hadInCheck = kingSq.classList.contains('in-check');
          console.log(`[DEBUG refreshCheckMarkers] Adding in-check to ${piece.side} king at ${r},${c} (had in-check: ${hadInCheck})`);
          kingSq.style.setProperty('--check-king-gradient', `conic-gradient(${segments})`);
          kingSq.classList.add('in-check');
        }
      }

      // 3. Render attacker rings (show king colours - which kings are being attacked)
      for (const [posKey, kingColors] of attackerMap) {
        // Skip attacker rings on squares that have kings in check
        if (kingSquaresInCheck.has(posKey)) {
          continue;
        }
        const [r, c] = posKey.split(',').map(Number);
        const sq = squareEl(r, c);
        if (!sq) continue;

        const n = kingColors.length;
        const segments = kingColors.map((color, i) => {
          const start = (360 / n) * i;
          const end = (360 / n) * (i + 1);
          return `${color} ${start}deg, ${color} ${end}deg`;
        }).join(', ');

        console.log(`[DEBUG refreshCheckMarkers] Attacker at ${posKey} ring segments: ${segments}`);
        sq.style.setProperty('--check-attacker-gradient', `conic-gradient(${segments})`);
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
          const hadInCheck = s.classList.contains('in-check');
          const hadChecking = s.classList.contains('checking');
          if (hadInCheck || hadChecking) {
            console.log(`[DEBUG clearCheckVisuals] Removing classes from ${s.dataset.row},${s.dataset.col}: in-check=${hadInCheck}, checking=${hadChecking}`);
          }
          s.classList.remove('in-check', 'checking');
          s.style.removeProperty('--check-color');
          s.style.removeProperty('--check-ring-gradient');
          s.style.removeProperty('--check-king-gradient');
          s.style.removeProperty('--check-attacker-gradient');
        });
    }

    window.clearCheckVisuals = clearCheckVisuals;
