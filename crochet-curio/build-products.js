/* ------------------------------------------------------------------
   Generates one product page per item, plus assets/js/catalogue.js
   which the cart and checkout read from.

   Run after editing the catalogue below:   node build-products.js
------------------------------------------------------------------ */
const fs = require("fs");
const path = require("path");

const SIZES = ["XS–S", "M–L", "XL–XXL"];

const PRODUCTS = [
  {
    slug: "checkerboard-bag",
    name: "Checkerboard Shoulder Bag",
    price: 2800,
    badge: "Best seller",
    tile: "accent",
    span: "wide",
    image: "Bluebell.png",
    alt: "A hand-crocheted shoulder bag in a sky blue and white checkerboard, with softly rounded corners and a long single strap standing in a tall loop above it.",
    tagline: "A sky blue checkerboard, carried on a long single strap.",
    oneSize: true,
    body: [
      "Worked square by square in mercerised cotton, so the checkerboard stays crisp rather than blurring at the edges the way a looser stitch would. The blue is dyed in small lots — expect a little variation between bags, which is the point.",
      "The strap is crocheted in one continuous piece with the body, not sewn on afterwards, so there is no seam to work loose under weight. It sits at the hip on most people and carries a laptop, a book and the usual pocket debris without sagging."
    ],
    details: [
      ["Materials", "100% mercerised cotton. Cotton-drill lining."],
      ["Dimensions", "34cm wide × 38cm deep. Strap drop 30cm."],
      ["Care", "Hand wash cool, reshape damp, dry flat. Do not tumble."],
      ["Made", "By hand in our studio. About 11 hours per bag."]
    ]
  },
  {
    slug: "cloud-cardigan",
    name: "Cloud Cropped Cardigan",
    price: 4200,
    badge: null,
    tile: "neutral",
    span: "tall",
    image: "Frosty.png",
    alt: "A cropped cardigan in bright teal-blue crochet, open at the front, with eight fluffy white clouds raised off the surface — two on each front panel and two on each balloon sleeve — above a ribbed hem and cuffs.",
    tagline: "Bobble clouds on a very good blue.",
    body: [
      "The clouds are worked separately as dense bobble clusters and stitched on by hand, which is why they stand proud of the surface instead of lying flat. Eight per cardigan, placed by eye — no two land in exactly the same spot.",
      "Cropped at the natural waist with balloon sleeves and a deep ribbed cuff. It is designed to be worn open over a tee; the front bands are ribbed firmly so they hang straight rather than curling."
    ],
    details: [
      ["Materials", "80% cotton, 20% acrylic. Bobbles in brushed white acrylic."],
      ["Fit", "Relaxed and cropped. Size down for a closer fit through the body."],
      ["Care", "Hand wash cool. Dry flat — hanging will stretch the sleeves."],
      ["Made", "By hand in our studio. About 22 hours per cardigan."]
    ]
  },
  {
    slug: "dune-bikini",
    name: "Dune Stripe Bikini Set",
    price: 3100,
    badge: null,
    tile: "neutral",
    span: "normal",
    image: "dune-bikini.png",
    alt: "A two-piece crochet bikini in tan and black stripes: a triangle top with braided halter ties and matching tie-side bottoms with tasselled ends, laid flat.",
    tagline: "Tan and black, tied at four points.",
    body: [
      "Both pieces tie — at the neck, the back and each hip — so the fit is yours to set rather than ours to guess. The braided cords are worked long deliberately and finished with tassels; trim them if you prefer them shorter.",
      "Crocheted in a tight stitch that holds its shape wet, and fully lined in the top and gusset. The stripe is carried through the cord as well as the body, which is a slow way to do it and worth it."
    ],
    details: [
      ["Materials", "Cotton-nylon blend. Fully lined."],
      ["Fit", "Adjustable at four ties. Cheeky-cut bottoms."],
      ["Care", "Rinse in cool fresh water after swimming. Dry flat in shade."],
      ["Made", "By hand in our studio. About 9 hours per set."]
    ]
  },
  {
    slug: "strawberry-cardigan",
    name: "Strawberry Cropped Cardigan",
    price: 4400,
    badge: "New",
    tile: "accent",
    span: "normal",
    image: "Valentine.png",
    alt: "A cropped cardigan in cream crochet, open at the front, with eight raised red strawberries each topped by a green leaf — two on each front panel and two on each balloon sleeve — above a ribbed hem and cuffs.",
    tagline: "Eight strawberries, hand-stitched, slightly three-dimensional.",
    body: [
      "Each strawberry is crocheted as its own small piece — body, then leaves — and attached by hand, so they sit raised off the cream ground. The green tops are worked in a separate finer yarn to keep the leaves sharp.",
      "The cream is undyed, so it will soften rather than fade with washing. Cropped, with balloon sleeves and ribbed cuffs and hem."
    ],
    details: [
      ["Materials", "100% undyed cotton. Strawberries in cotton and merino."],
      ["Fit", "Relaxed and cropped. True to size."],
      ["Care", "Hand wash cool and separately for the first wash. Dry flat."],
      ["Made", "By hand in our studio. About 24 hours per cardigan."]
    ]
  },
  {
    slug: "bucket-hat",
    name: "Gingham Bucket Hat",
    price: 2200,
    badge: null,
    tile: "neutral",
    span: "normal",
    image: "Poppy.png",
    alt: "A hand-crocheted bucket hat in a red and pink checkerboard, with a tall flat-topped crown and a brim that rolls up at the edge, shown at a three-quarter angle.",
    tagline: "Red on pink, with a brim that will not flop.",
    body: [
      "The brim is worked at a tighter tension than the crown and finished with a rolled red edge, which is what keeps it standing up instead of collapsing after a season. The crown is flat-topped rather than rounded, so it holds its shape when packed.",
      "Two shades of cotton carried in a checkerboard, changed colour mid-row rather than worked in blocks and sewn — no joins inside, nothing to rub. The red is the strong one; the pink softens it just enough to wear in daylight."
    ],
    details: [
      ["Materials", "100% mercerised cotton."],
      ["Fit", "Three bands. Crown depth 12cm, brim 5cm."],
      ["Care", "Hand wash cool, reshape damp over a bowl, dry flat."],
      ["Made", "By hand in our studio. About 8 hours per hat."]
    ]
  },
  {
    slug: "rosewater-set",
    name: "Rosewater Bikini & Skirt Set",
    price: 3800,
    badge: null,
    tile: "accent",
    span: "wide",
    image: "rosewater-set.png",
    alt: "A matching pink crochet set: a triangle bikini top with a ruffled lower edge and long braided halter ties, above a short crochet mini skirt with a drawstring tie at the waist.",
    tagline: "A ruffled top and a skirt that goes over everything.",
    body: [
      "Sold as a pair. The top has a gathered ruffle along the underband — worked at roughly twice the stitch count of the band itself, which is what gives it the flounce — and long braided ties at the neck and back.",
      "The skirt is a straightforward tube with a drawstring, meant to be pulled on over swimwear and worn damp. It is crocheted densely enough not to be sheer, in a pink that reads bright in sun and soft indoors."
    ],
    details: [
      ["Materials", "Cotton-nylon blend. Top fully lined; skirt unlined."],
      ["Fit", "Top ties to fit. Skirt sits at the natural waist, 38cm long."],
      ["Care", "Rinse in cool fresh water after swimming. Dry flat in shade."],
      ["Made", "By hand in our studio. About 14 hours per set."]
    ]
  }
];

