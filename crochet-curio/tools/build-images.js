/* ---------------------------------------------------------------
   build-images.js — the shop photographs, made small enough to send

   The source PNGs are exports from the design file: 1024 to 1536 px
   square-ish, 1 to 2.5 MB each, ten of them on the home page. That is
   15.8 MB of a 16.1 MB page, and it is the whole reason the Lighthouse
   Largest Contentful Paint score sits at 48.

   Two things are wrong with them, and this script fixes both.

   PNG is a lossless format built for flat colour and sharp edges —
   logos, screenshots, line art. These are photographs of crochet:
   thousands of subtly different shades of yarn, which is exactly the
   case PNG is worst at. WebP is the format every browser in use today
   understands, and for a photograph it is roughly twenty times smaller
   at a size no one can tell apart.

   And they are far larger than the space they are shown in. The
   biggest any of these is ever drawn is 606 css px, on the product
   page at a wide desktop window. A 1536 px file to fill 606 px means
   the visitor downloads about six times the pixels they see.

   Widths below are display size with headroom for a high density
   screen, rounded up. The originals stay on disk untouched: this
   writes new files beside them, so a re-export can be re-run through
   here without anything being lost.
   --------------------------------------------------------------- */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const DIR = path.join(__dirname, "..", "assets", "img");

/* Quality 82 is the usual place to sit with WebP. Below about 75 the
   flat areas of yarn start to band; above 85 the file grows for
   nothing. Checked by eye against the originals at full size. */
const QUALITY = 82;

const IMAGES = [
  /* Product photographs. Drawn at 257 px in the home page grid and at
     606 px on the product page, so the product page sets the width. */
  { file: "Bluebell.png", width: 1000 },
  { file: "Frosty.png", width: 1000 },
  { file: "beanie.png", width: 1000 },
  { file: "Valentine.png", width: 1000 },
  { file: "Poppy.png", width: 1000 },
  { file: "rosewater-set.png", width: 1000 },

  /* The floating decorations. These are the widths set in motion.css;
     the largest is 248 px, so 500 covers a 2x screen outright. They
     are transparent, and WebP keeps an alpha channel. */
  { file: "floating coaster.png", width: 500 },
  { file: "floating bikini top.png", width: 500 },
  { file: "floating checkered.png", width: 500 },
  { file: "floating bucket hat.png", width: 500 },
];

(async () => {
  let before = 0;
  let after = 0;

  for (const { file, width } of IMAGES) {
    const src = path.join(DIR, file);
    const out = src.replace(/\.png$/i, ".webp");

    const input = sharp(src);
    const meta = await input.metadata();

    /* Never scale a picture up. If a source is ever re-exported smaller
       than the target, the target is what it already is. */
    const target = Math.min(width, meta.width);

    await input.resize({ width: target }).webp({ quality: QUALITY }).toFile(out);

    const from = fs.statSync(src).size;
    const to = fs.statSync(out).size;
    before += from;
    after += to;

    console.log(
      "  " +
        path.basename(out).padEnd(28) +
        (meta.width + "px").padStart(7) +
        " -> " +
        (target + "px").padEnd(7) +
        (from / 1048576).toFixed(2) +
        " MB -> " +
        (to / 1024).toFixed(0) +
        " KB   (-" +
        (100 - (to / from) * 100).toFixed(1) +
        "%)"
    );
  }

  console.log(
    "\n  " +
      IMAGES.length +
      " images: " +
      (before / 1048576).toFixed(2) +
      " MB -> " +
      (after / 1048576).toFixed(2) +
      " MB, saving " +
      ((before - after) / 1048576).toFixed(2) +
      " MB"
  );
})();
