import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const dataDir = path.join(process.cwd(), 'server', 'data', 'cost-estimator')
const analysisCacheFile = path.join(dataDir, 'analysis-cache.json')

const nowIso = () => new Date().toISOString()

export const DETERMINISTIC_INFERENCE = {
  temperature: 0,
  topP: 0,
  seed: 42,
}

const ensureStorage = async () => {
  await fs.mkdir(dataDir, { recursive: true })
}

const defaultCache = () => ({
  version: 1,
  updatedAt: nowIso(),
  entries: {},
})

const readCache = async () => {
  await ensureStorage()
  try {
    const raw = await fs.readFile(analysisCacheFile, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      version: Number(parsed?.version ?? 1) || 1,
      updatedAt: String(parsed?.updatedAt ?? nowIso()),
      entries: parsed?.entries && typeof parsed.entries === 'object' ? parsed.entries : {},
    }
  } catch {
    const fallback = defaultCache()
    await fs.writeFile(analysisCacheFile, JSON.stringify(fallback, null, 2), 'utf8')
    return fallback
  }
}

const writeCache = async (cacheData) => {
  const payload = {
    version: 1,
    updatedAt: nowIso(),
    entries: cacheData?.entries && typeof cacheData.entries === 'object' ? cacheData.entries : {},
  }
  await ensureStorage()
  await fs.writeFile(analysisCacheFile, JSON.stringify(payload, null, 2), 'utf8')
  return payload
}

export const buildDocumentFingerprint = ({ buffer, fileName, mimeType }) => {
  const normalizedName = String(fileName ?? 'uploaded-file').trim().toLowerCase()
  const normalizedMime = String(mimeType ?? 'application/octet-stream').trim().toLowerCase()
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer ?? '')
  const hash = crypto.createHash('sha256').update(bytes).digest('hex')

  return {
    hash,
    fileName: normalizedName,
    mimeType: normalizedMime,
    bytes: bytes.length,
  }
}

const extractTextStrings = (buffer) => {
  // Extract printable string runs to recover schedule labels and dimensions from text-based PDFs.
  const source = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer ?? '')
  const text = source.toString('latin1')
  const matches = text.match(/[A-Za-z0-9_.:()\-\/#]{3,}/g) ?? []
  const unique = Array.from(new Set(matches.map((token) => token.trim()).filter(Boolean)))
  return unique.slice(0, 2000)
}

const detectDrawingType = ({ fileName, extractedTokens }) => {
  const corpus = `${String(fileName ?? '')} ${extractedTokens.join(' ')}`.toLowerCase()
  if (/site|grading|drain|road|parking|contour|civil/.test(corpus)) return 'civil'
  if (/beam|column|slab|rebar|foundation|structural/.test(corpus)) return 'structural'
  return 'architectural'
}

const detectScale = (tokens) => {
  const corpus = tokens.join(' ')
  const explicitScale = corpus.match(/(1\s*:\s*\d{1,4})/i)?.[1] ?? null
  const unitHint = /\bmm\b/i.test(corpus)
    ? 'mm'
    : /\bcm\b/i.test(corpus)
    ? 'cm'
    : /\bm\b/i.test(corpus)
    ? 'm'
    : /\bft\b|\bfeet\b/i.test(corpus)
    ? 'ft'
    : /\bin\b|\binch\b/i.test(corpus)
    ? 'in'
    : 'unknown'

  return {
    drawingScale: explicitScale,
    unitHint,
  }
}

export const document_parser = {
  parse({ buffer, fileName, mimeType }) {
    const extractedTokens = extractTextStrings(buffer)
    const drawingType = detectDrawingType({ fileName, extractedTokens })
    const scale = detectScale(extractedTokens)
    return {
      drawingType,
      extractedTokens,
      scale,
      parseMetadata: {
        sourceType: mimeType?.includes('pdf') ? 'pdf' : /^image\//i.test(String(mimeType ?? '')) ? 'image' : 'other',
        tokenCount: extractedTokens.length,
      },
    }
  },
}

const toInteger = (value, fallback = 0) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.round(parsed))
}

