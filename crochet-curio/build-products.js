/* ------------------------------------------------------------------
   Generates one pattern page per project, plus assets/js/catalogue.js
   which the basket, checkout and pattern library read from.

   Every listing on this site is a DIGITAL CROCHET PATTERN. The photo
   shows the finished piece; what is sold is the instructions for
   making it. Nothing physical ships.

   Run after editing the catalogue below:   node build-products.js
------------------------------------------------------------------ */
const fs = require("fs");
const path = require("path");

/* What every pattern in the studio includes, regardless of project. */
const INCLUDED = [
  "Written instructions, row by row, in UK and US terms",
  "Stitch charts for every motif and panel",
  "Step photos for the joins and the shaping",
  "A yarn substitution guide and a gauge swatch checklist",
  "Lifetime access — re-download whenever an update lands"
];

const PATTERNS = [
  {
    slug: "checkerboard-bag",
    name: "Marina Tote Bag",
    price: 380,
    badge: "Most made",
    tile: "accent",
    span: "wide",
    image: "Bluebell.webp",
    imageW: 1000,
    imageH: 1500,
    alt: "A hand-crocheted shoulder bag in a sky blue and white checkerboard, with softly rounded corners and a long single strap standing in a tall loop above it.",
    tagline: "A sky blue checkerboard on a long single strap — and the pattern behind it.",
    difficulty: "Confident beginner",
    difficultyNote: "If you can chain, double crochet and carry a second colour along a row, you can make this.",
    time: "About 11 hours",
    sizes: "One size — 34cm wide by 38cm deep, strap drop 30cm",
    pages: 16,
    yarn: "Mercerised cotton, DK weight. About 320g in blue, 180g in white.",
    hook: "4mm hook. A 3.5mm for the strap edging if you work loosely.",
    notions: "Cotton drill for the lining (40 by 90cm), tapestry needle, stitch markers.",
    gauge: "18 stitches and 20 rows to 10cm in double crochet, after blocking.",
    skills: [
      "Chain, slip stitch and double crochet",
      "Changing colour mid-row without a join",
      "Working in continuous rounds",
      "Hand-sewing a simple lining"
    ],
    extras: ["A printable checkerboard grid you can recolour before you start"],
    body: [
      "The checkerboard is worked square by square in mercerised cotton, and the pattern spends real time on the part most tutorials skip: how to carry the resting colour so the blocks stay crisp rather than blurring at the edges. Chart and written rows sit side by side, so you can follow whichever you read faster.",
      "The strap is crocheted in one continuous piece with the body rather than sewn on afterwards, so there is no seam to work loose under weight. The pattern walks through that transition stitch by stitch, with photos at the two rows where it is easy to lose count."
    ],
    notes: [
      ["Sizing it up", "Add stitches in multiples of 8 to keep the checkerboard square. The maths is written out."],
      ["Yarn swaps", "Any smooth DK cotton works. Avoid fluffy yarns — they soften the colour edges."]
    ]
  },
  {
    slug: "cloud-cardigan",
    name: "Lumi Cardigan",
    price: 620,
    badge: null,
    tile: "neutral",
    span: "tall",
    image: "Frosty.webp",
    imageW: 1000,
    imageH: 667,
    alt: "A cropped cardigan in bright teal-blue crochet, open at the front, with eight fluffy white clouds raised off the surface — two on each front panel and two on each balloon sleeve — above a ribbed hem and cuffs.",
    tagline: "Bobble clouds on a very good blue. Graded XS to XXL.",
    difficulty: "Intermediate",
    difficultyNote: "Garment shaping plus a separate bobble motif. Be comfortable with increases and decreases before you start.",
    time: "About 22 hours",
    sizes: "XS to XXL — six graded sizes, full measurement table included",
    pages: 32,
    yarn: "Cotton-acrylic blend, aran weight. 600–950g depending on size, plus 80g brushed white for the clouds.",
    hook: "5mm for the body, 4.5mm for the ribbing, 4mm for the clouds.",
    notions: "Tapestry needle, stitch markers, blocking pins and a flat towel.",
    gauge: "14 stitches and 16 rows to 10cm in half treble, after blocking.",
    skills: [
      "Increasing and decreasing for armhole shaping",
      "Bobble clusters worked as separate motifs",
      "Front-post ribbing for the bands and cuffs",
      "Setting in a balloon sleeve"
    ],
    extras: ["A cloud placement map for every size, so the eight clouds land right on yours"],
    body: [
      "The clouds are worked separately as dense bobble clusters and stitched on by hand, which is why they stand proud of the surface instead of lying flat. The pattern gives the cluster in both chart and written form and shows exactly where to anchor each one so it does not sag with wear.",
      "Cropped at the natural waist with balloon sleeves and a deep ribbed cuff, graded across six sizes with a full measurement table. The front bands are ribbed firmly so they hang straight rather than curling — there is a whole page on getting that tension right."
    ],
    notes: [
      ["Fit", "Written for 10cm of positive ease. Choose by finished bust, not body bust — the table shows both."],
      ["Yarn swaps", "Any aran-weight blend with a little stretch. Pure cotton will grow; the pattern says how to allow for it."]
    ]
  },
  {
    slug: "beanie",
    name: "Rosie Beanie",
    price: 0,
    /* The one free pattern in the studio. It is not sold and never enters the
       basket — the PDF downloads straight from the button. It is rendered
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
    /* pattern-beanie-standard.html is the source this PDF is built from
       and stays in the repo, but it is not linked: the people who want
       the standard edition are mostly printing it, and a browser link
       under a download button was one option too many. */
    readHref: "pattern-beanie-accessible.html",
    badge: "Free pattern",
    tile: "neutral",
    span: "normal",
    image: "beanie.webp",
    imageW: 1000,
    imageH: 1000,
    alt: "A crochet beanie in dusty pink, ribbed from brim to crown, with a deep turned-up fold at the bottom edge and a gathered top.",
    tagline: "Ribbed, folded at the brim, and free to read in full.",
    difficulty: "Beginner",
    difficultyNote: "Chain, single crochet, slip stitch, and one seam sewn by hand. Nothing else in it.",
    time: "About 6 hours",
    sizes: "Adult medium, one size — written for a 56cm head, and the rib stretches",
    pages: 13,
    yarn: "Acrylic, weight 4 medium — also sold as worsted, afghan or aran. 100–120g, about 180–220m.",
    hook: "5mm hook, also marked H-8.",
    notions: "Darning needle, stitch markers or safety pins, measuring tape, scissors.",
    gauge: "40 stitches to about 30.5cm across a row; 66 rows to about 51cm along the long edge.",
    skills: [
      "Working into the back loop only, which is where the ribbing comes from",
      "Working a hat flat, from side to side, in one piece",
      "Slip stitching a side seam through both layers",
      "Gathering the crown closed with a running stitch"
    ],
    includes: [
      "The complete pattern as a PDF or a web page, free — nothing to buy and no account to make",
      "Every direction written out in full, with no abbreviations and no charts",
      "24 point type, black on white, and no meaning carried by colour",
      "Stitch counts on every row, so you can work to the counts if your gauge differs",
      "Tagged for screen readers, so the headings and lists survive in the file"
    ],
    body: [
      "Worked flat from side to side in one long ribbed strip, then seamed once down the side and drawn closed at the top. Every row is 40 stitches, 66 rows in total, and the count never changes — there is no shaping to keep track of.",
      "The ribbing is single crochet into the back loop only. The loops you leave untouched build up into the ridges, so there is no special stitch to learn. The brim folds up as deep as you like it, and the finished height already allows for the fold."
    ],
    notes: [
      ["Why it is free", "A plain, accessible edition of a first hat. Read it here, print it, or make it straight off the screen."],
      ["Gauge", "Work to the stitch counts rather than the measurements. The fabric stretches, so the hat still fits."]
    ]
  },
  {
    slug: "strawberry-cardigan",
    name: "Sweetheart Cardigan",
    price: 650,
    badge: "New pattern",
    tile: "accent",
    span: "normal",
    image: "Valentine.webp",
    imageW: 1000,
    imageH: 750,
    alt: "A cropped cardigan in cream crochet, open at the front, with eight raised red strawberries each topped by a green leaf — two on each front panel and two on each balloon sleeve — above a ribbed hem and cuffs.",
    tagline: "Eight strawberries, each worked as its own small piece.",
    difficulty: "Intermediate",
    difficultyNote: "Garment shaping plus a three-part appliqué motif in a finer yarn.",
    time: "About 24 hours",
    sizes: "XS to XXL — six graded sizes, full measurement table included",
    pages: 34,
    yarn: "Undyed cotton, aran weight. 600–950g. Plus 60g red and 20g green in DK.",
    hook: "5mm for the body, 4.5mm ribbing, 3.5mm for the strawberries.",
    notions: "Toy stuffing for the berries, tapestry needle, blocking pins.",
    gauge: "14 stitches and 16 rows to 10cm in half treble, after blocking.",
    skills: [
      "Increasing and decreasing for armhole shaping",
      "Small amigurumi-style shaping for the berries",
      "Working leaves in a finer yarn",
      "Front-post ribbing for the bands and cuffs"
    ],
    extras: ["A strawberry placement map for every size, and a chart for the leaves"],
    body: [
      "Each strawberry is crocheted as its own small piece — body, then leaves — and attached by hand, so they sit raised off the cream ground. The pattern writes the berry as a standalone mini-project you can practise once before committing it to the cardigan.",
      "The green tops are worked in a separate finer yarn to keep the leaves sharp; the pattern explains the hook change and gives the leaf as a chart. The body is the same cropped, balloon-sleeved shape as the Cloud Cardigan, so making one teaches you the other."
    ],
    notes: [
      ["Fit", "Written for 10cm of positive ease. Choose by finished bust — the table gives both."],
      ["Make it plain", "The cardigan stands on its own without the berries. Skip pages 22 to 30 to leave it undecorated."]
    ]
  },
  {
    slug: "bucket-hat",
    name: "Poppy Hat",
    price: 320,
    badge: null,
    tile: "neutral",
    span: "normal",
    image: "Poppy.webp",
    imageW: 1000,
    imageH: 667,
    alt: "A hand-crocheted bucket hat in a red and pink checkerboard, with a tall flat-topped crown and a brim that rolls up at the edge, shown at a three-quarter angle.",
    tagline: "Red on pink, with a brim that will not flop. Start here.",
    difficulty: "Beginner",
    difficultyNote: "Worked in the round from the crown down. No shaping beyond even increases.",
    time: "About 8 hours",
    sizes: "Three head sizes — 54, 57 and 60cm circumference",
    pages: 14,
    yarn: "Mercerised cotton, DK weight. About 130g red, 110g pink.",
    hook: "3.5mm hook — deliberately tight, for the brim.",
    notions: "Stitch marker, tapestry needle.",
    gauge: "20 stitches and 22 rounds to 10cm in double crochet, worked firmly.",
    skills: [
      "Working in continuous rounds",
      "Even increases for a flat crown",
      "Changing colour mid-round",
      "Working a rolled edge"
    ],
    extras: ["A beginner's round-counting sheet you can print and tick off"],
    body: [
      "This is the pattern to start with. The brim is worked at a tighter tension than the crown and finished with a rolled red edge, which is what keeps it standing up instead of collapsing after a season — the pattern is specific about the tension change and shows both rounds in photos.",
      "Two shades of cotton are carried in a checkerboard, changed mid-round rather than worked in blocks and sewn, so there are no joins inside and nothing to rub. The colour-carry method is charted and written, and it is the same technique the Marina Tote Bag uses at a larger scale."
    ],
    notes: [
      ["Sizing", "Three head circumferences, with a note on adding rounds for anything in between."],
      ["Yarn swaps", "Must be a firm DK cotton. Soft or fluffy yarn will not hold the brim up."]
    ]
  },
  {
    slug: "rosewater-set",
    name: "Ariel Set",
    price: 540,
    badge: null,
    tile: "accent",
    span: "wide",
    image: "rosewater-set.webp",
    imageW: 1000,
    imageH: 667,
    alt: "A matching pink crochet set: a triangle bikini top with a ruffled lower edge and long braided halter ties, above a short crochet mini skirt with a drawstring tie at the waist.",
    tagline: "A ruffled top and a skirt that goes over everything. Two patterns, one file.",
    difficulty: "Confident beginner",
    difficultyNote: "Two straightforward pieces. The ruffle is the only new technique.",
    time: "About 14 hours",
    sizes: "XS to XXL — top ties to fit, skirt graded across five sizes",
    pages: 26,
    yarn: "Cotton-nylon blend, 4ply. 180g for the top, 260–340g for the skirt.",
    hook: "3mm hook. 2.5mm for the braided ties.",
    notions: "Swimwear lining for the top, drawstring cord, tapestry needle.",
    gauge: "24 stitches and 28 rows to 10cm in double crochet, worked firmly.",
    skills: [
      "Gathering a ruffle by stitch count rather than by eye",
      "Working a straight tube skirt",
      "Braiding long halter ties",
      "Threading and finishing a drawstring"
    ],
    extras: ["Both garments in one file — buy once, make either or both"],
    body: [
      "Written as a pair. The top has a gathered ruffle along the underband, worked at roughly twice the stitch count of the band itself — that ratio is the whole trick, and the pattern gives it as a formula so it holds at every size. The long braided ties at the neck and back are charted separately.",
      "The skirt is a straightforward tube with a drawstring, meant to be pulled on over swimwear and worn damp. The pattern specifies a density that will not go sheer when wet, and includes the wet test to prove it before you make the whole thing."
    ],
    notes: [
      ["Make one or both", "The two garments are written as independent sections. Neither depends on the other."],
      ["Yarn swaps", "Needs nylon content for wet recovery. The substitution guide lists three alternatives."]
    ]
  }
];

