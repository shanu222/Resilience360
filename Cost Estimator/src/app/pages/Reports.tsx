import { FileText, Download, Eye, Calendar } from "lucide-react";
import { useMemo, useState } from "react";
import { buildReportContent, createReport, downloadTextFile } from "../services/realtimeAi";
import { useEstimator } from "../state/estimatorStore";

const reportTypes = [
  {
    title: "Cost Report",
    description: "Detailed breakdown of all project costs including materials, labor, and equipment",
    icon: FileText,
  },
  {
    title: "Budget Analysis",
    description: "Comprehensive budget vs actual spending analysis with variance reports",
    icon: FileText,
  },
  {
    title: "BOQ Report",
    description: "Complete Bill of Quantities for contractor bidding and estimation",
    icon: FileText,
  },
  {
    title: "Project Summary",
    description: "Executive summary with key metrics, timeline, and financial overview",
    icon: FileText,
  },
];

export function Reports() {
  const { state, addReport } = useEstimator();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const reports = useMemo(() => {
    return state.reports.map((report) => ({
      name: report.name,
      type: report.type,
      date: report.date,
      size: report.size,
      id: report.id,
      content: report.content,
    }));
  }, [state.reports]);

  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? null;

  const generateReport = (type: string) => {
    if (state.costItems.length === 0 && state.takeoffElements.length === 0) {
      setStatusMessage("No analyzed project data available. Upload and analyze documents first.");
      return;
    }
    const riskIndex = Math.min(95, Math.max(18, Math.round(40 + state.takeoffConfidence * 0.4)));
    const content = buildReportContent({
      type,
      uploadedFiles: state.uploadedFiles,
      takeoffElements: state.takeoffElements,
      costItems: state.costItems,
      settings: state.settings,
      riskIndex,
    });
    const report = createReport(type, content);
    addReport(report);
    setSelectedReportId(report.id);
    setStatusMessage(`${type} generated and saved.`);
  };

  const downloadReport = (format: "pdf" | "xlsx" | "txt") => {
    if (!selectedReport) {
      setStatusMessage("Select or generate a report first.");
      return;
    }
    const extension = format === "xlsx" ? "csv" : format;
    const filename = `${selectedReport.name.replace(/\s+/g, "-").toLowerCase()}.${extension}`;
    downloadTextFile(filename, selectedReport.content);
    setStatusMessage(`Downloaded ${selectedReport.name} as ${format.toUpperCase()}.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Reports</h1>
        <p className="text-muted-foreground">
          Generate and download comprehensive project reports
        </p>
      </div>

      {/* Report Generation */}
      <div>
        <h3 className="font-semibold mb-4">Generate New Report</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reportTypes.map((report, idx) => {
            const Icon = report.icon;
            return (
              <div key={idx} className="bg-card rounded-xl p-6 border border-border hover:border-primary transition-colors">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-lg p-3">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">{report.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {report.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Last generated: {reports.find((item) => item.type === report.title)?.date ?? "Not generated yet"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => generateReport(report.title)}
                        className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
                      >
                        Generate
                      </button>
                      <button
                        onClick={() => {
                          const found = reports.find((item) => item.type === report.title);
                          if (found) {
                            setSelectedReportId(found.id);
                            setStatusMessage(`Previewing ${found.name}.`);
                          } else {
                            setStatusMessage(`No ${report.title} available yet. Generate it first.`);
                          }
                        }}
                        className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Report Preview Section */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Report Preview</h3>
          <div className="flex gap-2">
            <button
              onClick={() => downloadReport("pdf")}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={() => downloadReport("xlsx")}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              Download Excel
            </button>
          </div>
        </div>
        <div className="aspect-[16/10] bg-muted rounded-lg flex items-center justify-center">
          {selectedReport ? (
            <div className="w-full h-full p-5 overflow-auto">
              <pre className="text-xs whitespace-pre-wrap">{selectedReport.content}</pre>
            </div>
          ) : (
            <div className="text-center">
              <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Select a report type to preview</p>
            </div>
          )}
        </div>
        {statusMessage && <p className="mt-3 text-sm text-muted-foreground">{statusMessage}</p>}
      </div>

      {/* Recent Reports */}
      <div>
        <h3 className="font-semibold mb-4">Recent Reports</h3>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium">Report Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Size</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      No reports generated yet. Use "Generate" on any report type to create real report data.
                    </td>
                  </tr>
                )}
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">{report.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                        {report.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{report.date}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{report.size}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedReportId(report.id);
                            setStatusMessage(`Previewing ${report.name}.`);
                          }}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            downloadTextFile(`${report.name.replace(/\s+/g, "-").toLowerCase()}.txt`, report.content);
                            setStatusMessage(`Downloaded ${report.name}.`);
                          }}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
