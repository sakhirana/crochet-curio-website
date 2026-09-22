/* ------------------------------------------------------------------
   Generates one pattern page per project, plus assets/js/catalogue.js
   which the pattern pages and the pattern library read from.

   Every listing on this site is a DIGITAL CROCHET PATTERN. The photo
   shows the finished piece; what is sold is the instructions for
   making it. Nothing physical ships.

   Run after editing the catalogue below:   node build-products.js
------------------------------------------------------------------ */
const fs = require("fs");
const path = require("path");

const PATTERNS = [
  {
    slug: "beanie",
    name: "Rosie Beanie",
    price: 0,
    /* The one free pattern in the studio. It is not sold — the PDF
       downloads straight from the button. It is rendered
       from pattern-beanie-accessible.html, which stays in the repo as its
       source: 24pt type, no charts, no abbreviations, tagged for screen
       readers. */
    free: true,
    patternHref: "assets/patterns/rosie-beanie-pattern.pdf",
    /* Two editions of the same hat, and a page you can read without
       downloading anything. `patternHref` is the large print edition:
       the file the Accessible Patterns Index links to, and the one that
       passes PAC. `standardHref` is the shorthand edition most
       crocheters will want. A pattern without these simply shows the
       download button on its own. */
    standardHref: "assets/patterns/rosie-beanie-pattern-standard.pdf",
    standardPages: 5,
    /* The same standard edition in Hindi, built from
       pattern-beanie-standard-hi.html. Where a pattern has this, the
       page offers a language select above the download; where it does
       not, the download stands on its own as before. Only the standard
       edition is translated so far — the large print edition and the
       Word file are English until they have been read end to end in
       Hindi with a screen reader. */
    standardHrefHi: "assets/patterns/rosie-beanie-pattern-standard-hi.pdf",
    /* pattern-beanie-standard.html is the source this PDF is built from
       and stays in the repo, but it is not linked: the people who want
       the standard edition are mostly printing it, and a browser link
       under a download button was one option too many. */
    readHref: "pattern-beanie-accessible.html",
    /* The same large print edition in Hindi: the page, the Word file
       linked from inside it, and the printable PDF. */
    readHrefHi: "pattern-beanie-accessible-hi.html",
    patternHrefHi: "assets/patterns/rosie-beanie-pattern-hi.pdf",
    badge: "Free pattern",
    tile: "neutral",
    span: "normal",
    image: "beanie.webp",
    imageW: 1000,
    imageH: 1000,
    alt: "Dusty pink crochet beanie, ribbed all over, with a deep turned-up brim.",
    tagline: "Ribbed, folded at the brim.",
    difficulty: "Beginner",
    time: "6 hours (approx.)",
    sizes: "One size",
    pages: 13,
    /* The large print edition also exists as a Word file. It is linked
       twice on purpose: from the top of the page readHref points at, for
       someone already reading who wants it offline, and from the formats
       list on the product page, for someone still choosing. */
    wordHref: "assets/patterns/rosie-beanie-pattern-large-print.docx",
    wordHrefHi: "assets/patterns/rosie-beanie-pattern-large-print-hi.docx",
    yarn: "100% acrylic yarn, weight 4",
    hook: "5mm",
    notions: "Darning needle, stitch markers or safety pins, measuring tape, scissors.",
    gauge: "40 stitches to about 30.5cm across a row; 66 rows to about 51cm along the long edge.",
    skills: [
      "Chain stitch",
      "Single crochet",
      "Back loop single crochet",
      "Slip stitch"
    ]
  }
];

