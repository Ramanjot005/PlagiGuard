const user = PG.requireRole('student');
if (!user) throw new Error('Unauthorized');

const assignments = PG.getAssignments();
const submissions = PG.getStudentSubmissions(user.id);

pgLayout({
    active: 'assignments', role: 'student',
    title: 'My Assignments',
    subtitle: 'See what you have completed, what is still pending and your latest score.',
    headerAction: `<div class="deadline-header-chip">◷ ${assignments.filter(a=>PG.deadlineState(a.dueDate)!=='overdue').length} active deadlines</div>`,
    content: `
        <section class="assignment-toolbar"><div><span class="eyebrow">COURSEWORK</span><strong>Find an assignment quickly</strong><small>Search by title, course or status.</small></div><input id="student-assignment-search" class="form-input search-input" type="search" placeholder="Search assignments..." aria-label="Search assignments"></section>
        <section class="cards-grid" id="student-assignment-grid">
            ${assignments.map(a => {
                const s = submissions.find(item => item.assignmentId === a.id);
                return `<article class="card assignment-card" data-assignment-search="${PG.escapeHtml(`${a.title} ${a.course} ${s ? 'submitted' : 'pending'}`.toLowerCase())}">
                    <div class="assignment-top"><span>${PG.escapeHtml(a.course)}</span>${s ? badge('Submitted', 'success') : badge('Not submitted', 'neutral')}</div>
                    <h2>${PG.escapeHtml(a.title)}</h2>
                    <p>${PG.escapeHtml(a.description)}</p>
                    <div class="assignment-meta"><span>Due ${PG.formatDate(a.dueDate)}</span><span>${a.maxMarks} marks</span><span class="deadline-badge ${PG.deadlineState(a.dueDate)}">${PG.daysUntil(a.dueDate)}</span></div>
                    ${s ? `<div class="result-box"><div><small>Similarity</small><strong>${s.maxSimilarity.toFixed(1)}%</strong></div><div><small>Plagiarism Status</small><strong>${s.flagged ? '⚠ Flagged' : (s.topMatchStudent ? '✓ Not Flagged' : 'Awaiting')}</strong></div><div><small>Marks</small><strong>${s.marks === null ? 'Pending' : `${s.marks}/${a.maxMarks}`}</strong></div></div>${s.topMatchStudent ? `<p class="table-sub" style="margin-top:.75rem">Highest similarity with ${PG.escapeHtml(s.topMatchStudent)}.</p>` : ''}` : ''}
                    <a class="btn ${s ? 'btn-secondary' : 'btn-primary'}" href="upload.html?assignment=${encodeURIComponent(a.id)}">${s ? 'Update Submission' : 'Submit Assignment'}</a>
                </article>`;
            }).join('')}
        </section>
    `
});

const studentAssignmentSearch = document.getElementById('student-assignment-search');
studentAssignmentSearch?.addEventListener('input', () => { const q = studentAssignmentSearch.value.trim().toLowerCase(); document.querySelectorAll('#student-assignment-grid .assignment-card').forEach(card => { card.hidden = !!q && !card.dataset.assignmentSearch.includes(q); }); });
