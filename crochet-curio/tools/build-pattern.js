/* ============================================================
   build-pattern.js — one source, two formats

   pattern-beanie-accessible.html is the only place the pattern is
   written. The PDF is built from it, so the two cannot drift:

     pattern-beanie-accessible.html   the page on the site (canonical)
     assets/patterns/*.pdf            large print, tagged, for printing

   Run:  node tools/build-pattern.js
         node tools/build-pattern.js --check   (build to a temp file and
                                                verify, touching nothing)

   Two things happen between Chrome and the shipped PDF, and both are
   fixes for things Chrome's PDF writer does not do:

   1. Word spaces at line ends.
      Skia draws each wrapped line as its own text block and drops the
      space that caused the wrap. Nothing is wrong with the HTML — the
      space simply never reaches the PDF's text layer. A screen reader
      then reads "Beanie, AdultMedium". We append a space glyph to any
      line that does not already end on one. It is invisible, it does
      not reflow anything, and it is what makes the file readable.

   2. An alternative description on the link annotation.
      Chrome writes the link's action but no /Contents, which PDF/UA
      wants. We take it from the anchor's aria-label in the HTML, so
      the wording lives in the source with everything else.

   Then verify-pattern-pdf.js reads the result back the way assistive
   technology does, and the build fails if anything is wrong.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const {
  load,
  inflate,
  pageObjects,
  pageFonts,
  contentStreamNum,
  decodeTextBlock,
  save,
} = require("./pdf-tools");
const { verify, readingOrder } = require("./verify-pattern-pdf");

const ROOT = path.resolve(__dirname, "..");

/* Each edition of the pattern, and where its PDF goes.

   The accessible edition used to be frozen: the shipped file was a
   hand-corrected copy that passed PAC, and rebuilding it lost the
   PDF/UA identifier Chrome does not write. That is no longer true —
   addXmpMetadata below writes the identifier itself — and the freeze
   was costing more than it bought. The frozen file was the one Chrome
   exported before the word-space fix, so it passed PAC while reading
   "Beanie, AdultMedium" out loud. A screen reader that can follow the
   pattern matters more than a checker that says it can, so the
   edition is built from source like everything else. */
const TARGETS = {
  standard: {
    source: path.join(ROOT, "pattern-beanie-standard.html"),
    out: path.join(ROOT, "assets", "patterns", "rosie-beanie-pattern-standard.pdf"),
  },
  /* The Hindi standard edition is a translation of the standard page,
     not a second pattern: same counts, same hook, same measurements. It
     builds through the same pipeline, so whatever the English PDF gets
     — word spaces, tags, bookmarks, the PDF/UA identifier — this one
     gets too. Its /Lang comes from the page's own lang="hi", which is
     what makes a screen reader read it with a Hindi voice. */
  "standard-hi": {
    source: path.join(ROOT, "pattern-beanie-standard-hi.html"),
    out: path.join(ROOT, "assets", "patterns", "rosie-beanie-pattern-standard-hi.pdf"),
  },
  accessible: {
    source: path.join(ROOT, "pattern-beanie-accessible.html"),
    out: path.join(ROOT, "assets", "patterns", "rosie-beanie-pattern.pdf"),
  },
};

const CHECK_ONLY = process.argv.includes("--check");
const FORCE = process.argv.includes("--force");
const TARGET_NAME = process.argv.slice(2).find((a) => !a.startsWith("--"));

/* --out <path> writes somewhere else entirely, which is how a frozen
   edition can be rebuilt and tested without disturbing the copy the
   site is serving. */
const OUT_FLAG = process.argv.indexOf("--out");
const OUT_OVERRIDE = OUT_FLAG > -1 ? process.argv[OUT_FLAG + 1] : null;

/* --source <path> renders a different page through the same pipeline,
   which is how a variant of an edition — a differently paginated one,
   say — can be built and listened to before anything is decided. */
const SRC_FLAG = process.argv.indexOf("--source");
const SRC_OVERRIDE = SRC_FLAG > -1 ? process.argv[SRC_FLAG + 1] : null;

/* ---------------------------------------------------------------
   Chrome
   --------------------------------------------------------------- */

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(
    "Chrome not found. Set CHROME_PATH to the browser executable and run again."
  );
}

