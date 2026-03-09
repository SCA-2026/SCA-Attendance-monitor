// Employee Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const token = localStorage.getItem('sca_token');
    const user = localStorage.getItem('sca_user');
    
    if (!token || !user) {
        window.location.href = '/login.html';
        return;
    }
    
    try {
        const userData = JSON.parse(user);
        if (userData.role === 'admin') {
            window.location.href = '/admin.html';
            return;
        }
        
        // Set employee name
        const fullName = userData.full_name || 'Employee';
        document.getElementById('employeeName').textContent = fullName;
        document.getElementById('welcomeName').textContent = fullName.split(' ')[0];
        
        // Update current date and time
        updateDateTime();
        setInterval(updateDateTime, 1000);
        
        // Load attendance status
        loadAttendanceStatus();
        loadRecentAttendance();
        
        // Auto-refresh status every 30 seconds
        setInterval(loadAttendanceStatus, 30000);
        
        // Attach event listeners for data-action attributes (CSP compliance)
        attachEventListeners();
        
    } catch (error) {
        console.error('Auth error:', error);
        logout();
    }
});

// Attach event listeners to data-action elements
function attachEventListeners() {
    // Dropdown menu actions
    document.querySelectorAll('[data-action]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const action = el.getAttribute('data-action');
            switch(action) {
                case 'profile':
                    showProfile();
                    break;
                case 'attendance':
                    viewAttendance();
                    break;
                case 'logout':
                    logout();
                    break;
                case 'checkin':
                    checkIn();
                    break;
                case 'checkout':
                    checkOut();
                    break;
                case 'update-profile':
                    updateProfile();
                    break;
            }
        });
    });
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    
    // Update date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', dateOptions);
    
    // Update time
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-US', timeOptions);
}

// Load attendance status
async function loadAttendanceStatus() {
    try {
        const token = localStorage.getItem('sca_token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        
        const response = await fetch('/api/attendance/status', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            updateAttendanceUI(data.status);
        } else {
            throw new Error(data.error || 'Failed to load status');
        }
        
    } catch (error) {
        console.error('Status error:', error);
        document.getElementById('attendanceStatus').innerHTML = `
            <div class="text-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${error.message || 'Unable to load status'}
            </div>
        `;
    }
}

// Update attendance UI
function updateAttendanceUI(status) {
    const statusDiv = document.getElementById('attendanceStatus');
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    const actionMessage = document.getElementById('actionMessage');
    
    if (status.checkedIn && !status.checkedOut) {
        // Currently checked in
        statusDiv.innerHTML = `
            <div class="status-badge status-checked-in mb-3">
                <i class="fas fa-user-check me-2"></i>Checked In
            </div>
            <p class="text-muted mb-0">Check-in time: ${new Date(status.checkInTime).toLocaleTimeString()}</p>
        `;
        
        checkInBtn.style.display = 'none';
        checkOutBtn.style.display = 'block';
        actionMessage.textContent = 'Have a productive day!';
        
    } else if (status.checkedIn && status.checkedOut) {
        // Already checked out
        statusDiv.innerHTML = `
            <div class="status-badge status-checked-out mb-3">
                <i class="fas fa-sign-out-alt me-2"></i>Checked Out
            </div>
            <p class="text-muted mb-0">Check-out time: ${new Date(status.checkOutTime).toLocaleTimeString()}</p>
            <p class="text-muted mb-0">Total hours: ${status.totalHours || 'N/A'}</p>
        `;
        
        checkInBtn.style.display = 'none';
        checkOutBtn.style.display = 'none';
        actionMessage.textContent = 'See you tomorrow!';
        
    } else {
        // Not checked in yet
        statusDiv.innerHTML = `
            <div class="status-badge status-absent mb-3">
                <i class="fas fa-clock me-2"></i>Not Checked In
            </div>
            <p class="text-muted mb-0">Ready to start your day?</p>
        `;
        
        checkInBtn.style.display = 'block';
        checkOutBtn.style.display = 'none';
        actionMessage.textContent = 'Click "Check In" to start your day';
    }
}

// Check in
async function checkIn() {
    try {
        const token = localStorage.getItem('sca_token');
        
        const response = await fetch('/api/checkin', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Check-in successful! Welcome to work!', 'success');
            loadAttendanceStatus();
            loadRecentAttendance();
        } else {
            showAlert(data.error || 'Check-in failed', 'danger');
        }
        
    } catch (error) {
        console.error('Check-in error:', error);
        showAlert('Network error. Please try again.', 'danger');
    }
}

// Check out
async function checkOut() {
    try {
        const token = localStorage.getItem('sca_token');
        
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const hours = data.totalHours || 0;
            showAlert(`Check-out successful! Total hours today: ${hours}`, 'success');
            loadAttendanceStatus();
            loadRecentAttendance();
        } else {
            showAlert(data.error || 'Check-out failed', 'danger');
        }
        
    } catch (error) {
        console.error('Check-out error:', error);
        showAlert('Network error. Please try again.', 'danger');
    }
}

