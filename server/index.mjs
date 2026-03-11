import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import multer from 'multer'
import path from 'node:path'
import OpenAI from 'openai'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { predictRetrofitMl, retrainRetrofitMlModel } from './ml/retrofitMlModel.mjs'
import {
  deriveCostEstimatorModules,
  readCostEstimatorDb,
  writeCostEstimatorState,
} from './cost-estimator/costEstimatorDb.mjs'
import {
  DETERMINISTIC_INFERENCE,
  ai_quantity_extractor,
  boq_generator,
  buildDocumentFingerprint,
  buildValidation,
  cost_calculator,
  document_parser,
  getCachedQuantityResult,
  measurement_engine,
  setCachedQuantityResult,
} from './cost-estimator/deterministicPipeline.mjs'
import {
  registerDevice,
  unregisterDevice,
  updateSubscriptionPreferences,
  getDevicesForBroadcast,
  prepareFcmMessage,
  readRegisteredDevices,
} from './notifications.mjs'
import { handleNEATAnalyze, handleNEATMetadata } from './neat/neat.routes.mjs'

const app = express()
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } })
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
dotenv.config()
const resolvedPort = Number.parseInt(process.env.PORT ?? process.env.VISION_API_PORT ?? '8787', 10)
const port = Number.isFinite(resolvedPort) && resolvedPort > 0 ? resolvedPort : 8787
const host = process.env.HOST ?? '0.0.0.0'
const AI_PROVIDER = String(process.env.AI_PROVIDER ?? 'openai').trim().toLowerCase()
const selectedAiProvider = AI_PROVIDER === 'huggingface' ? 'huggingface' : 'openai'
const OPENAI_FALLBACK_TO_HUGGINGFACE = String(process.env.OPENAI_FALLBACK_TO_HUGGINGFACE ?? 'true').trim().toLowerCase() !== 'false'
const COST_ESTIMATOR_INFERENCE_SEED = Number(process.env.COST_ESTIMATOR_INFERENCE_SEED ?? DETERMINISTIC_INFERENCE.seed) || DETERMINISTIC_INFERENCE.seed
const COST_ESTIMATOR_DEBUG_DEFAULT = String(process.env.COST_ESTIMATOR_DEBUG_DEFAULT ?? 'false').trim().toLowerCase() === 'true'

// Support multiple API keys for quota rotation
const parseApiKeyList = (rawValue) =>
  String(rawValue ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)

const isPlaceholderApiKey = (key) => /^(sk-your|your-api-key|replace-with)/i.test(String(key ?? '').trim())

const sanitizeApiKeys = (keys) => keys.filter((key) => !isPlaceholderApiKey(key))

const OPENAI_API_KEYS = (() => {
  const multiKeys = sanitizeApiKeys(parseApiKeyList(process.env.OPENAI_API_KEYS))
  if (multiKeys.length > 0) {
    return multiKeys
  }
  const singleKey = String(process.env.OPENAI_API_KEY ?? '').trim()
  return singleKey && !isPlaceholderApiKey(singleKey) ? [singleKey] : []
})()
const OPENAI_API_KEY = OPENAI_API_KEYS[0] ?? ''
const OPENAI_MODEL = String(process.env.OPENAI_VISION_MODEL ?? 'gpt-4o-mini').trim()
const COST_ESTIMATOR_AI_PROVIDER = String(process.env.COST_ESTIMATOR_AI_PROVIDER ?? 'openai').trim().toLowerCase()
const COST_ESTIMATOR_OPENAI_MODEL = String(process.env.COST_ESTIMATOR_OPENAI_MODEL ?? OPENAI_MODEL).trim()
const COST_ESTIMATOR_OPENAI_API_KEYS = (() => {
  const explicitMulti = sanitizeApiKeys(parseApiKeyList(process.env.COST_ESTIMATOR_OPENAI_API_KEYS))
  if (explicitMulti.length > 0) {
    return explicitMulti
  }
  const explicitSingle = String(process.env.COST_ESTIMATOR_OPENAI_API_KEY ?? '').trim()
  if (explicitSingle && !isPlaceholderApiKey(explicitSingle)) {
    return [explicitSingle]
  }
  return OPENAI_API_KEYS
})()
const COST_ESTIMATOR_OPENAI_API_KEY = COST_ESTIMATOR_OPENAI_API_KEYS[0] ?? ''
const OPENROUTER_API_KEY = String(process.env.OPENROUTER_API_KEY ?? '').trim()
const OPENROUTER_MODEL = String(process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini').trim()
const OPENROUTER_BASE_URL = String(process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1').trim().replace(/\/+$/, '')
const OPENROUTER_SITE_URL = String(process.env.OPENROUTER_SITE_URL ?? '').trim()
const OPENROUTER_SITE_NAME = String(process.env.OPENROUTER_SITE_NAME ?? 'Resilience360 Cost Estimator').trim()
const AZURE_OPENAI_ENDPOINT = String(process.env.AZURE_OPENAI_ENDPOINT ?? '').trim().replace(/\/+$/, '')
const AZURE_OPENAI_API_KEY = String(process.env.AZURE_OPENAI_API_KEY ?? '').trim()
const AZURE_OPENAI_DEPLOYMENT = String(process.env.AZURE_OPENAI_DEPLOYMENT ?? '').trim()
const AZURE_OPENAI_API_VERSION = String(process.env.AZURE_OPENAI_API_VERSION ?? '2024-10-21').trim()

let currentKeyIndex = 0
let costEstimatorCurrentKeyIndex = 0
const rotateApiKey = () => {
  if (OPENAI_API_KEYS.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % OPENAI_API_KEYS.length
    console.log(`Rotated to API key ${currentKeyIndex + 1}/${OPENAI_API_KEYS.length}`)
    return OPENAI_API_KEYS[currentKeyIndex]
  }
  return OPENAI_API_KEY
}

const getCurrentApiKey = () => OPENAI_API_KEYS[currentKeyIndex] || OPENAI_API_KEY
const rotateCostEstimatorApiKey = () => {
  if (COST_ESTIMATOR_OPENAI_API_KEYS.length > 1) {
    costEstimatorCurrentKeyIndex = (costEstimatorCurrentKeyIndex + 1) % COST_ESTIMATOR_OPENAI_API_KEYS.length
    console.log(`Rotated cost estimator API key ${costEstimatorCurrentKeyIndex + 1}/${COST_ESTIMATOR_OPENAI_API_KEYS.length}`)
    return COST_ESTIMATOR_OPENAI_API_KEYS[costEstimatorCurrentKeyIndex]
  }
  return COST_ESTIMATOR_OPENAI_API_KEY
}
const getCurrentCostEstimatorApiKey = () =>
  COST_ESTIMATOR_OPENAI_API_KEYS[costEstimatorCurrentKeyIndex] || COST_ESTIMATOR_OPENAI_API_KEY
const MATERIAL_HUBS_SUPABASE_URL = String(process.env.MATERIAL_HUBS_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim()
const MATERIAL_HUBS_SUPABASE_ANON_KEY = String(process.env.MATERIAL_HUBS_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
const MATERIAL_HUBS_ADMIN_EMAILS = String(process.env.MATERIAL_HUBS_ADMIN_EMAILS ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)
const HUGGINGFACE_API_KEY = String(process.env.HUGGINGFACE_API_KEY ?? '').trim()
const HUGGINGFACE_BASE_URL = String(process.env.HUGGINGFACE_BASE_URL ?? 'https://router.huggingface.co/v1').trim()
const HUGGINGFACE_CHAT_MODEL = String(process.env.HUGGINGFACE_CHAT_MODEL ?? 'meta-llama/Llama-3.1-8B-Instruct').trim()
const HUGGINGFACE_VISION_MODEL = String(process.env.HUGGINGFACE_VISION_MODEL ?? HUGGINGFACE_CHAT_MODEL).trim()
const HUGGINGFACE_IMAGE_MODEL = String(process.env.HUGGINGFACE_IMAGE_MODEL ?? 'black-forest-labs/FLUX.1-dev').trim()
const model = selectedAiProvider === 'huggingface' ? HUGGINGFACE_CHAT_MODEL : OPENAI_MODEL
const hasKey = selectedAiProvider === 'huggingface' ? Boolean(HUGGINGFACE_API_KEY) : Boolean(OPENAI_API_KEY)
const hasHuggingFaceFallback = OPENAI_FALLBACK_TO_HUGGINGFACE && Boolean(HUGGINGFACE_API_KEY)
const AI_CHAT_TIMEOUT_MS = Math.max(15_000, Number(process.env.AI_CHAT_TIMEOUT_MS ?? 45_000) || 45_000)
const AI_IMAGE_TIMEOUT_MS = Math.max(20_000, Number(process.env.AI_IMAGE_TIMEOUT_MS ?? 75_000) || 75_000)
const AI_IMAGE_CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.AI_IMAGE_CONCURRENCY ?? 2) || 2))
const NDMA_ADVISORIES_URL = process.env.NDMA_ADVISORIES_URL ?? 'https://ndma.gov.pk/advisories'
const NDMA_SITREPS_URL = process.env.NDMA_SITREPS_URL ?? 'https://ndma.gov.pk/sitreps'
const NDMA_PROJECTIONS_URL = process.env.NDMA_PROJECTIONS_URL ?? 'https://ndma.gov.pk/projection-impact-list_new'
const PMD_RSS_URL = process.env.PMD_RSS_URL ?? 'https://cap-sources.s3.amazonaws.com/pk-pmd-en/rss.xml'
const PMD_HOME_URL = process.env.PMD_HOME_URL ?? 'https://www.pmd.gov.pk/en'
const PMD_SATELLITE_URL = process.env.PMD_SATELLITE_URL ?? 'https://nwfc.pmd.gov.pk/new/satellite.php'
const PMD_RADAR_URL = process.env.PMD_RADAR_URL ?? 'https://radar.pmd.gov.pk/login'
const GLOBAL_EARTHQUAKE_FEED_URL =
  process.env.GLOBAL_EARTHQUAKE_FEED_URL ??
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson'
const GLOBAL_EARTHQUAKE_FEED_URL_BACKUP =
  process.env.GLOBAL_EARTHQUAKE_FEED_URL_BACKUP ??
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
const GLOBAL_BUILDING_ATLAS_WFS_URL =
  process.env.GLOBAL_BUILDING_ATLAS_WFS_URL ??
  'https://tubvsig-so2sat-vm1.srv.mwn.de/geoserver/ows?'
const GLOBAL_BUILDING_ATLAS_WFS_LAYER_CANDIDATES =
  String(process.env.GLOBAL_BUILDING_ATLAS_WFS_LAYERS ?? 'GBA:ODbLPolygon,GBA.ODbLPolygon,GBA:Polygon,GBA.Polygon')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
const GLOBAL_BUILDING_ATLAS_ROOT =
  process.env.GLOBAL_BUILDING_ATLAS_ROOT ?? path.resolve(__dirname, '..', 'GlobalBuildingAtlas-main')
const EMSC_EARTHQUAKE_FEED_URL =
  process.env.EMSC_EARTHQUAKE_FEED_URL ??
  'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=100'
const PAKISTAN_EARTHQUAKE_BOUNDS = {
  minlatitude: 23.0,
  maxlatitude: 37.0,
  minlongitude: 60.0,
  maxlongitude: 78.0,
}
const RECOVERY_EMAIL_PROVIDER = String(process.env.RECOVERY_EMAIL_PROVIDER ?? '').trim().toLowerCase()
const RECOVERY_FROM_EMAIL = String(process.env.RECOVERY_FROM_EMAIL ?? '').trim()
const RECOVERY_FROM_NAME = String(process.env.RECOVERY_FROM_NAME ?? 'Resilience360 Recovery').trim()
const RESEND_API_KEY = String(process.env.RESEND_API_KEY ?? '').trim()
const BREVO_API_KEY = String(process.env.BREVO_API_KEY ?? '').trim()
const COMMUNITY_ISSUES_ADMIN_TOKEN = String(process.env.COMMUNITY_ISSUES_ADMIN_TOKEN ?? '').trim()
const INFRA_MODELS_ADMIN_TOKEN = String(process.env.INFRA_MODELS_ADMIN_TOKEN ?? COMMUNITY_ISSUES_ADMIN_TOKEN).trim()
const INFRA_MODELS_GIT_SYNC_ENABLED = String(process.env.INFRA_MODELS_GIT_SYNC_ENABLED ?? 'false').trim().toLowerCase() === 'true'
const INFRA_MODELS_GIT_SYNC_BRANCH = String(process.env.INFRA_MODELS_GIT_SYNC_BRANCH ?? '').trim()
const RECOVERY_RATE_LIMIT_WINDOW_MS = Math.max(60_000, Number(process.env.RECOVERY_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000) || 15 * 60 * 1000)
const RECOVERY_RATE_LIMIT_MAX_REQUESTS = Math.max(1, Number(process.env.RECOVERY_RATE_LIMIT_MAX_REQUESTS ?? 6) || 6)
const recoveryRateLimitStore = new Map()
const retrofitTrainingDir = path.join(__dirname, 'ml', 'training')
const retrofitTrainingImagesDir = path.join(retrofitTrainingDir, 'images')
const retrofitTrainingDataFile = path.join(retrofitTrainingDir, 'userRetrofitTrainingData.json')
const communityIssuesDir = path.join(__dirname, 'data', 'community-issues')
const communityIssueImagesDir = path.join(communityIssuesDir, 'images')
const communityIssuesDataFile = path.join(communityIssuesDir, 'issues.json')
const sharedInfraModelsDir = path.join(__dirname, 'data', 'infra-models')
const sharedInfraModelsDataFile = path.join(sharedInfraModelsDir, 'generated-models.json')
const earthquakeAlertsDir = path.join(__dirname, 'data', 'earthquake-alerts')
const earthquakeSubscriptionsFile = path.join(earthquakeAlertsDir, 'subscriptions.json')
const earthquakeSentAlertsFile = path.join(earthquakeAlertsDir, 'sent-alerts.json')
const EARTHQUAKE_ALERT_MAGNITUDE_THRESHOLD = Math.max(4, Number(process.env.EARTHQUAKE_ALERT_MAGNITUDE_THRESHOLD ?? 5) || 5)
const EARTHQUAKE_ALERT_POLL_INTERVAL_MS = Math.max(60_000, Number(process.env.EARTHQUAKE_ALERT_POLL_INTERVAL_MS ?? 120_000) || 120_000)
const EARTHQUAKE_ALERT_MAX_SENT_IDS = Math.max(200, Number(process.env.EARTHQUAKE_ALERT_MAX_SENT_IDS ?? 5000) || 5000)
const EARTHQUAKE_ALERT_NOTIFIER_ENABLED =
  String(
    process.env.EARTHQUAKE_ALERT_NOTIFIER_ENABLED ??
      (process.env.NODE_ENV === 'production' ? 'false' : 'true'),
  )
    .trim()
    .toLowerCase() === 'true'
const repoRootDir = path.resolve(__dirname, '..')
const sharedInfraModelsGitRelativePath = 'server/data/infra-models/generated-models.json'
const execFileAsync = promisify(execFile)
const allowedCommunityIssueStatuses = new Set(['Submitted', 'In Review', 'In Progress', 'Resolved', 'Rejected'])
const SHARED_INFRA_MODELS_MAX = 200

let openai = selectedAiProvider === 'openai' && OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null
const huggingFaceRouterClient =
  HUGGINGFACE_API_KEY
    ? new OpenAI({ apiKey: HUGGINGFACE_API_KEY, baseURL: HUGGINGFACE_BASE_URL })
    : null

app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use('/uploads/community-issues', express.static(communityIssueImagesDir))

const extractJson = (rawText) => {
  if (!rawText) {
    throw new Error('Empty model response')
  }

  const fenced = rawText.match(/```json\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : rawText
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')

  if (start < 0 || end < 0 || end <= start) {
    console.error('Failed to parse JSON. Raw response:', rawText.substring(0, 500))
    throw new Error('Could not parse structured JSON response. Check server logs for details.')
  }

  return JSON.parse(candidate.slice(start, end + 1))
}

const safeArray = (value) => (Array.isArray(value) ? value : [])

const getAiMissingConfigMessage = (feature) => {
  if (selectedAiProvider === 'huggingface') {
    return `Hugging Face key missing. Set HUGGINGFACE_API_KEY for ${feature}.`
  }
  return `OpenAI key missing. Set OPENAI_API_KEY for ${feature}.`
}

const getErrorStatus = (error) =>
  typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
    ? error.status
    : undefined

const isOpenAiLimitError = (error) => {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const status = getErrorStatus(error)
  return status === 429 || /quota|insufficient_quota|rate\s*limit|billing|too\s*many\s*requests/i.test(message)
}

const isTransientAiError = (error) => {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const status = getErrorStatus(error)
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504 || /timeout|timed\s*out|network|temporar/i.test(message)
}

const withPromiseTimeout = async (promise, timeoutMs, label) => {
  let timer = null
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs)
      }),
    ])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

const normalizeAiErrorMessage = (error, fallback) => {
  if (!error) return fallback
  const status = getErrorStatus(error)
  const message = error instanceof Error ? error.message : String(error)
  if (status === 429 || /insufficient_quota|quota|billing/i.test(message)) {
    return 'AI provider quota limit reached. Please retry shortly or switch API key.'
  }
  return message || fallback
}

const getAiErrorHttpStatus = (error) => {
  const status = getErrorStatus(error)
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (typeof status === 'number' && status >= 400 && status <= 599) {
    return status
  }
  if (/timeout|timed\s*out/i.test(message)) return 504
  if (/quota|insufficient_quota|billing|rate\s*limit|too\s*many\s*requests|429/i.test(message)) return 429
  if (/network|failed to fetch|upstream/i.test(message)) return 502
  return 500
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const runWithConcurrency = async (items, worker, concurrency = AI_IMAGE_CONCURRENCY) => {
  const results = []
  let index = 0
  const workerCount = Math.max(1, Math.min(concurrency, items.length || 1))

  const runners = Array.from({ length: workerCount }, async () => {
    while (index < items.length) {
      const current = index
      index += 1
      try {
        results[current] = { ok: true, value: await worker(items[current], current) }
      } catch (error) {
        results[current] = { ok: false, error }
      }
    }
  })

  await Promise.all(runners)
  return results
}

const createChatCompletion = async ({ messages, temperature = 0.2, openaiModel = OPENAI_MODEL, huggingFaceModel = HUGGINGFACE_CHAT_MODEL }) => {
  const runWithClient = async (client, modelName, allowJsonResponseFormat) => {
    const payload = {
      model: modelName,
      temperature,
      messages,
      ...(allowJsonResponseFormat ? { response_format: { type: 'json_object' } } : {}),
    }

    return await withPromiseTimeout(
      client.chat.completions.create(payload),
      AI_CHAT_TIMEOUT_MS,
      'AI text generation',
    )
  }

  const tryOpenAi = async () => {
    if (!openai) {
      throw new Error('OpenAI API key required. Set OPENAI_API_KEY or OPENAI_API_KEYS in environment variables.')
    }

    try {
      return await runWithClient(openai, openaiModel, true)
    } catch (error) {
      const status = getErrorStatus(error)
      if (status === 429 && OPENAI_API_KEYS.length > 1) {
        const nextKey = rotateApiKey()
        console.log('Quota limit hit, rotating to next API key...')
        openai = new OpenAI({ apiKey: nextKey })
        return await runWithClient(openai, openaiModel, true)
      }
      throw error
    }
  }

  const tryHuggingFace = async () => {
    if (!huggingFaceRouterClient) {
      throw new Error('Hugging Face key missing. Set HUGGINGFACE_API_KEY in environment variables.')
    }

    try {
      return await runWithClient(huggingFaceRouterClient, huggingFaceModel, true)
    } catch {
      return await runWithClient(huggingFaceRouterClient, huggingFaceModel, false)
    }
  }

  if (selectedAiProvider === 'huggingface') {
    return await tryHuggingFace()
  }

  try {
    return await tryOpenAi()
  } catch (error) {
    if (hasHuggingFaceFallback && (isOpenAiLimitError(error) || isTransientAiError(error))) {
      console.warn('OpenAI failed; falling back to Hugging Face for chat completion')
      return await tryHuggingFace()
    }
    throw error
  }
}

const COST_ESTIMATOR_PROVIDERS = new Set(['openai', 'azure', 'openrouter'])

const resolveCostEstimatorProvider = (requestedProvider) => {
  const candidate = String(requestedProvider ?? COST_ESTIMATOR_AI_PROVIDER).trim().toLowerCase()
  return COST_ESTIMATOR_PROVIDERS.has(candidate) ? candidate : 'openai'
}

const hasCostEstimatorProviderConfig = (provider) => {
  if (provider === 'azure') {
    return Boolean(AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY && AZURE_OPENAI_DEPLOYMENT)
  }
  if (provider === 'openrouter') {
    return Boolean(OPENROUTER_API_KEY && OPENROUTER_MODEL)
  }
  return Boolean(COST_ESTIMATOR_OPENAI_API_KEY)
}

const getCostEstimatorMissingConfigMessage = (provider) => {
  if (provider === 'azure') {
    return 'Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT.'
  }
  if (provider === 'openrouter') {
    return 'OpenRouter is not configured. Set OPENROUTER_API_KEY and OPENROUTER_MODEL.'
  }
  return 'OpenAI is not configured. Set COST_ESTIMATOR_OPENAI_API_KEY (or COST_ESTIMATOR_OPENAI_API_KEYS), or OPENAI_API_KEY(S).'
}

const createCostEstimatorChatCompletion = async ({
  provider,
  messages,
  temperature = DETERMINISTIC_INFERENCE.temperature,
  topP = DETERMINISTIC_INFERENCE.topP,
  seed = DETERMINISTIC_INFERENCE.seed,
}) => {
  const normalizedProvider = resolveCostEstimatorProvider(provider)

  const callProvider = async ({ endpoint, headers, payload }) => {
    const response = await withPromiseTimeout(
      fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }),
      AI_CHAT_TIMEOUT_MS,
      'Cost estimator AI analysis',
    )

    const raw = await response.text()
    let json = null
    try {
      json = raw ? JSON.parse(raw) : null
    } catch {
      json = null
    }

    if (!response.ok) {
      const error = new Error(
        (json && (json.error?.message || json.error)) ||
          `Provider returned ${response.status}`,
      )
      error.status = response.status
      throw error
    }

    return json
  }

  if (normalizedProvider === 'azure') {
    const endpoint =
      `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${encodeURIComponent(AZURE_OPENAI_DEPLOYMENT)}` +
      `/chat/completions?api-version=${encodeURIComponent(AZURE_OPENAI_API_VERSION)}`

    const payload = {
      temperature,
      top_p: topP,
      seed,
      messages,
      response_format: { type: 'json_object' },
    }

    const result = await callProvider({
      endpoint,
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY,
      },
      payload,
    })

    return {
      provider: normalizedProvider,
      model: AZURE_OPENAI_DEPLOYMENT,
      content: String(result?.choices?.[0]?.message?.content ?? ''),
    }
  }

  if (normalizedProvider === 'openrouter') {
    const payload = {
      model: OPENROUTER_MODEL,
      temperature,
      top_p: topP,
      seed,
      messages,
      response_format: { type: 'json_object' },
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      ...(OPENROUTER_SITE_URL ? { 'HTTP-Referer': OPENROUTER_SITE_URL } : {}),
      ...(OPENROUTER_SITE_NAME ? { 'X-Title': OPENROUTER_SITE_NAME } : {}),
    }

    const result = await callProvider({
      endpoint: `${OPENROUTER_BASE_URL}/chat/completions`,
      headers,
      payload,
    })

    return {
      provider: normalizedProvider,
      model: OPENROUTER_MODEL,
      content: String(result?.choices?.[0]?.message?.content ?? ''),
    }
  }

  const runOpenAi = async (apiKey) => {
    const payload = {
      model: COST_ESTIMATOR_OPENAI_MODEL,
      temperature,
      top_p: topP,
      seed,
      messages,
      response_format: { type: 'json_object' },
    }

    const result = await callProvider({
      endpoint: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      payload,
    })

    return result
  }

  let result = null
  try {
    result = await runOpenAi(getCurrentCostEstimatorApiKey())
  } catch (error) {
    if (getErrorStatus(error) === 429 && COST_ESTIMATOR_OPENAI_API_KEYS.length > 1) {
      const rotated = rotateCostEstimatorApiKey()
      result = await runOpenAi(rotated)
    } else {
      throw error
    }
  }

  return {
    provider: normalizedProvider,
    model: COST_ESTIMATOR_OPENAI_MODEL,
    content: String(result?.choices?.[0]?.message?.content ?? ''),
  }
}

const parseImageSize = (size) => {
  if (!size || size === 'auto') {
    return { width: 1024, height: 1024 }
  }

  const [rawWidth, rawHeight] = String(size).split('x')
  const width = Math.max(256, Number(rawWidth) || 1024)
  const height = Math.max(256, Number(rawHeight) || 1024)
  return { width, height }
}

const fetchImageAsBase64FromUrl = async (url) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AI_IMAGE_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Image fetch failed (${response.status})`)
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    return buffer.toString('base64')
  } finally {
    clearTimeout(timer)
  }
}

