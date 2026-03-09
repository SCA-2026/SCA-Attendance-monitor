const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const ExcelJS = require('exceljs');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());

// Content Security Policy - allow Bootstrap and Font Awesome CDN
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "script-src-attr 'none'; " +
    "style-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "style-src-attr 'none'; " +
    "font-src 'self' https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self'; " +
    "manifest-src 'self'; " +
    "object-src 'none'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );
  next();
});

app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./attendance.db');

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    employee_id TEXT UNIQUE,
    full_name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'employee',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Attendance table
  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT,
    check_in_time DATETIME,
    check_out_time DATETIME,
    date DATE,
    status TEXT DEFAULT 'present',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(employee_id)
  )`);

  // Create default admin user
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO users (username, employee_id, full_name, email, password, role) 
    VALUES (?, ?, ?, ?, ?, ?)`, ['admin', 'ADMIN001', 'Administrator', 'admin@sca.com', hashedPassword, 'admin']);
});

// JWT Secret
const JWT_SECRET = 'sca_attendance_secret_key';

// Email transporter setup
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'sca.attendance@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// File upload for logo
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    cb(null, 'logo.png');
  }
});
const upload = multer({ storage });

// Helper functions
function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    
    // Get full user data from database
    try {
      const user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [decoded.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!user) {
        return res.status(403).json({ success: false, error: 'User not found' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Database error' });
    }
  });
}

// Email sending function
async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: '"SCA Attendance System" <sca.attendance@gmail.com>',
      to,
      subject,
      html
    });
    console.log('Email sent successfully to:', to);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running ✓', timestamp: new Date().toISOString() });
});

