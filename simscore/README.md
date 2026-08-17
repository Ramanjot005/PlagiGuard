# SimScore — Assignment Plagiarism Similarity Scorer (UI Part)

My part of the project: **the complete front-end / UI layer**.
No Jaccard, no n-gram and no LocalStorage code is written in these files —
that is the logic team's part. My files only draw the screen.

---

## 1. Folder structure

```
simscore/
├── index.html            hero, problem, solution, features, CTA
├── about.html            purpose, users, value, limitations
├── how-it-works.html     visual Phase 1 pipeline (7 steps)
├── login.html            login UI
├── signup.html           signup UI
├── dashboard.html        app shell, summary cards, tables, heatmap
├── css/
│   ├── base.css          reset, colours, fonts, helper classes
│   ├── layout.css        container, navbar, sidebar, footer, grids
│   ├── components.css    buttons, cards, badges, table, form, modal,
│   │                     toast, loader, empty state, steps, heatmap
│   └── responsive.css    all media queries (992px / 768px / 560px)
└── js/ui/
    ├── ui-kit.js         toast, modal, loader, empty state, text helpers
    ├── navbar.js         mobile menu, active link, sidebar drawer
    ├── auth-ui.js        login/signup validation only
    └── dashboard.js      renders stats, tables, activity, heatmap
```

---

## 2. Design system (all in `base.css`)

Everything uses CSS variables, so changing one value changes the whole site.

| Thing | Values |
|---|---|
| Spacing | `--sp-1` 4px → `--sp-8` 64px |
| Font sizes | `--fs-xs` 12px → `--fs-3xl` 44px |
| Radius | 6px / 10px / 16px |
| Brand colour | `--brand: #3b5bdb` |
| Status colours | ok, warn, danger, info |

---

## 3. Reusable components

| Component | Class / function |
|---|---|
| Button | `.btn` + `.btn-primary / -outline / -ghost / -danger / -white`, sizes `-sm -lg -block` |
| Card | `.card` > `.card-head` / `.card-body` / `.card-foot` |
| Stat card | `.stat-card` |
| Badge | `.badge` + `.badge-ok / -warn / -danger / -info / -mute` |
| Table | `.table-wrap` > `.table` (turns into cards under 560px) |
| Form | `.field`, `.label`, `.input`, `.select`, `.textarea`, `.error-msg` |
| Modal | `.modal` + `UI.openModal(id)` / `UI.closeModal(id)` or `data-modal-open="id"` |
| Toast | `UI.toast("message", "ok")` |
| Loader | `UI.showLoader(box, "Loading...")` + `.skeleton` |
| Empty state | `UI.showEmpty(box, { icon, title, text, buttonText })` |

---

## 4. Responsive behaviour

| Screen | What happens |
|---|---|
| Desktop (> 992px) | 4-column stats, sidebar always visible, 2-column hero |
| Tablet (≤ 992px) | Stats become 2 columns, sidebar slides in as a drawer with a dark overlay, blue auth panel hides |
| Small tablet (≤ 768px) | Hamburger menu appears, footer becomes 2 columns |
| Phone (≤ 560px) | Everything is 1 column, **tables become stacked cards** using `data-label` on each `<td>`, buttons go full width, toast becomes full width |

---

## 5. Handover contract (what the logic team must provide)

### Dashboard — `window.SimScoreAPI`

```js
window.SimScoreAPI = {
  getStats:       function () { /* {submissions, pairs, flagged, average} */ },
  getSubmissions: function () { /* [{id, student, title, words, date, top}] */ },
  getPairs:       function () { /* [{a, b, score, shared}] */ },
  getActivity:    function () { /* [{who, what, when}] */ },
  saveSubmission: function (record) { /* {student, title, text, words} */ }
};
```

`score` and `top` are numbers between **0 and 1** (0.81 = 81%).
Load the logic scripts **before** `dashboard.js` in `dashboard.html`.

### Auth — `window.AuthService`

```js
window.AuthService = {
  login:  function (data, callback) { callback({ success: true }); },
  signup: function (data, callback) { callback({ success: false, message: "Email already used" }); }
};
```

If these objects do not exist yet, the UI falls back to a small sample array
so the pages can still be demonstrated. **Nothing is permanently hardcoded** —
every number on the dashboard is calculated from the data array at runtime.

---

## 6. Edge cases already tested

- **Long student name** — `"Harmanpreet Kaur Sidhu Brar Chahal"` → shortened with `UI.short()`, avatar shows `HC`, cell wraps with `.wrap-text`.
- **Long assignment title** — 120+ character title is cut to 60 chars with `…`, full text shown in the `title` tooltip.
- **Empty lists** — submissions, pairs, activity and matrix each have their own empty state.
- **Search with no result** — different empty message than "no data yet".
- **Small screens** — tables restack, no horizontal scrolling on the body.
- **XSS safety** — every value passes through `UI.escape()` before `innerHTML`.

---

## 7. JavaScript topics from the syllabus used here

`let / const` · type conversion · operators · `if / else` · `for` loops ·
function declarations · arrow-free callbacks · arrays · `push / slice / join` ·
`forEach / map / filter / reduce / sort` · objects & nested objects ·
`querySelector / querySelectorAll / getElementById` · `createElement` ·
`classList` · event handling · `preventDefault()` · form validation ·
error messages · template-style string building.

---

## 8. How to run

Open `index.html` directly in a browser, or run a small server:

```bash
python3 -m http.server 8080
```

then visit `http://localhost:8080/index.html`.
