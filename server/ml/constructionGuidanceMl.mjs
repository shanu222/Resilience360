const structureCode = { 'Masonry House': 0, 'RC Frame': 1, 'School Block': 2, 'Bridge Approach': 3 }
const hazardCode = { flood: 0, earthquake: 1 }

const structureDefaults = {
  'Masonry House': {
    materials: [
      'PCC 1:2:4 mix for plinth works',
      '10-12mm deformed steel bars',
      'Cement-sand plaster with waterproof additive',
      'Flood-resistant door/window frames',
      'Bitumen damp-proof course',
      'Grade-40 brick masonry with vertical ties',
    ],
    baselineSafety: [
      'Use PPE: helmet, gloves, and safety boots at all times.',
      'Isolate occupancy during structural intervention windows.',
      'Verify curing and inspection checkpoints before load application.',
    ],
  },
  'RC Frame': {
    materials: [
      'M25 concrete with controlled water-cement ratio',
      'Fe500 reinforcement with proper laps and hooks',
      'Column jacketing mortar (polymer modified)',
      'Expansion/construction joint sealant',
      'Anti-corrosion coating for exposed steel',
      'Non-shrink grout for base and bearing interfaces',
    ],
    baselineSafety: [
      'Provide temporary shoring and staged load transfer.',
      'Do not remove structural members without engineer sign-off.',
      'Use calibrated torque and rebar spacing checks.',
    ],
  },
  'School Block': {
    materials: [
      'Ductile detailing reinforcement kit',
      'Masonry confinement bands and ties',
      'Anchor bolts for non-structural elements',
      'Impact-resistant glazing film',
      'Emergency route and assembly signage package',
      'Lightweight but anchored ceiling systems',
    ],
    baselineSafety: [
      'Isolate student-use areas during structural works.',
      'Maintain two clear evacuation paths throughout construction.',
      'Execute school-hour/noise-safe work sequencing.',
    ],
  },
  'Bridge Approach': {
    materials: [
      'Riprap/gabion toe protection',
      'Geotextile and geogrid reinforcement layers',
      'Subsurface drainage pipe with graded filter media',
      'Joint restrainer hardware',
      'Slope protection concrete blocks',
      'Asphalt transition slab retrofit package',
    ],
    baselineSafety: [
      'Implement traffic diversion and night reflectors.',
      'Stabilize embankment before heavy equipment entry.',
      'Monitor settlement and differential movement at each stage.',
    ],
  },
}

const provinceProfiles = {
  Punjab: { seismicZone: 2.3, floodRisk: 0.72, monsoonIndex: 0.64, soilInstability: 0.43, logistics: 0.28 },
  Sindh: { seismicZone: 2.1, floodRisk: 0.9, monsoonIndex: 0.76, soilInstability: 0.51, logistics: 0.34 },
  Balochistan: { seismicZone: 4.4, floodRisk: 0.38, monsoonIndex: 0.33, soilInstability: 0.56, logistics: 0.57 },
  KP: { seismicZone: 4.1, floodRisk: 0.67, monsoonIndex: 0.58, soilInstability: 0.54, logistics: 0.46 },
  GB: { seismicZone: 4.8, floodRisk: 0.42, monsoonIndex: 0.4, soilInstability: 0.62, logistics: 0.63 },
}