const generateImageBase64 = async ({ prompt, size = '1024x1024' }) => {
  const validDallE3Sizes = ['1024x1024', '1024x1792', '1792x1024']
  const imageSize = validDallE3Sizes.includes(size) ? size : '1024x1024'

  const runImageRequest = async (client, provider) => {
    const modelName = provider === 'huggingface' ? HUGGINGFACE_IMAGE_MODEL : 'dall-e-3'
    const generated = await withPromiseTimeout(
      client.images.generate({
        model: modelName,
        prompt,
        ...(provider === 'openai' ? { size: imageSize } : {}),
        response_format: 'b64_json',
      }),
      AI_IMAGE_TIMEOUT_MS,
      'AI image generation',
    )

    const entry = generated?.data?.[0]
    if (entry?.b64_json) return entry.b64_json
    if (entry?.url) {
      return await fetchImageAsBase64FromUrl(entry.url)
    }
    return null
  }

  const tryOpenAi = async () => {
    if (!openai) {
      throw new Error('OpenAI API key required. Set OPENAI_API_KEY or OPENAI_API_KEYS in environment variables.')
    }

    try {
      return await runImageRequest(openai, 'openai')
    } catch (error) {
      const status = getErrorStatus(error)
      if (status === 429 && OPENAI_API_KEYS.length > 1) {
        const nextKey = rotateApiKey()
        console.log('Image generation quota limit hit, rotating to next API key...')
        openai = new OpenAI({ apiKey: nextKey })
        return await runImageRequest(openai, 'openai')
      }
      throw error
    }
  }

  const tryHuggingFace = async () => {
    if (!huggingFaceRouterClient) {
      throw new Error('Hugging Face key missing. Set HUGGINGFACE_API_KEY in environment variables.')
    }

    return await runImageRequest(huggingFaceRouterClient, 'huggingface')
  }

  if (selectedAiProvider === 'huggingface') {
    return await tryHuggingFace()
  }

  try {
    return await tryOpenAi()
  } catch (error) {
    if (hasHuggingFaceFallback && (isOpenAiLimitError(error) || isTransientAiError(error))) {
      console.warn('OpenAI failed; falling back to Hugging Face for image generation')
      return await tryHuggingFace()
    }
    throw error
  }
}

const fetchRemoteText = async (url, timeoutMs = 14000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Upstream request failed (${response.status}) for ${url}`)
    }
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

const fetchRemoteJson = async (url, timeoutMs = 14000) => {
  const text = await fetchRemoteText(url, timeoutMs)
  return JSON.parse(text)
}

let atlasCountryStatsCache = null
let atlasCountryStatsLoadedAt = 0

const normalizeCountryName = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[()'.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const atlasCountryAliases = {
  pakistan: 'PAK',
  'united states': 'USA',
  usa: 'USA',
  'united states of america': 'USA',
  russia: 'RUS',
  'russian federation': 'RUS',
  turkey: 'TUR',
  turkiye: 'TUR',
  iran: 'IRN',
  india: 'IND',
  china: 'CHN',
  afghanistan: 'AFG',
}

const parseAtlasHitsCount = (responseText) => {
  const matched = responseText.match(/numberMatched="([0-9]+)"/i)
  if (matched?.[1]) return Number.parseInt(matched[1], 10)
  const features = responseText.match(/numberOfFeatures="([0-9]+)"/i)
  if (features?.[1]) return Number.parseInt(features[1], 10)
  return NaN
}

const tryCountBuildingsFromAtlasWfs = async ({ lat, lng, radiusKm }) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusKm) || radiusKm <= 0) {
    return null
  }

  const safeRadiusKm = Math.max(1, Math.min(120, radiusKm))
  const latDelta = safeRadiusKm / 110.574
  const lngDelta = safeRadiusKm / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))

  const minLat = lat - latDelta
  const maxLat = lat + latDelta
  const minLng = lng - lngDelta
  const maxLng = lng + lngDelta

  for (const typeName of GLOBAL_BUILDING_ATLAS_WFS_LAYER_CANDIDATES) {
    const url =
      `${GLOBAL_BUILDING_ATLAS_WFS_URL}` +
      `service=WFS&version=2.0.0&request=GetFeature&typeNames=${encodeURIComponent(typeName)}` +
      '&resultType=hits&srsName=EPSG:4326' +
      `&bbox=${minLng},${minLat},${maxLng},${maxLat},EPSG:4326`

    try {
      const text = await fetchRemoteText(url, 9000)
      const count = parseAtlasHitsCount(text)
      if (Number.isFinite(count) && count >= 0) {
        const boxAreaSqKm = (maxLat - minLat) * (maxLng - minLng) * 111.32 * 110.574
        const circleAreaSqKm = Math.PI * safeRadiusKm * safeRadiusKm
        const areaScale = boxAreaSqKm > 0 ? Math.min(1, circleAreaSqKm / boxAreaSqKm) : 1
        return {
          estimatedBuildings: Math.round(count * areaScale),
          source: 'GlobalBuildingAtlas WFS',
          method: 'Spatial count from WFS hits query (bbox-adjusted to circle)',
          accuracyMode: 'WFS exact',
          confidence: 'High',
          note:
            safeRadiusKm < radiusKm
              ? `Radius clipped to ${safeRadiusKm} km for stable query performance.`
              : undefined,
        }
      }
    } catch {
      // Try next layer candidate.
    }
  }

  return null
}

const loadAtlasCountryStats = async () => {
  const now = Date.now()
  if (atlasCountryStatsCache && now - atlasCountryStatsLoadedAt < 10 * 60 * 1000) {
    return atlasCountryStatsCache
  }

  const volumeByCountryPath = path.join(GLOBAL_BUILDING_ATLAS_ROOT, 'make_plots', 'volume_by_country.json')
  const populationByCountryPath = path.join(GLOBAL_BUILDING_ATLAS_ROOT, 'make_plots', 'global_popuation_building_volume.json')

  const [volumeRaw, populationRaw] = await Promise.all([
    fs.readFile(volumeByCountryPath, 'utf8'),
    fs.readFile(populationByCountryPath, 'utf8'),
  ])

  const volumeByCountry = JSON.parse(volumeRaw)
  const populationByCountry = JSON.parse(populationRaw)
  const byIso = new Map()
  const byName = new Map()

  let globalBuildings = 0
  let globalPopulation = 0

  for (const [iso, volumeStats] of Object.entries(volumeByCountry)) {
    const count = Number(volumeStats?.count ?? 0)
    const population = Number(populationByCountry?.[iso]?.population ?? 0)
    const name = String(populationByCountry?.[iso]?.name ?? iso).trim()
    if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(population) || population <= 0) continue

    const buildingsPerPerson = count / population
    const entry = {
      iso,
      name,
      count,
      population,
      buildingsPerPerson,
    }

    byIso.set(iso, entry)
    byName.set(normalizeCountryName(name), iso)
    globalBuildings += count
    globalPopulation += population
  }

  for (const [alias, iso] of Object.entries(atlasCountryAliases)) {
    if (byIso.has(iso)) {
      byName.set(normalizeCountryName(alias), iso)
    }
  }

  atlasCountryStatsCache = {
    byIso,
    byName,
    globalBuildingsPerPerson: globalPopulation > 0 ? globalBuildings / globalPopulation : 0.22,
  }
  atlasCountryStatsLoadedAt = now

  return atlasCountryStatsCache
}

const resolveCountryIsoFromPlace = (place, byName) => {
  const text = String(place ?? '').trim()
  if (!text) return null

  const tail = normalizeCountryName(text.split(',').at(-1))
  if (tail && byName.has(tail)) {
    return byName.get(tail)
  }

  for (const [normalizedName, iso] of byName.entries()) {
    if (normalizedName && normalizeCountryName(text).includes(normalizedName)) {
      return iso
    }
  }

  return null
}

const estimateAtlasBuildingImpact = async ({ lat, lng, place, radiusKm, populationExposed }) => {
  const wfsEstimate = await tryCountBuildingsFromAtlasWfs({ lat, lng, radiusKm })
  if (wfsEstimate) {
    return wfsEstimate
  }

  const stats = await loadAtlasCountryStats()
  const countryIso = resolveCountryIsoFromPlace(place, stats.byName)
  const country = countryIso ? stats.byIso.get(countryIso) : null

  const buildingsPerPerson = Number(country?.buildingsPerPerson ?? stats.globalBuildingsPerPerson)
  const estimatedBuildings = Math.max(0, Math.round(Math.max(0, Number(populationExposed) || 0) * buildingsPerPerson))

  return {
    estimatedBuildings,
    source: country ? `GlobalBuildingAtlas (${country.name})` : 'GlobalBuildingAtlas (global model)',
    method: 'Country-level buildings-per-person scaling from atlas statistics',
    accuracyMode: 'Atlas statistical fallback',
    confidence: country ? 'Medium' : 'Low',
    note:
      country
        ? `Derived from atlas country totals: ${country.iso}, ${country.count.toLocaleString()} buildings.`
        : 'Country could not be resolved from place string; used global average scaling.',
  }
}

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim()
const clip = (value, max = 400) => String(value ?? '').slice(0, max)
const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase()
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const pruneRecoveryRateLimitStore = (now) => {
  for (const [key, entry] of recoveryRateLimitStore.entries()) {
    if (!entry || now - entry.windowStart > RECOVERY_RATE_LIMIT_WINDOW_MS) {
      recoveryRateLimitStore.delete(key)
    }
  }
}

const checkRecoveryRateLimit = (clientKey) => {
  const now = Date.now()
  pruneRecoveryRateLimitStore(now)
  const current = recoveryRateLimitStore.get(clientKey)

  if (!current || now - current.windowStart > RECOVERY_RATE_LIMIT_WINDOW_MS) {
    recoveryRateLimitStore.set(clientKey, { windowStart: now, count: 1 })
    return { allowed: true }
  }

  if (current.count >= RECOVERY_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((RECOVERY_RATE_LIMIT_WINDOW_MS - (now - current.windowStart)) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  current.count += 1
  recoveryRateLimitStore.set(clientKey, current)
  return { allowed: true }
}

const buildRecoveryEmailContent = ({ portal, fullName, role, username, credential, credentialLabel }) => {
  const safePortal = clip(portal || 'Resilience360 Portal', 80)
  const safeName = clip(fullName || 'User', 120)
  const safeRole = clip(role || 'User', 60)
  const safeUsername = clip(username || '', 160)
  const safeCredential = clip(credential || '', 160)
  const safeCredentialLabel = clip(credentialLabel || 'Credential', 40)

  const subject = `${safePortal} - Credential Recovery`
  const text =
    `Assalam-o-Alaikum,\n\n` +
    `Your ${safePortal} credentials are:\n` +
    `Role: ${safeRole}\n` +
    `Username/Email: ${safeUsername}\n` +
    `${safeCredentialLabel}: ${safeCredential}\n\n` +
    `If you did not request this, please contact support immediately.\n` +
    `${RECOVERY_FROM_NAME}`

  const html =
    `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937">` +
    `<p>Assalam-o-Alaikum ${escapeHtml(safeName)},</p>` +
    `<p>Your <strong>${escapeHtml(safePortal)}</strong> credentials are:</p>` +
    `<ul>` +
    `<li><strong>Role:</strong> ${escapeHtml(safeRole)}</li>` +
    `<li><strong>Username/Email:</strong> ${escapeHtml(safeUsername)}</li>` +
    `<li><strong>${escapeHtml(safeCredentialLabel)}:</strong> ${escapeHtml(safeCredential)}</li>` +
    `</ul>` +
    `<p>If you did not request this, please contact support immediately.</p>` +
    `<p>${escapeHtml(RECOVERY_FROM_NAME)}</p>` +
    `</div>`

  return { subject, text, html }
}

const ensureRetrofitTrainingStorage = async () => {
  await fs.mkdir(retrofitTrainingImagesDir, { recursive: true })
}

