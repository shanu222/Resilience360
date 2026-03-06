import { Loader2, Play, Image, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { analyzeFileRealtime, createReport, downloadTextFile } from "../services/realtimeAi";
import { getTransientFile, useEstimator } from "../state/estimatorStore";

export function AIQuantityTakeoff() {
  const navigate = useNavigate();
  const { state, setSelectedFileId, setTakeoffResult, setUploadStatus, addReport } = useEstimator();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  const selectedFile =
    state.uploadedFiles.find((file) => file.id === state.selectedFileId) ?? state.uploadedFiles[0] ?? null;

  const runTakeoff = async () => {
    if (!selectedFile) {
      setStatusMessage("Upload or select a drawing/photo before running AI quantity extraction.");
      return;
    }

    setIsAnalyzing(true);
    setProgress(12);
    setUploadStatus(selectedFile.id, "Processing");

    try {
      setProgress(35);
      const sourceFile = getTransientFile(selectedFile.id);
      const result = await analyzeFileRealtime(selectedFile, sourceFile);
      setProgress(80);
      const merged = [
        ...state.takeoffElements.filter((element) => element.sourceFileId !== selectedFile.id),
        ...result.elements,
      ];
      setTakeoffResult(merged, result.confidence);
      setUploadStatus(selectedFile.id, "Completed");
      setStatusMessage(result.summary);
      setProgress(100);
    } catch (error) {
      setUploadStatus(selectedFile.id, "Failed");
      setStatusMessage(error instanceof Error ? error.message : "AI extraction failed.");
      setProgress(0);
    } finally {
      setTimeout(() => setProgress(0), 700);
      setIsAnalyzing(false);
    }
  };

  const confidence = state.takeoffConfidence;
  const elements = state.takeoffElements;

  const elementsByType = useMemo(() => {
    const grouped = new Map<string, { quantity: number; measurement: number; unit: string; confidence: number; count: number }>();
    elements.forEach((element) => {
      const key = element.name;
      const measurementValue = Number.parseFloat(element.measurement) || 0;
      const current = grouped.get(key) ?? {
        quantity: 0,
        measurement: 0,
        unit: element.unit,
        confidence: 0,
        count: 0,
      };
      current.quantity += element.quantity;
      current.measurement += measurementValue;
      current.confidence += element.confidence;
      current.count += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.entries()).map(([name, value]) => ({
      name,
      quantity: value.quantity,
      measurement: value.measurement.toFixed(0),
      unit: value.unit,
      confidence: Math.round(value.confidence / Math.max(value.count, 1)),
    }));
  }, [elements]);

  const exportQuantities = () => {
    if (elementsByType.length === 0) {
      setStatusMessage("Run quantity extraction first to export results.");
      return;
    }
    const csv = [
      "Element,Quantity,Measurement,Unit,Confidence",
      ...elementsByType.map((item) => `${item.name},${item.quantity},${item.measurement},${item.unit},${item.confidence}%`),
    ].join("\n");
    downloadTextFile("ai-quantity-takeoff.csv", csv);
    setStatusMessage("Quantity takeoff exported as CSV.");
  };

  const saveResults = () => {
    if (elementsByType.length === 0) {
      setStatusMessage("No results available to save yet.");
      return;
    }
    const content = [
      "AI Quantity Takeoff Results",
      `Generated: ${new Date().toLocaleString()}`,
      `Confidence: ${confidence}%`,
      "",
      ...elementsByType.map((item) => `${item.name}: ${item.quantity} items | ${item.measurement} ${item.unit}`),
    ].join("\n");
    addReport(createReport("AI Quantity Takeoff", content));
    setStatusMessage("Results saved to Reports.");
  };

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
            {selectedFile?.previewDataUrl ? (
              <img src={selectedFile.previewDataUrl} alt={selectedFile.name} className="h-full w-full object-contain" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100" />
            )}
            <div className="relative z-10 text-center px-3 py-2 rounded bg-white/80">
              {selectedFile ? (
                <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No uploaded drawing selected</p>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.uploadedFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  selectedFile?.id === file.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                }`}
              >
                {file.previewDataUrl ? <Image className="inline w-3 h-3 mr-1" /> : <FileText className="inline w-3 h-3 mr-1" />}
                {file.name.length > 24 ? `${file.name.slice(0, 24)}...` : file.name}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => void runTakeoff()}
              disabled={isAnalyzing}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Play className="w-4 h-4" />
              {isAnalyzing ? "Running..." : "Run AI Quantity Extraction"}
            </button>
          </div>
          {(isAnalyzing || progress > 0) && (
            <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
                <span className="text-sm font-medium text-accent-foreground">
                  AI analyzing drawings...
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Extracting dimensions, quantities, and materials in real time...
              </p>
            </div>
          )}
          {statusMessage && <p className="mt-3 text-sm text-muted-foreground">{statusMessage}</p>}
        </div>

        {/* Right: Detected Elements */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4">Detected Elements</h3>
          <div className="space-y-3">
            {elementsByType.length === 0 && (
              <div className="p-4 bg-muted/50 rounded-lg border border-border text-sm text-muted-foreground">
                No extracted elements yet. Run AI extraction on an uploaded file.
              </div>
            )}
            {elementsByType.map((element, idx) => (
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
                  <div className="text-xs">Confidence {element.confidence}%</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Elements Detected</span>
              <span className="font-semibold">{elementsByType.length} types</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confidence Score</span>
              <span className="font-semibold text-green-600">{confidence ? `${confidence}%` : "N/A"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/cost-estimation")}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Generate Cost Estimate
        </button>
        <button
          onClick={exportQuantities}
          className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Export Quantities
        </button>
        <button
          onClick={saveResults}
          className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Save Results
        </button>
      </div>
    </div>
  );
}
