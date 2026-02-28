import { useState, useRef } from "react"
import { useNavigate } from "react-router"
import { CheckCircle, AlertCircle, ChevronRight, Activity } from "lucide-react"
import { motion } from "motion/react"
import { useAppContext } from "../context/AppContext"

type BrushRect = {
  x: number
  y: number
  width: number
  height: number
}

export function AIDetectionResult() {
  const navigate = useNavigate()
  const { imagePreview, formData, setFormData, detectionData } = useAppContext()
  const imageCanvasRef = useRef<HTMLDivElement | null>(null)
  const [isBrushing, setIsBrushing] = useState(false)
  const [brushStartPoint, setBrushStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [brushRect, setBrushRect] = useState<BrushRect | null>(null)
  const [draftBrushRect, setDraftBrushRect] = useState<BrushRect | null>(null)
  const [aiDimensions] = useState(() => ({
    widthCm: formData.widthCm,
    depthCm: formData.depthCm,
    heightCm: formData.heightCm,
  }))

  const severityTone = detectionData?.severity === "High"
    ? "bg-red-500"
    : detectionData?.severity === "Moderate"
      ? "bg-amber-500"
      : "bg-green-600"
  
  const handleSubmit = () => {
    navigate("/cost-breakdown")
  }

  const getClientPointFromTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0] ?? e.changedTouches[0]
    if (!touch) return null

    return { x: touch.clientX, y: touch.clientY }
  }

  const createNormalizedRect = (start: { x: number; y: number }, end: { x: number; y: number }, bounds: DOMRect): BrushRect => {
    const left = Math.min(start.x, end.x)
    const right = Math.max(start.x, end.x)
    const top = Math.min(start.y, end.y)
    const bottom = Math.max(start.y, end.y)

    return {
      x: Math.max(0, Math.min(1, (left - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (top - bounds.top) / bounds.height)),
      width: Math.max(0, Math.min(1, (right - left) / bounds.width)),
      height: Math.max(0, Math.min(1, (bottom - top) / bounds.height)),
    }
  }

  const applyBrushDimensions = (rect: BrushRect) => {
    const scaleX = Math.max(0.05, rect.width)
    const scaleY = Math.max(0.05, rect.height)
    const scaleDepth = Math.max(0.05, (scaleX + scaleY) / 2)

    const widthCm = Math.max(1, Math.round(aiDimensions.widthCm * scaleX))
    const depthCm = Math.max(1, Math.round(aiDimensions.depthCm * scaleDepth))
    const heightCm = Math.max(1, Math.round(aiDimensions.heightCm * scaleY))

    setFormData({
      ...formData,
      widthCm,
      depthCm,
      heightCm,
    })
  }

  const startBrushing = (point: { x: number; y: number }) => {
    if (!imageCanvasRef.current) return

    const bounds = imageCanvasRef.current.getBoundingClientRect()

    setIsBrushing(true)
    setBrushStartPoint(point)
    setDraftBrushRect(createNormalizedRect(point, point, bounds))
  }

  const moveBrushing = (point: { x: number; y: number }) => {
    if (!isBrushing || !brushStartPoint || !imageCanvasRef.current) return

    const bounds = imageCanvasRef.current.getBoundingClientRect()
    setDraftBrushRect(createNormalizedRect(brushStartPoint, point, bounds))
  }

  const endBrushing = (point: { x: number; y: number }) => {
    if (!isBrushing || !brushStartPoint || !imageCanvasRef.current) return

    const bounds = imageCanvasRef.current.getBoundingClientRect()
    const finalized = createNormalizedRect(brushStartPoint, point, bounds)

    setIsBrushing(false)
    setBrushStartPoint(null)
    setDraftBrushRect(null)

    if (finalized.width < 0.01 || finalized.height < 0.01) {
      return
    }

    setBrushRect(finalized)
    applyBrushDimensions(finalized)
  }

  const cancelBrushing = () => {
    if (!isBrushing) return

    setIsBrushing(false)
    setBrushStartPoint(null)
    setDraftBrushRect(null)
  }

  const handleBrushStart = (e: React.MouseEvent<HTMLDivElement>) => {
    const point = { x: e.clientX, y: e.clientY }
    startBrushing(point)
  }

  const handleBrushMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const current = { x: e.clientX, y: e.clientY }
    moveBrushing(current)
  }

  const handleBrushEnd = (e: React.MouseEvent<HTMLDivElement>) => {
    const endPoint = { x: e.clientX, y: e.clientY }
    endBrushing(endPoint)
  }

  const handleTouchBrushStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    const point = getClientPointFromTouch(e)
    if (!point) return

    startBrushing(point)
  }

  const handleTouchBrushMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    const point = getClientPointFromTouch(e)
    if (!point) return

    moveBrushing(point)
  }

  const handleTouchBrushEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    const point = getClientPointFromTouch(e)
    if (!point) {
      cancelBrushing()
      return
    }

    endBrushing(point)
  }

  const resetBrush = () => {
    setBrushRect(null)
    setDraftBrushRect(null)
    setIsBrushing(false)
    setBrushStartPoint(null)

    setFormData({
      ...formData,
      widthCm: aiDimensions.widthCm,
      depthCm: aiDimensions.depthCm,
      heightCm: aiDimensions.heightCm,
    })
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
              <div
                ref={imageCanvasRef}
                className="relative cursor-crosshair select-none"
                style={{ touchAction: "none" }}
                onMouseDown={handleBrushStart}
                onMouseMove={handleBrushMove}
                onMouseUp={handleBrushEnd}
                onMouseLeave={handleBrushEnd}
                onTouchStart={handleTouchBrushStart}
                onTouchMove={handleTouchBrushMove}
                onTouchEnd={handleTouchBrushEnd}
                onTouchCancel={cancelBrushing}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Detected defect"
                    draggable={false}
                    className="w-full h-80 object-cover"
                  />
                ) : (
                  <div className="w-full h-80 bg-slate-100"></div>
                )}
                {brushRect ? (
                  <motion.div
                    className="absolute border-4 border-red-500 rounded-lg pointer-events-none"
                    style={{
                      left: `${brushRect.x * 100}%`,
                      top: `${brushRect.y * 100}%`,
                      width: `${brushRect.width * 100}%`,
                      height: `${brushRect.height * 100}%`,
                    }}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  ></motion.div>
                ) : (
                  <motion.div
                    className="absolute inset-0 border-4 border-red-500 m-8 rounded-lg pointer-events-none"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  ></motion.div>
                )}
                {draftBrushRect && (
                  <div
                    className="absolute border-2 border-red-300 bg-red-500/10 rounded-lg pointer-events-none"
                    style={{
                      left: `${draftBrushRect.x * 100}%`,
                      top: `${draftBrushRect.y * 100}%`,
                      width: `${draftBrushRect.width * 100}%`,
                      height: `${draftBrushRect.height * 100}%`,
                    }}
                  ></div>
                )}
                <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
                  Defect Located
                </div>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70">
                <p className="text-xs text-slate-600">
                  Brush over the detected element to set dimensions manually.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetBrush}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Reset to AI Dimensions
                  </button>
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
