const instructor = PG.requireRole('instructor');
if (!instructor) throw new Error('Unauthorized');


function regexEscape(value) {
    const specials = new Set(['\\', '.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']']);
    return Array.from(String(value)).map(ch => specials.has(ch) ? `\\${ch}` : ch).join('');
}

function highlightMatchingText(text, matchingNgrams = []) {
    const source = String(text || '');
    const phrases = [...new Set((matchingNgrams || []).map(String).filter(Boolean))].slice(0, 30);
    const matches = [];
    phrases.forEach((phrase, phraseIndex) => {
        const words = phrase.toLowerCase().split(/\s+/).filter(Boolean);
        if (!words.length) return;
        const pattern = words.map(word => `\\b${regexEscape(word)}\\b`).join('(?:[^A-Za-z0-9_]+)');
        const regex = new RegExp(pattern, 'gi');
        let match;
        while ((match = regex.exec(source)) !== null) {
            if (match[0].length === 0) { regex.lastIndex += 1; continue; }
            matches.push({ start: match.index, end: match.index + match[0].length, phrase, phraseIndex });
            if (matches.length >= 180) break;
        }
    });
    if (!matches.length) return PG.escapeHtml(source).replace(/\n/g, '<br>');

    matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start) || a.phraseIndex - b.phraseIndex);
    const selected = [];
    let cursor = 0;
    for (const item of matches) {
        if (item.start < cursor) continue;
        selected.push(item);
        cursor = item.end;
    }

    let html = '';
    let pos = 0;
    selected.forEach(item => {
        html += PG.escapeHtml(source.slice(pos, item.start)).replace(/\n/g, '<br>');
        const cls = `match-color-${(item.phraseIndex % 5) + 1}`;
        html += `<mark class="match-highlight ${cls}" title="Shared phrase: ${PG.escapeHtml(item.phrase)}">${PG.escapeHtml(source.slice(item.start, item.end)).replace(/\n/g, '<br>')}</mark>`;
        pos = item.end;
    });
    html += PG.escapeHtml(source.slice(pos)).replace(/\n/g, '<br>');
    return html;
}

function renderMatchLegend(phrases) {
    if (!phrases?.length) return '<span class="match-legend-empty">No overlapping phrases found.</span>';
    return phrases.slice(0, 8).map((phrase, index) => `
      <button type="button" class="match-legend-item match-color-${(index % 5) + 1}" data-match-index="${index}" title="Find this shared phrase">
        <span class="match-legend-dot"></span><span>${PG.escapeHtml(phrase)}</span>
      </button>`).join('');
}

function toneFor(value) {
    const threshold = PG.getSettings().similarityThreshold;
    const n = Number(value || 0);
    return n >= threshold ? 'danger' : n >= threshold / 2 ? 'watch' : 'safe';
}

function buildHeatmapRows(items) {
    const settings = PG.getSettings();
    const header = items.map(s => `<th title="${PG.escapeHtml(s.studentName)}">${PG.escapeHtml(s.studentName.slice(0, 8))}</th>`).join('');
    const body = items.map(row => {
        const cells = items.map(col => {
            if (row.id === col.id) return '<td class="heat-diag">—</td>';
            if (row.studentId === col.studentId) return '<td class="heat-empty">—</td>';
            const result = PG.compareTexts(row.text, col.text, settings.ngramSize);
            const value = result.similarity;
            const intensity = Math.max(0, Math.min(1, value / 100));
            const tone = toneFor(value);
            return `<td class="heat-cell tone-${tone}" title="${PG.escapeHtml(row.studentName)} ↔ ${PG.escapeHtml(col.studentName)}: ${value.toFixed(1)}%" style="--heat:${intensity}">${value.toFixed(0)}%</td>`;
        }).join('');
        return `<tr><th title="${PG.escapeHtml(row.studentName)}">${PG.escapeHtml(row.studentName.slice(0, 14))}</th>${cells}</tr>`;
    }).join('');
    return `<div class="heatmap-shell"><div class="heatmap-toolbar"><span><strong>Pairwise similarity matrix</strong><small>Each cell compares two different students.</small></span><span class="heatmap-key"><i></i>Low <i></i>Medium <i></i>High</span></div><div class="heatmap-wrap"><table class="heatmap"><thead><tr><th>Student</th>${header}</tr></thead><tbody>${body}</tbody></table></div></div>`;
}

