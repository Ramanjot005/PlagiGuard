const instructor = PG.requireRole('instructor');
if (!instructor) throw new Error('Unauthorized');

function render() {
    const submissions = PG.getInstructorSubmissions();
    const assignments = PG.getAssignments();
    pgLayout({
        active: 'assignments', role: 'instructor', title: 'Student Submissions',
        subtitle: 'Inspect individual assignments, similarity results and marking status.',
        content: `<section class="section-card"><div class="toolbar"><div><strong>${submissions.length}</strong> total submissions</div><div class="filter-group"><label for="assignment-filter">Assignment</label><select id="assignment-filter" class="form-input form-input-sm"><option value="all">All assignments</option>${assignments.map(a => `<option value="${a.id}">${PG.escapeHtml(a.title)}</option>`).join('')}</select><label><input type="checkbox" id="flag-filter"> Flagged only</label></div></div><div class="table-responsive"><table class="data-table"><thead><tr><th>Student</th><th>Assignment</th><th>Words</th><th>Similarity</th><th>Status</th><th>Marks</th><th></th></tr></thead><tbody id="submission-rows"></tbody></table></div></section>`
    });

    function updateRows() {
        const selected = document.getElementById('assignment-filter').value;
        const flaggedOnly = document.getElementById('flag-filter').checked;
        const rows = submissions.filter(s => (selected === 'all' || s.assignmentId === selected) && (!flaggedOnly || s.flagged)).map(s => {
            const a = assignments.find(item => item.id === s.assignmentId);
            return `<tr><td><strong>${PG.escapeHtml(s.studentName)}</strong></td><td>${PG.escapeHtml(a?.title || '')}</td><td>${s.wordCount}</td><td>${similarityBadge(s.maxSimilarity)}${s.topMatchStudent ? `<div class="table-sub">vs. ${PG.escapeHtml(s.topMatchStudent)}</div>` : ''}</td><td>${badge(s.status, s.status === 'Marked' ? 'success' : s.flagged ? 'danger' : 'review')}</td><td>${s.marks === null ? 'Pending' : `${s.marks}/${a?.maxMarks ?? 10}`}</td><td><button class="btn btn-primary btn-sm review-btn" data-id="${s.id}">Review & Mark</button></td></tr>`;
        }).join('');
        document.getElementById('submission-rows').innerHTML = rows || `<tr><td colspan="7">No submissions match this filter.</td></tr>`;
        document.querySelectorAll('.review-btn').forEach(btn => btn.addEventListener('click', () => openReview(btn.dataset.id)));
    }
    updateRows();
    document.getElementById('assignment-filter').addEventListener('change', updateRows);
    document.getElementById('flag-filter').addEventListener('change', updateRows);
}

function openReview(id) {
    const s = PG.getSubmissions().find(item => item.id === id);
    const a = PG.getAssignments().find(item => item.id === s.assignmentId);
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal-card"><button class="modal-close">×</button><div class="modal-header"><div><span class="eyebrow">${PG.escapeHtml(s.studentName)}</span><h2>${PG.escapeHtml(a.title)}</h2></div>${similarityBadge(s.maxSimilarity)}</div><pre class="submission-preview">${PG.escapeHtml(s.text)}</pre><div class="review-actions"><label>Marks <input class="form-input" id="quick-marks" type="number" min="0" max="${a.maxMarks}" value="${s.marks ?? ''}"></label><button class="btn btn-primary" id="save-quick">Save mark</button></div><div class="match-panel"><strong>Jaccard details</strong><p class="text-muted">${s.topMatchStudent ? `Highest match: ${PG.escapeHtml(s.topMatchStudent)} at ${s.maxSimilarity.toFixed(1)}%.` : 'No comparison partner yet.'}</p>${s.matchingNgrams?.length ? `<div class="ngram-list">${s.matchingNgrams.map(g => `<span class="ngram-tag">${PG.escapeHtml(g)}</span>`).join('')}</div>` : ''}</div></div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('.modal-close').addEventListener('click', () => wrap.remove());
    wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
    wrap.querySelector('#save-quick').addEventListener('click', () => {
        const marks = Number(wrap.querySelector('#quick-marks').value);
        if (marks < 0 || marks > a.maxMarks) { showToast(`Enter marks between 0 and ${a.maxMarks}.`, 'error'); return; }
        PG.markSubmission(id, marks, s.feedback, 'Marked');
        wrap.remove();
        showToast('Mark saved.', 'success');
        render();
    });
}

render();
