import { Download, Share2, FileCheck, DollarSign } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { motion } from "motion/react"
import { useAppContext } from "../context/AppContext"

export function FinalReport() {
  const { defects, activeEstimate, location, detectionData, formData } = useAppContext()

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

  const total = rows.reduce((sum, row) => sum + row.cost, 0)
  const minEstimate = Math.round(total * 0.9)
  const maxEstimate = Math.round(total * 1.12)

  const reportPayload = {
    generatedAt: new Date().toISOString(),
    location,
    detection: detectionData,
    formData,
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
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <h1 className="text-[#0F172A] text-[24px] sm:text-[28px] font-semibold tracking-tight mb-2">Comprehensive Assessment Report</h1>
          <p className="text-slate-600 text-[15px]">Live report generated from uploaded image, AI detection and input-confirmed dimensions.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-[20px] font-semibold text-[#0F172A]">Total Cost Estimate</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600">Minimum Estimate</p>
              <p className="text-2xl font-bold text-[#0F172A]">PKR {minEstimate.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-lg p-4 text-white">
              <p className="text-sm text-blue-100">Most Likely</p>
              <p className="text-3xl font-bold">PKR {total.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600">Maximum Estimate</p>
              <p className="text-2xl font-bold text-[#0F172A]">PKR {maxEstimate.toLocaleString()}</p>
            </div>
          </div>

          <p className="text-sm text-slate-600">Location: <strong>{location}</strong> • Defects assessed: <strong>{rows.length}</strong></p>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 lg:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-[18px] font-semibold text-[#0F172A] mb-6">Cost Distribution by Element</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={grouped}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" stroke="#64748B" fontSize={13} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
              <YAxis stroke="#64748B" fontSize={13} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <Tooltip formatter={(value: number) => [`PKR ${value.toLocaleString()}`, "Cost"]} />
              <Bar dataKey="cost" radius={[6, 6, 0, 0]} fill="#2563EB" maxBarSize={70} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <button onClick={downloadReport} className="px-6 py-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm font-medium">
            <Download className="w-5 h-5" />
            Download Report JSON
          </button>
          <button onClick={() => { void shareReport() }} className="px-6 py-4 bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 rounded-lg transition-all flex items-center justify-center gap-2 font-medium">
            <Share2 className="w-5 h-5" />
            Share Summary
          </button>
          <button onClick={requestReview} className="px-6 py-4 bg-white hover:bg-slate-50 border-2 border-[#2563EB] text-[#2563EB] rounded-lg transition-all flex items-center justify-center gap-2 font-medium">
            <FileCheck className="w-5 h-5" />
            Request Engineer Review
          </button>
        </motion.div>
      </div>
    </div>
  )
}
