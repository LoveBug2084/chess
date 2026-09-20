# 4 Player Chess (work in progress)

A browser-based four-player chess variant played on a plus-shaped board. Each of
the four armies starts on one arm of the cross and fights a free-for-all: every
player is hostile to every other, and there are no teams or alliances.

The board, the four-armies layout, and a set of custom pawn movement rules make
this a distinct game rather than standard chess with extra players.

-![Plus-shaped board](img/board.png)

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

| Arm   | Queen square | King square |
| ----- | ------------ | ----------- |
| North | **G-1**      | **H-1**     |
| South | **H-14**     | **G-14**    |
| West  | **A-7**      | **A-8**     |
| East  | **N-8**      | **N-7**     |

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

Pawn movement depends on which zone the pawn is in and which army it belongs to (side determines forward direction).

**In an arm** (any 8×3 area):

- Move **forward** (away from arm) — **one square**, or **two squares on first move**.
- Capture on the **two forward diagonals**.
- Cannot move backward or sideways.

**In the centre 8×8:**

- Move **one square forward or sideways**.
- Capture on the **two forward diagonals**.
- Cannot move backward.

**First move:** the two-square advance is blocked if the square it passes over is occupied.

**Capture:** pawns capture diagonally only. A non-diagonal move must land on an empty square.

**Promotion:** a pawn reaching the outermost rank of any enemy arm promotes to the piece that originally occupied that back-rank square in the pawn's colour.
The possible promotion types are Rook, Knight, Bishop, Queen.
The King's square promotes to Queen.

### En passant

En passant is implemented with a **per-pawn flag system**, which is what makes
it work correctly in a four-player game. In two-player chess the opportunity
lasts one move; here the capturing player's turn may be one, two or three
moves away, so the right to capture is recorded **on the pawns themselves**
and persists until something invalidates it.

**How it works:**

- When a pawn makes its **two-square first move** and lands perpendicular-
  adjacent to an enemy pawn, an **en-passant flag is set on both pawns** — on
  the pawn that just moved two squares, and on each adjacent enemy pawn that
  may capture it.
- The **direction is asymmetric** (standard chess rule): only the pawn that
  was **already there** may capture the pawn that just moved two squares. The
  two-square pawn cannot capture back.
- The flags **persist** until a flagged pawn moves or is captured. They are
  **not** cleared by other players' moves in between — so the opportunity
  survives however many turns pass before the capturing player's next move.
- A pawn may hold flags pairing it with **more than one** partner at once. If
  it two-square-moves next to two enemy pawns, both may capture it.
- When the capture is made, the capturing pawn moves diagonally onto the
  **skipped square** — the square the two-square pawn passed over — and the
  captured pawn is removed from **its own square** (beside the destination),
  not from the destination itself.
- **Clearing:** when a flagged pawn moves (without capturing), its flags clear
  and the matching flags on its partners clear too. When a flagged pawn is
  captured — by en passant **or by any normal capture** — its flags clear and
  the matching flags on every pawn it was linked to clear as well, so no stale
  flag is ever left pointing at an empty square.

**Debug aid:** open the file with `?test=ep` in the URL to load a minimal
four-pawn position that sets up an en-passant pairing in one move. Flagged
pawns are ringed in the **creator's player colour** so pairings can be seen at a glance. Normal play is
unaffected — the loader only runs when the parameter is present.

---

## Implementation Status

