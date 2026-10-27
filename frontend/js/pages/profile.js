const user = PG.getCurrentUser();
if (!user) { window.location.href = 'login.html'; throw new Error('Unauthorized'); }

const initials = pgInitials(user.name || 'PG');
const submissions = PG.getStudentSubmissions ? PG.getStudentSubmissions(user.id) : PG.getSubmissions().filter(s => s.studentId === user.id);
const submittedCount = submissions.length;
const flaggedCount = submissions.filter(s => s.flagged).length;
const avgSimilarity = submittedCount ? submissions.reduce((a,s)=>a+(Number(s.maxSimilarity)||0),0)/submittedCount : 0;
const avatarHtml = user.avatar
  ? `<img class="profile-avatar-image" src="${PG.escapeHtml(user.avatar)}" alt="${PG.escapeHtml(user.name)} profile picture">`
  : `<span class="profile-avatar-initials">${PG.escapeHtml(initials)}</span>`;

pgLayout({
  active: 'profile', role: user.role, title: 'Profile',
  subtitle: 'Manage your identity, profile picture and account details in one place.',
  content: `
  <section class="profile-hero-card card">
    <div class="profile-hero-glow"></div>
    <div class="profile-hero-main">
      <div class="profile-photo-wrap">
        <div class="profile-avatar-xl" id="profile-avatar-preview">${avatarHtml}</div>
        <button class="profile-photo-btn" id="profile-photo-trigger" type="button" aria-label="Change profile picture">📷</button>
        <input id="profile-photo-input" type="file" accept="image/png,image/jpeg,image/webp" hidden>
      </div>
      <div class="profile-identity">
        <div class="profile-title-row"><span class="eyebrow">${user.role==='student'?'STUDENT ACCOUNT':'INSTRUCTOR ACCOUNT'}</span><span class="profile-status-pill"><i></i> Active</span></div>
        <h2 id="profile-display-name">${PG.escapeHtml(user.name)}</h2>
        <p id="profile-display-email">${PG.escapeHtml(user.email)}</p>
        <div class="profile-meta"><span>${user.role==='student'?'Student ID: '+PG.escapeHtml(user.studentId||'—'):'Instructor workspace'}</span><span>Member since ${PG.formatDate(user.createdAt)}</span></div>
      </div>
    </div>
    <div class="profile-quick-stats">
      <div><strong id="profile-stat-submissions">${submittedCount}</strong><span>Submissions</span></div>
      <div><strong id="profile-stat-avg">${submittedCount?avgSimilarity.toFixed(1)+'%':'—'}</strong><span>Avg. similarity</span></div>
      <div><strong id="profile-stat-flagged">${flaggedCount}</strong><span>Flagged</span></div>
    </div>
  </section>

  <div class="profile-layout profile-layout-pro">
    <section class="section-card profile-editor-card">
      <div class="profile-card-heading"><div><span class="eyebrow">PERSONAL INFORMATION</span><h2 class="section-title">Make your profile feel like yours</h2><p class="text-muted">A clear name, photo and short bio make academic review easier and more personal.</p></div><span class="profile-lock">Saved locally in your browser</span></div>
      <form id="profile-form" class="stack-form">
        <div class="profile-form-section">
          <div class="profile-form-section-title">Identity</div>
          <div class="form-grid-2">
            <div class="form-group"><label class="form-label" for="name">Full name</label><input class="form-input" id="name" value="${PG.escapeHtml(user.name)}" required><small class="field-hint">Shown on submissions, results and instructor feedback.</small></div>
            <div class="form-group"><label class="form-label" for="email">Email address</label><input class="form-input" id="email" type="email" value="${PG.escapeHtml(user.email)}" required><small class="field-hint">Used for signing in to your account.</small></div>
          </div>
          ${user.role === 'student' ? `<div class="form-group"><label class="form-label" for="studentId">Student ID</label><input class="form-input" id="studentId" value="${PG.escapeHtml(user.studentId||'')}" required><small class="field-hint">A quick reference for instructors when reviewing your work.</small></div>` : ''}
        </div>
        <div class="profile-form-section">
          <div class="profile-form-section-title">About you</div>
          <div class="form-group"><label class="form-label" for="bio">Short bio</label><textarea class="form-textarea" id="bio" rows="5" maxlength="320" placeholder="Tell your classmates or instructor a little about you.">${PG.escapeHtml(user.bio||'')}</textarea><div class="field-meta"><small class="field-hint">Keep it simple and professional — one or two sentences is enough.</small><small id="bio-count" class="field-counter">0 / 320</small></div></div>
        </div>
        <div class="profile-form-section">
          <div class="profile-form-section-title">Profile picture</div>
          <div class="upload-photo-card"><div class="upload-photo-icon">🖼️</div><div><strong>Upload a profile photo</strong><p>Use a square PNG, JPG or WEBP image. The picture is stored locally in this browser.</p></div><button class="btn btn-secondary btn-sm" type="button" id="profile-photo-trigger-secondary">Choose image</button></div>
        </div>
        <div id="profile-error" class="auth-error"></div>
        <div class="profile-actions"><button class="btn btn-primary" type="submit">Save profile</button><button class="btn btn-secondary" type="button" id="cancel-profile">Discard changes</button></div>
      </form>
    </section>
    <aside class="profile-aside profile-aside-pro">
      <section class="section-card profile-help-card"><div class="profile-help-icon">✓</div><span class="eyebrow">ACCOUNT STATUS</span><h3>Profile ready</h3><p>Your account has a verified role and is ready for the workspace.</p><div class="profile-check-list"><div><span>✓</span><strong>Signed in</strong></div><div><span>✓</span><strong>Role verified</strong></div><div><span>✓</span><strong>Browser storage enabled</strong></div></div></section>
      <section class="section-card profile-tip-card"><span class="eyebrow">GOOD TO KNOW</span><h3>Similarity is for review, not a verdict.</h3><p>Use the report to understand repeated phrasing. Your instructor reviews the evidence, context and submission before marking the work.</p></section>
      <section class="profile-cover-mini"><div class="profile-mini-icon">✦</div><div><strong>Keep your profile complete</strong><p>A photo and short bio make the workspace feel more familiar without changing academic records.</p></div></section>
    </aside>
  </div>`
});

