import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { CheckCircle, AlertCircle, ChevronRight, Activity, Brush, Eraser, RotateCcw } from "lucide-react"
import { motion } from "motion/react"
import { useAppContext } from "../context/AppContext"

type SeverityBrush = {
  severity: "severe" | "moderate" | "low" | "veryLow" | "none"
  label: string
  color: string
  unitCost: number
  multiplier: number
  strategy: string
  action: string
}

const severityBrushes: SeverityBrush[] = [
  {
    severity: "severe",
    label: "Severe damage",
    color: "#EF4444",
    unitCost: 9200,
    multiplier: 1.55,
    strategy: "Structural strengthening",
    action: "RC jacketing / Steel jacketing / FRP wrapping",
  },
  {
    severity: "moderate",
    label: "Moderate damage",
    color: "#C4A484",
    unitCost: 4200,
    multiplier: 1.2,
    strategy: "Crack repair + partial strengthening",
    action: "Epoxy injection + section repair",
  },
  {
    severity: "low",
    label: "Low damage",
    color: "#FACC15",
    unitCost: 1800,
    multiplier: 1,
    strategy: "Surface crack repair",
    action: "Sealant / minor repair",
  },
  {
    severity: "veryLow",
    label: "Very low damage",
    color: "#3B82F6",
    unitCost: 650,
    multiplier: 0.72,
    strategy: "Monitoring + preventive maintenance",
    action: "Periodic observation and preventive care",
  },
  {
    severity: "none",
    label: "No damage",
    color: "#22C55E",
    unitCost: 0,
    multiplier: 0,
    strategy: "No retrofit required",
    action: "No cost applied",
  },
]

