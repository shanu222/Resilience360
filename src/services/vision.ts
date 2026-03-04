import { buildApiTargets } from './apiBase'

const wait = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, ms)
})

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs = 70000): Promise<Response> => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

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
  retrofitPlan: {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  }
  safetyNote: string
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
  const maxAttemptsPerTarget = 3

  for (const target of targets) {
    for (let attempt = 1; attempt <= maxAttemptsPerTarget; attempt += 1) {
      try {
        const response = await fetchWithTimeout(target, {
          method: 'POST',
          body: formData,
        })

        const raw = await response.text()
        const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
        const isJsonResponse = contentType.includes('application/json')

        if ((response.status === 404 || response.status === 405) && !isJsonResponse) {
          lastError = new Error(`Vision route unavailable on ${target} (${response.status})`)
          break
        }

        if (!isJsonResponse) {
          lastError = new Error(`Vision API returned non-JSON response (${response.status}) from ${target}.`)
          break
        }

        let body: VisionAnalysisResult | { error?: string } | null = null

        try {
          body = JSON.parse(raw) as VisionAnalysisResult | { error?: string }
        } catch {
          lastError = new Error(response.ok ? 'Vision API returned invalid JSON response.' : `Vision API returned non-JSON response (${response.status}).`)
          break
        }

        if (!response.ok) {
          const apiError = (body as { error?: string }).error ?? 'Vision analysis failed'
          const isHardQuota = /insufficient_quota|quota|billing|hard\s*limit/i.test(apiError)
          const isRateLimit = /rate\s*limit|too\s*many\s*requests|429/i.test(apiError)

          if (response.status === 429 && isRateLimit && !isHardQuota && attempt < maxAttemptsPerTarget) {
            await wait(800 * attempt)
            continue
          }

          if (response.status === 429 && isHardQuota) {
            throw new Error('OpenAI quota exceeded for current key. Please add billing/credits or switch to a funded key.')
          }

          throw new Error(apiError)
        }

        return body as VisionAnalysisResult
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Vision API request failed')

        const isNetworkError = /failed to fetch|network|timeout/i.test(lastError.message)
        if (attempt < maxAttemptsPerTarget && isNetworkError) {
          await wait(600 * attempt)
          continue
        }
      }
    }
  }

  throw lastError ?? new Error('Vision API request failed')
}
