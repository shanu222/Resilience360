import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import centroid from '@turf/centroid'
import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { latLngBounds, type Layer } from 'leaflet'
import adm1GeoJsonUrl from '../data/pakistan-adm1.geojson?url'
import adm2GeoJsonUrl from '../data/pakistan-adm2.geojson?url'

type MapLayer = 'earthquake' | 'flood' | 'infraRisk'
type DistrictRiskLookup = Record<string, { earthquake: string; flood: string; infraRisk: string }>
type HazardAlertMarker = {
  id: string
  title: string
  type: 'Flood Warning' | 'Heavy Rain' | 'Earthquake' | 'Relief Point'
  severity: 'Low' | 'Medium' | 'High'
  advisory: string
  icon: string
  lat: number
  lng: number
}

type GlobalEarthquakeMarker = {
  id: string
  magnitude: number
  place: string
  time: string
  depthKm: number
  lat: number
  lng: number
  url: string
}

type RiskMapProps = {
  layer: MapLayer
  selectedProvince: string
  selectedDistrict: string | null
  riskByProvince: Record<string, { earthquake: string; flood: string; infraRisk: string; landslide?: string }>
  districtRiskLookup?: DistrictRiskLookup
  alertMarkers?: HazardAlertMarker[]
  globalEarthquakeMarkers?: GlobalEarthquakeMarker[]
  showGlobalEarthquakeMarkers?: boolean
  globalEarthquakeFocusToken?: number
  userLocationMarker?: { lat: number; lng: number } | null
  colorblindFriendly?: boolean
  onSelectProvince: (province: string) => void
  onSelectDistrict: (district: string | null) => void
}

type Adm1Props = {
  shapeName?: string
}

type Adm2Props = {
  shapeName?: string
}

const supportedProvinces = new Set(['Punjab', 'Sindh', 'Balochistan', 'KP', 'GB'])

const normalizeProvince = (shapeName: string): string | null => {
  const key = shapeName.trim().toLowerCase()
  if (key === 'khyber pakhtunkhwa') return 'KP'
  if (key === 'gilgit baltistan') return 'GB'
  if (key === 'punjab') return 'Punjab'
  if (key === 'sindh') return 'Sindh'
  if (key === 'balochistan') return 'Balochistan'
  return null
}

const riskColor = (risk: string, colorblindFriendly = false): string => {
  if (colorblindFriendly) {
    switch (risk) {
      case 'Very High':
        return '#7a0177'
      case 'High':
        return '#c51b8a'
      case 'Medium':
        return '#f1b6da'
      default:
        return '#b8e186'
    }
  }

  switch (risk) {
    case 'Very High':
      return '#a50026'
    case 'High':
      return '#d73027'
    case 'Medium':
      return '#fdae61'
    default:
      return '#74add1'
  }
}

function GlobalEarthquakeViewportController({
  markers,
  enabled,
  focusToken,
  allowAutoFit,
}: {
  markers: GlobalEarthquakeMarker[]
  enabled: boolean
  focusToken: number
  allowAutoFit: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (!enabled || !allowAutoFit || markers.length === 0) return

    const points = markers
      .map((marker) => [marker.lat, marker.lng] as [number, number])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng))

    if (points.length === 0) return

    map.fitBounds(latLngBounds(points).pad(0.16), {
      animate: true,
      duration: 0.8,
      maxZoom: 5,
    })
  }, [enabled, allowAutoFit, markers, focusToken, map])

  return null
}

