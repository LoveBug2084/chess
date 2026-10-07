    /* ------------------------------------------------------------------ *
     *  MOVE IN HAND
     * ------------------------------------------------------------------ */
    let removedCheckFlags = null;  // { kingSide, flags[] } stored during drag

    function pickUp(sq, piece, e) {
      const fr = +sq.dataset.row, fc = +sq.dataset.col;
      console.log(`[DEBUG] PICKUP ${piece.pieceType} ${piece.colour} ${fr},${fc}`);
      if (piece.pieceType === 'king') {
        clearCheckVisuals();
        clearCheckFlags(piece);
        refreshCheckMarkers();  // Re-render other kings' rings
      }
      const key = sq.dataset.row + ',' + sq.dataset.col;

      // If picked piece is a checker, remove its flags from affected kings
      if (piece.pieceType !== 'king') {
        const fr = +sq.dataset.row, fc = +sq.dataset.col;
        const removed = [];
        
        for (const k in boardState) {
          const king = boardState[k];
          if (king && king.pieceType === 'king' && king.checkFlags?.length) {
            const matchingFlags = king.checkFlags.filter(f => 
              f.attackerR === fr && f.attackerC === fc
            );
            if (matchingFlags.length) {
              for (const flag of matchingFlags) {
                removeCheckFlag(king, flag.attackerR, flag.attackerC);
              }
              removed.push({ kingSide: king.side, flags: matchingFlags });
            }
          }
        }
        
        if (removed.length) {
          removedCheckFlags = removed;
          for (const r of removed) {
            console.log(`[DEBUG] PICKUP-CHECKER removed from ${r.kingSide} king`);
          }
          refreshCheckMarkers();
        }
      }

      addGhost(piece, sq);

      delete boardState[key];
      if (piece.el.parentNode) piece.el.parentNode.removeChild(piece.el);

      heldPiece = piece;
      selectedSquare = sq;

      setOverlayColour(sq, piece.colour);
      sq.classList.add('selected');
      piece.el.classList.add('dragging');

      board.appendChild(heldPiece.el);
      positionPieceAtMouse(e);
      window.addEventListener('mousemove', onMouseMove);
    }

    function onMouseMove(e) {
      if (!heldPiece) return;
      positionPieceAtMouse(e);
    }

    function positionPieceAtMouse(e) {
      if (!heldPiece) return;
      const rect = board.getBoundingClientRect();
      const squareSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--square-size'));
      const x = e.clientX - rect.left - squareSize / 2;
      const y = e.clientY - rect.top - squareSize / 2;
      heldPiece.el.style.left = x + 'px';
      heldPiece.el.style.top = y + 'px';
      heldPiece.el.style.width = squareSize + 'px';
      heldPiece.el.style.height = squareSize + 'px';
    }

    // Draw the held piece into the given square (removing it from any other).
    function previewIn(sq) {
      if (!heldPiece) return;
      removeHeldFromBoard();
      sq.appendChild(heldPiece.el);
    }

    function cancelMove() {
      if (!heldPiece || !selectedSquare) return;
      const fr = +selectedSquare.dataset.row, fc = +selectedSquare.dataset.col;
      console.log(`[DEBUG] CANCEL ${heldPiece.pieceType} ${heldPiece.colour} ${fr},${fc}`);
      removeGhost();
      window.removeEventListener('mousemove', onMouseMove);
      removeHeldFromBoard();
      heldPiece.el.style.left = '';
      heldPiece.el.style.top = '';
      heldPiece.el.style.width = '';
      heldPiece.el.style.height = '';
      heldPiece.el.classList.remove('dragging');
      selectedSquare.appendChild(heldPiece.el);
      boardState[selectedSquare.dataset.row + ',' + selectedSquare.dataset.col] = heldPiece;

      clearHighlights();
      clearCheckVisuals();

      // Recompute check flags from actual board state (handles both king and checker cancel)
      updateCheckFlags();
      refreshCheckMarkers();
      removedCheckFlags = null;  // Clear any stored state

      heldPiece = null;
      selectedSquare = null;
    }

    /* ------------------------------------------------------------------ *
     *  CLICK HANDLING / MOVEMENT
     * ------------------------------------------------------------------ */
    function onSquareClick(sq, e) {
      const r = +sq.dataset.row, c = +sq.dataset.col;

// Free mode: right-click on piece = delete
      if (freeMode && e.button === 2) {
        const key = r + ',' + c;
        const piece = boardState[key];
        if (piece) {
          if (piece.pieceType === 'pawn') {
            clearAllFlagsFor(piece, r, c);
          }
          piece.el.remove();
          delete boardState[key];
          pieceCounts[piece.colour]--;
          updatePieceCountDisplay();
          // Update visual markers after deletion in free mode
          updateCheckFlags();
          refreshCheckMarkers();
          refreshEnPassantMarkers();
          return;
        }
      }

      // Free mode: allow picking ANY piece, placing on ANY empty square
      if (freeMode) {
        if (heldPiece) {
          // Dropping piece
          if (sq === selectedSquare) { cancelMove(); return; }
          if (!boardState[r + ',' + c]) {
            dropOn(sq);  // reuse existing drop logic but skip turn advance
          }
          return;
        }

        // Pick up any piece (any color)
        const occupant = boardState[r + ',' + c];
        if (occupant) {
          pickUp(sq, occupant, e);
        }
        return;
      }

      if (heldPiece) {
        if (sq === selectedSquare) { cancelMove(); return; }
        if (!isLegalDestination(selectedSquare, sq)) return; // illegal: ignore
        dropOn(sq);
        return;
      }

      const occupant = boardState[r + ',' + c];
      if (occupant && occupant.colour === currentPlayer().colour) {
        pickUp(sq, occupant, e);
      }
    }

    function dropOn(toSq) {
      if (!heldPiece || !selectedSquare) return;
      const tr = +toSq.dataset.row, tc = +toSq.dataset.col;
      const fr = +selectedSquare.dataset.row, fc = +selectedSquare.dataset.col;
      console.log(`[DEBUG] DROP ${heldPiece.pieceType} ${heldPiece.colour} ${fr},${fc}→${tr},${tc} ${freeMode ? 'free' : 'play'}`);
      removeGhost();
      const toKey = tr + ',' + tc;

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

      window.removeEventListener('mousemove', onMouseMove);
      heldPiece.el.style.left = '';
      heldPiece.el.style.top = '';
      heldPiece.el.style.width = '';
      heldPiece.el.style.height = '';
      toSq.appendChild(heldPiece.el);

      // CASTLING: use shared helper (validation already passed in isLegalDestination)
      const castling = findCastlingRook(heldPiece, +selectedSquare.dataset.row, +selectedSquare.dataset.col, tr, tc);
      if (castling) {
        const { rook, rookKey, rookDestKey, rookDestSq } = castling;
        rookDestSq.appendChild(rook.el);
        delete boardState[rookKey];
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
      // Only create en passant flags in play mode, never in free mode.
      if (!freeMode && twoSquarePawnMove) {
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
      window.removeEventListener('mousemove', onMouseMove);
      if (heldPiece) {
        heldPiece.el.style.left = '';
        heldPiece.el.style.top = '';
        heldPiece.el.classList.remove('dragging');
      }
      const movedPieceType = heldPiece?.pieceType;
      const movedFr = fr;
      const movedFc = fc;
      heldPiece = null;
      selectedSquare = null;

      if (!freeMode) {
        // Play mode: update everything including en passant
        refreshEnPassantMarkers();
        updateCheckFlags();
        refreshCheckMarkers();
        nextTurn();
      } else {
        // Free mode: clear en passant flags from moved pawn and its partners, then refresh visuals
        if (movedPieceType === 'pawn') {
          clearAllFlagsFor({ pieceType: 'pawn', colour: heldPiece?.colour, side: heldPiece?.side }, movedFr, movedFc);
        }
        refreshEnPassantMarkers();
        updateCheckFlags();
        console.log(`[DEBUG] DROP-UPDATE check flags updated`);
        refreshCheckMarkers();
        updatePieceCountDisplay();
        console.log(`[DEBUG] DROP-DISPLAY status updated`);
      }
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
        enPassantFlags: [],
        checkFlags: []
      };
    }

    // Moving the mouse over a square highlights it —
    // but only if the destination is legal for the held piece.
    function onSquareEnter(sq) {
      if (!heldPiece) return;
      if (freeMode) {
        // In free mode, highlight any empty square
        if (sq !== selectedSquare && !boardState[sq.dataset.row + ',' + sq.dataset.col]) {
          setOverlayColour(sq, heldPiece.colour);
          sq.classList.add('hover-dest');
        }
        return;
      }
      if (!isLegalDestination(selectedSquare, sq)) return; // illegal: no highlight
      if (sq !== selectedSquare) {
        setOverlayColour(sq, heldPiece.colour);
        sq.classList.add('hover-dest');
      }
    }

    function onSquareLeave(sq) {
      sq.classList.remove('hover-dest');
    }
