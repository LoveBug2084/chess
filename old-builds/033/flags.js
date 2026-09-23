    /* ------------------------------------------------------------------ *
     *  EN PASSANT — FLAG HELPERS
     *
     *  The flag system that makes en passant work in a four-player game.
     *  See the long explanation in state.js for WHY it exists; these are
     *  the mechanics of adding, removing and clearing flags.
     * ------------------------------------------------------------------ */

    // Add a flag to a piece's flag array, avoiding duplicates.
    // A flag names a partner square and the skipped square between them.
    function addFlag(piece, partnerR, partnerC, skippedR, skippedC) {
      if (!piece || !Array.isArray(piece.enPassantFlags)) return;
      const already = piece.enPassantFlags.some(
        f => f.r === partnerR && f.c === partnerC
      );
      if (!already) {
        piece.enPassantFlags.push({
          r: partnerR, c: partnerC,
          skippedR, skippedC
        });
      }
    }

    // Remove from `piece` any flag naming the square (partnerR, partnerC).
    function removeFlag(piece, partnerR, partnerC) {
      if (!piece || !Array.isArray(piece.enPassantFlags)) return;
      piece.enPassantFlags = piece.enPassantFlags.filter(
        f => !(f.r === partnerR && f.c === partnerC)
      );
    }

    // Clear ALL of a piece's flags, and remove the matching flags on every
    // partner it names. Used when a pawn moves away (pairings all broken).
    // `fromR, fromC` is the square the piece is leaving (its flags name
    // partners, and the partners' flags name this square).
    function clearAllFlagsFor(piece, fromR, fromC) {
      if (!piece || !Array.isArray(piece.enPassantFlags)) return;

      // For each partner this piece names, remove the reciprocal flag.
      for (const flag of piece.enPassantFlags) {
        const partner = boardState[flag.r + ',' + flag.c];
        if (partner) removeFlag(partner, fromR, fromC);
      }
      // Then clear this piece's own list.
      piece.enPassantFlags = [];
    }

    // Is this a legal en-passant capture onto (tr,tc)?
    //
    // The capturing pawn is `pawn` (it has been lifted out of boardState,
    // so it must be passed in rather than looked up). The rule:
    //
    //   1. The move must be a one-square diagonal.
    //   2. The destination (tr,tc) must be an EMPTY square.
    //   3. `pawn` must carry a flag whose skippedR/skippedC equals
    //      the destination — i.e. this pawn may capture that partner, and
    //      the destination is the square it lands on.
    //   4. The partner named by that flag must still be an enemy pawn on
    //      the board (guards against stale flags).
    //
    // Only the PARTNER ever holds the capture-authorising flag, because the
    // direction is asymmetric: the pawn that was already there captures the
    // pawn that just moved two squares.
    function isEnPassantCapture(pawn, fr, fc, tr, tc) {
      if (!pawn || pawn.pieceType !== 'pawn') return false;

      // (1) one-square diagonal
      const dr = tr - fr, dc = tc - fc;
      if (Math.abs(dr) !== 1 || Math.abs(dc) !== 1) return false;

      // (2) destination must be empty
      if (boardState[tr + ',' + tc]) return false;

      // (3) the pawn must hold a flag whose skipped square is (tr,tc)
      if (!Array.isArray(pawn.enPassantFlags)) return false;
      const flag = pawn.enPassantFlags.find(
        f => f.skippedR === tr && f.skippedC === tc
      );
      if (!flag) return false;

      // (4) the named partner must still be an enemy pawn there
      const partner = boardState[flag.r + ',' + flag.c];
      if (!partner) return false;
      if (partner.pieceType !== 'pawn') return false;
      if (partner.colour === pawn.colour) return false;

      return true;
    }
