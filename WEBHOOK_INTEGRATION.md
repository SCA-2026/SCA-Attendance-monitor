# Hikvision Webhook Integration with Firebase Cloud Messaging

## Architecture Overview

```
Hikvision Device → Webhook → Node.js Backend → Firebase Cloud Messaging → React App
```

### Components

1. **Hikvision Device**: Sends motion/access events via ISAPI webhook
2. **Node.js Backend**: Receives events, processes them, sends to Firebase
3. **Firebase Cloud Messaging**: Delivers push notifications to your app
4. **React App**: Displays real-time alerts and stores data

## Setup Instructions

### 1. Firebase Cloud Messaging Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Cloud Messaging in your project settings
3. Get your **FCM Server Key** from Project Settings → Cloud Messaging
4. Add the FCM Server Key to your `.env` file:

```bash
FCM_SERVER_KEY=your_fcm_server_key_here
```

### 2. Hikvision Device Configuration

Configure your Hikvision device to send webhooks to your server:

**Webhook URL**: `http://your-server-ip:3001/webhook/hikvision`

**Event Types to Configure**:
- Access Control Events
- Motion Detection Events
- Alarm Events
- Video Loss Events

### 3. Start the Services

#### Main API Server (Port 3000):
```bash
node api-server.cjs
```

#### Webhook Server (Port 3001):
```bash
node webhook-server.cjs
```

### 4. Access the Interfaces

- **Main Dashboard**: http://localhost:3000/dashboard.html
- **Real-time Monitor**: http://localhost:3001/realtime-dashboard.html

## Webhook Event Format

Hikvision devices send events in this format:

```json
{
  "id": "event_12345",
  "deviceId": "CAM_001",
  "deviceName": "Main Entrance Camera",
  "deviceIP": "192.168.1.100",
  "eventType": "access",
  "employeeId": "EMP001",
  "name": "John Doe",
  "time": "2024-01-15T10:30:00Z",
  "timestamp": 1642248600000
}
```

## Supported Event Types

| Event Type | Description | Notification |
|------------|-------------|---------------|
| `access` | Door access events | 🚪 Access Event |
| `motion` | Motion detection | 👁️ Motion Detected |
| `alarm` | Alarm triggers | 🚨 Alarm Triggered |
| `videoLoss` | Video loss detection | 📹 Video Loss |

## API Endpoints

### Webhook Endpoints

- `POST /webhook/hikvision` - Receive Hikvision events
- `POST /webhook/test` - Test webhook functionality

### Notification Management

- `POST /api/notifications/register` - Register FCM token
- `POST /api/notifications/unregister` - Unregister FCM token
- `POST /api/notifications/test` - Send test notification
- `GET /api/notifications/stats` - Get notification statistics

### Event Management

- `GET /api/events` - Get recent events
- `GET /api/health` - Health check

## React App Integration

### 1. Install Firebase SDK

```bash
npm install firebase
```

### 2. Initialize Firebase in your React App

```javascript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  // Your Firebase config
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Get FCM token
getToken(messaging, { vapidKey: 'your-vapid-key' })
  .then((token) => {
    // Send token to your backend
    fetch('http://localhost:3001/api/notifications/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: token,
        userId: 'user123',
        deviceInfo: { platform: navigator.platform }
      })
    });
  });
```

### 3. Handle Incoming Messages

```javascript
import { onMessage } from 'firebase/messaging';

onMessage(messaging, (payload) => {
  console.log('Message received:', payload);
  
  // Show notification
  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon.png'
  });
  
  // Update your app state
  updateEventList(payload.data);
});
```

## Testing the Integration

### 1. Test Webhook
```bash
curl -X POST http://localhost:3001/webhook/test
```

### 2. Test Notifications
```bash
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "Test notification"}'
```

### 3. Simulate Events
Press 'S' key on the real-time dashboard to simulate events.

## Security Considerations

### Webhook Security
1. Configure webhook secret in `.env`:
   ```bash
   WEBHOOK_SECRET=your_secret_here
   ```

2. Hikvision devices should include signature in header:
   ```
   X-Hikvision-Signature: sha256=hash
   ```

### Network Security
1. Use HTTPS in production
2. Configure firewall rules
3. Limit webhook source IPs

## Monitoring and Debugging

### Check Webhook Logs
```bash
# View webhook server logs
tail -f webhook.log
```

### Monitor Database
```bash
# Check events table
sqlite3 hikvision_events.db "SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10;"

# Check notifications
sqlite3 hikvision_events.db "SELECT * FROM notifications_sent ORDER BY sent_at DESC LIMIT 10;"
```

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check Hikvision device configuration
   - Verify network connectivity
   - Check webhook URL is accessible

2. **Notifications not working**
   - Verify FCM Server Key is correct
   - Check FCM tokens are registered
   - Ensure app has notification permissions

3. **Events not displaying**
   - Check database connection
   - Verify event processing
   - Check browser console for errors

### Debug Commands

```bash
# Test webhook endpoint
curl -X POST http://localhost:3001/webhook/hikvision \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check server health
curl http://localhost:3001/api/health

# View registered tokens
curl http://localhost:3001/api/notifications/stats
```

## Production Deployment

### Environment Variables
```bash
PORT=3000
WEBHOOK_PORT=3001
FCM_SERVER_KEY=your_production_fcm_key
WEBHOOK_SECRET=your_production_webhook_secret
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000 3001
CMD ["node", "api-server.cjs", "&", "node", "webhook-server.cjs"]
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass http://localhost:3000;
    }
    
    location /webhook/ {
        proxy_pass http://localhost:3001;
    }
    
    location / {
        root /app/public;
        try_files $uri $uri/ /index.html;
    }
}
```

## Performance Considerations

1. **Database Optimization**: Add indexes on frequently queried fields
2. **Event Buffering**: Implement event batching for high-volume scenarios
3. **Notification Rate Limiting**: Prevent notification spam
4. **Caching**: Cache device information and user preferences

## Scaling

For high-volume deployments:
1. Use Redis for event queuing
2. Implement horizontal scaling with load balancers
3. Use PostgreSQL instead of SQLite for better performance
4. Implement event replay capabilities

This integration provides a robust, real-time system for monitoring Hikvision devices and delivering instant notifications to users.