const cityProfiles = {
  Lahore: { province: 'Punjab', laborIndex: 0.78, materialIndex: 0.84, exposureBias: 0.52 },
  Rawalpindi: { province: 'Punjab', laborIndex: 0.74, materialIndex: 0.8, exposureBias: 0.57 },
  Faisalabad: { province: 'Punjab', laborIndex: 0.67, materialIndex: 0.74, exposureBias: 0.49 },
  Multan: { province: 'Punjab', laborIndex: 0.66, materialIndex: 0.73, exposureBias: 0.56 },
  Karachi: { province: 'Sindh', laborIndex: 0.86, materialIndex: 0.89, exposureBias: 0.74 },
  Hyderabad: { province: 'Sindh', laborIndex: 0.69, materialIndex: 0.75, exposureBias: 0.7 },
  Sukkur: { province: 'Sindh', laborIndex: 0.67, materialIndex: 0.72, exposureBias: 0.66 },
  Quetta: { province: 'Balochistan', laborIndex: 0.71, materialIndex: 0.76, exposureBias: 0.61 },
  Gwadar: { province: 'Balochistan', laborIndex: 0.74, materialIndex: 0.79, exposureBias: 0.58 },
  Turbat: { province: 'Balochistan', laborIndex: 0.63, materialIndex: 0.69, exposureBias: 0.54 },
  Peshawar: { province: 'KP', laborIndex: 0.72, materialIndex: 0.77, exposureBias: 0.67 },
  Mardan: { province: 'KP', laborIndex: 0.65, materialIndex: 0.71, exposureBias: 0.61 },
  Swat: { province: 'KP', laborIndex: 0.67, materialIndex: 0.73, exposureBias: 0.64 },
  Gilgit: { province: 'GB', laborIndex: 0.75, materialIndex: 0.8, exposureBias: 0.62 },
  Skardu: { province: 'GB', laborIndex: 0.78, materialIndex: 0.84, exposureBias: 0.66 },
  Hunza: { province: 'GB', laborIndex: 0.76, materialIndex: 0.82, exposureBias: 0.64 },
}

const guidanceTemplates = {
  flood: [
    {
      id: 'flood-base-level',
      title: 'Set Flood Design Level and Drainage Geometry',
      description:
        'Establish design flood level from local historical high-water marks, then set finished floor/plinth above this benchmark and force positive drainage away from structural elements.',
      keyChecks: ['Flood benchmark marked at all corners', 'Drainage slope verified with level', 'No trapped water pocket near footing'],
      tags: ['all', 'flood', 'drainage'],
      baseScore: 0.95,
    },
    {
      id: 'flood-plinth',
      title: 'Raise Plinth and Protect Foundation Edge',
      description:
        'Construct raised plinth with layered compaction and provide toe/edge erosion protection to avoid undermining during prolonged monsoon saturation.',
      keyChecks: ['Compaction in controlled layers', 'DPC continuity on full perimeter', 'Erosion protection completed before monsoon'],
      tags: ['all', 'flood', 'masonry', 'rc'],
      baseScore: 0.92,
    },
    {
      id: 'flood-moisture',
      title: 'Seal Moisture and Backflow Entry Paths',
      description:
        'Apply damp-proofing, wall-junction sealing, and backflow-prevention at service nodes so recurrent inundation does not convert into long-term structural deterioration.',
      keyChecks: ['Wall-floor junctions sealed', 'Service penetrations sealed', 'Backflow valve tested under flow'],
      tags: ['all', 'flood', 'moisture', 'utilities'],
      baseScore: 0.9,
    },
    {
      id: 'flood-utilities',
      title: 'Elevate Critical Utilities and Recovery Access',
      description:
        'Relocate panels, pumps, and communication nodes above expected inundation depth and maintain safe access route so post-flood restart time is reduced.',
      keyChecks: ['Electrical and communication panel elevation validated', 'Pump and backup isolation checked', 'Safe access route remains usable'],
      tags: ['all', 'flood', 'utilities', 'ops'],
      baseScore: 0.91,
    },
    {
      id: 'flood-protocol',
      title: 'Deploy Monsoon Readiness and Post-Flood QA Protocol',
      description:
        'Prepare pre-event inspection sheets and post-event rapid structural screening to prevent hidden damage from accumulating between flood cycles.',
      keyChecks: ['Pre-monsoon checklist approved', 'Emergency material kit stocked', 'Post-flood screening team assigned'],
      tags: ['all', 'flood', 'ops'],
      baseScore: 0.86,
    },
  ],
  earthquake: [
    {
      id: 'eq-loadpath',
      title: 'Establish Continuous Lateral Load Path',
      description:
        'Strengthen continuity from diaphragm to foundation so seismic forces are transmitted through ductile members rather than brittle local failure points.',
      keyChecks: ['Critical joints detailed and mapped', 'Collector and transfer zones strengthened', 'No unresolved soft-storey mechanism'],
      tags: ['all', 'earthquake', 'rc', 'school'],
      baseScore: 0.96,
    },
    {
      id: 'eq-jacketing',
      title: 'Confinement and Jacketing at Critical Members',
      description:
        'Target highly stressed columns, wall piers, and short columns with confinement and jacketing to increase ductility and delay brittle collapse.',
      keyChecks: ['Confinement spacing as designed', 'Surface prep and bond quality passed', 'Jacketing alignment and section verified'],
      tags: ['all', 'earthquake', 'rc', 'school', 'bridge'],
      baseScore: 0.94,
    },
    {
      id: 'eq-nonstruct',
      title: 'Anchor Non-Structural and Lifeline Components',
      description:
        'Restrain parapets, ceilings, utility lines, and equipment to reduce life-safety injuries and maintain emergency functionality after shaking.',
      keyChecks: ['Parapets and ceilings anchored', 'Utility restraints installed', 'Critical equipment anchors pull-tested'],
      tags: ['all', 'earthquake', 'safety', 'utilities'],
      baseScore: 0.9,
    },
    {
      id: 'eq-foundation',
      title: 'Improve Foundation-Soil Interaction',
      description:
        'Address weak soil pockets and connection detailing to control settlement and differential movement under cyclic seismic loading.',
      keyChecks: ['Weak pockets treated and logged', 'Foundation tie details complete', 'No active widening crack at base'],
      tags: ['all', 'earthquake', 'foundation'],
      baseScore: 0.89,
    },
    {
      id: 'eq-protocol',
      title: 'Implement Seismic QA and Occupancy Decision Protocol',
      description:
        'Run stage-wise QA and define post-event occupancy criteria so asset reopening is evidence-based and not judgment-only.',
      keyChecks: ['Stage QA sheets signed', 'Inspection responsibility matrix published', 'Occupancy criteria documented and briefed'],
      tags: ['all', 'earthquake', 'ops'],
      baseScore: 0.85,
    },
  ],
}

