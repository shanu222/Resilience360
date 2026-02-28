import { useState } from "react"
import { useNavigate } from "react-router"
import { MapPin, Edit2, CheckCircle, AlertCircle, Loader2, Search } from "lucide-react"
import { motion } from "motion/react"
import { useAppContext, type CityRateConfiguration } from "../context/AppContext"
import { getCurrentPosition, getLocationFromIP, getCityRates, pakistaniCities } from "../services/geolocationService"

export function LocationRateSetup() {
  const navigate = useNavigate()
  const { cityRates, setCityRates, setLocation } = useAppContext()
  
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionError, setDetectionError] = useState<string | null>(null)
  const [isManualMode, setIsManualMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [editedRates, setEditedRates] = useState(cityRates)

  const filteredCities = pakistaniCities.filter(city =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleUseCurrentLocation = async () => {
    setIsDetecting(true)
    setDetectionError(null)

    try {
      // Try GPS first, fallback to IP
      let locationResult
      try {
        locationResult = await getCurrentPosition()
      } catch (gpsError) {
        console.warn("GPS detection failed, using IP fallback:", gpsError)
        locationResult = await getLocationFromIP()
      }

      const cityName = `${locationResult.city}, ${locationResult.country}`
      setLocation(cityName)

      // Fetch rates for detected city
      const rates = await getCityRates(locationResult.city, true)
      setCityRates(rates)
      setEditedRates(rates)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to detect location"
      setDetectionError(errorMessage)
    } finally {
      setIsDetecting(false)
    }
  }

  const handleManualCitySelect = async (cityName: string) => {
    setLocation(`${cityName}, Pakistan`)

    // Fetch rates for selected city
    const rates = await getCityRates(cityName, false)
    setCityRates(rates)
    setEditedRates(rates)
    setIsManualMode(false)
    setSearchQuery("")
  }

  const handleRateChange = (field: keyof CityRateConfiguration, value: number) => {
    if (editedRates) {
      setEditedRates({
        ...editedRates,
        [field]: value
      })
    }
  }

  const handleConfirmRates = () => {
    if (editedRates) {
      setCityRates({
        ...editedRates,
        isConfirmed: true
      })
      navigate("/dashboard")
    }
  }

  const rateFields = editedRates ? [
    { label: "Surface Preparation Rate", value: editedRates.surfacePreparationRate, key: "surfacePreparationRate" as const, unit: "PKR/m²" },
    { label: "Epoxy Injection Rate", value: editedRates.epoxyInjectionRate, key: "epoxyInjectionRate" as const, unit: "PKR/m" },
    { label: "RC Jacketing Rate", value: editedRates.rcJacketingRate, key: "rcJacketingRate" as const, unit: "PKR/m³" },
    { label: "Skilled Labor Rate", value: editedRates.skilledLaborRate, key: "skilledLaborRate" as const, unit: "PKR/hr" },
    { label: "Severe Surface Repair Rate", value: editedRates.severeSurfaceRepairRate, key: "severeSurfaceRepairRate" as const, unit: "PKR/m²" },
    { label: "Moderate Surface Repair Rate", value: editedRates.moderateSurfaceRepairRate, key: "moderateSurfaceRepairRate" as const, unit: "PKR/m²" },
    { label: "Low Surface Repair Rate", value: editedRates.lowSurfaceRepairRate, key: "lowSurfaceRepairRate" as const, unit: "PKR/m²" },
    { label: "Very Low Surface Repair Rate", value: editedRates.veryLowSurfaceRepairRate, key: "veryLowSurfaceRepairRate" as const, unit: "PKR/m²" },
    { label: "Location Multiplier", value: editedRates.locationMultiplier, key: "locationMultiplier" as const, unit: "×" },
    { label: "Contingency Percentage", value: editedRates.contingencyPercent, key: "contingencyPercent" as const, unit: "%" },
    { label: "Contractor Overhead Percentage", value: editedRates.overheadPercent, key: "overheadPercent" as const, unit: "%" },
    { label: "Investigation Cost", value: editedRates.investigationCost, key: "investigationCost" as const, unit: "PKR" },
    { label: "Replacement Allowance", value: editedRates.replacementAllowance, key: "replacementAllowance" as const, unit: "PKR" },
  ] : []

  return (
    <div 
      className="min-h-screen bg-[#F8FAFC] relative"
      style={{
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background overlay for better readability */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]" style={{ zIndex: 0 }} />
      
      {/* Content wrapper */}
      <div className="relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] border-b border-blue-600 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-white text-3xl font-bold tracking-tight mb-2">Retrofit Cost Configuration</h1>
            <p className="text-blue-100 text-base">Set your location and confirm retrofit rates before assessment</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Location Selection Section */}
          {!cityRates && (
            <motion.div
              className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-2xl font-bold text-[#0F172A] mb-6 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[#2563EB]" />
                Select Your Location
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Use Current Location Button */}
                <motion.button
                  onClick={handleUseCurrentLocation}
                  disabled={isDetecting}
                  className="px-6 py-8 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-3"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isDetecting ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="font-semibold text-lg">Detecting Location...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-8 h-8" />
                      <span className="font-semibold text-lg">Use My Current Location</span>
                      <span className="text-sm text-blue-100">Auto-detect using GPS/IP</span>
                    </>
                  )}
                </motion.button>

                {/* Enter Manually Button */}
                <motion.button
                  onClick={() => setIsManualMode(true)}
                  className="px-6 py-8 bg-white hover:bg-slate-50 border-2 border-[#2563EB] text-[#2563EB] rounded-xl transition-all shadow-sm hover:shadow-md flex flex-col items-center justify-center gap-3"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Edit2 className="w-8 h-8" />
                  <span className="font-semibold text-lg">Enter Location Manually</span>
                  <span className="text-sm text-slate-600">Select from list</span>
                </motion.button>
              </div>

              {detectionError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-900 mb-1">Location Detection Failed</p>
                    <p className="text-xs text-red-700">{detectionError}</p>
                  </div>
                </div>
              )}

              {/* Manual City Selection Modal */}
              {isManualMode && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 100 }}>
                  <motion.div
                    className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="p-6 border-b border-slate-200">
                      <h3 className="text-xl font-bold text-[#0F172A] mb-4">Select City</h3>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search cities..."
                          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-96 p-4">
                      {filteredCities.map((city) => (
                        <button
                          key={city}
                          onClick={() => handleManualCitySelect(city)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-lg transition-colors text-slate-700 hover:text-[#2563EB] font-medium"
                        >
                          {city}
                        </button>
                      ))}
                      {filteredCities.length === 0 && (
                        <p className="text-center text-slate-500 py-8">No cities found</p>
                      )}
                    </div>
                    <div className="p-4 border-t border-slate-200">
                      <button
                        onClick={() => {
                          setIsManualMode(false)
                          setSearchQuery("")
                        }}
                        className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* Rates Configuration Section */}
          {cityRates && !cityRates.isConfirmed && (
            <motion.div
              className="bg-white rounded-xl shadow-lg border border-slate-200 p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
                  <Edit2 className="w-6 h-6 text-[#2563EB]" />
                  Configure Retrofit Rates
                </h2>
                <span className="px-4 py-2 bg-blue-50 text-[#2563EB] rounded-lg text-sm font-semibold">
                  {cityRates.cityName}
                </span>
              </div>

              {cityRates.detectedAutomatically && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-900 mb-1">Location Auto-Detected</p>
                    <p className="text-xs text-green-700">Rates have been automatically loaded for your city. You can edit them below.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {rateFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 block">
                      {field.label}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={field.value}
                        onChange={(e) => handleRateChange(field.key, parseFloat(e.target.value) || 0)}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                        step={field.unit === "×" || field.unit === "%" ? "0.01" : "10"}
                      />
                      <span className="text-sm font-medium text-slate-600 min-w-[60px]">{field.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCityRates(null)
                    setEditedRates(null)
                  }}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
                >
                  Change Location
                </button>
                <button
                  onClick={handleConfirmRates}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white rounded-lg transition-all shadow-lg hover:shadow-xl font-semibold flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Confirm Rates & Continue
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
