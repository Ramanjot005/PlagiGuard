const instructor = PG.requireRole('instructor');
if (!instructor) throw new Error('Unauthorized');

function renderInstructorDashboard() {
    const submissions = PG.getInstructorSubmissions();
    const students = PG.getUsers().filter(u => u.role === 'student');
    const assignments = PG.getAssignments();
    const flagged = submissions.filter(s => s.flagged);
    const marked = submissions.filter(s => s.marks !== null);
    const average = marked.length ? marked.reduce((sum, s) => sum + Number(s.marks), 0) / marked.length : 0;

    pgLayout({
        active: 'dashboard', role: 'instructor',
        title: 'Instructor Dashboard',
        subtitle: 'Review every student submission, plagiarism score and instructor marking from one dashboard.',
        content: `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-title">Students</div><div class="stat-value">${students.length}</div><div class="stat-foot">Registered accounts</div></div>
                <div class="stat-card"><div class="stat-title">Submissions</div><div class="stat-value">${submissions.length}</div><div class="stat-foot">All students</div></div>
                <div class="stat-card"><div class="stat-title">Flagged</div><div class="stat-value">${flagged.length}</div><div class="stat-foot">Similarity ≥ threshold</div></div>
                <div class="stat-card"><div class="stat-title">Avg. Marks</div><div class="stat-value">${average.toFixed(1)}</div><div class="stat-foot">Marked submissions</div></div>
            </div>

            <div class="dashboard-grid">
                <section class="section-card">
                    <div class="section-heading"><div><h2 class="section-title">Recent Student Submissions</h2><p class="text-muted">Open a row to view the text, similarity details and mark it.</p></div><a class="btn btn-secondary btn-sm" href="assignments.html">View all</a></div>
                    <div class="table-responsive"><table class="data-table"><thead><tr><th>Student</th><th>Assignment</th><th>Submitted</th><th>Similarity</th><th>Marks</th><th>Action</th></tr></thead><tbody>
                        ${submissions.slice(0, 8).map(s => {
                            const a = assignments.find(item => item.id === s.assignmentId);
                            return `<tr><td><strong>${PG.escapeHtml(s.studentName)}</strong><div class="table-sub">${PG.escapeHtml(PG.getUsers().find(u => u.id === s.studentId)?.studentId || '')}</div></td><td>${PG.escapeHtml(a?.title || 'Unknown')}</td><td>${PG.formatDate(s.submittedAt)}</td><td>${similarityBadge(s.maxSimilarity)}</td><td>${s.marks === null ? badge('Pending', 'review') : `<strong>${s.marks}/${a?.maxMarks ?? 10}</strong>`}</td><td><button class="btn btn-primary btn-sm review-btn" data-id="${s.id}">Review</button></td></tr>`;
                        }).join('') || `<tr><td colspan="6">No student submissions yet. Students can create accounts and submit from their dashboard.</td></tr>`}
                    </tbody></table></div>
                </section>
                <aside class="section-card"><h2 class="section-title">Similarity ranking</h2><p class="text-muted">Highest similarity is shown first for quick manual review.</p><div class="rank-list">${[...submissions].sort((a,b)=>b.maxSimilarity-a.maxSimilarity).slice(0,5).map((s,i)=>`<div class="rank-item"><div><span class="rank-number">${i+1}</span><strong>${PG.escapeHtml(s.studentName)}</strong><small>${PG.escapeHtml(assignments.find(a=>a.id===s.assignmentId)?.title || '')}</small></div><div>${similarityBadge(s.maxSimilarity)}</div></div>`).join('') || '<p class="text-muted">No submissions yet.</p>'}</div></aside>
            </div>
        `
    });

    document.querySelectorAll('.review-btn').forEach(button => button.addEventListener('click', () => openReviewModal(button.dataset.id)));
}

function openReviewModal(id) {
    const submission = PG.getSubmissions().find(s => s.id === id);
    if (!submission) return;
    const assignment = PG.getAssignments().find(a => a.id === submission.assignmentId);
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-card">
            <button class="modal-close" aria-label="Close">×</button>
            <div class="modal-header"><div><span class="eyebrow">MARKING</span><h2>${PG.escapeHtml(assignment?.title || 'Submission')}</h2><p class="text-muted">${PG.escapeHtml(submission.studentName)} · ${PG.formatDate(submission.submittedAt)}</p></div><div>${similarityBadge(submission.maxSimilarity)}</div></div>
            <div class="review-grid">
                <div><h3>Student submission</h3><pre class="submission-preview">${PG.escapeHtml(submission.text)}</pre></div>
                <div><h3>Instructor marking</h3><form id="mark-form" class="stack-form"><div class="form-group"><label class="form-label">Marks / ${assignment?.maxMarks ?? 10}</label><input class="form-input" id="marks" type="number" min="0" max="${assignment?.maxMarks ?? 10}" step="0.5" value="${submission.marks ?? ''}" required></div><div class="form-group"><label class="form-label">Status</label><select class="form-input" id="status"><option ${submission.status === 'Marked' ? 'selected' : ''}>Marked</option><option ${submission.status === 'Needs Revision' ? 'selected' : ''}>Needs Revision</option><option ${submission.status === 'Approved' ? 'selected' : ''}>Approved</option></select></div><div class="form-group"><label class="form-label">Feedback</label><textarea class="form-textarea" id="feedback" rows="5" placeholder="Write feedback for the student...">${PG.escapeHtml(submission.feedback)}</textarea></div><div id="mark-error" class="auth-error"></div><button class="btn btn-primary" type="submit">Save Mark</button></form></div>
            </div>
            ${submission.matchingNgrams?.length ? `<div class="match-panel"><strong>Matching n-grams</strong><div class="ngram-list">${submission.matchingNgrams.map(g => `<span class="ngram-tag">${PG.escapeHtml(g)}</span>`).join('')}</div>${submission.topMatchStudent ? `<p class="text-muted">Top match: ${PG.escapeHtml(submission.topMatchStudent)}</p>` : ''}</div>` : ''}
        </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', event => { if (event.target === modal) modal.remove(); });
    modal.querySelector('#mark-form').addEventListener('submit', event => {
        event.preventDefault();
        const error = modal.querySelector('#mark-error');
        try {
            const marks = Number(modal.querySelector('#marks').value);
            if (marks < 0 || marks > (assignment?.maxMarks ?? 10)) throw new Error('Marks must be inside the assignment range.');
            PG.markSubmission(id, marks, modal.querySelector('#feedback').value, modal.querySelector('#status').value);
            modal.remove();
            showToast('Mark saved successfully.', 'success');
            renderInstructorDashboard();
        } catch (e) { error.textContent = e.message; }
    });
}

renderInstructorDashboard();
