const instructor = PG.requireRole('instructor');
if (!instructor) throw new Error('Unauthorized');
const settings = PG.getSettings();
const submissions = PG.getInstructorSubmissions();
const assignments = PG.getAssignments();

function buildHeatmapRows(items) {
    const n = settings.ngramSize;
    const header = items.map(s => `<th title="${PG.escapeHtml(s.studentName)}">${PG.escapeHtml(s.studentName.slice(0, 8))}</th>`).join('');
    const body = items.map(row => {
        const cells = items.map(col => {
            if (row.id === col.id) return `<td class="heat-diag">—</td>`;
            if (row.assignmentId !== col.assignmentId) return `<td class="heat-empty">—</td>`;
            const result = PG.compareTexts(row.text, col.text, n);
            const value = result.similarity;
            const intensity = Math.max(0, Math.min(1, value / 100));
            return `<td class="heat-cell" title="${PG.escapeHtml(row.studentName)} ↔ ${PG.escapeHtml(col.studentName)}: ${value.toFixed(1)}%" style="--heat:${intensity}">${value.toFixed(0)}%</td>`;
        }).join('');
        return `<tr><th title="${PG.escapeHtml(row.studentName)}">${PG.escapeHtml(row.studentName.slice(0, 14))}</th>${cells}</tr>`;
    }).join('');
    return `<div class="heatmap-wrap"><table class="heatmap"><thead><tr><th>Student</th>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
}

const flagged = submissions.filter(s => s.flagged).sort((a,b) => b.maxSimilarity - a.maxSimilarity);

pgLayout({
    active: 'reports', role: 'instructor', title: 'Similarity Reports',
    subtitle: `Flagged submissions at or above the ${settings.similarityThreshold}% threshold.`,
    content: `<section class="section-card"><div class="report-summary"><div><span class="eyebrow">METHOD</span><strong>${settings.ngramSize}-gram + Jaccard</strong></div><div><span class="eyebrow">FLAGGED</span><strong>${flagged.length}</strong></div><div><span class="eyebrow">MINIMUM WORDS</span><strong>${settings.minimumWords}</strong></div></div><div class="report-grid"><div><h2 class="section-title">DOM Similarity Heatmap</h2><p class="text-muted">Each cell is a pairwise Jaccard score. Diagonal cells are the same submission.</p>${submissions.length ? buildHeatmapRows(submissions) : '<div class="empty-state"><div>📊</div><p>Submit at least two assignments to build the heatmap.</p></div>'}</div><div><h2 class="section-title">Flagged Pair Ranking</h2><div class="pair-list">${flagged.map(s => `<article class="pair-item"><div><div class="pair-students">${PG.escapeHtml(s.studentName)}${s.topMatchStudent ? ` ↔ ${PG.escapeHtml(s.topMatchStudent)}` : ''}</div><div class="pair-assignment">${PG.escapeHtml(assignments.find(a=>a.id===s.assignmentId)?.title || '')} · ${PG.formatDate(s.submittedAt)}</div>${s.matchingNgrams?.length ? `<div class="ngram-list">${s.matchingNgrams.slice(0,8).map(g=>`<span class="ngram-tag">${PG.escapeHtml(g)}</span>`).join('')}</div>` : ''}</div><div>${similarityBadge(s.maxSimilarity)}</div></article>`).join('') || '<div class="empty-state"><div>✅</div><p>No flagged submissions at the current threshold.</p></div>'}</div></div></div></section>`
});
