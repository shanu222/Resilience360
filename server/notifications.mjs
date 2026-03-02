import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const devicesDataFile = path.join(__dirname, 'data', 'notifications', 'registered-devices.json')
const subscriptionsDataFile = path.join(__dirname, 'data', 'notifications', 'subscriptions.json')

// Ensure data directory exists
export async function initializeNotificationSystem() {
  try {
    const notificationsDir = path.dirname(devicesDataFile)
    await fs.mkdir(notificationsDir, { recursive: true })
  } catch (error) {
    console.error('❌ Failed to initialize notification system:', error)
  }
}

// Read registered devices
export async function readRegisteredDevices() {
  try {
    const data = await fs.readFile(devicesDataFile, 'utf-8')
    return JSON.parse(data) || []
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []
    }
    console.error('❌ Failed to read registered devices:', error)
    return []
  }
}

// Write registered devices
export async function writeRegisteredDevices(devices) {
  try {
    const dir = path.dirname(devicesDataFile)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(devicesDataFile, JSON.stringify(devices, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('❌ Failed to write registered devices:', error)
    return false
  }
}

// Register device for push notifications
export async function registerDevice(deviceToken, platform = 'android') {
  try {
    const devices = await readRegisteredDevices()
    
    // Check if device already registered
    const existing = devices.find((d) => d.token === deviceToken)
    if (existing) {
      existing.lastSeen = new Date().toISOString()
      existing.platform = platform
    } else {
      devices.push({
        token: deviceToken,
        platform,
        registeredAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        subscriptions: {
          earthquakes: true,
        },
      })
    }

    await writeRegisteredDevices(devices)
    console.log(`✅ Device registered: ${deviceToken}`)
    return { ok: true, token: deviceToken, total: devices.length }
  } catch (error) {
    console.error('❌ Failed to register device:', error)
    return { ok: false, error: error.message }
  }
}

// Unregister device
export async function unregisterDevice(deviceToken) {
  try {
    const devices = await readRegisteredDevices()
    const remaining = devices.filter((d) => d.token !== deviceToken)
    await writeRegisteredDevices(remaining)
    console.log(`✅ Device unregistered: ${deviceToken}`)
    return { ok: true, total: remaining.length }
  } catch (error) {
    console.error('❌ Failed to unregister device:', error)
    return { ok: false, error: error.message }
  }
}

// Update subscription preferences
export async function updateSubscriptionPreferences(deviceToken, preferences) {
  try {
    const devices = await readRegisteredDevices()
    const device = devices.find((d) => d.token === deviceToken)
    
    if (!device) {
      return { ok: false, error: 'Device not found' }
    }

    device.subscriptions = {
      ...device.subscriptions,
      ...preferences,
    }
    device.lastSeen = new Date().toISOString()

    await writeRegisteredDevices(devices)
    console.log(`✅ Updated subscriptions for device: ${deviceToken}`)
    return { ok: true, subscriptions: device.subscriptions }
  } catch (error) {
    console.error('❌ Failed to update subscriptions:', error)
    return { ok: false, error: error.message }
  }
}

// Get devices for notification broadcast
export async function getDevicesForBroadcast(options = {}) {
  try {
    const devices = await readRegisteredDevices()
    
    // Filter by subscription type
    const subscriptionType = options.subscriptionType || 'earthquakes'
    const filtered = devices.filter((d) => d.subscriptions?.[subscriptionType] === true)

    // Filter by platform if specified
    if (options.platform) {
      return filtered.filter((d) => d.platform === options.platform)
    }

    return filtered
  } catch (error) {
    console.error('❌ Failed to get devices for broadcast:', error)
    return []
  }
}

// Prepare FCM message from earthquake event
export function prepareFcmMessage(earthquake) {
  const title = `🌍 Earthquake Alert`
  const body = `Magnitude ${earthquake.magnitude.toFixed(1)} - ${earthquake.location}`

  return {
    notification: {
      title,
      body,
    },
    data: {
      magnitude: String(earthquake.magnitude),
      location: earthquake.location,
      latitude: String(earthquake.latitude),
      longitude: String(earthquake.longitude),
      depth: String(earthquake.depth),
      timestamp: earthquake.timestamp,
      eventId: earthquake.eventId,
      url: earthquake.url || '',
      notificationType: 'earthquake_alert',
    },
    android: {
      priority: 'high',
      notification: {
        title,
        body,
        sound: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        icon: '@drawable/ic_stat_icon_config_sample',
        color: '#D32F2F',
        tag: `earthquake_${earthquake.eventId}`,
      },
    },
    webpush: {
      notification: {
        title,
        body,
        icon: 'https://resilience360.pages.dev/icons/earthquake-icon.png',
        badge: 'https://resilience360.pages.dev/icons/earthquake-badge.png',
        tag: `earthquake_${earthquake.eventId}`,
      },
      data: {
        clickAction: 'https://resilience360.pages.dev',
      },
    },
  }
}

// Initialize system on module load
await initializeNotificationSystem()