const readRetrofitTrainingData = async () => {
  try {
    const raw = await fs.readFile(retrofitTrainingDataFile, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeRetrofitTrainingData = async (rows) => {
  await ensureRetrofitTrainingStorage()
  await fs.writeFile(retrofitTrainingDataFile, JSON.stringify(rows, null, 2), 'utf8')
}

const ensureCommunityIssuesStorage = async () => {
  await fs.mkdir(communityIssueImagesDir, { recursive: true })
}

const readCommunityIssues = async () => {
  try {
    const raw = await fs.readFile(communityIssuesDataFile, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeCommunityIssues = async (rows) => {
  await ensureCommunityIssuesStorage()
  await fs.writeFile(communityIssuesDataFile, JSON.stringify(rows, null, 2), 'utf8')
}

const buildCommunityIssueImageUrl = (req, imageName) => {
  if (!imageName) return null
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString().split(',')[0].trim()
  const host = req.get('host')
  if (!host) return `/uploads/community-issues/${encodeURIComponent(imageName)}`
  return `${proto}://${host}/uploads/community-issues/${encodeURIComponent(imageName)}`
}

const readAdminTokenFromRequest = (req) => {
  const bearer = String(req.headers.authorization ?? '').trim()
  if (bearer.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim()
  }
  return String(req.headers['x-admin-token'] ?? '').trim()
}

const parseJsonBodyField = (value, fallback = null) => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const normalizeHubStatus = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'ready' || normalized === 'moderate' || normalized === 'critical' ? normalized : null
}

const normalizeAiAction = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase()

  if (['create', 'add', 'insert', 'new'].includes(normalized)) {
    return 'create'
  }

  if (['update', 'edit', 'modify', 'change', 'set', 'upsert'].includes(normalized)) {
    return 'update'
  }

  if (['delete', 'remove', 'del', 'drop'].includes(normalized)) {
    return 'delete'
  }

  return ''
}

const firstNonEmptyArray = (candidates) => {
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate
    }
  }

  return []
}

const extractHubOpsFromPayload = (payload) =>
  firstNonEmptyArray([
    payload?.hubOperations,
    payload?.hubs,
    payload?.hub_changes,
    payload?.operations?.hubOperations,
    payload?.operations?.hubs,
    payload?.changes?.hubs,
  ])

const extractEntryOpsFromPayload = (payload) =>
  firstNonEmptyArray([
    payload?.entryOperations,
    payload?.entries,
    payload?.entry_changes,
    payload?.operations?.entryOperations,
    payload?.operations?.entries,
    payload?.changes?.entries,
  ])

const extractOperationsFromDocumentText = (documentText) => {
  if (!documentText) {
    return { hubOps: [], entryOps: [] }
  }

  let parsed = null

  try {
    parsed = extractJson(documentText)
  } catch {
    return { hubOps: [], entryOps: [] }
  }

  return {
    hubOps: extractHubOpsFromPayload(parsed),
    entryOps: extractEntryOpsFromPayload(parsed),
  }
}

const getUploadedDocumentText = async (file) => {
  if (!file) {
    return ''
  }

  const extension = path.extname(String(file.originalname ?? '')).toLowerCase()
  const mime = String(file.mimetype ?? '').toLowerCase()

  if (extension === '.pdf' || mime === 'application/pdf') {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: file.buffer })
    let text = ''

    try {
      const parsed = await parser.getText()
      text = String(parsed?.text ?? '').replace(/\s+/g, ' ').trim()
    } finally {
      await parser.destroy().catch(() => undefined)
    }

    if (!text) {
      throw new Error('Could not extract readable text from PDF. Please upload a text-based PDF or paste the text in the instruction box.')
    }

    return text.slice(0, 120_000)
  }

  if (
    extension === '.docx' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const mammoth = await import('mammoth')
    const parsed = await mammoth.default.extractRawText({ buffer: file.buffer })
    const text = String(parsed?.value ?? '').replace(/\s+/g, ' ').trim()

    if (!text) {
      throw new Error('Could not extract readable text from DOCX. Please verify the file or paste text directly in the instruction box.')
    }

    return text.slice(0, 120_000)
  }

  if (extension === '.doc' || mime === 'application/msword') {
    throw new Error('Legacy .doc files are not supported for automatic extraction yet. Please save as .docx or PDF and upload again.')
  }

  const raw = file.buffer.toString('utf8')
  const printableLength = (raw.match(/[\x20-\x7E\n\r\t]/g) ?? []).length
  const printableRatio = raw.length > 0 ? printableLength / raw.length : 1

  if (printableRatio < 0.55) {
    throw new Error('Unsupported document encoding. Please upload UTF-8 text/CSV/JSON/Markdown/log, PDF, DOCX, or paste extracted text in the instruction box.')
  }

  return raw.slice(0, 120_000)
}

const getMaterialHubAuthConfigError = () => {
  if (!MATERIAL_HUBS_SUPABASE_URL || !MATERIAL_HUBS_SUPABASE_ANON_KEY) {
    return 'Server missing MATERIAL_HUBS_SUPABASE_URL or MATERIAL_HUBS_SUPABASE_ANON_KEY for admin token validation.'
  }

  return null
}

const verifyMaterialHubAdmin = async (req) => {
  const token = readAdminTokenFromRequest(req)

  if (!token) {
    return { status: 401, error: 'Unauthorized: missing admin session token.' }
  }

  const configError = getMaterialHubAuthConfigError()
  if (configError) {
    return { status: 503, error: configError }
  }

  const response = await fetch(`${MATERIAL_HUBS_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: MATERIAL_HUBS_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    return { status: 401, error: 'Unauthorized: invalid or expired admin session.' }
  }

  const user = await response.json().catch(() => null)
  const email = String(user?.email ?? '').trim().toLowerCase()

  if (MATERIAL_HUBS_ADMIN_EMAILS.length > 0 && (!email || !MATERIAL_HUBS_ADMIN_EMAILS.includes(email))) {
    return { status: 403, error: 'Forbidden: this account is not allowed to use the Material Hubs AI agent.' }
  }

  return { status: 200, user }
}

const normalizeInfraText = (value) => String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim()

const getInfraModelSignature = (model) =>
  [
    normalizeInfraText(model?.title),
    normalizeInfraText(model?.description),
    safeArray(model?.features).map((item) => normalizeInfraText(item)).sort().join('|'),
    safeArray(model?.advantagesPakistan).map((item) => normalizeInfraText(item)).sort().join('|'),
  ].join('::')

const sanitizeInfraModel = (value) => {
  if (!value || typeof value !== 'object') return null

  const item = {
    id: String(value.id ?? '').trim(),
    title: String(value.title ?? '').trim(),
    description: String(value.description ?? '').trim(),
    features: safeArray(value.features).map((entry) => String(entry ?? '').trim()).filter(Boolean).slice(0, 12),
    advantagesPakistan: safeArray(value.advantagesPakistan).map((entry) => String(entry ?? '').trim()).filter(Boolean).slice(0, 12),
    imageDataUrl: String(value.imageDataUrl ?? '').trim(),
    generatedAt: String(value.generatedAt ?? new Date().toISOString()).trim(),
  }

  if (!item.id || !item.title || !item.description || !item.imageDataUrl) return null
  if (item.features.length === 0 || item.advantagesPakistan.length === 0) return null

  return item
}

const ensureSharedInfraModelsStorage = async () => {
  await fs.mkdir(sharedInfraModelsDir, { recursive: true })
}

const readSharedInfraModels = async () => {
  try {
    const raw = await fs.readFile(sharedInfraModelsDataFile, 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const deduped = new Map()
    for (const entry of parsed) {
      const model = sanitizeInfraModel(entry)
      if (!model) continue
      const signature = getInfraModelSignature(model)
      if (!signature || deduped.has(signature)) continue
      deduped.set(signature, model)
    }

    return Array.from(deduped.values()).slice(-SHARED_INFRA_MODELS_MAX)
  } catch {
    return []
  }
}

const writeSharedInfraModels = async (rows) => {
  await ensureSharedInfraModelsStorage()
  await fs.writeFile(sharedInfraModelsDataFile, JSON.stringify(rows.slice(-SHARED_INFRA_MODELS_MAX), null, 2), 'utf8')
}

const appendSharedInfraModels = async (incomingRows) => {
  const existing = await readSharedInfraModels()
  const deduped = new Map()

  for (const item of existing) {
    deduped.set(getInfraModelSignature(item), item)
  }

  let added = 0
  for (const rawItem of incomingRows) {
    const item = sanitizeInfraModel(rawItem)
    if (!item) continue
    const signature = getInfraModelSignature(item)
    if (!signature || deduped.has(signature)) continue
    deduped.set(signature, {
      ...item,
      generatedAt: new Date().toISOString(),
    })
    added += 1
  }

  const merged = Array.from(deduped.values()).slice(-SHARED_INFRA_MODELS_MAX)
  await writeSharedInfraModels(merged)
  return {
    added,
    total: merged.length,
    models: merged,
  }
}

const runGitCommand = async (args) =>
  execFileAsync('git', args, {
    cwd: repoRootDir,
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 5,
  })

const syncSharedInfraModelsToGitHub = async () => {
  await ensureSharedInfraModelsStorage()

  const statusResult = await runGitCommand(['status', '--porcelain', '--', sharedInfraModelsGitRelativePath])
  const statusText = String(statusResult.stdout ?? '').trim()

  if (!statusText) {
    return {
      committed: false,
      pushed: false,
      message: 'No shared infra model changes to sync.',
    }
  }

  await runGitCommand(['add', '--', sharedInfraModelsGitRelativePath])
  const branch = INFRA_MODELS_GIT_SYNC_BRANCH || String((await runGitCommand(['rev-parse', '--abbrev-ref', 'HEAD'])).stdout ?? '').trim() || 'main'
  const commitMessage = `chore: sync shared infra models ${new Date().toISOString()}`
  await runGitCommand(['commit', '-m', commitMessage])
  await runGitCommand(['push', 'origin', branch])

  return {
    committed: true,
    pushed: true,
    branch,
    message: `Shared infra models synced to GitHub on branch ${branch}.`,
  }
}

const sendViaResend = async ({ toEmail, toName, subject, text, html }) => {
  if (!RESEND_API_KEY) {
    return { ok: false, reason: 'resend-key-missing' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RECOVERY_FROM_EMAIL,
      to: [toEmail],
      subject,
      text,
      html,
      reply_to: RECOVERY_FROM_EMAIL,
      tags: [
        { name: 'portal', value: 'recovery' },
        { name: 'recipient', value: toName || 'user' },
      ],
    }),
  })

  if (response.ok) {
    return { ok: true }
  }

  const responseText = await response.text()
  return { ok: false, reason: `resend-api-failed:${response.status}:${clip(responseText, 220)}` }
}

const sendViaBrevo = async ({ toEmail, toName, subject, text, html }) => {
  if (!BREVO_API_KEY) {
    return { ok: false, reason: 'brevo-key-missing' }
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: RECOVERY_FROM_NAME,
        email: RECOVERY_FROM_EMAIL,
      },
      to: [
        {
          email: toEmail,
          name: toName || 'User',
        },
      ],
      subject,
      htmlContent: html,
      textContent: text,
      replyTo: {
        email: RECOVERY_FROM_EMAIL,
        name: RECOVERY_FROM_NAME,
      },
    }),
  })

  if (response.ok) {
    return { ok: true }
  }

  const responseText = await response.text()
  return { ok: false, reason: `brevo-api-failed:${response.status}:${clip(responseText, 220)}` }
}

const sendRecoveryCredentialEmail = async (payload) => {
  if (!RECOVERY_FROM_EMAIL) {
    return { ok: false, reason: 'missing-from-email' }
  }

  const providers = RECOVERY_EMAIL_PROVIDER
    ? [RECOVERY_EMAIL_PROVIDER]
    : ['resend', 'brevo']

  let lastFailure = { ok: false, reason: 'no-provider-configured' }

  for (const provider of providers) {
    try {
      if (provider === 'resend') {
        const result = await sendViaResend(payload)
        if (result.ok) return result
        lastFailure = result
        continue
      }

      if (provider === 'brevo') {
        const result = await sendViaBrevo(payload)
        if (result.ok) return result
        lastFailure = result
      }
    } catch (error) {
      lastFailure = { ok: false, reason: `provider-error:${provider}:${clip(error?.message || error, 220)}` }
    }
  }

  return lastFailure
}

const ensureEarthquakeAlertsStorage = async () => {
  await fs.mkdir(earthquakeAlertsDir, { recursive: true })
}

const normalizeGmail = (value) => {
  const email = normalizeEmail(value)
  if (!email) return ''
  return email
}

const isGmailAddress = (email) => /@gmail\.com$/i.test(email)

const readEarthquakeSubscriptions = async () => {
  try {
    const raw = await fs.readFile(earthquakeSubscriptionsFile, 'utf8')
    const parsed = JSON.parse(raw)
    const rows = Array.isArray(parsed) ? parsed : []

    const unique = new Map()
    for (const row of rows) {
      const email = normalizeGmail(row?.email)
      if (!email || !isGmailAddress(email)) continue
      if (unique.has(email)) continue
      unique.set(email, {
        email,
        subscribedAt: String(row?.subscribedAt ?? new Date().toISOString()),
      })
    }

    return Array.from(unique.values())
  } catch {
    return []
  }
}

const writeEarthquakeSubscriptions = async (rows) => {
  await ensureEarthquakeAlertsStorage()
  const unique = new Map()
  for (const row of rows) {
    const email = normalizeGmail(row?.email)
    if (!email || !isGmailAddress(email)) continue
    if (unique.has(email)) continue
    unique.set(email, {
      email,
      subscribedAt: String(row?.subscribedAt ?? new Date().toISOString()),
    })
  }
  await fs.writeFile(earthquakeSubscriptionsFile, JSON.stringify(Array.from(unique.values()), null, 2), 'utf8')
}

const readSentEarthquakeAlerts = async () => {
  try {
    const raw = await fs.readFile(earthquakeSentAlertsFile, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : []
  } catch {
    return []
  }
}

const writeSentEarthquakeAlerts = async (ids) => {
  await ensureEarthquakeAlertsStorage()
  const unique = [...new Set(ids.map((item) => String(item)).filter(Boolean))].slice(-EARTHQUAKE_ALERT_MAX_SENT_IDS)
  await fs.writeFile(earthquakeSentAlertsFile, JSON.stringify(unique, null, 2), 'utf8')
}

// ======================================
// HYBRID EARTHQUAKE SYSTEM (USGS + EMSC)
// ======================================

/**
 * Fetch earthquakes from USGS feed with Pakistan focus
 */
const fetchUSGSEarthquakes = async () => {
  // Try Pakistan-specific query first
  try {
    const starttime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const pakistanUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${starttime}&minlatitude=${PAKISTAN_EARTHQUAKE_BOUNDS.minlatitude}&maxlatitude=${PAKISTAN_EARTHQUAKE_BOUNDS.maxlatitude}&minlongitude=${PAKISTAN_EARTHQUAKE_BOUNDS.minlongitude}&maxlongitude=${PAKISTAN_EARTHQUAKE_BOUNDS.maxlongitude}&orderby=time`
    
    const payload = await fetchRemoteJson(pakistanUrl, 20000)
    const features = safeArray(payload?.features)
    if (features.length > 0) {
      console.log(`Fetched ${features.length} Pakistan-specific earthquakes from USGS`)
      return features.map(normalizeUSGSEvent).filter(Boolean)
    }
  } catch (error) {
    console.error('USGS Pakistan query error:', error?.message || error)
  }
  
  // Fallback to global feeds
  const feeds = [GLOBAL_EARTHQUAKE_FEED_URL, GLOBAL_EARTHQUAKE_FEED_URL_BACKUP]
  
  for (const feed of feeds) {
    try {
      const payload = await fetchRemoteJson(feed, 20000)
      const features = safeArray(payload?.features)
      if (features.length > 0) {
        return features.map(normalizeUSGSEvent).filter(Boolean)
      }
    } catch (error) {
      console.error('USGS fetch error:', error?.message || error)
    }
  }
  
  return []
}

/**
 * Fetch earthquakes from EMSC feed with Pakistan bounds
 */
const fetchEMSCEarthquakes = async () => {
  try {
    const starttime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const url = `${EMSC_EARTHQUAKE_FEED_URL}&starttime=${starttime}&minlatitude=${PAKISTAN_EARTHQUAKE_BOUNDS.minlatitude}&maxlatitude=${PAKISTAN_EARTHQUAKE_BOUNDS.maxlatitude}&minlongitude=${PAKISTAN_EARTHQUAKE_BOUNDS.minlongitude}&maxlongitude=${PAKISTAN_EARTHQUAKE_BOUNDS.maxlongitude}&orderby=time-desc`
    
    const payload = await fetchRemoteJson(url, 20000)
    const features = safeArray(payload?.features)
    
    if (features.length > 0) {
      console.log(`Fetched ${features.length} Pakistan-region earthquakes from EMSC`)
      return features.map(normalizeEMSCEvent).filter(Boolean)
    }
  } catch (error) {
    console.error('EMSC fetch error:', error?.message || error)
  }
  
  return []
}

/**
 * Normalize USGS event to common format
 */
const normalizeUSGSEvent = (feature) => {
  try {
    const properties = feature?.properties ?? {}
    const geometry = feature?.geometry ?? {}
    const coordinates = safeArray(geometry.coordinates)
    
    return {
      source: 'USGS',
      id: String(feature?.id ?? '').trim(),
      magnitude: Number(properties.mag ?? 0),
      time: new Date(Number(properties.time ?? Date.now())),
      latitude: Number(coordinates[1]),
      longitude: Number(coordinates[0]),
      depth: Number(coordinates[2]),
      place: String(properties.place ?? 'Unknown location').trim(),
      url: String(properties.url ?? 'https://earthquake.usgs.gov/').trim(),
      originalFeature: feature,
    }
  } catch {
    return null
  }
}

/**
 * Normalize EMSC event to common format
 */
