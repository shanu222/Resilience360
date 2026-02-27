import { useNavigate } from "react-router"
import { CheckCircle, AlertCircle, ChevronRight, Activity } from "lucide-react"
import { motion } from "motion/react"
import { useAppContext } from "../context/AppContext"

export function AIDetectionResult() {
  const navigate = useNavigate()
  const { imagePreview, formData, setFormData, detectionData } = useAppContext()

  const severityTone = detectionData?.severity === "High"
    ? "bg-red-500"
    : detectionData?.severity === "Moderate"
      ? "bg-amber-500"
      : "bg-green-600"
  
  const handleSubmit = () => {
    navigate("/cost-breakdown")
  }
  
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-[#0F172A] text-[28px] font-semibold tracking-tight mb-2">
                AI Detection Results
              </h1>
              <p className="text-slate-600 text-[15px]">
                Verify and confirm structural details before cost calculation
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Detection Complete</span>
            </div>
          </motion.div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-5 gap-6">
          {/* Left side - Image and Detection Summary */}
          <div className="col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Detected defect"
                    className="w-full h-80 object-cover"
                  />
                ) : (
                  <div className="w-full h-80 bg-slate-100"></div>
                )}
                <motion.div
                  className="absolute inset-0 border-4 border-red-500 m-8 rounded-lg pointer-events-none"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                ></motion.div>
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
                  Defect Located
                </div>
              </div>
            </motion.div>
            
            <motion.div
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-5 h-5 text-[#2563EB]" />
                <h3 className="text-[16px] font-semibold text-[#0F172A]">AI Detection Summary</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Element Type</span>
                  <span className="px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-sm font-medium">
                    {detectionData?.elementType ?? "Structural Element"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Defect Type</span>
                  <span className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium">
                    {detectionData?.defectType ?? "Not detected"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Severity Level</span>
                  <span className={`px-3 py-1.5 ${severityTone} text-white rounded-lg text-sm font-medium flex items-center gap-1.5`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {detectionData?.severity ?? "Moderate"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Confidence Score</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-green-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${detectionData?.confidence ?? 0}%` }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                      ></motion.div>
                    </div>
                    <span className="text-sm font-semibold text-[#0F172A]">{detectionData?.confidence ?? 0}%</span>
                  </div>
                </div>
              </div>
              {detectionData?.summary && (
                <p className="mt-4 text-xs text-slate-600 leading-relaxed">{detectionData.summary}</p>
              )}
            </motion.div>
          </div>
          
          {/* Right side - Manual Confirmation Form */}
          <div className="col-span-3">
            <motion.div
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-[20px] font-semibold text-[#0F172A] mb-6">
                Structural Details Confirmation
              </h2>
              
              <div className="space-y-8">
                {/* Element Dimensions */}
                <div>
                  <h4 className="text-[15px] font-medium text-[#0F172A] mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-[#2563EB] text-white rounded-full text-xs font-semibold">1</span>
                    Element Dimensions
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Width (cm)", value: formData.widthCm, key: "widthCm" },
                      { label: "Depth (cm)", value: formData.depthCm, key: "depthCm" },
                      { label: "Height (cm)", value: formData.heightCm, key: "heightCm" },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm text-slate-600 mb-2">{field.label}</label>
                        <input
                          type="number"
                          value={field.value}
                          onChange={(e) => setFormData({ ...formData, [field.key]: Number(e.target.value) || 0 })}
                          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all text-[15px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Damage Extent */}
                <div>
                  <h4 className="text-[15px] font-medium text-[#0F172A] mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-[#2563EB] text-white rounded-full text-xs font-semibold">2</span>
                    Damage Extent
                  </h4>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.damageExtent}
                    onChange={(e) => setFormData({...formData, damageExtent: parseInt(e.target.value)})}
                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-slate-600 mt-3">
                    <span>Minor (0%)</span>
                    <span className="px-3 py-1 bg-amber-500 text-white rounded-lg font-semibold text-xs">
                      {formData.damageExtent}%
                    </span>
                    <span>Severe (100%)</span>
                  </div>
                </div>
                
                {/* Material Type */}
                <div>
                  <h4 className="text-[15px] font-medium text-[#0F172A] mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-[#2563EB] text-white rounded-full text-xs font-semibold">3</span>
                    Material Type
                  </h4>
                  <select
                    value={formData.materialType}
                    onChange={(e) => setFormData({...formData, materialType: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all text-[15px]"
                  >
                    <option>Reinforced Concrete</option>
                    <option>Brick Masonry</option>
                    <option>Steel</option>
                    <option>Block</option>
                    <option>Adobe</option>
                  </select>
                </div>
                
                {/* Floor Level */}
                <div>
                  <h4 className="text-[15px] font-medium text-[#0F172A] mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-[#2563EB] text-white rounded-full text-xs font-semibold">4</span>
                    Floor Level
                  </h4>
                  <div className="flex gap-3">
                    {["Ground", "1", "2", "3", "4+"].map((level) => (
                      <button
                        key={level}
                        onClick={() => setFormData({...formData, floorLevel: level})}
                        className={`flex-1 px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                          formData.floorLevel === level
                            ? "bg-[#2563EB] text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Accessibility */}
                <div>
                  <h4 className="text-[15px] font-medium text-[#0F172A] mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-[#2563EB] text-white rounded-full text-xs font-semibold">5</span>
                    Site Conditions & Access
                  </h4>
                  <div className="space-y-3">
                    {[
                      { key: "tightAccess", label: "Limited site access" },
                      { key: "occupied", label: "Building currently occupied" },
                      { key: "scaffolding", label: "Scaffolding required" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all border ${
                          formData[item.key as keyof typeof formData]
                            ? "bg-blue-50 border-[#2563EB]"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData[item.key as keyof typeof formData] as boolean}
                          onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                        />
                        <span className="text-sm text-slate-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Desired Retrofit Level */}
                <div>
                  <h4 className="text-[15px] font-medium text-[#0F172A] mb-4 flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-[#2563EB] text-white rounded-full text-xs font-semibold">6</span>
                    Desired Retrofit Level
                  </h4>
                  <div className="space-y-3">
                    {[
                      { value: "cosmetic", label: "Cosmetic Repair", desc: "Surface-level fixes only" },
                      { value: "structural", label: "Structural Strengthening", desc: "Recommended for moderate defects" },
                      { value: "seismic", label: "Full Seismic Upgrade", desc: "Comprehensive earthquake resistance" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all border ${
                          formData.retrofitLevel === option.value
                            ? "bg-blue-50 border-[#2563EB]"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="retrofitLevel"
                          value={option.value}
                          checked={formData.retrofitLevel === option.value}
                          onChange={(e) => setFormData({ ...formData, retrofitLevel: e.target.value as typeof formData.retrofitLevel })}
                          className="w-4 h-4 mt-0.5 border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-[#0F172A] mb-0.5">{option.label}</div>
                          <div className="text-xs text-slate-500">{option.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <motion.button
                  onClick={handleSubmit}
                  className="w-full px-6 py-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition-all text-[15px] font-medium shadow-sm flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span>Calculate Cost Breakdown</span>
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