/* ---------------- helpers ---------------- */
const rupee = n => "&#8377;" + n.toLocaleString("en-IN");
const esc = s => s.replace(/&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const levelClass = d => d.toLowerCase().replace(/\s+/g, "-");

/* Every format the pattern can actually be read in, built from the files the
   entry names rather than written out by hand, so the line cannot drift from
   what the page links to. */
const formatList = p => {
  const items = [];
  if (p.standardHref) { items.push("Standard PDF"); }
  if (p.patternHref)  { items.push(p.standardHref ? "Large print PDF (24pt font)" : "PDF"); }
  if (p.readHref)     { items.push("Accessible webpage (HTML)"); }
  if (p.wordHref)     { items.push("Accessible Word document (.docx)"); }
  return items.length ? items : [`${p.pages}-page PDF`];
};

function header(activeLibrary) {
  return `<header class="site-header">
  <div class="container">
    <nav class="nav-bar" aria-label="Primary">
      <a class="brand" href="index.html">Crochet&nbsp;Curio</a>

      <button class="btn btn--secondary nav-toggle" type="button" id="navToggle" aria-expanded="false" aria-controls="navList">
        <!-- Icon/Menu/24 -->
        <svg class="icon-24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true" focusable="false">
          <path d="M3 12H21M3 6H21M3 18H21"/>
        </svg> Menu
      </button>

      <ul class="nav-list" id="navList">
        <li><a href="index.html#patterns">Pattern library</a></li>
        <li><a href="index.html#process">How it works</a></li>
        <li><a href="index.html#story">Our story</a></li>
        <li><a href="index.html#contact">Contact</a></li>
        <li><a href="library.html"${activeLibrary ? ' aria-current="page"' : ""}>Saved patterns</a></li>
      </ul>
    </nav>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <p style="margin-bottom: var(--space-m)"><a class="brand" href="index.html">Crochet&nbsp;Curio</a></p>
        <p class="muted" style="font-size: var(--text-m-size); max-width: 32ch">
          Digital crochet patterns, written and tested by hand. Make the piece yourself.
        </p>
      </div>
      <nav aria-labelledby="footer-shop">
        <h2 id="footer-shop">Patterns</h2>
        <ul>
${PATTERNS.map(p => `          <li><a href="product-${p.slug}.html">${esc(p.name)}</a></li>`).join("\n")}
        </ul>
      </nav>
      <nav aria-labelledby="footer-help">
        <h2 id="footer-help">Help</h2>
        <ul>
          <li><a href="library.html">Saved patterns</a></li>
          <li><a href="index.html#process">How patterns are delivered</a></li>
          <li><a href="index.html#levels">Skill levels explained</a></li>
          <li><a href="index.html#contact">Stuck on a row?</a></li>
        </ul>
      </nav>
      <nav aria-labelledby="footer-studio">
        <h2 id="footer-studio">Studio</h2>
        <ul>
          <li><a href="index.html#story">Our story</a></li>
          <li><a href="index.html#process">How a pattern is written</a></li>
          <li><a href="index.html#contact">Pattern testing</a></li>
        </ul>
      </nav>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 Crochet Curio. Patterns are for your own use.</p>
      <p>Built on the Crochet Curio design system.</p>
    </div>
  </div>
</footer>`;
}

function head(title, description) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/tokens.css">
<link rel="stylesheet" href="assets/css/styles.css">
<link rel="stylesheet" href="assets/css/shop.css">
<link rel="stylesheet" href="assets/css/motion.css">
<link rel="stylesheet" href="assets/css/preferences.css">
<script src="assets/js/a11y.js"></script>
<script src="assets/js/i18n-hi.js"></script>
<script src="assets/js/i18n.js"></script>
</head>
<body>

<a class="skip-link" href="#main">Skip to main content</a>
`;
}

/* ---------------- pattern page ---------------- */
function patternPage(p, index) {
  const prev = PATTERNS[(index - 1 + PATTERNS.length) % PATTERNS.length];
  const next = PATTERNS[(index + 1) % PATTERNS.length];
  /* A free pattern says what it actually gives you; the rest share the
     studio's standard list. */

  return head(
    `${p.name} — crochet pattern — Crochet Curio`,
    p.free
      ? `Free crochet pattern. ${p.tagline} ${p.difficulty} level, written out in full and free to download.`
      : `Digital crochet pattern. ${p.tagline} ${p.difficulty} level, ${p.pages}-page PDF, instant download.`
  ) + `
${header(false)}

<main id="main">
  <div class="container">

    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li><a href="index.html">Home</a></li>
        <li><a href="index.html#patterns">Patterns</a></li>
        <li><span aria-current="page">${esc(p.name)}</span></li>
      </ol>
    </nav>

    <div class="product">
      <div class="product__mediaCol">
        <div class="product__media">
          <img src="assets/img/${p.image}" alt="${esc(p.alt)}" width="${p.imageW}" height="${p.imageH}">
        </div>
      </div>

      <div class="product__info">
        <p class="kicker">Digital crochet pattern</p>
        ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}
        <h1>${esc(p.name)}</h1>
        <p class="product__tagline">${esc(p.tagline)}</p>
        ${p.free
          ? ``
          : `<p class="product__price">${rupee(p.price)}<span class="visually-hidden"> rupees</span>
          <span class="product__priceNote">PDF pattern &middot; instant download</span>
        </p>`}

        <!-- The formats cell is a list, so it is taller than any other cell.
             It sits in the second column across every row, which leaves the
             plain specs stacked in the first column at an even spacing —
             --spec-rows says how many of them there are. -->
        <ul class="spec-strip" style="--spec-rows: 3">
          <li>
            <span class="spec-strip__label">Skill level</span>
            <span class="level level--${levelClass(p.difficulty)}">${esc(p.difficulty)}</span>
          </li>
          <li>
            <span class="spec-strip__label">Time to make</span>
            <span class="spec-strip__value">${esc(p.time)}</span>
          </li>
          <li>
            <span class="spec-strip__label">Size</span>
            <span class="spec-strip__value">${esc(p.sizes)}</span>
          </li>
          <li class="spec-strip__item--formats">
            <span class="spec-strip__label">Pattern formats available</span>
            <ul class="spec-strip__formats">