function render(htmlPath, pdfPath) {
  const chrome = findChrome();
  execFileSync(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--no-pdf-header-footer",
      "--print-to-pdf=" + pdfPath,
      "file:///" + htmlPath.replace(/\\/g, "/"),
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  if (!fs.existsSync(pdfPath)) throw new Error("Chrome produced no PDF");
  return chrome;
}

/* ---------------------------------------------------------------
   Fix 1 — a space glyph at the end of every wrapped line
   --------------------------------------------------------------- */

function fixSpaces(pdf) {
  const { objs } = pdf;
  const replacements = {};
  let added = 0;

  for (const p of pageObjects(objs)) {
    const cn = contentStreamNum(objs, p);
    const fonts = pageFonts(objs, p);

    /* the glyph code that maps to U+0020, per font in this page */
    const spaceCode = {};
    for (const f in fonts) {
      const code = Object.keys(fonts[f]).find((k) => fonts[f][k] === " ");
      if (code !== undefined) {
        spaceCode[f] = ("0000" + Number(code).toString(16)).slice(-4).toUpperCase();
      }
    }

    const t = inflate(objs[cn]).toString("latin1");
    const out = t.replace(/BT([\s\S]*?)ET/g, (whole, body) => {
      const { text, font } = decodeTextBlock(body, fonts);
      if (!text.length || /\s$/.test(text)) return whole;
      if (!spaceCode[font]) return whole;
      added++;
      return "BT" + body + "<" + spaceCode[font] + "> Tj\n" + "ET";
    });

    replacements[cn] = { stream: Buffer.from(out, "latin1") };
  }

  return { replacements, added };
}

/* ---------------------------------------------------------------
   Fix 2 — alternative descriptions on link annotations

   Read every anchor in the source HTML that carries an aria-label,
   and copy that label onto the matching link annotation.
   --------------------------------------------------------------- */

function linkLabelsFromHtml(html) {
  const labels = {};
  const re = /<a\b([^>]*)>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const href = (/href="([^"]*)"/i.exec(attrs) || [])[1];
    const label = (/aria-label="([^"]*)"/i.exec(attrs) || [])[1];
    if (href && label) labels[href] = label;
  }
  return labels;
}

function fixLinkAlt(pdf, labels, replacements) {
  const { objs } = pdf;
  let described = 0;
  const undescribed = [];

  for (const k in objs) {
    const d = objs[k].dict;
    if (!/\/Subtype \/Link/.test(d)) continue;
    if (/\/Contents \(/.test(d)) continue;

    const uri = (/\/URI \(([^)]*)\)/.exec(d) || [])[1];
    const label = uri && labels[uri];

    if (!label) {
      undescribed.push(uri || "(unknown target)");
      continue;
    }

    /* PDF string escaping: backslash and both parentheses */
    const esc = label.replace(/([\\()])/g, "\\$1");
    const base = replacements[k] ? replacements[k].dict || d : d;
    replacements[k] = Object.assign({}, replacements[k], {
      dict: base.replace(/\/A <</, "/Contents (" + esc + ")\n/A <<"),
    });
    described++;
  }

  return { described, undescribed };
}

/* ---------------------------------------------------------------
   Fix 3 — mark decorative page content as an artifact

   Chrome paints a white rectangle behind every page and leaves it
   outside the tag tree entirely. PDF/UA allows exactly two states for
   page content: tagged, or marked as an artifact. Untagged is neither,
   and PAC counts every stray painting operator as a failure.

   Nothing here is visible. The rectangle still paints; it is simply
   declared to be decoration so assistive technology skips it.
   --------------------------------------------------------------- */

const PAINT_OPS = new Set(["f", "F", "f*", "S", "s", "B", "B*", "b", "b*", "sh"]);
const PATH_OPS = new Set(["re", "m", "l", "c", "v", "y", "h"]);

