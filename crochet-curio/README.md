# Crochet Curio — website

A **digital crochet pattern studio**: the six projects on the site are sold as
downloadable PDF patterns, not as finished pieces. The photographs show what
you will have made; what changes hands is the instructions.

Built directly on the **Crochet Curio Design System** Figma file, targeting
**WCAG 2.2 Level AA**.

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
| `index.html` | Home — hero, pattern library, story, how it works, skill levels, newsletter, contact |
| `product-*.html` | One page per pattern (6). **Generated — edit the catalogue, not these** |
| `cart.html` | Basket: the patterns picked, removal, running total |
| `checkout.html` | Name and email, order summary, pattern-unlocked confirmation |
| `library.html` | My patterns — every pattern owned, re-downloadable |
| `build-products.js` | Pattern catalogue + page generator. `node build-products.js` |
| `assets/css/tokens.css` | Every design token, translated 1:1 from Figma variables |
| `assets/css/styles.css` | Layout and components, built only from those tokens |
| `assets/css/shop.css` | Pattern grid, pattern page, basket, checkout and library |
| `assets/js/site.js` | Mobile nav disclosure and accessible form validation |
| `assets/js/shop.js` | Basket, checkout and pattern-library state |
| `assets/js/catalogue.js` | Generated pattern data — do not edit by hand |
| `assets/img/` | **Photography of the finished pieces goes here** — see below |
| `assets/patterns/` | Built pattern files — PDFs and the Word edition. Generated; do not edit by hand |
| `pattern-beanie-accessible.html` | The beanie, large print edition. Source for its PDF and Word file |
| `pattern-beanie-standard.html` | The beanie, standard edition. Source for the 5-page PDF |
| `pattern-beanie-standard-hi.html` | The same standard edition in Hindi. Source for the Hindi PDF |
| `pattern-beanie-accessible-hi.html` | The same large print edition in Hindi. Source for the Hindi Word file |
| `assets/js/pattern-lang.js` | Points the product page download at the English or the Hindi PDF |
| `tools/build-pattern.js` | Builds a pattern PDF. `node tools/build-pattern.js standard` |
| `tools/build-pattern-docx.js` | Builds the large print Word file. `node tools/build-pattern-docx.js` |
| `tools/verify-pattern-pdf.js` | Accessibility checks the build fails on. Also runs standalone on any PDF |
| `tools/pdf-tools.js` | Minimal PDF read/edit/write used by the two above |
| `serve.js` | Minimal static preview server |

## The beanie: two editions, four links

The same hat, written twice. Everything downloadable is built from one of the two
source pages, so no two versions can drift apart.

```bash
node build-products.js                    # the product page
node tools/build-pattern.js standard      # the standard PDF
node tools/build-pattern.js standard-hi   # the standard PDF in Hindi
node tools/build-pattern.js accessible    # the large print PDF
node tools/build-pattern.js accessible-hi # the large print PDF in Hindi
node tools/build-pattern-docx.js          # the large print Word file
node tools/build-pattern-docx.js --hi     # the large print Word file in Hindi
```

**The pattern** — what most crocheters want. Abbreviations, gauge over a 4in swatch,
diagrams.

| File | Source | For |
| --- | --- | --- |
| `assets/patterns/rosie-beanie-pattern-standard.pdf` | `pattern-beanie-standard.html` | 5 pages, 12pt. Printing |
| `assets/patterns/rosie-beanie-pattern-standard-hi.pdf` | `pattern-beanie-standard-hi.html` | The same 5 pages in Hindi |

`pattern-beanie-standard.html` stays in the repo as the source that PDF is built
from, but nothing links to it. This audience is mostly printing, and a browser
link sitting under a download button was one option too many.

One select governs every edition. Language is a property of the pattern, not of
the format, so there is no second control on the large print group: the select
moves the standard PDF, the large print page — and with it the Word file linked
inside that page — and the large print PDF, together.

The Devanagari text-layer bug applies to both Hindi PDFs. They are offered for
printing and reading, and the note under each one sends screen reader users to
the page, which is the same steer the English large print PDF carries.

