const user = PG.requireRole('student');
if (!user) throw new Error('Unauthorized');

function daysUntil(dateString) {
    const target = new Date(`${dateString}T23:59:59`);
    const now = new Date();
    const diff = Math.ceil((target - now) / 86400000);
    if (diff < 0) return 'Past due';
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    return `${diff} days left`;
}

async function renderStudentDashboard() {
    let assignments = [];
    let submissions = [];

    if (PG.getAuthToken()) {
        try {
            const results = await Promise.all([
                PG.fetchAssignments(),
                PG.fetchMySubmissions()
            ]);
            assignments = results[0] || [];
            submissions = (results[1] || []).map(s => ({
                ...s,
                id: String(s._id || s.id),
                assignmentId: String(s.assignment?._id || s.assignment || s.assignmentId || ''),
                submittedAt: s.createdAt || s.submittedAt || new Date().toISOString(),
                maxSimilarity: Number(s.maxSimilarity ?? s.analysis?.maxSimilarity ?? 0),
                flagged: s.status === 'flagged' || s.flagged
            }));
        } catch (e) {
            console.error('Failed to load student dashboard data:', e);
            assignments = PG.getAssignments();
            submissions = PG.getStudentSubmissions(user.id);
        }
    } else {
        assignments = PG.getAssignments();
        submissions = PG.getStudentSubmissions(user.id);
    }
    const marked = submissions.filter(s => s.marks !== null && s.marks !== undefined);
    const avg = marked.length ? marked.reduce((sum, s) => sum + Number(s.marks), 0) / marked.length : 0;
    const flagged = submissions.filter(s => s.flagged).length;
    const completedPct = assignments.length ? Math.round((submissions.length / assignments.length) * 100) : 0;
    const pending = assignments.filter(a => !submissions.some(s => String(s.assignmentId) === String(a.id || a._id))).sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate)).slice(0, 4);
    const recent = [...submissions].sort((a,b) => new Date(b.submittedAt)-new Date(a.submittedAt)).slice(0, 5);
    const chartItems = [...submissions].sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt)).slice(-7);
    const chartMax = Math.max(100, ...chartItems.map(s => Number(s.maxSimilarity) || 0));

    pgLayout({
        active: 'dashboard', role: 'student',
        title: `Welcome back, ${PG.escapeHtml(user.name.split(' ')[0])}`,
        subtitle: 'Stay ahead of deadlines, review your similarity results and keep your academic work organised.',
        headerAction: `<div class="dashboard-head-actions"><a class="btn btn-secondary btn-sm" href="assignments.html">View assignments</a><a class="btn btn-primary" href="upload.html">＋ Submit work</a></div>`,
        content: `
            <section class="dashboard-hero-card student-hero">
                <div class="hero-glow hero-glow-one"></div><div class="hero-glow hero-glow-two"></div>
                <div class="hero-copy"><span class="eyebrow">STUDENT WORKSPACE</span><h2>Your academic work, clearly organised.</h2><p>Track submissions, see your own similarity status and keep every assignment moving toward completion.</p><div class="hero-pills"><span>✓ Browser-first</span><span>✓ Transparent scoring</span><span>✓ Instructor feedback</span></div></div>
                <div class="completion-orb" style="--progress:${completedPct * 3.6}deg"><div><strong>${completedPct}%</strong><span>completed</span></div></div>
            </section>

            <div class="stats-grid premium-stats">
                <div class="stat-card stat-card-blue"><div class="stat-icon">▦</div><div class="stat-title">Assignments</div><div class="stat-value">${assignments.length}</div><div class="stat-foot">Available in your workspace</div></div>
                <div class="stat-card stat-card-purple"><div class="stat-icon">↑</div><div class="stat-title">Submitted</div><div class="stat-value">${submissions.length}<small> / ${assignments.length}</small></div><div class="stat-foot">${Math.max(0, assignments.length-submissions.length)} still to submit</div></div>
                <div class="stat-card stat-card-green"><div class="stat-icon">★</div><div class="stat-title">Average Marks</div><div class="stat-value">${avg.toFixed(1)}</div><div class="stat-foot">Across marked submissions</div></div>
                <div class="stat-card stat-card-red"><div class="stat-icon">!</div><div class="stat-title">Similarity Flags</div><div class="stat-value">${flagged}</div><div class="stat-foot">Visible only on your own work</div></div>
            </div>

            <div class="analytics-grid">
                <section class="section-card analytics-card">
                    <div class="section-heading"><div><span class="eyebrow">YOUR ACTIVITY</span><h2 class="section-title">Similarity trend</h2><p class="text-muted">Your latest submission similarity scores.</p></div><span class="chart-chip">${submissions.length} submissions</span></div>
                    <div class="bar-chart" aria-label="Similarity trend chart">
                        ${chartItems.length ? chartItems.map((s,i) => {
                            const value = Number(s.maxSimilarity) || 0; const height = Math.max(8, Math.round((value / chartMax) * 100));
                            return `<div class="bar-item"><div class="bar-value">${value.toFixed(0)}%</div><div class="bar-track"><span style="height:${height}%" class="${s.flagged ? 'bar-danger' : 'bar-safe'}"></span></div><small>${i+1}</small></div>`;
                        }).join('') : '<div class="chart-empty">Submit your first assignment to see your similarity trend here.</div>'}
                    </div>
                </section>
                <aside class="section-card analytics-card progress-panel">
                    <div><span class="eyebrow">COMPLETION</span><h2 class="section-title">Submission progress</h2><p class="text-muted">Keep your coursework moving.</p></div>
                    <div class="progress-ring-large" style="--progress:${completedPct * 3.6}deg"><div><strong>${completedPct}%</strong><span>done</span></div></div>
                    <div class="progress-caption"><span>${submissions.length} submitted</span><span>${Math.max(0, assignments.length-submissions.length)} pending</span></div>
                </aside>
            </div>

            <div class="dashboard-grid premium-dashboard-grid">
                <section class="section-card">
                    <div class="section-heading"><div><span class="eyebrow">UP NEXT</span><h2 class="section-title">Upcoming assignments</h2><p class="text-muted">Your closest deadlines appear first.</p></div><a class="btn btn-secondary btn-sm" href="assignments.html">Open all</a></div>
                    <div class="upcoming-list">
                        ${pending.length ? pending.map(a => `<article class="upcoming-item"><div class="upcoming-icon">${new Date(a.dueDate).getDate()}</div><div class="upcoming-main"><div class="upcoming-title">${PG.escapeHtml(a.title)}</div><small>${PG.escapeHtml(a.course)}</small></div><div class="upcoming-due ${daysUntil(a.dueDate).includes('Past')?'is-past':''}">${daysUntil(a.dueDate)}<span>${PG.escapeHtml(PG.formatDate(a.dueDate))}</span></div></article>`).join('') : '<div class="empty-state"><div>✓</div><strong>All caught up</strong><p>You have a submission for every current assignment.</p></div>'}
                    </div>
                </section>
                <section class="section-card">
                    <div class="section-heading"><div><span class="eyebrow">RECENT</span><h2 class="section-title">Latest results</h2><p class="text-muted">Your most recent activity.</p></div><a class="btn btn-secondary btn-sm" href="results.html">View results</a></div>
                    <div class="activity-list">
                        ${recent.length ? recent.map(s => { const a = assignments.find(x => String(x.id || x._id) === String(s.assignmentId)); return `<article class="activity-item"><div class="activity-dot ${s.flagged?'dot-danger':'dot-safe'}"></div><div class="activity-main"><strong>${PG.escapeHtml(a?.title || 'Assignment')}</strong><small>${PG.escapeHtml(PG.formatDate(s.submittedAt))} · ${Number(s.maxSimilarity||0).toFixed(1)}% similarity</small></div><div>${plagiarismStatusBadge(s)}</div></article>`; }).join('') : '<div class="empty-state"><div>◎</div><strong>No results yet</strong><p>Submit work to start building your results history.</p></div>'}
                    </div>
                </section>
            </div>

            <section class="section-card quick-actions-card">
                <div class="section-heading"><div><span class="eyebrow">QUICK ACTIONS</span><h2 class="section-title">Keep your workspace moving</h2><p class="text-muted">Common actions are one click away.</p></div></div>
                <div class="quick-actions-grid"><a class="quick-action" href="upload.html"><span>↑</span><div><strong>Submit assignment</strong><small>Paste text or upload your file.</small></div><b>→</b></a><a class="quick-action" href="assignments.html"><span>▣</span><div><strong>Check deadlines</strong><small>See what is due next.</small></div><b>→</b></a><a class="quick-action" href="results.html"><span>◌</span><div><strong>Review similarity</strong><small>Open your latest report.</small></div><b>→</b></a><a class="quick-action" href="../profile.html"><span>◉</span><div><strong>Update profile</strong><small>Keep your account details current.</small></div><b>→</b></a></div>
            </section>
        `
    });
}

renderStudentDashboard();