// ============================================
// PlagiGuard UI - Navigation and Shared Functions
// ============================================

// Find the frontend root correctly from any page.
function pgBasePath() {
    const path = window.location.pathname;
    const marker = '/frontend/';
    const index = path.indexOf(marker);

    if (index !== -1) {
        return path.substring(0, index + '/frontend'.length);
    }

    // Fallback for a page served directly from frontend.
    return '';
}

// Public pages are inside frontend/html/
function pgPublicHref(file) {
    return `${pgBasePath()}/html/${file}`;
}

// Student pages are inside frontend/student/
function pgStudentHref(file) {
    return `${pgBasePath()}/student/${file}`;
}

// Instructor pages are inside frontend/instructor/
function pgInstructorHref(file) {
    return `${pgBasePath()}/instructor/${file}`;
}

// Compatibility helper for existing code.
function pgRoot() {
    return (location.pathname.includes('/student/') ||
            location.pathname.includes('/instructor/'))
        ? '../'
        : '';
}

function pgInitials(name = '') {
    return name.trim()
        .split(/\s+/)
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'PG';
}

function pgAvatarMarkup(user, className = 'nav-avatar') {
    const safeName = PG.escapeHtml(user?.name || 'User');

    return user?.avatar
        ? `<img class="${className}" src="${user.avatar}" alt="${safeName} profile picture">`
        : `<span class="${className}">${PG.escapeHtml(pgInitials(user?.name || 'PG'))}</span>`;
}


// ============================================
// Notifications
// ============================================

function pgNotificationKey(userId) {
    return `pg_notifications_seen_${userId}`;
}

function pgGetNotifications() {
    const user = PG.getCurrentUser();

    if (!user) return [];

    const now = Date.now();
    const items = [];
    const assignments = PG.getAssignments();
    const submissions = PG.getSubmissions();

    if (user.role === 'student') {
        assignments.forEach(a => {
            const sub = submissions.find(
                s => s.assignmentId === a.id && s.studentId === user.id
            );

            if (sub && sub.marks !== null && sub.marks !== undefined) {
                items.push({
                    id: `marked-${sub.id}-${sub.markedAt || ''}`,
                    type: 'success',
                    icon: '✓',
                    title: 'Submission marked',
                    text: `${a.title} received ${sub.marks}/${a.maxMarks}.`,
                    date: sub.markedAt || sub.submittedAt,
                    href: pgStudentHref('results.html')
                });
            }

            if (
                !sub &&
                PG.deadlineState(a.dueDate) !== 'overdue' &&
                ['urgent', 'soon'].includes(PG.deadlineState(a.dueDate))
            ) {
                items.push({
                    id: `due-${a.id}-${a.dueDate}`,
                    type: 'warning',
                    icon: '!',
                    title: 'Deadline approaching',
                    text: `${a.title} is ${PG.daysUntil(a.dueDate).toLowerCase()}.`,
                    date: `${a.dueDate}T23:59:59`,
                    href: pgStudentHref('assignments.html')
                });
            }

            if (
                a.createdAt &&
                (now - new Date(a.createdAt).getTime()) < 14 * 86400000 &&
                !sub
            ) {
                items.push({
                    id: `new-${a.id}`,
                    type: 'info',
                    icon: '＋',
                    title: 'New assignment posted',
                    text: `${a.title} is ready for submission.`,
                    date: a.createdAt,
                    href: pgStudentHref('assignments.html')
                });
            }

            if (sub?.flagged) {
                items.push({
                    id: `flag-${sub.id}-${sub.maxSimilarity}`,
                    type: 'danger',
                    icon: '⚠',
                    title: 'Similarity review',
                    text: `${a.title} is flagged at ${Number(sub.maxSimilarity || 0).toFixed(1)}%.`,
                    date: sub.submittedAt,
                    href: pgStudentHref('results.html')
                });
            }
        });
    } else {
        submissions.forEach(s => {
            if (
                s.submittedAt &&
                (now - new Date(s.submittedAt).getTime()) < 7 * 86400000
            ) {
                const a = assignments.find(a => a.id === s.assignmentId);

                items.push({
                    id: `submission-${s.id}`,
                    type: 'info',
                    icon: '↑',
                    title: 'New submission',
                    text: `${s.studentName} submitted ${a?.title || 'an assignment'}.`,
                    date: s.submittedAt,
                    href: pgInstructorHref('assignments.html')
                });
            }

            if (s.flagged) {
                items.push({
                    id: `flagged-${s.id}-${s.maxSimilarity}`,
                    type: 'danger',
                    icon: '⚠',
                    title: 'Similarity flagged',
                    text: `${s.studentName} has a ${Number(s.maxSimilarity || 0).toFixed(1)}% similarity match.`,
                    date: s.submittedAt,
                    href: pgInstructorHref('reports.html')
                });
            }
        });

        assignments.forEach(a => {
            if (['urgent', 'soon'].includes(PG.deadlineState(a.dueDate))) {
                items.push({
                    id: `inst-due-${a.id}-${a.dueDate}`,
                    type: 'warning',
                    icon: '◷',
                    title: 'Assignment deadline',
                    text: `${a.title} is ${PG.daysUntil(a.dueDate).toLowerCase()}.`,
                    date: `${a.dueDate}T23:59:59`,
                    href: pgInstructorHref('assignments.html')
                });
            }
        });
    }

    return items
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 12);
}

