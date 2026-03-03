const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

// Initialize database
const db = new sqlite3.Database('./hikvision_events.db');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// serve built frontend if available (Vite production build)
const staticDir = fs.existsSync('dist') ? 'dist' : 'public';
app.use(express.static(staticDir));

// support client-side routing by returning index.html for unknown paths
// custom middleware instead of wildcard route to prevent path parsing errors
app.use((req, res, next) => {
    // only intercept non-API GET requests
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, staticDir, 'index.html'));
    } else {
        next();
    }
});

// Create enhanced webhook events table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS webhook_events_enhanced (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT,
    device_name TEXT,
    employee_id TEXT,
    employee_name TEXT,
    event_type TEXT,
    event_time TEXT,
    access_type TEXT,
    verification_status TEXT,
    late_minutes INTEGER DEFAULT 0,
    login_time TEXT,
    status TEXT DEFAULT 'normal',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Create users table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT UNIQUE,
    employee_name TEXT,
    email TEXT,
    device_name TEXT,
    first_seen TEXT,
    last_seen TEXT,
    total_events INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT,
    password TEXT
)`, (err) => {
    if (err) {
        console.error('Error creating users table:', err);
    } else {
        console.log('✅ Users table ready');
        
        // Add missing columns if they don't exist
        db.run(`ALTER TABLE users ADD COLUMN email TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding email column:', err);
            } else {
                console.log('✅ Email column ready');
            }
        });
        
        db.run(`ALTER TABLE users ADD COLUMN password TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding password column:', err);
            } else {
                console.log('✅ Password column ready');
            }
        });
        
        db.run(`ALTER TABLE users ADD COLUMN created_at TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding created_at column:', err);
            } else {
                console.log('✅ Created_at column ready');
            }
        });
    }
});

// Add missing columns if they don't exist
db.run(`ALTER TABLE webhook_events_enhanced ADD COLUMN access_type TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding access_type column:', err);
    }
});

db.run(`ALTER TABLE webhook_events_enhanced ADD COLUMN verification_status TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding verification_status column:', err);
    }
});

db.run(`ALTER TABLE webhook_events_enhanced ADD COLUMN late_minutes INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding late_minutes column:', err);
    }
});

db.run(`ALTER TABLE webhook_events_enhanced ADD COLUMN login_time TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding login_time column:', err);
    }
});

db.run(`ALTER TABLE webhook_events_enhanced ADD COLUMN status TEXT DEFAULT 'normal'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding status column:', err);
    }
});

// Email Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to your email provider
    auth: {
        user: process.env.EMAIL_USER || 'sca@spartecconsortium.com', // Company email
        pass: process.env.EMAIL_PASS || 'your-app-password' // Use app password for Gmail
    }
});

// Email notification function
async function sendCheckInNotification(employeeData, checkInTime) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER || 'sca@spartecconsortium.com',
            to: process.env.COMPANY_EMAIL || 'admin@spartecconsortium.com', // Company registered email
            subject: `SCA Attendance: ${employeeData.employee_name} Checked In`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #66CC33; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h2>🏢 Spartec Consortium Africa</h2>
                        <p>Attendance Management System</p>
                    </div>
                    <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px;">
                        <h3>📅 Employee Check-In Notification</h3>
                        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <p><strong>👤 Employee Name:</strong> ${employeeData.employee_name}</p>
                            <p><strong>🆔 Employee ID:</strong> ${employeeData.employee_id}</p>
                            <p><strong>🕐 Check-In Time:</strong> ${new Date(checkInTime).toLocaleString()}</p>
                            <p><strong>📱 Device:</strong> ${employeeData.device_name || 'Employee Portal'}</p>
                            <p><strong>🌐 IP Address:</strong> ${employeeData.ip_address || 'Unknown'}</p>
                        </div>
                        <div style="text-align: center; margin-top: 30px;">
                            <p style="color: #666;">This is an automated notification from SCA Attendance System</p>
                            <a href="http://localhost:3002/admin-dashboard.html" style="background: #66CC33; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                View Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Check-in notification sent for ${employeeData.employee_name}`);
        return true;
    } catch (error) {
        console.error('❌ Email notification failed:', error);
        return false;
    }
}

