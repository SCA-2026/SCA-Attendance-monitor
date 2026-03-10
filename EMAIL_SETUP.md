# Email Configuration Setup Guide

## 📧 Real-time Email Notifications Setup

### Step 1: Gmail App Password

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to [Google Account settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Create a new app password for "SCA Attendance System"
   - Copy the 16-character password

### Step 2: Configure Environment

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Update your credentials** in `.env`:
   ```env
   EMAIL_USER=your-actual-gmail@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```

### Step 3: Restart Server

```bash
# Stop current server (Ctrl+C)
npm start
```

### Step 4: Verify Email Setup

The server will show:
- ✅ `Email server is ready to send messages` if configured correctly
- ❌ `Email configuration error` if credentials are wrong

## 🔄 Real-time Features Enabled

### Employee Notifications:
- ✅ Check-in confirmation emails
- ✅ Check-out confirmation emails  
- ✅ Real-time browser notifications
- ✅ Admin notifications for employee activity

### Admin Notifications:
- ✅ Real-time alerts when employees check in/out
- ✅ Attendance summaries
- ✅ System notifications

## 🌐 WebSocket Connection

Real-time notifications work through WebSocket connections:
- **Employees**: Get instant feedback on check-in/out
- **Admins**: Monitor all employee activity in real-time
- **Automatic**: Reconnects if connection is lost

## 🔧 Troubleshooting

### Email Issues:
1. **Check Gmail credentials** in `.env` file
2. **Verify 2FA is enabled** on Gmail account
3. **Generate new App Password** if needed

### Real-time Issues:
1. **Check browser console** for WebSocket errors
2. **Ensure no ad-blockers** are blocking connections
3. **Verify server is running** with WebSocket support

### Rate Limits:
- **Gmail**: ~100 emails/day for regular accounts
- **Retry Logic**: Failed emails are retried up to 3 times
- **Queue System**: Emails are queued during high volume

## 📱 Testing

1. **Check-in/out** as an employee to test email notifications
2. **Open admin dashboard** to monitor real-time notifications
3. **Check browser console** for WebSocket connection status

## 🚀 Production Deployment

For production:
1. **Use business email** (Google Workspace) for higher limits
2. **Set up proper domain** authentication (SPF, DKIM)
3. **Configure monitoring** for email delivery
4. **Set up backup SMTP** service for redundancy