// Signup
app.post('/api/signup', async (req, res) => {
  const { username, employee_id, full_name, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ? OR employee_id = ? OR email = ?', 
        [username, employee_id, email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists with this username, employee ID, or email' 
      });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO users (username, employee_id, full_name, email, password) VALUES (?, ?, ?, ?, ?)',
        [username, employee_id, full_name, email, hashedPassword], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Send welcome email
    const welcomeEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 32px;">Welcome to SCA Attendance</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your account has been created successfully!</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${full_name},</h2>
          <p style="color: #666; line-height: 1.6;">Welcome to the SCA Attendance Management System! Your account has been created with the following details:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Employee ID:</strong> ${employee_id}</p>
            <p style="margin: 5px 0;"><strong>Username:</strong> ${username}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          </div>
          <p style="color: #666; line-height: 1.6;">You can now log in to the system and start using the attendance management features.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/login.html" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Login to Your Account</a>
          </div>
        </div>
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2026 SCA Attendance System. All rights reserved.</p>
        </div>
      </div>
    `;
    
    await sendEmail(email, 'Welcome to SCA Attendance System', welcomeEmail);

    res.json({ success: true, message: 'Account created successfully!' });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    // Send login notification email
    const loginEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 32px;">Login Notification</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">SCA Attendance System</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${user.full_name},</h2>
          <p style="color: #666; line-height: 1.6;">You have successfully logged into the SCA Attendance Management System.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Login Time:</strong> ${new Date().toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Employee ID:</strong> ${user.employee_id}</p>
          </div>
          <p style="color: #666; line-height: 1.6;">If this was not you, please contact your administrator immediately.</p>
        </div>
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2026 SCA Attendance System. All rights reserved.</p>
        </div>
      </div>
    `;
    
    await sendEmail(user.email, 'Login Notification - SCA Attendance System', loginEmail);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        employee_id: user.employee_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Check-in
app.post('/api/checkin', authenticateToken, async (req, res) => {
  const { employee_id } = req.user;

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already checked in today
    const existingCheckin = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM attendance WHERE employee_id = ? AND date = ? AND check_in_time IS NOT NULL AND check_out_time IS NULL',
        [employee_id, today], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingCheckin) {
      return res.status(400).json({ success: false, error: 'Already checked in today' });
    }

    // Create check-in record
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO attendance (employee_id, check_in_time, date) VALUES (?, ?, ?)',
        [employee_id, new Date().toISOString(), today], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Get user details for email
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE employee_id = ?', [employee_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Send check-in notification email
    const checkinEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 32px;">✓ Check-in Successful</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">SCA Attendance System</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${user.full_name},</h2>
          <p style="color: #666; line-height: 1.6;">You have successfully checked in for today.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Check-in Time:</strong> ${new Date().toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Employee ID:</strong> ${user.employee_id}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${today}</p>
          </div>
          <p style="color: #666; line-height: 1.6;">Have a productive day!</p>
        </div>
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2026 SCA Attendance System. All rights reserved.</p>
        </div>
      </div>
    `;
    
    await sendEmail(user.email, 'Check-in Successful - SCA Attendance System', checkinEmail);

    res.json({ success: true, message: 'Check-in successful!' });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Check-out
app.post('/api/checkout', authenticateToken, async (req, res) => {
  const { employee_id } = req.user;

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Find today's check-in record
    const checkinRecord = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM attendance WHERE employee_id = ? AND date = ? AND check_in_time IS NOT NULL AND check_out_time IS NULL',
        [employee_id, today], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!checkinRecord) {
      return res.status(400).json({ success: false, error: 'No check-in record found for today' });
    }

    // Update check-out time
    await new Promise((resolve, reject) => {
      db.run('UPDATE attendance SET check_out_time = ? WHERE id = ?',
        [new Date().toISOString(), checkinRecord.id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get user details for email
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE employee_id = ?', [employee_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Calculate total time
    const checkInTime = new Date(checkinRecord.check_in_time);
    const checkOutTime = new Date();
    const totalHours = Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60) * 100) / 100;

    // Send check-out notification email
    const checkoutEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 32px;">✓ Check-out Successful</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">SCA Attendance System</p>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${user.full_name},</h2>
          <p style="color: #666; line-height: 1.6;">You have successfully checked out for today.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Check-out Time:</strong> ${checkOutTime.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Employee ID:</strong> ${user.employee_id}</p>
            <p style="margin: 5px 0;"><strong>Total Time:</strong> ${totalHours} hours</p>
          </div>
          <p style="color: #666; line-height: 1.6;">Thank you for your hard work today!</p>
        </div>
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2026 SCA Attendance System. All rights reserved.</p>
        </div>
      </div>
    `;
    
    await sendEmail(user.email, 'Check-out Successful - SCA Attendance System', checkoutEmail);

    res.json({ success: true, message: 'Check-out successful!', totalHours });

  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get attendance status for current user
app.get('/api/attendance/status', authenticateToken, async (req, res) => {
  const employee_id = req.user.employee_id;

  try {
    const today = new Date().toISOString().split('T')[0];
    
    const record = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
        [employee_id, today], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const status = {
      checkedIn: !!record?.check_in_time,
      checkedOut: !!record?.check_out_time,
      checkInTime: record?.check_in_time || null,
      checkOutTime: record?.check_out_time || null,
      totalHours: null
    };

    if (record?.check_in_time && record?.check_out_time) {
      const hours = Math.round((new Date(record.check_out_time) - new Date(record.check_in_time)) / (1000 * 60 * 60) * 100) / 100;
      status.totalHours = hours;
    }

    res.json({ success: true, status });

  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get recent attendance for current user
app.get('/api/attendance/recent', authenticateToken, async (req, res) => {
  const employee_id = req.user.employee_id;

  try {
    const records = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC LIMIT 7',
        [employee_id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, attendance: records });

  } catch (error) {
    console.error('Recent attendance error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get attendance history for current user
app.get('/api/attendance/history', authenticateToken, async (req, res) => {
  const employee_id = req.user.employee_id;

  try {
    const records = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC LIMIT 30',
        [employee_id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, attendance: records });

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, username, employee_id, full_name, email, role, created_at FROM users WHERE id = ?',
        [req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({ success: true, user });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  const { full_name, email } = req.body;

  try {
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET full_name = ?, email = ? WHERE id = ?',
        [full_name, email, req.user.id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, message: 'Profile updated successfully!' });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin routes

// Get all users
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT id, username, employee_id, full_name, email, role, created_at FROM users ORDER BY created_at DESC',
        (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ success: true, users });

  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get attendance statistics
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  try {
    const totalUsers = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users WHERE role = "employee"', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const today = new Date().toISOString().split('T')[0];
    const todayCheckins = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM attendance WHERE date = ? AND check_in_time IS NOT NULL',
        [today], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const weekCheckins = await new Promise((resolve, reject) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      db.get('SELECT COUNT(*) as count FROM attendance WHERE date >= ? AND check_in_time IS NOT NULL',
        [weekAgo.toISOString().split('T')[0]], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        todayCheckins,
        weekCheckins
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Generate Excel report
app.get('/api/admin/report/:type', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const { type } = req.params; // daily, weekly, monthly

  try {
    let dateFilter = '';
    const today = new Date();

    switch (type) {
      case 'daily':
        dateFilter = 'date = ?';
        break;
      case 'weekly':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = 'date >= ?';
        break;
      case 'monthly':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = 'date >= ?';
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid report type' });
    }

    const attendanceData = await new Promise((resolve, reject) => {
      const filterDate = type === 'daily' ? today.toISOString().split('T')[0] :
                        type === 'weekly' ? new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
                        new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      db.all(`
        SELECT a.*, u.full_name, u.email 
        FROM attendance a 
        JOIN users u ON a.employee_id = u.employee_id 
        WHERE ${dateFilter} 
        ORDER BY a.date DESC, a.check_in_time DESC
      `, [filterDate], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${type} Attendance Report`);

    // Add headers
    worksheet.columns = [
      { header: 'Employee ID', key: 'employee_id', width: 15 },
      { header: 'Full Name', key: 'full_name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Check In', key: 'check_in_time', width: 20 },
      { header: 'Check Out', key: 'check_out_time', width: 20 },
      { header: 'Status', key: 'status', width: 10 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '667eea' }
    };

    // Add data
    attendanceData.forEach(record => {
      worksheet.addRow({
        employee_id: record.employee_id,
        full_name: record.full_name,
        email: record.email,
        date: record.date,
        check_in_time: record.check_in_time ? new Date(record.check_in_time).toLocaleString() : 'N/A',
        check_out_time: record.check_out_time ? new Date(record.check_out_time).toLocaleString() : 'N/A',
        status: record.status
      });
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${type}-${today.toISOString().split('T')[0]}.xlsx`);

    // Send file
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Upload logo
app.post('/api/admin/logo', upload.single('logo'), authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  res.json({ success: true, message: 'Logo uploaded successfully!' });
});

// Import employees from Excel
app.post('/api/admin/import-excel', upload.single('file'), authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    const filePath = req.file.path;
    let employees = [];
    let importedCount = 0;

    // Check file type
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    if (fileExt === '.csv') {
      // Parse CSV
      const fs = require('fs');
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ success: false, error: 'CSV file is empty or has no data rows' });
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        
        if (row.employee_id && row.full_name && row.email && row.username && row.password) {
          employees.push(row);
        }
      }
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      // Parse Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);
      
      if (!worksheet) {
        return res.status(400).json({ success: false, error: 'No worksheet found in Excel file' });
      }

      const rows = worksheet.getRows(1, worksheet.rowCount) || [];
      
      if (rows.length < 2) {
        return res.status(400).json({ success: false, error: 'Excel file is empty or has no data rows' });
      }

      const headerRow = rows[0];
      const headers = headerRow.values.map(h => (h || '').toString().toLowerCase());

      for (let i = 1; i < rows.length; i++) {
        const row = {};
        const values = rows[i].values;
        
        headers.forEach((header, idx) => {
          row[header] = (values[idx] || '').toString();
        });

        if (row.employee_id && row.full_name && row.email && row.username && row.password) {
          employees.push(row);
        }
      }
    } else {
      return res.status(400).json({ success: false, error: 'Unsupported file format. Please use CSV or Excel.' });
    }

    // Import employees
    for (const emp of employees) {
      try {
        // Check if employee already exists
        const existing = await new Promise((resolve, reject) => {
          db.get('SELECT id FROM users WHERE username = ? OR email = ?', 
            [emp.username, emp.email], 
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (!existing) {
          // Hash password
          const hashedPassword = await bcrypt.hash(emp.password, 10);

          // Insert employee
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO users (username, employee_id, full_name, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [emp.username, emp.employee_id, emp.full_name, emp.email, hashedPassword, 'employee', new Date().toISOString()],
              (err) => {
                if (err) reject(err);
                else {
                  importedCount++;
                  resolve();
                }
              }
            );
          });
        }
      } catch (error) {
        console.error(`Error importing employee ${emp.employee_id}:`, error);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({ success: true, message: `${importedCount} employees imported successfully`, importedCount });

  } catch (error) {
    console.error('Excel import error:', error);
    res.status(500).json({ success: false, error: 'Error importing Excel file' });
  }
});

// Delete user
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const userId = req.params.id;

  // Prevent deleting admin users
  if (userId === '1') {
    return res.status(400).json({ success: false, error: 'Cannot delete the default admin user' });
  }

  try {
    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, role FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Prevent deleting other admin users
    if (user.role === 'admin') {
      return res.status(400).json({ success: false, error: 'Cannot delete admin users' });
    }

    // Delete user's attendance records first
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM attendance WHERE employee_id IN (SELECT employee_id FROM users WHERE id = ?)', [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Delete the user
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get user
app.get('/api/admin/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const userId = req.params.id;

  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, username, employee_id, full_name, email, role, created_at FROM users WHERE id = ?', 
        [userId], 
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, user });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update user
app.put('/api/admin/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const userId = req.params.id;
  const { full_name, email, username, employee_id, role, password } = req.body;

  // Prevent editing the default admin's role
  if (userId === '1' && role && role !== 'admin') {
    return res.status(400).json({ success: false, error: 'Cannot change the default admin user role' });
  }

  try {
    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check for duplicate username or email (excluding current user)
    // First get current user data
    const currentUser = await new Promise((resolve, reject) => {
      db.get('SELECT username, email FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check for duplicates only if values are different
    let duplicateQuery = 'SELECT id FROM users WHERE id != ? AND (';
    let queryParams = [userId];
    let conditions = [];

    if (username !== undefined && username !== currentUser.username) {
      conditions.push('username = ?');
      queryParams.push(username);
    }
    
    if (email !== undefined && email !== currentUser.email) {
      conditions.push('email = ?');
      queryParams.push(email);
    }

    if (conditions.length > 0) {
      duplicateQuery += conditions.join(' OR ') + ')';
      
      const duplicate = await new Promise((resolve, reject) => {
        db.get(duplicateQuery, queryParams, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (duplicate) {
        return res.status(400).json({ success: false, error: 'Username or email already exists' });
      }
    }

    // Update user
    await new Promise((resolve, reject) => {
      const updateFields = [];
      const updateValues = [];

      if (full_name !== undefined) {
        updateFields.push('full_name = ?');
        updateValues.push(full_name);
      }
      if (email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(email);
      }
      if (username !== undefined) {
        updateFields.push('username = ?');
        updateValues.push(username);
      }
      if (employee_id !== undefined) {
        updateFields.push('employee_id = ?');
        updateValues.push(employee_id);
      }
      if (role !== undefined) {
        updateFields.push('role = ?');
        updateValues.push(role);
      }
      if (password !== undefined && password !== '') {
        const hashedPassword = bcrypt.hashSync(password, 10);
        updateFields.push('password = ?');
        updateValues.push(hashedPassword);
      }

      updateValues.push(userId);
      const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
      
      db.run(query, updateValues, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, message: 'User updated successfully' });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SCA Attendance System running on port ${PORT}`);
  console.log(`📱 PWA ready: http://localhost:${PORT}`);
  console.log(`👨‍💼 Admin: http://localhost:${PORT}/admin.html`);
  console.log(`👤 Employee: http://localhost:${PORT}/employee.html`);
});
