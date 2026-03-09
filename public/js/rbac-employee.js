// Role-based access control for Employee dashboard
(function() {
    const token = localStorage.getItem('sca_token');
    const user = localStorage.getItem('sca_user');
    
    if (!token || !user) {
        // Not logged in - redirect to login
        window.location.href = '/login.html';
    } else {
        try {
            const userData = JSON.parse(user);
            if (userData.role === 'admin') {
                // Admin trying to access employee portal - redirect to admin
                window.location.href = '/admin.html';
            }
            // Employee - allow access
        } catch (error) {
            // Invalid user data - force logout
            localStorage.removeItem('sca_token');
            localStorage.removeItem('sca_user');
            window.location.href = '/login.html';
        }
    }
})();
