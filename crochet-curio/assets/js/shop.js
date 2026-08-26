/* ============================================================
   Crochet Curio — basket and checkout
   State lives in localStorage under one key. Every read is
   defensive: a private window, cleared storage or a browser that
   blocks site data must still render a working page.
   ============================================================ */
(function () {
  "use strict";

  var KEY = "crochet-curio-basket";

  /* ---------- storage ---------- */
  function readBasket() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeBasket(items) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch (e) {
      /* storage unavailable — the page still works for this visit */
    }
    paintCount();
  }

  /* ---------- formatting ---------- */
  function rupees(n) {
    return "₹" + Number(n).toLocaleString("en-IN");
  }

  function lineTotal(item) { return item.price * item.qty; }

  function basketTotal(items) {
    return items.reduce(function (sum, i) { return sum + lineTotal(i); }, 0);
  }

  function shipping(subtotal) {
    return subtotal >= 2500 || subtotal === 0 ? 0 : 150;
  }

  function countItems(items) {
    return items.reduce(function (n, i) { return n + i.qty; }, 0);
  }

  /* ---------- header count ---------- */
  function paintCount() {
    var n = countItems(readBasket());
    var badge = document.getElementById("cartCount");
    var label = document.getElementById("cartCountLabel");
    if (badge) {
      badge.textContent = String(n);
      badge.classList.toggle("is-empty", n === 0);
    }
    if (label) {
      label.textContent = ", " + n + (n === 1 ? " item" : " items");
    }
  }

  /* ---------- add to basket (product pages) ---------- */
  var buyForm = document.getElementById("buyForm");
  if (buyForm) {
    buyForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var sizeInput = buyForm.querySelector('input[name="size"]:checked');
      var size = sizeInput ? sizeInput.value : "One size";
      var qtyField = document.getElementById("qty");
      var qty = Math.max(1, Math.min(10, parseInt(qtyField.value, 10) || 1));
      qtyField.value = qty;

      var slug = buyForm.dataset.slug;
      var items = readBasket();

      /* same piece in the same size stacks rather than duplicating */
      var existing = items.filter(function (i) {
        return i.slug === slug && i.size === size;
      })[0];

      if (existing) {
        existing.qty = Math.min(10, existing.qty + qty);
      } else {
        items.push({
          slug: slug,
          name: buyForm.dataset.name,
          price: Number(buyForm.dataset.price),
          image: buyForm.dataset.image,
          size: size,
          qty: qty
        });
      }

      writeBasket(items);

      var status = document.getElementById("buyStatus");
      if (status) {
        status.textContent = buyForm.dataset.name + " (" + size + ") added to your basket. " +
          countItems(items) + " item" + (countItems(items) === 1 ? "" : "s") + " total.";
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
          "<h2>Your basket is empty</h2>" +
          "<p class=\"muted\">Nothing here yet. The collection is six pieces deep.</p>" +
          '<p><a class="btn btn--primary" href="index.html#shop">Browse the collection</a></p>' +
        "</div>";
      var sum = document.getElementById("basketSummary");
      if (sum) { sum.hidden = true; }
      return;
    }

    var rows = items.map(function (item, index) {
      /* Resolve the image from the catalogue by slug rather than trusting the
         stored filename — a basket saved before a photo was renamed would
         otherwise point at a file that no longer exists. */
      var entry = (window.CATALOGUE || []).filter(function (c) {
        return c.slug === item.slug;
      })[0];
      var image = entry ? entry.image : item.image;
      var description = entry ? entry.alt : item.name;

      return '<li class="basket-row">' +
        '<div class="basket-row__media">' +
          '<img src="assets/img/' + image + '" alt="' + description + '" width="160" height="160">' +
        "</div>" +
        '<div class="basket-row__info">' +
          "<h3>" + item.name + "</h3>" +
          '<p class="muted">Size: ' + item.size + "</p>" +
          '<p class="basket-row__unit muted">' + rupees(item.price) + " each</p>" +
        "</div>" +
        '<div class="basket-row__qty">' +
          '<label class="visually-hidden" for="qty-' + index + '">Quantity of ' + item.name + ", size " + item.size + "</label>" +
          '<input type="number" id="qty-' + index + '" value="' + item.qty + '" min="1" max="10" step="1" inputmode="numeric" data-index="' + index + '">' +
        "</div>" +
        '<p class="basket-row__total">' + rupees(lineTotal(item)) + "</p>" +
        '<button type="button" class="basket-row__remove" data-remove="' + index + '">' +
          "Remove<span class=\"visually-hidden\"> " + item.name + ", size " + item.size + "</span>" +
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
    var ship = shipping(subtotal);

    var el = function (id) { return document.getElementById(id); };
    if (el("sumSubtotal")) { el("sumSubtotal").textContent = rupees(subtotal); }
    if (el("sumShipping")) {
      el("sumShipping").textContent = ship === 0 ? "Free" : rupees(ship);
    }
    if (el("sumTotal")) { el("sumTotal").textContent = rupees(subtotal + ship); }
    if (el("sumNote")) {
      el("sumNote").textContent = ship === 0
        ? "Shipping is on us."
        : "Spend " + rupees(2500 - subtotal) + " more for free shipping.";
    }
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
        live.textContent = removed.name + " removed from your basket.";
      }
      var focusTarget = document.querySelector(".basket-row__remove") ||
                        document.querySelector(".basket-empty a");
      if (focusTarget) { focusTarget.focus(); }
    });

    basketRoot.addEventListener("change", function (event) {
      var field = event.target.closest("input[data-index]");
      if (!field) { return; }
      var index = Number(field.dataset.index);
      var items = readBasket();
      if (!items[index]) { return; }
      items[index].qty = Math.max(1, Math.min(10, parseInt(field.value, 10) || 1));
      writeBasket(items);
      renderBasket();

      var live = document.getElementById("basketStatus");
      if (live) {
        live.textContent = "Quantity updated. Basket total " +
          rupees(basketTotal(items) + shipping(basketTotal(items))) + ".";
      }
    });

    renderBasket();
  }

  /* ---------- checkout page ---------- */
  var checkoutRoot = document.getElementById("checkoutSummary");

  if (checkoutRoot) {
    var items = readBasket();

    if (!items.length) {
      checkoutRoot.innerHTML =
        '<p class="muted">Your basket is empty. ' +
        '<a class="link" href="index.html#shop">Pick something first</a>.</p>';
      var form = document.getElementById("checkoutForm");
      if (form) { form.hidden = true; }
    } else {
      var subtotal = basketTotal(items);
      var ship = shipping(subtotal);
      checkoutRoot.innerHTML =
        '<ul class="checkout-lines">' +
          items.map(function (i) {
            return "<li><span>" + i.name + " &middot; " + i.size +
              (i.qty > 1 ? " &times; " + i.qty : "") +
              "</span><span>" + rupees(lineTotal(i)) + "</span></li>";
          }).join("") +
        "</ul>" +
        '<dl class="checkout-totals">' +
          "<div><dt>Subtotal</dt><dd>" + rupees(subtotal) + "</dd></div>" +
          "<div><dt>Shipping</dt><dd>" + (ship === 0 ? "Free" : rupees(ship)) + "</dd></div>" +
          '<div class="is-total"><dt>Total</dt><dd>' + rupees(subtotal + ship) + "</dd></div>" +
        "</dl>";
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
        ["coField-name", "coError-name", "co-name", document.getElementById("co-name").value.trim(), "Enter the name for this order."],
        ["coField-email", "coError-email", "co-email", document.getElementById("co-email").value.trim(), "Enter an email address for the order confirmation."],
        ["coField-address", "coError-address", "co-address", document.getElementById("co-address").value.trim(), "Enter the street address for delivery."],
        ["coField-city", "coError-city", "co-city", document.getElementById("co-city").value.trim(), "Enter the town or city."],
        ["coField-pin", "coError-pin", "co-pin", document.getElementById("co-pin").value.trim(), "Enter a 6-digit PIN code."]
      ];

      var firstInvalid = null;

      checks.forEach(function (c) {
        var fieldId = c[0], errorId = c[1], inputId = c[2], value = c[3], message = c[4];
        var problem = null;

        if (!value) {
          problem = message;
        } else if (inputId === "co-email" && !EMAIL_RE.test(value)) {
          problem = "That email address is missing an @ or a domain. Check it and try again.";
        } else if (inputId === "co-pin" && !/^\d{6}$/.test(value)) {
          problem = "A PIN code is exactly 6 digits.";
        }

        setError(fieldId, errorId, inputId, problem);
        if (problem && !firstInvalid) { firstInvalid = document.getElementById(inputId); }
      });

      var status = document.getElementById("checkoutStatus");

      if (firstInvalid) {
        firstInvalid.focus();
        if (status) { status.textContent = "Your order was not placed. Check the highlighted fields."; }
        return;
      }

      /* Nothing is transmitted — this is a front-end demonstration of the
         flow. Wire it to a real payment provider before taking money. */
      var placed = readBasket();
      var total = basketTotal(placed) + shipping(basketTotal(placed));
      try { window.localStorage.removeItem(KEY); } catch (e) {}
      paintCount();

      var done = document.getElementById("orderPlaced");
      if (done) {
        done.hidden = false;
        done.querySelector("[data-total]").textContent = rupees(total);
        done.querySelector("[data-count]").textContent =
          countItems(placed) + (countItems(placed) === 1 ? " piece" : " pieces");
        checkoutForm.hidden = true;
        var summary = document.getElementById("checkoutSummary");
        if (summary) { summary.hidden = true; }
        done.setAttribute("tabindex", "-1");
        done.focus();
      }
    });
  }

  paintCount();
})();
