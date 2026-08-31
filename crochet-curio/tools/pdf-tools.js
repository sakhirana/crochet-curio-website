/* ============================================================
   pdf-tools.js — minimal PDF reader/writer for the pattern build

   Enough of a PDF implementation to do three jobs on a file that
   Chrome has just printed, and nothing more:

     - read it   (objects, Flate streams, ToUnicode CMaps)
     - edit it   (page content streams, annotation dictionaries)
     - write it  (fresh xref table, no incremental update)

   It is deliberately not a general PDF library. It assumes what
   Chrome's Skia writer actually emits: a classic xref table, no
   object streams, no cross-reference streams, and a direct
   /Length on every stream. build-pattern.js asserts those
   assumptions and fails loudly if a future Chrome breaks them.
   ============================================================ */

const fs = require("fs");
const zlib = require("zlib");

/* Parse every "N 0 obj ... endobj" in the file.

   Later definitions win. In an incrementally-updated file the newest
   copy of an object is the last one written, and the newest xref
   points at it — verified against the real xref chain when this was
   built, so we can skip parsing the chain itself. */
function load(path) {
  const buf = fs.readFileSync(path);
  const s = buf.toString("latin1");
  const objs = {};
  const re = /(?:^|[\r\n\s])(\d+) 0 obj/g;
  let m;

  while ((m = re.exec(s))) {
    const num = m[1];
    const start = m.index + m[0].length;
    const end = s.indexOf("endobj", start);
    const body = s.slice(start, end);

    let dict = body;
    let data = null;

    const sm = /stream\r?\n/.exec(body);
    if (sm) {
      dict = body.slice(0, sm.index);
      const dstart = start + sm.index + sm[0].length;
      const dend = s.indexOf("endstream", dstart);
      data = buf.slice(dstart, dend);
    }

    objs[num] = { dict, data };
  }

  return { buf, s, objs };
}

function inflate(o) {
  if (!o || !o.data) return null;
  if (!/FlateDecode/.test(o.dict)) return o.data;
  try {
    return zlib.inflateSync(o.data);
  } catch (e) {
    return null;
  }
}

/* Read a /ToUnicode CMap into { glyphCode: character }. Chrome writes
   Identity-H subsets, so without this the content streams are just
   opaque glyph indices. */
function toUnicode(objs, num) {
  const o = objs[num];
  if (!o) return {};
  const t = inflate(o).toString("latin1");
  const map = {};
  let m;

  const bf = /beginbfchar([\s\S]*?)endbfchar/g;
  while ((m = bf.exec(t))) {
    const pairs = m[1].match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g) || [];
    for (const p of pairs) {
      const mm = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/.exec(p);
      map[parseInt(mm[1], 16)] = String.fromCharCode(
        ...(mm[2].match(/.{4}/g) || []).map((h) => parseInt(h, 16))
      );
    }
  }

  const br = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((m = br.exec(t))) {
    const rows =
      m[1].match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g) || [];
    for (const r of rows) {
      const mm = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/.exec(r);
      const a = parseInt(mm[1], 16);
      const b = parseInt(mm[2], 16);
      const c = parseInt(mm[3], 16);
      for (let i = a; i <= b; i++) map[i] = String.fromCharCode(c + i - a);
    }
  }

  return map;
}

/* Page objects in document order. Chrome writes them ascending, and
   the page tree confirms it, so object number order is page order. */
function pageObjects(objs) {
  const pages = [];
  for (const k in objs) {
    if (/\/Type \/Page(?![s])/.test(objs[k].dict)) pages.push(Number(k));
  }
  return pages.sort((a, b) => a - b);
}

/* Per-page { fontName: toUnicodeMap }, read from the page's own
   resource dictionary rather than from hardcoded object numbers —
   Chrome renumbers objects between runs. */
function pageFonts(objs, pageNum) {
  const d = objs[pageNum].dict;
  const fd = /\/Font <<([\s\S]*?)>>/.exec(d);
  const fonts = {};
  if (!fd) return fonts;

  const re = /\/(F\d+) (\d+) 0 R/g;
  let m;
  while ((m = re.exec(fd[1]))) {
    const fontObj = objs[m[2]];
    if (!fontObj) continue;
    const tu = /\/ToUnicode (\d+) 0 R/.exec(fontObj.dict);
    if (tu) fonts[m[1]] = toUnicode(objs, tu[1]);
  }
  return fonts;
}

