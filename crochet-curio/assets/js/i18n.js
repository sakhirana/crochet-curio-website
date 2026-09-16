/* ============================================================
   Crochet Curio — language

   English is the source. Hindi lives in i18n-hi.js, keyed by the
   English string exactly as it reads on the page, so no markup
   carries translation attributes and nothing has to be kept in sync
   by hand.

   How it runs:

   * Every text node is looked up by its own trimmed text. Inline
     markup therefore translates a fragment at a time, which is what
     lets a sentence carrying a <span> or a link work at all.
   * The original English is kept on each node, so switching back is
     a restore rather than a second translation.
   * The shop renders baskets and receipts after this file has run,
     so a MutationObserver translates whatever appears later. Those
     sentences carry a product name or a count, and are matched by
     the pattern list at the end of the dictionary.
   * <html lang> follows the choice. Without it a screen reader keeps
     reading Devanagari with an English voice, which is the whole
     point of translating for accessibility rather than for show.

   Product names, "Crochet Curio", prices, sizes and measurements are
   deliberately absent from the dictionary: they read the same in both
   languages, and a name that shifts between pages is worse than a
   name left in English.
   ============================================================ */
(function () {
  "use strict";

  var KEY = "cc-lang";                 /* "en" | "hi" */
  var root = document.documentElement;
  var ATTRS = ["alt", "title", "placeholder", "aria-label"];

  var read = function () {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  };
  var write = function (v) {
    try { window.localStorage.setItem(KEY, v); } catch (e) { /* nothing to do */ }
  };

  var LANGS = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" }
  ];

  var dict = function (code) {
    return code === "hi" ? (window.CC_LANG_HI || null) : null;
  };

  var current = read() === "hi" ? "hi" : "en";

  /* Collapse whitespace — including the non-breaking spaces in the markup —
     so a key does not depend on how the HTML happens to wrap. */
  var norm = function (s) { return s.replace(/\s+/g, " ").trim(); };

  var lookup = function (table, text) {
    var key = norm(text);
    if (!key) { return null; }
    if (Object.prototype.hasOwnProperty.call(table, key)) { return table[key]; }
    var rules = table["@patterns"] || [];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i][0].test(key)) { return key.replace(rules[i][0], rules[i][1]); }
    }
    return null;
  };

  /* The English a node started with, so "back to English" restores rather
     than guesses. Keyed by the node itself, so nothing leaks. */
  var originals = new WeakMap();
  var originalAttrs = new WeakMap();

  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };

  var busy = false;

  function translateTextNodes(table) {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) { return NodeFilter.FILTER_REJECT; }
        var parent = node.parentNode;
        if (!parent || SKIP[parent.nodeName]) { return NodeFilter.FILTER_REJECT; }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      var english = originals.has(node) ? originals.get(node) : node.nodeValue;
      if (!table) {
        if (originals.has(node) && node.nodeValue !== english) { node.nodeValue = english; }
        continue;
      }
      var hit = lookup(table, english);
      if (hit === null) { continue; }
      if (!originals.has(node)) { originals.set(node, english); }
      /* Keep whatever spacing sat around the words, so inline runs like
         "From <span>yarn</span>" do not lose the gap between them. */
      var lead  = english.match(/^\s*/)[0];
      var trail = english.match(/\s*$/)[0];
      var next  = lead + hit + trail;
      /* Writing the same string back still counts as a mutation, which would
         wake the observer below and start the pass all over again. */
      if (node.nodeValue !== next) { node.nodeValue = next; }
    }
  }

  function translateAttributes(table) {
    var nodes = document.querySelectorAll("[alt], [title], [placeholder], [aria-label]");
    Array.prototype.forEach.call(nodes, function (el) {
      var saved = originalAttrs.get(el) || {};
      ATTRS.forEach(function (attr) {
        if (!el.hasAttribute(attr)) { return; }
        var english = Object.prototype.hasOwnProperty.call(saved, attr)
          ? saved[attr] : el.getAttribute(attr);
        if (!table) {
          if (Object.prototype.hasOwnProperty.call(saved, attr) &&
              el.getAttribute(attr) !== english) { el.setAttribute(attr, english); }
          return;
        }
        var hit = lookup(table, english);
        if (hit === null) { return; }
        saved[attr] = english;
        originalAttrs.set(el, saved);
        if (el.getAttribute(attr) !== hit) { el.setAttribute(attr, hit); }
      });
    });
  }

  var englishTitle = document.title;

  function apply() {
    var table = dict(current);
    busy = true;
    root.setAttribute("lang", current);
    translateTextNodes(table);
    translateAttributes(table);
    var t = table ? lookup(table, englishTitle) : null;
    document.title = t || englishTitle;
    busy = false;
  }

  /* ---------- The control ---------- */
  function build() {
    var host = document.querySelector(".nav-list");
    if (!host || document.querySelector(".lang")) { return; }

    var li = document.createElement("li");
    li.className = "lang";

    var id = "langSelect";
    var options = LANGS.map(function (l) {
      return '<option value="' + l.code + '"' +
             (l.code === current ? ' selected' : '') + '>' + l.label + '</option>';
    }).join("");

    li.innerHTML =
      '<label class="lang__label visually-hidden" for="' + id + '">Language</label>' +
      '<select class="lang__select" id="' + id + '">' + options + '</select>';

    host.appendChild(li);

    li.querySelector("select").addEventListener("change", function (e) {
      current = e.target.value === "hi" ? "hi" : "en";
      write(current);
      apply();
    });
  }

  function start() {
    build();
    apply();

    /* The basket, the library and the checkout receipt are written after
       this point; translate them as they appear. */
    var observer = new MutationObserver(function (records) {
      if (busy || current === "en") { return; }
      var touched = records.some(function (r) {
        return r.addedNodes.length || r.type === "characterData";
      });
      if (!touched) { return; }
      apply();
      /* Drop the records this pass just generated, so they do not come back
         round as a fresh reason to translate. */
      observer.takeRecords();
    });
    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true
    });
  }

  /* The attribute is set before paint; the text swap needs a body to walk. */
  root.setAttribute("lang", current);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
