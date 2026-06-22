#!/usr/bin/env python3
"""Generate the small toolbar glyph icons as PNGs (stdlib only).

Sizes 16 and 32 only — these are the toolbar-action sizes the service worker
actually shows, and the ONLY sizes with green/gray state variants. The larger
48px (management page) and 128px (install dialog / store) icons are the polished
calendar art from dev/deployment/gen_store_icon.py, not these flat glyphs.

Three variants per size — base (blue/unknown), supported (green), denied (gray):
  icon{size}.png            blue  — page not yet classified
  icon{size}-supported.png  green — site has a first-class extractor
  icon{size}-denied.png     gray  — site is on the fallback denylist (bad guesses)

The toolbar service worker (ui/toolbar-icon.js) swaps between these at runtime
via chrome.declarativeContent, keyed on the host's support state."""
import os
import struct
import zlib

# Brand palette — shared with dev/deployment/gen_store_icon.py for the blue variant.
BLUE       = (26, 115, 232)   # #1a73e8
DARK_BLUE  = (23, 78, 166)    # #174ea6
GREEN      = (52, 168, 83)    # #34a853
DARK_GREEN = (30, 142, 62)    # #1e8e3e
GRAY       = (95, 99, 104)    # #5f6368
DARK_GRAY  = (60, 64, 67)     # #3c4043
WHITE      = (255, 255, 255)

VARIANTS = [
    ("",           BLUE,  DARK_BLUE),
    ("-supported", GREEN, DARK_GREEN),
    ("-denied",    GRAY,  DARK_GRAY),
]


def make_icon(size, plus_color, header_color):
    px = [[(0, 0, 0, 0)] * size for _ in range(size)]
    left, right = round(size * 0.08), round(size * 0.92)
    top, bottom = round(size * 0.10), round(size * 0.94)
    header_h = round(size * 0.24)
    for y in range(top, bottom):
        for x in range(left, right):
            color = header_color if y < top + header_h else WHITE
            px[y][x] = (*color, 255)
    body_top = top + header_h
    cx = (left + right) // 2
    cy = (body_top + bottom) // 2
    arm = max(2, round(size * 0.18))
    thick = max(1, round(size * 0.07))
    for y in range(cy - arm, cy + arm + 1):
        for x in range(cx - thick, cx + thick + 1):
            px[y][x] = (*plus_color, 255)
    for y in range(cy - thick, cy + thick + 1):
        for x in range(cx - arm, cx + arm + 1):
            px[y][x] = (*plus_color, 255)
    return px


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
    out_dir = os.path.join(os.path.dirname(__file__), "..", "..", "extension", "icons")
    os.makedirs(out_dir, exist_ok=True)
    for suffix, plus_color, header_color in VARIANTS:
        for size in (16, 32):
            name = f"icon{size}{suffix}.png"
            write_png(os.path.join(out_dir, name), make_icon(size, plus_color, header_color))
            print(name)


if __name__ == "__main__":
    main()
