# Crochet Curio — website

A small-business site built directly on the **Crochet Curio Design System**
Figma file, targeting **WCAG 2.2 Level AA**.

Source of truth: `figma.com/design/uz4VizxZpPffThiHds891s/Crochet-Curio-Design-System`
Tokens come from the *FurGo design tokens* library attached to that file.

---

## Run it

```bash
node crochet-curio/serve.js
```

Then open <http://localhost:4173>. No build step, no dependencies.

## Files

| Path | What it holds |
| --- | --- |
| `index.html` | Home — hero, shop grid, story, process, newsletter, contact |
| `product-*.html` | One page per piece (6). **Generated — edit the catalogue, not these** |
| `cart.html` | Basket: quantities, removal, running totals |
| `checkout.html` | Delivery details, order summary, confirmation |
| `build-products.js` | Product catalogue + page generator. `node build-products.js` |
| `assets/css/tokens.css` | Every design token, translated 1:1 from Figma variables |
| `assets/css/styles.css` | Layout and components, built only from those tokens |
| `assets/css/shop.css` | Shop grid, product, basket and checkout |
| `assets/js/site.js` | Mobile nav disclosure and accessible form validation |
| `assets/js/shop.js` | Basket state and checkout flow |
| `assets/js/catalogue.js` | Generated product data — do not edit by hand |
| `assets/img/` | **Product photography goes here** — see below |
| `serve.js` | Minimal static preview server |

## Product photography

All six photos are in `assets/img/` and loading (verified 200 OK, no 404s):

| File | Photo |
| --- | --- |
| `Bluebell.png` | Blue + white checkerboard shoulder bag |
| `Frosty.png` | Blue cardigan, white bobble clouds |
| `dune-bikini.png` | Tan + black striped bikini set |
| `Valentine.png` | Cream cardigan, red strawberries |
| `Poppy.png` | Red + pink checkerboard bucket hat |
| `rosewater-set.png` | Pink bikini top + mini skirt |

**All six now have transparent backgrounds**, which makes the white tile
essential rather than cosmetic — without it they would pick up whatever sits
behind them, and on the shop section that is grey. The tile paints white under
every image, with a hairline border so a white tile still reads as a card on a
white page.

The first image is `loading="eager" fetchpriority="high"` since it is above the
fold; the rest are lazy.

The basket resolves each image **by product slug from the catalogue**, not from
the filename stored in `localStorage`. A basket saved before a photo was
renamed still shows the right picture instead of a broken one.

### Alt text

Alt text exists for screen readers. That is its job here, and nothing about
the layout depends on it.

Every image carries a written description of what the piece actually looks
like — colour, construction, how it is photographed — rather than a repeat of
the product name. Someone hearing "eight raised red strawberries each topped by
a green leaf — two on each front panel and two on each balloon sleeve" learns
something the product title does not tell them.

**Descriptions were checked against the photographs**, not written from the
product names. Details that must stay true if a photo is swapped:

- The tote is **sky blue and white**, not lime — the earlier alt text was wrong
  after the reshoot and was corrected along with the tagline and body copy.
- Both cardigans really do carry **eight** motifs, counted off the images: two
  per front panel, two per sleeve.
- The bucket hat is red on pink with a **flat-topped** crown, shot at an angle;
  it is the only piece not photographed flat.

An automated check confirms all 12 product images across the site have a
substantive `alt`, and that no filename is referenced without existing on disk.

**On hover, the browser draws its own native tooltip.** Each `<img>` has a
`title` matching its `alt`, so the description appears in the plain OS tooltip
style — small, off to the side, nothing painted over the photo. There is no
custom tooltip element, no positioning script, and no CSS for it.

One trade-off worth knowing: with both `alt` and `title` set to the same
sentence, a few screen readers in verbose modes may read it twice. `alt` is
what supplies the accessible name; `title` is only exposed as a description.
Removing the `title` attributes is the one-line fix if that ever bothers you.

## The Daisy Cardigan is gone

Replaced by the **Gingham Bucket Hat** (₹2,200) — its own product page, its own
copy and details, in the same grid slot. `product-daisy-cardigan.html` was
deleted and every link across the home page, basket and checkout footers now
points at `product-bucket-hat.html`. No references remain.

## Shop and checkout

**Shop grid** is deliberately uneven rather than a uniform 3-up: the bag runs
as a wide feature, the Cloud cardigan as a tall portrait beside it, three
square tiles below, and the Rosewater set as a full-width banner. Tiles
alternate between the neutral and brand-accent backgrounds, and images lift
slightly on hover and on keyboard focus (suppressed under
`prefers-reduced-motion`).

**Product pages** carry a description, a details list (materials, fit,
dimensions, care, hours to make), size selection, quantity, and add-to-basket,
plus previous/next links around the collection.

**Sizes** are the three bands you asked for — `XS–S`, `M–L`, `XL–XXL` — as
radio buttons styled as pills. Selection shows as fill *and* weight, never
colour alone. The Checkerboard Bag is the exception: it is a bag, so it shows
"One size" rather than a garment size band.

