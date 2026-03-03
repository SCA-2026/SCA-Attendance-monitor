// API Base URL
const API_BASE = 'http://localhost:3002/api';

// Global state
let currentPage = 'dashboard';
let devices = [];
let attendanceRecords = [];

// Get auth token from localStorage
function getAuthToken() {
    const session = localStorage.getItem('sca_session');
    if (session) {
        const sessionData = JSON.parse(session);
        return sessionData.token;
    }
    return null;
}

// Check authentication
function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Authenticated fetch wrapper
async function authFetch(url, options = {}) {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    return fetch(url, {
        ...options,
        headers
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (!checkAuth()) {
        return;
    }
    
    initializeNavigation();
    loadDashboard();
    setDefaultDates();
    
    // Auto-refresh dashboard every 30 seconds (TEMPORARILY DISABLED)
    // setInterval(() => {
    //     if (currentPage === 'dashboard') {
    //         loadDashboard();
    //     }
    // }, 30000);
});

// Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            navigateToPage(page);
        });
    });
}

function navigateToPage(page) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        employees: 'Employee Management',
        devices: 'Device Management',
        attendance: 'Attendance Records',
        reports: 'Reports',
        settings: 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[page];
    
    // Hide all content
    document.querySelectorAll('.page-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Show selected content
    document.getElementById(`${page}-content`).classList.remove('hidden');
    
    currentPage = page;
    
    // Load page-specific data
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'devices':
            loadDevices();
            break;
        case 'attendance':
            loadAllAttendance();
            break;
        case 'reports':
            loadAllReports();
            break;
    }
}

