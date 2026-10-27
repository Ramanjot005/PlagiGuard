const instructor = PG.requireRole('instructor');
if (!instructor) throw new Error('Unauthorized');

async function renderInstructorDashboard() {
    let submissions = [];
    let students = PG.getUsers().filter(u => u.role === 'student');
    let assignments = [];
    let isBackend = false;

    if (PG.getAuthToken()) {
        try {
            isBackend = true;
            const results = await Promise.all([
                PG.fetchAssignments(),
                PG.fetchInstructorReports()
            ]);
            assignments = results[0] || [];
            submissions = (results[1] || []).map(s => ({
                ...s,
                id: String(s._id || s.id),
                studentId: String(s.studentId || s.student?._id || s.student || ''),
                studentName: s.studentName || s.student?.name || 'Student',
                assignmentId: String(s.assignment?._id || s.assignment || s.assignmentId || ''),
                submittedAt: s.createdAt || s.submittedAt || new Date().toISOString(),
                maxSimilarity: Number(s.maxSimilarity ?? s.analysis?.maxSimilarity ?? 0),
                flagged: s.status === 'flagged' || s.flagged,
                marks: s.marks
            }));
        } catch (e) {
            console.error('Failed to load instructor dashboard data:', e);
            assignments = PG.getAssignments();
            submissions = PG.getInstructorSubmissions();
            isBackend = false;
        }
    } else {
        assignments = PG.getAssignments();
        submissions = PG.getInstructorSubmissions();
    }
    const uniqueStudents = new Set(submissions.map(s => s.studentId || s.studentName).filter(Boolean));
    const studentCountDisplay = isBackend ? uniqueStudents.size : Math.max(students.length, uniqueStudents.size);
    const flagged = submissions.filter(s => s.flagged);
    const marked = submissions.filter(s => s.marks !== null && s.marks !== undefined);
    const average = marked.length ? marked.reduce((sum, s) => sum + Number(s.marks), 0) / marked.length : 0;
    const pending = submissions.length - marked.length;
    const reviewRate = submissions.length ? Math.round((marked.length / submissions.length) * 100) : 0;
    const recent = [...submissions].sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)).slice(0,7);
    const similarityBands = [
        { label:'0–20%', min:0, max:20 }, { label:'21–40%', min:21, max:40 },
        { label:'41–60%', min:41, max:60 }, { label:'61–80%', min:61, max:80 }, { label:'81–100%', min:81, max:100 }
    ].map(b => ({...b, count: submissions.filter(s => { const v=Number(s.maxSimilarity)||0; return v>=b.min && v<=b.max; }).length}));
    const maxBand = Math.max(1, ...similarityBands.map(b=>b.count));
    const assignmentStats = assignments.slice(0,5).map(a => { const rows=submissions.filter(s=>String(s.assignmentId)===String(a.id||a._id)); const avg=rows.length?rows.reduce((sum,s)=>sum+Number(s.marks||0),0)/rows.length:0; return {...a,count:rows.length,avg}; });
    const flaggedPriority = [...flagged].sort((a,b)=>(b.maxSimilarity||0)-(a.maxSimilarity||0)).slice(0,5);

    pgLayout({
        active: 'dashboard', role: 'instructor',
        title: 'Instructor Dashboard',
        subtitle: 'Create assignments, monitor submissions and review similarity evidence from one professional workspace.',
        headerAction: `<div class="dashboard-head-actions"><a class="btn btn-secondary btn-sm" href="reports.html">Open reports</a><a class="btn btn-primary" href="assignments.html#new-assignment">＋ New assignment</a></div>`,
        content: `
            <section class="dashboard-hero-card instructor-hero">
                <div class="hero-glow hero-glow-one"></div><div class="hero-glow hero-glow-two"></div>
                <div class="hero-copy"><span class="eyebrow">INSTRUCTOR WORKSPACE</span><h2>A clearer view of your class.</h2><p>Move from submission volume to review priorities without switching between pages.</p><div class="hero-pills"><span>✓ Pairwise comparison</span><span>✓ Marking workflow</span><span>✓ Assignment management</span></div></div>
                <div class="review-orb" style="--progress:${reviewRate * 3.6}deg"><div><strong>${reviewRate}%</strong><span>reviewed</span></div></div>
            </section>

            <div class="stats-grid premium-stats">
                <div class="stat-card stat-card-blue"><div class="stat-icon">◉</div><div class="stat-title">Students</div><div class="stat-value">${typeof studentCountDisplay !== "undefined" ? studentCountDisplay : students.length}</div><div class="stat-foot">Registered learners</div></div>
                <div class="stat-card stat-card-purple"><div class="stat-icon">▦</div><div class="stat-title">Assignments</div><div class="stat-value">${assignments.length}</div><div class="stat-foot">Published coursework</div></div>
                <div class="stat-card stat-card-red"><div class="stat-icon">!</div><div class="stat-title">Flagged</div><div class="stat-value">${flagged.length}</div><div class="stat-foot">At or above review threshold</div></div>
                <div class="stat-card stat-card-green"><div class="stat-icon">✓</div><div class="stat-title">Avg. Marks</div><div class="stat-value">${average.toFixed(1)}</div><div class="stat-foot">${marked.length} marked · ${pending} pending</div></div>
            </div>

            <div class="analytics-grid instructor-analytics">
                <section class="section-card analytics-card">
                    <div class="section-heading"><div><span class="eyebrow">SIMILARITY PROFILE</span><h2 class="section-title">Submission similarity distribution</h2><p class="text-muted">Where your class is landing against the similarity scale.</p></div><a class="chart-chip" href="reports.html">View full report →</a></div>
                    <div class="distribution-chart">
                        ${similarityBands.map(b => `<div class="dist-row"><span>${b.label}</span><div class="dist-track"><i style="width:${Math.max(5, Math.round((b.count/maxBand)*100))}%"></i></div><strong>${b.count}</strong></div>`).join('')}
                    </div>
                </section>
                <section class="section-card analytics-card">
                    <div class="section-heading"><div><span class="eyebrow">REVIEW WORKLOAD</span><h2 class="section-title">Marking progress</h2><p class="text-muted">A quick view of review coverage.</p></div></div>
                    <div class="review-progress-card"><div class="progress-ring-large purple" style="--progress:${reviewRate * 3.6}deg"><div><strong>${reviewRate}%</strong><span>complete</span></div></div><div class="review-stats"><div><strong>${marked.length}</strong><span>Marked</span></div><div><strong>${pending}</strong><span>Pending</span></div><div><strong>${flagged.length}</strong><span>Flagged</span></div></div></div>
                </section>
            </div>

            <div class="dashboard-grid premium-dashboard-grid">
                <section class="section-card">
                    <div class="section-heading"><div><span class="eyebrow">PRIORITY QUEUE</span><h2 class="section-title">Highest similarity cases</h2><p class="text-muted">Start with the submissions that need the closest review.</p></div><a class="btn btn-secondary btn-sm" href="reports.html">All reports</a></div>
                    <div class="priority-list">
                        ${flaggedPriority.length ? flaggedPriority.map((s,i)=>{const a=assignments.find(x=>String(x.id||x._id)===String(s.assignmentId)); return `<article class="priority-item"><div class="priority-rank">${i+1}</div><div class="priority-main"><strong>${PG.escapeHtml(s.studentName)}</strong><small>${PG.escapeHtml(a?.title||'Assignment')} · ${PG.formatDate(s.submittedAt)}</small></div><div class="priority-score"><strong>${Number(s.maxSimilarity||0).toFixed(1)}%</strong><span>similarity</span></div></article>`}).join('') : '<div class="empty-state"><div>✓</div><strong>No flagged submissions</strong><p>Nothing is currently above the review threshold.</p></div>'}
                    </div>
                </section>
                <section class="section-card">
                    <div class="section-heading"><div><span class="eyebrow">RECENT ACTIVITY</span><h2 class="section-title">Latest submissions</h2><p class="text-muted">Your most recent student activity.</p></div><a class="btn btn-secondary btn-sm" href="assignments.html">Manage</a></div>
                    <div class="activity-list compact">
                        ${recent.length ? recent.map(s=>{const a=assignments.find(x=>String(x.id||x._id)===String(s.assignmentId)); return `<article class="activity-item"><div class="activity-dot ${s.flagged?'dot-danger':'dot-safe'}"></div><div class="activity-main"><strong>${PG.escapeHtml(s.studentName)}</strong><small>${PG.escapeHtml(a?.title||'Assignment')} · ${PG.formatDate(s.submittedAt)}</small></div><div>${s.marks===null||s.marks===undefined?badge('Pending','review'):`<strong>${s.marks}/${a?.maxMarks??10}</strong>`}</div></article>`}).join('') : '<div class="empty-state"><div>◎</div><strong>No submissions yet</strong><p>Published assignments will appear here as students submit.</p></div>'}
                    </div>
                </section>
            </div>

            <section class="section-card">
                <div class="section-heading"><div><span class="eyebrow">ASSIGNMENT HEALTH</span><h2 class="section-title">Coursework snapshot</h2><p class="text-muted">Submission volume and average marks by assignment.</p></div><a class="btn btn-secondary btn-sm" href="assignments.html">Manage assignments</a></div>
                <div class="assignment-health-grid">${assignmentStats.map(a=>`<article class="health-card"><div class="health-top"><div><strong>${PG.escapeHtml(a.title)}</strong><small>${PG.escapeHtml(a.course)}</small></div><span>${a.count} submitted</span></div><div class="health-bar"><span style="width:${Math.min(100, assignments.length ? (a.count/Math.max(1, studentCountDisplay || students.length))*100 : 0)}%"></span></div><div class="health-meta"><span>Avg. marks</span><strong>${a.count ? a.avg.toFixed(1) : '—'}${a.count ? ` / ${a.maxMarks}` : ''}</strong></div></article>`).join('')}</div>
            </section>
        `
    });
}

renderInstructorDashboard();
