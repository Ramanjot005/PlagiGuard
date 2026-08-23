const user = PG.getCurrentUser();
if (!user) { window.location.href = 'login.html'; throw new Error('Unauthorized'); }

pgLayout({
    active: 'profile', role: user?.role,
    title: 'My Profile', subtitle: 'Edit your account details used across the PlagiGuard dashboards.',
    content: `<section class="section-card profile-form-wrap"><form id="profile-form" class="stack-form"><div class="profile-avatar">${PG.escapeHtml((user.name || 'U').slice(0,1).toUpperCase())}</div><div class="form-group"><label class="form-label">Full name</label><input class="form-input" id="name" value="${PG.escapeHtml(user.name)}" required></div><div class="form-group"><label class="form-label">Email</label><input class="form-input" id="email" type="email" value="${PG.escapeHtml(user.email)}" required></div>${user.role === 'student' ? `<div class="form-group"><label class="form-label">Student ID</label><input class="form-input" id="studentId" value="${PG.escapeHtml(user.studentId || '')}" required></div>` : ''}<div class="form-group"><label class="form-label">Role</label><input class="form-input" value="${PG.escapeHtml(user.role)}" disabled></div><div class="form-group"><label class="form-label">Bio</label><textarea class="form-textarea" id="bio" rows="5" placeholder="A short introduction">${PG.escapeHtml(user.bio || '')}</textarea></div><div id="profile-error" class="auth-error"></div><button class="btn btn-primary" type="submit">Save Profile</button></form></section>`
});

document.getElementById('profile-form').addEventListener('submit', e => {
    e.preventDefault();
    const error = document.getElementById('profile-error'); error.textContent = '';
    try {
        const users = PG.getUsers();
        const newEmail = document.getElementById('email').value.trim().toLowerCase();
        if (users.some(u => u.id !== user.id && u.email.toLowerCase() === newEmail)) throw new Error('That email is already used by another account.');
        PG.updateCurrentUser({
            name: document.getElementById('name').value.trim(),
            email: newEmail,
            studentId: user.role === 'student' ? document.getElementById('studentId').value.trim() : '',
            bio: document.getElementById('bio').value.trim()
        });
        showToast('Profile updated.', 'success');
    } catch (e) { error.textContent = e.message; }
});