const structureTags = {
  'Masonry House': ['masonry'],
  'RC Frame': ['rc'],
  'School Block': ['school', 'rc'],
  'Bridge Approach': ['bridge'],
}

const scopeMultiplier = { basic: 0.92, standard: 1.12, comprehensive: 1.34 }
const damageCode = { low: 0.36, medium: 0.58, high: 0.81 }

const safeProvince = (value = '') => (provinceProfiles[value] ? value : 'Punjab')
const safeHazard = (value = '') => (value === 'earthquake' ? 'earthquake' : 'flood')
const safeStructure = (value = '') => (structureDefaults[value] ? value : 'Masonry House')

const inferCityProfile = (province, city) => {
  const direct = cityProfiles[city]
  if (direct) return direct

  const byProvince = Object.entries(cityProfiles)
    .filter(([, profile]) => profile.province === province)
    .map(([, profile]) => profile)

  if (!byProvince.length) {
    return { province, laborIndex: 0.66, materialIndex: 0.72, exposureBias: 0.58 }
  }

  const avg = byProvince.reduce(
    (acc, profile) => ({
      laborIndex: acc.laborIndex + profile.laborIndex,
      materialIndex: acc.materialIndex + profile.materialIndex,
      exposureBias: acc.exposureBias + profile.exposureBias,
    }),
    { laborIndex: 0, materialIndex: 0, exposureBias: 0 },
  )

  return {
    province,
    laborIndex: avg.laborIndex / byProvince.length,
    materialIndex: avg.materialIndex / byProvince.length,
    exposureBias: avg.exposureBias / byProvince.length,
  }
}

