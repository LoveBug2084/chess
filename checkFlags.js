/* ------------------------------------------------------------------ *
 *  CHECK FLAGS — PERSISTENT PER-KING STATE
 *
 *  Mirrors the en passant flag system. Each king carries a
 *  `checkFlags` array naming its current attackers. Flags persist
 *  until moves/captures change the check status.
 * ------------------------------------------------------------------ */

// Add a check flag to a king's flag array, avoiding duplicates.
function addCheckFlag(king, attackerR, attackerC, attackerColour) {
  if (!king || !Array.isArray(king.checkFlags)) return;
  const existing = king.checkFlags.find(
    f => f.attackerR === attackerR && f.attackerC === attackerC
  );
  if (existing) {
    existing.attackerColour = attackerColour; // refresh stale colour
  } else {
    king.checkFlags.push({ attackerR, attackerC, attackerColour });
  }
}

// Remove a specific check flag from a king.
function removeCheckFlag(king, attackerR, attackerC) {
  if (!king || !Array.isArray(king.checkFlags)) return;
  king.checkFlags = king.checkFlags.filter(
    f => !(f.attackerR === attackerR && f.attackerC === attackerC)
  );
}

// Clear ALL check flags from a king.
function clearCheckFlags(king) {
  if (!king || !Array.isArray(king.checkFlags)) return;
  king.checkFlags = [];
}

// Recompute check flags from current board state (called after each move).
// Uses existing getAttackers() and canPieceCapture() from check.js
function updateCheckFlags() {
  const kings = [];
  for (const key in boardState) {
    const piece = boardState[key];
    if (piece && piece.pieceType === 'king') {
      const [r, c] = key.split(',').map(Number);
      kings.push({ piece, r, c });
    }
  }

  for (const king of kings) {
    const { piece, r: kr, c: kc } = king;
    const currentAttackers = [];

    for (const player of PLAYERS) {
      if (player.colour === piece.colour) continue;
      const attackers = getAttackers(kr, kc, player.colour, piece.colour);
      currentAttackers.push(...attackers);
    }

    console.log(`[DEBUG updateCheckFlags] King ${piece.side} (${piece.colour}) at ${kr},${kc}: ${currentAttackers.length} attackers found:`, currentAttackers.map(a => `${a.piece.pieceType}@${a.r},${a.c} (${a.colour})`).join(', '));

    // Diff: compute flags to add/remove
    const existing = piece.checkFlags || [];
    const existingKeys = new Set(existing.map(f => `${f.attackerR},${f.attackerC}`));
    const currentKeys = new Set(currentAttackers.map(a => `${a.r},${a.c}`));

    // Remove flags for attackers no longer checking
    for (const flag of existing) {
      if (!currentKeys.has(`${flag.attackerR},${flag.attackerC}`)) {
        console.log(`[DEBUG updateCheckFlags] Removing flag for attacker at ${flag.attackerR},${flag.attackerC} (colour: ${flag.attackerColour})`);
        removeCheckFlag(piece, flag.attackerR, flag.attackerC);
      }
    }

    // Add flags for new attackers
    for (const attacker of currentAttackers) {
      if (!existingKeys.has(`${attacker.r},${attacker.c}`)) {
        console.log(`[DEBUG updateCheckFlags] Adding flag for attacker ${attacker.piece.pieceType} at ${attacker.r},${attacker.c} (${attacker.colour})`);
        addCheckFlag(piece, attacker.r, attacker.c, attacker.colour);
      }
    }

    console.log(`[DEBUG updateCheckFlags] King ${piece.side} final checkFlags:`, piece.checkFlags.map(f => `${f.attackerR},${f.attackerC} (${f.attackerColour})`).join(', '));
  }
}

// Get check flags for a king (for rendering)
function getCheckFlags(king) {
  return king?.checkFlags || [];
}

// Find king piece by side
function getKingPieceBySide(side) {
  for (const key in boardState) {
    const piece = boardState[key];
    if (piece && piece.pieceType === 'king' && piece.side === side) {
      return piece;
    }
  }
  return null;
}

// Expose for other modules
window.getKingPieceBySide = getKingPieceBySide;

// Expose for other modules
window.addCheckFlag = addCheckFlag;
window.removeCheckFlag = removeCheckFlag;
window.clearCheckFlags = clearCheckFlags;
window.updateCheckFlags = updateCheckFlags;
window.getCheckFlags = getCheckFlags;
