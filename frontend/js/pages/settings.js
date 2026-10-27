const user = PG.getCurrentUser();
if (!user) { window.location.href = 'login.html'; throw new Error('Unauthorized'); }
if (user.role !== 'instructor') { window.location.href = 'student/dashboard.html'; throw new Error('Instructor access required'); }

async function initSettingsPage() {
  let settings = PG.getSettings();
  if (PG.getAuthToken()) {
    try {
      settings = await PG.fetchSettingsAPI();
    } catch (err) {
      console.warn('Using local settings cache:', err);
    }
  }

  pgLayout({
    active: 'settings', role: 'instructor', title: 'Analysis Settings',
    subtitle: 'Tune the similarity engine used across student submissions.',
    content: `
      <section class="settings-hero card">
        <div><span class="eyebrow">CONTROL CENTER</span><h2>Similarity engine</h2><p>These rules are controlled by instructors and applied when comparison results are calculated.</p></div>
        <div class="settings-engine-badge"><span class="engine-dot"></span><div><strong>Jaccard + n-gram</strong><small>Backend similarity analysis</small></div></div>
      </section>
      <div class="settings-layout">
        <section class="section-card settings-card">
          <div class="section-heading"><div><span class="eyebrow">RULES</span><h2 class="section-title">Comparison settings</h2><p class="text-muted">Adjust the rules to fit your course policy.</p></div></div>
          <form id="settings-form" class="stack-form">
            <div class="setting-control">
              <div class="setting-copy"><div class="setting-icon">#</div><div><h3>N-Gram size</h3><p>Number of consecutive words grouped into each n-gram.</p></div></div>
              <select id="ngram" class="form-input form-input-sm"><option value="2">2-gram</option><option value="3">3-gram</option><option value="4">4-gram</option><option value="5">5-gram</option></select>
            </div>
            <div class="setting-control">
              <div class="setting-copy"><div class="setting-icon">∩</div><div><h3>Jaccard similarity</h3><p>The score is calculated from shared n-grams divided by the union.</p></div></div>
              <span class="static-setting"><span class="status-dot"></span>Automatic</span>
            </div>
            <div class="setting-control setting-control-range">
              <div class="setting-copy"><div class="setting-icon">%</div><div><h3>Similarity threshold</h3><p>Scores at or above this percentage are marked as flagged.</p></div></div>
              <div class="range-panel"><div class="range-value"><strong id="thresholdValue">${settings.similarityThreshold}%</strong><span>Flagging threshold</span></div><input id="threshold" type="range" min="5" max="100" value="${settings.similarityThreshold}"><div class="range-labels"><span>5%</span><span>50%</span><span>100%</span></div></div>
            </div>
            <div class="setting-control">
              <div class="setting-copy"><div class="setting-icon">Aa</div><div><h3>Minimum words</h3><p>Submissions shorter than this value are rejected before analysis.</p></div></div>
              <input id="minimumWords" class="form-input form-input-sm" type="number" min="5" max="5000" value="${settings.minimumWords}">
            </div>
            <div class="settings-note"><span>ⓘ</span><div><strong>Instructor-only setting</strong><p>Changes are saved to the server and applied across student coursework.</p></div></div>
            <div class="settings-actions"><button class="btn btn-primary" type="submit">Save settings</button><button class="btn btn-secondary" type="button" id="reset-settings">Restore defaults</button></div>
          </form>
        </section>
        <aside class="settings-side">
          <section class="section-card settings-summary"><span class="eyebrow">CURRENT PROFILE</span><div class="setting-stat"><strong id="summary-ngram">${settings.ngramSize}-gram</strong><span>Grouping</span></div><div class="setting-stat"><strong id="summary-threshold">${settings.similarityThreshold}%</strong><span>Flag threshold</span></div><div class="setting-stat"><strong id="summary-min">${settings.minimumWords}</strong><span>Minimum words</span></div></section>
          <section class="section-card settings-help"><span class="eyebrow">GUIDANCE</span><h3>Practical defaults</h3><p>Use 3-grams for a balanced comparison. Keep the threshold aligned with your institution's review policy rather than treating one score as proof by itself.</p></section>
        </aside>
      </div>`
  });

  document.getElementById('ngram').value = String(settings.ngramSize || 3);
  document.getElementById('threshold').addEventListener('input', e => {
    document.getElementById('thresholdValue').textContent = e.target.value + '%';
    document.getElementById('summary-threshold').textContent = e.target.value + '%';
  });
  document.getElementById('ngram').addEventListener('change', e => document.getElementById('summary-ngram').textContent = e.target.value + '-gram');
  document.getElementById('minimumWords').addEventListener('input', e => document.getElementById('summary-min').textContent = e.target.value);

  document.getElementById('settings-form').addEventListener('submit', async e => {
    e.preventDefault();
    const updated = {
      ngramSize: Number(document.getElementById('ngram').value),
      similarityThreshold: Number(document.getElementById('threshold').value),
      minimumWords: Number(document.getElementById('minimumWords').value)
    };

    if (PG.getAuthToken()) {
      try {
        await PG.updateSettingsAPI(updated);
        PG.saveSettings(updated);
        showToast('Analysis settings saved to server.', 'success');
      } catch (err) {
        showToast(err.message || 'Unable to update server settings.', 'error');
      }
    } else {
      PG.saveSettings(updated);
      PG.recalculateSimilarities();
      showToast('Analysis settings saved and scores recalculated.', 'success');
    }
  });

  document.getElementById('reset-settings').addEventListener('click', async () => {
    if (PG.getAuthToken()) {
      try {
        await PG.updateSettingsAPI(PG.DEFAULT_SETTINGS);
        PG.saveSettings(PG.DEFAULT_SETTINGS);
        window.location.reload();
      } catch (err) {
        showToast(err.message || 'Unable to reset settings.', 'error');
      }
    } else {
      PG.saveSettings(PG.DEFAULT_SETTINGS);
      PG.recalculateSimilarities();
      window.location.reload();
    }
  });
}

initSettingsPage();
