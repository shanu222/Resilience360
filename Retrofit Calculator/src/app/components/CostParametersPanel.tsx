import { useState } from "react"
import { X, Save, RotateCcw, Database, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { useAppContext } from "../context/AppContext"

export function CostParametersPanel({ onClose }: { onClose: () => void }) {
  const { cityRates, updateCityRateParameter } = useAppContext()
  const [hasChanges, setHasChanges] = useState(false)

  if (!cityRates) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-6 h-6 text-red-500" />
                Database Not Connected
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 text-lg font-medium mb-2">No Cost Parameters Available</p>
                <p className="text-slate-500 text-sm">Please configure your location and cost rates first to access the cost parameters panel.</p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  const handleParameterChange = (field: keyof typeof cityRates, value: number) => {
    updateCityRateParameter(field, value)
    setHasChanges(true)
  }

  const handleReset = () => {
    window.location.reload()
  }

  const handleSave = () => {
    setHasChanges(false)
  }

  const parameterGroups = [
    {
      title: "Retrofit Method Unit Prices",
      description: "Cost per unit for each retrofit method",
      params: [
        { label: "Surface Preparation Rate", key: "surfacePreparationRate" as const, unit: "PKR/m²", step: 100 },
        { label: "Epoxy Injection Rate", key: "epoxyInjectionRate" as const, unit: "PKR/m", step: 50 },
        { label: "RC Jacketing Rate", key: "rcJacketingRate" as const, unit: "PKR/m³", step: 500 },
      ],
    },
    {
      title: "Labor Rates",
      description: "Skilled labor and service rates",
      params: [
        { label: "Skilled Labor Rate", key: "skilledLaborRate" as const, unit: "PKR/hr", step: 50 },
      ],
    },
    {
      title: "Surface Repair Rates by Severity",
      description: "Unit prices for surface repairs based on damage severity",
      params: [
        { label: "Severe Surface Repair Rate", key: "severeSurfaceRepairRate" as const, unit: "PKR/m²", step: 100 },
        { label: "Moderate Surface Repair Rate", key: "moderateSurfaceRepairRate" as const, unit: "PKR/m²", step: 100 },
        { label: "Low Surface Repair Rate", key: "lowSurfaceRepairRate" as const, unit: "PKR/m²", step: 100 },
        { label: "Very Low Surface Repair Rate", key: "veryLowSurfaceRepairRate" as const, unit: "PKR/m²", step: 100 },
      ],
    },
    {
      title: "Cost Multipliers & Indices",
      description: "Adjustment factors for location and project complexity",
      params: [
        { label: "Location Multiplier", key: "locationMultiplier" as const, unit: "×", step: 0.05 },
      ],
    },
    {
      title: "Contingency & Overhead",
      description: "Percentage allocations for contingencies and contractor overhead",
      params: [
        { label: "Contingency Percentage", key: "contingencyPercent" as const, unit: "%", step: 0.5 },
        { label: "Contractor Overhead Percentage", key: "overheadPercent" as const, unit: "%", step: 0.5 },
      ],
    },
    {
      title: "Additional Cost Variables",
      description: "Fixed costs and allowances for special conditions",
      params: [
        { label: "Investigation Cost", key: "investigationCost" as const, unit: "PKR", step: 1000 },
        { label: "Replacement Allowance", key: "replacementAllowance" as const, unit: "PKR", step: 1000 },
      ],
    },
  ]

  const supportedCities = [
    "Karachi",
    "Lahore",
    "Islamabad",
    "Rawalpindi",
    "Faisalabad",
    "Multan",
    "Hyderabad",
    "Peshawar",
    "Quetta",
    "Gujranwala",
    "Sialkot",
    "Sargodha",
    "Bahawalpur",
    "Saidu Swat",
  ]

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-6 h-6 text-green-600" />
                Cost Parameters Database
              </h2>
              <p className="text-sm text-slate-600 mt-1">{cityRates.cityName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Supported Cities */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Supported Cities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {supportedCities.map((city) => (
                  <div
                    key={city}
                    className={`px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors ${
                      city === cityRates.cityName
                        ? "bg-blue-100 text-blue-700 border border-blue-300"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {city}
                  </div>
                ))}
              </div>
            </div>

            {/* Parameter Groups */}
            {parameterGroups.map((group, groupIndex) => (
              <motion.div
                key={groupIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.05 }}
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{group.title}</h3>
                <p className="text-sm text-slate-600 mb-4">{group.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                  {group.params.map((param) => (
                    <div key={param.key} className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 block">
                        {param.label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={cityRates[param.key] as number}
                          onChange={(e) =>
                            handleParameterChange(param.key, parseFloat(e.target.value) || 0)
                          }
                          step={param.step}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <span className="text-sm font-medium text-slate-600 min-w-[60px] text-right">
                          {param.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">💡 Note:</span> All changes to cost parameters will automatically recalculate the estimated costs in the Cost Breakdown and Final Report pages in real-time.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {hasChanges && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-amber-600 text-sm font-medium"
                >
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse" />
                  Unsaved changes
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={() => {
                  handleSave()
                  onClose()
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Save className="w-4 h-4" />
                Save & Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