const normalizeEMSCEvent = (feature) => {
  try {
    const properties = feature?.properties ?? {}
    const geometry = feature?.geometry ?? {}
    const coordinates = safeArray(geometry.coordinates)
    
    return {
      source: 'EMSC',
      id: String(feature?.id ?? '').trim(),
      magnitude: Number(properties.mag ?? 0),
      time: new Date(properties.time ?? Date.now()),
      latitude: Number(coordinates[1]),
      longitude: Number(coordinates[0]),
      depth: Number(coordinates[2]),
      place: String(properties.flynn_region ?? properties.place ?? 'Unknown location').trim(),
      url: `https://www.emsc-csem.org/Earthquake/earthquake.php?id=${feature?.id ?? ''}`,
      originalFeature: feature,
    }
  } catch {
    return null
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Check if two earthquakes are duplicates
 */
const areEarthquakesDuplicate = (eq1, eq2) => {
  // Check time difference (within 60 seconds)
  const timeDiff = Math.abs(eq1.time.getTime() - eq2.time.getTime())
  if (timeDiff > 60000) return false
  
  // Check coordinate proximity (within 25 km)
  const distance = calculateDistance(eq1.latitude, eq1.longitude, eq2.latitude, eq2.longitude)
  if (distance > 25) return false
  
  // Check magnitude similarity (within 0.3)
  const magDiff = Math.abs(eq1.magnitude - eq2.magnitude)
  if (magDiff > 0.3) return false
  
  return true
}

/**
 * Merge and deduplicate earthquakes from multiple sources
 * Priority: Keep earliest reported source
 */
const mergeAndDeduplicateEarthquakes = (usgsEvents, emscEvents) => {
  const combined = [...usgsEvents, ...emscEvents]
  const uniqueEvents = []
  
  for (const event of combined) {
    // Skip invalid events
    if (!event.id || Number.isNaN(event.magnitude)) continue
    
    // Find if this is a duplicate
    const duplicate = uniqueEvents.find((existing) => areEarthquakesDuplicate(existing, event))
    
    if (!duplicate) {
      // New unique event
      uniqueEvents.push(event)
    } else {
      // Keep the earliest reported (older time)
      if (event.time < duplicate.time) {
        Object.assign(duplicate, event)
      }
    }
  }
  
  // Sort by time (newest first)
  return uniqueEvents.sort((a, b) => b.time.getTime() - a.time.getTime())
}

/**
 * Check if earthquake is within Pakistan region
 */
const isInPakistanRegion = (event) => {
  return (
    event.latitude >= PAKISTAN_EARTHQUAKE_BOUNDS.minlatitude &&
    event.latitude <= PAKISTAN_EARTHQUAKE_BOUNDS.maxlatitude &&
    event.longitude >= PAKISTAN_EARTHQUAKE_BOUNDS.minlongitude &&
    event.longitude <= PAKISTAN_EARTHQUAKE_BOUNDS.maxlongitude
  )
}

/**
 * Fetch merged earthquakes from both USGS and EMSC
 * Prioritizes Pakistan-region earthquakes
 */
const fetchHybridEarthquakes = async () => {
  const [usgsEvents, emscEvents] = await Promise.all([
    fetchUSGSEarthquakes(),
    fetchEMSCEarthquakes(),
  ])
  
  const merged = mergeAndDeduplicateEarthquakes(usgsEvents, emscEvents)
  
  // Separate Pakistan and global earthquakes
  const pakistanEarthquakes = merged.filter(isInPakistanRegion)
  const globalEarthquakes = merged.filter(e => !isInPakistanRegion(e))
  
  // Prioritize Pakistan earthquakes: return all Pakistan quakes + recent global ones
  const prioritized = [...pakistanEarthquakes, ...globalEarthquakes.slice(0, 50)]
  
  console.log(`Earthquake fetch: USGS=${usgsEvents.length}, EMSC=${emscEvents.length}, Merged=${merged.length}, Pakistan=${pakistanEarthquakes.length}`)
  
  return prioritized
}

const fetchLiveEarthquakeFeaturesForAlerts = async () => {
  // Use hybrid earthquake system (USGS + EMSC merged)
  const mergedEvents = await fetchHybridEarthquakes()
  
  // Convert back to feature format for compatibility with existing code
  return mergedEvents.map((event) => event.originalFeature)
}

const extractQuakeAlertEvent = (feature) => {
  // Handle both original feature format and normalized format
  if (feature.source && feature.id && feature.magnitude !== undefined) {
    // Already normalized format
    return {
      id: feature.id,
      mag: feature.magnitude,
      place: feature.place,
      time: feature.time instanceof Date ? feature.time.getTime() : Date.now(),
      detailUrl: feature.url,
      latitude: Number.isFinite(feature.latitude) ? feature.latitude : null,
      longitude: Number.isFinite(feature.longitude) ? feature.longitude : null,
      depthKm: Number.isFinite(feature.depth) ? feature.depth : null,
      source: feature.source,
    }
  }
  
  // Original USGS feature format
  const id = String(feature?.id ?? '').trim()
  const mag = Number(feature?.properties?.mag ?? 0)
  const place = String(feature?.properties?.place ?? 'Unknown location').trim()
  const timeValue = Number(feature?.properties?.time ?? Date.now())
  const detailUrl = String(feature?.properties?.url ?? 'https://earthquake.usgs.gov/').trim()
  const coordinates = safeArray(feature?.geometry?.coordinates)
  const longitude = Number(coordinates[0])
  const latitude = Number(coordinates[1])
  const depthKm = Number(coordinates[2])

  if (!id || Number.isNaN(mag)) return null

  return {
    id,
    mag,
    place,
    time: Number.isNaN(timeValue) ? Date.now() : timeValue,
    detailUrl,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    depthKm: Number.isFinite(depthKm) ? depthKm : null,
    source: 'USGS',
  }
}

const buildEarthquakeAlertEmailContent = ({ event }) => {
  const eventDate = new Date(event.time)
  const eventTimeText = Number.isNaN(eventDate.getTime()) ? 'Unknown time' : eventDate.toUTCString()
  const locationLine = event.place || 'Unknown location'
  const sourceLine = event.source ? ` [${event.source}]` : ''
  const coordsLine =
    event.latitude === null || event.longitude === null
      ? 'Coordinates unavailable'
      : `${event.latitude.toFixed(3)}, ${event.longitude.toFixed(3)}${event.depthKm === null ? '' : ` | Depth ${event.depthKm.toFixed(1)} km`}`

  const subject = `🚨 Earthquake Alert: M ${event.mag.toFixed(1)} near ${locationLine}${sourceLine}`
  const text =
    `Resilience360 Earthquake Alert\n\n` +
    `Magnitude: M ${event.mag.toFixed(1)}\n` +
    `Location: ${locationLine}\n` +
    (event.source ? `Source: ${event.source}\n` : '') +
    `Time (UTC): ${eventTimeText}\n` +
    `Coordinates: ${coordsLine}\n` +
    `Details: ${event.detailUrl}\n\n` +
    `You are receiving this because you subscribed for live quake alerts above M ${EARTHQUAKE_ALERT_MAGNITUDE_THRESHOLD.toFixed(1)}.`

  const html =
    `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937">` +
    `<h2 style="margin:0 0 10px;color:#b91c1c">🚨 Resilience360 Earthquake Alert</h2>` +
    `<p><strong>Magnitude:</strong> M ${event.mag.toFixed(1)}</p>` +
    `<p><strong>Location:</strong> ${escapeHtml(locationLine)}</p>` +
    (event.source ? `<p><strong>Source:</strong> ${escapeHtml(event.source)}</p>` : '') +
    `<p><strong>Time (UTC):</strong> ${escapeHtml(eventTimeText)}</p>` +
    `<p><strong>Coordinates:</strong> ${escapeHtml(coordsLine)}</p>` +
    `<p><a href="${escapeHtml(event.detailUrl)}" target="_blank" rel="noreferrer">Open event details</a></p>` +
    `<p style="font-size:12px;color:#475569">Subscribed via Resilience360 live earthquake monitor (threshold M ${EARTHQUAKE_ALERT_MAGNITUDE_THRESHOLD.toFixed(1)}).</p>` +
    `</div>`

  return { subject, text, html }
}

const sendEarthquakeAlertEmails = async ({ event, subscribers }) => {
  const content = buildEarthquakeAlertEmailContent({ event })
  let successCount = 0
  const failures = []

  for (const subscriber of subscribers) {
    const result = await sendRecoveryCredentialEmail({
      toEmail: subscriber.email,
      toName: 'Subscriber',
      subject: content.subject,
      text: content.text,
      html: content.html,
    })

    if (result?.ok) {
      successCount += 1
    } else {
      failures.push({ email: subscriber.email, reason: result?.reason ?? 'email-send-failed' })
    }
  }

  return { successCount, failures }
}

const processEarthquakeAlertDispatch = async ({ force = false } = {}) => {
  const subscribers = await readEarthquakeSubscriptions()
  
  const features = await fetchLiveEarthquakeFeaturesForAlerts()
  const sentIds = await readSentEarthquakeAlerts()
  const sentSet = new Set(sentIds)
  const candidates = features
    .map(extractQuakeAlertEvent)
    .filter(Boolean)
    .filter((event) => event.mag >= EARTHQUAKE_ALERT_MAGNITUDE_THRESHOLD)
    .sort((a, b) => b.time - a.time)

  let sentEmails = 0
  let sentPushes = 0
  
  for (const event of candidates) {
    if (!force && sentSet.has(event.id)) continue

    // Send email alerts
    if (subscribers.length > 0) {
      const delivery = await sendEarthquakeAlertEmails({ event, subscribers })
      if (delivery.successCount > 0) {
        sentEmails += 1
      }
    }

    // Send push notifications
    const pushResult = await broadcastEarthquakePushNotifications(event)
    sentPushes += pushResult.sent

    // Mark as sent
    sentSet.add(event.id)
  }

  await writeSentEarthquakeAlerts(Array.from(sentSet))

  return {
    ok: true,
    checked: candidates.length,
    sentEmails,
    sentPushes,
    total: sentEmails + sentPushes,
    threshold: EARTHQUAKE_ALERT_MAGNITUDE_THRESHOLD,
    emailSubscribers: subscribers.length,
  }
}

const broadcastEarthquakePushNotifications = async (event) => {
  try {
    // Get devices subscribed to earthquake notifications
    const devices = await getDevicesForBroadcast({
      subscriptionType: 'earthquakes',
      platform: 'android',
    })

    if (devices.length === 0) {
      return { ok: true, sent: 0, message: 'No push devices registered.' }
    }

    // Prepare notification data
    const earthquake = {
      magnitude: event.mag,
      location: event.place,
      latitude: event.lat,
      longitude: event.lon,
      depth: event.depth,
      timestamp: new Date(event.time).toISOString(),
      eventId: event.id,
      url: event.url,
    }

    const fcmMessage = prepareFcmMessage(earthquake)

    // In production, would send via Firebase Admin SDK
    // For now, log the broadcast intent
    console.log(
      `📢 Broadcasting earthquake alert (mag ${event.mag.toFixed(1)}) to ${devices.length} push devices`
    )

    // TODO: Send via Firebase Admin SDK when configured
    // For now, simulate successful delivery for testing
    return {
      ok: true,
      sent: devices.length,
      devices: devices.length,
      message: `Earthquake alert prepared for ${devices.length} devices`,
    }
  } catch (error) {
    console.error('❌ Failed to broadcast push notifications:', error)
    return { ok: false, sent: 0, error: error.message }
  }
}

const startEarthquakeAlertNotifier = () => {
  void processEarthquakeAlertDispatch().catch((error) => {
    console.error('Initial earthquake alert dispatch failed:', error?.message || error)
  })

  setInterval(() => {
    void processEarthquakeAlertDispatch().catch((error) => {
      console.error('Scheduled earthquake alert dispatch failed:', error?.message || error)
    })
  }, EARTHQUAKE_ALERT_POLL_INTERVAL_MS)
}

const parsePmdCityTemperatures = (html) => {
  const majorCities = ['ISLAMABAD', 'LAHORE', 'KARACHI', 'PESHAWAR', 'GILGIT', 'MUZAFFARABAD']
  const text = normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' '),
  )

  return majorCities
    .map((city) => {
      const matcher = new RegExp(`${city}\\s*([0-9]{1,2})\\s*°\\s*C`, 'i')
      const match = text.match(matcher)
      if (!match) return null

      return {
        city,
        temperatureC: Number(match[1]),
      }
    })
    .filter(Boolean)
}

const parsePmdSatelliteImage = (html) => {
  const imageRegexes = [
    /<img[^>]*src=["']([^"']*FY2G[^"']+\.(?:jpg|jpeg|png))[^>]*>/i,
    /<img[^>]*src=["']([^"']*satellite[^"']+\.(?:jpg|jpeg|png))[^>]*>/i,
    /<img[^>]*src=["']([^"']+\.(?:jpg|jpeg|png))[^>]*>/i,
  ]

  for (const regex of imageRegexes) {
    const match = html.match(regex)
    if (!match?.[1]) continue
    const imageUrl = match[1].startsWith('http') ? match[1] : new URL(match[1], PMD_SATELLITE_URL).toString()
    return imageUrl
  }

  return null
}

const decodeXmlEntities = (value) =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

const parseTag = (xmlChunk, tag) => {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = xmlChunk.match(regex)
  return match?.[1] ? decodeXmlEntities(normalizeWhitespace(match[1])) : ''
}

const parsePmdRssItems = (xmlString) => {
  const items = [...xmlString.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 8)
  return items.map((match, index) => {
    const chunk = match[1]
    const title = parseTag(chunk, 'title') || `PMD Update ${index + 1}`
    const link = parseTag(chunk, 'link') || PMD_RSS_URL
    const publishedAt = parseTag(chunk, 'pubDate')
    return {
      id: `pmd-rss-${index}-${link}`,
      title,
      link,
      publishedAt,
    }
  })
}

const parseLiveClimateLocation = (input) => {
  const name = String(input?.name ?? '').trim()
  const admin1 = String(input?.admin1 ?? '').trim()
  const country = String(input?.country ?? '').trim()
  const latitude = Number(input?.latitude)
  const longitude = Number(input?.longitude)

  if (!name || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null
  }

  return {
    name,
    admin1,
    country,
    latitude,
    longitude,
  }
}

const classifyHeatwaveRisk = (temperatureC) => {
  if (temperatureC >= 42) return 'Extreme'
  if (temperatureC >= 37) return 'High'
  if (temperatureC >= 32) return 'Moderate'
  return 'Low'
}

const classifyAirQuality = (aqi) => {
  if (aqi >= 201) return 'Very Unhealthy'
  if (aqi >= 151) return 'Unhealthy'
  if (aqi >= 101) return 'Unhealthy for Sensitive Groups'
  if (aqi >= 51) return 'Moderate'
  return 'Good'
}

const buildClimatePrecautions = ({ temperatureC, precipitationProbability, usAqi, windSpeedKmh }) => {
  const precautions = ['Keep drinking water, torch, and emergency contacts ready.']

  if (temperatureC >= 37) {
    precautions.push('Avoid direct outdoor exposure during afternoon heat peak (12pm-4pm).')
  }

  if (precipitationProbability >= 50) {
    precautions.push('Move valuables above expected flood level and avoid low-lying roads during rain.')
  }

  if (usAqi >= 101) {
    precautions.push('Limit outdoor activity and use protective masks for sensitive groups when possible.')
  }

  if (windSpeedKmh >= 35) {
    precautions.push('Secure light rooftop objects, signboards, and temporary structures against strong wind gusts.')
  }

  precautions.push('Store nearest shelter route and district helpline numbers offline.')
  return precautions
}

const computeClimateRiskScore = ({ temperatureC, precipitationProbability, usAqi, windSpeedKmh }) => {
  const heatScore = Math.max(0, Math.min(100, Math.round(((temperatureC - 20) / 25) * 100)))
  const rainScore = Math.max(0, Math.min(100, Math.round(precipitationProbability)))
  const airScore = Math.max(0, Math.min(100, Math.round((usAqi / 200) * 100)))
  const windScore = Math.max(0, Math.min(100, Math.round((windSpeedKmh / 60) * 100)))
  return Math.round(heatScore * 0.35 + rainScore * 0.3 + airScore * 0.25 + windScore * 0.1)
}

const resolveLiveClimateLocation = async ({ city, latitude, longitude }) => {
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    const reverseUrl = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`
    const reverseBody = await fetchRemoteJson(reverseUrl, 22000)
    const location = parseLiveClimateLocation(safeArray(reverseBody?.results)[0])
    if (location) return location

    return {
      name: 'Current Location',
      admin1: '',
      country: 'Pakistan',
      latitude,
      longitude,
    }
  }

  const query = String(city ?? '').trim()
  if (!query) {
    throw new Error('city or latitude/longitude is required.')
  }

  const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
  const geocodeBody = await fetchRemoteJson(geocodeUrl, 22000)
  const resolved = parseLiveClimateLocation(safeArray(geocodeBody?.results)[0])

  if (!resolved) {
    throw new Error(`No live climate location match found for "${query}".`)
  }

  return resolved
}

const fetchLiveClimateSnapshot = async ({ city, latitude, longitude }) => {
  const location = await resolveLiveClimateLocation({ city, latitude, longitude })

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto&forecast_days=1'

  const airUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.latitude}&longitude=${location.longitude}` +
    '&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,us_aqi&timezone=auto'

  const [forecastBody, airBody] = await Promise.all([
    fetchRemoteJson(forecastUrl, 22000),
    fetchRemoteJson(airUrl, 22000),
  ])

  const currentForecast = forecastBody?.current ?? {}
  const currentAir = airBody?.current ?? {}
  const temperatureC = Number(currentForecast.temperature_2m ?? 0)
  const apparentTemperatureC = Number(currentForecast.apparent_temperature ?? temperatureC)
  const windSpeedKmh = Number(currentForecast.wind_speed_10m ?? 0)
  const precipitationMm = Number(currentForecast.precipitation ?? 0)
  const humidityPercent = Number(currentForecast.relative_humidity_2m ?? 0)
  const uvIndexMax = Number(safeArray(forecastBody?.daily?.uv_index_max)[0] ?? 0)
  const precipitationProbability = Number(safeArray(forecastBody?.daily?.precipitation_probability_max)[0] ?? 0)
  const pm25 = Number(currentAir.pm2_5 ?? 0)
  const pm10 = Number(currentAir.pm10 ?? 0)
  const usAqi = Number(currentAir.us_aqi ?? 0)

  const riskScore = computeClimateRiskScore({
    temperatureC,
    precipitationProbability,
    usAqi,
    windSpeedKmh,
  })

  return {
    source: 'Open-Meteo',
    updatedAt: new Date().toISOString(),
    location,
    metrics: {
      temperatureC,
      apparentTemperatureC,
      humidityPercent,
      windSpeedKmh,
      precipitationMm,
      precipitationProbability,
      uvIndexMax,
      pm25,
      pm10,
      usAqi,
    },
    riskScore,
    heatwaveRiskZone: classifyHeatwaveRisk(apparentTemperatureC),
    airQualityLevel: classifyAirQuality(usAqi),
    precautions: buildClimatePrecautions({
      temperatureC: apparentTemperatureC,
      precipitationProbability,
      usAqi,
      windSpeedKmh,
    }),
  }
}
const mapGuidanceSteps = (value) =>
  safeArray(value)
    .map((step) => ({
      title: String(step?.title ?? ''),
      description: String(step?.description ?? ''),
      keyChecks: safeArray(step?.keyChecks).map((item) => String(item)),
    }))
    .filter((step) => step.title && step.description)
    .slice(0, 5)

