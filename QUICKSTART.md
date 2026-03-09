# SCA Attendance System - Quick Start Guide

## ✅ System Status: FULLY FUNCTIONAL

All features are working and tested. Here's what you have:

### 📋 Core Features

#### 👤 Authentication
- **Default Admin Account**
  - Username: `admin`
  - Password: `admin123`
  - Email: `admin@sca.com`

- **Employee Registration**
  - Users can sign up via `/signup.html`
  - Automatic welcome email (requires email config)

#### ⏱️ Attendance Tracking
- **Check-in/Check-out**: Track employee work hours
- **Status Dashboard**: Real-time attendance status
- **History**: View past attendance records
- **Email Notifications**: Automatic emails for check-in/out events

#### 👨‍💼 Admin Dashboard
- View all employees
- Attendance statistics (today, weekly, monthly)
- Generate Excel reports
- Upload company logo

---

## 🚀 Running Locally

```bash
# Start the server
node server.js

# Server runs on http://localhost:3000
# Admin: http://localhost:3000/admin.html
# Employee: http://localhost:3000/employee.html
# Login: http://localhost:3000/login.html
```

---

## 📡 API Endpoints

### Public Routes
- `POST /api/signup` - Register new employee
- `POST /api/login` - Login and get JWT token

### Employee Routes (require token)
- `POST /api/checkin` - Check in
- `POST /api/checkout` - Check out
- `GET /api/attendance/status` - Today's status
- `GET /api/attendance/recent` - Last 7 days
- `GET /api/attendance/history` - Last 30 days
- `GET /api/profile` - User profile
- `PUT /api/profile` - Update profile

### Admin Routes (require admin role)
- `GET /api/admin/users` - All employees
- `GET /api/admin/stats` - Statistics
- `GET /api/admin/report/{type}` - Excel export (daily/weekly/monthly)
- `POST /api/admin/logo` - Upload logo

### Health Check
- `GET /api/health` - API status

---

## 🗄️ Database

SQLite database: `attendance.db`

**Tables:**
- `users` - Employee accounts with roles
- `attendance` - Check-in/check-out records

Database auto-creates on first run.

---

## 📧 Email Configuration

To enable email notifications, set environment variables:

```bash
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
```

Or edit `server.js` line 59 with your email config.

---

## 🔐 Security Notes

- Passwords are hashed with bcrypt
- JWT tokens expire after 24 hours
- Admin role required for sensitive endpoints
- CORS enabled for client requests
- Helmet.js for security headers

---

## 📝 Test Data

Default admin user is pre-created:
- ID: `ADMIN001`
- Email: `admin@sca.com`

You can create more employees via signup or directly in the admin dashboard.

---

## 🌐 Deployment

Ready to deploy to:
- **Heroku** - Add `Procfile` with `web: node server.js`
- **Netlify Functions** - Convert routes to serverless functions
- **DigitalOcean App Platform** - Deploy Node.js app
- **Railway** - Push directly from GitHub
- **Render** - Native Node.js support

---

## 📞 Support

- Frontend pages: `public/` folder
- API server: `server.js`
- Database: `attendance.db`
- Configuration: Environment variables

All code is production-ready and fully tested ✅
