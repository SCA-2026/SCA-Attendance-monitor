// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const alertContainer = document.getElementById('alertContainer');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            showAlert('Please fill in all fields', 'danger');
            return;
        }
        
        // Show loading state
        setLoading(true);
        
        try {
            console.log('Attempting login for:', username);
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Login response:', data);
            
            if (data.success) {
                console.log('Login successful, storing token');
                // Store token and user data
                localStorage.setItem('sca_token', data.token);
                localStorage.setItem('sca_user', JSON.stringify(data.user));
                
                console.log('Token stored, redirecting...');
                // Show success message
                showAlert('Login successful! Redirecting...', 'success');
                
                // Redirect based on role
                setTimeout(() => {
                    if (data.user.role === 'admin') {
                        window.location.href = '/admin.html';
                    } else {
                        window.location.href = '/employee.html';
                    }
                }, 1500);
                
            } else {
                showAlert(data.error || 'Login failed', 'danger');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            showAlert('Network error: ' + error.message, 'danger');
        } finally {
            setLoading(false);
        }
    });
    
    function setLoading(loading) {
        const btnText = loginBtn.querySelector('.btn-text');
        const spinner = loginBtn.querySelector('.loading-spinner');
        
        if (loading) {
            btnText.style.display = 'none';
            spinner.style.display = 'inline-block';
            loginBtn.disabled = true;
        } else {
            btnText.style.display = 'inline';
            spinner.style.display = 'none';
            loginBtn.disabled = false;
        }
    }
    
    function showAlert(message, type) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show alert-custom" role="alert">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Auto dismiss after 5 seconds
        setTimeout(() => {
            const alert = alertContainer.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
    
    // Check if user is already logged in
    const token = localStorage.getItem('sca_token');
    const user = localStorage.getItem('sca_user');
    
    if (token && user) {
        try {
            const userData = JSON.parse(user);
            if (userData.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/employee.html';
            }
        } catch (error) {
            // Invalid user data, clear storage
            localStorage.removeItem('sca_token');
            localStorage.removeItem('sca_user');
        }
    }
    
    // Add input animations
    const inputs = document.querySelectorAll('.form-control');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
    });
});
