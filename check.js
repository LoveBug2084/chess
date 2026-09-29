/* ------------------------------------------------------------------ *
 *  CHECK DETECTION
 *
 *  Determines which kings are in check and by which pieces.
 *  Uses existing movement rules from pieceRules.js.
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

// Visual feedback for check.
//
// ORDERING MATTERS HERE. The pulse animation lives on the ::after
// pseudo-element and is started by adding the `.in-check` / `.checking`
// class. The ring's colour comes from a custom property
// (--check-ring-gradient / --check-color), and custom properties are NOT
// animatable — the animation does not restart when they change. So the
// property must already be in place when the class is added; if the
// class lands first, the animation starts against an empty background
// and you see a half-strength pulse caught mid-cycle. Set colour first,
// class second. Do NOT read offsetWidth between them: the forced reflow
// makes the browser paint the class-without-colour state, which is
// exactly the frame-timing bug we are avoiding.
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
