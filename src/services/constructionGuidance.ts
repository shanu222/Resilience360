import { buildApiTargets } from './apiBase'

export type GuidanceStep = {
  title: string
  description: string
  keyChecks: string[]
}

export type ConstructionGuidanceResult = {
  summary: string
  materials: string[]
  safety: string[]
  steps: GuidanceStep[]
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
      const response = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.status !== 404) return response
      lastError = new Error(`Route not found on ${target}`)
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
