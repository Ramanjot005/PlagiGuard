const user = PG.requireRole('student');
if (!user) throw new Error('Unauthorized');

async function renderStudentAssignments() {
    let assignments = [];
    let submissions = [];

    if (PG.getAuthToken()) {
        try {
            const results = await Promise.all([
                PG.fetchAssignments(),
                PG.fetchMySubmissions()
            ]);
            assignments = results[0] || [];
            submissions = results[1] || [];
        } catch (err) {
            console.error('Error fetching backend coursework:', err);
            assignments = PG.getAssignments();
            submissions = PG.getStudentSubmissions(user.id);
        }
    } else {
        assignments = PG.getAssignments();
        submissions = PG.getStudentSubmissions(user.id);
    }

    pgLayout({
        active: 'assignments', role: 'student',
        title: 'My Assignments',
        subtitle: 'See what you have completed, what is still pending and your latest score.',
        headerAction: `<div class="deadline-header-chip">◷ ${assignments.filter(a => PG.deadlineState(a.dueDate) !== 'overdue').length} active deadlines</div>`,
        content: `
            <section class="assignment-toolbar"><div><span class="eyebrow">COURSEWORK</span><strong>Find an assignment quickly</strong><small>Search by title, course or status.</small></div><input id="student-assignment-search" class="form-input search-input" type="search" placeholder="Search assignments..." aria-label="Search assignments"></section>
            <section class="cards-grid" id="student-assignment-grid">
                ${assignments.length ? assignments.map(a => {
                    const asgId = String(a._id || a.id);
                    const s = submissions.find(item => {
                        const itemAsgId = String(item.assignment?._id || item.assignment || item.assignmentId || '');
                        return itemAsgId === asgId;
                    });
                    const similarity = Number(s?.maxSimilarity ?? s?.analysis?.maxSimilarity ?? 0);
                    const isFlagged = s?.status === 'flagged' || s?.flagged;
                    const marks = s?.marks;
                    const maxMarks = a.maxMarks ?? 100;
                    return `<article class="card assignment-card" data-assignment-search="${PG.escapeHtml(`${a.title} ${a.course} ${s ? 'submitted' : 'pending'}`.toLowerCase())}">
                        <div class="assignment-top"><span>${PG.escapeHtml(a.course)}</span>${s ? badge('Submitted', 'success') : badge('Not submitted', 'neutral')}</div>
                        <h2>${PG.escapeHtml(a.title)}</h2>
                        <p>${PG.escapeHtml(a.description || 'No instructions provided.')}</p>
                        <div class="assignment-meta"><span>Due ${PG.formatDate(a.dueDate)}</span><span>${maxMarks} marks</span><span class="deadline-badge ${PG.deadlineState(a.dueDate)}">${PG.daysUntil(a.dueDate)}</span></div>
                        ${s ? `<div class="result-box"><div><small>Similarity</small><strong>${similarity.toFixed(1)}%</strong></div><div><small>Plagiarism Status</small><strong>${isFlagged ? '⚠ Flagged' : '✓ Received'}</strong></div><div><small>Marks</small><strong>${marks === null || marks === undefined ? 'Pending' : `${marks}/${maxMarks}`}</strong></div></div>` : ''}
                        <a class="btn ${s ? 'btn-secondary' : 'btn-primary'}" href="upload.html?assignment=${encodeURIComponent(asgId)}">${s ? 'Update Submission' : 'Submit Assignment'}</a>
                    </article>`;
                }).join('') : `<div class="empty-state" style="grid-column: 1/-1;"><div>📂</div><h3>No assignments published yet</h3><p>Your instructor has not published any assignments for this course yet.</p></div>`}
            </section>
        `
    });

    const studentAssignmentSearch = document.getElementById('student-assignment-search');
    studentAssignmentSearch?.addEventListener('input', () => {
        const q = studentAssignmentSearch.value.trim().toLowerCase();
        document.querySelectorAll('#student-assignment-grid .assignment-card').forEach(card => {
            card.hidden = !!q && !card.dataset.assignmentSearch.includes(q);
        });
    });
}

renderStudentAssignments();
