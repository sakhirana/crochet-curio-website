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
   * the large print Word file, English or Hindi;
   * the large print PDF, English or Hindi.

   Three rules this file follows:

   * Every link is a real link with a real English href in the markup.
     If this script never runs, all of them still work and still give
     English. Nothing here creates a download.
   * Text is written in English and left for i18n.js to translate,
     exactly like every other sentence on the site. Both wordings live
     in i18n-hi.js with the rest.
   * hreflang follows the choice, and a Hindi file also gets an
     aria-label saying so. There is no aria-label in English: the
     visible text already names the edition and the format. The Hindi
     label is the visible text with ", in Hindi" on the end, so the
     visible string stays a substring of the accessible name and a
     voice-control user can still say what they can see (2.5.3 Label
     in Name).

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
    text: "Download standard PDF",
    en: {
      href: "assets/patterns/rosie-beanie-pattern-standard.pdf",
      lang: "en",
      label: null,
      note: "5 pages, 12 point type, standard crochet abbreviations, with diagrams."
    },
    hi: {
      href: "assets/patterns/rosie-beanie-pattern-standard-hi.pdf",
      lang: "hi",
      label: "Download standard PDF, in Hindi",
      note: "5 pages in Hindi, 12 point type, crochet abbreviations kept in English, with diagrams."
    }
  };

  var LARGE_PRINT = {
    link: "largePrintRead",
    note: "largePrintReadNote",
    text: "Open in browser",
    en: {
      href: "pattern-beanie-accessible.html",
      lang: "en",
      label: null,
      note: "Pattern in your browser, compatible with screen readers."
    },
    hi: {
      href: "pattern-beanie-accessible-hi.html",
      lang: "hi",
      label: "Open in browser, in Hindi",
      note: "Pattern in your browser, in Hindi. Not tested with a screen reader yet."
    }
  };

  var LARGE_PRINT_WORD = {
    link: "largePrintWord",
    note: "largePrintWordNote",
    text: "Download Word file",
    en: {
      href: "assets/patterns/rosie-beanie-pattern-large-print.docx",
      lang: "en",
      label: null,
      note: "Word file for offline use, compatible with screen readers."
    },
    hi: {
      href: "assets/patterns/rosie-beanie-pattern-large-print-hi.docx",
      lang: "hi",
      label: "Download Word file, in Hindi",
      note: "Word file in Hindi for offline use. Not tested with a screen reader yet."
    }
  };

  var LARGE_PRINT_PDF = {
    link: "largePrintDownload",
    note: "largePrintDownloadNote",
    text: "Download large print PDF",
    en: {
      href: "assets/patterns/rosie-beanie-pattern.pdf",
      lang: "en",
      label: null,
      note: "24 point font, black on white."
    },
    hi: {
      href: "assets/patterns/rosie-beanie-pattern-hi.pdf",
      lang: "hi",
      label: "Download large print PDF, in Hindi",
      note: "24 point font in Hindi, black on white."
    }
  };

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
    /* English carries no aria-label at all, so the visible text is the
       accessible name. Setting one to the same string would only risk
       the two drifting apart. */
    if (file.label) { next.setAttribute("aria-label", file.label); }
    if (link.hasAttribute("download")) { next.setAttribute("download", ""); }
    /* Which format this link is, which shop.js records when the file is
       taken. It describes the link rather than the language, so it has
       to survive the swap — without it the library row knows a pattern
       was taken but not which edition. */
    if (link.dataset.format) { next.dataset.format = link.dataset.format; }
    next.textContent = spec.text;
    link.parentNode.replaceChild(next, link);

    /* English text, translated afterwards by i18n.js where the page is
       in Hindi. Writing Hindi here would double-translate it. */
    if (note) { note.textContent = file.note; }
  };

  var apply = function (code) {
    applyTo(STANDARD, code);
    applyTo(LARGE_PRINT, code);
    applyTo(LARGE_PRINT_WORD, code);
    applyTo(LARGE_PRINT_PDF, code);
  };

  if (siteLang() === "hi") { select.value = "hi"; }
  apply(select.value === "hi" ? "hi" : "en");

  select.addEventListener("change", function () {
    apply(select.value === "hi" ? "hi" : "en");
  });
})();
