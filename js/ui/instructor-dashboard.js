import { getComparisons, getMaxSimilarityById, buildSimilarityMatrix } from "../core/comparator.js";

const store = window.PlagiGuardStore;
const auth = window.PlagiGuardAuth;

function percent(value) {
    return Math.round(Number(value) * 100);
}

function similarityColor(score) {
    if (score >= 50) {
        return "#f87171";
    }
    if (score >= 30) {
        return "#fbbf24";
    }
    return "#34d399";
}

function heatColor(score) {
    const t = Math.min(1, Math.max(0, score));
    const r = Math.round(15 + t * 220);
    const g = Math.round(80 - t * 40);
    const b = Math.round(90 + (1 - t) * 80);
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
}

function currentThreshold() {
    const slider = document.getElementById("threshold-slider");
    return slider ? Number(slider.value) : store.getSettings().similarityThreshold;
}

function renderStats(submissions, comparisons, threshold) {
    const flagged = comparisons.filter((pair) => percent(pair.similarity) >= threshold);
    const highest = comparisons.length ? percent(comparisons[0].similarity) : 0;
    const avg = comparisons.length
        ? Math.round((comparisons.reduce((sum, pair) => sum + pair.similarity, 0) / comparisons.length) * 100)
        : 0;

    document.getElementById("stat-total").textContent = submissions.length;
    document.getElementById("stat-flagged").textContent = flagged.length;
    document.getElementById("stat-highest").textContent = `${highest}%`;
    document.getElementById("stat-average").textContent = `${avg}%`;
}

function renderTable(submissions, scores, threshold) {
    const tbody = document.getElementById("class-submissions-body");
    if (submissions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted">No student submissions yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = submissions.map((item) => {
        const score = Math.round(scores[item.id] || item.similarity || 0);
        const flagged = score >= threshold;
        const grade = item.grade === null || item.grade === undefined || item.grade === "" ? "—" : item.grade;
        return `
            <tr>
                <td><strong>${item.student}</strong><div class="text-muted">${item.studentEmail || ""}</div></td>
                <td>${item.assignment}</td>
                <td class="text-muted">${item.date}</td>
                <td><strong style="color:${similarityColor(score)}">${score}%</strong></td>
                <td><span class="badge ${flagged ? "badge-danger" : "badge-success"}">${flagged ? "Flagged" : "Clean"}</span></td>
                <td>${grade}</td>
                <td><button type="button" class="btn btn-primary mark-btn" data-id="${item.id}" style="padding:0.35rem 0.85rem;font-size:0.8rem;">Mark</button></td>
            </tr>
        `;
    }).join("");
}

function renderPairs(comparisons, threshold) {
    const list = document.getElementById("suspicious-pairs");
    const flagged = comparisons.filter((pair) => percent(pair.similarity) >= threshold).slice(0, 8);
    if (flagged.length === 0) {
        list.innerHTML = `<p class="text-muted">No pairs above ${threshold}% Jaccard similarity.</p>`;
        return;
    }

    list.innerHTML = flagged.map((pair) => `
        <div class="pair-item">
            <div>
                <div class="pair-students">${pair.one.student} ↔ ${pair.two.student}</div>
                <div class="pair-assignment">${pair.one.assignment} · ${pair.two.assignment}</div>
            </div>
            <span class="badge badge-danger">${percent(pair.similarity)}% match</span>
        </div>
    `).join("");
}

function renderHeatmap(submissions, ngramSize) {
    const wrap = document.getElementById("heatmap");
    if (submissions.length < 2) {
        wrap.innerHTML = `<p class="text-muted">Need at least two submissions to draw a similarity matrix.</p>`;
        return;
    }

    const { labels, matrix } = buildSimilarityMatrix(submissions, ngramSize);
    const names = labels.map((item) => (item.student || "Student").split(" ")[0]);
    let html = `<table class="heatmap-table"><thead><tr><th></th>${names.map((name) => `<th>${name}</th>`).join("")}</tr></thead><tbody>`;
    matrix.forEach((row, i) => {
        html += `<tr><th>${names[i]}</th>`;
        row.forEach((score) => {
            html += `<td style="background:${heatColor(score)}" title="${Math.round(score * 100)}%">${Math.round(score * 100)}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    wrap.innerHTML = html;
}

function openMarkModal(submission) {
    document.getElementById("mark-id").value = submission.id;
    document.getElementById("mark-student").textContent = submission.student;
    document.getElementById("mark-assignment").textContent = submission.assignment;
    document.getElementById("mark-text").textContent = submission.text;
    document.getElementById("mark-grade").value = submission.grade ?? "";
    document.getElementById("mark-feedback").value = submission.feedback || "";
    document.getElementById("mark-modal").style.display = "flex";
}

function saveMark() {
    const id = document.getElementById("mark-id").value;
    const grade = document.getElementById("mark-grade").value.trim();
    const feedback = document.getElementById("mark-feedback").value.trim();
    store.saveSubmissions(store.getSubmissions().map((item) => (
        item.id === id ? { ...item, grade, feedback } : item
    )));
    document.getElementById("mark-modal").style.display = "none";
    loadDashboard();
}

function loadDashboard() {
    const settings = store.getSettings();
    const submissions = store.getSubmissions();
    const n = settings.ngramSize;
    const options = { minimumMatchingNGrams: settings.minimumMatchingNGrams };
    const comparisons = getComparisons(submissions, n, options);
    const scores = getMaxSimilarityById(submissions, n, options);
    const threshold = currentThreshold();

    renderStats(submissions, comparisons, threshold);
    renderTable(submissions, scores, threshold);
    renderPairs(comparisons, threshold);
    renderHeatmap(submissions, n);
}

document.addEventListener("DOMContentLoaded", () => {
    const session = auth.requireAuth("instructor");
    if (!session) {
        return;
    }

    const settings = store.getSettings();
    const slider = document.getElementById("threshold-slider");
    const valueLabel = document.getElementById("threshold-value");
    slider.value = settings.similarityThreshold;
    valueLabel.textContent = `${slider.value}%`;
    slider.addEventListener("input", () => {
        valueLabel.textContent = `${slider.value}%`;
        loadDashboard();
    });

    document.getElementById("class-submissions-body").addEventListener("click", (event) => {
        const btn = event.target.closest(".mark-btn");
        if (!btn) {
            return;
        }
        const submission = store.getSubmissions().find((item) => item.id === btn.dataset.id);
        if (submission) {
            openMarkModal(submission);
        }
    });

    document.getElementById("mark-save").addEventListener("click", (event) => {
        event.preventDefault();
        saveMark();
    });
    document.getElementById("mark-cancel").addEventListener("click", () => {
        document.getElementById("mark-modal").style.display = "none";
    });

    loadDashboard();
});
