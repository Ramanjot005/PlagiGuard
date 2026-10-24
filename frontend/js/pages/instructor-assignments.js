const instructor = PG.requireRole('instructor');
if (!instructor) throw new Error('Unauthorized');

let currentAssignments = [];
let currentSubmissions = [];

async function loadData() {
    if (PG.getAuthToken()) {
        try {
            const [asgList, subList] = await Promise.all([
                PG.fetchAssignments(),
                PG.fetchInstructorReports()
            ]);
            currentAssignments = asgList || [];
            currentSubmissions = (subList || []).map(s => ({
                ...s,
                id: String(s._id || s.id),
                _id: s._id,
                assignmentId: String(s.assignment?._id || s.assignment || s.assignmentId || ''),
                studentName: s.student?.name || s.studentName || 'Student',
                studentId: String(s.student?._id || s.student || s.studentId || ''),
                wordCount: s.wordCount || (s.text ? s.text.split(/\s+/).length : 0),
                submittedAt: s.createdAt || s.submittedAt || new Date().toISOString(),
                flagged: !!s.flagged,
                status: s.status === 'graded' ? 'Marked' : (s.status || 'submitted'),
                marks: s.marks,
                feedback: s.feedback || '',
                maxSimilarity: Number(s.maxSimilarity || 0),
                topMatchStudent: s.topMatch?.student?.name || s.topMatchStudent || ''
            }));
            return;
        } catch (e) {
            console.error('Failed to fetch from backend:', e);
        }
    }
    currentAssignments = PG.getAssignments();
    currentSubmissions = PG.getInstructorSubmissions();
}

