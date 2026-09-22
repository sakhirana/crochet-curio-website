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

  /* Before paint: the class motion.js reads, and the theme attribute. */
  var apply = function (off) { root.classList.toggle("no-motion", off); };
  apply(motionIsOff());
  applyTheme(themeIsDark());

  /* ---------- The panel ---------- */
  /* Icon/Accessibility/24, exported from the design system (node 2096:1437).
     The 25.5 viewBox is the 24px icon plus the Stroke Width/S bleed — half a
     stroke either side — so the glyph keeps its true 24px size and the stroke
     is not scaled down. Colour and stroke width come from CSS, not from the
     attributes, so the tokens drive them. */
  /* Icon/Accessibility/24. The artwork is inset inside its 24px frame, so the
     centre-aligned Stroke Width/S lands entirely within bounds and the symbol
     needs no compensation on the CSS side. */
  var ICON =
    '<svg class="icon-24" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
    ' stroke-width="1.5" stroke-linecap="round" aria-hidden="true"' +
    ' focusable="false">' +
    '<path d="M6.28571 8.42857H12M12 8.42857H17.7143M12 8.42857V14.8571' +
    'M12 14.8571L15.5714 18.4286M12 14.8571L8.42857 18.4286M12 4.85714' +
    'C12.3945 4.85714 12.7143 5.17694 12.7143 5.57143C12.7143 5.96592' +
    ' 12.3945 6.28571 12 6.28571C11.6055 6.28571 11.2857 5.96592 11.2857 5.57143' +
    'C11.2857 5.17694 11.6055 4.85714 12 4.85714ZM12 2C17.5228 2 22 6.47715 22 12' +
    'C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2Z"/>' +
    '</svg>';

  /* Icon/X/16, for the panel's close control. */
  var ICON_X =
    '<svg class="icon-16" viewBox="0 0 16 16" fill="none" stroke="currentColor"' +
    ' stroke-width="1" stroke-linecap="round" stroke-linejoin="round"' +
    ' aria-hidden="true" focusable="false">' +
    '<path d="M12 4L4 12M4 4L12 12"/>' +
    '</svg>';

  function build() {
    if (document.querySelector(".a11y")) { return; }

    var wrap = document.createElement("div");
    wrap.className = "a11y";
    wrap.innerHTML =
      '<button class="btn-icon btn-icon--l a11y__launch" type="button" id="a11yLaunch"' +
      ' aria-expanded="false" aria-controls="a11yPanel"' +
      ' aria-label="Accessibility options">' + ICON + '</button>' +
      '<div class="a11y__panel" id="a11yPanel" role="dialog" aria-modal="false"' +
      ' aria-labelledby="a11yTitle" hidden>' +
        '<div class="a11y__head">' +
          '<h2 class="a11y__title" id="a11yTitle">Accessibility</h2>' +
          /* Button Icon, Size=S, Type=Secondary, holding Icon/X/16. It drew a
             &times; glyph before, which meant the box was sized by a font
             rather than by the component. */
          '<button class="btn-icon btn-icon--s a11y__close" type="button"' +
          ' aria-label="Close accessibility options">' + ICON_X + '</button>' +
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

    /* The switch reads as the visitor's intent — "disable animations" —
       so it is on when movement is off. */
    var reflect = function () {
      toggle.setAttribute("aria-checked", motionIsOff() ? "true" : "false");
      theme.setAttribute("aria-checked", themeIsDark() ? "true" : "false");
    };
    reflect();

    /* The entrance slide runs once per page load. preferences.css drops it as soon
       as this class is set, and nothing takes the class off again, so the
       launcher stays put when the panel closes. Set on the animation's own
       end, or early if the panel is opened mid-slide — the panel is a child
       of the animated wrapper and would otherwise travel with it. */
    var arrived = function () { wrap.classList.add("is-arrived"); };
    wrap.addEventListener("animationend", function (e) {
      if (e.animationName === "a11y-arrive") { arrived(); }
    });

    var openPanel = function (open) {
      if (open) { arrived(); }
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

      /* Turning movement off takes effect on the spot: preferences.css puts the
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