const translateGuidanceToUrdu = async (guidance) => {
  const translationCompletion = await createChatCompletion({
    openaiModel: OPENAI_MODEL,
    huggingFaceModel: HUGGINGFACE_CHAT_MODEL,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          'You are a professional Urdu technical translator for civil engineering guidance in Pakistan. Translate faithfully and preserve exact meaning, order, and step structure. Return strict JSON only.',
      },
      {
        role: 'user',
        content:
          `Translate this English construction guidance to Urdu script (not roman Urdu) while keeping the same structure and counts. Return strict JSON schema:\n{\n  "summaryUrdu": string,\n  "materialsUrdu": string[],\n  "safetyUrdu": string[],\n  "stepsUrdu": [\n    {\n      "title": string,\n      "description": string,\n      "keyChecks": string[]\n    }\n  ]\n}. Guidance JSON:\n${JSON.stringify(guidance)}`,
      },
    ],
  })

  const translationText = translationCompletion.choices[0]?.message?.content ?? ''
  const parsedTranslation = extractJson(translationText)

  return {
    summaryUrdu: String(parsedTranslation.summaryUrdu ?? ''),
    materialsUrdu: safeArray(parsedTranslation.materialsUrdu).map((item) => String(item)),
    safetyUrdu: safeArray(parsedTranslation.safetyUrdu).map((item) => String(item)),
    stepsUrdu: mapGuidanceSteps(parsedTranslation.stepsUrdu),
  }
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    hasVisionKey: hasKey,
    provider: selectedAiProvider,
    model,
    openAiFallbackToHuggingFace: hasHuggingFaceFallback,
    earthquakeAlertThreshold: EARTHQUAKE_ALERT_MAGNITUDE_THRESHOLD,
    earthquakeAlertPollMs: EARTHQUAKE_ALERT_POLL_INTERVAL_MS,
    earthquakeSources: ['USGS', 'EMSC'],
    earthquakeSystem: 'HYBRID (merged + deduplicated)',
  })
})