function pgUnreadCount(items) {
    const user = PG.getCurrentUser();

    if (!user) return 0;

    const seen = JSON.parse(
        localStorage.getItem(pgNotificationKey(user.id)) || '[]'
    );

    return items.filter(item => !seen.includes(item.id)).length;
}

function pgNotificationsMarkup() {
    const user = PG.getCurrentUser();

    if (!user) return '';

    const items = pgGetNotifications();
    const unread = pgUnreadCount(items);

    return `
        <div class="notification-wrap">
            <button
                class="icon-btn notification-btn"
                id="notification-toggle"
                aria-label="Notifications"
                title="Notifications"
                type="button"
            >
                <span>⌁</span>
                ${unread ? `<b class="notification-dot">${Math.min(unread, 9)}</b>` : ''}
            </button>

            <div class="notification-panel" id="notification-panel">
                <div class="notification-head">
                    <div>
                        <strong>Notifications</strong>
                        <small>${unread ? `${unread} new` : 'All caught up'}</small>
                    </div>
                    <button class="text-btn" id="notification-mark-all" type="button">
                        Mark read
                    </button>
                </div>

                <div class="notification-list">
                    ${
                        items.length
                            ? items.map(item => `
                                <a
                                    class="notification-item ${item.type}"
                                    href="${item.href}"
                                    data-note-id="${PG.escapeHtml(item.id)}"
                                >
                                    <span class="notification-icon">${item.icon}</span>
                                    <span class="notification-copy">
                                        <strong>${PG.escapeHtml(item.title)}</strong>
                                        <small>${PG.escapeHtml(item.text)}</small>
                                        <em>${timeAgo(item.date)}</em>
                                    </span>
                                </a>
                            `).join('')
                            : '<div class="notification-empty">No new activity yet.</div>'
                    }
                </div>
            </div>
        </div>
    `;
}

function timeAgo(date) {
    const ts = new Date(date || '').getTime();

    if (!Number.isFinite(ts)) return '';

    const diff = Math.max(0, Date.now() - ts);
    const min = Math.floor(diff / 60000);

    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;

    const hr = Math.floor(min / 60);

    if (hr < 24) return `${hr}h ago`;

    const d = Math.floor(hr / 24);

    return `${d}d ago`;
}

