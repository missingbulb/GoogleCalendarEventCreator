#!/usr/bin/env python3
"""Generate the "pretty" calendar icons from one art definition (stdlib only).

This renders the on-brand calendar-with-plus art at the larger sizes Chrome and
the Web Store show — the polished look, as opposed to the tiny functional toolbar
glyphs in extension/icons/icon{16,32}*.png (those, with their green/gray state
variants, come from dev/tools/gen_icons.py). One render definition, written
straight to each consumer's folder so the copies can't drift and nothing is
hand-copied:

  dev/deployment/chromeStoreIcon.png            the Web Store LISTING icon —
      uploaded manually in the Developer Dashboard, NOT shipped in the zip.
  extension/icons/icon128.png                   the manifest 128px icon Chrome
      shows in the install dialog (and as its high-res source).
  extension/icons/chromeExtensionManagementIcon.png   the 48px icon the
      chrome://extensions management page shows.

The store-icon guidelines (https://developer.chrome.com/docs/webstore/images#icons)
want a 128x128 PNG whose artwork sits in a centered 96x96 "safe zone" (16px
transparent padding per side) and reads on light or dark backgrounds (white card
body + blue header); the geometry below already lives in that safe zone, so the
same render serves the in-browser icons too. It's supersampled and box-filtered
(premultiplied alpha) for clean anti-aliased edges.
"""
import os
import struct
import zlib

# Brand palette, shared with dev/tools/gen_icons.py.
BLUE = (26, 115, 232)
DARK_BLUE = (23, 78, 166)
WHITE = (255, 255, 255)
CLEAR = (0, 0, 0, 0)

# Geometry is defined in a 128px coordinate system; render() maps any output size
# onto it, so the same art renders cleanly at 128 (store/manifest) and 48
# (management). The calendar card and its binding tabs all sit inside the 16..112
# safe zone (16px padding on every side).
DESIGN = 128.0
CARD = (22.0, 32.0, 106.0, 108.0)   # left, top, right, bottom
CARD_RADIUS = 12.0
HEADER_BOTTOM = 54.0                 # blue header band ends here
BORDER = 2.5                         # slim outline so the white body shows on
                                     # a white background

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
    """Opaque RGBA for a point in 128px design space, or transparent."""
    # Binding tabs sit behind the card so they appear to emerge from its top.
    color = None
    for tab in TABS:
        if in_round_rect(x, y, tab, TAB_RADIUS):
            color = DARK_BLUE
            break
    if in_round_rect(x, y, CARD, CARD_RADIUS):
        l, t, r, b = CARD
        inner = (l + BORDER, t + BORDER, r - BORDER, b - BORDER)
        if not in_round_rect(x, y, inner, CARD_RADIUS - BORDER):
            color = DARK_BLUE          # slim card border
        elif y < HEADER_BOTTOM:
            color = DARK_BLUE
        else:
            color = WHITE
    if in_plus(x, y):
        color = BLUE
    if color is None:
        return CLEAR
    return (*color, 255)


def render(size, ss=4):
    """Render the art to `size`x`size` RGBA, supersampled ss x ss per pixel.

    Each output pixel maps onto the 128px design space (scale = 128/size) and is
    box-filtered over its ss*ss subsamples with premultiplied alpha."""
    scale = DESIGN / size
    n = ss * ss
    out = [[(0, 0, 0, 0)] * size for _ in range(size)]
    for y in range(size):
        for x in range(size):
            pr = pg = pb = pa = 0
            for j in range(ss):
                oy = (y + (j + 0.5) / ss) * scale
                for i in range(ss):
                    ox = (x + (i + 0.5) / ss) * scale
                    r, g, b, a = sample(ox, oy)
                    pr += r * a
                    pg += g * a
                    pb += b * a
                    pa += a
            out[y][x] = (0, 0, 0, 0) if pa == 0 else (pr // pa, pg // pa, pb // pa, pa // n)
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
    deployment_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(os.path.dirname(deployment_dir))
    ext_icons = os.path.join(repo_root, "extension", "icons")
    os.makedirs(ext_icons, exist_ok=True)

    art128 = render(128)
    art48 = render(48)

    # (path, pixels, label) — written straight to each consumer, no copies.
    targets = [
        (os.path.join(deployment_dir, "chromeStoreIcon.png"), art128, "dev/deployment/chromeStoreIcon.png"),
        (os.path.join(ext_icons, "icon128.png"), art128, "extension/icons/icon128.png"),
        (os.path.join(ext_icons, "chromeExtensionManagementIcon.png"), art48, "extension/icons/chromeExtensionManagementIcon.png"),
    ]
    for path, px, label in targets:
        write_png(path, px)
        print(label)


if __name__ == "__main__":
    main()
