import { Loader2, Play } from "lucide-react";

const detectedElements = [
  { name: "Walls", quantity: 45, measurement: "150", unit: "linear meters" },
  { name: "Slabs", quantity: 3, measurement: "1200", unit: "sq meters" },
  { name: "Columns", quantity: 28, measurement: "4.5", unit: "meters height" },
  { name: "Beams", quantity: 52, measurement: "8", unit: "meters each" },
  { name: "Doors", quantity: 24, measurement: "2.1", unit: "meters height" },
  { name: "Windows", quantity: 36, measurement: "1.5", unit: "sq meters each" },
  { name: "Stairs", quantity: 4, measurement: "3.5", unit: "meters rise" },
  { name: "Roof", quantity: 1, measurement: "1500", unit: "sq meters" },
  { name: "Foundation", quantity: 1, measurement: "800", unit: "cubic meters" },
];

export function AIQuantityTakeoff() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">AI Quantity Takeoff</h1>
        <p className="text-muted-foreground">
          AI-powered analysis of construction drawings to extract quantities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Blueprint Preview */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4">Blueprint Preview</h3>
          <div className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
            {/* Mock blueprint image */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100">
              <svg className="w-full h-full opacity-30" viewBox="0 0 400 300">
                <rect x="50" y="50" width="300" height="200" fill="none" stroke="#3A63FF" strokeWidth="2" />
                <rect x="80" y="80" width="80" height="60" fill="none" stroke="#3A63FF" strokeWidth="1.5" />
                <rect x="180" y="80" width="80" height="60" fill="none" stroke="#3A63FF" strokeWidth="1.5" />
                <rect x="280" y="80" width="50" height="60" fill="none" stroke="#3A63FF" strokeWidth="1.5" />
                <rect x="80" y="160" width="80" height="70" fill="none" stroke="#3A63FF" strokeWidth="1.5" />
                <rect x="180" y="160" width="80" height="70" fill="none" stroke="#3A63FF" strokeWidth="1.5" />
                <line x1="50" y1="150" x2="350" y2="150" stroke="#2EC4B6" strokeWidth="1" strokeDasharray="5,5" />
                <line x1="200" y1="50" x2="200" y2="250" stroke="#2EC4B6" strokeWidth="1" strokeDasharray="5,5" />
              </svg>
            </div>
            <div className="relative z-10 text-center">
              <p className="text-sm text-muted-foreground">Floor_Plan_Level_1.pdf</p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              Run AI Quantity Extraction
            </button>
          </div>
          <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 text-accent animate-spin" />
              <span className="text-sm font-medium text-accent-foreground">
                AI analyzing drawings...
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: "65%" }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Extracting dimensions, quantities, and materials...
            </p>
          </div>
        </div>

        {/* Right: Detected Elements */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4">Detected Elements</h3>
          <div className="space-y-3">
            {detectedElements.map((element, idx) => (
              <div
                key={idx}
                className="p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{element.name}</h4>
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                    {element.quantity} items
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">
                      {element.measurement}
                    </span>{" "}
                    {element.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Elements Detected</span>
              <span className="font-semibold">{detectedElements.length} types</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confidence Score</span>
              <span className="font-semibold text-green-600">94.5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          Generate Cost Estimate
        </button>
        <button className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity">
          Export Quantities
        </button>
        <button className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors">
          Save Results
        </button>
      </div>
    </div>
  );
}