const getRgbFromHex = (hex: string) => {
  const clean = hex.replace("#", "")
  const normalized = clean.length === 3 ? clean.split("").map((value) => `${value}${value}`).join("") : clean
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

export function AIDetectionResult() {
  const navigate = useNavigate()
  const { imagePreview, formData, setFormData, detectionData, manualAnnotation, setManualAnnotation } = useAppContext()
  const imageElementRef = useRef<HTMLImageElement | null>(null)
  const annotationCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isPainting, setIsPainting] = useState(false)
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityBrush["severity"]>("severe")
  const [brushSize, setBrushSize] = useState(18)
  const [brushOpacity, setBrushOpacity] = useState(0.7)
  const [damagePercentPreview, setDamagePercentPreview] = useState(formData.damageExtent)
  const [zoneStatsPreview, setZoneStatsPreview] = useState(manualAnnotation?.zones ?? [])
  const [annotationInsight, setAnnotationInsight] = useState("")
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
  
  const colorDistanceTable = useMemo(
    () =>
      severityBrushes.map((brush) => ({
        ...brush,
        rgb: getRgbFromHex(brush.color),
      })),
    [],
  )

  const getClientPointFromTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0] ?? e.changedTouches[0]
    if (!touch) return null

    return { x: touch.clientX, y: touch.clientY }
  }

  const getCanvasPoint = (point: { x: number; y: number }) => {
    const canvas = annotationCanvasRef.current
    if (!canvas) return null
    const bounds = canvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return null

    return {
      x: ((point.x - bounds.left) / bounds.width) * canvas.width,
      y: ((point.y - bounds.top) / bounds.height) * canvas.height,
    }
  }

  const getAnnotationContext = () => {
    const canvas = annotationCanvasRef.current
    if (!canvas) return null
    const context = canvas.getContext("2d")
    if (!context) return null
    return { canvas, context }
  }

  const drawSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const annotationContext = getAnnotationContext()
    if (!annotationContext) return

    const selectedBrush = severityBrushes.find((brush) => brush.severity === selectedSeverity)
    if (!selectedBrush) return

    annotationContext.context.save()
    annotationContext.context.globalAlpha = brushOpacity
    annotationContext.context.strokeStyle = selectedBrush.color
    annotationContext.context.lineCap = "round"
    annotationContext.context.lineJoin = "round"
    annotationContext.context.lineWidth = brushSize
    annotationContext.context.beginPath()
    annotationContext.context.moveTo(from.x, from.y)
    annotationContext.context.lineTo(to.x, to.y)
    annotationContext.context.stroke()
    annotationContext.context.restore()
  }

  const generateAnnotationSummary = () => {
    const annotationContext = getAnnotationContext()
    if (!annotationContext) return null

    const imageData = annotationContext.context.getImageData(0, 0, annotationContext.canvas.width, annotationContext.canvas.height)
    const counters: Record<SeverityBrush["severity"], number> = {
      severe: 0,
      moderate: 0,
      low: 0,
      veryLow: 0,
      none: 0,
    }

    for (let pixelIndex = 0; pixelIndex < imageData.data.length; pixelIndex += 4) {
      const alpha = imageData.data[pixelIndex + 3]
      if (alpha < 16) continue

      const red = imageData.data[pixelIndex]
      const green = imageData.data[pixelIndex + 1]
      const blue = imageData.data[pixelIndex + 2]

      let nearestSeverity: SeverityBrush["severity"] = "none"
      let nearestDistance = Number.POSITIVE_INFINITY

      for (const colorCandidate of colorDistanceTable) {
        const distance =
          (red - colorCandidate.rgb.r) ** 2 +
          (green - colorCandidate.rgb.g) ** 2 +
          (blue - colorCandidate.rgb.b) ** 2

        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestSeverity = colorCandidate.severity
        }
      }

      counters[nearestSeverity] += 1
    }

    const totalPixels = annotationContext.canvas.width * annotationContext.canvas.height
    const paintedPixels = Object.values(counters).reduce((sum, value) => sum + value, 0)
    const damagePixels = Math.max(0, paintedPixels - counters.none)
    const damagePercent = totalPixels > 0 ? (damagePixels / totalPixels) * 100 : 0
    const severePercent = totalPixels > 0 ? (counters.severe / totalPixels) * 100 : 0

    const weightedPoints =
      counters.severe * 1 +
      counters.moderate * 0.72 +
      counters.low * 0.38 +
      counters.veryLow * 0.15

    const weightedRiskScore = damagePixels > 0 ? Math.min(100, Math.round((weightedPoints / damagePixels) * 100)) : 0
    const replacementRecommended = severePercent > 40
    const investigationRequired = severePercent > 22 || damagePercent > 55

    const elementFaceAreaM2 = Math.max(0.01, (Math.max(1, formData.widthCm) * Math.max(1, formData.heightCm)) / 10000)

    const zones = severityBrushes.map((brush) => {
      const pixelCount = counters[brush.severity]
      const percentage = totalPixels > 0 ? (pixelCount / totalPixels) * 100 : 0
      const areaM2 = elementFaceAreaM2 * (percentage / 100)

      return {
        severity: brush.severity,
        label: brush.label,
        color: brush.color,
        pixelCount,
        percentage,
        areaM2,
        unitCost: brush.unitCost,
        severityMultiplier: brush.multiplier,
        strategy: brush.strategy,
        recommendedAction: brush.action,
      }
    })

    setZoneStatsPreview(zones)
    setDamagePercentPreview(Math.round(damagePercent))

    if (replacementRecommended) {
      setAnnotationInsight("Severe zone exceeds 40% of element area; full element replacement should be evaluated.")
    } else if (investigationRequired) {
      setAnnotationInsight("Large damaged area detected; include detailed structural investigation in scope.")
    } else if (damagePercent > 0) {
      setAnnotationInsight("Damage spread is localized; targeted retrofit strategy is feasible.")
    } else {
      setAnnotationInsight("No painted damage zones detected yet.")
    }

    // Add text labels for each severity zone with significant pixels
    const context = annotationContext.context
    const canvasWidth = annotationContext.canvas.width
    const canvasHeight = annotationContext.canvas.height
    
    context.font = `bold ${Math.max(16, Math.round(canvasWidth / 45))}px sans-serif`
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.shadowColor = "rgba(0, 0, 0, 0.5)"
    context.shadowBlur = 10
    context.shadowOffsetX = 2
    context.shadowOffsetY = 2

    // Get bounding boxes for each severity region
    zones.forEach((zone, index) => {
      if (zone.pixelCount > 0 && zone.severity !== "none") {
        // Calculate approximate label position (distribute labels evenly on canvas)
        const rows = Math.ceil(Math.sqrt(zones.filter(z => z.pixelCount > 0).length))
        const row = Math.floor(index / rows)
        const col = index % rows
        
        const x = (col + 0.5) * (canvasWidth / rows) + Math.random() * 50 - 25
        const y = (row + 0.5) * (canvasHeight / rows) + Math.random() * 50 - 25
        
        // Only draw label if position is within canvas
        if (x > 20 && x < canvasWidth - 20 && y > 20 && y < canvasHeight - 20) {
          context.fillStyle = "rgba(255, 255, 255, 0.95)"
          const label = zone.label.toUpperCase()
          const metrics = context.measureText(label)
          const labelWidth = metrics.width + 20
          const labelHeight = 40
          
          // Draw label background
          context.fillRect(x - labelWidth / 2, y - labelHeight / 2, labelWidth, labelHeight)
          
          // Draw label text
          context.fillStyle = zone.color
          context.font = `bold ${Math.max(14, Math.round(canvasWidth / 50))}px sans-serif`
          context.fillText(label, x, y)
        }
      }
    })

    return {
      totalPixels,
      paintedPixels,
      damagePixels,
      damagePercent,
      severePercent,
      weightedRiskScore,
      replacementRecommended,
      investigationRequired,
      zones,
      annotationImage: annotationContext.canvas.toDataURL("image/png"),
    }
  }

  const startPainting = (point: { x: number; y: number }) => {
    const canvasPoint = getCanvasPoint(point)
    if (!canvasPoint) return

    setIsPainting(true)
    setLastPoint(canvasPoint)
  }

  const movePainting = (point: { x: number; y: number }) => {
    if (!isPainting || !lastPoint) return
    const canvasPoint = getCanvasPoint(point)
    if (!canvasPoint) return

    drawSegment(lastPoint, canvasPoint)
    setLastPoint(canvasPoint)
  }

  const stopPainting = () => {
    if (!isPainting) return
    setIsPainting(false)
    setLastPoint(null)
    generateAnnotationSummary()
  }

  const clearAnnotation = () => {
    const annotationContext = getAnnotationContext()
    if (!annotationContext) return

    annotationContext.context.clearRect(0, 0, annotationContext.canvas.width, annotationContext.canvas.height)
    setManualAnnotation(null)
    setZoneStatsPreview([])
    setDamagePercentPreview(0)
    setAnnotationInsight("No painted damage zones detected yet.")
  }

  const handleBrushStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    startPainting({ x: e.clientX, y: e.clientY })
  }

  const handleBrushMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    movePainting({ x: e.clientX, y: e.clientY })
  }

  const handleTouchBrushStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const point = getClientPointFromTouch(e)
    if (!point) return
    startPainting(point)
  }

  const handleTouchBrushMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const point = getClientPointFromTouch(e)
    if (!point) return
    movePainting(point)
  }

  const handleSubmit = () => {
    const summary = generateAnnotationSummary()
    if (summary) {
      setManualAnnotation(summary)
      setFormData({
        ...formData,
        damageExtent: Math.min(100, Math.max(0, Math.round(summary.damagePercent))),
      })
    }
    navigate("/cost-breakdown")
  }

  useEffect(() => {
    const canvas = annotationCanvasRef.current
    const imageElement = imageElementRef.current
    if (!canvas || !imageElement) return

    const setupCanvas = () => {
      const naturalWidth = imageElement.naturalWidth || 1024
      const naturalHeight = imageElement.naturalHeight || 768
      canvas.width = naturalWidth
      canvas.height = naturalHeight
      canvas.style.width = "100%"
      canvas.style.height = "100%"

      const context = canvas.getContext("2d")
      if (!context) return
      context.clearRect(0, 0, canvas.width, canvas.height)

      if (manualAnnotation?.annotationImage) {
        const cached = new Image()
        cached.onload = () => {
          context.drawImage(cached, 0, 0, canvas.width, canvas.height)
          generateAnnotationSummary()
        }
        cached.src = manualAnnotation.annotationImage
      }
    }

    if (imageElement.complete) {
      setupCanvas()
      return
    }

    imageElement.onload = setupCanvas
    return () => {
      imageElement.onload = null
    }
  }, [imagePreview, manualAnnotation?.annotationImage])

  useEffect(() => {
    if (manualAnnotation?.zones?.length) {
      setZoneStatsPreview(manualAnnotation.zones)
      setDamagePercentPreview(Math.round(manualAnnotation.damagePercent))
    }
  }, [manualAnnotation])

  const activeBrush = severityBrushes.find((brush) => brush.severity === selectedSeverity) ?? severityBrushes[0]

  const resetDimensionsToAI = () => {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start sm:items-center justify-between gap-3"
          >
            <div>
              <h1 className="text-[#0F172A] text-[24px] sm:text-[28px] font-semibold tracking-tight mb-2">
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Left side - Image and Detection Summary */}
          <div className="xl:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="relative select-none" style={{ touchAction: "none" }}>
                {imagePreview ? (
                  <img
                    ref={imageElementRef}
                    src={imagePreview}
                    alt="Detected defect"
                    draggable={false}
                    className="w-full h-64 sm:h-80 object-cover"
                  />
                ) : (
                  <div className="w-full h-80 bg-slate-100"></div>
                )}

                <canvas
                  ref={annotationCanvasRef}
                  className="absolute inset-0 w-full h-full cursor-crosshair"
                  onMouseDown={handleBrushStart}
                  onMouseMove={handleBrushMove}
                  onMouseUp={stopPainting}
                  onMouseLeave={stopPainting}
                  onTouchStart={handleTouchBrushStart}
                  onTouchMove={handleTouchBrushMove}
                  onTouchEnd={stopPainting}
                  onTouchCancel={stopPainting}
                />

                <div className="absolute top-4 right-4 bg-slate-900/80 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg backdrop-blur">
                  Damage marked: {damagePercentPreview}%
                </div>
              </div>

              <div className="px-4 py-4 border-t border-slate-100 bg-slate-50/70 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {severityBrushes.map((brush) => (
                    <button
                      key={brush.severity}
                      type="button"
                      onClick={() => setSelectedSeverity(brush.severity)}
                      className={`px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${selectedSeverity === brush.severity ? "border-slate-900 bg-white text-slate-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: brush.color }}></span>
                        {brush.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-slate-600">
                    Brush size ({brushSize}px)
                    <input
                      type="range"
                      min={6}
                      max={48}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full mt-1"
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    Brush opacity ({Math.round(brushOpacity * 100)}%)
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={Math.round(brushOpacity * 100)}
                      onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
                      className="w-full mt-1"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5"
                    onClick={clearAnnotation}
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    Clear Paint
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5"
                    onClick={resetDimensionsToAI}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset AI Dimensions
                  </button>
                  <span className="text-xs text-slate-600 inline-flex items-center gap-1.5">
                    <Brush className="w-3.5 h-3.5" />
                    Active: <strong style={{ color: activeBrush.color }}>{activeBrush.label}</strong>
                  </span>
                </div>

                {annotationInsight && (
                  <p className="text-xs text-slate-600 leading-relaxed">{annotationInsight}</p>
                )}

                {zoneStatsPreview.length > 0 && (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-white border-b border-slate-200">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-slate-600">Severity</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">Area %</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600">Area m²</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {zoneStatsPreview.map((zone) => (
                          <tr key={zone.severity}>
                            <td className="px-3 py-2 text-slate-700">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zone.color }}></span>
                                {zone.label}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700">{zone.percentage.toFixed(2)}%</td>
                            <td className="px-3 py-2 text-right text-slate-700">{zone.areaM2.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
          <div className="xl:col-span-3">
            <motion.div
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8"
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <div className="grid grid-cols-2 sm:flex gap-3">
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
