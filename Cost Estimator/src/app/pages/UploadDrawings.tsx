import { Upload, FileText, CheckCircle, Clock, Play, AlertCircle, Image, Brain, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { analyzeFileRealtime, fileToDataUrl } from "../services/realtimeAi";
import { getTransientFile, makeUploadedDrawing, registerTransientFile, useEstimator } from "../state/estimatorStore";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export function UploadDrawings() {
  const { state, addUploadedFiles, removeUploadedFile, setUploadStatus, setTakeoffResult, setSelectedFileId } = useEstimator();
  const [dragActive, setDragActive] = useState(false);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const bimInputRef = useRef<HTMLInputElement | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  const prepareUploadEntries = async (incoming: File[]) => {
    const safeFiles = incoming.slice(0, 20);
    const entries = await Promise.all(
      safeFiles.map(async (file) => {
        const isImage = file.type.startsWith("image/");
        const previewDataUrl = isImage && file.size <= 3 * 1024 * 1024 ? await fileToDataUrl(file) : undefined;
        const entry = makeUploadedDrawing(file, previewDataUrl);
        registerTransientFile(entry.id, file);
        return entry;
      }),
    );
    return entries;
  };

  const validateFiles = (files: File[]) => {
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejected.push(`${file.name} exceeds 50MB limit`);
        continue;
      }
      accepted.push(file);
    }
    return { accepted, rejected };
  };

  const handleIncomingFiles = async (fileList: FileList | null, sourceLabel = "files") => {
    if (!fileList || fileList.length === 0) {
      return;
    }
    const files = Array.from(fileList);
    const { accepted, rejected } = validateFiles(files);
    if (accepted.length === 0) {
      setStatusMessage(rejected.length > 0 ? `Unable to upload: ${rejected.join(", ")}.` : "No valid files selected.");
      return;
    }

    const entries = await prepareUploadEntries(accepted);
    addUploadedFiles(entries);
    const rejectionNote = rejected.length > 0 ? ` Skipped ${rejected.length} file(s): ${rejected.join(", ")}.` : "";
    setStatusMessage(`Uploaded ${entries.length} ${sourceLabel}.${rejectionNote}`);
  };

  const triggerPicker = (ref: React.RefObject<HTMLInputElement | null>, message: string) => {
    if (!ref.current) {
      setStatusMessage("File picker is not available right now. Refresh and try again.");
      return;
    }
    setStatusMessage(message);
    ref.current.click();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    void handleIncomingFiles(e.dataTransfer.files);
  };

  const runAnalysisForFile = async (fileId: string) => {
    const selected = state.uploadedFiles.find((item) => item.id === fileId);
    if (!selected) {
      return;
    }

    setBusyFileId(fileId);
    setUploadStatus(fileId, "Processing");
    setSelectedFileId(fileId);

    try {
      const sourceFile = getTransientFile(selected.id);
      const result = await analyzeFileRealtime(selected, sourceFile);
      const otherElements = state.takeoffElements.filter((item) => item.sourceFileId !== fileId);
      setTakeoffResult([...otherElements, ...result.elements], result.confidence);
      setUploadStatus(fileId, "Completed");
      setStatusMessage(result.summary);
    } catch (error) {
      setUploadStatus(fileId, "Failed");
      setStatusMessage(error instanceof Error ? error.message : "AI analysis failed.");
    } finally {
      setBusyFileId(null);
    }
  };

  const runAllAnalyses = async () => {
    if (state.uploadedFiles.length === 0) {
      setStatusMessage("Upload one or more files before running AI analysis.");
      return;
    }

    let mergedElements = [...state.takeoffElements];
    let confidenceAccumulator = 0;
    let analyzedCount = 0;

    for (const file of state.uploadedFiles) {
      setBusyFileId(file.id);
      setUploadStatus(file.id, "Processing");
      try {
        const sourceFile = getTransientFile(file.id);
        const result = await analyzeFileRealtime(file, sourceFile);
        mergedElements = [...mergedElements.filter((item) => item.sourceFileId !== file.id), ...result.elements];
        confidenceAccumulator += result.confidence;
        analyzedCount += 1;
        setUploadStatus(file.id, "Completed");
      } catch {
        setUploadStatus(file.id, "Failed");
      }
    }

    setBusyFileId(null);
    if (analyzedCount > 0) {
      setTakeoffResult(mergedElements, Math.round(confidenceAccumulator / analyzedCount));
      setStatusMessage(`Completed AI analysis for ${analyzedCount} file${analyzedCount === 1 ? "" : "s"}.`);
    } else {
      setStatusMessage("No file could be analyzed. Please retry with valid drawings/photos.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Upload Construction Drawings</h1>
        <p className="text-muted-foreground">
          Upload your construction plans, blueprints, and BIM files for AI analysis
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`bg-card rounded-xl p-12 border-2 border-dashed transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        role="button"
        tabIndex={0}
        onClick={() => triggerPicker(uploadInputRef, "Select drawings or photos to upload.")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            triggerPicker(uploadInputRef, "Select drawings or photos to upload.");
          }
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold mb-2">Upload Construction Drawings</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop your files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Supports: PDF, CAD, BIM, DWG, IFC (Max size: 50MB)
          </p>
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept=".pdf,.dwg,.ifc,.dxf,.png,.jpg,.jpeg,.webp,.bmp,.heic,.heif"
            className="hidden"
            onChange={(event) => {
              void handleIncomingFiles(event.target.files, "drawing file(s)");
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={bimInputRef}
            type="file"
            multiple
            accept=".ifc,.dwg,.dxf"
            className="hidden"
            onChange={(event) => {
              void handleIncomingFiles(event.target.files, "BIM file(s)");
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={scanInputRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.bmp,.heic,.heif"
            className="hidden"
            onChange={(event) => {
              void handleIncomingFiles(event.target.files, "blueprint image(s)");
              event.currentTarget.value = "";
            }}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                triggerPicker(uploadInputRef, "Select drawings or photos to upload.");
              }}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Upload Files
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                triggerPicker(bimInputRef, "Select BIM/CAD files (.ifc, .dwg, .dxf).");
              }}
              className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Import from BIM
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                triggerPicker(scanInputRef, "Select clear blueprint images for AI scanning.");
              }}
              className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Scan Blueprint
            </button>
            <button
              type="button"
              onClick={() => void runAllAnalyses()}
              className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Analyze All
            </button>
          </div>
          {statusMessage && (
            <p className="mt-4 text-sm text-muted-foreground">{statusMessage}</p>
          )}
        </div>
      </div>

      {/* Uploaded Files */}
      <div>
        <h3 className="font-semibold mb-4">Uploaded Files</h3>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium">File Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Size</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.uploadedFiles.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      No files uploaded yet. Add drawings or photos to begin real-time analysis.
                    </td>
                  </tr>
                )}
                {state.uploadedFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedFileId(file.id)}>
                        {file.previewDataUrl ? <Image className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
                        <span className="text-sm">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{file.type}</td>
                    <td className="px-6 py-4 text-sm">{file.sizeLabel}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {file.status === "Completed" ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600">Completed</span>
                          </>
                        ) : file.status === "Failed" ? (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600">Failed</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm text-yellow-600">{file.status}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyFileId === file.id}
                          onClick={() => void runAnalysisForFile(file.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          <Play className="w-4 h-4" />
                          {busyFileId === file.id ? "Analyzing..." : "AI Analysis"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeUploadedFile(file.id);
                            setStatusMessage(`Removed ${file.name} from this session.`);
                          }}
                          className="flex items-center gap-1 px-3 py-2 border border-border rounded-lg text-xs hover:bg-muted transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                        {state.selectedFileId === file.id && (
                          <span className="inline-flex items-center gap-1 text-xs text-accent">
                            <Brain className="w-3 h-3" />
                            Selected
                          </span>
                        )}
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
