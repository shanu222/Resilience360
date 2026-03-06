import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { buildReportContent, createReport, downloadTextFile } from "../services/realtimeAi";
import { useEstimator } from "../state/estimatorStore";

export function BillOfQuantities() {
  const { state, addReport } = useEstimator();
  const liveRows = state.costItems.map((item, index) => ({
    itemNo: `${index + 1}.0`,
    description: item.item,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitCost,
    totalPrice: item.quantity * item.unitCost,
  }));

  const sourceRows = liveRows;
  const hasRows = sourceRows.length > 0;
  const totalAmount = sourceRows.reduce((sum, item) => sum + item.totalPrice, 0);

  const downloadBoq = (format: "excel" | "pdf") => {
    const header = "Item No,Description,Quantity,Unit,Unit Price,Total Price";
    const body = sourceRows.map((item) => `${item.itemNo},${item.description},${item.quantity},${item.unit},${item.unitPrice},${item.totalPrice}`);
    const content = [header, ...body].join("\n");
    const extension = format === "excel" ? "csv" : "txt";
    downloadTextFile(`boq-export.${extension}`, content);
  };

  const generateContractorEstimate = () => {
    const riskIndex = Math.min(95, Math.max(20, Math.round(40 + state.takeoffConfidence * 0.4)));
    const content = buildReportContent({
      type: "Contractor Estimate",
      uploadedFiles: state.uploadedFiles,
      takeoffElements: state.takeoffElements,
      costItems: state.costItems,
      settings: state.settings,
      riskIndex,
    });
    addReport(createReport("Contractor Estimate", content));
  };

  const shareWithTeam = async () => {
    const shareText = `BOQ total: $${Math.round(totalAmount * 1.15).toLocaleString()} | Files: ${state.uploadedFiles.length} | Generated: ${new Date().toLocaleString()}`;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(shareText);
      return;
    }
    window.prompt("Copy BOQ summary:", shareText);
  };

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
          <button disabled={!hasRows} onClick={() => downloadBoq("excel")} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button disabled={!hasRows} onClick={() => downloadBoq("pdf")} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
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
            <p className="font-medium">Current Uploaded Project</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-medium">{state.settings.defaultRegion || "Not configured"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">{new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">BOQ Number</p>
            <p className="font-medium">{`BOQ-${Date.now().toString().slice(-6)}`}</p>
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
              {sourceRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    BOQ is empty. Upload and analyze documents to generate bill of quantities entries.
                  </td>
                </tr>
              )}
              {sourceRows.map((item, idx) => (
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
        <button disabled={!hasRows} onClick={generateContractorEstimate} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
          Generate Contractor Estimate
        </button>
        <button disabled={!hasRows} onClick={() => downloadBoq("pdf")} className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
          Download Report
        </button>
        <button disabled={!hasRows} onClick={() => void shareWithTeam()} className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-60">
          Share with Team
        </button>
      </div>
    </div>
  );
}