function bindNotifications() {
    const toggle = document.getElementById('notification-toggle');
    const panel = document.getElementById('notification-panel');

    if (!toggle || !panel) return;

    toggle.addEventListener('click', event => {
        event.stopPropagation();
        panel.classList.toggle('open');
    });

    panel.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const user = PG.getCurrentUser();

            if (!user) return;

            const seen = JSON.parse(
                localStorage.getItem(pgNotificationKey(user.id)) || '[]'
            );

            if (!seen.includes(item.dataset.noteId)) {
                seen.push(item.dataset.noteId);

                localStorage.setItem(
                    pgNotificationKey(user.id),
                    JSON.stringify(seen.slice(-80))
                );
            }
        });
    });

    document.getElementById('notification-mark-all')
        ?.addEventListener('click', () => {
            const user = PG.getCurrentUser();

            if (!user) return;

            localStorage.setItem(
                pgNotificationKey(user.id),
                JSON.stringify(pgGetNotifications().map(x => x.id).slice(-80))
            );

            panel.classList.remove('open');
            window.location.reload();
        });

    document.addEventListener('click', event => {
        if (!event.target.closest('.notification-wrap')) {
            panel.classList.remove('open');
        }
    });
}


// ============================================
// Main Navigation
// ============================================

function pgNav(active) {
    const user = PG.getCurrentUser();

    const homeHref = pgPublicHref('index.html');

    const brandTarget = user
        ? (
            user.role === 'student'
                ? pgStudentHref('dashboard.html')
                : pgInstructorHref('dashboard.html')
        )
        : homeHref;

    const publicNav = `
        <a class="nav-home-link ${active === 'home' ? 'active' : ''}"
           href="${homeHref}">Home</a>

        <div class="nav-drop" data-nav-drop>
            <button class="nav-drop-trigger" type="button" aria-expanded="false">
                Features <span>⌄</span>
            </button>
            <div class="nav-drop-menu">
                <a href="${homeHref}#quick-check">
                    Quick similarity check
                    <small>Compare two texts in the browser</small>
                </a>
                <a href="${homeHref}#features">
                    Similarity engine
                    <small>Tokenization, n-grams and Jaccard</small>
                </a>
                <a href="${homeHref}#analytics-preview">
                    Analytics preview
                    <small>See review trends and status</small>
                </a>
            </div>
        </div>

        <div class="nav-drop" data-nav-drop>
            <button class="nav-drop-trigger" type="button" aria-expanded="false">
                Solutions <span>⌄</span>
            </button>
            <div class="nav-drop-menu">
                <a href="${homeHref}#solutions">
                    For students
                    <small>Submit and review your own work</small>
                </a>
                <a href="${homeHref}#solutions">
                    For instructors
                    <small>Publish, review and mark</small>
                </a>
                <a href="${homeHref}#solutions">
                    For researchers
                    <small>Compare drafts transparently</small>
                </a>
            </div>
        </div>

        <div class="nav-drop" data-nav-drop>
            <button class="nav-drop-trigger" type="button" aria-expanded="false">
                Resources <span>⌄</span>
            </button>
            <div class="nav-drop-menu">
                <a href="${pgPublicHref('how-it-works.html')}">
                    How It Works
                    <small>See the comparison workflow</small>
                </a>
                <a href="${homeHref}#faq">
                    FAQ
                    <small>Common questions answered</small>
                </a>
                <a href="${pgPublicHref('about.html')}">
                    About PlagiGuard
                    <small>Project goals and roles</small>
                </a>
            </div>
        </div>

        <a href="${homeHref}#pricing">Plans</a>
    `;

    const workspaceLinks = user
        ? (
            user.role === 'student'
                ? [
                    [pgStudentHref('dashboard.html'), 'Dashboard', 'dashboard'],
                    [pgStudentHref('assignments.html'), 'Assignments', 'assignments'],
                    [pgStudentHref('upload.html'), 'Submit', 'upload'],
                    [pgStudentHref('results.html'), 'Results', 'results']
                ]
                : [
                    [pgInstructorHref('dashboard.html'), 'Dashboard', 'dashboard'],
                    [pgInstructorHref('assignments.html'), 'Assignments', 'assignments'],
                    [pgInstructorHref('reports.html'), 'Reports', 'reports'],
                    [pgPublicHref('setting.html'), 'Settings', 'settings']
                ]
        )
        : [];

    return `
        <header class="pg-nav">
            <div class="nav-inner">
                <a class="brand" href="${brandTarget}">
                    <span class="brand-icon">🛡️</span>
                    <span>PlagiGuard</span>
                </a>

                <nav class="nav-links" id="primary-nav" aria-label="Primary navigation">
                    ${
                        user
                            ? workspaceLinks.map(([href, label, key]) => `
                                <a class="${active === key ? 'active' : ''}" href="${href}">
                                    ${label}
                                </a>
                            `).join('')
                            : publicNav
                    }
                </nav>

                <div class="nav-actions">
                    ${user ? pgNotificationsMarkup() : ''}

                    ${
                        user
                            ? `
                                <a class="nav-user" href="${pgPublicHref('profile.html')}"
                                   title="Open profile">
                                    ${pgAvatarMarkup(user, 'nav-avatar')}
                                    <span class="nav-user-name">
                                        ${PG.escapeHtml(user.name)}
                                    </span>
                                </a>
                                <button class="btn btn-secondary btn-sm" id="logout-btn" type="button">
                                    Logout
                                </button>
                            `
                            : `
                                <a class="btn btn-secondary btn-sm" href="${pgPublicHref('login.html')}">
                                    Login
                                </a>
                                <a class="btn btn-primary btn-sm" href="${pgPublicHref('signup.html')}">
                                    Get Started
                                </a>
                            `
                    }

                    <button
                        class="nav-menu-btn"
                        type="button"
                        id="nav-menu-btn"
                        aria-expanded="false"
                        aria-controls="primary-nav"
                        aria-label="Open navigation"
                    >☰</button>
                </div>
            </div>
        </header>
    `;
}