function render() {
    const submissions = currentSubmissions;
    const assignments = currentAssignments;

    pgLayout({
        active: 'assignments', role: 'instructor', title: 'Assignments & Submissions',
        subtitle: 'Create new assignments for the next submission cycle, then review and mark student work.',
        content: `
          <div class="management-grid">
            <section class="section-card" id="new-assignment">
              <div class="section-heading"><div><h2 class="section-title">Create New Assignment</h2><p class="text-muted">New assignments appear automatically in every student account.</p></div><span class="badge badge-success">Instructor only</span></div>
              <form id="create-assignment-form" class="stack-form">
                <div class="form-grid-2">
                  <div class="form-group"><label class="form-label" for="a-title">Assignment title</label><input id="a-title" class="form-input" required placeholder="e.g. ES6 Features"></div>
                  <div class="form-group"><label class="form-label" for="a-course">Course / module</label><input id="a-course" class="form-input" required placeholder="e.g. JavaScript Programming"></div>
                </div>
                <div class="form-group"><label class="form-label" for="a-description">Instructions</label><textarea id="a-description" class="form-textarea" rows="4" required placeholder="Explain what students should submit..."></textarea></div>
                <div class="form-grid-2">
                  <div class="form-group"><label class="form-label" for="a-due">Due date</label><input id="a-due" class="form-input" type="date" required></div>
                  <div class="form-group"><label class="form-label" for="a-marks">Maximum marks</label><input id="a-marks" class="form-input" type="number" min="1" max="1000" value="100" required></div>
                </div>
                <div id="create-assignment-error" class="auth-error"></div>
                <div><button class="btn btn-primary" type="submit">＋ Publish Assignment</button></div>
              </form>
            </section>
            <section class="section-card">
              <div class="section-heading"><div><h2 class="section-title">Published Assignments</h2><p class="text-muted">${assignments.length} available assignment${assignments.length === 1 ? '' : 's'}</p></div></div>
              <div class="assignment-toolbar compact-toolbar"><div><span class="eyebrow">PUBLISHED WORK</span><strong>Manage the assignment cycle</strong><small>Search, edit or remove assignments.</small></div><input id="assignment-search" class="form-input search-input" type="search" placeholder="Search assignments..."></div><div class="assignment-admin-list" id="assignment-admin-list">
                ${assignments.map(a => {
                  const id = String(a._id || a.id);
                  return `<article class="admin-assignment-card" data-assignment-search="${PG.escapeHtml(`${a.title} ${a.course} ${a.description}`.toLowerCase())}"><div><span class="eyebrow">${PG.escapeHtml(a.course)}</span><h3>${PG.escapeHtml(a.title)}</h3><p>${PG.escapeHtml(a.description)}</p></div><div class="admin-assignment-meta"><span class="deadline-badge ${PG.deadlineState(a.dueDate)}">${PG.daysUntil(a.dueDate)}</span><span>Due ${PG.formatDate(a.dueDate)}</span><strong>${a.maxMarks} marks</strong><div class="admin-card-actions"><button class="btn btn-secondary btn-sm edit-assignment-btn" data-id="${id}">Edit</button><button class="btn btn-danger btn-sm delete-assignment-btn" data-id="${id}">Delete</button></div></div></article>`;
                }).join('')}
              </div>
            </section>
          </div>

          <section class="section-card" style="margin-top:1rem">
            <div class="section-heading"><div><h2 class="section-title">Student Submissions</h2><p class="text-muted">Review individual submissions, similarity results and marking status.</p></div>
              <div class="filter-group"><select id="assignment-filter" class="form-input form-input-sm"><option value="all">All assignments</option>${assignments.map(a => `<option value="${String(a._id || a.id)}">${PG.escapeHtml(a.title)}</option>`).join('')}</select><label><input type="checkbox" id="flag-filter"> Flagged only</label></div>
            </div>
            <div class="table-responsive"><table class="data-table"><thead><tr><th>Student</th><th>Assignment</th><th>Words</th><th>Similarity</th><th>Status</th><th>Marks</th><th></th></tr></thead><tbody id="submission-rows"></tbody></table></div>
          </section>`
    });

    document.getElementById('create-assignment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const error = document.getElementById('create-assignment-error');
      error.textContent = '';
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const payload = {
          title: document.getElementById('a-title').value.trim(),
          course: document.getElementById('a-course').value.trim(),
          description: document.getElementById('a-description').value.trim(),
          dueDate: document.getElementById('a-due').value,
          maxMarks: Number(document.getElementById('a-marks').value) || 100
        };

        if (PG.getAuthToken()) {
          const res = await PG.createAssignmentAPI(payload);
          showToast(`"${res.data?.title || payload.title}" is now available to students.`, 'success');
        } else {
          const assignment = PG.createAssignment(payload);
          showToast(`"${assignment.title}" is now available to students.`, 'success');
        }
        document.getElementById('create-assignment-form').reset();
        await loadData();
        render();
        bindAssignmentManagement();
      } catch (err) {
        error.textContent = err.message || 'Unable to create assignment.';
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    function updateRows() {
        const selected = document.getElementById('assignment-filter').value;
        const flaggedOnly = document.getElementById('flag-filter').checked;
        const rows = currentSubmissions.filter(s => (selected === 'all' || s.assignmentId === selected) && (!flaggedOnly || s.flagged)).map(s => {
            const a = currentAssignments.find(item => String(item._id || item.id) === s.assignmentId);
            return `<tr><td><strong>${PG.escapeHtml(s.studentName)}</strong></td><td>${PG.escapeHtml(a?.title || s.assignment?.title || '')}</td><td>${s.wordCount}</td><td>${similarityBadge(s.maxSimilarity)}${s.topMatchStudent ? `<div class="table-sub">vs. ${PG.escapeHtml(s.topMatchStudent)}</div>` : ''}</td><td>${badge(s.status, s.status === 'Marked' ? 'success' : s.flagged ? 'danger' : 'review')}</td><td>${s.marks === null || s.marks === undefined ? 'Pending' : `${s.marks}/${a?.maxMarks ?? 100}`}</td><td><button class="btn btn-primary btn-sm review-btn" data-id="${s.id}">Review & Mark</button></td></tr>`;
        }).join('');
        document.getElementById('submission-rows').innerHTML = rows || `<tr><td colspan="7"><div class="empty-state"><div>◌</div><p>No submissions match this filter.</p></div></td></tr>`;
        document.querySelectorAll('.review-btn').forEach(btn => btn.addEventListener('click', () => openReview(btn.dataset.id)));
    }
    updateRows();
    document.getElementById('assignment-filter').addEventListener('change', updateRows);
    document.getElementById('flag-filter').addEventListener('change', updateRows);
    bindAssignmentManagement();
}

function openReview(id) {
    const s = currentSubmissions.find(item => String(item._id || item.id) === String(id));
    const a = currentAssignments.find(item => String(item._id || item.id) === s?.assignmentId) || s?.assignment;
    const maxAllowed = a?.maxMarks ?? 100;

    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal-card"><button class="modal-close">×</button><div class="modal-header"><div><span class="eyebrow">SUBMISSION REVIEW</span><h2>${PG.escapeHtml(a?.title || 'Submission')}</h2><p class="text-muted">${PG.escapeHtml(s?.studentName || 'Student')} · ${PG.formatDate(s?.submittedAt)}</p></div><div>${similarityBadge(s?.maxSimilarity || 0)}</div></div><div class="review-grid"><div><h3>Student submission</h3><pre class="submission-preview">${PG.escapeHtml(s?.text || '(Text stored securely on server)')}</pre></div><div><h3>Instructor marking</h3><form id="mark-form" class="stack-form"><div class="form-group"><label class="form-label">Marks / ${maxAllowed}</label><input class="form-input" id="marks" type="number" min="0" max="${maxAllowed}" step="0.5" value="${s?.marks ?? ''}" required></div><div class="form-group"><label class="form-label">Status</label><select class="form-input" id="status"><option ${s?.status === 'Marked' ? 'selected' : ''}>Marked</option><option ${s?.status === 'Needs Revision' ? 'selected' : ''}>Needs Revision</option><option ${s?.status === 'Approved' ? 'selected' : ''}>Approved</option></select></div><div class="form-group"><label class="form-label">Feedback</label><textarea class="form-textarea" id="feedback" rows="5" placeholder="Write feedback for the student...">${PG.escapeHtml(s?.feedback || '')}</textarea></div><div id="mark-error" class="auth-error"></div><button class="btn btn-primary" type="submit">Save Mark</button></form></div></div>${s?.matchingNgrams?.length ? `<div class="match-panel"><strong>Matching n-grams</strong><div class="ngram-list">${s.matchingNgrams.map(g => `<span class="ngram-tag">${PG.escapeHtml(g)}</span>`).join('')}</div>${s.topMatchStudent ? `<p class="text-muted">Top match: ${PG.escapeHtml(s.topMatchStudent)}</p>` : ''}</div>` : ''}</div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('.modal-close').addEventListener('click', () => wrap.remove());
    wrap.addEventListener('click', event => { if (event.target === wrap) wrap.remove(); });

    wrap.querySelector('#mark-form').addEventListener('submit', async event => {
      event.preventDefault();
      const error = wrap.querySelector('#mark-error');
      error.textContent = '';
      const saveBtn = event.target.querySelector('button[type="submit"]');
      if (saveBtn) saveBtn.disabled = true;

      try {
        const marks = Number(wrap.querySelector('#marks').value);
        if (marks < 0 || marks > maxAllowed) throw new Error(`Marks must be inside the assignment range (0-${maxAllowed}).`);
        const feedback = wrap.querySelector('#feedback').value;
        const status = wrap.querySelector('#status').value;

        if (PG.getAuthToken() && s?._id) {
          await PG.gradeSubmissionAPI(s._id, { marks, feedback, status: status === 'Marked' ? 'graded' : status.toLowerCase() });
        } else {
          PG.markSubmission(id, marks, feedback, status);
        }
        wrap.remove();
        showToast('Mark saved successfully.', 'success');
        await loadData();
        render();
      } catch (e) {
        error.textContent = e.message || 'Unable to save mark.';
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    });
}

function bindAssignmentManagement() {
  document.getElementById('assignment-search')?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('#assignment-admin-list .admin-assignment-card').forEach(card => { card.hidden = !!q && !card.dataset.assignmentSearch.includes(q); });
  });

  document.querySelectorAll('.delete-assignment-btn').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    const a = currentAssignments.find(x => String(x._id || x.id) === id);
    if (!a || !confirm(`Delete "${a.title}"? Existing student submissions will remain as historical records.`)) return;

    try {
      if (!PG.getAuthToken()) {
        PG.deleteAssignment(id);
      }
      showToast('Assignment deleted.', 'success');
      await loadData();
      render();
    } catch (err) {
      showToast(err.message || 'Unable to delete assignment.', 'error');
    }
  }));

  document.querySelectorAll('.edit-assignment-btn').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    const a = currentAssignments.find(x => String(x._id || x.id) === id);
    if (!a) return;
    const title = prompt('Assignment title', a.title); if (title === null) return;
    const course = prompt('Course / module', a.course); if (course === null) return;
    const description = prompt('Instructions', a.description); if (description === null) return;
    const dueDate = prompt('Due date (YYYY-MM-DD)', a.dueDate ? a.dueDate.slice(0, 10) : ''); if (dueDate === null) return;
    const marks = prompt('Maximum marks', a.maxMarks); if (marks === null) return;

    try {
      const payload = { title: title.trim(), course: course.trim(), description: description.trim(), dueDate: dueDate.trim(), maxMarks: Number(marks) };
      if (PG.getAuthToken() && a._id) {
        await PG.updateAssignmentAPI(a._id, payload);
      } else {
        PG.updateAssignment(id, payload);
      }
      showToast('Assignment updated.', 'success');
      await loadData();
      render();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }));
}

loadData().then(render);
