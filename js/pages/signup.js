const form = document.getElementById('signup-form');
const errorBox = document.getElementById('auth-error');
const role = document.getElementById('role');
const studentGroup = document.getElementById('student-id-group');
const toggle = document.querySelector('.toggle-password');

function toggleStudentId() {
    const student = role.value === 'student';
    studentGroup.style.display = student ? 'block' : 'none';
    document.getElementById('student-id').required = student;
}
role.addEventListener('change', toggleStudentId);
toggleStudentId();

toggle.addEventListener('click', () => {
    const input = document.getElementById('password');
    input.type = input.type === 'password' ? 'text' : 'password';
    toggle.textContent = input.type === 'password' ? 'Show' : 'Hide';
});

form.addEventListener('submit', event => {
    event.preventDefault();
    errorBox.textContent = '';
    const password = document.getElementById('password').value;
    if (password.length < 6) {
        errorBox.textContent = 'Password must contain at least 6 characters.';
        return;
    }
    try {
        const user = PG.register({
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password,
            role: role.value,
            studentId: document.getElementById('student-id').value
        });
        PG.login(user.email, password);
        window.location.href = PG.getInitialPage();
    } catch (error) {
        errorBox.textContent = error.message;
    }
});
