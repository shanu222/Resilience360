import { useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'

type GlobalEarthquake = {
  id: string
  magnitude: number
  place: string
  time: string
  depthKm: number
  lat: number
  lng: number
  url: string
}

type GlobePoint = {
  id: string
  lat: number
  lng: number
  altitude: number
  radius: number
  color: string
  label: string
}

type GlobalEarthquakeGlobeProps = {
  earthquakes: GlobalEarthquake[]
  selectedEarthquakeId?: string | null
  onSelectEarthquake?: (id: string) => void
  onRefreshEarthquakes?: () => void
  isRefreshing?: boolean
  focusToken?: number
}

function severityColor(magnitude: number): string {
  if (magnitude >= 6) return '#b91c1c'
  if (magnitude >= 5) return '#ea580c'
  if (magnitude >= 4) return '#ca8a04'
  return '#2563eb'
}

function formatLabel(quake: GlobalEarthquake): string {
  return [
    `<strong>M ${quake.magnitude.toFixed(1)}</strong>`,
    quake.place,
    `Depth: ${quake.depthKm.toFixed(1)} km`,
    new Date(quake.time).toLocaleString(),
  ].join('<br/>')
}

export default function GlobalEarthquakeGlobe({
  earthquakes,
  selectedEarthquakeId,
  onSelectEarthquake,
  onRefreshEarthquakes,
  isRefreshing = false,
  focusToken = 0,
}: GlobalEarthquakeGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const globeRef = useRef<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [size, setSize] = useState({ width: 920, height: 540 })
  const [isBlinkOn, setIsBlinkOn] = useState(true)
  const [manualAltitude, setManualAltitude] = useState(1.2)
  const [cameraCenter, setCameraCenter] = useState({ lat: 20, lng: 15 })

  const selectedEarthquake = useMemo(
    () => earthquakes.find((quake) => quake.id === selectedEarthquakeId) ?? null,
    [earthquakes, selectedEarthquakeId],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const width = Math.max(320, Math.floor(container.clientWidth))
      const height = Math.max(360, Math.floor(Math.min(700, width * 0.52)))
      setSize({ width, height })
    }

    updateSize()

    const observer = new ResizeObserver(() => updateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement
      setIsFullscreen(Boolean(fullscreenElement && containerRef.current && fullscreenElement.contains(containerRef.current)))
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!globeRef.current) return

    if (earthquakes.length === 0) {
      const fallbackView = { lat: 20, lng: 15, altitude: 2.2 }
      setCameraCenter({ lat: fallbackView.lat, lng: fallbackView.lng })
      setManualAltitude(fallbackView.altitude)
      globeRef.current.pointOfView(fallbackView, 700)
      return
    }

    const target = selectedEarthquake ?? earthquakes[0]
    const altitude = selectedEarthquake ? 1.02 : 1.45
    setCameraCenter({ lat: target.lat, lng: target.lng })
    setManualAltitude(altitude)
    globeRef.current.pointOfView(
      {
        lat: target.lat,
        lng: target.lng,
        altitude,
      },
      900,
    )
  }, [earthquakes, selectedEarthquake, focusToken])

  useEffect(() => {
    if (!selectedEarthquake) return

    const timer = window.setInterval(() => {
      setIsBlinkOn((value) => !value)
    }, 420)

    return () => window.clearInterval(timer)
  }, [selectedEarthquake])

  const pointsData = useMemo<GlobePoint[]>(() => {
    return earthquakes.map((quake) => {
      const magnitude = Number.isFinite(quake.magnitude) ? quake.magnitude : 0
      return {
        id: quake.id,
        lat: quake.lat,
        lng: quake.lng,
        altitude: Math.max(0.01, Math.min(0.22, 0.02 + magnitude * 0.02)),
        radius: Math.max(0.08, Math.min(0.28, 0.08 + magnitude * 0.028)),
        color: severityColor(magnitude),
        label: formatLabel(quake),
      }
    })
  }, [earthquakes])

  const selectedPointData = useMemo<GlobePoint[]>(() => {
    if (!selectedEarthquake) return []

    return [
      {
        id: `selected-${selectedEarthquake.id}`,
        lat: selectedEarthquake.lat,
        lng: selectedEarthquake.lng,
        altitude: 0.24,
        radius: 0.42,
        color: isBlinkOn ? '#ff1f1f' : '#7f1d1d',
        label: `⚠️ <strong>Selected Earthquake</strong><br/>${formatLabel(selectedEarthquake)}`,
      },
    ]
  }, [isBlinkOn, selectedEarthquake])

  const ringData = useMemo(() => {
    if (!selectedEarthquake) return []
    return [selectedEarthquake]
  }, [selectedEarthquake])

  const handleToggleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await container.requestFullscreen()
  }

  const applyAltitude = (nextAltitude: number) => {
    const clamped = Math.max(0.78, Math.min(2.8, nextAltitude))
    setManualAltitude(clamped)
    globeRef.current?.pointOfView({ ...cameraCenter, altitude: clamped }, 350)
  }

  const handleZoomIn = () => {
    applyAltitude(manualAltitude - 0.2)
  }

  const handleZoomOut = () => {
    applyAltitude(manualAltitude + 0.2)
  }

  const handleResetView = () => {
    const fallback = earthquakes[0] ?? null
    const nextCenter = fallback ? { lat: fallback.lat, lng: fallback.lng } : { lat: 20, lng: 15 }
    const nextAltitude = fallback ? 1.45 : 2.2
    setCameraCenter(nextCenter)
    setManualAltitude(nextAltitude)
    globeRef.current?.pointOfView({ ...nextCenter, altitude: nextAltitude }, 650)
  }

  const latestSyncLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const countriesCount = useMemo(() => {
    const countries = new Set(
      earthquakes
        .map((quake) => quake.place.split(',').at(-1)?.trim())
        .filter((country): country is string => Boolean(country)),
    )
    return countries.size
  }, [earthquakes])

  const averageMagnitude = useMemo(() => {
    if (!earthquakes.length) return 0
    const total = earthquakes.reduce((sum, quake) => sum + quake.magnitude, 0)
    return total / earthquakes.length
  }, [earthquakes])

  const maxMagnitude = useMemo(() => {
    if (!earthquakes.length) return 0
    return Math.max(...earthquakes.map((quake) => quake.magnitude))
  }, [earthquakes])

  const countryLabel = (place: string) => place.split(',').at(-1)?.trim() || 'Global'

  const countryFlag = (label: string) => {
    const key = label.toLowerCase()
    if (key.includes('usa') || key.includes('united states')) return '🇺🇸'
    if (key.includes('mexico')) return '🇲🇽'
    if (key.includes('japan')) return '🇯🇵'
    if (key.includes('indonesia')) return '🇮🇩'
    if (key.includes('philippines')) return '🇵🇭'
    if (key.includes('turkey')) return '🇹🇷'
    if (key.includes('pakistan')) return '🇵🇰'
    if (key.includes('chile')) return '🇨🇱'
    if (key.includes('peru')) return '🇵🇪'
    if (key.includes('new zealand')) return '🇳🇿'
    return '🌍'
  }

  return (
    <div ref={containerRef} className={`earthquake-globe-wrap${isFullscreen ? ' earthquake-globe-wrap-fullscreen' : ''}`}>
      <div className="earthquake-monitor-header">
        <div className="earthquake-monitor-title">Earthquake Live Monitor</div>
        <div className="earthquake-monitor-status">
          <span className="earthquake-live-dot" />
          <span>Live Data</span>
          <small>Last Updated: Just Now</small>
        </div>
        <div className="earthquake-monitor-actions">
          <button onClick={handleToggleFullscreen}>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</button>
          <button
            onClick={() => onRefreshEarthquakes?.()}
            disabled={isRefreshing}
            className="earthquake-refresh-btn"
          >
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="earthquake-monitor-body">
        <aside className="earthquake-monitor-left">
          <div className="earthquake-activity-title">Recent Activity</div>
          <div className="earthquake-activity-head">
            <span>Country</span>
            <span>Magnitude</span>
          </div>
          <div className="earthquake-activity-list">
            {earthquakes.slice(0, 8).map((quake) => {
              const country = countryLabel(quake.place)
              const magnitudeClass =
                quake.magnitude >= 6
                  ? 'quake-entry-tier-veryhigh'
                  : quake.magnitude >= 5
                    ? 'quake-entry-tier-high'
                    : quake.magnitude >= 4
                      ? 'quake-entry-tier-medium'
                      : 'quake-entry-tier-low'

              return (
                <button
                  key={quake.id}
                  className={`earthquake-activity-row ${magnitudeClass} ${selectedEarthquakeId === quake.id ? 'selected' : ''}`}
                  onClick={() => onSelectEarthquake?.(quake.id)}
                  type="button"
                >
                  <div className="earthquake-activity-left">
                    <span className="earthquake-flag">{countryFlag(country)}</span>
                    <div>
                      <strong>{country}</strong>
                      <small>{quake.place}</small>
                    </div>
                  </div>
                  <div className="earthquake-activity-mag">
                    <strong>M {quake.magnitude.toFixed(1)}</strong>
                    <small>{new Date(quake.time).toLocaleTimeString()}</small>
                  </div>
                </button>
              )
            })}
            {earthquakes.length === 0 && <p className="earthquake-floating-empty">No global earthquakes available right now.</p>}
          </div>
        </aside>

        <div className="earthquake-monitor-globe-area">
          <div className="earthquake-globe-stage">
            <Globe
              ref={globeRef}
              width={Math.max(320, size.width - 26)}
              height={Math.max(320, size.height - 170)}
              globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundColor="rgba(0,0,0,0)"
              showAtmosphere
              atmosphereColor="#5ca8ff"
              atmosphereAltitude={0.2}
              pointsData={[...pointsData, ...selectedPointData]}
              pointLat="lat"
              pointLng="lng"
              pointAltitude="altitude"
              pointRadius="radius"
              pointColor="color"
              pointLabel="label"
              onPointClick={(point: { id?: string }) => {
                const pointId = String(point?.id ?? '')
                if (!pointId) return
                const normalizedId = pointId.startsWith('selected-') ? pointId.replace('selected-', '') : pointId
                if (onSelectEarthquake) onSelectEarthquake(normalizedId)
              }}
              ringsData={ringData}
              ringLat="lat"
              ringLng="lng"
              ringColor={() => (isBlinkOn ? '#ff2626' : '#b91c1c')}
              ringMaxRadius={3.6}
              ringPropagationSpeed={2.5}
              ringRepeatPeriod={700}
            />
          </div>

          <div className="earthquake-globe-tools">
            <button type="button" onClick={handleZoomIn} aria-label="Zoom in">
              +
            </button>
            <button type="button" onClick={handleZoomOut} aria-label="Zoom out">
              −
            </button>
            <button type="button" onClick={handleResetView} aria-label="Reset view">
              ⊗
            </button>
          </div>

          <div className="earthquake-mini-map">World View</div>
        </div>
      </div>

      <div className="earthquake-monitor-foot">
        <div className="earthquake-legend-card">
          <h5>Magnitude Scale</h5>
          <div className="earthquake-legend-row">
            <span className="earthquake-legend-dot quake-entry-tier-low">•</span>
            <span>M &lt; 4.0</span>
            <span className="earthquake-legend-dot quake-entry-tier-medium">•</span>
            <span>4.0 - 5.0</span>
            <span className="earthquake-legend-dot quake-entry-tier-high">•</span>
            <span>5.0 - 6.0</span>
            <span className="earthquake-legend-dot quake-entry-tier-veryhigh">•</span>
            <span>&gt; 6.0</span>
          </div>
        </div>
        <div className="earthquake-stats-card">
          <h5>Global Statistics (24h)</h5>
          <div className="earthquake-stats-grid">
            <div>
              <small>Total Events</small>
              <strong>{earthquakes.length}</strong>
            </div>
            <div>
              <small>Avg. Magnitude</small>
              <strong>{averageMagnitude.toFixed(1)}</strong>
            </div>
            <div>
              <small>Largest</small>
              <strong>M {maxMagnitude.toFixed(1)}</strong>
            </div>
            <div>
              <small>Locations</small>
              <strong>{countriesCount} Countries</strong>
            </div>
          </div>
          <small className="earthquake-foot-sync">Synced at {latestSyncLabel}</small>
        </div>
      </div>
    </div>
  )
}