// ============================================
// Sidebar
// ============================================

function pgSidebar(active, role) {
    if (!role) return '';

    const studentItems = [
        [pgStudentHref('dashboard.html'), 'Overview', 'dashboard', '⌂'],
        [pgStudentHref('assignments.html'), 'My Assignments', 'assignments', '▣'],
        [pgStudentHref('upload.html'), 'Submit Work', 'upload', '↑'],
        [pgStudentHref('results.html'), 'Results', 'results', '✓'],
        [pgPublicHref('profile.html'), 'Profile', 'profile', '◉']
    ];

    const instructorItems = [
        [pgInstructorHref('dashboard.html'), 'Overview', 'dashboard', '⌂'],
        [pgInstructorHref('assignments.html'), 'Assignments & Submissions', 'assignments', '▣'],
        [pgInstructorHref('reports.html'), 'Similarity Reports', 'reports', '◌'],
        [pgPublicHref('setting.html'), 'Analysis Settings', 'settings', '⚙'],
        [pgPublicHref('profile.html'), 'Profile', 'profile', '◉']
    ];

    const items = role === 'student' ? studentItems : instructorItems;
    const currentUser = PG.getCurrentUser();

    return `
        <aside class="pg-sidebar">
            <div class="sidebar-profile">
                ${pgAvatarMarkup(currentUser, 'sidebar-avatar')}
                <div>
                    <strong>${PG.escapeHtml(currentUser?.name || '')}</strong>
                    <span>${role === 'student' ? 'Student' : 'Instructor'}</span>
                </div>
            </div>

            <div class="sidebar-section-label">
                ${role === 'student' ? 'Student workspace' : 'Instructor workspace'}
            </div>

            <nav class="sidebar-links">
                ${items.map(([href, label, key, icon]) => `
                    <a class="${active === key ? 'active' : ''}" href="${href}">
                        <span class="sidebar-icon">${icon}</span>
                        <span>${label}</span>
                    </a>
                `).join('')}
            </nav>

            <div class="sidebar-card">
                <div class="sidebar-card-icon">✦</div>
                <strong>${role === 'student' ? 'Stay on track' : 'Review smarter'}</strong>
                <p>
                    ${
                        role === 'student'
                            ? 'Check due dates, submit work and review your similarity result.'
                            : 'Create assignments, inspect matches and keep marking in one place.'
                    }
                </p>
            </div>
        </aside>
    `;
}


