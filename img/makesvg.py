#!/usr/bin/env python3
"""
Generate board.svg for the 4-Player Plus Chess README.

The board is a 14x14 bounding box:
  - centre 8x8 occupies rows/cols 3..10
  - four 8x3 arms extend from the centre edges
  - the four 3x3 corners are NOT part of the board (160 squares total)

Output matches the program's palette:
  light square #cccccc, dark square #666666
  each arm tinted 30% with its owner's colour
  centre outlined in the accent blue #4d6bfe
  each piece filled with its army colour and outlined in black
"""

N = 14
C0, C1 = 3, 10          # centre spans this inclusive range of rows/cols
CELL = 34               # pixel size of one square
MARGIN = 42             # left/top margin before the board
HEADER = 52             # space at the top for the title

LIGHT = "#cccccc"
DARK  = "#666666"

# Owner colours for the four arms. Each army's pieces use the matching colour.
# (In the real game the four player colours are chosen at random each run;
#  any four distinct hues work for the illustration.)
ARM_HEX = {"N": "#b03a3a", "S": "#2a5fa8", "W": "#2e7d32", "E": "#7b3fa0"}

BACK_RANK = ["\u265c", "\u265e", "\u265d", "\u265b", "\u265a",
             "\u265d", "\u265e", "\u265c"]   # rook knight bishop queen king bishop knight rook
PAWN = "\u265f"

def in_centre(r, c):
    return C0 <= r <= C1 and C0 <= c <= C1

def on_board(r, c):
    in_cols = C0 <= c <= C1
    in_rows = C0 <= r <= C1
    if in_cols and in_rows:
        return True                       # centre
    if (r < C0 or r > C1) and in_cols:
        return True                       # top / bottom arms
    if (c < C0 or c > C1) and in_rows:
        return True                       # left / right arms
    return False

def arm_of(r, c):
    if in_centre(r, c):
        return None
    if r < C0:
        return "N"
    if r > C1:
        return "S"
    if c < C0:
        return "W"
    if c > C1:
        return "E"
    return None

def hex_to_rgb(h):
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)

def rgba(hex_colour, alpha):
    r, g, b = hex_to_rgb(hex_colour)
    return f"rgba({r},{g},{b},{alpha})"

def build_pieces():
    """Return {(row, col): (glyph, arm)} for the starting position of all armies."""
    pieces = {}
    # South: back rank on row 13, pawns on row 12
    for i in range(8):
        pieces[(13, C0 + i)] = (BACK_RANK[i], "S")
        pieces[(12, C0 + i)] = (PAWN, "S")
    # North: back rank on row 0, pawns on row 1
    for i in range(8):
        pieces[(0, C0 + i)] = (BACK_RANK[i], "N")
        pieces[(1, C0 + i)] = (PAWN, "N")
    # West: back rank on col 0, pawns on col 1
    for i in range(8):
        pieces[(C0 + i, 0)] = (BACK_RANK[i], "W")
        pieces[(C0 + i, 1)] = (PAWN, "W")
    # East: back rank on col 13, pawns on col 12
    for i in range(8):
        pieces[(C0 + i, 13)] = (BACK_RANK[i], "E")
        pieces[(C0 + i, 12)] = (PAWN, "E")
    return pieces

def main():
    board_px = N * CELL
    width = board_px + MARGIN * 2
    height = board_px + MARGIN * 2 + HEADER

    def sx(c):
        return MARGIN + c * CELL

    def sy(r):
        return MARGIN + HEADER + r * CELL

    out = []
    out.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {width} {height}" width="{width}" '
        f'role="img" aria-label="Plus-shaped chess board: central 8x8 with '
        f'four 8x3 arms, one per player">'
    )
    out.append(
        '  <style>'
        '.cell{stroke:#8f8f8f;stroke-width:0.5}'
        '.centre{fill:none;stroke:#4d6bfe;stroke-width:2.2;stroke-dasharray:7 5}'
        '.piece{font:20px serif;text-anchor:middle;dominant-baseline:central;'
        'stroke:#000000;stroke-width:0.8;paint-order:stroke}'
        '.title{font:600 15px Segoe UI,system-ui,sans-serif;fill:#ffffff}'
        '.lbl{font:600 13px Segoe UI,system-ui,sans-serif}'
        '</style>'
    )
    # dark background
    out.append(f'  <rect width="{width}" height="{height}" fill="#1a1a2e"/>')
    # title
    out.append(
        f'  <text class="title" x="{width/2}" y="30" text-anchor="middle">'
        f'Plus board \u2014 160 squares (centre 8\u00d78 + four 8\u00d73 arms)</text>'
    )

    # squares + arm tints
    for r in range(N):
        for c in range(N):
            if not on_board(r, c):
                continue
            x, y = sx(c), sy(r)
            light = (r + c) % 2 == 0
            base = LIGHT if light else DARK
            out.append(
                f'  <rect class="cell" x="{x}" y="{y}" '
                f'width="{CELL}" height="{CELL}" fill="{base}"/>'
            )
            arm = arm_of(r, c)
            if arm:
                out.append(
                    f'  <rect x="{x}" y="{y}" width="{CELL}" height="{CELL}" '
                    f'fill="{rgba(ARM_HEX[arm], 0.3)}"/>'
                )

    # centre outline
    out.append(
        f'  <rect class="centre" x="{sx(C0)}" y="{sy(C0)}" '
        f'width="{8*CELL}" height="{8*CELL}"/>'
    )

    # pieces — filled with the army colour, outlined in black
    for (r, c), (glyph, arm) in build_pieces().items():
        cx = sx(c) + CELL / 2
        cy = sy(r) + CELL / 2
        out.append(
            f'  <text class="piece" x="{cx}" y="{cy}" '
            f'fill="{ARM_HEX[arm]}">{glyph}</text>'
        )

    # arm labels
    out.append(
        f'  <text class="lbl" x="{sx(C0)+4*CELL}" y="{sy(0)-8}" '
        f'text-anchor="middle" fill="#e88">North</text>'
    )
    out.append(
        f'  <text class="lbl" x="{sx(C0)+4*CELL}" y="{sy(13)+CELL+16}" '
        f'text-anchor="middle" fill="#8ab4ff">South</text>'
    )
    out.append(
        f'  <text class="lbl" x="{sx(0)-6}" y="{sy(C0)-8}" '
        f'text-anchor="end" fill="#8fd68f">West</text>'
    )
    out.append(
        f'  <text class="lbl" x="{sx(13)+CELL+6}" y="{sy(C0)-8}" '
        f'fill="#c79bec">East</text>'
    )

    out.append('</svg>')

    with open("board.svg", "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")

    print("Wrote board.svg "
          f"({width}x{height}px, {len(build_pieces())} pieces)")

if __name__ == "__main__":
    main()
