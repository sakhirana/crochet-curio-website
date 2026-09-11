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

  function setError(fieldId, errorId, inputId, message) {
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
  }

  function announce(statusId, message) {
    var status = document.getElementById(statusId);
    if (status) { status.textContent = message; }
  }

  /* ---------- Newsletter ---------- */
  var newsletter = document.getElementById("newsletterForm");
  if (newsletter) {
    newsletter.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = document.getElementById("newsletterEmail");
      var value = input.value.trim();
      announce("newsletterStatus", "");

      if (!value) {
        setError("emailField", "newsletterError", "newsletterEmail",
                 "Enter your email address so we know where to send new pattern releases.");
        input.focus();
        return;
      }
      if (!EMAIL_RE.test(value)) {
        setError("emailField", "newsletterError", "newsletterEmail",
                 "That email address is missing an @ or a domain. Check it and try again.");
        input.focus();
        return;
      }

      setError("emailField", "newsletterError", "newsletterEmail", null);
      newsletter.reset();
      announce("newsletterStatus", "Thank you. You are on the list. We will write when the next pattern is ready.");
    });
  }

  /* ---------- Contact ---------- */
  var contact = document.getElementById("contactForm");
  if (contact) {
    contact.addEventListener("submit", function (event) {
      event.preventDefault();
      announce("contactStatus", "");

      var name = document.getElementById("contactName");
      var email = document.getElementById("contactEmail");
      var message = document.getElementById("contactMessage");
      var firstInvalid = null;

      if (!name.value.trim()) {
        setError("nameField", "nameError", "contactName", "Enter your name.");
        firstInvalid = firstInvalid || name;
      } else {
        setError("nameField", "nameError", "contactName", null);
      }

      var emailValue = email.value.trim();
      if (!emailValue) {
        setError("contactEmailField", "contactEmailError", "contactEmail",
                 "Enter your email address so we can reply.");
        firstInvalid = firstInvalid || email;
      } else if (!EMAIL_RE.test(emailValue)) {
        setError("contactEmailField", "contactEmailError", "contactEmail",
                 "That email address is missing an @ or a domain. Check it and try again.");
        firstInvalid = firstInvalid || email;
      } else {
        setError("contactEmailField", "contactEmailError", "contactEmail", null);
      }

      if (!message.value.trim()) {
        setError("messageField", "messageError", "contactMessage",
                 "Tell us what you would like help with.");
        firstInvalid = firstInvalid || message;
      } else {
        setError("messageField", "messageError", "contactMessage", null);
      }

      if (firstInvalid) {
        firstInvalid.focus();
        announce("contactStatus", "Your message was not sent. Check the highlighted fields above.");
        return;
      }

      contact.reset();
      announce("contactStatus", "Thank you. Your message is on its way. We reply within two working days.");
    });
  }
})();
