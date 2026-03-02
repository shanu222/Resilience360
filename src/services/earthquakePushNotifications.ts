import { PushNotifications } from '@capacitor/push-notifications'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

export type EarthquakeNotificationPayload = {
  magnitude: number
  location: string
  latitude: number
  longitude: number
  depth: number
  timestamp: string
  eventId: string
  url?: string
}

class EarthquakePushNotificationService {
  private deviceToken: string | null = null
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Only initialize on native platforms
      if (!Capacitor.isNativePlatform()) {
        console.log('Push notifications only available on native platforms')
        return
      }

      // Request notification permissions
      await this.requestPermissions()

      // Register with push notifications
      await PushNotifications.setup()

      // Get device token
      await this.registerDevice()

      // Listen for incoming notifications
      this.setupNotificationListeners()

      this.isInitialized = true
      console.log('✅ Push notification service initialized')
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error)
    }
  }

  private async requestPermissions(): Promise<void> {
    try {
      const result = await PushNotifications.requestPermissions()

      if (result.receive === 'granted') {
        console.log('✅ Push notification permission granted')
      } else if (result.receive === 'denied') {
        console.warn('⚠️ Push notification permission denied')
      }
    } catch (error) {
      console.error('❌ Failed to request notification permissions:', error)
    }
  }

  private async registerDevice(): Promise<void> {
    try {
      PushNotifications.addListener('registration', (token) => {
        this.deviceToken = token.value
        console.log('✅ Device registered for push notifications')
        console.log(`Device Token: ${this.deviceToken}`)

        // Send token to backend for subscription
        this.sendTokenToBackend(this.deviceToken)
      })

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('❌ Push registration error:', error.error)
      })
    } catch (error) {
      console.error('❌ Failed to register device:', error)
    }
  }

  private setupNotificationListeners(): void {
    // Listener for notifications when app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📬 Push notification received (foreground):', notification)
      this.handleNotification(notification.data as any)
    })

    // Listener for notifications when app is in background
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('📢 Push notification action performed:', notification)
      this.handleNotification(notification.notification.data as any)
    })
  }

  private handleNotification(data: any): void {
    try {
      const payload: EarthquakeNotificationPayload = {
        magnitude: parseFloat(data.magnitude || '0'),
        location: data.location || 'Unknown',
        latitude: parseFloat(data.latitude || '0'),
        longitude: parseFloat(data.longitude || '0'),
        depth: parseFloat(data.depth || '0'),
        timestamp: data.timestamp || new Date().toISOString(),
        eventId: data.eventId || '',
        url: data.url,
      }

      // Show local notification with details
      this.displayLocalNotification(payload)

      // Trigger custom event for app to handle
      window.dispatchEvent(
        new CustomEvent('earthquake-alert', {
          detail: payload,
        })
      )
    } catch (error) {
      console.error('❌ Failed to handle notification:', error)
    }
  }

  private async displayLocalNotification(payload: EarthquakeNotificationPayload): Promise<void> {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: `🌍 Earthquake Alert`,
            body: `Magnitude ${payload.magnitude.toFixed(1)} - ${payload.location}`,
            id: parseInt(payload.eventId) || Date.now(),
            schedule: { at: new Date(Date.now() + 1000) },
            smallIcon: 'ic_stat_icon_config_sample',
            largeIcon: 'ic_launcher_foreground',
            extra: {
              magnitude: payload.magnitude,
              location: payload.location,
              latitude: payload.latitude,
              longitude: payload.longitude,
              depth: payload.depth,
              timestamp: payload.timestamp,
            },
          },
        ],
      })

      console.log('✅ Local notification displayed')
    } catch (error) {
      console.error('❌ Failed to display local notification:', error)
    }
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const response = await fetch('/api/notifications/register-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceToken: token,
          platform: 'android',
          userAgent: navigator.userAgent,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to register device: ${response.statusText}`)
      }

      console.log('✅ Device token sent to backend')
    } catch (error) {
      console.error('❌ Failed to send token to backend:', error)
    }
  }

  async subscribeToEarthquakeAlerts(config?: { minMagnitude?: number; region?: string }): Promise<void> {
    try {
      const response = await fetch('/api/notifications/subscribe-earthquakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceToken: this.deviceToken,
          minMagnitude: config?.minMagnitude || 5.0,
          region: config?.region || 'pakistan',
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to subscribe: ${response.statusText}`)
      }

      console.log('✅ Subscribed to earthquake alerts')
    } catch (error) {
      console.error('❌ Failed to subscribe to earthquake alerts:', error)
    }
  }

  async unsubscribeFromEarthquakeAlerts(): Promise<void> {
    try {
      const response = await fetch('/api/notifications/unsubscribe-earthquakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceToken: this.deviceToken,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to unsubscribe: ${response.statusText}`)
      }

      console.log('✅ Unsubscribed from earthquake alerts')
    } catch (error) {
      console.error('❌ Failed to unsubscribe from earthquake alerts:', error)
    }
  }

  getDeviceToken(): string | null {
    return this.deviceToken
  }

  isInitialized(): boolean {
    return this.isInitialized
  }
}

export const earthquakePushNotificationService = new EarthquakePushNotificationService()
