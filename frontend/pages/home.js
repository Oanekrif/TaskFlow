// Check if user is logged in
async function checkAuth() {
    try {
        const isLoggedIn = await AuthService.checkAuth();
        if (!isLoggedIn) {
            window.location.href = window.location.protocol === 'file:' ? 'login.html' : '/';
            return false;
        }

        const user = AuthService.getCurrentUser();
        if (user) {
            document.getElementById('userName').textContent = user.fullName || user.username || user.email;
            document.getElementById('welcomeTitle').textContent = `Welcome back, ${user.fullName || user.username || user.email}! 🚀`;
            return true;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        AuthService.logout();
        window.location.href = window.location.protocol === 'file:' ? 'login.html' : '/';
        return false;
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    document.getElementById('logoutBtn').addEventListener('click', () => {
        AuthService.logout();
        window.location.href = window.location.protocol === 'file:' ? 'login.html' : '/';
    });
});