function RiskMap({
  layer,
  selectedProvince,
  selectedDistrict,
  riskByProvince,
  districtRiskLookup,
  alertMarkers,
  globalEarthquakeMarkers,
  showGlobalEarthquakeMarkers,
  globalEarthquakeFocusToken,
  userLocationMarker,
  colorblindFriendly,
  onSelectProvince,
  onSelectDistrict,
}: RiskMapProps) {
  const [adm1GeoData, setAdm1GeoData] = useState<FeatureCollection<Geometry, Adm1Props> | null>(null)
  const [adm2GeoData, setAdm2GeoData] = useState<FeatureCollection<Geometry, Adm2Props> | null>(null)
  const [drillProvince, setDrillProvince] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedDistrict) return
    setDrillProvince(selectedProvince)
  }, [selectedDistrict, selectedProvince])

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      const [adm1Response, adm2Response] = await Promise.all([fetch(adm1GeoJsonUrl), fetch(adm2GeoJsonUrl)])
      if (!adm1Response.ok || !adm2Response.ok) {
        throw new Error('Could not load administrative GeoJSON files')
      }
      const adm1Json = (await adm1Response.json()) as FeatureCollection<Geometry, Adm1Props>
      const adm2Json = (await adm2Response.json()) as FeatureCollection<Geometry, Adm2Props>

      if (isMounted) {
        setAdm1GeoData(adm1Json)
        setAdm2GeoData(adm2Json)
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const mapping = useMemo(() => {
    if (!adm1GeoData || !adm2GeoData) {
      return {
        provinceCollection: null as FeatureCollection<Geometry, Adm1Props> | null,
        districtsByProvince: {} as Record<string, Feature<Geometry, Adm2Props>[]>,
      }
    }

    const provinceFeatures = adm1GeoData.features.filter((feature) => {
      const province = normalizeProvince(String(feature.properties?.shapeName ?? ''))
      return province ? supportedProvinces.has(province) : false
    })

    const districtsByProvince: Record<string, Feature<Geometry, Adm2Props>[]> = {
      Punjab: [],
      Sindh: [],
      Balochistan: [],
      KP: [],
      GB: [],
    }

    for (const district of adm2GeoData.features) {
      const districtCenter = centroid(district as never)
      for (const provinceFeature of provinceFeatures) {
        const provinceName = normalizeProvince(String(provinceFeature.properties?.shapeName ?? ''))
        if (!provinceName) continue

        const isInside = booleanPointInPolygon(
          districtCenter.geometry as never,
          provinceFeature.geometry as never,
        )

        if (isInside) {
          districtsByProvince[provinceName].push(district)
          break
        }
      }
    }

    return {
      provinceCollection: {
        type: 'FeatureCollection',
        features: provinceFeatures,
      } as FeatureCollection<Geometry, Adm1Props>,
      districtsByProvince,
    }
  }, [adm1GeoData, adm2GeoData])

  const districtCollection = useMemo(() => {
    if (!drillProvince) return null
    const districts = mapping.districtsByProvince[drillProvince] ?? []
    return {
      type: 'FeatureCollection',
      features: districts,
    } as FeatureCollection<Geometry, Adm2Props>
  }, [mapping.districtsByProvince, drillProvince])

  const inDistrictView = drillProvince !== null

  const recommendationRisk = riskByProvince[selectedProvince]?.[layer] ?? 'Low'

  return (
    <>
      <div className="map-toolbar">
        {!inDistrictView && <span className="map-pill">Province View</span>}
        {inDistrictView && (
          <>
            <button
              className="map-back"
              onClick={() => {
                setDrillProvince(null)
                onSelectDistrict(null)
              }}
            >
              ↩️ Back to Provinces
            </button>
            <span className="map-pill">District View: {drillProvince}</span>
          </>
        )}
      </div>

      <MapContainer center={[30.2, 69.3]} zoom={inDistrictView ? 6 : 5} className="leaflet-map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {!inDistrictView && mapping.provinceCollection && (
          <GeoJSON
            data={mapping.provinceCollection as FeatureCollection}
            style={(feature: Feature<Geometry, Adm1Props> | undefined) => {
              const shapeName = String(feature?.properties?.shapeName ?? '')
              const appProvince = normalizeProvince(shapeName)
              const risk = appProvince ? riskByProvince[appProvince]?.[layer] ?? 'Low' : 'Low'

              return {
                fillColor: riskColor(risk, colorblindFriendly),
                weight: appProvince && selectedProvince === appProvince ? 3 : 1,
                color: '#2c3e50',
                fillOpacity: 0.55,
              }
            }}
            onEachFeature={(feature: Feature<Geometry, Adm1Props>, layerRef) => {
              const shapeName = String(feature?.properties?.shapeName ?? 'Unknown')
              const appProvince = normalizeProvince(shapeName)
              const risk = appProvince ? riskByProvince[appProvince]?.[layer] ?? 'Low' : 'N/A'
              ;(layerRef as Layer).on({
                click: () => {
                  if (appProvince) {
                    onSelectProvince(appProvince)
                    onSelectDistrict(null)
                    setDrillProvince(appProvince)
                  }
                },
              })
              layerRef.bindPopup(`<strong>${shapeName}</strong><br/>${layer}: ${risk}`)
            }}
          />
        )}

        {inDistrictView && districtCollection && (
          <GeoJSON
            data={districtCollection as FeatureCollection}
            style={(feature: Feature<Geometry, Adm2Props> | undefined) => {
              const districtName = String(feature?.properties?.shapeName ?? '')
              const districtRisk = districtRiskLookup?.[districtName]?.[layer]
              return {
                fillColor: riskColor(districtRisk ?? recommendationRisk, colorblindFriendly),
                weight: selectedDistrict === districtName ? 3 : 1,
                color: '#2c3e50',
                fillOpacity: 0.52,
              }
            }}
            onEachFeature={(feature: Feature<Geometry, Adm2Props>, layerRef) => {
              const districtName = String(feature?.properties?.shapeName ?? 'Unknown district')
              const districtRisk = districtRiskLookup?.[districtName]?.[layer] ?? recommendationRisk
              ;(layerRef as Layer).on({
                click: () => {
                  onSelectDistrict(districtName)
                },
              })
              layerRef.bindPopup(
                `<strong>${districtName}</strong><br/>Province: ${drillProvince}<br/>${layer}: ${districtRisk}`,
              )
            }}
          />
        )}

        {(alertMarkers ?? []).map((alert) => (
          <CircleMarker
            key={alert.id}
            center={[alert.lat, alert.lng]}
            radius={alert.severity === 'High' ? 8 : alert.severity === 'Medium' ? 7 : 6}
            pathOptions={{ color: '#2c3e50', weight: 1, fillOpacity: 0.85 }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              {alert.icon}
            </Tooltip>
            <Popup>
              <strong>{alert.title}</strong>
              <br />
              Type: {alert.type}
              <br />
              Severity: {alert.severity}
              <br />
              {alert.advisory}
            </Popup>
          </CircleMarker>
        ))}

        {showGlobalEarthquakeMarkers &&
          (globalEarthquakeMarkers ?? []).map((quake) => {
            const magnitude = Number.isFinite(quake.magnitude) ? quake.magnitude : 0
            const markerRadius = Math.max(4, Math.min(11, 3.5 + magnitude * 0.9))
            const markerColor = magnitude >= 6 ? '#b91c1c' : magnitude >= 5 ? '#ea580c' : magnitude >= 4 ? '#ca8a04' : '#2563eb'

            return (
              <CircleMarker
                key={`global-eq-${quake.id}`}
                center={[quake.lat, quake.lng]}
                radius={markerRadius}
                pathOptions={{ color: '#1f2937', weight: 1, fillColor: markerColor, fillOpacity: 0.78 }}
              >
                <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                  M {magnitude.toFixed(1)}
                </Tooltip>
                <Popup>
                  <strong>M {magnitude.toFixed(1)}</strong>
                  <br />
                  {quake.place}
                  <br />
                  Depth: {quake.depthKm.toFixed(1)} km
                  <br />
                  {new Date(quake.time).toLocaleString()}
                  <br />
                  <a href={quake.url} target="_blank" rel="noreferrer">
                    Open details
                  </a>
                </Popup>
              </CircleMarker>
            )
          })}

        <GlobalEarthquakeViewportController
          markers={globalEarthquakeMarkers ?? []}
          enabled={Boolean(showGlobalEarthquakeMarkers)}
          focusToken={globalEarthquakeFocusToken ?? 0}
          allowAutoFit={!inDistrictView}
        />

        {userLocationMarker && (
          <CircleMarker
            center={[userLocationMarker.lat, userLocationMarker.lng]}
            radius={5}
            pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: '#1663a3', fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              📍
            </Tooltip>
            <Popup>
              <strong>Your detected location</strong>
              <br />
              {userLocationMarker.lat.toFixed(6)}, {userLocationMarker.lng.toFixed(6)}
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </>
  )
}

export default RiskMap