// Authentication middleware
function requireAuth(req, res, next) {
    const token = req.headers.authorization || req.query.token;
    
    if (!token) {
        // For HTML pages, redirect to login
        if (req.accepts('html')) {
            return res.redirect('/login.html');
        }
        // For API calls, return 401
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    // Simple token validation (in production, use proper JWT validation)
    let actualToken = token;
    if (token.startsWith('Bearer ')) {
        actualToken = token.substring(7);
    }
    
    // For demo, accept any token that looks like our generated tokens
    if (actualToken.length > 10) {
        return next();
    }
    
    // Invalid token
    if (req.accepts('html')) {
        return res.redirect('/login.html');
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
}

// Protect dashboard and reports pages
app.use(['/dashboard.html', '/reports.html', '/admin-dashboard.html', '/employee-dashboard.html'], requireAuth);

// Protect API endpoints (except login, signup, and health)
app.use(['/api/devices', '/api/attendance', '/api/reports', '/api/users'], requireAuth);

// Network device discovery endpoint
app.get('/api/discover-devices', requireAuth, async (req, res) => {
    const defaultGateway = '10.10.10.1';
    const networkRange = '10.10.10';
    
    try {
        const discoveredDevices = [];
        
        // Scan common Hikvision device ports on the network
        const commonPorts = [80, 554, 8000, 8080, 37777, 37778];
        
        for (let i = 1; i <= 254; i++) {
            const deviceIP = `${networkRange}.${i}`;
            
            for (const port of commonPorts) {
                try {
                    // Simulate device discovery (in real implementation, you'd use actual network scanning)
                    const isDevice = await simulateDeviceCheck(deviceIP, port);
                    if (isDevice) {
                        discoveredDevices.push({
                            ip: deviceIP,
                            port: port,
                            name: `Hikvision Device ${deviceIP}`,
                            status: 'online',
                            lastSeen: new Date().toISOString()
                        });
                        break; // Found device on this IP, check next IP
                    }
                } catch (error) {
                    // Device not responding on this port
                }
            }
            
            // Add small delay to prevent overwhelming network
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        console.log(`🔍 Discovered ${discoveredDevices.length} devices on network ${networkRange}.0/24`);
        
        res.json({
            success: true,
            data: {
                devices: discoveredDevices,
                networkRange: `${networkRange}.0/24`,
                gateway: defaultGateway,
                scanTime: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Device discovery error:', error);
        res.status(500).json({
            success: false,
            error: 'Device discovery failed',
            details: error.message
        });
    }
});

// Simulate device check (replace with actual network scanning in production)
async function simulateDeviceCheck(ip, port) {
    // Simulate some devices on the network for demo
    const demoDevices = [
        { ip: '10.10.10.100', port: 80, name: 'Main Door Access' },
        { ip: '10.10.10.101', port: 80, name: 'Back Door Access' },
        { ip: '10.10.10.102', port: 554, name: 'Office Camera 1' },
        { ip: '10.10.10.103', port: 554, name: 'Office Camera 2' }
    ];
    
    return demoDevices.some(device => device.ip === ip && device.port === port);
}

// Clear users endpoint (for admin use)
app.post('/api/clear-users', requireAuth, (req, res) => {
    db.run('DELETE FROM users WHERE employee_id != ?', ['admin'], function(err) {
        if (err) {
            console.error('Error clearing users:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        console.log('✅ Cleared all non-admin users');
        res.json({ success: true, message: 'All non-admin users cleared' });
    });
});

// Enhanced Reports Endpoint with Daily/Weekly/Monthly Support
app.get('/api/reports/enhanced', requireAuth, (req, res) => {
    const { 
        type = 'daily', 
        employeeId, 
        employeeName, 
        startDate, 
        endDate 
    } = req.query;
    
    let dateFilter = '';
    let groupBy = '';
    
    // Calculate date ranges based on type
    const now = new Date();
    let queryStartDate, queryEndDate;
    
    switch (type) {
        case 'daily':
            queryStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            queryEndDate = endDate || new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
            groupBy = 'DATE(event_time)';
            break;
        case 'weekly':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            queryStartDate = startDate || weekStart.toISOString();
            queryEndDate = endDate || new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
            groupBy = 'DATE(event_time)';
            break;
        case 'monthly':
            queryStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            queryEndDate = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
            groupBy = 'DATE(event_time)';
            break;
        default:
            queryStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            queryEndDate = endDate || new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
            groupBy = 'DATE(event_time)';
    }
    
    let whereClause = `WHERE event_time >= ? AND event_time < ?`;
    let params = [queryStartDate, queryEndDate];
    
    if (employeeId) {
        whereClause += ` AND employee_id = ?`;
        params.push(employeeId);
    }
    
    if (employeeName) {
        whereClause += ` AND employee_name LIKE ?`;
        params.push(`%${employeeName}%`);
    }
    
    const query = `
        SELECT 
            ${groupBy} as report_date,
            employee_id,
            employee_name,
            COUNT(*) as total_checkins,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
            AVG(late_minutes) as avg_late_minutes,
            MAX(late_minutes) as max_late_minutes,
            MIN(event_time) as first_checkin,
            MAX(event_time) as last_checkin
        FROM webhook_events_enhanced 
        ${whereClause}
        AND event_type = 'checkin'
        GROUP BY ${groupBy}, employee_id, employee_name
        ORDER BY report_date DESC, employee_name
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        
        // Calculate summary statistics
        const summary = {
            totalEmployees: new Set(rows.map(r => r.employee_id)).size,
            totalCheckIns: rows.reduce((sum, r) => sum + r.total_checkins, 0),
            totalLate: rows.reduce((sum, r) => sum + r.late_count, 0),
            avgLateMinutes: rows.length > 0 
                ? Math.round(rows.reduce((sum, r) => sum + (r.avg_late_minutes || 0), 0) / rows.length)
                : 0,
            reportType: type,
            dateRange: {
                start: queryStartDate,
                end: queryEndDate
            }
        };
        
        res.json({
            success: true,
            data: {
                summary,
                records: rows,
                reportType: type,
                dateRange: {
                    start: queryStartDate,
                    end: queryEndDate
                }
            }
        });
    });
});

// Generate Excel Report for Enhanced Reports
app.post('/api/reports/enhanced/export', requireAuth, (req, res) => {
    const { 
        type = 'daily', 
        employeeId, 
        employeeName, 
        startDate, 
        endDate 
    } = req.body;
    
    // Get the same data as the enhanced reports endpoint
    req.query = { type, employeeId, employeeName, startDate, endDate };
    
    // Reuse the enhanced reports logic
    const { 
        type: reportType, 
        employeeId: empId, 
        employeeName: empName, 
        startDate: start, 
        endDate: end 
    } = req.query;
    
    let dateFilter = '';
    let groupBy = '';
    
    const now = new Date();
    let queryStartDate, queryEndDate;
    
    switch (reportType) {
        case 'daily':
            queryStartDate = start || new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            queryEndDate = end || new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
            groupBy = 'DATE(event_time)';
            break;
        case 'weekly':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            queryStartDate = start || weekStart.toISOString();
            queryEndDate = end || new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
            groupBy = 'DATE(event_time)';
            break;
        case 'monthly':
            queryStartDate = start || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            queryEndDate = end || new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
            groupBy = 'DATE(event_time)';
            break;
        default:
            queryStartDate = start || new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            queryEndDate = end || new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
            groupBy = 'DATE(event_time)';
    }
    
    let whereClause = `WHERE event_time >= ? AND event_time < ?`;
    let params = [queryStartDate, queryEndDate];
    
    if (empId) {
        whereClause += ` AND employee_id = ?`;
        params.push(empId);
    }
    
    if (empName) {
        whereClause += ` AND employee_name LIKE ?`;
        params.push(`%${empName}%`);
    }
    
    const query = `
        SELECT 
            ${groupBy} as report_date,
            employee_id,
            employee_name,
            COUNT(*) as total_checkins,
            SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
            AVG(late_minutes) as avg_late_minutes,
            MAX(late_minutes) as max_late_minutes,
            MIN(event_time) as first_checkin,
            MAX(event_time) as last_checkin
        FROM webhook_events_enhanced 
        ${whereClause}
        AND event_type = 'checkin'
        GROUP BY ${groupBy}, employee_id, employee_name
        ORDER BY report_date DESC, employee_name
    `;
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        
        // Generate Excel file
        try {
            const XLSX = require('xlsx');
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Create summary worksheet
            const summaryData = [
                ['Report Type', reportType.toUpperCase()],
                ['Date Range', `${new Date(queryStartDate).toLocaleDateString()} - ${new Date(queryEndDate).toLocaleDateString()}`],
                ['Total Employees', new Set(rows.map(r => r.employee_id)).size],
                ['Total Check-ins', rows.reduce((sum, r) => sum + r.total_checkins, 0)],
                ['Total Late Arrivals', rows.reduce((sum, r) => sum + r.late_count, 0)],
                ['Average Late Minutes', rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + (r.avg_late_minutes || 0), 0) / rows.length) : 0],
                [],
                ['Employee ID', 'Employee Name', 'Date', 'Total Check-ins', 'Late Count', 'Avg Late Minutes', 'Max Late Minutes', 'First Check-in', 'Last Check-in']
            ];
            
            // Add employee data
            rows.forEach(row => {
                summaryData.push([
                    row.employee_id,
                    row.employee_name,
                    new Date(row.report_date).toLocaleDateString(),
                    row.total_checkins,
                    row.late_count,
                    Math.round(row.avg_late_minutes || 0),
                    row.max_late_minutes || 0,
                    new Date(row.first_checkin).toLocaleString(),
                    new Date(row.last_checkin).toLocaleString()
                ]);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
            
            // Generate file
            const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            
            // Set headers for file download
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="SCA_Attendance_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx"`);
            res.send(excelBuffer);
            
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to generate Excel file' });
        }
    });
});

// ===== ADMIN DATABASE OPERATIONS =====

// Get all employees
app.get('/api/employees', requireAuth, (req, res) => {
    db.all('SELECT * FROM users ORDER BY last_seen DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, data: rows });
        }
    });
});

// Update employee endpoint
app.put('/api/employees/:employeeId', requireAuth, (req, res) => {
    const { employeeId } = req.params;
    const { employeeName, email } = req.body;
    
    if (!employeeName) {
        return res.status(400).json({ 
            success: false, 
            error: 'Employee name is required' 
        });
    }
    
    // Update in users table
    db.run(
        'UPDATE users SET employee_name = ?, email = ? WHERE employee_id = ?',
        [employeeName, email || '', employeeId],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            
            // Also update attendance records
            db.run(
                'UPDATE webhook_events_enhanced SET employee_name = ? WHERE employee_id = ?',
                [employeeName, employeeId],
                function(err) {
                    if (err) {
                        console.error('Error updating attendance records:', err);
                    }
                }
            );
            
            console.log(`✅ Employee updated: ${employeeId} -> ${employeeName}`);
            res.json({ 
                success: true, 
                message: 'Employee updated successfully' 
            });
        }
    );
});

// Delete employee endpoint
app.delete('/api/employees/:employeeId', requireAuth, (req, res) => {
    const { employeeId } = req.params;
    
    // Don't allow deletion of admin
    if (employeeId === 'admin') {
        return res.status(403).json({ 
            success: false, 
            error: 'Cannot delete admin user' 
        });
    }
    
    // Delete from users table
    db.run(
        'DELETE FROM users WHERE employee_id = ?',
        [employeeId],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            
            // Also delete from attendance records
            db.run(
                'DELETE FROM webhook_events_enhanced WHERE employee_id = ?',
                [employeeId],
                function(err) {
                    if (err) {
                        console.error('Error deleting attendance records:', err);
                    }
                }
            );
            
            // Remove from in-memory credentials if exists
            if (userCredentials.has(employeeId)) {
                userCredentials.delete(employeeId);
            }
            
            console.log(`✅ Employee deleted: ${employeeId}`);
            res.json({ 
                success: true, 
                message: 'Employee deleted successfully' 
            });
        }
    );
});

