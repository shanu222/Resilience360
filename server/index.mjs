import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer'
import OpenAI from 'openai'
import { predictRetrofitMl } from './ml/retrofitMlModel.mjs'

dotenv.config()

const app = express()
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } })
const port = Number(process.env.PORT ?? process.env.VISION_API_PORT ?? 8787)
const model = process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini'
const hasKey = Boolean(process.env.OPENAI_API_KEY)
const NDMA_ADVISORIES_URL = process.env.NDMA_ADVISORIES_URL ?? 'https://ndma.gov.pk/advisories'
const NDMA_SITREPS_URL = process.env.NDMA_SITREPS_URL ?? 'https://ndma.gov.pk/sitreps'
const NDMA_PROJECTIONS_URL = process.env.NDMA_PROJECTIONS_URL ?? 'https://ndma.gov.pk/projection-impact-list_new'
const PMD_RSS_URL = process.env.PMD_RSS_URL ?? 'https://cap-sources.s3.amazonaws.com/pk-pmd-en/rss.xml'
const PMD_HOME_URL = process.env.PMD_HOME_URL ?? 'https://www.pmd.gov.pk/en'
const PMD_SATELLITE_URL = process.env.PMD_SATELLITE_URL ?? 'https://nwfc.pmd.gov.pk/new/satellite.php'
const PMD_RADAR_URL = process.env.PMD_RADAR_URL ?? 'https://radar.pmd.gov.pk/login'

const openai = hasKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

app.use(cors())
app.use(express.json({ limit: '2mb' }))

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

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim()

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
const mapGuidanceSteps = (value) =>
  safeArray(value)
    .map((step) => ({
      title: String(step?.title ?? ''),
      description: String(step?.description ?? ''),
      keyChecks: safeArray(step?.keyChecks).map((item) => String(item)),
    }))
    .filter((step) => step.title && step.description)
    .slice(0, 5)

const translateGuidanceToUrdu = async (openaiClient, modelName, guidance) => {
  const translationCompletion = await openaiClient.chat.completions.create({
    model: modelName,
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
  res.json({ ok: true, hasVisionKey: hasKey, model })
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

app.get('/api/pmd/live', async (_req, res) => {
  try {
    const [homeHtml, satelliteHtml] = await Promise.all([
      fetchRemoteText(PMD_HOME_URL),
      fetchRemoteText(PMD_SATELLITE_URL),
    ])

    const cities = parsePmdCityTemperatures(homeHtml)
    const satelliteImageUrl = parsePmdSatelliteImage(satelliteHtml)

    res.json({
      source: 'PMD',
      updatedAt: new Date().toISOString(),
      cities,
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
  if (!openai) {
    res.status(503).json({
      error:
        'OpenAI key missing. Set OPENAI_API_KEY in your environment to enable deep vision analysis.',
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

    const completion = await openai.chat.completions.create({
      model,
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
    res.status(500).json({ error: message })
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

app.post('/api/guidance/construction', async (req, res) => {
  if (!openai) {
    res.status(503).json({ error: 'OpenAI key missing. Set OPENAI_API_KEY for AI construction guidance.' })
    return
  }

  try {
    const province = String(req.body.province ?? 'Punjab')
    const city = String(req.body.city ?? 'Lahore')
    const hazard = String(req.body.hazard ?? 'flood')
    const structureType = String(req.body.structureType ?? 'Masonry House')
    const bestPracticeName = String(req.body.bestPracticeName ?? 'General Resilient Construction Practice')

    const completion = await openai.chat.completions.create({
      model,
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

    const translated = await translateGuidanceToUrdu(openai, model, englishGuidance)

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
  if (!openai) {
    res.status(503).json({ error: 'OpenAI key missing. Set OPENAI_API_KEY for AI step images.' })
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
          const generated = await openai.images.generate({
            model: 'gpt-image-1',
            prompt,
            size: 'auto',
          })

          const b64 = generated.data?.[0]?.b64_json
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
  if (!openai) {
    res.status(503).json({ error: 'OpenAI key missing. Set OPENAI_API_KEY for AI advisory answers.' })
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

    const completion = await openai.chat.completions.create({
      model,
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

app.post('/api/models/resilience-catalog', async (req, res) => {
  if (!openai) {
    res.status(503).json({
      error: 'OpenAI key missing. Set OPENAI_API_KEY to enable AI infra model catalog.',
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
      const imageResult = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1024',
      })

      const imageBase64 = imageResult.data?.[0]?.b64_json
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
  if (!openai) {
    res.status(503).json({
      error: 'OpenAI key missing. Set OPENAI_API_KEY to enable infra model research.',
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

    const completion = await openai.chat.completions.create({
      model,
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
  if (!openai) {
    res.status(503).json({
      error: 'OpenAI key missing. Set OPENAI_API_KEY to enable infra model view image generation.',
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
      const generated = await openai.images.generate({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1024',
      })

      const b64 = generated.data?.[0]?.b64_json
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
  if (!openai) {
    res.status(503).json({
      error: 'OpenAI key missing. Set OPENAI_API_KEY to enable structural design reporting.',
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

    const completion = await openai.chat.completions.create({
      model,
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