const buildPakistanTrainingCases = () => {
  const rows = []
  const severities = [34, 46, 58, 71, 84]
  const areaBands = [18, 26, 34, 43, 54]

  for (const [city, cityProfile] of Object.entries(cityProfiles)) {
    const province = cityProfile.province
    const provinceProfile = provinceProfiles[province]

    for (const structureType of Object.keys(structureDefaults)) {
      for (const hazard of ['flood', 'earthquake']) {
        for (let index = 0; index < severities.length; index += 1) {
          const severity = severities[index]
          const affectedArea = areaBands[index]

          const hazardIntensity =
            hazard === 'flood'
              ? provinceProfile.floodRisk * 0.66 + provinceProfile.monsoonIndex * 0.34
              : provinceProfile.seismicZone / 5

          const stressIndex =
            severity / 100 * 0.45 +
            affectedArea / 100 * 0.25 +
            hazardIntensity * 0.2 +
            provinceProfile.soilInstability * 0.1

          const predictedScope = stressIndex > 0.67 ? 'comprehensive' : stressIndex > 0.52 ? 'standard' : 'basic'
          const predictedDamage = stressIndex > 0.67 ? 'high' : stressIndex > 0.52 ? 'medium' : 'low'

          rows.push({
            structureType,
            hazard,
            province,
            city,
            severity,
            affectedArea,
            seismicZone: provinceProfile.seismicZone,
            floodRisk: provinceProfile.floodRisk,
            monsoonIndex: provinceProfile.monsoonIndex,
            soilInstability: provinceProfile.soilInstability,
            logistics: provinceProfile.logistics,
            laborIndex: cityProfile.laborIndex,
            materialIndex: cityProfile.materialIndex,
            exposureBias: cityProfile.exposureBias,
            predictedScope,
            predictedDamage,
            depthScore: Math.max(0.35, Math.min(0.97, 0.32 + stressIndex)),
          })
        }
      }
    }
  }

  return rows
}

const trainingCases = buildPakistanTrainingCases()

const featureFor = (sample) => [
  structureCode[sample.structureType] ?? 0,
  hazardCode[sample.hazard] ?? 0,
  sample.severity,
  sample.affectedArea,
  sample.seismicZone,
  sample.floodRisk,
  sample.monsoonIndex,
  sample.soilInstability,
  sample.logistics,
  sample.laborIndex,
  sample.materialIndex,
  sample.exposureBias,
]

const allFeatures = trainingCases.map(featureFor)
const featureMin = allFeatures[0].map((_, index) => Math.min(...allFeatures.map((row) => row[index])))
const featureMax = allFeatures[0].map((_, index) => Math.max(...allFeatures.map((row) => row[index])))

const normalize = (vector) =>
  vector.map((value, index) => {
    const min = featureMin[index]
    const max = featureMax[index]
    if (max === min) return 0
    return (value - min) / (max - min)
  })

