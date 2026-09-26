    /* ------------------------------------------------------------------ *
     *  MOVE IN HAND
     * ------------------------------------------------------------------ */
    function pickUp(sq, piece) {
      const key = sq.dataset.row + ',' + sq.dataset.col;

      // Leave a faint clone on the origin square so the player can see
      // where the piece came from while it is in hand.
      addGhost(piece, sq);

      delete boardState[key];
      if (piece.el.parentNode) piece.el.parentNode.removeChild(piece.el);

      heldPiece = piece;
      selectedSquare = sq;

      setOverlayColour(sq, piece.colour);
      sq.classList.add('selected');
      piece.el.classList.add('dragging');

      previewIn(sq);
    }

    // Draw the held piece into the given square (removing it from any other).
    function previewIn(sq) {
      if (!heldPiece) return;
      removeHeldFromBoard();
      sq.appendChild(heldPiece.el);
    }

    function cancelMove() {
      if (!heldPiece || !selectedSquare) return;
      removeGhost();
      removeHeldFromBoard();
      heldPiece.el.classList.remove('dragging');
      selectedSquare.appendChild(heldPiece.el);
      boardState[selectedSquare.dataset.row + ',' + selectedSquare.dataset.col] = heldPiece;

      clearHighlights();
      heldPiece = null;
      selectedSquare = null;
    }

    /* ------------------------------------------------------------------ *
     *  CLICK HANDLING / MOVEMENT
     * ------------------------------------------------------------------ */
    function onSquareClick(sq) {
      const r = +sq.dataset.row, c = +sq.dataset.col;

      if (heldPiece) {
        if (sq === selectedSquare) { cancelMove(); return; }
        if (!isLegalDestination(selectedSquare, sq)) return; // illegal: ignore
        dropOn(sq);
        return;
      }

      const occupant = boardState[r + ',' + c];
      if (occupant && occupant.colour === currentPlayer().colour) {
        pickUp(sq, occupant);
      }
    }

    function dropOn(toSq) {
      if (!heldPiece || !selectedSquare) return;
      removeGhost();
      const tr = +toSq.dataset.row, tc = +toSq.dataset.col;
      const toKey = tr + ',' + tc;
      const fr = +selectedSquare.dataset.row, fc = +selectedSquare.dataset.col;

      // Work out the nature of this move from GEOMETRY, before mutating
      // any state. This avoids depending on a re-evaluation of the move.
      let isEpCapture = false;
      let twoSquarePawnMove = false;
      let skippedR = null, skippedC = null;

      if (heldPiece.pieceType === 'pawn') {
        const dr = tr - fr, dc = tc - fc;
        const dist = Math.abs(dr) + Math.abs(dc);

        // En passant: a one-square diagonal onto a flagged skipped square.
        if (isEnPassantCapture(heldPiece, fr, fc, tr, tc)) {
          isEpCapture = true;
        }

        // Two-square move (first move). Must be STRAIGHT — one axis
        // unchanged — because a diagonal capture is also distance 2 and
        // must not be mistaken for a two-square pawn advance.
        if (dist === 2 && (dr === 0 || dc === 0)) {
          twoSquarePawnMove = true;
          skippedR = fr + Math.sign(dr);
          skippedC = fc + Math.sign(dc);
        }
      }

      // EN PASSANT CAPTURE: remove the captured pawn from ITS OWN square
      // (the partner named by the flag), not from the destination. The
      // captured pawn is the one that had just moved two squares.
      if (isEpCapture) {
        const flag = heldPiece.enPassantFlags.find(
          f => f.skippedR === tr && f.skippedC === tc
        );
        if (flag) {
          const capKey = flag.r + ',' + flag.c;
          const capPiece = boardState[capKey];
          if (capPiece) {
            // Remove the captured pawn, and clear any flags naming it
            // on OTHER partners (they may also have been able to capture it).
            clearAllFlagsFor(capPiece, flag.r, flag.c);
            capPiece.el.remove();
            delete boardState[capKey];
            pieceCounts[capPiece.colour]--;
            updatePieceCountDisplay();
          }
        }
      }

      // The moving pawn has moved: clear ALL of its own flags, and the
      // matching flags on every partner it names (those pairings are dead).
      if (heldPiece.pieceType === 'pawn') {
        clearAllFlagsFor(heldPiece, fr, fc);
      }

      // Capture: a friendly occupant can never reach here (it is filtered
      // out in isLegalDestination), so any occupant is an enemy piece.
      // If the captured piece is a pawn carrying en-passant flags, clear
      // them and the matching flags on every pawn it was linked to, so no
      // stale flag is left pointing at this now-empty square.
      const target = boardState[toKey];
      if (target) {
        clearAllFlagsFor(target, tr, tc);
        target.el.remove();
        delete boardState[toKey];
        pieceCounts[target.colour]--;
        updatePieceCountDisplay();
      }

      previewIn(toSq);
      // CASTLING: detect if this move is a castling (king 2 squares toward unmoved rook)
      // Only execute if the actual destination matches a valid castling destination.
      let isCastling = false;
      let castlingRook = null, castlingRookKey = null, castlingStep = 0, castlingVertical = false;
      if (heldPiece.pieceType === 'king' && !heldPiece.hasMoved) {
        const fr = +selectedSquare.dataset.row, fc = +selectedSquare.dataset.col;
        const dr = tr - fr, dc = tc - fc;
        const absDr = Math.abs(dr), absDc = Math.abs(dc);

        // Vertical castling (West/East arms): king moves 2 squares vertically
        if (absDr === 2 && dc === 0) {
          const step = dr > 0 ? 1 : -1;
          // Search for unmoved rook in that direction
          for (let r = fr + step; r >= 0 && r < N; r += step) {
            const key = r + ',' + fc;
            const piece = boardState[key];
            if (piece && piece.pieceType === 'rook' && piece.colour === heldPiece.colour && !piece.hasMoved) {
              // Check path clear between king and rook
              let clearPath = true;
              for (let rr = fr + step; rr !== r; rr += step) {
                if (boardState[rr + ',' + fc]) { clearPath = false; break; }
              }
              if (clearPath) {
                isCastling = true;
                castlingRook = piece;
                castlingRookKey = key;
                castlingStep = step;
                castlingVertical = true;
              }
              break;
            }
            if (piece) break; // blocked
          }
        }
        // Horizontal castling (South/North arms): king moves 2 squares horizontally
        if (dr === 0 && absDc === 2) {
          const step = dc > 0 ? 1 : -1;
          for (let c = fc + step; c >= 0 && c < N; c += step) {
            const key = fr + ',' + c;
            const piece = boardState[key];
            if (piece && piece.pieceType === 'rook' && piece.colour === heldPiece.colour && !piece.hasMoved) {
              let clearPath = true;
              for (let cc = fc + step; cc !== c; cc += step) {
                if (boardState[fr + ',' + cc]) { clearPath = false; break; }
              }
              if (clearPath) {
                isCastling = true;
                castlingRook = piece;
                castlingRookKey = key;
                castlingStep = step;
                castlingVertical = false;
              }
              break;
            }
            if (piece) break;
          }
        }
      }

      if (isCastling) {
        const rook = castlingRook;
        const rookKey = castlingRookKey;
        const step = castlingStep;
        const vertical = castlingVertical;
        let rookDestKey, rookDestSq;
        if (vertical) {
          // Vertical castling: rook moves to square next to king (inside)
          const rookDestRow = tr - castlingStep;
          rookDestKey = rookDestRow + ',' + tc;
          rookDestSq = squareEl(rookDestRow, tc);
        } else {
          // Horizontal castling
          const rookDestCol = tc - castlingStep;
          rookDestKey = tr + ',' + rookDestCol;
          rookDestSq = squareEl(tr, rookDestCol);
        }
        // Move rook DOM element
        rookDestSq.appendChild(rook.el);
        // Update boardState
        delete boardState[castlingRookKey];
        rook.hasMoved = true;
        boardState[rookDestKey] = rook;
      }

      // Mark the moved piece as having moved (affects castling eligibility, etc.)
      heldPiece.hasMoved = true;

      // Move the piece to the destination in boardState (must happen before
      // promotion/en-passant logic which reads boardState[toKey]).
      boardState[toKey] = heldPiece;
      // PROMOTION: a pawn that lands on the outermost rank of an arm
      // other than its own is replaced by the piece that originally
      // stood on that back-rank square (the king square promotes to a
      // queen). The promoted piece takes the PAWN'S colour.
      if (heldPiece.pieceType === 'pawn' &&
          isPromotionSquare(heldPiece.side, tr, tc)) {
        const newType = promotionPieceFor(tr, tc);
        if (newType) {
          promotePiece(toSq, toKey, newType, heldPiece);
        }
      }

      // EN PASSANT FLAGS: if a pawn just made a two-square move, set a
      // flag on it naming each perpendicular-adjacent ENEMY pawn, and set
      // the reciprocal flag on each of those enemy pawns naming it. The
      // flags persist (see state.js) until a flagged pawn moves.
      if (twoSquarePawnMove) {
        const movingPawn = boardState[toKey];
        if (movingPawn && movingPawn.pieceType === 'pawn') {
          // Movement axis: vertical if the row changed, otherwise horizontal.
          const isVertical = (skippedR !== tr);

          // Perpendicular neighbours of the DESTINATION square.
          const neighbours = isVertical
            ? [[tr, tc - 1], [tr, tc + 1]]   // same row, left/right
            : [[tr - 1, tc], [tr + 1, tc]];  // same col, up/down

          for (const [nr, nc] of neighbours) {
            if (!isBoard(nr, nc)) continue;
            const neighbour = boardState[nr + ',' + nc];
            if (!neighbour) continue;
            if (neighbour.pieceType !== 'pawn') continue;
            if (neighbour.colour === movingPawn.colour) continue;

            // Flag on the two-square pawn: "this neighbour may capture me",
            // recording the neighbour's square and the skipped square.
            addFlag(movingPawn, nr, nc, skippedR, skippedC, movingPawn.colour);
            // Reciprocal flag on the neighbour: "I may capture that pawn",
            // recording the two-square pawn's square and the skipped square.
            addFlag(neighbour, tr, tc, skippedR, skippedC, movingPawn.colour);
          }
        }
      }

      clearHighlights();
      if (heldPiece) heldPiece.el.classList.remove('dragging');
      heldPiece = null;
      selectedSquare = null;

      // Refresh the en-passant rings so the new flag state is visible.
      refreshEnPassantMarkers();

      nextTurn();
    }

    // Replace the pawn on toSq with a new piece of newType, keeping the
    // pawn's colour and side. Updates boardState and the DOM.
    // The new piece starts with an empty enPassantFlags array (a promoted
    // piece is no longer a pawn, so it can never take part in en passant).
    function promotePiece(toSq, toKey, newType, pawn) {
      // Remove the pawn's sprite.
      if (pawn.el.parentNode) pawn.el.parentNode.removeChild(pawn.el);

      // Build the promoted piece's sprite in the pawn's colour.
      const el = makePieceEl(newType, pawn.colour);
      toSq.appendChild(el);

      boardState[toKey] = {
        pieceType: newType,
        colour: pawn.colour,
        side: pawn.side,
        hasMoved: true,   // irrelevant for non-pawns, kept for shape
        el,
        enPassantFlags: []
      };
    }

    // Moving the mouse over a square previews the held piece there —
    // but only if the destination is legal for the held piece.
    function onSquareEnter(sq) {
      if (!heldPiece) return;
      if (!isLegalDestination(selectedSquare, sq)) return; // illegal: no preview
      previewIn(sq);
      if (sq !== selectedSquare) {
        setOverlayColour(sq, heldPiece.colour);
        sq.classList.add('hover-dest');
      }
    }

    function onSquareLeave(sq) {
      sq.classList.remove('hover-dest');
    }
