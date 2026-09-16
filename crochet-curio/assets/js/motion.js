/* ============================================================
   Crochet Curio — motion

   Everything is opt-in from JavaScript: the `.js-motion` class is
   what activates the hiding rules in motion.css, so a failed script
   leaves a fully visible, fully usable page.

   If the visitor has asked for reduced motion we add nothing at all —
   no reveals, no manifesto, no observers.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Back to top: useful regardless of motion preference ---------- */
  function buildBackToTop() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-icon btn-icon--l btn-icon--tertiary to-top";
    btn.setAttribute("aria-label", "Back to top");
    /* Icon/Arrow Up/24 */
    btn.innerHTML =
      '<svg class="icon-24" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"' +
      ' aria-hidden="true" focusable="false">' +
      '<path d="M12 19V5.00003M19 12L12 5.00003L5 12"/></svg>';

    btn.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: reduced.matches ? "auto" : "smooth"
      });
      var skip = document.querySelector(".skip-link");
      if (skip) { skip.focus(); }
    });

    document.body.appendChild(btn);

    var toggle = function () {
      btn.classList.toggle("is-visible", window.scrollY > 600);
    };
    window.addEventListener("scroll", toggle, { passive: true });
    toggle();
  }

  /* ---------- The bucket hat's tilt ----------
     The hat starts bottom-left of the big phrases, tips down onto its left
     until the brim is level, tips further into a slant, and glides up to sit
     above the "How it works" heading — as if the words had put it on.

     It stays one photograph turning on one axis the whole way. Two
     progressions drive it, back to back:

       a  the manifesto's own scroll progress. Carries the first half of the
          turn, resting through to level, while the hat is still bottom-left.
       b  how far the track has scrolled past its own end. Carries the rest
          of the turn and the whole of the journey.

     `b` leaves 0 at the exact scroll position where `a` reaches 1, so the
     two read as one movement rather than two.

     Where it is heading is re-read every frame, which means that once `b`
     reaches 1 the hat simply tracks the heading — it scrolls away with the
     section instead of staying stuck to the viewport, without ever being
     handed back to the document.

     Nothing here knows the layout. The resting spot, the size and the
     landing spot are all measured; the only constants are the angles and
     three proportions read off the photograph.
  ------------------------------------------------------------------- */
  function buildHatTilt(track, clamp) {
    var box = track.querySelector(".shape--hat");
    var target = document.querySelector("#process .eyebrow");
    if (!box || !target) { return null; }

    /* The hat leaves the manifesto's DOM and hangs off <body>.

       It is `fixed`, so it is positioned against the viewport either way and
       nothing about its geometry changes — but the band it was sitting in is
       `overflow: clip`, and Safari (iOS in particular) applies that clip to
       fixed descendants. There the hat was sliced off at the band's bottom
       edge instead of carrying on down to the "How it works" heading. Out
       here no ancestor can clip it, on any engine.

       aria-hidden comes along by hand: it was inherited from the shapes
       wrapper, which stays behind. */
    box.setAttribute("aria-hidden", "true");
    document.body.appendChild(box);

    /* Read off the photograph, as fractions of the box: where the hat's
       middle sits, and the left edge it turns about. The two share a height,
       which is what keeps the correction below to one horizontal radius. */
    var CENTRE_X = 0.596, CENTRE_Y = 0.484, PIVOT_X = 0.2085;

    /* In the photograph the hat lies over on its side with the brim down the
       left. -115 was read back off the screen: there the brim comes level and
       the crown is straight up. It lands on the words at that same angle, so
       the hat sits upright rather than slanted. */
    var TILT_LEVEL   = -115;   /* degrees by the time the brim is level */
    var TILT_LANDED  = -115;   /* and by the time it is sitting on the words */
    var LANDED_SCALE = 0.72;   /* the size it wears throughout, in proportion to a label */

    var base = {};

    /* Smoothstep. Both halves of the movement start and end at rest, so the
       hat eases into level, holds there for a beat, and eases on. */
    var ease = function (n) {
      n = clamp(n, 0, 1);
      return n * n * (3 - 2 * n);
    };

    /* Where the heading is, in viewport pixels. Walking offsetParents rather
       than asking for a client rect deliberately ignores transforms: the
       section slides in on a reveal of its own, and the hat must aim at
       where the words are coming to rest, not where they are passing. */
    var headingAt = function () {
      var x = 0, y = 0, node = target;
      while (node) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
      return { left: x - window.scrollX, top: y - window.scrollY };
    };

    /* The box's untransformed geometry. `left`/`bottom` come back as used
       pixels, so the percentages and the breakpoints stay in the stylesheet. */
    var measure = function () {
      var style = window.getComputedStyle(box);
      base.w = box.offsetWidth;
      base.h = box.offsetHeight;
      base.x = parseFloat(style.left) + CENTRE_X * base.w;
      base.y = window.innerHeight - parseFloat(style.bottom) - base.h + CENTRE_Y * base.h;
    };

    var paint = function (a, trackBottom) {
      if (!base.w) { measure(); }

      var vh = window.innerHeight;
      var heading = headingAt();

      /* The track's bottom edge is exactly one viewport down at the moment
         `a` hits 1, so measuring from there starts the second half on that
         same frame and gives it a little over half a screen to finish. */
      var b = ease((vh - trackBottom) / (vh * 0.62));

      var angle = TILT_LEVEL * ease(a) + (TILT_LANDED - TILT_LEVEL) * b;
      /* One size the whole way down. The hat used to come in at full size and
         shrink as it travelled; it now arrives already at the size it lands
         at, so nothing about it changes between entering the manifesto and
         sitting on the heading. The landing geometry below is untouched — at
         b = 1 this is the same number it has always been. */
      var scale = LANDED_SCALE;

      /* Turning about the left edge carries the hat's middle a long way round
         with it. Measure that arc: the landing cancels it outright so it can
         be exact, and while the hat is still bottom-left most of it is given
         back — enough of the arc is left to see the hat tip over rather than
         spin on the spot, but not enough to walk it off the gutter. */
      var radius = (CENTRE_X - PIVOT_X) * base.w;
      var radians = angle * Math.PI / 180;
      var spinX = (scale * Math.cos(radians) - 1) * radius;
      var spinY = scale * Math.sin(radians) * radius;
      var SWING_KEPT = 0.4;

      /* Where it waits: the entrance from the left edge and the slow drift
         the other three shapes get from the stylesheet. */
      var entered = clamp(a * 2.4, 0, 1);
      var restX = (a - 0.5) * 46 - (1 - entered) * 190 - spinX * (1 - SWING_KEPT);
      var restY = Math.sin(a * Math.PI) * -12 - spinY * (1 - SWING_KEPT);

      /* Where it lands: just above the heading and over its opening letters,
         so the words wear it rather than stand beside it. Far enough in from
         the heading's own left edge that the slanted brim, which is wider
         than the words, still clears the gutter. */
      var landX = heading.left + 0.34 * base.w - base.x - spinX;
      var landY = heading.top - 0.30 * base.w - base.y - spinY;

      box.style.transform =
        "translate3d(" + (restX + (landX - restX) * b).toFixed(2) + "px," +
                         (restY + (landY - restY) * b).toFixed(2) + "px,0) " +
        "rotate(" + angle.toFixed(3) + "deg) scale(" + scale.toFixed(4) + ")";
      box.style.opacity = entered.toFixed(3);
    };

    measure();
    return { paint: paint, measure: measure };
  }

  /* ---------- Scroll manifesto ----------
     Three phrases cross-fade as the track scrolls past, with four decorative
     shapes drifting in behind them.

     Scrolling is NOT hijacked: the page scrolls at its normal rate and this
     only reads the track's position. Nothing here traps the reader, and the
     section can be scrolled straight past.
  ------------------------------------------------------------------- */
  function driveManifesto() {
    var track = document.querySelector(".manifesto__track");
    if (!track) { return; }

    var lines  = track.querySelectorAll(".manifesto__line");
    /* The hat is left out here: it has its own driver further down, because
       it does not stay inside the stage the way the other three do. */
    var shapes = track.querySelectorAll(".shape:not(.shape--hat)");
    if (!lines.length) { return; }

    var last = lines.length - 1;
    var MAX_SHAPE_OPACITY = 1;      /* the photographs read at full strength */

    var clamp = function (n, lo, hi) { return n < lo ? lo : (n > hi ? hi : n); };

    var hat = buildHatTilt(track, clamp);

    /* which edge each shape flies in from */
    var sideOf = function (el) {
      return (el.classList.contains("shape--bikini") ||
              el.classList.contains("shape--bag")) ? 1 : -1;
    };

    var paint = function () {
      var rect = track.getBoundingClientRect();
      var span = track.offsetHeight - window.innerHeight;
      if (span <= 0) { return; }

      var p = clamp(-rect.top / span, 0, 1);
      var seg = p * lines.length;

      Array.prototype.forEach.call(lines, function (el, i) {
        var x = seg - i;
        var o;

        if (i === 0 && x < 0.5) {
          o = 1;                                  /* first phrase greets you */
        } else if (i === last && x > 0.5) {
          o = 1;                                  /* last one stays put */
        } else if (x < -0.3 || x > 1.3) {
          o = 0;
        } else if (x < 0.35) {
          o = clamp((x + 0.3) / 0.65, 0, 1);
        } else if (x > 0.65) {
          o = clamp((1.3 - x) / 0.65, 0, 1);
        } else {
          o = 1;
        }

        el.style.opacity = o.toFixed(3);
        el.style.transform = "translateY(" + ((1 - o) * 24).toFixed(1) + "px)";
      });

      Array.prototype.forEach.call(shapes, function (el, i) {
        var side = sideOf(el);
        var entered = clamp(p * 2.4, 0, 1);       /* settle early, then linger */
        var parallax = (p - 0.5) * (i % 2 ? 46 : -34);
        var x = side * (1 - entered) * 190 + parallax;

        el.style.transform = "translate3d(" + x.toFixed(1) + "px, 0, 0)";
        el.style.opacity = (entered * MAX_SHAPE_OPACITY).toFixed(3);
      });

      if (hat) { hat.paint(p, rect.bottom); }
    };

    var queued = false;
    var onScroll = function () {
      if (queued) { return; }
      queued = true;
      requestAnimationFrame(function () { queued = false; paint(); });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () {
      if (hat) { hat.measure(); }
      onScroll();
    });
    paint();

    /* rAF is throttled in hidden tabs, so paint once more on return */
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { paint(); }
    });
  }

  /* ---------- Scroll reveal ---------- */
  var REVEALS = [
    [".section-head",            "up",    0],
    [".shop-card",               "up",    90],
    [".split > div:first-child", "left",  0],
    [".split__art",              "right", 0],
    [".step",                    "up",    120],
    [".newsletter",              "zoom",  0],
    [".contact-grid > *",        "up",    90],
    [".footer-grid > *",         "up",    60],
    [".product__media",          "left",  0],
    [".product__info",           "right", 0],
    [".basket-row",              "up",    60],
    /* shop.js paints these before this file runs, so they are in the DOM */
    [".library-card",            "up",    60],
    [".library-help__grid > *",  "up",    90]
  ];

  function markReveals() {
    REVEALS.forEach(function (rule) {
      var selector = rule[0], direction = rule[1], stagger = rule[2];
      var nodes = document.querySelectorAll(selector);
      Array.prototype.forEach.call(nodes, function (node, i) {
        if (node.closest(".hero")) { return; }   /* the hero has its own entrance */
        node.setAttribute("data-reveal", direction);
        if (stagger) {
          node.style.setProperty("--reveal-delay", (i % 6) * stagger + "ms");
        }
      });
    });
  }

  /* Reveal everything, unconditionally. The safety valve. */
  function revealAll() {
    var hidden = document.querySelectorAll("[data-reveal]:not(.is-revealed)");
    Array.prototype.forEach.call(hidden, function (n) { n.classList.add("is-revealed"); });
    var heroParts = document.querySelectorAll(".hero [data-enter]:not(.is-entered)");
    Array.prototype.forEach.call(heroParts, function (n) { n.classList.add("is-entered"); });
  }

  /* Content is hidden by CSS until revealed, so a failure to observe would
     leave the page blank. This backstop runs once the tab has actually been
     visible for a moment and shows anything still waiting — a prerendered or
     background-tab load, a browser where IntersectionObserver misbehaves, or
     any case rAF never ticks. Visitors whose observers work never see it,
     because everything is already revealed by then. */
  function armSafetyNet() {
    var timer = null;

    var start = function () {
      if (timer || document.hidden) { return; }
      timer = window.setTimeout(revealAll, 2500);
    };

    var stop = function () {
      if (timer) { window.clearTimeout(timer); timer = null; }
    };

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { stop(); } else { start(); }
    });

    start();
    window.addEventListener("load", start);
  }

  function observeReveals() {
    var targets = document.querySelectorAll("[data-reveal]");
    if (!targets.length) { return; }

    if (!("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

    Array.prototype.forEach.call(targets, function (n) { observer.observe(n); });
  }

  /* Headings underline themselves as they arrive */
  function observeHeadings() {
    var heads = document.querySelectorAll(".section-head h2");
    if (!heads.length || !("IntersectionObserver" in window)) { return; }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.classList.add("is-underlined");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    Array.prototype.forEach.call(heads, function (h) { observer.observe(h); });
  }

  /* ---------- Hero entrance ---------- */
  function heroEntrance() {
    var hero = document.querySelector(".hero");
    if (!hero) { return; }

    /* The h1 is deliberately not in this list. It is the largest thing
       on the first screen, which makes it the element Largest Contentful
       Paint is measured against — and a fade cannot be measured as
       painted until it has finished. Starting it at opacity 0 for a
       200ms delay plus the transition was costing about a second of
       LCP, on text the browser already had ready. The heading is there
       the moment the page draws; everything around it still arrives. */
    var parts = hero.querySelectorAll(
      ".eyebrow, .lede, .hero__actions"
    );

    Array.prototype.forEach.call(parts, function (node, i) {
      node.setAttribute("data-enter", "");
      node.style.setProperty("--enter-delay", 90 + i * 110 + "ms");
    });

    var enter = function () {
      Array.prototype.forEach.call(parts, function (node) {
        node.classList.add("is-entered");
      });
    };

    /* Two frames lets the initial state paint so the transition is seen.
       The timeout covers tabs where rAF never ticks. */
    requestAnimationFrame(function () { requestAnimationFrame(enter); });
    window.setTimeout(enter, 400);
  }

  /* ---------- Basket count pop, driven by shop.js updating the badge ---------- */
  function watchBasketCount() {
    var badge = document.getElementById("cartCount");
    if (!badge || !("MutationObserver" in window) || reduced.matches) { return; }

    var previous = badge.textContent;
    new MutationObserver(function () {
      if (badge.textContent === previous) { return; }
      previous = badge.textContent;
      badge.classList.remove("is-bumped");
      void badge.offsetWidth;          /* restart the animation */
      badge.classList.add("is-bumped");
    }).observe(badge, { childList: true, characterData: true, subtree: true });
  }

  /* ---------- Summary values flash when they change ---------- */
  function watchSummary() {
    var summary = document.querySelector(".summary");
    if (!summary || !("MutationObserver" in window) || reduced.matches) { return; }

    new MutationObserver(function (records) {
      records.forEach(function (record) {
        var dd = record.target.nodeType === 1
          ? record.target.closest("dd")
          : record.target.parentElement && record.target.parentElement.closest("dd");
        if (!dd) { return; }
        dd.classList.remove("is-updated");
        void dd.offsetWidth;
        dd.classList.add("is-updated");
      });
    }).observe(summary, { childList: true, characterData: true, subtree: true });
  }

  /* ---------- Go ---------- */
  function init() {
    buildBackToTop();
    watchBasketCount();
    watchSummary();

    /* Under reduced motion we stop here — whether that came from the system
       setting or from the switch in the accessibility panel, which sets
       `no-motion` on <html> before this file runs. Crucially the manifesto
       driver does NOT run: it writes inline opacity onto the phrases, which
       would hide text for exactly the people who opted out of movement.
       Without it the CSS fallback stands and all three phrases are simply
       stacked. */
    if (reduced.matches || document.documentElement.classList.contains("no-motion")) { return; }

    document.documentElement.classList.add("js-motion");
    window.__ccMotionReady = true;   /* the panel checks this before reloading */
    markReveals();
    observeReveals();
    observeHeadings();
    heroEntrance();
    driveManifesto();
    armSafetyNet();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
