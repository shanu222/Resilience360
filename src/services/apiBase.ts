const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

const configuredApiBase = String(import.meta.env.VITE_API_BASE_URL ?? '').trim()
const normalizedApiBase = configuredApiBase ? stripTrailingSlash(configuredApiBase) : ''
const localBackendFallback = 'http://localhost:8787'
const productionBackendFallback = 'https://resilience360-backend.onrender.com'

export const buildApiUrl = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new Error(`API path must start with '/': ${path}`)
  }

  if (!normalizedApiBase) return path
  return `${normalizedApiBase}${path}`
}

export const buildApiTargets = (path: string): string[] => {
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
