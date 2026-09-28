    /* ------------------------------------------------------------------ *
     *  PAWN RULES
     *
     *  Colour is resolved BEFORE this logic runs: isLegalDestination()
     *  rejects any destination holding a friendly piece, so by the time a
     *  destination reaches here it is either EMPTY or holds an ENEMY.
     *  The pawn therefore only needs to test occupancy, never colour.
     *
     *  MOVEMENT (per zone):
     *   - In an arm: forward or backward along the arm's axis
     *     (the arm owner's toward/away-from-centre direction).
     *   - In the centre: forward or sideways, never backward.
     *   - First move: a pawn that has never moved may advance 2 squares
     *     forward (from its arm's outer rank, so only forward is possible).
     *     The 2-square advance is BLOCKED if the square it passes over
     *     (or its destination) is occupied.
     *
     *  CAPTURE (diagonals only, and only the diagonals that flank an
     *  allowed movement direction):
     *   - In the centre: the TWO forward diagonals.
     *       (sideways has no diagonal; backward is disallowed)
     *   - In an arm: ALL FOUR diagonals.
     *       (both forward and backward movement are allowed there)
     *
     *  A non-diagonal move may only land on an EMPTY square.
     *  A diagonal capture may only land on an OCCUPIED square (an enemy),
     *  OR on the en-passant skipped square (see isEnPassantCapture).
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

    // The four diagonal directions (used for captures in an arm).
    const ALL_DIAGONALS = [[-1,-1], [-1,1], [1,-1], [1,1]];

    // The two forward diagonal directions for a given side (centre captures).
    function centreCaptureDiagonals(side) {
      const o = SIDE_ORIENTATION[side];
      if (!o) return [];
      const [fr, fc] = o.forward;
      return o.sideways.map(([sr, sc]) => [fr + sr, fc + sc]);
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
        // IN AN ARM: use the arm's axis (its owner's forward/backward).
        const arm = armOf(fr, fc);
        const vertical   = (arm === 'N' || arm === 'S');
        const horizontal = (arm === 'W' || arm === 'E');
        if (!vertical && !horizontal) return fail;

        // Diagonal capture: any of the four diagonals, onto an occupied square.
        if (isDiagonal) {
          const isDiag = ALL_DIAGONALS.some(([a, b]) => dr === a && dc === b);
          if (isDiag && occupied) {
            return { legal: true, capture: true, enPassant: false };
          }
          // En passant: diagonal onto an EMPTY square, authorised by a flag
          // whose skipped square is the destination.
          if (isDiag && !occupied && isEnPassantCapture(pawn, fr, fc, tr, tc)) {
            return { legal: true, capture: true, enPassant: true };
          }
          return fail;
        }

        // One square forward or backward along the arm's axis, onto empty.
        if (dist === 1) {
          const straight =
            (vertical   && dc === 0 && (dr === -1 || dr === 1)) ||
            (horizontal && dr === 0 && (dc === -1 || dc === 1));
          if (straight && !occupant) {
            return { legal: true, capture: false, enPassant: false };
          }
          return fail;
        }

        // First move: two squares FORWARD only, onto an empty square,
        // and only if the square passed over is also empty (blocking).
        if (dist === 2 && !hasMoved) {
          const f = ARM_FORWARD[arm];
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

      // Non-pawns: free move (any distance / direction) for now.
      return true;
    }
