// auth.service.js - Add this at the top for debugging
console.log('Current hostname:', window.location.hostname);
console.log('API URL being used:', window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : '/api');

const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : '/api';
    
// Axios-like fetch wrapper
const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    },

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    get(endpoint) {
        return this.request(endpoint, {
            method: 'GET',
        });
    },
};

// Auth Service
const AuthService = {
    // Check if user is already logged in
    async checkAuth() {
        const token = this.getToken();
        if (!token) {
            this.logout();
            return false;
        }

        try {
            const result = await api.get('/auth/verify-token');
            if (result.success) {
                localStorage.setItem('user', JSON.stringify(result.user));
                return true;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        return false;
    },

    // Login user
    async login(email, password, remember) {
        const result = await api.post('/auth/login', { email, password });
        
        if (result.success) {
            if (remember) {
                localStorage.setItem('token', result.token);
            } else {
                sessionStorage.setItem('token', result.token);
            }
            localStorage.setItem('user', JSON.stringify(result.user));
        }
        
        return result;
    },

    // Register user
    async register(userData) {
        const result = await api.post('/auth/register', userData);
        return result;
    },

    // Logout user
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
    },

    // Get current user
    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    // Get token
    getToken() {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    },

    // Redirect to home if logged in
    async redirectIfLoggedIn() {
        const isLoggedIn = await this.checkAuth();
        if (isLoggedIn) {
            window.location.href = window.location.protocol === 'file:' ? 'home.html' : '/home.html';
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService, api };
}