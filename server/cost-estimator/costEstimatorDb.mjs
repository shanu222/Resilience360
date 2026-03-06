import fs from 'node:fs/promises'
import path from 'node:path'

const costEstimatorDataDir = path.join(process.cwd(), 'server', 'data', 'cost-estimator')
const costEstimatorDbFile = path.join(costEstimatorDataDir, 'database.json')

const nowIso = () => new Date().toISOString()

const defaultState = () => ({
  uploadedFiles: [],
  selectedFileId: null,
  takeoffElements: [],
  takeoffConfidence: 0,
  takeoffLastRunAt: null,
  costItems: [],
  reports: [],
  assistantMessages: [],
  settings: {
    fullName: '',
    email: '',
    company: '',
    role: 'Project Engineer',
    defaultRegion: 'Pakistan',
    currency: 'USD ($)',
    measurementSystem: 'Imperial (ft, in)',
    timezone: 'Eastern Time (ET)',
    notifications: {
      costAlerts: true,
      riskUpdates: true,
      reportGeneration: false,
    },
    twoFactorEnabled: false,
  },
})

const defaultDatabase = () => ({
  version: 1,
  updatedAt: nowIso(),
  state: defaultState(),
})

const normalizeUploadedFiles = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => ({
      id: String(item?.id ?? '').trim(),
      name: String(item?.name ?? '').trim(),
      type: String(item?.type ?? '').trim() || 'UNKNOWN',
      sizeLabel: String(item?.sizeLabel ?? '').trim() || '0 MB',
      bytes: Math.max(0, Number(item?.bytes ?? 0) || 0),
      status: String(item?.status ?? 'Uploaded').trim(),
      uploadedAt: String(item?.uploadedAt ?? nowIso()).trim(),
      previewDataUrl: String(item?.previewDataUrl ?? '').trim() || undefined,
    }))
    .filter((item) => item.id && item.name)

const normalizeTakeoffElements = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => ({
      id: String(item?.id ?? '').trim(),
      name: String(item?.name ?? '').trim(),
      quantity: Math.max(0, Math.round(Number(item?.quantity ?? 0) || 0)),
      measurement: String(item?.measurement ?? '0').trim(),
      unit: String(item?.unit ?? 'units').trim(),
      confidence: Math.max(0, Math.min(100, Math.round(Number(item?.confidence ?? 0) || 0))),
      sourceFileId: String(item?.sourceFileId ?? '').trim(),
    }))
    .filter((item) => item.name && item.quantity > 0)

const normalizeCostItems = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => ({
      id: String(item?.id ?? '').trim(),
      item: String(item?.item ?? '').trim(),
      quantity: Math.max(0, Number(item?.quantity ?? 0) || 0),
      unit: String(item?.unit ?? 'units').trim(),
      unitCost: Math.max(0, Number(item?.unitCost ?? 0) || 0),
    }))
    .filter((item) => item.id && item.item)

const normalizeReports = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => ({
      id: String(item?.id ?? '').trim(),
      name: String(item?.name ?? '').trim(),
      type: String(item?.type ?? '').trim(),
      date: String(item?.date ?? nowIso()).trim(),
      size: String(item?.size ?? '').trim() || '0.1 MB',
      content: String(item?.content ?? '').trim(),
    }))
    .filter((item) => item.id && item.name)

const normalizeAssistantMessages = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => ({
      id: String(item?.id ?? '').trim(),
      role: String(item?.role ?? 'assistant').trim() === 'user' ? 'user' : 'assistant',
      content: String(item?.content ?? '').trim(),
      createdAt: String(item?.createdAt ?? nowIso()).trim(),
    }))
    .filter((item) => item.id && item.content)

const normalizeSettings = (value) => {
  const incoming = value && typeof value === 'object' ? value : {}
  return {
    ...defaultState().settings,
    ...incoming,
    notifications: {
      ...defaultState().settings.notifications,
      ...(incoming.notifications ?? {}),
    },
  }
}

const sanitizeState = (value) => {
  const incoming = value && typeof value === 'object' ? value : {}
  return {
    ...defaultState(),
    uploadedFiles: normalizeUploadedFiles(incoming.uploadedFiles),
    selectedFileId: incoming.selectedFileId ? String(incoming.selectedFileId) : null,
    takeoffElements: normalizeTakeoffElements(incoming.takeoffElements),
    takeoffConfidence: Math.max(0, Math.min(100, Math.round(Number(incoming.takeoffConfidence ?? 0) || 0))),
    takeoffLastRunAt: incoming.takeoffLastRunAt ? String(incoming.takeoffLastRunAt) : null,
    costItems: normalizeCostItems(incoming.costItems),
    reports: normalizeReports(incoming.reports),
    assistantMessages: normalizeAssistantMessages(incoming.assistantMessages),
    settings: normalizeSettings(incoming.settings),
  }
}

const ensureStorage = async () => {
  await fs.mkdir(costEstimatorDataDir, { recursive: true })
}