function contentStreamNum(objs, pageNum) {
  const m = /\/Contents (\d+) 0 R/.exec(objs[pageNum].dict);
  return m ? m[1] : null;
}

/* Decode one BT..ET block to text. Chrome emits one block per visual
   line, which is exactly the unit the space fix cares about. */
function decodeTextBlock(body, fonts) {
  const fm = /\/(F\d+) [\d.]+ Tf/.exec(body);
  const font = fm ? fm[1] : Object.keys(fonts)[0];
  const map = fonts[font] || {};
  let s = "";
  const tj = /<([0-9A-Fa-f]+)>\s*Tj/g;
  let g;
  while ((g = tj.exec(body))) {
    const hex = g[1];
    for (let i = 0; i < hex.length; i += 4) {
      const c = parseInt(hex.substr(i, 4), 16);
      s += map[c] !== undefined ? map[c] : "�";
    }
  }
  return { text: s, font };
}

/* Rewrite the file with the given replacement objects.

   Everything not replaced is copied byte for byte, and the result
   carries a single fresh xref table — no /Prev chain, no stale
   copies of superseded objects. */
function save(orig, replacements, outPath) {
  const { buf, s, objs } = orig;
  const header = buf.slice(0, s.indexOf("1 0 obj"));
  const chunks = [header];
  const offsets = {};
  let pos = header.length;

  const maxNum = Math.max(...Object.keys(objs).map(Number));

  for (let n = 1; n <= maxNum; n++) {
    const o = objs[n];
    if (!o) continue;
    offsets[n] = pos;

    let piece;
    const rep = replacements[n];

    if (o.data) {
      let data = o.data;
      let dict = rep && rep.dict !== undefined ? rep.dict : o.dict;

      if (rep && rep.stream) {
        if (!/\/Length \d+/.test(dict)) {
          throw new Error("object " + n + " has an indirect /Length");
        }
        data = zlib.deflateSync(rep.stream, { level: 9 });
        dict = dict.replace(/\/Length \d+/, "/Length " + data.length);
      } else if (data.length && data[data.length - 1] === 0x0a) {
        /* drop the newline the original writer put before "endstream",
           so a round trip does not grow the file by a byte each time */
        data = data.slice(0, data.length - 1);
      }

      piece = Buffer.concat([
        Buffer.from(n + " 0 obj" + dict + "stream\n", "latin1"),
        data,
        Buffer.from("\nendstream\nendobj\n", "latin1"),
      ]);
    } else {
      const dict = rep && rep.dict !== undefined ? rep.dict : o.dict;
      piece = Buffer.from(n + " 0 obj" + dict + "endobj\n", "latin1");
    }

    chunks.push(piece);
    pos += piece.length;
  }

  const xrefPos = pos;
  let x = "xref\n0 " + (maxNum + 1) + "\n0000000000 65535 f \n";
  for (let n = 1; n <= maxNum; n++) {
    x +=
      offsets[n] !== undefined
        ? ("0000000000" + offsets[n]).slice(-10) + " 00000 n \n"
        : "0000000000 65535 f \n";
  }

  const trailerRe = /trailer\s*<<([\s\S]*?)>>\s*startxref/g;
  let tm;
  let last = null;
  while ((tm = trailerRe.exec(s))) last = tm[1];

  const td = last
    .replace(/\/Prev \d+\s*/, "")
    .replace(/\/Size \d+/, "/Size " + (maxNum + 1));

  x += "trailer\n<<" + td + ">>\nstartxref\n" + xrefPos + "\n%%EOF\n";
  chunks.push(Buffer.from(x, "latin1"));

  fs.writeFileSync(outPath, Buffer.concat(chunks));
}

module.exports = {
  load,
  inflate,
  toUnicode,
  pageObjects,
  pageFonts,
  contentStreamNum,
  decodeTextBlock,
  save,
};
