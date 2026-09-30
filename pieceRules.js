    /* ------------------------------------------------------------------ *
     *  PAWN RULES
     *
     *  Colour is resolved BEFORE this logic runs: isLegalDestination()
     *  rejects any destination holding a friendly piece, so by the time a
     *  destination reaches here it is either EMPTY or holds an ENEMY.
     *  The pawn therefore only needs to test occupancy, never colour.
     *
     *  A pawn in an arm has ONE direction of travel — its "forward". Which
     *  way that points depends on WHOSE arm it is standing in:
     *
     *    - In its OWN arm  (the arm matching its side): forward is TOWARD
     *      the centre.
     *    - In an ENEMY arm (any other arm): forward is AWAY from the
     *      centre, deeper into the arm.
     *
     *  So a pawn always advances the way it is "facing", and once it enters
     *  an enemy arm it keeps going deeper toward that arm's outer rank
     *  (where it can promote) — it cannot turn around or step aside.
     *
     *  MOVEMENT (per zone):
     *   - In an arm: ONE square forward along the arm's axis, in the
     *     facing direction described above. NOT sideways, NOT backward.
     *   - In the centre: forward or sideways, never backward.
     *   - First move: a pawn that has never moved may advance 2 squares
     *     forward (from its arm's outer rank, so only forward is possible).
     *     The 2-square advance is BLOCKED if the square it passes over
     *     (or its destination) is occupied.
     *
     *  CAPTURE (diagonals only, and only the diagonals that flank the
     *  forward direction):
     *   - In an arm: the TWO diagonals flanking the facing direction.
     *   - In the centre: the TWO forward diagonals.
     *
     *  A non-diagonal move may only land on an EMPTY square.
     *  A diagonal capture may only land on an OCCUPIED square (an enemy),
     *  OR on the en-passant skipped square (see isEnPassantCapture).
     *
     *  PROMOTION: a pawn promotes on the outermost rank of any arm that is
     *  NOT its own (see isPromotionSquare in geometry.js).
     *
     *  EN PASSANT:
     *   When an enemy pawn makes a two-square first move and lands
     *   perpendicular-adjacent to this pawn, this pawn may capture it by
     *   moving diagonally onto the SKIPPED square. The captured pawn sits
     *   beside the destination, not on it. This is authorised by the
     *   en-passant flags (see state.js), and remains available for as long
     *   as the flags stand — it is NOT limited to one turn.
     * ------------------------------------------------------------------ */
    // Per-side orientation, used for the CENTRE rule.
    // forward  = one step toward the centre of the board
    // backward = the forbidden direction
    const SIDE_ORIENTATION = {
      south: { forward: [-1, 0], sideways: [[0, -1], [0, 1]] }, // up
      north: { forward: [ 1, 0], sideways: [[0, -1], [0, 1]] }, // down
      west:  { forward: [ 0, 1], sideways: [[-1, 0], [1, 0]] }, // right
      east:  { forward: [ 0,-1], sideways: [[-1, 0], [1, 0]] }  // left
    };

    // The arm-owner's forward direction (one step toward the centre).
    const ARM_FORWARD = {
      N: [ 1, 0],   // north arm: toward centre = down
      S: [-1, 0],   // south arm: toward centre = up
      W: [ 0, 1],   // west arm:  toward centre = right
      E: [ 0,-1]    // east arm:  toward centre = left
    };

    // The two forward diagonal directions for a given side (centre captures).
    function centreCaptureDiagonals(side) {
      const o = SIDE_ORIENTATION[side];
      if (!o) return [];
      const [fr, fc] = o.forward;
      return o.sideways.map(([sr, sc]) => [fr + sr, fc + sc]);
    }

    // The direction a pawn "faces" while standing in a given arm.
    // In the pawn's OWN arm that is toward the centre (ARM_FORWARD);
    // in an ENEMY arm it is away from the centre (the negative).
    function armFacing(side, arm) {
      const toward = ARM_FORWARD[arm];
      if (!toward) return null;
      return (arm === HOME_ARM[side])
        ? [ toward[0],  toward[1] ]      // own arm: toward centre
        : [ -toward[0], -toward[1] ];    // enemy arm: away from centre
    }

    // The two diagonals flanking a given forward direction.
    function diagonalsFlanking(f) {
      const [fr, fc] = f;
      // Perpendicular step is the forward vector rotated 90 degrees.
      const pr = -fc, pc = fr;
      return [
        [fr + pr, fc + pc],
        [fr - pr, fc - pc]
      ];
    }

    // Check if a piece of given colour on (fr,fc) can capture (tr,tc)
    // Uses the same movement logic as isLegalDestination but without UI state
    function canPieceCapture(piece, fr, fc, tr, tc, targetColour) {
      if (!isBoard(tr, tc)) return false;
      if (piece.colour === targetColour) return false; // friendly

      const dr = tr - fr, dc = tc - fc;
      const absDr = Math.abs(dr), absDc = Math.abs(dc);
      const dist = absDr + absDc;

      // Pawn captures
      if (piece.pieceType === 'pawn') {
        const isDiagonal = (absDr === 1 && absDc === 1);
        const o = SIDE_ORIENTATION[piece.side];
        if (!o) return false;

        if (!inCentre(fr, fc)) {
          // In an arm: facing direction depends on whose arm
          const arm = armOf(fr, fc);
          const f = armFacing(piece.side, arm);
          if (!f) return false;

          if (isDiagonal) {
            const diags = diagonalsFlanking(f);
            return diags.some(([a, b]) => dr === a && dc === b);
          }
          return false; // pawns only capture diagonally
        } else {
          // In centre: forward diagonals only
          const diags = centreCaptureDiagonals(piece.side);
          return diags.some(([a, b]) => dr === a && dc === b);
        }
      }

      // Rook: horizontal/vertical sliding
      if (piece.pieceType === 'rook') {
        if (fr !== tr && fc !== tc) return false;
        const rowStep = fr === tr ? 0 : (tr > fr ? 1 : -1);
        const colStep = fc === tc ? 0 : (tc > fc ? 1 : -1);
        let r = fr + rowStep, c = fc + colStep;
        while (!(r === tr && c === tc)) {
          if (boardState[r + ',' + c]) return false; // blocked
          r += rowStep; c += colStep;
        }
        return true;
      }

      // Bishop: diagonal sliding
      if (piece.pieceType === 'bishop') {
        if (absDr !== absDc || dist === 0) return false;
        const rowStep = dr > 0 ? 1 : -1;
        const colStep = dc > 0 ? 1 : -1;
        let r = fr + rowStep, c = fc + colStep;
        while (!(r === tr && c === tc)) {
          if (boardState[r + ',' + c]) return false;
          r += rowStep; c += colStep;
        }
        return true;
      }

      // Queen: rook + bishop
      if (piece.pieceType === 'queen') {
        if (fr !== tr && fc !== tc && absDr !== absDc) return false;
        const rowStep = fr === tr ? 0 : (tr > fr ? 1 : -1);
        const colStep = fc === tc ? 0 : (tc > fc ? 1 : -1);
        let r = fr + rowStep, c = fc + colStep;
        while (!(r === tr && c === tc)) {
          if (boardState[r + ',' + c]) return false;
          r += rowStep; c += colStep;
        }
        return true;
      }

      // Knight: L-shape jump
      if (piece.pieceType === 'knight') {
        return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2);
      }

      // King: one square any direction
      if (piece.pieceType === 'king') {
        return absDr <= 1 && absDc <= 1 && dist !== 0;
      }

      return false;
    }

    // Check if any enemy piece of the given colour attacks (tr,tc)
    // targetColour = the colour of the piece on (tr,tc) (e.g. the king)
    function isSquareAttacked(tr, tc, byColour, targetColour) {
      for (const key in boardState) {
        const piece = boardState[key];
        if (!piece || piece.colour !== byColour) continue;
        const [fr, fc] = key.split(',').map(Number);
        if (canPieceCapture(piece, fr, fc, tr, tc, targetColour)) {
          return true;
        }
      }
      return false;
    }

    // Check if the king's own side is currently in check
    // If kingPos is provided, use it (for when king is in hand); otherwise search boardState
    function isKingInCheck(kingSide, kingPos) {
      console.log('DEBUG isKingInCheck called with:', { kingSide, kingPos, PLAYERS: PLAYERS.map(p => p.key) });
      const player = PLAYERS.find(p => p.key === kingSide);
      console.log('DEBUG PLAYERS.find result:', player);
      if (!player) {
        console.error('ERROR: PLAYERS.find returned undefined for kingSide:', kingSide);
        return false;
      }
      const kingColour = player.colour;
      let kr, kc;
      if (kingPos) {
        kr = kingPos.r; kc = kingPos.c;
      } else {
        // Find the king in boardState
        let found = false;
        for (const key in boardState) {
          const piece = boardState[key];
          if (piece && piece.pieceType === 'king' && piece.side === kingSide) {
            [kr, kc] = key.split(',').map(Number);
            found = true;
            break;
          }
        }
        if (!found) {
          console.log('DEBUG: No king found for side', kingSide, 'returning false');
          return false;
        }
      }
      // Check against all three opponent colours
      for (const player of PLAYERS) {
        if (player.colour === kingColour) continue;
        if (isSquareAttacked(kr, kc, player.colour, kingColour)) return true;
      }
      return false;
    }

    // Evaluate a pawn move. Returns { legal, capture, enPassant }.
    // `pawn` is the piece being moved (needed so its flags can be read —
    // it is NOT in boardState while in hand).
    // occupant is the piece (if any) currently on the destination square.
    // It is never a friendly piece (see note above).
    // pathClear is a function (r,c) -> bool reporting whether a square is
    // empty (used to block the 2-square advance).
    function evaluatePawnMove(pawn, side, hasMoved, fr, fc, tr, tc, occupant, pathClear) {
      const fail = { legal: false, capture: false, enPassant: false };
      if (!isBoard(tr, tc)) return fail;

      const dr = tr - fr, dc = tc - fc;
      const adr = Math.abs(dr), adc = Math.abs(dc);
      const isDiagonal = (adr === 1 && adc === 1);
      const dist = adr + adc;

      // Any occupant here is an enemy (friendlies were filtered out already).
      const occupied = !!occupant;

      if (!inCentre(fr, fc)) {
        // IN AN ARM: one direction of travel — the pawn's facing direction,
        // which points toward the centre in its own arm and away from the
        // centre in an enemy arm. No sideways, no backward.
        const arm = armOf(fr, fc);
        const f = armFacing(side, arm);
        if (!f) return fail;

        // Diagonal capture: only the two diagonals flanking the facing
        // direction, onto an occupied square.
        if (isDiagonal) {
          const diags = diagonalsFlanking(f);
          const isFacingDiag = diags.some(([a, b]) => dr === a && dc === b);
          if (isFacingDiag && occupied) {
            return { legal: true, capture: true, enPassant: false };
          }
          // En passant: a facing diagonal onto an EMPTY square, authorised
          // by a flag whose skipped square is the destination.
          if (isFacingDiag && !occupied && isEnPassantCapture(pawn, fr, fc, tr, tc)) {
            return { legal: true, capture: true, enPassant: true };
          }
          return fail;
        }

        // One square FORWARD along the facing direction, onto empty.
        if (dist === 1) {
          if (dr === f[0] && dc === f[1] && !occupant) {
            return { legal: true, capture: false, enPassant: false };
          }
          return fail;
        }

        // First move: two squares FORWARD only, onto an empty square,
        // and only if the square passed over is also empty (blocking).
        if (dist === 2 && !hasMoved) {
          if (dr === f[0] * 2 && dc === f[1] * 2 && !occupant) {
            const midR = fr + f[0];
            const midC = fc + f[1];
            if (pathClear(midR, midC)) {
              return { legal: true, capture: false, enPassant: false };
            }
          }
        }
        return fail;
      }

      // IN THE CENTRE: use the pawn's own side's forward + sideways.
      const o = SIDE_ORIENTATION[side];
      if (!o) return fail;

      // Diagonal capture: only the two forward diagonals, onto an occupied square.
      if (isDiagonal) {
        const diags = centreCaptureDiagonals(side);
        const isForwardDiag = diags.some(([a, b]) => dr === a && dc === b);
        if (isForwardDiag && occupied) {
          return { legal: true, capture: true, enPassant: false };
        }
        // EN PASSANT FROM THE CENTRE: a forward diagonal onto an empty
        // square, authorised by a flag whose skipped square is the destination.
        if (isForwardDiag && !occupied &&
            isEnPassantCapture(pawn, fr, fc, tr, tc)) {
          return { legal: true, capture: true, enPassant: true };
        }
        return fail;
      }

      // One square forward or sideways, onto an empty square.
      if (dist === 1) {
        const isForward  = (dr === o.forward[0]  && dc === o.forward[1]);
        const isSideways = o.sideways.some(([sr, sc]) => dr === sr && dc === sc);
        if ((isForward || isSideways) && !occupant) {
          return { legal: true, capture: false, enPassant: false };
        }
      }
      // (A pawn in the centre has necessarily already moved, so no 2-square
      //  advance is possible there — this is unreachable by the rules.)
      return fail;
    }

    // Is a move legal for the piece currently in hand?
    //
    // PAWNS use their own movement/capture rules (evaluatePawnMove).
    // Rooks move horizontally/vertically with path blocking.
    // ALL OTHER PIECES are still free-move for now, EXCEPT that no piece
    // may land on a square occupied by a piece of its OWN colour.
    function isLegalDestination(fromSq, toSq) {
      if (!heldPiece) return false;

      // Allow returning piece to its origin square (cancel move)
      if (toSq === fromSq) return true;

      const tr = +toSq.dataset.row, tc = +toSq.dataset.col;
      const occupant = boardState[tr + ',' + tc];

// A piece may never land on a friendly piece (applies to every piece).
        // After this check, any remaining occupant is an enemy.
        if (occupant && occupant.colour === heldPiece.colour) return false;
        if (occupant && occupant.pieceType === 'king') return false;

        // For non-king pieces: simulate the move and check if own king would be in check.
        // This prevents discovered check (moving a piece that was shielding the king).
        if (heldPiece.pieceType !== 'king') {
          const fr = +fromSq.dataset.row, fc = +fromSq.dataset.col;
          const kingSide = heldPiece.side;
          const fromKey = fr + ',' + fc;
          const toKey = tr + ',' + tc;

          // Handle en passant capture specially - captured pawn is on partner square, not destination.
          let epCaptureData = null;
          if (heldPiece.pieceType === 'pawn') {
            const flag = heldPiece.enPassantFlags?.find(f => f.skippedR === tr && f.skippedC === tc);
            if (flag) {
              const capKey = flag.r + ',' + flag.c;
              const capPiece = boardState[capKey];
              if (capPiece) {
                epCaptureData = { key: capKey, piece: capPiece };
                delete boardState[capKey];
              }
            }
          }

          // Simulate the move. heldPiece is in hand (not in boardState during hover/pickup),
          // so we place it on the destination directly.
          boardState[toKey] = heldPiece;

          // Check if king is in check after the simulated move.
          const inCheck = isKingInCheck(kingSide, null);

          // Revert simulation.
          delete boardState[toKey];
          if (epCaptureData) boardState[epCaptureData.key] = epCaptureData.piece;

          if (inCheck) return false;
        }

        // Pawns follow their full movement rules. The pawn itself is passed
      // in, because it is in hand (removed from boardState) and its
      // en-passant flags must be readable.
      if (heldPiece.pieceType === 'pawn') {
        const fr = +fromSq.dataset.row, fc = +fromSq.dataset.col;
        // pathClear: a square is clear if no piece sits on it.
        const pathClear = (r, c) => !boardState[r + ',' + c];
        return evaluatePawnMove(
          heldPiece, heldPiece.side, heldPiece.hasMoved,
          fr, fc, tr, tc, occupant, pathClear
        ).legal;
      }

      // Rook moves: any number of squares horizontally or vertically,
      // provided the path is clear.
      if (heldPiece.pieceType === 'rook') {
        const fr = +fromSq.dataset.row, fc = +fromSq.dataset.col;
        // Must be same row or same column.
        if (fr !== tr && fc !== tc) return false;
        // Determine step direction.
        const rowStep = fr === tr ? 0 : (tr > fr ? 1 : -1);
        const colStep = fc === tc ? 0 : (tc > fc ? 1 : -1);
        // pathClear: a square is clear if no piece sits on it.
        const pathClear = (r, c) => !boardState[r + ',' + c];
        // Walk from start (exclusive) to destination (inclusive).
        let r = fr + rowStep, c = fc + colStep;
        while (!(r === tr && c === tc)) {
          if (!pathClear(r, c)) return false; // blocked
          r += rowStep;
          c += colStep;
        }
        // Destination square may be empty or enemy (already checked friendly).
        return true;
      }
      // Knight moves: L‑shape (2 squares in one direction, 1 in the perpendicular), jumps over pieces.
      if (heldPiece.pieceType === 'knight') {
        const fr = +fromSq.dataset.row, fc = +fromSq.dataset.col;
        const dr = Math.abs(tr - fr), dc = Math.abs(tc - fc);
        // Valid knight jump?
        if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) {
          // Destination already checked for friendly piece; can be empty or enemy.
          return true;
        }
        return false;
      }

      // Bishop moves: any number of squares diagonally, provided the path is clear.
      if (heldPiece.pieceType === 'bishop') {
        const fr = +fromSq.dataset.row, fc = +fromSq.dataset.col;
        const dr = tr - fr, dc = tc - fc;
        // Must be diagonal: |dr| == |dc| and not zero distance
        if (Math.abs(dr) !== Math.abs(dc) || (dr === 0 && dc === 0)) return false;
        const rowStep = dr > 0 ? 1 : -1;
        const colStep = dc > 0 ? 1 : -1;
        const pathClear = (r, c) => !boardState[r + ',' + c];
        let r = fr + rowStep, c = fc + colStep;
        while (!(r === tr && c === tc)) {
          if (!pathClear(r, c)) return false; // blocked
          r += rowStep;
          c += colStep;
        }
        // Destination may be empty or enemy (friendly already checked)
        return true;
      }

      // Queen moves: combine rook and bishop – any number of squares horizontally, vertically, or diagonally, path must be clear.
      if (heldPiece.pieceType === 'queen') {
        const fr = +fromSq.dataset.row, fc = +fromSq.dataset.col;
        const dr = tr - fr, dc = tc - fc;
        // Must be straight line: same row, same column, or diagonal
        if (fr !== tr && fc !== tc && Math.abs(dr) !== Math.abs(dc)) return false;
        // Determine step direction for rows and columns (0, 1, or -1)
        const rowStep = fr === tr ? 0 : (tr > fr ? 1 : -1);
        const colStep = fc === tc ? 0 : (tc > fc ? 1 : -1);
        const pathClear = (r, c) => !boardState[r + ',' + c];
        let r = fr + rowStep, c = fc + colStep;
        while (!(r === tr && c === tc)) {
          if (!pathClear(r, c)) return false; // blocked
          r += rowStep;
          c += colStep;
        }
        // Destination may be empty or enemy (friendly already checked)
        return true;
      }

      // King moves: one square in any direction (including diagonals), cannot move into check.
      // Castling: king moves 2 squares horizontally toward a rook that hasn't moved, with no pieces between.
      // King cannot castle out of, through, or into check.
      if (heldPiece.pieceType === 'king') {
        const fr = +fromSq.dataset.row, fc = +fromSq.dataset.col;
        const dr = tr - fr, dc = tc - fc;
        const absDr = Math.abs(dr), absDc = Math.abs(dc);
        const kingColour = heldPiece.colour;

        // Normal king move: one square any direction
        if (absDr <= 1 && absDc <= 1 && !(dr === 0 && dc === 0)) {
          // Cannot move into check
          for (const player of PLAYERS) {
            if (player.colour === kingColour) continue;
            if (isSquareAttacked(tr, tc, player.colour, kingColour)) return false;
          }
          return true;
        }

        // Castling: 2-square move toward an unmoved rook (horizontal or vertical)
        // King cannot castle out of, through, or into check
        const kingPos = { r: fr, c: fc };
        if (!heldPiece.hasMoved && !isKingInCheck(heldPiece.side, kingPos)) {
          // Vertical castling (West/East arms)
          if (absDr === 2 && dc === 0) {
            const step = dr > 0 ? 1 : -1;
            let rook = null, rookKey = null, rookRow = null;
            for (let r = fr + step; r >= 0 && r < N; r += step) {
              const key = r + ',' + fc;
              const piece = boardState[key];
              if (piece && piece.pieceType === 'rook' && piece.colour === kingColour && !piece.hasMoved) {
                rook = piece;
                rookKey = key;
                rookRow = r;
                break;
              }
              if (piece) break;
            }
            if (rook) {
              let clear = true;
              for (let r = fr + step; r !== rookRow; r += step) {
                if (boardState[r + ',' + fc]) { clear = false; break; }
              }
              if (clear) {
                // Check intermediate and destination squares for attacks
                let safe = true;
                for (let r = fr + step; r !== tr + step; r += step) {
                  for (const player of PLAYERS) {
                    if (player.colour === kingColour) continue;
                    if (isSquareAttacked(r, fc, player.colour, kingColour)) { safe = false; break; }
                  }
                  if (!safe) break;
                }
                if (safe) return true;
              }
            }
          }
          // Horizontal castling (South/North arms)
          if (dr === 0 && absDc === 2) {
            const step = dc > 0 ? 1 : -1;
            let rook = null, rookKey = null, rookCol = null;
            for (let c = fc + step; c >= 0 && c < N; c += step) {
              const key = fr + ',' + c;
              const piece = boardState[key];
              if (piece && piece.pieceType === 'rook' && piece.colour === kingColour && !piece.hasMoved) {
                rook = piece;
                rookKey = key;
                rookCol = c;
                break;
              }
              if (piece) break;
            }
            if (rook) {
              let clear = true;
              for (let c = fc + step; c !== rookCol; c += step) {
                if (boardState[fr + ',' + c]) { clear = false; break; }
              }
              if (clear) {
                // Check intermediate and destination squares for attacks
                let safe = true;
                for (let c = fc + step; c !== tc + step; c += step) {
                  for (const player of PLAYERS) {
                    if (player.colour === kingColour) continue;
                    if (isSquareAttacked(fr, c, player.colour, kingColour)) { safe = false; break; }
                  }
                  if (!safe) break;
                }
                if (safe) return true;
              }
            }
          }
        }
        return false;
      }

      // No known piece type: free move (any distance / direction) for now.
      return true;
    }

    // Get king position for a given side
    function getKingPosition(kingSide) {
      for (const key in boardState) {
        const piece = boardState[key];
        if (piece && piece.pieceType === 'king' && piece.side === kingSide) {
          const [r, c] = key.split(',').map(Number);
          return { r, c };
        }
      }
      return null;
    }

    // Check if king of given side has any legal moves (8 adjacent squares)
    // Used for checkmate/stalemate detection (MVP: king-only moves)
    function hasKingLegalMoves(kingSide) {
      const kingPos = getKingPosition(kingSide);
      if (!kingPos) return false;
      const { r: kr, c: kc } = kingPos;
      const kingColour = PLAYERS.find(p => p.key === kingSide).colour;

      const kingDirections = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];

      for (const [dr, dc] of kingDirections) {
        const tr = kr + dr, tc = kc + dc;
        if (!isBoard(tr, tc)) continue;

        const squareKey = tr + ',' + tc;
        const occupant = boardState[squareKey];
        if (occupant && occupant.colour === kingColour) continue; // blocked by own piece

        // Check if destination square is attacked by any enemy
        let safe = true;
        for (const player of PLAYERS) {
          if (player.colour === kingColour) continue;
          if (isSquareAttacked(tr, tc, player.colour, kingColour)) {
            safe = false;
            break;
          }
        }
        if (safe) return true; // found a legal king move
      }
      return false; // no legal king moves
    }

    // Check if king of given side is checkmated
    function isCheckmated(kingSide) {
      console.log('DEBUG isCheckmated called with:', kingSide);
      const kingPos = getKingPosition(kingSide);
      if (!kingPos) return false; // no king = not checkmated
      const inCheck = isKingInCheck(kingSide, null);
      const hasMoves = hasKingLegalMoves(kingSide);
      console.log('DEBUG isCheckmated result:', { inCheck, hasMoves, result: inCheck && !hasMoves });
      return inCheck && !hasMoves;
    }

    // Check if king of given side is stalemated
    function isStalemated(kingSide) {
      console.log('DEBUG isStalemated called with:', kingSide);
      const kingPos = getKingPosition(kingSide);
      if (!kingPos) return false; // no king = not stalemated
      const inCheck = isKingInCheck(kingSide, null);
      const hasMoves = hasKingLegalMoves(kingSide);
      console.log('DEBUG isStalemated result:', { inCheck, hasMoves, result: !inCheck && !hasMoves });
      return !inCheck && !hasMoves;
    }

    // Export all check-related functions for use by other modules
    window.canPieceCapture = canPieceCapture;
    window.isSquareAttacked = isSquareAttacked;
    window.isKingInCheck = isKingInCheck;
    window.getKingPosition = getKingPosition;
    window.hasKingLegalMoves = hasKingLegalMoves;
    window.isCheckmated = isCheckmated;
    window.isStalemated = isStalemated;
