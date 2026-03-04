import { Upload, FileText, CheckCircle, Clock, Play } from "lucide-react";
import { useState } from "react";

const uploadedFiles = [
  {
    name: "Floor_Plan_Level_1.pdf",
    type: "PDF",
    size: "2.4 MB",
    status: "Completed",
  },
  {
    name: "Elevation_North.dwg",
    type: "DWG",
    size: "5.1 MB",
    status: "Processing",
  },
  {
    name: "Building_Model.ifc",
    type: "IFC",
    size: "18.3 MB",
    status: "Completed",
  },
  {
    name: "Site_Plan.pdf",
    type: "PDF",
    size: "3.7 MB",
    status: "Completed",
  },
];

export function UploadDrawings() {
  const [dragActive, setDragActive] = useState(false);

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
    // Handle file upload
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
          <div className="flex gap-3">
            <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
              Upload Files
            </button>
            <button className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity">
              Import from BIM
            </button>
            <button className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors">
              Scan Blueprint
            </button>
          </div>
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
                {uploadedFiles.map((file, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">{file.type}</td>
                    <td className="px-6 py-4 text-sm">{file.size}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {file.status === "Completed" ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600">Completed</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm text-yellow-600">Processing</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity">
                        <Play className="w-4 h-4" />
                        AI Analysis
                      </button>
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
