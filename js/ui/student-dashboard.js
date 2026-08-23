import { getComparisons, getMaxSimilarityById } from "../core/comparator.js";

const store = window.PlagiGuardStore;
const auth = window.PlagiGuardAuth;

function countWords(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) {
        return 0;
    }
    return trimmed.split(/\s+/).filter(Boolean).length;
}

function similarityColor(percent) {
    if (percent >= 50) {
        return "#f87171";
    }
    if (percent >= 30) {
        return "#fbbf24";
    }
    return "#34d399";
}

function showMessage(text, type) {
    const box = document.getElementById("submit-message");
    if (!box) {
        return;
    }
    box.textContent = text;
    box.className = `form-message ${type}`;
}

function mySubmissions(session) {
    return store.getSubmissions().filter((item) => item.userId === session.id);
}

function renderStats(mine) {
    document.getElementById("stat-total").textContent = mine.length;
    document.getElementById("stat-pending").textContent = mine.filter(
        (item) => item.grade === null || item.grade === undefined || item.grade === ""
    ).length;
    document.getElementById("stat-marked").textContent = mine.filter(
        (item) => item.grade !== null && item.grade !== undefined && item.grade !== ""
    ).length;
}

function renderHistory(mine, scores) {
    const tbody = document.getElementById("student-history-body");
    if (mine.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted">No assignments submitted yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = [...mine].reverse().map((item) => {
        const score = Math.round(scores[item.id] || item.similarity || 0);
        const grade = item.grade === null || item.grade === undefined || item.grade === "" ? "—" : item.grade;
        const feedback = item.feedback || "Awaiting instructor review";
        return `
            <tr>
                <td><strong>${item.assignment}</strong></td>
                <td class="text-muted">${item.course || "—"}</td>
                <td class="text-muted">${item.date}</td>
                <td><strong style="color:${similarityColor(score)}">${score}%</strong></td>
                <td>${grade}</td>
                <td class="text-muted">${feedback}</td>
            </tr>
        `;
    }).join("");
}

function updateWordCount() {
    const textarea = document.getElementById("assignment-text");
    const counter = document.getElementById("word-count");
    const settings = store.getSettings();
    const count = countWords(textarea.value);
    counter.textContent = count;
    counter.className = count >= settings.minimumWords ? "good" : "warning";
    document.getElementById("min-words-hint").textContent = `Minimum: ${settings.minimumWords} words`;
}

function saveSubmission(session) {
    const title = document.getElementById("assignment-title").value.trim();
    const course = document.getElementById("assignment-course").value.trim() || session.course || "General";
    const text = document.getElementById("assignment-text").value.trim();
    const settings = store.getSettings();
    const words = countWords(text);

    if (!title) {
        showMessage("Please enter an assignment title.", "error");
        return;
    }

    if (words < settings.minimumWords) {
        showMessage(`Please enter at least ${settings.minimumWords} words.`, "error");
        return;
    }

    const submissions = store.getSubmissions();
    const record = {
        id: store.createId("sub"),
        userId: session.id,
        student: session.name,
        studentEmail: session.email,
        assignment: title,
        course,
        text,
        words,
        date: new Date().toLocaleString(),
        similarity: 0,
        grade: null,
        feedback: ""
    };

    submissions.push(record);
    const scores = getMaxSimilarityById(submissions, settings.ngramSize, {
        minimumMatchingNGrams: settings.minimumMatchingNGrams
    });
    store.saveSubmissions(submissions.map((item) => ({
        ...item,
        similarity: Math.round(scores[item.id] || 0)
    })));
    sessionStorage.setItem("lastStudentSubmissionId", record.id);

    document.getElementById("assignment-title").value = "";
    document.getElementById("assignment-text").value = "";
    updateWordCount();
    showMessage("Assignment saved locally. Jaccard scores were updated against other submissions.", "success");
    loadDashboard(session);
}

function loadDashboard(session) {
    const settings = store.getSettings();
    const all = store.getSubmissions();
    const scores = getMaxSimilarityById(all, settings.ngramSize, {
        minimumMatchingNGrams: settings.minimumMatchingNGrams
    });
    const mine = mySubmissions(session);

    document.getElementById("student-name-label").textContent = session.name;
    document.getElementById("assignment-course").placeholder = session.course || "Course code";
    renderStats(mine);
    renderHistory(mine, scores);

    const comparisons = getComparisons(all, settings.ngramSize, {
        minimumMatchingNGrams: settings.minimumMatchingNGrams
    });
    const myIds = new Set(mine.map((item) => item.id));
    const myPairs = comparisons.filter((pair) => myIds.has(pair.one.id) || myIds.has(pair.two.id));
    const hint = document.getElementById("pair-hint");
    if (hint) {
        hint.textContent = myPairs.length
            ? `Highest pair involving you: ${Math.round(myPairs[0].similarity * 100)}%`
            : "Scores appear after at least two submissions exist in this browser.";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const session = auth.requireAuth("student");
    if (!session) {
        return;
    }

    loadDashboard(session);
    updateWordCount();

    document.getElementById("assignment-text").addEventListener("input", updateWordCount);
    document.getElementById("assignment-form").addEventListener("submit", (event) => {
        event.preventDefault();
        saveSubmission(session);
    });

    const fileInput = document.getElementById("file-input");
    document.getElementById("upload-zone").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) {
            return;
        }
        if (!file.name.toLowerCase().endsWith(".txt")) {
            showMessage("Phase 1 reads .txt files in the browser. Paste other formats into the text area.", "error");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById("assignment-text").value = event.target.result;
            if (!document.getElementById("assignment-title").value) {
                document.getElementById("assignment-title").value = file.name.replace(/\.txt$/i, "");
            }
            updateWordCount();
            showMessage(`Loaded ${file.name}. Review the text, then submit.`, "success");
        };
        reader.readAsText(file);
    });
});