// Load recent attendance
async function loadRecentAttendance() {
    try {
        const token = localStorage.getItem('sca_token');
        const response = await fetch('/api/attendance/recent', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayRecentAttendance(data.attendance);
        }
        
    } catch (error) {
        console.error('Recent attendance error:', error);
        document.getElementById('recentAttendance').innerHTML = `
            <div class="text-center text-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Unable to load recent attendance
            </div>
        `;
    }
}

// Display recent attendance
function displayRecentAttendance(attendance) {
    const container = document.getElementById('recentAttendance');
    
    if (!attendance || attendance.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-calendar-alt me-2"></i>
                No attendance records found
            </div>
        `;
        return;
    }
    
    const timelineHTML = attendance.map(record => {
        const date = new Date(record.date);
        const checkInTime = record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : 'N/A';
        const checkOutTime = record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : 'N/A';
        
        return `
            <div class="timeline-item">
                <div class="timeline-content">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="mb-1">${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h6>
                            <p class="mb-1">
                                <i class="fas fa-sign-in-alt text-success me-1"></i>
                                <small>Check-in: ${checkInTime}</small>
                            </p>
                            ${record.check_out_time ? `
                                <p class="mb-0">
                                    <i class="fas fa-sign-out-alt text-danger me-1"></i>
                                    <small>Check-out: ${checkOutTime}</small>
                                </p>
                            ` : '<p class="mb-0 text-muted"><small>Not checked out yet</small></p>'}
                        </div>
                        <div>
                            ${record.check_out_time ? 
                                `<span class="badge bg-success">Complete</span>` : 
                                `<span class="badge bg-warning">In Progress</span>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `<div class="timeline">${timelineHTML}</div>`;
}

// Show profile
function showProfile() {
    const user = JSON.parse(localStorage.getItem('sca_user'));
    
    // Set profile data
    document.getElementById('profileFullName').value = user.full_name || '';
    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profileEmployeeId').value = user.employee_id || '';
    document.getElementById('profileUsername').value = user.username || '';
    
    // Set avatar initials
    const initials = (user.full_name || 'User').split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('avatarInitials').textContent = initials;
    
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
            document.getElementById('employeeName').textContent = fullName;
            document.getElementById('welcomeName').textContent = fullName.split(' ')[0];
            
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

// View attendance
async function viewAttendance() {
    try {
        const token = localStorage.getItem('sca_token');
        const response = await fetch('/api/attendance/history', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayAttendanceHistory(data.attendance);
        }
        
        const modal = new bootstrap.Modal(document.getElementById('attendanceModal'));
        modal.show();
        
    } catch (error) {
        console.error('Attendance history error:', error);
        showAlert('Error loading attendance history', 'danger');
    }
}

// Display attendance history
function displayAttendanceHistory(attendance) {
    const tbody = document.getElementById('attendanceTableBody');
    
    if (!attendance || attendance.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    No attendance records found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = attendance.map(record => {
        const date = new Date(record.date);
        const checkInTime = record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : 'N/A';
        const checkOutTime = record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : 'N/A';
        
        let totalHours = 'N/A';
        if (record.check_in_time && record.check_out_time) {
            const hours = Math.round((new Date(record.check_out_time) - new Date(record.check_in_time)) / (1000 * 60 * 60) * 100) / 100;
            totalHours = hours + 'h';
        }
        
        return `
            <tr>
                <td>${date.toLocaleDateString()}</td>
                <td>${checkInTime}</td>
                <td>${checkOutTime}</td>
                <td>${totalHours}</td>
                <td>
                    <span class="badge ${record.check_out_time ? 'bg-success' : 'bg-warning'}">
                        ${record.check_out_time ? 'Complete' : 'In Progress'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
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
    const alertContainer = document.getElementById('alertContainer');
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show alert-custom`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+I for check in
    if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        const checkInBtn = document.getElementById('checkInBtn');
        if (checkInBtn && checkInBtn.style.display !== 'none') {
            checkIn();
        }
    }
    
    // Ctrl+O for check out
    if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        const checkOutBtn = document.getElementById('checkOutBtn');
        if (checkOutBtn && checkOutBtn.style.display !== 'none') {
            checkOut();
        }
    }
    
    // Ctrl+P for profile
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        showProfile();
    }
    
    // Ctrl+H for attendance history
    if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        viewAttendance();
    }
    
    // Ctrl+L for logout
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        logout();
    }
});