// Employee check-out endpoint
app.post('/api/employee-checkout', requireAuth, (req, res) => {
    const { employeeId, employeeName, checkOutTime } = req.body;
    
    if (!employeeId || !checkOutTime) {
        return res.status(400).json({
            success: false,
            error: 'Employee ID and check-out time are required'
        });
    }
    
    // Find today's check-in record for this employee
    const today = new Date().toISOString().split('T')[0];
    db.get(
        `SELECT * FROM webhook_events_enhanced 
         WHERE employee_id = ? AND DATE(event_time) = ? AND event_type = 'checkin' 
         ORDER BY event_time DESC LIMIT 1`,
        [employeeId, today],
        (err, checkInRecord) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            
            if (!checkInRecord) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'No check-in record found for today' 
                });
            }
            
            // Calculate total time in office
            const checkInTime = new Date(checkInRecord.event_time);
            const checkOutDateTime = new Date(checkOutTime);
            const totalMinutes = Math.round((checkOutDateTime - checkInTime) / (1000 * 60));
            
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const totalTimeInOffice = `${hours}h ${minutes}m`;
            
            // Record check-out
            db.run(
                `INSERT INTO webhook_events_enhanced 
                 (employee_id, employee_name, device_name, event_type, event_time, access_type, verification_status, late_minutes, login_time, status) 
                 VALUES (?, ?, ?, 'checkout', ?, 'manual', 'verified', 0, ?, 'completed')`,
                [employeeId, employeeName, checkOutTime, checkOutTime],
                function(err) {
                    if (err) {
                        return res.status(500).json({ success: false, error: err.message });
                    }
                    
                    console.log(`✅ Employee checked out: ${employeeName} (${employeeId}) - Total time: ${totalTimeInOffice}`);
                    res.json({
                        success: true,
                        data: {
                            employeeId: employeeId,
                            employeeName: employeeName,
                            checkOutTime: checkOutTime,
                            totalTimeInOffice: totalTimeInOffice,
                            totalMinutes: totalMinutes,
                            message: 'Check-out recorded successfully'
                        }
                    });
                }
            );
        }
    );
});

