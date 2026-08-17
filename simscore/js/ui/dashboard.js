/* =========================================================
   dashboard.js
   Draws the dashboard on the screen.

   TEAM RULE:
   This file does NOT create n-grams, does NOT compute Jaccard
   similarity and does NOT read / write LocalStorage.

   It only asks the logic team's object for ready-made data:

        window.SimScoreAPI.getStats()        -> object
        window.SimScoreAPI.getSubmissions()  -> array
        window.SimScoreAPI.getPairs()        -> array
        window.SimScoreAPI.getActivity()     -> array
        window.SimScoreAPI.saveSubmission(o) -> object

   If that object does not exist yet, we use a small sample
   array so the UI can be shown and tested. Nothing on this
   page is a permanently hardcoded final number.
   ========================================================= */


/* =========================================================
   PART 1 - SAMPLE DATA (only used until the logic file is ready)
   ========================================================= */

const sampleSubmissions = [
  {
    id: "s1",
    student: "Aarav Sharma",
    title: "Essay on Renewable Energy Sources in Rural Punjab",
    words: 642,
    date: "2026-08-12",
    top: 0.18
  },
  {
    id: "s2",
    student: "Harmanpreet Kaur Sidhu Brar Chahal",
    title: "A Detailed Comparative Study of Renewable and Non Renewable Energy Sources for Semester Four Assignment Submission",
    words: 1180,
    date: "2026-08-12",
    top: 0.81
  },
  {
    id: "s3",
    student: "Rohit Verma",
    title: "Renewable Energy Report",
    words: 970,
    date: "2026-08-13",
    top: 0.79
  },
  {
    id: "s4",
    student: "Simran Kaur",
    title: "Solar Power Adoption Study",
    words: 528,
    date: "2026-08-13",
    top: 0.34
  },
  {
    id: "s5",
    student: "Mohit Bansal",
    title: "Wind Energy Notes",
    words: 305,
    date: "2026-08-14",
    top: 0.11
  }
];

const samplePairs = [
  { a: "Harmanpreet Kaur Sidhu Brar Chahal", b: "Rohit Verma", score: 0.81, shared: 214 },
  { a: "Aarav Sharma", b: "Simran Kaur", score: 0.34, shared: 61 },
  { a: "Simran Kaur", b: "Rohit Verma", score: 0.27, shared: 44 },
  { a: "Aarav Sharma", b: "Mohit Bansal", score: 0.11, shared: 18 }
];

const sampleActivity = [
  { who: "Rohit Verma", what: "submitted an assignment", when: "10 minutes ago" },
  { who: "System", what: "compared 5 submissions (10 pairs)", when: "10 minutes ago" },
  { who: "Harmanpreet Kaur Sidhu Brar Chahal", what: "flagged at 81% similarity", when: "12 minutes ago" },
  { who: "Simran Kaur", what: "submitted an assignment", when: "1 hour ago" }
];


/* =========================================================
   PART 2 - GET DATA (from the logic team, or the sample)
   ========================================================= */

function hasApi(functionName) {
  return (
    window.SimScoreAPI &&
    typeof window.SimScoreAPI[functionName] === "function"
  );
}

function getSubmissions() {
  if (hasApi("getSubmissions")) {
    return window.SimScoreAPI.getSubmissions();
  }
  return sampleSubmissions;
}

function getPairs() {
  if (hasApi("getPairs")) {
    return window.SimScoreAPI.getPairs();
  }
  return samplePairs;
}

function getActivity() {
  if (hasApi("getActivity")) {
    return window.SimScoreAPI.getActivity();
  }
  return sampleActivity;
}

/* The summary cards are calculated from the lists,
   so the numbers change automatically when data changes. */
function getStats() {
  if (hasApi("getStats")) {
    return window.SimScoreAPI.getStats();
  }

  const submissions = getSubmissions();
  const pairs = getPairs();

  // total number of pairs = n * (n - 1) / 2
  const total = submissions.length;
  const pairCount = (total * (total - 1)) / 2;

  // filter() keeps only the pairs above the warning limit
  const flagged = pairs.filter(function (pair) {
    return pair.score >= 0.60;
  });

  // reduce() adds all the scores together to get an average
  let average = 0;

  if (pairs.length > 0) {
    const sum = pairs.reduce(function (running, pair) {
      return running + pair.score;
    }, 0);

    average = sum / pairs.length;
  }

  return {
    submissions: total,
    pairs: pairCount,
    flagged: flagged.length,
    average: average
  };
}


