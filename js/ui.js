function pgRoot() {
    return (location.pathname.includes('/student/') || location.pathname.includes('/instructor/')) ? '../' : '';
}

function pgNav(active) {
    const user = PG.getCurrentUser();
    const root = pgRoot();
    const links = user
        ? (user.role === 'student'
            ? [
                [root + 'student/dashboard.html', 'Dashboard', 'dashboard'],
                [root + 'student/assignments.html', 'My Assignments', 'assignments'],
                [root + 'student/upload.html', 'Upload', 'upload'],
                [root + 'profile.html', 'Profile', 'profile']
            ]
            : [
                [root + 'instructor/dashboard.html', 'Dashboard', 'dashboard'],
                [root + 'instructor/assignments.html', 'Submissions', 'assignments'],
                [root + 'instructor/reports.html', 'Reports', 'reports'],
                [root + 'profile.html', 'Profile', 'profile'],
                [root + 'setting.html', 'Settings', 'settings']
            ])
        : [[root + 'how-it-works.html', 'How It Works', 'how']];

    return `
        <header class="pg-nav">
            <a class="brand" href="${user ? (user.role === 'student' ? root + 'student/dashboard.html' : root + 'instructor/dashboard.html') : root + 'index.html'}">
                <span class="brand-icon">🛡️</span>
                <span>PlagiGuard</span>
            </a>
            <nav class="nav-links">
                ${links.map(([href, label, key]) => `<a class="${active === key ? 'active' : ''}" href="${href}">${label}</a>`).join('')}
                ${user ? `<button class="btn btn-secondary btn-sm" id="logout-btn">Logout</button>` : `<a class="btn btn-secondary btn-sm" href="${root}login.html">Login</a><a class="btn btn-primary btn-sm" href="${root}signup.html">Sign Up</a>`}
            </nav>
        </header>
    `;
}

function pgLayout({ active = '', title, subtitle, content, role }) {
    document.body.innerHTML = `
        ${pgNav(active)}
        <main class="dashboard-container">
            <div class="dashboard-header">
                <div>
                    <span class="eyebrow">${role ? role.toUpperCase() : 'PLAGIGUARD'}</span>
                    <h1 class="dashboard-title">${title}</h1>
                    <p class="text-muted">${subtitle || ''}</p>
                </div>
            </div>
            ${content}
        </main>
        <div id="toast" class="pg-toast" aria-live="polite"></div>
    `;
    bindLogout();
}

function bindLogout() {
    const button = document.getElementById('logout-btn');
    if (button) {
        button.addEventListener('click', () => {
            PG.logout();
            window.location.href = pgRoot() + 'index.html';
        });
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
}

function badge(text, type = 'neutral') {
    return `<span class="badge badge-${type}">${PG.escapeHtml(text)}</span>`;
}

function similarityBadge(value) {
    const settings = PG.getSettings();
    const n = Number(value || 0);
    const type = n >= settings.similarityThreshold ? 'danger' : n >= settings.similarityThreshold / 2 ? 'review' : 'success';
    return badge(`${n.toFixed(1)}%`, type);
}
