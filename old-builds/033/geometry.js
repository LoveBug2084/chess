    /* ------------------------------------------------------------------ *
     *  BOARD GEOMETRY
     *
     *  Everything about WHERE squares are and WHICH zone they belong to:
     *  the plus-shaped board, the four arms, and the promotion squares.
     *  No movement rules here — that is the pieces' business.
     * ------------------------------------------------------------------ */
    function isBoard(r, c) {
      const inCols = c >= C0 && c <= C1;
      const inRows = r >= C0 && r <= C1;
      if (inCols && inRows) return true;                 // centre 8x8
      if ((r < C0 || r > C1) && inCols) return true;     // top/bottom arms
      if ((c < C0 || c > C1) && inRows) return true;     // left/right arms
      return false;
    }

    // Is a square inside the central 8x8?
    function inCentre(r, c) {
      return r >= C0 && r <= C1 && c >= C0 && c <= C1;
    }

    // Which arm is a square in? 'N','S','W','E', or null if in the centre.
    function armOf(r, c) {
      if (inCentre(r, c)) return null;
      if (r < C0) return 'N';
      if (r > C1) return 'S';
      if (c < C0) return 'W';
      if (c > C1) return 'E';
      return null; // not on the board
    }

    // The arm letter that each side's army starts in.
    const HOME_ARM = { north: 'N', south: 'S', west: 'W', east: 'E' };

    // Is (r,c) on the outermost rank of an arm?
    function isOuterRank(r, c) {
      return r === 0 || r === N - 1 || c === 0 || c === N - 1;
    }

    // Does a pawn of the given side promote at (r,c)?
    // Rule: outermost rank of ANY arm other than the pawn's own home arm.
    // (A pawn can legally stand on its own arm's outer rank by moving
    //  backward, but it does NOT promote there.)
    function isPromotionSquare(side, r, c) {
      if (!isOuterRank(r, c)) return false;
      const arm = armOf(r, c);
      if (!arm) return false;
      if (arm === HOME_ARM[side]) return false;
      return true;
    }

    // What piece does a pawn promote to at (r,c)?
    // The promoted piece is whatever piece originally stood on that
    // back-rank square, EXCEPT the king square, which becomes a queen.
    //
    // Back rank (outermost 8 squares of every arm, in board order):
    //   rook, knight, bishop, queen, king, bishop, knight, rook
    // The king (index 4) is substituted with queen.
    const BACK_RANK = ['rook','knight','bishop','queen','king','bishop','knight','rook'];

    function promotionPieceFor(r, c) {
      // Index 0..7 along the outer rank of the arm.
      let idx;
      if (r === 0)        idx = c - C0;          // north arm, top row
      else if (r === N-1) idx = c - C0;          // south arm, bottom row
      else if (c === 0)   idx = r - C0;          // west arm, left col
      else if (c === N-1) idx = r - C0;          // east arm, right col
      else return null;

      if (idx < 0 || idx > 7) return null;
      const type = BACK_RANK[idx];
      // The king's original square promotes to a queen.
      return type === 'king' ? 'queen' : type;
    }
