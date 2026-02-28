import { useState } from "react"
import { useNavigate } from "react-router"
import { Upload, Camera, MapPin, Zap, Shield, TrendingUp, Clock, Edit2, CheckCircle, AlertCircle, Loader2, Search } from "lucide-react"
import { motion } from "motion/react"
import { useAppContext, type CityRateConfiguration } from "../context/AppContext"
import { analyzeBuildingWithVision } from "../services/retrofitApi"
import { getCurrentPosition, getLocationFromIP, getCityRates, pakistaniCities } from "../services/geolocationService"

export function Dashboard() {
  const navigate = useNavigate()
  const { 
    selectedFile, 
    setSelectedFile, 
    imagePreview, 
    setImagePreview,
    location, 
    setLocation,
    cityRates,
    setCityRates,
    isAnalyzing,
    setIsAnalyzing,
    analysisError,
    setAnalysisError,
    setDetectionData,
    setManualAnnotation,
    setFormData,
    setActiveEstimate,
  } = useAppContext()
  
  const [dragActive, setDragActive] = useState(false)
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
      let locationResult
      try {
        locationResult = await getCurrentPosition()
      } catch (gpsError) {
        console.warn("GPS detection failed, using IP fallback:", gpsError)
        locationResult = await getLocationFromIP()
      }

      const cityName = `${locationResult.city}, Pakistan`
      setLocation(cityName)

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
    }
  }
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const updateSelectedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setAnalysisError("Please upload a valid image file.")
      return
    }

    setAnalysisError(null)
    setSelectedFile(file)
    setActiveEstimate(null)
    setManualAnnotation(null)

    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      updateSelectedFile(e.dataTransfer.files[0])
    }
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      updateSelectedFile(e.target.files[0])
    }
  }

  const normalizeSeverity = (severity: "low" | "medium" | "high") => {
    if (severity === "high") return "High"
    if (severity === "medium") return "Moderate"
    return "Low"
  }
  
  const handleAnalyze = async () => {
    if (!selectedFile) {
      setAnalysisError("Upload an image to start AI analysis.")
      return
    }

    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      const vision = await analyzeBuildingWithVision({
        image: selectedFile,
        structureType: "RC Frame",
        province: "Punjab",
        location,
        riskProfile: "Urban retrofit assessment",
      })

      const primaryDefect = vision.defects[0]

      setDetectionData({
        elementType: primaryDefect?.location || "Structural Element",
        defectType: primaryDefect?.type || "other",
        severity: normalizeSeverity(primaryDefect?.severity ?? "medium"),
        confidence: Math.round((primaryDefect?.confidence ?? 0.75) * 100),
        summary: vision.summary,
      })

      setFormData({
        widthCm: 45,
        depthCm: 45,
        heightCm: 300,
        damageExtent: Math.min(100, Math.max(5, Math.round(vision.costSignals?.estimatedAffectedAreaPercent ?? 25))),
        materialType: "Reinforced Concrete",
        floorLevel: "Ground",
        tightAccess: false,
        occupied: false,
        scaffolding: true,
        retrofitLevel:
          vision.costSignals?.recommendedScope === "comprehensive"
            ? "seismic"
            : vision.costSignals?.recommendedScope === "basic"
              ? "cosmetic"
              : "structural",
      })

      navigate("/detection")
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI analysis failed"
      setAnalysisError(message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const rateFields = editedRates ? [
    { label: "Surface Preparation Rate", value: editedRates.surfacePreparationRate, key: "surfacePreparationRate" as const, unit: "PKR/m²" },
    { label: "Epoxy Injection Rate", value: editedRates.epoxyInjectionRate, key: "epoxyInjectionRate" as const, unit: "PKR/m" },
    { label: "RC Jacketing Rate", value: editedRates.rcJacketingRate, key: "rcJacketingRate" as const, unit: "PKR/m³" },
    { label: "Skilled Labor Rate", value: editedRates.skilledLaborRate, key: "skilledLaborRate" as const, unit: "PKR/hr" },
  ] : []

  // STAGE 1: Location Selection and Rate Configuration
  if (!cityRates || !cityRates.isConfirmed) {
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
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]" style={{ zIndex: 0 }} />
        
        <div className="relative" style={{ zIndex: 1 }}>
          <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] border-b border-blue-600 shadow-lg">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <h1 className="text-white text-3xl font-bold tracking-tight mb-2">Retrofit Cost Configuration</h1>
              <p className="text-blue-100 text-base">Set your location and confirm retrofit rates before assessment</p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  // STAGE 2: Image Upload (after rates confirmed)
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
      <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]" style={{ zIndex: 0 }} />
      
      <div className="relative" style={{ zIndex: 1 }}>
        <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-[#0F172A] text-[24px] sm:text-[28px] font-semibold tracking-tight mb-2">
                AI-Powered Retrofit Assessment
              </h1>
              <p className="text-slate-600 text-[15px]">
                Upload structural defect images for instant cost estimation and analysis
              </p>
            </motion.div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8"
              >
                <div
                  className={`border-2 border-dashed rounded-xl p-6 sm:p-10 lg:p-12 text-center transition-all duration-200 ${
                    dragActive
                      ? "border-[#2563EB] bg-blue-50/50"
                      : selectedFile
                      ? "border-green-500 bg-green-50/30"
                      : "border-slate-300 hover:border-[#2563EB] hover:bg-slate-50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {imagePreview ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative"
                    >
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-72 sm:max-h-96 mx-auto rounded-lg shadow-lg border border-slate-200"
                      />
                      <div className="absolute top-3 right-3 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
                        ✓ Ready to analyze
                      </div>
                    </motion.div>
                  ) : (
                    <div>
                      <div className="flex justify-center mb-6">
                        <div className="p-6 bg-slate-100 rounded-2xl">
                          <Camera className="w-12 h-12 text-slate-600" strokeWidth={2} />
                        </div>
                      </div>
                      <h3 className="text-[17px] font-semibold text-[#0F172A] mb-2">
                        Upload Structural Defect Image
                      </h3>
                      <p className="text-slate-500 text-[15px] mb-4">
                        Supports: Columns, Beams, Slabs, Walls
                      </p>
                      <p className="text-[#2563EB] text-sm font-medium">
                        Drag and drop or click to browse
                      </p>
                    </div>
                  )}
                  
                  <label className="inline-block mt-6">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <motion.span 
                      className="px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg cursor-pointer inline-flex items-center gap-2 shadow-sm transition-all text-[15px] font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Upload className="w-4 h-4" />
                      {selectedFile ? "Change Image" : "Select Image"}
                    </motion.span>
                  </label>
                  
                  {selectedFile && (
                    <motion.p 
                      className="mt-4 text-sm text-slate-600 font-medium"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {selectedFile.name}
                    </motion.p>
                  )}
                </div>
                
                <div className="mt-6">
                  <label className="block text-[15px] font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    Project Location: {location}
                  </label>
                  <button
                    onClick={() => setCityRates(null)}
                    className="px-4 py-2 text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm border border-[#2563EB]"
                  >
                    Change Location & Rates
                  </button>
                  <p className="mt-2 text-xs text-slate-500">
                    Location: {location} • Multiplier: {cityRates?.locationMultiplier}×
                  </p>
                </div>
                
                <motion.button
                  onClick={handleAnalyze}
                  disabled={!selectedFile || isAnalyzing}
                  className={`w-full mt-6 px-6 py-4 rounded-lg text-white text-[15px] font-medium transition-all shadow-sm ${
                    selectedFile && !isAnalyzing
                      ? "bg-[#2563EB] hover:bg-[#1D4ED8] shadow-blue-900/10"
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                  whileHover={selectedFile && !isAnalyzing ? { scale: 1.01 } : {}}
                  whileTap={selectedFile && !isAnalyzing ? { scale: 0.99 } : {}}
                >
                  {isAnalyzing ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Analyzing with AI...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Zap className="w-5 h-5" />
                      <span>Start AI Analysis</span>
                    </div>
                  )}
                </motion.button>
                {analysisError && (
                  <p className="mt-3 text-sm text-red-600">{analysisError}</p>
                )}
              </motion.div>
            </div>
            
            <div className="space-y-6">
              <motion.div
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Shield className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#0F172A]">System Performance</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="pb-4 border-b border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Analyzer Status</span>
                      <span className="text-lg font-semibold text-[#0F172A]">
                        {isAnalyzing ? "Running" : "Ready"}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Current File</span>
                      <span className="text-sm font-semibold text-[#0F172A] truncate max-w-[140px]">
                        {selectedFile?.name ?? "Not selected"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                className="bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-xl shadow-sm p-6 text-white"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5" />
                  <h3 className="text-[16px] font-semibold">Quick Facts</h3>
                </div>
                <ul className="space-y-3 text-sm text-blue-50">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-200 mt-0.5">•</span>
                    <span>Analysis uses your uploaded image and live backend inference</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-200 mt-0.5">•</span>
                    <span>Location-sensitive costing is applied in next steps</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-200 mt-0.5">•</span>
                    <span>Final report can be downloaded and shared</span>
                  </li>
                </ul>
              </motion.div>
              
              <motion.div
                className="bg-amber-50 border border-amber-200 rounded-xl p-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 mb-1">Best Practices</p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Capture clear images with good lighting and include reference objects for scale
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
