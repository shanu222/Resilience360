import { buildApiTargets } from './apiBase'

export type LiveClimateSnapshot = {
  source: string
  updatedAt: string
  location: {
    name: string
    admin1: string
    country: string
    latitude: number
    longitude: number
  }
  metrics: {
    temperatureC: number
    apparentTemperatureC: number
    humidityPercent: number
    windSpeedKmh: number
    precipitationMm: number
    precipitationProbability: number
    uvIndexMax: number
    pm25: number
    pm10: number
    usAqi: number
  }
  riskScore: number
  heatwaveRiskZone: string
  airQualityLevel: string
  precautions: string[]
}

const withTimeout = async (input: RequestInfo | URL, timeoutMs = 20000): Promise<Response> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const fetchLiveClimate = async (path: string): Promise<LiveClimateSnapshot> => {
  const targets = buildApiTargets(path)
  let lastError: Error | null = null

  for (const target of targets) {
    try {
      const response = await withTimeout(target)
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      const isJson = contentType.includes('application/json')

      if (!response.ok) {
        if (isJson) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          lastError = new Error(body.error ?? `Live climate API failed (${response.status}).`)
        }
        continue
      }

      if (!isJson) {
        continue
      }

      return (await response.json()) as LiveClimateSnapshot
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Live climate request failed')
    }
  }

  throw lastError ?? new Error('Unable to fetch live climate data from available endpoints.')
}

export const fetchLiveClimateByCity = async (city: string): Promise<LiveClimateSnapshot> => {
  const query = city.trim()
  if (!query) {
    throw new Error('City name is required.')
  }

  return fetchLiveClimate(`/api/climate/live?city=${encodeURIComponent(query)}`)
}

export const fetchLiveClimateByCoordinates = async (lat: number, lng: number): Promise<LiveClimateSnapshot> => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Valid GPS coordinates are required.')
  }

  return fetchLiveClimate(`/api/climate/live?latitude=${encodeURIComponent(String(lat))}&longitude=${encodeURIComponent(String(lng))}`)
}