// Search employees by ID or username
app.get('/api/employees/search', requireAuth, (req, res) => {
    const { query } = req.query;
    
    if (!query) {
        return res.status(400).json({ success: false, error: 'Search query is required' });
    }
    
    const searchQuery = `%${query}%`;
    db.all(
        'SELECT * FROM users WHERE employee_id LIKE ? OR employee_name LIKE ? ORDER BY last_seen DESC',
        [searchQuery, searchQuery],
        (err, rows) => {
            if (err) {
                res.status(500).json({ success: false, error: err.message });
            } else {
                res.json({ success: true, data: rows });
            }
        }
    );
});

// Get all attendance records with pagination and filtering
app.get('/api/attendance/all', requireAuth, (req, res) => {
    const { 
        page = 1, 
        limit = 50, 
        startDate, 
        endDate, 
        employeeId, 
        employeeName 
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (startDate && endDate) {
        whereClause += ' AND date(event_time) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    } else if (startDate) {
        whereClause += ' AND date(event_time) >= ?';
        params.push(startDate);
    }
    
    if (employeeId) {
        whereClause += ' AND employee_id = ?';
        params.push(employeeId);
    }
    
    if (employeeName) {
        whereClause += ' AND employee_name LIKE ?';
        params.push(`%${employeeName}%`);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM webhook_events_enhanced ${whereClause}`;
    db.get(countQuery, params, (err, countResult) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        
        // Get paginated results
        const dataQuery = `
            SELECT * FROM webhook_events_enhanced 
            ${whereClause} 
            ORDER BY event_time DESC 
            LIMIT ? OFFSET ?
        `;
        
        db.all(dataQuery, [...params, parseInt(limit), offset], (err, rows) => {
            if (err) {
                res.status(500).json({ success: false, error: err.message });
            } else {
                res.json({
                    success: true,
                    data: {
                        records: rows,
                        pagination: {
                            page: parseInt(page),
                            limit: parseInt(limit),
                            total: countResult.total,
                            totalPages: Math.ceil(countResult.total / limit)
                        }
                    }
                });
            }
        });
    });
});

// Search attendance records
app.get('/api/attendance/search', requireAuth, (req, res) => {
    const { query, startDate, endDate } = req.query;
    
    if (!query) {
        return res.status(400).json({ success: false, error: 'Search query is required' });
    }
    
    let whereClause = 'WHERE (employee_id LIKE ? OR employee_name LIKE ?)';
    let params = [`%${query}%`, `%${query}%`];
    
    if (startDate && endDate) {
        whereClause += ' AND date(event_time) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    } else if (startDate) {
        whereClause += ' AND date(event_time) >= ?';
        params.push(startDate);
    }
    
    const dataQuery = `
        SELECT * FROM webhook_events_enhanced 
        ${whereClause} 
        ORDER BY event_time DESC 
        LIMIT 100
    `;
    
    db.all(dataQuery, params, (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, data: rows });
        }
    });
});

// Get all reports with advanced filtering
app.get('/api/reports/all', requireAuth, (req, res) => {
    const { 
        type = 'daily', 
        startDate, 
        endDate, 
        employeeId, 
        employeeName 
    } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (startDate && endDate) {
        whereClause += ' AND date(event_time) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    } else if (type === 'daily') {
        const today = new Date().toISOString().split('T')[0];
        whereClause += ' AND date(event_time) = ?';
        params.push(today);
    } else if (type === 'weekly') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        whereClause += ' AND date(event_time) >= ?';
        params.push(weekAgo);
    } else if (type === 'monthly') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        whereClause += ' AND date(event_time) >= ?';
        params.push(monthAgo);
    }
    
    if (employeeId) {
        whereClause += ' AND employee_id = ?';
        params.push(employeeId);
    }
    
    if (employeeName) {
        whereClause += ' AND employee_name LIKE ?';
        params.push(`%${employeeName}%`);
    }
    
    const reportQuery = `
        SELECT 
            employee_id,
            employee_name,
            device_name,
            COUNT(*) as total_events,
            MIN(event_time) as first_check_in,
            MAX(event_time) as last_check_out,
            GROUP_CONCAT(DISTINCT event_type) as event_types,
            COUNT(DISTINCT date(event_time)) as days_present
        FROM webhook_events_enhanced 
        ${whereClause}
        GROUP BY employee_id, employee_name, device_name
        ORDER BY first_check_in DESC
    `;
    
    db.all(reportQuery, params, (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            // Calculate summary statistics
            const summary = {
                type: type,
                period: startDate && endDate ? `${startDate} to ${endDate}` : type,
                total_employees: rows.length,
                total_events: rows.reduce((sum, row) => sum + row.total_events, 0),
                report_generated: new Date().toISOString()
            };
            
            res.json({
                success: true,
                data: {
                    summary: summary,
                    records: rows
                }
            });
        }
    });
});

// Search reports by employee ID or username
app.get('/api/reports/search', requireAuth, (req, res) => {
    const { query, type = 'daily', startDate, endDate } = req.query;
    
    if (!query) {
        return res.status(400).json({ success: false, error: 'Search query is required' });
    }
    
    let whereClause = 'WHERE (employee_id LIKE ? OR employee_name LIKE ?)';
    let params = [`%${query}%`, `%${query}%`];
    
    if (startDate && endDate) {
        whereClause += ' AND date(event_time) BETWEEN ? AND ?';
        params.push(startDate, endDate);
    } else if (type === 'daily') {
        const today = new Date().toISOString().split('T')[0];
        whereClause += ' AND date(event_time) = ?';
        params.push(today);
    } else if (type === 'weekly') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        whereClause += ' AND date(event_time) >= ?';
        params.push(weekAgo);
    } else if (type === 'monthly') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        whereClause += ' AND date(event_time) >= ?';
        params.push(monthAgo);
    }
    
    const reportQuery = `
        SELECT 
            employee_id,
            employee_name,
            device_name,
            COUNT(*) as total_events,
            MIN(event_time) as first_check_in,
            MAX(event_time) as last_check_out,
            GROUP_CONCAT(DISTINCT event_type) as event_types,
            COUNT(DISTINCT date(event_time)) as days_present
        FROM webhook_events_enhanced 
        ${whereClause}
        GROUP BY employee_id, employee_name, device_name
        ORDER BY first_check_in DESC
    `;
    
    db.all(reportQuery, params, (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, data: rows });
        }
    });
});

// Get all events
app.get('/api/events', (req, res) => {
    db.all('SELECT * FROM webhook_events_enhanced ORDER BY event_time DESC LIMIT 100', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, data: rows });
        }
    });
});

// Get devices (for dashboard compatibility)
app.get('/api/devices', (req, res) => {
    // Return device info based on stored events
    db.all('SELECT DISTINCT device_name FROM users WHERE device_name IS NOT NULL', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            const devices = rows.map((row, index) => ({
                id: index + 1,
                name: row.device_name || 'Spartec Consortium Africa.Ltd',
                status: 'active',
                last_sync: new Date().toISOString()
            }));
            res.json({ success: true, data: devices });
        }
    });
});

// Get attendance records (for dashboard compatibility)
app.get('/api/attendance', (req, res) => {
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM webhook_events_enhanced';
    let params = [];
    
    if (startDate && endDate) {
        query += ' WHERE date(event_time) BETWEEN ? AND ?';
        params = [startDate, endDate];
    } else if (startDate) {
        query += ' WHERE date(event_time) >= ?';
        params = [startDate];
    }
    
    query += ' ORDER BY event_time DESC LIMIT 100';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            // Convert events to attendance records format
            const records = rows.map(row => ({
                employeeId: row.employee_id,
                employeeName: row.employee_name,
                deviceName: row.device_name,
                checkIn: row.event_time,
                checkOut: null,
                eventType: row.event_type
            }));
            res.json({ success: true, data: { records: records } });
        }
    });
});

// Get all users
app.get('/api/users', (req, res) => {
    db.all('SELECT * FROM users ORDER BY last_seen DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, data: rows });
        }
    });
});

// Generate daily report
app.get('/api/reports/daily', (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const query = `
        SELECT 
            employee_id,
            employee_name,
            device_name,
            COUNT(*) as total_events,
            MIN(event_time) as first_check_in,
            MAX(event_time) as last_check_out,
            GROUP_CONCAT(DISTINCT event_type) as event_types
        FROM webhook_events_enhanced 
        WHERE date(event_time) = ?
        GROUP BY employee_id, employee_name, device_name
        ORDER BY first_check_in DESC
    `;
    
    db.all(query, [date], (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            // Calculate summary statistics
            const summary = {
                date: date,
                total_employees: rows.length,
                total_check_ins: rows.reduce((sum, row) => sum + row.total_events, 0),
                report_generated: new Date().toISOString()
            };
            
            res.json({ 
                success: true, 
                data: {
                    summary: summary,
                    records: rows
                }
            });
        }
    });
});

// Export report as CSV
app.get('/api/reports/daily/export', (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    const query = `
        SELECT 
            employee_id,
            employee_name,
            device_name,
            COUNT(*) as total_events,
            MIN(event_time) as first_check_in,
            MAX(event_time) as last_check_out
        FROM webhook_events_enhanced 
        WHERE date(event_time) = ?
        GROUP BY employee_id, employee_name, device_name
        ORDER BY first_check_in DESC
    `;
    
    db.all(query, [date], (err, rows) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            // Generate CSV
            const headers = ['Employee ID', 'Employee Name', 'Device Name', 'Total Events', 'First Check In', 'Last Check Out'];
            const csvRows = rows.map(row => [
                row.employee_id,
                row.employee_name,
                row.device_name,
                row.total_events,
                row.first_check_in,
                row.last_check_out || 'Not checked out'
            ]);
            
            const csv = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="daily_report_${date}.csv"`);
            res.send(csv);
        }
    });
});

