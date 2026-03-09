# SCA Attendance Management System

A comprehensive Progressive Web App (PWA) for managing employee attendance with email notifications, Excel reporting, and role-based access control.

## Features

### 🎯 Core Features
- **Progressive Web App (PWA)**: Installable on mobile devices
- **Email Notifications**: Instant alerts for check-in/out
- **Role-Based Access**: Admin and Employee portals
- **Real-time Dashboard**: Live attendance statistics
- **Excel Reports**: Daily, weekly, and monthly reports
- **Profile Management**: Edit employee information
- **Mobile Responsive**: Works on all devices

### 📱 PWA Features
- **Offline Support**: Works without internet connection
- **Installable**: "Add to Home Screen" on mobile
- **Fast Loading**: Optimized performance
- **Push Notifications**: Future enhancement ready

### 📧 Email System
- **Professional Templates**: Branded HTML emails
- **Instant Notifications**: Real-time check-in/out alerts
- **Welcome Emails**: New user registration
- **Configurable**: Easy Gmail setup

### 📊 Reporting
- **Daily Reports**: Today's attendance summary
- **Weekly Reports**: 7-day attendance overview
- **Monthly Reports**: 30-day comprehensive analysis
- **Excel Export**: Download detailed reports
- **Employee Filtering**: Search by ID or name
- **Statistics**: Total employees, check-ins, late arrivals

## Quick Start

### Prerequisites
- Node.js 14+ installed
- Gmail account for email notifications

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

3. **Start Server**
   ```bash
   npm start
   ```

4. **Access Application**
   - Main: http://localhost:3000
   - Admin: http://localhost:3000/admin.html
   - Employee: http://localhost:3000/employee.html

### Default Credentials
- **Admin**: username: `admin`, password: `admin123`

## Usage

### For Employees
1. **Sign Up**: Create account with employee details
2. **Login**: Use username/email and password
3. **Check In**: Click "Check In" when arriving at work
4. **Check Out**: Click "Check Out" when leaving work
5. **Profile**: Edit personal information
6. **History**: View attendance records

### For Admins
1. **Login**: Use admin credentials
2. **Dashboard**: View attendance statistics
3. **Reports**: Generate Excel reports
4. **Users**: Manage employee accounts
5. **Logo**: Upload company branding
6. **Settings**: Configure system settings

## Email Configuration

### Gmail Setup
1. Enable 2-factor authentication on Gmail
2. Generate App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate new app password
3. Update `.env` file with credentials

### Email Templates
- Welcome emails for new users
- Login notifications
- Check-in confirmations
- Check-out summaries with total hours

## API Endpoints

### Authentication
- `POST /api/signup` - Create new account
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

### Attendance
- `POST /api/checkin` - Check in employee
- `POST /api/checkout` - Check out employee
- `GET /api/attendance/status` - Get current status
- `GET /api/attendance/recent` - Recent attendance
- `GET /api/attendance/history` - Attendance history

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get statistics
- `GET /api/admin/report/:type` - Generate report
- `POST /api/admin/logo` - Upload logo

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    employee_id TEXT UNIQUE,
    full_name TEXT,
    email TEXT UNIQUE,
    password TEXT (hashed),
    role TEXT DEFAULT 'employee',
    created_at DATETIME
);
```

### Attendance Table
```sql
CREATE TABLE attendance (
    id INTEGER PRIMARY KEY,
    employee_id TEXT,
    check_in_time DATETIME,
    check_out_time DATETIME,
    date DATE,
    status TEXT DEFAULT 'present',
    created_at DATETIME
);
```

## Security Features

- **Password Hashing**: bcrypt for secure password storage
- **JWT Authentication**: Secure token-based auth
- **Role-Based Access**: Admin/Employee permissions
- **Input Validation**: Server-side validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization

## Deployment

### Local Development
```bash
npm run dev  # With nodemon for auto-restart
```

### Production
```bash
npm start  # Production mode
```

### Environment Variables
- `PORT`: Server port (default: 3000)
- `EMAIL_USER`: Gmail username
- `EMAIL_PASS`: Gmail app password
- `JWT_SECRET`: JWT secret key

## Mobile App Features

### PWA Installation
1. Open app in Chrome/Safari
2. Click "Add to Home Screen"
3. Install as native app
4. Works offline with cached data

### Mobile Optimizations
- Touch-friendly interface
- Responsive design
- Fast loading
- Offline support
- Push notifications ready

## Troubleshooting

### Common Issues

**Email not working?**
- Check Gmail app password
- Verify .env configuration
- Check firewall settings

**Can't install PWA?**
- Use Chrome/Safari browser
- Check HTTPS requirement
- Verify manifest.json

**Database errors?**
- Check SQLite file permissions
- Verify database schema
- Restart server

### Support
- Check browser console for errors
- Verify network connectivity
- Ensure all dependencies installed

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Tech Stack

- **Backend**: Node.js, Express, SQLite3
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **PWA**: Service Workers, Web App Manifest
- **Email**: Nodemailer with Gmail
- **Security**: bcrypt, JWT, Helmet
- **Reports**: ExcelJS
- **File Upload**: Multer

---

© 2026 SCA Attendance System. All rights reserved.
