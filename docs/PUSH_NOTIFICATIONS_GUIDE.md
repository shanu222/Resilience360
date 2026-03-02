# Real-Time Earthquake Push Notifications Guide

## Overview

The Resilience360 app now includes a real-time earthquake push notification system that alerts users immediately when earthquakes with magnitude > 5.0 occur, even when the app is closed or running in the background.

## Architecture

### Frontend Components

#### 1. **Push Notification Service** (`src/services/earthquakePushNotifications.ts`)
- Initializes Firebase Cloud Messaging (FCM) on app startup
- Requests notification permissions from the user
- Registers device with FCM to get device token
- Handles incoming push notifications in foreground and background
- Displays local notifications with earthquake details
- Dispatches app-level custom events for UI updates

#### 2. **App Integration** (`src/App.tsx`)
- Initializes push notification service on app startup (line ~1608)
- Listens for `earthquake-alert` custom events
- Can trigger app-level UI updates when alerts are received

### Backend Components

#### 1. **Notification System** (`server/notifications.mjs`)

**Device Management:**
- `registerDevice()` - Stores device token and platform info
- `unregisterDevice()` - Removes device from subscription list
- `readRegisteredDevices()` - Loads all registered devices from storage
- `writeRegisteredDevices()` - Persists device list

**Subscription Management:**
- `updateSubscriptionPreferences()` - Configure notification settings per device
- `getDevicesForBroadcast()` - Get devices for a specific broadcast

**Notification Preparation:**
- `prepareFcmMessage()` - Formats Firebase Cloud Message with earthquake data

**Data Storage:**
- Devices stored in: `server/data/notifications/registered-devices.json`
- Format: Device token, platform, subscription preferences, registration timestamp

#### 2. **API Endpoints** (`server/index.mjs`)

**Device Management Endpoints:**
```
POST /api/notifications/register-device
  Request: { deviceToken, platform }
  Response: { ok, token, total }

POST /api/notifications/unregister-device
  Request: { deviceToken }
  Response: { ok, total }

GET /api/notifications/registered-devices
  Response: { ok, total, devices[] }
```

**Subscription Management:**
```
POST /api/notifications/subscribe-earthquakes
  Request: { deviceToken, minMagnitude? }
  Response: { ok, subscriptions }

POST /api/notifications/unsubscribe-earthquakes
  Request: { deviceToken }
  Response: { ok, subscriptions }
```

#### 3. **Earthquake Alert Broadcasting** (`server/index.mjs`)

**Enhanced `processEarthquakeAlertDispatch()` Function:**
- Polls USGS and EMSC earthquake feeds every 120 seconds (default)
- Filters events with magnitude ≥ 5.0 (configurable via `EARTHQUAKE_ALERT_MAGNITUDE_THRESHOLD`)
- Sends email alerts to email subscribers
- **NEW:** Broadcasts push notifications to all registered devices
- Tracks sent alerts to prevent duplicates

**New `broadcastEarthquakePushNotifications()` Function:**
- Reads all registered Android devices
- Prepares FCM message with earthquake details (magnitude, location, depth, time)
- Logs broadcast intent (ready for Firebase Admin SDK integration)
- Returns delivery statistics

## Setup Instructions

### Step 1: Install Dependencies

```bash
npm install
```

This installs the required Firebase packages:
- `@capacitor/push-notifications@^8.1.0`
- `@capacitor/local-notifications@^8.1.0`
- `firebase@^10.7.0`
- `firebase-admin@^12.0.0`

### Step 2: Create Firebase Project

