# 4 Player Chess

A browser-based four-player chess variant played on a plus-shaped board. Each of
the four armies starts on one arm of the cross and fights a free-for-all: every
player is hostile to every other, and there are no teams or alliances.

The board, the four-armies layout, and a set of custom pawn movement rules make
this a distinct game rather than standard chess with extra players.

![Plus-shaped board](img/board.png)

---

## The Board

A plus / cross shape, formed from a central **8×8** block with four **8×3** arms
extending from its edges.

- **Total squares:** 160 (centre 64 + four arms of 24 each).
- The four **3×3 corners** of the 14×14 bounding box are **not part of the
  board**.
- Coordinates are handled internally on a 14×14 grid; the centre occupies rows
  and columns 3–10.
- The board is labelled for reference: **columns A–N** left to right across the
  top and bottom, and **rows 1–14** top to bottom down the left and right. So
  the top-left board square is **D1** and the bottom-right is **K14**.
  (Many label positions fall over the empty 3×3 corners and so have no square.)

Each arm is described by which "side" it belongs to: **North, South, East,
West**. An arm belongs to the player who starts there, and carries that
player's colour.

---

## Players

- **Four players**, one per arm, in a **free-for-all** (no teams).
- Each player is assigned a **colour** at the start, chosen at random from the
  sprite sheet's palette. Colour is the player's **identity** for the whole
  game — side names describe only the starting arm.
- **Turn order is clockwise**, starting with South: South → West → North → East.

### Starting position

Each army occupies the **outer two ranks** of its arm, in the standard chess
back-rank order, rotated to face the centre:

- **Back rank:** Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook
- **Pawn rank:** eight pawns, one rank inward

The **queen always starts on a light square and the king on a dark square**, in
every arm. Because the arms alternate colour parity, the back rank differs
between arms:

| Arm    | Queen square | King square |
|--------|--------------|-------------|
| North  | **G-1**      | **H-1**     |
| South  | **H-14**     | **G-14**    |
| West   | **A-7**      | **A-8**     |
| East   | **N-8**      | **N-7**     |

That is **16 pieces per player, 64 in total**. The centre 8×8 starts empty.

---

## Rules

### General

- **All four players are enemies.** Any piece may capture any piece of a
  different colour.
- A piece may **never** land on a square occupied by a piece of its **own**
  colour.
- Non-pawn pieces are, at present, **free-move** (see *Implementation Status*).

### Pawns

Pawn movement depends on **which zone the pawn is standing in**, not on which
army it belongs to.