/* =========================================================
   PART 3 - SMALL FORMAT HELPERS
   ========================================================= */

/* 0.81  ->  "81%" */
function toPercent(score) {
  return Math.round(score * 100) + "%";
}

/* Decides the risk level from the score */
function getRisk(score) {
  if (score >= 0.75) {
    return { label: "High risk", badge: "badge-danger", heat: "heat-4" };
  }

  if (score >= 0.60) {
    return { label: "Review", badge: "badge-warn", heat: "heat-3" };
  }

  if (score >= 0.35) {
    return { label: "Low", badge: "badge-info", heat: "heat-2" };
  }

  return { label: "Safe", badge: "badge-ok", heat: "heat-1" };
}


/* =========================================================
   PART 4 - RENDER THE SUMMARY CARDS
   ========================================================= */

function renderStats() {
  const box = document.getElementById("statsRow");

  if (box === null) {
    return;
  }

  const stats = getStats();

  // an array of card descriptions, then map() builds the HTML
  const cards = [
    {
      label: "Submissions",
      value: stats.submissions,
      note: "Stored for this assignment"
    },
    {
      label: "Pairs compared",
      value: stats.pairs,
      note: "Every submission vs every other"
    },
    {
      label: "Flagged pairs",
      value: stats.flagged,
      note: "Similarity 60% or above"
    },
    {
      label: "Average similarity",
      value: toPercent(stats.average),
      note: "Across all compared pairs"
    }
  ];

  const html = cards.map(function (card) {
    return (
      '<div class="stat-card">' +
        '<div class="stat-label">' + UI.escape(card.label) + "</div>" +
        '<div class="stat-value">' + UI.escape(card.value) + "</div>" +
        '<div class="stat-note">' + UI.escape(card.note) + "</div>" +
      "</div>"
    );
  });

  // join("") turns the array of strings into one big string
  box.innerHTML = html.join("");
}


/* =========================================================
   PART 5 - RENDER THE SUBMISSIONS TABLE
   ========================================================= */

function renderSubmissions(searchText) {
  const box = document.getElementById("submissionsBox");

  if (box === null) {
    return;
  }

  let list = getSubmissions();

  // search by student name or assignment title
  if (searchText && searchText.trim() !== "") {
    const needle = searchText.trim().toLowerCase();

    list = list.filter(function (item) {
      const inName = item.student.toLowerCase().indexOf(needle) !== -1;
      const inTitle = item.title.toLowerCase().indexOf(needle) !== -1;
      return inName || inTitle;
    });
  }

  // EMPTY STATE - no rows to show
  if (list.length === 0) {
    UI.showEmpty(box, {
      icon: "\u2205",
      title: searchText ? "No matching submissions" : "No submissions yet",
      text: searchText
        ? "Try a different student name or assignment title."
        : "Add the first assignment text and the comparison will run automatically.",
      buttonText: searchText ? "" : "Add submission",
      buttonTarget: "submitModal"
    });
    return;
  }

  // build one <tr> for every submission
  const rows = list.map(function (item) {
    const risk = getRisk(item.top);

    return (
      "<tr>" +
        '<td data-label="Student" class="cell-name">' +
          '<div class="row">' +
            '<span class="activity-dot">' + UI.escape(UI.initials(item.student)) + "</span>" +
            '<span class="wrap-text">' + UI.escape(item.student) + "</span>" +
          "</div>" +
        "</td>" +
        '<td data-label="Assignment" class="cell-name">' +
          '<span class="wrap-text" title="' + UI.escape(item.title) + '">' +
            UI.escape(UI.short(item.title, 60)) +
          "</span>" +
        "</td>" +
        '<td data-label="Words">' + UI.escape(item.words) + "</td>" +
        '<td data-label="Submitted">' + UI.escape(item.date) + "</td>" +
        '<td data-label="Top match">' +
          '<div class="row">' +
            '<span class="bar"><i style="width:' + Math.round(item.top * 100) + '%"></i></span>' +
            "<b>" + toPercent(item.top) + "</b>" +
          "</div>" +
        "</td>" +
        '<td data-label="Status">' +
          '<span class="badge ' + risk.badge + '">' + risk.label + "</span>" +
        "</td>" +
      "</tr>"
    );
  });

  box.innerHTML =
    '<div class="table-wrap">' +
      '<table class="table">' +
        "<thead><tr>" +
          "<th>Student</th><th>Assignment</th><th>Words</th>" +
          "<th>Submitted</th><th>Top match</th><th>Status</th>" +
        "</tr></thead>" +
        "<tbody>" + rows.join("") + "</tbody>" +
      "</table>" +
    "</div>";
}