| Area                                              | Status                |
| ------------------------------------------------- | --------------------- |
| Board rendering (plus shape, 160 squares)         | ✅ Done                |
| Coordinate labels (A–N across, 1–14 down)         | ✅ Done                |
| Four armies, random colours, starting layout      | ✅ Done                |
| Per-arm back ranks (queen on light, king on dark) | ✅ Done                |
| Turn indicator (colour pill, turn cycling)        | ✅ Done                |
| Click-to-move, pick-up and preview                | ✅ Done                |
| Pawn movement (zone-based)                        | ✅ Done                |
| Pawn captures (diagonal only)                     | ✅ Done                |
| Pawn two-square first move                        | ✅ Done                |
| Pawn two-square blocking                          | ✅ Done                |
| Pawn promotion                                    | ✅ Done                |
| En passant (four-player flag system)              | ✅ Done                |
| No friendly landing (all pieces)                  | ✅ Done                |
| Non-pawn movement rules                           | ⬜ Not yet (free-move) |
| King capture / elimination                        | ⬜ Not yet             |
| Win condition / scoring                           | ⬜ Not yet             |

---

## Technical Notes

- Builds 001-032 were a **Single HTML file.**
- Builds from 033 onwards have been split into logical functions
- No build step, no dependencies, no framework. Open the
  file in a browser (chessp4-001 .. 032.html or index.html from 033 onwards).
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
  each entry `{ pieceType, colour, side, hasMoved, el, enPassantFlags: [] }`.
  This is the single source of truth for what is where.
- **En passant state** is held **on each pawn** as an `enPassantFlags` array,
  empty unless the pawn is part of a pairing. Each flag is
  `{ r, c, skippedR, skippedC }`:
  - `r, c` — the **partner pawn's square** (the other pawn in the pair).
  - `skippedR, skippedC` — the square between them, where the capturing pawn
    lands.
    Only the partner's flags authorise a capture (the direction is asymmetric).
    Flags persist until a flagged pawn moves or is captured, at which point the
    flag and its reciprocal are both cleared.
- **Debug test positions:** appending `?test=ep` to the URL replaces the
  starting position with four pawns (one per player) arranged so an en-passant
  pairing can be created in a single move. Flagged pawns are ringed in the **creator's player colour**
  (`.square.ep-flagged`). Normal play is unaffected.

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

**Coordinate labels and per-arm back ranks.**

- **Coordinate labels** added: columns **A–N** across the top and bottom, rows
  **1–14** down the left and right, laid out in a 3×3 grid around the board.
  Each label cell matches one square's width or height, so labels align with
  the grid at any board size. `fitBoard()` now reserves space for the gutters
  and strips.
- **Per-arm back ranks**: queens now start on light squares and kings on dark
  squares in every arm. Queens begin on **A-7, G-1, N-8** and **H-14**. North
  and West use one back-rank order; South and East use the swapped order.
- **Promotion** carried forward unchanged from 027.

### 031

**En passant — the four-player flag system.** This is the current version.

- En passant reworked from a single-turn global target to **per-pawn flags**
  that persist until a flagged pawn moves or is captured. This makes the rule
  correct in four-player play, where the capturing player's next turn may be
  up to three moves away.
- **Asymmetric direction**: only the pawn already adjacent may capture the
  two-square mover.
- **Multiple partners** supported: a two-square pawn may be capturable by more
  than one enemy pawn at once, independently.
- **Clean clearing**: when a flagged pawn moves, its flags and its partners'
  matching flags clear; when a flagged pawn is captured (by en passant or any
  normal capture), the same cleanup runs before removal, so no stale flags
  remain.
- **Debug aid**: `?test=ep` loads a minimal four-pawn position for testing;
  flagged pawns are ringed in the creator's player colour.

### 034

- Pawn movement in arms restricted to forward-only (toward the centre); backward movement removed.
- Pawn captures in arms restricted to two forward diagonals only (removed the other two backward diagonals).

### 035

- **En passant ring colour**: rings now show the colour of the player who made the two-square move that created the en passant opportunity, instead of a fixed blue. Implemented by storing `creatorColour` on each en passant flag and rendering via a per-square CSS variable.

---

## Running

1. Place `sprites.png` in an `img/` folder next to the HTML file.
2. Open the HTML file in any modern browser.
3. No server or build step is required.
4. To test en passant, append the url with ?test=ep
