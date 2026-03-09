// Admin Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin dashboard loading...');
    // Check authentication
    const token = localStorage.getItem('sca_token');
    const user = localStorage.getItem('sca_user');
    
    console.log('Token exists:', !!token);
    console.log('User data exists:', !!user);
    
    if (!token || !user) {
        console.log('No token or user, redirecting to login');
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const userData = JSON.parse(user);
        console.log('User data:', userData);
        if (userData.role !== 'admin') {
            console.log('User is not admin, redirecting to employee page');
            window.location.href = '/employee.html';
            return;
        }
        
        console.log('Admin authenticated successfully');
        
        // Set admin name
        document.getElementById('adminName').textContent = userData.full_name || 'Admin';
        
        // Load initial data
        loadStats();
        loadUsers();
        
        // Auto-refresh stats every 30 seconds
        setInterval(loadStats, 30000);
        
        // Attach event listeners for data-action attributes (CSP compliance)
        // Small delay to ensure DOM is fully loaded
        setTimeout(() => {
            attachEventListeners();
        }, 100);
        
    } catch (error) {
        console.error('Auth error:', error);
        logout();
    }
});

// Attach event listeners to data-action elements
function attachEventListeners() {
    console.log('Attaching event listeners...');
    // Dropdown menu and button actions
    const elements = document.querySelectorAll('[data-action]');
    console.log('Found elements with data-action:', elements.length);
    
    elements.forEach((el, index) => {
        console.log(`Setting up listener for element ${index}:`, el.getAttribute('data-action'));
        el.addEventListener('click', (e) => {
            console.log('Clicked element with action:', el.getAttribute('data-action'));
            e.preventDefault();
            const action = el.getAttribute('data-action');
            const dataType = el.getAttribute('data-type');
            const userId = el.getAttribute('data-user-id');
            const userName = el.getAttribute('data-user-name');
            
            console.log('Action clicked:', action, 'Type:', dataType, 'User ID:', userId);
            
            switch(action) {
                case 'profile':
                    showProfile();
                    break;
                case 'upload-excel':
                    uploadExcel();
                    break;
                case 'logout':
                    logout();
                    break;
                case 'report':
                    generateReport(dataType);
                    break;
                case 'refresh-data':
                    refreshData();
                    break;
                case 'update-profile':
                    updateProfile();
                    break;
                case 'upload-excel-file':
                    uploadExcelFile();
                    break;
                case 'view-user':
                    viewUser(userId);
                    break;
                case 'edit-user':
                    editUser(userId);
                    break;
                case 'delete-user':
                    deleteUser(userId, userName);
                    break;
                case 'update-user':
                    updateUser();
                    break;
            }
        });
    });
}

// Load statistics
async function loadStats() {
    try {
        const token = localStorage.getItem('sca_token');
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('totalUsers').textContent = data.stats.totalUsers;
            document.getElementById('todayCheckins').textContent = data.stats.todayCheckins;
            document.getElementById('weekCheckins').textContent = data.stats.weekCheckins;
            
            // Calculate attendance rate
            const rate = data.stats.totalUsers > 0 
                ? Math.round((data.stats.todayCheckins / data.stats.totalUsers) * 100) 
                : 0;
            document.getElementById('attendanceRate').textContent = rate + '%';
        }
        
    } catch (error) {
        console.error('Stats error:', error);
    }
}

