/* ============================================================
   Crochet Curio — pattern basket, checkout and pattern library

   Everything sold here is a digital PDF pattern. That shapes the
   rules: one copy of a pattern per basket (no quantity), no size
   choice at purchase (every size is written into the file), and no
   shipping — the file lands in the buyer's library.

   State lives in localStorage under two keys. Every read is
   defensive: a private window, cleared storage or a browser that
   blocks site data must still render a working page.
   ============================================================ */
(function () {
  "use strict";

  var BASKET_KEY  = "crochet-curio-basket";
  var LIBRARY_KEY = "crochet-curio-library";

  /* ---------- storage ---------- */
  function read(key) {
    try {
      var raw = window.localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable — the page still works for this visit */
    }
  }

  function readBasket() { return read(BASKET_KEY); }
  function writeBasket(items) { write(BASKET_KEY, items); paintCount(); }

  function readLibrary() { return read(LIBRARY_KEY); }
  function writeLibrary(items) { write(LIBRARY_KEY, items); }

  function ownsPattern(slug) {
    return readLibrary().some(function (p) { return p.slug === slug; });
  }

  /* ---------- formatting ---------- */
  function rupees(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
  }

  function basketTotal(items) {
    return items.reduce(function (sum, i) { return sum + i.price; }, 0);
  }

  function patternWord(n) {
    return n === 1 ? "pattern" : "patterns";
  }

  function catalogueEntry(slug) {
    return (window.CATALOGUE || []).filter(function (c) {
      return c.slug === slug;
    })[0];
  }

  function orderRef() {
    return "CC-" + Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  function today() {
    return new Date().toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric"
    });
  }

  /* ---------- header count ---------- */
  function paintCount() {
    var n = readBasket().length;
    var badge = document.getElementById("cartCount");
    var label = document.getElementById("cartCountLabel");
    if (badge) {
      badge.textContent = String(n);
      badge.classList.toggle("is-empty", n === 0);
    }
    if (label) {
      label.textContent = ", " + n + " " + patternWord(n);
    }
  }

  /* ---------- the stand-in pattern file ----------
     No PDF is generated here. The download hands over a plain-text
     receipt describing the pattern the buyer now owns, so the flow is
     complete end to end without pretending a file exists that does
     not. Swap this for the real PDF when the studio's files are wired
     up to a backend.
  ------------------------------------------------- */
  function patternFileText(entry, item) {
    var lines = [
      "CROCHET CURIO — " + (entry ? entry.name : item.name),
      "Digital crochet pattern",
      "",
      "Skill level : " + (entry && entry.difficulty ? entry.difficulty : "—"),
      "Length      : " + (entry && entry.pages ? entry.pages + " pages" : "—"),
      "Sizes       : " + (entry && entry.sizes ? entry.sizes : "—"),
      "Time to make: " + (entry && entry.time ? entry.time : "—"),
      "",
      "Yarn  : " + (entry && entry.yarn ? entry.yarn : "—"),
      "Hook  : " + (entry && entry.hook ? entry.hook : "—"),
      "Gauge : " + (entry && entry.gauge ? entry.gauge : "—"),
      "",
      "Unlocked on " + (item.purchasedAt || today()) +
        (item.ref ? "  ·  order " + item.ref : ""),
      "",
      "This is a placeholder for the full illustrated PDF. The written",
      "rows, stitch charts and step photos are delivered from the studio",
      "once the pattern library is connected to a file store.",
      "",
      "The pattern is for your own making.",
      "Please do not resell or share the file."
    ];
    return lines.join("\n");
  }

  function downloadPattern(slug) {
    var owned = readLibrary().filter(function (p) { return p.slug === slug; })[0];
    if (!owned) { return false; }

    var entry = catalogueEntry(slug);
    var blob = new Blob([patternFileText(entry, owned)], { type: "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "crochet-curio-" + slug + "-pattern.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return true;
  }

  /* ---------- add a pattern to the basket (pattern pages) ---------- */
  var buyForm = document.getElementById("buyForm");
  if (buyForm) {
    var slug = buyForm.dataset.slug;
    var status = document.getElementById("buyStatus");
    var button = buyForm.querySelector("button[type=submit]");

    /* Already owned? The page says so and points at the library
       instead of selling the same file twice. */
    if (ownsPattern(slug) && button) {
      button.textContent = "You already own this pattern";
      button.disabled = true;
      buyForm.insertAdjacentHTML("beforeend",
        '<p class="owned-note">In your library since you bought it. ' +
        '<a class="link" href="library.html">Open My patterns</a> to download it again.</p>');
    }

    buyForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var items = readBasket();
      var already = items.some(function (i) { return i.slug === slug; });

      if (already) {
        if (status) {
          status.textContent = buyForm.dataset.name +
            " is already in your cart — one copy is all you need. " +
            "Go to your cart to check out.";
        }
        return;
      }

      items.push({
        slug: slug,
        name: buyForm.dataset.name,
        price: Number(buyForm.dataset.price),
        image: buyForm.dataset.image,
        pages: Number(buyForm.dataset.pages) || null,
        difficulty: buyForm.dataset.difficulty || ""
      });

      writeBasket(items);

      if (status) {
        status.textContent = buyForm.dataset.name + " pattern added to your cart. " +
          items.length + " " + patternWord(items.length) + " ready to download after checkout.";
      }
    });
  }

  /* ---------- basket page ---------- */
  var basketRoot = document.getElementById("basketRoot");

  function renderBasket() {
    if (!basketRoot) { return; }
    var items = readBasket();

    if (!items.length) {
      basketRoot.innerHTML =
        '<div class="basket-empty">' +
          "<h2>No patterns picked yet</h2>" +
          '<p class="muted">One pattern written so far, five more on the way.</p>' +
          '<p><a class="btn btn--primary" href="index.html#patterns">Browse the patterns</a></p>' +
        "</div>";
      var sum = document.getElementById("basketSummary");
      if (sum) { sum.hidden = true; }
      return;
    }

    var rows = items.map(function (item, index) {
      /* Resolve the image and specs from the catalogue by slug rather than
         trusting what was stored — a basket saved before a photo was renamed
         would otherwise point at a file that no longer exists. */
      var entry = catalogueEntry(item.slug);
      var image = entry ? entry.image : item.image;
      var description = entry ? entry.alt : item.name;
      var difficulty = (entry && entry.difficulty) || item.difficulty || "";
      var pages = (entry && entry.pages) || item.pages;

      return '<li class="basket-row">' +
        '<div class="basket-row__media">' +
          '<img src="assets/img/' + image + '" alt="' + description + '" width="160" height="160">' +
        "</div>" +
        '<div class="basket-row__info">' +
          "<h3>" + item.name + "</h3>" +
          '<p class="muted">PDF pattern' + (pages ? " · " + pages + " pages" : "") +
            (difficulty ? " · " + difficulty : "") + "</p>" +
          '<p class="basket-row__unit muted">Instant download after checkout</p>' +
        "</div>" +
        '<p class="basket-row__total">' + rupees(item.price) + "</p>" +
        '<button type="button" class="basket-row__remove" data-remove="' + index + '">' +
          'Remove<span class="visually-hidden"> the ' + item.name + " pattern</span>" +
        "</button>" +
      "</li>";
    }).join("");

    basketRoot.innerHTML = '<ul class="basket-list">' + rows + "</ul>";
    paintSummary(items);
  }

  function paintSummary(items) {
    var sum = document.getElementById("basketSummary");
    if (!sum) { return; }
    sum.hidden = false;
    var subtotal = basketTotal(items);

    var el = function (id) { return document.getElementById(id); };
    if (el("sumCount")) {
      el("sumCount").textContent = items.length + " " + patternWord(items.length);
    }
    if (el("sumSubtotal")) { el("sumSubtotal").textContent = rupees(subtotal); }
    if (el("sumDelivery")) { el("sumDelivery").textContent = "Instant download"; }
    if (el("sumTotal")) { el("sumTotal").textContent = rupees(subtotal); }
  }

  if (basketRoot) {
    basketRoot.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-remove]");
      if (!btn) { return; }
      var index = Number(btn.dataset.remove);
      var items = readBasket();
      var removed = items[index];
      items.splice(index, 1);
      writeBasket(items);
      renderBasket();

      var live = document.getElementById("basketStatus");
      if (live && removed) {
        live.textContent = "The " + removed.name + " pattern was removed from your cart.";
      }
      var focusTarget = document.querySelector(".basket-row__remove") ||
                        document.querySelector(".basket-empty a");
      if (focusTarget) { focusTarget.focus(); }
    });

    renderBasket();
  }

  /* ---------- checkout page ---------- */
  var checkoutRoot = document.getElementById("checkoutSummary");

  if (checkoutRoot) {
    var checkoutItems = readBasket();

    if (!checkoutItems.length) {
      checkoutRoot.innerHTML =
        '<h2 id="coSummaryTitle">Your patterns</h2>' +
        '<p class="muted">Your cart is empty. ' +
        '<a class="link" href="index.html#patterns">Pick a pattern first</a>.</p>';
      var emptyForm = document.getElementById("checkoutForm");
      if (emptyForm) { emptyForm.hidden = true; }
    } else {
      var subtotal = basketTotal(checkoutItems);
      checkoutRoot.innerHTML =
        '<h2 id="coSummaryTitle">Your patterns</h2>' +
        '<ul class="checkout-lines">' +
          checkoutItems.map(function (i) {
            var entry = catalogueEntry(i.slug);
            var pages = (entry && entry.pages) || i.pages;
            return "<li><span>" + i.name +
              (pages ? ' <span class="muted">&middot; ' + pages + "-page PDF</span>" : "") +
              "</span><span>" + rupees(i.price) + "</span></li>";
          }).join("") +
        "</ul>" +
        '<dl class="checkout-totals">' +
          "<div><dt>Subtotal</dt><dd>" + rupees(subtotal) + "</dd></div>" +
          "<div><dt>Delivery</dt><dd>Instant download</dd></div>" +
          '<div class="is-total"><dt>Total</dt><dd>' + rupees(subtotal) + "</dd></div>" +
        "</dl>" +
        '<p class="summary__note">Digital files. Nothing is posted, so there is no address to give and no shipping to pay.</p>';
    }
  }

  var checkoutForm = document.getElementById("checkoutForm");
  if (checkoutForm) {
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var setError = function (fieldId, errorId, inputId, message) {
      var field = document.getElementById(fieldId);
      var error = document.getElementById(errorId);
      var input = document.getElementById(inputId);
      if (!field || !error || !input) { return; }
      if (message) {
        field.classList.add("is-invalid");
        error.textContent = "Error: " + message;
        input.setAttribute("aria-invalid", "true");
      } else {
        field.classList.remove("is-invalid");
        error.textContent = "";
        input.removeAttribute("aria-invalid");
      }
    };

    checkoutForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var checks = [
        ["coField-name", "coError-name", "co-name",
         document.getElementById("co-name").value.trim(),
         "Enter the name to put on the pattern licence."],
        ["coField-email", "coError-email", "co-email",
         document.getElementById("co-email").value.trim(),
         "Enter an email address — your download link goes there."]
      ];

      var firstInvalid = null;

      checks.forEach(function (c) {
        var fieldId = c[0], errorId = c[1], inputId = c[2], value = c[3], message = c[4];
        var problem = null;

        if (!value) {
          problem = message;
        } else if (inputId === "co-email" && !EMAIL_RE.test(value)) {
          problem = "That email address is missing an @ or a domain. Check it and try again.";
        }

        setError(fieldId, errorId, inputId, problem);
        if (problem && !firstInvalid) { firstInvalid = document.getElementById(inputId); }
      });

      var status = document.getElementById("checkoutStatus");

      if (firstInvalid) {
        firstInvalid.focus();
        if (status) {
          status.textContent = "Your patterns were not unlocked. Check the highlighted fields.";
        }
        return;
      }

      /* Nothing is transmitted and no payment is taken — this is a
         front-end demonstration of the flow. Wire it to a payment
         provider and a real file store before taking money. */
      var bought = readBasket();
      var total = basketTotal(bought);
      var ref = orderRef();
      var stamp = today();

      var library = readLibrary();
      bought.forEach(function (item) {
        if (library.some(function (p) { return p.slug === item.slug; })) { return; }
        library.push({
          slug: item.slug,
          name: item.name,
          price: item.price,
          image: item.image,
          pages: item.pages,
          difficulty: item.difficulty,
          purchasedAt: stamp,
          ref: ref
        });
      });
      writeLibrary(library);

      try { window.localStorage.removeItem(BASKET_KEY); } catch (e) {}
      paintCount();

      var done = document.getElementById("orderPlaced");
      if (done) {
        done.hidden = false;
        done.querySelector("[data-total]").textContent = rupees(total);
        done.querySelector("[data-count]").textContent =
          bought.length + " " + patternWord(bought.length);
        done.querySelector("[data-ref]").textContent = ref;

        var list = done.querySelector("[data-unlocked]");
        if (list) {
          list.innerHTML = bought.map(function (i) {
            var entry = catalogueEntry(i.slug);
            var image = entry ? entry.image : i.image;
            var pages = (entry && entry.pages) || i.pages;
            return '<li class="unlocked-row">' +
              '<img src="assets/img/' + image + '" alt="" width="72" height="72">' +
              '<div class="unlocked-row__info"><h3>' + i.name + "</h3>" +
              '<p class="muted">' + (pages ? pages + "-page PDF" : "PDF pattern") + "</p></div>" +
              '<button type="button" class="btn btn--secondary" data-download="' + i.slug + '">Download</button>' +
              "</li>";
          }).join("");
        }

        checkoutForm.hidden = true;
        if (checkoutRoot) { checkoutRoot.hidden = true; }
        done.setAttribute("tabindex", "-1");
        done.focus();
      }
    });
  }

  /* ---------- free patterns ----------
     A free pattern never goes through the basket: the four format
     buttons hand the file over directly. Taking any one of them is
     what puts the pattern in My patterns, so the visitor can find it
     again without having to remember which format they picked.

     What is stored is only "this browser has the Rosie Beanie". The
     format and the language are not recorded, because the row in the
     library links back to the product page, where all four formats and
     both languages already sit — one tap to come back in a different
     one, and nothing extra to keep in step.
  ------------------------------------------------------------------ */
  var freeForm = document.querySelector("[data-free-slug]");

  /* The four formats, in English, for the button the library row draws.
     Stored by key rather than by label so the row can be rendered in
     either language: i18n-hi.js translates these the way it translates
     the same four labels on the product page. */
  var FORMAT_LABELS = {
    "standard-pdf": "Download standard PDF",
    "browser": "Open in browser",
    "word": "Download Word file",
    "large-print-pdf": "Download large print PDF"
  };

  /* The same four formats named the way they read inside a sentence,
     for the line under the button. The format the row is already
     offering is left out of it: it is the one thing the reader
     demonstrably does not need pointing at. */
  var FORMAT_NAMES = {
    "standard-pdf": "standard PDF",
    "browser": "browser version",
    "word": "Word file",
    "large-print-pdf": "large print PDF"
  };

  function otherFormats(taken) {
    var names = ["standard-pdf", "large-print-pdf", "word", "browser"]
      .filter(function (key) { return key !== taken; })
      .map(function (key) { return FORMAT_NAMES[key]; });

    /* Written out as one sentence rather than assembled from fragments,
       so i18n-hi.js can translate each of the four whole — Hindi puts
       the clause together in a different order than a join would. */
    return "If you want the " + names.slice(0, -1).join(", ") +
           " or " + names[names.length - 1] + ", all are on the";
  }

  /* One row per pattern, and the row records the format last taken.
     Taking a different one later moves the row to it rather than adding
     a second: a list of everything ever clicked would be four rows for
     one hat, and someone whose PDF read badly would still be offered
     the PDF. Last taken wins.

     The href is read off the link at the moment of the click, so it
     carries the language pattern-lang.js has the page set to. The
     browser edition is the one that matters most here — it is not a
     file, so the library row is the only way back to it. */
  function rememberFree(slug, link) {
    var entry = catalogueEntry(slug);
    if (!entry) { return; }

    var format = link.dataset.format || null;
    var record = {
      slug: entry.slug,
      name: entry.name,
      price: entry.price,
      image: entry.image,
      difficulty: entry.difficulty,
      savedAt: today(),
      free: true,
      format: format,
      href: link.getAttribute("href"),
      /* "browser" is a page, not a download: no download attribute on
         the library button either, or the page saves as a file. */
      isFile: link.hasAttribute("download"),
      lang: link.getAttribute("hreflang") || "en"
    };

    var library = readLibrary();
    var existing = library.filter(function (p) { return p.slug === slug; })[0];
    if (existing) {
      Object.keys(record).forEach(function (key) { existing[key] = record[key]; });
    } else {
      library.push(record);
    }
    writeLibrary(library);
  }

  if (freeForm) {
    /* Delegated, so it covers every format link in the group — the two
       downloads, the Word file and the page that opens in the browser —
       and keeps covering them if a format is added later. The link is
       never intercepted: the file downloads exactly as it did before,
       and the library entry is written on the way past. */
    freeForm.addEventListener("click", function (event) {
      var link = event.target.closest("a[href]");
      if (!link) { return; }
      rememberFree(freeForm.dataset.freeSlug, link);
    });
  }

  /* ---------- pattern library page ---------- */
  var libraryRoot = document.getElementById("libraryRoot");

  function renderLibrary() {
    if (!libraryRoot) { return; }
    var owned = readLibrary();

    if (!owned.length) {
      libraryRoot.innerHTML =
        '<div class="basket-empty">' +
          "<h2>Nothing unlocked yet</h2>" +
          '<p class="muted">Patterns you download land here, and stay here. ' +
          "Open them as often as you like — a new hook, a new laptop, a lost file.</p>" +
          '<p><a class="btn btn--primary" href="index.html#patterns">Find your first pattern</a></p>' +
        "</div>";
      return;
    }

    libraryRoot.innerHTML =
      '<ul class="library-list">' +
      owned.map(function (item) {
        var entry = catalogueEntry(item.slug);
        var image = entry ? entry.image : item.image;
        var description = entry ? entry.alt : item.name;
        var difficulty = (entry && entry.difficulty) || item.difficulty || "";
        var pages = (entry && entry.pages) || item.pages;

        /* A free pattern's real files live on its product page, in four
           formats and two languages. So its row sends the reader back
           there rather than repeating one format here, and it says
           "Free pattern" rather than a page count that would only
           describe one of the four. A bought pattern keeps the
           download button, which is what the order paid for. */
        var summary = item.free
          ? "Free pattern"
          : (pages ? pages + "-page PDF" : "PDF pattern");

        /* The row hands back the exact file that was taken, in the
           language it was taken in — the one thing the product page
           cannot do, because it does not know what was chosen and
           would make the reader choose again.

           The line under it is the way out: the other three formats
           are named and one link away. It matters most for a reader
           whose format did not suit them — the large print PDF reads
           badly in Acrobat, which is why the Word file exists — and
           listing the alternatives here saves them working out that
           the product page is where to start over. */
        var label = FORMAT_LABELS[item.format];
        var freeAction = label && item.href
          ? '<a class="btn btn--primary" href="' + item.href + '"' +
              (item.isFile ? " download" : "") +
              ' hreflang="' + (item.lang || "en") + '"' +
              (item.lang === "hi"
                ? ' aria-label="' + label + ', in Hindi: ' + item.name + '"'
                : "") +
              ">" + label +
              "<span class=\"visually-hidden\">: " + item.name + "</span>" +
            "</a>" +
            '<p class="library-card__other muted">' + otherFormats(item.format) +
              ' <a class="link" href="product-' + item.slug + '.html">pattern page</a>.</p>'
          /* An entry saved before formats were recorded, or one whose
             format has since gone: the product page still works. */
          : '<a class="btn btn--primary" href="product-' + item.slug + '.html">' +
              "Open the pattern<span class=\"visually-hidden\">: " + item.name + "</span>" +
            "</a>";

        var action = item.free
          ? freeAction
          : '<button type="button" class="btn btn--primary" data-download="' + item.slug + '">' +
              "Download pattern<span class=\"visually-hidden\">: " + item.name + "</span>" +
            "</button>" +
            '<a class="link" href="product-' + item.slug + '.html">See the finished piece</a>';

        return '<li class="library-card">' +
          '<div class="library-card__media">' +
            '<img src="assets/img/' + image + '" alt="' + description + '" width="240" height="240">' +
          "</div>" +
          '<div class="library-card__info">' +
            "<h3>" + item.name + "</h3>" +
            '<p class="muted">' + summary +
              (difficulty ? " · " + difficulty : "") +
            "</p>" +
            '<p class="library-card__meta muted">' +
              (item.free
                ? "Saved " + (item.savedAt || "")
                : "Unlocked " + (item.purchasedAt || "") +
                  (item.ref ? " · order " + item.ref : "")) +
            "</p>" +
            '<div class="library-card__actions">' + action + "</div>" +
          "</div>" +
        "</li>";
      }).join("") +
      "</ul>";
  }

  if (libraryRoot) { renderLibrary(); }

  /* One delegated handler covers the library page and the
     just-unlocked list on the checkout confirmation. */
  document.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-download]");
    if (!btn) { return; }
    var wanted = btn.dataset.download;
    var ok = downloadPattern(wanted);
    var live = document.getElementById("libraryStatus") ||
               document.getElementById("checkoutStatus");
    if (live) {
      live.textContent = ok
        ? "Your pattern file is downloading. It stays in My patterns — come back for it any time."
        : "That pattern is not in your library yet.";
    }
  });

  paintCount();
})();
