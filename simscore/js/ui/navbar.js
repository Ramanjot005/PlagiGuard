/* =========================================================
   navbar.js
   1. Mobile menu open / close (hamburger button)
   2. Marks the link of the current page as "active"
   3. Dashboard sidebar open / close on small screens

   Only navigation behaviour. No project algorithm here.
   ========================================================= */

/* ---------- 1. Mobile top menu ---------- */
function setupMobileMenu() {
  const toggleButton = document.getElementById("navToggle");
  const menu = document.getElementById("navLinks");

  // some pages may not have a menu, so we check first
  if (toggleButton === null || menu === null) {
    return;
  }

  toggleButton.addEventListener("click", function () {
    menu.classList.toggle("open");
  });

  // close the menu after a link is clicked
  const links = menu.querySelectorAll("a");

  links.forEach(function (link) {
    link.addEventListener("click", function () {
      menu.classList.remove("open");
    });
  });
}


/* ---------- 2. Highlight the current page ---------- */
function markActiveLink() {
  // location.pathname looks like "/simscore/about.html"
  const path = window.location.pathname;
  const parts = path.split("/");
  let fileName = parts[parts.length - 1];

  // if the address ends with "/" the page is index.html
  if (fileName === "") {
    fileName = "index.html";
  }

  const links = document.querySelectorAll(".nav-links a, .side-link");

  links.forEach(function (link) {
    const href = link.getAttribute("href");

    if (href === fileName) {
      link.classList.add("active");
    }
  });
}


/* ---------- 3. Dashboard sidebar (tablet + mobile) ---------- */
function setupSidebar() {
  const openButton = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (openButton === null || sidebar === null) {
    return;
  }

  function openSidebar() {
    sidebar.classList.add("open");
    if (overlay) {
      overlay.classList.add("show");
    }
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    if (overlay) {
      overlay.classList.remove("show");
    }
  }

  openButton.addEventListener("click", function () {
    if (sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  // clicking a sidebar link closes the drawer on phones
  const sideLinks = sidebar.querySelectorAll(".side-link");

  sideLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      if (window.innerWidth <= 992) {
        closeSidebar();
      }
    });
  });

  // if the user rotates the phone / makes the window big again,
  // the drawer must not stay stuck open
  window.addEventListener("resize", function () {
    if (window.innerWidth > 992) {
      closeSidebar();
    }
  });
}


/* ---------- 4. Start everything when the page is ready ---------- */
document.addEventListener("DOMContentLoaded", function () {
  setupMobileMenu();
  markActiveLink();
  setupSidebar();
});
