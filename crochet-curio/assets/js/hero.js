/* ============================================================
   Crochet Curio — landing hero

   Three jobs:
     1. the navigation dropdowns, search panel and mobile drawer;
     2. a very light parallax on the floating crochet pieces, driven
        by both the pointer and the scroll position;
     3. filtering the pattern library from the search field.

   Nothing here is required to read or use the page: if the script
   never runs, the menus fall back to plain links and the hero is a
   still photograph.
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Disclosure helper (dropdowns, search, drawer) ---------- */
  var openPanels = [];

  function closeAll(except) {
    openPanels.forEach(function (panel) {
      if (panel === except) { return; }
      panel.trigger.setAttribute("aria-expanded", "false");
      panel.target.classList.remove("is-open");
    });
    openPanels = except ? [except] : [];
  }

  function wireDisclosure(trigger, target, onOpen) {
    if (!trigger || !target) { return; }
    var panel = { trigger: trigger, target: target };

    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      var willOpen = trigger.getAttribute("aria-expanded") !== "true";
      closeAll(willOpen ? panel : null);
      trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
      target.classList.toggle("is-open", willOpen);
      if (willOpen && onOpen) { onOpen(); }
    });

    /* Pointer users get the dropdowns on hover as well as on click. */
    if (trigger.parentElement && trigger.parentElement.classList.contains("site-nav__item")) {
      var item = trigger.parentElement;
      item.addEventListener("mouseenter", function () {
        closeAll(panel);
        trigger.setAttribute("aria-expanded", "true");
        target.classList.add("is-open");
      });
      item.addEventListener("mouseleave", function () { closeAll(null); });
    }
  }

  document.querySelectorAll(".site-nav__item > .site-nav__link").forEach(function (trigger) {
    wireDisclosure(trigger, document.getElementById(trigger.getAttribute("aria-controls")));
  });

  var searchToggle = document.getElementById("searchToggle");
  var searchPanel = document.getElementById("searchPanel");
  var searchInput = document.getElementById("searchInput");
  wireDisclosure(searchToggle, searchPanel, function () { searchInput.focus(); });

  var burger = document.getElementById("navBurger");
  wireDisclosure(burger, document.getElementById("navDrawer"));

  /* Escape closes whatever is open; a click elsewhere does the same. */
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || !openPanels.length) { return; }
    var trigger = openPanels[0].trigger;
    closeAll(null);
    trigger.focus();
  });

  document.addEventListener("click", function (event) {
    if (!openPanels.length) { return; }
    var panel = openPanels[0];
    if (panel.target.contains(event.target) || panel.trigger.contains(event.target)) { return; }
    closeAll(null);
  });

  /* ---------- Pattern search and category filter ---------- */
  var cards = Array.prototype.slice.call(document.querySelectorAll(".shop-grid .shop-card"));

  function filterPatterns(term) {
    var needle = term.trim().toLowerCase();
    var matches = 0;

    cards.forEach(function (card) {
      var hit = !needle || card.textContent.toLowerCase().indexOf(needle) > -1;
      card.hidden = !hit;
      if (hit) { matches++; }
    });

    var status = document.getElementById("searchStatus");
    if (status) {
      status.textContent = !needle
        ? ""
        : matches + (matches === 1 ? " pattern matches " : " patterns match ") + '"' + term.trim() + '"';
    }

    var patterns = document.getElementById("patterns");
    if (patterns) { patterns.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth" }); }
  }

  if (searchPanel && cards.length) {
    searchPanel.addEventListener("submit", function (event) {
      event.preventDefault();
      filterPatterns(searchInput.value);
      closeAll(null);
    });
  }

  document.querySelectorAll(".site-nav__menu a[data-filter]").forEach(function (link) {
    link.addEventListener("click", function () {
      if (searchInput) { searchInput.value = link.getAttribute("data-filter"); }
      filterPatterns(link.getAttribute("data-filter"));
      closeAll(null);
    });
  });

  /* ---------- Floating pieces ----------
     Each piece carries its own depth, so the group separates slightly as
     the pointer moves and as the hero scrolls away. The movement is a
     few pixels: enough to read as depth, not enough to distract.
  ------------------------------------------------------------------- */
  var stage = document.querySelector(".hero-stage");
  var layers = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  if (!stage || !layers.length || reduced.matches) { return; }

  var MAX_POINTER = 16;   /* px of drift at full depth */
  var MAX_SCROLL = 90;    /* px of lift across one hero height */
  var pointerX = 0, pointerY = 0, scrolled = 0, queued = false;

  /* Each piece keeps its resting tilt: `rotate` is its own CSS property,
     so writing `transform` here composes with it rather than clearing it. */
  function render() {
    queued = false;
    layers.forEach(function (layer) {
      var depth = parseFloat(layer.getAttribute("data-parallax")) || 0;
      var drift = parseFloat(layer.getAttribute("data-float")) || 0;
      var x = pointerX * MAX_POINTER * depth;
      var y = pointerY * MAX_POINTER * depth - scrolled * MAX_SCROLL * depth;
      var breathe = drift ? Math.sin((scrolled + 1) * Math.PI * drift * 0.1) * drift * 0.35 : 0;
      layer.style.transform = "translate3d(" + x.toFixed(2) + "px," + (y + breathe).toFixed(2) + "px,0)";
    });
  }

  function schedule() {
    if (queued) { return; }
    queued = true;
    requestAnimationFrame(render);
  }

  stage.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch") { return; }
    var box = stage.getBoundingClientRect();
    pointerX = (event.clientX - box.left) / box.width * 2 - 1;
    pointerY = (event.clientY - box.top) / box.height * 2 - 1;
    schedule();
  }, { passive: true });

  stage.addEventListener("pointerleave", function () {
    pointerX = 0; pointerY = 0;
    schedule();
  });

  window.addEventListener("scroll", function () {
    var box = stage.getBoundingClientRect();
    scrolled = Math.min(1, Math.max(0, -box.top / box.height));
    schedule();
  }, { passive: true });

  render();
})();