**Basket** stacks the same piece in the same size instead of duplicating the
line, keeps quantities between 1 and 10, and persists in `localStorage`. Every
read is wrapped in `try/catch` so a private window or blocked site data still
renders a working page.

**Checkout** validates name, email, address, city and a 6-digit PIN, moves
focus to the first invalid field, and announces failures through a live region.

> **The checkout is a front-end demonstration.** Nothing is transmitted and no
> payment is taken — the page says so plainly to anyone using it. Connect a
> payment provider before accepting real orders.

One thing to be aware of: the free-shipping threshold is ₹2,500 and the
cheapest piece is ₹2,800, so shipping currently reads "Free" on every order.
The ₹150 charge and the "spend X more" prompt work — they just never trigger.
Raise the threshold or lower a price if you want that mechanic to do anything.

---

## What came from the design system

Nothing here is invented. Values were read out of the Figma file with
`get_variable_defs` and `get_design_context`.

**Colour** — the full semantic set: `Content/*` (primary `#1a1a1a`,
secondary `#333333`, tertiary `#666666`, inverse, disabled, brand, link),
`Background/*`, `Border/*`, `Surface/*`, `Overlay/*`, plus the primitives
behind them. Brand is sage `#536b59` with `#3a5240` / `#203826` / `#071f0d`
for button rest, hover and pressed. Brand accent is dusty pink `#d9a6ad`.

**Typography** — Poppins. Headings XS→5XL (16/24 up to 72/80, tracking −1px,
weight 600) and body XS→XL (10/14 up to 20/28, tracking 0). Sizes are
expressed in `rem` so browser text scaling works (1.4.4).

**Spacing** — the `Space/*` scale on a 4px grid. Confirmed from the file:
XS 4, S 8, M 12, L 16, XL 24, 2XL 32, 5XL 56. The MCP API would not return
2XS, 3XL, 4XL and 6XL–9XL; those follow the confirmed progression and are
marked `(inferred)` in `tokens.css`. **Worth a glance** — if the real values
differ, correcting those seven lines updates the whole site.

**Radius / stroke / elevation** — Radius XS 4, L 16, Pill 999 (S and M
inferred). Stroke XS 1px, M 2px. Shadows L1–L6 exactly as specified.

**Buttons** — translated from your Button component: 4 types × 2 sizes
(L 48px, S 32px) × 4 states. The focus state matters most: your component
puts a **2px `Border/Focus` ring outside the control**, and the CSS does the
same via `outline` + `outline-offset`.

---

## Reference site

You asked me to take cues from itsmemorialday.com without copying it. What I
measured there and carried over is the **whitespace discipline**, not the
layout:

- content capped around 1045px → here `--layout-max: 1200px`
- ~91px side gutters → here 96px (`Space/8XL`), stepping to 64/32/24 as the
  viewport narrows
- very tall sections → here 120px (`Space/9XL`) of vertical rhythm
- white ground, imagery doing the work, a three-or-four item nav

The palette, type, structure and voice are your design system's, not theirs.

---

## Currency

Prices are in **Indian rupees** (`&#8377;`). The pound amounts were not swapped
symbol-for-symbol — `₹38` for a hat would not read as a real price — so they
were converted to plausible INR: ₹1,750–₹3,300, with free shipping over ₹2,500.
**These are placeholders. Set your real prices.**

The announcement bar now reads "Free shipping across India"; change it if you
ship elsewhere.

## Responsive behaviour

Breakpoints follow the Figma frames (Desktop/Tablet 1440, Mobile 393):

| Width | Layout |
| --- | --- |
| > 1100px | 2-column hero, 3-up products, full nav |
| ≤ 1100px | 2-up products, tighter gutters |
| ≤ 900px | Nav collapses to a menu button; hero stacks **text first, artwork after** |
| ≤ 620px | Single-column products and footer, full-width buttons |

There is also a **height-based** rule. Short viewports — landscape phones,
600px laptops, 4:3 tablets — get a tighter hero so the buttons stay on the
first screen regardless of width. Below 560px tall in landscape the decorative
hero artwork is hidden; nothing informational is lost.

**Above the fold.** The heading, lede and both buttons are visible on landing
at every size tested — measured, not eyeballed:

| Viewport | Headroom below the buttons |
| --- | --- |
| 1440 × 900 | 326px |
| 1024 × 600 | 218px |
| 768 × 1024 | 546px |
| 393 × 852 | 288px |
| 375 × 667 | 179px |
| 320 × 568 | 56px |

On mobile and tablet the artwork sits *below* the buttons, so the words are
what you land on. On desktop it sits alongside.

## Motion

Files: `assets/css/motion.css`, `assets/js/motion.js`.

