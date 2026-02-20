import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'

type UserLocationMiniMapProps = {
  location: { lat: number; lng: number }
}

function UserLocationMiniMap({ location }: UserLocationMiniMapProps) {
  return (
    <MapContainer center={[location.lat, location.lng]} zoom={13} className="apply-location-map" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={[location.lat, location.lng]}
        radius={6}
        pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: '#1663a3', fillOpacity: 1 }}
      >
        <Popup>
          <strong>Your live location</strong>
          <br />
          {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </Popup>
      </CircleMarker>
    </MapContainer>
  )
}

export default UserLocationMiniMap
