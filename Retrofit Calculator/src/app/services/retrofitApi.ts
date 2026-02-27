export type DefectDetection = {
  type: 'crack' | 'spalling' | 'corrosion' | 'moisture' | 'deformation' | 'other'
  severity: 'low' | 'medium' | 'high'
  confidence: number
  location: string
  evidence: string
  retrofitAction: string
}

export type VisionAnalysisResult = {
  model: string
  analyzedAt: string
  summary: string
  imageQuality: {
    visibility: 'excellent' | 'good' | 'fair' | 'poor'
    notes: string
  }
  defects: DefectDetection[]
  costSignals?: {
    assessedDamageLevel: 'low' | 'medium' | 'high'
    recommendedScope: 'basic' | 'standard' | 'comprehensive'
    estimatedAffectedAreaPercent: number
    severityScore: number
    urgencyLevel: 'routine' | 'priority' | 'critical'
  }
  priorityActions: string[]
  safetyNote: string
}

export type MlRetrofitEstimate = {
  model: string
  predictedScope: 'basic' | 'standard' | 'comprehensive'
  predictedDamage: 'low' | 'medium' | 'high'
  predictedCostPerSqft: number
  predictedDurationWeeks: number
  confidence: number
  guidance: string[]
}

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

const configuredApiBase = String(import.meta.env.VITE_API_BASE_URL ?? '').trim()
const normalizedApiBase = configuredApiBase ? stripTrailingSlash(configuredApiBase) : ''
const localBackendFallback = 'http://localhost:8787'
const productionBackendFallback = 'https://resilience360-backend.onrender.com'

const buildApiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with '/': ${path}`)
  }

  if (!normalizedApiBase) return path
  return `${normalizedApiBase}${path}`
}

const buildApiTargets = (path: string): string[] => {
  const preferred = buildApiUrl(path)
  const targets = [preferred]
  const hostname = window.location.hostname
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'

  if (preferred !== path) {
    targets.push(path)
  }

  if (isLocalhost) {
    targets.push(`${localBackendFallback}${path}`)
  }

  if (!normalizedApiBase && !isLocalhost) {
    targets.push(`${productionBackendFallback}${path}`)
  }

  return [...new Set(targets)]
}

export const analyzeBuildingWithVision = async (payload: {
  image: File
  structureType: string
  province: string
  location: string
  riskProfile: string
}): Promise<VisionAnalysisResult> => {
  const formData = new FormData()
  formData.append('image', payload.image)
  formData.append('structureType', payload.structureType)
  formData.append('province', payload.province)
  formData.append('location', payload.location)
  formData.append('riskProfile', payload.riskProfile)

  const targets = buildApiTargets('/api/vision/analyze')
  let lastError: Error | null = null

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        method: 'POST',
        body: formData,
      })

      const raw = await response.text()
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

      if (!contentType.includes('application/json')) {
        lastError = new Error(`Vision API returned non-JSON response (${response.status})`)
        continue
      }

      const body = JSON.parse(raw) as VisionAnalysisResult | { error?: string }

      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? 'Vision analysis failed')
      }

      return body as VisionAnalysisResult
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Vision API request failed')
    }
  }

  throw lastError ?? new Error('Vision API request failed')
}

export const getMlRetrofitEstimate = async (payload: {
  structureType: string
  province: string
  city: string
  areaSqft: number
  severityScore: number
  affectedAreaPercent: number
  urgencyLevel: 'routine' | 'priority' | 'critical'
  laborDaily?: number
  materialIndex?: number
  equipmentIndex?: number
  logisticsIndex?: number
}): Promise<MlRetrofitEstimate> => {
  const targets = buildApiTargets('/api/ml/retrofit-estimate')
  let lastError: Error | null = null

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const raw = await response.text()
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

      if (!contentType.includes('application/json')) {
        lastError = new Error(`ML API returned non-JSON response (${response.status})`)
        continue
      }

      const body = JSON.parse(raw) as MlRetrofitEstimate | { error?: string }

      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? 'ML retrofit estimate failed')
      }

      return body as MlRetrofitEstimate
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('ML API request failed')
    }
  }

  throw lastError ?? new Error('ML API request failed')
}
