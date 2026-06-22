#!/usr/bin/env python3
"""Generate every PNG icon the extension and its Web Store listing use (stdlib only).

Two deliberately different looks, one generator. See dev/deployment/README.md;
store image guidelines: https://developer.chrome.com/docs/webstore/images#icons

  Small toolbar glyphs — extension/icons/icon{16,32}*.png
    A flat calendar glyph at the two toolbar-action sizes, in three state variants
    the service worker (ui/toolbar-icon.js) swaps at runtime via
    chrome.declarativeContent:
      icon{size}.png            blue  — page not yet classified
      icon{size}-supported.png  green — site has a first-class extractor
      icon{size}-denied.png     gray  — site is on the fallback denylist
    These are tiny, so the glyph fills the frame for legibility.

  Polished calendar art — the larger sizes Chrome and the store show, from one
  anti-aliased render definition (96x96 art in a 16px transparent safe zone per
  the store guidelines):
      extension/icons/chromeStoreIcon.png  manifest 128px icon (install dialog);
          also the file uploaded by hand as the Web Store LISTING icon.
      extension/icons/chromeExtensionManagementIcon.png   48px management-page icon.
"""
import os
import struct
import zlib

# Brand palette.
BLUE       = (26, 115, 232)   # #1a73e8
DARK_BLUE  = (23, 78, 166)    # #174ea6
GREEN      = (52, 168, 83)    # #34a853
DARK_GREEN = (30, 142, 62)    # #1e8e3e
GRAY       = (95, 99, 104)    # #5f6368
DARK_GRAY  = (60, 64, 67)     # #3c4043
WHITE      = (255, 255, 255)
CLEAR      = (0, 0, 0, 0)


# --- Small toolbar glyphs (flat, filling the frame) --------------------------

VARIANTS = [
    ("",           BLUE,  DARK_BLUE),
    ("-supported", GREEN, DARK_GREEN),
    ("-denied",    GRAY,  DARK_GRAY),
]


def make_glyph(size, plus_color, header_color):
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


# --- Polished calendar art (anti-aliased, in a safe zone) --------------------

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


# --- Shared PNG writer -------------------------------------------------------

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

    # Small toolbar glyphs: sizes 16/32, each in 3 state variants.
    for suffix, plus_color, header_color in VARIANTS:
        for size in (16, 32):
            name = f"icon{size}{suffix}.png"
            write_png(os.path.join(ext_icons, name), make_glyph(size, plus_color, header_color))
            print(f"extension/icons/{name}")

    # Polished calendar art: 48 (management) + 128 (manifest, and the file
    # uploaded by hand as the store listing icon).
    for name, px in [
        ("chromeStoreIcon.png", render(128)),
        ("chromeExtensionManagementIcon.png", render(48)),
    ]:
        write_png(os.path.join(ext_icons, name), px)
        print(f"extension/icons/{name}")


if __name__ == "__main__":
    main()
