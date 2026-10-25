
const user = PG.requireRole('student');
if (!user) throw new Error('Unauthorized');

let assignments = [];
let submissions = [];

const params = new URLSearchParams(window.location.search);
const preselected = params.get('assignment');

pgLayout({
    active: 'upload',
    role: 'student',
    title: 'Upload Assignment',
    subtitle: 'Submit your assignment for plagiarism analysis.',
    content: `
        <div class="dashboard-grid">
            <section class="section-card">
                <form id="submission-form" class="stack-form">
                    <div class="form-group">
                        <label class="form-label" for="assignment">Assignment</label>
                        <select id="assignment" class="form-input" required>
                            <option value="">Loading assignments...</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="file">Load text file (optional)</label>
                        <input id="file" class="form-input" type="file"
                            accept=".txt,.md,.js,.html,.css,.json">
                    </div>

                    <div class="form-group">
                        <div class="label-row">
                            <label class="form-label" for="text">Submission text</label>
                            <span id="word-count" class="text-muted">0 words</span>
                        </div>
                        <textarea id="text" class="form-textarea" rows="15"
                            placeholder="Paste or type your assignment here..." required></textarea>
                    </div>

                    <div class="upload-rule">
                        <strong id="minimum-words">Minimum words: 20</strong>
                        <span>Plagiarism check: performed by the server</span>
                    </div>

                    <div id="submission-error" class="auth-error"></div>
                    <button class="btn btn-primary" type="submit">Submit & Analyze</button>
                </form>
            </section>

            <aside class="section-card">
                <h2 class="section-title">Your latest submission</h2>
                <div id="latest-box">
                    <p class="text-muted">Loading submission...</p>
                </div>
            </aside>
        </div>
    `
});

const form = document.getElementById('submission-form');
const textArea = document.getElementById('text');
const fileInput = document.getElementById('file');
const assignmentSelect = document.getElementById('assignment');
const errorBox = document.getElementById('submission-error');
const submitButton = form.querySelector('button[type="submit"]');

let settings = PG.getSettings();

function getAssignmentId(assignment) {
    return String(assignment?._id || assignment?.id || '');
}

function getSubmissionAssignmentId(submission) {
    const assignment = submission?.assignment || submission?.assignmentId;
    return String(
        typeof assignment === 'object'
            ? assignment?._id || assignment?.id || ''
            : assignment || ''
    );
}

function updateWordCount() {
    const count = PG.tokenize(textArea.value).length;
    document.getElementById('word-count').textContent = `${count} words`;
}

function showLatest() {
    const assignmentId = assignmentSelect.value;

    const submission = submissions.find(
        item => getSubmissionAssignmentId(item) === assignmentId
    );

    const box = document.getElementById('latest-box');

    if (!submission) {
        box.innerHTML = `
            <div class="empty-state">
                <div>📄</div>
                <p>No submission for this assignment yet.</p>
            </div>`;
        return;
    }

    const analysis = submission.analysis || {};
    const similarity = Number(
        submission.maxSimilarity ??
        analysis.maxSimilarity ??
        analysis.similarity ??
        0
    );

    const marks = submission.marks;
    const feedback = submission.feedback || '';
    const submittedAt = submission.createdAt || submission.submittedAt;

    box.innerHTML = `
        <div class="score-ring">
            <strong>${similarity.toFixed(1)}%</strong>
            <span>max similarity</span>
        </div>
        <p>${badge(
            submission.status === 'flagged'
                ? 'Flagged for instructor review'
                : 'Submission received',
            submission.status === 'flagged' ? 'danger' : 'success'
        )}</p>
        <p class="text-muted">
            Submitted ${submittedAt ? PG.formatDate(submittedAt) : 'recently'}
        </p>
        <p>${
            marks === null || marks === undefined
                ? 'Marks are waiting for the instructor.'
                : `<strong>Score:</strong> ${PG.escapeHtml(String(marks))}`
        }</p>
        ${
            feedback
                ? `<div class="feedback">
                    <strong>Instructor feedback</strong>
                    <p>${PG.escapeHtml(feedback)}</p>
                </div>`
                : ''
        }`;
}

async function loadPageData() {
    assignmentSelect.disabled = true;
    submitButton.disabled = true;

    try {
        const results = await Promise.all([
            PG.fetchAssignments(),
            PG.fetchMySubmissions()
        ]);

        assignments = results[0];
        submissions = results[1];

        assignmentSelect.innerHTML = assignments.length
            ? assignments.map(assignment => {
                const id = getAssignmentId(assignment);
                return `<option value="${PG.escapeHtml(id)}">
                    ${PG.escapeHtml(assignment.title)} — ${PG.escapeHtml(assignment.course)}
                </option>`;
            }).join('')
            : '<option value="">No assignments available</option>';

        if (preselected) {
            const directMatch = assignments.find(
                assignment => getAssignmentId(assignment) === preselected
            );
            if (directMatch) {
                assignmentSelect.value = getAssignmentId(directMatch);
            } else {
                // If preselected is an old/localStorage ID, match by title if possible
                const localList = typeof PG.getAssignments === 'function' ? PG.getAssignments() : [];
                const localItem = localList.find(a => a.id === preselected);
                if (localItem && localItem.title) {
                    const titleMatch = assignments.find(
                        a => a.title && a.title.trim().toLowerCase() === localItem.title.trim().toLowerCase()
                    );
                    if (titleMatch) {
                        assignmentSelect.value = getAssignmentId(titleMatch);
                    }
                }
            }
        }

        assignmentSelect.disabled = assignments.length === 0;
        submitButton.disabled = assignments.length === 0;

        const minimumWords = Number(settings.minimumWords || 20);
        document.getElementById('minimum-words').textContent =
            `Minimum words: ${minimumWords}`;

        showLatest();
    } catch (error) {
        errorBox.textContent = error.message ||
            'Unable to load assignments. Please try again.';
        document.getElementById('latest-box').innerHTML =
            '<p class="text-muted">Unable to load submissions.</p>';
    } finally {
        assignmentSelect.disabled = assignments.length === 0;
        submitButton.disabled = assignments.length === 0;
    }
}

assignmentSelect.addEventListener('change', showLatest);
textArea.addEventListener('input', updateWordCount);

fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    try {
        textArea.value = await file.text();
        updateWordCount();
    } catch {
        errorBox.textContent = 'Unable to read this file.';
    }
});

form.addEventListener('submit', async event => {
    event.preventDefault();
    errorBox.textContent = '';

    if (!assignmentSelect.value) {
        errorBox.textContent = 'Please select an assignment.';
        return;
    }

    if (!textArea.value.trim()) {
        errorBox.textContent = 'Please enter your assignment text.';
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    try {
        const result = await PG.createSubmissionAPI({
            assignment: assignmentSelect.value,
            filename: fileInput.files[0]?.name || 'pasted-text.txt',
            text: textArea.value
        });

        const savedSubmission = result.submission;

        if (savedSubmission) {
            submissions = [
                savedSubmission,
                ...submissions.filter(
                    item => item._id !== savedSubmission._id
                )
            ];
        } else {
            submissions = await PG.fetchMySubmissions();
        }

        showToast(
            result.message || 'Assignment submitted successfully.',
            'success'
        );

        showLatest();
    } catch (error) {
        errorBox.textContent = error.message ||
            'Unable to submit assignment. Please try again.';
    } finally {
        submitButton.disabled = assignments.length === 0;
        submitButton.textContent = 'Submit & Analyze';
    }
});

updateWordCount();
loadPageData();
