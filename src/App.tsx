import { useCallback, useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import RiskMap from './components/RiskMap'
import ResponsiveQa from './components/ResponsiveQa'
import UserLocationMiniMap from './components/UserLocationMiniMap'
import { fetchLiveAlerts, type LiveAlert } from './services/alerts'
import { analyzeBuildingWithVision, type VisionAnalysisResult } from './services/vision'
import { getMlRetrofitEstimate, type MlRetrofitEstimate } from './services/mlRetrofit'
import {
  generateConstructionGuidance,
  generateGuidanceStepImages,
  type ConstructionGuidanceResult,
  type GuidanceStepImage,
} from './services/constructionGuidance'
import { fetchResilienceInfraModels, type InfraModel } from './services/infraModels'
import {
  generateInfraModelResearchImages,
  generateStructuralDesignReport,
  researchInfraModel,
  type InfraResearchImage,
  type InfraResearchResult,
  type StructuralDesignReport,
} from './services/infraResearch'
import {
  districtRiskLookupByName,
  findDistrictRiskProfile,
  listDistrictsByProvince,
  type DistrictRiskProfile,
} from './data/ndmaRiskAtlas'

type Language = 'en' | 'ur'
type SectionKey =
  | 'bestPractices'
  | 'riskMaps'
  | 'designToolkit'
  | 'infraModels'
  | 'applyRegion'
  | 'readiness'
  | 'retrofit'
  | 'warning'
  | 'learn'
  | 'settings'

type ImageInsights = {
  width: number
  height: number
  brightness: number
  contrast: number
  sharpness: number
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor'
}

type AlertFilterWindow = '24h' | '7d' | 'ongoing'

type HazardAlertOverlay = {
  id: string
  title: string
  type: 'Flood Warning' | 'Heavy Rain' | 'Earthquake' | 'Relief Point'
  severity: 'Low' | 'Medium' | 'High'
  advisory: string
  icon: string
  publishedAt: string
  isOngoing: boolean
  lat: number
  lng: number
}

type EngineeringDrawing = {
  id: string
  title: string
  summary: string
  annotation: string
}

const translations = {
  en: {
    appTitle: 'Resilience360 – Infrastructure Safety & Disaster Engineering Toolkit',
    logoText: 'R360',
    language: 'Language',
    navbarRole: 'Role',
    offline: 'Offline mode',
    lightweight: 'Lightweight mode',
    home: 'Home',
    sections: {
      bestPractices: '📘 Best Practices',
      riskMaps: '🗺️ Risk Zone Maps',
      designToolkit: '🏗️ Design Toolkit',
      infraModels: '🧱 Resilience Infra Models',
      applyRegion: '📍 Apply in My Region',
      readiness: '📊 Readiness Calculator',
      retrofit: '🧰 Retrofit Guide',
      warning: '📢 Early Warning System',
      learn: '📚 Learn & Train',
      settings: '⚙️ Settings',
    },
  },
  ur: {
    appTitle: 'ریزیلینس360 – بنیادی ڈھانچے کی حفاظت اور ڈیزاسٹر انجینئرنگ ٹول کٹ',
    logoText: 'آر360',
    language: 'زبان',
    navbarRole: 'کردار',
    offline: 'آف لائن موڈ',
    lightweight: 'لائٹ ویٹ موڈ',
    home: 'ہوم',
    sections: {
      bestPractices: '📘 بہترین طریقہ کار',
      riskMaps: '🗺️ رسک زون میپس',
      designToolkit: '🏗️ ڈیزائن ٹول کٹ',
      infraModels: '🧱 ریزیلینس انفرا ماڈلز',
      applyRegion: '📍 میرے علاقے میں اطلاق',
      readiness: '📊 تیاری کیلکولیٹر',
      retrofit: '🧰 ریٹروفٹ گائیڈ',
      warning: '📢 ابتدائی وارننگ سسٹم',
      learn: '📚 سیکھیں اور تربیت',
      settings: '⚙️ سیٹنگز',
    },
  },
} as const

const provinceRisk: Record<string, { earthquake: string; flood: string; infraRisk: string; landslide: string }> = {
  Punjab: { earthquake: 'Medium', flood: 'High', infraRisk: 'High', landslide: 'Low' },
  Sindh: { earthquake: 'Low', flood: 'Very High', infraRisk: 'Very High', landslide: 'Low' },
  Balochistan: { earthquake: 'High', flood: 'Medium', infraRisk: 'High', landslide: 'Medium' },
  KP: { earthquake: 'High', flood: 'High', infraRisk: 'High', landslide: 'High' },
  GB: { earthquake: 'Very High', flood: 'Medium', infraRisk: 'High', landslide: 'High' },
}

const pakistanCitiesByProvince: Record<string, string[]> = {
  Punjab: [
    'Lahore',
    'Rawalpindi',
    'Faisalabad',
    'Multan',
    'Gujranwala',
    'Sialkot',
    'Sargodha',
    'Bahawalpur',
    'Rahim Yar Khan',
    'Dera Ghazi Khan',
    'Sahiwal',
    'Kasur',
  ],
  Sindh: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Mirpur Khas', 'Nawabshah', 'Khairpur', 'Thatta', 'Badin'],
  Balochistan: ['Quetta', 'Gwadar', 'Turbat', 'Khuzdar', 'Chaman', 'Sibi', 'Zhob'],
  KP: ['Peshawar', 'Mardan', 'Swat', 'Abbottabad', 'Kohat', 'Bannu', 'Dera Ismail Khan', 'Chitral', 'Mansehra'],
  GB: ['Gilgit', 'Skardu', 'Hunza', 'Ghizer', 'Diamer', 'Ghanche', 'Astore'],
}

const cityRateByProvince: Record<string, Record<string, { laborDaily: number; materialIndex: number; logisticsIndex: number }>> = {
  Punjab: {
    Lahore: { laborDaily: 3200, materialIndex: 1.1, logisticsIndex: 1.02 },
    Rawalpindi: { laborDaily: 3050, materialIndex: 1.08, logisticsIndex: 1.03 },
    Faisalabad: { laborDaily: 2800, materialIndex: 1.03, logisticsIndex: 1.01 },
    Multan: { laborDaily: 2750, materialIndex: 1.02, logisticsIndex: 1.01 },
    Gujranwala: { laborDaily: 2850, materialIndex: 1.04, logisticsIndex: 1.01 },
    Sialkot: { laborDaily: 2900, materialIndex: 1.05, logisticsIndex: 1.02 },
    Sargodha: { laborDaily: 2650, materialIndex: 1.01, logisticsIndex: 1 },
    Bahawalpur: { laborDaily: 2600, materialIndex: 1, logisticsIndex: 1.02 },
    'Rahim Yar Khan': { laborDaily: 2550, materialIndex: 0.99, logisticsIndex: 1.03 },
    'Dera Ghazi Khan': { laborDaily: 2520, materialIndex: 0.98, logisticsIndex: 1.04 },
    Sahiwal: { laborDaily: 2580, materialIndex: 0.99, logisticsIndex: 1.01 },
    Kasur: { laborDaily: 2620, materialIndex: 1, logisticsIndex: 1.01 },
  },
  Sindh: {
    Karachi: { laborDaily: 3500, materialIndex: 1.16, logisticsIndex: 1.04 },
    Hyderabad: { laborDaily: 2900, materialIndex: 1.07, logisticsIndex: 1.03 },
    Sukkur: { laborDaily: 2850, materialIndex: 1.05, logisticsIndex: 1.04 },
    Larkana: { laborDaily: 2750, materialIndex: 1.03, logisticsIndex: 1.05 },
    'Mirpur Khas': { laborDaily: 2680, materialIndex: 1.01, logisticsIndex: 1.05 },
    Nawabshah: { laborDaily: 2700, materialIndex: 1.02, logisticsIndex: 1.04 },
    Khairpur: { laborDaily: 2660, materialIndex: 1.01, logisticsIndex: 1.04 },
    Thatta: { laborDaily: 2720, materialIndex: 1.03, logisticsIndex: 1.06 },
    Badin: { laborDaily: 2700, materialIndex: 1.02, logisticsIndex: 1.06 },
  },
  Balochistan: {
    Quetta: { laborDaily: 3150, materialIndex: 1.12, logisticsIndex: 1.12 },
    Gwadar: { laborDaily: 3300, materialIndex: 1.17, logisticsIndex: 1.18 },
    Turbat: { laborDaily: 3000, materialIndex: 1.1, logisticsIndex: 1.15 },
    Khuzdar: { laborDaily: 2920, materialIndex: 1.08, logisticsIndex: 1.14 },
    Chaman: { laborDaily: 2880, materialIndex: 1.09, logisticsIndex: 1.16 },
    Sibi: { laborDaily: 2850, materialIndex: 1.07, logisticsIndex: 1.15 },
    Zhob: { laborDaily: 2820, materialIndex: 1.06, logisticsIndex: 1.16 },
  },
  KP: {
    Peshawar: { laborDaily: 3050, materialIndex: 1.09, logisticsIndex: 1.08 },
    Mardan: { laborDaily: 2850, materialIndex: 1.04, logisticsIndex: 1.06 },
    Swat: { laborDaily: 2950, materialIndex: 1.07, logisticsIndex: 1.11 },
    Abbottabad: { laborDaily: 3000, materialIndex: 1.08, logisticsIndex: 1.1 },
    Kohat: { laborDaily: 2800, materialIndex: 1.03, logisticsIndex: 1.08 },
    Bannu: { laborDaily: 2750, materialIndex: 1.02, logisticsIndex: 1.09 },
    'Dera Ismail Khan': { laborDaily: 2780, materialIndex: 1.03, logisticsIndex: 1.08 },
    Chitral: { laborDaily: 2980, materialIndex: 1.09, logisticsIndex: 1.14 },
    Mansehra: { laborDaily: 2900, materialIndex: 1.06, logisticsIndex: 1.11 },
  },
  GB: {
    Gilgit: { laborDaily: 3250, materialIndex: 1.15, logisticsIndex: 1.2 },
    Skardu: { laborDaily: 3350, materialIndex: 1.18, logisticsIndex: 1.23 },
    Hunza: { laborDaily: 3320, materialIndex: 1.17, logisticsIndex: 1.24 },
    Ghizer: { laborDaily: 3200, materialIndex: 1.14, logisticsIndex: 1.22 },
    Diamer: { laborDaily: 3180, materialIndex: 1.13, logisticsIndex: 1.23 },
    Ghanche: { laborDaily: 3300, materialIndex: 1.17, logisticsIndex: 1.24 },
    Astore: { laborDaily: 3220, materialIndex: 1.14, logisticsIndex: 1.22 },
  },
}

const estimateRetrofitArea = (
  structureType: string,
  signals: VisionAnalysisResult['costSignals'] | null | undefined,
  defectCount: number,
): number => {
  const baseAreaByStructure: Record<string, number> = {
    'Masonry House': 1200,
    'RC Frame': 2200,
    'School Block': 6500,
    'Bridge Approach': 3200,
  }

  const baseArea = baseAreaByStructure[structureType] ?? 1500
  const affectedPercent = Math.max(8, Math.min(100, Number(signals?.estimatedAffectedAreaPercent) || 18 + defectCount * 8))
  const severityScore = Math.max(0, Math.min(100, Number(signals?.severityScore) || 40 + defectCount * 6))
  const urgencyBoost = signals?.urgencyLevel === 'critical' ? 1.12 : signals?.urgencyLevel === 'priority' ? 1.06 : 1

  const areaFactor = 0.58 + affectedPercent / 130 + severityScore / 420
  return Math.round(Math.max(450, Math.min(25000, baseArea * areaFactor * urgencyBoost)))
}

const coastalCities = new Set(['Karachi', 'Thatta', 'Badin', 'Gwadar'])

const cityHazardOverrides: Record<
  string,
  {
    seismicZone: number
    floodDepth100y: number
    liquefaction: 'Low' | 'Medium' | 'High'
  }
> = {
  Lahore: { seismicZone: 2, floodDepth100y: 0.7, liquefaction: 'Low' },
  Karachi: { seismicZone: 2, floodDepth100y: 1.9, liquefaction: 'Medium' },
  Peshawar: { seismicZone: 4, floodDepth100y: 1.2, liquefaction: 'Medium' },
  Quetta: { seismicZone: 5, floodDepth100y: 0.8, liquefaction: 'Medium' },
  Gilgit: { seismicZone: 5, floodDepth100y: 0.6, liquefaction: 'Low' },
  Skardu: { seismicZone: 5, floodDepth100y: 0.7, liquefaction: 'Low' },
  Thatta: { seismicZone: 2, floodDepth100y: 2.2, liquefaction: 'High' },
  Gwadar: { seismicZone: 3, floodDepth100y: 1.4, liquefaction: 'Medium' },
  Swat: { seismicZone: 4, floodDepth100y: 1.1, liquefaction: 'Low' },
  Hyderabad: { seismicZone: 2, floodDepth100y: 1.5, liquefaction: 'Medium' },
}

const getHazardOverlay = (province: string, city: string) => {
  const fallbackByProvince: Record<string, { seismicZone: number; floodDepth100y: number; liquefaction: 'Low' | 'Medium' | 'High' }> = {
    Punjab: { seismicZone: 2, floodDepth100y: 0.9, liquefaction: 'Low' },
    Sindh: { seismicZone: 2, floodDepth100y: 1.7, liquefaction: 'Medium' },
    Balochistan: { seismicZone: 4, floodDepth100y: 1.1, liquefaction: 'Medium' },
    KP: { seismicZone: 4, floodDepth100y: 1.2, liquefaction: 'Medium' },
    GB: { seismicZone: 5, floodDepth100y: 0.7, liquefaction: 'Low' },
  }

  return cityHazardOverrides[city] ?? fallbackByProvince[province] ?? fallbackByProvince.Punjab
}

const roleOptions = ['General Public', 'Engineer / Planner', 'Government Officer'] as const

const homeSectionKeys: SectionKey[] = [
  'bestPractices',
  'riskMaps',
  'designToolkit',
  'infraModels',
  'retrofit',
  'warning',
  'learn',
  'applyRegion',
  'readiness',
]

const homeCardMeta: Record<
  SectionKey,
  {
    icon: string
    title: string
    subtitle: string
    tone: string
  }
> = {
  bestPractices: {
    icon: '📘',
    title: 'Best Practices',
    subtitle: 'Global Infrastructure Solutions',
    tone: 'tone-a',
  },
  riskMaps: {
    icon: '🗺️',
    title: 'Risk Zone Maps',
    subtitle: 'Identify Local Hazards',
    tone: 'tone-b',
  },
  designToolkit: {
    icon: '🏗️',
    title: 'Design Toolkit',
    subtitle: 'Tools for Engineers',
    tone: 'tone-c',
  },
  infraModels: {
    icon: '🧱',
    title: 'Resilience Infra Models',
    subtitle: 'AI Visual Catalog',
    tone: 'tone-d',
  },
  applyRegion: {
    icon: '📍',
    title: 'Apply in My Region',
    subtitle: 'District-Specific Guidance',
    tone: 'tone-d',
  },
  readiness: {
    icon: '📊',
    title: 'Readiness Calculator',
    subtitle: 'Assess Your Preparedness',
    tone: 'tone-e',
  },
  retrofit: {
    icon: '🧰',
    title: 'Retrofit Guide',
    subtitle: 'Upgrade Existing Structures',
    tone: 'tone-f',
  },
  warning: {
    icon: '📢',
    title: 'Early Warning System',
    subtitle: 'Get Real-Time Alerts',
    tone: 'tone-g',
  },
  learn: {
    icon: '📚',
    title: 'Learn & Train',
    subtitle: 'Guides, Courses, Videos',
    tone: 'tone-h',
  },
  settings: {
    icon: '⚙️',
    title: 'Settings',
    subtitle: 'Manage Preferences',
    tone: 'tone-e',
  },
}

const globalPracticeLibrary: Record<
  'flood' | 'earthquake',
  Array<{
    title: string
    region: string
    summary: string
    bcr: string
    steps: string[]
  }>
> = {
  flood: [
    {
      title: 'Raised Plinth and Flood-Resistant Envelope',
      region: 'Bangladesh Delta Housing',
      summary: 'Raised habitable floor with water-resistant lower envelope and rapid-drain edge channels.',
      bcr: '2.8',
      steps: ['Set flood design level', 'Raise plinth with compacted fill', 'Apply water-resistant coatings and drainage apron'],
    },
    {
      title: 'Backflow Prevention + Pump Sump',
      region: 'Netherlands Urban Blocks',
      summary: 'Stops sewer backflow and keeps critical rooms dry during surge and intense rainfall.',
      bcr: '2.2',
      steps: ['Install backflow valves', 'Create sump pit at low point', 'Provide dual power for pump operation'],
    },
    {
      title: 'Flood-Compatible Ground Storey Strategy',
      region: 'Thailand Riverside Communities',
      summary: 'Sacrificial/use-flexible ground floor with protected utilities and vertical evacuation route.',
      bcr: '2.5',
      steps: ['Relocate electrical panels upward', 'Use flood-compatible finishes', 'Mark vertical evacuation path'],
    },
    {
      title: 'Embankment Toe Protection + Drainage',
      region: 'Pakistan Indus Belt Pilots',
      summary: 'Combines slope protection and toe drainage to reduce erosion and approach failures.',
      bcr: '3.0',
      steps: ['Stabilize slope toe', 'Install sub-drain lines', 'Add vegetative cover for erosion control'],
    },
    {
      title: 'Critical Utility Elevation Protocol',
      region: 'US Gulf Coast Schools',
      summary: 'Elevates transformers, control panels, and backup systems above flood design level.',
      bcr: '3.3',
      steps: ['Audit utility points', 'Raise and anchor systems', 'Test post-flood quick-restart protocol'],
    },
    {
      title: 'Perimeter Detention and Controlled Outflow',
      region: 'Singapore Urban Resilience Sites',
      summary: 'Short-term detention with controlled release lowers local flood peak around buildings.',
      bcr: '2.6',
      steps: ['Create detention pockets', 'Install controlled outflow points', 'Maintain desilting schedule'],
    },
    {
      title: 'Amphibious Foundation Retrofit',
      region: 'Netherlands Maas Communities',
      summary: 'Buoyant foundation guidance allows controlled vertical movement during flood surge while anchored in place.',
      bcr: '3.1',
      steps: ['Assess flood rise envelope', 'Install buoyant platform and vertical guideposts', 'Protect flexible utility connections'],
    },
    {
      title: 'Deployable Flood Barrier Gate System',
      region: 'Germany Rhine Industrial Blocks',
      summary: 'Rapid-install panel barriers shield critical entry points and utility corridors during flash flood warnings.',
      bcr: '2.7',
      steps: ['Map vulnerable openings', 'Pre-stage modular barriers', 'Run deployment drills before monsoon peaks'],
    },
    {
      title: 'Green-Blue Sponge Streets',
      region: 'China Sponge City Program',
      summary: 'Permeable paving, bioswales, and pocket retention reduce street flooding and improve infiltration.',
      bcr: '2.9',
      steps: ['Replace impermeable lanes in phases', 'Add bioswale strips with native species', 'Schedule debris and sediment maintenance'],
    },
    {
      title: 'Floating Emergency Utility Pods',
      region: 'Japan Coastal Municipalities',
      summary: 'Floating/raised utility pods preserve emergency power, water treatment, and communication during inundation.',
      bcr: '3.0',
      steps: ['Identify critical utility loads', 'Raise or float pod modules', 'Validate emergency transfer and restart protocol'],
    },
    {
      title: 'Smart Pump Station with IoT Gate Control',
      region: 'South Korea Smart Flood Control',
      summary: 'Sensor-driven pump and sluice coordination cuts local backflow and urban flood duration.',
      bcr: '2.8',
      steps: ['Install water-level sensors', 'Automate pump/gate trigger thresholds', 'Maintain manual override for outages'],
    },
    {
      title: 'Flood-Resilient School Compound Layout',
      region: 'Philippines Typhoon Adaptation Schools',
      summary: 'Campus zoning places refuge, WASH, and lifeline systems at safer elevations for continuity.',
      bcr: '3.2',
      steps: ['Zone high-priority functions by elevation', 'Raise WASH and power controls', 'Mark protected evacuation circulation'],
    },
  ],
  earthquake: [
    {
      title: 'Masonry Confinement Bands Upgrade',
      region: 'Nepal Seismic Reconstruction',
      summary: 'Lintel/plinth/roof bands plus corner reinforcement to prevent brittle wall failures.',
      bcr: '3.4',
      steps: ['Install ring bands', 'Anchor corners and junctions', 'Retrofit openings with lintel confinement'],
    },
    {
      title: 'Soft-Storey RC Frame Strengthening',
      region: 'Turkey School Retrofit Program',
      summary: 'Column jacketing and infill/shear elements for drift control at weak storeys.',
      bcr: '3.6',
      steps: ['Identify weak bays', 'Apply jacketing with confinement ties', 'Add targeted shear walls'],
    },
    {
      title: 'Roof-to-Wall Anchorage and Diaphragm Ties',
      region: 'Chile Mid-Rise Housing',
      summary: 'Improves load path continuity and reduces out-of-plane wall collapse.',
      bcr: '3.1',
      steps: ['Check anchorage continuity', 'Install tie rods/connectors', 'Verify diaphragm action'],
    },
    {
      title: 'Bridge Approach Seismic Joint Retrofit',
      region: 'Japan Transport Corridors',
      summary: 'Joint restrainers and bearing upgrades reduce displacement and impact damage.',
      bcr: '3.8',
      steps: ['Retrofit restrainers', 'Upgrade bearings', 'Validate expansion and movement limits'],
    },
    {
      title: 'Non-Structural Hazard Mitigation Package',
      region: 'California Hospital Programs',
      summary: 'Secures parapets, equipment, and overhead services to cut injury/disruption risk.',
      bcr: '2.9',
      steps: ['Inventory non-structural hazards', 'Anchor equipment/services', 'Run shake scenario checks'],
    },
    {
      title: 'Performance-Based Retrofit Prioritization',
      region: 'New Zealand Public Assets',
      summary: 'Prioritizes interventions by life-safety and downtime impact with phased budgets.',
      bcr: '3.2',
      steps: ['Score life-safety hotspots', 'Assign phased retrofit packages', 'Track compliance after each phase'],
    },
    {
      title: 'Base Isolation for Critical Buildings',
      region: 'Japan Essential Facilities Program',
      summary: 'Isolation bearings reduce transfer of seismic forces to superstructure and equipment.',
      bcr: '4.0',
      steps: ['Screen candidate critical buildings', 'Design bearing system and moat gaps', 'Commission monitoring and maintenance plan'],
    },
    {
      title: 'Buckling-Restrained Braced Frame Retrofit',
      region: 'United States Hospital Seismic Upgrades',
      summary: 'BRB systems provide stable energy dissipation and improved drift control under strong shaking.',
      bcr: '3.7',
      steps: ['Identify weak lateral bays', 'Install BRB braces with collector continuity', 'Verify story-drift and connection performance'],
    },
    {
      title: 'Steel Damper Wall Retrofit',
      region: 'Taiwan High-Rise Seismic Program',
      summary: 'Supplemental damping walls absorb seismic energy and limit non-structural damage.',
      bcr: '3.5',
      steps: ['Place dampers at high-response floors', 'Anchor to primary frame', 'Inspect damper condition after events'],
    },
    {
      title: 'Rocking Wall + Post-Tensioned Core System',
      region: 'New Zealand Low-Damage Design',
      summary: 'Self-centering systems reduce residual drift and post-earthquake downtime.',
      bcr: '3.9',
      steps: ['Model self-centering demand', 'Install post-tensioned rocking elements', 'Validate recentering in design checks'],
    },
    {
      title: 'Lifeline Utility Seismic Restraint Package',
      region: 'Chile Critical Infrastructure Standards',
      summary: 'Seismic restraints for MEP pipelines, tanks, and cable trays protect essential operations.',
      bcr: '3.3',
      steps: ['Inventory critical utility runs', 'Add braces and flexible joints', 'Perform shake-ready inspection checklist'],
    },
    {
      title: 'Masonry Infill Decoupling Retrofit',
      region: 'Italy School Safety Retrofit',
      summary: 'Controlled infill-frame interaction reduces brittle failures and falling hazards.',
      bcr: '3.4',
      steps: ['Map vulnerable infill panels', 'Introduce decoupling gaps/connectors', 'Strengthen panel anchorage and edge details'],
    },
  ],
}

const bestPracticeImageModules = import.meta.glob('./assets/best-practices/*.{jpg,png}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const toBestPracticeSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const getBestPracticeImage = (title: string) =>
  bestPracticeImageModules[`./assets/best-practices/${toBestPracticeSlug(title)}.jpg`] ??
  bestPracticeImageModules[`./assets/best-practices/${toBestPracticeSlug(title)}.png`] ??
  ''

const infraModelImageModules = import.meta.glob('./assets/infra-models/*.{jpg,png}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const getInfraModelImage = (id: string) =>
  infraModelImageModules[`./assets/infra-models/${id}.jpg`] ??
  infraModelImageModules[`./assets/infra-models/${id}.png`] ??
  ''

const preloadedInfraModelSpecs: Omit<InfraModel, 'imageDataUrl'>[] = [
  {
    id: 'flood-housing-cluster-pk',
    title: 'Elevated Flood-Resilient Housing Cluster',
    description: 'Neighborhood housing cluster with raised plinths, safe egress lanes, and flood-compatible lower levels.',
    features: ['Raised plinth blocks and dry refuge deck', 'Flood-compatible ground floor detailing', 'Protected lifeline utility shafts'],
    advantagesPakistan: ['Suitable for riverine settlements in Sindh/South Punjab', 'Cuts repetitive household flood losses', 'Faster re-occupancy after inundation'],
  },
  {
    id: 'seismic-school-block-pk',
    title: 'Ductile Seismic School Block Retrofit',
    description: 'Public school strengthening package with confined elements and safe evacuation circulation.',
    features: ['Column/beam confinement strengthening', 'Masonry infill anchorage strategy', 'Non-structural seismic hazard restraint'],
    advantagesPakistan: ['Improves school safety in KP and GB', 'Supports phased district retrofit programs', 'Reduces disruption after seismic events'],
  },
  {
    id: 'bridge-approach-resilience-pk',
    title: 'Bridge Approach and Embankment Resilience Model',
    description: 'Approach slab, toe protection, and drainage model for bridge connectivity during floods and quakes.',
    features: ['Scour-resistant toe protection', 'Controlled drainage and erosion barriers', 'Seismic joint movement safety detailing'],
    advantagesPakistan: ['Protects evacuation and trade routes', 'Reduces emergency access failures', 'Lower lifecycle maintenance burden'],
  },
  {
    id: 'community-shelter-hub-pk',
    title: 'Community Multi-Hazard Shelter Hub',
    description: 'Dual-use community shelter with resilient core, emergency power/water, and warning support systems.',
    features: ['Hardened shelter core with safe capacity layout', 'Backup power-water-communications room', 'Accessible evacuation ramp/circulation'],
    advantagesPakistan: ['Supports UC-level emergency planning', 'Useful for daily community services', 'Improves last-mile response readiness'],
  },
  {
    id: 'flood-health-post-pk',
    title: 'Flood-Safe Primary Health Post Model',
    description: 'Health post with raised clinical areas and protected medicine/cold-chain services.',
    features: ['Raised treatment and storage areas', 'Backflow-safe sanitation routing', 'Protected emergency access path'],
    advantagesPakistan: ['Keeps basic care running during floods', 'Reduces medicine spoilage losses', 'Improves continuity in vulnerable districts'],
  },
  {
    id: 'resilient-waterpoint-pk',
    title: 'Resilient Community Water Point Model',
    description: 'Flood- and quake-aware public water point with protected pump controls and anchored system layout.',
    features: ['Raised/anchored pump and control units', 'Drainage apron and contamination barrier', 'Quick-repair modular component access'],
    advantagesPakistan: ['Improves safe water availability post-disaster', 'Lower contamination risk after floods', 'Easier local maintenance by municipal teams'],
  },
  {
    id: 'lifeline-utility-corridor-pk',
    title: 'Seismic-Resilient Lifeline Utility Corridor',
    description: 'Utility corridor package for water, power, and telecom with seismic restraints and flexible joints.',
    features: ['Seismic braces for utility runs', 'Flexible joint transition sections', 'Critical valve and panel anchorage'],
    advantagesPakistan: ['Reduces service interruption during earthquakes', 'Protects critical urban systems', 'Supports rapid post-event restoration'],
  },
  {
    id: 'sponge-street-drainage-pk',
    title: 'Urban Sponge Street and Drainage Retrofit',
    description: 'Permeable paving + bioswale + retention pocket model for dense flood-prone neighborhoods.',
    features: ['Permeable roadside surface sections', 'Bioswale and sediment trap chain', 'Controlled outflow retention chambers'],
    advantagesPakistan: ['Reduces urban waterlogging duration', 'Improves monsoon drainage performance', 'Adaptable to phased municipal upgrading'],
  },
  {
    id: 'resilient-market-block-pk',
    title: 'Resilient Market and Commercial Block Model',
    description: 'Small-business cluster design with flood-safe services and improved seismic load paths.',
    features: ['Elevated critical service zone', 'Confinement/tie detailing for shop rows', 'Emergency exit and utility isolation plan'],
    advantagesPakistan: ['Protects livelihoods in district bazaars', 'Reduces downtime after hazard events', 'Supports safer rebuilding standards'],
  },
  {
    id: 'district-eoc-building-pk',
    title: 'District Emergency Operations Center (EOC) Model',
    description: 'Multi-hazard command facility model for district response coordination and continuity operations.',
    features: ['Resilient command floor and communication core', 'Backup control power/water system', 'Integrated dispatch and shelter coordination room'],
    advantagesPakistan: ['Improves district incident coordination', 'Supports faster field deployment', 'Strengthens institutional resilience capacity'],
  },
]

const preloadedInfraModels: InfraModel[] = preloadedInfraModelSpecs.map((item) => ({
  ...item,
  imageDataUrl: getInfraModelImage(item.id),
}))

const provinceCenters: Record<string, { lat: number; lng: number }> = {
  Punjab: { lat: 31.17, lng: 72.71 },
  Sindh: { lat: 26.87, lng: 68.37 },
  Balochistan: { lat: 28.49, lng: 65.1 },
  KP: { lat: 34.95, lng: 72.33 },
  GB: { lat: 35.8, lng: 74.5 },
}

const districtCenters: Record<string, { lat: number; lng: number }> = {
  Bahawalpur: { lat: 29.4, lng: 71.68 },
  Rajanpur: { lat: 29.1, lng: 70.33 },
  Lahore: { lat: 31.52, lng: 74.36 },
  Multan: { lat: 30.18, lng: 71.49 },
  Rawalpindi: { lat: 33.62, lng: 73.07 },
  Karachi: { lat: 24.86, lng: 67.01 },
  Larkana: { lat: 27.56, lng: 68.21 },
  Thatta: { lat: 24.75, lng: 67.92 },
  Sukkur: { lat: 27.71, lng: 68.84 },
  Peshawar: { lat: 34.01, lng: 71.58 },
  Swat: { lat: 34.8, lng: 72.35 },
  Chitral: { lat: 35.85, lng: 71.79 },
  Quetta: { lat: 30.18, lng: 66.97 },
  Gwadar: { lat: 25.12, lng: 62.33 },
  Khuzdar: { lat: 27.8, lng: 66.6 },
  Gilgit: { lat: 35.92, lng: 74.31 },
  Skardu: { lat: 35.3, lng: 75.63 },
}

const districtProvinceLookup = Object.entries(pakistanCitiesByProvince).reduce<Record<string, string>>((acc, [province, cities]) => {
  for (const city of cities) {
    acc[city] = province
  }
  return acc
}, {})

const toRadians = (value: number) => (value * Math.PI) / 180

const haversineDistanceKm = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
  const earthRadiusKm = 6371
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLng = toRadians(to.lng - from.lng)
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const findNearestCenterName = (
  source: { lat: number; lng: number },
  centers: Record<string, { lat: number; lng: number }>,
) => {
  let nearestName = ''
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const [name, point] of Object.entries(centers)) {
    const distance = haversineDistanceKm(source, point)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestName = name
    }
  }

  return nearestName
}

const getProvinceForDistrict = (district: string) => {
  const directProvince = districtProvinceLookup[district]
  if (directProvince) return directProvince
  const districtPoint = districtCenters[district]
  if (!districtPoint) return ''
  return findNearestCenterName(districtPoint, provinceCenters)
}

const engineeringDrawingLibrary: Record<'earthquake' | 'flood' | 'infraRisk', EngineeringDrawing[]> = {
  earthquake: [
    {
      id: 'school-seismic-retrofit',
      title: 'Retrofitted School Design',
      summary: 'Classroom block with seismic bands, confined columns, and safer evacuation corridor.',
      annotation: 'Add lintel/roof bands, corner reinforcement, and braced stair core for life safety.',
    },
    {
      id: 'mudhouse-tiebeam',
      title: 'Seismic Mud House with Tie-Beams',
      summary: 'Low-cost mud masonry strengthened with horizontal tie beams and vertical corner ties.',
      annotation: 'Use plinth/lintel/roof bands and tie roof diaphragm to walls to reduce out-of-plane failure.',
    },
    {
      id: 'adobe-reinforced-section',
      title: 'Adobe-Reinforced Wall Section',
      summary: 'Adobe wall with mesh reinforcement, improved plaster, and moisture-resistant base treatment.',
      annotation: 'Provide mesh jacketing around crack-prone zones and anchor to roof/wall junctions.',
    },
  ],
  flood: [
    {
      id: 'raised-foundation-home',
      title: 'Raised Flood-Resilient House Plinth',
      summary: 'Elevated plinth and protected utility route for recurrent flood districts.',
      annotation: 'Keep socket level above local flood mark and seal service entry points.',
    },
    {
      id: 'flood-safe-school',
      title: 'Flood-Safe School Block',
      summary: 'Raised access, protected WASH systems, and compartmentalized evacuation room.',
      annotation: 'Add perimeter drain, sump backup, and protected emergency circulation paths.',
    },
    {
      id: 'community-drain-cross',
      title: 'Community Drain + Road Cross-Section',
      summary: 'Drainage-first layout for roads and settlements in heavy-rain corridors.',
      annotation: 'Maintain drain slope and include backflow prevention at low points.',
    },
  ],
  infraRisk: [
    {
      id: 'lifeline-clinic-retrofit',
      title: 'Primary Clinic Lifeline Retrofit',
      summary: 'Critical facility package combining seismic, flood, and non-structural strengthening.',
      annotation: 'Secure medical equipment, water/power backup, and safe egress continuity.',
    },
    {
      id: 'bridge-approach-hardening',
      title: 'Bridge Approach Hardening',
      summary: 'Slope, embankment, and transition slab retrofit to maintain emergency access.',
      annotation: 'Use toe protection, drainage control, and constrained movement joints.',
    },
    {
      id: 'multihazard-housing-core',
      title: 'Multi-Hazard Housing Core Unit',
      summary: 'Household core design with resilient walls, tied roof, and flood-resistant detailing.',
      annotation: 'Avoid weak wall openings near corners and ensure roof-to-wall anchorage.',
    },
  ],
}

const districtReadinessIndex: Record<
  string,
  { score: number; retrofittedSchools: number; shelters: number; warningCoverage: number; floodMapsPublished: boolean }
> = {
  Bahawalpur: { score: 62, retrofittedSchools: 88, shelters: 39, warningCoverage: 81, floodMapsPublished: true },
  Larkana: { score: 62, retrofittedSchools: 56, shelters: 22, warningCoverage: 66, floodMapsPublished: true },
  Lahore: { score: 74, retrofittedSchools: 71, shelters: 54, warningCoverage: 89, floodMapsPublished: true },
  Karachi: { score: 68, retrofittedSchools: 64, shelters: 48, warningCoverage: 84, floodMapsPublished: true },
  Swat: { score: 59, retrofittedSchools: 42, shelters: 19, warningCoverage: 63, floodMapsPublished: false },
}

const districtContacts: Record<string, string[]> = {
  default: [
    'NDMA Control Room: 051-9205037',
    'PDMA Provincial Helpline: 1700',
    'Tehsil Emergency Desk: via local Assistant Commissioner Office',
  ],
  Bahawalpur: ['PDMA South Punjab: 1700', 'Rescue 1122 Bahawalpur: 1122', 'Tehsil Disaster Desk Bahawalpur: 062-9250452'],
  Larkana: ['PDMA Sindh: 1700', 'Rescue 1122 Larkana: 1122', 'Deputy Commissioner Office Larkana: 074-9410701'],
  Karachi: ['PDMA Sindh: 1700', 'Rescue 1122 Karachi: 1122', 'Commissioner Karachi Emergency Cell: 021-99203443'],
}

const evacuationAssetsByDistrict: Record<
  string,
  Array<{ name: string; kind: 'Safe Shelter' | 'Raised Road' | 'Health Post'; lat: number; lng: number }>
> = {
  Bahawalpur: [
    { name: 'Government High School Shelter', kind: 'Safe Shelter', lat: 29.42, lng: 71.7 },
    { name: 'Canal Road Raised Segment', kind: 'Raised Road', lat: 29.36, lng: 71.67 },
    { name: 'THQ Health Post', kind: 'Health Post', lat: 29.39, lng: 71.73 },
  ],
  Larkana: [
    { name: 'District Shelter Hall', kind: 'Safe Shelter', lat: 27.57, lng: 68.22 },
    { name: 'Embankment Access Road', kind: 'Raised Road', lat: 27.54, lng: 68.2 },
    { name: 'Rural Health Unit Node', kind: 'Health Post', lat: 27.58, lng: 68.24 },
  ],
}

function App() {
  const [isQaRoute, setIsQaRoute] = useState<boolean>(() => window.location.hash === '#qa-responsive')
  const [language, setLanguage] = useState<Language>('en')
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(
    () => localStorage.getItem('r360-offline') === 'true',
  )
  const [isLightweight, setIsLightweight] = useState<boolean>(
    () => localStorage.getItem('r360-lightweight') === 'true',
  )
  const [selectedRole, setSelectedRole] = useState<(typeof roleOptions)[number]>('General Public')
  const [selectedProvince, setSelectedProvince] = useState('Punjab')
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null)
  const [mapLayer, setMapLayer] = useState<'earthquake' | 'flood' | 'infraRisk'>('earthquake')
  const [districtReportLanguage, setDistrictReportLanguage] = useState<'English' | 'Urdu'>('English')
  const [districtUiLanguage, setDistrictUiLanguage] = useState<'English' | 'Urdu'>('English')
  const [alertFilterWindow, setAlertFilterWindow] = useState<AlertFilterWindow>('24h')
  const [colorblindFriendlyMap, setColorblindFriendlyMap] = useState(false)
  const [districtProfileSavedMsg, setDistrictProfileSavedMsg] = useState<string | null>(null)
  const [locationAccessMsg, setLocationAccessMsg] = useState<string | null>(null)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [detectedUserLocation, setDetectedUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [hasTriedApplyAutoLocation, setHasTriedApplyAutoLocation] = useState(false)
  const [riskActionProgress, setRiskActionProgress] = useState(0)
  const [advisoryQuestion, setAdvisoryQuestion] = useState('')
  const [advisoryMessages, setAdvisoryMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])
  const [activeDrawingId, setActiveDrawingId] = useState<string | null>(null)
  const [communityLocationSuggestion, setCommunityLocationSuggestion] = useState('')
  const [structureReviewType, setStructureReviewType] = useState<'Home' | 'School' | 'Clinic' | 'Bridge'>('Home')
  const [structureReviewGps, setStructureReviewGps] = useState('')
  const [structureReviewFile, setStructureReviewFile] = useState<File | null>(null)
  const [isSubmittingStructureReview, setIsSubmittingStructureReview] = useState(false)
  const [structureReviewResult, setStructureReviewResult] = useState<VisionAnalysisResult | null>(null)
  const [structureReviewError, setStructureReviewError] = useState<string | null>(null)
  const [buildingType, setBuildingType] = useState('Residential')
  const [materialType, setMaterialType] = useState('Reinforced Concrete')
  const [locationText, setLocationText] = useState('Lahore, Punjab')
  const [lifeline, setLifeline] = useState('No')
  const [structureType, setStructureType] = useState('Masonry House')
  const [retrofitCity, setRetrofitCity] = useState('Lahore')
  const [retrofitScope, setRetrofitScope] = useState<'Basic' | 'Standard' | 'Comprehensive'>('Standard')
  const [retrofitDamageLevel, setRetrofitDamageLevel] = useState<'Low' | 'Medium' | 'High'>('Medium')
  const [retrofitImagePreview, setRetrofitImagePreview] = useState<string | null>(null)
  const [retrofitImageInsights, setRetrofitImageInsights] = useState<ImageInsights | null>(null)
  const [visionAnalysis, setVisionAnalysis] = useState<VisionAnalysisResult | null>(null)
  const [mlEstimate, setMlEstimate] = useState<MlRetrofitEstimate | null>(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [retrofitError, setRetrofitError] = useState<string | null>(null)
  const [alertLog, setAlertLog] = useState<LiveAlert[]>(() => {
    const cached = localStorage.getItem('r360-live-alerts')
    return cached ? JSON.parse(cached) : []
  })
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)
  const [bestPracticeHazard, setBestPracticeHazard] = useState<'flood' | 'earthquake'>('flood')
  const [bestPracticeVisibleCount, setBestPracticeVisibleCount] = useState(2)
  const [applyProvince, setApplyProvince] = useState('Punjab')
  const [applyCity, setApplyCity] = useState('Lahore')
  const [applyHazard, setApplyHazard] = useState<'flood' | 'earthquake'>('flood')
  const [constructionGuidance, setConstructionGuidance] = useState<ConstructionGuidanceResult | null>(null)
  const [guidanceStepImages, setGuidanceStepImages] = useState<GuidanceStepImage[]>([])
  const [isGeneratingGuidance, setIsGeneratingGuidance] = useState(false)
  const [isGeneratingStepImages, setIsGeneratingStepImages] = useState(false)
  const [guidanceError, setGuidanceError] = useState<string | null>(null)
  const [infraModels, setInfraModels] = useState<InfraModel[]>(() => preloadedInfraModels)
  const [isLoadingInfraModels, setIsLoadingInfraModels] = useState(false)
  const [infraModelsError, setInfraModelsError] = useState<string | null>(null)
  const [infraResearchName, setInfraResearchName] = useState('')
  const [isResearchingInfra, setIsResearchingInfra] = useState(false)
  const [infraResearchError, setInfraResearchError] = useState<string | null>(null)
  const [infraResearchResult, setInfraResearchResult] = useState<InfraResearchResult | null>(null)
  const [infraResearchImages, setInfraResearchImages] = useState<InfraResearchImage[]>([])
  const [isGeneratingInfraViews, setIsGeneratingInfraViews] = useState(false)
  const [showStructuralDesignForm, setShowStructuralDesignForm] = useState(false)
  const [designReportLocation, setDesignReportLocation] = useState('')
  const [designReportGeoTech, setDesignReportGeoTech] = useState('')
  const [designReportStories, setDesignReportStories] = useState(1)
  const [designReportUseType, setDesignReportUseType] = useState('house')
  const [isGeneratingStructuralDesign, setIsGeneratingStructuralDesign] = useState(false)
  const [structuralDesignError, setStructuralDesignError] = useState<string | null>(null)
  const [structuralDesignReport, setStructuralDesignReport] = useState<StructuralDesignReport | null>(null)
  const [showInfraLayoutVideo, setShowInfraLayoutVideo] = useState(false)
  const [sectionHistory, setSectionHistory] = useState<Array<SectionKey | null>>([])
  const [designProvince, setDesignProvince] = useState('Punjab')
  const [designCity, setDesignCity] = useState('Lahore')
  const [designSoilType, setDesignSoilType] = useState<'Rocky' | 'Sandy' | 'Clayey' | 'Silty' | 'Saline'>('Clayey')
  const [designHumidity, setDesignHumidity] = useState<'Low' | 'Medium' | 'High'>('Medium')
  const [slopeAngleDeg, setSlopeAngleDeg] = useState(18)
  const [slopeHeightM, setSlopeHeightM] = useState(4)
  const [shelterAreaSqm, setShelterAreaSqm] = useState(120)
  const [shelterOccupancyType, setShelterOccupancyType] = useState<'School' | 'Mosque' | 'House'>('School')
  const [houseTypeForCost, setHouseTypeForCost] = useState<'Single-Storey' | 'Double-Storey' | 'School Block' | 'Clinic Unit'>('Single-Storey')
  const [floorAreaSqftCost, setFloorAreaSqftCost] = useState(1200)
  const [designSummaryText, setDesignSummaryText] = useState<string | null>(null)
  const [showTrainingPrograms, setShowTrainingPrograms] = useState(false)

  const t = translations[language]
  const isUrdu = language === 'ur'
  const isHomeView = !activeSection
  const hasPreviousSection = sectionHistory.length > 0
  const infraLayoutVideoSrc = `${import.meta.env.BASE_URL}videos/layout.mp4`

  const navigateToSection = useCallback(
    (nextSection: SectionKey | null) => {
      if (nextSection === activeSection) return
      setSectionHistory((previous) => [...previous, activeSection])
      setActiveSection(nextSection)
    },
    [activeSection],
  )

  const navigateBack = useCallback(() => {
    setSectionHistory((previous) => {
      if (previous.length === 0) {
        setActiveSection(null)
        return previous
      }

      const target = previous[previous.length - 1]
      setActiveSection(target)
      return previous.slice(0, -1)
    })
  }, [])
  const districtRiskLookup = useMemo(() => districtRiskLookupByName(), [])
  const availableMapDistricts = useMemo(() => listDistrictsByProvince(selectedProvince), [selectedProvince])
  const selectedDistrictProfile = useMemo<DistrictRiskProfile | null>(
    () => findDistrictRiskProfile(selectedProvince, selectedDistrict),
    [selectedDistrict, selectedProvince],
  )
  const riskValue = selectedDistrictProfile?.[mapLayer] ?? provinceRisk[selectedProvince][mapLayer]
  const selectedDistrictContacts = useMemo(
    () => districtContacts[selectedDistrict ?? ''] ?? districtContacts.default,
    [selectedDistrict],
  )
  const selectedDistrictReadiness = useMemo(
    () => districtReadinessIndex[selectedDistrict ?? ''] ?? { score: 58, retrofittedSchools: 45, shelters: 20, warningCoverage: 61, floodMapsPublished: false },
    [selectedDistrict],
  )
  const evacuationAssets = useMemo(
    () => evacuationAssetsByDistrict[selectedDistrict ?? ''] ?? [],
    [selectedDistrict],
  )
  const availableDrawings = useMemo(() => engineeringDrawingLibrary[mapLayer], [mapLayer])
  const activeDrawing = useMemo(
    () => availableDrawings.find((drawing) => drawing.id === activeDrawingId) ?? availableDrawings[0],
    [activeDrawingId, availableDrawings],
  )
  const districtTopRisks = useMemo(() => {
    if (!selectedDistrictProfile) {
      return ['Unreinforced masonry in lifeline buildings', 'Poor drainage around settlements', 'Limited emergency access routes']
    }
    return [
      `${selectedDistrictProfile.dominantStructure} vulnerability hotspot`,
      `Earthquake exposure: ${selectedDistrictProfile.earthquake}`,
      `Flood exposure: ${selectedDistrictProfile.flood}`,
    ]
  }, [selectedDistrictProfile])
  const localMaterialGuide = useMemo(() => {
    const profile = selectedDistrictProfile
    const recommended = profile?.earthquake === 'Very High'
      ? ['Ductile RCC frame with confined masonry infill', 'Stone masonry with full confinement bands', 'FRP wrapping for priority retrofit zones']
      : ['Confined masonry', 'RCC with corrosion-protected reinforcement', 'Stabilized block walls with tie-beams']
    const risky = ['Unreinforced adobe', 'Unanchored parapets', 'Light roof without wall ties']
    const suppliers = [
      `${selectedProvince} C&W approved material depots`,
      'PDMA-partner vendor list (district emergency stores)',
      'Local market: waterproofing membrane, anchor bolts, and mesh reinforcement',
    ]
    return { recommended, risky, suppliers }
  }, [selectedDistrictProfile, selectedProvince])
  const districtRetrofitCostRange = useMemo(() => {
    const cityRate = cityRateByProvince[selectedProvince]?.[retrofitCity]?.laborDaily ?? 2800
    const profileFactor = selectedDistrictProfile?.infraRisk === 'Very High' ? 1.35 : selectedDistrictProfile?.infraRisk === 'High' ? 1.22 : 1.1
    const base = Math.max(1800000, Math.round(cityRate * 720 * profileFactor))
    const high = Math.round(base * (selectedDistrictProfile?.infraRisk === 'Very High' ? 1.42 : 1.28))
    return { min: base, max: high }
  }, [selectedDistrictProfile, selectedProvince, retrofitCity])
  const hazardAlertOverlay = useMemo<HazardAlertOverlay[]>(() => {
    const basePoint = selectedDistrict ? districtCenters[selectedDistrict] : provinceCenters[selectedProvince]
    const fallbackLat = basePoint?.lat ?? 30.2
    const fallbackLng = basePoint?.lng ?? 69.3

    const mapped = alertLog.slice(0, 8).map((alert, index) => {
      const lower = alert.title.toLowerCase()
      const inferredType: HazardAlertOverlay['type'] = lower.includes('rain') || lower.includes('flood')
        ? lower.includes('rain')
          ? 'Heavy Rain'
          : 'Flood Warning'
        : lower.includes('earthquake') || lower.includes('quake')
          ? 'Earthquake'
          : 'Relief Point'
      const severity: HazardAlertOverlay['severity'] = lower.includes('severe') || lower.includes('high')
        ? 'High'
        : lower.includes('moderate')
          ? 'Medium'
          : 'Low'
      const icon = inferredType === 'Flood Warning' ? '⚠️' : inferredType === 'Heavy Rain' ? '🌧️' : inferredType === 'Earthquake' ? '🧯' : '🛰️'
      const publishedAt = alert.publishedAt ?? new Date(Date.now() - index * 6 * 60 * 60 * 1000).toISOString()

      return {
        id: `overlay-${alert.id}`,
        title: alert.title,
        type: inferredType,
        severity,
        advisory: alert.summary ?? 'Follow district advisories and verify nearest shelter route.',
        icon,
        publishedAt,
        isOngoing: index % 3 === 0,
        lat: fallbackLat + ((index % 3) - 1) * 0.16,
        lng: fallbackLng + ((index % 2) - 0.5) * 0.22,
      }
    })

    return mapped
  }, [alertLog, selectedDistrict, selectedProvince])
  const filteredHazardAlerts = useMemo(() => {
    const now = Date.now()
    return hazardAlertOverlay.filter((item) => {
      if (alertFilterWindow === 'ongoing') return item.isOngoing
      const ageHours = (now - Date.parse(item.publishedAt)) / (1000 * 60 * 60)
      return alertFilterWindow === '24h' ? ageHours <= 24 : ageHours <= 24 * 7
    })
  }, [alertFilterWindow, hazardAlertOverlay])
  const availableRetrofitCities = useMemo(() => pakistanCitiesByProvince[selectedProvince] ?? [], [selectedProvince])
  const availableApplyCities = useMemo(() => pakistanCitiesByProvince[applyProvince] ?? [], [applyProvince])
  const availableDesignCities = useMemo(() => pakistanCitiesByProvince[designProvince] ?? [], [designProvince])
  const visibleGlobalPractices = useMemo(
    () => globalPracticeLibrary[bestPracticeHazard].slice(0, bestPracticeVisibleCount),
    [bestPracticeHazard, bestPracticeVisibleCount],
  )

  useEffect(() => {
    if (!availableRetrofitCities.includes(retrofitCity)) {
      setRetrofitCity(availableRetrofitCities[0] ?? '')
    }
  }, [availableRetrofitCities, retrofitCity])

  useEffect(() => {
    if (!availableApplyCities.includes(applyCity)) {
      setApplyCity(availableApplyCities[0] ?? '')
    }
  }, [availableApplyCities, applyCity])

  useEffect(() => {
    if (!availableDesignCities.includes(designCity)) {
      setDesignCity(availableDesignCities[0] ?? '')
    }
  }, [availableDesignCities, designCity])

  useEffect(() => {
    if (!selectedDistrict) return
    if (!availableMapDistricts.includes(selectedDistrict)) {
      setSelectedDistrict(null)
    }
  }, [availableMapDistricts, selectedDistrict])

  useEffect(() => {
    setRiskActionProgress(12)
    const timer = window.setTimeout(() => setRiskActionProgress(selectedDistrict ? 100 : 54), 260)
    return () => window.clearTimeout(timer)
  }, [selectedDistrict, mapLayer])

  useEffect(() => {
    setBestPracticeVisibleCount(2)
  }, [bestPracticeHazard])

  const generateApplyAreaGuidance = async () => {
    setGuidanceError(null)
    setConstructionGuidance(null)
    setGuidanceStepImages([])
    setIsGeneratingGuidance(true)

    try {
      const guidance = await generateConstructionGuidance({
        province: applyProvince,
        city: applyCity,
        hazard: applyHazard,
        structureType,
      })

      setConstructionGuidance(guidance)
      setIsGeneratingStepImages(true)

      try {
        const imageResult = await generateGuidanceStepImages({
          province: applyProvince,
          city: applyCity,
          hazard: applyHazard,
          structureType,
          steps: guidance.steps,
        })
        setGuidanceStepImages(imageResult.images)
      } finally {
        setIsGeneratingStepImages(false)
      }
    } catch (error) {
      setGuidanceError(error instanceof Error ? error.message : 'Guidance generation failed.')
    } finally {
      setIsGeneratingGuidance(false)
    }
  }

  const downloadApplyGuidanceReport = () => {
    if (!constructionGuidance) return

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 12
    const contentWidth = pageWidth - margin * 2
    const footerY = pageHeight - 10
    const generatedAt = new Date().toLocaleString()

    let cursorY = 20
    let pageNumber = 1

    const drawPageFrame = () => {
      doc.setDrawColor(190, 208, 224)
      doc.setLineWidth(0.5)
      doc.roundedRect(7, 7, pageWidth - 14, pageHeight - 14, 2, 2)
    }

    const drawPageHeader = (continued = false) => {
      drawPageFrame()
      doc.setFillColor(238, 246, 255)
      doc.setDrawColor(199, 219, 238)
      doc.roundedRect(margin, 12, contentWidth, 16, 2, 2, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(24, 66, 105)
      doc.setFontSize(12)
      doc.text(continued ? 'Resilience360 Construction Guidance (Continued)' : 'Resilience360 Construction Guidance Report', margin + 3, 19)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 84, 107)
      doc.setFontSize(9)
      doc.text(`${applyCity}, ${applyProvince} · Hazard: ${applyHazard}`, margin + 3, 24)
      cursorY = 34
    }

    const drawFooter = () => {
      doc.setDrawColor(221, 231, 241)
      doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(90, 104, 119)
      doc.text(`Generated: ${generatedAt}`, margin, footerY)
      doc.text(`Page ${pageNumber}`, pageWidth - margin, footerY, { align: 'right' })
    }

    const ensureSpace = (requiredHeight: number) => {
      if (cursorY + requiredHeight <= footerY - 4) return
      drawFooter()
      doc.addPage()
      pageNumber += 1
      drawPageHeader(true)
    }

    const drawSection = (title: string, bodyLines: string[]) => {
      const wrappedLines = bodyLines.flatMap((line) => doc.splitTextToSize(line, contentWidth - 8))
      const sectionHeight = 8 + wrappedLines.length * 5 + 6
      ensureSpace(sectionHeight)

      doc.setFillColor(249, 252, 255)
      doc.setDrawColor(206, 220, 236)
      doc.roundedRect(margin, cursorY, contentWidth, sectionHeight, 2, 2, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(25, 76, 117)
      doc.setFontSize(10)
      doc.text(title, margin + 3, cursorY + 5)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(40, 65, 88)
      doc.setFontSize(9.5)

      let lineY = cursorY + 10
      for (const line of wrappedLines) {
        doc.text(line, margin + 4, lineY)
        lineY += 5
      }

      cursorY += sectionHeight + 4
    }

    const drawStep = (
      step: { title: string; description: string; keyChecks: string[] },
      index: number,
      imageDataUrl?: string,
    ) => {
      const keyChecks = step.keyChecks.map((item) => `- ${item}`)
      const stepLines = [step.description, 'Key Checks:', ...keyChecks]
      const wrappedStepLines = stepLines.flatMap((line) => doc.splitTextToSize(line, contentWidth - 8))
      const lineBlockHeight = wrappedStepLines.length * 5
      const hasImage = Boolean(imageDataUrl)
      const imageHeight = hasImage ? 56 : 0
      const blockHeight = 12 + lineBlockHeight + imageHeight + 8

      ensureSpace(blockHeight)

      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(204, 219, 235)
      doc.roundedRect(margin, cursorY, contentWidth, blockHeight, 2, 2, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(24, 66, 105)
      doc.setFontSize(10)
      doc.text(`Step ${index + 1}: ${step.title}`, margin + 3, cursorY + 6)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(46, 71, 93)
      doc.setFontSize(9.5)

      let textY = cursorY + 12
      for (const line of wrappedStepLines) {
        doc.text(line, margin + 4, textY)
        textY += 5
      }

      if (hasImage && imageDataUrl) {
        const imageWidth = contentWidth - 8
        try {
          doc.addImage(imageDataUrl, 'PNG', margin + 4, textY + 2, imageWidth, imageHeight)
        } catch {
          doc.setFontSize(9)
          doc.setTextColor(120, 80, 52)
          doc.text('Step image preview unavailable in PDF export.', margin + 4, textY + 7)
        }
      }

      cursorY += blockHeight + 4
    }

    drawPageHeader()

    drawSection('Project Context', [
      `Province: ${applyProvince}`,
      `City: ${applyCity}`,
      `Hazard Focus: ${applyHazard}`,
      `Structure Type: ${structureType}`,
    ])

    drawSection('Executive Summary', [constructionGuidance.summary])
    drawSection('Recommended Materials', constructionGuidance.materials.map((item) => `- ${item}`))
    drawSection('Safety Requirements', constructionGuidance.safety.map((item) => `- ${item}`))

    for (const [index, step] of constructionGuidance.steps.entries()) {
      const image = guidanceStepImages.find((item) => item.stepTitle === step.title) ?? guidanceStepImages[index]
      drawStep(step, index, image?.imageDataUrl)
    }

    drawFooter()
    doc.save(`resilience360-guidance-report-${applyProvince}-${applyCity}-${Date.now()}.pdf`)
  }

  const designHazardOverlay = useMemo(() => getHazardOverlay(designProvince, designCity), [designProvince, designCity])

  const designCityRates = useMemo(
    () =>
      cityRateByProvince[designProvince]?.[designCity] ?? {
        laborDaily: 2600,
        materialIndex: 1,
        logisticsIndex: 1,
      },
    [designProvince, designCity],
  )

  const materialSuitability = useMemo(() => {
    const recommendations: string[] = []
    const flags: string[] = []

    if (designHazardOverlay.seismicZone >= 4) {
      recommendations.push('Ductile RCC frame with confined masonry infill')
      recommendations.push('Stone masonry only with proper confinement and bands')
      flags.push('Unreinforced masonry (URM) is unsafe for this seismic zone')
    } else {
      recommendations.push('Confined masonry with reinforced bands')
      recommendations.push('RCC with corrosion-protected reinforcement')
    }

    if (designHumidity === 'High' || designSoilType === 'Saline') {
      recommendations.push('Lime-stabilized blocks with damp-proof layer')
      flags.push('Saline/humid conditions require sulfate-resistant cement')
    }

    if (designSoilType === 'Clayey') {
      flags.push('Clayey soil: settlement risk, avoid shallow unreinforced footings')
    }

    if (designHazardOverlay.floodDepth100y >= 1.5) {
      recommendations.push('Flood-resistant plinth and water-resistant lower finishes')
      flags.push('Flood depth >1.5m: avoid untreated mud walls at base level')
    }

    return {
      recommendations,
      flags,
    }
  }, [designHazardOverlay.floodDepth100y, designHazardOverlay.seismicZone, designHumidity, designSoilType])

  const slopeEstimator = useMemo(() => {
    const angleFactor = slopeAngleDeg / 30
    const heightFactor = slopeHeightM / 5
    const soilFactor = designSoilType === 'Rocky' ? 0.8 : designSoilType === 'Sandy' ? 1.05 : designSoilType === 'Clayey' ? 1.2 : 1.1
    const riskIndex = angleFactor * 40 + heightFactor * 35 + soilFactor * 25

    const stabilityClass = riskIndex >= 95 ? 'High Risk' : riskIndex >= 70 ? 'Moderate Risk' : 'Low Risk'
    const wallType = riskIndex >= 95 ? 'Reinforced concrete cantilever wall' : riskIndex >= 70 ? 'Gravity wall with toe key' : 'Dry/lean concrete retaining wall'
    const embedment = Math.max(0.8, Math.round((slopeHeightM * (riskIndex >= 95 ? 0.35 : riskIndex >= 70 ? 0.28 : 0.22)) * 10) / 10)
    const drainage = riskIndex >= 70 ? 'Provide weep holes + perforated back drain + geotextile filter' : 'Provide basic back drain and weep holes'

    return { stabilityClass, wallType, embedment, drainage }
  }, [designSoilType, slopeAngleDeg, slopeHeightM])

  const shelterCapacityPlan = useMemo(() => {
    const areaPerPerson = shelterOccupancyType === 'School' ? 1.2 : shelterOccupancyType === 'Mosque' ? 1 : 1.5
    const maxCapacity = Math.max(5, Math.floor(shelterAreaSqm / areaPerPerson))

    const layout = [
      'Keep 1.2m minimum circulation aisle',
      'Reserve corner zone for first aid and women/children support',
      'Provide separate WASH access and ventilation path',
    ]

    return { maxCapacity, areaPerPerson, layout }
  }, [shelterAreaSqm, shelterOccupancyType])

  const foundationRecommendation = useMemo(() => {
    const soil = designSoilType
    const flood = designHazardOverlay.floodDepth100y
    const seismic = designHazardOverlay.seismicZone

    if (flood >= 1.6 || soil === 'Saline') {
      return {
        type: 'Pile foundation with elevated plinth beam',
        risks: ['Differential settlement risk in saturated layers', 'Corrosion risk in saline moisture'],
      }
    }
    if (seismic >= 4 || soil === 'Sandy') {
      return {
        type: 'Raft foundation with tie beams',
        risks: ['Liquefaction-induced settlement if compaction is weak'],
      }
    }
    if (soil === 'Clayey') {
      return {
        type: 'Strip footing with moisture control and tie beams',
        risks: ['Shrink-swell movement under seasonal moisture variation'],
      }
    }

    return {
      type: 'Conventional strip footing',
      risks: ['Verify bearing capacity with local geotechnical check'],
    }
  }, [designHazardOverlay.floodDepth100y, designHazardOverlay.seismicZone, designSoilType])

  const windStormGuide = useMemo(() => {
    const coastal = coastalCities.has(designCity)
    return {
      roofAngle: coastal ? '22°–30°' : '18°–25°',
      openings: coastal ? 'Openings ≤20% on windward wall with storm shutters' : 'Openings ≤30% with lintel anchorage',
      tieBeams: coastal ? 'Continuous tie beams with corrosion-resistant anchors at all wall junctions' : 'Tie beams at plinth/lintel/roof levels',
      note: coastal ? 'High storm exposure: prioritize roof hold-down anchors and edge detailing.' : 'Standard wind resistance detailing is sufficient with proper anchorage.',
    }
  }, [designCity])

  const nonStructuralChecklist = useMemo(
    () => [
      'Anchor rooftop solar panels with wind-rated brackets',
      'Brace overhead and wall-mounted water tanks',
      'Fix tall shelves/cabinets to structural walls',
      'Anchor internal partitions and suspended services',
      'Secure inverter/battery racks and electrical panels above flood line',
    ],
    [],
  )

  const designCostEstimate = useMemo(() => {
    const area = Math.max(300, floorAreaSqftCost)
    const baseByHouseType: Record<typeof houseTypeForCost, number> = {
      'Single-Storey': 850,
      'Double-Storey': 980,
      'School Block': 1220,
      'Clinic Unit': 1150,
    }

    const hazardMultiplier =
      (designHazardOverlay.seismicZone >= 4 ? 1.12 : 1.03) *
      (designHazardOverlay.floodDepth100y >= 1.5 ? 1.1 : 1.02) *
      (designHazardOverlay.liquefaction === 'High' ? 1.08 : designHazardOverlay.liquefaction === 'Medium' ? 1.04 : 1)

    const locationMultiplier =
      (designCityRates.laborDaily / 2600) * 0.45 + designCityRates.materialIndex * 0.45 + designCityRates.logisticsIndex * 0.1

    const unitCost = baseByHouseType[houseTypeForCost] * hazardMultiplier * locationMultiplier
    const subtotal = area * unitCost
    const contingency = subtotal * 0.1
    const total = subtotal + contingency

    return {
      unitCost,
      subtotal,
      contingency,
      total,
    }
  }, [designCityRates.laborDaily, designCityRates.logisticsIndex, designCityRates.materialIndex, designHazardOverlay.floodDepth100y, designHazardOverlay.liquefaction, designHazardOverlay.seismicZone, floorAreaSqftCost, houseTypeForCost])

  const communityScanner = useMemo(
    () => [
      { name: `${designCity} Health Post`, readiness: designHazardOverlay.floodDepth100y > 1.5 ? 'Vulnerable' : 'Moderate', priority: 'Raise utility platforms and backup power' },
      { name: `${designCity} Government School`, readiness: designHazardOverlay.seismicZone >= 4 ? 'Vulnerable' : 'Moderate', priority: 'Add non-structural anchorage and evacuation signage' },
      { name: `${designCity} Community Water Point`, readiness: designHazardOverlay.liquefaction === 'High' ? 'Vulnerable' : 'Moderate', priority: 'Protect pump controls and floodproof access path' },
    ],
    [designCity, designHazardOverlay.floodDepth100y, designHazardOverlay.liquefaction, designHazardOverlay.seismicZone],
  )

  const handleEstimateTotalUpgradeCost = () => {
    setDesignSummaryText(
      `Estimated total resilient upgrade cost for ${designCity}, ${designProvince}: PKR ${Math.round(designCostEstimate.total).toLocaleString()} (including contingency).`,
    )
  }

  const downloadConstructionDrawings = () => {
    const doc = new jsPDF()
    doc.setFontSize(15)
    doc.text('Resilience360 - Construction Drawings Pack (Concept Notes)', 14, 16)
    doc.setFontSize(11)
    doc.text(`Location: ${designCity}, ${designProvince}`, 14, 26)
    doc.text(`Foundation Recommendation: ${foundationRecommendation.type}`, 14, 34)
    doc.text(`Retaining Wall: ${slopeEstimator.wallType}`, 14, 42)
    doc.text(`Embedment: ${slopeEstimator.embedment} m`, 14, 50)
    doc.text(`Wind Guide: Roof ${windStormGuide.roofAngle}`, 14, 58)
    doc.text(`Tie Beam Detail: ${windStormGuide.tieBeams}`, 14, 66)
    doc.save('resilience360-construction-drawings.pdf')
  }

  const generateFieldImplementationChecklist = () => {
    const doc = new jsPDF()
    doc.setFontSize(15)
    doc.text('Field Implementation Checklist', 14, 16)
    doc.setFontSize(11)
    doc.text(`Area: ${designCity}, ${designProvince}`, 14, 26)
    doc.text('- Verify soil and hazard inputs before layout', 14, 36)
    doc.text('- Mark foundation lines and flood-safe plinth level', 14, 44)
    doc.text('- Install drainage + moisture barriers before walling', 14, 52)
    doc.text('- Apply confinement/tie elements at required levels', 14, 60)
    doc.text('- Anchor non-structural components before handover', 14, 68)
    doc.save('resilience360-field-checklist.pdf')
  }

  const shareDesignWithCommunity = async () => {
    const message = `Resilience360 design summary for ${designCity}, ${designProvince}: estimated upgrade cost PKR ${Math.round(designCostEstimate.total).toLocaleString()}, foundation ${foundationRecommendation.type}, hazard overlay SZ-${designHazardOverlay.seismicZone}.`
    let wasShared = false
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Resilience360 Community Design', text: message })
        wasShared = true
      } catch {
        wasShared = false
      }
    }
    if (wasShared) return
    await navigator.clipboard.writeText(message)
    setDesignSummaryText('Design summary copied to clipboard for community sharing.')
  }

  const loadResilienceInfraModels = async () => {
    setInfraModelsError(null)
    setIsLoadingInfraModels(true)

    try {
      const result = await fetchResilienceInfraModels({
        country: 'Pakistan',
        province: selectedProvince,
      })
      setInfraModels((existing) => {
        const deduped = new Map<string, InfraModel>()
        for (const model of existing) {
          deduped.set(model.id, model)
        }
        for (const model of result.models) {
          const key = deduped.has(model.id) ? `${model.id}-${model.title}` : model.id
          deduped.set(key, model)
        }
        return Array.from(deduped.values())
      })
    } catch (error) {
      setInfraModelsError(error instanceof Error ? error.message : 'Infra model loading failed.')
    } finally {
      setIsLoadingInfraModels(false)
    }
  }

  const runInfraModelResearch = async () => {
    const modelName = infraResearchName.trim()
    if (!modelName) {
      setInfraResearchError('Please enter an infrastructure model name to research.')
      return
    }

    setInfraResearchError(null)
    setStructuralDesignError(null)
    setInfraResearchResult(null)
    setInfraResearchImages([])
    setStructuralDesignReport(null)
    setShowStructuralDesignForm(false)
    setIsResearchingInfra(true)

    try {
      const research = await researchInfraModel({
        modelName,
        province: selectedProvince,
      })
      setInfraResearchResult(research)
      setDesignReportLocation(locationText)
      setIsGeneratingInfraViews(true)

      try {
        const views = await generateInfraModelResearchImages({
          modelName,
          province: selectedProvince,
        })
        setInfraResearchImages(views.images)
      } finally {
        setIsGeneratingInfraViews(false)
      }
    } catch (error) {
      setInfraResearchError(error instanceof Error ? error.message : 'Infra model research failed.')
    } finally {
      setIsResearchingInfra(false)
    }
  }

  const runStructuralDesignReport = async () => {
    if (!infraResearchResult) {
      setStructuralDesignError('Please research an infra model first.')
      return
    }

    const normalizedLocation = designReportLocation.trim()
    if (!normalizedLocation) {
      setStructuralDesignError('Please enter location for rates and design context.')
      return
    }

    setStructuralDesignError(null)
    setStructuralDesignReport(null)
    setIsGeneratingStructuralDesign(true)

    try {
      const report = await generateStructuralDesignReport({
        modelName: infraResearchResult.modelName,
        location: normalizedLocation,
        geoTechReport: designReportGeoTech.trim(),
        stories: Math.max(1, Math.round(designReportStories)),
        intendedUse: designReportUseType,
      })
      setStructuralDesignReport(report)
    } catch (error) {
      setStructuralDesignError(error instanceof Error ? error.message : 'Structural design report generation failed.')
    } finally {
      setIsGeneratingStructuralDesign(false)
    }
  }

  const readinessScore = useMemo(() => {
    let score = 50
    if (buildingType === 'Critical Infrastructure') score += 20
    if (materialType === 'Unreinforced Masonry') score += 15
    if (lifeline === 'Yes') score += 10
    if (locationText.toLowerCase().includes('karachi') || locationText.toLowerCase().includes('sukkur')) {
      score += 10
    }
    return Math.min(score, 100)
  }, [buildingType, materialType, lifeline, locationText])

  const imageCostSignals = useMemo(() => {
    if (!visionAnalysis) return null
    const signals = visionAnalysis.costSignals

    const mapScope = (scope: 'basic' | 'standard' | 'comprehensive'): 'Basic' | 'Standard' | 'Comprehensive' => {
      if (scope === 'basic') return 'Basic'
      if (scope === 'comprehensive') return 'Comprehensive'
      return 'Standard'
    }

    const mapDamage = (level: 'low' | 'medium' | 'high'): 'Low' | 'Medium' | 'High' => {
      if (level === 'low') return 'Low'
      if (level === 'high') return 'High'
      return 'Medium'
    }

    const confidenceMean =
      visionAnalysis && visionAnalysis.defects.length > 0
        ? visionAnalysis.defects.reduce((sum, defect) => sum + defect.confidence, 0) / visionAnalysis.defects.length
        : 0.6

    if (!signals) {
      const defectCount = visionAnalysis.defects.length
      const highCount = visionAnalysis.defects.filter((defect) => defect.severity === 'high').length
      const mediumCount = visionAnalysis.defects.filter((defect) => defect.severity === 'medium').length
      const lowCount = visionAnalysis.defects.filter((defect) => defect.severity === 'low').length

      const weightedSeverity = highCount * 3 + mediumCount * 2 + lowCount
      const averageSeverity = defectCount > 0 ? weightedSeverity / defectCount : 1.4
      const assessedDamageLevel: 'Low' | 'Medium' | 'High' =
        averageSeverity >= 2.4 ? 'High' : averageSeverity >= 1.65 ? 'Medium' : 'Low'
      const severityScore = Math.max(20, Math.min(95, (averageSeverity / 3) * 100 + highCount * 6 + mediumCount * 2))
      const affectedAreaPercent = Math.max(12, Math.min(90, 18 + defectCount * 7 + highCount * 6 + mediumCount * 3))
      const urgencyLevel: 'routine' | 'priority' | 'critical' =
        highCount >= 2 || severityScore >= 75 ? 'critical' : highCount >= 1 || severityScore >= 55 ? 'priority' : 'routine'
      const recommendedScope: 'Basic' | 'Standard' | 'Comprehensive' =
        severityScore >= 72 || defectCount >= 5 ? 'Comprehensive' : severityScore >= 48 ? 'Standard' : 'Basic'

      return {
        recommendedScope,
        assessedDamageLevel,
        affectedAreaPercent,
        severityScore,
        urgencyLevel,
        confidenceMean,
      }
    }

    const affectedAreaPercent = Math.max(5, Math.min(100, Number(signals.estimatedAffectedAreaPercent) || 5))
    const severityScore = Math.max(0, Math.min(100, Number(signals.severityScore) || 0))

    return {
      recommendedScope: mapScope(signals.recommendedScope),
      assessedDamageLevel: mapDamage(signals.assessedDamageLevel),
      affectedAreaPercent,
      severityScore,
      urgencyLevel: signals.urgencyLevel,
      confidenceMean,
    }
  }, [visionAnalysis])

  const estimatedRetrofitAreaSqft = useMemo(
    () => estimateRetrofitArea(structureType, visionAnalysis?.costSignals, visionAnalysis?.defects.length ?? 0),
    [structureType, visionAnalysis?.costSignals, visionAnalysis?.defects.length],
  )

  const retrofitEstimate = useMemo(() => {
    const area = estimatedRetrofitAreaSqft

    const scopeRate: Record<'Basic' | 'Standard' | 'Comprehensive', number> = {
      Basic: 300,
      Standard: 700,
      Comprehensive: 1200,
    }

    const structureFactor: Record<string, number> = {
      'Masonry House': 1,
      'RC Frame': 1.2,
      'School Block': 1.35,
      'Bridge Approach': 1.5,
    }

    const damageFactor: Record<'Low' | 'Medium' | 'High', number> = {
      Low: 1,
      Medium: 1.2,
      High: 1.45,
    }

    const urgencyFactor: Record<'routine' | 'priority' | 'critical', number> = {
      routine: 1,
      priority: 1.08,
      critical: 1.18,
    }

    const cityRates = cityRateByProvince[selectedProvince]?.[retrofitCity] ?? {
      laborDaily: 2600,
      materialIndex: 1,
      logisticsIndex: 1,
    }
    const laborFactor = cityRates.laborDaily / 2600
    const materialFactor = cityRates.materialIndex
    const logisticsFactor = cityRates.logisticsIndex
    const locationFactor = laborFactor * 0.45 + materialFactor * 0.45 + logisticsFactor * 0.1

    const effectiveScope = imageCostSignals?.recommendedScope ?? retrofitScope
    const effectiveDamageLevel = imageCostSignals?.assessedDamageLevel ?? retrofitDamageLevel
    const effectiveAreaFactor = imageCostSignals
      ? Math.max(0.45, Math.min(1.2, imageCostSignals.affectedAreaPercent / 100 + 0.25))
      : 1
    const severityBoost = imageCostSignals ? 0.9 + (imageCostSignals.severityScore / 100) * 0.35 : 1
    const urgencyBoost = imageCostSignals ? urgencyFactor[imageCostSignals.urgencyLevel] : 1

    const provinceProfile = provinceRisk[selectedProvince]
    const hazardFactor =
      provinceProfile.earthquake === 'Very High' || provinceProfile.flood === 'Very High'
        ? 1.15
        : provinceProfile.earthquake === 'High' || provinceProfile.flood === 'High'
          ? 1.08
          : 1

    const visibilityPenalty: Record<'excellent' | 'good' | 'fair' | 'poor', number> = {
      excellent: 0.1,
      good: 0.14,
      fair: 0.2,
      poor: 0.26,
    }

    const uncertaintySpread = imageCostSignals
      ? Math.max(
          0.12,
          Math.min(0.35, visibilityPenalty[visionAnalysis?.imageQuality.visibility ?? 'good'] + (1 - imageCostSignals.confidenceMean) * 0.22),
        )
      : 0.18

    const baseCost =
      area *
      scopeRate[effectiveScope] *
      (structureFactor[structureType] ?? 1) *
      damageFactor[effectiveDamageLevel] *
      effectiveAreaFactor *
      severityBoost *
      urgencyBoost *
      locationFactor
    const adjustedCost = baseCost * hazardFactor
    const contingency = adjustedCost * 0.12
    const totalCost = adjustedCost + contingency
    const durationWeeks = Math.max(
      2,
      Math.round((area / 450) * (effectiveScope === 'Comprehensive' ? 1.5 : effectiveScope === 'Standard' ? 1.15 : 0.85) * urgencyBoost),
    )

    const mlScope =
      mlEstimate?.predictedScope === 'comprehensive'
        ? 'Comprehensive'
        : mlEstimate?.predictedScope === 'basic'
          ? 'Basic'
          : 'Standard'
    const mlDamage =
      mlEstimate?.predictedDamage === 'high' ? 'High' : mlEstimate?.predictedDamage === 'low' ? 'Low' : 'Medium'

    const mlBaseCost = mlEstimate ? mlEstimate.predictedCostPerSqft * area : baseCost
    const mlAdjustedCost = mlEstimate ? mlBaseCost * hazardFactor : adjustedCost
    const mlContingency = mlEstimate ? mlAdjustedCost * 0.12 : contingency
    const mlTotalCost = mlEstimate ? mlAdjustedCost + mlContingency : totalCost
    const mlSpread = mlEstimate ? Math.max(0.1, Math.min(0.28, 0.22 - mlEstimate.confidence * 0.12)) : uncertaintySpread

    return {
      area,
      baseCost: mlBaseCost,
      adjustedCost: mlAdjustedCost,
      contingency: mlContingency,
      totalCost: mlTotalCost,
      minTotalCost: mlTotalCost * (1 - mlSpread),
      maxTotalCost: mlTotalCost * (1 + mlSpread),
      durationWeeks: mlEstimate?.predictedDurationWeeks ?? durationWeeks,
      sqftRate: mlTotalCost / area,
      effectiveScope: mlEstimate ? mlScope : effectiveScope,
      effectiveDamageLevel: mlEstimate ? mlDamage : effectiveDamageLevel,
      estimateSource: mlEstimate ? 'ML Model' : imageCostSignals ? 'Image-driven' : 'Manual',
      affectedAreaPercent: imageCostSignals?.affectedAreaPercent,
      urgencyLevel: imageCostSignals?.urgencyLevel,
      locationFactor,
      laborDaily: cityRates.laborDaily,
      materialIndex: cityRates.materialIndex,
      logisticsIndex: cityRates.logisticsIndex,
      mlConfidence: mlEstimate?.confidence,
      mlModel: mlEstimate?.model,
      mlGuidance: mlEstimate?.guidance ?? [],
    }
  }, [
    retrofitScope,
    structureType,
    retrofitDamageLevel,
    selectedProvince,
    imageCostSignals,
    visionAnalysis?.imageQuality.visibility,
    retrofitCity,
    mlEstimate,
    estimatedRetrofitAreaSqft,
  ])

  const toolkit = {
    seismicLoad: selectedProvince === 'GB' || selectedProvince === 'KP' ? 0.36 : 0.24,
    floodElevation: selectedProvince === 'Sindh' ? 2.8 : 1.9,
    safeFoundationHeight: selectedProvince === 'Sindh' ? 3.4 : 2.3,
    vulnerabilityScore: selectedRole === 'Engineer / Planner' ? 42 : 58,
    retrofittingTechnique:
      structureType === 'Masonry House' ? 'Steel mesh + shotcrete jacketing' : 'Column jacketing + shear walls',
  }

  const analyzeRetrofitImage = async (file: File) => {
    setIsAnalyzingImage(true)
    setRetrofitError(null)
    setVisionAnalysis(null)
    setMlEstimate(null)

    try {
      if (!retrofitCity.trim()) {
        throw new Error('Please enter city/district location in Pakistan before image upload.')
      }

      const imageUrl = URL.createObjectURL(file)
      setRetrofitImagePreview(imageUrl)

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Unable to read the uploaded image.'))
        img.src = imageUrl
      })

      const canvas = document.createElement('canvas')
      const maxWidth = 900
      const ratio = image.width > maxWidth ? maxWidth / image.width : 1
      const width = Math.max(1, Math.round(image.width * ratio))
      const height = Math.max(1, Math.round(image.height * ratio))

      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Image analysis context unavailable.')
      }

      context.drawImage(image, 0, 0, width, height)
      const imageData = context.getImageData(0, 0, width, height).data

      let graySum = 0
      let graySquaredSum = 0
      let edgeSum = 0
      let pixelCount = 0

      for (let index = 0; index < imageData.length; index += 4) {
        const red = imageData[index]
        const green = imageData[index + 1]
        const blue = imageData[index + 2]
        const gray = red * 0.299 + green * 0.587 + blue * 0.114
        graySum += gray
        graySquaredSum += gray * gray
        pixelCount += 1

        if (index >= 4) {
          const prevRed = imageData[index - 4]
          const prevGreen = imageData[index - 3]
          const prevBlue = imageData[index - 2]
          const prevGray = prevRed * 0.299 + prevGreen * 0.587 + prevBlue * 0.114
          edgeSum += Math.abs(gray - prevGray)
        }
      }

      const meanGray = graySum / pixelCount
      const variance = Math.max(0, graySquaredSum / pixelCount - meanGray * meanGray)
      const stdDev = Math.sqrt(variance)
      const sharpness = edgeSum / pixelCount

      let quality: ImageInsights['quality'] = 'Good'
      if (width < 700 || height < 500 || stdDev < 28 || sharpness < 9) quality = 'Fair'
      if (width < 500 || height < 350 || stdDev < 18 || sharpness < 6 || meanGray < 45 || meanGray > 215) {
        quality = 'Poor'
      }
      if (width > 1200 && height > 800 && stdDev > 45 && sharpness > 13 && meanGray >= 70 && meanGray <= 190) {
        quality = 'Excellent'
      }

      setRetrofitImageInsights({
        width,
        height,
        brightness: meanGray,
        contrast: stdDev,
        sharpness,
        quality,
      })

      const riskProfile = provinceRisk[selectedProvince]
      const riskText = `earthquake=${riskProfile.earthquake}, flood=${riskProfile.flood}, landslide=${riskProfile.landslide}`

      const analysis = await analyzeBuildingWithVision({
        image: file,
        structureType,
        province: selectedProvince,
        location: `${retrofitCity}, ${selectedProvince}, Pakistan`,
        riskProfile: riskText,
      })

      setVisionAnalysis(analysis)

      if (analysis.costSignals) {
        const detectedDamage =
          analysis.costSignals.assessedDamageLevel === 'high'
            ? 'High'
            : analysis.costSignals.assessedDamageLevel === 'low'
              ? 'Low'
              : 'Medium'
        const detectedScope =
          analysis.costSignals.recommendedScope === 'comprehensive'
            ? 'Comprehensive'
            : analysis.costSignals.recommendedScope === 'basic'
              ? 'Basic'
              : 'Standard'

        setRetrofitDamageLevel(detectedDamage)
        setRetrofitScope(detectedScope)
      }

      const fallbackSeverityScore =
        analysis.defects.length > 0
          ? Math.round(
              (analysis.defects.reduce(
                (sum, defect) =>
                  sum + (defect.severity === 'high' ? 85 : defect.severity === 'medium' ? 60 : 35) * defect.confidence,
                0,
              ) /
                analysis.defects.length) *
                1.1,
            )
          : 45

      try {
        const defectProfile = analysis.defects.reduce(
          (acc, defect) => {
            acc[defect.type] = (acc[defect.type] ?? 0) + 1
            return acc
          },
          {} as Partial<Record<'crack' | 'spalling' | 'corrosion' | 'moisture' | 'deformation' | 'other', number>>,
        )

        const ml = await getMlRetrofitEstimate({
          structureType,
          province: selectedProvince,
          city: retrofitCity,
          areaSqft: estimatedRetrofitAreaSqft,
          severityScore: analysis.costSignals?.severityScore ?? fallbackSeverityScore,
          affectedAreaPercent: analysis.costSignals?.estimatedAffectedAreaPercent ?? Math.min(85, 20 + analysis.defects.length * 8),
          urgencyLevel: analysis.costSignals?.urgencyLevel ?? (analysis.defects.some((defect) => defect.severity === 'high') ? 'critical' : 'priority'),
          laborDaily: cityRateByProvince[selectedProvince]?.[retrofitCity]?.laborDaily,
          materialIndex: cityRateByProvince[selectedProvince]?.[retrofitCity]?.materialIndex,
          logisticsIndex: cityRateByProvince[selectedProvince]?.[retrofitCity]?.logisticsIndex,
          defectProfile,
          imageQuality:
            analysis.imageQuality.visibility === 'excellent' ||
            analysis.imageQuality.visibility === 'good' ||
            analysis.imageQuality.visibility === 'fair' ||
            analysis.imageQuality.visibility === 'poor'
              ? analysis.imageQuality.visibility
              : 'good',
        })

        setMlEstimate(ml)
      } catch {
        setMlEstimate(null)
      }
    } catch (error) {
      setRetrofitError(error instanceof Error ? error.message : 'Image analysis failed.')
      setRetrofitImageInsights(null)
      setVisionAnalysis(null)
      setMlEstimate(null)
    } finally {
      setIsAnalyzingImage(false)
    }
  }

  const retrofitAiGuidelines = useMemo(() => {
    if (visionAnalysis) {
      const modelGuidelines = [...visionAnalysis.priorityActions]
      const immediate = visionAnalysis.retrofitPlan.immediate.map((item) => `Immediate: ${item}`)
      const shortTerm = visionAnalysis.retrofitPlan.shortTerm.map((item) => `Short-term: ${item}`)
      const longTerm = visionAnalysis.retrofitPlan.longTerm.map((item) => `Long-term: ${item}`)
      return [...modelGuidelines, ...immediate, ...shortTerm, ...longTerm]
    }

    if (!retrofitImageInsights) return []

    const guidelines: string[] = []
    const provinceProfile = provinceRisk[selectedProvince]

    if (retrofitImageInsights.quality === 'Poor' || retrofitImageInsights.quality === 'Fair') {
      guidelines.push('Retake a clearer front + side photo in daylight so cracks, joints, and damp zones are visible.')
    }

    if (structureType === 'Masonry House') {
      guidelines.push('Prioritize wall-to-roof anchorage, lintel bands, and mesh jacketing at cracked wall segments.')
    }
    if (structureType === 'RC Frame') {
      guidelines.push('Check soft-story behavior and apply column jacketing with confinement reinforcement at critical bays.')
    }
    if (structureType === 'School Block') {
      guidelines.push('Strengthen evacuation corridors, stair cores, and parapet anchorage for life-safety compliance.')
    }
    if (structureType === 'Bridge Approach') {
      guidelines.push('Stabilize embankment slope, improve drainage, and reinforce approach slab transition zones.')
    }

    if (provinceProfile.earthquake === 'High' || provinceProfile.earthquake === 'Very High') {
      guidelines.push('Use seismic detailing upgrades: ductile ties, shear-wall insertion, and out-of-plane wall restraints.')
    }
    if (provinceProfile.flood === 'High' || provinceProfile.flood === 'Very High') {
      guidelines.push('Add flood retrofit package: plinth elevation, water-resistant finishes, and backflow protection.')
    }
    if (provinceProfile.landslide === 'High') {
      guidelines.push('For slope-prone zones, include retaining systems, toe protection, and sub-surface drainage.')
    }

    guidelines.push(`Recommended primary technique: ${toolkit.retrofittingTechnique}.`)
    return guidelines
  }, [retrofitImageInsights, selectedProvince, structureType, toolkit.retrofittingTechnique, visionAnalysis])

  const savePreferences = (offline: boolean, lightweight: boolean) => {
    localStorage.setItem('r360-offline', String(offline))
    localStorage.setItem('r360-lightweight', String(lightweight))
  }

  const downloadReport = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Resilience360 Readiness Report', 14, 18)
    doc.setFontSize(11)
    doc.text(`Date: ${new Date().toLocaleString()}`, 14, 30)
    doc.text(`Location: ${locationText}`, 14, 38)
    doc.text(`Building Type: ${buildingType}`, 14, 46)
    doc.text(`Material: ${materialType}`, 14, 54)
    doc.text(`Lifeline Presence: ${lifeline}`, 14, 62)
    doc.text(`Risk Score: ${readinessScore}/100`, 14, 70)
    doc.text('Recommendations:', 14, 82)
    doc.text('- Improve lateral strength and ductile detailing', 18, 90)
    doc.text('- Raise plinth above expected flood level', 18, 98)
    doc.text('- Maintain evacuation plan and emergency kit', 18, 106)
    doc.save('resilience360-readiness-report.pdf')
  }

  const downloadRetrofitEstimate = () => {
    const doc = new jsPDF()
    const provinceProfile = provinceRisk[selectedProvince]
    const defectCount = visionAnalysis?.defects.length ?? 0

    doc.setFontSize(16)
    doc.text('Resilience360 Retrofit Estimate', 14, 18)
    doc.setFontSize(11)
    doc.text(`Date: ${new Date().toLocaleString()}`, 14, 28)
    doc.text(`Province: ${selectedProvince}`, 14, 36)
    doc.text(`City/District: ${retrofitCity}`, 14, 44)
    doc.text(`Structure Type: ${structureType}`, 14, 52)
    doc.text(`Estimate Source: ${retrofitEstimate.estimateSource}`, 14, 60)
    doc.text(`Retrofit Scope: ${retrofitEstimate.effectiveScope}`, 14, 68)
    doc.text(`Defect Severity: ${retrofitEstimate.effectiveDamageLevel}`, 14, 76)
    doc.text(`Area: ${retrofitEstimate.area.toLocaleString()} sq ft`, 14, 84)
    doc.text(`Estimated Duration: ${retrofitEstimate.durationWeeks} weeks`, 14, 92)
    doc.text(`Location Cost Factor: ${retrofitEstimate.locationFactor.toFixed(2)}x`, 14, 100)
    doc.text(`Base Cost: PKR ${Math.round(retrofitEstimate.baseCost).toLocaleString()}`, 14, 108)
    doc.text(`Hazard Adjusted: PKR ${Math.round(retrofitEstimate.adjustedCost).toLocaleString()}`, 14, 116)
    doc.text(`Contingency (12%): PKR ${Math.round(retrofitEstimate.contingency).toLocaleString()}`, 14, 124)
    doc.text(`Estimated Total: PKR ${Math.round(retrofitEstimate.totalCost).toLocaleString()}`, 14, 132)
    doc.text(
      `Image-based Range: PKR ${Math.round(retrofitEstimate.minTotalCost).toLocaleString()} - PKR ${Math.round(retrofitEstimate.maxTotalCost).toLocaleString()}`,
      14,
      140,
    )
    doc.text(`Effective Rate: PKR ${Math.round(retrofitEstimate.sqftRate).toLocaleString()}/sq ft`, 14, 148)
    if (retrofitEstimate.affectedAreaPercent) {
      doc.text(`Affected Area (from image): ${Math.round(retrofitEstimate.affectedAreaPercent)}%`, 14, 156)
    }
    if (retrofitEstimate.urgencyLevel) {
      doc.text(`Urgency (from image): ${retrofitEstimate.urgencyLevel}`, 14, 164)
    }

    doc.text('Hazard Profile:', 14, 176)
    doc.text(`- Earthquake: ${provinceProfile.earthquake}`, 18, 184)
    doc.text(`- Flood: ${provinceProfile.flood}`, 18, 192)
    doc.text(`- Landslide: ${provinceProfile.landslide}`, 18, 200)

    const summary = visionAnalysis?.summary ?? 'No model summary available. Estimate based on calculator inputs.'
    const clippedSummary = summary.length > 110 ? `${summary.slice(0, 107)}...` : summary
    doc.text(`Model Summary: ${clippedSummary}`, 14, 212)
    doc.text(`Detected Defects: ${defectCount}`, 14, 220)

    const filename = `resilience360-retrofit-estimate-${Date.now()}.pdf`
    doc.save(filename)
  }

  const downloadDistrictRiskReport = () => {
    const doc = new jsPDF()
    const profile = selectedDistrictProfile
    const districtName = selectedDistrict ?? 'Not selected'
    const hazardLabel = mapLayer === 'infraRisk' ? 'Infrastructure Risk' : mapLayer
    const lines = profile
      ? profile.resilienceActions
      : [
          'Collect local structure inventory and prioritize lifeline assets.',
          'Prepare ward-level evacuation routes and shelter fallback sites.',
          'Run seasonal preparedness drills with local volunteers.',
        ]

    const isUrduReport = districtReportLanguage === 'Urdu'
    const heading = isUrduReport ? 'Resilience360 - ضلعی رسک و ریزیلینس رپورٹ' : 'Resilience360 - District Risk Atlas Report'
    const actionLabel = isUrduReport ? 'عملی ضلعی اقدامات' : 'Practical District Actions'

    doc.setFontSize(16)
    doc.text(heading, 14, 18)
    doc.setFontSize(11)
    doc.text(`Language: ${districtReportLanguage}`, 14, 28)
    doc.text(`Province: ${selectedProvince}`, 14, 36)
    doc.text(`District: ${districtName}`, 14, 44)
    doc.text(`Layer: ${hazardLabel}`, 14, 52)
    doc.text(`Risk Level: ${riskValue}`, 14, 60)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 68)

    if (profile) {
      doc.text(`Dominant Vulnerable Structure: ${profile.dominantStructure}`, 14, 78)
      doc.text(
        `Structure Score (EQ/Flood): ${profile.structureScores.earthquake.toFixed(2)} / ${profile.structureScores.flood.toFixed(2)}`,
        14,
        86,
      )
    }

    doc.text('Top 3 Structural Risks:', 14, 98)
    let y = 106
    districtTopRisks.forEach((risk) => {
      const wrapped = doc.splitTextToSize(`- ${risk}`, 178)
      doc.text(wrapped, 14, y)
      y += wrapped.length * 7
    })

    doc.text(actionLabel + ':', 14, y + 2)
    y += 10

    lines.forEach((item) => {
      const wrapped = doc.splitTextToSize(`- ${item}`, 178)
      doc.text(wrapped, 14, y)
      y += wrapped.length * 7
    })

    doc.text(`Recommended Drawings: ${availableDrawings.map((item) => item.title).join(' | ')}`, 14, y + 6)
    doc.text(
      `Retrofit Cost Range: PKR ${districtRetrofitCostRange.min.toLocaleString()} - ${districtRetrofitCostRange.max.toLocaleString()}`,
      14,
      y + 14,
    )
    doc.text('NDMA/PDMA/Tehsil Contacts:', 14, y + 22)
    selectedDistrictContacts.forEach((contact, index) => {
      doc.text(`- ${contact}`, 18, y + 30 + index * 8)
    })

    doc.text('Atlas Alignment Note: Risk profile is integrated for offline district planning workflows.', 14, y + 54)
    doc.save(`resilience360-district-risk-${selectedProvince}-${districtName}-${Date.now()}.pdf`)
  }

  const downloadPrintableToolkit = () => {
    const doc = new jsPDF()
    const districtName = selectedDistrict ?? 'District not selected'
    const profile = selectedDistrictProfile

    doc.setFontSize(16)
    doc.text('Resilience360 - Printable Resilience Toolkit', 14, 18)
    doc.setFontSize(11)
    doc.text(`Province: ${selectedProvince}`, 14, 28)
    doc.text(`District: ${districtName}`, 14, 36)
    doc.text(`Primary Layer: ${mapLayer === 'infraRisk' ? 'Infrastructure Risk' : mapLayer}`, 14, 44)
    doc.text(`Priority Risk: ${riskValue}`, 14, 52)

    const checklist = [
      'Mark safe route signs to nearest shelter and health facility.',
      'Prepare household and school-level emergency contact board.',
      'Protect electrical panel above flood mark and seal low openings.',
      'Check roof/wall anchorage and unsafe parapets before monsoon season.',
      'Store first-aid, clean water, torch, and basic communication backup.',
    ]

    doc.text('Community Action Checklist:', 14, 64)
    let y = 72
    checklist.forEach((item) => {
      const wrapped = doc.splitTextToSize(`□ ${item}`, 178)
      doc.text(wrapped, 14, y)
      y += wrapped.length * 7
    })

    if (profile) {
      doc.text(`Local Structural Focus: ${profile.dominantStructure}`, 14, y + 2)
      y += 10
      profile.resilienceActions.forEach((item) => {
        const wrapped = doc.splitTextToSize(`• ${item}`, 178)
        doc.text(wrapped, 14, y)
        y += wrapped.length * 7
      })
    }

    doc.text('Print and post this page at schools, mosques, and union council offices.', 14, y + 6)
    doc.save(`resilience360-print-toolkit-${selectedProvince}-${districtName}-${Date.now()}.pdf`)
  }

  const answerLocalAdvisory = (question: string) => {
    const lower = question.toLowerCase()
    const profile = selectedDistrictProfile
    if (!profile) {
      return districtUiLanguage === 'Urdu'
        ? 'براہِ کرم پہلے صوبہ اور ضلع منتخب کریں تاکہ میں مقامی رسک ایکشن دے سکوں۔'
        : 'Please select your province and district first so I can provide local NDMA-style risk actions.'
    }

    const nextStep =
      districtUiLanguage === 'Urdu' ? 'اگلا قدم: ضلعی رپورٹ ڈاؤن لوڈ کریں اور کمیونٹی پلان شیئر کریں۔' : "Here's what you can do next: download the district report and share the checklist with your community."

    if (lower.includes('flood')) {
      return districtUiLanguage === 'Urdu'
        ? `${profile.district}: سیلاب رسک ${profile.flood} ہے۔ پلنتھ اونچی کریں، نکاسی صاف رکھیں، اور برقی پوائنٹس محفوظ کریں۔ ${nextStep}`
        : `${profile.district}: flood risk is ${profile.flood}. Prioritize plinth elevation, drain clearance, and safe power routing. ${nextStep}`
    }
    if (lower.includes('earthquake') || lower.includes('seismic')) {
      return districtUiLanguage === 'Urdu'
        ? `${profile.district}: زلزلہ رسک ${profile.earthquake} ہے۔ کنفائنمنٹ بینڈ، روف وال اینکرنگ، اور سیڑھی کور کی مضبوطی پر توجہ دیں۔ ${nextStep}`
        : `${profile.district}: earthquake risk is ${profile.earthquake}. Focus on confinement bands, roof-wall anchorage, and stair core safety. ${nextStep}`
    }
    if (lower.includes('school') || lower.includes('hospital') || lower.includes('critical')) {
      return districtUiLanguage === 'Urdu'
        ? `${profile.district} میں اہم عمارتوں کے لیے پہلے نان اسٹرکچرل خطرات دور کریں، پھر اسٹرکچرل کمزوریوں پر کام کریں۔ آغاز: ${profile.resilienceActions[0]}`
        : `For critical facilities in ${profile.district}, first retrofit non-structural hazards, then structural weak points. Start with: ${profile.resilienceActions[0]}`
    }
    if (lower.includes('cost') || lower.includes('budget')) {
      return districtUiLanguage === 'Urdu'
        ? `ضلع کے مطابق لاگت کے لیے Retrofit Guide کھولیں۔ ${profile.district} میں آغاز ان اقدامات سے کریں: ${profile.resilienceActions.slice(0, 2).join(' | ')}۔`
        : `Open Retrofit Guide for district-adjusted costing. For ${profile.district}, begin with high-impact actions: ${profile.resilienceActions.slice(0, 2).join(' | ')}.`
    }

    return districtUiLanguage === 'Urdu'
      ? `${profile.district} میں انفرا رسک ${profile.infraRisk} ہے۔ بنیادی کمزوری: ${profile.dominantStructure}۔ تجویز کردہ اقدامات: ${profile.resilienceActions.join(' | ')}`
      : `${profile.district} infrastructure risk is ${profile.infraRisk}. Dominant vulnerability: ${profile.dominantStructure}. Recommended actions: ${profile.resilienceActions.join(' | ')}`
  }

  const sendLocalAdvisoryQuestion = () => {
    const question = advisoryQuestion.trim()
    if (!question) return
    const response = answerLocalAdvisory(question)
    setAdvisoryMessages((messages) => [...messages, { role: 'user', text: question }, { role: 'assistant', text: response }])
    setAdvisoryQuestion('')
  }

  const saveDistrictProfileLocally = () => {
    const payload = {
      province: selectedProvince,
      district: selectedDistrict,
      mapLayer,
      riskValue,
      profile: selectedDistrictProfile,
      savedAt: new Date().toISOString(),
    }
    localStorage.setItem('r360-saved-district-profile', JSON.stringify(payload))
    setDistrictProfileSavedMsg('District profile saved locally.')
    window.setTimeout(() => setDistrictProfileSavedMsg(null), 2500)
  }

  const requestCurrentUserLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationAccessMsg('Geolocation is not supported on this device/browser.')
      window.setTimeout(() => setLocationAccessMsg(null), 3000)
      return
    }

    setIsDetectingLocation(true)
    setLocationAccessMsg('Requesting location permission...')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const rawLat = position.coords.latitude
        const rawLng = position.coords.longitude
        const lat = rawLat.toFixed(6)
        const lng = rawLng.toFixed(6)
        const gpsText = `${lat}, ${lng}`
        setDetectedUserLocation({ lat: rawLat, lng: rawLng })
        const nearestDistrict = findNearestCenterName({ lat: rawLat, lng: rawLng }, districtCenters)
        const nearestProvince = getProvinceForDistrict(nearestDistrict) || findNearestCenterName({ lat: rawLat, lng: rawLng }, provinceCenters)
        const nearestDistrictsInProvince = nearestProvince ? listDistrictsByProvince(nearestProvince) : []
        const hasDistrictInDropdown = nearestDistrictsInProvince.includes(nearestDistrict)
        const nearestProvinceCities = nearestProvince ? (pakistanCitiesByProvince[nearestProvince] ?? []) : []

        setStructureReviewGps(gpsText)
        setCommunityLocationSuggestion(`GPS: ${gpsText}`)

        if (nearestProvince) {
          setSelectedProvince(nearestProvince)
          setApplyProvince(nearestProvince)
          setDesignProvince(nearestProvince)
        }

        if (nearestDistrict && hasDistrictInDropdown) {
          setSelectedDistrict(nearestDistrict)
          setApplyCity(nearestDistrict)
        } else {
          setSelectedDistrict(null)
          if (nearestProvinceCities.length > 0) {
            setApplyCity(nearestProvinceCities[0])
          }
        }

        const districtProfileForHazard = nearestProvince
          ? findDistrictRiskProfile(nearestProvince, hasDistrictInDropdown ? nearestDistrict : null)
          : null
        const provinceProfileForHazard = nearestProvince ? provinceRisk[nearestProvince] : null
        const districtFlood = districtProfileForHazard?.flood === 'Very High' || districtProfileForHazard?.flood === 'High'
        const districtEarthquake =
          districtProfileForHazard?.earthquake === 'Very High' || districtProfileForHazard?.earthquake === 'High'
        const provinceFlood = provinceProfileForHazard?.flood === 'Very High' || provinceProfileForHazard?.flood === 'High'
        const provinceEarthquake =
          provinceProfileForHazard?.earthquake === 'Very High' || provinceProfileForHazard?.earthquake === 'High'

        if ((districtFlood && !districtEarthquake) || (provinceFlood && !provinceEarthquake)) {
          setApplyHazard('flood')
        } else if ((districtEarthquake && !districtFlood) || (provinceEarthquake && !provinceFlood)) {
          setApplyHazard('earthquake')
        }

        try {
          const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
          const reverseResponse = await fetch(reverseUrl, {
            headers: { 'Accept-Language': 'en' },
          })

          if (reverseResponse.ok) {
            const reverseData = await reverseResponse.json() as { display_name?: string }
            if (reverseData.display_name) {
              setLocationText(`${reverseData.display_name} (${gpsText})`)
            } else {
              setLocationText(`Exact GPS: ${gpsText}`)
            }
          } else {
            setLocationText(`Exact GPS: ${gpsText}`)
          }
        } catch {
          setLocationText(`Exact GPS: ${gpsText}`)
        }

        if (nearestProvince && nearestDistrict && hasDistrictInDropdown) {
          setLocationAccessMsg(`Exact location captured and mapped to ${nearestDistrict}, ${nearestProvince}.`)
        } else if (nearestProvince) {
          setLocationAccessMsg(`Exact location captured and mapped to nearest province: ${nearestProvince}.`)
        } else {
          setLocationAccessMsg('Exact location captured successfully.')
        }
        setIsDetectingLocation(false)
        window.setTimeout(() => setLocationAccessMsg(null), 3000)
      },
      (error) => {
        let message = 'Unable to access your location.'
        if (error.code === error.PERMISSION_DENIED) message = 'Location permission denied. Please allow location access and try again.'
        if (error.code === error.POSITION_UNAVAILABLE) message = 'Location unavailable. Please check GPS/network and try again.'
        if (error.code === error.TIMEOUT) message = 'Location request timed out. Please try again.'

        setLocationAccessMsg(message)
        setIsDetectingLocation(false)
        window.setTimeout(() => setLocationAccessMsg(null), 3500)
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    )
  }

  useEffect(() => {
    if (activeSection !== 'applyRegion') {
      setHasTriedApplyAutoLocation(false)
      return
    }

    if (hasTriedApplyAutoLocation) return
    setHasTriedApplyAutoLocation(true)

    if (!detectedUserLocation) {
      requestCurrentUserLocation()
    }
  }, [activeSection, detectedUserLocation, hasTriedApplyAutoLocation])

  const downloadDrawingSheet = (drawing: EngineeringDrawing) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`Resilience360 Drawing Note - ${drawing.title}`, 14, 18)
    doc.setFontSize(11)
    doc.text(`District: ${selectedDistrict ?? 'Not selected'}`, 14, 28)
    doc.text(`Province: ${selectedProvince}`, 14, 36)
    doc.text(`Primary Hazard Layer: ${mapLayer}`, 14, 44)
    const summaryText = doc.splitTextToSize(`Summary: ${drawing.summary}`, 178)
    doc.text(summaryText, 14, 54)
    const annotationText = doc.splitTextToSize(`Annotated Notes: ${drawing.annotation}`, 178)
    doc.text(annotationText, 14, 74)
    doc.text('Reference: align to local building by-laws and NDMA/PDMA technical advisories.', 14, 96)
    doc.save(`resilience360-drawing-${drawing.id}-${Date.now()}.pdf`)
  }

  const openDirections = (lat: number, lng: number) => {
    if (!navigator.onLine) return
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank', 'noopener,noreferrer')
  }

  const submitStructureRiskReview = async () => {
    if (!structureReviewFile) {
      setStructureReviewError('Please upload a structure image for review.')
      return
    }

    setIsSubmittingStructureReview(true)
    setStructureReviewError(null)

    try {
      const profileText = selectedDistrictProfile
        ? `earthquake=${selectedDistrictProfile.earthquake}, flood=${selectedDistrictProfile.flood}, infra=${selectedDistrictProfile.infraRisk}`
        : `earthquake=${provinceRisk[selectedProvince].earthquake}, flood=${provinceRisk[selectedProvince].flood}, infra=${provinceRisk[selectedProvince].infraRisk}`

      const result = await analyzeBuildingWithVision({
        image: structureReviewFile,
        structureType: structureReviewType,
        province: selectedProvince,
        location: `${selectedDistrict ?? 'District'} ${structureReviewGps ? `(${structureReviewGps})` : ''}`,
        riskProfile: profileText,
      })

      setStructureReviewResult(result)
    } catch (error) {
      setStructureReviewResult(null)
      setStructureReviewError(error instanceof Error ? error.message : 'Structure risk review failed.')
    } finally {
      setIsSubmittingStructureReview(false)
    }
  }

  const loadLiveAlerts = useCallback(async () => {
    setIsLoadingAlerts(true)
    setAlertError(null)
    try {
      const latest = await fetchLiveAlerts()
      setAlertLog(latest)
      localStorage.setItem('r360-live-alerts', JSON.stringify(latest))
    } catch {
      setAlertError('Live feed could not be loaded. Showing last cached alerts if available.')
    } finally {
      setIsLoadingAlerts(false)
    }
  }, [])

  useEffect(() => {
    if (activeSection !== 'warning' && activeSection !== 'riskMaps') return
    if (alertLog.length === 0) {
      void loadLiveAlerts()
    }
  }, [activeSection, alertLog.length, loadLiveAlerts])

  useEffect(() => {
    const onHashChange = () => {
      setIsQaRoute(window.location.hash === '#qa-responsive')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (isQaRoute) {
    return <ResponsiveQa />
  }

  const renderSection = () => {
    if (!activeSection) return null

    if (activeSection === 'bestPractices') {
      return (
        <div className="panel section-panel section-best-practices">
          <h2>{t.sections.bestPractices}</h2>
          <div className="inline-controls">
            <label>
              Hazard Type
              <select
                value={bestPracticeHazard}
                onChange={(event) => setBestPracticeHazard(event.target.value as 'flood' | 'earthquake')}
              >
                <option value="flood">Flood</option>
                <option value="earthquake">Earthquake</option>
              </select>
            </label>
          </div>

          {visibleGlobalPractices.map((practice) => {
            const practiceImage = getBestPracticeImage(practice.title)

            return (
              <details key={`${practice.title}-${practice.region}`}>
                <summary>{practice.title}</summary>
                {practiceImage && (
                  <img
                    className="practice-image"
                    src={practiceImage}
                    alt={`${practice.title} AI illustration`}
                    loading="lazy"
                  />
                )}
                <p>
                  <strong>Global Reference:</strong> {practice.region}
                </p>
                <p>{practice.summary}</p>
                <ol>
                  {practice.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p>
                  <strong>Benefit-Cost Ratio:</strong> {practice.bcr}
                </p>
                <button
                  onClick={() => {
                    setApplyHazard(bestPracticeHazard)
                    navigateToSection('applyRegion')
                  }}
                >
                  📍 Apply in My Area
                </button>
              </details>
            )
          })}

          {bestPracticeVisibleCount < globalPracticeLibrary[bestPracticeHazard].length && (
            <button onClick={() => setBestPracticeVisibleCount((value) => value + 2)}>➕ Load More Global Practices</button>
          )}
        </div>
      )
    }

    if (activeSection === 'riskMaps') {
      return (
        <div className="panel section-panel section-risk-maps">
          <h2>{t.sections.riskMaps}</h2>
          <div className="inline-controls">
            <label>
              Layer
              <select value={mapLayer} onChange={(event) => setMapLayer(event.target.value as typeof mapLayer)}>
                <option value="earthquake">Earthquake</option>
                <option value="flood">Flood</option>
                <option value="infraRisk">Infrastructure Risk</option>
              </select>
            </label>
            <label>
              Province
              <select
                value={selectedProvince}
                onChange={(event) => {
                  setSelectedProvince(event.target.value)
                  setSelectedDistrict(null)
                }}
              >
                {Object.keys(provinceRisk).map((province) => (
                  <option key={province}>{province}</option>
                ))}
              </select>
            </label>
            <label>
              District
              <select value={selectedDistrict ?? ''} onChange={(event) => setSelectedDistrict(event.target.value || null)}>
                <option value="">Select District</option>
                {availableMapDistricts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Report Language
              <select
                value={districtReportLanguage}
                onChange={(event) => setDistrictReportLanguage(event.target.value as typeof districtReportLanguage)}
              >
                <option>English</option>
                <option>Urdu</option>
              </select>
            </label>
            <label>
              Alert Window
              <select value={alertFilterWindow} onChange={(event) => setAlertFilterWindow(event.target.value as AlertFilterWindow)}>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </label>
          </div>
          <div className="inline-controls">
            <button onClick={requestCurrentUserLocation} disabled={isDetectingLocation}>
              {isDetectingLocation ? '📡 Detecting Location...' : '📡 Use My Location'}
            </button>
            <button onClick={downloadDistrictRiskReport}>📄 Download Risk & Resilience Report</button>
            <button onClick={saveDistrictProfileLocally}>💾 Save District Profile</button>
            <label>
              <input
                type="checkbox"
                checked={colorblindFriendlyMap}
                onChange={(event) => setColorblindFriendlyMap(event.target.checked)}
              />{' '}
              Colorblind-friendly map
            </label>
            <label>
              <input
                type="radio"
                name="district-lang"
                checked={districtUiLanguage === 'English'}
                onChange={() => setDistrictUiLanguage('English')}
              />{' '}
              English
            </label>
            <label>
              <input
                type="radio"
                name="district-lang"
                checked={districtUiLanguage === 'Urdu'}
                onChange={() => setDistrictUiLanguage('Urdu')}
              />{' '}
              Urdu
            </label>
          </div>
          {locationAccessMsg && <p>{locationAccessMsg}</p>}
          {districtProfileSavedMsg && <p>{districtProfileSavedMsg}</p>}
          <div className="alerts">
            <p>
              Loading progress: <strong>{riskActionProgress}%</strong>
            </p>
            <progress value={riskActionProgress} max={100} />
          </div>
          <RiskMap
            layer={mapLayer}
            selectedProvince={selectedProvince}
            selectedDistrict={selectedDistrict}
            riskByProvince={provinceRisk}
            districtRiskLookup={districtRiskLookup}
            alertMarkers={filteredHazardAlerts}
            userLocationMarker={detectedUserLocation}
            colorblindFriendly={colorblindFriendlyMap}
            onSelectProvince={setSelectedProvince}
            onSelectDistrict={setSelectedDistrict}
          />
          <p>Boundary source: geoBoundaries Pakistan ADM1 + ADM2 (public-domain dataset).</p>
          <p>Risk layer source: integrated NDMA Infrastructure Risk Atlas district profiles for practical planning workflows.</p>
          <p>
            Selected Risk: <strong>{selectedProvince}</strong> - <strong>{mapLayer}</strong> ={' '}
            <strong>{riskValue}</strong>
          </p>
          {selectedDistrict && (
            <div className="retrofit-model-output">
              <h3>District Action Panel</h3>
              <p>
                District Selected: <strong>{selectedDistrict}</strong>
              </p>
              <p>
                Dominant Structure: <strong>{selectedDistrictProfile?.dominantStructure ?? 'Local survey required'}</strong>
              </p>
              {selectedDistrictProfile && (
                <p>
                  Vulnerability Score (EQ/Flood):{' '}
                  <strong>
                    {selectedDistrictProfile.structureScores.earthquake.toFixed(2)} /{' '}
                    {selectedDistrictProfile.structureScores.flood.toFixed(2)}
                  </strong>
                </p>
              )}
              <ul>
                {(selectedDistrictProfile?.resilienceActions ?? [
                  'Start ward-level hazard walk and identify weak structures.',
                  'Prioritize school/clinic retrofits before monsoon and winter seasons.',
                  'Display evacuation routes and communication points in public places.',
                ]).map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
              <div className="inline-controls">
                <button onClick={downloadDistrictRiskReport}>📄 View My District Report (PDF)</button>
                <button onClick={downloadPrintableToolkit}>🧰 Printable Resilience Toolkit</button>
                <button
                  onClick={() => {
                    setApplyProvince(selectedProvince)
                    if (selectedDistrict) {
                      setApplyCity(selectedDistrict)
                    }
                    setApplyHazard(mapLayer === 'infraRisk' ? 'flood' : mapLayer)
                    navigateToSection('applyRegion')
                  }}
                >
                  🏗️ Open Local Construction Guide
                </button>
              </div>
              <p>
                Retrofit cost range: <strong>PKR {districtRetrofitCostRange.min.toLocaleString()} - {districtRetrofitCostRange.max.toLocaleString()}</strong>
              </p>
              <p>NDMA / PDMA / Tehsil Contacts:</p>
              <ul>
                {selectedDistrictContacts.map((contact) => (
                  <li key={contact}>{contact}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="retrofit-model-output">
            <h3>🛰️ Real-Time Hazard Alerts</h3>
            <p>Showing PMD/NDMA and community-style overlays for the selected district context.</p>
            {filteredHazardAlerts.length === 0 && <p>No alerts in this time window.</p>}
            {filteredHazardAlerts.map((item) => (
              <p key={item.id}>
                <strong>
                  {item.icon} {item.type}
                </strong>{' '}
                - {item.title} ({item.severity})
              </p>
            ))}
          </div>

          <div className="retrofit-model-output">
            <h3>🧭 Community Evacuation Plans</h3>
            {evacuationAssets.length === 0 && <p>No district evacuation layer uploaded yet. You can submit one below.</p>}
            <ul>
              {evacuationAssets.map((asset) => (
                <li key={`${asset.kind}-${asset.name}`}>
                  <strong>{asset.kind}:</strong> {asset.name}{' '}
                  <button onClick={() => openDirections(asset.lat, asset.lng)} disabled={!navigator.onLine}>
                    🧭 Get Directions
                  </button>
                </li>
              ))}
            </ul>
            <label>
              Suggest community location (NGO / field officer)
              <input
                value={communityLocationSuggestion}
                onChange={(event) => setCommunityLocationSuggestion(event.target.value)}
                placeholder="e.g., School roof in Union Council 14"
              />
            </label>
            {communityLocationSuggestion && <p>Suggestion captured: {communityLocationSuggestion}</p>}
          </div>

          <div className="retrofit-model-output">
            <h3>Local Advisory Chatbot</h3>
            <p>Ask for district-level action advice, retrofit priorities, or hazard-specific guidance.</p>
            <div className="inline-controls">
              <input
                type="text"
                value={advisoryQuestion}
                onChange={(event) => setAdvisoryQuestion(event.target.value)}
                placeholder="e.g., What should schools in this district do before monsoon?"
              />
              <button onClick={sendLocalAdvisoryQuestion}>💬 Ask</button>
            </div>
            {advisoryMessages.length > 0 && (
              <div>
                {advisoryMessages.slice(-6).map((message, idx) => (
                  <p key={`${message.role}-${idx}`}>
                    <strong>{message.role === 'user' ? 'You' : 'Advisor'}:</strong> {message.text}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="retrofit-model-output">
            <h3>🔧 Recommended Engineering Drawings by Risk Type</h3>
            <p>
              For {selectedDistrict ?? selectedProvince} - {mapLayer === 'infraRisk' ? 'Infrastructure Risk' : mapLayer} Risk: <strong>{riskValue}</strong>
            </p>
            <div className="card-grid">
              {availableDrawings.map((drawing) => (
                <div key={drawing.id} className="retrofit-defect-card">
                  <h4>{drawing.title}</h4>
                  <p>{drawing.summary}</p>
                  <button onClick={() => setActiveDrawingId(drawing.id)}>🖼️ View Drawing</button>
                </div>
              ))}
            </div>
            {activeDrawing && (
              <div className="retrofit-ai-guidance">
                <p>
                  <strong>{activeDrawing.title}</strong>
                </p>
                <p>{activeDrawing.annotation}</p>
                <button onClick={() => downloadDrawingSheet(activeDrawing)}>⬇️ Download Annotated Drawing</button>
              </div>
            )}
          </div>

          <div className="retrofit-model-output">
            <h3>🧱 Build Better: Local Materials Guide</h3>
            <p>
              Recommended: <strong>{localMaterialGuide.recommended.join(' | ')}</strong>
            </p>
            <p>
              Risky materials: <strong>{localMaterialGuide.risky.join(' | ')}</strong>
            </p>
            <ul>
              {localMaterialGuide.suppliers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="retrofit-model-output">
            <h3>🤳 Submit My Structure for Risk Review</h3>
            <div className="inline-controls">
              <label>
                Structure Type
                <select value={structureReviewType} onChange={(event) => setStructureReviewType(event.target.value as typeof structureReviewType)}>
                  <option>Home</option>
                  <option>School</option>
                  <option>Clinic</option>
                  <option>Bridge</option>
                </select>
              </label>
              <label>
                GPS (optional)
                <input
                  type="text"
                  value={structureReviewGps}
                  onChange={(event) => setStructureReviewGps(event.target.value)}
                  placeholder="29.40, 71.68"
                />
              </label>
              <label>
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setStructureReviewFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <button onClick={submitStructureRiskReview} disabled={isSubmittingStructureReview}>
              {isSubmittingStructureReview ? '🤖 Analyzing...' : '🤖 Run AI Risk Review'}
            </button>
            {structureReviewError && <p>{structureReviewError}</p>}
            {structureReviewResult && (
              <div className="retrofit-ai-guidance">
                <p>
                  <strong>AI Risk Summary:</strong> {structureReviewResult.summary}
                </p>
                <p>
                  <strong>Risk score:</strong>{' '}
                  {Math.min(100, Math.max(30, 45 + structureReviewResult.defects.length * 9 + (riskValue === 'Very High' ? 22 : riskValue === 'High' ? 14 : 8)))}/100
                </p>
                <ul>
                  {structureReviewResult.priorityActions.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    navigateToSection('designToolkit')
                  }}
                >
                  🔗 Open Design Guide Links
                </button>
              </div>
            )}
          </div>

          <div className="retrofit-model-output">
            <h3>📊 District Readiness Index</h3>
            <p>
              {selectedDistrict ?? 'Selected district'} Readiness Index: <strong>{selectedDistrictReadiness.score}/100</strong>
            </p>
            <ul>
              <li>School Retrofit Rate: {selectedDistrictReadiness.retrofittedSchools}%</li>
              <li>Shelters Available: {selectedDistrictReadiness.shelters}</li>
              <li>Early Warning Coverage: {selectedDistrictReadiness.warningCoverage}%</li>
              <li>Flood maps published: {selectedDistrictReadiness.floodMapsPublished ? 'Yes' : 'No'}</li>
            </ul>
            <button onClick={downloadDistrictRiskReport}>📊 View Full Dashboard</button>
          </div>

          <p>Recommendation: Prioritize retrofitting and emergency evacuation planning for high-risk districts.</p>
        </div>
      )
    }

    if (activeSection === 'designToolkit') {
      return (
        <div className="panel section-panel section-design-toolkit">
          <h2>{t.sections.designToolkit}</h2>
          <div className="inline-controls">
            <label>
              Province
              <select
                value={designProvince}
                onChange={(event) => {
                  const province = event.target.value
                  setDesignProvince(province)
                  setDesignCity((pakistanCitiesByProvince[province] ?? [])[0] ?? '')
                }}
              >
                {Object.keys(provinceRisk).map((province) => (
                  <option key={province}>{province}</option>
                ))}
              </select>
            </label>
            <label>
              City
              <select value={designCity} onChange={(event) => setDesignCity(event.target.value)}>
                {availableDesignCities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </label>
            <label>
              Soil Type
              <select value={designSoilType} onChange={(event) => setDesignSoilType(event.target.value as typeof designSoilType)}>
                <option>Rocky</option>
                <option>Sandy</option>
                <option>Clayey</option>
                <option>Silty</option>
                <option>Saline</option>
              </select>
            </label>
            <label>
              Humidity
              <select value={designHumidity} onChange={(event) => setDesignHumidity(event.target.value as typeof designHumidity)}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
          </div>

          <div className="retrofit-insights-grid">
            <p>
              Seismic Zone: <strong>{designHazardOverlay.seismicZone} / 5</strong>
            </p>
            <p>
              Flood Depth (1-in-100y): <strong>{designHazardOverlay.floodDepth100y.toFixed(1)} m</strong>
            </p>
            <p>
              Liquefaction Risk: <strong>{designHazardOverlay.liquefaction}</strong>
            </p>
            <p>
              Wind Exposure: <strong>{coastalCities.has(designCity) ? 'Coastal High' : 'Inland Moderate'}</strong>
            </p>
          </div>

          <div className="retrofit-model-output">
            <h3>🧱 Building Material Suitability Checker</h3>
            <p>
              Recommended: <strong>{materialSuitability.recommendations.join(' | ')}</strong>
            </p>
            <ul>
              {materialSuitability.flags.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="retrofit-model-output">
            <h3>📏 Slope Stability & Retaining Wall Estimator</h3>
            <div className="inline-controls">
              <label>
                Slope Angle (deg)
                <input type="number" min={5} max={60} value={slopeAngleDeg} onChange={(event) => setSlopeAngleDeg(Number(event.target.value) || 5)} />
              </label>
              <label>
                Slope Height (m)
                <input type="number" min={1} max={20} value={slopeHeightM} onChange={(event) => setSlopeHeightM(Number(event.target.value) || 1)} />
              </label>
            </div>
            <p>
              Stability Class: <strong>{slopeEstimator.stabilityClass}</strong>
            </p>
            <p>
              Recommended Wall: <strong>{slopeEstimator.wallType}</strong>
            </p>
            <p>
              Minimum Embedment: <strong>{slopeEstimator.embedment} m</strong>
            </p>
            <p>{slopeEstimator.drainage}</p>
          </div>

          <div className="retrofit-model-output">
            <h3>💡 Safe Shelter Capacity Planner</h3>
            <div className="inline-controls">
              <label>
                Shelter Area (sqm)
                <input
                  type="number"
                  min={20}
                  value={shelterAreaSqm}
                  onChange={(event) => setShelterAreaSqm(Number(event.target.value) || 20)}
                />
              </label>
              <label>
                Occupancy Type
                <select
                  value={shelterOccupancyType}
                  onChange={(event) => setShelterOccupancyType(event.target.value as typeof shelterOccupancyType)}
                >
                  <option>School</option>
                  <option>Mosque</option>
                  <option>House</option>
                </select>
              </label>
            </div>
            <p>
              Max Safe Capacity: <strong>{shelterCapacityPlan.maxCapacity} people</strong>
            </p>
            <ul>
              {shelterCapacityPlan.layout.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="retrofit-model-output">
            <h3>🔩 Foundation Type Recommender</h3>
            <p>
              Recommended Foundation: <strong>{foundationRecommendation.type}</strong>
            </p>
            <ul>
              {foundationRecommendation.risks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="retrofit-model-output">
            <h3>🚪 Non-Structural Risk Checklist Generator</h3>
            <ul>
              {nonStructuralChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="retrofit-model-output">
            <h3>📐 Wind and Storm Resistance Guide</h3>
            <p>
              Roof Angle: <strong>{windStormGuide.roofAngle}</strong>
            </p>
            <p>
              Opening/Vent Guidance: <strong>{windStormGuide.openings}</strong>
            </p>
            <p>
              Tie Beam Details: <strong>{windStormGuide.tieBeams}</strong>
            </p>
            <p>{windStormGuide.note}</p>
          </div>

          <div className="retrofit-model-output">
            <h3>📦 Resilient Design Kit Cost Estimator</h3>
            <div className="inline-controls">
              <label>
                House Type
                <select value={houseTypeForCost} onChange={(event) => setHouseTypeForCost(event.target.value as typeof houseTypeForCost)}>
                  <option>Single-Storey</option>
                  <option>Double-Storey</option>
                  <option>School Block</option>
                  <option>Clinic Unit</option>
                </select>
              </label>
              <label>
                Floor Area (sq ft)
                <input
                  type="number"
                  min={300}
                  value={floorAreaSqftCost}
                  onChange={(event) => setFloorAreaSqftCost(Number(event.target.value) || 300)}
                />
              </label>
            </div>
            <div className="retrofit-insights-grid">
              <p>
                Unit Cost: <strong>PKR {Math.round(designCostEstimate.unitCost).toLocaleString()}/sq ft</strong>
              </p>
              <p>
                Subtotal: <strong>PKR {Math.round(designCostEstimate.subtotal).toLocaleString()}</strong>
              </p>
              <p>
                Contingency: <strong>PKR {Math.round(designCostEstimate.contingency).toLocaleString()}</strong>
              </p>
              <p>
                Total Estimate: <strong>PKR {Math.round(designCostEstimate.total).toLocaleString()}</strong>
              </p>
            </div>
          </div>

          <div className="retrofit-model-output">
            <h3>📍 Community Infrastructure Scanner (Beta)</h3>
            <div className="retrofit-defect-list">
              {communityScanner.map((item) => (
                <article key={item.name} className="retrofit-defect-card">
                  <h4>{item.name}</h4>
                  <p>
                    Readiness: <strong>{item.readiness}</strong>
                  </p>
                  <p>{item.priority}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="inline-controls">
            <button onClick={handleEstimateTotalUpgradeCost}>📦 Estimate My Total Upgrade Cost</button>
            <button onClick={downloadConstructionDrawings}>🧰 Download Construction Drawings</button>
            <button onClick={generateFieldImplementationChecklist}>📋 Generate Field Implementation Checklist</button>
            <button onClick={() => setShowTrainingPrograms((value) => !value)}>🎓 See Local Training Programs</button>
            <button onClick={() => void shareDesignWithCommunity()}>🌍 Share Design with Community</button>
          </div>

          {designSummaryText && <p>{designSummaryText}</p>}

          {showTrainingPrograms && (
            <ul>
              <li>NESPAK regional training node - structural safety detailing workshops</li>
              <li>UNDP resilience accelerator modules - flood and seismic preparedness</li>
              <li>ERRA reconstruction practice sessions - field implementation skills</li>
              <li>PDMA district drills - emergency shelter and response planning</li>
            </ul>
          )}
        </div>
      )
    }

    if (activeSection === 'infraModels') {
      return (
        <div className="panel section-panel section-design-toolkit">
          <h2>{t.sections.infraModels}</h2>
          <p>AI catalog of resilient infrastructure models with realistic visuals, features, and Pakistan-specific implementation benefits.</p>
          <p>
            <strong>{preloadedInfraModels.length}</strong> Pakistan-focused resilience models are preloaded below. Use load more to generate additional AI models.
          </p>
          <div className="infra-video-panel">
            <h3>NDMA-IAPD First Resilient Infrastructure Models – Official Overview</h3>
            <p>
              This video presents the first NDMA-IAPD resilient infrastructure model concepts, highlighting hazard-aware design,
              safer construction planning, and practical implementation pathways for Pakistan.
            </p>
            {!showInfraLayoutVideo ? (
              <button onClick={() => setShowInfraLayoutVideo(true)}>▶️ Play Official Overview Video</button>
            ) : (
              <>
                <video
                  className="infra-layout-video"
                  controls
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  onContextMenu={(event) => event.preventDefault()}
                  preload="metadata"
                >
                  <source src={infraLayoutVideoSrc} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <p>
                  Purpose: to help engineers, planners, and communities understand how resilience-focused model layouts can reduce
                  flood and earthquake risk before construction begins.
                </p>
                <button onClick={() => setShowInfraLayoutVideo(false)}>⏹️ Hide Video</button>
              </>
            )}
          </div>
          <button onClick={loadResilienceInfraModels} disabled={isLoadingInfraModels}>
            {isLoadingInfraModels ? '🤖 Generating Additional Infra Models...' : '➕ Load More Infra Models'}
          </button>

          {infraModelsError && <p>{infraModelsError}</p>}

          <div className="retrofit-model-output">
            <h3>🔎 Research a Specific Infra Model</h3>
            <p>Enter an infrastructure model name to get research-focused use cases, source links, AI views, material profile, and resilience analysis.</p>
            <div className="inline-controls">
              <label>
                Infra Model Name
                <input
                  value={infraResearchName}
                  onChange={(event) => setInfraResearchName(event.target.value)}
                  placeholder="e.g., Base-isolated residential block"
                />
              </label>
              <button onClick={runInfraModelResearch} disabled={isResearchingInfra}>
                {isResearchingInfra ? '🤖 Researching Model...' : '🔍 Search + Analyze Model'}
              </button>
            </div>

            {infraResearchError && <p>{infraResearchError}</p>}

            {infraResearchResult && (
              <div className="retrofit-ai-guidance">
                <p>
                  <strong>Model:</strong> {infraResearchResult.modelName}
                </p>
                <p>{infraResearchResult.overview}</p>

                <div className="inline-controls">
                  <a href={infraResearchResult.googleSearch.global} target="_blank" rel="noopener noreferrer">
                    🌍 Google Search (Global)
                  </a>
                  <a href={infraResearchResult.googleSearch.pakistan} target="_blank" rel="noopener noreferrer">
                    🇵🇰 Google Search (Pakistan)
                  </a>
                </div>

                {infraResearchResult.sourceLinks.length > 0 && (
                  <>
                    <h4>Authentic Source References</h4>
                    <ul>
                      {infraResearchResult.sourceLinks.map((source) => (
                        <li key={source}>
                          <a href={source} target="_blank" rel="noopener noreferrer">
                            {source}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <h4>Where Used Globally</h4>
                <ul>
                  {infraResearchResult.globalUseCases.map((useCase, index) => (
                    <li key={`${useCase.country}-${useCase.project}-${index}`}>
                      <strong>{useCase.country}</strong> — {useCase.project}: {useCase.application} ({useCase.evidenceNote})
                    </li>
                  ))}
                </ul>

                <h4>Potential Use in Pakistan</h4>
                <ul>
                  {infraResearchResult.pakistanUseCases.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <h4>Model Features</h4>
                <ul>
                  {infraResearchResult.features.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <h4>Materials and Availability</h4>
                <ul>
                  {infraResearchResult.materials.map((item) => (
                    <li key={`${item.name}-${item.specification}`}>
                      <strong>{item.name}</strong>: {item.specification} | Availability in Pakistan: {item.availabilityInPakistan}
                    </li>
                  ))}
                </ul>

                <p>
                  <strong>Availability (Pakistan):</strong> {infraResearchResult.availability.readinessPakistan}
                </p>
                <p>
                  <strong>Local Supply Potential:</strong> {infraResearchResult.availability.localSupplyPotential}
                </p>
                <p>
                  <strong>Import Dependency:</strong> {infraResearchResult.availability.importDependencyNote}
                </p>

                <p>
                  <strong>Flood Resilience ({infraResearchResult.resilience.floodScore}/10):</strong> {infraResearchResult.resilience.flood}
                </p>
                <p>
                  <strong>Earthquake Resilience ({infraResearchResult.resilience.earthquakeScore}/10):</strong>{' '}
                  {infraResearchResult.resilience.earthquake}
                </p>

                {isGeneratingInfraViews && <p>Generating AI model views (front, back, side, top, isometric)...</p>}

                {infraResearchImages.length > 0 && (
                  <>
                    <h4>AI Model Views</h4>
                    <div className="retrofit-defect-list">
                      {infraResearchImages.map((image) => (
                        <article key={image.view} className="retrofit-defect-card">
                          <h4>{image.view}</h4>
                          <img src={image.imageDataUrl} alt={`${infraResearchResult.modelName} ${image.view}`} className="retrofit-preview" />
                        </article>
                      ))}
                    </div>
                  </>
                )}

                <button onClick={() => setShowStructuralDesignForm((value) => !value)}>
                  📐 Structural Design Report
                </button>

                {showStructuralDesignForm && (
                  <div className="retrofit-model-output">
                    <h4>Structural Design Inputs</h4>
                    <div className="inline-controls">
                      <label>
                        Location (for rates)
                        <input
                          value={designReportLocation}
                          onChange={(event) => setDesignReportLocation(event.target.value)}
                          placeholder="e.g., Lahore, Punjab"
                        />
                      </label>
                      <label>
                        Geo Tech Report (optional)
                        <input
                          value={designReportGeoTech}
                          onChange={(event) => setDesignReportGeoTech(event.target.value)}
                          placeholder="e.g., SBC 150 kPa, water table 2.4m"
                        />
                      </label>
                      <label>
                        Number of Stories
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={designReportStories}
                          onChange={(event) => setDesignReportStories(Number(event.target.value) || 1)}
                        />
                      </label>
                      <label>
                        Build As
                        <select value={designReportUseType} onChange={(event) => setDesignReportUseType(event.target.value)}>
                          <option value="house">House</option>
                          <option value="school">School</option>
                          <option value="clinic">Clinic</option>
                          <option value="shelter">Shelter</option>
                          <option value="mixed-use">Mixed-use Structure</option>
                        </select>
                      </label>
                    </div>
                    <button onClick={runStructuralDesignReport} disabled={isGeneratingStructuralDesign}>
                      {isGeneratingStructuralDesign ? '🤖 Generating Structural Design Report...' : '🧮 Generate Structural Design Report'}
                    </button>
                    {structuralDesignError && <p>{structuralDesignError}</p>}
                  </div>
                )}

                {structuralDesignReport && (
                  <div className="retrofit-model-output">
                    <h4>Generated Structural Design Report</h4>
                    <p>{structuralDesignReport.summary}</p>

                    <h4>Design Assumptions</h4>
                    <ul>
                      {structuralDesignReport.designAssumptions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <p>
                      <strong>Structural System:</strong> {structuralDesignReport.structuralSystem}
                    </p>
                    <p>
                      <strong>Foundation System:</strong> {structuralDesignReport.foundationSystem}
                    </p>
                    <p>
                      <strong>Load Path & Lateral System:</strong> {structuralDesignReport.loadPathAndLateralSystem}
                    </p>

                    <h4>Material Specifications</h4>
                    <ul>
                      {structuralDesignReport.materialSpecifications.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Preliminary Member Sizing</h4>
                    <ul>
                      {structuralDesignReport.preliminaryMemberSizing.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Flood Resilience Measures</h4>
                    <ul>
                      {structuralDesignReport.floodResilienceMeasures.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Earthquake Resilience Measures</h4>
                    <ul>
                      {structuralDesignReport.earthquakeResilienceMeasures.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Construction Materials (BOQ-Oriented)</h4>
                    <ul>
                      {structuralDesignReport.constructionMaterialsBOQ.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Rate and Cost Notes</h4>
                    <ul>
                      {structuralDesignReport.rateAndCostNotes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Code and Compliance Checks</h4>
                    <ul>
                      {structuralDesignReport.codeAndComplianceChecks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <h4>Limitations</h4>
                    <ul>
                      {structuralDesignReport.limitations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {infraModels.length > 0 && (
            <div className="retrofit-defect-list">
              {infraModels.map((model) => (
                <article key={model.id} className="retrofit-defect-card">
                  <h3>{model.title}</h3>
                  <p>{model.description}</p>
                  <img src={model.imageDataUrl} alt={`${model.title} AI visual`} className="retrofit-preview" />
                  <h4>Key Features</h4>
                  <ul>
                    {model.features.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <h4>Advantages in Pakistan</h4>
                  <ul>
                    {model.advantagesPakistan.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (activeSection === 'applyRegion') {
      return (
        <div className="panel section-panel section-apply-region">
          <h2>{t.sections.applyRegion}</h2>
          <div className="inline-controls">
            <label>
              Province
              <select
                value={applyProvince}
                onChange={(event) => {
                  const province = event.target.value
                  setApplyProvince(province)
                  setApplyCity((pakistanCitiesByProvince[province] ?? [])[0] ?? '')
                }}
              >
                {Object.keys(provinceRisk).map((province) => (
                  <option key={province}>{province}</option>
                ))}
              </select>
            </label>
            <label>
              City
              <select value={applyCity} onChange={(event) => setApplyCity(event.target.value)}>
                {availableApplyCities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </label>
            <label>
              Hazard Focus
              <select value={applyHazard} onChange={(event) => setApplyHazard(event.target.value as 'flood' | 'earthquake')}>
                <option value="flood">Flood</option>
                <option value="earthquake">Earthquake</option>
              </select>
            </label>
          </div>

          <div className="retrofit-model-output">
            <h3>📍 Live Location for Auto-Fill</h3>
            <div className="inline-controls">
              <button onClick={requestCurrentUserLocation} disabled={isDetectingLocation}>
                {isDetectingLocation ? '📡 Detecting Live Location...' : '📡 Refresh Live Location'}
              </button>
            </div>
            {locationAccessMsg && <p>{locationAccessMsg}</p>}
            {detectedUserLocation && (
              <>
                <p>
                  Auto-filled from live location: <strong>{applyCity}, {applyProvince}</strong> | Hazard Focus: <strong>{applyHazard}</strong>
                </p>
                <UserLocationMiniMap location={detectedUserLocation} />
              </>
            )}
          </div>

          <button onClick={generateApplyAreaGuidance} disabled={isGeneratingGuidance}>
            {isGeneratingGuidance ? '⚡ Generating Construction Guidance + Images...' : '🛠️ Construction Guidance'}
          </button>

          {guidanceError && <p>{guidanceError}</p>}

          {constructionGuidance && (
            <div className="retrofit-model-output">
              <h3>Location-Tailored Construction Guidance</h3>
              <p>
                <strong>Area:</strong> {applyCity}, {applyProvince} | <strong>Hazard:</strong> {applyHazard}
              </p>
              <p>{constructionGuidance.summary}</p>

              <h3>Materials</h3>
              <ul>
                {constructionGuidance.materials.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h3>Safety Checks</h3>
              <ul>
                {constructionGuidance.safety.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <h3>Implementation Steps</h3>
              <div className="retrofit-defect-list">
                {constructionGuidance.steps.map((step, index) => {
                  const image = guidanceStepImages.find((item) => item.stepTitle === step.title) ?? guidanceStepImages[index]
                  return (
                    <article key={`${step.title}-${index}`} className="retrofit-defect-card">
                      <h4>
                        Step {index + 1}: {step.title}
                      </h4>
                      <p>{step.description}</p>
                      {image?.imageDataUrl && (
                        <img src={image.imageDataUrl} alt={`${step.title} visual guide`} className="retrofit-preview" />
                      )}
                      <ul>
                        {step.keyChecks.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                  )
                })}
              </div>
              <button onClick={downloadApplyGuidanceReport}>📄 Download Professional Guidance Report (PDF)</button>
              {isGeneratingStepImages && <p>Generating AI stepwise construction images...</p>}
            </div>
          )}
        </div>
      )
    }

    if (activeSection === 'readiness') {
      return (
        <div className="panel section-panel section-readiness">
          <h2>{t.sections.readiness}</h2>
          <div className="inline-controls">
            <label>
              Building Type
              <select value={buildingType} onChange={(event) => setBuildingType(event.target.value)}>
                <option>Residential</option>
                <option>Commercial</option>
                <option>Critical Infrastructure</option>
              </select>
            </label>
            <label>
              Materials
              <select value={materialType} onChange={(event) => setMaterialType(event.target.value)}>
                <option>Reinforced Concrete</option>
                <option>Steel Frame</option>
                <option>Unreinforced Masonry</option>
              </select>
            </label>
            <label>
              Lifeline Presence
              <select value={lifeline} onChange={(event) => setLifeline(event.target.value)}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </label>
          </div>
          <label>
            Location
            <input value={locationText} onChange={(event) => setLocationText(event.target.value)} />
          </label>
          <p>
            Risk Score: <strong>{readinessScore}/100</strong>
          </p>
          <p>Custom Recommendation: Add plinth freeboard, tie beams, and emergency response drills.</p>
          <button onClick={downloadReport}>📄 Download PDF Report</button>
        </div>
      )
    }

    if (activeSection === 'retrofit') {
      return (
        <div className="panel section-panel section-retrofit">
          <h2>{t.sections.retrofit}</h2>
          <label>
            Structure Type
            <select value={structureType} onChange={(event) => setStructureType(event.target.value)}>
              <option>Masonry House</option>
              <option>RC Frame</option>
              <option>School Block</option>
              <option>Bridge Approach</option>
            </select>
          </label>
          <div className="inline-controls">
            <label>
              Province (Pakistan)
              <select
                value={selectedProvince}
                onChange={(event) => {
                  const province = event.target.value
                  setSelectedProvince(province)
                  setRetrofitCity((pakistanCitiesByProvince[province] ?? [])[0] ?? '')
                }}
              >
                {Object.keys(provinceRisk).map((province) => (
                  <option key={province}>{province}</option>
                ))}
              </select>
            </label>
            <label>
              City / District (Pakistan)
              <select
                value={retrofitCity}
                onChange={(event) => setRetrofitCity(event.target.value)}
              >
                {availableRetrofitCities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Upload Clear Building Photo
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void analyzeRetrofitImage(file)
                }
              }}
            />
          </label>

          {isAnalyzingImage && <p>AI is analyzing structure visibility, defects, corrosion zones, and retrofit cues...</p>}
          {retrofitError && <p>{retrofitError}</p>}

          {retrofitImagePreview && (
            <div className="retrofit-preview-wrap">
              <img src={retrofitImagePreview} alt="Uploaded building" className="retrofit-preview" />
            </div>
          )}

          {retrofitImageInsights && (
            <div className="retrofit-insights-grid">
              <p>
                Resolution: <strong>{retrofitImageInsights.width}</strong> x <strong>{retrofitImageInsights.height}</strong>
              </p>
              <p>
                Lighting Index: <strong>{retrofitImageInsights.brightness.toFixed(1)}</strong>
              </p>
              <p>
                Contrast Index: <strong>{retrofitImageInsights.contrast.toFixed(1)}</strong>
              </p>
              <p>
                Sharpness Index: <strong>{retrofitImageInsights.sharpness.toFixed(1)}</strong>
              </p>
              <p>
                AI Visual Quality: <strong>{retrofitImageInsights.quality}</strong>
              </p>
            </div>
          )}

          {visionAnalysis && (
            <div className="retrofit-model-output">
              <h3>Model Detection Output</h3>
              <p>
                Summary: <strong>{visionAnalysis.summary}</strong>
              </p>
              <p>
                Model: <strong>{visionAnalysis.model}</strong> | Visibility Quality:{' '}
                <strong>{visionAnalysis.imageQuality.visibility}</strong>
              </p>
              <p>{visionAnalysis.imageQuality.notes}</p>

              {visionAnalysis.defects.length > 0 && (
                <div className="retrofit-defect-list">
                  {visionAnalysis.defects.map((defect, index) => (
                    <article key={`${defect.type}-${index}`} className="retrofit-defect-card">
                      <h4>
                        {defect.type.toUpperCase()} | Severity: {defect.severity.toUpperCase()} | Confidence:{' '}
                        {(defect.confidence * 100).toFixed(0)}%
                      </h4>
                      <p>
                        <strong>Location:</strong> {defect.location}
                      </p>
                      <p>
                        <strong>Evidence:</strong> {defect.evidence}
                      </p>
                      <p>
                        <strong>Retrofit Action:</strong> {defect.retrofitAction}
                      </p>
                    </article>
                  ))}
                </div>
              )}

              <p>
                <strong>Safety Note:</strong> {visionAnalysis.safetyNote}
              </p>
            </div>
          )}

          {retrofitAiGuidelines.length > 0 && (
            <div className="retrofit-ai-guidance">
              <h3>AI Retrofit Guidance</h3>
              <ul>
                {retrofitAiGuidelines.map((advice) => (
                  <li key={advice}>{advice}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="retrofit-model-output">
            <h3>Retrofit Calculator</h3>
            <p>
              Estimate Source: <strong>{retrofitEstimate.estimateSource}</strong>
              {retrofitEstimate.estimateSource === 'Image-driven' && ' (based on uploaded image defect analysis)'}
              {retrofitEstimate.estimateSource === 'ML Model' && ' (kNN model calibrated for Pakistan retrofit cases)'}
            </p>
            {retrofitEstimate.mlModel && (
              <p>
                ML Model: <strong>{retrofitEstimate.mlModel}</strong>
                {typeof retrofitEstimate.mlConfidence === 'number' && (
                  <>
                    {' '}
                    | Confidence: <strong>{(retrofitEstimate.mlConfidence * 100).toFixed(0)}%</strong>
                  </>
                )}
              </p>
            )}
            <div className="inline-controls">
              <label>
                Retrofit Scope
                <select
                  value={retrofitEstimate.effectiveScope}
                  disabled={retrofitEstimate.estimateSource !== 'Manual'}
                  onChange={(event) => setRetrofitScope(event.target.value as 'Basic' | 'Standard' | 'Comprehensive')}
                >
                  <option>Basic</option>
                  <option>Standard</option>
                  <option>Comprehensive</option>
                </select>
              </label>
              <label>
                Defect Severity
                <select
                  value={retrofitEstimate.effectiveDamageLevel}
                  disabled={retrofitEstimate.estimateSource !== 'Manual'}
                  onChange={(event) => setRetrofitDamageLevel(event.target.value as 'Low' | 'Medium' | 'High')}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
            </div>

            <div className="retrofit-insights-grid">
              <p>
                Area Considered: <strong>{retrofitEstimate.area.toLocaleString()} sq ft</strong>
              </p>
              <p>
                Base Cost: <strong>PKR {Math.round(retrofitEstimate.baseCost).toLocaleString()}</strong>
              </p>
              <p>
                Hazard Adjusted: <strong>PKR {Math.round(retrofitEstimate.adjustedCost).toLocaleString()}</strong>
              </p>
              <p>
                Contingency (12%): <strong>PKR {Math.round(retrofitEstimate.contingency).toLocaleString()}</strong>
              </p>
              <p>
                Estimated Total: <strong>PKR {Math.round(retrofitEstimate.totalCost).toLocaleString()}</strong>
              </p>
              <p>
                Image-Based Range:{' '}
                <strong>
                  PKR {Math.round(retrofitEstimate.minTotalCost).toLocaleString()} - PKR{' '}
                  {Math.round(retrofitEstimate.maxTotalCost).toLocaleString()}
                </strong>
              </p>
              <p>
                Effective Rate: <strong>PKR {Math.round(retrofitEstimate.sqftRate).toLocaleString()}/sq ft</strong>
              </p>
              <p>
                Location Cost Factor: <strong>{retrofitEstimate.locationFactor.toFixed(2)}x</strong>
              </p>
              <p>
                Labor Rate (daily): <strong>PKR {Math.round(retrofitEstimate.laborDaily).toLocaleString()}</strong>
              </p>
              <p>
                Material Index: <strong>{retrofitEstimate.materialIndex.toFixed(2)}</strong>
              </p>
              <p>
                Logistics Index: <strong>{retrofitEstimate.logisticsIndex.toFixed(2)}</strong>
              </p>
              <p>
                Estimated Duration: <strong>{retrofitEstimate.durationWeeks} weeks</strong>
              </p>
              {retrofitEstimate.affectedAreaPercent && (
                <p>
                  Affected Area (detected): <strong>{Math.round(retrofitEstimate.affectedAreaPercent)}%</strong>
                </p>
              )}
              {retrofitEstimate.urgencyLevel && (
                <p>
                  Urgency Level (detected): <strong>{retrofitEstimate.urgencyLevel}</strong>
                </p>
              )}
            </div>
            {retrofitEstimate.mlGuidance.length > 0 && (
              <ul>
                {retrofitEstimate.mlGuidance.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {mlEstimate?.guidanceDetailed && mlEstimate.guidanceDetailed.length > 0 && (
              <div className="retrofit-defect-list">
                {mlEstimate.guidanceDetailed.map((item) => (
                  <article key={`${item.priority}-${item.action}`} className="retrofit-defect-card">
                    <h4>
                      {item.priority} | {item.action}
                    </h4>
                    <p>
                      <strong>Rationale:</strong> {item.rationale}
                    </p>
                    <p>
                      <strong>Expected Impact:</strong> {item.estimatedImpact}
                    </p>
                  </article>
                ))}
              </div>
            )}
            {mlEstimate?.assumptions && mlEstimate.assumptions.length > 0 && (
              <ul>
                {mlEstimate.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            <button onClick={downloadRetrofitEstimate}>📥 Download Retrofit Estimate PDF</button>
          </div>

          <ol>
            <li>Inspect and document structural defects.</li>
            <li>Select retrofit method: {toolkit.retrofittingTechnique}.</li>
            <li>Estimate cost: PKR 250/sqft to PKR 1350/sqft.</li>
            <li>Material list: rebar, epoxy grout, steel mesh, concrete micro-fiber.</li>
            <li>Example images: before/after placeholders shown in field implementation docs.</li>
          </ol>
        </div>
      )
    }

    if (activeSection === 'warning') {
      return (
        <div className="panel section-panel section-warning">
          <h2>{t.sections.warning}</h2>
          <p>Connected Feeds: NDMA advisories/sitreps/projections + PMD CAP RSS.</p>
          <button onClick={loadLiveAlerts} disabled={isLoadingAlerts}>
            {isLoadingAlerts ? '🔄 Loading Live Alerts...' : '🚨 Fetch Latest Alert'}
          </button>
          {alertError && <p>{alertError}</p>}
          <div className="alerts">
            {alertLog.length === 0 && <p>No alerts available yet.</p>}
            {alertLog.map((alert) => {
              const published = alert.publishedAt ? ` • ${new Date(alert.publishedAt).toLocaleString()}` : ''
              return (
                <p key={alert.id}>
                  <strong>[{alert.source}]</strong>{' '}
                  <a href={alert.link} target="_blank" rel="noreferrer">
                    {alert.title}
                  </a>
                  {published}
                </p>
              )
            })}
          </div>
          <h3>What to Do Now</h3>
          <ul>
            <li>Move vulnerable people and critical records to safe elevation.</li>
            <li>Follow district evacuation routes and keep emergency kits ready.</li>
            <li>Use SMS-style alert channel for last-mile communication.</li>
          </ul>
        </div>
      )
    }

    if (activeSection === 'learn') {
      return (
        <div className="panel section-panel section-learn">
          <h2>{t.sections.learn}</h2>
          <ul>
            <li>Urdu + English micro-video tutorials for flood and seismic safety.</li>
            <li>Downloadable PDF engineering guidelines and checklists.</li>
            <li>Quizzes for schools and universities with score feedback.</li>
            <li>Certification mini-courses for planners and local responders.</li>
          </ul>
        </div>
      )
    }

    return (
      <div className="panel section-panel section-settings">
        <h2>{t.sections.settings}</h2>
        <label className="switch-row">
          {t.offline}
          <input
            type="checkbox"
            checked={isOfflineMode}
            onChange={(event) => {
              const next = event.target.checked
              setIsOfflineMode(next)
              savePreferences(next, isLightweight)
            }}
          />
        </label>
        <label className="switch-row">
          {t.lightweight}
          <input
            type="checkbox"
            checked={isLightweight}
            onChange={(event) => {
              const next = event.target.checked
              setIsLightweight(next)
              savePreferences(isOfflineMode, next)
            }}
          />
        </label>
        <p>Backend Mode: Firebase / Node or Django REST API compatible interface.</p>
        <p>Kiosk Mode: Solar-ready simplified layout for rural centers and field offices.</p>
      </div>
    )
  }

  return (
    <div className={`app-shell ${isLightweight ? 'lightweight' : ''} ${isHomeView ? 'home-shell' : ''}`} dir={isUrdu ? 'rtl' : 'ltr'}>
      <header className={`navbar ${isHomeView ? 'home-navbar' : ''}`}>
        <div className="brand">
          <div className="logo-badge">{t.logoText}</div>
          {isHomeView ? (
            <div className="hero-title-wrap">
              <h1 className="hero-title">Resilience360°</h1>
              <p className="hero-subtitle">Infrastructure Resilience Toolkit for Pakistan</p>
            </div>
          ) : (
            <h1>{t.appTitle}</h1>
          )}
        </div>
        <div className="nav-controls">
          <label>
            {t.language}
            <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
              <option value="ur">🇵🇰 Urdu</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </label>
          <label>
            {t.navbarRole}
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as (typeof roleOptions)[number])}
            >
              {roleOptions.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </label>
          <button onClick={() => navigateToSection(null)}>{isHomeView ? '🏠 Pakistan Home' : `🏠 ${t.home}`}</button>
        </div>
      </header>

      <main>
        {!activeSection && (
          <>
            <section className="home-card-grid">
              {homeSectionKeys.map((key) => (
                <button key={key} className={`home-card ${homeCardMeta[key].tone}`} onClick={() => navigateToSection(key)}>
                  <span className="home-card-icon">{homeCardMeta[key].icon}</span>
                  <span className="home-card-copy">
                    <strong>{homeCardMeta[key].title}</strong>
                    <small>{homeCardMeta[key].subtitle}</small>
                  </span>
                </button>
              ))}
            </section>

            <section className="home-bottom-strip">
              <p>
                Building a <strong>Resilient Pakistan</strong> – Safer Infrastructure, Stronger Communities
              </p>
              <button onClick={() => navigateToSection('settings')}>⚙️ {t.sections.settings}</button>
            </section>
          </>
        )}
        {!isHomeView && (
          <div className="section-back-row">
            <button className="section-back-btn" onClick={navigateBack}>
              {hasPreviousSection ? '⬅ Back' : '⬅ Back to Home'}
            </button>
          </div>
        )}
        {renderSection()}
      </main>
    </div>
  )
}

export default App
