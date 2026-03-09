// Redirect if already logged in (Login/Signup pages)
(function() {
    try {
        const token = localStorage.getItem('sca_token');
        const user = localStorage.getItem('sca_user');
        
        // Only redirect if both token AND user are present
        if (token && user && token.trim() && user.trim()) {
            try {
                const userData = JSON.parse(user);
                
                // Validate token format (basic check)
                if (token.split('.').length === 3) {
                    if (userData.role === 'admin') {
                        window.location.href = '/admin.html';
                    } else if (userData.role === 'employee') {
                        window.location.href = '/employee.html';
                    }
                }
            } catch (parseError) {
                // Invalid JSON, allow them to stay on login
                console.log('Invalid user data, staying on login page');
            }
        }
    } catch (error) {
        console.error('RBAC auth check error:', error);
    }
})();