// Dashboard Functions
async function loadDashboard() {
    try {
        // Load devices
        const devicesResponse = await authFetch(`${API_BASE}/devices`);
        if (!devicesResponse.ok) {
            throw new Error(`HTTP ${devicesResponse.status}: ${devicesResponse.statusText}`);
        }
        const devicesResult = await devicesResponse.json();
        
        if (devicesResult.success) {
            devices = devicesResult.data;
            document.getElementById('totalDevices').textContent = devices.length;
            document.getElementById('activeDevices').textContent = devices.filter(d => d.status === 'active').length;
        }
        
        // Load today's records
        const today = new Date().toISOString().split('T')[0];
        const attendanceResponse = await authFetch(`${API_BASE}/attendance?startDate=${today}&endDate=${today}`);
        if (!attendanceResponse.ok) {
            throw new Error(`HTTP ${attendanceResponse.status}: ${attendanceResponse.statusText}`);
        }
        const attendanceResult = await attendanceResponse.json();
        
        if (attendanceResult.success) {
            document.getElementById('todayRecords').textContent = attendanceResult.data.records.length;
        }
        
        // Load monthly records
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const monthlyResponse = await authFetch(`${API_BASE}/attendance?startDate=${startOfMonth}`);
        if (!monthlyResponse.ok) {
            throw new Error(`HTTP ${monthlyResponse.status}: ${monthlyResponse.statusText}`);
        }
        const monthlyResult = await monthlyResponse.json();
        
        if (monthlyResult.success) {
            document.getElementById('monthlyRecords').textContent = monthlyResult.data.records.length;
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
        // Don't show error to user on auto-refresh, just log it
        if (error.message.includes('socket hang up')) {
            console.log('Socket hang up detected - ignoring for dashboard stability');
        }
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const response = await authFetch(`${API_BASE}/attendance?limit=10`);
        const result = await response.json();
        
        const recentDiv = document.getElementById('recentActivity');
        
        if (result.success && result.data.records.length > 0) {
            let tableHTML = `
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Time</th>
                                <th>Type</th>
                                <th>Device</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            result.data.records.forEach(record => {
                const checkTime = new Date(record.check_time).toLocaleString();
                const badgeClass = record.check_type === 'check-in' ? 'badge-success' : 'badge-warning';
                
                tableHTML += `
                    <tr>
                        <td>
                            <div>
                                <strong>${record.employee_name}</strong>
                                <div class="text-muted small">${record.employee_id}</div>
                            </div>
                        </td>
                        <td>${checkTime}</td>
                        <td>
                            <span class="table-badge ${badgeClass}">${record.check_type}</span>
                        </td>
                        <td>${record.device_name}</td>
                    </tr>
                `;
            });
            
            tableHTML += '</tbody></table></div>';
            recentDiv.innerHTML = tableHTML;
        } else {
            recentDiv.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-users fa-2x mb-2"></i>
                    <p>No recent activity found</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        document.getElementById('recentActivity').innerHTML = '<p class="text-danger">Error loading recent activity</p>';
    }
}

// Device Management Functions
async function loadDevices() {
    try {
        const response = await authFetch(`${API_BASE}/devices`);
        const result = await response.json();
        
        const devicesList = document.getElementById('devicesList');
        
        if (result.success) {
            devices = result.data;
            
            if (devices.length === 0) {
                devicesList.innerHTML = `
                    <div class="text-center text-muted">
                        <i class="fas fa-server fa-3x mb-3"></i>
                        <p>No devices configured</p>
                        <button class="btn btn-primary" onclick="showAddDeviceModal()">
                            <i class="fas fa-plus"></i>
                            Add Your First Device
                        </button>
                    </div>
                `;
                return;
            }
            
            let devicesHTML = '';
            devices.forEach(device => {
                const statusClass = device.status === 'active' ? 'success' : 'danger';
                const lastSync = device.last_sync ? new Date(device.last_sync).toLocaleString() : 'Never';
                
                devicesHTML += `
                    <div class="device-card">
                        <div class="device-header">
                            <div class="device-name">${device.name}</div>
                            <div class="device-status" style="background: var(--${statusClass}-color)"></div>
                        </div>
                        <div class="device-info">
                            <div class="device-info-item">
                                <span class="device-info-label">IP Address:</span>
                                <span class="device-info-value">${device.ip_address}:${device.port}</span>
                            </div>
                            <div class="device-info-item">
                                <span class="device-info-label">Status:</span>
                                <span class="table-badge badge-${statusClass}">${device.status}</span>
                            </div>
                            <div class="device-info-item">
                                <span class="device-info-label">Last Sync:</span>
                                <span class="device-info-value">${lastSync}</span>
                            </div>
                        </div>
                        <div class="device-actions">
                            <button class="btn btn-primary" onclick="syncDevice(${device.id})">
                                <i class="fas fa-sync"></i>
                                Sync
                            </button>
                            <button class="btn btn-outline" onclick="testDevice(${device.id})">
                                <i class="fas fa-plug"></i>
                                Test
                            </button>
                            <button class="btn btn-danger" onclick="deleteDevice(${device.id})">
                                <i class="fas fa-trash"></i>
                                Delete
                            </button>
                        </div>
                    </div>
                `;
            });
            
            devicesList.innerHTML = devicesHTML;
        } else {
            devicesList.innerHTML = '<p class="text-danger">Error loading devices</p>';
        }
    } catch (error) {
        console.error('Error loading devices:', error);
        document.getElementById('devicesList').innerHTML = '<p class="text-danger">Error loading devices</p>';
    }
}

function showAddDeviceModal() {
    document.getElementById('addDeviceModal').classList.add('active');
}

function hideAddDeviceModal() {
    document.getElementById('addDeviceModal').classList.remove('active');
    document.getElementById('deviceForm').reset();
}

async function addDevice() {
    const deviceData = {
        name: document.getElementById('deviceName').value,
        ip_address: document.getElementById('deviceIP').value,
        port: parseInt(document.getElementById('devicePort').value),
        username: document.getElementById('deviceUsername').value,
        password: document.getElementById('devicePassword').value
    };
    
    try {
        const response = await authFetch(`${API_BASE}/devices`, {
            method: 'POST',
            body: JSON.stringify(deviceData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Device added successfully!', 'success');
            hideAddDeviceModal();
            loadDevices();
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

async function syncDevice(deviceId) {
    try {
        const response = await authFetch(`${API_BASE}/sync/${deviceId}`, {
            method: 'POST',
            body: JSON.stringify({ days: 7 })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`Sync completed! ${result.data.recordsSynced} new records added.`, 'success');
            loadDevices();
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

async function syncAllDevices() {
    try {
        const response = await authFetch(`${API_BASE}/sync/all`, {
            method: 'POST',
            body: JSON.stringify({ days: 7 })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`All devices synced! ${result.data.totalRecordsSynced} total records added.`, 'success');
            loadDevices();
            if (currentPage === 'dashboard') {
                loadDashboard();
            }
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

async function testDevice(deviceId) {
    try {
        const response = await authFetch(`${API_BASE}/devices/${deviceId}/test`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Device connection successful!', 'success');
        } else {
            showAlert('Connection failed: ' + result.error, 'danger');
        }
        loadDevices();
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

async function deleteDevice(deviceId) {
    if (!confirm('Are you sure you want to delete this device?')) {
        return;
    }
    
    try {
        const response = await authFetch(`${API_BASE}/devices/${deviceId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Device deleted successfully!', 'success');
            loadDevices();
        } else {
            showAlert('Error: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

// Attendance Functions
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceEndDate').value = today;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    document.getElementById('attendanceStartDate').value = weekAgo;
}

async function loadAttendanceRecords() {
    const startDate = document.getElementById('attendanceStartDate').value;
    const endDate = document.getElementById('attendanceEndDate').value;
    const employeeId = document.getElementById('employeeIdFilter').value;
    
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    if (employeeId) params.append('employeeId', employeeId);
    
    try {
        const tableDiv = document.getElementById('attendanceTable');
        tableDiv.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading records...</div>';
        
        const response = await authFetch(`${API_BASE}/attendance?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data.records.length > 0) {
            let tableHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Employee Name</th>
                            <th>Employee ID</th>
                            <th>Device Name</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            result.data.records.forEach(record => {
                const duration = record.checkOut ? calculateDuration(record.checkIn, record.checkOut) : 'Active';
                tableHTML += `
                    <tr>
                        <td>${record.employeeName}</td>
                        <td>${record.employeeId}</td>
                        <td>${record.deviceName}</td>
                        <td>${formatDateTime(record.checkIn)}</td>
                        <td>${record.checkOut ? formatDateTime(record.checkOut) : '-'}</td>
                        <td>${duration}</td>
                    </tr>
                `;
            });
            
            tableHTML += `
                    </tbody>
                </table>
            `;
            
            tableDiv.innerHTML = tableHTML;
        } else {
            tableDiv.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-users fa-2x mb-3"></i>
                    <p>No attendance records found for selected criteria</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading attendance records:', error);
        const tableDiv = document.getElementById('attendanceTable');
        tableDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Error loading attendance records:</strong> ${error.message}
                <br><small>Please check if the API server is running on port 3000</small>
            </div>
        `;
    }
}

// Report Functions
async function generateWeeklyReport() {
    try {
        const response = await authFetch(`${API_BASE}/reports/weekly`);
        const result = await response.json();
        
        if (result.success) {
            displayReport('Weekly Attendance Report', result.data);
        } else {
            showAlert('Error generating weekly report: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error generating weekly report: ' + error.message, 'danger');
    }
}

async function generateMonthlyReport() {
    try {
        const response = await authFetch(`${API_BASE}/reports/monthly`);
        const result = await response.json();
        
        if (result.success) {
            displayReport('Monthly Attendance Report', result.data);
        } else {
            showAlert('Error generating monthly report: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error generating monthly report: ' + error.message, 'danger');
    }
}

function displayReport(title, data) {
    const reportContent = document.getElementById('reportContent');
    
    let tableHTML = `
        <div class="mb-3">
            <h4>${title}</h4>
            <p class="text-muted">Period: ${data.period.start} to ${data.period.end}</p>
        </div>
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Employee ID</th>
                        <th>Name</th>
                        ${title.includes('Weekly') ? 
                            '<th>Date</th><th>First Check In</th><th>Last Check Out</th><th>Total Checks</th>' : 
                            '<th>Days Present</th><th>First Check In</th><th>Last Check Out</th><th>Total Checks</th>'
                        }
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.records.forEach(record => {
        tableHTML += `
            <tr>
                <td>${record.employee_id}</td>
                <td>${record.employee_name}</td>
                ${title.includes('Weekly') ? 
                    `<td>${record.date}</td><td>${record.first_check_in}</td><td>${record.last_check_out}</td><td>${record.total_checks}</td>` :
                    `<td>${record.days_present}</td><td>${record.first_check_in_month}</td><td>${record.last_check_out_month}</td><td>${record.total_checks}</td>`
                }
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table></div>';
    
    // Add export buttons
    tableHTML += `
        <div class="mt-3">
            <button class="btn btn-outline" onclick="exportToCSV('${title}', ${JSON.stringify(data.records)})">
                <i class="fas fa-file-csv"></i>
                Export to CSV
            </button>
            <button class="btn btn-outline" onclick="window.print()">
                <i class="fas fa-print"></i>
                Print Report
            </button>
        </div>
    `;
    
    reportContent.innerHTML = tableHTML;
}

function exportToCSV(title, records) {
    let csv = '';
    
    // Add headers
    if (title.includes('Weekly')) {
        csv = 'Employee ID,Name,Date,First Check In,Last Check Out,Total Checks\n';
        records.forEach(record => {
            csv += `${record.employee_id},"${record.employee_name}",${record.date},${record.first_check_in},${record.last_check_out},${record.total_checks}\n`;
        });
    } else {
        csv = 'Employee ID,Name,Days Present,First Check In,Last Check Out,Total Checks\n';
        records.forEach(record => {
            csv += `${record.employee_id},"${record.employee_name}",${record.days_present},${record.first_check_in_month},${record.last_check_out_month},${record.total_checks}\n`;
        });
    }
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Utility Functions
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    const contentArea = document.getElementById('contentArea');
    contentArea.insertBefore(alertDiv, contentArea.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + S to sync all devices
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        syncAllDevices();
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        hideAddDeviceModal();
    }
});

// Mobile menu toggle (for responsive design)
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Helper function to format date/time
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ===== NEW ADMIN FUNCTIONS =====

// Employee Management Functions
async function loadEmployees() {
    try {
        const response = await authFetch(`${API_BASE}/employees`);
        const result = await response.json();
        
        const employeesTable = document.getElementById('employeesTable');
        
        if (result.success) {
            displayEmployees(result.data);
        } else {
            employeesTable.innerHTML = '<p class="text-danger">Error loading employees</p>';
        }
    } catch (error) {
        console.error('Error loading employees:', error);
        document.getElementById('employeesTable').innerHTML = '<p class="text-danger">Error loading employees</p>';
    }
}

async function searchEmployees() {
    const query = document.getElementById('employeeSearchInput').value.trim();
    
    if (!query) {
        loadEmployees();
        return;
    }
    
    try {
        const response = await authFetch(`${API_BASE}/employees/search?query=${encodeURIComponent(query)}`);
        const result = await response.json();
        
        if (result.success) {
            displayEmployees(result.data);
        } else {
            showAlert('Error searching employees: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error searching employees: ' + error.message, 'danger');
    }
}

function displayEmployees(employees) {
    const employeesTable = document.getElementById('employeesTable');
    
    if (employees.length === 0) {
        employeesTable.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-users fa-2x mb-3"></i>
                <p>No employees found</p>
            </div>
        `;
        return;
    }
    
    let tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Device</th>
                    <th>First Seen</th>
                    <th>Last Seen</th>
                    <th>Total Events</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    employees.forEach(employee => {
        tableHTML += `
            <tr>
                <td>${employee.employee_id}</td>
                <td>${employee.employee_name}</td>
                <td>${employee.device_name || 'Unknown'}</td>
                <td>${formatDateTime(employee.first_seen)}</td>
                <td>${formatDateTime(employee.last_seen)}</td>
                <td>${employee.total_events || 0}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    employeesTable.innerHTML = tableHTML;
}

// Enhanced Attendance Functions
let currentPageAttendance = 1;
let attendancePagination = {};

async function loadAllAttendance(page = 1) {
    const startDate = document.getElementById('attendanceStartDate').value;
    const endDate = document.getElementById('attendanceEndDate').value;
    const employeeId = document.getElementById('employeeIdFilter').value;
    const employeeName = document.getElementById('employeeNameFilter').value;
    
    const params = new URLSearchParams({
        page: page,
        limit: 50
    });
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (employeeId) params.append('employeeId', employeeId);
    if (employeeName) params.append('employeeName', employeeName);
    
    try {
        const tableDiv = document.getElementById('attendanceTable');
        tableDiv.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading records...</div>';
        
        const response = await authFetch(`${API_BASE}/attendance/all?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            displayAttendanceRecords(result.data.records);
            displayAttendancePagination(result.data.pagination);
            attendancePagination = result.data.pagination;
        } else {
            tableDiv.innerHTML = '<p class="text-danger">Error loading attendance records</p>';
        }
    } catch (error) {
        console.error('Error loading attendance records:', error);
        const tableDiv = document.getElementById('attendanceTable');
        tableDiv.innerHTML = '<p class="text-danger">Error loading attendance records</p>';
    }
}

async function searchAttendance() {
    const query = document.getElementById('attendanceSearchInput').value.trim();
    
    if (!query) {
        loadAllAttendance();
        return;
    }
    
    const startDate = document.getElementById('attendanceStartDate').value;
    const endDate = document.getElementById('attendanceEndDate').value;
    
    const params = new URLSearchParams({ query });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    try {
        const response = await authFetch(`${API_BASE}/attendance/search?${params}`);
        const result = await response.json();
        
        if (result.success) {
            displayAttendanceRecords(result.data);
            document.getElementById('attendancePagination').style.display = 'none';
        } else {
            showAlert('Error searching attendance: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error searching attendance: ' + error.message, 'danger');
    }
}

function displayAttendanceRecords(records) {
    const tableDiv = document.getElementById('attendanceTable');
    
    if (records.length === 0) {
        tableDiv.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-clock fa-2x mb-3"></i>
                <p>No attendance records found</p>
            </div>
        `;
        return;
    }
    
    let tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Device</th>
                    <th>Event Type</th>
                    <th>Date/Time</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    records.forEach(record => {
        const statusBadge = record.status === 'late' ? 'badge-warning' : 'badge-success';
        tableHTML += `
            <tr>
                <td>${record.employee_id}</td>
                <td>${record.employee_name}</td>
                <td>${record.device_name}</td>
                <td>${record.event_type}</td>
                <td>${formatDateTime(record.event_time)}</td>
                <td><span class="table-badge ${statusBadge}">${record.status || 'normal'}</span></td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    tableDiv.innerHTML = tableHTML;
}

function displayAttendancePagination(pagination) {
    const paginationDiv = document.getElementById('attendancePagination');
    
    if (pagination.totalPages <= 1) {
        paginationDiv.style.display = 'none';
        return;
    }
    
    let paginationHTML = '<div class="pagination-controls">';
    
    // Previous button
    if (pagination.page > 1) {
        paginationHTML += `<button class="btn btn-outline me-2" onclick="loadAllAttendance(${pagination.page - 1})">Previous</button>`;
    }
    
    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
        const activeClass = i === pagination.page ? 'btn-primary' : 'btn-outline';
        paginationHTML += `<button class="btn ${activeClass} me-1" onclick="loadAllAttendance(${i})">${i}</button>`;
    }
    
    // Next button
    if (pagination.page < pagination.totalPages) {
        paginationHTML += `<button class="btn btn-outline ms-2" onclick="loadAllAttendance(${pagination.page + 1})">Next</button>`;
    }
    
    paginationHTML += `<span class="ms-3 text-muted">Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total records)</span>`;
    paginationHTML += '</div>';
    
    paginationDiv.innerHTML = paginationHTML;
    paginationDiv.style.display = 'block';
}

// Enhanced Reports Functions
async function loadAllReports() {
    const type = document.getElementById('reportType').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    const employeeId = document.getElementById('reportEmployeeIdFilter').value;
    const employeeName = document.getElementById('reportEmployeeNameFilter').value;
    
    const params = new URLSearchParams({ type });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (employeeId) params.append('employeeId', employeeId);
    if (employeeName) params.append('employeeName', employeeName);
    
    try {
        const response = await authFetch(`${API_BASE}/reports/all?${params}`);
        const result = await response.json();
        
        if (result.success) {
            currentReportData = result.data.records;
            displayReport(result.data.records, type, result.data.summary.period);
            document.getElementById('chartsContainer').style.display = 'block';
            renderCharts(result.data.records);
        } else {
            showAlert('Error generating report: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error generating report: ' + error.message, 'danger');
    }
}

async function searchReports() {
    const query = document.getElementById('reportSearchInput').value.trim();
    
    if (!query) {
        loadAllReports();
        return;
    }
    
    const type = document.getElementById('reportType').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    const params = new URLSearchParams({ query, type });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    try {
        const response = await authFetch(`${API_BASE}/reports/search?${params}`);
        const result = await response.json();
        
        if (result.success) {
            currentReportData = result.data;
            displayReport(result.data, 'search', 'Search Results');
            document.getElementById('chartsContainer').style.display = 'block';
            renderCharts(result.data);
        } else {
            showAlert('Error searching reports: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Error searching reports: ' + error.message, 'danger');
    }
}

// Report Generation Functions
let currentReportData = [];
let pieChart = null;
let barChart = null;

async function generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    await generateReport('daily', today, today);
}

async function generateWeeklyReport() {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await generateReport('weekly', startDate, endDate);
}

async function generateMonthlyReport() {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await generateReport('monthly', startDate, endDate);
}

async function generateReport(type, startDate, endDate) {
    try {
        const response = await authFetch(`${API_BASE}/attendance?startDate=${startDate}&endDate=${endDate}`);
        const result = await response.json();
        
        if (result.success) {
            currentReportData = result.data.records || [];
            displayReport(currentReportData, type, startDate, endDate);
            document.getElementById('chartsContainer').style.display = 'block';
            renderCharts(currentReportData);
        } else {
            showAlert('Error generating report: ' + result.error, 'danger');
        }
    } catch (error) {
        showAlert('Network error: ' + error.message, 'danger');
    }
}

function displayReport(records, type, startDate, endDate) {
    const reportContent = document.getElementById('reportContent');
    
    if (records.length === 0) {
        reportContent.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-inbox fa-3x mb-3"></i>
                <p>No attendance records found for ${type} report (${startDate} to ${endDate})</p>
            </div>
        `;
        return;
    }
    
    // Group by employee
    const employeeStats = {};
    records.forEach(record => {
        const id = record.employeeId || record.employee_id;
        if (!employeeStats[id]) {
            employeeStats[id] = {
                id: id,
                name: record.employeeName || record.employee_name || 'Unknown',
                device: record.deviceName || record.device_name || 'Unknown',
                checkIns: 0,
                checkOuts: 0,
                totalEvents: 0
            };
        }
        employeeStats[id].totalEvents++;
        if (record.eventType === 'access' || record.checkIn) {
            employeeStats[id].checkIns++;
        }
        if (record.checkOut) {
            employeeStats[id].checkOuts++;
        }
    });
    
    const statsArray = Object.values(employeeStats);
    
    let tableHTML = `
        <div class="mb-3">
            <h4>${type.charAt(0).toUpperCase() + type.slice(1)} Report: ${startDate} to ${endDate}</h4>
            <p><strong>Total Employees:</strong> ${statsArray.length} | <strong>Total Records:</strong> ${records.length}</p>
        </div>
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Employee ID</th>
                        <th>Employee Name</th>
                        <th>Device</th>
                        <th>Check-ins</th>
                        <th>Check-outs</th>
                        <th>Total Events</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    statsArray.forEach(stat => {
        tableHTML += `
            <tr>
                <td>${stat.id}</td>
                <td>${stat.name}</td>
                <td>${stat.device}</td>
                <td>${stat.checkIns}</td>
                <td>${stat.checkOuts}</td>
                <td>${stat.totalEvents}</td>
            </tr>
        `;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    reportContent.innerHTML = tableHTML;
}

function renderCharts(records) {
    // Destroy existing charts
    if (pieChart) pieChart.destroy();
    if (barChart) barChart.destroy();
    
    // Group by employee for charts
    const employeeStats = {};
    records.forEach(record => {
        const name = record.employeeName || record.employee_name || 'Unknown';
        if (!employeeStats[name]) {
            employeeStats[name] = { checkIns: 0, checkOuts: 0 };
        }
        if (record.eventType === 'access' || record.checkIn) {
            employeeStats[name].checkIns++;
        }
        if (record.checkOut) {
            employeeStats[name].checkOuts++;
        }
    });
    
    const labels = Object.keys(employeeStats);
    const checkInData = labels.map(name => employeeStats[name].checkIns);
    const checkOutData = labels.map(name => employeeStats[name].checkOuts);
    
    // Pie Chart - Overall attendance distribution
    const pieCtx = document.getElementById('attendancePieChart').getContext('2d');
    pieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: ['Check-ins', 'Check-outs'],
            datasets: [{
                data: [
                    checkInData.reduce((a, b) => a + b, 0),
                    checkOutData.reduce((a, b) => a + b, 0)
                ],
                backgroundColor: ['#66CC33', '#FFCC00'],
                borderColor: ['#5cb82c', '#e6b800'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Attendance Distribution'
                }
            }
        }
    });
    
    // Bar Chart - Per employee
    const barCtx = document.getElementById('attendanceBarChart').getContext('2d');
    barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Check-ins',
                    data: checkInData,
                    backgroundColor: '#66CC33',
                    borderColor: '#5cb82c',
                    borderWidth: 1
                },
                {
                    label: 'Check-outs',
                    data: checkOutData,
                    backgroundColor: '#FFCC00',
                    borderColor: '#e6b800',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Employee Attendance Breakdown'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function applyIdFilter() {
    const filterId = document.getElementById('reportIdFilter').value.trim().toLowerCase();
    if (!filterId) {
        showAlert('Please enter an Employee ID to filter', 'warning');
        return;
    }
    
    const filteredData = currentReportData.filter(record => {
        const id = (record.employeeId || record.employee_id || '').toLowerCase();
        return id.includes(filterId);
    });
    
    if (filteredData.length === 0) {
        showAlert('No records found for Employee ID: ' + filterId, 'warning');
    } else {
        displayReport(filteredData, 'filtered', 'Filtered', 'Results');
        renderCharts(filteredData);
        showAlert(`Showing ${filteredData.length} records for Employee ID: ${filterId}`, 'success');
    }
}

function exportReportExcel() {
    if (currentReportData.length === 0) {
        showAlert('No report data to export. Generate a report first.', 'warning');
        return;
    }
    
    // Group by employee
    const employeeStats = {};
    currentReportData.forEach(record => {
        const id = record.employeeId || record.employee_id;
        if (!employeeStats[id]) {
            employeeStats[id] = {
                'Employee ID': id,
                'Employee Name': record.employeeName || record.employee_name || 'Unknown',
                'Device': record.deviceName || record.device_name || 'Unknown',
                'Check-ins': 0,
                'Check-outs': 0,
                'Total Events': 0
            };
        }
        employeeStats[id]['Total Events']++;
        if (record.eventType === 'access' || record.checkIn) {
            employeeStats[id]['Check-ins']++;
        }
        if (record.checkOut) {
            employeeStats[id]['Check-outs']++;
        }
    });
    
    const data = Object.values(employeeStats);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add data worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    
    // Create summary sheet
    const summaryData = [
        ['Report Generated', new Date().toLocaleString()],
        ['Total Employees', data.length],
        ['Total Check-ins', data.reduce((sum, row) => sum + row['Check-ins'], 0)],
        ['Total Check-outs', data.reduce((sum, row) => sum + row['Check-outs'], 0)],
        ['Total Events', data.reduce((sum, row) => sum + row['Total Events'], 0)]
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    
    // Download
    const filename = `SCA_Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    showAlert('Excel report exported successfully!', 'success');
}
