import { Loader2, Play, Image, FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { analyzeFileRealtime, createReport, downloadTextFile } from "../services/realtimeAi";
import type { TakeoffElement } from "../state/estimatorStore";
import { getTransientFile, useEstimator } from "../state/estimatorStore";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PageAnalysisSnapshot = {
  elements: TakeoffElement[];
  confidence: number;
  summary: string;
  debug: Record<string, unknown> | null;
  formula: string;
  costBreakdown: {
    materialCost: number;
    laborCost: number;
    equipmentCost: number;
    totalCost: number;
  } | null;
  validationIssues: string[];
  documentHash: string;
  fromCache: boolean;
  analyzedAt: string;
};

const makePageKey = (fileId: string, page: number) => `${fileId}::${page}`;

const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: "image/jpeg" });
};

export function AIQuantityTakeoff() {
  const navigate = useNavigate();
  const { state, setSelectedFileId, setTakeoffResult, setUploadStatus, addReport } = useEstimator();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [latestDebugPayload, setLatestDebugPayload] = useState<Record<string, unknown> | null>(null);
  const [latestFormula, setLatestFormula] = useState<string>("");
  const [latestCostBreakdown, setLatestCostBreakdown] = useState<{
    materialCost: number;
    laborCost: number;
    equipmentCost: number;
    totalCost: number;
  } | null>(null);
  const [latestValidationIssues, setLatestValidationIssues] = useState<string[]>([]);
  const [latestDocumentHash, setLatestDocumentHash] = useState<string>("");
  const [pdfPreviewPages, setPdfPreviewPages] = useState<string[]>([]);
  const [currentPdfPage, setCurrentPdfPage] = useState(0);
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);
  const [pdfPreviewError, setPdfPreviewError] = useState("");
  const [pageAnalysisByKey, setPageAnalysisByKey] = useState<Record<string, PageAnalysisSnapshot>>({});
  const pdfPreviewCacheRef = useRef<Map<string, string[]>>(new Map());

  const selectedFile =
    state.uploadedFiles.find((file) => file.id === state.selectedFileId) ?? state.uploadedFiles[0] ?? null;

  const selectedFileIsPdf =
    Boolean(selectedFile) && (selectedFile?.type.toLowerCase().includes("pdf") || selectedFile?.name.toLowerCase().endsWith(".pdf"));

  const activePageNumber = selectedFileIsPdf ? currentPdfPage + 1 : 1;

  useEffect(() => {
    let isCancelled = false;

    const renderPdfPages = async () => {
      if (!selectedFile || !selectedFileIsPdf) {
        setPdfPreviewPages([]);
        setCurrentPdfPage(0);
        setPdfPreviewError("");
        return;
      }

      const cached = pdfPreviewCacheRef.current.get(selectedFile.id);
      if (cached && cached.length > 0) {
        setPdfPreviewPages(cached);
        setCurrentPdfPage(0);
        setPdfPreviewError("");
        return;
      }

      const sourceFile = getTransientFile(selectedFile.id);
      if (!sourceFile) {
        setPdfPreviewPages([]);
        setCurrentPdfPage(0);
        setPdfPreviewError("Preview unavailable for this PDF in current session. Please re-upload the file.");
        return;
      }

      setIsRenderingPdf(true);
      setPdfPreviewError("");
      setPdfPreviewPages([]);
      setCurrentPdfPage(0);

      try {
        const bytes = new Uint8Array(await sourceFile.arrayBuffer());
        const loadingTask = getDocument({ data: bytes });
        const pdfDocument = await loadingTask.promise;
        const pageImages: string[] = [];

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Could not create preview canvas context.");
          }

          await page.render({ canvasContext: context, viewport }).promise;
          pageImages.push(canvas.toDataURL("image/jpeg", 0.9));
        }

        await pdfDocument.destroy();

        if (isCancelled) {
          return;
        }

        pdfPreviewCacheRef.current.set(selectedFile.id, pageImages);
        setPdfPreviewPages(pageImages);
        setCurrentPdfPage(0);
      } catch (error) {
        if (isCancelled) {
          return;
        }
        setPdfPreviewError(error instanceof Error ? error.message : "Could not render PDF preview.");
      } finally {
        if (!isCancelled) {
          setIsRenderingPdf(false);
        }
      }
    };

    void renderPdfPages();

    return () => {
      isCancelled = true;
    };
  }, [selectedFile, selectedFileIsPdf]);

  const displayedPreviewImage = selectedFileIsPdf
    ? (pdfPreviewPages[currentPdfPage] ?? selectedFile?.previewDataUrl)
    : selectedFile?.previewDataUrl;

  const activePageKey = selectedFile ? makePageKey(selectedFile.id, activePageNumber) : null;
  const activePageSnapshot = activePageKey ? pageAnalysisByKey[activePageKey] ?? null : null;

  useEffect(() => {
    if (!selectedFile || !activePageSnapshot) {
      setLatestDebugPayload(null);
      setLatestFormula("");
      setLatestCostBreakdown(null);
      setLatestValidationIssues([]);
      setLatestDocumentHash("");
      return;
    }

    setLatestDebugPayload(activePageSnapshot.debug);
    setLatestFormula(activePageSnapshot.formula);
    setLatestCostBreakdown(activePageSnapshot.costBreakdown);
    setLatestValidationIssues(activePageSnapshot.validationIssues);
    setLatestDocumentHash(activePageSnapshot.documentHash);
  }, [activePageSnapshot, selectedFile]);

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
      if (!sourceFile) {
        throw new Error("Original file is no longer available in memory. Re-upload the file to run AI analysis.");
      }

      const totalPages = selectedFileIsPdf ? Math.max(pdfPreviewPages.length, 1) : 1;
      let analysisFile = sourceFile;

      if (selectedFileIsPdf) {
        const pageDataUrl = pdfPreviewPages[currentPdfPage] ?? selectedFile.previewDataUrl;
        if (!pageDataUrl) {
          throw new Error("PDF page preview is not ready yet. Wait for rendering to finish and try again.");
        }

        const baseName = selectedFile.name.replace(/\.pdf$/i, "");
        analysisFile = await dataUrlToFile(pageDataUrl, `${baseName}-page-${activePageNumber}.jpg`);
      }

      const result = await analyzeFileRealtime(selectedFile, analysisFile, {
        pageNumber: activePageNumber,
        totalPages,
        analysisScope: "single_page",
      });

      const pageElements: TakeoffElement[] = result.elements.map((element, index) => ({
        ...element,
        id: `${selectedFile.id}-p${activePageNumber}-${index}`,
        sourceFileId: selectedFile.id,
        sourcePage: activePageNumber,
      }));

      setProgress(80);
      const merged = [
        ...state.takeoffElements.filter(
          (element) =>
            !(
              element.sourceFileId === selectedFile.id &&
              (element.sourcePage ?? 1) === activePageNumber
            ),
        ),
        ...pageElements,
      ];

      setTakeoffResult(merged, result.confidence);

      if (activePageKey) {
        setPageAnalysisByKey((previous) => ({
          ...previous,
          [activePageKey]: {
            elements: pageElements,
            confidence: result.confidence,
            summary: result.summary,
            debug: result.debug ?? null,
            formula: result.formula ?? "",
            costBreakdown: result.costBreakdown ?? null,
            validationIssues: result.validation?.issues ?? [],
            documentHash: result.documentHash ?? "",
            fromCache: Boolean(result.fromCache),
            analyzedAt: new Date().toISOString(),
          },
        }));
      }

      setLatestDebugPayload(result.debug ?? null);
      setLatestFormula(result.formula ?? "");
      setLatestCostBreakdown(result.costBreakdown ?? null);
      setLatestValidationIssues(result.validation?.issues ?? []);
      setLatestDocumentHash(result.documentHash ?? "");
      setUploadStatus(selectedFile.id, "Completed");
      const pageLabel = selectedFileIsPdf ? `page ${activePageNumber}` : "the current drawing";
      setStatusMessage(
        `${result.summary} (${pageLabel})${result.fromCache ? " (Loaded from deterministic cache)" : ""}`,
      );
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

  const elements = useMemo(() => {
    if (!selectedFile) {
      return [] as TakeoffElement[];
    }

    if (activePageSnapshot?.elements) {
      return activePageSnapshot.elements;
    }

    return state.takeoffElements.filter(
      (element) =>
        element.sourceFileId === selectedFile.id &&
        (element.sourcePage ?? 1) === activePageNumber,
    );
  }, [activePageNumber, activePageSnapshot, selectedFile, state.takeoffElements]);

  const confidence = activePageSnapshot?.confidence
    ?? (elements.length > 0
      ? Math.round(elements.reduce((sum, element) => sum + element.confidence, 0) / elements.length)
      : 0);

  const extractedPages = useMemo(() => {
    if (!selectedFile) {
      return [] as Array<{ page: number; elementCount: number; typeCount: number }>;
    }

    const grouped = new Map<number, { elementCount: number; types: Set<string> }>();

    Object.entries(pageAnalysisByKey)
      .filter(([key]) => key.startsWith(`${selectedFile.id}::`))
      .forEach(([key, snapshot]) => {
        const page = Number.parseInt(key.split("::")[1] ?? "1", 10);
        if (!Number.isFinite(page) || page <= 0) {
          return;
        }
        const bucket = grouped.get(page) ?? { elementCount: 0, types: new Set<string>() };
        bucket.elementCount = Math.max(bucket.elementCount, snapshot.elements.length);
        snapshot.elements.forEach((element) => bucket.types.add(element.name));
        grouped.set(page, bucket);
      });

    state.takeoffElements
      .filter((element) => element.sourceFileId === selectedFile.id)
      .forEach((element) => {
        const page = element.sourcePage ?? 1;
        const bucket = grouped.get(page) ?? { elementCount: 0, types: new Set<string>() };
        bucket.elementCount += 1;
        bucket.types.add(element.name);
        grouped.set(page, bucket);
      });

    return Array.from(grouped.entries())
      .map(([page, value]) => ({
        page,
        elementCount: value.elementCount,
        typeCount: value.types.size,
      }))
      .sort((left, right) => left.page - right.page);
  }, [pageAnalysisByKey, selectedFile, state.takeoffElements]);

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
    const pageSuffix = selectedFileIsPdf ? `-page-${activePageNumber}` : "";
    downloadTextFile(`ai-quantity-takeoff${pageSuffix}.csv`, csv);
    setStatusMessage(`Quantity takeoff exported as CSV for page ${activePageNumber}.`);
  };

  const saveResults = () => {
    if (elementsByType.length === 0) {
      setStatusMessage("No results available to save yet.");
      return;
    }
    const content = [
      "AI Quantity Takeoff Results",
      `Generated: ${new Date().toLocaleString()}`,
      `Source File: ${selectedFile?.name ?? "N/A"}`,
      `Page: ${activePageNumber}`,
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
            {displayedPreviewImage ? (
              <img src={displayedPreviewImage} alt={selectedFile?.name ?? "Blueprint preview"} className="h-full w-full object-contain" />
            ) : isRenderingPdf ? (
              <div className="relative z-10 text-center px-4 py-3 rounded bg-white/80 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Rendering PDF pages...</p>
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100" />
            )}
            {!displayedPreviewImage && !isRenderingPdf && (
              <div className="relative z-10 text-center px-3 py-2 rounded bg-white/80">
                {selectedFile ? (
                  <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No uploaded drawing selected</p>
                )}
              </div>
            )}
          </div>
          {selectedFile && (
            <p className="mt-3 text-sm text-muted-foreground truncate" title={selectedFile.name}>
              {selectedFile.name}
            </p>
          )}
          {pdfPreviewError && (
            <p className="mt-2 text-xs text-red-600">{pdfPreviewError}</p>
          )}
          {pdfPreviewPages.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={currentPdfPage <= 0}
                onClick={() => setCurrentPdfPage((previous) => Math.max(previous - 1, 0))}
                className="px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-muted disabled:opacity-60"
              >
                Previous Page
              </button>
              <span className="text-xs text-muted-foreground">
                Page {currentPdfPage + 1} of {pdfPreviewPages.length}
              </span>
              <button
                type="button"
                disabled={currentPdfPage >= pdfPreviewPages.length - 1}
                onClick={() => setCurrentPdfPage((previous) => Math.min(previous + 1, pdfPreviewPages.length - 1))}
                className="px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-muted disabled:opacity-60"
              >
                Next Page
              </button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {state.uploadedFiles.map((file) => (
              <button
                type="button"
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
              type="button"
              onClick={() => void runTakeoff()}
              disabled={isAnalyzing || !selectedFile || (selectedFileIsPdf && !displayedPreviewImage)}
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
          <h3 className="font-semibold mb-2">Detected Elements</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Showing extracted quantities for {selectedFileIsPdf ? `page ${activePageNumber}` : "the current drawing"}.
          </p>

          {selectedFile && (
            <div className="mb-4 p-3 bg-muted/40 rounded-lg border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Page-by-page extracted results</p>
              {extractedPages.length === 0 && (
                <p className="text-xs text-muted-foreground">No pages extracted yet.</p>
              )}
              {extractedPages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {extractedPages.map((item) => (
                    <button
                      key={item.page}
                      type="button"
                      onClick={() => {
                        if (selectedFileIsPdf) {
                          setCurrentPdfPage(Math.max(item.page - 1, 0));
                        }
                      }}
                      className={`px-2 py-1 rounded-md text-xs border ${
                        item.page === activePageNumber
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      Page {item.page}: {item.typeCount} types
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {elementsByType.length === 0 && (
              <div className="p-4 bg-muted/50 rounded-lg border border-border text-sm text-muted-foreground">
                No extracted elements for {selectedFileIsPdf ? `page ${activePageNumber}` : "this drawing"} yet. Run AI extraction.
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
          type="button"
          onClick={() => navigate("/cost-estimation")}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Generate Cost Estimate
        </button>
        <button
          type="button"
          onClick={exportQuantities}
          className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Export Quantities
        </button>
        <button
          type="button"
          onClick={saveResults}
          className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Save Results
        </button>
      </div>

      <div className="bg-card rounded-xl p-6 border border-border space-y-4">
        <h3 className="font-semibold">Deterministic Debug Mode</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-muted-foreground">Document Fingerprint</p>
            <p className="font-mono text-xs break-words">{latestDocumentHash || "No analysis yet"}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-muted-foreground">Deterministic Formula</p>
            <p>{latestFormula || "Run analysis to view formula."}</p>
          </div>
        </div>

        {latestCostBreakdown && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-muted-foreground">Material Cost</p>
              <p className="font-medium">${latestCostBreakdown.materialCost.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-muted-foreground">Labor Cost</p>
              <p className="font-medium">${latestCostBreakdown.laborCost.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-muted-foreground">Equipment Cost</p>
              <p className="font-medium">${latestCostBreakdown.equipmentCost.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-muted-foreground">Total Cost</p>
              <p className="font-medium">${latestCostBreakdown.totalCost.toLocaleString()}</p>
            </div>
          </div>
        )}

        {latestValidationIssues.length > 0 && (
          <div className="p-3 rounded-lg border border-yellow-500/40 bg-yellow-100/40">
            <p className="font-medium text-yellow-800 mb-2">Verification Layer Flags</p>
            <ul className="text-sm text-yellow-800 list-disc pl-5 space-y-1">
              {latestValidationIssues.map((issue, index) => (
                <li key={`${issue}-${index}`}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-muted-foreground mb-2">Pipeline Debug Output</p>
          <pre className="text-xs whitespace-pre-wrap break-words max-h-80 overflow-auto">
            {latestDebugPayload ? JSON.stringify(latestDebugPayload, null, 2) : "Run analysis to view detected elements, dimensions, quantities, and detailed pipeline output."}
          </pre>
        </div>
      </div>
    </div>
  );
}
