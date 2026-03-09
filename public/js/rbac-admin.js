// Role-based access control for Admin dashboard
(function() {
    const token = localStorage.getItem('sca_token');
    const user = localStorage.getItem('sca_user');
    
    if (!token || !user) {
        // Not logged in - redirect to login
        window.location.href = '/login.html';
    } else {
        try {
            const userData = JSON.parse(user);
            if (userData.role !== 'admin') {
                // Non-admin trying to access admin portal - redirect to employee
                window.location.href = '/employee.html';
            }
            // Admin - allow access
        } catch (error) {
            // Invalid user data - force logout
            localStorage.removeItem('sca_token');
            localStorage.removeItem('sca_user');
            window.location.href = '/login.html';
        }
    }
})();
