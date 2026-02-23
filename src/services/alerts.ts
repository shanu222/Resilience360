import { buildApiTargets } from './apiBase'

export type LiveAlert = {
  id: string
  source: 'NDMA' | 'PMD'
  title: string
  link: string
  publishedAt?: string
  summary?: string
}

const NDMA_ADVISORIES_URL = import.meta.env.VITE_NDMA_ADVISORIES_URL ?? 'https://ndma.gov.pk/advisories'
const NDMA_SITREPS_URL = import.meta.env.VITE_NDMA_SITREPS_URL ?? 'https://ndma.gov.pk/sitreps'
const NDMA_PROJECTIONS_URL =
  import.meta.env.VITE_NDMA_PROJECTIONS_URL ?? 'https://ndma.gov.pk/projection-impact-list_new'
const PMD_RSS_URL = import.meta.env.VITE_PMD_RSS_URL ?? 'https://cap-sources.s3.amazonaws.com/pk-pmd-en/rss.xml'

const withTimeout = async (input: RequestInfo | URL, timeoutMs = 14000): Promise<Response> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const parseDateMaybe = (text?: string): number => {
  if (!text) return 0
  const value = Date.parse(text)
  return Number.isNaN(value) ? 0 : value
}

const normalizeUrl = (url: string): string => {
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `https://ndma.gov.pk${url}`
  return `https://ndma.gov.pk/${url}`
}

const fetchTextFromAny = async (candidates: string[]): Promise<string> => {
  let lastError: Error | null = null
  for (const candidate of candidates) {
    try {
      const response = await withTimeout(candidate)
      if (!response.ok) continue
      return await response.text()
    } catch (error) {
      lastError = error as Error
    }
  }
  if (lastError) throw lastError
  throw new Error('No live endpoint responded.')
}

const liveHazardPriority = (alert: LiveAlert): number => {
  const text = `${alert.title} ${alert.summary ?? ''}`.toLowerCase()
  const keywords = ['flood', 'rain', 'thunderstorm', 'cyclone', 'heatwave', 'cold wave', 'earthquake', 'landslide', 'storm']
  return keywords.some((keyword) => text.includes(keyword)) ? 1 : 0
}

const stripHtml = (value: string): string => {
  const parser = new DOMParser()
  return parser.parseFromString(value, 'text/html').body.textContent?.trim() ?? value
}

const parseNdmaPage = (html: string, sourceLabel: string): LiveAlert[] => {
  const results: LiveAlert[] = []
  const regex = /<a[^>]*href="([^"]*\/storage\/(?:advisories|sitreps|projection-impact-langs)\/[^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi
  const seen = new Set<string>()

  for (const match of html.matchAll(regex)) {
    const href = normalizeUrl(match[1])
    const titleRaw = stripHtml(match[2])
    const title = titleRaw.replace(/\s+/g, ' ').trim()

    if (!title || seen.has(href)) continue
    seen.add(href)

    results.push({
      id: `ndma-${href}`,
      source: 'NDMA',
      title: `${sourceLabel}: ${title}`,
      link: href,
    })

    if (results.length >= 10) break
  }

  return results
}

const parsePmdRss = (xmlString: string): LiveAlert[] => {
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlString, 'application/xml')
  const items = Array.from(xml.querySelectorAll('item')).slice(0, 12)

  return items.map((item, index) => {
    const title = item.querySelector('title')?.textContent?.trim() || `PMD Alert ${index + 1}`
    const link = item.querySelector('link')?.textContent?.trim() || PMD_RSS_URL
    const pubDate = item.querySelector('pubDate')?.textContent?.trim()
    const description = item.querySelector('description')?.textContent?.trim()

    return {
      id: `pmd-${link}-${index}`,
      source: 'PMD',
      title,
      link,
      publishedAt: pubDate,
      summary: description ? stripHtml(description) : undefined,
    }
  })
}

export const fetchLiveAlerts = async (): Promise<LiveAlert[]> => {
  const ndmaCandidates = [
    ...buildApiTargets('/api/ndma/advisories'),
    NDMA_ADVISORIES_URL,
    ...buildApiTargets('/api/ndma/sitreps'),
    NDMA_SITREPS_URL,
    ...buildApiTargets('/api/ndma/projections'),
    NDMA_PROJECTIONS_URL,
  ]

  const pmdCandidates = [...buildApiTargets('/api/pmd/rss'), PMD_RSS_URL]

  const [ndmaAdvisoryHtml, ndmaSitrepHtml, ndmaProjectionHtml, pmdRssXml] = await Promise.all([
    fetchTextFromAny(ndmaCandidates.slice(0, 2)),
    fetchTextFromAny(ndmaCandidates.slice(2, 4)),
    fetchTextFromAny(ndmaCandidates.slice(4, 6)),
    fetchTextFromAny(pmdCandidates),
  ])

  const merged = [
    ...parseNdmaPage(ndmaAdvisoryHtml, 'Advisory'),
    ...parseNdmaPage(ndmaSitrepHtml, 'Situation Report'),
    ...parseNdmaPage(ndmaProjectionHtml, 'Projection & Impact'),
    ...parsePmdRss(pmdRssXml),
  ]

  return merged
    .sort((a, b) => {
      const priorityDiff = liveHazardPriority(b) - liveHazardPriority(a)
      if (priorityDiff !== 0) return priorityDiff
      return parseDateMaybe(b.publishedAt) - parseDateMaybe(a.publishedAt)
    })
    .slice(0, 12)
}
