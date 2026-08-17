function loadNavbar() {
    const navbarHTML = `
    <nav class="navbar">
        <div class="container nav-content">
            <a href="index.html" class="logo">PlagiGuard</a>
            
            <div class="nav-links">
                <a href="index.html">Home</a>
                <a href="about.html">About</a>
                <a href="how-it-works.html">How It Works</a>
            </div>
            
            <div class="nav-buttons">
                <a href="login.html" class="btn btn-secondary">Login</a>
                <a href="signup.html" class="btn btn-primary">Sign Up</a>
            </div>
            
            <button class="mobile-menu-btn" id="mobileMenuBtn">☰</button>
        </div>
    </nav>`;
    
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    
    // Mobile menu (simple version - can be expanded)
    const mobileBtn = document.getElementById('mobileMenuBtn');
    mobileBtn.addEventListener('click', () => {
        alert("Mobile navigation would expand here (for demo).");
    });
}

// Auto-load navbar on public pages
if (!window.location.pathname.includes('dashboard')) {
    window.addEventListener('load', loadNavbar);
}