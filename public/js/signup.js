// Signup functionality
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    const signupBtn = document.getElementById('signupBtn');
    const alertContainer = document.getElementById('alertContainer');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    
    // Real-time password validation
    confirmPassword.addEventListener('input', function() {
        if (this.value && this.value !== password.value) {
            this.classList.add('is-invalid');
        } else {
            this.classList.remove('is-invalid');
        }
    });
    
    password.addEventListener('input', function() {
        if (this.value.length < 6) {
            this.classList.add('is-invalid');
        } else {
            this.classList.remove('is-invalid');
        }
        
        // Re-check confirm password
        if (confirmPassword.value) {
            if (confirmPassword.value !== this.value) {
                confirmPassword.classList.add('is-invalid');
            } else {
                confirmPassword.classList.remove('is-invalid');
            }
        }
    });
    
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const employee_id = document.getElementById('employee_id').value.trim();
        const full_name = document.getElementById('full_name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;
        
        // Validation
        if (!username || !employee_id || !full_name || !email || !password || !confirmPassword) {
            showAlert('Please fill in all fields', 'danger');
            return;
        }
        
        if (password.length < 6) {
            showAlert('Password must be at least 6 characters long', 'danger');
            return;
        }
        
        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'danger');
            return;
        }
        
        if (!terms) {
            showAlert('Please accept the terms and conditions', 'danger');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Please enter a valid email address', 'danger');
            return;
        }
        
        // Employee ID validation (numeric)
        if (!/^\d+$/.test(employee_id)) {
            showAlert('Employee ID must contain only numbers', 'danger');
            return;
        }
        
        // Show loading state
        setLoading(true);
        
        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    employee_id,
                    full_name,
                    email,
                    password
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Show success message
                showAlert('Account created successfully! Redirecting to login...', 'success');
                
                // Clear form
                signupForm.reset();
                
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
                
            } else {
                showAlert(data.error || 'Signup failed', 'danger');
            }
            
        } catch (error) {
            console.error('Signup error:', error);
            showAlert('Network error. Please try again.', 'danger');
        } finally {
            setLoading(false);
        }
    });
    
    function setLoading(loading) {
        const btnText = signupBtn.querySelector('.btn-text');
        const spinner = signupBtn.querySelector('.loading-spinner');
        
        if (loading) {
            btnText.style.display = 'none';
            spinner.style.display = 'inline-block';
            signupBtn.disabled = true;
        } else {
            btnText.style.display = 'inline';
            spinner.style.display = 'none';
            signupBtn.disabled = false;
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
    
    // Add password strength indicator
    password.addEventListener('input', function() {
        const strength = checkPasswordStrength(this.value);
        updatePasswordStrength(strength);
    });
    
    function checkPasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;
        
        return strength;
    }
    
    function updatePasswordStrength(strength) {
        const strengthIndicator = document.getElementById('passwordStrength');
        
        if (!strengthIndicator) {
            const indicator = document.createElement('div');
            indicator.id = 'passwordStrength';
            indicator.className = 'mt-2';
            password.parentElement.appendChild(indicator);
        }
        
        const indicator = document.getElementById('passwordStrength');
        const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const strengthColors = ['danger', 'warning', 'info', 'success', 'success'];
        
        if (password.length > 0) {
            indicator.innerHTML = `
                <div class="progress" style="height: 5px;">
                    <div class="progress-bar bg-${strengthColors[strength]}" 
                         style="width: ${(strength + 1) * 20}%"></div>
                </div>
                <small class="text-${strengthColors[strength]}">Password strength: ${strengthLevels[strength]}</small>
            `;
        } else {
            indicator.innerHTML = '';
        }
    }
});