| Effect | Where |
| --- | --- |
| Hero entrance — eyebrow, heading, lede, buttons slide in from the left in sequence; artwork drifts in from the right | Home, on load |
| Slow ambient drift on the hero artwork | Home |
| Scroll reveals — content fades and slides in as it enters view | Every page |
| Directional reveals — story text from the left, its artwork from the right; product image from the left, details from the right | Story, product pages |
| Staggered reveals — shop cards, process steps and footer columns arrive one after another | Home |
| Process numbers scale and rotate into place | Home |
| Flowing text ticker — a continuous scrolling band | Home, between shop and story |
| Section headings draw a short sage underline | Every page |
| Cards lift on hover and on keyboard focus; images scale gently | Shop grid |
| Buttons lift on hover with a slight spring | Every page |
| Basket count pops when it changes | Every page |
| Summary figures flash sage when they update | Basket, checkout |
| Back-to-top button appears after 600px of scroll | Every page |

**Two rules govern all of it.**

*Nothing is hidden by CSS alone.* The reveal styles only apply under a
`.js-motion` class that JavaScript adds. If scripting fails, every element is
visible and the page is fully usable — no blank sections.

*Reduced motion means off, not slower.* Under `prefers-reduced-motion: reduce`
the script adds nothing at all — no observers, no reveals, no ticker scroll —
and the CSS forces final positions with `!important`. The ticker becomes a
static wrapped list and its pause button is removed, since there is nothing
left to pause.

There is also a **safety net**: if the tab has been visible for 2.5 seconds and
anything is still waiting to be revealed, it is shown regardless. This covers
prerendered loads, background tabs, and browsers where IntersectionObserver
misbehaves. Visitors whose observers work never reach it.

**The ticker has a real pause button.** WCAG 2.2.2 requires a mechanism to stop
content that moves automatically for more than five seconds. It is a genuine
`aria-pressed` toggle at 97×44px that swaps between Pause and Play, and the
ticker also pauses on hover unless you have explicitly pressed play.

## Accessibility

Target: WCAG 2.2 AA. What was actually verified, and how:

**Contrast** — every pairing computed against the WCAG formula. Body text
12.6:1, headings 17.4:1, muted text 5.7:1, sage eyebrow 5.8:1, primary button
label 8.5:1, links 7.5:1, input borders 3.4:1, focus ring 5.4:1.

Two pairings in your palette fail, and both are designed around rather than
silently altered:

1. **Brand accent `#d9a6ad` as text on white is 2.1:1** — far below the 4.5:1
   floor. It is therefore never used as a text colour, only as a background,
   always carrying `#1a1a1a` text (8.3:1) — see the badges and hero panel.
2. **The blue focus ring on the dark brand panel is 1.6:1.** Inside the
   newsletter block the ring switches to white (8.5:1). One CSS rule,
   `.newsletter :focus-visible`.

Your tokens were not changed. If you want brand accent usable as text, it
needs a darker variant in Figma — `#a6737a` (`Brand accent/700`) still only
reaches 3.6:1, so it would need to go darker still.

**WCAG 2.2's new criteria specifically:**

- **2.4.11 Focus Not Obscured** — the header is sticky, so every `[id]` carries
  `scroll-margin-top: 120px`; the mobile menu closes on navigation so it cannot
  cover the thing you just moved to.
- **2.5.7 Dragging Movements** — there is no drag anywhere. No carousel, no
  slider, no reorder.
- **2.5.8 Target Size** — measured in the browser: smallest interactive target
  is 32×32, buttons are 48px tall, nav links 44px. The standalone email link
  was 22px and was given `min-height: 24px`.
- **3.2.6 Consistent Help** — Contact sits in the same place in the header and
  the footer throughout.
- **3.3.7 Redundant Entry** — nothing is asked for twice; `autocomplete` is set
  on name and email.
- **3.3.8 Accessible Authentication** — no accounts, no login, no puzzles.

**Also verified in the browser:** one `h1` with no heading levels skipped
(18 headings), all 4 form controls labelled, all 8 illustrations carry
`role="img"` with a description, no duplicate `id`s, four landmarks, no
console errors, and **no horizontal scrolling at 320px** (1.4.10) — checked by
measuring every element against the viewport.

Forms announce errors through a `role="status"` live region, prefix them with
"Error:", set `aria-invalid`, and move focus to the first invalid field. Error
state is never colour alone — there is always text.

`prefers-reduced-motion` disables smooth scrolling and button transitions.

---

## Before this goes live

1. **Swap in real photography.** The illustrations are CSS/SVG stitch patterns
   standing in for product shots. They are deliberate placeholders, not
   pretend photos. Replace them with `<img>` and write real `alt` text.
2. **Wire the forms.** Both are client-side only — validation runs, nothing is
   sent. Point them at your mail service or form endpoint.
3. **Replace the placeholder details** — `hello@crochetcurio.example`, the
   prices, the studio hours, the 2026 copyright.
4. **Confirm the seven inferred spacing values** against Figma.
5. **Test with a real screen reader.** Automated checks catch structure, not
   whether the page actually makes sense read aloud.