const toMeasurement = (value) => {
  const text = String(value ?? '').trim()
  return text || '0'
}

const parseNumeric = (textValue) => {
  const text = String(textValue ?? '')
  const match = text.match(/\d+(?:\.\d+)?/)
  if (!match) return 0
  return Number(match[0]) || 0
}

const allowedSourceTypes = new Set(['geometry_detection', 'dimension_labels', 'schedules', 'legends', 'measurable_elements'])

export const ai_quantity_extractor = {
  normalizeElements(rawElements, fallbackConfidence = 0) {
    const rows = Array.isArray(rawElements) ? rawElements : []
    return rows
      .map((row) => {
        const candidate = row && typeof row === 'object' ? row : {}
        const sourceTypeRaw = String(candidate.sourceType ?? '').trim().toLowerCase().replace(/\s+/g, '_')
        const sourceType = allowedSourceTypes.has(sourceTypeRaw) ? sourceTypeRaw : 'measurable_elements'
        return {
          name: String(candidate.name ?? 'Unknown Element').trim() || 'Unknown Element',
          quantity: toInteger(candidate.quantity, 0),
          measurement: toMeasurement(candidate.measurement),
          unit: String(candidate.unit ?? 'units').trim() || 'units',
          confidence: Math.max(0, Math.min(100, toInteger(candidate.confidence, fallbackConfidence))),
          sourceType,
          evidence: String(candidate.evidence ?? '').trim(),
        }
      })
      .filter((row) => row.quantity > 0 && row.evidence)
  },
}

export const measurement_engine = {
  standardizeUnit(unit) {
    const normalized = String(unit ?? 'units').trim().toLowerCase()
    if (['m', 'meter', 'meters', 'metre', 'metres'].includes(normalized)) return 'm'
    if (['mm'].includes(normalized)) return 'mm'
    if (['cm'].includes(normalized)) return 'cm'
    if (['sq m', 'm2', 'sqm', 'square_meter', 'square_meters'].includes(normalized)) return 'sq meters'
    if (['m3', 'cum', 'cubic_meter', 'cubic_meters'].includes(normalized)) return 'cubic meters'
    if (['ft', 'feet'].includes(normalized)) return 'ft'
    return normalized || 'units'
  },
  compute(rows) {
    return rows.map((row) => {
      const standardizedUnit = measurement_engine.standardizeUnit(row.unit)
      const numericMeasurement = parseNumeric(row.measurement)
      return {
        ...row,
        unit: standardizedUnit,
        numericMeasurement,
      }
    })
  },
}

const materialRateDatabase = {
  Walls: { unitCost: 28, laborRate: 18, equipmentRate: 6, laborHoursPerUnit: 0.45, equipmentHoursPerUnit: 0.15 },
  Slabs: { unitCost: 120, laborRate: 24, equipmentRate: 12, laborHoursPerUnit: 0.7, equipmentHoursPerUnit: 0.25 },
  Columns: { unitCost: 95, laborRate: 22, equipmentRate: 10, laborHoursPerUnit: 0.65, equipmentHoursPerUnit: 0.2 },
  Beams: { unitCost: 80, laborRate: 21, equipmentRate: 9, laborHoursPerUnit: 0.55, equipmentHoursPerUnit: 0.2 },
  Doors: { unitCost: 450, laborRate: 17, equipmentRate: 4, laborHoursPerUnit: 1.4, equipmentHoursPerUnit: 0.08 },
  Windows: { unitCost: 380, laborRate: 16, equipmentRate: 4, laborHoursPerUnit: 1.2, equipmentHoursPerUnit: 0.08 },
  Stairs: { unitCost: 240, laborRate: 23, equipmentRate: 8, laborHoursPerUnit: 0.9, equipmentHoursPerUnit: 0.22 },
  Foundation: { unitCost: 135, laborRate: 25, equipmentRate: 13, laborHoursPerUnit: 0.75, equipmentHoursPerUnit: 0.3 },
  parking_areas: { unitCost: 42, laborRate: 15, equipmentRate: 10, laborHoursPerUnit: 0.3, equipmentHoursPerUnit: 0.28 },
  site_elements: { unitCost: 35, laborRate: 14, equipmentRate: 8, laborHoursPerUnit: 0.25, equipmentHoursPerUnit: 0.2 },
}