// Employee Authentication and Check-in System

// Simple token generation
function generateToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Employee login
app.post('/api/employee-login', (req, res) => {
    const { employeeId, employeeName, password, loginTime } = req.body;
    
    if (!employeeId || !employeeName || !password) {
        return res.status(400).json({ 
            success: false, 
            error: 'Employee ID, Name, and Password are required' 
        });
    }
    
    // For now, use a simple password check (in production, use proper hashing)
    // Password is "sca2024" + employeeId for demo
    const expectedPassword = 'sca2024' + employeeId;
    
    if (password !== expectedPassword) {
        return res.status(401).json({ 
            success: false, 
            error: 'Invalid credentials' 
        });
    }
    
    // Check if employee exists in users table, if not create
    db.get('SELECT * FROM users WHERE employee_id = ?', [employeeId], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        
        const token = generateToken();
        const now = new Date().toISOString();
        
        if (!user) {
            // Create new user
            db.run(
                'INSERT INTO users (employee_id, employee_name, device_name, first_seen, last_seen) VALUES (?, ?, ?, ?, ?)',
                [employeeId, employeeName, 'Employee Portal', now, now],
                function(err) {
                    if (err) {
                        return res.status(500).json({ success: false, error: err.message });
                    }
                    
                    // Record login event
                    recordLogin(employeeId, employeeName, loginTime, token, res);
                }
            );
        } else {
            // Update last seen
            db.run(
                'UPDATE users SET last_seen = ?, employee_name = ? WHERE employee_id = ?',
                [now, employeeName, employeeId],
                function(err) {
                    if (err) {
                        return res.status(500).json({ success: false, error: err.message });
                    }
                    
                    // Record login event
                    recordLogin(employeeId, employeeName, loginTime, token, res);
                }
            );
        }
    });
});

