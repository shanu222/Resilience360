import { buildApiTargets } from './apiBase'

export type NEATHazardType =
  | 'Earthquake'
  | 'Flood'
  | 'Typhoon/Cyclone'
  | 'Landslide'
  | 'Drought'
  | 'Heat'
  | 'Cold'
  | 'High Wind'

export type NEATInfrastructureType =
  | 'Road'
  | 'Bridge'
  | 'Water'
  | 'Power/Energy'
  | 'Communication'
  | 'Health'
  | 'Education'
  | 'Shelter'

export type NEATAnalysisInput = {
  district: string
  hazardType: NEATHazardType
  infrastructureType: NEATInfrastructureType
  location?: string
  infrastructureName?: string
  length?: number
  area?: number
  population?: number
  assets?: number
  services?: number
  vulnerabilityExposure?: number
  vulnerabilityPhysical?: number
  vulnerabilitySocial?: number
  vulnerabilityEconomic?: number
}

export type NEATAnalysisResult = {
  ok: boolean
  assessmentId: string
  timestamp: string
  inputs: NEATAnalysisInput
  results: {
    exposure: {
      score: number
      category: string
      description: string
    }
    vulnerability: {
      score: number
      category: string
      description: string
    }
    risk: {
      score: number
      category: string
      description: string
    }
    recommendations: string[]
  }
}

export type NEATMetadata = {
  toolName: string
  version: string
  description: string
  supportedHazards: NEATHazardType[]
  supportedInfrastructure: NEATInfrastructureType[]
  requiredFields: string[]
  optionalFields: string[]
  severityLevels: string[]
  frequencyLevels: string[]
}

const getJsonWithFallback = async (path: string): Promise<Response> => {
  const targets = buildApiTargets(path)
  let lastError: Error | null = null

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      const isJsonResponse = contentType.includes('application/json')

      if (response.ok) return response

      if ((response.status === 404 || response.status === 405) && !isJsonResponse) {
        lastError = new Error(`NEAT API unavailable on ${target} (${response.status})`)
        continue
      }

      if (!isJsonResponse) {
        lastError = new Error(`NEAT API returned non-JSON response (${response.status}) from ${target}`)
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('NEAT API request failed')
    }
  }

  throw lastError ?? new Error('NEAT API request failed')
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

      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      const isJsonResponse = contentType.includes('application/json')

      if (response.ok) return response

      if ((response.status === 404 || response.status === 405) && !isJsonResponse) {
        lastError = new Error(`NEAT API unavailable on ${target} (${response.status})`)
        continue
      }

      if (!isJsonResponse) {
        lastError = new Error(`NEAT API returned non-JSON response (${response.status}) from ${target}`)
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('NEAT API request failed')
    }
  }

  throw lastError ?? new Error('NEAT API request failed')
}

const parseJsonResponse = async <T>(response: Response, fallback: string): Promise<T> => {
  const raw = await response.text()
  let body: T | { error?: string; status?: string; message?: string } | null = null

  try {
    body = JSON.parse(raw) as T | { error?: string; status?: string; message?: string }
  } catch {
    throw new Error(response.ok ? `${fallback}: invalid JSON response.` : `${fallback}: non-JSON response (${response.status}).`)
  }

  if (!response.ok) {
    const errorBody = body as { error?: string; status?: string; message?: string }
    
    // Check for service unavailable status
    if (response.status === 503 || errorBody.status === 'unavailable') {
      throw new Error(
        errorBody.message || 
        errorBody.error || 
        'NEAT service is currently unavailable. The Network Exposure and Assessment Tool files may not be deployed. Please contact the administrator.'
      )
    }
    
    throw new Error(errorBody.error ?? fallback)
  }

  return body as T
}

export const getNEATMetadata = async (): Promise<NEATMetadata> => {
  const response = await getJsonWithFallback('/api/neat/metadata')
  return parseJsonResponse<NEATMetadata>(response, 'Failed to fetch NEAT metadata')
}

export const analyzeNEAT = async (input: NEATAnalysisInput): Promise<NEATAnalysisResult> => {
  const response = await postJsonWithFallback('/api/neat/analyze', input)
  return parseJsonResponse<NEATAnalysisResult>(response, 'NEAT analysis failed')
}