The language is chosen on the product page, before the download: a PDF cannot be
switched once it is on someone's machine. Crochet abbreviations stay in Latin
script in the Hindi file (sc, ch, sl st, blo) because that is what every other
pattern the reader meets will print; the prose around them is Hindi.

One known limit: Chrome writes a mangled text layer for Devanagari — reordered
matras, missing conjuncts — so the Hindi PDF looks right and prints right, but
copy, search and screen reader output from it are unreliable. The Hindi page
itself has none of that problem. This has to be solved before a Hindi large
print edition ships.

**Large print edition** — 24pt, every direction written out, no abbreviations.

| File | Source | For |
| --- | --- | --- |
| `pattern-beanie-accessible.html` | — | Reflows and zooms. NVDA tested |
| `pattern-beanie-accessible-hi.html` | — | The same, in Hindi. Not yet listened to with a screen reader |
| `assets/patterns/rosie-beanie-pattern-large-print.docx` | `pattern-beanie-accessible.html` | Offline, reflows. NVDA tested |
| `assets/patterns/rosie-beanie-pattern-large-print-hi.docx` | `pattern-beanie-accessible-hi.html` | Offline, reflows, Hindi. Nirmala UI, `hi-IN`, 24pt on the complex-script slot too |
| `assets/patterns/rosie-beanie-pattern.pdf` | `pattern-beanie-accessible.html` | 13 pages. Printing and reading, and the Accessible Patterns Index. Tagged, machine-verified. Not the screen reader path |
| `assets/patterns/rosie-beanie-pattern-hi.pdf` | `pattern-beanie-accessible-hi.html` | The same 13 pages in Hindi. Printing and reading. Not the screen reader path |

`node tools/build-pattern.js standard --check` builds and verifies without writing.

### Why a Word file

WebAIM's screen reader user survey asks people which document format works best:
**Word 68.9%, PDF 12.9%**. Preference runs the same way, 60.6% against 17.3%. Word
also reflows, which is what large print actually needs — enlarging a fixed-layout
PDF means scrolling sideways as well as down, and a quarter of low vision users
magnify to 400% or more.

It is also structurally incapable of the bug below: a `.docx` has no glyph runs and
no tag tree, so the word spaces are just characters in the text.

### How the two editions are presented

Groups on the product page are named for **what they are** — "The pattern", "Large
print edition" — never for who they are for. Nobody has to identify themselves to
get a pattern; the line under each link does the choosing. Within a group the most
useful format leads.

Both "download the PDF" links carry an `aria-label` naming their edition, so they
stay distinguishable in a screen reader's list of links, where the group heading
is no longer alongside them.

A plain text edition for braille embossing was built and then cut: a braille
display already works from the web page, via the reader. It is in the git history
if the embossing case ever comes up.

### Screen reader status

The web edition and the Word edition have both been read end to end with NVDA and
read correctly.

The large print PDF used to be the odd one out. The published copy was the file
Chrome exported *before* the word-space fix, kept because it passed PAC, and a
screen reader ran the words together in it — it said *"Beanie, AdultMedium"* out
loud while a checker called it conformant. `build-pattern.js` refused to rebuild
it, because at the time a rebuild lost the PDF/UA identifier.

That trade is gone. `addXmpMetadata` writes the identifier itself now, so the
freeze bought nothing, and it was in any case the wrong way round: a file a screen
reader can follow is the point, and a checker agreeing is the evidence, not the
goal. The edition is now built from `pattern-beanie-accessible.html` like
everything else, and every one of its 211 text lines ends on a word boundary.

**It has not been listened to end to end by a person.** What it has is the machine
check below — the tag tree walked, the text each tag owns pulled out and read back
in order. The pattern says exactly that in its own accessibility statement rather
than claiming the NVDA pass the other two editions have.

So the PDF is offered for printing and reading, and the note under it on the
product page sends screen reader users to the web page instead. That is a
recommendation, not a claim that the file is incompatible: it is tagged, it is
machine-verified, the Accessible Patterns Index lists it on that basis, and no
reader other than NVDA has been tried on it. Steer people to the format that is
known to work; do not publish a failure that was not measured.

### Why the build post-processes Chrome's PDF

