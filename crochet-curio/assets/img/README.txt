Product photography. These filenames are referenced directly by index.html and
the product pages, so keep the names (including capitals) if you swap a photo.

  Bluebell.png        blue + white checkerboard shoulder bag
  Frosty.png          blue cropped cardigan, white bobble clouds
  dune-bikini.png     tan + black striped bikini set
  Valentine.png       cream cropped cardigan, red strawberries
  Poppy.png           red + pink checkerboard bucket hat
  rosewater-set.png   pink bikini top + mini skirt

All six now have transparent backgrounds. The tile behind each image is painted
white in CSS, so they sit on white wherever they appear.

Replacing a photo: keep the filename, or update `image:` in build-products.js
and re-run `node build-products.js`, then update index.html to match. Alt text
and product copy also live in build-products.js.
