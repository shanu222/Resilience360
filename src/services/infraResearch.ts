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

export type InfraResearchResult = {
  modelName: string
  overview: string
  globalUseCases: Array<{
    country: string
    project: string
    application: string
    evidenceNote: string
  }>
  pakistanUseCases: string[]
  features: string[]
  materials: Array<{
    name: string
    specification: string
    availabilityInPakistan: string
  }>
  availability: {
    readinessPakistan: string
    localSupplyPotential: string
    importDependencyNote: string
  }
  resilience: {
    flood: string
    earthquake: string
    floodScore: number
    earthquakeScore: number
  }
  sourceLinks: string[]
  googleSearch: {
    global: string
    pakistan: string
    globalHint: string
    pakistanHint: string
  }
}

export type InfraResearchImage = {
  view: string
  imageDataUrl: string
}

export type StructuralDesignReport = {
  summary: string
  designAssumptions: string[]
  structuralSystem: string
  foundationSystem: string
  loadPathAndLateralSystem: string
  materialSpecifications: string[]
  preliminaryMemberSizing: string[]
  floodResilienceMeasures: string[]
  earthquakeResilienceMeasures: string[]
  constructionMaterialsBOQ: string[]
  rateAndCostNotes: string[]
  codeAndComplianceChecks: string[]
  limitations: string[]
  generatedAt: string
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

      if (response.status !== 404) return response
      lastError = new Error(`Route not found on ${target}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Network request failed')
    }
  }

  throw lastError ?? new Error('Infra research API request failed')
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

export const researchInfraModel = async (payload: { modelName: string; province?: string }): Promise<InfraResearchResult> => {
  const response = await postJsonWithFallback('/api/models/research', payload)
  return parseJsonResponse<InfraResearchResult>(response, 'Infra model research failed')
}

export const generateInfraModelResearchImages = async (payload: {
  modelName: string
  province?: string
}): Promise<{ images: InfraResearchImage[] }> => {
  const response = await postJsonWithFallback('/api/models/research-images', payload)
  return parseJsonResponse<{ images: InfraResearchImage[] }>(response, 'Infra model view image generation failed')
}

export const generateStructuralDesignReport = async (payload: {
  modelName: string
  location: string
  geoTechReport?: string
  stories: number
  intendedUse: string
}): Promise<StructuralDesignReport> => {
  const response = await postJsonWithFallback('/api/models/structural-design-report', payload)
  return parseJsonResponse<StructuralDesignReport>(response, 'Structural design report generation failed')
}