${formatList(p).map(f => `              <li>${f}</li>`).join("\n")}
            </ul>
          </li>${(p.standardHrefHi || p.patternHrefHi || p.readHrefHi) ? `
          <li class="spec-strip__item--language">
            <span class="spec-strip__label">Language</span>
            <span class="spec-strip__value">English and Hindi</span>
          </li>` : ``}
        </ul>

        ${p.free
          ? `<div class="buy-form" data-free-slug="${p.slug}">
${p.standardHref ? `
          <!--
            Four formats in two groups: the standard PDF, then the three
            accessible ones under a heading of their own.

            The heading is a jump target. A screen reader user moving by
            heading, or anyone scanning the page, gets to the accessible
            formats in one step instead of reading past the standard PDF
            to find them.

            It does not carry the meaning on its own, though. Each link
            still names its own edition and format in its visible text —
            "Download the large print PDF", not "Download the PDF" —
            because a link list strips headings away, and two links both
            reading "Download the PDF" would be indistinguishable there.
            The same string is the visible label and the accessible name,
            rather than a short visible one and a longer hidden one that
            disagree (2.5.3 Label in Name).

            Within the group the order is most-reached-for first: the web
            page, because it reflows and it is the one that has actually
            passed a screen reader test, then the offline Word file, then
            the PDF for paper.
          -->
          <h2 class="formats__title">The pattern</h2>
${p.standardHrefHi ? `
          <!--
            The language is picked before the download, not after: the
            file is a PDF, so there is no switching it once it is on
            someone's machine.

            The select carries the choice, the link below it is the
            download, and pattern-lang.js keeps the two in step. Without
            the script the link still points at the English PDF, which
            is what it did before the select existed.
          -->
          <div class="formats__lang">
            <label class="formats__langLabel" for="patternLang">Pattern language</label>
            <select class="formats__langSelect" id="patternLang">
              <option value="en" selected>English</option>
              <option value="hi" lang="hi">हिन्दी</option>
            </select>
          </div>
` : ``}
          <!--
            No aria-label on any of these in English: the visible text
            already names the edition and the format, and a hidden label
            that only repeats it is one more string to keep in step.
            pattern-lang.js adds one when the file is Hindi, because
            that is the one thing the visible text cannot say while the
            page itself is in English.
          -->
          <ul class="formats">
            <li>
              <a class="btn btn--primary btn--block" data-format="standard-pdf"${p.standardHrefHi ? ` id="patternDownload"` : ``} href="${p.standardHref}" download${p.standardHrefHi ? ` hreflang="en"` : ``}>Download standard PDF</a>
              <p class="formats__note"${p.standardHrefHi ? ` id="patternNote"` : ``}>${p.standardPages} pages, 12 point type, standard crochet abbreviations, with diagrams.</p>
            </li>
          </ul>

          <!--
            Named for what the group is, not for who it is for, the same
            rule the group above it follows. "Accessible patterns" broke
            that twice over: it sorted the reader rather than the file,
            and set against "The pattern" it made this the side version
            and the other one the real one.

            Both words earn their place. "Large print" alone undersells
            the web page, whose size the reader sets rather than the
            page, and the two together are the Accessible Patterns
            Index's own tags, which is how this audience searches.
          -->
          <h2 class="formats__title">Large print and screen reader edition</h2>

          <ul class="formats">
            <li>
              <a class="btn btn--secondary btn--block" data-format="browser"${p.readHrefHi ? ` id="largePrintRead" hreflang="en"` : ``} href="${p.readHref}">Open in browser</a>
              <p class="formats__note"${p.readHrefHi ? ` id="largePrintReadNote"` : ``}>Pattern in your browser, compatible with screen readers. Every direction written out, no abbreviations.</p>
            </li>${p.wordHref ? `
            <li>
              <a class="btn btn--secondary btn--block" data-format="word"${p.wordHrefHi ? ` id="largePrintWord" hreflang="en"` : ``} href="${p.wordHref}" download>Download Word file</a>
              <p class="formats__note"${p.wordHrefHi ? ` id="largePrintWordNote"` : ``}>Word file for offline use, compatible with screen readers. Every direction written out, no abbreviations.</p>
            </li>` : ``}
            <li>
              <a class="btn btn--secondary btn--block" data-format="large-print-pdf"${p.patternHrefHi ? ` id="largePrintDownload" hreflang="en"` : ``} href="${p.patternHref}" download>Download large print PDF</a>
              <p class="formats__note"${p.patternHrefHi ? ` id="largePrintDownloadNote"` : ``}>24 point font, black on white. Every direction written out, no abbreviations. Best for printing.</p>
            </li>
          </ul>
` : `
          <a class="btn btn--primary btn--block" href="${p.patternHref}" download>Download the pattern &mdash; free</a>
          <p class="buy-form__note">
            No cart, no account, nothing to pay. The PDF saves straight to your device &mdash;
            large print, black on white, and every direction written out in full.
          </p>`}
        </div>`
          : `<div class="buy-form">

          <!--
            Locked until the pattern itself is written. A statement
            rather than a disabled button: a disabled control cannot be
            reached by keyboard and announces nothing, so a screen
            reader user would meet the price and never learn why there
            is no way to act on it. This line is read in order with
            everything around it.
          -->
          <p class="coming-soon">Pattern coming soon</p>
          <p class="buy-form__note">
            This pattern is not written up yet, so there is nothing to buy. The
            photograph shows the finished piece.
          </p>
        </div>`}


        <h2 class="product__detailsTitle">Materials used</h2>
        <dl class="product__details">
          <div><dt>Yarn</dt><dd>${esc(p.yarn)}</dd></div>
          <div><dt>Hook size</dt><dd>${esc(p.hook)}</dd></div>
          <div><dt>Other materials</dt><dd>${esc(p.notions)}</dd></div>
        </dl>

        <h2 class="product__detailsTitle">Stitches you will use</h2>
        <ul class="skills">
