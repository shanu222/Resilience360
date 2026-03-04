import { FileText, Download, Eye, Calendar } from "lucide-react";

const reportTypes = [
  {
    title: "Cost Report",
    description: "Detailed breakdown of all project costs including materials, labor, and equipment",
    icon: FileText,
    lastGenerated: "March 3, 2026",
  },
  {
    title: "Budget Analysis",
    description: "Comprehensive budget vs actual spending analysis with variance reports",
    icon: FileText,
    lastGenerated: "March 2, 2026",
  },
  {
    title: "BOQ Report",
    description: "Complete Bill of Quantities for contractor bidding and estimation",
    icon: FileText,
    lastGenerated: "March 1, 2026",
  },
  {
    title: "Project Summary",
    description: "Executive summary with key metrics, timeline, and financial overview",
    icon: FileText,
    lastGenerated: "February 28, 2026",
  },
];

const recentReports = [
  {
    name: "Monthly Cost Report - February 2026",
    type: "Cost Report",
    date: "March 1, 2026",
    size: "2.4 MB",
  },
  {
    name: "Q1 Budget Analysis",
    type: "Budget Analysis",
    date: "February 28, 2026",
    size: "1.8 MB",
  },
  {
    name: "BOQ - Downtown Office Complex",
    type: "BOQ Report",
    date: "February 25, 2026",
    size: "3.2 MB",
  },
  {
    name: "Project Summary - Week 8",
    type: "Project Summary",
    date: "February 22, 2026",
    size: "1.5 MB",
  },
];

export function Reports() {
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
                      <span>Last generated: {report.lastGenerated}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity">
                        Generate
                      </button>
                      <button className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
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
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm hover:opacity-90 transition-opacity">
              <Download className="w-4 h-4" />
              Download Excel
            </button>
          </div>
        </div>
        <div className="aspect-[16/10] bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Select a report type to preview</p>
          </div>
        </div>
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
                {recentReports.map((report, idx) => (
                  <tr
                    key={idx}
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
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
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