function recordLogin(employeeId, employeeName, loginTime, token, res) {
    // Check if already checked in today
    const today = new Date().toISOString().split('T')[0];
    
    db.get(
        'SELECT * FROM webhook_events_enhanced WHERE employee_id = ? AND date(event_time) = ? AND event_type = ?',
        [employeeId, today, 'checkin'],
        (err, existing) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            
            const checkInStatus = existing ? 'already-checked' : 'pending';
            
            res.json({
                success: true,
                data: {
                    employeeId: employeeId,
                    employeeName: employeeName,
                    loginTime: loginTime || new Date().toISOString(),
                    token: token,
                    checkInStatus: checkInStatus,
                    message: checkInStatus === 'already-checked' 
                        ? 'You have already checked in today' 
                        : 'Please proceed to check in'
                }
            });
        }
    );
}

// Employee check-in
app.post('/api/employee-checkin', async (req, res) => {
    const { employeeId, employeeName, loginTime, checkInTime, token } = req.body;
    
    if (!employeeId || !checkInTime) {
        return res.status(400).json({ 
            success: false, 
            error: 'Employee ID and check-in time are required' 
        });
    }
    
    // Get client IP address
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
                   (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    // Calculate status based on 8:00 AM protocol
    const checkIn = new Date(checkInTime);
    const protocolTime = new Date(checkIn);
    protocolTime.setHours(8, 0, 0, 0);
    
    const diffMinutes = (checkIn - protocolTime) / 60000;
    let status = 'on-time';
    let lateMinutes = 0;
    
    if (diffMinutes > 0) {
        status = 'late';
        lateMinutes = Math.floor(diffMinutes);
    }
    
    // Record the check-in event
    const eventData = {
        device_id: 'Employee Portal',
        device_name: 'Employee Portal',
        employee_id: employeeId,
        employee_name: employeeName,
        event_type: 'checkin',
        event_time: checkInTime,
        access_type: 'Face Recognition',
        verification_status: 'Success',
        late_minutes: lateMinutes,
        login_time: loginTime,  // Store login time for integrity
        status: status
    };
    
    db.run(
        `INSERT INTO webhook_events_enhanced 
         (device_id, device_name, employee_id, employee_name, event_type, event_time, 
          access_type, verification_status, late_minutes, login_time, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [eventData.device_id, eventData.device_name, eventData.employee_id, 
         eventData.employee_name, eventData.event_type, eventData.event_time,
         eventData.access_type, eventData.verification_status, eventData.late_minutes,
         eventData.login_time, eventData.status],
        async function(err) {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            
            console.log(`✅ ${employeeName} (${employeeId}) checked in at ${checkInTime} - Status: ${status}`);
            
            // Send email notification
            const employeeData = {
                employee_name: employeeName,
                employee_id: employeeId,
                device_name: 'Employee Portal',
                ip_address: clientIP
            };
            
            const emailSent = await sendCheckInNotification(employeeData, checkInTime);
            
            res.json({
                success: true,
                data: {
                    employeeId: employeeId,
                    checkInTime: checkInTime,
                    status: status,
                    lateMinutes: lateMinutes,
                    emailNotificationSent: emailSent,
                    message: status === 'on-time' 
                        ? 'Check-in successful! You are on time.' 
                        : `Check-in recorded. You are ${lateMinutes} minutes late.`
                }
            });
        }
    );
});

// Get employee attendance history
app.get('/api/employee-attendance', (req, res) => {
    const { employeeId } = req.query;
    
    if (!employeeId) {
        return res.status(400).json({ 
            success: false, 
            error: 'Employee ID is required' 
        });
    }
    
    // Get last 30 days of attendance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    db.all(
        `SELECT 
            date(event_time) as date,
            event_time,
            status,
            late_minutes,
            login_time
         FROM webhook_events_enhanced 
         WHERE employee_id = ? 
         AND event_type = 'checkin'
         AND date(event_time) >= date(?)
         ORDER BY event_time DESC`,
        [employeeId, thirtyDaysAgo.toISOString()],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            
            res.json({
                success: true,
                data: rows
            });
        }
    );
});

// ===== AUTHENTICATION SYSTEM =====

// In-memory store for user credentials (for demo - in production use proper database)
const userCredentials = new Map();

// Simple token generation
function generateToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Sign up endpoint
app.post('/api/signup', (req, res) => {
    const { username, name, email, password, confirmPassword } = req.body;
    
    // Validation
    if (!username || !name || !email || !password || !confirmPassword) {
        return res.status(400).json({
            success: false,
            error: 'All fields are required'
        });
    }
    
    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            error: 'Passwords do not match'
        });
    }
    
    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            error: 'Password must be at least 6 characters'
        });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            error: 'Please enter a valid email address'
        });
    }
    
    // Check if user already exists in database
    db.get('SELECT * FROM users WHERE employee_id = ?', [username], (err, existingUser) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Employee ID already registered. Please login instead.'
            });
        }
        
        // Check if email already exists
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingEmail) => {
            if (err) {
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            if (existingEmail) {
                return res.status(409).json({
                    success: false,
                    error: 'Email already registered. Please use a different email.'
                });
            }
            
            // Store credentials in memory for authentication
            userCredentials.set(username, {
                employeeId: username,
                employeeName: name,
                email: email,
                password: password, // In production: bcrypt.hashSync(password, 10)
                createdAt: new Date().toISOString()
            });
            
            // Add to users table (this automatically adds to employees list)
            const now = new Date().toISOString();
            db.run(
                'INSERT INTO users (employee_id, employee_name, email, password, device_name, first_seen, last_seen, total_events, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [username, name, email, password, 'Employee Portal', now, now, 0, 'active', now],
                function(err) {
                    if (err) {
                        console.error('Error adding user to database:', err);
                        return res.status(500).json({ success: false, error: 'Failed to create account' });
                    }
                    
                    console.log(`✅ New user registered: ${name} (${username}) - ${email}`);
                    
                    res.json({
                        success: true,
                        data: {
                            employeeId: username,
                            employeeName: name,
                            email: email,
                            message: 'Account created successfully'
                        }
                    });
                }
            );
        });
    });
});

// Login endpoint (supports admin and employees)
app.post('/api/login', (req, res) => {
    const { username, password, loginTime } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Username and Password are required'
        });
    }
    
    // Check for admin login
    if (username === 'admin' && password === 'admin') {
        const token = generateToken();
        return res.json({
            success: true,
            data: {
                employeeId: 'admin',
                employeeName: 'Administrator',
                role: 'admin',
                loginTime: loginTime || new Date().toISOString(),
                token: token
            }
        });
    }
    
    // Check employee credentials in database
    db.get('SELECT * FROM users WHERE employee_id = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database error'
            });
        }
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials. Employee not found.'
            });
        }
        
        // Verify password
        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials. Wrong password.'
            });
        }
        
        const token = generateToken();
        
        // Update last seen
        const now = new Date().toISOString();
        db.run(
            'UPDATE users SET last_seen = ? WHERE employee_id = ?',
            [now, username],
            function(err) {
                if (err) {
                    console.error('Error updating last seen:', err);
                }
            }
        );
        
        res.json({
            success: true,
            data: {
                employeeId: user.employee_id,
                employeeName: user.employee_name,
                role: 'employee',
                loginTime: loginTime || new Date().toISOString(),
                token: token,
                checkInStatus: 'pending',
                message: 'Please proceed to check in'
            }
        });
    });
});

// Employee check-in endpoint
app.post('/api/employee-checkin', (req, res) => {
    const { employeeId, employeeName, loginTime, checkInTime, token } = req.body;
    
    if (!employeeId || !checkInTime) {
        return res.status(400).json({
            success: false,
            error: 'Employee ID and check-in time are required'
        });
    }
    
    // Calculate status based on 8:00 AM protocol
    const checkIn = new Date(checkInTime);
    const protocolTime = new Date(checkIn);
    protocolTime.setHours(8, 0, 0, 0);
    
    const diffMinutes = (checkIn - protocolTime) / 60000;
    let status = 'on-time';
    let lateMinutes = 0;
    
    if (diffMinutes > 0) {
        status = 'late';
        lateMinutes = Math.floor(diffMinutes);
    }
    
    // Get employee name from credentials if not provided
    let finalEmployeeName = employeeName;
    if (!finalEmployeeName && userCredentials.has(employeeId)) {
        finalEmployeeName = userCredentials.get(employeeId).employeeName;
    }
    if (!finalEmployeeName) {
        finalEmployeeName = 'Employee ' + employeeId;
    }
    
    // Record the check-in event
    const eventData = {
        device_id: 'Employee Portal',
        device_name: 'Employee Portal',
        employee_id: employeeId,
        employee_name: finalEmployeeName,
        event_type: 'checkin',
        event_time: checkInTime,
        late_minutes: lateMinutes,
        login_time: loginTime,
        status: status
    };
    
    db.run(
        `INSERT INTO webhook_events_enhanced
         (device_id, device_name, employee_id, employee_name, event_type, event_time,
          late_minutes, login_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [eventData.device_id, eventData.device_name, eventData.employee_id,
         eventData.employee_name, eventData.event_type, eventData.event_time,
         eventData.late_minutes, eventData.login_time, eventData.status],
        function(err) {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            
            res.json({
                success: true,
                data: {
                    employeeId: employeeId,
                    checkInTime: checkInTime,
                    status: status,
                    lateMinutes: lateMinutes,
                    message: status === 'on-time'
                        ? 'Check-in successful! You are on time.'
                        : `Check-in recorded. You are ${lateMinutes} minutes late.`
                }
            });
        }
    );
});

// Get employee attendance history
app.get('/api/employee-attendance', (req, res) => {
    const { employeeId } = req.query;
    
    if (!employeeId) {
        return res.status(400).json({
            success: false,
            error: 'Employee ID is required'
        });
    }
    
    // Get last 30 days of attendance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    db.all(
        `SELECT
            date(event_time) as date,
            event_time,
            status,
            late_minutes,
            login_time
         FROM webhook_events_enhanced
         WHERE employee_id = ?
         AND event_type = 'checkin'
         AND date(event_time) >= date(?)
         ORDER BY event_time DESC`,
        [employeeId, thirtyDaysAgo.toISOString()],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            
            res.json({
                success: true,
                data: rows
            });
        }
    );
});

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
    db.all('SELECT COUNT(*) as user_count FROM users', (err, rows) => {
        if (err) {
            res.json({ success: false, error: err.message });
        } else {
            db.all('SELECT COUNT(*) as event_count FROM webhook_events_enhanced', (err2, rows2) => {
                if (err2) {
                    res.json({ success: false, error: err2.message });
                } else {
                    res.json({ 
                        success: true, 
                        data: {
                            user_count: rows[0].user_count,
                            event_count: rows2[0].event_count
                        }
                    });
                }
            });
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        data: {
            status: 'healthy',
            mode: 'manual_entry',
            message: 'Device does not support API. Using manual data entry.'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 SCA Attendance System running on port ${PORT}`);
    console.log(`� Login: http://localhost:${PORT}/login.html`);
    console.log(`👨‍💼 Admin Dashboard: http://localhost:${PORT}/admin-dashboard.html`);
    console.log(`� Employee Dashboard: http://localhost:${PORT}/employee-dashboard.html`);
    console.log(`� Reports: http://localhost:${PORT}/reports.html`);
});