export const readCostEstimatorDb = async () => {
  await ensureStorage()
  try {
    const raw = await fs.readFile(costEstimatorDbFile, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      version: Number(parsed?.version ?? 1) || 1,
      updatedAt: String(parsed?.updatedAt ?? nowIso()),
      state: sanitizeState(parsed?.state ?? {}),
    }
  } catch {
    const fallback = defaultDatabase()
    await fs.writeFile(costEstimatorDbFile, JSON.stringify(fallback, null, 2), 'utf8')
    return fallback
  }
}

export const writeCostEstimatorState = async (nextState) => {
  await ensureStorage()
  const normalized = sanitizeState(nextState)
  const payload = {
    version: 1,
    updatedAt: nowIso(),
    state: normalized,
  }
  await fs.writeFile(costEstimatorDbFile, JSON.stringify(payload, null, 2), 'utf8')
  return payload
}

const inferCategory = (name) => {
  const lower = String(name ?? '').toLowerCase()
  if (lower.includes('concrete') || lower.includes('foundation') || lower.includes('slab')) return 'Concrete'
  if (lower.includes('steel') || lower.includes('beam') || lower.includes('column')) return 'Steel'
  if (lower.includes('wall') || lower.includes('brick')) return 'Masonry'
  if (lower.includes('door') || lower.includes('window')) return 'Fixtures'
  if (lower.includes('roof')) return 'Roofing'
  return 'General'
}

export const deriveCostEstimatorModules = (state) => {
  const safeState = sanitizeState(state)
  const materialCost = safeState.costItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
  const laborCost = materialCost * 0.35
  const equipmentCost = materialCost * 0.15
  const totalCost = materialCost + laborCost + equipmentCost

  const materials = safeState.costItems.map((item) => {
    const avgCost = item.unitCost
    const regionalCost = Number((item.unitCost * 1.05).toFixed(2))
    const trend = Number((((regionalCost - avgCost) / Math.max(avgCost, 1)) * 100).toFixed(1))
    return {
      name: item.item,
      category: inferCategory(item.item),
      unit: item.unit,
      avgCost,
      regionalCost,
      trend,
    }
  })

  const laborTemplate = [
    { type: 'Mason', hourlyRate: 28 },
    { type: 'Steel Fixer', hourlyRate: 32 },
    { type: 'Concrete Worker', hourlyRate: 26 },
    { type: 'Finishing Crew', hourlyRate: 24 },
    { type: 'MEP Technician', hourlyRate: 35 },
  ]
  const perLaborBudget = laborTemplate.length ? laborCost / laborTemplate.length : 0
  const labor = laborCost <= 0
    ? []
    : laborTemplate.map((entry) => {
        const estimatedHours = Math.max(8, Math.round(perLaborBudget / entry.hourlyRate))
        return {
          ...entry,
          region: safeState.settings.defaultRegion || 'Configured Region',
          estimatedHours,
          totalCost: estimatedHours * entry.hourlyRate,
        }
      })

  const equipmentTemplate = [
    { name: 'Excavator', rentalCost: 850 },
    { name: 'Concrete Mixer', rentalCost: 420 },
    { name: 'Scaffolding System', rentalCost: 300 },
    { name: 'Material Lift', rentalCost: 260 },
    { name: 'Generator', rentalCost: 180 },
  ]
  const perEquipmentBudget = equipmentTemplate.length ? equipmentCost / equipmentTemplate.length : 0
  const equipment = equipmentCost <= 0
    ? []
    : equipmentTemplate.map((entry) => {
        const usageDays = Math.max(3, Math.round(perEquipmentBudget / entry.rentalCost))
        return {
          ...entry,
          usageDays,
          totalCost: usageDays * entry.rentalCost,
        }
      })

  const priceRisk = Math.min(88, Math.max(30, Math.round((materialCost / 100000) * 8)))
  const weatherRisk = Math.min(78, Math.max(28, 42 + safeState.uploadedFiles.length * 4))
  const laborRisk = Math.max(20, 55 - safeState.uploadedFiles.length * 3)
  const budgetOverrunRisk = Math.min(92, Math.max(25, Math.round(35 + (safeState.takeoffConfidence ? 100 - safeState.takeoffConfidence : 22))))
  const riskCards = [
    { title: 'Material Price Volatility', percentage: priceRisk },
    { title: 'Weather Delay Risk', percentage: weatherRisk },
    { title: 'Labor Shortage Risk', percentage: laborRisk },
    { title: 'Budget Overrun Risk', percentage: budgetOverrunRisk },
  ]
  const risk = {
    overallRisk: Math.round(riskCards.reduce((sum, item) => sum + item.percentage, 0) / Math.max(riskCards.length, 1)),
    cards: riskCards,
  }

  const dashboard = {
    materialCost,
    laborCost,
    equipmentCost,
    totalCost,
    takeoffTypes: new Set(safeState.takeoffElements.map((item) => item.name)).size,
    uploadedFiles: safeState.uploadedFiles.length,
  }

  return {
    materials,
    labor,
    equipment,
    risk,
    dashboard,
  }
}