function markArtifacts(pdf, replacements) {
  const { objs } = pdf;
  let wrapped = 0;

  for (const p of pageObjects(objs)) {
    const cn = contentStreamNum(objs, p);
    const source = replacements[cn]
      ? replacements[cn].stream.toString("latin1")
      : inflate(objs[cn]).toString("latin1");

    const lines = source.split("\n");
    const out = [];
    let depth = 0;
    let pathStart = null; /* where the current path began, when untagged */

    for (const line of lines) {
      const op = line.trim().split(/\s+/).pop();

      if (op && (op.endsWith("BDC") || op.endsWith("BMC"))) depth++;
      else if (op === "EMC") depth--;

      const painted = depth <= 0 && PAINT_OPS.has(op) && pathStart !== null;

      if (depth <= 0 && PATH_OPS.has(op)) {
        if (pathStart === null) pathStart = out.length;
      } else if (!painted) {
        /* Anything that is not path construction ends the run. A path
           consumed by a clip (W n) or discarded (n) paints nothing, and
           wrapping it would put the clip inside an artifact block and
           leave its q unbalanced against the marked content. */
        pathStart = null;
      }

      out.push(line);

      if (painted) {
        out.splice(pathStart, 0, "/Artifact BMC");
        out.push("EMC");
        wrapped++;
        pathStart = null;
      }
    }

    replacements[cn] = { stream: Buffer.from(out.join("\n"), "latin1") };
  }

  return wrapped;
}

/* ---------------------------------------------------------------
   Fix 5 — a bounding box on every figure

   PDF/UA requires a Figure that is not inline to carry a BBox layout
   attribute: the rectangle the illustration occupies on the page.
   Chrome writes the figure and its alternative text but no box, which
   is the last thing PAC objects to.

   The box is measured off the page content itself. Every drawing
   operation inside the figure's marked content is transformed by the
   current matrix and accumulated, so the box matches what is actually
   on the page rather than anything guessed from the HTML.
   --------------------------------------------------------------- */

function figureBBoxes(pdf, replacements) {
  const { objs } = pdf;
  const boxes = {};

  /* page object -> { mcid: [llx, lly, urx, ury] } */
  const perPage = {};

  for (const p of pageObjects(objs)) {
    const cn = contentStreamNum(objs, p);
    const t = replacements[cn]
      ? replacements[cn].stream.toString("latin1")
      : inflate(objs[cn]).toString("latin1");

    const boxesOnPage = {};
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack = [];
    let mcid = null;
    let args = [];

    const mul = (m, n) => [
      m[0] * n[0] + m[1] * n[2],
      m[0] * n[1] + m[1] * n[3],
      m[2] * n[0] + m[3] * n[2],
      m[2] * n[1] + m[3] * n[3],
      m[4] * n[0] + m[5] * n[2] + n[4],
      m[4] * n[1] + m[5] * n[3] + n[5],
    ];
    const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

    /* Points are held until the path is actually painted. Chrome emits
       the EMC that closes one block after the next block's clipping
       rectangle, so a clip counted straight into the box would drag it
       out to the size of the whole page. */
    let pending = [];

    const add = (x, y) => {
      if (mcid === null) return;
      pending.push(apply(ctm, x, y));
    };

    const commit = () => {
      if (mcid !== null && pending.length) {
        const b =
          boxesOnPage[mcid] ||
          (boxesOnPage[mcid] = [Infinity, Infinity, -Infinity, -Infinity]);
        for (const [px, py] of pending) {
          if (px < b[0]) b[0] = px;
          if (py < b[1]) b[1] = py;
          if (px > b[2]) b[2] = px;
          if (py > b[3]) b[3] = py;
        }
      }
      pending = [];
    };

    for (const tok of t.split(/\s+/)) {
      const n = Number(tok);
      if (tok !== "" && !isNaN(n)) {
        args.push(n);
        continue;
      }

      if (tok === "q") stack.push(ctm.slice());
      else if (tok === "Q") ctm = stack.pop() || ctm;
      else if (tok === "cm" && args.length >= 6) ctm = mul(args.slice(-6), ctm);
      else if (tok === "re" && args.length >= 4) {
        const [x, y, w, h] = args.slice(-4);
        add(x, y);
        add(x + w, y + h);
      } else if ((tok === "m" || tok === "l") && args.length >= 2) {
        add(args[args.length - 2], args[args.length - 1]);
      } else if (tok === "c" && args.length >= 6) {
        for (let i = 0; i < 6; i += 2) add(args[args.length - 6 + i], args[args.length - 5 + i]);
      } else if ((tok === "v" || tok === "y") && args.length >= 4) {
        for (let i = 0; i < 4; i += 2) add(args[args.length - 4 + i], args[args.length - 3 + i]);
      } else if (PAINT_OPS.has(tok)) {
        commit();
      } else if (tok === "n" || tok === "W" || tok === "W*") {
        pending = []; /* clipped or discarded: nothing is drawn */
      } else if (tok.endsWith("BDC")) {
        /* "/NonStruct <</MCID 3 >>BDC" splits on whitespace, so the id
           arrives as the last number seen before the operator */
        pending = [];
        mcid = args.length ? String(args[args.length - 1]) : null;
      } else if (tok === "EMC") {
        pending = [];
        mcid = null;
      }

      args = [];
    }

    perPage[p] = boxesOnPage;
  }

  for (const k in objs) {
    const d = objs[k].dict;
    if (!/\/S \/Figure/.test(d)) continue;
    if (/\/BBox/.test(d)) continue;

    const pg = (/\/Pg (\d+) 0 R/.exec(d) || [])[1];
    const kv = /\/K\s*(\[[^\]]*\]|\d+)/.exec(d);
    if (!pg || !kv) continue;

    const mcids = (kv[1].match(/\d+/g) || []).map(String);
    let box = null;
    for (const id of mcids) {
      const b = (perPage[pg] || {})[id];
      if (!b) continue;
      box = box
        ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])]
        : b.slice();
    }
    if (!box || !isFinite(box[0])) continue;

    boxes[k] = box.map((v) => Math.round(v * 100) / 100);
  }

  return boxes;
}

