const user = PG.getCurrentUser();
if (!user) { window.location.href = 'login.html'; throw new Error('Unauthorized'); }
if (user.role !== 'instructor') { window.location.href = 'student/dashboard.html'; throw new Error('Instructor access required'); }
const settings = PG.getSettings();

pgLayout({
    active: 'settings', role: user?.role,
    title: 'Settings', subtitle: 'Change the plagiarism rules used for all new comparisons.',
    content: `<section class="section-card settings-form"><form id="settings-form" class="stack-form"><div class="setting-row"><div><h3>N-Gram size</h3><p class="text-muted">Consecutive words grouped into each n-gram.</p></div><select id="ngram" class="form-input form-input-sm"><option value="2">2-gram</option><option value="3">3-gram</option><option value="4">4-gram</option><option value="5">5-gram</option></select></div><div class="setting-row"><div><h3>Jaccard similarity</h3><p class="text-muted">Jaccard similarity is calculated as intersection ÷ union.</p></div><span class="static-setting">Fixed</span></div><div class="setting-row"><div><h3>Similarity threshold</h3><p class="text-muted">Submissions at or above this percentage are flagged.</p></div><div class="range-wrap"><input id="threshold" type="range" min="5" max="100" value="${settings.similarityThreshold}"><strong><span id="thresholdValue">${settings.similarityThreshold}</span>%</strong></div></div><div class="setting-row"><div><h3>Minimum words</h3><p class="text-muted">Shorter submissions are rejected before analysis.</p></div><input id="minimumWords" class="form-input form-input-sm" type="number" min="5" max="5000" value="${settings.minimumWords}"></div><div class="setting-note">⚠️ Settings are stored in this browser using localStorage and apply to this browser only.</div><div><button class="btn btn-primary" type="submit">Save Settings</button><button class="btn btn-secondary" type="button" id="reset-settings" style="margin-left:.5rem">Reset Defaults</button></div></form></section>`
});

document.getElementById('ngram').value = String(settings.ngramSize);
document.getElementById('threshold').addEventListener('input', e => document.getElementById('thresholdValue').textContent = e.target.value);
document.getElementById('settings-form').addEventListener('submit', e => {
    e.preventDefault();
    PG.saveSettings({ ngramSize: Number(document.getElementById('ngram').value), similarityThreshold: Number(document.getElementById('threshold').value), minimumWords: Number(document.getElementById('minimumWords').value) });
    PG.recalculateSimilarities();
    showToast('Similarity settings saved and existing scores recalculated.', 'success');
});
document.getElementById('reset-settings').addEventListener('click', () => {
    PG.saveSettings(PG.DEFAULT_SETTINGS);
    PG.recalculateSimilarities();
    window.location.reload();
});