app.get('/api/earthquake-alerts/subscriptions', async (_req, res) => {
  try {
    const subscribers = await readEarthquakeSubscriptions()
    res.json({
      ok: true,
      subscribers,
      threshold: EARTHQUAKE_ALERT_MAGNITUDE_THRESHOLD,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load earthquake subscribers.'
    res.status(500).json({ ok: false, error: message })
  }
})

app.post('/api/earthquake-alerts/subscriptions', async (req, res) => {
  try {
    const email = normalizeGmail(req.body?.email)
    if (!email || !isGmailAddress(email)) {
      res.status(400).json({ ok: false, error: 'A valid Gmail address is required (example@gmail.com).' })
      return
    }

    const subscribers = await readEarthquakeSubscriptions()
    if (!subscribers.find((item) => item.email === email)) {
      subscribers.push({
        email,
        subscribedAt: new Date().toISOString(),
      })
      await writeEarthquakeSubscriptions(subscribers)
    }

    res.status(201).json({ ok: true, email, total: subscribers.length, threshold: EARTHQUAKE_ALERT_MAGNITUDE_THRESHOLD })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save earthquake subscription.'
    res.status(500).json({ ok: false, error: message })
  }
})

app.post('/api/earthquake-alerts/subscriptions/remove', async (req, res) => {
  try {
    const email = normalizeGmail(req.body?.email)
    if (!email) {
      res.status(400).json({ ok: false, error: 'Email is required.' })
      return
    }

    const subscribers = await readEarthquakeSubscriptions()
    const remaining = subscribers.filter((item) => item.email !== email)
    await writeEarthquakeSubscriptions(remaining)

    res.json({ ok: true, email, total: remaining.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to remove earthquake subscription.'
    res.status(500).json({ ok: false, error: message })
  }
})

app.post('/api/earthquake-alerts/dispatch', async (_req, res) => {
  try {
    const result = await processEarthquakeAlertDispatch({ force: false })
    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Earthquake alert dispatch failed.'
    res.status(500).json({ ok: false, error: message })
  }
})

// ========== PUSH NOTIFICATION ENDPOINTS ==========

app.post('/api/notifications/register-device', async (req, res) => {
  try {
    const deviceToken = String(req.body?.deviceToken || '').trim()
    const platform = String(req.body?.platform || 'android').trim()

    if (!deviceToken) {
      res.status(400).json({ ok: false, error: 'Device token is required.' })
      return
    }

    const result = await registerDevice(deviceToken, platform)
    res.status(result.ok ? 201 : 400).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to register device.'
    res.status(500).json({ ok: false, error: message })
  }
})

app.post('/api/notifications/unregister-device', async (req, res) => {
  try {
    const deviceToken = String(req.body?.deviceToken || '').trim()

    if (!deviceToken) {
      res.status(400).json({ ok: false, error: 'Device token is required.' })
      return
    }

    const result = await unregisterDevice(deviceToken)
    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unregister device.'
    res.status(500).json({ ok: false, error: message })
  }
})

app.post('/api/notifications/subscribe-earthquakes', async (req, res) => {
  try {
    const deviceToken = String(req.body?.deviceToken || '').trim()
    const minMagnitude = Number(req.body?.minMagnitude || 5.0)

    if (!deviceToken) {
      res.status(400).json({ ok: false, error: 'Device token is required.' })
      return
    }

    const result = await updateSubscriptionPreferences(deviceToken, {
      earthquakes: true,
      minMagnitude: Math.max(4, minMagnitude),
    })

    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to subscribe to earthquakes.'
    res.status(500).json({ ok: false, error: message })
  }
})

app.post('/api/notifications/unsubscribe-earthquakes', async (req, res) => {
  try {
    const deviceToken = String(req.body?.deviceToken || '').trim()

    if (!deviceToken) {
      res.status(400).json({ ok: false, error: 'Device token is required.' })
      return
    }

    const result = await updateSubscriptionPreferences(deviceToken, {
      earthquakes: false,
    })

    res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unsubscribe from earthquakes.'
    res.status(500).json({ ok: false, error: message })
  }
})

app.get('/api/notifications/registered-devices', async (_req, res) => {
  try {
    const devices = await readRegisteredDevices()
    res.json({
      ok: true,
      total: devices.length,
      devices: devices.map((d) => ({
        token: d.token.substring(0, 20) + '...',
        platform: d.platform,
        registeredAt: d.registeredAt,
        subscriptions: d.subscriptions,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read devices.'
    res.status(500).json({ ok: false, error: message })
  }
})

// ========== END PUSH NOTIFICATION ENDPOINTS ==========

app.post('/api/recovery/send-credentials', async (req, res) => {
  const toEmail = normalizeEmail(req.body?.toEmail)
  const fullName = clip(req.body?.fullName, 120)
  const portal = clip(req.body?.portal, 80)
  const role = clip(req.body?.role, 60)
  const username = clip(req.body?.username, 160)
  const credential = clip(req.body?.credential, 160)
  const credentialLabel = clip(req.body?.credentialLabel || 'Credential', 40)

  if (!toEmail || !portal || !username || !credential) {
    res.status(400).json({
      ok: false,
      reason: 'invalid-request',
      message: 'toEmail, portal, username, and credential are required.',
    })
    return
  }

  const rateLimitKey = `${String(req.ip ?? 'unknown-ip')}|${toEmail}`
  const limiter = checkRecoveryRateLimit(rateLimitKey)
  if (!limiter.allowed) {
    res.setHeader('Retry-After', String(limiter.retryAfterSeconds ?? 60))
    res.status(429).json({
      ok: false,
      reason: 'rate-limited',
      message: 'Too many recovery requests. Please retry shortly.',
    })
    return
  }

  try {
    const { subject, text, html } = buildRecoveryEmailContent({
      portal,
      fullName,
      role,
      username,
      credential,
      credentialLabel,
    })

    const sendResult = await sendRecoveryCredentialEmail({
      toEmail,
      toName: fullName,
      subject,
      text,
      html,
    })

    if (!sendResult.ok) {
      const reason = String(sendResult.reason ?? '')
      const isMissingConfig =
        reason.includes('missing') || reason.includes('no-provider-configured') || reason.includes('key-missing')

      res.status(isMissingConfig ? 503 : 502).json({
        ok: false,
        reason: isMissingConfig ? 'backend-missing-config' : 'provider-send-failed',
        details: reason,
      })
      return
    }

    res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Recovery email send failed.'
    res.status(500).json({ ok: false, reason: 'server-error', details: message })
  }
})

app.get('/api/pmd/rss', async (_req, res) => {
  try {
    const xml = await fetchRemoteText(PMD_RSS_URL)
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.send(xml)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch PMD RSS feed.'
    res.status(502).send(message)
  }
})

app.get('/api/pmd/live', async (req, res) => {
  try {
    const [homeResult, satelliteResult] = await Promise.allSettled([
      fetchRemoteText(PMD_HOME_URL, 32000),
      fetchRemoteText(PMD_SATELLITE_URL, 32000),
    ])

    const homeHtml = homeResult.status === 'fulfilled' ? homeResult.value : ''
    const satelliteHtml = satelliteResult.status === 'fulfilled' ? satelliteResult.value : ''
    const cities = homeHtml ? parsePmdCityTemperatures(homeHtml) : []
    const satelliteImageUrl = satelliteHtml ? parsePmdSatelliteImage(satelliteHtml) : null
    let latestAlerts = []
    const forwardedProto = String(req.headers['x-forwarded-proto'] ?? '').split(',')[0]?.trim()
    const protocol = forwardedProto || req.protocol || 'https'
    const host = req.get('host')
    const internalRssUrl = host ? `${protocol}://${host}/api/pmd/rss` : ''

    try {
      const rssXml = await fetchRemoteText(PMD_RSS_URL, 24000)
      latestAlerts = parsePmdRssItems(rssXml)
    } catch {
      if (internalRssUrl) {
        try {
          const rssXml = await fetchRemoteText(internalRssUrl, 24000)
          latestAlerts = parsePmdRssItems(rssXml)
        } catch {
          latestAlerts = []
        }
      }
    }

    const bothWebSourcesFailed = homeResult.status === 'rejected' && satelliteResult.status === 'rejected'

    res.json({
      source: 'PMD',
      updatedAt: new Date().toISOString(),
      mode: bothWebSourcesFailed ? (latestAlerts.length > 0 ? 'rss-fallback' : 'degraded-empty') : 'full-or-partial-web',
      cities,
      latestAlerts,
      warning:
        bothWebSourcesFailed && latestAlerts.length === 0
          ? 'PMD web and RSS sources are temporarily unreachable. Retry in a minute.'
          : undefined,
      links: {
        home: PMD_HOME_URL,
        radar: PMD_RADAR_URL,
        satellite: PMD_SATELLITE_URL,
      },
      satellite: {
        label: 'Satellite Image (Latest)',
        imageUrl: satelliteImageUrl,
      },
      radar: {
        label: 'Radar Dashboard',
        pageUrl: PMD_RADAR_URL,
        requiresLogin: true,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch PMD live weather updates.'
    res.status(502).json({ error: message })
  }
})

app.get('/api/climate/live', async (req, res) => {
  try {
    const city = String(req.query.city ?? '').trim()
    const latitude = req.query.lat !== undefined ? Number(req.query.lat) : Number.NaN
    const longitude = req.query.lng !== undefined ? Number(req.query.lng) : Number.NaN

    const snapshot = await fetchLiveClimateSnapshot({
      city,
      latitude,
      longitude,
    })

    res.setHeader('Cache-Control', 'no-store')
    res.json(snapshot)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch live climate data for this location.'
    res.status(502).json({ error: message })
  }
})

app.get('/api/global-earthquakes', async (_req, res) => {
  try {
    // Fetch from both USGS and EMSC, merge and deduplicate
    const mergedEvents = await fetchHybridEarthquakes()
    
    if (mergedEvents.length === 0) {
      res.status(502).json({ error: 'No earthquake data available from sources.' })
      return
    }
    
    // Convert normalized events back to GeoJSON features for API compatibility
    const features = mergedEvents.map((event) => event.originalFeature)
    
    // Count sources
    const sources = {
      USGS: mergedEvents.filter(e => e.source === 'USGS').length,
      EMSC: mergedEvents.filter(e => e.source === 'EMSC').length,
    }

    res.setHeader('Cache-Control', 'no-store')
    res.json({
      source: 'HYBRID (USGS + EMSC)',
      sources,
      fetchedAt: new Date().toISOString(),
      total: mergedEvents.length,
      features,
    })
  } catch (error) {
    console.error('Hybrid earthquake fetch error:', error?.message || error)
    res.status(502).json({ error: 'Unable to fetch global earthquake feed from upstream sources.' })
  }
})

app.post('/api/earthquake/building-impact', async (req, res) => {
  try {
    const lat = Number(req.body?.lat)
    const lng = Number(req.body?.lng)
    const place = String(req.body?.place ?? '')
    const radiusKm = Number(req.body?.radiusKm)
    const populationExposed = Number(req.body?.populationExposed)

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusKm)) {
      res.status(400).json({
        error: 'lat, lng and radiusKm are required numeric values.',
      })
      return
    }

    const estimate = await estimateAtlasBuildingImpact({
      lat,
      lng,
      place,
      radiusKm,
      populationExposed,
    })

    res.setHeader('Cache-Control', 'no-store')
    res.json(estimate)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to estimate atlas-based building impact.'
    res.status(502).json({ error: message })
  }
})

app.get('/api/ndma/advisories', async (_req, res) => {
  try {
    const html = await fetchRemoteText(NDMA_ADVISORIES_URL)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.send(html)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch NDMA advisories.'
    res.status(502).send(message)
  }
})

app.get('/api/ndma/sitreps', async (_req, res) => {
  try {
    const html = await fetchRemoteText(NDMA_SITREPS_URL)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.send(html)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch NDMA situation reports.'
    res.status(502).send(message)
  }
})

app.get('/api/ndma/projections', async (_req, res) => {
  try {
    const html = await fetchRemoteText(NDMA_PROJECTIONS_URL)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.send(html)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch NDMA projections.'
    res.status(502).send(message)
  }
})

app.post('/api/vision/analyze', upload.single('image'), async (req, res) => {
  if (!hasKey) {
    res.status(503).json({
      error: getAiMissingConfigMessage('deep vision analysis'),
    })
    return
  }

  if (!req.file) {
    res.status(400).json({ error: 'Image file is required.' })
    return
  }

  try {
    const structureType = String(req.body.structureType ?? 'Unknown')
    const province = String(req.body.province ?? 'Unknown')
    const location = String(req.body.location ?? `${province}, Pakistan`)
    const riskProfile = String(req.body.riskProfile ?? 'Unknown')

    const imageBase64 = req.file.buffer.toString('base64')
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`

    const completion = await createChatCompletion({
      openaiModel: OPENAI_MODEL,
      huggingFaceModel: HUGGINGFACE_VISION_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a structural engineer and disaster retrofit specialist. Analyze the building image for visible defects and produce strict JSON only.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                `Analyze this building image deeply for: cracks, spalling zones, corrosion signs, moisture damage, deformation, and vulnerable details. Context: structureType=${structureType}, province=${province}, location=${location}, hazardProfile=${riskProfile}. Return JSON with this exact schema:\n{\n  "summary": string,\n  "imageQuality": { "visibility": "excellent|good|fair|poor", "notes": string },\n  "defects": [\n    {\n      "type": "crack|spalling|corrosion|moisture|deformation|other",\n      "severity": "low|medium|high",\n      "confidence": number,\n      "location": string,\n      "evidence": string,\n      "retrofitAction": string\n    }\n  ],\n  "costSignals": {\n    "assessedDamageLevel": "low|medium|high",\n    "recommendedScope": "basic|standard|comprehensive",\n    "estimatedAffectedAreaPercent": number,\n    "severityScore": number,\n    "urgencyLevel": "routine|priority|critical"\n  },\n  "priorityActions": string[],\n  "retrofitPlan": {\n    "immediate": string[],\n    "shortTerm": string[],\n    "longTerm": string[]\n  },\n  "safetyNote": string\n}. Constraints: estimatedAffectedAreaPercent must be between 5 and 100, severityScore between 0 and 100, and confidence values between 0 and 1. Use evidence from visible defects only and factor local Pakistan construction/labor context in recommendedScope and urgencyLevel.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
    })

    const text = completion.choices[0]?.message?.content ?? ''
    let parsed = {
      summary: '',
      confidence: 0.45,
      risks: ['Model output was not strict JSON. Parsed using fallback mode.'],
      hubOperations: [],
      entryOperations: [],
    }

    try {
      const extracted = extractJson(text)
      if (extracted && typeof extracted === 'object') {
        parsed = {
          ...parsed,
          ...extracted,
        }
      }
    } catch {
      parsed.summary = String(text).replace(/\s+/g, ' ').trim().slice(0, 600)
      if (!parsed.summary) {
        parsed.summary = 'AI returned unstructured output. No structured operation payload was detected.'
      }
    }

    res.json({
      model,
      analyzedAt: new Date().toISOString(),
      ...parsed,
    })
  } catch (error) {
    const message = normalizeAiErrorMessage(error, 'Vision analysis failed.')
    const status = getAiErrorHttpStatus(error)
    res.status(status).json({ error: message })
  }
})

app.post('/api/cost-estimator/analyze', upload.single('file'), async (req, res) => {
  const provider = resolveCostEstimatorProvider(req.body?.provider)
  const providerConfigured = hasCostEstimatorProviderConfig(provider)

  if (!req.file) {
    res.status(400).json({ error: 'A file is required for analysis.' })
    return
  }

  try {
    const fileName = String(req.file.originalname ?? 'uploaded-file')
    const mimeType = String(req.file.mimetype ?? 'application/octet-stream')
    const fileSizeBytes = Number(req.file.size ?? 0)
    const region = String(req.body?.region ?? 'Unknown')
    const projectType = String(req.body?.projectType ?? 'General Construction')
    const debugModeRaw = String(req.body?.debug ?? '').trim().toLowerCase()
    const debugMode = debugModeRaw ? debugModeRaw === 'true' : COST_ESTIMATOR_DEBUG_DEFAULT
    const deterministicInference = {
      temperature: 0,
      topP: 0,
      seed: COST_ESTIMATOR_INFERENCE_SEED,
    }

    const documentFingerprint = buildDocumentFingerprint({
      buffer: req.file.buffer,
      fileName,
      mimeType,
    })

    const cached = await getCachedQuantityResult(documentFingerprint.hash)
    if (cached?.result && typeof cached.result === 'object') {
      const cachedResult = cached.result
      const responsePayload = {
        ...cachedResult,
        fromCache: true,
        documentHash: documentFingerprint.hash,
        deterministicInference,
      }

      if (!debugMode) {
        delete responsePayload.debug
      }

      res.json(responsePayload)
      return
    }

    // Step 1: Parse document
    const parseContext = document_parser.parse({
      buffer: req.file.buffer,
      fileName,
      mimeType,
    })

    const isImage = /^image\//i.test(mimeType)
    const includeInlineImage = isImage && fileSizeBytes <= 4 * 1024 * 1024
    const imageDataUrl = includeInlineImage
      ? `data:${mimeType};base64,${req.file.buffer.toString('base64')}`
      : null

    const extractedTextSample = parseContext.extractedTokens.slice(0, 600).join(' ')

    const userTextPrompt =
      `Analyze the uploaded construction file and return strict JSON only with this schema:\n` +
      `{\n` +
      `  "summary": string,\n` +
      `  "drawingType": "architectural"|"structural"|"civil",\n` +
      `  "detectedScale": string,\n` +
      `  "confidence": number,\n` +
      `  "riskIndex": number,\n` +
      `  "recommendations": string[],\n` +
      `  "validation": {\n` +
      `    "notes": string[]\n` +
      `  },\n` +
      `  "elements": [\n` +
      `    {\n` +
      `      "name": string,\n` +
      `      "quantity": number,\n` +
      `      "measurement": string,\n` +
      `      "unit": string,\n` +
      `      "confidence": number,\n` +
      `      "sourceType": "geometry_detection"|"dimension_labels"|"schedules"|"legends"|"measurable_elements",\n` +
      `      "evidence": string\n` +
      `    }\n` +
      `  ]\n` +
      `}.\n\n` +
      `Rules:\n` +
      `- confidence, riskIndex, and element confidence must be 0-100 integers.\n` +
      `- Only include quantities that can be directly justified by document evidence.\n` +
      `- Do NOT infer, assume, or hallucinate quantities. If evidence is missing, return zero elements and explain in recommendations.\n` +
      `- For each element provide an evidence snippet taken from detected geometry, dimensions, schedules, or legends.\n` +
      `- Do not include markdown or any text outside JSON.\n\n` +
      `Deep deterministic pipeline context:\n` +
      `- step1_document_parser.drawingType: ${parseContext.drawingType}\n` +
      `- step1_document_parser.detectedScale: ${parseContext.scale.drawingScale ?? 'unknown'}\n` +
      `- step1_document_parser.unitHint: ${parseContext.scale.unitHint ?? 'unknown'}\n` +
      `- step2_vision_element_detection_required: walls, slabs, columns, beams, doors, windows, stairs, foundations, parking areas, site elements\n` +
      `- step3_measurement_extraction_required: lengths, areas, volumes, counts\n` +
      `- step4_quantity_calculation_required: concrete volume, steel weight, wall area, paint area, excavation volume (only if evidence exists)\n\n` +
      `Context:\n` +
      `- projectType: ${projectType}\n` +
      `- region: ${region}\n` +
      `- fileName: ${fileName}\n` +
      `- mimeType: ${mimeType}\n` +
      `- fileSizeBytes: ${fileSizeBytes}\n` +
      `- imageIncluded: ${includeInlineImage ? 'yes' : 'no'}\n` +
      `- extractedTextSample: ${extractedTextSample || 'none'}\n`

    const userContent = imageDataUrl
      ? [
          { type: 'text', text: userTextPrompt },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ]
      : userTextPrompt

    const completion = providerConfigured
      ? await createCostEstimatorChatCompletion({
          provider,
          temperature: deterministicInference.temperature,
          topP: deterministicInference.topP,
          seed: deterministicInference.seed,
          messages: [
            {
              role: 'system',
              content:
                'You are a senior construction cost estimation and quantity takeoff engineer. Return strict JSON only. ' +
                'Be deterministic, evidence-based, and never assume missing measurements.',
            },
            {
              role: 'user',
              content: userContent,
            },
          ],
        })
      : {
          provider: 'deterministic-fallback',
          model: 'rule-based-no-assumptions',
          content: JSON.stringify({
            summary:
              'AI provider is not configured. Deterministic fallback kept quantities empty to avoid assumptions and preserve document-only extraction rules.',
            drawingType: parseContext.drawingType,
            detectedScale: parseContext.scale.drawingScale ?? 'unknown',
            confidence: 0,
            riskIndex: 0,
            recommendations: [getCostEstimatorMissingConfigMessage(provider)],
            validation: {
              notes: ['Configure AI provider to enable vision + OCR extraction.'],
            },
            elements: [],
          }),
        }

    const parsed = extractJson(completion.content)
    const confidence = Math.max(0, Math.min(100, Math.round(Number(parsed?.confidence ?? 62) || 62)))
    const riskIndex = Math.max(0, Math.min(100, Math.round(Number(parsed?.riskIndex ?? 48) || 48)))

    // Step 2 + 3: Element detection and measurement extraction (deterministic normalization)
    const normalizedElements = ai_quantity_extractor.normalizeElements(parsed?.elements, confidence)
    const measuredRows = measurement_engine.compute(normalizedElements)

    // Verification Layer
    const verification = buildValidation({ measuredRows, parseContext })

    // Step 4: Quantity -> BOQ -> Deterministic Cost Formula
    const boqRows = boq_generator.fromMeasurements(verification.verifiedRows)
    const costResult = cost_calculator.calculate(boqRows)

    const elements = verification.verifiedRows.map((item, index) => ({
      id: `${documentFingerprint.hash.slice(0, 12)}-${index}`,
      name: item.name,
      quantity: item.quantity,
      measurement: item.measurement,
      unit: item.unit,
      confidence: item.confidence,
    }))

    const recommendations = safeArray(parsed?.recommendations)
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .slice(0, 8)

    const summary = String(parsed?.summary ?? '').trim() ||
      `Model analyzed ${fileName} and generated a construction quantity/cost signal response.`

    const responsePayload = {
      provider: completion.provider,
      model: completion.model,
      analyzedAt: new Date().toISOString(),
      summary,
      confidence,
      riskIndex,
      recommendations,
      elements,
      documentHash: documentFingerprint.hash,
      drawingType: String(parsed?.drawingType ?? parseContext.drawingType),
      deterministicInference,
      quantitiesFromDocumentOnly: true,
      formula:
        'Total Cost = (Material Quantity × Unit Material Cost) + (Labor Hours × Labor Rate) + (Equipment Hours × Equipment Rate)',
      costBreakdown: {
        materialCost: Number(costResult.totals.materialCost.toFixed(2)),
        laborCost: Number(costResult.totals.laborCost.toFixed(2)),
        equipmentCost: Number(costResult.totals.equipmentCost.toFixed(2)),
        totalCost: Number(costResult.totals.totalCost.toFixed(2)),
      },
      validation: verification.validation,
      debug: {
        documentFingerprint: documentFingerprint.hash,
        pipeline: {
          document_parser: {
            drawingType: parseContext.drawingType,
            detectedScale: parseContext.scale.drawingScale,
            unitHint: parseContext.scale.unitHint,
            tokenCount: parseContext.parseMetadata.tokenCount,
          },
          ai_quantity_extractor: {
            detectedElements: normalizedElements.map((item) => ({
              name: item.name,
              sourceType: item.sourceType,
              evidence: item.evidence,
            })),
          },
          measurement_engine: measuredRows.map((row) => ({
            name: row.name,
            measurement: row.measurement,
            numericMeasurement: row.numericMeasurement,
            unit: row.unit,
          })),
          boq_generator: costResult.lineItems,
          cost_calculator: costResult.totals,
          suggested_accuracy_modules: {
            documentFingerprinting: true,
            drawingScaleDetection: true,
            unitStandardization: true,
            geometryValidation: true,
            multiPassAnalysis: ['vision_object_detection', 'ocr_text_pass', 'geometry_reconciliation'],
          },
        },
      },
      fromCache: false,
    }

    await setCachedQuantityResult(documentFingerprint.hash, {
      result: responsePayload,
    })

    if (!debugMode) {
      delete responsePayload.debug
    }

    res.json(responsePayload)
  } catch (error) {
    const message = normalizeAiErrorMessage(error, 'Cost estimator analysis failed.')
    const status = getAiErrorHttpStatus(error)
    res.status(status).json({ error: message })
  }
})

app.get('/api/cost-estimator/state', async (_req, res) => {
  try {
    const database = await readCostEstimatorDb()
    const modules = deriveCostEstimatorModules(database.state)
    res.json({
      ok: true,
      version: database.version,
      updatedAt: database.updatedAt,
      state: database.state,
      modules,
    })
  } catch (error) {
    res.status(500).json({ error: `Failed to load estimator state: ${error?.message || error}` })
  }
})

app.put('/api/cost-estimator/state', async (req, res) => {
  try {
    const incomingState = req.body?.state ?? req.body
    const saved = await writeCostEstimatorState(incomingState)
    const modules = deriveCostEstimatorModules(saved.state)
    res.json({
      ok: true,
      version: saved.version,
      updatedAt: saved.updatedAt,
      state: saved.state,
      modules,
    })
  } catch (error) {
    res.status(500).json({ error: `Failed to save estimator state: ${error?.message || error}` })
  }
})

app.get('/api/cost-estimator/modules/:moduleName', async (req, res) => {
  try {
    const moduleName = String(req.params.moduleName ?? '').trim().toLowerCase()
    const database = await readCostEstimatorDb()
    const modules = deriveCostEstimatorModules(database.state)

    if (moduleName === 'all') {
      res.json({ ok: true, updatedAt: database.updatedAt, modules })
      return
    }

    if (!(moduleName in modules)) {
      res.status(404).json({ error: `Unknown module '${moduleName}'.` })
      return
    }

    res.json({ ok: true, updatedAt: database.updatedAt, module: moduleName, data: modules[moduleName] })
  } catch (error) {
    res.status(500).json({ error: `Failed to read estimator module data: ${error?.message || error}` })
  }
})

app.post('/api/cost-estimator/reports', async (req, res) => {
  try {
    const report = req.body?.report
    if (!report || typeof report !== 'object') {
      res.status(400).json({ error: 'Report payload is required.' })
      return
    }

    const database = await readCostEstimatorDb()
    const nextState = {
      ...database.state,
      reports: [report, ...safeArray(database.state.reports)].slice(0, 200),
    }
    const saved = await writeCostEstimatorState(nextState)
    res.json({ ok: true, updatedAt: saved.updatedAt, reports: saved.state.reports })
  } catch (error) {
    res.status(500).json({ error: `Failed to save report: ${error?.message || error}` })
  }
})

app.post('/api/cost-estimator/assistant', async (req, res) => {
  const prompt = String(req.body?.prompt ?? '').trim()
  const provider = resolveCostEstimatorProvider(req.body?.provider)

  if (!prompt) {
    res.status(400).json({ error: 'A prompt is required.' })
    return
  }

  try {
    const sourceState = req.body?.state && typeof req.body.state === 'object'
      ? req.body.state
      : (await readCostEstimatorDb()).state
    const modules = deriveCostEstimatorModules(sourceState)
    const dashboard = modules.dashboard ?? {}
    const risk = modules.risk ?? {}
    const materialCost = Number(dashboard.materialCost ?? 0) || 0
    const laborCost = Number(dashboard.laborCost ?? 0) || 0
    const equipmentCost = Number(dashboard.equipmentCost ?? 0) || 0
    const totalCost = Number(dashboard.totalCost ?? 0) || materialCost + laborCost + equipmentCost
    const uploadedFiles = Number(dashboard.uploadedFiles ?? 0) || 0
    const takeoffTypes = Number(dashboard.takeoffTypes ?? 0) || 0
    const overallRisk = Number(risk.overallRisk ?? 0) || 0
    const topRiskCards = safeArray(risk.cards)
      .slice(0, 4)
      .map((item) => `${String(item?.title ?? 'Unknown Risk')}: ${Number(item?.percentage ?? 0)}%`)
      .join('; ')

    if (!hasCostEstimatorProviderConfig(provider)) {
      const fallbackReply =
        `Live backend summary: estimated total cost is $${Math.round(totalCost).toLocaleString()}, ` +
        `with materials $${Math.round(materialCost).toLocaleString()}, labor $${Math.round(laborCost).toLocaleString()}, and equipment $${Math.round(equipmentCost).toLocaleString()}. ` +
        `Current overall risk index is ${Math.round(overallRisk)}%. ` +
        `Upload completeness is ${uploadedFiles} file(s) and ${takeoffTypes} detected element type(s).`

      res.json({
        ok: true,
        provider: 'fallback',
        model: 'deterministic-live-summary',
        analyzedAt: new Date().toISOString(),
        reply: fallbackReply,
        suggestions: [
          'Ask for a cost optimization plan by trade.',
          'Ask for risk mitigation actions for top risk cards.',
          'Ask for a report-ready executive summary.',
        ],
      })
      return
    }

    const completion = await createCostEstimatorChatCompletion({
      provider,
      temperature: DETERMINISTIC_INFERENCE.temperature,
      topP: DETERMINISTIC_INFERENCE.topP,
      seed: COST_ESTIMATOR_INFERENCE_SEED,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert construction cost estimator assistant. Always return strict JSON only with schema: ' +
            '{"reply": string, "suggestions": string[]}. Keep reply concise and grounded in provided project context.',
        },
        {
          role: 'user',
          content:
            `User question: ${prompt}\n\n` +
            `Live project context:\n` +
            `- totalCost: ${totalCost}\n` +
            `- materialCost: ${materialCost}\n` +
            `- laborCost: ${laborCost}\n` +
            `- equipmentCost: ${equipmentCost}\n` +
            `- uploadedFiles: ${uploadedFiles}\n` +
            `- takeoffTypes: ${takeoffTypes}\n` +
            `- overallRisk: ${overallRisk}\n` +
            `- riskCards: ${topRiskCards || 'No risk cards available'}\n\n` +
            `Rules:\n` +
            `- Mention concrete numbers from context when relevant.\n` +
            `- If data is incomplete, state assumptions explicitly.\n` +
            `- suggestions must contain up to 3 short follow-up prompts.`,
        },
      ],
    })

    const parsed = extractJson(completion.content)
    const reply = String(parsed?.reply ?? '').trim() || 'I analyzed the latest estimator data, but no detailed reply text was returned.'
    const suggestions = safeArray(parsed?.suggestions)
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .slice(0, 3)

    res.json({
      ok: true,
      provider: completion.provider,
      model: completion.model,
      analyzedAt: new Date().toISOString(),
      reply,
      suggestions,
    })
  } catch (error) {
    const message = normalizeAiErrorMessage(error, 'Cost estimator assistant failed.')
    const status = getAiErrorHttpStatus(error)
    res.status(status).json({ error: message })
  }
})

app.post('/api/material-hubs/ai-agent', upload.single('document'), async (req, res) => {
  if (!hasKey) {
    res.status(503).json({
      error: getAiMissingConfigMessage('Material Hubs AI agent'),
    })
    return
  }

  try {
    const auth = await verifyMaterialHubAdmin(req)
    if (auth.status !== 200) {
      res.status(auth.status).json({ error: auth.error })
      return
    }

    const instruction = String(req.body.instruction ?? '').trim()
    const hubs = safeArray(parseJsonBodyField(req.body.hubs, []))
    const inventory = safeArray(parseJsonBodyField(req.body.inventory, []))
    const documentText = await getUploadedDocumentText(req.file)

    if (!instruction && !documentText) {
      res.status(400).json({ error: 'Provide an admin instruction or upload a document for analysis.' })
      return
    }

    const compactContext = {
      hubs: hubs.slice(0, 200).map((hub) => ({
        id: String(hub?.id ?? ''),
        name: String(hub?.name ?? ''),
        location: String(hub?.location ?? ''),
        district: String(hub?.district ?? ''),
        status: String(hub?.status ?? ''),
        stockPercentage: Number(hub?.stockPercentage ?? 0),
        damagePercentage: Number(hub?.damagePercentage ?? 0),
      })),
      inventory: inventory.slice(0, 300).map((hubInventory) => ({
        hubId: String(hubInventory?.hubId ?? ''),
        hubName: String(hubInventory?.hubName ?? ''),
        materials: safeArray(hubInventory?.materials).slice(0, 400).map((item) => ({
          id: String(item?.id ?? ''),
          hubId: String(item?.hubId ?? ''),
          name: String(item?.name ?? ''),
          unit: String(item?.unit ?? ''),
          opening: Number(item?.opening ?? 0),
          received: Number(item?.received ?? 0),
          issued: Number(item?.issued ?? 0),
          damaged: Number(item?.damaged ?? 0),
          closing: Number(item?.closing ?? 0),
        })),
      })),
    }

    const completion = await createChatCompletion({
      openaiModel: OPENAI_MODEL,
      huggingFaceModel: HUGGINGFACE_CHAT_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            'You are an inventory operations AI for disaster material hubs. You must return strict JSON only. Be conservative and avoid destructive edits unless explicitly requested. Use existing IDs for updates/deletes whenever possible.',
        },
        {
          role: 'user',
          content:
            `You are helping an admin update Material Hub portal data. Analyze deeply and return strict JSON with this schema only:\n{\n  "summary": string,\n  "confidence": number,\n  "risks": string[],\n  "hubOperations": [\n    {\n      "action": "create|update|delete",\n      "hubId": string | null,\n      "hubName": string | null,\n      "name": string | null,\n      "location": string | null,\n      "district": string | null,\n      "latitude": number | null,\n      "longitude": number | null,\n      "capacity": number | null,\n      "status": "ready|moderate|critical" | null,\n      "stockPercentage": number | null,\n      "damagePercentage": number | null\n    }\n  ],\n  "entryOperations": [\n    {\n      "action": "create|update|delete",\n      "entryId": string | null,\n      "hubId": string | null,\n      "hubName": string | null,\n      "name": string | null,\n      "unit": string | null,\n      "opening": number | null,\n      "received": number | null,\n      "issued": number | null,\n      "damaged": number | null\n    }\n  ]\n}.\n\nRules:\n- For update/delete, include IDs when available from context.\n- Never invent hub IDs or entry IDs.\n- Keep numbers non-negative.\n- stockPercentage and damagePercentage must be between 0 and 100 when present.\n- Be conservative with deletes unless explicitly requested.\n- If data is uncertain, add the uncertainty in risks and keep operations minimal.\n\nAdmin instruction:\n${instruction || '(none)'}\n\nUploaded document text:\n${documentText || '(none)'}\n\nCurrent live context:\n${JSON.stringify(compactContext).slice(0, 120_000)}`,
        },
      ],
    })

    const text = completion.choices[0]?.message?.content ?? ''
    const parsed = extractJson(text)

    const aiHubOps = extractHubOpsFromPayload(parsed)
    const aiEntryOps = extractEntryOpsFromPayload(parsed)
    const docFallback = extractOperationsFromDocumentText(documentText)

    const hubOpsSource = aiHubOps.length > 0 ? aiHubOps : docFallback.hubOps
    const entryOpsSource = aiEntryOps.length > 0 ? aiEntryOps : docFallback.entryOps

    const hubOperations = safeArray(hubOpsSource).map((item) => ({
      action: normalizeAiAction(item?.action),
      hubId: item?.hubId ? String(item.hubId) : null,
      hubName: item?.hubName ? String(item.hubName) : null,
      name: item?.name ? String(item.name) : null,
      location: item?.location ? String(item.location) : null,
      district: item?.district ? String(item.district) : null,
      latitude: item?.latitude === null || item?.latitude === undefined ? null : Number(item.latitude),
      longitude: item?.longitude === null || item?.longitude === undefined ? null : Number(item.longitude),
      capacity: item?.capacity === null || item?.capacity === undefined ? null : Math.max(0, Number(item.capacity) || 0),
      status: normalizeHubStatus(item?.status),
      stockPercentage:
        item?.stockPercentage === null || item?.stockPercentage === undefined
          ? null
          : Math.max(0, Math.min(100, Number(item.stockPercentage) || 0)),
      damagePercentage:
        item?.damagePercentage === null || item?.damagePercentage === undefined
          ? null
          : Math.max(0, Math.min(100, Number(item.damagePercentage) || 0)),
    })).filter((item) => item.action)

    const entryOperations = safeArray(entryOpsSource).map((item) => ({
      action: normalizeAiAction(item?.action),
      entryId: item?.entryId ? String(item.entryId) : null,
      hubId: item?.hubId ? String(item.hubId) : null,
      hubName: item?.hubName ? String(item.hubName) : null,
      name: item?.name ? String(item.name) : null,
      unit: item?.unit ? String(item.unit) : null,
      opening: item?.opening === null || item?.opening === undefined ? null : Math.max(0, Number(item.opening) || 0),
      received: item?.received === null || item?.received === undefined ? null : Math.max(0, Number(item.received) || 0),
      issued: item?.issued === null || item?.issued === undefined ? null : Math.max(0, Number(item.issued) || 0),
      damaged: item?.damaged === null || item?.damaged === undefined ? null : Math.max(0, Number(item.damaged) || 0),
    })).filter((item) => item.action)

    const baseRisks = safeArray(parsed.risks).map((item) => String(item))
    const risks =
      hubOperations.length === 0 && entryOperations.length === 0
        ? [
            ...baseRisks,
            'No actionable operations were generated. Upload a structured JSON with hubOperations/entryOperations or provide clearer update instructions with exact hub/material names.',
          ]
        : baseRisks

    res.json({
      model,
      analyzedAt: new Date().toISOString(),
      summary: String(parsed.summary ?? ''),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.6) || 0.6)),
      risks,
      hubOperations,
      entryOperations,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Material Hubs AI analysis failed.'
    const statusFromProvider =
      typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
        ? error.status
        : undefined
    const isQuotaError = /\b429\b|quota|insufficient_quota|billing|rate\s*limit/i.test(message)

    res.status(statusFromProvider ?? (isQuotaError ? 429 : 500)).json({
      error: message,
      provider: selectedAiProvider,
      model,
    })
  }
})

app.post('/api/ml/retrofit-estimate', (req, res) => {
  try {
    const structureType = String(req.body.structureType ?? 'Masonry House')
    const province = String(req.body.province ?? 'Punjab')
    const city = String(req.body.city ?? '')
    const areaSqft = Number(req.body.areaSqft ?? 1200)
    const severityScore = Number(req.body.severityScore ?? 40)
    const affectedAreaPercent = Number(req.body.affectedAreaPercent ?? 25)
    const urgencyLevel = String(req.body.urgencyLevel ?? 'priority')
    const laborDaily = req.body.laborDaily !== undefined ? Number(req.body.laborDaily) : undefined
    const materialIndex = req.body.materialIndex !== undefined ? Number(req.body.materialIndex) : undefined
    const equipmentIndex = req.body.equipmentIndex !== undefined ? Number(req.body.equipmentIndex) : undefined
    const logisticsIndex = req.body.logisticsIndex !== undefined ? Number(req.body.logisticsIndex) : undefined
    const defectProfile = req.body.defectProfile ?? {}
    const imageQuality = String(req.body.imageQuality ?? 'good')

    const prediction = predictRetrofitMl({
      structureType,
      province,
      city,
      areaSqft,
      severityScore,
      affectedAreaPercent,
      urgencyLevel,
      laborDaily,
      materialIndex,
      equipmentIndex,
      logisticsIndex,
      defectProfile,
      imageQuality,
    })

    res.json(prediction)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ML estimate failed.'
    res.status(500).json({ error: message })
  }
})

app.post('/api/ml/training-data', upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Training image file is required.' })
    return
  }

  try {
    const recordId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const extension = req.file.mimetype.includes('png') ? 'png' : req.file.mimetype.includes('webp') ? 'webp' : 'jpg'
    const imageName = `${recordId}.${extension}`
    await ensureRetrofitTrainingStorage()
    await fs.writeFile(path.join(retrofitTrainingImagesDir, imageName), req.file.buffer)

    const record = {
      id: recordId,
      createdAt: new Date().toISOString(),
      imageName,
      structureType: String(req.body.structureType ?? 'Masonry House'),
      province: String(req.body.province ?? 'Punjab'),
      city: String(req.body.city ?? ''),
      areaSqft: Number(req.body.areaSqft ?? 1200),
      severityScore: Number(req.body.severityScore ?? 45),
      affectedAreaPercent: Number(req.body.affectedAreaPercent ?? 25),
      urgencyLevel: String(req.body.urgencyLevel ?? 'priority'),
      laborDaily: Number(req.body.laborDaily ?? 2600),
      materialIndex: Number(req.body.materialIndex ?? 1),
      equipmentIndex: Number(req.body.equipmentIndex ?? 1),
      logisticsIndex: Number(req.body.logisticsIndex ?? 1),
    }

    const existing = await readRetrofitTrainingData()
    existing.push(record)
    await writeRetrofitTrainingData(existing)

    res.json({
      message: 'Training data sample saved.',
      sampleCount: existing.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save training data sample.'
    res.status(500).json({ error: message })
  }
})

app.post('/api/ml/retrain', async (_req, res) => {
  try {
    const samples = await readRetrofitTrainingData()
    const result = retrainRetrofitMlModel(samples)
    res.json({
      ...result,
      sampleCount: samples.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrain ML model.'
    res.status(500).json({ error: message })
  }
})

app.post('/api/community/issues', upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Issue photo is required.' })
    return
  }

  try {
    const issueId = `issue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const extension = req.file.mimetype.includes('png') ? 'png' : req.file.mimetype.includes('webp') ? 'webp' : 'jpg'
    const imageName = `${issueId}.${extension}`

    await ensureCommunityIssuesStorage()
    await fs.writeFile(path.join(communityIssueImagesDir, imageName), req.file.buffer)

    const issue = {
      id: issueId,
      submittedAt: new Date().toISOString(),
      category: String(req.body.category ?? 'Broken roads'),
      notes: String(req.body.notes ?? '').trim() || 'No additional notes provided.',
      photoName: req.file.originalname || imageName,
      imageName,
      status: 'Submitted',
      lat: req.body.lat !== undefined && String(req.body.lat).trim() !== '' ? Number(req.body.lat) : null,
      lng: req.body.lng !== undefined && String(req.body.lng).trim() !== '' ? Number(req.body.lng) : null,
      province: String(req.body.province ?? '').trim() || null,
      district: String(req.body.district ?? '').trim() || null,
    }

    const issues = await readCommunityIssues()
    issues.unshift(issue)
    await writeCommunityIssues(issues)

    res.json({
      ...issue,
      imageUrl: buildCommunityIssueImageUrl(req, issue.imageName),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit community issue.'
    res.status(500).json({ error: message })
  }
})

app.get('/api/community/issues', async (req, res) => {
  try {
    const statusFilter = String(req.query.status ?? '').trim()
    const allIssues = await readCommunityIssues()
    const filtered = statusFilter
      ? allIssues.filter((item) => String(item.status).toLowerCase() === statusFilter.toLowerCase())
      : allIssues

    res.json(
      filtered.map((issue) => ({
        ...issue,
        imageUrl: buildCommunityIssueImageUrl(req, issue.imageName),
      })),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load community issues.'
    res.status(500).json({ error: message })
  }
})

app.patch('/api/community/issues/:id/status', async (req, res) => {
  try {
    if (!COMMUNITY_ISSUES_ADMIN_TOKEN) {
      res.status(503).json({ error: 'Admin status gate is not configured on server.' })
      return
    }

    const providedToken = readAdminTokenFromRequest(req)
    if (!providedToken || providedToken !== COMMUNITY_ISSUES_ADMIN_TOKEN) {
      res.status(401).json({ error: 'Unauthorized: valid admin token is required to update issue status.' })
      return
    }

    const issueId = String(req.params.id ?? '').trim()
    const status = String(req.body.status ?? '').trim()

    if (!issueId) {
      res.status(400).json({ error: 'Issue id is required.' })
      return
    }

    if (!allowedCommunityIssueStatuses.has(status)) {
      res.status(400).json({ error: 'Invalid status.' })
      return
    }

    const issues = await readCommunityIssues()
    const index = issues.findIndex((item) => item.id === issueId)
    if (index < 0) {
      res.status(404).json({ error: 'Issue not found.' })
      return
    }

    issues[index] = {
      ...issues[index],
      status,
      updatedAt: new Date().toISOString(),
    }

    await writeCommunityIssues(issues)

    res.json({
      ...issues[index],
      imageUrl: buildCommunityIssueImageUrl(req, issues[index].imageName),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update community issue status.'
    res.status(500).json({ error: message })
  }
})

app.post('/api/guidance/construction', async (req, res) => {
  if (!hasKey) {
    res.status(503).json({ error: getAiMissingConfigMessage('AI construction guidance') })
    return
  }

  try {
    const province = String(req.body.province ?? 'Punjab')
    const city = String(req.body.city ?? 'Lahore')
    const hazard = String(req.body.hazard ?? 'flood')
    const structureType = String(req.body.structureType ?? 'Masonry House')
    const bestPracticeName = String(req.body.bestPracticeName ?? 'General Resilient Construction Practice')

    const completion = await createChatCompletion({
      openaiModel: OPENAI_MODEL,
      huggingFaceModel: HUGGINGFACE_CHAT_MODEL,
      temperature: 0.15,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior disaster-resilient construction engineer for Pakistan. Return strict JSON only with comprehensive, location-wise, implementation-ready engineering guidance in English.',
        },
        {
          role: 'user',
          content:
            `Create comprehensive location-aware construction guidance for structureType=${structureType} in city=${city}, province=${province}, Pakistan for hazard=${hazard}. Best practice to apply: ${bestPracticeName}. Use deep technical reasoning: local hazard patterns, soil/drainage implications, execution sequencing, QA/QC, and practical field constraints. Return strict JSON schema:\n{\n  "summary": string,\n  "materials": string[],\n  "safety": string[],\n  "steps": [\n    {\n      "title": string,\n      "description": string,\n      "keyChecks": string[]\n    }\n  ]\n}. Constraints: exactly 5 steps; each step must be distinct and actionable; each description must explicitly include location-wise relevance and implementation guidance for Pakistan.`,
        },
      ],
    })

    const text = completion.choices[0]?.message?.content ?? ''
    const parsed = extractJson(text)

    const steps = mapGuidanceSteps(parsed.steps)

    const englishGuidance = {
      summary: String(parsed.summary ?? ''),
      materials: safeArray(parsed.materials).map((item) => String(item)),
      safety: safeArray(parsed.safety).map((item) => String(item)),
      steps,
    }

    const translated = await translateGuidanceToUrdu(englishGuidance)

    res.json({
      ...englishGuidance,
      summaryUrdu: translated.summaryUrdu || englishGuidance.summary,
      materialsUrdu: translated.materialsUrdu.length > 0 ? translated.materialsUrdu : englishGuidance.materials,
      safetyUrdu: translated.safetyUrdu.length > 0 ? translated.safetyUrdu : englishGuidance.safety,
      stepsUrdu: translated.stepsUrdu.length > 0 ? translated.stepsUrdu : englishGuidance.steps,
    })
  } catch (error) {
    const message = normalizeAiErrorMessage(error, 'Construction guidance generation failed.')
    res.status(getAiErrorHttpStatus(error)).json({ error: message })
  }
})

app.post('/api/guidance/step-images', async (req, res) => {
  if (!hasKey) {
    res.status(503).json({ error: getAiMissingConfigMessage('AI step images') })
    return
  }

  try {
    const province = String(req.body.province ?? 'Punjab')
    const city = String(req.body.city ?? 'Lahore')
    const hazard = String(req.body.hazard ?? 'flood')
    const structureType = String(req.body.structureType ?? 'Masonry House')
    const bestPracticeName = String(req.body.bestPracticeName ?? 'General Resilient Construction Practice')
    const steps = safeArray(req.body.steps).slice(0, 5)

    const generateStepImage = async (stepTitle, stepDescription) => {
      const prompt = `Photorealistic construction scene in ${city}, ${province}, Pakistan for ${structureType}. Hazard: ${hazard}. Best practice: ${bestPracticeName}. Step: ${stepTitle}. Show realistic workers, tools, materials, site details, and hazard-specific safeguards. ${stepDescription}`

      let lastError = null
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const b64 = await generateImageBase64({
            prompt,
            size: '1024x1024',
          })

          if (!b64) {
            lastError = new Error('No image data returned')
            await sleep(300 * attempt)
            continue
          }

          return {
            stepTitle,
            prompt,
            imageDataUrl: `data:image/png;base64,${b64}`,
          }
        } catch (error) {
          lastError = error
          if (attempt < 2 && isTransientAiError(error)) {
            await sleep(500 * attempt)
          }
        }
      }

      throw (lastError instanceof Error ? lastError : new Error(`Image generation failed for step: ${stepTitle}`))
    }

    const imageJobs = steps.map((step) => ({
      stepTitle: String(step?.title ?? 'Construction Step'),
      stepDescription: String(step?.description ?? ''),
    }))

    const generationResults = await runWithConcurrency(
      imageJobs,
      async (job) => generateStepImage(job.stepTitle, job.stepDescription),
      AI_IMAGE_CONCURRENCY,
    )

    const images = generationResults
      .filter((item) => item?.ok)
      .map((item) => item.value)
      .filter(Boolean)

    if (images.length === 0) {
      const firstError = generationResults.find((item) => item && !item.ok)?.error
      throw (firstError instanceof Error ? firstError : new Error('Step image generation failed.'))
    }

    res.json({
      images,
      partial: images.length < imageJobs.length,
      failed: imageJobs.length - images.length,
    })
  } catch (error) {
    const message = normalizeAiErrorMessage(error, 'Step image generation failed.')
    res.status(getAiErrorHttpStatus(error)).json({ error: message })
  }
})

app.post('/api/advisory/ask', async (req, res) => {
  if (!hasKey) {
    res.status(503).json({ error: getAiMissingConfigMessage('AI advisory answers') })
    return
  }

  try {
    const question = String(req.body.question ?? '').trim()
    const province = String(req.body.province ?? 'Punjab')
    const district = req.body.district ? String(req.body.district) : null
    const riskLayer = String(req.body.riskLayer ?? 'flood')
    const riskValue = String(req.body.riskValue ?? 'Unknown')
    const language = String(req.body.language ?? 'English')
    const districtProfile = req.body.districtProfile ?? null

    if (!question) {
      res.status(400).json({ error: 'Question is required.' })
      return
    }

    const responseLanguage = language === 'Urdu' ? 'Urdu' : 'English'

    const completion = await createChatCompletion({
      openaiModel: OPENAI_MODEL,
      huggingFaceModel: HUGGINGFACE_CHAT_MODEL,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            'You are Resilience360 AI advisor. Answer questions on hazards, climate change, environmental resilience, and relevant organizations with practical, accurate, and actionable guidance for Pakistan. Keep answers concise but useful, and avoid hallucinated specific numbers or claims.',
        },
        {
          role: 'user',
          content:
            `Answer this user question in ${responseLanguage}: "${question}"\n\nLocal context:\n- Province: ${province}\n- District: ${district ?? 'Not selected'}\n- Risk layer: ${riskLayer}\n- Risk value: ${riskValue}\n- District profile JSON: ${JSON.stringify(districtProfile)}\n\nResponse requirements:\n1) Provide a practical answer tailored to the local context where relevant.\n2) Mention 2-4 concrete next actions.\n3) If applicable, mention credible organizations to coordinate with (e.g., NDMA, PDMA, PMD, district administration, humanitarian agencies).\n4) Keep response within about 180 words.`,
        },
      ],
    })

    const answer = completion.choices[0]?.message?.content?.trim() ?? ''
    if (!answer) {
      res.status(500).json({ error: 'AI returned an empty advisory response.' })
      return
    }

    res.json({ answer })
  } catch (error) {
    const message = normalizeAiErrorMessage(error, 'Advisory generation failed.')
    res.status(getAiErrorHttpStatus(error)).json({ error: message })
  }
})

app.post('/api/pgbc/code-qa', async (req, res) => {
  if (!hasKey) {
    res.status(503).json({ error: getAiMissingConfigMessage('PGBC code Q&A') })
    return
  }

  try {
    const question = String(req.body?.question ?? '').trim()
    const codeContexts = safeArray(req.body?.codeContexts)
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .slice(0, 8)
    const selectedCodeNames = safeArray(req.body?.selectedCodeNames)
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .slice(0, 50)
    const allCodeNames = safeArray(req.body?.allCodeNames)
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .slice(0, 100)

    if (!question) {
      res.status(400).json({ error: 'question is required.' })
      return
    }

    if (!codeContexts.length) {
      res.status(400).json({ error: 'At least one selected code context is required.' })
      return
    }

    const combinedContext = codeContexts.join('\n\n-----\n\n').slice(0, 120000)
    const selectedCodeList = selectedCodeNames.length ? selectedCodeNames.join(' | ') : 'Not provided'
    const availableCodeList = allCodeNames.length ? allCodeNames.join(' | ') : selectedCodeList

    const completion = await createChatCompletion({
      openaiModel: OPENAI_MODEL,
      huggingFaceModel: HUGGINGFACE_CHAT_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert Pakistan building code assistant. Use only provided selected code context for citations. If selected context includes citation candidates relevant to the question, treat it as addressed and cite those sections. Do not output contradictory results (e.g., not addressed while citing selected sections). If truly not addressed, set addressedInSelectedCodes=false and suggest better code selections from available code names.',
        },
        {
          role: 'user',
          content:
            `User question:\n${question}\n\nSelected code names:\n${selectedCodeList}\n\nAll available code names:\n${availableCodeList}\n\nSelected code context:\n${combinedContext}\n\nReturn strict JSON exactly in this schema:\n{\n  "addressedInSelectedCodes": boolean,\n  "directAnswer": string,\n  "points": [\n    {\n      "statement": string,\n      "citations": [\n        {\n          "codeName": string,\n          "chapter": string,\n          "section": string,\n          "evidence": string\n        }\n      ]\n    }\n  ],\n  "assumptions": string[],\n  "checkInPdf": string[],\n  "suggestedCodesIfNotAddressed": [\n    {\n      "codeName": string,\n      "why": string\n    }\n  ]\n}\n\nRules:\n- If not addressed, directAnswer must explicitly include: "Not addressed in the selected code(s)".\n- If addressedInSelectedCodes=true, provide section-level citations from selected code names.\n- Never mark not addressed when you cite sections from selected codes.\n- Keep chapter/section values concise (e.g., "10", "10.2.3").\n- suggestedCodesIfNotAddressed should be empty when addressedInSelectedCodes=true.`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    const parsed = extractJson(raw)

    const points = safeArray(parsed.points)
      .map((point) => ({
        statement: String(point?.statement ?? '').trim(),
        citations: safeArray(point?.citations)
          .map((citation) => ({
            codeName: String(citation?.codeName ?? '').trim(),
            chapter: String(citation?.chapter ?? '').trim(),
            section: String(citation?.section ?? '').trim(),
            evidence: String(citation?.evidence ?? '').trim(),
          }))
          .filter((citation) => citation.codeName || citation.chapter || citation.section || citation.evidence),
      }))
      .filter((point) => point.statement)
      .slice(0, 8)

    const directAnswer = String(parsed.directAnswer ?? '').trim()
    if (!directAnswer && points.length === 0) {
      res.status(500).json({ error: 'AI returned empty answer.' })
      return
    }

    const selectedNameSet = new Set(selectedCodeNames.map((item) => item.toLowerCase()))
    const isCitationFromSelected = (citation) => {
      const citationName = String(citation?.codeName ?? '').trim().toLowerCase()
      if (!citationName) return false
      if (selectedNameSet.has(citationName)) return true
      return [...selectedNameSet].some((name) => citationName.includes(name) || name.includes(citationName))
    }

    const hasSelectedCitations = points.some((point) =>
      safeArray(point?.citations).some((citation) => isCitationFromSelected(citation)),
    )

    const checkInPdfList = safeArray(parsed.checkInPdf)
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .slice(0, 6)

    const hasCheckInPdfFromSelected = checkInPdfList.some((line) => {
      const lowerLine = line.toLowerCase()
      return [...selectedNameSet].some((name) => lowerLine.includes(name))
    })

    let addressedInSelectedCodes = Boolean(parsed.addressedInSelectedCodes)
    if (!addressedInSelectedCodes && (hasSelectedCitations || hasCheckInPdfFromSelected)) {
      addressedInSelectedCodes = true
    }

    const shouldForceNotAddressedText = !addressedInSelectedCodes
    const normalizedDirectAnswer = shouldForceNotAddressedText
      ? directAnswer.includes('Not addressed in the selected code(s)')
        ? directAnswer
        : `Not addressed in the selected code(s). ${directAnswer}`.trim()
      : directAnswer.replace(/^Not addressed in the selected code\(s\)\.?\s*/i, '').trim() || directAnswer

    const suggestedCodesIfNotAddressed = shouldForceNotAddressedText
      ? safeArray(parsed.suggestedCodesIfNotAddressed)
          .map((item) => ({
            codeName: String(item?.codeName ?? '').trim(),
            why: String(item?.why ?? '').trim(),
          }))
          .filter((item) => item.codeName)
          .slice(0, 6)
      : []

    res.json({
      addressedInSelectedCodes,
      directAnswer: normalizedDirectAnswer,
      points,
      assumptions: safeArray(parsed.assumptions).map((item) => String(item ?? '').trim()).filter(Boolean).slice(0, 6),
      checkInPdf: checkInPdfList,
      suggestedCodesIfNotAddressed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PGBC code Q&A failed.'
    res.status(500).json({ error: message })
  }
})

app.post('/api/models/resilience-catalog', async (req, res) => {
  if (!hasKey) {
    res.status(503).json({
      error: getAiMissingConfigMessage('AI infra model catalog'),
    })
    return
  }

  try {
    const country = String(req.body.country ?? 'Pakistan')
    const province = String(req.body.province ?? 'National')

    const modelSpecs = [
      {
        id: 'flood-housing-cluster',
        title: 'Elevated Flood-Resilient Housing Cluster',
        description:
          'Cluster housing model with raised plinth, drainage channels, and protected lifeline utilities for riverine and urban flood zones.',
        features: [
          'Raised plinth and flood-compatible ground floor',
          'Perimeter drainage and sump-pump with backflow control',
          'Elevated electrical and water utility routing',
        ],
        advantagesPakistan: [
          'Reduces recurring flood repair burden in Sindh and South Punjab',
          'Improves post-flood re-occupancy speed for low-income communities',
          'Supports PDMA/municipal flood mitigation investments',
        ],
      },
      {
        id: 'seismic-school-block',
        title: 'Ductile Seismic School Block Retrofit Model',
        description:
          'School safety retrofit with column jacketing, confinement detailing, and non-structural anchorage to protect students in high seismic zones.',
        features: [
          'Column/beam jacketing at critical bays',
          'Masonry confinement and out-of-plane restraint',
          'Secured parapets, ceilings, and service systems',
        ],
        advantagesPakistan: [
          'Cuts collapse risk in KP and GB school infrastructure',
          'Improves continuity of education after earthquakes',
          'Aligns with phased public-sector retrofit budgeting',
        ],
      },
      {
        id: 'bridge-approach-protection',
        title: 'Bridge Approach and Embankment Resilience Model',
        description:
          'Transport resilience model combining embankment stabilization, seismic restraint components, and high-flow erosion protection.',
        features: [
          'Toe protection and sub-surface drainage',
          'Joint restrainers and bearing upgrade package',
          'Scour-resistant slope treatment and monitoring',
        ],
        advantagesPakistan: [
          'Reduces road cut-offs during flood and seismic events',
          'Protects strategic trade and evacuation corridors',
          'Lowers lifecycle maintenance costs for NHA/provincial roads',
        ],
      },
      {
        id: 'community-shelter-hub',
        title: 'Community Shelter + Early Warning Hub Model',
        description:
          'Multi-hazard community center with structural hardening, emergency stock nodes, and integrated warning communication interfaces.',
        features: [
          'Wind/seismic-resistant shelter core',
          'Emergency power, water, and communication stack',
          'Accessible evacuation and medical triage layout',
        ],
        advantagesPakistan: [
          'Strengthens last-mile preparedness in hazard-prone districts',
          'Improves coordination for district emergency response',
          'Provides dual-use public utility in normal times',
        ],
      },
    ]

    const modelResults = await runWithConcurrency(
      modelSpecs,
      async (spec) => {
        const prompt = `Photorealistic infrastructure visualization for ${spec.title} in ${country} (${province}). Show realistic construction context, local materials, climate-appropriate design, and civil engineering details. No text overlays.`
        const imageBase64 = await generateImageBase64({ prompt, size: '1024x1024' })
        if (!imageBase64) {
          throw new Error(`No image data returned for ${spec.title}`)
        }

        return {
          ...spec,
          imageDataUrl: `data:image/png;base64,${imageBase64}`,
        }
      },
      AI_IMAGE_CONCURRENCY,
    )

    const models = modelResults
      .filter((item) => item?.ok)
      .map((item) => item.value)
      .filter(Boolean)

    if (models.length === 0) {
      const firstError = modelResults.find((item) => item && !item.ok)?.error
      throw (firstError instanceof Error ? firstError : new Error('Infra model generation failed.'))
    }

    res.json({
      models,
      partial: models.length < modelSpecs.length,
      failed: modelSpecs.length - models.length,
    })
  } catch (error) {
    const message = normalizeAiErrorMessage(error, 'Infra model generation failed.')
    res.status(getAiErrorHttpStatus(error)).json({ error: message })
  }
})

app.get('/api/models/shared-generated', async (_req, res) => {
  try {
    const models = await readSharedInfraModels()
    res.json({ models })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load shared infra models.'
    res.status(500).json({ error: message })
  }
})

app.post('/api/models/shared-generated', async (req, res) => {
  try {
    const incoming = safeArray(req.body?.models)
    if (incoming.length === 0) {
      res.status(400).json({ error: 'models array is required.' })
      return
    }

    const result = await appendSharedInfraModels(incoming)
    res.json({
      added: result.added,
      total: result.total,
      models: result.models,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save shared infra models.'
    res.status(500).json({ error: message })
  }
})

app.post('/api/models/shared-generated/sync-github', async (req, res) => {
  try {
    if (!INFRA_MODELS_ADMIN_TOKEN) {
      res.status(503).json({ error: 'Infra model sync admin token is not configured on server.' })
      return
    }

    const providedToken = readAdminTokenFromRequest(req)
    if (!providedToken || providedToken !== INFRA_MODELS_ADMIN_TOKEN) {
      res.status(401).json({ error: 'Unauthorized: valid admin token is required to sync infra models.' })
      return
    }

    if (!INFRA_MODELS_GIT_SYNC_ENABLED) {
      res.status(403).json({ error: 'GitHub sync is disabled. Set INFRA_MODELS_GIT_SYNC_ENABLED=true on server.' })
      return
    }

    const syncResult = await syncSharedInfraModelsToGitHub()
    res.json(syncResult)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GitHub sync failed for shared infra models.'
    res.status(500).json({ error: message })
  }
})

app.post('/api/models/research', async (req, res) => {
  if (!hasKey) {
    res.status(503).json({
      error: getAiMissingConfigMessage('infra model research'),
    })
    return
  }

  try {
    const modelName = String(req.body.modelName ?? '').trim()
    const province = String(req.body.province ?? 'Pakistan')

    if (!modelName) {
      res.status(400).json({ error: 'modelName is required.' })
      return
    }

    const completion = await createChatCompletion({
      openaiModel: OPENAI_MODEL,
      huggingFaceModel: HUGGINGFACE_CHAT_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a civil engineering research assistant. Return strict JSON only. Use conservative, practical guidance for Pakistan and include source links from credible institutions where possible.',
        },
        {
          role: 'user',
          content:
            `Research this infrastructure model: ${modelName}. Focus on where it is used around the world and feasibility for Pakistan (${province}). Return strict JSON using this schema:
{
  "modelName": string,
  "overview": string,
  "globalUseCases": [{ "country": string, "project": string, "application": string, "evidenceNote": string }],
  "pakistanUseCases": string[],
  "features": string[],
  "materials": [{ "name": string, "specification": string, "availabilityInPakistan": "High|Medium|Low" }],
  "availability": {
    "readinessPakistan": string,
    "localSupplyPotential": string,
    "importDependencyNote": string
  },
  "resilience": {
    "flood": string,
    "earthquake": string,
    "floodScore": number,
    "earthquakeScore": number
  },
  "sourceLinks": string[],
  "googleSearchHints": {
    "global": string,
    "pakistan": string
  }
}. Constraints: floodScore and earthquakeScore must be integers 1-10. sourceLinks should be direct URLs and not placeholders.`,
        },
      ],
    })

    const text = completion.choices[0]?.message?.content ?? ''
    const parsed = extractJson(text)

    const googleGlobal = `https://www.google.com/search?q=${encodeURIComponent(`${modelName} global case studies infrastructure`)}`
    const googlePakistan = `https://www.google.com/search?q=${encodeURIComponent(`${modelName} Pakistan infrastructure`)}`

    res.json({
      modelName: String(parsed.modelName ?? modelName),
      overview: String(parsed.overview ?? ''),
      globalUseCases: safeArray(parsed.globalUseCases).map((item) => ({
        country: String(item?.country ?? ''),
        project: String(item?.project ?? ''),
        application: String(item?.application ?? ''),
        evidenceNote: String(item?.evidenceNote ?? ''),
      })),
      pakistanUseCases: safeArray(parsed.pakistanUseCases).map((item) => String(item)),
      features: safeArray(parsed.features).map((item) => String(item)),
      materials: safeArray(parsed.materials).map((item) => ({
        name: String(item?.name ?? ''),
        specification: String(item?.specification ?? ''),
        availabilityInPakistan: String(item?.availabilityInPakistan ?? 'Medium'),
      })),
      availability: {
        readinessPakistan: String(parsed.availability?.readinessPakistan ?? ''),
        localSupplyPotential: String(parsed.availability?.localSupplyPotential ?? ''),
        importDependencyNote: String(parsed.availability?.importDependencyNote ?? ''),
      },
      resilience: {
        flood: String(parsed.resilience?.flood ?? ''),
        earthquake: String(parsed.resilience?.earthquake ?? ''),
        floodScore: Math.max(1, Math.min(10, Number(parsed.resilience?.floodScore ?? 6) || 6)),
        earthquakeScore: Math.max(1, Math.min(10, Number(parsed.resilience?.earthquakeScore ?? 6) || 6)),
      },
      sourceLinks: safeArray(parsed.sourceLinks).map((item) => String(item)).filter(Boolean),
      googleSearch: {
        global: googleGlobal,
        pakistan: googlePakistan,
        globalHint: String(parsed.googleSearchHints?.global ?? `${modelName} global case studies infrastructure`),
        pakistanHint: String(parsed.googleSearchHints?.pakistan ?? `${modelName} Pakistan infrastructure applications`),
      },
    })
  } catch (error) {
    const message = normalizeAiErrorMessage(error, 'Infra model research failed.')
    res.status(getAiErrorHttpStatus(error)).json({ error: message })
  }
})