/* ---------------------------------------------------------------
   Fix 4 — XMP metadata carrying the PDF/UA identifier

   Chrome writes no XMP at all. PAC treats a missing PDF/UA identifier
   as an immediate failure, which is exactly why the hand-corrected
   accessible edition has one and a freshly rendered file does not.

   The title comes from the source page's <title>, so the two cannot
   disagree.
   --------------------------------------------------------------- */

function xmlEscape(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function addXmpMetadata(pdf, html, replacements, additions, alloc) {
  const { objs } = pdf;

  const catalogNum = Object.keys(objs).find((k) =>
    /\/Type \/Catalog/.test(objs[k].dict)
  );
  if (!catalogNum) throw new Error("no document catalog");
  if (/\/Metadata /.test(objs[catalogNum].dict)) return null;

  const title = xmlEscape(
    (/<title>([\s\S]*?)<\/title>/i.exec(html) || [, ""])[1].trim()
  );
  const lang = (/<html[^>]*\blang="([^"]*)"/i.exec(html) || [, "en"])[1];
  const producer = (/\/Producer \(([^)]*)\)/.exec(objs[1] ? objs[1].dict : "") || [
    ,
    "",
  ])[1];

  const xmp =
    '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n' +
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">\n' +
    '  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
    '    <rdf:Description rdf:about=""\n' +
    '        xmlns:dc="http://purl.org/dc/elements/1.1/"\n' +
    '        xmlns:pdf="http://ns.adobe.com/pdf/1.3/"\n' +
    '        xmlns:pdfuaid="http://www.aiim.org/pdfua/ns/id/">\n' +
    "      <dc:title>\n        <rdf:Alt>\n" +
    '          <rdf:li xml:lang="x-default">' + title + "</rdf:li>\n" +
    "        </rdf:Alt>\n      </dc:title>\n" +
    "      <dc:language>\n        <rdf:Bag>\n" +
    "          <rdf:li>" + lang + "</rdf:li>\n" +
    "        </rdf:Bag>\n      </dc:language>\n" +
    "      <pdf:Producer>" + xmlEscape(producer) + "</pdf:Producer>\n" +
    "      <pdfuaid:part>1</pdfuaid:part>\n" +
    "    </rdf:Description>\n  </rdf:RDF>\n</x:xmpmeta>\n" +
    '<?xpacket end="w"?>';

  const data = Buffer.from(xmp, "utf8");
  const num = alloc();

  additions[num] = {
    dict: "\n<</Type /Metadata\n/Subtype /XML\n/Length " + data.length + ">>\n",
    data,
  };

  const base = replacements[catalogNum]
    ? replacements[catalogNum].dict || objs[catalogNum].dict
    : objs[catalogNum].dict;

  replacements[catalogNum] = Object.assign({}, replacements[catalogNum], {
    dict: base.replace(/\/Type \/Catalog/, "/Type /Catalog\n/Metadata " + num + " 0 R"),
  });

  return num;
}

