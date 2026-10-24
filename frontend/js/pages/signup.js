
const form = document.getElementById('signup-form');
const errorBox = document.getElementById('auth-error');
const role = document.getElementById('role');
const studentGroup = document.getElementById('student-id-group');

function toggleStudentId() {
    const student = role.value === 'student';
    studentGroup.style.display = student ? 'block' : 'none';
    document.getElementById('student-id').required = student;
}

role.addEventListener('change', toggleStudentId);
toggleStudentId();

const requestedRole = new URLSearchParams(window.location.search).get('role');

if (requestedRole === 'instructor' || requestedRole === 'student') {
    role.value = requestedRole;
    toggleStudentId();
}

form.addEventListener('submit', async event => {
    event.preventDefault();
    errorBox.textContent = '';

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password.length < 8) {
        errorBox.textContent = 'Password must contain at least 8 characters.';
        if (submitButton) submitButton.disabled = false;
        return;
    }

    if (password !== confirmPassword) {
        errorBox.textContent = 'Passwords do not match.';
        if (submitButton) submitButton.disabled = false;
        return;
    }

    try {
        // Register the account through the backend.
        // The current backend creates public registrations as students.
        if (role.value === 'instructor') {
            throw new Error(
                'Instructor registration is not enabled by the backend yet. Please use an authorized instructor account.'
            );
        }

        const result = await PG.apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        errorBox.style.color = 'green';
        errorBox.textContent =
            result.message || 'Account created successfully! Please log in.';

        // Registration does not return a login token, so go to login.
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);

    } catch (error) {
        errorBox.style.color = '';
        errorBox.textContent =
            error.message || 'Unable to create account. Please try again.';
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
});
