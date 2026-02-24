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

export default function GlobalEarthquakeGlobe({ earthquakes, focusToken = 0 }: GlobalEarthquakeGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const globeRef = useRef<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [size, setSize] = useState({ width: 920, height: 420 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateSize = () => {
      const width = Math.max(320, Math.floor(container.clientWidth))
      const height = Math.max(320, Math.floor(Math.min(560, width * 0.55)))
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
      globeRef.current.pointOfView({ lat: 20, lng: 15, altitude: 2.3 }, 700)
      return
    }

    const latest = earthquakes[0]
    globeRef.current.pointOfView(
      {
        lat: latest.lat,
        lng: latest.lng,
        altitude: 1.7,
      },
      900,
    )
  }, [earthquakes, focusToken])

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

  const handleToggleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await container.requestFullscreen()
  }

  return (
    <div ref={containerRef} className={`earthquake-globe-wrap${isFullscreen ? ' earthquake-globe-wrap-fullscreen' : ''}`}>
      <div className="earthquake-globe-head">
        <h4>🌐 Live Earthquake Globe</h4>
        <button onClick={handleToggleFullscreen}>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</button>
      </div>
      <div className="earthquake-globe-stage">
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere
          atmosphereColor="#6aa4ff"
          atmosphereAltitude={0.18}
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointAltitude="altitude"
          pointRadius="radius"
          pointColor="color"
          pointLabel="label"
        />
      </div>
    </div>
  )
}
