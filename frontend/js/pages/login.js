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
        const user = PG.login(
            document.getElementById('email').value,
            document.getElementById('password').value
        );
        window.location.href = PG.getInitialPage();
       
        if (user.role === 'student') {
            window.location.href = '../student/dashboard.html';
        } else if (user.role === 'instructor') {
            window.location.href = '../instructor/dashboard.html';
        } else {
            errorBox.textContent = 'Unknown user role.';
        }
    } catch (error) {
        errorBox.textContent = error.message;
    }
});