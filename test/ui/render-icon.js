// Renders the expected toolbar icon (128x128) for the "supported" (green
// border) and "unsupported" (red border) states described in ui/toolbar-icon.js,
// as a JS port of tools/gen_icons.py's make_icon(). Used by icon.test.js to
// confirm the committed icons/icon128-{red,green}.png assets match the spec.
"use strict";

const { PNG } = require("pngjs");

const BLUE = [26, 115, 232];
const DARK_BLUE = [23, 78, 166];
const WHITE = [255, 255, 255];
const GREEN = [52, 168, 83];
const RED = [217, 48, 37];

const SIZE = 128;

function setPixel(png, x, y, [r, g, b]) {
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = 255;
}

function renderIconPng(borderColor) {
  const png = new PNG({ width: SIZE, height: SIZE });
  png.data.fill(0); // transparent background

  const left = Math.round(SIZE * 0.08);
  const right = Math.round(SIZE * 0.92);
  const top = Math.round(SIZE * 0.1);
  const bottom = Math.round(SIZE * 0.94);
  const headerH = Math.round(SIZE * 0.24);

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      setPixel(png, x, y, y < top + headerH ? DARK_BLUE : WHITE);
    }
  }

  // blue "+" centered in the white body
  const bodyTop = top + headerH;
  const cx = Math.floor((left + right) / 2);
  const cy = Math.floor((bodyTop + bottom) / 2);
  const arm = Math.max(2, Math.round(SIZE * 0.18));
  const thick = Math.max(1, Math.round(SIZE * 0.07));

  for (let y = cy - arm; y <= cy + arm; y++) {
    for (let x = cx - thick; x <= cx + thick; x++) {
      setPixel(png, x, y, BLUE);
    }
  }
  for (let y = cy - thick; y <= cy + thick; y++) {
    for (let x = cx - arm; x <= cx + arm; x++) {
      setPixel(png, x, y, BLUE);
    }
  }

  // colored ring around the whole icon
  const borderW = Math.max(1, Math.round(SIZE * 0.08));
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (x < borderW || x >= SIZE - borderW || y < borderW || y >= SIZE - borderW) {
        setPixel(png, x, y, borderColor);
      }
    }
  }

  return PNG.sync.write(png);
}

module.exports = { renderIconPng, RED, GREEN };
