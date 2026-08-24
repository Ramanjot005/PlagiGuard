(function () {
  const submissions = PG.getSubmissions().filter(s => Number.isFinite(Number(s.maxSimilarity)));
  const hasLiveData = submissions.length > 0;

  const values = hasLiveData ? submissions.map(s => Number(s.maxSimilarity) || 0) : [18, 34, 57, 72, 42, 24];
  const flagged = hasLiveData ? submissions.filter(s => s.flagged).length : 2;
  const clear = hasLiveData ? Math.max(submissions.length - flagged, 0) : 4;
  const total = Math.max(flagged + clear, 1);
  const avg = values.reduce((a,b) => a+b, 0) / values.length;
  const bands = [
    values.filter(v => v < 35).length,
    values.filter(v => v >= 35 && v < 70).length,
    values.filter(v => v >= 70).length
  ];
  const maxBand = Math.max(...bands, 1);

  const avgEl = document.getElementById('home-avg-similarity');
  const countEl = document.getElementById('home-submission-count');
  const flaggedEl = document.getElementById('home-flagged-count');
  const liveLabel = document.getElementById('home-chart-mode');
  if (avgEl) avgEl.textContent = hasLiveData ? `${avg.toFixed(1)}%` : '—';
  if (countEl) countEl.textContent = hasLiveData ? String(submissions.length) : '—';
  if (flaggedEl) flaggedEl.textContent = hasLiveData ? String(flagged) : '—';
  if (liveLabel) liveLabel.textContent = hasLiveData ? 'Live browser data' : 'Illustrative preview';

  const bars = document.getElementById('similarity-bars');
  if (bars) {
    const labels = ['Clear', 'Review', 'High'];
    const fills = [bands[0], bands[1], bands[2]];
    bars.innerHTML = labels.map((label, i) => `
      <div class="analytics-bar-row">
        <div class="analytics-bar-label"><span>${label}</span><strong>${fills[i]}</strong></div>
        <div class="analytics-bar-track"><span style="width:${Math.max((fills[i] / maxBand) * 100, 6)}%"></span></div>
      </div>`).join('');
  }

  const donut = document.getElementById('status-donut');
  const center = document.getElementById('status-donut-center');
  if (donut) donut.style.setProperty('--flagged-angle', `${(flagged / total) * 360}deg`);
  if (center) center.innerHTML = `<strong>${hasLiveData ? `${Math.round((flagged / total) * 100)}%` : '—'}</strong><span>flagged</span>`;

  const spark = document.getElementById('similarity-spark');
  if (spark) {
    const w = 520, h = 150, pad = 14;
    const min = Math.min(...values, 0), max = Math.max(...values, 100);
    const denom = max - min || 1;
    const pts = values.map((v, i) => {
      const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / denom) * (h - pad * 2);
      return [x, y];
    });
    const line = pts.map(p => p.join(',')).join(' ');
    const area = `${pad},${h-pad} ${line} ${w-pad},${h-pad}`;
    spark.innerHTML = `
      <defs><linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#818cf8" stop-opacity=".35"/><stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/></linearGradient></defs>
      <polyline points="${area}" fill="url(#sparkFill)" stroke="none"></polyline>
      <polyline points="${line}" fill="none" stroke="#8b9cff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${pts.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#dbeafe" stroke="#6478ff" stroke-width="3"></circle>`).join('')}
    `;
  }
})();
