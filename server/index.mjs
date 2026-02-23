import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import multer from 'multer'
import OpenAI from 'openai'
import { generateConstructionGuidanceMl, generateGuidanceStepImagesMl } from './ml/constructionGuidanceMl.mjs'
import { predictRetrofitMl } from './ml/retrofitMlModel.mjs'

dotenv.config()

const app = express()
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } })
const port = Number(process.env.VISION_API_PORT ?? 8787)
const model = process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini'
const hasKey = Boolean(process.env.OPENAI_API_KEY)

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

app.get('/health', (_req, res) => {
  res.json({ ok: true, hasVisionKey: hasKey, model })
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
  try {
    const province = String(req.body.province ?? 'Punjab')
    const city = String(req.body.city ?? 'Lahore')
    const hazard = String(req.body.hazard ?? 'flood')
    const structureType = String(req.body.structureType ?? 'Masonry House')
    const bestPracticeName = String(req.body.bestPracticeName ?? 'General Resilient Construction Practice')

    if (!openai) {
      const fallback = generateConstructionGuidanceMl({
        province,
        city,
        hazard,
        structureType,
      })
      res.json(fallback)
      return
    }

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior disaster-resilient construction engineer for Pakistan. Return strict JSON only, with deep and implementation-ready guidance tied to local conditions.',
        },
        {
          role: 'user',
          content:
            `Create location-aware construction guidance for structureType=${structureType} in city=${city}, province=${province}, Pakistan for hazard=${hazard}. Best practice to apply: ${bestPracticeName}. Return strict JSON schema:\n{\n  "summary": string,\n  "materials": string[],\n  "safety": string[],\n  "steps": [\n    {\n      "title": string,\n      "description": string,\n      "keyChecks": string[]\n    }\n  ]\n}. Constraints: 5 steps exactly, each step must be different, practical, and not generic. Every description must include why this step matters for the local city/province hazard context in Pakistan and how it aligns with the named best practice.`,
        },
      ],
    })

    const text = completion.choices[0]?.message?.content ?? ''
    const parsed = extractJson(text)

    res.json({
      summary: String(parsed.summary ?? ''),
      materials: safeArray(parsed.materials).map((item) => String(item)),
      safety: safeArray(parsed.safety).map((item) => String(item)),
      steps: safeArray(parsed.steps)
        .map((step) => ({
          title: String(step?.title ?? ''),
          description: String(step?.description ?? ''),
          keyChecks: safeArray(step?.keyChecks).map((item) => String(item)),
        }))
        .filter((step) => step.title && step.description),
    })
  } catch (error) {
    try {
      const province = String(req.body.province ?? 'Punjab')
      const city = String(req.body.city ?? 'Lahore')
      const hazard = String(req.body.hazard ?? 'flood')
      const structureType = String(req.body.structureType ?? 'Masonry House')

      const fallback = generateConstructionGuidanceMl({
        province,
        city,
        hazard,
        structureType,
      })

      res.json(fallback)
    } catch (fallbackError) {
      const message =
        fallbackError instanceof Error
          ? fallbackError.message
          : error instanceof Error
            ? error.message
            : 'Construction guidance generation failed.'
      res.status(500).json({ error: message })
    }
  }
})

app.post('/api/guidance/step-images', async (req, res) => {
  try {
    const province = String(req.body.province ?? 'Punjab')
    const city = String(req.body.city ?? 'Lahore')
    const hazard = String(req.body.hazard ?? 'flood')
    const structureType = String(req.body.structureType ?? 'Masonry House')
    const bestPracticeName = String(req.body.bestPracticeName ?? 'General Resilient Construction Practice')
    const steps = safeArray(req.body.steps).slice(0, 4)

    if (!openai) {
      const fallbackImages = await generateGuidanceStepImagesMl({
        province,
        city,
        hazard,
        structureType,
        steps,
      })
      res.json({ images: fallbackImages })
      return
    }

    const generatedImages = await Promise.allSettled(
      steps.map(async (step) => {
        const stepTitle = String(step?.title ?? 'Construction Step')
        const stepDescription = String(step?.description ?? '')
        const prompt = `Photorealistic construction scene in ${city}, ${province}, Pakistan for ${structureType}. Hazard: ${hazard}. Best practice: ${bestPracticeName}. Step: ${stepTitle}. Include realistic workers, tools, materials, weather context, and site details. ${stepDescription}`

        const generated = await openai.images.generate({
          model: 'gpt-image-1',
          prompt,
          size: '1024x1024',
        })

        const b64 = generated.data?.[0]?.b64_json
        if (!b64) return null

        return {
          stepTitle,
          prompt,
          imageDataUrl: `data:image/png;base64,${b64}`,
        }
      }),
    )

    const images = generatedImages
      .filter((result) => result.status === 'fulfilled' && result.value)
      .map((result) => result.value)

    if (images.length > 0) {
      res.json({ images })
      return
    }

    const fallbackImages = await generateGuidanceStepImagesMl({
      province,
      city,
      hazard,
      structureType,
      steps,
    })

    res.json({ images: fallbackImages })
  } catch (error) {
    try {
      const province = String(req.body.province ?? 'Punjab')
      const city = String(req.body.city ?? 'Lahore')
      const hazard = String(req.body.hazard ?? 'flood')
      const structureType = String(req.body.structureType ?? 'Masonry House')
      const steps = safeArray(req.body.steps).slice(0, 4)

      const fallbackImages = await generateGuidanceStepImagesMl({
        province,
        city,
        hazard,
        structureType,
        steps,
      })

      res.json({ images: fallbackImages })
    } catch (fallbackError) {
      const message =
        fallbackError instanceof Error
          ? fallbackError.message
          : error instanceof Error
            ? error.message
            : 'Step image generation failed.'
      res.status(500).json({ error: message })
    }
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
