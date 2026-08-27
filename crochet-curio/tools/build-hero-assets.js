/**
 * Prepares the hero artwork from the raw photographs in assets/img/.
 *
 * The five floating crochet pieces are written to assets/img/hero/ as trimmed,
 * downscaled PNGs with a transparent background so the markup can position them
 * individually. Re-run with `node tools/build-hero-assets.js` after swapping a
 * source photo.
 */
const fs = require('fs');
const path = require('path');
const { decode, encode, crop, resize, trim, mirrorLeft, mirrorBands } = require('./png');

const SRC = path.join(__dirname, '..', 'assets', 'img');
const OUT = path.join(SRC, 'hero');
fs.mkdirSync(OUT, { recursive: true });

const read = (name) => decode(fs.readFileSync(path.join(SRC, name)));

function widthTo(img, w) {
  if (img.width <= w) return img;
  return resize(img, w, Math.round(img.height * w / img.width));
}

/** Harden near-opaque pixels so the cut-outs do not read as washed out. */
function solidify(img, floor = 200) {
  for (let i = 3; i < img.data.length; i += 4) {
    if (img.data[i] >= floor) img.data[i] = 255;
  }
  return img;
}

/**
 * Keys out the neutral grey/white studio backdrop. The backdrop is perfectly
 * desaturated (and so is the transparency checkerboard baked into the hole in
 * the strap), while every part of the bag carries a warm cast — even its white
 * squares — so a saturation test separates the two cleanly.
 */
function keyNeutral(img, { minLum = 240, maxChroma = 4, feather = 1.6 } = {}) {
  const { width: w, height: h, data } = img;
  const bg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const s = i * 4, r = data[s], g = data[s + 1], b = data[s + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (min >= minLum && max - min <= maxChroma) bg[i] = 1;
  }
  // Individual stitches in the bag's white squares also read as neutral. Keep
  // only backdrop regions that reach the border or are large enough to be the
  // hole under the strap; everything smaller is yarn and stays opaque.
  const minRegion = 400;
  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (!bg[start] || seen[start]) continue;
    const region = [start];
    seen[start] = 1;
    let touchesBorder = false;
    for (let k = 0; k < region.length; k++) {
      const i = region[k], x = i % w, y = (i / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesBorder = true;
      const visit = (nx, ny) => {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
        const j = ny * w + nx;
        if (!bg[j] || seen[j]) return;
        seen[j] = 1; region.push(j);
      };
      visit(x - 1, y); visit(x + 1, y); visit(x, y - 1); visit(x, y + 1);
    }
    if (!touchesBorder && region.length < minRegion) {
      for (const i of region) bg[i] = 0;
    }
  }

  const r = Math.ceil(feather);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (bg[i]) { data[i * 4 + 3] = 0; continue; }
    let d = feather + 1;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (bg[ny * w + nx]) d = Math.min(d, Math.hypot(dx, dy));
    }
    data[i * 4 + 3] = d > feather ? 255 : Math.round(255 * (d / feather));
  }
  return img;
}

const write = (name, img, alpha = true) => {
  const buf = encode(img, { alpha });
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`${name.padEnd(22)} ${img.width}x${img.height}  ${(buf.length / 1024).toFixed(0)} KB`);
};

// ---- Hero background: cardigan on grass, right-weighted composition ----------
// The photograph is 1774x887 with the cardigan filling its right-hand 55%. A
// hero that wide would leave almost no open grass for the headline, so the
// grass is extended by reflecting the photograph's own edges: 780 columns of
// clear grass on the left, and top/bottom bands that hold no cardigan. Every
// reflection is about the edge it grows from, so none of the joins show.
const photo = read('strawberry  cardigan hero.png');
const stage = mirrorBands(mirrorLeft(photo, 780), {
  top: 400, topBand: 160,       // clear grass above the cardigan
  bottom: 153, bottomBand: 130, // clear grass below it
});
write('hero-grass.png', widthTo(stage, 1800), false);

// ---- Floating pieces --------------------------------------------------------
write('piece-bag.png',
  widthTo(trim(keyNeutral(read('ChatGPT Image Aug 27, 2026, 08_21_23 AM.png'))), 520));

write('piece-flowers.png',
  widthTo(trim(solidify(read('ChatGPT Image Aug 27, 2026, 08_19_48 AM.png'))), 560));

write('piece-flower.png',
  widthTo(trim(solidify(read('purple and lime crochet coaster.png'))), 260));

write('piece-hat.png',
  widthTo(trim(solidify(read('ChatGPT Image Aug 27, 2026, 08_28_54 AM.png'))), 360));

const rosewater = solidify(read('rosewater-set.png'));
write('piece-top.png',
  widthTo(trim(crop(rosewater, 0, 0, rosewater.width, 560)), 460));

// ---- Photo background as JPEG ----------------------------------------------
// The grass photograph is far cheaper as a JPEG than as a PNG (400 KB vs 3 MB)
// and has no transparency, so hand it to the system encoder and drop the PNG.
const png = path.join(OUT, 'hero-grass.png');
const jpg = path.join(OUT, 'hero-grass.jpg');
require('child_process').execFileSync('powershell', ['-NoProfile', '-Command', `
  Add-Type -AssemblyName System.Drawing
  $img = [System.Drawing.Image]::FromFile('${png}')
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 84
  $img.Save('${jpg}', $codec, $ep)
  $img.Dispose()
`.trim()], { stdio: 'inherit' });
fs.unlinkSync(png);
console.log(`hero-grass.jpg         ${(fs.statSync(jpg).size / 1024).toFixed(0)} KB`);
