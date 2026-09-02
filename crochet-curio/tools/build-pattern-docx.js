/* ============================================================
   build-pattern-docx.js — the accessible edition as a Word file

   Run:  node tools/build-pattern-docx.js

   Why this format exists at all. WebAIM's screen reader user survey
   asks people directly which document format works best for them:
   Word 68.9 per cent, PDF 12.9. Preference runs the same way, Word
   60.6 against PDF 17.3.

   Reflow is the other reason. This file is set at the same size as the
   standard edition, not at a fixed large one, because a reader who
   needs bigger type is better served by raising it themselves than by
   being handed one size somebody else chose. Word reflows when they
   do. Enlarging a fixed-layout PDF instead means scrolling sideways as
   well as down, and a quarter of low vision users magnify to 400 per
   cent or more. The large print PDF is still there for paper.

   It is built from pattern-beanie-accessible.html, the same source
   the PDF comes from, so the wording cannot drift between them.

   The structural difference from the PDF is the point: a .docx has no
   glyph runs and no tag tree. The word-space bug that Chrome's PDF
   writer introduces cannot happen here, because the spaces are simply
   characters in the text.

   The contents entries are real internal links, pointing at bookmarks
   on the headings, so a reader can jump to a section from the top of
   the file the same way they can on the web page. In browse mode that
   is K to reach one and Enter to follow it.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ExternalHyperlink,
  InternalHyperlink,
  BookmarkStart,
  BookmarkEnd,
  bookmarkUniqueNumericIdGen,
  HeadingLevel,
  LevelFormat,
  AlignmentType,
  convertInchesToTwip,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");

/* Two editions of the same file: English by default, Hindi with --hi.
   Both are built from their own accessible page, so the wording cannot
   drift from the page a reader may have started on. */
const HI = process.argv.includes("--hi");

const EDITION = HI
  ? {
      source: path.join(ROOT, "pattern-beanie-accessible-hi.html"),
      out: path.join(ROOT, "assets", "patterns", "rosie-beanie-pattern-large-print-hi.docx"),
      /* Verdana has no Devanagari glyphs. Nirmala UI is the face Windows
         ships for the script and the one the Hindi page asks for first,
         so Word and the browser render the pattern the same way. */
      font: "Nirmala UI",
      /* hi-IN so a screen reader picks its Hindi voice, and so Word does
         not spell-check Hindi against an English dictionary. */
      lang: "hi-IN",
      title: "फोल्ड होने वाली रिब्ड बीनी, वयस्क मीडियम — एक्सेसिबल एडिशन",
      description:
        "फोल्ड होने वाली रिब्ड बीनी का क्रोशे पैटर्न, वयस्क मीडियम। एक्सेसिबल एडिशन: सैन्स सेरिफ़ टाइप, कोई शॉर्ट फ़ॉर्म नहीं, कोई चार्ट नहीं। टाइप का साइज़ आप खुद बढ़ा सकते हैं।",
    }
  : {
      source: path.join(ROOT, "pattern-beanie-accessible.html"),
      out: path.join(ROOT, "assets", "patterns", "rosie-beanie-pattern-large-print.docx"),
      font: "Verdana",
      /* en-GB, so Word does not underline "colour" and "memorise" as
         misspellings and a screen reader gets the right pronunciation
         rules */
      lang: "en-GB",
      title: "Foldable Ribbed Beanie, Adult Medium — accessible edition",
      description:
        "Crochet pattern for a foldable ribbed beanie in adult medium. Accessible edition: sans serif, no abbreviations, no charts, and the type size is yours to raise.",
    };

const SOURCE = EDITION.source;
const OUT = EDITION.out;

const html = fs.readFileSync(SOURCE, "utf8");

/* ---------------------------------------------------------------
   Read the pattern out of the page
   --------------------------------------------------------------- */

const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
};

function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, n) => (NAMED[n] !== undefined ? NAMED[n] : m));
}