/* Read the current text of an object's dictionary, whether or not it
   has already been rewritten this build, and write a new one back. */
function patch(pdf, replacements, num, fn) {
  const current = replacements[num]
    ? replacements[num].dict || pdf.objs[num].dict
    : pdf.objs[num].dict;
  replacements[num] = Object.assign({}, replacements[num], { dict: fn(current) });
}

function childRefs(dict) {
  const k = /\/K\s*\[([^\]]*)\]/.exec(dict);
  if (!k) return null;
  return (k[1].match(/\d+(?= 0 R)/g) || []).map(String);
}

/* ---------------------------------------------------------------
   Fix 6 — every list item needs one LBody

   PDF/UA is strict about lists: an LI holds an optional Lbl and
   exactly one LBody. Chrome gives this document a Lbl and then bare
   content, which is what PAC reports sixteen times over as
   "LI element must contain exactly one LBody element".

   Where the item has a single block of content it becomes the LBody
   outright. Where it has more than one, they are gathered into a new
   LBody so the item still has exactly one.
   --------------------------------------------------------------- */

function fixListBodies(pdf, replacements, additions, alloc) {
  const { objs } = pdf;
  let retagged = 0;
  let wrapped = 0;

  for (const k in objs) {
    if (!/\/S \/LI/.test(objs[k].dict)) continue;

    const kids = childRefs(objs[k].dict);
    if (!kids) continue;

    const labels = kids.filter((r) => /\/S \/Lbl/.test(objs[r].dict));
    const body = kids.filter((r) => !/\/S \/Lbl/.test(objs[r].dict));
    if (!body.length) continue;
    if (body.some((r) => /\/S \/LBody/.test(objs[r].dict))) continue;

    if (body.length === 1) {
      patch(pdf, replacements, body[0], (d) => d.replace("/S /NonStruct", "/S /LBody"));
      retagged++;
      continue;
    }

    const lbodyNum = alloc();
    additions[lbodyNum] = {
      dict:
        "\n<</Type /StructElem\n/S /LBody\n/P " +
        k +
        " 0 R\n/K [" +
        body.map((r) => r + " 0 R").join(" ") +
        "]>>\n",
      data: null,
    };
    for (const r of body) {
      patch(pdf, replacements, r, (d) => d.replace(/\/P \d+ 0 R/, "/P " + lbodyNum + " 0 R"));
    }
    patch(pdf, replacements, k, (d) =>
      d.replace(
        /\/K\s*\[[^\]]*\]/,
        "/K [" + labels.map((r) => r + " 0 R").join(" ") + (labels.length ? " " : "") + lbodyNum + " 0 R]"
      )
    );
    wrapped++;
  }

  return { retagged, wrapped };
}

/* ---------------------------------------------------------------
   Fix 7 — bookmarks

   PAC's quality check wants a document outline whenever a file has
   headings, and Chrome writes none. The outline is built from the
   headings themselves, so it always matches the pattern: the title at
   the top, every section beneath it.
   --------------------------------------------------------------- */

function pdfString(s) {
  /* UTF-16BE hex, so em dashes and the like survive intact */
  let hex = "FEFF";
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c > 0xffff) {
      const v = c - 0x10000;
      hex += (0xd800 + (v >> 10)).toString(16).padStart(4, "0");
      hex += (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, "0");
    } else {
      hex += c.toString(16).padStart(4, "0");
    }
  }
  return "<" + hex.toUpperCase() + ">";
}

