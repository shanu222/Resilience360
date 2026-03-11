import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  loadEstimatorStateFromBackend,
  saveEstimatorReportToBackend,
  saveEstimatorStateToBackend,
} from "../services/costEstimatorApi";

export type UploadStatus = "Uploaded" | "Processing" | "Completed" | "Failed";

export type UploadedDrawing = {
  id: string;
  name: string;
  type: string;
  sizeLabel: string;
  bytes: number;
  status: UploadStatus;
  uploadedAt: string;
  previewDataUrl?: string;
};

export type TakeoffElement = {
  id: string;
  name: string;
  quantity: number;
  measurement: string;
  unit: string;
  confidence: number;
  sourceFileId: string;
  sourcePage?: number;
};

export type CostItem = {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  unitCost: number;
};

export type GeneratedReport = {
  id: string;
  name: string;
  type: string;
  date: string;
  size: string;
  content: string;
};

export type SettingsState = {
  fullName: string;
  email: string;
  company: string;
  role: string;
  defaultRegion: string;
  currency: string;
  measurementSystem: string;
  timezone: string;
  notifications: {
    costAlerts: boolean;
    riskUpdates: boolean;
    reportGeneration: boolean;
  };
  twoFactorEnabled: boolean;
};

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type EstimatorState = {
  uploadedFiles: UploadedDrawing[];
  selectedFileId: string | null;
  takeoffElements: TakeoffElement[];
  takeoffConfidence: number;
  takeoffLastRunAt: string | null;
  costItems: CostItem[];
  reports: GeneratedReport[];
  assistantMessages: AssistantMessage[];
  settings: SettingsState;
};

type EstimatorContextValue = {
  state: EstimatorState;
  addUploadedFiles: (files: UploadedDrawing[]) => void;
  removeUploadedFile: (fileId: string) => void;
  setUploadStatus: (fileId: string, status: UploadStatus) => void;
  setSelectedFileId: (fileId: string | null) => void;
  setTakeoffResult: (elements: TakeoffElement[], confidence: number) => void;
  regenerateCostItemsFromTakeoff: () => void;
  clearTakeoffResult: () => void;
  updateCostItemUnitCost: (itemId: string, unitCost: number) => void;
  addReport: (report: GeneratedReport) => void;
  setReports: (reports: GeneratedReport[]) => void;
  addAssistantMessage: (message: AssistantMessage) => void;
  setAssistantMessages: (messages: AssistantMessage[]) => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
  clearAllData: () => void;
};

const STORAGE_KEY = "r360-cost-estimator-state-v1";
const transientFileRegistry = new Map<string, File>();

export const registerTransientFile = (fileId: string, file: File) => {
  transientFileRegistry.set(fileId, file);
};

export const getTransientFile = (fileId: string): File | null => {
  return transientFileRegistry.get(fileId) ?? null;
};

export const clearTransientFiles = () => {
  transientFileRegistry.clear();
};

const makeId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const defaultCostItems: CostItem[] = [];

const defaultSettings: SettingsState = {
  fullName: "",
  email: "",
  company: "",
  role: "Project Engineer",
  defaultRegion: "Pakistan",
  currency: "USD ($)",
  measurementSystem: "Imperial (ft, in)",
  timezone: "Eastern Time (ET)",
  notifications: {
    costAlerts: true,
    riskUpdates: true,
    reportGeneration: false,
  },
  twoFactorEnabled: false,
};

const defaultAssistantMessages: AssistantMessage[] = [];

const unitCostByElement: Record<string, { unitCost: number; unit: string }> = {
  Walls: { unitCost: 28, unit: "sq meters" },
  Slabs: { unitCost: 120, unit: "sq meters" },
  Columns: { unitCost: 95, unit: "units" },
  Beams: { unitCost: 80, unit: "linear meters" },
  Foundation: { unitCost: 135, unit: "cubic meters" },
  Roof: { unitCost: 65, unit: "sq meters" },
  Doors: { unitCost: 450, unit: "units" },
  Windows: { unitCost: 380, unit: "units" },
};

