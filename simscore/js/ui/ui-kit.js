/* =========================================================
   ui-kit.js
   Small reusable UI helpers used by every page:
   toast, modal, loader, empty state and text helpers.

   NOTE: This file only touches the screen (DOM).
   It has NO similarity logic and NO storage logic.
   ========================================================= */

/* ---------------------------------------------------------
   1. TOAST  -  small message in the bottom right corner
   Usage:  UI.toast("Saved", "ok");
   --------------------------------------------------------- */
function createToastArea() {
  // if the area already exists we reuse it
  let area = document.getElementById("toastArea");

  if (area === null) {
    area = document.createElement("div");
    area.id = "toastArea";
    document.body.appendChild(area);
  }

  return area;
}

function showToast(message, type) {
  const area = createToastArea();

  // default type is "info"
  if (!type) {
    type = "info";
  }

  const box = document.createElement("div");
  box.className = "toast toast-" + type;
  box.textContent = message;

  area.appendChild(box);

  // remove the toast after 3 seconds
  setTimeout(function () {
    box.remove();
  }, 3000);
}


/* ---------------------------------------------------------
   2. MODAL  -  open / close a dialog box
   The HTML must be:  <div class="modal" id="myModal"> ... </div>
   --------------------------------------------------------- */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("open");
    document.body.style.overflow = "hidden"; // stop the page scrolling
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
}

/* Any element with data-modal-open="id" opens that modal,
   any element with data-modal-close="id" closes it.
   We attach ONE click listener on the document (event delegation). */
function setupModals() {
  document.addEventListener("click", function (event) {
    const target = event.target;

    const openId = target.getAttribute("data-modal-open");
    if (openId) {
      openModal(openId);
    }

    const closeId = target.getAttribute("data-modal-close");
    if (closeId) {
      closeModal(closeId);
    }

    // clicking on the dark background also closes the modal
    if (target.classList.contains("modal")) {
      target.classList.remove("open");
      document.body.style.overflow = "";
    }
  });

  // Escape key closes any open modal
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      const openBoxes = document.querySelectorAll(".modal.open");
      openBoxes.forEach(function (box) {
        box.classList.remove("open");
      });
      document.body.style.overflow = "";
    }
  });
}


/* ---------------------------------------------------------
   3. LOADER  -  spinner shown while data is being prepared
   --------------------------------------------------------- */
function showLoader(box, text) {
  if (!box) {
    return;
  }

  const message = text ? text : "Loading...";

  box.innerHTML =
    '<div class="loader">' +
      '<div class="spinner"></div>' +
      "<span>" + escapeText(message) + "</span>" +
    "</div>";
}


/* ---------------------------------------------------------
   4. EMPTY STATE  -  shown when a list has zero items
   --------------------------------------------------------- */
function showEmpty(box, options) {
  if (!box) {
    return;
  }

  const icon = options.icon ? options.icon : "!";
  const title = options.title ? options.title : "Nothing here yet";
  const text = options.text ? options.text : "";
  let action = "";

  if (options.buttonText) {
    // data-modal-open is handled by setupModals()
    action =
      '<button class="btn btn-primary btn-sm" data-modal-open="' +
      escapeText(options.buttonTarget) + '">' +
      escapeText(options.buttonText) + "</button>";
  }

  box.innerHTML =
    '<div class="empty">' +
      '<div class="empty-icon">' + escapeText(icon) + "</div>" +
      "<h3>" + escapeText(title) + "</h3>" +
      "<p>" + escapeText(text) + "</p>" +
      action +
    "</div>";
}


/* ---------------------------------------------------------
   5. TEXT HELPERS
   --------------------------------------------------------- */

/* Never trust user text inside innerHTML.
   This converts < > & " into safe characters. */
function escapeText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Cuts a very long student name or assignment title.
   Example: shortText("Very very long title...", 30) */
function shortText(value, maxLength) {
  const text = String(value === undefined || value === null ? "" : value);

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 1) + "\u2026"; // … character
}

/* Makes initials for the round avatar: "Harmanpreet Kaur" -> "HK" */
function getInitials(name) {
  const clean = String(name === undefined || name === null ? "" : name).trim();

  if (clean === "") {
    return "?";
  }

  const parts = clean.split(/\s+/);
  let initials = parts[0].charAt(0);

  if (parts.length > 1) {
    initials = initials + parts[parts.length - 1].charAt(0);
  }

  return initials.toUpperCase();
}


/* ---------------------------------------------------------
   6. Export the helpers in one object called UI
   --------------------------------------------------------- */
const UI = {
  toast: showToast,
  openModal: openModal,
  closeModal: closeModal,
  setupModals: setupModals,
  showLoader: showLoader,
  showEmpty: showEmpty,
  escape: escapeText,
  short: shortText,
  initials: getInitials
};

// modal buttons should work on every page
document.addEventListener("DOMContentLoaded", function () {
  UI.setupModals();
});
