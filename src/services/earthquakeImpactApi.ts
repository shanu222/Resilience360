import { buildApiTargets } from './apiBase'

export type EarthquakeBuildingImpactRequest = {
  lat: number
  lng: number
  place: string
  radiusKm: number
  populationExposed: number
}

export type EarthquakeBuildingImpactResponse = {
  source: string
  method: string
  accuracyMode: 'WFS exact' | 'Atlas statistical fallback'
  confidence: 'High' | 'Medium' | 'Low'
  estimatedBuildings: number
  note?: string
}

export const fetchEarthquakeBuildingImpact = async (
  payload: EarthquakeBuildingImpactRequest,
): Promise<EarthquakeBuildingImpactResponse> => {
  const targets = buildApiTargets('/api/earthquake/building-impact')

  for (const target of targets) {
    try {
      const response = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        continue
      }

      const data = (await response.json()) as Partial<EarthquakeBuildingImpactResponse>
      const estimatedBuildings = Number(data.estimatedBuildings)
      if (!Number.isFinite(estimatedBuildings) || estimatedBuildings < 0) {
        continue
      }

      return {
        source: String(data.source ?? 'GlobalBuildingAtlas'),
        method: String(data.method ?? 'Atlas-calibrated estimate'),
        accuracyMode:
          data.accuracyMode === 'WFS exact' || data.accuracyMode === 'Atlas statistical fallback'
            ? data.accuracyMode
            : 'Atlas statistical fallback',
        confidence:
          data.confidence === 'High' || data.confidence === 'Medium' || data.confidence === 'Low'
            ? data.confidence
            : 'Low',
        estimatedBuildings: Math.round(estimatedBuildings),
        note: data.note ? String(data.note) : undefined,
      }
    } catch {
      // Try the next target.
    }
  }

  throw new Error('Unable to fetch atlas-based building impact estimate.')
}