**In an arm** (any of the four 8×3 areas — its own or another player's):

- May move **one square toward or away from the centre**, along the arm's
  toward/away axis.
  - North/South arms → up/down on screen.
  - West/East arms → left/right on screen.
- May **not** move along the arm's length.
- May **capture on any of the four diagonals**.

**In the centre 8×8:**

- May move **one square forward or sideways**.
  - "Forward" is toward the centre, and is fixed per army.
- May **not** move backward (backward = toward the pawn's own home edge).
- May **capture on the two forward diagonals**.

**First move:** a pawn that has never moved may advance **two squares
forward** instead of one. This is only possible from its starting rank in its
arm, so the only direction available is forward. The two-square advance is
**blocked** if the square it passes over is occupied.

**Capture:** pawns capture **diagonally only**. A non-diagonal move must land
on an empty square.

**Promotion:** a pawn that reaches the **outermost rank of any arm other than
its own** is promoted. The promoted piece is **the piece that originally stood
on that back-rank square** — so landing on the 1st or 8th outer square yields a
rook, the 2nd or 7th a knight, the 3rd or 6th a bishop, and the 4th a queen.
The **king square promotes to a queen**. The promoted piece takes the **pawn's
colour**. A pawn may legally stand on its own arm's outer rank (having moved
backward into it) but does **not** promote there.

### En passant (partially implemented — needs the flag system)

> ⚠️ **Status: incomplete for four-player play.** The current implementation
> tracks a single global `enPassantTarget` that survives **only until the next
> move**. In a two-player game that is correct: the opponent moves next and can
> take the capture immediately. In a **four-player** game it is wrong: after a
> pawn makes its two-square move, the capturing player's turn may be **one,
> two, or three moves away**, and the opportunity is destroyed long before
> their turn arrives.

**The intended rule** (once the flag system is implemented):

- When a pawn makes its **two-square first move** and lands perpendicular-
  adjacent to an enemy pawn, an **en-passant flag is set on both pawns** — on
  the pawn that just moved two squares, and on each adjacent enemy pawn that
  may capture it.
- The flags **persist** until one of the two flagged pawns moves. They are not
  cleared by other players' moves in between.
- While both flags stand, the adjacent pawn may capture the two-square pawn by
  moving diagonally onto the **skipped square** — the square the two-square
  pawn passed over. The captured pawn is removed from its own square, beside
  the destination, not from the destination itself.
- As soon as **either** flagged pawn moves (or is captured), **both flags are
  cleared** — the pairing is broken and the opportunity is gone.
- A pawn may hold flags pairing it with **more than one** partner at once.

This flag model is the next planned task. Until it is in place, en passant is
only reliable when the capture happens on the very next move.

**Current interim behaviour:** en passant is available **only on the
immediately following move**, and only in an arm. The captured pawn is removed
from its own square (beside the destination), and the capturing pawn lands on
the skipped square.

---

## Implementation Status

| Area | Status |
|------|--------|
| Board rendering (plus shape, 160 squares) | ✅ Done |
| Coordinate labels (A–N across, 1–14 down) | ✅ Done |
| Four armies, random colours, starting layout | ✅ Done |
| Per-arm back ranks (queen on light, king on dark) | ✅ Done |
| Turn indicator (colour pill, turn cycling) | ✅ Done |
| Click-to-move, pick-up and preview | ✅ Done |
| Pawn movement (zone-based) | ✅ Done |
| Pawn captures (diagonal only) | ✅ Done |
| Pawn two-square first move | ✅ Done |
| Pawn two-square blocking | ✅ Done |
| Pawn promotion | ✅ Done |
| En passant (two-player style) | ⚠️ Partial |
| En passant (four-player flag system) | ⬜ Not yet |
| No friendly landing (all pieces) | ✅ Done |
| Non-pawn movement rules | ⬜ Not yet (free-move) |
| King capture / elimination | ⬜ Not yet |
| Win condition / scoring | ⬜ Not yet |

---

## Technical Notes

- **Single HTML file.** No build step, no dependencies, no framework. Open the
  file in a browser.
- **Sprite sheet:** pieces are drawn from `img/sprites.png`, a grid of
  6 columns (piece type) × 10 rows (colour). Each cell is 128px.
  - Column order: pawn, knight, bishop, rook, queen, king.
  - Row order: black, white, pink, red, orange, yellow, green, blue,
    light-blue, purple.
- **Scaling:** each square's size is computed by `fitBoard()` from the space
  actually available (the window minus the header, the side gutters and the
  top/bottom label strips), so the board fills the screen at any size and
  rescales on window resize. The board is never capped and never scrolls.
- **Coordinate labels** are laid out in a 3×3 CSS grid around the board
  (`.board-frame`). Each label cell is exactly one square wide/tall, so labels
  align with the grid at any board size. Columns are A–N (col 0 = A) and rows
  are 1–14 (row 0 = 1).
- **Sprites** are positioned with percentage-based `background-size` and
  `background-position`, which makes them resolution-independent — one sprite
  cell maps onto one square at any board size.
- **Board state** is held in a `boardState` object keyed by `"row,col"`, with
  each entry `{ pieceType, colour, side, hasMoved, el }`. This is the single
  source of truth for what is where.
- **En passant state (interim)** is held in a single `enPassantTarget`
  variable, either `null` or `{ r, c, pawnR, pawnC }`:
  - `r, c` — the **skipped square** the capturing pawn would land on.
  - `pawnR, pawnC` — the square of the enemy pawn that may be captured (the
    destination of the two-square move).
  It is set after a qualifying two-square pawn move and cleared by any other
  move, so the opportunity lasts exactly one turn. **This is the part that
  must be replaced by per-pawn flags for four-player play.**

### Visual design

- Board squares: neutral greys (`#cccccc` light, `#666666` dark).
- Each arm carries a permanent **30% wash** of its owner's colour, drawn above
  the square and below the piece, so the ownership map is always visible.
- Selecting and moving a piece shows a temporary **30% wash** of the moving
  piece's colour on the origin and destination squares.
- The turn indicator is a pill filled with the current player's colour; its
  text is black or white, chosen by the colour's perceived luminance
  (Rec. 601), so it is always legible.
- Coordinate labels are muted grey (`#9a9ab0`) so they read as reference
  furniture and never compete with the board.

---

## Changelog

Reconstructed from development notes. Entries from 011 onward are the reliably
recorded sequence; the original development (001–010) predates the numbering
system and is summarised as a single phase below.

### Pre-numbering (001–010)

- Initial 8×8 board displaying randomly coloured chess pieces from a sprite
  sheet.
- Fix: pieces were created but never appended into their square, so they did
  not display.
- Fluid square sizing so the board fits any screen (width and height).
- Fix: board overflowing the text at extreme browser zoom.
- Plus-shaped board (central 8×8 + four 8×3 arms, 160 squares).
- Four armies, one per arm, random colours from the sprite palette, arranged
  in a standard two-rank starting formation rotated to face the centre.
- Turn indicator cycling through the four players.
- Click-to-move: pick up a piece, click a destination, capture on landing.

### 011

Colour highlight overlay drawn **below** the piece (board square → overlay →
sprite layering via z-index), replacing the earlier blue selection box.

### 012

The picked-up piece **follows the mouse**: it is drawn into whichever square is
hovered, correctly positioned in the grid, and committed on click.

### 013

Move highlight made **fully solid** (removed the 60% opacity that let the board
colour bleed through).

### 014

**Pawn movement restrictions** by zone: in an arm, one square along the arm's
axis; in the centre, forward or sideways per the pawn's army; never backward.

### 015

Clarity refactor: the **side is stored on each piece** so movement rules read
the orientation directly, with no colour lookup.

### 016

**Pawn two-square first move** (forward only, from the start rank).

### 017

**Pawn diagonal captures**: two forward diagonals in the centre, all four
diagonals in an arm; diagonal onto an empty square is illegal.

### 018

**No friendly landing** for every piece (previously only pawns were blocked).

### 019

Removed the pawn's own colour test — with the universal friendly-landing check,
the pawn only needs to test occupancy.

### 020

Greyscale board (`#cccccc` / `#666666`); arm tint and move overlay both set to
30%.

### 021

Trimmed `sprites.png` to **10 rows** (removed the two grey rows); sprite
scaling updated to `600% × 1000%`.

### 022

Removed the ring around the colour swatch.

### 023

Removed the swatch; the turn pill is now filled with the player's colour and
its text uses the **XOR-inverted** colour.

### 024

Replaced the JS colour inversion with CSS `filter: invert(100%)`.

### 025

Replaced inversion with **luminance-based** text colour (Rec. 601 threshold at
128): black or white text, whichever contrasts with the pill.

### 026

**Pawn two-square blocking**: the square passed over by a two-square advance
must be empty.

### 027

**Pawn promotion.** A pawn reaching the outermost rank of any arm other than
its own is promoted to the piece that originally occupied that back-rank
square (king square → queen), in the pawn's own colour.

### 028

**Coordinate labels and per-arm back ranks.** This is the current version.

- **Coordinate labels** added: columns **A–N** across the top and bottom, rows
  **1–14** down the left and right, laid out in a 3×3 grid around the board.
  Each label cell matches one square's width or height, so labels align with
  the grid at any board size. `fitBoard()` now reserves space for the gutters
  and strips.
- **Per-arm back ranks**: queens now start on light squares and kings on dark
  squares in every arm. Queens begin on **A-7, G-1, N-8** and **H-14**. North
  and West use one back-rank order; South and East use the swapped order.
- **En passant** carried forward from the interim implementation (single
  `enPassantTarget`, lasts one turn). ⚠️ Still needs the four-player flag
  system — see *En passant* above.
- **Promotion** carried forward unchanged from 027.

> **Note on version history:** versions 028–033 (old numbering) were discarded
> as broken, and the old 034 was renamed to **028**. The changelog above
> describes the current 028 file.

---

## Running

1. Place `sprites.png` in an `img/` folder next to the HTML file.
2. Open the HTML file in any modern browser.
3. No server or build step is required.