Chrome prints the page to a tagged PDF, which is most of the job. Two things it
does not do, both fixed in `build-pattern.js`:

1. **Word spaces at line ends.** Chrome's PDF writer draws every wrapped line as
   its own text block and drops the space that caused the wrap. The space is in
   the HTML; it never reaches the PDF's text layer. A screen reader then reads
   *"Beanie, AdultMedium"* and *"forcrocheters"*. The build appends a space glyph
   to any line that does not already end on one — invisible, no reflow.

2. **An alternative description on the link.** Chrome writes the link's action but
   no `/Contents`, which PDF/UA wants. The build copies it from the anchor's
   `aria-label` in the HTML, so the wording lives in the source.

This is worth knowing because **PAC passes a file with the spacing bug.** PAC
checks the tag tree; the bug is one layer below, in the glyph runs. That is why
`verify-pattern-pdf.js` exists — it reads the built file the way assistive
technology does, walking the structure tree and pulling the text each tag owns,
and the build fails if:

- any text line does not end on a word boundary
- the tag tree is not there, or the document language is not declared
- reading order jumps backwards through the pages
- any text is tagged twice
- headings skip a level, do not start at H1, or carry no text
- a link annotation has no description, or sits outside a `Link` element

Chrome's own tagging has been checked and is sound: heading levels nest correctly,
lists are real `L`/`LI`/`Lbl`/`LBody`, and reading order runs straight through with
no backward jumps. If a screen reader repeats a sentence or announces pages out of
order, that is Acrobat's page buffer, not this file.

## Photography

Each photo shows the **finished piece a pattern produces**, and every pattern
page says so in as many words directly under the image. All six are in
`assets/img/` and loading (verified 200 OK, no 404s):

| File | Photo |
| --- | --- |
| `Bluebell.png` | Blue + white checkerboard shoulder bag |
| `Frosty.png` | Blue cardigan, white bobble clouds |
| `beanie.png` | Dusty pink ribbed beanie with a fold-up brim |
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

Replaced by the **Poppy Hat** — its own pattern page, its own copy and
details, in the same grid slot. `product-daisy-cardigan.html` was deleted and
every link across the home page, basket, checkout and library footers now
points at `product-bucket-hat.html`. No references remain.

## Patterns, basket and pattern access

Selling a file rather than an object changes the mechanics, not the design.
Everything below is the same design system doing a different job.

**Pattern grid** is deliberately uneven rather than a uniform 3-up: the bag
runs as a wide feature, the Cloud cardigan as a tall portrait beside it, three
square tiles below, and the Ariel set as a full-width banner. Each card
carries the pattern price, a skill-level pill and an invitation to make it
yourself. Images lift slightly on hover and on keyboard focus (suppressed under
`prefers-reduced-motion`).

The card's call to action is a **styled `<span>`, not a second link** — the
heading link already stretches across the whole card via `h3 a::after`, so a
real link there would give keyboard and screen reader users two tab stops to
the same destination.

**Pattern pages** lead with the finished piece and a line under it saying
plainly that the pattern is what is for sale. Then: a spec strip (skill level,
time to make, sizes written, page count), a single **Get the pattern** button,
what is inside the file, the yarn/hook/notions/gauge you need before casting
on, the stitches used, the studio's notes, and previous/next links.

If a pattern is already owned, its button says so, is disabled, and points at
the library instead of selling the same file twice.

**Skill levels** are `Beginner`, `Confident beginner` and `Intermediate`. The
pill carries the level as a word first; the tint and dot are a second cue, not
the only one (1.4.1). `index.html#levels` explains what each level assumes.

**Basket** holds one copy of each pattern — no quantity field, because a second
copy of a PDF buys nothing — and persists in `localStorage`. Every read is
wrapped in `try/catch` so a private window or blocked site data still renders a
working page.

**Checkout** asks for a name and an email and nothing else. There is no
address, no PIN code and no shipping line, because nothing is posted. On
submit the basket empties into the pattern library and the confirmation lists
each unlocked file with its own Download button.

**My patterns** (`library.html`) is the permanent shelf: every pattern owned,
re-downloadable as often as you like, with a link back to the finished piece.