function addOutline(pdf, replacements, additions, alloc) {
  const { objs } = pdf;

  const catalogNum = Object.keys(objs).find((k) => /\/Type \/Catalog/.test(objs[k].dict));
  if (/\/Outlines /.test(objs[catalogNum].dict)) return 0;

  /* headings in reading order, with the page each one sits on */
  const { out } = readingOrder(objs);
  const pages = pageObjects(objs);
  const seen = {};
  const headings = [];
  for (const r of out) {
    if (r.headingElem === null || r.headingElem === undefined) continue;
    if (seen[r.headingElem] === undefined) {
      seen[r.headingElem] = headings.length;
      /* the heading's own /Pg where it has one; otherwise the page its
         content was found on, since /Pg can be inherited */
      const pg =
        (/\/Pg (\d+) 0 R/.exec(objs[r.headingElem].dict) || [])[1] ||
        (r.page ? String(pages[r.page - 1]) : null);
      headings.push({ level: r.headingLevel, text: "", page: pg });
    }
    headings[seen[r.headingElem]].text += r.text || "";
  }
  headings.forEach((h) => (h.text = h.text.replace(/\s+/g, " ").trim()));

  const usable = headings.filter((h) => h.text && h.page);
  if (!usable.length) return 0;

  const outlinesNum = alloc();
  const nums = usable.map(() => alloc());

  /* the H1 becomes the root bookmark and everything below nests inside
     it, which mirrors how the pattern actually reads */
  const rootIdx = usable.findIndex((h) => h.level === 1);
  const hasRoot = rootIdx === 0;
  const children = hasRoot ? usable.slice(1) : usable;
  const childNums = hasRoot ? nums.slice(1) : nums;

  const dest = (h) => "[" + h.page + " 0 R /XYZ null null null]";

  childNums.forEach((n, i) => {
    const prev = i > 0 ? childNums[i - 1] + " 0 R" : null;
    const next = i < childNums.length - 1 ? childNums[i + 1] + " 0 R" : null;
    additions[n] = {
      dict:
        "\n<</Title " +
        pdfString(children[i].text) +
        "\n/Parent " +
        (hasRoot ? nums[0] : outlinesNum) +
        " 0 R" +
        (prev ? "\n/Prev " + prev : "") +
        (next ? "\n/Next " + next : "") +
        "\n/Dest " +
        dest(children[i]) +
        ">>\n",
      data: null,
    };
  });

  if (hasRoot) {
    additions[nums[0]] = {
      dict:
        "\n<</Title " +
        pdfString(usable[0].text) +
        "\n/Parent " +
        outlinesNum +
        " 0 R" +
        (childNums.length
          ? "\n/First " +
            childNums[0] +
            " 0 R\n/Last " +
            childNums[childNums.length - 1] +
            " 0 R\n/Count " +
            childNums.length
          : "") +
        "\n/Dest " +
        dest(usable[0]) +
        ">>\n",
      data: null,
    };
  }

  const top = hasRoot ? [nums[0]] : childNums;
  additions[outlinesNum] = {
    dict:
      "\n<</Type /Outlines\n/First " +
      top[0] +
      " 0 R\n/Last " +
      top[top.length - 1] +
      " 0 R\n/Count " +
      (hasRoot ? 1 + childNums.length : childNums.length) +
      ">>\n",
    data: null,
  };

  patch(pdf, replacements, catalogNum, (d) =>
    d.replace(/\/Type \/Catalog/, "/Type /Catalog\n/Outlines " + outlinesNum + " 0 R")
  );

  return usable.length;
}

/* ---------------------------------------------------------------
   Reproducible timestamps

   Chrome stamps the moment of the render, so two builds of an
   unchanged pattern differ. Stamping the source file's own
   modification time instead means a rebuild only shows up in git
   when the pattern actually changed.
   --------------------------------------------------------------- */

function fixDates(pdf, sourcePath, replacements) {
  const { objs } = pdf;
  const t = fs.statSync(sourcePath).mtime;
  const p = (n, w) => String(n).padStart(w || 2, "0");
  const stamp =
    "D:" +
    t.getUTCFullYear() +
    p(t.getUTCMonth() + 1) +
    p(t.getUTCDate()) +
    p(t.getUTCHours()) +
    p(t.getUTCMinutes()) +
    p(t.getUTCSeconds()) +
    "+00'00'";

  for (const k in objs) {
    const d = objs[k].dict;
    if (!/\/CreationDate \(/.test(d)) continue;
    const base = replacements[k] ? replacements[k].dict || d : d;
    replacements[k] = Object.assign({}, replacements[k], {
      dict: base
        .replace(/\/CreationDate \([^)]*\)/, "/CreationDate (" + stamp + ")")
        .replace(/\/ModDate \([^)]*\)/, "/ModDate (" + stamp + ")"),
    });
  }

  return stamp;
}