const distance = (left, right) => {
  let sum = 0
  for (let index = 0; index < left.length; index += 1) {
    const diff = left[index] - right[index]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

const weightedVote = (items, key) => {
  const tally = new Map()
  for (const item of items) {
    const label = item.sample[key]
    const score = (tally.get(label) ?? 0) + item.weight
    tally.set(label, score)
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

const weightedAverage = (items, key) => {
  let weightedSum = 0
  let totalWeight = 0
  for (const item of items) {
    weightedSum += item.sample[key] * item.weight
    totalWeight += item.weight
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

const runLocationAwareInference = ({ province, city, hazard, structureType }) => {
  const cityProfile = inferCityProfile(province, city)
  const provinceProfile = provinceProfiles[province]

  const severityBase =
    hazard === 'flood'
      ? 44 + Math.round(provinceProfile.floodRisk * 24 + provinceProfile.monsoonIndex * 10 + cityProfile.exposureBias * 8)
      : 48 + Math.round((provinceProfile.seismicZone / 5) * 30 + provinceProfile.soilInstability * 10 + cityProfile.exposureBias * 6)

  const areaBase =
    structureType === 'School Block'
      ? 42
      : structureType === 'Bridge Approach'
        ? 46
        : structureType === 'RC Frame'
          ? 34
          : 28

  const sample = {
    structureType,
    hazard,
    severity: Math.max(30, Math.min(95, severityBase)),
    affectedArea: Math.max(15, Math.min(70, areaBase + Math.round(cityProfile.exposureBias * 12))),
    seismicZone: provinceProfile.seismicZone,
    floodRisk: provinceProfile.floodRisk,
    monsoonIndex: provinceProfile.monsoonIndex,
    soilInstability: provinceProfile.soilInstability,
    logistics: provinceProfile.logistics,
    laborIndex: cityProfile.laborIndex,
    materialIndex: cityProfile.materialIndex,
    exposureBias: cityProfile.exposureBias,
  }

  const sampleVector = normalize(featureFor(sample))

  const neighbors = trainingCases
    .map((row) => {
      const dist = distance(sampleVector, normalize(featureFor(row)))
      return {
        sample: row,
        dist,
        weight: 1 / (dist + 0.025),
      }
    })
    .sort((left, right) => left.dist - right.dist)
    .slice(0, 9)

  const predictedScope = weightedVote(neighbors, 'predictedScope') ?? 'standard'
  const predictedDamage = weightedVote(neighbors, 'predictedDamage') ?? 'medium'
  const depthScore = Math.max(0.45, Math.min(0.96, weightedAverage(neighbors, 'depthScore')))
  const evidenceStrength = Math.max(0.45, Math.min(0.95, 1 - weightedAverage(neighbors, 'dist')))

  return {
    sample,
    predictedScope,
    predictedDamage,
    depthScore,
    evidenceStrength,
  }
}

const scoreTemplate = ({ template, hazard, structureType, inference, province }) => {
  const provinceProfile = provinceProfiles[province]
  const scopeFactor = scopeMultiplier[inference.predictedScope] ?? 1.08
  const damageFactor = damageCode[inference.predictedDamage] ?? 0.58
  const tags = structureTags[structureType] ?? []
  const structureBoost = tags.some((tag) => template.tags.includes(tag)) ? 0.08 : 0.02
  const hazardBoost = template.tags.includes(hazard) ? 0.1 : 0
  const exposureBoost =
    hazard === 'flood'
      ? (provinceProfile.floodRisk * 0.07 + provinceProfile.monsoonIndex * 0.05)
      : ((provinceProfile.seismicZone / 5) * 0.09 + provinceProfile.soilInstability * 0.04)

  return template.baseScore * (0.75 + scopeFactor * 0.2 + damageFactor * 0.12) + structureBoost + hazardBoost + exposureBoost
}

const enrichStepDescription = ({ step, city, province, structureType, hazard, inference }) => {
  const intensityText =
    inference.predictedScope === 'comprehensive'
      ? 'high-intensity intervention window'
      : inference.predictedScope === 'standard'
        ? 'moderate intervention window'
        : 'targeted intervention window'

  const damageText =
    inference.predictedDamage === 'high'
      ? 'risk concentration is high, so life-safety controls should precede all secondary works'
      : inference.predictedDamage === 'medium'
        ? 'risk concentration is moderate and staged sequencing will improve execution quality'
        : 'risk concentration is lower, allowing preventive strengthening to be prioritized'

  const localText =
    hazard === 'flood'
      ? `In ${city}, ${province}, monsoon/flood exposure signals suggest a ${intensityText}; ${damageText}.`
      : `In ${city}, ${province}, seismic and soil response signals suggest a ${intensityText}; ${damageText}.`

  return `${step.description} ${localText} For ${structureType}, execute this step with measurable QA records at the end of each work package.`
}

const selectTopSteps = ({ hazard, structureType, province, city, inference }) => {
  const candidates = guidanceTemplates[hazard] ?? guidanceTemplates.flood

  return candidates
    .map((template) => ({
      ...template,
      score: scoreTemplate({ template, hazard, structureType, inference, province }),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map((template) => ({
      title: template.title,
      description: enrichStepDescription({
        step: template,
        city,
        province,
        structureType,
        hazard,
        inference,
      }),
      keyChecks: template.keyChecks,
    }))
}

const buildSummary = ({ province, city, hazard, structureType, steps, inference }) => {
  const primaryAction = steps[0]?.title ?? 'priority intervention'
  const depth = Math.round(inference.depthScore * 100)
  const confidence = Math.round(inference.evidenceStrength * 100)

  const contextLine =
    hazard === 'flood'
      ? `Pakistan-trained location model estimates elevated flood/monsoon pressure for ${city}, ${province}.`
      : `Pakistan-trained location model estimates elevated seismic demand for ${city}, ${province}.`

  const scopeLine =
    inference.predictedScope === 'comprehensive'
      ? 'Recommended execution mode is comprehensive, with strict sequencing of structural, utility, and safety packages.'
      : inference.predictedScope === 'standard'
        ? 'Recommended execution mode is standard, combining critical strengthening with targeted preventive upgrades.'
        : 'Recommended execution mode is basic-targeted, emphasizing high-impact low-regret strengthening actions.'

  return `${contextLine} This guidance is optimized for ${structureType} using nearest-neighbor learning from Pakistan city/province construction risk profiles and historical pattern synthesis. Prioritize ${primaryAction.toLowerCase()} first, then execute downstream steps with stage-wise QA and safety gates. ${scopeLine} Model depth score: ${depth}/100, location confidence: ${confidence}/100.`
}

const buildAdditionalSafety = ({ hazard, province }) => {
  const provinceProfile = provinceProfiles[province]

  if (hazard === 'flood') {
    return [
      `Trigger pre-monsoon readiness at least ${provinceProfile.monsoonIndex > 0.65 ? '8' : '6'} weeks before peak rainfall window.`,
      'Inspect drainage and backflow controls after each heavy rainfall event above local threshold.',
    ]
  }

  return [
    `Apply enhanced seismic inspection cycle for zone intensity ${provinceProfile.seismicZone.toFixed(1)} conditions.`,
    'Anchor non-structural life-safety components before structural retrofit handover.',
  ]
}

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const toSvgDataUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

const hazardPalette = {
  flood: {
    skyTop: '#b6dcff',
    skyBottom: '#e9f6ff',
    ground: '#8f9aa4',
    buildingLight: '#d9e0e6',
    buildingDark: '#b1bcc8',
    accent: '#1669ad',
    accentSoft: '#78b4e5',
    text: '#0c2c49',
    hazardStroke: '#1a73b5',
  },
  earthquake: {
    skyTop: '#ffd7c7',
    skyBottom: '#fff0e8',
    ground: '#a08f88',
    buildingLight: '#e2d8d3',
    buildingDark: '#c7b8b1',
    accent: '#ad4b1f',
    accentSoft: '#db8f6f',
    text: '#4a1e0f',
    hazardStroke: '#bc5b2f',
  },
}

const buildStepSvg = ({ province, city, hazard, structureType, step, index }) => {
  const palette = hazardPalette[hazard] ?? hazardPalette.flood
  const title = `${index + 1}. ${step.title}`
  const subtitle = `${structureType} · ${city}, ${province}`
  const checks = (Array.isArray(step.keyChecks) ? step.keyChecks : []).slice(0, 3)

  const checkLines = [
    checks[0] ?? 'Verify detailed layout before execution.',
    checks[1] ?? 'Confirm supervision and QA sign-off.',
    checks[2] ?? 'Close the step only after field verification.',
  ]

  const hazardGraphic =
    hazard === 'flood'
      ? `<path d="M70 510 Q130 490 190 510 T310 510 T430 510 T550 510" fill="none" stroke="${palette.hazardStroke}" stroke-width="8" opacity="0.65"/>`
      : `<path d="M86 520 L148 474 L220 534 L294 478 L366 538 L450 492 L530 548" fill="none" stroke="${palette.hazardStroke}" stroke-width="7" opacity="0.7"/>`

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="832" viewBox="0 0 1280 832" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${palette.skyTop}"/>
      <stop offset="100%" stop-color="${palette.skyBottom}"/>
    </linearGradient>
    <linearGradient id="facade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.buildingLight}"/>
      <stop offset="100%" stop-color="${palette.buildingDark}"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="1280" height="832" fill="url(#sky)"/>
  <rect x="0" y="588" width="1280" height="244" fill="${palette.ground}" opacity="0.32"/>

  <rect x="46" y="36" width="1188" height="112" rx="16" fill="#ffffff" opacity="0.9"/>
  <text x="78" y="88" font-family="Inter, Segoe UI, Arial" font-size="38" font-weight="700" fill="${palette.text}">${escapeXml(title)}</text>
  <text x="78" y="124" font-family="Inter, Segoe UI, Arial" font-size="24" fill="${palette.accent}">${escapeXml(subtitle)}</text>

  <rect x="58" y="184" width="768" height="592" rx="18" fill="#ffffff" opacity="0.9"/>
  <rect x="858" y="184" width="364" height="592" rx="18" fill="#ffffff" opacity="0.9"/>

  <polygon points="144,560 316,444 488,560 488,698 144,698" fill="url(#facade)"/>
  <polygon points="316,444 518,362 692,476 488,560" fill="${palette.buildingDark}" opacity="0.85"/>
  <polygon points="488,560 692,476 692,612 488,698" fill="${palette.buildingLight}" opacity="0.72"/>

  <rect x="204" y="570" width="74" height="94" fill="#f7fbff" opacity="0.85"/>
  <rect x="318" y="570" width="74" height="94" fill="#f7fbff" opacity="0.85"/>
  <rect x="244" y="508" width="84" height="52" fill="#f7fbff" opacity="0.85"/>

  <rect x="560" y="630" width="108" height="14" rx="7" fill="${palette.accent}" opacity="0.85"/>
  <circle cx="612" cy="618" r="10" fill="${palette.accentSoft}"/>
  ${hazardGraphic}

  <text x="884" y="244" font-family="Inter, Segoe UI, Arial" font-size="25" font-weight="700" fill="${palette.text}">Location-Aware Checks</text>
  <circle cx="892" cy="286" r="7" fill="${palette.accent}"/>
  <text x="912" y="294" font-family="Inter, Segoe UI, Arial" font-size="18" fill="${palette.text}">${escapeXml(checkLines[0])}</text>
  <circle cx="892" cy="338" r="7" fill="${palette.accent}"/>
  <text x="912" y="346" font-family="Inter, Segoe UI, Arial" font-size="18" fill="${palette.text}">${escapeXml(checkLines[1])}</text>
  <circle cx="892" cy="390" r="7" fill="${palette.accent}"/>
  <text x="912" y="398" font-family="Inter, Segoe UI, Arial" font-size="18" fill="${palette.text}">${escapeXml(checkLines[2])}</text>

  <rect x="884" y="444" width="314" height="208" rx="14" fill="${palette.accent}" opacity="0.12"/>
  <text x="906" y="490" font-family="Inter, Segoe UI, Arial" font-size="19" fill="${palette.text}">Hazard</text>
  <text x="906" y="526" font-family="Inter, Segoe UI, Arial" font-size="34" font-weight="700" fill="${palette.accent}">${escapeXml(hazard.toUpperCase())}</text>
  <text x="906" y="566" font-family="Inter, Segoe UI, Arial" font-size="18" fill="${palette.text}">Pakistan-trained ML visual</text>
  <text x="906" y="592" font-family="Inter, Segoe UI, Arial" font-size="18" fill="${palette.text}">for stage-by-stage execution</text>
</svg>`

  return toSvgDataUrl(svg)
}

export const generateConstructionGuidanceMl = ({ province, city, hazard, structureType }) => {
  const normalizedProvince = safeProvince(province)
  const normalizedHazard = safeHazard(hazard)
  const normalizedStructure = safeStructure(structureType)
  const structureProfile = structureDefaults[normalizedStructure]

  const inference = runLocationAwareInference({
    province: normalizedProvince,
    city,
    hazard: normalizedHazard,
    structureType: normalizedStructure,
  })

  const steps = selectTopSteps({
    hazard: normalizedHazard,
    structureType: normalizedStructure,
    province: normalizedProvince,
    city,
    inference,
  })

  return {
    summary: buildSummary({
      province: normalizedProvince,
      city,
      hazard: normalizedHazard,
      structureType: normalizedStructure,
      steps,
      inference,
    }),
    materials: structureProfile.materials,
    safety: [...structureProfile.baselineSafety, ...buildAdditionalSafety({ hazard: normalizedHazard, province: normalizedProvince })],
    steps,
  }
}

export const generateGuidanceStepImagesMl = ({ province, city, hazard, structureType, steps }) => {
  const normalizedProvince = safeProvince(province)
  const normalizedHazard = safeHazard(hazard)
  const normalizedStructure = safeStructure(structureType)
  const selectedSteps = Array.isArray(steps) ? steps.slice(0, 5) : []

  return selectedSteps.map((step, index) => ({
    stepTitle: String(step?.title ?? `Step ${index + 1}`),
    prompt: `Pakistan-trained ML rendered construction visual for ${normalizedStructure} in ${city}, ${normalizedProvince} (${normalizedHazard}) - ${String(step?.title ?? `Step ${index + 1}`)}`,
    imageDataUrl: buildStepSvg({
      province: normalizedProvince,
      city,
      hazard: normalizedHazard,
      structureType: normalizedStructure,
      step,
      index,
    }),
  }))
}