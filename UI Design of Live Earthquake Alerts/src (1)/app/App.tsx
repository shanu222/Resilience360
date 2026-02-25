import { Activity, Maximize2, RefreshCw, Plus, Minus, Crosshair, Globe } from 'lucide-react';
import globeImage from 'figma:asset/b98b02ad93f729ea813581d50c46edec39454c8c.png';

interface EarthquakeEvent {
  country: string;
  location: string;
  magnitude: number;
  time: string;
  flag: string;
}

const earthquakeEvents: EarthquakeEvent[] = [
  { country: 'Mexico', location: 'Tooya, Texas', magnitude: 6.2, time: '10:55:50', flag: '🇲🇽' },
  { country: 'Hawaii, USA', location: 'Volcano', magnitude: 5.8, time: '10:53:41', flag: '🇺🇸' },
  { country: 'Mexico', location: 'Toyah, Texas', magnitude: 5.5, time: '10:36:55', flag: '🇲🇽' },
  { country: 'Texas, USA', location: 'Toyah, Texas', magnitude: 5.8, time: '10:13:34', flag: '🇺🇸' },
  { country: 'California, USA', location: 'Cotdillo', magnitude: 6.2, time: '10:11:16', flag: '🇺🇸' },
  { country: 'California, USA', location: 'Toms Place', magnitude: 5.5, time: '10:08:58', flag: '🇺🇸' },
  { country: 'New Mexico, USA', location: 'Whites City', magnitude: 6.0, time: '10:00:50', flag: '🇺🇸' },
];

function getMagnitudeColor(magnitude: number): string {
  if (magnitude >= 7.0) return 'bg-red-600';
  if (magnitude >= 6.0) return 'bg-red-700';
  if (magnitude >= 5.5) return 'bg-orange-600';
  if (magnitude >= 5.0) return 'bg-yellow-700';
  return 'bg-blue-500';
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-cyan-400" strokeWidth={2.5} />
          <h1 className="text-2xl font-bold">Earthquake Live Monitor</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Live Data</span>
          </div>
          <div className="text-sm text-gray-400">
            Last Updated: <span className="text-white">Just Now</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors">
            <Maximize2 className="w-4 h-4" />
            <span>Fullscreen</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar */}
        <aside className="w-[360px] p-4 space-y-4 overflow-y-auto">
          {/* Recent Activity */}
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Recent Activity</h2>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-400 mb-3">
                <span>Country</span>
                <span>Magnitude</span>
              </div>
              
              {earthquakeEvents.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-900/60 rounded-lg border border-gray-700/40 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{event.flag}</span>
                    <div>
                      <div className="font-semibold">{event.country}</div>
                      <div className="text-sm text-gray-400">{event.location}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`${getMagnitudeColor(event.magnitude)} px-3 py-1 rounded-md font-bold text-sm`}>
                      M {event.magnitude.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{event.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Magnitude Scale */}
          <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-4">Magnitude Scale</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">M &lt; 4.0</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">5.0 - 6.0</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-700 rounded-full"></div>
                  <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                  <span className="text-sm">5.0 - 6.0</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-700 rounded-full"></div>
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <span className="text-sm">&gt; 7.0</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Globe View */}
        <main className="flex-1 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src={globeImage} 
              alt="Earth Globe with Earthquake Markers"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Control Buttons */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            <button className="w-10 h-10 bg-gray-900/80 border border-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors backdrop-blur-sm">
              <Plus className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 bg-gray-900/80 border border-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors backdrop-blur-sm">
              <Minus className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 bg-gray-900/80 border border-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors backdrop-blur-sm">
              <Crosshair className="w-5 h-5" />
            </button>
          </div>

          {/* Global Statistics */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="bg-gradient-to-r from-gray-900/90 to-gray-800/90 rounded-xl p-4 border border-gray-700/50 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">
                      <span className="font-semibold">Global Statistics</span>{' '}
                      <span className="text-blue-400">(24h)</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Total Events</div>
                      <div className="text-3xl font-bold">1,247</div>
                    </div>
                    
                    <div className="w-px h-12 bg-gray-700"></div>
                    
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Avg. Magnitude</div>
                      <div className="text-3xl font-bold text-blue-400">4.3</div>
                    </div>
                    
                    <div className="w-px h-12 bg-gray-700"></div>
                    
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Largest</div>
                      <div className="text-3xl font-bold bg-red-700 px-3 py-1 rounded-md inline-block">
                        M 6.2
                      </div>
                    </div>
                    
                    <div className="w-px h-12 bg-gray-700"></div>
                    
                    <div className="flex items-center gap-2">
                      <Globe className="w-8 h-8 text-blue-400" />
                      <div>
                        <div className="text-3xl font-bold">32</div>
                        <div className="text-xs text-gray-400">Countries</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* World Map Thumbnail */}
                <div className="w-48 h-24 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent"></div>
                  {/* Simple world map representation */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-xs text-gray-600">World Map</div>
                  </div>
                  {/* Dots representing earthquakes */}
                  <div className="absolute top-1/3 left-1/4 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
