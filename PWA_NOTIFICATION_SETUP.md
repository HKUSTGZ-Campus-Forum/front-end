# PWA Notification Setup Guide

## Complete PWA Badge Notification Implementation

The PWA notification system with app icon badges has been successfully implemented! Here's what's now working:

### ✅ Implemented Features

1. **Service Worker with Badge Support** (`/public/sw.js`)
   - Background push notification handling
   - App badge update functionality
   - Automatic badge sync with unread count

2. **Enhanced usePushNotifications Composable** (`/composables/usePushNotifications.ts`)
   - Badge update methods: `updateBadge()`, `clearBadge()`, `refreshBadge()`
   - Service worker message handling for auth tokens

3. **Updated NotificationBell Component** (`/components/ui/NotificationBell.vue`)
   - Real-time badge updates when notifications are read
   - Automatic badge sync on notification count changes
   - Watcher for unread count changes

4. **Backend Push Service Enhancements** (`/back-end/app/services/push_service.py`)
   - Unread count included in push notifications
   - Silent badge-only update notifications
   - Icons updated to use `/image/uniKorn.png`

5. **Backend Notification Routes** (`/back-end/app/routes/notification.py`)
   - Badge updates when notifications are marked as read
   - Badge cleared when all notifications are marked as read

### 🔧 Required Setup (To Enable Full Functionality)

To get the red dot working on your PWA app icon, you need to configure VAPID keys:

#### 1. Generate VAPID Keys

```bash
# Install pywebpush if not already installed
pip install pywebpush

# Generate VAPID keys
python -c "from pywebpush import webpush; print(webpush.generate_vapid_keys())"
```

This will output something like:
```json
{
  "private_key": "your-private-key-here",
  "public_key": "your-public-key-here"
}
```

#### 2. Configure Environment Variables

Add these to your backend environment (`.env` file or deployment config):

```bash
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_PUBLIC_KEY=your-public-key-here
VAPID_EMAIL=admin@yourdomain.com
```

#### 3. Install Backend Dependencies

Add to your `requirements.txt`:
```
pywebpush>=1.14.0
```

### 🎯 How It Works

1. **User adds app to home screen** → PWA manifest enables native app experience
2. **Service worker registers** → Background notification handling enabled
3. **User subscribes to push notifications** → Browser creates push subscription
4. **New notification created** → Backend sends push with `unread_count`
5. **Service worker receives push** → Updates app badge automatically
6. **User reads notification** → Badge count decreases
7. **All notifications read** → Badge cleared (red dot disappears)

### 📱 Supported Platforms

- **Android Chrome**: Full badge support ✅
- **iOS Safari**: Badge support in PWA mode ✅
- **Desktop Chrome**: Badge support ✅
- **Desktop Firefox**: Limited badge support ⚠️
- **Desktop Safari**: No badge support ❌

### 🔍 Testing

1. **Add app to home screen** on mobile device
2. **Allow notifications** when prompted
3. **Create test notification**:
   ```bash
   curl -X POST https://your-api.com/api/push/test \
        -H "Authorization: Bearer YOUR_TOKEN"
   ```
4. **Check app icon** → Should show red dot with number

### 🐛 Troubleshooting

**No red dot appearing?**
- Check if VAPID keys are configured correctly
- Verify app is added to home screen (not just bookmarked)
- Ensure notifications permission is granted
- Check browser developer tools for service worker errors

**Badge not updating?**
- Check if service worker is active in DevTools → Application → Service Workers
- Verify push subscription is active: DevTools → Application → Storage → Push Messaging

**Backend errors?**
- Check if `pywebpush` is installed
- Verify VAPID environment variables are set
- Check server logs for push notification errors

### 🚀 Next Steps

The system is now ready! Once you configure the VAPID keys, users will see:

1. **Red dot on app icon** when they have unread notifications
2. **Number badge** showing exact unread count (on supported platforms)
3. **Automatic badge updates** when notifications are read/created
4. **Background badge sync** even when app is closed

The implementation follows PWA best practices and gracefully degrades on platforms with limited badge support.