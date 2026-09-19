    /* ------------------------------------------------------------------ *
     *  GAME STATE
     *
     *  EN PASSANT — THE FLAG SYSTEM (four-player safe)
     *
     *  In a two-player game, en passant lasts one move: the opponent moves
     *  next and can take the capture immediately. In this four-player game
     *  the capturing player's turn may be one, two or three moves away, so
     *  a single global "last move" record is useless — it is overwritten
     *  long before the right player gets to act.
     *
     *  Instead, the right to capture is recorded ON THE PAWNS themselves,
     *  as flags, and the flags PERSIST until something invalidates them.
     *
     *  A flag is a record { r, c, skippedR, skippedC }:
     *    r, c          = the PARTNER pawn's square (the other pawn in the pair)
     *    skippedR,skC  = the square between them — where the capturing pawn
     *                    lands (the square the two-square pawn passed over)
     *
     *  DIRECTION IS ASYMMETRIC (standard chess rule):
     *    Only the pawn that was ALREADY THERE may capture the pawn that just
     *    moved two squares. The two-square pawn cannot capture back.
     *
     *    - The two-square pawn A carries flags naming each adjacent enemy
     *      pawn B, C, ... — i.e. "these pawns may capture me".
     *    - Each partner B, C carries a flag naming A — i.e. "I may capture A".
     *    Only the PARTNER'S flags are ever used to authorise a capture.
     *
     *  CLEARING:
     *    - When A moves (not captured), ALL of A's flags clear, and the
     *      matching flags on B, C clear too — every pairing is broken.
     *    - When a partner (say B) moves without capturing A, B's flag clears
     *      and A drops only that partner's entry. Any other partners (C)
     *      keep their flags, and A keeps their entries.
     *    - When B captures A en passant, A is removed; all flags naming A
     *      are cleared from every partner, and B's own flags are cleared
     *      because B has moved.
     *
     *  Every piece object therefore carries an `enPassantFlags` array
     *  (empty for non-pawns and for pawns with no pairing).
     * ------------------------------------------------------------------ */
    let turnIndex = 0;
    let selectedSquare = null;    // origin square of the piece currently in hand
    let heldPiece = null;         // the { pieceType, colour, side, el } in hand
    let ghostEl = null;           // the 50%-opacity clone on the origin square
    let ghostSquare = null;       // the square the ghost was placed on

    // boardState: "row,col" -> { pieceType, colour, side, hasMoved, el,
    //                            enPassantFlags }
    // 'side' is stored on each piece so movement rules can read the
    // piece's orientation directly, with no lookup.
    // 'hasMoved' is set on a pawn's first move (used for the 2-square advance).
    // 'enPassantFlags' is an array of { r, c, skippedR, skippedC } records,
    //   empty unless the pawn is part of an en-passant pairing.
    // NOTE: while a piece is in hand, its entry is removed from boardState,
    // and heldPiece holds it instead. It is re-added on drop.
    const boardState = {};

    function currentPlayer() { return PLAYERS[turnIndex]; }
