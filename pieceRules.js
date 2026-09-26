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

      const tr = +toSq.dataset.row, tc = +toSq.dataset.col;
      const occupant = boardState[tr + ',' + tc];

      // A piece may never land on a friendly piece (applies to every piece).
      // After this check, any remaining occupant is an enemy.
      if (occupant && occupant.colour === heldPiece.colour) return false;

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

      // King moves: one square in any direction (including diagonals), cannot move into check (handled elsewhere).
      // Castling: king moves 2 squares horizontally toward a rook that hasn't moved, with no pieces between.
      if (heldPiece.pieceType === 'king') {
        const fr = +fromSq.dataset.row, fc = +fromSq.dataset.col;
        const dr = tr - fr, dc = tc - fc;
        const absDr = Math.abs(dr), absDc = Math.abs(dc);

        // Normal king move: one square any direction
        if (absDr <= 1 && absDc <= 1 && !(dr === 0 && dc === 0)) {
          return true;
        }

        // Castling: 2-square move toward an unmoved rook (horizontal or vertical)
        // Horizontal: same row (South/North arms), Vertical: same col (West/East arms)
        if (absDr === 2 && dc === 0 && !heldPiece.hasMoved) {
          // Vertical castling (West/East arms)
          const step = dr > 0 ? 1 : -1;
          let rook = null, rookKey = null, rookRow = null;
          for (let r = fr + step; r >= 0 && r < N; r += step) {
            const key = r + ',' + fc;
            const piece = boardState[key];
            if (piece && piece.pieceType === 'rook' && piece.colour === heldPiece.colour && !piece.hasMoved) {
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
              return true;
            }
          }
        }
        // Horizontal castling (South/North arms)
        if (dr === 0 && absDc === 2 && !heldPiece.hasMoved) {
          const step = dc > 0 ? 1 : -1;
          let rook = null, rookKey = null, rookCol = null;
          for (let c = fc + step; c >= 0 && c < N; c += step) {
            const key = fr + ',' + c;
            const piece = boardState[key];
            if (piece && piece.pieceType === 'rook' && piece.colour === heldPiece.colour && !piece.hasMoved) {
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
              return true;
            }
          }
        }
        return false;
      }

      // No known piece type: free move (any distance / direction) for now.
      return true;
    }
