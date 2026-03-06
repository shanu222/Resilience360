import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

type EstimatorState = {
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
  setUploadStatus: (fileId: string, status: UploadStatus) => void;
  setSelectedFileId: (fileId: string | null) => void;
  setTakeoffResult: (elements: TakeoffElement[], confidence: number) => void;
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

const defaultCostItems: CostItem[] = [
  { id: "cost-concrete", item: "Concrete", quantity: 800, unit: "cubic meters", unitCost: 120 },
  { id: "cost-steel", item: "Steel reinforcement", quantity: 12000, unit: "kg", unitCost: 1.2 },
  { id: "cost-brickwork", item: "Brickwork", quantity: 5000, unit: "sq meters", unitCost: 25 },
  { id: "cost-paint", item: "Paint", quantity: 3000, unit: "sq meters", unitCost: 8 },
  { id: "cost-flooring", item: "Flooring", quantity: 1200, unit: "sq meters", unitCost: 45 },
  { id: "cost-doors", item: "Doors", quantity: 24, unit: "units", unitCost: 450 },
  { id: "cost-windows", item: "Windows", quantity: 36, unit: "units", unitCost: 380 },
  { id: "cost-electrical", item: "Electrical", quantity: 1, unit: "lump sum", unitCost: 85000 },
  { id: "cost-plumbing", item: "Plumbing", quantity: 1, unit: "lump sum", unitCost: 65000 },
  { id: "cost-hvac", item: "HVAC", quantity: 1, unit: "lump sum", unitCost: 120000 },
];

const defaultSettings: SettingsState = {
  fullName: "John Doe",
  email: "john.doe@company.com",
  company: "ABC Construction Inc.",
  role: "Civil Engineer",
  defaultRegion: "New York, NY",
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

const defaultAssistantMessages: AssistantMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content:
      "Hello! I can help with cost estimation, quantity extraction, risk analysis, and report generation using your uploaded drawings and photos.",
    createdAt: new Date().toISOString(),
  },
];

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
  return {
    ...defaultState,
    ...loaded,
    costItems: Array.isArray(loaded.costItems) && loaded.costItems.length > 0 ? loaded.costItems : defaultCostItems,
    uploadedFiles: Array.isArray(loaded.uploadedFiles) ? loaded.uploadedFiles : [],
    takeoffElements: Array.isArray(loaded.takeoffElements) ? loaded.takeoffElements : [],
    reports: Array.isArray(loaded.reports) ? loaded.reports : [],
    assistantMessages: Array.isArray(loaded.assistantMessages) && loaded.assistantMessages.length > 0
      ? loaded.assistantMessages
      : defaultAssistantMessages,
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

  const setSelectedFileId = useCallback((fileId: string | null) => {
    setState((prev) => ({ ...prev, selectedFileId: fileId }));
  }, []);

  const setTakeoffResult = useCallback((elements: TakeoffElement[], confidence: number) => {
    setState((prev) => ({
      ...prev,
      takeoffElements: elements,
      takeoffConfidence: confidence,
      takeoffLastRunAt: new Date().toISOString(),
    }));
  }, []);

  const clearTakeoffResult = useCallback(() => {
    setState((prev) => ({
      ...prev,
      takeoffElements: [],
      takeoffConfidence: 0,
      takeoffLastRunAt: null,
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
      setUploadStatus,
      setSelectedFileId,
      setTakeoffResult,
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
      setUploadStatus,
      setSelectedFileId,
      setTakeoffResult,
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