> **The checkout and library are a front-end demonstration.** Nothing is
> transmitted, no payment is taken, and the Download button hands over a
> plain-text stand-in describing the pattern rather than the studio's real PDF
> — see `patternFileText()` in `assets/js/shop.js`. Both pages say so plainly
> to anyone using them. Connect a payment provider and a file store before
> selling patterns for money.

Two storage keys, both in `localStorage`: `crochet-curio-basket` for what is
picked and `crochet-curio-library` for what is owned. Ownership is per browser,
which is exactly the limitation an account system would remove.

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

**Stroke** — Stroke XS 1px, M 2px, L 4px. Confirmed from the file.

**Radius** — `Radius/XS · S · M · L · Pill · Circle` exist, in the *Border*
collection of the FurGo design tokens library. The names are real; the values
in `tokens.css` are not confirmed — the API returns variable names and types
but not the numbers. **The Button component uses none of them.** It is square
on all 32 variants, so the buttons here are square too.

**Elevation** — no shadow or elevation variables and no effect styles in the
library. The `--shadow-l1`…`l6` tokens in `tokens.css` are **invented** and
should either be added to the file or dropped from the CSS.

**Buttons** — the Button component set, read node by node:

| | Size L | Size S |
|---|---|---|
| Box | 48px tall, 12px frame padding | 32px tall, 8/4px frame padding |
| Label | Text/L Regular 16/24 | Text/M Regular 14/20 |
| Inset | 16px (12px frame + 4px on the Label node) | 12px |
| Radius | none | none |

Types: **Primary** `Background/Brand` → `Brand hover` → `Brand pressed`,
label `Content/Primary inverse`. **Secondary** white, 1px `Border/Secondary`,
label `Content/Secondary` that darkens to `Content/Primary` on hover and
press. **Tertiary** link-coloured, fill only on hover and press.
**Tertiary mono** the same shape in `Content/Secondary`.

The focus state matters most: the component puts a **2px `Border/Focus` ring
2px outside the control**, and the CSS does the same via `outline` +
`outline-offset`.

---

## Design system issues

Four things in the Figma file will fail an audit or trip a user. None of them
are fixed here — they need fixing in the file, or every consumer of the
library inherits them. The site works around the first two.

**1. `Border/Focus` is unusable on brand surfaces — 1.4.11 Non-text Contrast.**
`#3355ff` is 5.4:1 against white, which is fine, but 1.6:1 against
`Background/Brand` `#3a5240` and 1.2:1 against `Background/Brand Pressed`.
Any focused control on a brand panel has a ring nobody can see, and 3:1 is the
floor. *Fix:* add a `Border/Focus Inverse` variable (`Primary/White`) and a
Focus-on-dark variant, or make the ring two-tone — 2px `Border/Focus` with a
2px white outer ring, which then works on any ground. The site does the first
of these by hand on the hero band and the newsletter panel.

**2. `Content/Link Hover` and `Content/Link Pressed` are the same colour**
(`#1f3399`). A Tertiary button looks identical whether you are hovering it or
holding it down, so press is unacknowledged. Not a contrast failure — both are
7:1+ — but it costs the feedback 3.2.x expects. *Fix:* move pressed down to
`Blue/800`, keeping hover at `Blue/700`.

**3. The Button set has no Disabled variant**, though `Content/Disabled`,
`Background/Disabled` and `Border/Disabled` all exist. The shop disables the
buy button once you own a pattern, so the state is real. *Fix:* add
State=Disabled using those three tokens. Note that disabled controls are
exempt from 1.4.3, so the low contrast of `#b2b2b2` on `#f2f2f2` is allowed —
but pair it with `aria-disabled` rather than `disabled` anywhere the user
needs to be able to reach the control and read why it is off (3.3.1).

**4. Button frames are fixed-height with `nowrap` labels.** At 48px and 32px
exactly, a label clips as soon as a user applies their own text spacing
(1.4.12) or zooms to 200% (1.4.4). *Fix:* hug the content vertically with a
minimum height instead of a fixed one. The CSS uses `min-height` for this
reason.

Two more that pass, but with no margin worth spending: `Border/Secondary`
`#8c8c8c` is 3.36:1 on white against a 3:1 floor, and the Secondary focus ring
sits at a 5px offset where every other type uses 4px.

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

