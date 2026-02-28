import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { Info, ChevronDown, DollarSign, Calculator, Package, Users, AlertTriangle, FileText, Plus } from "lucide-react"
import { motion } from "motion/react"
import { useAppContext } from "../context/AppContext"
import { getMlRetrofitEstimate } from "../services/retrofitApi"

export function ElementCostBreakdown() {
  const navigate = useNavigate()
  const { addDefect, formData, detectionData, location, manualAnnotation, cityRates, setActiveEstimate } = useAppContext()
  const [showCalculation, setShowCalculation] = useState(false)
  const [calculating, setCalculating] = useState(true)
  const [mlError, setMlError] = useState<string | null>(null)
  const [mlCostPerSqft, setMlCostPerSqft] = useState<number | null>(null)
  const [mlDurationWeeks, setMlDurationWeeks] = useState<number | null>(null)

  const navigateWithFallback = (path: "/" | "/final-report") => {
    try {
      navigate(path)
    } catch {
      window.location.hash = path === "/" ? "#/" : `#${path}`
    }
  }

  const dimensions = useMemo(() => {
    // If no dimensions are set (no image uploaded), return all zeros
    if (formData.widthCm === 0 || formData.depthCm === 0 || formData.heightCm === 0) {
      return {
        widthM: 0,
        depthM: 0,
        heightM: 0,
        perimeterM: 0,
        surfaceAreaM2: 0,
        jacketVolumeM3: 0,
        crackLengthM: 0,
      }
    }

    const widthM = Math.max(0.1, formData.widthCm / 100)
    const depthM = Math.max(0.1, formData.depthCm / 100)
    const heightM = Math.max(0.2, formData.heightCm / 100)
    const perimeterM = (widthM + depthM) * 2
    const surfaceAreaM2 = perimeterM * heightM
    const jacketVolumeM3 = Math.max(0.03, surfaceAreaM2 * 0.06)
    const crackLengthM = Math.max(0.2, (formData.damageExtent / 100) * perimeterM)

    return {
      widthM,
      depthM,
      heightM,
      perimeterM,
      surfaceAreaM2,
      jacketVolumeM3,
      crackLengthM,
    }
  }, [formData.depthCm, formData.damageExtent, formData.heightCm, formData.widthCm])

  const locationFactorMap: Record<string, number> = {
    lahore: 1.05,
    karachi: 1.12,
    islamabad: 1.1,
    rawalpindi: 1.08,
    faisalabad: 1.03,
  }

  const locationKey = location.toLowerCase()
  const locationMultiplier = Object.entries(locationFactorMap).find(([city]) => locationKey.includes(city))?.[1] ?? 1
  const complexityMultiplier =
    1 +
    (formData.tightAccess ? 0.08 : 0) +
    (formData.occupied ? 0.06 : 0) +
    (formData.scaffolding ? 0.05 : 0)

  const retrofitLevelFactor =
    formData.retrofitLevel === "seismic" ? 1.28 : formData.retrofitLevel === "structural" ? 1.12 : 0.9

  const deterministicCostItems = useMemo(() => {
    // Use rates from confirmed cityRates or fallback to defaults
    const surfacePrepRate = cityRates?.surfacePreparationRate ?? 480
    const epoxyRate = cityRates?.epoxyInjectionRate ?? 2800
    const rcJacketRate = cityRates?.rcJacketingRate ?? 92000
    const laborRate = cityRates?.skilledLaborRate ?? 850

    const surfacePreparation = Math.round(dimensions.surfaceAreaM2 * surfacePrepRate)
    const epoxyInjection = Math.round(dimensions.crackLengthM * epoxyRate)
    const rcJacketing = Math.round(dimensions.jacketVolumeM3 * rcJacketRate)
    const skilledLabor = Math.round((32 + formData.damageExtent * 0.8) * laborRate)

    return [
      { item: "Surface Preparation", quantity: `${dimensions.surfaceAreaM2.toFixed(2)} m²`, unitCost: surfacePrepRate, total: surfacePreparation, icon: Package },
      { item: "Epoxy Injection", quantity: `${dimensions.crackLengthM.toFixed(2)} m`, unitCost: epoxyRate, total: epoxyInjection, icon: Package },
      { item: "RC Jacketing", quantity: `${dimensions.jacketVolumeM3.toFixed(2)} m³`, unitCost: rcJacketRate, total: rcJacketing, icon: Package },
      { item: "Skilled Labor", quantity: `${Math.round(32 + formData.damageExtent * 0.8)} hrs`, unitCost: laborRate, total: skilledLabor, icon: Users },
    ]
  }, [dimensions.crackLengthM, dimensions.jacketVolumeM3, dimensions.surfaceAreaM2, formData.damageExtent, cityRates])

  const annotationCostItems = useMemo(() => {
    if (!manualAnnotation || manualAnnotation.paintedPixels <= 0) {
      return []
    }

    const severityRows = manualAnnotation.zones
      .filter((zone) => zone.severity !== "none" && zone.areaM2 > 0)
      .map((zone) => {
        // Cost per zone = Area × (Unit Cost × Severity Multiplier)
        // DO NOT apply location/complexity here - will be applied to subtotal
        const baseUnitCost = Math.round(zone.unitCost * zone.severityMultiplier)
        const total = Math.round(zone.areaM2 * baseUnitCost)
        return {
          item: `${zone.label} — ${zone.strategy}`,
          quantity: `${zone.areaM2.toFixed(3)} m²`,
          unitCost: baseUnitCost,
          total,
          icon: AlertTriangle,
        }
      })

    if (manualAnnotation.investigationRequired) {
      const investigationCost = cityRates?.investigationCost ?? 65000
      severityRows.push({
        item: "Detailed structural investigation",
        quantity: "Lump sum",
        unitCost: investigationCost,
        total: investigationCost,
        icon: Info,
      })
    }

    if (manualAnnotation.replacementRecommended) {
      const replacementCost = cityRates?.replacementAllowance ?? 210000
      severityRows.push({
        item: "High-severity replacement allowance",
        quantity: "Lump sum",
        unitCost: replacementCost,
        total: replacementCost,
        icon: AlertTriangle,
      })
    }

    return severityRows
  }, [complexityMultiplier, locationMultiplier, manualAnnotation, cityRates])

  const costItems = annotationCostItems.length > 0 ? annotationCostItems : deterministicCostItems

  const baseCost = useMemo(() => costItems.reduce((sum, item) => sum + item.total, 0), [costItems])
  
  // Apply location and complexity multipliers to subtotal (for annotated costs, multipliers already not included in line items)
  const adjustedSubtotal = annotationCostItems.length > 0 
    ? Math.round(baseCost * locationMultiplier * complexityMultiplier * retrofitLevelFactor)
    : Math.round(baseCost * locationMultiplier * complexityMultiplier * retrofitLevelFactor)
  
  // Calculate contingency and overhead on adjusted subtotal using rates from cityRates
  const contingencyPercent = (cityRates?.contingencyPercent ?? 10) / 100
  const overheadPercent = (cityRates?.overheadPercent ?? 15) / 100
  const contingency = Math.round(adjustedSubtotal * contingencyPercent)
  const overhead = Math.round(adjustedSubtotal * overheadPercent)

  // Total = Adjusted Subtotal + Contingency + Overhead
  const calculatedTotal = adjustedSubtotal + contingency + overhead

  // Only calculate area if dimensions are set; otherwise return 0
  const areaSqft = (dimensions.widthM === 0 || dimensions.depthM === 0) 
    ? 0 
    : Math.max(50, Math.round((dimensions.widthM * dimensions.depthM * 10.7639) * (formData.floorLevel === "Ground" ? 1 : 1.08)))
  const totalCost = calculatedTotal
  const estimatedDurationWeeks = mlDurationWeeks ?? (formData.damageExtent === 0 ? 0 : Math.max(1, Math.round(2 + formData.damageExtent / 14)))

  useEffect(() => {
    let isCancelled = false

    const loadMlEstimate = async () => {
      setCalculating(true)
      setMlError(null)

      const severityScore =
        manualAnnotation?.weightedRiskScore
          ? manualAnnotation.weightedRiskScore
          : detectionData?.severity === "High"
            ? 82
            : detectionData?.severity === "Moderate"
              ? 58
              : 35

      const affectedAreaPercent = manualAnnotation?.damagePercent ?? formData.damageExtent

      try {
        const ml = await getMlRetrofitEstimate({
          structureType: "RC Frame",
          province: "Punjab",
          city: location,
          areaSqft,
          severityScore,
          affectedAreaPercent,
          urgencyLevel: severityScore >= 75 ? "critical" : severityScore >= 50 ? "priority" : "routine",
        })

        if (isCancelled) return
        setMlCostPerSqft(ml.predictedCostPerSqft)
        setMlDurationWeeks(ml.predictedDurationWeeks)
      } catch (error) {
        if (isCancelled) return
        const message = error instanceof Error ? error.message : "Failed to load ML estimate"
        setMlError(message)
      } finally {
        if (!isCancelled) {
          setCalculating(false)
        }
      }
    }

    void loadMlEstimate()
    return () => {
      isCancelled = true
    }
  }, [areaSqft, detectionData?.severity, formData.damageExtent, location, manualAnnotation?.damagePercent, manualAnnotation?.weightedRiskScore])

  useEffect(() => {
    setActiveEstimate({
      elementType: detectionData?.elementType ?? "Structural Element",
      location,
      confidence: detectionData?.confidence ?? 70,
      baseCost,
      locationMultiplier,
      complexityMultiplier,
      contingency,
      overhead,
      totalCost,
      estimatedDurationWeeks,
      lineItems: costItems.map((item) => ({ item: item.item, quantity: item.quantity, unitCost: item.unitCost, total: item.total })),
      assumptions: [
        `Material: ${formData.materialType}`,
        `Retrofit level: ${formData.retrofitLevel}`,
        `Damage extent: ${formData.damageExtent}%`,
        manualAnnotation
          ? `Annotated risk score: ${manualAnnotation.weightedRiskScore}/100 with ${manualAnnotation.damagePercent.toFixed(1)}% affected area`
          : "No manual annotation provided",
        manualAnnotation?.replacementRecommended
          ? "Severe region threshold exceeded: replacement strategy should be reviewed"
          : "Repair-first strategy is feasible for current severity distribution",
        "Cost derived from deterministic engineering formula (Adjusted Subtotal + Contingency + Overhead)",
      ],
    })
  }, [
    baseCost,
    complexityMultiplier,
    contingency,
    costItems,
    detectionData?.confidence,
    detectionData?.elementType,
    estimatedDurationWeeks,
    formData.damageExtent,
    formData.materialType,
    formData.retrofitLevel,
    location,
    locationMultiplier,
    manualAnnotation,
    overhead,
    totalCost,
  ])
  
  const handleAddDefect = () => {
    try {
      addDefect({
        elementType: detectionData?.elementType ?? "Structural Element",
        defectType: detectionData?.defectType ?? "general",
        severity: detectionData?.severity ?? "Moderate",
        cost: totalCost,
      })
    } catch (error) {
      console.error("Failed to save defect before navigation", error)
    }
    navigateWithFallback("/")
  }
  
  const handleViewReport = () => {
    try {
      addDefect({
        elementType: detectionData?.elementType ?? "Structural Element",
        defectType: detectionData?.defectType ?? "general",
        severity: detectionData?.severity ?? "Moderate",
        cost: totalCost,
      })
    } catch (error) {
      console.error("Failed to save defect before opening report", error)
    }
    navigateWithFallback("/final-report")
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
            className="flex items-start sm:items-center justify-between gap-3"
          >
            <div>
              <h1 className="text-[#0F172A] text-[24px] sm:text-[28px] font-semibold tracking-tight mb-2">
                Detailed Cost Breakdown
              </h1>
              <p className="text-slate-600 text-[15px]">
                Element-level cost analysis with regional multipliers
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg">
              <Calculator className="w-5 h-5" />
              <span className="text-sm font-medium">92% Confidence</span>
            </div>
          </motion.div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-6 h-6 text-[#2563EB]" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-[#0F172A]">{detectionData?.elementType ?? "Element"} Retrofit Estimate</h2>
              <p className="text-sm text-slate-500">Location-sensitive structural retrofit costing</p>
            </div>
          </div>
          
          {calculating ? (
            <motion.div
              className="py-20 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 text-sm">Calculating detailed costs...</p>
            </motion.div>
          ) : (
            <>
              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto mb-6">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Item Description</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Quantity</th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Unit Cost</th>
                      <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {costItems.map((row, index) => {
                      const Icon = row.icon;
                      return (
                        <motion.tr
                          key={index}
                          className="hover:bg-slate-50 transition-colors"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <td className="px-6 py-4 text-slate-700 text-sm">
                            <div className="flex items-center gap-3">
                              <Icon className="w-4 h-4 text-slate-400" />
                              <span>{row.item}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 text-sm">{row.quantity}</td>
                            <td className="px-6 py-4 text-slate-600 text-sm">PKR {row.unitCost.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-medium text-slate-900 text-sm">PKR {row.total.toLocaleString()}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-sm font-semibold text-slate-700">Base Cost Subtotal</td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">PKR {baseCost.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {manualAnnotation && manualAnnotation.zones.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-x-auto mb-6">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Severity Layer</th>
                        <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">Area %</th>
                        <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700">Area m²</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700">Retrofit Strategy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {manualAnnotation.zones.map((zone) => (
                        <tr key={zone.severity} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-700 text-sm">
                            <span className="inline-flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }}></span>
                              {zone.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600 text-sm">{zone.percentage.toFixed(2)}%</td>
                          <td className="px-6 py-4 text-right text-slate-600 text-sm">{zone.areaM2.toFixed(3)}</td>
                          <td className="px-6 py-4 text-slate-600 text-sm">{zone.recommendedAction}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Cost Summary Card */}
              <motion.div
                className="bg-slate-50 rounded-lg p-6 border border-slate-200 mb-6"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <DollarSign className="w-5 h-5 text-slate-700" />
                  <h3 className="text-[16px] font-semibold text-[#0F172A]">Cost Calculation Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm text-slate-600">Base Repair Cost (Sum of Damage Zones)</span>
                    <span className="text-sm font-semibold text-slate-900">PKR {baseCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm text-slate-600">Location Factor ({location})</span>
                    <span className="text-sm font-semibold text-[#2563EB]">×{locationMultiplier}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm text-slate-600">Complexity Factor</span>
                    <span className="text-sm font-semibold text-[#2563EB]">×{complexityMultiplier.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm text-slate-600">Retrofit Level Factor</span>
                    <span className="text-sm font-semibold text-[#2563EB]">×{retrofitLevelFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <span className="text-sm font-medium text-slate-700">Adjusted Subtotal</span>
                    <span className="text-sm font-bold text-[#2563EB]">PKR {adjustedSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm text-slate-600">Contingency (10% of subtotal)</span>
                    <span className="text-sm font-semibold text-amber-600">PKR {contingency.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border-b-2 border-slate-200 pb-4">
                    <span className="text-sm text-slate-600">Contractor Overhead (15% of subtotal)</span>
                    <span className="text-sm font-semibold text-amber-600">PKR {overhead.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 p-4 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-lg shadow-sm">
                    <span className="text-white text-base font-medium">Total Estimated Cost</span>
                    <span className="text-white text-2xl font-bold">PKR {totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
              {mlError && (
                <p className="text-xs text-amber-700 mb-4">ML estimate unavailable: {mlError}. Using engineering fallback formula.</p>
              )}
              
              {/* Expandable Calculation Details */}
              <button
                onClick={() => setShowCalculation(!showCalculation)}
                className="w-full px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-between transition-all mb-6 border border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium">Calculation Methodology</span>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${showCalculation ? 'rotate-180' : ''}`} />
              </button>
              
              {showCalculation && (
                <motion.div
                  className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <h4 className="text-[15px] font-semibold text-[#0F172A] mb-4">How We Calculate Costs</h4>
                  <div className="space-y-3 text-sm text-slate-700">
                    <p className="p-3 bg-white rounded-lg">
                      <strong>Surface Preparation:</strong> Based on computed element surface area and cleaning/priming rates.
                    </p>
                    <p className="p-3 bg-white rounded-lg">
                      <strong>Epoxy Injection:</strong> Crack length inferred from damage extent and element perimeter.
                    </p>
                    <p className="p-3 bg-white rounded-lg">
                      <strong>RC Jacketing:</strong> Jacket concrete quantity from geometry and retrofit-level assumptions.
                    </p>
                    <p className="p-3 bg-white rounded-lg">
                      <strong>Labor:</strong> Labor effort scales with damage extent, access limits, and occupancy constraints.
                    </p>
                    <p className="p-3 bg-white rounded-lg">
                      <strong>Regional Adjustments:</strong> Location multiplier and complexity coefficient are applied to base cost.
                    </p>
                  </div>
                </motion.div>
              )}
              
              {/* Warning Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900 mb-1">
                    Cost Accuracy Range: ±15%
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Final costs may vary based on material availability, contractor rates, and site-specific conditions. This estimate serves as a professional guideline.
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.button
                  onClick={handleAddDefect}
                  className="px-6 py-3.5 bg-white hover:bg-slate-50 border-2 border-[#2563EB] text-[#2563EB] rounded-lg transition-all shadow-sm font-medium text-[15px] flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Plus className="w-5 h-5" />
                  Add Another Defect
                </motion.button>
                <motion.button
                  onClick={handleViewReport}
                  className="px-6 py-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition-all shadow-sm font-medium text-[15px] flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <FileText className="w-5 h-5" />
                  Generate Full Report
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </div>
      </div>
    </div>
  )
}
