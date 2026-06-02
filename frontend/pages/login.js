// login.js
// Import AuthService (for browser, you'll need to include auth.service.js first)
// Make sure to include auth.service.js before login.js in your HTML

// UI Service for handling UI interactions
const UIService = {
    // Store original content for demo info divs
    demoInfoDivs: [],
    originalContents: [],

    init() {
        // Get both demo info divs
        this.demoInfoDivs = [
            document.getElementById('demoInfoLogin'),
            document.getElementById('demoInfoRegister')
        ].filter(div => div !== null); // Filter out nulls if one doesn't exist

        this.demoInfoDivs.forEach((div, index) => {
            this.originalContents[index] = div.innerHTML;
        });
    },

    showFeedbackMessage(message, isError = false) {
        this.demoInfoDivs.forEach((demoInfoDiv, index) => {
            if (demoInfoDiv.timeoutId) {
                clearTimeout(demoInfoDiv.timeoutId);
            }

            const originalText = this.originalContents[index];
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

            demoInfoDiv.timeoutId = setTimeout(() => {
                if (demoInfoDiv.innerHTML !== originalText) {
                    demoInfoDiv.innerHTML = originalText;
                    demoInfoDiv.style.padding = '0.5rem';
                }
                delete demoInfoDiv.timeoutId;
            }, 3000);
        });
    },

    setLoading(button, isLoading, originalText) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';
        } else {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    },

    switchTab(tabId) {
        const tab = new bootstrap.Tab(document.querySelector(tabId));
        tab.show();
    }
};

// Form validation service
const ValidationService = {
    validateLogin(email, password) {
        if (!email) {
            UIService.showFeedbackMessage('⚠️ Please enter your email', true);
            document.getElementById('loginEmail').focus();
            return false;
        }
        if (!password) {
            UIService.showFeedbackMessage('⚠️ Please enter your password', true);
            document.getElementById('loginPassword').focus();
            return false;
        }
        return true;
    },

    validateRegister(name, username, email, password, confirmPassword, terms) {
        if (!name) {
            UIService.showFeedbackMessage('⚠️ Please enter your full name', true);
            document.getElementById('registerName').focus();
            return false;
        }
        if (!username) {
            UIService.showFeedbackMessage('⚠️ Please choose a username', true);
            document.getElementById('registerUsername').focus();
            return false;
        }
        if (!email) {
            UIService.showFeedbackMessage('⚠️ Please enter your email address', true);
            document.getElementById('registerEmail').focus();
            return false;
        }
        if (!email.includes('@') || !email.includes('.')) {
            UIService.showFeedbackMessage('⚠️ Please enter a valid email address', true);
            document.getElementById('registerEmail').focus();
            return false;
        }
        if (!password) {
            UIService.showFeedbackMessage('⚠️ Please create a password', true);
            document.getElementById('registerPassword').focus();
            return false;
        }
        if (password.length < 8) {
            UIService.showFeedbackMessage('⚠️ Password must be at least 8 characters', true);
            document.getElementById('registerPassword').focus();
            return false;
        }
        if (password !== confirmPassword) {
            UIService.showFeedbackMessage('⚠️ Passwords do not match', true);
            document.getElementById('registerRepeatPassword').focus();
            return false;
        }
        if (!terms) {
            UIService.showFeedbackMessage('⚠️ Please agree to the Terms of Service', true);
            return false;
        }
        return true;
    }
};

// Event Handlers
const EventHandlers = {
    async handleLogin(event) {
        event.preventDefault();
        console.log('Login form submitted'); // Add this

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const remember = document.getElementById('rememberCheck')?.checked || false;

        console.log('Email:', email); // Add this
        console.log('Password present:', !!password); // Add this

        if (!ValidationService.validateLogin(email, password)) {
            console.log('Validation failed'); // Add this
            return;
        }

        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        UIService.setLoading(submitBtn, true, originalText);

        try {
            const result = await AuthService.login(email, password, remember);

            UIService.showFeedbackMessage(
                `✨ Welcome back, ${result.user.fullName || result.user.username || 'User'}! Redirecting...`,
                false
            );

            setTimeout(() => {
                window.location.href = window.location.protocol === 'file:' ? 'home.html' : '/home.html';
            }, 1500);
        } catch (error) {
            UIService.showFeedbackMessage(`❌ Login failed: ${error.message}`, true);
            UIService.setLoading(submitBtn, false, originalText);
        }
    },

    async handleRegister(event) {
        event.preventDefault();

        const name = document.getElementById('registerName').value.trim();
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerRepeatPassword').value;
        const terms = document.getElementById('termsCheck').checked;
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        if (!ValidationService.validateRegister(name, username, email, password, confirmPassword, terms)) {
            return;
        }

        UIService.setLoading(submitBtn, true, originalText);

        try {
            const result = await AuthService.register({
                fullName: name,
                username: username,
                email: email,
                password: password,
            });

            if (result.success) {
                UIService.showFeedbackMessage(
                    `🎉 Welcome, ${name}! Account created successfully! Redirecting to login...`,
                    false
                );

                event.target.reset();

                setTimeout(() => {
                    UIService.switchTab('#login-tab');
                    UIService.setLoading(submitBtn, false, originalText);
                    UIService.showFeedbackMessage(`✨ Account created! Please sign in.`, false);
                }, 2000);
            }
        } catch (error) {
            UIService.showFeedbackMessage(`❌ Signup failed: ${error.message}`, true);
            UIService.setLoading(submitBtn, false, originalText);
        }
    },

    handleForgotPassword(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        if (email && email.includes('@')) {
            UIService.showFeedbackMessage(`📧 Password reset link would be sent to ${email}`, false);
        } else {
            UIService.showFeedbackMessage(`🔐 Please enter your email address first`, true);
            document.getElementById('loginEmail').focus();
        }
    },

    handleTermsClick(e) {
        e.preventDefault();
        UIService.showFeedbackMessage(`📜 Opening Terms of Service...`, false);
    },

    setupTabSwitching() {
        document.querySelectorAll('.register-link').forEach(link => {
            link?.addEventListener('click', (e) => {
                e.preventDefault();
                UIService.switchTab('#register-tab');
            });
        });

        document.querySelectorAll('.login-link').forEach(link => {
            link?.addEventListener('click', (e) => {
                e.preventDefault();
                UIService.switchTab('#login-tab');
            });
        });
    },

    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin);
        }

        // Register form submission
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister);
        }

        // Forgot password functionality
        const forgotPasswordLink = document.querySelector('#login-pane .small[href="#!"]');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', this.handleForgotPassword);
        }

        // Terms of Service link
        const termsLink = document.querySelector('#termsCheck + label a');
        if (termsLink) {
            termsLink.addEventListener('click', this.handleTermsClick);
        }

        // Tab switching
        this.setupTabSwitching();
    },

    init() {
        UIService.init();
        this.setupEventListeners();
        AuthService.redirectIfLoggedIn();
    }
};

// Global togglePassword function
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

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    EventHandlers.init();
});