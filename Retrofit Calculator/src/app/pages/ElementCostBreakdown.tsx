import { useNavigate } from "react-router";
import { Info, ChevronDown, DollarSign, Calculator, Package, Users, AlertTriangle, FileText, Plus } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { useAppContext } from "../context/AppContext";

export function ElementCostBreakdown() {
  const navigate = useNavigate();
  const { addDefect } = useAppContext();
  const [showCalculation, setShowCalculation] = useState(false);
  const [calculating, setCalculating] = useState(true);
  
  useState(() => {
    setTimeout(() => setCalculating(false), 1500);
  });
  
  const costItems = [
    { item: "Surface Preparation", quantity: "2.025 m²", unitCost: "PKR 450", total: "PKR 911", icon: Package },
    { item: "Epoxy Injection", quantity: "0.8 m", unitCost: "PKR 2,500", total: "PKR 2,000", icon: Package },
    { item: "RC Jacketing", quantity: "1.35 m³", unitCost: "PKR 85,000", total: "PKR 114,750", icon: Package },
    { item: "Skilled Labor", quantity: "48 hrs", unitCost: "PKR 800", total: "PKR 38,400", icon: Users },
  ];
  
  const baseCost = 156061;
  const locationMultiplier = 1.05;
  const complexityMultiplier = 1.15;
  const contingency = baseCost * 0.1;
  const overhead = baseCost * 0.15;
  const totalCost = Math.round(baseCost * locationMultiplier * complexityMultiplier + contingency + overhead);
  
  const handleAddDefect = () => {
    addDefect({ elementType: "Column", cost: totalCost });
    navigate("/");
  };
  
  const handleViewReport = () => {
    addDefect({ elementType: "Column", cost: totalCost });
    navigate("/final-report");
  };
  
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
      
      <div className="max-w-6xl mx-auto px-8 py-8">
        <motion.div
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-6 h-6 text-[#2563EB]" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-[#0F172A]">Column Retrofit Estimate</h2>
              <p className="text-sm text-slate-500">Structural strengthening with RC jacketing</p>
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
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
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
                          <td className="px-6 py-4 text-slate-600 text-sm">{row.unitCost}</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-900 text-sm">{row.total}</td>
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
                    <span className="text-sm text-slate-600">Base Construction Cost</span>
                    <span className="text-sm font-semibold text-slate-900">PKR {baseCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm text-slate-600">Location Adjustment (Lahore)</span>
                    <span className="text-sm font-semibold text-[#2563EB]">×{locationMultiplier}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm text-slate-600">Complexity Factor</span>
                    <span className="text-sm font-semibold text-[#2563EB]">×{complexityMultiplier}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                    <span className="text-sm text-slate-600">Contingency (10%)</span>
                    <span className="text-sm font-semibold text-amber-600">PKR {contingency.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg border-b-2 border-slate-200 pb-4">
                    <span className="text-sm text-slate-600">Contractor Overhead (15%)</span>
                    <span className="text-sm font-semibold text-amber-600">PKR {overhead.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 p-4 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] rounded-lg shadow-sm">
                    <span className="text-white text-base font-medium">Total Estimated Cost</span>
                    <span className="text-white text-2xl font-bold">PKR {totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
              
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
                      <strong>Surface Preparation:</strong> Calculated based on column surface area (2.025 m²) at PKR 450/m²
                    </p>
                    <p className="p-3 bg-white rounded-lg">
                      <strong>Epoxy Injection:</strong> Crack length (0.8m) × unit rate (PKR 2,500/m) for moderate severity cracks
                    </p>
                    <p className="p-3 bg-white rounded-lg">
                      <strong>RC Jacketing:</strong> Volume of concrete jacket (1.35 m³) at PKR 85,000/m³ including reinforcement
                    </p>
                    <p className="p-3 bg-white rounded-lg">
                      <strong>Labor:</strong> Estimated 48 hours of skilled labor at PKR 800/hour
                    </p>
                    <p className="p-3 bg-white rounded-lg">
                      <strong>Regional Adjustments:</strong> Lahore location factor (1.05) and complexity multiplier (1.15) applied
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
              <div className="grid grid-cols-2 gap-4">
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
  );
}
