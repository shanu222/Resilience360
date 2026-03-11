import { Link } from "react-router";
import { MapPin, Package, TrendingUp, Users, Shield, GraduationCap, Building2, AlertCircle } from "lucide-react";
import { useLiveHubData } from "../../hooks/useLiveHubData";

export function HomePage() {
  const { hubs, isLoading, error } = useLiveHubData();
  const totalCapacity = hubs.reduce((sum, hub) => sum + hub.capacity, 0);
  const avgStockPercentage = hubs.length > 0
    ? Math.round(hubs.reduce((sum, hub) => sum + hub.stockPercentage, 0) / hubs.length)
    : 0;
  const readyCount = hubs.filter((hub) => hub.status === 'ready').length;
  const moderateCount = hubs.filter((hub) => hub.status === 'moderate').length;
  const criticalCount = hubs.filter((hub) => hub.status === 'critical').length;
  const readyPercentage = hubs.length > 0 ? Math.round((readyCount / hubs.length) * 100) : 0;
  const moderatePercentage = hubs.length > 0 ? Math.round((moderateCount / hubs.length) * 100) : 0;
  const criticalPercentage = hubs.length > 0 ? Math.round((criticalCount / hubs.length) * 100) : 0;

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-10 text-gray-600">Loading portal data...</div>;
  }

  if (error) {
    return <div className="max-w-7xl mx-auto px-4 py-10 text-red-600">{error}</div>;
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Pakistan Disaster Reconstruction Support Platform</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              National Material Hub Digital Portal
            </h1>
            
            <p className="text-xl md:text-2xl text-emerald-50 mb-8">
              Facilitating disaster preparedness, community resilience, and transparent 
              material distribution across Pakistan
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/locations"
                className="px-8 py-4 bg-white text-emerald-600 rounded-lg hover:shadow-xl transition-all text-lg font-semibold"
              >
                View Hub Locations
              </Link>
              <Link
                to="/inventory"
                className="px-8 py-4 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-all text-lg font-semibold"
              >
                Check Live Inventory
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Key Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Building2 className="h-10 w-10 text-emerald-600" />
              <span className="text-3xl font-bold text-gray-900">{hubs.length}</span>
            </div>
            <p className="text-sm text-gray-600">Active Material Hubs</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-10 w-10 text-blue-600" />
              <span className="text-3xl font-bold text-gray-900">{totalCapacity}</span>
            </div>
            <p className="text-sm text-gray-600">Homes Reconstruction Capacity</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-10 w-10 text-purple-600" />
              <span className="text-3xl font-bold text-gray-900">{avgStockPercentage}%</span>
            </div>
            <p className="text-sm text-gray-600">Average Stock Level</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <Shield className="h-10 w-10 text-orange-600" />
              <span className="text-3xl font-bold text-gray-900">{hubs.length}</span>
            </div>
            <p className="text-sm text-gray-600">Hub Status Split</p>
            <div className="mt-3 space-y-1 text-xs font-semibold">
              <div className="flex items-center justify-between text-green-700">
                <span>Ready</span>
                <span>{readyPercentage}% ({readyCount})</span>
              </div>
              <div className="flex items-center justify-between text-amber-700">
                <span>Moderate</span>
                <span>{moderatePercentage}% ({moderateCount})</span>
              </div>
              <div className="flex items-center justify-between text-red-700">
                <span>Critical</span>
                <span>{criticalPercentage}% ({criticalCount})</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disaster Readiness Index */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Disaster Readiness Index</h2>
          <p className="text-lg text-gray-600">Real-time status of material hubs across Pakistan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {hubs.map((hub) => (
            <div key={hub.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{hub.name}</h3>
                  <p className="text-sm text-gray-600">{hub.district}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  hub.status === 'ready' ? 'bg-green-100 text-green-700' :
                  hub.status === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {hub.status === 'ready' ? '🟢 Ready' :
                   hub.status === 'moderate' ? '🟡 Moderate' :
                   '🔴 Critical'}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Stock Level</span>
                    <span className="font-semibold text-gray-900">{hub.stockPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        hub.stockPercentage >= 75 ? 'bg-green-500' :
                        hub.stockPercentage >= 50 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${hub.stockPercentage}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Damage Level</span>
                    <span className="font-semibold text-gray-900">{hub.damagePercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-red-500 transition-all"
                      style={{ width: `${hub.damagePercentage}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>Capacity: {hub.capacity} homes</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What We Offer</h2>
            <p className="text-lg text-gray-600">Comprehensive disaster management and community support</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow">
              <div className="bg-emerald-100 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                <Package className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Live Inventory Tracking</h3>
              <p className="text-gray-600 mb-4">
                Real-time visibility into material stocks across all hubs with automatic alerts 
                when inventory falls below safety thresholds.
              </p>
              <Link to="/inventory" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                View Inventory →
              </Link>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow">
              <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                <GraduationCap className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Training & Certification</h3>
              <p className="text-gray-600 mb-4">
                Professional training programs on disaster-resilient construction techniques, 
                including bamboo frame installation and EPS panel fitting.
              </p>
              <Link to="/training" className="text-blue-600 hover:text-blue-700 font-semibold">
                Explore Training →
              </Link>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow">
              <div className="bg-purple-100 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                <MapPin className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Strategic Hub Locations</h3>
              <p className="text-gray-600 mb-4">
                Material hubs strategically positioned in Gilgit, Muzaffargarh, and Sukkur to 
                ensure rapid response to disasters across regions.
              </p>
              <Link to="/locations" className="text-purple-600 hover:text-purple-700 font-semibold">
                View Map →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-br from-emerald-600 to-blue-600 rounded-2xl p-8 md:p-12 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0 md:pr-8">
              <h2 className="text-3xl font-bold mb-4">Need Disaster Relief Materials?</h2>
              <p className="text-emerald-50 text-lg">
                PDMAs can submit requests through our digital issuance workflow for fast-tracked approval and dispatch.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                to="/admin"
                className="px-8 py-4 bg-white text-emerald-600 rounded-lg hover:shadow-xl transition-all text-lg font-semibold inline-block"
              >
                Access Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Alert Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-amber-900 mb-2">Transparency Notice</h3>
              <p className="text-sm text-amber-800">
                All data on this portal is updated in real-time to ensure maximum transparency 
                and accountability. Stock levels below 75% trigger automatic alerts to NDMA headquarters 
                for replenishment as per the Issuance SOP.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