${p.skills.map(s => `          <li>${esc(s)}</li>`).join("\n")}
        </ul>

      </div>
    </div>

${PATTERNS.length > 1 ? `    <nav class="product-nav" aria-label="More patterns">
      <a class="product-nav__link" href="product-${prev.slug}.html">
        <span class="muted">Previous pattern</span>
        <span>${esc(prev.name)}</span>
      </a>
      <a class="product-nav__link product-nav__link--next" href="product-${next.slug}.html">
        <span class="muted">Next pattern</span>
        <span>${esc(next.name)}</span>
      </a>
    </nav>
` : ``}
  </div>
</main>

${footer()}

${p.standardHrefHi ? `<script src="assets/js/pattern-lang.js"></script>
` : ``}<script src="assets/js/catalogue.js"></script>
<script src="assets/js/site.js"></script>
<script src="assets/js/shop.js"></script>
<script src="assets/js/motion.js"></script>
</body>
</html>
`;
}

/* ---------------- write everything ---------------- */
const root = __dirname;

PATTERNS.forEach((p, i) => {
  fs.writeFileSync(path.join(root, `product-${p.slug}.html`), patternPage(p, i));
});

const catalogue =
  "/* Generated by build-products.js — do not edit by hand. */\n" +
  "window.CATALOGUE = " +
  JSON.stringify(
    PATTERNS.map(p => ({
      slug: p.slug, name: p.name, price: p.price,
      image: p.image, alt: p.alt,
      difficulty: p.difficulty, pages: p.pages,
      time: p.time, sizes: p.sizes,
      yarn: p.yarn, hook: p.hook, gauge: p.gauge
    })),
    null, 2
  ) + ";\n";

fs.writeFileSync(path.join(root, "assets/js/catalogue.js"), catalogue);

console.log("Wrote " + PATTERNS.length + " pattern pages + assets/js/catalogue.js");
module.exports = { PATTERNS, header, footer, head, rupee, esc };
