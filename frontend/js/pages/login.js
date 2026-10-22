const form = document.getElementById('login-form');
const errorBox = document.getElementById('auth-error');
const toggle = document.querySelector('.toggle-password');

if (PG.getCurrentUser()) {
    window.location.href = PG.getInitialPage();
}

if (toggle) {
    toggle.addEventListener('click', () => {
        const input = document.getElementById('password');
        input.type = input.type === 'password' ? 'text' : 'password';
        toggle.textContent = input.type === 'password' ? 'Show' : 'Hide';
    });
}

form.addEventListener('submit', event => {
    event.preventDefault();
    errorBox.textContent = '';
    try {
        const user = PG.login(document.getElementById('email').value, document.getElementById('password').value);
        const next = new URLSearchParams(window.location.search).get('next');
        if (next && (user.role === 'student' && next.includes('/student/') || user.role === 'instructor' && next.includes('/instructor/'))) {
            window.location.href = next;
        } else {
            window.location.href = PG.getInitialPage();
        }
    } catch (error) {
        errorBox.textContent = error.message;
    }
});
