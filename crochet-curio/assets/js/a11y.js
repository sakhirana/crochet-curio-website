/* ============================================================
   Crochet Curio — accessibility controls

   One switch for now: movement on or off, remembered between visits
   and across pages.

   The file is loaded from <head> rather than the foot of the page on
   purpose. The class it sets has to be on <html> before the first
   paint, otherwise a visitor who turned movement off still catches a
   frame of it on every page they open.

   Order of authority:

     1. a stored choice, if the visitor has ever used the switch
     2. the operating system's prefers-reduced-motion setting
     3. movement on

   Choosing "off" in the panel is therefore an override, never a
   replacement: someone who set the system preference sees a page with
   no movement and a switch already in the off position.
   ============================================================ */
(function () {
  "use strict";

  var KEY = "cc-motion";          /* "on" | "off"; absent means "not asked" */
  var root = document.documentElement;

  /* localStorage throws rather than returns null in a locked-down
     browser, so every touch of it is wrapped. A visitor who blocks it
     simply gets the system preference on every page. */
  var stored = function () {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  };
  var remember = function (value) {
    try { window.localStorage.setItem(KEY, value); } catch (e) { /* nothing to do */ }
  };

  var systemReduces = function () {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  var motionIsOff = function () {
    var choice = stored();
    if (choice === "off") { return true; }
    if (choice === "on")  { return false; }
    return systemReduces();
  };

  /* Before paint: the class motion.js reads and a11y.css acts on. */
  var apply = function (off) { root.classList.toggle("no-motion", off); };
  apply(motionIsOff());

  /* ---------- The panel ---------- */
  var ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"' +
    ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="7" r="1.3" fill="currentColor" stroke="none"/>' +
    '<path d="M7.5 10h9"/><path d="M12 10v4"/><path d="M12 14l-2 4"/><path d="M12 14l2 4"/></svg>';

  function build() {
    if (document.querySelector(".a11y")) { return; }

    var wrap = document.createElement("div");
    wrap.className = "a11y";
    wrap.innerHTML =
      '<button class="a11y__launch" type="button" id="a11yLaunch"' +
      ' aria-expanded="false" aria-controls="a11yPanel"' +
      ' aria-label="Accessibility options">' + ICON + '</button>' +
      '<div class="a11y__panel" id="a11yPanel" role="dialog" aria-modal="false"' +
      ' aria-labelledby="a11yTitle" hidden>' +
        '<div class="a11y__head">' +
          '<h2 class="a11y__title" id="a11yTitle">Accessibility</h2>' +
          '<button class="a11y__close" type="button" aria-label="Close accessibility options">' +
            '<span aria-hidden="true">&times;</span></button>' +
        '</div>' +
        '<div class="a11y__row">' +
          '<span class="a11y__label" id="a11yMotionLabel">Disable animations</span>' +
          '<button class="a11y__switch" type="button" role="switch" aria-checked="false"' +
          ' aria-labelledby="a11yMotionLabel"><span class="a11y__knob"></span></button>' +
        '</div>' +
        '<p class="a11y__note">Stops the scrolling text, the drifting pieces and the ' +
        'fade-ins. Your choice is remembered on every page.</p>' +
      '</div>';

    document.body.appendChild(wrap);

    /* The launcher sits below the sticky header rather than over it, so its
       offset is whatever that header currently measures. */
    var header = document.querySelector(".site-header");
    var placeBelowHeader = function () {
      if (!header) { return; }
      root.style.setProperty("--a11y-top", header.offsetHeight + "px");
    };
    placeBelowHeader();
    window.addEventListener("resize", placeBelowHeader);

    var launch = wrap.querySelector(".a11y__launch");
    var panel  = wrap.querySelector(".a11y__panel");
    var close  = wrap.querySelector(".a11y__close");
    var toggle = wrap.querySelector(".a11y__switch");

    /* The switch reads as the visitor's intent — "disable animations" —
       so it is on when movement is off. */
    var reflect = function () {
      toggle.setAttribute("aria-checked", motionIsOff() ? "true" : "false");
    };
    reflect();

    var openPanel = function (open) {
      panel.hidden = !open;
      launch.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) { toggle.focus(); } else { launch.focus(); }
    };

    launch.addEventListener("click", function () { openPanel(panel.hidden); });
    close.addEventListener("click", function () { openPanel(false); });

    toggle.addEventListener("click", function () {
      var off = !motionIsOff();
      remember(off ? "off" : "on");
      apply(off);
      reflect();

      /* Turning movement off takes effect on the spot: a11y.css puts the
         page into the same state it has without scripting. Turning it back
         on can need a reload — if the page opened with movement off,
         motion.js stopped before setting any of it up, and only a fresh
         load can wire it in again. */
      if (!off && !window.__ccMotionReady) { window.location.reload(); }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) { openPanel(false); }
    });

    document.addEventListener("click", function (e) {
      if (!panel.hidden && !wrap.contains(e.target)) { openPanel(false); }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