/* =========================================================
   PART 6 - RENDER THE SUSPICIOUS PAIRS LIST
   ========================================================= */

function renderPairs() {
  const box = document.getElementById("pairsBox");

  if (box === null) {
    return;
  }

  const pairs = getPairs();

  if (pairs.length === 0) {
    UI.showEmpty(box, {
      icon: "\u2713",
      title: "No pairs to review",
      text: "At least two submissions are needed before pairs can be compared."
    });
    return;
  }

  // sort() puts the highest score first.
  // slice() first, so we do not change the original array.
  const sorted = pairs.slice().sort(function (first, second) {
    return second.score - first.score;
  });

  const rows = sorted.map(function (pair) {
    const risk = getRisk(pair.score);

    return (
      "<tr>" +
        '<td data-label="Pair" class="cell-name">' +
          '<div class="wrap-text bold">' + UI.escape(UI.short(pair.a, 34)) + "</div>" +
          '<div class="wrap-text text-xs text-mute">vs ' + UI.escape(UI.short(pair.b, 34)) + "</div>" +
        "</td>" +
        '<td data-label="Shared n-grams">' + UI.escape(pair.shared) + "</td>" +
        '<td data-label="Similarity"><b>' + toPercent(pair.score) + "</b></td>" +
        '<td data-label="Level">' +
          '<span class="badge ' + risk.badge + '">' + risk.label + "</span>" +
        "</td>" +
      "</tr>"
    );
  });

  box.innerHTML =
    '<div class="table-wrap">' +
      '<table class="table">' +
        "<thead><tr>" +
          "<th>Pair</th><th>Shared</th><th>Similarity</th><th>Level</th>" +
        "</tr></thead>" +
        "<tbody>" + rows.join("") + "</tbody>" +
      "</table>" +
    "</div>";
}


/* =========================================================
   PART 7 - RENDER RECENT ACTIVITY
   ========================================================= */

function renderActivity() {
  const box = document.getElementById("activityBox");

  if (box === null) {
    return;
  }

  const items = getActivity();

  if (items.length === 0) {
    UI.showEmpty(box, {
      icon: "\u25CB",
      title: "No activity yet",
      text: "Actions such as new submissions and flagged pairs will appear here."
    });
    return;
  }

  // forEach() adds each row one by one
  let html = "";

  items.forEach(function (item) {
    html =
      html +
      '<div class="activity">' +
        '<div class="activity-dot">' + UI.escape(UI.initials(item.who)) + "</div>" +
        '<div class="activity-text">' +
          "<p class=\"wrap-text\"><b>" + UI.escape(UI.short(item.who, 28)) + "</b> " +
            UI.escape(item.what) + "</p>" +
          '<small class="text-mute">' + UI.escape(item.when) + "</small>" +
        "</div>" +
      "</div>";
  });

  box.innerHTML = html;
}


/* =========================================================
   PART 8 - RENDER THE HEATMAP (small preview grid)
   ========================================================= */

function renderHeatmap() {
  const box = document.getElementById("heatmapBox");

  if (box === null) {
    return;
  }

  const list = getSubmissions().slice(0, 4); // keep the preview small

  if (list.length < 2) {
    UI.showEmpty(box, {
      icon: "\u25A6",
      title: "Matrix needs two submissions",
      text: "Add one more submission to see the similarity grid."
    });
    return;
  }

  const pairs = getPairs();

  /* find the score of two students inside the pairs array */
  function findScore(nameA, nameB) {
    let found = 0;

    pairs.forEach(function (pair) {
      const sameWay = pair.a === nameA && pair.b === nameB;
      const otherWay = pair.a === nameB && pair.b === nameA;

      if (sameWay || otherWay) {
        found = pair.score;
      }
    });

    return found;
  }

  let html = "";

  // top row of headings
  html = html + '<div class="heat-head"></div>';

  list.forEach(function (item) {
    html += '<div class="heat-head">' + UI.escape(UI.initials(item.student)) + "</div>";
  });

  // one row for each student
  list.forEach(function (rowItem) {
    html +=
      '<div class="heat-head text-right">' +
      UI.escape(UI.short(rowItem.student, 8)) +
      "</div>";

    list.forEach(function (colItem) {
      if (rowItem.id === colItem.id) {
        // a submission compared with itself
        html += '<div class="heat-cell heat-0">--</div>';
      } else {
        const score = findScore(rowItem.student, colItem.student);
        const risk = getRisk(score);
        html +=
          '<div class="heat-cell ' + risk.heat + '" title="' +
          UI.escape(rowItem.student + " vs " + colItem.student) + '">' +
          toPercent(score) + "</div>";
      }
    });
  });

  box.innerHTML = html;
  box.style.gridTemplateColumns = "70px repeat(" + list.length + ", 1fr)";
}