const deriveCostItemsFromTakeoff = (
  elements: TakeoffElement[],
  existingItems: CostItem[] = [],
): CostItem[] => {
  const grouped = new Map<string, { quantity: number; unit: string }>();
  elements.forEach((element) => {
    if (!element.name || element.quantity <= 0) {
      return;
    }
    const current = grouped.get(element.name) ?? { quantity: 0, unit: element.unit || "units" };
    current.quantity += element.quantity;
    current.unit = element.unit || current.unit;
    grouped.set(element.name, current);
  });

  const existingByName = new Map(existingItems.map((item) => [item.item, item]));
  return Array.from(grouped.entries()).map(([name, groupedValue], index) => {
    const fallback = unitCostByElement[name] ?? { unitCost: 60, unit: groupedValue.unit || "units" };
    const existing = existingByName.get(name);
    return {
      id: existing?.id ?? `cost-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
      item: name,
      quantity: groupedValue.quantity,
      unit: groupedValue.unit || fallback.unit,
      unitCost: existing?.unitCost ?? fallback.unitCost,
    };
  });
};

const defaultState: EstimatorState = {
  uploadedFiles: [],
  selectedFileId: null,
  takeoffElements: [],
  takeoffConfidence: 0,
  takeoffLastRunAt: null,
  costItems: defaultCostItems,
  reports: [],
  assistantMessages: defaultAssistantMessages,
  settings: defaultSettings,
};

const EstimatorContext = createContext<EstimatorContextValue | null>(null);

const sanitizeLoadedState = (raw: unknown): EstimatorState => {
  if (!raw || typeof raw !== "object") {
    return defaultState;
  }
  const loaded = raw as Partial<EstimatorState>;
  const loadedCostItems = Array.isArray(loaded.costItems) ? loaded.costItems : [];
  const hasLegacySeededItems = loadedCostItems.some((item) => item?.id?.startsWith("cost-"));
  const hasRealInputSignals =
    (Array.isArray(loaded.uploadedFiles) && loaded.uploadedFiles.length > 0) ||
    (Array.isArray(loaded.takeoffElements) && loaded.takeoffElements.length > 0);
  const normalizedCostItems = hasLegacySeededItems && !hasRealInputSignals ? [] : loadedCostItems;

  return {
    ...defaultState,
    ...loaded,
    costItems: normalizedCostItems,
    uploadedFiles: Array.isArray(loaded.uploadedFiles) ? loaded.uploadedFiles : [],
    takeoffElements: Array.isArray(loaded.takeoffElements) ? loaded.takeoffElements : [],
    reports: Array.isArray(loaded.reports) ? loaded.reports : [],
    assistantMessages: Array.isArray(loaded.assistantMessages) ? loaded.assistantMessages : defaultAssistantMessages,
    settings: {
      ...defaultSettings,
      ...(loaded.settings ?? {}),
      notifications: {
        ...defaultSettings.notifications,
        ...(loaded.settings?.notifications ?? {}),
      },
    },
  };
};

export const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 MB";
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const makeUploadedDrawing = (file: File, previewDataUrl?: string): UploadedDrawing => ({
  id: makeId(),
  name: file.name,
  type: (file.name.split(".").pop() ?? file.type ?? "Unknown").toUpperCase(),
  sizeLabel: formatFileSize(file.size),
  bytes: file.size,
  status: "Uploaded",
  uploadedAt: new Date().toISOString(),
  previewDataUrl,
});

export function EstimatorProvider({ children }: { children: React.ReactNode }) {
  const syncTimerRef = useRef<number | null>(null);
  const hasHydratedRef = useRef(false);
  const [state, setState] = useState<EstimatorState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return defaultState;
      }
      return sanitizeLoadedState(JSON.parse(saved) as unknown);
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    let active = true;
    const hydrateFromBackend = async () => {
      try {
        const response = await loadEstimatorStateFromBackend();
        if (!active || !response?.state) {
          return;
        }
        setState(sanitizeLoadedState(response.state as unknown));
      } catch {
        // Keep local state when backend is unavailable.
      } finally {
        hasHydratedRef.current = true;
      }
    };

    void hydrateFromBackend();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      void saveEstimatorStateToBackend(state).catch(() => {
        // Keep working offline when backend sync fails.
      });
    }, 450);

    return () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, [state]);

  const addUploadedFiles = useCallback((files: UploadedDrawing[]) => {
    setState((prev) => {
      const merged = [...files, ...prev.uploadedFiles];
      return {
        ...prev,
        uploadedFiles: merged,
        selectedFileId: prev.selectedFileId ?? files[0]?.id ?? null,
      };
    });
  }, []);

  const setUploadStatus = useCallback((fileId: string, status: UploadStatus) => {
    setState((prev) => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.map((file) =>
        file.id === fileId ? { ...file, status } : file,
      ),
    }));
  }, []);

  const removeUploadedFile = useCallback((fileId: string) => {
    transientFileRegistry.delete(fileId);
    setState((prev) => {
      const nextUploadedFiles = prev.uploadedFiles.filter((file) => file.id !== fileId);
      const nextTakeoffElements = prev.takeoffElements.filter((element) => element.sourceFileId !== fileId);
      return {
        ...prev,
        uploadedFiles: nextUploadedFiles,
        selectedFileId:
          prev.selectedFileId === fileId
            ? nextUploadedFiles[0]?.id ?? null
            : prev.selectedFileId,
        takeoffElements: nextTakeoffElements,
        costItems: deriveCostItemsFromTakeoff(nextTakeoffElements, prev.costItems),
      };
    });
  }, []);

  const setSelectedFileId = useCallback((fileId: string | null) => {
    setState((prev) => ({ ...prev, selectedFileId: fileId }));
  }, []);

  const setTakeoffResult = useCallback((elements: TakeoffElement[], confidence: number) => {
    setState((prev) => ({
      ...prev,
      costItems: deriveCostItemsFromTakeoff(elements, prev.costItems),
      takeoffElements: elements,
      takeoffConfidence: confidence,
      takeoffLastRunAt: new Date().toISOString(),
    }));
  }, []);

  const regenerateCostItemsFromTakeoff = useCallback(() => {
    setState((prev) => ({
      ...prev,
      costItems: deriveCostItemsFromTakeoff(prev.takeoffElements, prev.costItems),
    }));
  }, []);

  const clearTakeoffResult = useCallback(() => {
    setState((prev) => ({
      ...prev,
      takeoffElements: [],
      takeoffConfidence: 0,
      takeoffLastRunAt: null,
      costItems: [],
    }));
  }, []);

  const updateCostItemUnitCost = useCallback((itemId: string, unitCost: number) => {
    setState((prev) => ({
      ...prev,
      costItems: prev.costItems.map((item) =>
        item.id === itemId ? { ...item, unitCost: Number.isFinite(unitCost) ? unitCost : 0 } : item,
      ),
    }));
  }, []);

  const addReport = useCallback((report: GeneratedReport) => {
    setState((prev) => ({
      ...prev,
      reports: [report, ...prev.reports],
    }));
    void saveEstimatorReportToBackend(report).catch(() => {
      // Report remains in local state if backend write fails.
    });
  }, []);

  const setReports = useCallback((reports: GeneratedReport[]) => {
    setState((prev) => ({ ...prev, reports }));
  }, []);

  const addAssistantMessage = useCallback((message: AssistantMessage) => {
    setState((prev) => ({
      ...prev,
      assistantMessages: [...prev.assistantMessages, message],
    }));
  }, []);

  const setAssistantMessages = useCallback((messages: AssistantMessage[]) => {
    setState((prev) => ({ ...prev, assistantMessages: messages }));
  }, []);

  const updateSettings = useCallback((patch: Partial<SettingsState>) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...patch,
        notifications: {
          ...prev.settings.notifications,
          ...(patch.notifications ?? {}),
        },
      },
    }));
  }, []);

  const clearAllData = useCallback(() => {
    clearTransientFiles();
    setState(defaultState);
  }, []);

  const value = useMemo<EstimatorContextValue>(
    () => ({
      state,
      addUploadedFiles,
      removeUploadedFile,
      setUploadStatus,
      setSelectedFileId,
      setTakeoffResult,
      regenerateCostItemsFromTakeoff,
      clearTakeoffResult,
      updateCostItemUnitCost,
      addReport,
      setReports,
      addAssistantMessage,
      setAssistantMessages,
      updateSettings,
      clearAllData,
    }),
    [
      state,
      addUploadedFiles,
      removeUploadedFile,
      setUploadStatus,
      setSelectedFileId,
      setTakeoffResult,
      regenerateCostItemsFromTakeoff,
      clearTakeoffResult,
      updateCostItemUnitCost,
      addReport,
      setReports,
      addAssistantMessage,
      setAssistantMessages,
      updateSettings,
      clearAllData,
    ],
  );

  return <EstimatorContext.Provider value={value}>{children}</EstimatorContext.Provider>;
}

export const useEstimator = () => {
  const ctx = useContext(EstimatorContext);
  if (!ctx) {
    throw new Error("useEstimator must be used within EstimatorProvider");
  }
  return ctx;
};
