import { buildApiTargets } from './apiBase'

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs = 60000): Promise<Response> => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

export type GuidanceStep = {
  title: string
  description: string
  keyChecks: string[]
}

export type ConstructionGuidanceResult = {
  summary: string
  summaryUrdu: string
  materials: string[]
  materialsUrdu: string[]
  safety: string[]
  safetyUrdu: string[]
  steps: GuidanceStep[]
  stepsUrdu: GuidanceStep[]
}

export type GuidanceStepImage = {
  stepTitle: string
  prompt: string
  imageDataUrl: string
}

const postJsonWithFallback = async (path: string, payload: object): Promise<Response> => {
  const targets = buildApiTargets(path)
  let lastError: Error | null = null

  for (const target of targets) {
    try {
      const response = await fetchWithTimeout(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      const isJsonResponse = contentType.includes('application/json')

      if (response.ok) return response

      if ((response.status === 404 || response.status === 405) && !isJsonResponse) {
        lastError = new Error(`Guidance route unavailable on ${target} (${response.status})`)
        continue
      }

      if (!isJsonResponse) {
        lastError = new Error(`Guidance API returned non-JSON response (${response.status}) from ${target}`)
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Network request failed')
    }
  }

  throw lastError ?? new Error('Guidance API request failed')
}

const parseJsonResponse = async <T>(response: Response, fallback: string): Promise<T> => {
  const raw = await response.text()
  let body: T | { error?: string } | null = null

  try {
    body = JSON.parse(raw) as T | { error?: string }
  } catch {
    throw new Error(response.ok ? `${fallback}: invalid JSON response.` : `${fallback}: non-JSON response (${response.status}).`)
  }

  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? fallback)
  }

  return body as T
}

export const generateConstructionGuidance = async (payload: {
  province: string
  city: string
  hazard: 'flood' | 'earthquake'
  structureType: string
  bestPracticeName?: string
}): Promise<ConstructionGuidanceResult> => {
  const response = await postJsonWithFallback('/api/guidance/construction', payload)
  return parseJsonResponse<ConstructionGuidanceResult>(response, 'Construction guidance generation failed')
}

export const generateGuidanceStepImages = async (payload: {
  province: string
  city: string
  hazard: 'flood' | 'earthquake'
  structureType: string
  bestPracticeName?: string
  steps: GuidanceStep[]
}): Promise<{ images: GuidanceStepImage[] }> => {
  const response = await postJsonWithFallback('/api/guidance/step-images', payload)
  return parseJsonResponse<{ images: GuidanceStepImage[] }>(response, 'Construction image generation failed')
}
