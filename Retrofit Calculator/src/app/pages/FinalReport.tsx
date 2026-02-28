import { Download, Share2, FileCheck, DollarSign, Calendar, AlertTriangle, TrendingUp, Package } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { motion } from "motion/react"
import { useAppContext } from "../context/AppContext"

export function FinalReport() {
  const { defects, activeEstimate, location, detectionData, formData, manualAnnotation } = useAppContext()

  const rows = defects.length > 0
    ? defects
    : activeEstimate
      ? [{
          id: "current",
          elementType: activeEstimate.elementType,
          defectType: detectionData?.defectType ?? "general",
          severity: detectionData?.severity ?? "Moderate",
          cost: activeEstimate.totalCost,
        }]
      : []

  const grouped = Object.values(
    rows.reduce<Record<string, { name: string; cost: number }>>((accumulator, row) => {
      const key = row.elementType || "Unknown"
      accumulator[key] = accumulator[key] ?? { name: key, cost: 0 }
      accumulator[key].cost += row.cost
      return accumulator
    }, {}),
  )

  const severityData = Object.values(
    rows.reduce<Record<string, { name: string; value: number }>>((acc, row) => {
      const key = row.severity
      acc[key] = acc[key] ?? { name: key, value: 0 }
      acc[key].value += 1
      return acc
    }, {}),
  )

  const total = rows.reduce((sum, row) => sum + row.cost, 0)
  const minEstimate = Math.round(total * 0.9)
  const maxEstimate = Math.round(total * 1.12)

  const annotationSeverityData = manualAnnotation
    ? manualAnnotation.zones
        .filter((zone) => zone.percentage > 0)
        .map((zone) => ({
          name: zone.label,
          value: Number(zone.percentage.toFixed(2)),
          areaM2: zone.areaM2,
          color: zone.color,
          strategy: zone.recommendedAction,
          estimatedCost: Math.round(zone.areaM2 * zone.unitCost * zone.severityMultiplier),
        }))
    : []
  
  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
  const SEVERITY_COLORS = { Low: '#10B981', Moderate: '#F59E0B', High: '#EF4444' }

  const reportPayload = {
    generatedAt: new Date().toISOString(),
    location,
    detection: detectionData,
    formData,
    manualAnnotation,
    activeEstimate,
    defects: rows,
    totalCost: total,
    minEstimate,
    maxEstimate,
  }

  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(reportPayload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `retrofit-report-${Date.now()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const shareReport = async () => {
    const shareText = `Retrofit estimate for ${location}: PKR ${total.toLocaleString()} (range PKR ${minEstimate.toLocaleString()} - ${maxEstimate.toLocaleString()})`

    if (navigator.share) {
      await navigator.share({
        title: "Retrofit Assessment Report",
        text: shareText,
      })
      return
    }

    await navigator.clipboard.writeText(shareText)
    window.alert("Report summary copied to clipboard.")
  }

  const requestReview = () => {
    const subject = encodeURIComponent("Engineer Review Request - Retrofit Assessment")
    const body = encodeURIComponent(
      `Please review this retrofit assessment.\n\nLocation: ${location}\nTotal Estimate: PKR ${total.toLocaleString()}\nEstimated Range: PKR ${minEstimate.toLocaleString()} - ${maxEstimate.toLocaleString()}\nDetected Defect: ${detectionData?.defectType ?? "N/A"}`,
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] border-b border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <h1 className="text-white text-[28px] sm:text-[32px] font-bold tracking-tight mb-2">Seismic Retrofit Assessment Report</h1>
          <p className="text-blue-100 text-[15px]">Professional Assessment • Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Executive Summary */}
        <motion.div
          className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-50 rounded-xl">
              <DollarSign className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h2 className="text-[22px] font-bold text-[#0F172A]">Executive Summary</h2>
              <p className="text-sm text-slate-600">Total cost estimate and project overview</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-5 border-2 border-slate-200">
              <p className="text-sm font-medium text-slate-600 mb-1">Minimum Estimate</p>
              <p className="text-2xl font-bold text-[#0F172A]">PKR {minEstimate.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Conservative scenario</p>
            </div>
            <div className="bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
              <p className="text-sm font-medium text-blue-100 mb-1">Most Likely Cost</p>
              <p className="text-3xl font-bold text-white">PKR {total.toLocaleString()}</p>
              <p className="text-xs text-blue-100 mt-1">Recommended budget</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-5 border-2 border-slate-200">
              <p className="text-sm font-medium text-slate-600 mb-1">Maximum Estimate</p>
              <p className="text-2xl font-bold text-[#0F172A]">PKR {maxEstimate.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Contingency included</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Location</p>
                <p className="font-semibold text-[#0F172A]">{location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Defects Assessed</p>
                <p className="font-semibold text-[#0F172A]">{rows.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Est. Duration</p>
                <p className="font-semibold text-[#0F172A]">{activeEstimate?.estimatedDurationWeeks ?? 'N/A'} weeks</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Confidence</p>
                <p className="font-semibold text-[#0F172A]">{activeEstimate?.confidence ?? 'N/A'}%</p>
              </div>
            </div>
          </div>
        </motion.div>

        {manualAnnotation && (
          <motion.div
            className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="p-6 sm:p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="text-[20px] font-bold text-[#0F172A] mb-1">Annotated Severity Segmentation</h3>
              <p className="text-sm text-slate-600">Manual color-coded zones converted to measurable area and retrofit strategy</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6 sm:p-8 border-b border-slate-200 bg-slate-50">
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-600 mb-1">Weighted Risk Score</p>
                <p className="text-2xl font-bold text-[#0F172A]">{manualAnnotation.weightedRiskScore}/100</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-600 mb-1">Damage Coverage</p>
                <p className="text-2xl font-bold text-[#0F172A]">{manualAnnotation.damagePercent.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-600 mb-1">High-Severity Coverage</p>
                <p className="text-2xl font-bold text-[#0F172A]">{manualAnnotation.severePercent.toFixed(1)}%</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Severity</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Area %</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Area (m²)</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Estimated Cost</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {annotationSeverityData.map((zone) => (
                    <tr key={zone.name}>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }}></span>
                          {zone.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-slate-700">{zone.value.toFixed(2)}%</td>
                      <td className="px-6 py-4 text-sm text-right text-slate-700">{zone.areaM2.toFixed(3)}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-[#0F172A]">PKR {zone.estimatedCost.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{zone.strategy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(manualAnnotation.replacementRecommended || manualAnnotation.investigationRequired) && (
              <div className="px-6 sm:px-8 py-4 bg-amber-50 border-t border-amber-200 text-sm text-amber-900">
                {manualAnnotation.replacementRecommended && "Severe area threshold exceeded: full element replacement assessment is recommended. "}
                {manualAnnotation.investigationRequired && "Detailed structural investigation should be included in the project scope."}
              </div>
            )}
          </motion.div>
        )}

        {/* Defect Breakdown Table */}
        <motion.div
          className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-6 sm:p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-[20px] font-bold text-[#0F172A] mb-1">Detailed Defect Breakdown</h3>
            <p className="text-sm text-slate-600">Complete list of identified defects and estimated costs</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Element Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Defect Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Estimated Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-[#0F172A]">{row.elementType}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{row.defectType}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        row.severity === 'High' ? 'bg-red-100 text-red-700' :
                        row.severity === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {row.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-right text-[#0F172A]">PKR {row.cost.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={4} className="px-6 py-4 text-sm text-[#0F172A]">Total Estimated Cost</td>
                  <td className="px-6 py-4 text-sm text-right text-[#2563EB]">PKR {total.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Distribution Pie Chart */}
          <motion.div
            className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-[18px] font-bold text-[#0F172A] mb-6">Cost Distribution by Element</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={grouped}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="cost"
                >
                  {grouped.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `PKR ${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Severity Distribution */}
          <motion.div
            className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="text-[18px] font-bold text-[#0F172A] mb-6">Defects by Severity Level</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Bar Chart Section */}
        <motion.div
          className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-[18px] font-bold text-[#0F172A] mb-6">Cost Comparison by Element Type</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={grouped}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" stroke="#64748B" fontSize={13} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
              <YAxis stroke="#64748B" fontSize={13} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <Tooltip formatter={(value: number) => [`PKR ${value.toLocaleString()}`, "Cost"]} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
              <Bar dataKey="cost" radius={[8, 8, 0, 0]} fill="#2563EB" maxBarSize={70} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Cost Line Items Table (if available) */}
        {activeEstimate?.lineItems && activeEstimate.lineItems.length > 0 && (
          <motion.div
            className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="p-6 sm:p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <h3 className="text-[20px] font-bold text-[#0F172A] mb-1">Detailed Cost Line Items</h3>
              <p className="text-sm text-slate-600">Breakdown of materials, labor, and services</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Item Description</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Unit Cost (PKR)</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Total (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeEstimate.lineItems.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-[#0F172A]">{item.item}</td>
                      <td className="px-6 py-4 text-sm text-center text-slate-700">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-right text-slate-700">{item.unitCost.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-right text-[#0F172A]">{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Project Assumptions */}
        {activeEstimate?.assumptions && activeEstimate.assumptions.length > 0 && (
          <motion.div
            className="bg-amber-50 rounded-xl shadow-sm border-2 border-amber-200 p-6 sm:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-[18px] font-bold text-amber-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Project Assumptions & Notes
            </h3>
            <ul className="space-y-2">
              {activeEstimate.assumptions.map((assumption, index) => (
                <li key={index} className="text-sm text-amber-800 flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{assumption}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-3 gap-4" 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.45 }}
        >
          <button onClick={downloadReport} className="px-6 py-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl font-semibold">
            <Download className="w-5 h-5" />
            Download Report
          </button>
          <button onClick={() => { void shareReport() }} className="px-6 py-4 bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-700 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md font-semibold">
            <Share2 className="w-5 h-5" />
            Share Summary
          </button>
          <button onClick={requestReview} className="px-6 py-4 bg-white hover:bg-slate-50 border-2 border-[#2563EB] text-[#2563EB] rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md font-semibold">
            <FileCheck className="w-5 h-5" />
            Engineer Review
          </button>
        </motion.div>
      </div>
    </div>
  )
}
