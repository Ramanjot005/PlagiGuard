
const form = document.getElementById('login-form');
const errorBox = document.getElementById('auth-error');

if (PG.getCurrentUser()) {
    window.location.href = PG.getInitialPage();
}

form.addEventListener('submit', async event => {
    event.preventDefault();
    errorBox.textContent = '';

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
        // Log in through the backend, not browser localStorage.
        const user = await PG.loginWithBackend(
            document.getElementById('email').value.trim(),
            document.getElementById('password').value
        );

        if (user.role === 'student') {
            window.location.href = '../student/dashboard.html';
        } else if (user.role === 'instructor') {
            window.location.href = '../instructor/dashboard.html';
        } else {
            errorBox.textContent = 'Unknown user role.';
        }
    } catch (error) {
        errorBox.textContent =
            error.message || 'Unable to log in. Please try again.';
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
});
