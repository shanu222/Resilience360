import { buildApiTargets } from './apiBase'

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs = 70000): Promise<Response> => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

export type InfraModel = {
  id: string
  title: string
  description: string
  features: string[]
  advantagesPakistan: string[]
  imageDataUrl: string
}

const postJsonWithFallback = async (path: string, payload: object): Promise<Response> => {
  const targets = buildApiTargets(path)
  let lastError: Error | null = null
  let lastJsonErrorResponse: Response | null = null

  for (const target of targets) {
    try {
      const response = await fetchWithTimeout(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
      const isJson = contentType.includes('application/json')

      if (response.ok && isJson) {
        return response
      }

      if (response.status === 404 || response.status === 405 || !isJson) {
        lastError = new Error(`Route unavailable on ${target} (${response.status})`)
        continue
      }

      lastJsonErrorResponse = response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Network request failed')
    }
  }

  if (lastJsonErrorResponse) {
    return lastJsonErrorResponse
  }

  throw lastError ?? new Error('Infra model request failed')
}

const fallbackModelSpecs: Omit<InfraModel, 'imageDataUrl'>[] = [
  {
    id: 'flood-housing-cluster',
    title: 'Elevated Flood-Resilient Housing Cluster',
    description: 'Raised plinth housing with drainage and utility protection for flood-prone districts.',
    features: [
      'Raised plinth and flood-compatible lower storey',
      'Backflow prevention and pumped drainage',
      'Elevated power/water utility routing',
    ],
    advantagesPakistan: [
      'Reduces annual flood repair burden in Sindh and South Punjab',
      'Improves post-flood occupancy recovery',
      'Supports district-level resilience investments',
    ],
  },
  {
    id: 'seismic-school-retrofit',
    title: 'Ductile Seismic School Retrofit Model',
    description: 'School retrofit package using jacketing and confinement to improve life safety in seismic zones.',
    features: ['Column and beam strengthening', 'Masonry confinement and anchorage', 'Non-structural hazard control'],
    advantagesPakistan: [
      'Cuts collapse risk in KP and GB schools',
      'Improves service continuity after earthquakes',
      'Fits phased public retrofit funding',
    ],
  },
  {
    id: 'bridge-approach-protection',
    title: 'Bridge Approach Resilience Model',
    description: 'Embankment stabilization with scour and seismic protection for transport continuity.',
    features: ['Toe protection and subsurface drainage', 'Joint restrainers and bearing upgrades', 'Slope erosion control'],
    advantagesPakistan: [
      'Reduces emergency road closures',
      'Protects evacuation and trade routes',
      'Lowers maintenance lifecycle cost',
    ],
  },
  {
    id: 'community-shelter-hub',
    title: 'Community Shelter & Warning Hub Model',
    description: 'Multi-hazard shelter with hardened core and integrated warning/response support.',
    features: ['Resilient structural core', 'Emergency power/water/communications', 'Accessible evacuation layout'],
    advantagesPakistan: [
      'Strengthens last-mile readiness',
      'Improves district emergency coordination',
      'Provides useful public-space function year-round',
    ],
  },
]

const practicalModelImagePool = [
  new URL('../assets/infra-models/flood-housing-cluster-pk.jpg', import.meta.url).toString(),
  new URL('../assets/infra-models/seismic-school-block-pk.jpg', import.meta.url).toString(),
  new URL('../assets/infra-models/bridge-approach-resilience-pk.jpg', import.meta.url).toString(),
  new URL('../assets/infra-models/community-shelter-hub-pk.jpg', import.meta.url).toString(),
  new URL('../assets/infra-models/flood-health-post-pk.jpg', import.meta.url).toString(),
  new URL('../assets/infra-models/lifeline-utility-corridor-pk.jpg', import.meta.url).toString(),
  new URL('../assets/infra-models/sponge-street-drainage-pk.jpg', import.meta.url).toString(),
  new URL('../assets/infra-models/resilient-waterpoint-pk.jpg', import.meta.url).toString(),
]

const practicalPakistanModelSpecs: Omit<InfraModel, 'imageDataUrl'>[] = [
  {
    id: 'pk-flood-elevated-housing-cluster',
    title: 'Pakistan Elevated Flood Housing Cluster',
    description: 'Raised plinth neighborhood layout for recurrent flood districts in Sindh and South Punjab.',
    features: ['Raised plinth and flood-safe entries', 'Backflow-protected drains', 'Elevated power + water routing'],
    advantagesPakistan: ['Reduces flood damage recovery cost', 'Improves safe re-occupancy time', 'Fits district flood mitigation plans'],
  },
  {
    id: 'pk-seismic-school-block-retrofit',
    title: 'Pakistan Seismic School Block Retrofit',
    description: 'Practical retrofit package for school safety in high seismic zones of KP, GB, and AJK.',
    features: ['Column/beam jacketing', 'Masonry confinement bands', 'Ceiling and parapet anchorage'],
    advantagesPakistan: ['Improves student life safety', 'Supports phased retrofit budgeting', 'Minimizes post-event service downtime'],
  },
  {
    id: 'pk-flood-health-post',
    title: 'Pakistan Flood-Resilient Health Post',
    description: 'Flood-compatible health facility with protected utility systems and raised access.',
    features: ['Raised utility room', 'Emergency water and power backup', 'Protected patient access route'],
    advantagesPakistan: ['Protects primary care services during floods', 'Supports district response operations', 'Lowers annual repair cycles'],
  },
  {
    id: 'pk-bridge-approach-hardening',
    title: 'Pakistan Bridge Approach Hardening',
    description: 'Scour and seismic hardening for bridge approaches on critical evacuation corridors.',
    features: ['Toe protection and drainage layer', 'Bearing/joint strengthening', 'Slope erosion control works'],
    advantagesPakistan: ['Keeps roads open during emergencies', 'Protects trade and relief routes', 'Reduces long-term maintenance'],
  },
  {
    id: 'pk-community-shelter-hub',
    title: 'Pakistan Community Shelter & EOC Hub',
    description: 'Multi-hazard shelter integrated with warning, triage, and emergency stock management.',
    features: ['Hardened shelter core', 'Emergency communication node', 'Accessible evacuation layout'],
    advantagesPakistan: ['Strengthens last-mile preparedness', 'Supports district command operations', 'Dual-use public facility in normal periods'],
  },
  {
    id: 'pk-lifeline-utility-corridor',
    title: 'Pakistan Lifeline Utility Corridor Upgrade',
    description: 'Seismic/flood-safe utility corridor model for electricity, telecom, and water continuity.',
    features: ['Utility anchorage and restraint', 'Flood-safe routing elevations', 'Critical junction protection'],
    advantagesPakistan: ['Reduces infrastructure downtime', 'Supports faster post-event recovery', 'Protects critical public services'],
  },
  {
    id: 'pk-sponge-street-drainage',
    title: 'Pakistan Sponge Street Drainage Model',
    description: 'Urban drainage-first street design for heavy-rainfall and waterlogging hotspots.',
    features: ['Permeable shoulder strips', 'Controlled detention and outflow', 'Drain blockage maintenance points'],
    advantagesPakistan: ['Reduces urban flood depth', 'Improves traffic continuity', 'Enhances municipal drainage performance'],
  },
  {
    id: 'pk-resilient-water-point',
    title: 'Pakistan Resilient Community Water Point',
    description: 'Flood and seismic-safe community water point with protected pumps and elevated controls.',
    features: ['Pump and electrical protection', 'Raised access platform', 'Drainage and runoff diversion'],
    advantagesPakistan: ['Improves water access in disasters', 'Protects critical local assets', 'Supports rural resilience planning'],
  },
]

const buildPracticalFallbackModels = (count = 4): InfraModel[] => {
  const seed = Date.now()
  const start = seed % practicalPakistanModelSpecs.length
  const selected = Array.from({ length: count }, (_, index) => practicalPakistanModelSpecs[(start + index) % practicalPakistanModelSpecs.length])

  return selected.map((model, index) => ({
    ...model,
    id: `${model.id}-${seed}-${index}`,
    imageDataUrl: practicalModelImagePool[(start + index) % practicalModelImagePool.length] ?? '',
  }))
}

const generateImagesFromGuidanceApi = async (payload: { country?: string; province?: string }) => {
  try {
    const imageResponse = await postJsonWithFallback('/api/guidance/step-images', {
      province: payload.province ?? 'Punjab',
      city: 'Lahore',
      hazard: 'flood and earthquake',
      structureType: 'Resilient Infrastructure',
      steps: fallbackModelSpecs.map((item) => ({
        title: item.title,
        description: `${item.description} Context: ${payload.country ?? 'Pakistan'}, ${payload.province ?? 'National'}.`,
      })),
    })

    const imageBody = await parseJsonResponse<{ images: Array<{ stepTitle: string; imageDataUrl: string }> }>(
      imageResponse,
      'Infra model image generation failed',
    )

    return fallbackModelSpecs.map((item, index) => {
      const matched = imageBody.images.find((image) => image.stepTitle === item.title) ?? imageBody.images[index]
      return {
        ...item,
        id: `${item.id}-${Date.now()}-${index}`,
        imageDataUrl: matched?.imageDataUrl ?? practicalModelImagePool[index % practicalModelImagePool.length] ?? '',
      }
    })
  } catch {
    return buildPracticalFallbackModels(4)
  }
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

export const fetchResilienceInfraModels = async (payload: {
  country?: string
  province?: string
}): Promise<{ models: InfraModel[] }> => {
  try {
    const response = await postJsonWithFallback('/api/models/resilience-catalog', payload)
    const parsed = await parseJsonResponse<{ models: InfraModel[] }>(response, 'Infra model generation failed')
    if (!Array.isArray(parsed.models) || parsed.models.length === 0) {
      return { models: buildPracticalFallbackModels(4) }
    }

    return {
      models: parsed.models.map((model, index) => ({
        ...model,
        id: `${model.id}-${Date.now()}-${index}`,
        imageDataUrl: model.imageDataUrl || practicalModelImagePool[index % practicalModelImagePool.length] || '',
      })),
    }
  } catch {
    const fallbackModels = await generateImagesFromGuidanceApi(payload)
    return { models: fallbackModels }
  }
}