function openPairReport(submission) {
    const all = PG.getSubmissions();
    const settings = PG.getSettings();
    const top = submission.topMatchSubmissionId ? all.find(s => s.id === submission.topMatchSubmissionId) : null;
    if (!top) return;
    const comparison = PG.compareTexts(submission.text, top.text, settings.ngramSize);
    const assignmentA = PG.getAssignments().find(a => a.id === submission.assignmentId);
    const assignmentB = PG.getAssignments().find(a => a.id === top.assignmentId);
    const modal = document.createElement('div');
    modal.className = 'report-modal-backdrop';
    const tone = toneFor(comparison.similarity);
    modal.innerHTML = `
      <div class="report-modal report-modal-instructor">
        <div class="report-modal-topbar">
          <div class="report-brand"><span class="brand-icon">🛡️</span><div><strong>PlagiGuard Pair Report</strong><small>${PG.escapeHtml(submission.studentName)} ↔ ${PG.escapeHtml(top.studentName)}</small></div></div>
          <div class="report-modal-actions"><button class="btn btn-secondary btn-sm" id="print-report">Print report</button><button class="report-close" aria-label="Close">×</button></div>
        </div>
        <div class="report-modal-body">
          <section class="report-cover report-cover-pair">
            <div class="report-cover-main"><span class="eyebrow">INSTRUCTOR REVIEW</span><h2>${PG.escapeHtml(assignmentA?.title||'Submission')} vs ${PG.escapeHtml(top.studentName)}</h2><p>${PG.escapeHtml(submission.studentName)} · ${PG.escapeHtml(top.studentName)} · ${settings.ngramSize}-gram Jaccard</p></div>
            <div class="report-score-ring ${tone}" style="--report-score:${Math.min(100, Math.max(0, comparison.similarity)) * 3.6}deg"><div><strong>${comparison.similarity.toFixed(1)}%</strong><span>pair similarity</span></div></div>
          </section>
          <section class="report-alert ${comparison.similarity >= settings.similarityThreshold ? 'alert-danger' : 'alert-safe'}"><div class="report-alert-icon">${comparison.similarity >= settings.similarityThreshold?'!':'✓'}</div><div><strong>${comparison.similarity >= settings.similarityThreshold ? 'Flagged for instructor review' : 'Below current review threshold'}</strong><p>${comparison.similarity >= settings.similarityThreshold ? `This pair meets or exceeds the ${settings.similarityThreshold}% threshold.` : `This pair is below the ${settings.similarityThreshold}% threshold.`} Inspect the shared wording before making any academic decision.</p></div></section>
          <section class="report-stat-grid"><div class="report-stat"><span>Student A</span><strong>${PG.escapeHtml(submission.studentName)}</strong><small>${PG.escapeHtml(assignmentA?.title||'Submission')}</small></div><div class="report-stat"><span>Student B</span><strong>${PG.escapeHtml(top.studentName)}</strong><small>${PG.escapeHtml(assignmentB?.title||'Submission')}</small></div><div class="report-stat"><span>Shared n-grams</span><strong>${comparison.matchingNgrams.length}</strong><small>${settings.ngramSize}-word phrases</small></div><div class="report-stat"><span>Threshold</span><strong>${settings.similarityThreshold}%</strong><small>Instructor setting</small></div></section>
          <section class="report-section"><div class="report-section-heading"><div><span class="eyebrow">MATCHING EVIDENCE</span><h3>Shared n-grams</h3></div><span class="report-method">${settings.ngramSize}-gram + Jaccard</span></div><div class="report-match-grid">${comparison.matchingNgrams.slice(0,24).map((g,i)=>`<article class="report-match-card"><div class="match-index">${String(i+1).padStart(2,'0')}</div><div><strong>${PG.escapeHtml(g)}</strong><small>Shared phrase</small></div></article>`).join('') || '<div class="report-empty-inline">No shared phrases found.</div>'}</div></section>
          <section class="report-section report-side-by-side-section">
            <div class="report-section-heading">
              <div><span class="eyebrow">SIDE-BY-SIDE REVIEW</span><h3>Highlighted matching passages</h3><p class="text-muted">The same shared n-grams are highlighted in both submissions so you can review the surrounding context.</p></div>
              <span class="report-method">${comparison.matchingNgrams.length} shared phrases</span>
            </div>
            <div class="match-legend">${renderMatchLegend(comparison.matchingNgrams)}</div>
            <div class="report-side-by-side">
              <article class="report-source-pane">
                <header><div><span class="eyebrow">SUBMISSION A</span><h3>${PG.escapeHtml(submission.studentName)}</h3></div><span class="source-badge">${PG.escapeHtml(assignmentA?.title || 'Submission')}</span></header>
                <div class="report-source-text">${highlightMatchingText(submission.text, comparison.matchingNgrams)}</div>
              </article>
              <article class="report-source-pane">
                <header><div><span class="eyebrow">SUBMISSION B</span><h3>${PG.escapeHtml(top.studentName)}</h3></div><span class="source-badge">${PG.escapeHtml(assignmentB?.title || 'Submission')}</span></header>
                <div class="report-source-text">${highlightMatchingText(top.text, comparison.matchingNgrams)}</div>
              </article>
            </div>
          </section>
          <section class="report-disclaimer"><strong>Instructor guidance</strong><p>Similarity measures shared wording within saved submissions. Use the report to identify passages worth reviewing; do not treat the score as a standalone plagiarism verdict.</p></section>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.body.classList.add('report-modal-open');
    const close = () => { modal.remove(); document.body.classList.remove('report-modal-open'); };
    modal.querySelector('.report-close').addEventListener('click', close);
    modal.addEventListener('click', e=>{ if(e.target===modal) close(); });
    modal.querySelector('#print-report').addEventListener('click', ()=>window.print());
    modal.querySelectorAll('.match-legend-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.matchIndex);
            modal.querySelectorAll('.match-highlight').forEach(mark => mark.classList.remove('match-highlight-focus'));
            modal.querySelectorAll(`.match-color-${(idx % 5) + 1}`).forEach(mark => mark.classList.add('match-highlight-focus'));
            const first = modal.querySelector(`.report-source-text .match-color-${(idx % 5) + 1}`);
            first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
}

function renderReports() {
    const settings = PG.getSettings();
    const submissions = PG.getInstructorSubmissions().sort((a,b)=>(Number(b.maxSimilarity)||0)-(Number(a.maxSimilarity)||0));
    const assignments = PG.getAssignments();
    const flagged = submissions.filter(s=>s.flagged);
    const compared = submissions.filter(s=>s.topMatchStudent);
    const average = compared.length ? compared.reduce((sum,s)=>sum+(Number(s.maxSimilarity)||0),0)/compared.length : 0;
    const highest = submissions[0];

    pgLayout({
      active:'reports', role:'instructor', title:'Similarity Reports',
      subtitle:'A report-first review workspace for pairwise similarity, shared wording and instructor decisions.',
      headerAction:`<a class="btn btn-secondary" href="../student/results.html" style="display:none">Student view</a>`,
      content:`
        <div class="report-command-bar">
          <div><span class="eyebrow">INSTRUCTOR REPORT CENTER</span><strong>${flagged.length} flagged pair${flagged.length===1?'':'s'} require attention</strong><span class="text-muted">Threshold ${settings.similarityThreshold}% · ${settings.ngramSize}-gram Jaccard</span></div>
          <div class="report-command-meta"><span class="mini-method">${submissions.length} submissions</span><span class="mini-method">${assignments.length} assignments</span><a class="btn btn-primary btn-sm" href="assignments.html">Manage submissions</a></div>
        </div>
        <section class="report-stat-grid report-stat-grid-top"><div class="report-stat report-stat-primary"><span>Average similarity</span><strong>${compared.length?average.toFixed(1)+'%':'—'}</strong><small>Across comparable submissions</small></div><div class="report-stat"><span>Flagged</span><strong>${flagged.length}</strong><small>At or above ${settings.similarityThreshold}%</small></div><div class="report-stat"><span>Highest similarity</span><strong>${highest&&highest.topMatchStudent?(Number(highest.maxSimilarity)||0).toFixed(1)+'%':'—'}</strong><small>${highest?.topMatchStudent?PG.escapeHtml(highest.topMatchStudent):'No comparisons yet'}</small></div><div class="report-stat"><span>Pair method</span><strong>${settings.ngramSize}-gram</strong><small>Jaccard similarity</small></div></section>
        <section class="report-grid professional-report-layout">
          <div class="section-card report-heatmap-card"><div class="report-section-heading"><div><span class="eyebrow">MATRIX</span><h2 class="section-title">Similarity map</h2><p class="text-muted">Use the matrix to spot clusters of high overlap before opening an individual report.</p></div><div class="heatmap-legend"><span class="legend low"></span>Low <span class="legend med"></span>Review <span class="legend high"></span>High</div></div>${submissions.length>1?buildHeatmapRows(submissions):'<div class="report-empty-state">Submit work from at least two students to populate the pairwise matrix.</div>'}</div>
          <aside class="section-card flagged-inbox"><div class="report-section-heading"><div><span class="eyebrow">PRIORITY QUEUE</span><h2 class="section-title">Flagged submissions</h2><p class="text-muted">Highest similarity appears first.</p></div><span class="report-chip">${flagged.length}</span></div><div class="priority-list">${flagged.map((s,i)=>{const a=assignments.find(x=>x.id===s.assignmentId);return `<article class="priority-item"><div class="priority-rank">${String(i+1).padStart(2,'0')}</div><div class="priority-main"><strong>${PG.escapeHtml(s.studentName)}</strong><span>${s.topMatchStudent?`↔ ${PG.escapeHtml(s.topMatchStudent)}`:'No pair'} · ${PG.escapeHtml(a?.title||'Assignment')}</span><small>${s.matchingNgrams?.length||0} shared n-grams · ${PG.formatDate(s.submittedAt)}</small></div><div class="priority-score">${(Number(s.maxSimilarity)||0).toFixed(1)}%</div><button class="btn btn-secondary btn-sm priority-open" data-id="${s.id}">Open</button></article>`;}).join('') || '<div class="report-empty-state">No flagged submissions at the current threshold.</div>'}</div></aside>
        </section>
        <section class="section-card report-all-card"><div class="report-section-heading"><div><span class="eyebrow">ALL REPORTS</span><h2 class="section-title">Submission report list</h2><p class="text-muted">Open any submission to inspect its similarity evidence.</p></div><div class="report-tools"><input id="report-search" class="form-input search-input" type="search" placeholder="Search student or assignment..." aria-label="Search reports"><div class="report-filter-tabs"><button class="active" data-filter="all">All</button><button data-filter="flagged">Flagged</button><button data-filter="clear">Below threshold</button></div></div><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Student</th><th>Assignment</th><th>Similarity</th><th>Top match</th><th>Status</th><th>Marks</th><th></th></tr></thead><tbody>${submissions.map(s=>{const a=assignments.find(x=>x.id===s.assignmentId);const sim=Number(s.maxSimilarity)||0;const state=s.flagged?'flagged':s.topMatchStudent?'clear':'pending';return `<tr data-filter-state="${state}" data-report-search="${PG.escapeHtml(`${s.studentName} ${a?.title || ''} ${s.status || ''}`.toLowerCase())}"><td><strong>${PG.escapeHtml(s.studentName)}</strong><span>${PG.escapeHtml(PG.getUsers().find(u=>u.id===s.studentId)?.studentId||'')}</span></td><td>${PG.escapeHtml(a?.title||'Unknown')}</td><td><strong class="score-${toneFor(sim)}">${sim.toFixed(1)}%</strong><div class="report-table-bar"><span class="${toneFor(sim)}" style="width:${Math.min(sim,100)}%"></span></div></td><td>${s.topMatchStudent?PG.escapeHtml(s.topMatchStudent):'—'}</td><td>${s.flagged?'<span class="report-status flagged">Flagged</span>':s.topMatchStudent?'<span class="report-status clear">Not flagged</span>':'<span class="report-status pending">Awaiting</span>'}</td><td>${s.marks!==null&&s.marks!==undefined?`${s.marks}/${a?.maxMarks??10}`:'Pending'}</td><td>${s.topMatchStudent?`<button class="btn btn-primary btn-sm report-pair-open" data-id="${s.id}">View report</button>`:'<span class="table-sub">No pair yet</span>'}</td></tr>`;}).join('') || '<tr><td colspan="7" class="report-empty-table">No submissions yet.</td></tr>'}</tbody></table></div></section>`
    });

    document.querySelectorAll('.priority-open,.report-pair-open').forEach(btn=>btn.addEventListener('click',()=>{const s=PG.getSubmissions().find(x=>x.id===btn.dataset.id);if(s)openPairReport(s);}));
    document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const filter=btn.dataset.filter;document.querySelectorAll('[data-filter-state]').forEach(row=>row.hidden=filter!=='all'&&row.dataset.filterState!==filter);}));
}
renderReports();


const reportSearch = document.getElementById('report-search');
reportSearch?.addEventListener('input', () => {
  const q = reportSearch.value.trim().toLowerCase();
  document.querySelectorAll('[data-report-search]').forEach(row => { row.hidden = !!q && !row.dataset.reportSearch.includes(q); });
});
