import type { EstimatorState, GeneratedReport } from "../state/estimatorStore";

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, "");
const runtimeEnv = ((import.meta as any).env ?? {}) as Record<string, string | undefined>;

const configuredApiBase = String(runtimeEnv.VITE_API_BASE_URL ?? "").trim();
const normalizedApiBase = configuredApiBase ? stripTrailingSlash(configuredApiBase) : "";
const localBackendFallback = "http://localhost:8787";
const productionBackendFallback = "https://resilience360-backend.onrender.com";

const buildApiTargets = (path: string): string[] => {
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

const callJsonApi = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const targets = buildApiTargets(path);
  let lastError: Error | null = null;

  for (const target of targets) {
    try {
      const response = await fetch(target, init);
      const raw = await response.text();
      const json = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      if (!response.ok) {
        throw new Error(String(json?.error ?? `Request failed: ${response.status}`));
      }
      return json as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown API error");
    }
  }

  throw lastError ?? new Error("API request failed");
};

export type CostEstimatorModules = {
  materials: Array<Record<string, unknown>>;
  labor: Array<Record<string, unknown>>;
  equipment: Array<Record<string, unknown>>;
  risk: Record<string, unknown>;
  dashboard: Record<string, unknown>;
};

export const loadEstimatorStateFromBackend = async () =>
  callJsonApi<{ ok: boolean; updatedAt: string; state: EstimatorState; modules: CostEstimatorModules }>(
    "/api/cost-estimator/state",
  );

export const saveEstimatorStateToBackend = async (state: EstimatorState) =>
  {
    const compactState: EstimatorState = {
      ...state,
      uploadedFiles: state.uploadedFiles.map((file) => ({
        ...file,
        previewDataUrl: undefined,
      })),
    };

    return callJsonApi<{ ok: boolean; updatedAt: string; state: EstimatorState; modules: CostEstimatorModules }>(
      "/api/cost-estimator/state",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: compactState }),
      },
    );
  }

export const saveEstimatorReportToBackend = async (report: GeneratedReport) =>
  callJsonApi<{ ok: boolean; updatedAt: string; reports: GeneratedReport[] }>(
    "/api/cost-estimator/reports",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report }),
    },
  );
