document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.navbar')) return;

    const navbar = document.createElement('nav');
    navbar.className = 'navbar';
    navbar.innerHTML = `
        <div class="nav-container">
            <a href="index.html" class="nav-logo">
                <span class="logo-icon">🛡️</span> PlagiGuard
            </a>
            <div class="nav-links">
                <a href="index.html" class="nav-link">Home</a>
                <a href="dashboard-instructor.html" class="nav-link">Instructor Portal</a>
                <a href="dashboard-student.html" class="nav-link">Student Portal</a>
            </div>
            <div class="nav-auth">
                <a href="login.html" class="btn btn-secondary nav-btn">Login</a>
                <a href="signup.html" class="btn btn-primary nav-btn">Sign Up</a>
            </div>
        </div>
    `;

    document.body.prepend(navbar);
});