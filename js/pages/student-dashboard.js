const user = PG.requireRole('student');
if (!user) throw new Error('Unauthorized');

function renderStudentDashboard() {
    const assignments = PG.getAssignments();
    const submissions = PG.getStudentSubmissions(user.id);
    const marked = submissions.filter(s => s.marks !== null);
    const avg = marked.length ? marked.reduce((sum, s) => sum + Number(s.marks), 0) / marked.length : 0;
    const flagged = submissions.filter(s => s.flagged).length;

    const rows = assignments.map(assignment => {
        const submission = submissions.find(s => s.assignmentId === assignment.id);
        return `
            <tr>
                <td><strong>${PG.escapeHtml(assignment.title)}</strong><div class="table-sub">${PG.escapeHtml(assignment.course)}</div></td>
                <td>${submission ? PG.formatDate(submission.submittedAt) : 'Not submitted'}</td>
                <td>${submission ? similarityBadge(submission.maxSimilarity) : badge('Pending', 'neutral')}</td>
                <td>${submission && submission.marks !== null ? `<strong>${submission.marks}/${assignment.maxMarks}</strong>` : '—'}</td>
                <td>${submission ? badge(submission.status, submission.status === 'Marked' ? 'success' : 'review') : badge('To Do', 'neutral')}</td>
            </tr>
        `;
    }).join('');

    pgLayout({
        active: 'dashboard', role: 'student',
        title: `Welcome, ${PG.escapeHtml(user.name)}`,
        subtitle: 'Your assignments, submissions, similarity scores and instructor marks in one place.',
        content: `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-title">Assignments</div><div class="stat-value">${assignments.length}</div><div class="stat-foot">Available to you</div></div>
                <div class="stat-card"><div class="stat-title">Submitted</div><div class="stat-value">${submissions.length}</div><div class="stat-foot">Your work only</div></div>
                <div class="stat-card"><div class="stat-title">Average Marks</div><div class="stat-value">${avg.toFixed(1)}</div><div class="stat-foot">Across marked work</div></div>
                <div class="stat-card"><div class="stat-title">Similarity Flags</div><div class="stat-value">${flagged}</div><div class="stat-foot">Review with instructor</div></div>
            </div>

            <div class="dashboard-grid">
                <section class="section-card">
                    <div class="section-heading"><div><h2 class="section-title">My Assignment Status</h2><p class="text-muted">Only your own submissions and results are shown here.</p></div><a class="btn btn-primary btn-sm" href="upload.html">+ Upload Assignment</a></div>
                    <div class="table-responsive"><table class="data-table"><thead><tr><th>Assignment</th><th>Submitted</th><th>Similarity</th><th>Marks</th><th>Status</th></tr></thead><tbody>${rows || `<tr><td colspan="5">No assignments available.</td></tr>`}</tbody></table></div>
                </section>
                <aside class="section-card quick-panel">
                    <h2 class="section-title">Submission rules</h2>
                    <div class="rule"><span>🔢</span><div><strong>${PG.getSettings().ngramSize}-gram</strong><small>Overlapping word groups</small></div></div>
                    <div class="rule"><span>∩</span><div><strong>Jaccard similarity</strong><small>Intersection ÷ union</small></div></div>
                    <div class="rule"><span>📝</span><div><strong>${PG.getSettings().minimumWords} words minimum</strong><small>Editable in Settings</small></div></div>
                    <div class="rule"><span>💾</span><div><strong>Browser storage</strong><small>No API/backend required</small></div></div>
                </aside>
            </div>
        `
    });
}

renderStudentDashboard();