1. Go to [firebase.google.com/console](https://firebase.google.com/console)
2. Click "Create a project"
3. Name it "Resilience360"
4. Enable Google Analytics (optional)
5. Create the project

### Step 3: Register Android App in Firebase

1. In Firebase Console, go to Project Settings
2. Click "Add app" → Select Android
3. Package name: `com.resilience360.mobile` (from capacitor.config.ts)
4. SHA-1 certificate fingerprint: Generate via `keytool` (instructions in console)
5. Download `google-services.json`
6. Save to `android/app/google-services.json`

### Step 4: Download Service Account Key

1. In Firebase Console, go to Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save JSON file securely (keep away from version control)
4. Add to server environment variable:
   ```
   FIREBASE_SERVICE_ACCOUNT_KEY=<path-to-json>
   ```

### Step 5: Add Firebase Plugin to Android Build

Update `android/build.gradle`:

```gradle
classpath 'com.google.gms:google-services:4.3.15'
```

Update `android/app/build.gradle`:

```gradle
plugins {
  id 'com.google.gms.google-services'  // Add this line
}

dependencies {
  // Firebase Cloud Messaging
  implementation 'com.google.firebase:firebase-messaging:23.2.1'
}
```

### Step 6: Enable FCM in Firebase Console

1. Go to Cloud Messaging tab
2. Copy the **Server API Key** and **Sender ID**
3. Add to environment:
   ```
   FIREBASE_SERVER_API_KEY=<server-key>
   FIREBASE_SENDER_ID=<sender-id>
   ```

## Data Flow

### User Registration Flow

```
1. App starts
2. App calls earthquakePushNotificationService.initialize()
3. Service requests notification permission
4. OS shows permission dialog to user
5. User grants permission
6. Service registers with FCM → Gets device token
7. Service calls POST /api/notifications/register-device
8. Backend stores device token & platform
9. Service calls POST /api/notifications/subscribe-earthquakes
10. Backend enables earthquake notifications for device
```

### Earthquake Alert Flow

```
1. Backend polls USGS/EMSC every 120 seconds
2. New earthquake detected with magnitude > 5.0
3. Backend calls broadcastEarthquakePushNotifications()
4. Gets list of registered devices
5. Prepares Firebase message with:
   - Title: "🌍 Earthquake Alert"
   - Body: "Magnitude 6.2 - Muzaffarabad"
   - Data: magnitude, location, lat/lon, depth, timestamp, URL
6. For each device token:
   - Sends message via Firebase Cloud Messaging
   - (Requires Firebase Admin SDK when connected)
7. Device receives message:
   - If app in foreground: 
     * Shows notification
     * Dispatches custom event to app
   - If app in background:
     * Shows native notification
     * User can tap to launch app
   - If app closed:
     * Shows native notification in notification center
     * User can tap to launch app
8. User sees notification with magnitude and location
```

## Configuration

### Environment Variables (Server)

```bash
# Earthquake alert thresholds
EARTHQUAKE_ALERT_MAGNITUDE_THRESHOLD=5       # Minimum magnitude to alert (default: 5)
EARTHQUAKE_ALERT_POLL_INTERVAL_MS=120000     # Poll frequency in milliseconds (default: 120s)

# Firebase integration (when ready)
FIREBASE_SERVICE_ACCOUNT_KEY=/path/to/key.json
FIREBASE_SERVER_API_KEY=your-server-api-key
FIREBASE_SENDER_ID=your-sender-id
```

### Push Notification Preferences

Devices can customize their alert preferences via API:

```javascript
// Subscribe with custom magnitude threshold
await fetch('/api/notifications/subscribe-earthquakes', {
  method: 'POST',
  body: JSON.stringify({
    deviceToken: 'device-token-here',
    minMagnitude: 6.0  // Only notify for mag 6.0+
  })
})
```

## Firebase Admin SDK Integration

Once Firebase credentials are set up, update `server/broadcastEarthquakePushNotifications()`:

```javascript
import admin from 'firebase-admin'

// Initialize admin SDK (in server startup)
admin.initializeApp({
  credential: admin.credential.cert(require('./firebase-key.json'))
})

// In broadcastEarthquakePushNotifications()
const messaging = admin.messaging()

for (const device of devices) {
  try {
    const response = await messaging.send({
      token: device.token,
      ...fcmMessage
    })
    sentCount++
  } catch (error) {
    console.error(`Failed to send to ${device.token}:`, error)
  }
}
```

## Data Privacy & Security

- **Device Tokens**: Stored locally on backend, never shared
- **Location Data**: Earthquake locations are public USGS/EMSC data
- **User Data**: No personal data required; notification preferences stored per device
- **HTTPS Enforcement**: All API calls use HTTPS (see network_security_config.xml)
- **Unsubscribe**: Users can unsubscribe anytime via API

## Testing

### Test Device Registration

```bash
curl -X POST http://localhost:8787/api/notifications/register-device \
  -H "Content-Type: application/json" \
  -d '{"deviceToken":"test-token-123","platform":"android"}'
```

### View Registered Devices

```bash
curl http://localhost:8787/api/notifications/registered-devices
```

### Simulate Earthquake Alert Broadcast

```bash
curl -X POST http://localhost:8787/api/earthquake-alerts/dispatch
```

### Local Notification Testing (No Firebase)

The app falls back to local notifications on development builds, allowing full testing without Firebase setup:

```
1. Build debug APK
2. Install on Android device
3. App automatically shows permissions dialog
4. Grant notification permission
5. Device token is registered
6. When earthquake detected, local notification appears
```

## Troubleshooting

### Device Permissions

**Issue**: "Notification permission denied"
- **Solution**: 
  1. Go to Settings → Apps → Resilience360
  2. Permissions → Notifications → Allow

### Firebase Configuration

**Issue**: "Failed to send FCM message"
- **Solution**:
  1. Verify `google-services.json` in `android/app/`
  2. Check Firebase credentials in environment variables
  3. Ensure Firebase Messaging enabled in Console

### No Notifications Received

**Issue**: App receives permission but no alerts
- **Cause**: Devices not registered (check stored file)
  - Verify: `curl http://localhost:8787/api/notifications/registered-devices`
- **Cause**: No earthquakes detected
  - Verify backend earthquake polling: Check server logs
- **Cause**: Magnitude < threshold
  - Check threshold configuration: `EARTHQUAKE_ALERT_MAGNITUDE_THRESHOLD`

### Silent Failures

For debugging, check server logs:
```bash
# On development server
tail -f render-logs.txt | grep -i notification
```

## Future Enhancements

1. **Notification Preferences UI**
   - In-app settings to adjust magnitude threshold
   - Regional filters for specific areas
   - Quiet hours configuration

2. **Rich Notifications**
   - Map thumbnail of earthquake epicenter
   - Direct link to damage assessment tools
   - Share alert with others

3. **Notification History**
   - View past earthquakes that triggered alerts
   - Statistics on alert frequency
   - Trends over time

4. **Intelligent Routing**
   - Use device location to prioritize nearby earthquakes
   - Notify based on user's infrastructure models
   - Integration with other alerts (floods, weather)

5. **Web Push Support**
   - Notifications for web version via Service Workers
   - Desktop notifications on PWA install

## References

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications Guide](https://capacitorjs.com/docs/apis/push-notifications)
- [USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/)
- [EMSC Earthquake Portal](https://www.seismicportal.eu/)

## Quick Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| Service | `src/services/earthquakePushNotifications.ts` | FCM registration, notification handling |
| Backend | `server/notifications.mjs` | Device management, storage |
| API Routes | `server/index.mjs` | Device & subscription endpoints |
| Android Config | `android/app/google-services.json` | Firebase Android credentials |
| Environment | `.env` | Firebase API keys, thresholds |
| Capacitor Bridge | `capacitor.config.ts` | Android notification settings |
| Network Policy | `android/app/res/xml/network_security_config.xml` | HTTPS enforcement |

---

**Last Updated**: Generated during push notification system implementation  
**Status**: Ready for Firebase integration and Android APK testing  
**Next Steps**: Firebase project creation → Download google-services.json → Build APK with `npm run build` + `node scripts/build-android-apk.mjs debug`
