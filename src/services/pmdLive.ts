import { buildApiTargets } from './apiBase'

export type PmdCityTemperature = {
  city: string
  temperatureC: number
}

export type PmdLiveSnapshot = {
  source: 'PMD'
  updatedAt: string
  mode?: 'full-or-partial-web' | 'rss-fallback'
  cities: PmdCityTemperature[]
  latestAlerts?: Array<{
    id: string
    title: string
    link: string
    publishedAt?: string
  }>
  links: {
    home: string
    radar: string
    satellite: string
  }
  satellite: {
    label: string
    imageUrl: string | null
  }
  radar: {
    label: string
    pageUrl: string
    requiresLogin: boolean
  }
}

const withTimeout = async (input: RequestInfo | URL, timeoutMs = 15000): Promise<Response> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export const fetchPmdLiveSnapshot = async (): Promise<PmdLiveSnapshot> => {
  const targets = buildApiTargets('/api/pmd/live')
  let lastError: Error | null = null

  for (const target of targets) {
    try {
      const response = await withTimeout(target)
      if (!response.ok) {
        continue
      }

      const data = (await response.json()) as PmdLiveSnapshot
      if (!data?.cities || !Array.isArray(data.cities)) {
        continue
      }

      return data
    } catch (error) {
      lastError = error as Error
    }
  }

  if (lastError) {
    throw lastError
  }

  throw new Error('Unable to load PMD live snapshot from available endpoints.')
}
