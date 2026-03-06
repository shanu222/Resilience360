import type { CostItem, GeneratedReport, SettingsState, TakeoffElement, UploadedDrawing } from "../state/estimatorStore";

export type FileAnalysisResult = {
  summary: string;
  confidence: number;
  elements: TakeoffElement[];
  riskIndex: number;
  recommendations: string[];
};

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, "");
const runtimeEnv = ((import.meta as any).env ?? {}) as Record<string, string | undefined>;

const configuredApiBase = String(runtimeEnv.VITE_API_BASE_URL ?? "").trim();
const normalizedApiBase = configuredApiBase ? stripTrailingSlash(configuredApiBase) : "";
const localBackendFallback = "http://localhost:8787";
const productionBackendFallback = "https://resilience360-backend.onrender.com";

const buildApiTargets = (path: string): string[] => {
  if (!path.startsWith("/")) {
    throw new Error(`API path must start with '/': ${path}`);
  }

  const preferred = normalizedApiBase ? `${normalizedApiBase}${path}` : path;
  const targets = [preferred];
  const hostname = window.location.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  if (preferred !== path) {
    targets.push(path);
  }

  if (isLocalhost) {
    targets.push(`${localBackendFallback}${path}`);
  }

  if (!normalizedApiBase && !isLocalhost) {
    targets.push(`${productionBackendFallback}${path}`);
  }

  return [...new Set(targets)];
};

const clampToInt = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(parsed)));
};

export const analyzeFileRealtime = async (
  file: UploadedDrawing,
  sourceFile: File | null,
): Promise<FileAnalysisResult> => {
  if (!sourceFile) {
    throw new Error("Original file is no longer available in memory. Re-upload the file to run AI analysis.");
  }

  const requestedProvider = String(runtimeEnv.VITE_COST_ESTIMATOR_AI_PROVIDER ?? "openai").trim().toLowerCase();
  const targets = buildApiTargets("/api/cost-estimator/analyze");
  let lastError: Error | null = null;

  for (const target of targets) {
    try {
      const form = new FormData();
      form.append("file", sourceFile, sourceFile.name);
      form.append("provider", requestedProvider);
      form.append("projectType", "Construction Cost Estimation");
      form.append("region", "Pakistan");

      const response = await fetch(target, {
        method: "POST",
        body: form,
      });

      const raw = await response.text();
      let body: Record<string, unknown> | null = null;
      try {
        body = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message =
          (body?.error ? String(body.error) : "") ||
          `AI endpoint returned ${response.status} for ${target}.`;
        throw new Error(message);
      }

      const elementsRaw = Array.isArray(body?.elements) ? body.elements : [];
      const elements: TakeoffElement[] = elementsRaw.map((item, index) => {
        const candidate = (item ?? {}) as Record<string, unknown>;
        return {
          id: `${file.id}-${index}`,
          name: String(candidate.name ?? "Unknown Element"),
          quantity: clampToInt(candidate.quantity, 0, 0, 999999),
          measurement: String(candidate.measurement ?? "0"),
          unit: String(candidate.unit ?? "units"),
          confidence: clampToInt(candidate.confidence, 60, 0, 100),
          sourceFileId: file.id,
        };
      }).filter((item) => item.quantity > 0);

      const confidence = clampToInt(body?.confidence, 62, 0, 100);
      const riskIndex = clampToInt(body?.riskIndex, 48, 0, 100);
      const recommendations = Array.isArray(body?.recommendations)
        ? body.recommendations.map((item) => String(item)).filter(Boolean)
        : [];

      return {
        summary:
          (body?.summary ? String(body.summary) : "") ||
          `Analyzed ${file.name} using ${String(body?.provider ?? requestedProvider)} model inference.`,
        confidence,
        riskIndex,
        recommendations,
        elements,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Cost estimator AI request failed");
    }
  }

  throw lastError ?? new Error("Cost estimator AI request failed");
};

export const buildAssistantReply = (prompt: string, context: {
  uploadedCount: number;
  costItems: CostItem[];
  riskIndex: number;
}) => {
  const normalized = prompt.toLowerCase();
  const materialCost = context.costItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const laborCost = materialCost * 0.35;
  const equipmentCost = materialCost * 0.15;
  const total = materialCost + laborCost + equipmentCost;

  if (normalized.includes("risk")) {
    return `Current project risk index is ${context.riskIndex}%. Highest impact controls: lock in supplier rates, add weather buffer to schedule, and track weekly budget variance.`;
  }
  if (normalized.includes("material")) {
    return `Material spend is approximately $${materialCost.toLocaleString()}. A 5% procurement optimization would save about $${(materialCost * 0.05).toLocaleString()}.`;
  }
  if (normalized.includes("report")) {
    return `I can generate a fresh report from live data. Right now the projected total cost is $${total.toLocaleString()} across ${context.uploadedCount} uploaded files.`;
  }

  return `Based on the latest data, projected total cost is $${total.toLocaleString()} with ${context.uploadedCount} uploaded files. Ask me for risk, material optimization, or report insights.`;
};

export const createReport = (type: string, content: string): GeneratedReport => {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const sizeKb = Math.max(180, Math.round(content.length / 4));
  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${type} - ${date}`,
    type,
    date,
    size: `${(sizeKb / 1024).toFixed(1)} MB`,
    content,
  };
};

export const buildReportContent = (params: {
  type: string;
  uploadedFiles: UploadedDrawing[];
  takeoffElements: TakeoffElement[];
  costItems: CostItem[];
  settings: SettingsState;
  riskIndex: number;
}) => {
  const { type, uploadedFiles, takeoffElements, costItems, settings, riskIndex } = params;
  const materialCost = costItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const laborCost = materialCost * 0.35;
  const equipmentCost = materialCost * 0.15;
  const total = materialCost + laborCost + equipmentCost;

  const lines = [
    `Report Type: ${type}`,
    `Generated For: ${settings.fullName} (${settings.company})`,
    `Region: ${settings.defaultRegion}`,
    `Uploaded Files: ${uploadedFiles.length}`,
    `Takeoff Elements: ${takeoffElements.length}`,
    `Risk Index: ${riskIndex}%`,
    `Material Cost: $${materialCost.toLocaleString()}`,
    `Labor Cost: $${laborCost.toLocaleString()}`,
    `Equipment Cost: $${equipmentCost.toLocaleString()}`,
    `Total Cost: $${total.toLocaleString()}`,
    "",
    "Cost Items:",
    ...costItems.map((item) => `- ${item.item}: ${item.quantity} ${item.unit} x $${item.unitCost.toLocaleString()} = $${(item.quantity * item.unitCost).toLocaleString()}`),
  ];

  return lines.join("\n");
};

export const downloadTextFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) ?? "");
    reader.onerror = () => reject(new Error(`Unable to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
