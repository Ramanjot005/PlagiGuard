const user = PG.requireRole('student');
if (!user) throw new Error('Unauthorized');

const assignments = PG.getAssignments();
const submissions = PG.getStudentSubmissions(user.id);
const params = new URLSearchParams(window.location.search);
const preselected = params.get('assignment') || assignments[0]?.id;

pgLayout({
    active: 'upload', role: 'student',
    title: 'Upload Assignment',
    subtitle: 'Type your assignment or load a local text file. The text is analyzed in your browser.',
    content: `
        <div class="dashboard-grid">
            <section class="section-card">
                <form id="submission-form" class="stack-form">
                    <div class="form-group"><label class="form-label" for="assignment">Assignment</label><select id="assignment" class="form-input" required>${assignments.map(a => `<option value="${a.id}" ${a.id === preselected ? 'selected' : ''}>${PG.escapeHtml(a.title)} — ${PG.escapeHtml(a.course)}</option>`).join('')}</select></div>
                    <div class="form-group"><label class="form-label" for="file">Load text file (optional)</label><input id="file" class="form-input" type="file" accept=".txt,.md,.js,.html,.css,.json"></div>
                    <div class="form-group"><div class="label-row"><label class="form-label" for="text">Submission text</label><span id="word-count" class="text-muted">0 words</span></div><textarea id="text" class="form-textarea" rows="15" placeholder="Paste or type your assignment here..." required></textarea></div>
                    <div class="upload-rule"><strong>Minimum words: ${PG.getSettings().minimumWords}</strong><span>Plagiarism check: ${PG.getSettings().ngramSize}-gram + Jaccard</span></div>
                    <div id="submission-error" class="auth-error"></div>
                    <button class="btn btn-primary" type="submit">Submit & Analyze</button>
                </form>
            </section>
            <aside class="section-card">
                <h2 class="section-title">Your latest submission</h2>
                <div id="latest-box"></div>
            </aside>
        </div>
    `
});

const form = document.getElementById('submission-form');
const textArea = document.getElementById('text');
const fileInput = document.getElementById('file');
const assignmentSelect = document.getElementById('assignment');
const errorBox = document.getElementById('submission-error');

function updateWordCount() {
    const count = PG.tokenize(textArea.value).length;
    document.getElementById('word-count').textContent = `${count} words`;
}

function showLatest() {
    const submission = PG.getStudentSubmissions(user.id).find(s => s.assignmentId === assignmentSelect.value);
    document.getElementById('latest-box').innerHTML = submission
        ? `<div class="score-ring"><strong>${submission.maxSimilarity.toFixed(1)}%</strong><span>max similarity</span></div><p>${badge(submission.flagged ? 'Flagged for instructor review' : 'No similarity flag', submission.flagged ? 'danger' : 'success')}</p><p class="text-muted">Submitted ${PG.formatDate(submission.submittedAt)}</p><p>${submission.marks === null ? 'Marks are waiting for the instructor.' : `<strong>Score:</strong> ${submission.marks}`}</p>${submission.feedback ? `<div class="feedback"><strong>Instructor feedback</strong><p>${PG.escapeHtml(submission.feedback)}</p></div>` : ''}`
        : `<div class="empty-state"><div>📄</div><p>No submission for this assignment yet.</p></div>`;
}

assignmentSelect.addEventListener('change', showLatest);
textArea.addEventListener('input', updateWordCount);
fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    textArea.value = await file.text();
    updateWordCount();
});
form.addEventListener('submit', event => {
    event.preventDefault();
    errorBox.textContent = '';
    try {
        const saved = PG.saveSubmission({ assignmentId: assignmentSelect.value, text: textArea.value, filename: fileInput.files[0]?.name });
        showToast('Assignment submitted and similarity calculated.', 'success');
        showLatest();
        textArea.value = saved.text;
        updateWordCount();
    } catch (error) {
        errorBox.textContent = error.message;
    }
});

showLatest();
updateWordCount();