Prices are in **Indian rupees** (`&#8377;`) and are **pattern prices, not piece
prices** — ₹320 for the bucket hat pattern up to ₹650 for the graded
Sweetheart Cardigan, scaled roughly to page count and grading effort.
**These are placeholders. Set your real prices** in the catalogue at the top of
`build-products.js`, then re-run it.

The announcement bar reads "Instant PDF download · Written rows, charts and
step photos · Yours to keep". It is repeated verbatim in `build-products.js`
and in the four hand-written pages (`index`, `cart`, `checkout`, `library`) —
change it in all of them together.

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
| Directional reveals — story text from the left, its artwork from the right; the finished piece from the left, the pattern details from the right | Story, pattern pages |
| Staggered reveals — pattern cards, process steps and footer columns arrive one after another | Home |
| Process numbers scale and rotate into place | Home |
| Scroll manifesto — three phrases arrive in turn, shapes drifting behind | Home, between the pattern grid and the story |
| Section headings draw a short sage underline | Every page |
| Cards lift on hover and on keyboard focus; images scale gently | Pattern grid |
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

### The scroll manifesto

The old auto-scrolling ticker is gone, replaced by a section you move through
yourself. A 300vh track (260vh on tablet, ~2.5 screens on mobile) holds a
sticky full-height stage. As the track passes, three phrases cross-fade in
turn — **Written row by row → Tested before it is sold → Made by you** — while
four decorative shapes drift in from the sides behind them.

The shapes are inline SVG in brand colours: a paper-wrapped yarn ball and a
bucket hat in sage, a crochet hook in the dusty-pink accent, and a granny
square combining both. They are sized 148/74/132/164px on desktop, roughly
halved on mobile, and capped at **0.42 opacity** so they stay texture rather
than becoming the subject.

They sit at `z-index: 1` against the text's `z-index: 2` — **behind the words,
never over them** — and are tucked toward the edges so the centre stays clear.
The whole group is `aria-hidden`, since it carries no information.

Scrolling is **not** hijacked. The page scrolls at its normal rate and the
stage only reads its own position, so the section can be scrolled straight
past. That also means WCAG 2.2.2 no longer applies — nothing moves on its own,
so no pause control is needed.

Verified across the scroll: at least one phrase is fully readable at every
point, so the stage is never blank. Shapes start off-stage at ±173–213px and
opacity 0, ramp in, then hold. Under reduced motion the driver **does not run
at all** — deliberately, because it writes inline opacity onto the phrases,
which would hide text from exactly the people who opted out. Without it the CSS
fallback stands: no sticky, no track height, all three phrases stacked and
visible, shapes hidden.

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

1. **Check the pattern photography carries its weight.** The six project photos
   are real; the hero and story illustrations are SVG stitch patterns, and are
   deliberate decoration rather than pretend photos. Consider adding
   in-progress and detail shots — pattern buyers want to see the stitch.
2. **Write the actual patterns.** Six PDFs, one per project. The site promises
   written rows in UK and US terms, stitch charts, step photos, a yarn
   substitution guide and a gauge checklist — the page counts in the catalogue
   assume all of it. Deliver what the listing claims.
3. **Wire the money and the files.** Checkout takes no payment and the library
   downloads a text stand-in. You need a payment provider, somewhere to host
   the PDFs, and accounts so a pattern follows its owner between browsers.
   Replace `patternFileText()` in `assets/js/shop.js` with the real file.
4. **Decide the licence properly.** The footer currently says patterns are for
   personal use and finished pieces may be sold. That is a real commitment —
   make sure it is the one you want, then say it somewhere fuller than a
   footer line.
5. **Wire the forms.** Both are client-side only — validation runs, nothing is
   sent. Point them at your mail service or form endpoint.
6. **Replace the placeholder details** — `hello@crochetcurio.example`, the
   pattern prices, the studio hours, the 2026 copyright.
7. **Confirm the seven inferred spacing values** against Figma.
8. **Test with a real screen reader.** Automated checks catch structure, not
   whether the page actually makes sense read aloud.
