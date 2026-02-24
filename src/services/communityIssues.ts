import { buildApiTargets } from './apiBase'

export type CommunityIssueStatus = 'Submitted' | 'In Review' | 'In Progress' | 'Resolved' | 'Rejected'

export type CommunityIssueRecord = {
  id: string
  submittedAt: string
  category: string
  notes: string
  photoName: string
  status: CommunityIssueStatus
  lat: number | null
  lng: number | null
  province?: string
  district?: string | null
  imageUrl?: string | null
}

const postFormDataWithFallback = async <T>(path: string, formData: FormData): Promise<T> => {
  const targets = buildApiTargets(path)
  let lastError: Error | null = null

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        method: 'POST',
        body: formData,
      })

      const raw = await response.text()
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      const isJsonResponse = contentType.includes('application/json')

      if ((response.status === 404 || response.status === 405) && !isJsonResponse) {
        lastError = new Error(`Community issues route unavailable on ${target} (${response.status})`)
        continue
      }

      if (!isJsonResponse) {
        lastError = new Error(`Community issues API returned non-JSON response (${response.status}) from ${target}.`)
        continue
      }

      let body: T | { error?: string } | null = null
      try {
        body = JSON.parse(raw) as T | { error?: string }
      } catch {
        lastError = new Error(response.ok ? 'Community issues API returned invalid JSON response.' : `Community issues API returned non-JSON response (${response.status}).`)
        continue
      }

      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? 'Community issues request failed')
      }

      return body as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Community issues request failed')
    }
  }

  throw lastError ?? new Error('Community issues request failed')
}

const sendJsonWithFallback = async <T>(path: string, method: 'GET' | 'PATCH', payload?: object): Promise<T> => {
  const targets = buildApiTargets(path)
  let lastError: Error | null = null

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        method,
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      })

      const raw = await response.text()
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      const isJsonResponse = contentType.includes('application/json')

      if ((response.status === 404 || response.status === 405) && !isJsonResponse) {
        lastError = new Error(`Community issues route unavailable on ${target} (${response.status})`)
        continue
      }

      if (!isJsonResponse) {
        lastError = new Error(`Community issues API returned non-JSON response (${response.status}) from ${target}.`)
        continue
      }

      let body: T | { error?: string } | null = null
      try {
        body = JSON.parse(raw) as T | { error?: string }
      } catch {
        lastError = new Error(response.ok ? 'Community issues API returned invalid JSON response.' : `Community issues API returned non-JSON response (${response.status}).`)
        continue
      }

      if (!response.ok) {
        throw new Error((body as { error?: string }).error ?? 'Community issues request failed')
      }

      return body as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Community issues request failed')
    }
  }

  throw lastError ?? new Error('Community issues request failed')
}

export const submitCommunityIssue = async (payload: {
  image: File
  category: string
  notes: string
  lat: number | null
  lng: number | null
  province: string
  district: string | null
}): Promise<CommunityIssueRecord> => {
  const formData = new FormData()
  formData.append('image', payload.image)
  formData.append('category', payload.category)
  formData.append('notes', payload.notes)
  formData.append('lat', payload.lat === null ? '' : String(payload.lat))
  formData.append('lng', payload.lng === null ? '' : String(payload.lng))
  formData.append('province', payload.province)
  formData.append('district', payload.district ?? '')
  return postFormDataWithFallback<CommunityIssueRecord>('/api/community/issues', formData)
}

export const fetchCommunityIssues = async (): Promise<CommunityIssueRecord[]> =>
  sendJsonWithFallback<CommunityIssueRecord[]>('/api/community/issues', 'GET')

export const updateCommunityIssueStatus = async (
  issueId: string,
  status: CommunityIssueStatus,
): Promise<CommunityIssueRecord> => sendJsonWithFallback<CommunityIssueRecord>(`/api/community/issues/${encodeURIComponent(issueId)}/status`, 'PATCH', { status })