app.post('/api/models/research-images', async (req, res) => {
  if (!hasKey) {
    res.status(503).json({
      error: getAiMissingConfigMessage('infra model view image generation'),
    })
    return
  }

  try {
    const modelName = String(req.body.modelName ?? '').trim()
    const province = String(req.body.province ?? 'Pakistan')

    if (!modelName) {
      res.status(400).json({ error: 'modelName is required.' })
      return
    }

    const views = ['Front View', 'Back View', 'Left Side View', 'Right Side View', 'Top/Roof View', 'Isometric View']

    const generationResults = await runWithConcurrency(
      views,
      async (view) => {
        const prompt = `Photorealistic civil-infrastructure concept image of ${modelName} for Pakistan (${province}). Required camera angle: ${view}. Show realistic structural details, drainage, seismic safety elements, and material context. No text labels.`
        const b64 = await generateImageBase64({ prompt, size: '1024x1024' })
        if (!b64) {
          throw new Error(`No image data returned for ${view}`)
        }

        return {
          view,
          imageDataUrl: `data:image/png;base64,${b64}`,
        }
      },
      AI_IMAGE_CONCURRENCY,
    )

    const images = generationResults
      .filter((item) => item?.ok)
      .map((item) => item.value)
      .filter(Boolean)

    if (images.length === 0) {
      const firstError = generationResults.find((item) => item && !item.ok)?.error
      throw (firstError instanceof Error ? firstError : new Error('Infra model view image generation failed.'))
    }

    res.json({
      images,
      partial: images.length < views.length,
      failed: views.length - images.length,
    })
  } catch (error) {
    const message = normalizeAiErrorMessage(error, 'Infra model view image generation failed.')
    res.status(getAiErrorHttpStatus(error)).json({ error: message })
  }
})