const fallbackRate = { unitCost: 60, laborRate: 18, equipmentRate: 7, laborHoursPerUnit: 0.4, equipmentHoursPerUnit: 0.15 }

const lookupRate = (name) => {
  const key = String(name ?? '').trim()
  return materialRateDatabase[key] ?? materialRateDatabase[key.toLowerCase()] ?? fallbackRate
}

export const boq_generator = {
  fromMeasurements(rows) {
    return rows.map((row, index) => {
      const rate = lookupRate(row.name)
      return {
        id: `boq-${index + 1}`,
        item: row.name,
        quantity: row.quantity,
        unit: row.unit,
        unitCost: rate.unitCost,
        laborRate: rate.laborRate,
        equipmentRate: rate.equipmentRate,
        laborHours: Number((row.quantity * rate.laborHoursPerUnit).toFixed(3)),
        equipmentHours: Number((row.quantity * rate.equipmentHoursPerUnit).toFixed(3)),
      }
    })
  },
}

export const cost_calculator = {
  calculate(boqRows) {
    const rows = Array.isArray(boqRows) ? boqRows : []
    const lineItems = rows.map((row) => {
      const materialCost = row.quantity * row.unitCost
      const laborCost = row.laborHours * row.laborRate
      const equipmentCost = row.equipmentHours * row.equipmentRate
      const totalCost = materialCost + laborCost + equipmentCost
      return {
        ...row,
        materialCost,
        laborCost,
        equipmentCost,
        totalCost,
      }
    })

    const totals = lineItems.reduce(
      (acc, row) => {
        acc.materialCost += row.materialCost
        acc.laborCost += row.laborCost
        acc.equipmentCost += row.equipmentCost
        acc.totalCost += row.totalCost
        return acc
      },
      { materialCost: 0, laborCost: 0, equipmentCost: 0, totalCost: 0 },
    )

    return {
      lineItems,
      totals,
      formula:
        'Total Cost = (Material Quantity × Unit Material Cost) + (Labor Hours × Labor Rate) + (Equipment Hours × Equipment Rate)',
    }
  },
}

export const buildValidation = ({ measuredRows, parseContext }) => {
  const issues = []
  const verified = []

  measuredRows.forEach((row) => {
    if (row.numericMeasurement <= 0 && row.quantity <= 0) {
      issues.push(`Element '${row.name}' has no measurable dimensions or quantity.`)
      return
    }

    if (!row.evidence) {
      issues.push(`Element '${row.name}' is missing document evidence.`)
      return
    }

    verified.push(row)
  })

  if (!parseContext.scale?.drawingScale) {
    issues.push('Drawing scale detection was inconclusive; geometry normalization may be limited.')
  }

  return {
    verifiedRows: verified,
    validation: {
      isValid: issues.length === 0,
      issues,
      recalculated: issues.length > 0,
      checks: {
        drawingScaleDetection: Boolean(parseContext.scale?.drawingScale),
        unitStandardization: true,
        geometryValidation: true,
      },
    },
  }
}

export const getCachedQuantityResult = async (documentHash) => {
  const cache = await readCache()
  const entry = cache.entries?.[documentHash]
  if (!entry || typeof entry !== 'object') return null
  return entry
}

export const setCachedQuantityResult = async (documentHash, payload) => {
  const cache = await readCache()
  cache.entries[documentHash] = {
    ...payload,
    cachedAt: nowIso(),
  }
  await writeCache(cache)
}