// ============================================
// Footer
// ============================================

function pgFooter() {
    const homeHref = pgPublicHref('index.html');

    return `
        <footer class="pg-footer">
            <div class="footer-main">
                <div class="footer-brand-block">
                    <div class="brand footer-brand">
                        <span class="brand-icon">🛡️</span>
                        <span>PlagiGuard</span>
                    </div>

                    <p>
                        A clearer academic integrity workspace for students,
                        researchers and instructors.
                    </p>

                    <div class="footer-security">
                        <strong>Transparent comparison</strong>
                        <span>
                            Tokenization · N-grams · Jaccard similarity · Instructor review
                        </span>
                    </div>
                </div>

                <div class="footer-col">
                    <div class="footer-kicker">Features</div>
                    <a href="${homeHref}#quick-check">Quick checker</a>
                    <a href="${homeHref}#features">Similarity engine</a>
                    <a href="${homeHref}#analytics-preview">Analytics</a>
                    <a href="${homeHref}#pricing">Project edition</a>
                </div>

                <div class="footer-col">
                    <div class="footer-kicker">Solutions</div>
                    <a href="${homeHref}#solutions">Students</a>
                    <a href="${homeHref}#solutions">Instructors</a>
                    <a href="${homeHref}#solutions">Researchers</a>
                    <a href="${pgPublicHref('how-it-works.html')}">Workflow</a>
                </div>

                <div class="footer-col">
                    <div class="footer-kicker">Resources</div>
                    <a href="${pgPublicHref('about.html')}">About Us</a>
                    <a href="${pgPublicHref('how-it-works.html')}">How It Works</a>
                    <a href="${homeHref}#faq">FAQ</a>
                    <a href="${pgPublicHref('login.html')}">Login</a>
                </div>

                <div class="footer-col">
                    <div class="footer-kicker">Account</div>
                    <a href="${pgPublicHref('signup.html')}">Create Account</a>
                    <a href="${pgPublicHref('login.html')}">Sign In</a>
                    <a href="${homeHref}#pricing">Plans</a>
                </div>
            </div>

            <div class="footer-bottom">
                <span>© ${new Date().getFullYear()} PlagiGuard</span>
                <span>
                    Built for academic review · Browser-first · Transparent comparison
                </span>
            </div>
        </footer>
    `;
}


// ============================================
// Dashboard Layout
// ============================================

function pgLayout({
    active = '',
    title,
    subtitle,
    content,
    role,
    headerAction = ''
}) {
    document.body.innerHTML = `
        <a class="skip-link" href="#main-content">Skip to content</a>

        ${pgNav(active)}

        <div class="app-shell">
            ${pgSidebar(active, role)}

            <main class="dashboard-container" id="main-content">
                <div class="dashboard-header">
                    <div>
                        <span class="eyebrow">
                            ${role ? role.toUpperCase() : 'PLAGIGUARD'}
                        </span>
                        <h1 class="dashboard-title">${title}</h1>
                        <p class="text-muted">${subtitle || ''}</p>
                    </div>

                    ${headerAction ? `<div>${headerAction}</div>` : ''}
                </div>

                ${content}
            </main>
        </div>

        ${pgFooter()}

        <div id="toast" class="pg-toast" aria-live="polite"></div>
    `;

    bindLogout();
    bindNavMenu();
    bindNavDropdowns();
    bindNotifications();
}


// ============================================
// Mobile Navigation
// ============================================

function bindNavMenu() {
    const button = document.getElementById('nav-menu-btn');
    const nav = document.getElementById('primary-nav');

    if (!button || !nav) return;

    button.addEventListener('click', () => {
        const open = nav.classList.toggle('open');

        button.setAttribute('aria-expanded', String(open));
        button.textContent = open ? '✕' : '☰';
    });

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('open');
            button.setAttribute('aria-expanded', 'false');
            button.textContent = '☰';
        });
    });
}