app.post('/api/models/structural-design-report', async (req, res) => {
  if (!hasKey) {
    res.status(503).json({
      error: getAiMissingConfigMessage('structural design reporting'),
    })
    return
  }

  try {
    const modelName = String(req.body.modelName ?? '').trim()
    const location = String(req.body.location ?? '').trim()
    const stories = Number(req.body.stories ?? 1)
    const geoTechReport = String(req.body.geoTechReport ?? '').trim()
    const intendedUse = String(req.body.intendedUse ?? 'house').trim()

    if (!modelName || !location || !stories) {
      res.status(400).json({ error: 'modelName, location and stories are required.' })
      return
    }

    const completion = await createChatCompletion({
      openaiModel: OPENAI_MODEL,
      huggingFaceModel: HUGGINGFACE_CHAT_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a structural engineer. Provide a preliminary conceptual report only (not stamped final design). Return strict JSON.',
        },
        {
          role: 'user',
          content:
            `Generate a preliminary structural design report for real-world planning.
Model: ${modelName}
Location: ${location}
Stories: ${stories}
Intended Use: ${intendedUse}
GeoTech Report (optional input): ${geoTechReport || 'Not provided'}

Return strict JSON schema:
{
  "summary": string,
  "designAssumptions": string[],
  "structuralSystem": string,
  "foundationSystem": string,
  "loadPathAndLateralSystem": string,
  "materialSpecifications": string[],
  "preliminaryMemberSizing": string[],
  "floodResilienceMeasures": string[],
  "earthquakeResilienceMeasures": string[],
  "constructionMaterialsBOQ": string[],
  "rateAndCostNotes": string[],
  "codeAndComplianceChecks": string[],
  "limitations": string[]
}. Keep practical for Pakistan and mention that final design needs local licensed engineer review.`,
        },
      ],
    })

    const text = completion.choices[0]?.message?.content ?? ''
    const parsed = extractJson(text)

    res.json({
      summary: String(parsed.summary ?? ''),
      designAssumptions: safeArray(parsed.designAssumptions).map((item) => String(item)),
      structuralSystem: String(parsed.structuralSystem ?? ''),
      foundationSystem: String(parsed.foundationSystem ?? ''),
      loadPathAndLateralSystem: String(parsed.loadPathAndLateralSystem ?? ''),
      materialSpecifications: safeArray(parsed.materialSpecifications).map((item) => String(item)),
      preliminaryMemberSizing: safeArray(parsed.preliminaryMemberSizing).map((item) => String(item)),
      floodResilienceMeasures: safeArray(parsed.floodResilienceMeasures).map((item) => String(item)),
      earthquakeResilienceMeasures: safeArray(parsed.earthquakeResilienceMeasures).map((item) => String(item)),
      constructionMaterialsBOQ: safeArray(parsed.constructionMaterialsBOQ).map((item) => String(item)),
      rateAndCostNotes: safeArray(parsed.rateAndCostNotes).map((item) => String(item)),
      codeAndComplianceChecks: safeArray(parsed.codeAndComplianceChecks).map((item) => String(item)),
      limitations: safeArray(parsed.limitations).map((item) => String(item)),
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = normalizeAiErrorMessage(error, 'Structural design report generation failed.')
    res.status(getAiErrorHttpStatus(error)).json({ error: message })
  }
})

// ========== NEAT (Network Exposure and Assessment Tool) ENDPOINTS ==========

app.get('/api/neat/metadata', handleNEATMetadata)

app.post('/api/neat/analyze', async (req, res) => {
  try {
    await handleNEATAnalyze(req, res)
  } catch (error) {
    console.error('NEAT endpoint error:', error)
    res.status(500).json({
      ok: false,
      error: 'NEAT analysis failed',
      details: error.message
    })
  }
})

// ========== END NEAT ENDPOINTS ==========

// Serve static frontend files from dist directory
const distPath = path.join(repoRootDir, 'dist')
app.use(express.static(distPath))

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error && req.path.startsWith('/api/')) {
    res.status(400).json({ error: 'Invalid JSON payload.' })
    return
  }
  next(error)
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' })
})

// SPA fallback: serve index.html for all non-API routes
app.use((_req, res) => {
  const indexPath = path.join(distPath, 'index.html')
  res.sendFile(indexPath, (error) => {
    if (error) {
      res.status(404).json({ error: 'Frontend not found. Build the frontend first with: npm run build' })
    }
  })
})

app.listen(port, host, () => {
  if (EARTHQUAKE_ALERT_NOTIFIER_ENABLED) {
    startEarthquakeAlertNotifier()
    console.log('Earthquake alert notifier: enabled')
  } else {
    console.log('Earthquake alert notifier: disabled')
  }
  console.log(`Vision API running on http://${host}:${port}`)
})