/* =========================================================
   PART 9 - THE SUBMISSION FORM (word count + validation)
   Counting words is a form rule, not the similarity algorithm,
   so it is allowed to live here.
   ========================================================= */

const MIN_WORDS = 50;
const MAX_WORDS = 2000;

function countWords(text) {
  const clean = text.trim();

  if (clean === "") {
    return 0;
  }

  // split on any group of spaces / new lines
  return clean.split(/\s+/).length;
}

function setupSubmitForm() {
  const form = document.getElementById("submitForm");

  if (form === null) {
    return;
  }

  const nameInput = document.getElementById("studentName");
  const titleInput = document.getElementById("assignTitle");
  const textInput = document.getElementById("assignText");
  const counter = document.getElementById("wordCount");

  /* live word counter while typing */
  textInput.addEventListener("input", function () {
    const words = countWords(textInput.value);

    counter.textContent = words + " / " + MIN_WORDS + " words minimum";

    if (words === 0) {
      counter.className = "help";
    } else if (words < MIN_WORDS) {
      counter.className = "help";
      counter.style.color = "var(--warn)";
    } else if (words > MAX_WORDS) {
      counter.style.color = "var(--danger)";
    } else {
      counter.style.color = "var(--ok)";
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    // clear old errors
    form.querySelectorAll(".field").forEach(function (field) {
      field.classList.remove("has-error");
    });

    let isValid = true;

    if (nameInput.value.trim() === "") {
      nameInput.closest(".field").classList.add("has-error");
      isValid = false;
    }

    if (titleInput.value.trim() === "") {
      titleInput.closest(".field").classList.add("has-error");
      isValid = false;
    }

    const words = countWords(textInput.value);

    if (words < MIN_WORDS || words > MAX_WORDS) {
      textInput.closest(".field").classList.add("has-error");
      isValid = false;
    }

    if (!isValid) {
      UI.toast("Please fix the highlighted fields.", "danger");
      return;
    }

    const record = {
      student: nameInput.value.trim(),
      title: titleInput.value.trim(),
      text: textInput.value,
      words: words
    };

    // The logic team saves it and re-runs the comparison.
    if (hasApi("saveSubmission")) {
      window.SimScoreAPI.saveSubmission(record);
      UI.toast("Submission added.", "ok");
      refreshDashboard();
    } else {
      UI.toast("UI only: storage service is not connected yet.", "warn");
    }

    form.reset();
    counter.textContent = "0 / " + MIN_WORDS + " words minimum";
    counter.style.color = "";
    UI.closeModal("submitModal");
  });
}


/* =========================================================
   PART 10 - SEARCH BOX
   ========================================================= */

function setupSearch() {
  const search = document.getElementById("searchInput");

  if (search === null) {
    return;
  }

  search.addEventListener("input", function () {
    renderSubmissions(search.value);
  });
}


/* =========================================================
   PART 11 - DRAW / REDRAW EVERYTHING
   ========================================================= */

function refreshDashboard() {
  renderStats();
  renderSubmissions("");
  renderPairs();
  renderActivity();
  renderHeatmap();
}

document.addEventListener("DOMContentLoaded", function () {
  const statsBox = document.getElementById("statsRow");
  const tableBox = document.getElementById("submissionsBox");

  // show the loader first, then draw (feels like real loading)
  UI.showLoader(tableBox, "Loading submissions...");

  setupSubmitForm();
  setupSearch();

  setTimeout(function () {
    refreshDashboard();
  }, 400);

  // small guard so the file does not crash on other pages
  if (statsBox === null) {
    return;
  }
});
