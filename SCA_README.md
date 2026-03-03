# Spartec Consortium Africa (SCA) Attendance Monitor System

A comprehensive attendance monitoring and management system for Spartec Consortium Africa, featuring real-time event processing, device management, and advanced reporting capabilities.

## 🏢 About SCA

Spartec Consortium Africa (SCA) is a leading organization dedicated to providing innovative solutions and services across the African continent. This attendance monitoring system is designed to streamline workforce management and enhance operational efficiency.

## 🚀 System Features

### Core Functionality
- **Real-time Attendance Monitoring**: Live tracking of employee check-ins and check-outs
- **Device Management**: Centralized management of multiple access control devices
- **Advanced Reporting**: Weekly and monthly attendance reports with CSV export
- **Webhook Integration**: Real-time event processing with push notifications
- **Professional Dashboard**: Modern, responsive web interface

### Technical Features
- **RESTful API**: Complete API for integration with external systems
- **Firebase Cloud Messaging**: Instant push notifications to mobile devices
- **SQLite Database**: Reliable local data storage
- **Auto-Synchronization**: Hourly automatic data sync from devices
- **Security**: Webhook signature verification and secure token management

## 📋 Quick Start Guide

### 1. System Requirements
- Node.js 18+ 
- Modern web browser
- Access control devices (Hikvision compatible)

### 2. Installation
```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit configuration
nano .env
```

### 3. Start the Services

#### Main Attendance Server (Port 3000):
```bash
node api-server.cjs
```

#### Real-time Webhook Server (Port 3001):
```bash
node webhook-server.cjs
```

### 4. Access the System

- **Main Dashboard**: http://localhost:3000/dashboard.html
- **Real-time Monitor**: http://localhost:3001/realtime-dashboard.html
- **API Documentation**: See API_DOCUMENTATION.md

## 🎯 Web Interface

### Main Dashboard (Port 3000)
- **Dashboard Overview**: Real-time statistics and recent activity
- **Device Management**: Add, configure, and monitor access control devices
- **Attendance Records**: Advanced filtering and search capabilities
- **Reports**: Generate weekly/monthly reports with export options
- **Settings**: System configuration and preferences

### Real-time Monitor (Port 3001)
- **Live Event Stream**: Real-time display of attendance events
- **Statistics Dashboard**: Event counters and analytics
- **Notification Testing**: Test push notification functionality
- **FCM Token Management**: Register devices for notifications

## 🔧 Device Configuration

### Adding Access Control Devices
1. Navigate to "Devices" in the main dashboard
2. Click "Add Device"
3. Enter device details:
   - Device Name (e.g., "Main Entrance")
   - IP Address (e.g., 192.168.1.100)
   - Port:
     - `80` for HTTP (most common for ISAPI)
     - `443` for HTTPS (if enabled on the device)
   - Username and Password (device ISAPI / web user)
4. Test connection and save

> Note: Port **8000** is commonly used by iVMS/Hikvision SDK services and iVMS clients. It is **often not** the REST/ISAPI port.

### Webhook Configuration
Configure your access control devices to send events to:
```
Webhook URL: http://your-server-ip:3001/webhook/hikvision
```

## 📱 Mobile Integration

### Firebase Cloud Messaging Setup
1. Create Firebase project at https://console.firebase.google.com
2. Enable Cloud Messaging
3. Get FCM Server Key
4. Add to `.env` file:
   ```bash
   FCM_SERVER_KEY=your_fcm_server_key_here
   ```

### React App Integration
```javascript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

// Initialize Firebase and get FCM token
// Register token with: /api/notifications/register
```

## 📊 API Endpoints

### Device Management
- `GET /api/devices` - List all devices
- `POST /api/devices` - Add new device
- `DELETE /api/devices/{id}` - Remove device
- `POST /api/devices/{id}/test` - Test connection

### Data Synchronization
- `POST /api/sync/{deviceId}` - Sync single device
- `POST /api/sync/all` - Sync all devices

### Attendance Data
- `GET /api/attendance` - Get attendance records
- `GET /api/reports/weekly` - Weekly reports
- `GET /api/reports/monthly` - Monthly reports

### Real-time Events
- `POST /webhook/hikvision` - Receive device events
- `GET /api/events` - Get recent events
- `POST /api/notifications/register` - Register for notifications

## 🎨 Branding

### Logo Integration
To add your SCA logo:
1. Upload your logo as `sca-logo.png` to the `public/` directory
2. Recommended size: 80x80 pixels
3. Supported formats: PNG, JPG, SVG
4. The system will automatically fallback to a building icon if logo is not found

### Customization
- Colors and styling can be customized in the CSS variables
- Company name and branding elements in the HTML headers
- Email templates and notification content

## 🔒 Security Features

### Webhook Security
- Optional signature verification using shared secrets
- IP whitelisting capabilities
- Rate limiting and request validation

### Data Protection
- Local SQLite database storage
- Secure token management
- Encrypted communication channels

## 📈 Monitoring and Analytics

### System Health
- Real-time device status monitoring
- Automatic connection testing
- Error logging and reporting

### Attendance Analytics
- Daily/weekly/monthly attendance patterns
- Employee punctuality analysis
- Device utilization statistics

## 🛠️ Troubleshooting

### Common Issues

**Device Not Connecting**
- Verify IP address and network connectivity
- Check device credentials
- Ensure device supports webhooks

**401 Unauthorized**
- Many Hikvision ISAPI endpoints require **HTTP Digest authentication** and a user with ISAPI permissions.
- Make sure you are using the **device web/ISAPI** credentials (not necessarily the iVMS client login).

**Notifications Not Working**
- Verify FCM Server Key configuration
- Check token registration
- Ensure mobile app has notification permissions

**Events Not Displaying**
- Check webhook URL configuration
- Verify server is running on correct port
- Check database connectivity

### Debug Commands
```bash
# Test webhook endpoint
curl -X POST http://localhost:3001/webhook/test

# Check server health
curl http://localhost:3000/api/health

# View database contents
sqlite3 hikvision_attendance.db "SELECT * FROM devices;"
```

## 🚀 Deployment

### Production Environment
```bash
# Set production environment variables
export NODE_ENV=production
export PORT=3000
export WEBHOOK_PORT=3001

# Start services with process manager
pm2 start api-server.cjs --name "sca-attendance-api"
pm2 start webhook-server.cjs --name "sca-webhook-service"
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000 3001
CMD ["sh", "-c", "node api-server.cjs & node webhook-server.cjs"]
```

## 📞 Support

For technical support and assistance:
- Check the troubleshooting section above
- Review API documentation
- Contact system administrator

## 📄 License

This system is proprietary software developed for Spartec Consortium Africa. All rights reserved.

---

**Spartec Consortium Africa (SCA)**  
*Innovative Solutions for African Excellence*