/* ---------------------------------------------------------------
   Build
   --------------------------------------------------------------- */

function main() {
  const names = Object.keys(TARGETS);

  if (!TARGET_NAME || !TARGETS[TARGET_NAME]) {
    console.error(
      "\n  usage: node tools/build-pattern.js <" +
        names.join("|") +
        "> [--check] [--force]\n"
    );
    process.exit(2);
  }

  const target = TARGETS[TARGET_NAME];

  const SOURCE = SRC_OVERRIDE ? path.resolve(SRC_OVERRIDE) : target.source;
  const OUT_PDF = OUT_OVERRIDE ? path.resolve(OUT_OVERRIDE) : target.out;

  /* the freeze protects the published file, not the edition itself, so
     it does not apply when the build is writing somewhere else */
  const overwritingShipped = !OUT_OVERRIDE && !CHECK_ONLY;
  if (target.frozen && overwritingShipped && !FORCE) {
    console.error("\n  refusing to rebuild " + TARGET_NAME + ":");
    console.error("  " + target.frozen);
    console.error("  pass --check to verify, --out <path> to build a copy,");
    console.error("  or --force if you mean to replace the published file\n");
    process.exit(2);
  }

  const html = fs.readFileSync(SOURCE, "utf8");
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-pattern-"));
  const rawPdf = path.join(tmpDir, "raw.pdf");
  /* always built aside and verified first — a failing build must not
     replace a file that is already known good */
  const stagedPdf = path.join(tmpDir, "final.pdf");

  console.log("\n  building from " + path.basename(SOURCE));

  const chrome = render(SOURCE, rawPdf);
  console.log("    · rendered with " + path.basename(chrome));

  const pdf = load(rawPdf);

  const { replacements, added } = fixSpaces(pdf);
  console.log("    · word spaces restored on " + added + " wrapped lines");

  const labels = linkLabelsFromHtml(html);
  const { described, undescribed } = fixLinkAlt(pdf, labels, replacements);
  console.log("    · alternative descriptions written on " + described + " link(s)");
  for (const u of undescribed) {
    console.log(
      "    ! no aria-label in the HTML for link to " +
        u +
        " — it will have no description"
    );
  }

  const wrapped = markArtifacts(pdf, replacements);
  console.log("    · " + wrapped + " decorative shapes marked as artifacts");

  const boxes = figureBBoxes(pdf, replacements);
  for (const num in boxes) {
    const base = replacements[num] ? replacements[num].dict || pdf.objs[num].dict : pdf.objs[num].dict;
    replacements[num] = Object.assign({}, replacements[num], {
      dict: base.replace(
        /\/S \/Figure/,
        "/S /Figure\n/A <</O /Layout /BBox [" + boxes[num].join(" ") + "]>>"
      ),
    });
  }
  console.log("    · bounding boxes written on " + Object.keys(boxes).length + " figure(s)");

  const additions = {};
  let nextNum = Math.max(...Object.keys(pdf.objs).map(Number)) + 1;
  const alloc = () => nextNum++;

  const lists = fixListBodies(pdf, replacements, additions, alloc);
  console.log(
    "    · list items given a body: " + lists.retagged + " retagged, " + lists.wrapped + " wrapped"
  );

  const marks = addOutline(pdf, replacements, additions, alloc);
  console.log("    · outline written with " + marks + " bookmark(s)");

  const xmpNum = addXmpMetadata(pdf, html, replacements, additions, alloc);
  console.log(
    "    · " +
      (xmpNum
        ? "XMP metadata written with the PDF/UA identifier"
        : "XMP metadata already present, left alone")
  );

  const stamp = fixDates(pdf, SOURCE, replacements);
  console.log("    · dated " + stamp + ", from the source file");

  save(pdf, replacements, stagedPdf, additions);

  const result = verify(stagedPdf);
  if (!result.ok) {
    console.log("\n  build failed — nothing was written to assets/patterns");
    console.log("  the previous files are untouched\n");
    process.exit(1);
  }

  if (!CHECK_ONLY) {
    fs.copyFileSync(stagedPdf, OUT_PDF);
    console.log("\n  wrote " + path.relative(ROOT, OUT_PDF));
  } else {
    console.log("\n  --check: verified only, nothing written");
  }

  console.log("");
}

main();
