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

const toSvgDataUrl = (title: string, subtitle: string): string => {
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const safeSubtitle = subtitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" fill="#eef5fc"/><rect x="40" y="40" width="1120" height="130" rx="14" fill="#ffffff"/><text x="75" y="96" font-size="40" font-family="Arial" font-weight="700" fill="#1b4367">${safeTitle}</text><text x="75" y="138" font-size="24" font-family="Arial" fill="#315f84">${safeSubtitle}</text><rect x="72" y="210" width="1056" height="500" rx="14" fill="#d6e7f6"/><text x="102" y="274" font-size="28" font-family="Arial" fill="#1f4b70">AI-guided construction step visual</text></svg>`
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

const buildLocalGuidanceFallback = (payload: {
  province: string
  city: string
  hazard: 'flood' | 'earthquake'
  structureType: string
  bestPracticeName?: string
}): ConstructionGuidanceResult => {
  const practice = payload.bestPracticeName || 'General Resilient Construction Practice'
  const locationText = `${payload.city}, ${payload.province}`

  const floodSteps: GuidanceStep[] = [
    {
      title: 'Survey flood levels and mark safe elevations',
      description: `Map recent water marks, drainage direction, and entry points at ${locationText}. Use this to set design flood level and align works with ${practice}.`,
      keyChecks: ['Historical flood marks documented', 'Critical floor level benchmarked', 'Drainage path mapped'],
    },
    {
      title: 'Raise vulnerable plinth and protect lower envelope',
      description: `Raise/retrofit the most exposed base zones for ${payload.structureType}, focusing on splash, seepage, and inundation impacts typical in ${payload.city}.`,
      keyChecks: ['Plinth raise executed to target level', 'Damp-proof continuity verified', 'Flood-tolerant lower finishes used'],
    },
    {
      title: 'Install backflow and controlled drainage',
      description: `Add backflow controls and graded discharge so stormwater exits quickly instead of entering occupied areas, reducing repeat monsoon losses.`,
      keyChecks: ['Backflow valves pressure-tested', 'Drain gradients validated', 'Outflow path unobstructed'],
    },
    {
      title: 'Elevate utilities and secure lifelines',
      description: `Move electrical controls, pumps, and critical services above expected flood depth to improve post-event recovery speed for ${locationText}.`,
      keyChecks: ['Panels and controls elevated', 'Isolation points accessible', 'Restart checklist prepared'],
    },
    {
      title: 'Run community readiness and maintenance drills',
      description: `Create pre-monsoon inspection and response drills so interventions remain functional through the season and stay aligned with ${practice}.`,
      keyChecks: ['Seasonal inspection plan active', 'Barrier/pump drill completed', 'Responsible team assigned'],
    },
  ]

  const earthquakeSteps: GuidanceStep[] = [
    {
      title: 'Screen critical bays and failure-prone components',
      description: `Identify weak storeys, discontinuities, and fragile elements for ${payload.structureType} in ${locationText} before selecting retrofit sequence under ${practice}.`,
      keyChecks: ['Critical bays identified', 'Irregularities documented', 'Priority zones ranked'],
    },
    {
      title: 'Improve confinement and load path continuity',
      description: `Strengthen wall/frame continuity using bands, ties, and anchorage so lateral loads transfer safely instead of concentrating at brittle points.`,
      keyChecks: ['Bands/ties continuous', 'Anchorage spacing compliant', 'Openings detailed correctly'],
    },
    {
      title: 'Retrofit weak joints and soft-storey zones',
      description: `Apply jacketing or equivalent strengthening at weak joints and storeys to reduce drift concentration and collapse probability in local shaking scenarios.`,
      keyChecks: ['Weak joints retrofitted', 'Drift control strategy applied', 'Curing/QA records maintained'],
    },
    {
      title: 'Secure non-structural hazards',
      description: `Anchor parapets, ceilings, equipment, and service lines to reduce injury and downtime after moderate-to-strong events in ${payload.city}.`,
      keyChecks: ['Parapets restrained', 'Equipment anchored', 'Utility supports verified'],
    },
    {
      title: 'Stage drills and post-event inspection protocol',
      description: `Set up occupancy-safe re-entry checks, emergency drills, and phased follow-up inspections to keep resilience improvements operational.`,
      keyChecks: ['Drill completed', 'Rapid inspection checklist ready', 'Engineer sign-off workflow defined'],
    },
  ]

  return {
    summary: `AI guidance fallback generated for ${payload.structureType} in ${locationText} with hazard focus on ${payload.hazard}. This guidance is location-wise and deep-research oriented, prioritizing practical sequencing, field checks, and resilience outcomes for Pakistan conditions.`,
    materials:
      payload.hazard === 'flood'
        ? [
            'Flood-tolerant render and damp-proof materials',
            'Backflow valves and drainage fittings',
            'Raised utility mounting hardware',
            'Non-shrink repair mortar and crack sealants',
            'Graded aggregate for drainage correction',
          ]
        : [
            'Ductile reinforcement steel and confinement ties',
            'Polymer-modified retrofit mortar',
            'Anchorage hardware for roof/non-structural elements',
            'Non-shrink grout for joint strengthening',
            'Inspection markers and QA documentation kit',
          ],
    safety: [
      'Isolate occupied zones and enforce PPE for all retrofit stages.',
      'Use stage-wise engineer verification before proceeding to next step.',
      'Maintain emergency access and evacuation routes throughout works.',
    ],
    steps: payload.hazard === 'flood' ? floodSteps : earthquakeSteps,
  }
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
  try {
    const response = await postJsonWithFallback('/api/guidance/construction', payload)
    return await parseJsonResponse<ConstructionGuidanceResult>(response, 'Construction guidance generation failed')
  } catch {
    return buildLocalGuidanceFallback(payload)
  }
}

export const generateGuidanceStepImages = async (payload: {
  province: string
  city: string
  hazard: 'flood' | 'earthquake'
  structureType: string
  bestPracticeName?: string
  steps: GuidanceStep[]
}): Promise<{ images: GuidanceStepImage[] }> => {
  try {
    const response = await postJsonWithFallback('/api/guidance/step-images', payload)
    return await parseJsonResponse<{ images: GuidanceStepImage[] }>(response, 'Construction image generation failed')
  } catch {
    const subtitle = `${payload.city}, ${payload.province} · ${payload.hazard} · ${payload.structureType}`
    const images = payload.steps.map((step) => ({
      stepTitle: step.title,
      prompt: `AI fallback visual for ${step.title} in ${subtitle}`,
      imageDataUrl: toSvgDataUrl(step.title, subtitle),
    }))
    return { images }
  }
}
