# Gmail Email Configuration Troubleshooting

## 🔧 **Quick Fix Steps**

### **Step 1: Verify 2-Factor Authentication**
1. Go to: https://myaccount.google.com/security
2. Make sure **2-Step Verification** is **ON**
3. If OFF, enable it first

### **Step 2: Generate New App Password**
1. Go to: https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)**
4. Enter: **SCA Attendance System**
5. Click **Generate**
6. Copy the **16-character password** (with spaces)

### **Step 3: Update .env File**
```env
EMAIL_USER=haroibrahim349@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop  # Use the exact password from Google
```

### **Step 4: Test the Configuration**
1. **Restart server**: `npm start`
2. **Login as employee**: http://localhost:3000/employee.html
3. **Open profile modal** (click your name/avatar)
4. **Click "Test Email" button**
5. **Check your Gmail inbox**

## 🚨 **Common Issues & Solutions**

### **Issue: "Bad Credentials" Error**
**Solution**: 
- Enable 2FA on your Gmail account
- Generate a new App Password
- Use the exact 16-character password

### **Issue: "Less secure apps" Error**
**Solution**:
- App Passwords work with 2FA enabled
- Don't need to enable "Less secure apps"

### **Issue: No Email Received**
**Check**:
1. **Spam folder** in Gmail
2. **Server console** for error messages
3. **Test email button** in profile modal

## 🧪 **Testing Your Setup**

### **Method 1: Test Email Button**
1. Login as employee
2. Click profile (top right)
3. Click "Test Email"
4. Check Gmail inbox

### **Method 2: Check-in/Check-out**
1. Check-in → Should receive email
2. Check-out → Should receive email with hours

### **Method 3: Server Console**
Look for these messages:
- ✅ `Email sent successfully to: your-email@gmail.com`
- ❌ `Email configuration error: ...`

## 📱 **Alternative Email Services**

If Gmail doesn't work, try:

### **SendGrid** (Recommended for production)
```bash
npm install @sendgrid/mail
```

### **Outlook/Hotmail**
```env
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-app-password
```

## 🎯 **Success Indicators**

✅ **Working**: You'll see:
- Server: `✉️ Email server is ready to send messages`
- Console: `✅ Email sent successfully to: your-email@gmail.com`
- Gmail: Test email in inbox

❌ **Not Working**: You'll see:
- Server: `Email configuration error`
- Console: `EAUTH` error
- No email received

## 🆘 **Still Not Working?**

1. **Double-check 2FA is enabled**
2. **Generate a fresh App Password**
3. **Copy password exactly** (with spaces, then remove spaces)
4. **Check Gmail spam folder**
5. **Try a different Gmail account**

## 📞 **Help**

If still having issues:
1. Check server console for specific error messages
2. Verify Gmail account settings
3. Test with a different email provider
4. Contact your IT administrator

The test email button should help you quickly identify and fix any configuration issues! 🚀
