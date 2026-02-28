import { createContext, useContext, useState, type ReactNode } from "react"

export type SeverityLabel = "Low" | "Moderate" | "High"

export type DetectionData = {
  elementType: string
  defectType: string
  severity: SeverityLabel
  confidence: number
  summary: string
}

export type AnnotationSeverity = "severe" | "moderate" | "low" | "veryLow" | "none"

export type ManualAnnotationZone = {
  severity: AnnotationSeverity
  label: string
  color: string
  pixelCount: number
  percentage: number
  areaM2: number
  unitCost: number
  severityMultiplier: number
  strategy: string
  recommendedAction: string
}

export type ManualAnnotationSummary = {
  totalPixels: number
  paintedPixels: number
  damagePixels: number
  damagePercent: number
  severePercent: number
  weightedRiskScore: number
  replacementRecommended: boolean
  investigationRequired: boolean
  zones: ManualAnnotationZone[]
  annotationImage: string | null
}

export type FormDataState = {
  widthCm: number
  depthCm: number
  heightCm: number
  damageExtent: number
  materialType: string
  floorLevel: string
  tightAccess: boolean
  occupied: boolean
  scaffolding: boolean
  retrofitLevel: "cosmetic" | "structural" | "seismic"
}

export type CostLineItem = {
  item: string
  quantity: string
  unitCost: number
  total: number
}

export type CostEstimate = {
  elementType: string
  location: string
  confidence: number
  baseCost: number
  locationMultiplier: number
  complexityMultiplier: number
  contingency: number
  overhead: number
  totalCost: number
  estimatedDurationWeeks: number
  lineItems: CostLineItem[]
  assumptions: string[]
}

type DefectEntry = {
  id: string
  elementType: string
  defectType: string
  severity: SeverityLabel
  cost: number
}

type AppState = {
  selectedFile: File | null
  imagePreview: string | null
  location: string
  isAnalyzing: boolean
  analysisError: string | null
  detectionData: DetectionData | null
  manualAnnotation: ManualAnnotationSummary | null
  formData: FormDataState
  defects: DefectEntry[]
  activeEstimate: CostEstimate | null
}

type AppContextType = AppState & {
  setSelectedFile: (file: File | null) => void
  setImagePreview: (preview: string | null) => void
  setLocation: (location: string) => void
  setIsAnalyzing: (isAnalyzing: boolean) => void
  setAnalysisError: (message: string | null) => void
  setDetectionData: (data: DetectionData | null) => void
  setManualAnnotation: (annotation: ManualAnnotationSummary | null) => void
  setFormData: (data: FormDataState) => void
  setActiveEstimate: (estimate: CostEstimate | null) => void
  addDefect: (defect: Omit<DefectEntry, "id">) => void
  resetAssessment: () => void
}

const initialFormData: FormDataState = {
  widthCm: 0,
  depthCm: 0,
  heightCm: 0,
  damageExtent: 0,
  materialType: "Reinforced Concrete",
  floorLevel: "Ground",
  tightAccess: false,
  occupied: false,
  scaffolding: false,
  retrofitLevel: "structural",
}

const generateDefectId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `defect-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    selectedFile: null,
    imagePreview: null,
    location: "Lahore, Pakistan",
    isAnalyzing: false,
    analysisError: null,
    detectionData: null,
    manualAnnotation: null,
    formData: initialFormData,
    defects: [],
    activeEstimate: null,
  })

  const setSelectedFile = (file: File | null) => {
    setState((previous) => ({ ...previous, selectedFile: file }))
  }

  const setImagePreview = (preview: string | null) => {
    setState((previous) => ({ ...previous, imagePreview: preview }))
  }

  const setLocation = (location: string) => {
    setState((previous) => ({ ...previous, location }))
  }

  const setIsAnalyzing = (isAnalyzing: boolean) => {
    setState((previous) => ({ ...previous, isAnalyzing }))
  }

  const setAnalysisError = (analysisError: string | null) => {
    setState((previous) => ({ ...previous, analysisError }))
  }

  const setDetectionData = (detectionData: DetectionData | null) => {
    setState((previous) => ({ ...previous, detectionData }))
  }

  const setManualAnnotation = (manualAnnotation: ManualAnnotationSummary | null) => {
    setState((previous) => ({ ...previous, manualAnnotation }))
  }

  const setFormData = (formData: FormDataState) => {
    setState((previous) => ({ ...previous, formData }))
  }

  const setActiveEstimate = (activeEstimate: CostEstimate | null) => {
    setState((previous) => ({ ...previous, activeEstimate }))
  }

  const addDefect = (defect: Omit<DefectEntry, "id">) => {
    setState((previous) => ({
      ...previous,
      defects: [...previous.defects, { id: generateDefectId(), ...defect }],
    }))
  }

  const resetAssessment = () => {
    setState((previous) => ({
      ...previous,
      selectedFile: null,
      imagePreview: null,
      isAnalyzing: false,
      analysisError: null,
      detectionData: null,
      manualAnnotation: null,
      formData: initialFormData,
      activeEstimate: null,
    }))
  }

  return (
    <AppContext.Provider
      value={{
        ...state,
        setSelectedFile,
        setImagePreview,
        setLocation,
        setIsAnalyzing,
        setAnalysisError,
        setDetectionData,
        setManualAnnotation,
        setFormData,
        setActiveEstimate,
        addDefect,
        resetAssessment,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider")
  }
  return context
}
