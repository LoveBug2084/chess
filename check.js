/* ------------------------------------------------------------------ *
 *  CHECK DETECTION & VALIDATION
 *
 *  Core check logic: getAttackers, detectChecks.
 *  canPieceCapture, isSquareAttacked, isKingInCheck are in pieceRules.js.
 *  Visuals moved to checkFlags.js + render.js.
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

// Get all pieces of a given colour that attack the target square
// targetColour is the colour of the piece on the target square (e.g., the king)
// Uses canPieceCapture from pieceRules.js (global)
function getAttackers(tr, tc, byColour, targetColour) {
  const attackers = [];
  for (const key in boardState) {
    const piece = boardState[key];
    if (!piece || piece.colour !== byColour) continue;
    const [fr, fc] = key.split(',').map(Number);
    if (canPieceCapture(piece, fr, fc, tr, tc, targetColour)) {
      console.log(`[DEBUG getAttackers] Attacker found: ${piece.pieceType} at ${fr},${fc} (colour: ${byColour}) attacks ${tr},${tc} (target: ${targetColour})`);
      attackers.push({ piece, r: fr, c: fc, colour: byColour });
    }
  }
  console.log(`[DEBUG getAttackers] Target ${tr},${tc} (colour: ${targetColour}) attacked by ${attackers.length} pieces from ${byColour}:`, attackers.map(a => `${a.piece.pieceType}@${a.r},${a.c}`).join(', '));
  return attackers;
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
window.getAttackers = getAttackers;
window.detectChecks = detectChecks;
window.getAllKings = getAllKings;