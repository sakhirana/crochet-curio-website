// Minimal PNG read/write (8-bit, colour type 2/6, non-interlaced) + a few raster ops.
const zlib = require('zlib');

function decode(buf) {
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const bitDepth = buf[24], colorType = buf[25], interlace = buf[28];
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
    throw new Error(`unsupported PNG: bd=${bitDepth} ct=${colorType} il=${interlace}`);
  }
  const ch = colorType === 6 ? 4 : 3;
  const idat = [];
  let p = 8;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len));
    if (type === 'IEND') break;
    p += len + 12;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(w * h * 4);
  const prev = Buffer.alloc(stride);
  const cur = Buffer.alloc(stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[q++];
    raw.copy(cur, 0, q, q + stride);
    q += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = cur[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[i] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const s = x * ch, d = (y * w + x) * 4;
      out[d] = cur[s]; out[d + 1] = cur[s + 1]; out[d + 2] = cur[s + 2];
      out[d + 3] = ch === 4 ? cur[s + 3] : 255;
    }
    cur.copy(prev);
  }
  return { width: w, height: h, data: out };
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encode(img, { alpha = true } = {}) {
  const { width: w, height: h, data } = img;
  const ch = alpha ? 4 : 3;
  const raw = Buffer.alloc(h * (w * ch + 1));
  let q = 0;
  for (let y = 0; y < h; y++) {
    raw[q++] = 0;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      raw[q++] = data[s]; raw[q++] = data[s + 1]; raw[q++] = data[s + 2];
      if (alpha) raw[q++] = data[s + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crop(img, x0, y0, w, h) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    img.data.copy(out, y * w * 4, ((y0 + y) * img.width + x0) * 4, ((y0 + y) * img.width + x0 + w) * 4);
  }
  return { width: w, height: h, data: out };
}

// Box-average downscale, alpha weighted so transparent pixels do not bleed colour.
function resize(img, w, h) {
  const out = Buffer.alloc(w * h * 4);
  const sx = img.width / w, sy = img.height / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const s = (yy * img.width + xx) * 4, av = img.data[s + 3] / 255;
        r += img.data[s] * av; g += img.data[s + 1] * av; b += img.data[s + 2] * av;
        a += img.data[s + 3]; n++;
      }
      const d = (y * w + x) * 4, aw = a / 255;
      out[d] = aw ? r / aw : 0; out[d + 1] = aw ? g / aw : 0; out[d + 2] = aw ? b / aw : 0;
      out[d + 3] = a / n;
    }
  }
  return { width: w, height: h, data: out };
}

// Trim fully transparent margins.
function trim(img, threshold = 8) {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (img.data[(y * img.width + x) * 4 + 3] > threshold) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return img;
  return crop(img, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}

module.exports = { decode, encode, crop, resize, trim };

/**
 * Mirror-pads an image on the left by reflecting its own leftmost `pad`
 * columns. The join is a true reflection, so there is no seam.
 */
function mirrorLeft(img, pad) {
  const w = img.width + pad, h = img.height;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < pad; x++) {
      const sx = pad - 1 - x;
      img.data.copy(out, (y * w + x) * 4, (y * img.width + sx) * 4, (y * img.width + sx) * 4 + 4);
    }
    img.data.copy(out, (y * w + pad) * 4, y * img.width * 4, (y + 1) * img.width * 4);
  }
  return { width: w, height: h, data: out };
}

/**
 * Pads above and below by mirror-tiling a band of rows taken from the top
 * and bottom of the image. Use bands that contain only background, or the
 * subject will be repeated into the padding.
 */
function mirrorBands(img, { top = 0, bottom = 0, topBand = 1, bottomBand = 1 } = {}) {
  const w = img.width, h = img.height + top + bottom;
  const out = Buffer.alloc(w * h * 4);
  const bounce = (i, band) => {
    const p = i % (band * 2);
    return p < band ? p : band * 2 - 1 - p;
  };
  const row = (dstY, srcY) =>
    img.data.copy(out, dstY * w * 4, srcY * w * 4, (srcY + 1) * w * 4);

  for (let y = 0; y < top; y++) row(y, bounce(top - 1 - y, topBand));
  for (let y = 0; y < img.height; y++) row(top + y, y);
  for (let y = 0; y < bottom; y++) {
    row(top + img.height + y, img.height - 1 - bounce(y, bottomBand));
  }
  return { width: w, height: h, data: out };
}

module.exports.mirrorLeft = mirrorLeft;
module.exports.mirrorBands = mirrorBands;