const bio = document.getElementById('bio');
const bioCount = document.getElementById('bio-count');
function updateBioCount(){ if (bio && bioCount) bioCount.textContent = `${bio.value.length} / 320`; }
updateBioCount();
bio?.addEventListener('input', updateBioCount);

function fillForm() {
  document.getElementById('name').value = user.name || '';
  document.getElementById('email').value = user.email || '';
  if (document.getElementById('studentId')) document.getElementById('studentId').value = user.studentId || '';
  document.getElementById('bio').value = user.bio || '';
  document.getElementById('profile-error').textContent = '';
  updateBioCount();
}

function renderAvatar(src) {
  const preview = document.getElementById('profile-avatar-preview');
  if (!preview) return;
  preview.innerHTML = src ? `<img class="profile-avatar-image" src="${src}" alt="${PG.escapeHtml(user.name)} profile picture">` : `<span class="profile-avatar-initials">${PG.escapeHtml(pgInitials(user.name))}</span>`;
}

const photoInput = document.getElementById('profile-photo-input');
const trigger = document.getElementById('profile-photo-trigger');
const trigger2 = document.getElementById('profile-photo-trigger-secondary');
[trigger, trigger2].forEach(btn => btn?.addEventListener('click', () => photoInput?.click()));
photoInput?.addEventListener('change', () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  if (file.size > 1.5 * 1024 * 1024) { showToast('Please choose an image smaller than 1.5 MB.', 'error'); photoInput.value=''; return; }
  const reader = new FileReader();
  reader.onload = e => renderAvatar(String(e.target.result));
  reader.readAsDataURL(file);
});

document.getElementById('profile-form').addEventListener('submit', async e => {
  e.preventDefault();
  const error=document.getElementById('profile-error'); error.textContent='';
  try {
    const users=PG.getUsers();
    const name=document.getElementById('name').value.trim();
    const email=document.getElementById('email').value.trim().toLowerCase();
    const studentId=document.getElementById('studentId')?.value.trim() || '';
    const bioValue=document.getElementById('bio').value.trim();
    if (!name) throw new Error('Please enter your full name.');
    if (users.some(u=>u.id!==user.id && u.email.toLowerCase()===email)) throw new Error('That email is already used by another account.');
    const previewImage = document.querySelector('#profile-avatar-preview img')?.getAttribute('src') || user.avatar || '';
    const updatedUser = await PG.updateCurrentUser({name,email,studentId:user.role==='student'?studentId:'',bio:bioValue,avatar:previewImage});
    Object.assign(user, updatedUser || {name,email,studentId:user.role==='student'?studentId:'',bio:bioValue,avatar:previewImage});
    document.getElementById('profile-display-name').textContent=user.name;
    document.getElementById('profile-display-email').textContent=user.email;
    renderAvatar(user.avatar);
    document.querySelectorAll('.sidebar-profile .sidebar-avatar').forEach(el => { el.outerHTML = pgAvatarMarkup(user, 'sidebar-avatar'); });
    document.querySelectorAll('.nav-user .nav-avatar').forEach(el => { el.outerHTML = pgAvatarMarkup(user, 'nav-avatar'); });
    showToast('Profile updated successfully.', 'success');
  } catch(e) { error.textContent=e.message; }
});

document.getElementById('cancel-profile').addEventListener('click', () => { fillForm(); renderAvatar(user.avatar || ''); });

async function loadLiveStats() {
  if (!PG.getAuthToken()) return;
  try {
    const liveSubmissions = user.role === 'instructor'
      ? await PG.fetchInstructorReports()
      : await PG.fetchMySubmissions();
    const count = (liveSubmissions || []).length;
    const flagged = (liveSubmissions || []).filter(s => s.flagged).length;
    const avg = count ? liveSubmissions.reduce((a, s) => a + (Number(s.maxSimilarity) || 0), 0) / count : 0;
    const subEl = document.getElementById('profile-stat-submissions');
    const avgEl = document.getElementById('profile-stat-avg');
    const flagEl = document.getElementById('profile-stat-flagged');
    if (subEl) subEl.textContent = String(count);
    if (avgEl) avgEl.textContent = count ? avg.toFixed(1) + '%' : '—';
    if (flagEl) flagEl.textContent = String(flagged);
  } catch (e) {
    console.error('Failed to load profile quick stats from backend:', e);
  }
}
loadLiveStats();
