// API Configuration
const API_URL = '/api';  // Nginx proxy will handle routing to backend

// Axios-like fetch wrapper
const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');

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

// Check if user is already logged in
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const result = await api.get('/auth/verify-token');
        if (result.success) {
            // Store user info
            localStorage.setItem('user', JSON.stringify(result.user));
            return true;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
    return false;
}

// Redirect to home if logged in
async function redirectIfLoggedIn() {
    const isLoggedIn = await checkAuth();
    if (isLoggedIn) {
        window.location.href = '/home.html';
    }
}

(function() {
    // Store original content for each demo info div
    const demoInfoDivs = document.querySelectorAll('#demoInfo');
    const originalContents = [];
    
    // Store original content for each div
    demoInfoDivs.forEach((div, index) => {
        originalContents[index] = div.innerHTML;
    });
    
    function showFeedbackMessage(message, isError = false) {
        // Show message in both demo info divs
        demoInfoDivs.forEach((demoInfoDiv, index) => {
            // Clear any existing timeout for this div
            if (demoInfoDiv.timeoutId) {
                clearTimeout(demoInfoDiv.timeoutId);
            }
            
            const originalText = originalContents[index];
            const feedbackSpan = document.createElement('span');
            feedbackSpan.style.fontWeight = '500';
            if (isError) {
                feedbackSpan.style.color = '#c7254e';
                feedbackSpan.style.backgroundColor = '#fff5f7';
            } else {
                feedbackSpan.style.color = '#2c6e2f';
                feedbackSpan.style.backgroundColor = '#eef9ef';
            }
            demoInfoDiv.innerHTML = '';
            demoInfoDiv.appendChild(feedbackSpan);
            feedbackSpan.innerHTML = message;
            demoInfoDiv.style.padding = '0.5rem 0.8rem';
            
            // Set timeout to restore original content
            demoInfoDiv.timeoutId = setTimeout(() => {
                if (demoInfoDiv.innerHTML !== originalText) {
                    demoInfoDiv.innerHTML = originalText;
                    demoInfoDiv.style.padding = '0.5rem';
                }
                delete demoInfoDiv.timeoutId;
            }, 3000);
        });
    }

    // Set loading state for buttons
    function setLoading(button, isLoading, originalText) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';
        } else {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }

    // Switch between tabs
    document.querySelectorAll('.register-link').forEach(link => {
        link?.addEventListener('click', function(e) {
            e.preventDefault();
            const registerTab = new bootstrap.Tab(document.querySelector('#register-tab'));
            registerTab.show();
        });
    });

    document.querySelectorAll('.login-link').forEach(link => {
        link?.addEventListener('click', function(e) {
            e.preventDefault();
            const loginTab = new bootstrap.Tab(document.querySelector('#login-tab'));
            loginTab.show();
        });
    });

    // Handle Login
    async function handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const remember = document.getElementById('rememberCheck')?.checked || false;
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        if (!email) {
            showFeedbackMessage('⚠️ Please enter your email', true);
            document.getElementById('loginEmail').focus();
            return;
        }
        if (!password) {
            showFeedbackMessage('⚠️ Please enter your password', true);
            document.getElementById('loginPassword').focus();
            return;
        }

        setLoading(submitBtn, true, originalText);

        try {
            const result = await api.post('/auth/login', { email, password });

            if (result.success) {
                if (remember) {
                    localStorage.setItem('token', result.token);
                } else {
                    sessionStorage.setItem('token', result.token);
                }
                localStorage.setItem('user', JSON.stringify(result.user));

                showFeedbackMessage(`✨ Welcome back, ${result.user.fullName || result.user.username || 'User'}! Redirecting...`, false);

                setTimeout(() => {
                    window.location.href = '/home.html';
                }, 1500);
            }
        } catch (error) {
            showFeedbackMessage(`❌ Login failed: ${error.message}`, true);
            setLoading(submitBtn, false, originalText);
        }
    }

    // Handle Register
    async function handleRegister(event) {
        event.preventDefault();
        
        const name = document.getElementById('registerName').value.trim();
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerRepeatPassword').value;
        const terms = document.getElementById('termsCheck').checked;
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        // Validations
        if (!name) {
            showFeedbackMessage('⚠️ Please enter your full name', true);
            document.getElementById('registerName').focus();
            return;
        }
        if (!username) {
            showFeedbackMessage('⚠️ Please choose a username', true);
            document.getElementById('registerUsername').focus();
            return;
        }
        if (!email) {
            showFeedbackMessage('⚠️ Please enter your email address', true);
            document.getElementById('registerEmail').focus();
            return;
        }
        if (!email.includes('@') || !email.includes('.')) {
            showFeedbackMessage('⚠️ Please enter a valid email address', true);
            document.getElementById('registerEmail').focus();
            return;
        }
        if (!password) {
            showFeedbackMessage('⚠️ Please create a password', true);
            document.getElementById('registerPassword').focus();
            return;
        }
        if (password.length < 8) {
            showFeedbackMessage('⚠️ Password must be at least 8 characters', true);
            document.getElementById('registerPassword').focus();
            return;
        }
        if (password !== confirmPassword) {
            showFeedbackMessage('⚠️ Passwords do not match', true);
            document.getElementById('registerRepeatPassword').focus();
            return;
        }
        if (!terms) {
            showFeedbackMessage('⚠️ Please agree to the Terms of Service', true);
            return;
        }

        setLoading(submitBtn, true, originalText);

        try {
            const result = await api.post('/auth/register', {
                fullName: name,
                username: username,
                email: email,
                password: password,
            });

            if (result.success) {
                showFeedbackMessage(`🎉 Welcome, ${name}! Account created successfully! Redirecting to login...`, false);

                // Clear form
                event.target.reset();
                
                // Switch to login tab after 2 seconds
                setTimeout(() => {
                    const loginTab = new bootstrap.Tab(document.querySelector('#login-tab'));
                    loginTab.show();
                    setLoading(submitBtn, false, originalText);
                    showFeedbackMessage(`✨ Account created! Please sign in.`, false);
                }, 2000);
            }
        } catch (error) {
            showFeedbackMessage(`❌ Signup failed: ${error.message}`, true);
            setLoading(submitBtn, false, originalText);
        }
    }

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Forgot password functionality
    const forgotPasswordLink = document.querySelector('#login-pane .small[href="#!"]');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            if (email && email.includes('@')) {
                showFeedbackMessage(`📧 Password reset link would be sent to ${email}`, false);
            } else {
                showFeedbackMessage(`🔐 Please enter your email address first`, true);
                document.getElementById('loginEmail').focus();
            }
        });
    }

    // Terms of Service link
    const termsLink = document.querySelector('#termsCheck + label a');
    if (termsLink) {
        termsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showFeedbackMessage(`📜 Opening Terms of Service...`, false);
        });
    }

    // Check if already logged in
    redirectIfLoggedIn();
})();

// Global togglePassword function (keep your original)
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}