function textOf(fragment) {
  return decode(fragment.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

/* Split a block's inner HTML into plain text and real links, so the
   email address arrives in Word as something you can click rather
   than as an address you have to retype. */
function inlineParts(fragment) {
  const parts = [];
  const re = /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let last = 0;
  let m;

  while ((m = re.exec(fragment))) {
    const before = textOf(fragment.slice(last, m.index));
    if (before) parts.push({ text: before });
    parts.push({ text: textOf(m[2]), href: decode(m[1]) });
    last = m.index + m[0].length;
  }

  const rest = textOf(fragment.slice(last));
  if (rest) parts.push({ text: rest });

  /* textOf trims each piece, so put back the single space that sat
     between them in the source */
  return parts.map((p, i) => ({
    ...p,
    text: i < parts.length - 1 ? p.text + " " : p.text,
  }));
}

const body = (/<body[^>]*>([\s\S]*)<\/body>/i.exec(html) || [, html])[1];

const blocks = [];
const listStack = [];
let orderedInstance = 0;
/* the contents list is a nav of in-page links on the web; in a
   document it becomes a plain list of section names, which still
   orients a reader who is listening rather than looking */
let inContents = false;

/* The offline box is the web page pointing at this file. Reading it
   back here would have the Word file tell its reader to go and
   download the Word file, so it is dropped the way the print
   stylesheet drops it. */
let inOffline = false;

const re =
  /<nav\b[^>]*class="contents"[^>]*>|<\/nav>|<div\b[^>]*class="offline"[^>]*>|<\/div>|<(ol|ul)\b[^>]*>|<\/(ol|ul)>|<(h1|h2|h3|p|li)\b([^>]*)>([\s\S]*?)<\/\3>/gi;
let m;

while ((m = re.exec(body))) {
  if (m[0].startsWith("<nav")) {
    inContents = true;
    continue;
  }
  if (m[0] === "</nav>") {
    inContents = false;
    continue;
  }
  if (m[0].startsWith("<div")) {
    inOffline = true;
    continue;
  }
  if (m[0] === "</div>") {
    inOffline = false;
    continue;
  }
  if (inOffline) continue;
  if (m[1]) {
    const type = m[1].toLowerCase();
    listStack.push({ type, instance: type === "ol" ? orderedInstance++ : 0 });
    continue;
  }
  if (m[2]) {
    listStack.pop();
    continue;
  }

  const tag = m[3].toLowerCase();
  const attrs = m[4];
  /* The back-to-contents links are a web affordance: they exist so a
     reader scrolling one long page can get back to the list without
     travelling through it. The Word file has its own navigation pane
     and its own contents bookmarks, so eight repeats of the same link
     would be read out for nothing. Dropped the way the offline box is. */
  if (/class="backlink"/.test(attrs)) continue;
  const inner = m[5];
  const text = textOf(inner);
  if (!text) continue;

  if (tag === "li") {
    const list = listStack[listStack.length - 1] || { type: "ul", instance: 0 };
    blocks.push({
      tag: "li",
      text,
      list: inContents ? "ul" : list.type,
      instance: inContents ? 0 : list.instance,
      /* a contents entry links to a heading on the page; the same
         fragment becomes a Word bookmark name below, so the entry can
         jump there rather than only naming the section */
      anchor: inContents ? (/href="#([^"]+)"/.exec(inner) || [])[1] || null : null,
    });
  } else {
    blocks.push({
      tag,
      text,
      id: (/id="([^"]+)"/.exec(attrs) || [])[1] || null,
      parts: tag === "p" ? inlineParts(inner) : null,
    });
  }
}

/* ---------------------------------------------------------------
   Turn it into a document
   --------------------------------------------------------------- */

/* Named on both the ascii and the complex-script slots. Devanagari is
   a complex script in Word's model: without the cs font and size it
   falls back to the theme font at 10 point, which is smaller than the
   size set here and would quietly undercut the whole file. */
const FONT = { ascii: EDITION.font, hAnsi: EDITION.font, cs: EDITION.font };
const BLACK = "000000";
const LANG = EDITION.lang;

/* The built-in Heading styles carry the outline level a screen reader
   navigates by, so the paragraphs still use them. Their sizes are
   Word's own (16/13/12pt) and a redefinition loses to them, so the type
   size is set on the run instead, where it wins outright. */
const HEADING_OF = {
  h1: { level: HeadingLevel.HEADING_1, size: 40 },
  h2: { level: HeadingLevel.HEADING_2, size: 30 },
  h3: { level: HeadingLevel.HEADING_3, size: 26 },
};

/* Only the headings the contents actually points at get a bookmark.
   Bookmarking every heading would put names in the file that nothing
   navigates to, and Word carries them forever. */
