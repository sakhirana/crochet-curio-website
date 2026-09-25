/* ============================================================
   Crochet Curio — behaviour
   Everything here is keyboard-operable and pointer-optional.
   No dragging is required anywhere on the site (2.5.7).
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Mobile navigation disclosure ---------- */
  var toggle = document.getElementById("navToggle");
  var navList = document.getElementById("navList");

  if (toggle && navList) {
    var closeNav = function (returnFocus) {
      navList.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      if (returnFocus) { toggle.focus(); }
    };

    toggle.addEventListener("click", function () {
      var isOpen = navList.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    /* Escape closes the menu and returns focus to the trigger (2.1.2) */
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navList.classList.contains("is-open")) {
        closeNav(true);
      }
    });

    /* Following a link closes the menu so the target is not obscured (2.4.11) */
    navList.addEventListener("click", function (event) {
      if (event.target.closest("a")) { closeNav(false); }
    });

    /* Clicking outside dismisses it, without trapping focus */
    document.addEventListener("click", function (event) {
      if (!navList.classList.contains("is-open")) { return; }
      if (!navList.contains(event.target) && !toggle.contains(event.target)) {
        closeNav(false);
      }
    });
  }

  /* ---------- Accessible form validation ----------
     Errors are described in text, tied to the input with aria-describedby,
     announced through a live region, and never signalled by colour alone
     (1.4.1, 3.3.1, 3.3.3).
  ------------------------------------------------- */

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* "Error:" is drawn as Icon/Status/Error/16 by the stylesheet, so the word
     itself is written visually hidden: the icon carries it on screen, the
     text carries it to a screen reader, and the message reads the same
     either way (1.1.1, 3.3.1). */
  function writeError(error, message) {
    var label = document.createElement("span");
    label.className = "visually-hidden";
    label.textContent = "Error: ";
    error.textContent = "";
    error.appendChild(label);
    error.appendChild(document.createTextNode(message));
  }

  function setError(fieldId, errorId, inputId, message, check) {
    var field = document.getElementById(fieldId);
    var error = document.getElementById(errorId);
    var input = document.getElementById(inputId);
    if (!field || !error || !input) { return; }

    if (message) {
      field.classList.add("is-invalid");
      writeError(error, message);
      input.setAttribute("aria-invalid", "true");
      watch(fieldId, errorId, inputId, check);
    } else {
      field.classList.remove("is-invalid");
      error.textContent = "";
      input.removeAttribute("aria-invalid");
    }
  }

  /* Once a field has gone wrong it stays wrong — red stroke, red focus ring —
     until what is typed passes the same check that failed. Waiting for the
     next submit would leave a corrected field still reading as an error, and
     would mean the red only ever clears on a keypress the reader may not
     make. So the field re-checks itself on every keystroke from the moment it
     goes invalid, and clears the instant it passes.

     Only fields that have already failed are watched. Nothing turns red while
     the reader is still typing their first attempt: a field goes invalid on
     submit and nowhere else (3.3.1). `check` takes the trimmed value and
     returns the problem, or null when there is none. */
  var watched = {};

  function watch(fieldId, errorId, inputId, check) {
    var input = document.getElementById(inputId);
    if (!input || !check || watched[inputId]) { return; }
    watched[inputId] = true;
    input.addEventListener("input", function () {
      if (!check(input.value.trim())) {
        setError(fieldId, errorId, inputId, null);
      }
    });
  }

  function emailProblem(missing) {
    return function (value) {
      if (!value) { return missing; }
      if (!EMAIL_RE.test(value)) {
        return "That email address is missing an @ or a domain. Check it and try again.";
      }
      return null;
    };
  }

  function requiredProblem(missing) {
    return function (value) { return value ? null : missing; };
  }

  function announce(statusId, message) {
    var status = document.getElementById(statusId);
    if (status) { status.textContent = message; }
  }

  /* ---------- Newsletter ---------- */
  var newsletter = document.getElementById("newsletterForm");
  if (newsletter) {
    var newsletterCheck = emailProblem(
      "Enter your email address so we know where to send new pattern releases.");

    newsletter.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = document.getElementById("newsletterEmail");
      announce("newsletterStatus", "");

      var problem = newsletterCheck(input.value.trim());
      setError("emailField", "newsletterError", "newsletterEmail", problem, newsletterCheck);
      if (problem) {
        input.focus();
        return;
      }

      var newsletterButton = newsletter.querySelector("button[type='submit']");
      if (newsletterButton) { newsletterButton.disabled = true; }
      announce("newsletterStatus", "Adding you to the list...");

      fetch(newsletter.action, {
        method: "POST",
        body: new FormData(newsletter),
        headers: { Accept: "application/json" }
      }).then(function (response) {
        if (response.ok) {
          newsletter.reset();
          announce("newsletterStatus", "Thank you. You are on the list. We will write when the next pattern is ready.");
        } else {
          return response.json().then(function (data) {
            var message = data && data.errors && data.errors.length
              ? data.errors.map(function (e) { return e.message; }).join(" ")
              : "Something went wrong. Please try again, or email us to be added.";
            announce("newsletterStatus", message);
          });
        }
      }).catch(function () {
        announce("newsletterStatus", "We could not reach the server. Check your connection and try again.");
      }).then(function () {
        if (newsletterButton) { newsletterButton.disabled = false; }
      });
    });
  }

  /* ---------- Contact ---------- */
  /* One row per field, so submit and the keystroke re-check run the same
     check and can never disagree about whether a field is still wrong. */
  var CONTACT_FIELDS = [
    { fieldId: "nameField", errorId: "nameError", inputId: "contactName",
      check: requiredProblem("Enter your name.") },
    { fieldId: "contactEmailField", errorId: "contactEmailError", inputId: "contactEmail",
      check: emailProblem("Enter your email address so we can reply.") },
    { fieldId: "messageField", errorId: "messageError", inputId: "contactMessage",
      check: requiredProblem("Tell us what you would like help with.") }
  ];

  var contact = document.getElementById("contactForm");
  if (contact) {
    contact.addEventListener("submit", function (event) {
      event.preventDefault();
      announce("contactStatus", "");

      var firstInvalid = null;

      CONTACT_FIELDS.forEach(function (f) {
        var input = document.getElementById(f.inputId);
        if (!input) { return; }
        var problem = f.check(input.value.trim());
        setError(f.fieldId, f.errorId, f.inputId, problem, f.check);
        if (problem && !firstInvalid) { firstInvalid = input; }
      });

      if (firstInvalid) {
        firstInvalid.focus();
        announce("contactStatus", "Your message was not sent. Check the highlighted fields above.");
        return;
      }

      var submitButton = contact.querySelector("button[type='submit']");
      if (submitButton) { submitButton.disabled = true; }
      announce("contactStatus", "Sending your message...");

      fetch(contact.action, {
        method: "POST",
        body: new FormData(contact),
        headers: { Accept: "application/json" }
      }).then(function (response) {
        if (response.ok) {
          contact.reset();
          announce("contactStatus", "Thank you. Your message has been received. We reply within two business days.");
        } else {
          return response.json().then(function (data) {
            var problem = data && data.errors && data.errors.length
              ? data.errors.map(function (e) { return e.message; }).join(" ")
              : "Something went wrong sending your message. Please email us directly and we will get back to you.";
            announce("contactStatus", problem);
          });
        }
      }).catch(function () {
        announce("contactStatus", "We could not reach the server. Check your connection, or email us directly, and try again.");
      }).then(function () {
        if (submitButton) { submitButton.disabled = false; }
      });
    });
  }
})();