// ============================================
// Navigation Dropdowns
// ============================================

function bindNavDropdowns() {
    const drops = document.querySelectorAll('[data-nav-drop]');

    drops.forEach(drop => {
        const trigger = drop.querySelector('.nav-drop-trigger');

        trigger?.addEventListener('click', () => {
            const open = drop.classList.toggle('open');

            trigger.setAttribute('aria-expanded', String(open));

            drops.forEach(other => {
                if (other !== drop) {
                    other.classList.remove('open');
                    other.querySelector('.nav-drop-trigger')
                        ?.setAttribute('aria-expanded', 'false');
                }
            });
        });
    });

    document.addEventListener('click', event => {
        if (!event.target.closest('[data-nav-drop]')) {
            drops.forEach(drop => {
                drop.classList.remove('open');
                drop.querySelector('.nav-drop-trigger')
                    ?.setAttribute('aria-expanded', 'false');
            });
        }
    });
}


// ============================================
// Quick Similarity Checker
// ============================================

function bindQuickChecker() {
    const a = document.getElementById('quick-text-a');
    const b = document.getElementById('quick-text-b');
    const n = document.getElementById('quick-ngram');
    const btn = document.getElementById('quick-analyze');
    const result = document.getElementById('quick-result');
    const countA = document.getElementById('quick-count-a');
    const countB = document.getElementById('quick-count-b');

    if (!a || !b || !btn || !result) return;

    const updateCount = (el, target) => {
        if (target) {
            target.textContent = `${PG.tokenize(el.value).length} words`;
        }
    };

    a.addEventListener('input', () => updateCount(a, countA));
    b.addEventListener('input', () => updateCount(b, countB));

    btn.addEventListener('click', () => {
        const textA = a.value.trim();
        const textB = b.value.trim();
        const grams = Number(n?.value || 3);

        if (!textA || !textB) {
            result.className = 'checker-result';
            result.innerHTML = `
                <span class="checker-result-label">Similarity</span>
                <strong>—</strong>
                <span>Enter two texts to compare.</span>
            `;
            return;
        }

        const comparison = PG.compareTexts(textA, textB, grams);
        const pct = comparison.similarity;

        result.className = `checker-result ${
            pct >= PG.getSettings().similarityThreshold
                ? 'is-flagged'
                : 'is-clear'
        }`;

        result.innerHTML = `
            <span class="checker-result-label">Similarity</span>
            <strong>${pct.toFixed(1)}%</strong>
            <span>
                ${comparison.matchingNgrams.length} matching n-gram${
                    comparison.matchingNgrams.length === 1 ? '' : 's'
                }
            </span>
        `;
    });
}


// ============================================
// Logout
// ============================================

function bindLogout() {
    const button = document.getElementById('logout-btn');

    if (!button) return;

    button.addEventListener('click', () => {
        PG.logout();
        window.location.href = pgPublicHref('index.html');
    });
}


// ============================================
// Toast Messages
// ============================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');

    if (!toast) return;

    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add('show');

    setTimeout(() => toast.classList.remove('show'), 2800);
}


// ============================================
// Badges
// ============================================

function badge(text, type = 'neutral') {
    return `<span class="badge badge-${type}">${PG.escapeHtml(text)}</span>`;
}

function similarityBadge(value) {
    const settings = PG.getSettings();
    const n = Number(value || 0);

    const type =
        n >= settings.similarityThreshold
            ? 'danger'
            : n >= settings.similarityThreshold / 2
                ? 'review'
                : 'success';

    return badge(`${n.toFixed(1)}%`, type);
}

function plagiarismStatusBadge(submission) {
    if (!submission) {
        return badge('Not submitted', 'neutral');
    }

    if (submission.flagged) {
        return badge('⚠ Flagged', 'danger');
    }

    if (submission.topMatchStudent) {
        return badge('✓ Not flagged', 'success');
    }

    return badge('Awaiting comparison', 'review');
}