import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { Upload, Camera, MapPin, Zap, Shield, TrendingUp, Clock } from "lucide-react"
import { motion } from "motion/react"
import { useAppContext } from "../context/AppContext"
import { analyzeBuildingWithVision } from "../services/retrofitApi"

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

  // Redirect to location setup if rates not configured
  useEffect(() => {
    if (!cityRates || !cityRates.isConfirmed) {
      navigate("/")
    }
  }, [cityRates, navigate])
  
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
          {/* Main Upload Section */}
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
                  Project Location
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all text-[15px]"
                >
                  <option>Lahore, Pakistan</option>
                  <option>Karachi, Pakistan</option>
                  <option>Islamabad, Pakistan</option>
                  <option>Rawalpindi, Pakistan</option>
                  <option>Faisalabad, Pakistan</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Location affects material and labor cost calculations
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
          
          {/* Stats Sidebar */}
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
