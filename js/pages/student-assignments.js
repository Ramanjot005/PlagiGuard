const user = PG.requireRole('student');
if (!user) throw new Error('Unauthorized');

const assignments = PG.getAssignments();
const submissions = PG.getStudentSubmissions(user.id);

pgLayout({
    active: 'assignments', role: 'student',
    title: 'My Assignments',
    subtitle: 'See what you have completed, what is still pending and your latest score.',
    content: `
        <section class="cards-grid">
            ${assignments.map(a => {
                const s = submissions.find(item => item.assignmentId === a.id);
                return `<article class="card assignment-card">
                    <div class="assignment-top"><span>${PG.escapeHtml(a.course)}</span>${s ? badge('Submitted', 'success') : badge('Not submitted', 'neutral')}</div>
                    <h2>${PG.escapeHtml(a.title)}</h2>
                    <p>${PG.escapeHtml(a.description)}</p>
                    <div class="assignment-meta"><span>Due ${PG.formatDate(a.dueDate)}</span><span>${a.maxMarks} marks</span></div>
                    ${s ? `<div class="result-box"><div><small>Similarity</small><strong>${s.maxSimilarity.toFixed(1)}%</strong></div><div><small>Marks</small><strong>${s.marks === null ? 'Pending' : `${s.marks}/${a.maxMarks}`}</strong></div></div>` : ''}
                    <a class="btn ${s ? 'btn-secondary' : 'btn-primary'}" href="upload.html?assignment=${encodeURIComponent(a.id)}">${s ? 'Update Submission' : 'Submit Assignment'}</a>
                </article>`;
            }).join('')}
        </section>
    `
});
