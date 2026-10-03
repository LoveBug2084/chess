/* ------------------------------------------------------------------ *
 *  CHECK DETECTION & VALIDATION
 *
 *  Core check logic: canPieceCapture, getAttackers, isSquareAttacked,
 *  isKingInCheck. Visuals moved to checkFlags.js + render.js.
 * ------------------------------------------------------------------ */

// Get all kings on the board with their side, colour, and position
function getAllKings() {
  const kings = [];
  for (const key in boardState) {
    const piece = boardState[key];
    if (piece && piece.pieceType === 'king') {
      const [r, c] = key.split(',').map(Number);
      kings.push({
        side: piece.side,
        colour: piece.colour,
        r, c,
        piece
      });
    }
  }
  return kings;
}

// Check if a piece of given colour can legally move from (fr,fc) to (tr,tc)
// Uses the same logic as isLegalDestination but without UI state
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

// Get all pieces of a given colour that attack the target square
// targetColour is the colour of the piece on the target square (e.g., the king)
function getAttackers(tr, tc, byColour, targetColour) {
  const attackers = [];
  for (const key in boardState) {
    const piece = boardState[key];
    if (!piece || piece.colour !== byColour) continue;
    const [fr, fc] = key.split(',').map(Number);
    if (canPieceCapture(piece, fr, fc, tr, tc, targetColour)) {
      attackers.push({ piece, r: fr, c: fc, colour: byColour });
    }
  }
  return attackers;
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
// Now reads from king.checkFlags for efficiency
function isKingInCheck(kingSide, kingPos) {
  const player = PLAYERS.find(p => p.key === kingSide);
  if (!player) return false;
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
    if (!found) return false;
  }
  // Check against all three opponent colours
  for (const player of PLAYERS) {
    if (player.colour === kingColour) continue;
    if (isSquareAttacked(kr, kc, player.colour, kingColour)) return true;
  }
  return false;
}

// Detect all checks on the board (kept for validation purposes)
function detectChecks() {
  const checks = {};
  const kings = getAllKings();

  for (const king of kings) {
    const allAttackers = [];
    for (const player of PLAYERS) {
      if (player.colour === king.colour) continue;
      const attackers = getAttackers(king.r, king.c, player.colour, king.colour);
      if (attackers.length) {
        allAttackers.push(...attackers);
      }
    }
    if (allAttackers.length) {
      checks[king.side] = { king, attackers: allAttackers };
    }
  }

  return checks; // { side: { king, attackers[] } }
}

// Expose for moves.js and checkFlags.js
window.canPieceCapture = canPieceCapture;
window.getAttackers = getAttackers;
window.isSquareAttacked = isSquareAttacked;
window.isKingInCheck = isKingInCheck;
window.detectChecks = detectChecks;
window.getAllKings = getAllKings;