/* ---------------- helpers ---------------- */
const rupee = n => "&#8377;" + n.toLocaleString("en-IN");
const esc = s => s.replace(/&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function header(activeCart) {
  return `<header class="site-header">
  <p class="announcement">Free shipping across India on orders over &#8377;2,500 &middot; Every piece made by hand</p>

  <div class="container">
    <nav class="nav-bar" aria-label="Primary">
      <a class="brand" href="index.html">Crochet&nbsp;Curio</a>

      <button class="nav-toggle" type="button" id="navToggle" aria-expanded="false" aria-controls="navList">
        <span aria-hidden="true">&#9776;</span> Menu
      </button>

      <ul class="nav-list" id="navList">
        <li><a href="index.html#shop">Shop</a></li>
        <li><a href="index.html#story">Our story</a></li>
        <li><a href="index.html#process">How it is made</a></li>
        <li><a href="index.html#contact">Contact</a></li>
        <li><a class="cart-link" href="cart.html"${activeCart ? ' aria-current="page"' : ""}>Basket <span class="cart-count" id="cartCount" aria-hidden="true">0</span><span class="visually-hidden" id="cartCountLabel">, 0 items</span></a></li>
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
          Hand-crocheted hats, bags and knitwear. Made slowly in small batches.
        </p>
      </div>
      <nav aria-labelledby="footer-shop">
        <h2 id="footer-shop">Shop</h2>
        <ul>
${PRODUCTS.map(p => `          <li><a href="product-${p.slug}.html">${esc(p.name)}</a></li>`).join("\n")}
        </ul>
      </nav>
      <nav aria-labelledby="footer-help">
        <h2 id="footer-help">Help</h2>
        <ul>
          <li><a href="index.html#contact">Contact us</a></li>
          <li><a href="index.html#contact">Size guide</a></li>
          <li><a href="index.html#contact">Care and washing</a></li>
          <li><a href="index.html#contact">Returns</a></li>
        </ul>
      </nav>
      <nav aria-labelledby="footer-studio">
        <h2 id="footer-studio">Studio</h2>
        <ul>
          <li><a href="index.html#story">Our story</a></li>
          <li><a href="index.html#process">How it is made</a></li>
          <li><a href="index.html#contact">Commissions</a></li>
        </ul>
      </nav>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2026 Crochet Curio. All rights reserved.</p>
      <p>Built on the Crochet Curio design system.</p>
    </div>
  </div>
</footer>`;
}

function head(title, description, extraCss) {
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
</head>
<body>

<a class="skip-link" href="#main">Skip to main content</a>
`;
}

/* ---------------- product page ---------------- */
function productPage(p, index) {
  const prev = PRODUCTS[(index - 1 + PRODUCTS.length) % PRODUCTS.length];
  const next = PRODUCTS[(index + 1) % PRODUCTS.length];

  const sizeControl = p.oneSize
    ? `<div class="size-block">
            <p class="size-label" id="sizeLabel">Size</p>
            <p class="one-size" role="note">One size &mdash; 34cm &times; 38cm</p>
          </div>`
    : `<fieldset class="size-block">
            <legend class="size-label">Choose a size</legend>
            <div class="size-options">
${SIZES.map((s, i) => `              <label class="size-option">
                <input type="radio" name="size" value="${s}"${i === 0 ? " checked" : ""}>
                <span>${s}</span>
              </label>`).join("\n")}
            </div>
            <p class="size-hint">Not sure? <a class="link" href="index.html#contact">Ask us for measurements</a> before you order.</p>
          </fieldset>`;

  return head(
    `${p.name} — Crochet Curio`,
    `${p.tagline} Hand-crocheted by Crochet Curio.`
  ) + `
${header(false)}

<main id="main">
  <div class="container">

    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li><a href="index.html">Home</a></li>
        <li><a href="index.html#shop">Shop</a></li>
        <li><span aria-current="page">${esc(p.name)}</span></li>
      </ol>
    </nav>

    <div class="product">
      <div class="product__media">
        <img src="assets/img/${p.image}" alt="${esc(p.alt)}" title="${esc(p.alt)}" width="1000" height="1000">
      </div>

      <div class="product__info">
        ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}
        <h1>${esc(p.name)}</h1>
        <p class="product__tagline">${esc(p.tagline)}</p>
        <p class="product__price">${rupee(p.price)}<span class="visually-hidden"> rupees</span></p>

        <form class="buy-form" id="buyForm"
              data-slug="${p.slug}" data-name="${esc(p.name)}"
              data-price="${p.price}" data-image="${p.image}">

          ${sizeControl}

          <div class="qty-block">
            <label class="size-label" for="qty">Quantity</label>
            <input type="number" id="qty" name="qty" value="1" min="1" max="10" step="1" inputmode="numeric">
          </div>

          <button class="btn btn--primary btn--block" type="submit">Add to basket</button>
          <p class="form-status" id="buyStatus" role="status" aria-live="polite"></p>
        </form>

        <div class="product__body">
${p.body.map(t => `          <p>${esc(t)}</p>`).join("\n")}
        </div>

        <h2 class="product__detailsTitle">Details</h2>
        <dl class="product__details">
${p.details.map(([k, v]) => `          <div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("\n")}
        </dl>
      </div>
    </div>

    <nav class="product-nav" aria-label="More pieces">
      <a class="product-nav__link" href="product-${prev.slug}.html">
        <span class="muted">Previous</span>
        <span>${esc(prev.name)}</span>
      </a>
      <a class="product-nav__link product-nav__link--next" href="product-${next.slug}.html">
        <span class="muted">Next</span>
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

PRODUCTS.forEach((p, i) => {
  fs.writeFileSync(path.join(root, `product-${p.slug}.html`), productPage(p, i));
});

const catalogue =
  "/* Generated by build-products.js — do not edit by hand. */\n" +
  "window.CATALOGUE = " +
  JSON.stringify(
    PRODUCTS.map(p => ({
      slug: p.slug, name: p.name, price: p.price,
      image: p.image, alt: p.alt, oneSize: !!p.oneSize
    })),
    null, 2
  ) + ";\n";

fs.writeFileSync(path.join(root, "assets/js/catalogue.js"), catalogue);

console.log("Wrote " + PRODUCTS.length + " product pages + assets/js/catalogue.js");
module.exports = { PRODUCTS, SIZES, header, footer, head, rupee, esc };
