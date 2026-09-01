/* ============================================================
   Crochet Curio — pattern language

   One select on the product page, and every edition of the pattern
   follows it. There is deliberately no second control: the language
   is a property of the pattern, not of the format, and asking twice
   would imply you could have one edition in each.

   What the choice moves:

   * the standard PDF, English or Hindi;
   * the large print web page, which is also where the Word file for
     that language is linked;
   * a line under the large print PDF, which appears only in Hindi,
     because that one file has no Hindi edition.

   Why the large print PDF has none: Chrome writes a mangled text
   layer for Devanagari — matras reordered, conjuncts dropped — so a
   Hindi PDF would look correct and read wrong. The page and the Word
   file hold real characters, so both are sound, and they are what
   Hindi readers are pointed at.

   Three rules this file follows:

   * Every link is a real link with a real English href in the markup.
     If this script never runs, all of them still work and still give
     English. Nothing here creates a download.
   * Text is written in English and left for i18n.js to translate,
     exactly like every other sentence on the site. Both wordings live
     in i18n-hi.js with the rest.
   * hreflang and each link's aria-label follow the choice, so a screen
     reader announces which language it is about to open rather than
     reading the same label twice.

   The starting choice is the language the site is already in. Someone
   reading the page in Hindi is offered the Hindi pattern first; the
   select still says what it is and still switches either way.
   ============================================================ */
(function () {
  "use strict";

  var select = document.getElementById("patternLang");
  if (!select) { return; }

  /* Each entry: the element ids it owns, and what to write on them per
     language. A missing element is simply skipped, so a pattern page
     that offers fewer editions needs no change here. */
  var STANDARD = {
    link: "patternDownload",
    note: "patternNote",
    text: "Download the PDF — free",
    en: {
      href: "assets/patterns/rosie-beanie-pattern-standard.pdf",
      lang: "en",
      label: "Download the pattern as a PDF, free",
      note: "5 pages, 12 point type, standard crochet abbreviations, with diagrams."
    },
    hi: {
      href: "assets/patterns/rosie-beanie-pattern-standard-hi.pdf",
      lang: "hi",
      label: "Download the pattern in Hindi as a PDF, free",
      note: "5 pages in Hindi, 12 point type, crochet abbreviations kept in English, with diagrams."
    }
  };

  var LARGE_PRINT = {
    link: "largePrintRead",
    note: "largePrintReadNote",
    text: "Read it in your browser",
    en: {
      href: "pattern-beanie-accessible.html",
      lang: "en",
      label: "Read the large print edition in your browser",
      note: "24 point type that reflows and zooms. Read from beginning to end with NVDA. The Word file, for reading offline, is linked at the top of that page."
    },
    hi: {
      href: "pattern-beanie-accessible-hi.html",
      lang: "hi",
      label: "Read the large print edition in Hindi in your browser",
      note: "24 point type that reflows and zooms. The Hindi Word file, for reading offline, is linked at the top of that page. The Hindi editions have not been listened to with a screen reader yet."
    }
  };

  /* Shown only in Hindi: the one edition the choice cannot move. */
  var PDF_NOTE_HI = "The large print PDF is in English only for now.";

  /* The site's own language, written by i18n.js. Only a starting
     point — the select overrides it and nothing writes back. */
  var siteLang = function () {
    try { return window.localStorage.getItem("cc-lang"); } catch (e) { return null; }
  };

  var applyTo = function (spec, code) {
    var link = document.getElementById(spec.link);
    var note = document.getElementById(spec.note);
    if (!link) { return; }
    var file = spec[code] || spec.en;

    /* A new anchor, not the old one relabelled. i18n.js remembers the
       English it first saw on each element's attributes, so rewriting
       aria-label underneath it leaves the Hindi label sitting on the
       English file. A fresh element has no such history. */
    var next = document.createElement("a");
    next.className = link.className;
    next.id = link.id;
    next.setAttribute("href", file.href);
    next.setAttribute("hreflang", file.lang);
    next.setAttribute("aria-label", file.label);
    if (link.hasAttribute("download")) { next.setAttribute("download", ""); }
    next.textContent = spec.text;
    link.parentNode.replaceChild(next, link);

    /* English text, translated afterwards by i18n.js where the page is
       in Hindi. Writing Hindi here would double-translate it. */
    if (note) { note.textContent = file.note; }
  };

  var apply = function (code) {
    applyTo(STANDARD, code);
    applyTo(LARGE_PRINT, code);

    var pdfNote = document.getElementById("largePrintPdfNote");
    if (pdfNote) {
      pdfNote.textContent = code === "hi" ? PDF_NOTE_HI : "";
      pdfNote.hidden = code !== "hi";
    }
  };

  if (siteLang() === "hi") { select.value = "hi"; }
  apply(select.value === "hi" ? "hi" : "en");

  select.addEventListener("change", function () {
    apply(select.value === "hi" ? "hi" : "en");
  });
})();
