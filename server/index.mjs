import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import fs from 'node:fs/promises'
import multer from 'multer'
import path from 'node:path'
import OpenAI from 'openai'
import { fileURLToPath } from 'node:url'
import { predictRetrofitMl, retrainRetrofitMlModel } from './ml/retrofitMlModel.mjs'

dotenv.config()

const app = express()
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } })
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const port = Number(process.env.PORT ?? process.env.VISION_API_PORT ?? 8787)
const AI_PROVIDER = String(process.env.AI_PROVIDER ?? 'openai').trim().toLowerCase()
const selectedAiProvider = AI_PROVIDER === 'huggingface' ? 'huggingface' : 'openai'
const OPENAI_FALLBACK_TO_HUGGINGFACE = String(process.env.OPENAI_FALLBACK_TO_HUGGINGFACE ?? 'true').trim().toLowerCase() !== 'false'
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY ?? '').trim()
const OPENAI_MODEL = String(process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini').trim()
const HUGGINGFACE_API_KEY = String(process.env.HUGGINGFACE_API_KEY ?? '').trim()
const HUGGINGFACE_BASE_URL = String(process.env.HUGGINGFACE_BASE_URL ?? 'https://router.huggingface.co/v1').trim()
const HUGGINGFACE_CHAT_MODEL = String(process.env.HUGGINGFACE_CHAT_MODEL ?? 'meta-llama/Llama-3.1-8B-Instruct').trim()
const HUGGINGFACE_VISION_MODEL = String(process.env.HUGGINGFACE_VISION_MODEL ?? HUGGINGFACE_CHAT_MODEL).trim()
const HUGGINGFACE_IMAGE_MODEL = String(process.env.HUGGINGFACE_IMAGE_MODEL ?? 'black-forest-labs/FLUX.1-dev').trim()
const model = selectedAiProvider === 'huggingface' ? HUGGINGFACE_CHAT_MODEL : OPENAI_MODEL
const hasKey = selectedAiProvider === 'huggingface' ? Boolean(HUGGINGFACE_API_KEY) : Boolean(OPENAI_API_KEY)
const hasHuggingFaceFallback = OPENAI_FALLBACK_TO_HUGGINGFACE && Boolean(HUGGINGFACE_API_KEY)
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
const RECOVERY_EMAIL_PROVIDER = String(process.env.RECOVERY_EMAIL_PROVIDER ?? '').trim().toLowerCase()
const RECOVERY_FROM_EMAIL = String(process.env.RECOVERY_FROM_EMAIL ?? '').trim()
const RECOVERY_FROM_NAME = String(process.env.RECOVERY_FROM_NAME ?? 'Resilience360 Recovery').trim()
const RESEND_API_KEY = String(process.env.RESEND_API_KEY ?? '').trim()
const BREVO_API_KEY = String(process.env.BREVO_API_KEY ?? '').trim()
const COMMUNITY_ISSUES_ADMIN_TOKEN = String(process.env.COMMUNITY_ISSUES_ADMIN_TOKEN ?? '').trim()
const RECOVERY_RATE_LIMIT_WINDOW_MS = Math.max(60_000, Number(process.env.RECOVERY_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000) || 15 * 60 * 1000)
const RECOVERY_RATE_LIMIT_MAX_REQUESTS = Math.max(1, Number(process.env.RECOVERY_RATE_LIMIT_MAX_REQUESTS ?? 6) || 6)
const recoveryRateLimitStore = new Map()
const retrofitTrainingDir = path.join(__dirname, 'ml', 'training')
const retrofitTrainingImagesDir = path.join(retrofitTrainingDir, 'images')
const retrofitTrainingDataFile = path.join(retrofitTrainingDir, 'userRetrofitTrainingData.json')
const communityIssuesDir = path.join(__dirname, 'data', 'community-issues')
const communityIssueImagesDir = path.join(communityIssuesDir, 'images')
const communityIssuesDataFile = path.join(communityIssuesDir, 'issues.json')
const allowedCommunityIssueStatuses = new Set(['Submitted', 'In Review', 'In Progress', 'Resolved', 'Rejected'])

const openai = selectedAiProvider === 'openai' && OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null
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
    throw new Error('Could not parse structured JSON response')
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

const createChatCompletion = async ({ messages, temperature = 0.2, openaiModel = OPENAI_MODEL, huggingFaceModel = HUGGINGFACE_CHAT_MODEL }) => {
  if (selectedAiProvider === 'huggingface') {
    if (!huggingFaceRouterClient) {
      throw new Error(getAiMissingConfigMessage('AI chat requests'))
    }
    return huggingFaceRouterClient.chat.completions.create({
      model: huggingFaceModel,
      temperature,
      messages,
    })
  }

  if (!openai) {
    throw new Error(getAiMissingConfigMessage('AI chat requests'))
  }

  try {
    return await openai.chat.completions.create({
      model: openaiModel,
      temperature,
      messages,
    })
  } catch (error) {
    if (!hasHuggingFaceFallback || !huggingFaceRouterClient || !isOpenAiLimitError(error)) {
      throw error
    }

    return huggingFaceRouterClient.chat.completions.create({
      model: huggingFaceModel,
      temperature,
      messages,
    })
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

const generateImageBase64 = async ({ prompt, size = '1024x1024' }) => {
  const generateWithHuggingFace = async () => {
    if (!HUGGINGFACE_API_KEY) {
      throw new Error('Hugging Face key missing. Set HUGGINGFACE_API_KEY for AI image generation.')
    }

    const { width, height } = parseImageSize(size)
    const response = await fetch(`https://api-inference.huggingface.co/models/${HUGGINGFACE_IMAGE_MODEL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'image/png',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          width,
          height,
        },
      }),
    })

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!response.ok || contentType.includes('application/json')) {
      const errorBody = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => '')
      const errorText =
        typeof errorBody === 'string'
          ? errorBody
          : errorBody?.error || errorBody?.message || JSON.stringify(errorBody ?? {})
      throw new Error(`Hugging Face image generation failed (${response.status}): ${errorText}`)
    }

    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer).toString('base64')
  }

  if (selectedAiProvider === 'huggingface') {
    return generateWithHuggingFace()
  }

  if (!openai) {
    throw new Error(getAiMissingConfigMessage('AI image generation'))
  }

  try {
    const generated = await openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      size,
    })

    return generated.data?.[0]?.b64_json ?? null
  } catch (error) {
    if (!hasHuggingFaceFallback || !isOpenAiLimitError(error)) {
      throw error
    }
    return generateWithHuggingFace()
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
  })
})

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

app.get('/api/global-earthquakes', async (_req, res) => {
  const candidates = [GLOBAL_EARTHQUAKE_FEED_URL, GLOBAL_EARTHQUAKE_FEED_URL_BACKUP]

  for (const candidate of candidates) {
    try {
      const payload = await fetchRemoteJson(candidate, 22000)
      const features = safeArray(payload?.features)

      if (features.length === 0) {
        continue
      }

      res.setHeader('Cache-Control', 'no-store')
      res.json({
        source: 'USGS',
        feedUrl: candidate,
        fetchedAt: new Date().toISOString(),
        features,
      })
      return
    } catch {
      // try next source
    }
  }

  res.status(502).json({ error: 'Unable to fetch global earthquake feed from upstream sources.' })
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
    const parsed = extractJson(text)

    res.json({
      model,
      analyzedAt: new Date().toISOString(),
      ...parsed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Vision analysis failed.'
    const statusFromProvider =
      typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
        ? error.status
        : undefined
    const isQuotaError = /\b429\b|quota|insufficient_quota|billing|rate\s*limit/i.test(message)
    const status = statusFromProvider ?? (isQuotaError ? 429 : 500)
    res.status(status).json({ error: message })
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
    const message = error instanceof Error ? error.message : 'Construction guidance generation failed.'
    res.status(500).json({ error: message })
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
            size: 'auto',
          })

          if (!b64) {
            lastError = new Error('No image data returned')
            continue
          }

          return {
            stepTitle,
            prompt,
            imageDataUrl: `data:image/png;base64,${b64}`,
          }
        } catch (error) {
          lastError = error
        }
      }

      throw (lastError instanceof Error ? lastError : new Error(`Image generation failed for step: ${stepTitle}`))
    }

    const imageTasks = steps.map(async (step) => {
      const stepTitle = String(step?.title ?? 'Construction Step')
      const stepDescription = String(step?.description ?? '')
      return generateStepImage(stepTitle, stepDescription)
    })

    const images = await Promise.all(imageTasks)

    res.json({ images })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Step image generation failed.'
    res.status(500).json({ error: message })
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
    const message = error instanceof Error ? error.message : 'Advisory generation failed.'
    res.status(500).json({ error: message })
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

    const models = []

    for (const spec of modelSpecs) {
      const prompt = `Photorealistic infrastructure visualization for ${spec.title} in ${country} (${province}). Show realistic construction context, local materials, climate-appropriate design, and civil engineering details. No text overlays.`
      const imageBase64 = await generateImageBase64({ prompt, size: '1024x1024' })
      if (!imageBase64) continue

      models.push({
        ...spec,
        imageDataUrl: `data:image/png;base64,${imageBase64}`,
      })
    }

    res.json({ models })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Infra model generation failed.'
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
    const message = error instanceof Error ? error.message : 'Infra model research failed.'
    res.status(500).json({ error: message })
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
    const images = []

    for (const view of views) {
      const prompt = `Photorealistic civil-infrastructure concept image of ${modelName} for Pakistan (${province}). Required camera angle: ${view}. Show realistic structural details, drainage, seismic safety elements, and material context. No text labels.`
      const b64 = await generateImageBase64({ prompt, size: '1024x1024' })
      if (!b64) continue

      images.push({
        view,
        imageDataUrl: `data:image/png;base64,${b64}`,
      })
    }

    res.json({ images })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Infra model view image generation failed.'
    res.status(500).json({ error: message })
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
    const message = error instanceof Error ? error.message : 'Structural design report generation failed.'
    res.status(500).json({ error: message })
  }
})

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

app.listen(port, () => {
  console.log(`Vision API running on http://localhost:${port}`)
})