// Load users
async function loadUsers() {
    try {
        const token = localStorage.getItem('sca_token');
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = '';
            
            data.users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.employee_id}</td>
                    <td>${user.full_name}</td>
                    <td>${user.email}</td>
                    <td>${user.username}</td>
                    <td>
                        <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">
                            ${user.role}
                        </span>
                    </td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-primary me-1" data-action="view-user" data-user-id="${user.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning me-1" data-action="edit-user" data-user-id="${user.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${user.role !== 'admin' ? `
                            <button class="btn btn-sm btn-danger" data-action="delete-user" data-user-id="${user.id}" data-user-name="${user.full_name}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
        
    } catch (error) {
        console.error('Users error:', error);
        showAlert('Error loading users', 'danger');
    }
}

// Generate report
async function generateReport(type) {
    try {
        const token = localStorage.getItem('sca_token');
        const response = await fetch(`/api/admin/report/${type}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance-report-${type}-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} report downloaded successfully!`, 'success');
        } else {
            showAlert('Error generating report', 'danger');
        }
        
    } catch (error) {
        console.error('Report error:', error);
        showAlert('Error generating report', 'danger');
    }
}

// Refresh data
function refreshData() {
    loadStats();
    loadUsers();
    showAlert('Data refreshed successfully!', 'success');
}

// Show profile
function showProfile() {
    const user = JSON.parse(localStorage.getItem('sca_user'));
    document.getElementById('profileFullName').value = user.full_name || '';
    document.getElementById('profileEmail').value = user.email || '';
    
    const modal = new bootstrap.Modal(document.getElementById('profileModal'));
    modal.show();
}

// Update profile
async function updateProfile() {
    try {
        const token = localStorage.getItem('sca_token');
        const fullName = document.getElementById('profileFullName').value;
        const email = document.getElementById('profileEmail').value;
        
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ full_name: fullName, email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update stored user data
            const userData = JSON.parse(localStorage.getItem('sca_user'));
            userData.full_name = fullName;
            userData.email = email;
            localStorage.setItem('sca_user', JSON.stringify(userData));
            
            // Update display
            document.getElementById('adminName').textContent = fullName;
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
            modal.hide();
            
            showAlert('Profile updated successfully!', 'success');
        } else {
            showAlert(data.error || 'Error updating profile', 'danger');
        }
        
    } catch (error) {
        console.error('Profile update error:', error);
        showAlert('Error updating profile', 'danger');
    }
}

// Upload Excel
function uploadExcel() {
    const modal = new bootstrap.Modal(document.getElementById('excelModal'));
    modal.show();
}

// Upload Excel file
async function uploadExcelFile() {
    try {
        const token = localStorage.getItem('sca_token');
        const fileInput = document.getElementById('excelFile');
        const file = fileInput.files[0];
        
        if (!file) {
            showAlert('Please select a file', 'warning');
            return;
        }
        
        // Check file size
        if (file.size > 5 * 1024 * 1024) {
            showAlert('File size must be less than 5MB', 'warning');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/admin/import-excel', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('excelModal'));
            modal.hide();
            
            // Reset form
            document.getElementById('excelForm').reset();
            
            showAlert(`${data.importedCount || 0} employees imported successfully!`, 'success');
            
            // Refresh user list
            setTimeout(() => {
                loadUsers();
            }, 1000);
        } else {
            showAlert(data.error || 'Error importing Excel file', 'danger');
        }
        
    } catch (error) {
        console.error('Excel upload error:', error);
        showAlert('Error uploading Excel file', 'danger');
    }
}

// View user
function viewUser(userId) {
    // Implementation for viewing user details
    showAlert('User details feature coming soon!', 'info');
}

// Edit user
async function editUser(userId) {
    try {
        console.log('Editing user:', userId);
        
        const token = localStorage.getItem('sca_token');
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            // Populate form with user data
            document.getElementById('editUserId').value = data.user.id;
            document.getElementById('editEmployeeId').value = data.user.employee_id;
            document.getElementById('editUsername').value = data.user.username;
            document.getElementById('editFullName').value = data.user.full_name;
            document.getElementById('editEmail').value = data.user.email;
            document.getElementById('editRole').value = data.user.role;
            
            // Reset password field
            document.getElementById('editPassword').checked = false;
            document.getElementById('passwordField').style.display = 'none';
            document.getElementById('editNewPassword').value = '';
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();
        } else {
            showAlert(data.error || 'Failed to load user data', 'danger');
        }
    } catch (error) {
        console.error('Edit user error:', error);
        showAlert('Error loading user data', 'danger');
    }
}

// Update user
async function updateUser() {
    try {
        const userId = document.getElementById('editUserId').value;
        const employeeId = document.getElementById('editEmployeeId').value;
        const username = document.getElementById('editUsername').value;
        const fullName = document.getElementById('editFullName').value;
        const email = document.getElementById('editEmail').value;
        const role = document.getElementById('editRole').value;
        const changePassword = document.getElementById('editPassword').checked;
        const newPassword = document.getElementById('editNewPassword').value;

        // Basic validation
        if (!employeeId || !username || !fullName || !email) {
            showAlert('Please fill in all required fields', 'warning');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Please enter a valid email address', 'warning');
            return;
        }

        // Password validation if changing
        if (changePassword && newPassword && newPassword.length < 6) {
            showAlert('Password must be at least 6 characters long', 'warning');
            return;
        }

        const token = localStorage.getItem('sca_token');
        const updateData = {
            employee_id: employeeId,
            username: username,
            full_name: fullName,
            email: email,
            role: role
        };

        // Add password if changing
        if (changePassword && newPassword) {
            updateData.password = newPassword;
        }

        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
            modal.hide();
            
            showAlert('User updated successfully!', 'success');
            
            // Refresh user list
            setTimeout(() => {
                loadUsers();
            }, 1000);
        } else {
            showAlert(data.error || 'Failed to update user', 'danger');
        }
        
    } catch (error) {
        console.error('Update user error:', error);
        showAlert('Error updating user', 'danger');
    }
}

// Delete user
async function deleteUser(userId, userName) {
    if (confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
        try {
            const token = localStorage.getItem('sca_token');
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                showAlert('User deleted successfully', 'success');
                loadUsers(); // Refresh the user list
            } else {
                showAlert(data.error || 'Failed to delete user', 'danger');
            }
        } catch (error) {
            console.error('Delete user error:', error);
            showAlert('Error deleting user', 'danger');
        }
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            // Clear all session-related data
            localStorage.removeItem('sca_token');
            localStorage.removeItem('sca_user');
            localStorage.removeItem('sca_profile');
            sessionStorage.clear();
            
            // Clear any other potential session data
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sca_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            console.log('Session cleared, redirecting to login...');
            
            // Small delay to ensure storage is written
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 100);
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if error occurs
            window.location.href = '/login.html';
        }
    }
}

// Show alert
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// Password field toggle
document.addEventListener('DOMContentLoaded', function() {
    const editPasswordCheckbox = document.getElementById('editPassword');
    const passwordField = document.getElementById('passwordField');
    
    if (editPasswordCheckbox && passwordField) {
        editPasswordCheckbox.addEventListener('change', function() {
            if (this.checked) {
                passwordField.style.display = 'block';
            } else {
                passwordField.style.display = 'none';
                document.getElementById('editNewPassword').value = '';
            }
        });
    }
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+R for refresh
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refreshData();
    }
    
    // Ctrl+D for daily report
    if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        generateReport('daily');
    }
    
    // Ctrl+W for weekly report
    if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        generateReport('weekly');
    }
    
    // Ctrl+M for monthly report
    if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        generateReport('monthly');
    }
});
