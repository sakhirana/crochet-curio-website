/* ============================================================
   Crochet Curio — accessibility controls

   Two switches: movement on or off, and the dark theme on or off.
   Both are remembered between visits and across pages.

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
  var KEY_THEME = "cc-theme";     /* "dark" | "light"; absent means "not asked" */
  var KEY_VISION = "cc-lowvision"; /* "on" | "off"; absent means "not asked" */
  var KEY_NOTE = "cc-announcement"; /* "dismissed"; absent means still showing */
  var root = document.documentElement;

  /* localStorage throws rather than returns null in a locked-down
     browser, so every touch of it is wrapped. A visitor who blocks it
     simply gets the system preference on every page. */
  var read = function (key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  };
  var write = function (key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* nothing to do */ }
  };

  var stored   = function () { return read(KEY); };
  var remember = function (value) { write(KEY, value); };

  var systemReduces = function () {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  var motionIsOff = function () {
    var choice = stored();
    if (choice === "off") { return true; }
    if (choice === "on")  { return false; }
    return systemReduces();
  };

  /* ---------- Theme ----------
     Same order of authority as movement: a stored choice first, the system
     setting second. The stylesheets carry each dark rule twice — once inside
     a prefers-color-scheme query for a visitor without scripting, once under
     [data-theme="dark"] for the switch below — so setting the attribute on
     every load, in both directions, is what lets the switch override the
     system in either direction. */
  var themeIsDark = function () {
    var choice = read(KEY_THEME);
    if (choice === "dark")  { return true; }
    if (choice === "light") { return false; }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  var applyTheme = function (dark) {
    root.setAttribute("data-theme", dark ? "dark" : "light");
  };

  /* ---------- The announcement bar ----------
     Dismissing it is a preference like the other two, so it is read
     here rather than in site.js: site.js runs at the foot of the page,
     and a bar removed there would still have been painted and would
     still have shifted the page down on every load. */
  var noteIsDismissed = function () { return read(KEY_NOTE) === "dismissed"; };
  var applyNote = function (gone) {
    root.classList.toggle("announcement-dismissed", gone);
  };

  /* ---------- Low vision ---------- */
  var visionIsOn = function () { return read(KEY_VISION) === "on"; };
  var applyVision = function (on) { root.classList.toggle("low-vision", on); };

  /* Before paint: the class motion.js reads, the theme attribute, and
     the announcement bar. */
  var apply = function (off) { root.classList.toggle("no-motion", off); };
  apply(motionIsOff());
  applyTheme(themeIsDark());
  applyVision(visionIsOn());
  applyNote(noteIsDismissed());

  /* ---------- The panel ---------- */
  var ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"' +
    ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="7" r="1.3" fill="currentColor" stroke="none"/>' +
    '<path d="M7.5 10h9"/><path d="M12 10v4"/><path d="M12 14l-2 4"/><path d="M12 14l2 4"/></svg>';

  function build() {
    /* The announcement's dismiss button. Focus is moved to the brand
       link rather than left on a control that is about to disappear,
       so a keyboard user carries on from the top of the header instead
       of from the top of the document (2.4.3). */
    var noteClose = document.getElementById("announcementClose");
    if (noteClose) {
      noteClose.addEventListener("click", function () {
        var brand = document.querySelector(".site-header .brand");
        applyNote(true);
        write(KEY_NOTE, "dismissed");
        if (brand) { brand.focus(); }
      });
    }

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
        '<div class="a11y__row">' +
          '<span class="a11y__label" id="a11yThemeLabel">Dark mode</span>' +
          '<button class="a11y__switch a11y__switch--theme" type="button" role="switch"' +
          ' aria-checked="false" aria-labelledby="a11yThemeLabel">' +
          '<span class="a11y__knob"></span></button>' +
        '</div>' +
        '<div class="a11y__row">' +
          '<span class="a11y__label" id="a11yVisionLabel">Low vision friendly</span>' +
          '<button class="a11y__switch a11y__switch--vision" type="button" role="switch"' +
          ' aria-checked="false" aria-labelledby="a11yVisionLabel">' +
          '<span class="a11y__knob"></span></button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(wrap);

    var header = document.querySelector(".site-header");
    var placeBelowHeader = function () {
      if (!header) { return; }
      root.style.setProperty("--a11y-top", header.offsetHeight + "px");
    };
    placeBelowHeader();
    if (typeof ResizeObserver !== "undefined" && header) {
      new ResizeObserver(placeBelowHeader).observe(header);
    }
    window.addEventListener("resize", placeBelowHeader);

    var launch = wrap.querySelector(".a11y__launch");
    var panel  = wrap.querySelector(".a11y__panel");
    var close  = wrap.querySelector(".a11y__close");
    var toggle = wrap.querySelector(".a11y__switch");
    var theme  = wrap.querySelector(".a11y__switch--theme");
    var vision = wrap.querySelector(".a11y__switch--vision");

    /* The switch reads as the visitor's intent — "disable animations" —
       so it is on when movement is off. */
    var reflect = function () {
      toggle.setAttribute("aria-checked", motionIsOff() ? "true" : "false");
      theme.setAttribute("aria-checked", themeIsDark() ? "true" : "false");
      vision.setAttribute("aria-checked", visionIsOn() ? "true" : "false");
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

    /* The theme needs no reload either way: it is only custom properties. */
    theme.addEventListener("click", function () {
      var dark = !themeIsDark();
      write(KEY_THEME, dark ? "dark" : "light");
      applyTheme(dark);
      reflect();
    });

    vision.addEventListener("click", function () {
      var on = !visionIsOn();
      write(KEY_VISION, on ? "on" : "off");
      applyVision(on);
      reflect();
    });

    /* Until the visitor states a preference of their own, the page keeps
       following the device — including a switch made while it is open. */
    var system = window.matchMedia("(prefers-color-scheme: dark)");
    var followSystem = function () {
      if (read(KEY_THEME)) { return; }
      applyTheme(system.matches);
      reflect();
    };
    if (system.addEventListener) { system.addEventListener("change", followSystem); }
    else if (system.addListener) { system.addListener(followSystem); }

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
