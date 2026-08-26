/* ============================================================
   Crochet Curio — motion

   Everything is opt-in from JavaScript: the `.js-motion` class is
   what activates the hiding rules in motion.css, so a failed script
   leaves a fully visible, fully usable page.

   If the visitor has asked for reduced motion we add nothing at all —
   no reveals, no ticker animation, no observers.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Back to top: useful regardless of motion preference ---------- */
  function buildBackToTop() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "to-top";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = '<span aria-hidden="true">&#8593;</span>';

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

  /* ---------- Ticker: pause control is a WCAG 2.2.2 requirement ---------- */
  function wireTicker() {
    var ticker = document.querySelector(".ticker");
    if (!ticker) { return; }

    var toggle = ticker.querySelector(".ticker__toggle");
    if (!toggle) { return; }

    if (reduced.matches) {
      ticker.classList.add("is-paused");
      return;
    }

    var label = toggle.querySelector("[data-label]");

    var setPaused = function (paused) {
      ticker.classList.toggle("is-paused", paused);
      toggle.setAttribute("aria-pressed", paused ? "true" : "false");
      if (label) { label.textContent = paused ? "Play" : "Pause"; }
    };

    toggle.addEventListener("click", function () {
      setPaused(!ticker.classList.contains("is-paused"));
    });

    /* Pausing while a visitor reads it, without stealing the explicit choice */
    ticker.addEventListener("mouseenter", function () {
      if (toggle.getAttribute("aria-pressed") !== "true") {
        ticker.classList.add("is-paused");
      }
    });
    ticker.addEventListener("mouseleave", function () {
      if (toggle.getAttribute("aria-pressed") !== "true") {
        ticker.classList.remove("is-paused");
      }
    });

    setPaused(false);
  }

  /* ---------- Scroll reveal ---------- */
  var REVEALS = [
    [".section-head",            "up",    0],
    [".shop-card",               "up",    90],
    [".product-card",            "up",    90],
    [".split > div:first-child", "left",  0],
    [".split__art",              "right", 0],
    [".step",                    "up",    120],
    [".newsletter",              "zoom",  0],
    [".contact-grid > *",        "up",    90],
    [".footer-grid > *",         "up",    60],
    [".product__media",          "left",  0],
    [".product__info",           "right", 0],
    [".basket-row",              "up",    60],
    [".ticker",                  "zoom",  0]
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

    var parts = hero.querySelectorAll(
      ".eyebrow, h1, .lede, .hero__actions, .hero__art"
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
    wireTicker();
    watchBasketCount();
    watchSummary();

    if (reduced.matches) { return; }

    document.documentElement.classList.add("js-motion");
    markReveals();
    observeReveals();
    observeHeadings();
    heroEntrance();
    armSafetyNet();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
