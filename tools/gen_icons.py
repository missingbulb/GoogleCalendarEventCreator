#!/usr/bin/env python3
"""Generate the extension's calendar-with-plus toolbar icons as PNGs (stdlib only).

One per-size base icon each; the supported/unsupported state is shown at runtime
by the toolbar badge (see ui/toolbar-icon.js), not by separate colored icons."""
import os
import struct
import zlib

BLUE = (26, 115, 232)
DARK_BLUE = (23, 78, 166)
WHITE = (255, 255, 255)


def make_icon(size):
    px = [[(0, 0, 0, 0)] * size for _ in range(size)]
    left, right = round(size * 0.08), round(size * 0.92)
    top, bottom = round(size * 0.10), round(size * 0.94)
    header_h = round(size * 0.24)
    for y in range(top, bottom):
        for x in range(left, right):
            color = DARK_BLUE if y < top + header_h else WHITE
            px[y][x] = (*color, 255)
    # blue "+" centered in the white body
    body_top = top + header_h
    cx = (left + right) // 2
    cy = (body_top + bottom) // 2
    arm = max(2, round(size * 0.18))
    thick = max(1, round(size * 0.07))
    for y in range(cy - arm, cy + arm + 1):
        for x in range(cx - thick, cx + thick + 1):
            px[y][x] = (*BLUE, 255)
    for y in range(cy - thick, cy + thick + 1):
        for x in range(cx - arm, cx + arm + 1):
            px[y][x] = (*BLUE, 255)
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
    out_dir = os.path.join(os.path.dirname(__file__), "..", "icons")
    os.makedirs(out_dir, exist_ok=True)
    for size in (16, 32, 48, 128):
        write_png(os.path.join(out_dir, f"icon{size}.png"), make_icon(size))
        print(f"icon{size}.png")


if __name__ == "__main__":
    main()
