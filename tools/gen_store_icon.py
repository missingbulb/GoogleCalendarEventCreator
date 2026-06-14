#!/usr/bin/env python3
"""Generate the Chrome Web Store store icon (store-assets/icon-128.png).

This is the listing's "store icon" — the face of the item on the Chrome Web
Store — and is deliberately separate from the extension's toolbar icons in
icons/ (tiny functional glyphs). It follows the store image guidelines:
https://developer.chrome.com/docs/webstore/images#icons

  - 128x128 PNG total.
  - Artwork lives in the centered 96x96 "safe zone" (16px transparent padding
    per side); padding stays transparent.
  - Reads on both light and dark backgrounds (white card body + blue header).

The art is an on-brand calendar-with-plus matching tools/gen_icons.py. It's
rendered at 4x and box-downsampled (premultiplied alpha) for clean anti-aliased
edges, using only the standard library.
"""
import os
import struct
import zlib

# Brand palette, shared with tools/gen_icons.py.
BLUE = (26, 115, 232)
DARK_BLUE = (23, 78, 166)
WHITE = (255, 255, 255)
CLEAR = (0, 0, 0, 0)

SIZE = 128          # final image edge
SS = 4              # supersampling factor
S = SIZE * SS       # working buffer edge

# Geometry in final 128px space. The calendar card and its binding tabs all sit
# inside the 16..112 safe zone (16px padding on every side).
CARD = (22.0, 32.0, 106.0, 108.0)   # left, top, right, bottom
CARD_RADIUS = 12.0
HEADER_BOTTOM = 54.0                 # blue header band ends here

# Two binding tabs poking above the header.
TABS = [(40.0, 24.0, 49.0, 40.0), (79.0, 24.0, 88.0, 40.0)]
TAB_RADIUS = 4.0

# Plus sign, centered in the white body.
PLUS_CX = (CARD[0] + CARD[2]) / 2
PLUS_CY = (HEADER_BOTTOM + CARD[3]) / 2
PLUS_ARM = 15.0
PLUS_THICK = 5.5


def in_round_rect(x, y, rect, rad):
    l, t, r, b = rect
    if x < l or x >= r or y < t or y >= b:
        return False
    # Only the four corner squares are clipped to a quarter circle.
    cx = l + rad if x < l + rad else (r - rad if x >= r - rad else x)
    cy = t + rad if y < t + rad else (b - rad if y >= b - rad else y)
    return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad


def in_plus(x, y):
    dx, dy = abs(x - PLUS_CX), abs(y - PLUS_CY)
    return (dx <= PLUS_THICK and dy <= PLUS_ARM) or (dy <= PLUS_THICK and dx <= PLUS_ARM)


def sample(x, y):
    """Opaque RGBA for a point in 128px space, or transparent."""
    # Binding tabs sit behind the card so they appear to emerge from its top.
    color = None
    for tab in TABS:
        if in_round_rect(x, y, tab, TAB_RADIUS):
            color = DARK_BLUE
            break
    if in_round_rect(x, y, CARD, CARD_RADIUS):
        color = DARK_BLUE if y < HEADER_BOTTOM else WHITE
    if in_plus(x, y):
        color = BLUE
    if color is None:
        return CLEAR
    return (*color, 255)


def render():
    """Supersample then box-downsample (premultiplied alpha) to 128x128 RGBA."""
    hi = [[CLEAR] * S for _ in range(S)]
    for sy in range(S):
        fy = (sy + 0.5) / SS
        row = hi[sy]
        for sx in range(S):
            row[sx] = sample((sx + 0.5) / SS, fy)

    out = [[(0, 0, 0, 0)] * SIZE for _ in range(SIZE)]
    n = SS * SS
    for y in range(SIZE):
        for x in range(SIZE):
            pr = pg = pb = pa = 0
            for j in range(SS):
                srow = hi[y * SS + j]
                for i in range(SS):
                    r, g, b, a = srow[x * SS + i]
                    pr += r * a
                    pg += g * a
                    pb += b * a
                    pa += a
            if pa == 0:
                out[y][x] = (0, 0, 0, 0)
            else:
                out[y][x] = (pr // pa, pg // pa, pb // pa, pa // n)
    return out


def write_png(path, px):
    size = len(px)
    raw = b"".join(b"\x00" + b"".join(bytes(p) for p in row) for row in px)

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", zlib.compress(raw, 9)))
        f.write(chunk(b"IEND", b""))


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "store-assets")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "icon-128.png")
    write_png(path, render())
    print("store-assets/icon-128.png")


if __name__ == "__main__":
    main()