const TARGETS = new Set(blocks.map((b) => b.anchor).filter(Boolean));

/* One generator for the whole document. w:id is what pairs a
   bookmarkStart with its bookmarkEnd, and Word needs it unique per
   bookmark: give them all the same number and it reads the file as one
   bookmark opened and closed repeatedly, so every link lands nowhere.

   The library's own Bookmark class cannot be used for this. It calls
   bookmarkUniqueNumericIdGen() inside its constructor, which makes a
   fresh counter per bookmark, so every one of them comes out as 1.
   Holding the generator here and marking the range by hand is what
   makes the numbers actually run 1, 2, 3. */
const nextBookmarkId = bookmarkUniqueNumericIdGen();

const children = blocks.map((b) => {
  if (b.tag === "li") {
    const run = new TextRun(
      b.anchor ? { text: b.text, style: "Hyperlink" } : { text: b.text }
    );
    return new Paragraph({
      children: [
        b.anchor
          ? new InternalHyperlink({ anchor: b.anchor, children: [run] })
          : run,
      ],
      numbering: {
        reference: b.list === "ol" ? "pattern-numbers" : "pattern-bullets",
        level: 0,
        instance: b.instance,
      },
      spacing: { after: 120 },
    });
  }

  const h = HEADING_OF[b.tag];
  if (h) {
    const run = new TextRun({
      text: b.text,
      font: FONT,
      size: h.size,
      sizeComplexScript: h.size,
      bold: true,
      boldComplexScript: true,
      italics: false,
      color: BLACK,
    });
    const marked = b.id && TARGETS.has(b.id);
    const bookmarkId = marked ? nextBookmarkId() : null;

    return new Paragraph({
      children: marked
        ? [
            new BookmarkStart(b.id, bookmarkId),
            run,
            new BookmarkEnd(bookmarkId),
          ]
        : [run],
      heading: h.level,
      spacing: { before: 360, after: 200 },
      keepNext: true,
    });
  }

  const runs = (b.parts || [{ text: b.text }]).map((p) =>
    p.href
      ? new ExternalHyperlink({
          link: p.href,
          children: [new TextRun({ text: p.text, style: "Hyperlink" })],
        })
      : new TextRun({ text: p.text })
  );

  return new Paragraph({ children: runs, spacing: { after: 200 } });
});

const numberedLevel = (format, text, indent, hanging) => ({
  level: 0,
  format,
  text,
  alignment: AlignmentType.LEFT,
  style: {
    run: { font: FONT, size: 24, sizeComplexScript: 24, color: BLACK },
    paragraph: {
      indent: { left: convertInchesToTwip(indent), hanging: convertInchesToTwip(hanging) },
    },
  },
});

const doc = new Document({
  title: EDITION.title,
  description: EDITION.description,
  creator: "Crochet Curio",
  styles: {
    default: {
      /* 12 point is 24 half-points — the same size as the standard
         edition. Not a fixed large size: the reader raises it in Word
         to whatever they need, and the text reflows when they do. */
      document: {
        run: {
          font: FONT,
          size: 24,
          sizeComplexScript: 24,
          color: BLACK,
          italics: false,
          language: { value: LANG, bidirectional: LANG },
        },
        paragraph: { spacing: { line: 360, after: 200 }, alignment: AlignmentType.LEFT },
      },
    },
  },
  numbering: {
    config: [
      { reference: "pattern-bullets", levels: [numberedLevel(LevelFormat.BULLET, "•", 0.5, 0.28)] },
      { reference: "pattern-numbers", levels: [numberedLevel(LevelFormat.DECIMAL, "%1.", 0.6, 0.38)] },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          /* US Letter, in DXA */
          size: { width: 12240, height: 15840 },
          margin: {
            top: convertInchesToTwip(0.8),
            right: convertInchesToTwip(0.8),
            bottom: convertInchesToTwip(0.8),
            left: convertInchesToTwip(0.8),
          },
        },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  const counts = blocks.reduce((a, b) => ((a[b.tag] = (a[b.tag] || 0) + 1), a), {});
  const links = blocks.reduce((n, b) => n + ((b.parts || []).filter((p) => p.href).length), 0);
  console.log("\n  wrote " + path.relative(ROOT, OUT));
  console.log("    · " + JSON.stringify(counts));
  console.log("    · " + links + " hyperlink(s), language " + LANG + "\n");
});
