import { buildApiTargets } from './apiBase'
import type { InfraModel } from './infraModels'

type JsonError = { error?: string }

const fetchJsonWithFallback = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const targets = buildApiTargets(path)
  let lastError: Error | null = null
  let lastJsonError: Error | null = null

  for (const target of targets) {
    try {
      const response = await fetch(target, init)
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      const isJson = contentType.includes('application/json')

      if (!response.ok) {
        if (!isJson) {
          lastError = new Error(`Route unavailable on ${target} (${response.status})`)
          continue
        }

        const body = (await response.json().catch(() => ({}))) as JsonError
        lastJsonError = new Error(body.error ?? `Request failed (${response.status}).`)
        continue
      }

      if (!isJson) {
        lastError = new Error(`Unexpected non-JSON response from ${target}`)
        continue
      }

      return (await response.json()) as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Network request failed')
    }
  }

  throw lastJsonError ?? lastError ?? new Error('Request failed')
}

export const fetchSharedGeneratedInfraModels = async (): Promise<InfraModel[]> => {
  const body = await fetchJsonWithFallback<{ models: InfraModel[] }>('/api/models/shared-generated')
  return Array.isArray(body.models) ? body.models : []
}

export const saveSharedGeneratedInfraModels = async (models: InfraModel[]) => {
  return fetchJsonWithFallback<{ added: number; total: number; models: InfraModel[] }>('/api/models/shared-generated', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ models }),
  })
}

export const syncSharedInfraModelsToGitHub = async (adminToken: string) => {
  const token = adminToken.trim()
  if (!token) {
    throw new Error('Admin token is required for GitHub sync.')
  }

  return fetchJsonWithFallback<{ committed: boolean; pushed: boolean; branch?: string; message: string }>(
    '/api/models/shared-generated/sync-github',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    },
  )
}