/* ---------------- helpers ---------------- */
const rupee = n => "&#8377;" + n.toLocaleString("en-IN");
const esc = s => s.replace(/&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const levelClass = d => d.toLowerCase().replace(/\s+/g, "-");

function header(activeBasket, activeLibrary) {
  return `<header class="site-header">
  <p class="announcement">Instant PDF download &middot; Written rows, charts and step photos &middot; Yours to keep</p>

  <div class="container">
    <nav class="nav-bar" aria-label="Primary">
      <a class="brand" href="index.html">Crochet&nbsp;Curio</a>

      <button class="nav-toggle" type="button" id="navToggle" aria-expanded="false" aria-controls="navList">
        <span aria-hidden="true">&#9776;</span> Menu
      </button>

      <ul class="nav-list" id="navList">
        <li><a href="index.html#patterns">Patterns</a></li>
        <li><a href="index.html#process">How it works</a></li>
        <li><a href="index.html#story">Our story</a></li>
        <li><a href="index.html#contact">Contact</a></li>
        <li><a href="library.html"${activeLibrary ? ' aria-current="page"' : ""}>My patterns</a></li>
        <li><a class="cart-link" href="cart.html"${activeBasket ? ' aria-current="page"' : ""}>Basket <span class="cart-count" id="cartCount" aria-hidden="true">0</span><span class="visually-hidden" id="cartCountLabel">, 0 patterns</span></a></li>
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
        <p class="brand" style="margin-bottom: var(--space-m)">Crochet&nbsp;Curio</p>
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
          <li><a href="library.html">My patterns</a></li>
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
      <p>&copy; 2026 Crochet Curio. Patterns are for your own use; the pieces you make from them are yours to sell.</p>
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
<link rel="stylesheet" href="assets/css/a11y.css">
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
  const includes = p.includes || INCLUDED.concat(p.extras || []);

  return head(
    `${p.name} — crochet pattern — Crochet Curio`,
    p.free
      ? `Free crochet pattern. ${p.tagline} ${p.difficulty} level, written out in full and free to download.`
      : `Digital crochet pattern. ${p.tagline} ${p.difficulty} level, ${p.pages}-page PDF, instant download.`
  ) + `
${header(false, false)}

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
          <img src="assets/img/${p.image}" alt="${esc(p.alt)}" title="${esc(p.alt)}" width="${p.imageW}" height="${p.imageH}">
        </div>
        <p class="product__mediaNote">
          ${p.free
            ? `The finished piece, made from this pattern. The pattern itself is free to read &mdash; nothing is sold and nothing is posted to you.`
            : `The finished piece, made from this pattern. What you buy is the written pattern for it &mdash; not the item shown.`}
        </p>
      </div>

      <div class="product__info">
        <p class="kicker">Digital crochet pattern</p>
        ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}
        <h1>${esc(p.name)}</h1>
        <p class="product__tagline">${esc(p.tagline)}</p>
        ${p.free
          ? `<p class="product__price">Free
          <span class="product__priceNote">PDF pattern &middot; free download</span>
        </p>`
          : `<p class="product__price">${rupee(p.price)}<span class="visually-hidden"> rupees</span>
          <span class="product__priceNote">PDF pattern &middot; instant download</span>
        </p>`}

        <ul class="spec-strip">
          <li>
            <span class="spec-strip__label">Skill level</span>
            <span class="level level--${levelClass(p.difficulty)}">${esc(p.difficulty)}</span>
          </li>
          <li>
            <span class="spec-strip__label">Time to make</span>
            <span class="spec-strip__value">${esc(p.time)}</span>
          </li>
          <li>
            <span class="spec-strip__label">Sizes written</span>
            <span class="spec-strip__value">${esc(p.sizes)}</span>
          </li>
          <li>
            <span class="spec-strip__label">Pattern length</span>
            <span class="spec-strip__value">${p.standardHref ? `${p.standardPages}-page PDF, or ${p.pages} pages in large print` : `${p.pages}-page PDF`}</span>
          </li>
        </ul>

        ${p.free
          ? `<div class="buy-form">
${p.standardHref ? `
          <!--
            Two editions of the same hat, each with its own formats.

            Groups are named for what they are, never for who they are
            for: nobody has to identify themselves to get a pattern, and
            the line under each link does the choosing. Within a group
            the most useful format leads — the PDF for the standard
            edition, because people print patterns, and the web page for
            large print, because it reflows and it is the one that has
            actually passed a screen reader test.

            Both "download the PDF" links carry an aria-label naming
            their edition, so they stay distinguishable in a screen
            reader's list of links, where the group heading is no longer
            alongside them.
          -->
          <h2 class="formats__title">The pattern</h2>
          <a class="btn btn--primary btn--block" href="${p.standardHref}" download
             aria-label="Download the pattern as a PDF, free">Download the PDF &mdash; free</a>
          <p class="formats__note">${p.standardPages} pages, 12 point type, standard crochet abbreviations, with diagrams.</p>

          <h2 class="formats__title">Large print edition</h2>

          <ul class="formats">
            <li>
              <a class="btn btn--secondary btn--block" href="${p.readHref}"
                 aria-label="Read the large print edition in your browser">Read it in your browser</a>
              <p class="formats__note">24 point type that reflows and zooms. Read from beginning to end with NVDA.</p>
            </li>
            <li>
              <a class="btn btn--secondary btn--block" href="${p.patternHref}" download
                 aria-label="Download the large print edition as a PDF">Download the PDF</a>
              <p class="formats__note">${p.pages} pages, 24 point type, black on white. Every direction written out in full, with no abbreviations to look up.</p>
            </li>
          </ul>

          <p class="buy-form__note">
            No basket, no account, nothing to pay. Same hat, same counts and the same
            measurements in every version &mdash; take whichever suits how you like to work.
          </p>` : `
          <a class="btn btn--primary btn--block" href="${p.patternHref}" download>Download the pattern &mdash; free</a>
          <p class="buy-form__note">
            No basket, no account, nothing to pay. The PDF saves straight to your device &mdash;
            large print, black on white, and every direction written out in full.
          </p>`}
        </div>`
          : `<form class="buy-form" id="buyForm"
              data-slug="${p.slug}" data-name="${esc(p.name)}"
              data-price="${p.price}" data-image="${p.image}"
              data-pages="${p.pages}" data-difficulty="${esc(p.difficulty)}">

          <button class="btn btn--primary btn--block" type="submit">Get the pattern &mdash; ${rupee(p.price)}</button>
          <p class="buy-form__note">
            You are buying instructions, not the finished piece. Nothing is posted to you &mdash;
            the file appears in <a class="link" href="library.html">My&nbsp;patterns</a> the moment you check out.
          </p>
          <p class="form-status" id="buyStatus" role="status" aria-live="polite"></p>
        </form>`}

        <h2 class="product__detailsTitle">What is in the file</h2>
        <ul class="includes">
${includes.map(t => `          <li>${esc(t)}</li>`).join("\n")}
        </ul>

        <h2 class="product__detailsTitle">Before you cast on</h2>
        <dl class="product__details">
          <div><dt>Yarn</dt><dd>${esc(p.yarn)}</dd></div>
          <div><dt>Hook</dt><dd>${esc(p.hook)}</dd></div>
          <div><dt>Other bits</dt><dd>${esc(p.notions)}</dd></div>
          <div><dt>Gauge</dt><dd>${esc(p.gauge)}</dd></div>
        </dl>

        <h2 class="product__detailsTitle">Stitches you will use</h2>
        <ul class="skills">
${p.skills.map(s => `          <li>${esc(s)}</li>`).join("\n")}
        </ul>
        <p class="muted skills__note">${esc(p.difficultyNote)}</p>

        <div class="product__body">
${p.body.map(t => `          <p>${esc(t)}</p>`).join("\n")}
        </div>

        <h2 class="product__detailsTitle">Notes from the studio</h2>
        <dl class="product__details">
${p.notes.map(([k, v]) => `          <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("\n")}
        </dl>
      </div>
    </div>

    <nav class="product-nav" aria-label="More patterns">
      <a class="product-nav__link" href="product-${prev.slug}.html">
        <span class="muted">Previous pattern</span>
        <span>${esc(prev.name)}</span>
      </a>
      <a class="product-nav__link product-nav__link--next" href="product-${next.slug}.html">
        <span class="muted">Next pattern</span>
        <span>${esc(next.name)}</span>
      </a>
    </nav>

  </div>
</main>

${footer()}

<script src="assets/js/catalogue.js"></script>
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
module.exports = { PATTERNS, INCLUDED, header, footer, head, rupee, esc };
