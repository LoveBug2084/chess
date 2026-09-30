/* ------------------------------------------------------------------ *
 *  CHECK DETECTION & VISUALS
 *
 *  Uses check logic from pieceRules.js (exported via window.*).
 *  This module handles only detection + visual feedback.
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

// Detect all checks on the board
function detectChecks() {
  const checks = {};
  const kings = getAllKings();

  for (const king of kings) {
    const allAttackers = [];
    // Check against all three opponent colours
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

// Get all pieces of a given colour that attack the target square
// Uses the shared canPieceCapture from pieceRules.js
function getAttackers(tr, tc, byColour, targetColour) {
  const attackers = [];
  for (const key in boardState) {
    const piece = boardState[key];
    if (!piece || piece.colour !== byColour) continue;
    const [fr, fc] = key.split(',').map(Number);
    if (window.canPieceCapture(piece, fr, fc, tr, tc, targetColour)) {
      attackers.push({ piece, r: fr, c: fc, colour: byColour });
    }
  }
  return attackers;
}

// Visual feedback for check.
function applyCheckVisuals(checks) {
  // Clear previous. Delegated to clearCheckVisuals() so the clear step
  // can never drift out of sync with the apply step below.
  clearCheckVisuals();

  for (const [kingSide, data] of Object.entries(checks)) {
    const { king, attackers } = data;

    // King's square: build conic-gradient from all attackers (360°/n each),
    // THEN add the class so the animation starts with the gradient ready.
    const kingSq = squareEl(king.r, king.c);
    if (kingSq) {
      const n = attackers.length;
      const segments = attackers.map((a, i) => {
        const start = (360 / n) * i;
        const end = (360 / n) * (i + 1);
        const color = COLOUR_HEX[a.colour];
        return `${color} ${start}deg, ${color} ${end}deg`;
      }).join(', ');
      kingSq.style.setProperty('--check-ring-gradient', `conic-gradient(${segments})`);
      kingSq.classList.add('in-check');
    }

    // Attacker squares: solid attacker colour + flash. Same ordering —
    // colour first, class second — for the same reason as above.
    for (const attacker of attackers) {
      const sq = squareEl(attacker.r, attacker.c);
      if (sq) {
        sq.style.setProperty('--check-color', COLOUR_HEX[attacker.colour]);
        sq.classList.add('checking');
      }
    }
  }
}

function clearCheckVisuals() {
  board.querySelectorAll('.square.in-check, .square.checking')
    .forEach(s => {
      s.classList.remove('in-check', 'checking');
      s.style.removeProperty('--check-color');
      s.style.removeProperty('--check-ring-gradient');
    });
}

// Expose for moves.js
window.detectChecks = detectChecks;
window.applyCheckVisuals = applyCheckVisuals;
window.clearCheckVisuals = clearCheckVisuals;