import { MapPin, Package, TrendingUp, AlertCircle } from "lucide-react";
import { useLiveHubData } from "../../hooks/useLiveHubData";

export function HubLocations() {
  const { hubs, inventory, isLoading, error } = useLiveHubData();
  const totalCapacity = hubs.reduce((sum, hub) => sum + hub.capacity, 0);

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-10 text-gray-600">Loading hub locations...</div>;
  }

  if (error) {
    return <div className="max-w-7xl mx-auto px-4 py-10 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Material Hub Locations</h1>
        <p className="text-xl text-gray-600">
          Strategic hubs positioned across Pakistan for rapid disaster response
        </p>
      </div>

      {/* Map Placeholder */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-8 mb-12 border-2 border-gray-200 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-emerald-600 rounded-full"></div>
          <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-blue-600 rounded-full"></div>
          <div className="absolute bottom-1/4 left-1/2 w-16 h-16 bg-purple-600 rounded-full"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-6">
            <MapPin className="h-12 w-12 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Interactive Map View
          </h3>
          <p className="text-center text-gray-600 max-w-2xl mx-auto mb-8">
            Material hubs are strategically located in Gilgit-Baltistan, Punjab, and Sindh 
            provinces to ensure comprehensive coverage and rapid response capabilities.
          </p>
          
          {/* Coordinates Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {hubs.map((hub) => (
              <div key={hub.id} className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-md">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  <h4 className="font-bold text-gray-900">{hub.location}</h4>
                </div>
                <p className="text-xs text-gray-600">
                  Coordinates: {hub.latitude.toFixed(4)}°N, {hub.longitude.toFixed(4)}°E
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hub Details */}
      <div className="space-y-6">
        {hubs.map((hub) => {
          const hubInventory = inventory.find((item) => item.hubId === hub.id);
          const activeMaterialTypes = hubInventory?.materials.length ?? 0;

          return (
          <div key={hub.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* Main Info */}
              <div className="lg:col-span-2 p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{hub.name}</h2>
                    <p className="text-gray-600 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {hub.location}, {hub.district}
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    hub.status === 'ready' ? 'bg-green-100 text-green-700' :
                    hub.status === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {hub.status === 'ready' ? '🟢 Fully Ready' :
                     hub.status === 'moderate' ? '🟡 Moderate' :
                     '🔴 Critical'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Package className="h-4 w-4 mr-2" />
                      Stock Level
                    </div>
                    <div className="flex items-end space-x-2">
                      <span className="text-3xl font-bold text-gray-900">{hub.stockPercentage}%</span>
                      {hub.stockPercentage < 75 && (
                        <span className="text-sm text-amber-600 font-semibold mb-1">
                          ⚠️ Below threshold
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${
                          hub.stockPercentage >= 75 ? 'bg-green-500' :
                          hub.stockPercentage >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${hub.stockPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Damage Rate
                    </div>
                    <div className="flex items-end space-x-2">
                      <span className="text-3xl font-bold text-gray-900">{hub.damagePercentage}%</span>
                      {hub.damagePercentage > 10 && (
                        <span className="text-sm text-red-600 font-semibold mb-1">
                          ⚠️ High damage
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                      <div 
                        className="h-3 rounded-full bg-red-500 transition-all"
                        style={{ width: `${hub.damagePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Coverage Area</h3>
                  <div className="flex flex-wrap gap-2">
                    {hub.id.startsWith('gb') && ['Gupis', 'Yasin', 'Darel', 'Tangir', 'Ghizer'].map((area) => (
                      <span key={area} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                        {area}
                      </span>
                    ))}
                    {hub.id.startsWith('mzg') && ['Muzaffargarh City', 'Kot Addu', 'Alipur', 'Jatoi'].map((area) => (
                      <span key={area} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        {area}
                      </span>
                    ))}
                    {hub.id.startsWith('sukkur') && ['Sukkur City', 'Rohri', 'Pano Aqil', 'New Sukkur'].map((area) => (
                      <span key={area} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats Sidebar */}
              <div className="bg-gray-50 p-8 border-l border-gray-200">
                <h3 className="font-bold text-gray-900 mb-6">Quick Stats</h3>
                
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">Reconstruction Capacity</div>
                    <div className="text-2xl font-bold text-gray-900">{hub.capacity}</div>
                    <div className="text-xs text-gray-500">homes</div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">Response Readiness</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {hub.status === 'ready' ? '24/7' : hub.status === 'moderate' ? '16/7' : '8/5'}
                    </div>
                    <div className="text-xs text-gray-500">operational</div>
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-sm text-gray-600 mb-1">Active Materials</div>
                    <div className="text-2xl font-bold text-gray-900">{activeMaterialTypes}</div>
                    <div className="text-xs text-gray-500">types</div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <a 
                    href={`https://maps.google.com/?q=${hub.latitude},${hub.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Open in Maps</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Impact Areas Section */}
      <div className="mt-12 bg-gradient-to-br from-emerald-600 to-blue-600 rounded-2xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-4">Strategic Impact</h2>
        <p className="text-emerald-50 mb-6">
          Our material hubs are strategically positioned to provide rapid response capabilities 
          across multiple provinces, ensuring that disaster-affected communities receive timely support.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-3xl font-bold mb-2">{totalCapacity}</div>
            <div className="text-emerald-50">Total Homes Capacity</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-3xl font-bold mb-2">3</div>
            <div className="text-emerald-50">Provinces Covered</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-3xl font-bold mb-2">24/7</div>
            <div className="text-emerald-50">Emergency Response</div>
          </div>
        </div>
      </div>
    </div>
  );
}
