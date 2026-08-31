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
const { verify } = require("./verify-pattern-pdf");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "pattern-beanie-accessible.html");
const OUT_PDF = path.join(ROOT, "assets", "patterns", "rosie-beanie-pattern.pdf");

const CHECK_ONLY = process.argv.includes("--check");

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

  const stamp = fixDates(pdf, SOURCE, replacements);
  console.log("    · dated " + stamp + ", from the source file");

  save(pdf, replacements, stagedPdf);

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
