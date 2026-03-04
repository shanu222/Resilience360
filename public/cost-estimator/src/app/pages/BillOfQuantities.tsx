import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";

const boqItems = [
  {
    itemNo: "1.0",
    description: "Site Preparation and Earthwork",
    quantity: 1,
    unit: "Lump Sum",
    unitPrice: 25000,
    totalPrice: 25000,
  },
  {
    itemNo: "1.1",
    description: "Excavation for foundation",
    quantity: 800,
    unit: "cubic meters",
    unitPrice: 45,
    totalPrice: 36000,
  },
  {
    itemNo: "2.0",
    description: "Concrete Work",
    quantity: 800,
    unit: "cubic meters",
    unitPrice: 120,
    totalPrice: 96000,
  },
  {
    itemNo: "2.1",
    description: "Steel reinforcement",
    quantity: 12000,
    unit: "kg",
    unitPrice: 1.2,
    totalPrice: 14400,
  },
  {
    itemNo: "3.0",
    description: "Masonry Work - Brickwork",
    quantity: 5000,
    unit: "sq meters",
    unitPrice: 25,
    totalPrice: 125000,
  },
  {
    itemNo: "4.0",
    description: "Plastering and Finishing",
    quantity: 3000,
    unit: "sq meters",
    unitPrice: 15,
    totalPrice: 45000,
  },
  {
    itemNo: "5.0",
    description: "Flooring - Ceramic tiles",
    quantity: 1200,
    unit: "sq meters",
    unitPrice: 45,
    totalPrice: 54000,
  },
  {
    itemNo: "6.0",
    description: "Painting works",
    quantity: 3000,
    unit: "sq meters",
    unitPrice: 8,
    totalPrice: 24000,
  },
  {
    itemNo: "7.0",
    description: "Doors and Windows",
    quantity: 60,
    unit: "units",
    unitPrice: 420,
    totalPrice: 25200,
  },
  {
    itemNo: "8.0",
    description: "Electrical Installation",
    quantity: 1,
    unit: "Lump Sum",
    unitPrice: 85000,
    totalPrice: 85000,
  },
  {
    itemNo: "9.0",
    description: "Plumbing Installation",
    quantity: 1,
    unit: "Lump Sum",
    unitPrice: 65000,
    totalPrice: 65000,
  },
  {
    itemNo: "10.0",
    description: "HVAC System",
    quantity: 1,
    unit: "Lump Sum",
    unitPrice: 120000,
    totalPrice: 120000,
  },
];

export function BillOfQuantities() {
  const totalAmount = boqItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Bill of Quantities (BOQ)</h1>
          <p className="text-muted-foreground">
            Professional BOQ for contractor estimates and bidding
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90 transition-opacity">
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 transition-opacity">
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="font-semibold mb-4">Project Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Project Name</p>
            <p className="font-medium">Downtown Office Complex</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-medium">New York, NY</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">March 4, 2026</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">BOQ Number</p>
            <p className="font-medium">BOQ-2026-0147</p>
          </div>
        </div>
      </div>

      {/* BOQ Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">Item No.</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Description</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Quantity</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Unit</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Unit Price</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Total Price</th>
              </tr>
            </thead>
            <tbody>
              {boqItems.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-6 py-4 text-sm font-medium">{item.itemNo}</td>
                  <td className="px-6 py-4 text-sm">{item.description}</td>
                  <td className="px-6 py-4 text-sm">{item.quantity.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">{item.unit}</td>
                  <td className="px-6 py-4 text-sm">
                    ${item.unitPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    ${item.totalPrice.toLocaleString()}
                  </td>
                </tr>
              ))}
              {/* Subtotal Row */}
              <tr className="bg-muted/50 font-semibold">
                <td colSpan={5} className="px-6 py-4 text-sm text-right">
                  Subtotal (Materials & Labor)
                </td>
                <td className="px-6 py-4 text-sm">${totalAmount.toLocaleString()}</td>
              </tr>
              {/* Additional Costs */}
              <tr className="border-b border-border">
                <td colSpan={5} className="px-6 py-3 text-sm text-right text-muted-foreground">
                  Contingency (5%)
                </td>
                <td className="px-6 py-3 text-sm">${(totalAmount * 0.05).toLocaleString()}</td>
              </tr>
              <tr className="border-b border-border">
                <td colSpan={5} className="px-6 py-3 text-sm text-right text-muted-foreground">
                  Overhead & Profit (10%)
                </td>
                <td className="px-6 py-3 text-sm">${(totalAmount * 0.1).toLocaleString()}</td>
              </tr>
              {/* Grand Total */}
              <tr className="bg-primary/10 font-semibold text-lg">
                <td colSpan={5} className="px-6 py-4 text-right">
                  Grand Total
                </td>
                <td className="px-6 py-4 text-primary">
                  ${(totalAmount * 1.15).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          Generate Contractor Estimate
        </button>
        <button className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity">
          Download Report
        </button>
        <button className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors">
          Share with Team
        </button>
      </div>
    </div>
  );
}
