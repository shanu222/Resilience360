import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import RiskMap from './components/RiskMap'
import ResponsiveQa from './components/ResponsiveQa'
import UserLocationMiniMap from './components/UserLocationMiniMap'
import { fetchLiveAlerts, type LiveAlert } from './services/alerts'
import { fetchPmdLiveSnapshot, type PmdLiveSnapshot } from './services/pmdLive'
import { buildApiTargets } from './services/apiBase'
import {
  fetchLiveClimateByCity,
  fetchLiveClimateByCoordinates,
  type LiveClimateSnapshot,
} from './services/climateLive'
import { analyzeBuildingWithVision, type VisionAnalysisResult } from './services/vision'
import { getMlRetrofitEstimate, type MlRetrofitEstimate } from './services/mlRetrofit'
import {
  fetchCommunityIssues,
  submitCommunityIssue,
  updateCommunityIssueStatus,
  type CommunityIssueRecord,
  type CommunityIssueStatus,
} from './services/communityIssues'
import readinessFloodHousingImage from './assets/infra-models/flood-housing-cluster-pk.jpg'
import {
  generateConstructionGuidance,
  generateGuidanceStepImages,
  type ConstructionGuidanceResult,
  type GuidanceStepImage,
} from './services/constructionGuidance'
import { fetchResilienceInfraModels, type InfraModel } from './services/infraModels'
import {
  fetchSharedGeneratedInfraModels,
  saveSharedGeneratedInfraModels,
  syncSharedInfraModelsToGitHub,
} from './services/infraModelsShared'
import {
  generateInfraModelResearchImages,
  generateStructuralDesignReport,
  researchInfraModel,
  type InfraResearchImage,
  type InfraResearchResult,
  type StructuralDesignReport,
} from './services/infraResearch'
import { askLocalAdvisory } from './services/advisory'
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
  | 'coePortal'
  | 'materialHubs'
  | 'pgbc'
  | 'retrofitCalculator'
  | 'applyRegion'
  | 'readiness'
  | 'retrofit'
  | 'warning'
  | 'learn'
  | 'settings'

type RetrofitImageSeriesResult = {
  id: string
  fileName: string
  previewUrl: string
  summary: string
  defectCount: number
  inferredAreaSqft: number
  severityScore: number
  affectedAreaPercent: number
  estimatedCost: number
  recommendedScope: 'Basic' | 'Standard' | 'Comprehensive'
  damageLevel: 'Low' | 'Medium' | 'High'
  urgencyLevel: 'routine' | 'priority' | 'critical'
  visibility: 'excellent' | 'good' | 'fair' | 'poor'
}

type RetrofitGuidanceResult = {
  id: string
  fileName: string
  summary: string
  safetyNote: string
  visibility: 'excellent' | 'good' | 'fair' | 'poor'
  recommendations: string[]
}

type RetrofitFinalEstimate = {
  estimateSource: 'ML Model' | 'Image-driven'
  province: string
  city: string
  imageCount: number
  totalAreaSqft: number
  durationWeeks: number
  totalCost: number
  minTotalCost: number
  maxTotalCost: number
  sqftRate: number
  locationFactor: number
  laborDaily: number
  materialIndex: number
  logisticsIndex: number
  equipmentIndex: number
  scope: 'Basic' | 'Standard' | 'Comprehensive'
  damageLevel: 'Low' | 'Medium' | 'High'
  urgencyLevel: 'routine' | 'priority' | 'critical'
  affectedAreaPercent: number
  severityScore: number
  mlModel?: string
  mlConfidence?: number
  guidance: string[]
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

type GlobalEarthquake = {
  id: string
  magnitude: number
  place: string
  time: string
  depthKm: number
  lat: number
  lng: number
  url: string
}

type HistoricalDisasterEvent = {
  id: string
  hazard: 'Flood' | 'Earthquake'
  title: string
  year: number
  lat: number
  lng: number
  extentKm: number
  livesLost: number
  economicCostUsdBn?: number
  affectedPeopleMillions?: number
  source: string
}

type CommunityIssueCategory =
  | 'Broken roads'
  | 'Drainage blockage'
  | 'Flooding spots'
  | 'Damaged bridges'
  | 'Streetlight issues'
  | 'Unsafe buildings'

type CommunityIssueReport = CommunityIssueRecord

const communityIssueCategories: CommunityIssueCategory[] = [
  'Broken roads',
  'Drainage blockage',
  'Flooding spots',
  'Damaged bridges',
  'Streetlight issues',
  'Unsafe buildings',
]

const emergencyKitChecklistItems = [
  'Drinking water (3-day supply)',
  'First aid kit and basic medicines',
  'Battery torch + power bank',
  'Important documents in waterproof pouch',
  'Emergency contacts list',
]

const communityIssueStatusOptions: CommunityIssueStatus[] = [
  'Submitted',
  'In Review',
  'In Progress',
  'Resolved',
  'Rejected',
]

const pakistanHistoricalDisasterEvents: HistoricalDisasterEvent[] = [
  {
    id: 'pk-eq-2005-kashmir',
    hazard: 'Earthquake',
    title: 'Kashmir Earthquake',
    year: 2005,
    lat: 34.49,
    lng: 73.63,
    extentKm: 130,
    livesLost: 87350,
    economicCostUsdBn: 5.2,
    affectedPeopleMillions: 3.5,
    source: 'Government of Pakistan / UN reports',
  },
  {
    id: 'pk-eq-2013-awaran',
    hazard: 'Earthquake',
    title: 'Awaran Earthquake',
    year: 2013,
    lat: 26.97,
    lng: 65.5,
    extentKm: 95,
    livesLost: 825,
    economicCostUsdBn: 0.25,
    source: 'USGS + provincial situation reports',
  },
  {
    id: 'pk-eq-2019-mirpur',
    hazard: 'Earthquake',
    title: 'Mirpur Earthquake',
    year: 2019,
    lat: 33.13,
    lng: 73.79,
    extentKm: 70,
    livesLost: 40,
    economicCostUsdBn: 0.09,
    source: 'NDMA / media-verified summaries',
  },
  {
    id: 'pk-flood-2010-super',
    hazard: 'Flood',
    title: 'Pakistan Super Floods',
    year: 2010,
    lat: 30.5,
    lng: 71.0,
    extentKm: 500,
    livesLost: 1985,
    economicCostUsdBn: 9.7,
    affectedPeopleMillions: 20,
    source: 'NDMA / World Bank / UN OCHA',
  },
  {
    id: 'pk-flood-2011-sindh',
    hazard: 'Flood',
    title: 'Sindh Floods',
    year: 2011,
    lat: 25.83,
    lng: 68.74,
    extentKm: 220,
    livesLost: 520,
    economicCostUsdBn: 2.0,
    affectedPeopleMillions: 9,
    source: 'Government of Sindh / UN humanitarian briefs',
  },
  {
    id: 'pk-flood-2014-chenab-jhelum',
    hazard: 'Flood',
    title: 'Jhelum-Chenab Basin Floods',
    year: 2014,
    lat: 32.5,
    lng: 74.2,
    extentKm: 170,
    livesLost: 367,
    economicCostUsdBn: 1.0,
    affectedPeopleMillions: 2.5,
    source: 'NDMA / PDMA Punjab / relief assessments',
  },
  {
    id: 'pk-flood-2022-monsoon',
    hazard: 'Flood',
    title: '2022 Monsoon Floods',
    year: 2022,
    lat: 26.2,
    lng: 68.5,
    extentKm: 380,
    livesLost: 1739,
    economicCostUsdBn: 30,
    affectedPeopleMillions: 33,
    source: 'NDMA + World Bank rapid damage assessment',
  },
]

const GLOBAL_EARTHQUAKE_FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson'
const GLOBAL_EARTHQUAKE_FEED_URL_BACKUP = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
const GLOBAL_EARTHQUAKE_PROXY_PREFIX = 'https://api.allorigins.win/raw?url='

type LearnTrainingVideo = {
  id: string
  title: string
  summary: string
  fileName: string
}

const learnVideoIconById: Record<string, string> = {
  'flood-barriers': '🌊',
  'monsoon-damages': '☔',
  'global-best-practice': '🌍',
  'building-resilience-audit': '🏗️',
  'floodplain-recovery': '🏞️',
  'infra-damages': '🧱',
  'innovative-tech': '💡',
  'innovative-tech-sound': '🔊',
  'modular-bridge': '🛤️',
  'resilient-structures': '🌐',
  'stormwater-management': '💧',
  'arc-overview': '➕',
  'video-3': '🪖',
}

const learnTrainingVideos: LearnTrainingVideo[] = [
  {
    id: 'flood-barriers',
    title: 'Flood Protection & Barriers',
    summary: 'Practical barrier strategies and mitigation planning for flood-prone localities.',
    fileName: '1-flood-protection-barriers-long-9-min.mp4',
  },
  {
    id: 'monsoon-damages',
    title: 'Monsoon 2025 Damages in Pakistan',
    summary: 'Damage patterns from monsoon events and key infrastructure lessons.',
    fileName: '2-monson-2025-damages-in-pakistan-fullforms.mp4',
  },
  {
    id: 'global-best-practice',
    title: 'Global Best Practice',
    summary: 'Short global resilience examples relevant for local adaptation in Pakistan.',
    fileName: '3-global-best-practice-3-min.mp4',
  },
  {
    id: 'building-resilience-audit',
    title: 'Building Resilience through Infra Audit',
    summary: 'How to assess critical assets and prioritize safety upgrades.',
    fileName: 'building-resilience-through-infra-audit.mp4',
  },
  {
    id: 'floodplain-recovery',
    title: 'Floodplains Resilient Recovery',
    summary: 'Recovery and rebuilding approaches for floodplain communities.',
    fileName: 'floodplains-resilient-recovery.mp4',
  },
  {
    id: 'infra-damages',
    title: 'Infrastructure Damages Overview',
    summary: 'Visual overview of common damage mechanisms and risk hotspots.',
    fileName: 'infra-damages.mp4',
  },
  {
    id: 'innovative-tech',
    title: 'Innovative Construction Technologies',
    summary: 'Construction technology options for safer and more durable infrastructure.',
    fileName: 'innovative-construction-technologies-final.mp4',
  },
  {
    id: 'innovative-tech-sound',
    title: 'Innovative Construction Technologies (Sound Added)',
    summary: 'Audio-enhanced version for training sessions and classroom delivery.',
    fileName: 'innovative-construction-technologies-sound-added.mp4',
  },
  {
    id: 'modular-bridge',
    title: 'Modular Bridge Video Animation',
    summary: 'Modular bridge concept animation for rapid deployment and resilience.',
    fileName: 'modular-bridge-video-animation-final.mp4',
  },
  {
    id: 'resilient-structures',
    title: 'Resilient Structures against EQ & Floods',
    summary: 'Integrated design principles for earthquake and flood resilience.',
    fileName: 'resilient-structures-against-eq-floods-23-08-24.mp4',
  },
  {
    id: 'stormwater-management',
    title: 'Stormwater Management & Permeable Pavement',
    summary: 'Drainage and permeable pavement techniques to reduce flooding impacts.',
    fileName: 'stormwater-mgt-through-improved-drainage-and-permeable-pavement-tech.mp4',
  },
  {
    id: 'arc-overview',
    title: 'ARC Overview',
    summary: 'Supplementary resilience planning video for field awareness sessions.',
    fileName: 'arc.mp4',
  },
  {
    id: 'video-3',
    title: 'Field Training Video 3',
    summary: 'Additional field-focused training module for local teams.',
    fileName: 'video-3.mp4',
  },
]

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
      coePortal: '🎓 COE Training Portal',
      materialHubs: '🏗️ Material Hubs',
      pgbc: '🏛️ PGBC Portal',
      retrofitCalculator: '🧮 Retrofit Calculator',
      applyRegion: '📍 Construct in my Region',
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
      coePortal: '🎓 سی او ای ٹریننگ پورٹل',
      materialHubs: '🏗️ میٹریل ہبز',
      pgbc: '🏛️ پی جی بی سی پورٹل',
      retrofitCalculator: '🧮 ریٹروفٹ کیلکولیٹر',
      applyRegion: '📍 اپنے علاقے میں تعمیر',
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

type CityRateProfile = {
  laborDaily: number
  materialIndex: number
  logisticsIndex: number
  equipmentIndex?: number
}

const cityRateByProvince: Record<string, Record<string, CityRateProfile>> = {
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

const deriveEquipmentIndex = (cityRate: CityRateProfile): number => {
  if (typeof cityRate.equipmentIndex === 'number') {
    return cityRate.equipmentIndex
  }
  const derived = cityRate.materialIndex * 0.4 + cityRate.logisticsIndex * 0.6
  return Math.max(0.95, Math.min(1.35, Number(derived.toFixed(2))))
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
const BUILD_VERSION_LABEL = String(import.meta.env.VITE_BUILD_VERSION ?? 'local').slice(0, 7)

const homeSectionKeys: SectionKey[] = [
  'bestPractices',
  'infraModels',
  'applyRegion',
  'retrofit',
  'riskMaps',
  'designToolkit',
  'pgbc',
  'materialHubs',
  'warning',
  'readiness',
  'learn',
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
  coePortal: {
    icon: '🎓',
    title: 'COE Training Portal',
    subtitle: 'Enroll in COE Lectures',
    tone: 'tone-h',
  },
  materialHubs: {
    icon: '🏗️',
    title: 'Material Hubs',
    subtitle: 'Digital Material Hub Portal',
    tone: 'tone-b',
  },
  pgbc: {
    icon: '🏛️',
    title: 'Green Building Codes',
    subtitle: 'Sustainable Building Standards',
    tone: 'tone-c',
  },
  retrofitCalculator: {
    icon: '🧮',
    title: 'Retrofit Calculator',
    subtitle: 'AI Defect Cost Workflow',
    tone: 'tone-f',
  },
  applyRegion: {
    icon: '📍',
    title: 'Construct in my Region',
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

const getInfraModelCardIcon = (model: Pick<InfraModel, 'id' | 'title'>) => {
  const signature = `${model.id} ${model.title}`.toLowerCase()
  if (signature.includes('flood')) return '🏠'
  if (signature.includes('school')) return '🏫'
  if (signature.includes('bridge')) return '🌉'
  if (signature.includes('shelter')) return '🛟'
  if (signature.includes('health')) return '🏥'
  if (signature.includes('water')) return '💧'
  if (signature.includes('utility')) return '⚡'
  if (signature.includes('drainage') || signature.includes('sponge')) return '🛣️'
  if (signature.includes('market')) return '🏬'
  if (signature.includes('eoc') || signature.includes('operations')) return '📡'
  return '🏗️'
}

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

const INFRA_MODELS_CACHE_KEY = 'r360-infra-models-cache-v1'
const INFRA_MODELS_CACHE_LIMIT = 80

const normalizeInfraText = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim()

const getInfraModelSignature = (model: Pick<InfraModel, 'title' | 'description' | 'features' | 'advantagesPakistan'>) =>
  [
    normalizeInfraText(model.title),
    normalizeInfraText(model.description),
    model.features.map((item) => normalizeInfraText(item)).sort().join('|'),
    model.advantagesPakistan.map((item) => normalizeInfraText(item)).sort().join('|'),
  ].join('::')

const preloadedInfraModelSignatureSet = new Set(preloadedInfraModels.map((model) => getInfraModelSignature(model)))

const asTextArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

const sanitizeCachedInfraModel = (value: unknown): InfraModel | null => {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<InfraModel>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.description !== 'string' ||
    typeof candidate.imageDataUrl !== 'string'
  ) {
    return null
  }

  const features = asTextArray(candidate.features)
  const advantagesPakistan = asTextArray(candidate.advantagesPakistan)

  if (features.length === 0 || advantagesPakistan.length === 0) {
    return null
  }

  return {
    id: candidate.id,
    title: candidate.title,
    description: candidate.description,
    imageDataUrl: candidate.imageDataUrl,
    features,
    advantagesPakistan,
  }
}

const loadCachedInfraModels = (): InfraModel[] => {
  try {
    const cached = localStorage.getItem(INFRA_MODELS_CACHE_KEY)
    if (!cached) return []
    const parsed = JSON.parse(cached) as unknown
    if (!Array.isArray(parsed)) return []

    const uniqueBySignature = new Map<string, InfraModel>()
    for (const entry of parsed) {
      const model = sanitizeCachedInfraModel(entry)
      if (!model) continue
      const signature = getInfraModelSignature(model)
      if (preloadedInfraModelSignatureSet.has(signature) || uniqueBySignature.has(signature)) continue
      uniqueBySignature.set(signature, model)
    }

    return Array.from(uniqueBySignature.values())
  } catch {
    return []
  }
}

const buildInitialInfraModels = (): InfraModel[] => {
  const cached = loadCachedInfraModels()
  if (cached.length === 0) return preloadedInfraModels
  return [...preloadedInfraModels, ...cached]
}

const mergeInfraModelsBySignature = (existing: InfraModel[], incoming: InfraModel[]) => {
  const deduped = new Map<string, InfraModel>()
  const usedIds = new Set<string>()

  const pushModel = (model: InfraModel, preferredId?: string) => {
    const signature = getInfraModelSignature(model)
    if (!signature || deduped.has(signature)) return

    const baseId = preferredId || model.id || `infra-model-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    let id = baseId
    while (usedIds.has(id)) {
      id = `${baseId}-${Math.random().toString(36).slice(2, 8)}`
    }
    usedIds.add(id)

    deduped.set(signature, {
      ...model,
      id,
    })
  }

  for (const model of existing) {
    pushModel(model, model.id)
  }

  for (const model of incoming) {
    pushModel(model, model.id)
  }

  return Array.from(deduped.values())
}

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

const nearestHospitalsByProvince: Record<string, string[]> = {
  Punjab: ['Mayo Hospital Lahore', 'DHQ Hospital Rawalpindi', 'Nishtar Hospital Multan'],
  Sindh: ['Jinnah Postgraduate Medical Centre Karachi', 'Civil Hospital Karachi', 'Liaquat University Hospital Hyderabad'],
  Balochistan: ['Civil Hospital Quetta', 'Bolan Medical Complex', 'DHQ Hospital Khuzdar'],
  KP: ['Lady Reading Hospital Peshawar', 'Hayatabad Medical Complex', 'Saidu Teaching Hospital Swat'],
  GB: ['DHQ Hospital Gilgit', 'DHQ Hospital Skardu', 'RHC Astore'],
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
  const [communityIssueCategory, setCommunityIssueCategory] = useState<CommunityIssueCategory>('Broken roads')
  const [communityIssueNotes, setCommunityIssueNotes] = useState('')
  const [communityIssuePhoto, setCommunityIssuePhoto] = useState<File | null>(null)
  const [communityIssueReports, setCommunityIssueReports] = useState<CommunityIssueReport[]>([])
  const [communityIssueStatusDrafts, setCommunityIssueStatusDrafts] = useState<Record<string, CommunityIssueStatus>>({})
  const [communityAdminToken, setCommunityAdminToken] = useState(() => localStorage.getItem('r360-community-admin-token') ?? '')
  const [isLoadingCommunityIssues, setIsLoadingCommunityIssues] = useState(false)
  const [isUpdatingCommunityIssueId, setIsUpdatingCommunityIssueId] = useState<string | null>(null)
  const [isSubmittingCommunityIssue, setIsSubmittingCommunityIssue] = useState(false)
  const [climateLocationInput, setClimateLocationInput] = useState('')
  const [isLoadingLiveClimate, setIsLoadingLiveClimate] = useState(false)
  const [liveClimateError, setLiveClimateError] = useState<string | null>(null)
  const [liveClimateSnapshot, setLiveClimateSnapshot] = useState<LiveClimateSnapshot | null>(null)
  const [selfAssessmentYearBuilt, setSelfAssessmentYearBuilt] = useState(2000)
  const [selfAssessmentConstruction, setSelfAssessmentConstruction] = useState('Reinforced Concrete')
  const [selfAssessmentDrainage, setSelfAssessmentDrainage] = useState<'Good' | 'Average' | 'Poor'>('Average')
  const [selfAssessmentSeismicZone, setSelfAssessmentSeismicZone] = useState<'Low' | 'Medium' | 'High'>('Medium')
  const [selfAssessmentFoundation, setSelfAssessmentFoundation] = useState<'Isolated Footing' | 'Raft' | 'Stone Masonry' | 'Unknown'>('Isolated Footing')
  const [autoCaptureGpsOnSubmit, setAutoCaptureGpsOnSubmit] = useState(true)
  const [emergencyKitChecks, setEmergencyKitChecks] = useState<Record<string, boolean>>(() => {
    const cached = localStorage.getItem('r360-emergency-kit-checks')
    return cached ? (JSON.parse(cached) as Record<string, boolean>) : {}
  })
  const [smartDrainageStatus, setSmartDrainageStatus] = useState<string | null>(null)
  const [colorblindFriendlyMap, setColorblindFriendlyMap] = useState(false)
  const [districtProfileSavedMsg, setDistrictProfileSavedMsg] = useState<string | null>(null)
  const [locationAccessMsg, setLocationAccessMsg] = useState<string | null>(null)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [detectedUserLocation, setDetectedUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [hasTriedApplyAutoLocation, setHasTriedApplyAutoLocation] = useState(false)
  const [riskActionProgress, setRiskActionProgress] = useState(0)
  const [advisoryQuestion, setAdvisoryQuestion] = useState('')
  const [advisoryMessages, setAdvisoryMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])
  const [isAskingAdvisory, setIsAskingAdvisory] = useState(false)
  const [advisoryError, setAdvisoryError] = useState<string | null>(null)
  const [advisoryCopyMsg, setAdvisoryCopyMsg] = useState<string | null>(null)
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
  const [retrofitLocationMode, setRetrofitLocationMode] = useState<'auto' | 'manual'>('auto')
  const [retrofitManualProvince, setRetrofitManualProvince] = useState('Punjab')
  const [retrofitManualCity, setRetrofitManualCity] = useState('Lahore')
  const [retrofitImageSeriesFiles, setRetrofitImageSeriesFiles] = useState<File[]>([])
  const [retrofitImageSeriesPreviewUrls, setRetrofitImageSeriesPreviewUrls] = useState<string[]>([])
  const [retrofitImageSeriesResults, setRetrofitImageSeriesResults] = useState<RetrofitImageSeriesResult[]>([])
  const [retrofitGuidanceResults, setRetrofitGuidanceResults] = useState<RetrofitGuidanceResult[]>([])
  const [retrofitFinalEstimate, setRetrofitFinalEstimate] = useState<RetrofitFinalEstimate | null>(null)
  const [visionAnalysis, setVisionAnalysis] = useState<VisionAnalysisResult | null>(null)
  const [mlEstimate, setMlEstimate] = useState<MlRetrofitEstimate | null>(null)
  const [isGeneratingRetrofitGuidance, setIsGeneratingRetrofitGuidance] = useState(false)
  const [isCalculatingRetrofitEstimate, setIsCalculatingRetrofitEstimate] = useState(false)
  const [retrofitError, setRetrofitError] = useState<string | null>(null)
  const [alertLog, setAlertLog] = useState<LiveAlert[]>(() => {
    const cached = localStorage.getItem('r360-live-alerts')
    return cached ? JSON.parse(cached) : []
  })
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)
  const [pmdLiveSnapshot, setPmdLiveSnapshot] = useState<PmdLiveSnapshot | null>(() => {
    const cached = localStorage.getItem('r360-pmd-live')
    return cached ? (JSON.parse(cached) as PmdLiveSnapshot) : null
  })
  const [isLoadingPmdLive, setIsLoadingPmdLive] = useState(false)
  const [pmdLiveError, setPmdLiveError] = useState<string | null>(null)
  const [globalEarthquakes, setGlobalEarthquakes] = useState<GlobalEarthquake[]>(() => {
    const cached = localStorage.getItem('r360-global-earthquakes')
    return cached ? (JSON.parse(cached) as GlobalEarthquake[]) : []
  })
  const [, setIsLoadingGlobalEarthquakes] = useState(false)
  const [, setGlobalEarthquakeError] = useState<string | null>(null)
  const [, setGlobalEarthquakesSyncedAt] = useState<string | null>(() =>
    localStorage.getItem('r360-global-earthquakes-synced-at'),
  )
  const [showGlobalEarthquakesOnMap, setShowGlobalEarthquakesOnMap] = useState(true)
  const [globalEarthquakeMapFocusToken, setGlobalEarthquakeMapFocusToken] = useState(0)
  const [selectedGlobalEarthquakeId, setSelectedGlobalEarthquakeId] = useState<string | null>(null)
  const [bestPracticeHazard, setBestPracticeHazard] = useState<'flood' | 'earthquake'>('flood')
  const [bestPracticeVisibleCount, setBestPracticeVisibleCount] = useState(2)
  const [applyProvince, setApplyProvince] = useState('Punjab')
  const [applyCity, setApplyCity] = useState('Lahore')
  const [applyHazard, setApplyHazard] = useState<'flood' | 'earthquake'>('flood')
  const [applyBestPracticeTitle, setApplyBestPracticeTitle] = useState(globalPracticeLibrary.flood[0]?.title ?? '')
  const [constructionGuidance, setConstructionGuidance] = useState<ConstructionGuidanceResult | null>(null)
  const [guidanceStepImages, setGuidanceStepImages] = useState<GuidanceStepImage[]>([])
  const [isGeneratingGuidance, setIsGeneratingGuidance] = useState(false)
  const [isGeneratingStepImages, setIsGeneratingStepImages] = useState(false)
  const [guidanceError, setGuidanceError] = useState<string | null>(null)
  const [guidanceGenerationLanguage, setGuidanceGenerationLanguage] = useState<'english' | 'urdu'>('english')
  const [isPreparingWordReport, setIsPreparingWordReport] = useState(false)
  const [wordReportLanguage, setWordReportLanguage] = useState<'english' | 'urdu'>('english')
  const retrofitUploadInputRef = useRef<HTMLInputElement | null>(null)
  const [infraModels, setInfraModels] = useState<InfraModel[]>(() => buildInitialInfraModels())
  const [isLoadingInfraModels, setIsLoadingInfraModels] = useState(false)
  const [isLoadingSharedInfraModels, setIsLoadingSharedInfraModels] = useState(false)
  const [isSyncingInfraModels, setIsSyncingInfraModels] = useState(false)
  const [infraModelsSyncMessage, setInfraModelsSyncMessage] = useState<string | null>(null)
  const [infraModelsError, setInfraModelsError] = useState<string | null>(null)
  const [selectedInfraModelId, setSelectedInfraModelId] = useState<string | null>(null)
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
  const [showTrainingPrograms] = useState(false)
  const [activeLearnVideoFile, setActiveLearnVideoFile] = useState<string | null>(null)
  const [isLearnVideoVisible, setIsLearnVideoVisible] = useState(false)
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    windStormGuide: false,
    fieldImplementationChecklist: false,
    overallStructuralResilience: false,
    slopeStabilityEstimator: false,
    designKitCostEstimator: false,
    selfAssessment: false,
    riskFloodClimateExplorer: false,
    riskLocalAdvisoryChatbot: false,
    riskBuildBetterMaterialsGuide: false,
    designSafeShelterCapacityPlanner: false,
    designRecommendedFoundation: false,
    warningWhatToDoNow: false,
    warningEmergencyToolkit: false,
    pmdLiveWeather: false,
  })
  const [learnVideoPlaybackSrc, setLearnVideoPlaybackSrc] = useState('')
  const [infraLayoutPlaybackSrc, setInfraLayoutPlaybackSrc] = useState('')
  const [learnVideoSourceIndex, setLearnVideoSourceIndex] = useState(0)
  const learnVideoRef = useRef<HTMLVideoElement | null>(null)

  const t = translations[language]
  const isUrdu = language === 'ur'
  const isHomeView = !activeSection
  const isApplyRegionView = activeSection === 'applyRegion'
  const isLearnView = activeSection === 'learn'
  const isBestPracticesView = activeSection === 'bestPractices' || isApplyRegionView
  const isRiskMapsView = activeSection === 'riskMaps'
  const isReadinessView = activeSection === 'readiness'
  const isWarningView = activeSection === 'warning'
  const isEmbeddedPortalSection =
    activeSection === 'pgbc' ||
    activeSection === 'coePortal' ||
    activeSection === 'materialHubs' ||
    activeSection === 'retrofitCalculator'
  const hasPreviousSection = sectionHistory.length > 0
  const infraLayoutVideoSrc = `${import.meta.env.BASE_URL}videos/layout.mp4`
  const activeLearnVideo = useMemo(
    () => learnTrainingVideos.find((video) => video.fileName === activeLearnVideoFile) ?? null,
    [activeLearnVideoFile],
  )
  const selectedInfraModel = useMemo(
    () => infraModels.find((model) => model.id === selectedInfraModelId) ?? null,
    [infraModels, selectedInfraModelId],
  )

  const openLearnVideoPlayer = useCallback((fileName: string) => {
    setActiveLearnVideoFile(fileName)
    setLearnVideoSourceIndex(0)
    setIsLearnVideoVisible(true)
  }, [])

  const activeLearnVideoSourceCandidates = useMemo(() => {
    if (!activeLearnVideo) return []

    const basePath = import.meta.env.BASE_URL
    const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`
    const relativePath = `videos/iapd-web/${activeLearnVideo.fileName}`
    const cacheBypassQuery = '?play=1'

    return [
      `${normalizedBasePath}${relativePath}${cacheBypassQuery}`,
      `/${relativePath}${cacheBypassQuery}`,
      `${relativePath}${cacheBypassQuery}`,
      `${normalizedBasePath}${relativePath}`,
      `/${relativePath}`,
      relativePath,
    ]
  }, [activeLearnVideo])

  const activeLearnVideoSrc = activeLearnVideoSourceCandidates[learnVideoSourceIndex] ?? ''

  const infraLayoutVideoSourceCandidates = useMemo(() => {
    const basePath = import.meta.env.BASE_URL
    const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`
    const relativePath = 'videos/layout.mp4'
    const cacheBypassQuery = '?play=1'

    return [
      `${normalizedBasePath}${relativePath}${cacheBypassQuery}`,
      `/${relativePath}${cacheBypassQuery}`,
      `${relativePath}${cacheBypassQuery}`,
      `${normalizedBasePath}${relativePath}`,
      `/${relativePath}`,
      relativePath,
    ]
  }, [])

  const handleLearnVideoLoadError = useCallback(() => {
    setLearnVideoSourceIndex((previous) => {
      if (previous >= activeLearnVideoSourceCandidates.length - 1) {
        return previous
      }
      return previous + 1
    })
  }, [activeLearnVideoSourceCandidates])

  useEffect(() => {
    if (!isLearnVideoVisible || activeLearnVideoSourceCandidates.length === 0) {
      setLearnVideoPlaybackSrc('')
      return
    }

    let isCancelled = false
    let objectUrl: string | null = null

    const loadLearnVideo = async () => {
      for (let index = 0; index < activeLearnVideoSourceCandidates.length; index += 1) {
        const candidate = activeLearnVideoSourceCandidates[index]
        if (!candidate) continue

        try {
          const response = await fetch(candidate, { cache: 'no-store' })
          if (!response.ok) continue

          const videoBlob = await response.blob()
          if (isCancelled) return

          objectUrl = URL.createObjectURL(videoBlob)
          setLearnVideoSourceIndex(index)
          setLearnVideoPlaybackSrc(objectUrl)
          return
        } catch {
          continue
        }
      }

      if (!isCancelled) {
        setLearnVideoPlaybackSrc(activeLearnVideoSourceCandidates[0] ?? '')
      }
    }

    void loadLearnVideo()

    return () => {
      isCancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [activeLearnVideoSourceCandidates, isLearnVideoVisible])

  useEffect(() => {
    if (!showInfraLayoutVideo || infraLayoutVideoSourceCandidates.length === 0) {
      setInfraLayoutPlaybackSrc('')
      return
    }

    let isCancelled = false
    let objectUrl: string | null = null

    const loadInfraLayoutVideo = async () => {
      for (const candidate of infraLayoutVideoSourceCandidates) {
        if (!candidate) continue

        try {
          const response = await fetch(candidate, { cache: 'no-store' })
          if (!response.ok) continue

          const videoBlob = await response.blob()
          if (isCancelled) return

          objectUrl = URL.createObjectURL(videoBlob)
          setInfraLayoutPlaybackSrc(objectUrl)
          return
        } catch {
          continue
        }
      }

      if (!isCancelled) {
        setInfraLayoutPlaybackSrc(infraLayoutVideoSourceCandidates[0] ?? '')
      }
    }

    void loadInfraLayoutVideo()

    return () => {
      isCancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [infraLayoutVideoSourceCandidates, showInfraLayoutVideo])

  const openLearnVideoFullscreen = useCallback(() => {
    const videoElement = learnVideoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitRequestFullscreen?: () => Promise<void> })
      | null

    if (!videoElement) return

    if (videoElement.requestFullscreen) {
      void videoElement.requestFullscreen()
      return
    }

    if (videoElement.webkitRequestFullscreen) {
      void videoElement.webkitRequestFullscreen()
      return
    }

    if (videoElement.webkitEnterFullscreen) {
      videoElement.webkitEnterFullscreen()
    }
  }, [])

  const togglePanel = useCallback((panelKey: string) => {
    setExpandedPanels((previous) => ({
      ...previous,
      [panelKey]: !previous[panelKey],
    }))
  }, [])

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

  useEffect(() => {
    if (activeSection === 'learn' && !activeLearnVideoFile && learnTrainingVideos.length > 0) {
      setActiveLearnVideoFile(learnTrainingVideos[0]?.fileName ?? null)
      setIsLearnVideoVisible(false)
    }
  }, [activeSection, activeLearnVideoFile])

  useEffect(() => {
    localStorage.setItem('r360-emergency-kit-checks', JSON.stringify(emergencyKitChecks))
  }, [emergencyKitChecks])

  useEffect(() => {
    localStorage.setItem('r360-community-admin-token', communityAdminToken)
  }, [communityAdminToken])

  useEffect(() => {
    setCommunityIssueStatusDrafts((previous) => {
      const next = { ...previous }
      communityIssueReports.forEach((issue) => {
        if (!next[issue.id]) {
          next[issue.id] = (issue.status as CommunityIssueStatus) ?? 'Submitted'
        }
      })
      return next
    })
  }, [communityIssueReports])
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
  const evacuationAssets = useMemo(
    () => evacuationAssetsByDistrict[selectedDistrict ?? ''] ?? [],
    [selectedDistrict],
  )
  const availableDrawings = useMemo(() => engineeringDrawingLibrary[mapLayer], [mapLayer])
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
  const nearbyShelters = useMemo(
    () => evacuationAssets.filter((asset) => asset.kind === 'Safe Shelter'),
    [evacuationAssets],
  )
  const climateRiskScore = useMemo(() => {
    const floodScore = riskValue === 'Very High' ? 92 : riskValue === 'High' ? 78 : riskValue === 'Medium' ? 62 : 45
    const heatwaveScore = selectedProvince === 'Sindh' || selectedProvince === 'Punjab' ? 74 : 61
    const earthquakeScore =
      (selectedDistrictProfile?.earthquake ?? provinceRisk[selectedProvince].earthquake) === 'Very High'
        ? 88
        : (selectedDistrictProfile?.earthquake ?? provinceRisk[selectedProvince].earthquake) === 'High'
          ? 74
          : (selectedDistrictProfile?.earthquake ?? provinceRisk[selectedProvince].earthquake) === 'Medium'
            ? 58
            : 42
    const airQualityScore = selectedProvince === 'Punjab' ? 68 : selectedProvince === 'Sindh' ? 64 : 54
    return Math.round((floodScore + heatwaveScore + earthquakeScore + airQualityScore) / 4)
  }, [riskValue, selectedDistrictProfile?.earthquake, selectedProvince])
  const climatePrecautions = useMemo(() => {
    const precautions = ['Keep go-bag ready with water, torch, and essential medicines.']
    if (riskValue === 'High' || riskValue === 'Very High') {
      precautions.push('Move valuables and electrical points above likely flood level.')
      precautions.push('Avoid low-lying underpasses and blocked drainage corridors during rain.')
    }
    if ((selectedDistrictProfile?.earthquake ?? provinceRisk[selectedProvince].earthquake) === 'High') {
      precautions.push('Secure heavy furniture/water tanks and identify safe drop-cover-hold points.')
    }
    precautions.push('Store district emergency numbers and nearest shelter routes offline.')
    return precautions
  }, [riskValue, selectedDistrictProfile?.earthquake, selectedProvince])

  const displayedClimateRiskScore = liveClimateSnapshot?.riskScore ?? climateRiskScore
  const displayedHeatwaveRiskZone =
    liveClimateSnapshot?.heatwaveRiskZone ?? (selectedProvince === 'Sindh' || selectedProvince === 'Punjab' ? 'High' : 'Moderate')
  const displayedAirQualityLevel = liveClimateSnapshot?.airQualityLevel ?? (selectedProvince === 'Punjab' ? 'Moderate-Unhealthy' : 'Moderate')
  const displayedClimatePrecautions = liveClimateSnapshot?.precautions?.length ? liveClimateSnapshot.precautions : climatePrecautions

  const loadLiveClimateByCity = useCallback(
    async (cityName: string) => {
      const query = cityName.trim()
      if (!query) {
        setLiveClimateError('Enter a city/area first.')
        return
      }

      setIsLoadingLiveClimate(true)
      setLiveClimateError(null)

      try {
        const snapshot = await fetchLiveClimateByCity(query)
        setLiveClimateSnapshot(snapshot)
        setLocationText(`${snapshot.location.name}, ${snapshot.location.admin1 || snapshot.location.country}`)
        setClimateLocationInput(snapshot.location.name)
      } catch (error) {
        setLiveClimateError(error instanceof Error ? error.message : 'Unable to fetch live climate data for this city.')
      } finally {
        setIsLoadingLiveClimate(false)
      }
    },
    [],
  )

  const loadLiveClimateByCoordinates = useCallback(async (lat: number, lng: number) => {
    setIsLoadingLiveClimate(true)
    setLiveClimateError(null)

    try {
      const snapshot = await fetchLiveClimateByCoordinates(lat, lng)
      setLiveClimateSnapshot(snapshot)
      setLocationText(`${snapshot.location.name}, ${snapshot.location.admin1 || snapshot.location.country}`)
      setClimateLocationInput(snapshot.location.name)
    } catch (error) {
      setLiveClimateError(error instanceof Error ? error.message : 'Unable to fetch live climate data for this location.')
    } finally {
      setIsLoadingLiveClimate(false)
    }
  }, [])

  const buildingSafetyAssessment = useMemo(() => {
    let score = 78
    if (selfAssessmentYearBuilt < 1990) score -= 18
    else if (selfAssessmentYearBuilt < 2005) score -= 9
    if (selfAssessmentConstruction === 'Unreinforced Masonry') score -= 20
    if (selfAssessmentDrainage === 'Poor') score -= 16
    if (selfAssessmentSeismicZone === 'High') score -= 12
    if (selfAssessmentFoundation === 'Unknown') score -= 10
    if (selfAssessmentFoundation === 'Stone Masonry') score -= 6
    const normalized = Math.max(10, Math.min(95, score))
    const rating = normalized >= 75 ? 'Good' : normalized >= 55 ? 'Moderate' : 'High Risk'
    const recommendation =
      rating === 'Good'
        ? 'Maintain drainage and perform annual structural checks.'
        : rating === 'Moderate'
          ? 'Plan retrofit screening and improve drainage/foundation detailing.'
          : 'Request professional structural inspection urgently and limit occupancy in vulnerable zones.'
    return { score: normalized, rating, recommendation }
  }, [
    selfAssessmentConstruction,
    selfAssessmentDrainage,
    selfAssessmentFoundation,
    selfAssessmentSeismicZone,
    selfAssessmentYearBuilt,
  ])
  const availableRetrofitCities = useMemo(() => pakistanCitiesByProvince[selectedProvince] ?? [], [selectedProvince])
  const availableRetrofitManualCities = useMemo(
    () => pakistanCitiesByProvince[retrofitManualProvince] ?? [],
    [retrofitManualProvince],
  )
  const availableApplyCities = useMemo(() => pakistanCitiesByProvince[applyProvince] ?? [], [applyProvince])
  const availableApplyBestPractices = useMemo(() => globalPracticeLibrary[applyHazard], [applyHazard])
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
    if (!availableRetrofitManualCities.includes(retrofitManualCity)) {
      setRetrofitManualCity(availableRetrofitManualCities[0] ?? '')
    }
  }, [availableRetrofitManualCities, retrofitManualCity])

  useEffect(() => {
    return () => {
      retrofitImageSeriesPreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [retrofitImageSeriesPreviewUrls])

  useEffect(() => {
    if (!availableApplyCities.includes(applyCity)) {
      setApplyCity(availableApplyCities[0] ?? '')
    }
  }, [availableApplyCities, applyCity])

  useEffect(() => {
    if (!availableApplyBestPractices.some((item) => item.title === applyBestPracticeTitle)) {
      setApplyBestPracticeTitle(availableApplyBestPractices[0]?.title ?? '')
    }
  }, [availableApplyBestPractices, applyBestPracticeTitle])

  useEffect(() => {
    if (!availableDesignCities.includes(designCity)) {
      setDesignCity(availableDesignCities[0] ?? '')
    }
  }, [availableDesignCities, designCity])

  useEffect(() => {
    let isMounted = true

    const loadSharedInfraModels = async () => {
      setIsLoadingSharedInfraModels(true)
      try {
        const sharedModels = await fetchSharedGeneratedInfraModels()
        if (!isMounted || sharedModels.length === 0) return

        setInfraModels((existing) => mergeInfraModelsBySignature(existing, sharedModels))
      } catch {
        if (isMounted) {
          setInfraModelsError((previous) => previous ?? 'Shared infra models could not be loaded from server.')
        }
      } finally {
        if (isMounted) {
          setIsLoadingSharedInfraModels(false)
        }
      }
    }

    void loadSharedInfraModels()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const generatedModels = infraModels.filter((model) => !preloadedInfraModelSignatureSet.has(getInfraModelSignature(model)))
    const payload = generatedModels.slice(-INFRA_MODELS_CACHE_LIMIT)

    try {
      localStorage.setItem(INFRA_MODELS_CACHE_KEY, JSON.stringify(payload))
    } catch {
      localStorage.removeItem(INFRA_MODELS_CACHE_KEY)
    }
  }, [infraModels])

  useEffect(() => {
    if (!selectedInfraModelId) return
    if (!infraModels.some((model) => model.id === selectedInfraModelId)) {
      setSelectedInfraModelId(null)
    }
  }, [infraModels, selectedInfraModelId])

  useEffect(() => {
    if (selectedInfraModelId || infraModels.length === 0) return
    setSelectedInfraModelId(infraModels[0].id)
  }, [infraModels, selectedInfraModelId])

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

  const generateApplyAreaGuidance = async (guidanceLanguage: 'english' | 'urdu', bestPracticeNameOverride?: string) => {
    setGuidanceGenerationLanguage(guidanceLanguage)
    setGuidanceError(null)
    setConstructionGuidance(null)
    setGuidanceStepImages([])
    setIsGeneratingGuidance(true)

    try {
      const selectedBestPracticeName = bestPracticeNameOverride ?? applyBestPracticeTitle

      const guidance = await generateConstructionGuidance({
        province: applyProvince,
        city: applyCity,
        hazard: applyHazard,
        structureType,
        bestPracticeName: selectedBestPracticeName,
      })

      setConstructionGuidance(guidance)

      setIsGeneratingStepImages(true)

      try {
        const imageResult = await generateGuidanceStepImages({
          province: applyProvince,
          city: applyCity,
          hazard: applyHazard,
          structureType,
          bestPracticeName: selectedBestPracticeName,
          steps: guidance.steps,
        })

        if (imageResult.images.length < guidance.steps.length) {
          throw new Error('AI image generation returned incomplete step visuals. Please try again.')
        }
        setGuidanceStepImages(imageResult.images)
      } catch (error) {
        setGuidanceError(error instanceof Error ? error.message : 'Step image generation failed.')
      } finally {
        setIsGeneratingStepImages(false)
      }
    } catch (error) {
      setGuidanceError(error instanceof Error ? error.message : 'Guidance generation failed.')
    } finally {
      setIsGeneratingGuidance(false)
    }
  }

  const handleApplyBestPracticeChange = (nextBestPractice: string) => {
    setApplyBestPracticeTitle(nextBestPractice)
  }

  const downloadApplyGuidanceWordReport = async (reportLanguage: 'english' | 'urdu') => {
    if (!constructionGuidance) return

    setWordReportLanguage(reportLanguage)
    setIsPreparingWordReport(true)

    try {

      let reportImages = guidanceStepImages
      const isEnglishReport = reportLanguage === 'english'
      const reportSteps = isEnglishReport ? constructionGuidance.steps : constructionGuidance.stepsUrdu

      if (reportImages.length < reportSteps.length) {
        try {
          const imageResult = await generateGuidanceStepImages({
            province: applyProvince,
            city: applyCity,
            hazard: applyHazard,
            structureType,
            bestPracticeName: applyBestPracticeTitle,
            steps: reportSteps,
          })

          if (imageResult.images.length < reportSteps.length) {
            setGuidanceError('Report download blocked: all AI step images must be generated first. Please try again.')
            return
          }

          reportImages = imageResult.images
          setGuidanceStepImages(imageResult.images)
        } catch (error) {
          setGuidanceError(error instanceof Error ? error.message : 'Failed to generate AI images for report download.')
          return
        }
      }

      const toImageBytes = (dataUrl: string): Uint8Array => {
      const base64 = dataUrl.split(',')[1] ?? ''
      const binary = window.atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
      }
      return bytes
    }

      const getImageSize = (dataUrl: string): Promise<{ width: number; height: number }> =>
      new Promise((resolve) => {
        const img = new window.Image()
        img.onload = () => {
          const maxWidth = 560
          const naturalWidth = img.naturalWidth || 1024
          const naturalHeight = img.naturalHeight || 768
          const ratio = naturalHeight / naturalWidth
          const width = Math.min(maxWidth, naturalWidth)
          const height = Math.max(220, Math.round(width * ratio))
          resolve({ width, height })
        }
        img.onerror = () => resolve({ width: 520, height: 320 })
        img.src = dataUrl
      })

      const renderedAt = new Date().toLocaleString()
      const reportTitle = isEnglishReport
      ? 'Resilience360 Construction Guidance in English Report'
      : 'Resilience360 تعمیراتی رہنمائی رپورٹ (اردو)'
      const areaLabel = isEnglishReport ? 'Area' : 'علاقہ'
      const hazardLabel = isEnglishReport ? 'Hazard' : 'خطرہ'
      const bestPracticeLabel = isEnglishReport ? 'Best Practice' : 'بہترین طریقہ کار'
      const generatedLabel = isEnglishReport ? 'Generated' : 'تیار کردہ وقت'
      const summaryHeading = isEnglishReport ? 'Executive Summary' : 'خلاصہ'
      const materialsHeading = isEnglishReport ? 'Recommended Materials' : 'تجویز کردہ مواد'
      const safetyHeading = isEnglishReport ? 'Safety Requirements' : 'حفاظتی ہدایات'
      const stepLabel = isEnglishReport ? 'Step' : 'مرحلہ'
      const keyChecksHeading = isEnglishReport ? 'Key Checks' : 'اہم جانچ نکات'
      const stepVisualCaption = isEnglishReport ? 'Step visual' : 'مرحلے کی تصویر'
      const reportSummary = isEnglishReport ? constructionGuidance.summary : constructionGuidance.summaryUrdu
      const reportMaterials = isEnglishReport ? constructionGuidance.materials : constructionGuidance.materialsUrdu
      const reportSafety = isEnglishReport ? constructionGuidance.safety : constructionGuidance.safetyUrdu
      const docChildren: Paragraph[] = [
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: reportTitle, bold: true, size: 34 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 260 },
        children: [
          new TextRun({
            text: `${areaLabel}: ${applyCity}, ${applyProvince}   |   ${hazardLabel}: ${applyHazard}   |   ${bestPracticeLabel}: ${applyBestPracticeTitle}   |   ${generatedLabel}: ${renderedAt}`,
            size: 20,
          }),
        ],
      }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, text: summaryHeading }),
      new Paragraph({ text: reportSummary, spacing: { after: 220 } }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, text: materialsHeading }),
      ...reportMaterials.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
      new Paragraph({ text: '', spacing: { after: 120 } }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, text: safetyHeading }),
      ...reportSafety.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
      new Paragraph({ text: '', spacing: { after: 140 } }),
    ]

      for (const [index, step] of reportSteps.entries()) {
        const image = isEnglishReport
          ? reportImages.find((item) => item.stepTitle === step.title) ?? reportImages[index]
          : reportImages[index]

        docChildren.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, text: `${stepLabel} ${index + 1}: ${step.title}`, spacing: { before: 240, after: 80 } }),
        new Paragraph({ text: step.description, spacing: { after: 100 } }),
        new Paragraph({ text: keyChecksHeading, heading: HeadingLevel.HEADING_3 }),
        ...step.keyChecks.map((item) => new Paragraph({ text: item, bullet: { level: 0 } })),
      )

        if (image?.imageDataUrl) {
          const imageBytes = toImageBytes(image.imageDataUrl)
          const imageSize = await getImageSize(image.imageDataUrl)

          docChildren.push(
          new Paragraph({ text: '', spacing: { after: 80 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imageBytes,
                type: 'png',
                transformation: {
                  width: imageSize.width,
                  height: imageSize.height,
                },
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [new TextRun({ text: `${stepLabel} ${index + 1} ${stepVisualCaption}`, italics: true, size: 18 })],
          }),
        )
        }
      }

      const report = new Document({
        sections: [
          {
            children: docChildren,
          },
        ],
      })

      const blob = await Packer.toBlob(report)
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `resilience360-guidance-report-${reportLanguage}-${applyProvince}-${applyCity}-${Date.now()}.docx`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
    } finally {
      setIsPreparingWordReport(false)
    }
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
    setInfraModelsSyncMessage(null)
    setIsLoadingInfraModels(true)

    try {
      const existingSignatures = new Set(infraModels.map((model) => getInfraModelSignature(model)))
      const existingIds = new Set(infraModels.map((model) => model.id))
      const uniqueNewModels: InfraModel[] = []

      for (let attempt = 0; attempt < 3 && uniqueNewModels.length < 4; attempt += 1) {
        const result = await fetchResilienceInfraModels({
          country: 'Pakistan',
          province: selectedProvince,
        })

        for (const model of result.models) {
          const signature = getInfraModelSignature(model)
          if (existingSignatures.has(signature)) {
            continue
          }

          existingSignatures.add(signature)

          const baseId = model.id || `infra-model-${Date.now()}-${attempt}`
          let key = baseId
          while (existingIds.has(key)) {
            key = `${baseId}-${Math.random().toString(36).slice(2, 8)}`
          }
          existingIds.add(key)

          uniqueNewModels.push({
            ...model,
            id: key,
          })

          if (uniqueNewModels.length >= 4) {
            break
          }
        }
      }

      if (uniqueNewModels.length === 0) {
        setInfraModelsError('No new unique infra models were generated. Click again to try another batch.')
        return
      }

      setInfraModels((existing) => mergeInfraModelsBySignature(existing, uniqueNewModels))

      try {
        const sharedSaveResult = await saveSharedGeneratedInfraModels(uniqueNewModels)
        setInfraModels((existing) => mergeInfraModelsBySignature(existing, sharedSaveResult.models))
        setInfraModelsSyncMessage(
          sharedSaveResult.added > 0
            ? `Saved ${sharedSaveResult.added} newly generated model(s) to shared server storage.`
            : 'Generated models were already available in shared server storage.',
        )
      } catch {
        setInfraModelsSyncMessage('Generated models are available on this device, but shared server save failed.')
      }
    } catch (error) {
      setInfraModelsError(error instanceof Error ? error.message : 'Infra model loading failed.')
    } finally {
      setIsLoadingInfraModels(false)
    }
  }

  const syncInfraModelsGitHubNow = async () => {
    const adminToken = communityAdminToken.trim()
    if (!adminToken) {
      setInfraModelsSyncMessage('Admin token is required to sync shared infra models to GitHub.')
      return
    }

    setIsSyncingInfraModels(true)
    setInfraModelsSyncMessage(null)

    try {
      const syncResult = await syncSharedInfraModelsToGitHub(adminToken)
      setInfraModelsSyncMessage(syncResult.message)
    } catch (error) {
      setInfraModelsSyncMessage(error instanceof Error ? error.message : 'Failed to sync shared infra models to GitHub.')
    } finally {
      setIsSyncingInfraModels(false)
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

  const readinessRiskLabel = useMemo(() => {
    if (readinessScore >= 80) return 'HIGH RISK'
    if (readinessScore >= 60) return 'MEDIUM RISK'
    return 'LOW RISK'
  }, [readinessScore])

  const readinessGaugeAngle = useMemo(() => Math.round((readinessScore / 100) * 180), [readinessScore])

  const isQuotaError = useCallback(
    (message: string): boolean =>
      /\b429\b|\b422\b|quota|insufficient_quota|billing|rate\s*limit|requested model|not supported by any provider|provider you have enabled|unsupported model|unprocessable|status code \(no body\)/i.test(
        message,
      ),
    [],
  )

  const handleRetrofitSeriesUpload = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    const incomingFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (incomingFiles.length === 0) {
      return
    }

    const nextFiles = [...retrofitImageSeriesFiles, ...incomingFiles]
    const nextPreviews = [...retrofitImageSeriesPreviewUrls, ...incomingFiles.map((file) => URL.createObjectURL(file))]

    setRetrofitImageSeriesFiles(nextFiles)
    setRetrofitImageSeriesPreviewUrls(nextPreviews)
    setRetrofitImageSeriesResults([])
    setRetrofitGuidanceResults([])
    setRetrofitFinalEstimate(null)
    setRetrofitError(null)
  }

  const openRetrofitCalculatorPage = useCallback(() => {
    setRetrofitError(null)
    navigateToSection('retrofitCalculator')
  }, [navigateToSection])

  const calculateRetrofitEstimateFromSeries = async () => {
    if (retrofitImageSeriesFiles.length === 0) {
      setRetrofitError('Upload one or more building defect photos before calculating.')
      return
    }

    const locationProvince = retrofitLocationMode === 'manual' ? retrofitManualProvince : selectedProvince
    const locationCity =
      retrofitLocationMode === 'manual'
        ? retrofitManualCity
        : retrofitCity || pakistanCitiesByProvince[selectedProvince]?.[0] || 'Lahore'

    if (!locationProvince || !locationCity) {
      setRetrofitError('Select a valid Pakistan province and city/district.')
      return
    }

    setIsCalculatingRetrofitEstimate(true)
    setRetrofitError(null)
    setMlEstimate(null)
    setVisionAnalysis(null)
    setRetrofitImageSeriesResults([])
    setRetrofitFinalEstimate(null)

    try {
      const provinceProfile = provinceRisk[locationProvince] ?? provinceRisk.Punjab
      const cityRates = cityRateByProvince[locationProvince]?.[locationCity] ?? {
        laborDaily: 2600,
        materialIndex: 1,
        logisticsIndex: 1,
        equipmentIndex: 1,
      }
      const equipmentIndex = deriveEquipmentIndex(cityRates)
      const laborFactor = cityRates.laborDaily / 2600
      const locationFactor = laborFactor * 0.45 + cityRates.materialIndex * 0.45 + cityRates.logisticsIndex * 0.1

      const structureFactor: Record<string, number> = {
        'Masonry House': 1,
        'RC Frame': 1.2,
        'School Block': 1.35,
        'Bridge Approach': 1.5,
      }
      const damageFactor: Record<'Low' | 'Medium' | 'High', number> = {
        Low: 1,
        Medium: 1.22,
        High: 1.48,
      }
      const scopeRate: Record<'Basic' | 'Standard' | 'Comprehensive', number> = {
        Basic: 320,
        Standard: 740,
        Comprehensive: 1250,
      }

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

      const visibilityPenalty: Record<'excellent' | 'good' | 'fair' | 'poor', number> = {
        excellent: 0.1,
        good: 0.14,
        fair: 0.2,
        poor: 0.26,
      }

      const hazardFactor =
        provinceProfile.earthquake === 'Very High' || provinceProfile.flood === 'Very High'
          ? 1.15
          : provinceProfile.earthquake === 'High' || provinceProfile.flood === 'High'
            ? 1.08
            : 1

      const defectProfileTotals: Partial<
        Record<'crack' | 'spalling' | 'corrosion' | 'moisture' | 'deformation' | 'other', number>
      > = {}
      const structureBaseAreaSqft: Record<string, number> = {
        'Masonry House': 520,
        'RC Frame': 760,
        'School Block': 980,
        'Bridge Approach': 1200,
      }
      const practicalGuidance = new Set<string>()
      const imageResults: RetrofitImageSeriesResult[] = []
      let severityAccumulator = 0
      let affectedAccumulator = 0
      let uncertaintyAccumulator = 0

      for (let index = 0; index < retrofitImageSeriesFiles.length; index += 1) {
        const file = retrofitImageSeriesFiles[index]
        const previewUrl = retrofitImageSeriesPreviewUrls[index] ?? URL.createObjectURL(file)

        try {
          const analysis = await analyzeBuildingWithVision({
            image: file,
            structureType,
            province: locationProvince,
            location: `${locationCity}, ${locationProvince}, Pakistan`,
            riskProfile: `earthquake=${provinceProfile.earthquake}, flood=${provinceProfile.flood}, landslide=${provinceProfile.landslide}`,
          })

          if (index === 0) {
            setVisionAnalysis(analysis)
          }

          const defects = analysis.defects ?? []
          defects.forEach((defect) => {
            defectProfileTotals[defect.type] = (defectProfileTotals[defect.type] ?? 0) + 1
          })

          analysis.priorityActions.forEach((action) => {
            practicalGuidance.add(action)
          })
          analysis.retrofitPlan.immediate.forEach((item) => {
            practicalGuidance.add(`Immediate: ${item}`)
          })
          analysis.retrofitPlan.shortTerm.forEach((item) => {
            practicalGuidance.add(`Short-term: ${item}`)
          })
          analysis.retrofitPlan.longTerm.forEach((item) => {
            practicalGuidance.add(`Long-term: ${item}`)
          })

          const inferredSeverityScore = defects.length
            ? Math.round(
                defects.reduce(
                  (sum, defect) =>
                    sum + (defect.severity === 'high' ? 85 : defect.severity === 'medium' ? 60 : 35) * defect.confidence,
                  0,
                ) / defects.length,
              )
            : 42

          const inferredAffectedAreaPercent = Math.max(
            12,
            Math.min(90, 18 + defects.length * 7 + defects.filter((defect) => defect.severity === 'high').length * 8),
          )

          const scoreSignals = analysis.costSignals
          const severityScore = Math.max(0, Math.min(100, Number(scoreSignals?.severityScore) || inferredSeverityScore))
          const affectedAreaPercent = Math.max(
            8,
            Math.min(100, Number(scoreSignals?.estimatedAffectedAreaPercent) || inferredAffectedAreaPercent),
          )

          const qualityVisibility = analysis.imageQuality.visibility
          const recommendedScope = scoreSignals ? mapScope(scoreSignals.recommendedScope) : severityScore >= 72 ? 'Comprehensive' : severityScore >= 48 ? 'Standard' : 'Basic'
          const damageLevel = scoreSignals
            ? mapDamage(scoreSignals.assessedDamageLevel)
            : severityScore >= 72
              ? 'High'
              : severityScore >= 45
                ? 'Medium'
                : 'Low'
          const urgencyLevel = scoreSignals
            ? scoreSignals.urgencyLevel
            : severityScore >= 72
              ? 'critical'
              : severityScore >= 48
                ? 'priority'
                : 'routine'

          const inferredAreaSqft = Math.max(
            220,
            Math.min(
              2400,
              Math.round(
                (structureBaseAreaSqft[structureType] ?? 520) *
                  (0.75 + affectedAreaPercent / 135) *
                  (0.82 + severityScore / 180) *
                  (0.9 + Math.min(8, defects.length) * 0.045),
              ),
            ),
          )

          const urgencyBoost: Record<'routine' | 'priority' | 'critical', number> = {
            routine: 1,
            priority: 1.08,
            critical: 1.18,
          }

          const baseCost =
            inferredAreaSqft *
            scopeRate[recommendedScope] *
            (structureFactor[structureType] ?? 1) *
            damageFactor[damageLevel] *
            (0.92 + (severityScore / 100) * 0.34) *
            Math.max(0.45, Math.min(1.2, affectedAreaPercent / 100 + 0.25)) *
            urgencyBoost[urgencyLevel] *
            locationFactor

          const estimatedCost = baseCost * hazardFactor * 1.12

          imageResults.push({
            id: `${Date.now()}-${index}-${file.name}`,
            fileName: file.name,
            previewUrl,
            summary: analysis.summary,
            defectCount: defects.length,
            inferredAreaSqft,
            severityScore,
            affectedAreaPercent,
            estimatedCost,
            recommendedScope,
            damageLevel,
            urgencyLevel,
            visibility: qualityVisibility,
          })

          severityAccumulator += severityScore
          affectedAccumulator += affectedAreaPercent
          uncertaintyAccumulator += visibilityPenalty[qualityVisibility]
        } catch (error) {
          const fallbackMessage = error instanceof Error ? error.message : 'Image analysis failed'
          if (!isQuotaError(fallbackMessage)) {
            throw error
          }

          const fallbackSignals = {
            severityScore: 55,
            affectedAreaPercent: 30,
            urgencyLevel: 'priority' as const,
            recommendedScope: 'Standard' as const,
            damageLevel: 'Medium' as const,
            visibility: 'good' as const,
          }

          const fallbackAreaSqft = Math.max(
            220,
            Math.min(2200, Math.round((structureBaseAreaSqft[structureType] ?? 520) * 0.95)),
          )

          const fallbackBase =
            fallbackAreaSqft *
            scopeRate[fallbackSignals.recommendedScope] *
            (structureFactor[structureType] ?? 1) *
            damageFactor[fallbackSignals.damageLevel] *
            locationFactor
          const fallbackCost = fallbackBase * hazardFactor * 1.12

          imageResults.push({
            id: `${Date.now()}-${index}-${file.name}`,
            fileName: file.name,
            previewUrl,
            summary: 'AI unavailable for this image. ML-ready fallback assumptions applied.',
            defectCount: 0,
            inferredAreaSqft: fallbackAreaSqft,
            severityScore: fallbackSignals.severityScore,
            affectedAreaPercent: fallbackSignals.affectedAreaPercent,
            estimatedCost: fallbackCost,
            recommendedScope: fallbackSignals.recommendedScope,
            damageLevel: fallbackSignals.damageLevel,
            urgencyLevel: fallbackSignals.urgencyLevel,
            visibility: fallbackSignals.visibility,
          })

          severityAccumulator += fallbackSignals.severityScore
          affectedAccumulator += fallbackSignals.affectedAreaPercent
          uncertaintyAccumulator += visibilityPenalty[fallbackSignals.visibility]
        }
      }

      if (imageResults.length === 0) {
        throw new Error('No valid image analysis result generated. Please upload clearer images and retry.')
      }

      setRetrofitImageSeriesResults(imageResults)

      const totalAreaSqft = Math.max(
        220,
        imageResults.reduce((sum, item) => sum + item.inferredAreaSqft, 0),
      )

      const avgSeverityScore = Math.round(severityAccumulator / imageResults.length)
      const avgAffectedAreaPercent = Math.round(affectedAccumulator / imageResults.length)
      const avgUncertaintyPenalty = uncertaintyAccumulator / imageResults.length
      const highestUrgency = imageResults.some((item) => item.urgencyLevel === 'critical')
        ? 'critical'
        : imageResults.some((item) => item.urgencyLevel === 'priority')
          ? 'priority'
          : 'routine'

      const highCount = imageResults.filter((item) => item.damageLevel === 'High').length
      const lowCount = imageResults.filter((item) => item.damageLevel === 'Low').length
      const aggregateDamageLevel: 'Low' | 'Medium' | 'High' =
        highCount >= Math.ceil(imageResults.length / 2)
          ? 'High'
          : lowCount >= Math.ceil(imageResults.length / 2)
            ? 'Low'
            : 'Medium'

      const aggregateScope: 'Basic' | 'Standard' | 'Comprehensive' =
        avgSeverityScore >= 72 ? 'Comprehensive' : avgSeverityScore >= 48 ? 'Standard' : 'Basic'

      let ml: MlRetrofitEstimate | null = null

      try {
        ml = await getMlRetrofitEstimate({
          structureType,
          province: locationProvince,
          city: locationCity,
          areaSqft: totalAreaSqft,
          severityScore: avgSeverityScore,
          affectedAreaPercent: avgAffectedAreaPercent,
          urgencyLevel: highestUrgency,
          laborDaily: cityRates.laborDaily,
          materialIndex: cityRates.materialIndex,
          equipmentIndex,
          logisticsIndex: cityRates.logisticsIndex,
          defectProfile: defectProfileTotals,
          imageQuality: avgUncertaintyPenalty >= 0.22 ? 'poor' : avgUncertaintyPenalty >= 0.18 ? 'fair' : 'good',
        })

        setMlEstimate(ml)
      } catch {
        ml = null
        setMlEstimate(null)
      }

      const baseRateFromImages = imageResults.reduce((sum, item) => sum + item.estimatedCost, 0) / totalAreaSqft
      const mlBaseRate = ml?.predictedCostPerSqft ?? baseRateFromImages
      const adjustedBase = mlBaseRate * totalAreaSqft
      const hazardAdjusted = adjustedBase * hazardFactor
      const contingency = hazardAdjusted * 0.12
      const totalCost = hazardAdjusted + contingency

      const spread = ml
        ? Math.max(0.1, Math.min(0.28, 0.22 - ml.confidence * 0.12))
        : Math.max(0.12, Math.min(0.34, avgUncertaintyPenalty + 0.1))

      const estimatedDuration = ml?.predictedDurationWeeks
        ? ml.predictedDurationWeeks
        : Math.max(
            2,
            Math.round((totalAreaSqft / 540) * (aggregateScope === 'Comprehensive' ? 1.4 : aggregateScope === 'Standard' ? 1.1 : 0.9)),
          )

      const finalScope: 'Basic' | 'Standard' | 'Comprehensive' = ml
        ? ml.predictedScope === 'comprehensive'
          ? 'Comprehensive'
          : ml.predictedScope === 'basic'
            ? 'Basic'
            : 'Standard'
        : aggregateScope

      const finalDamage: 'Low' | 'Medium' | 'High' = ml
        ? ml.predictedDamage === 'high'
          ? 'High'
          : ml.predictedDamage === 'low'
            ? 'Low'
            : 'Medium'
        : aggregateDamageLevel

      setRetrofitFinalEstimate({
        estimateSource: ml ? 'ML Model' : 'Image-driven',
        province: locationProvince,
        city: locationCity,
        imageCount: imageResults.length,
        totalAreaSqft,
        durationWeeks: estimatedDuration,
        totalCost,
        minTotalCost: totalCost * (1 - spread),
        maxTotalCost: totalCost * (1 + spread),
        sqftRate: totalCost / totalAreaSqft,
        locationFactor,
        laborDaily: cityRates.laborDaily,
        materialIndex: cityRates.materialIndex,
        logisticsIndex: cityRates.logisticsIndex,
        equipmentIndex,
        scope: finalScope,
        damageLevel: finalDamage,
        urgencyLevel: highestUrgency,
        affectedAreaPercent: avgAffectedAreaPercent,
        severityScore: avgSeverityScore,
        mlModel: ml?.model,
        mlConfidence: ml?.confidence,
        guidance:
          ml?.guidance && ml.guidance.length > 0
            ? ml.guidance
            : Array.from(practicalGuidance).length > 0
              ? Array.from(practicalGuidance)
              : imageResults.flatMap((item) => [`${item.fileName}: ${item.summary}`]),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Retrofit estimate calculation failed.'
      setRetrofitError(message)
      setRetrofitImageSeriesResults([])
      setRetrofitFinalEstimate(null)
    } finally {
      setIsCalculatingRetrofitEstimate(false)
    }
  }

  void calculateRetrofitEstimateFromSeries

  const generateRetrofitGuidanceFromSeries = async () => {
    if (retrofitImageSeriesFiles.length === 0) {
      setRetrofitError('Upload one or more building defect photos before generating guidance.')
      return
    }

    const locationProvince = retrofitLocationMode === 'manual' ? retrofitManualProvince : selectedProvince
    const locationCity =
      retrofitLocationMode === 'manual'
        ? retrofitManualCity
        : retrofitCity || pakistanCitiesByProvince[selectedProvince]?.[0] || 'Lahore'

    if (!locationProvince || !locationCity) {
      setRetrofitError('Select a valid Pakistan province and city/district.')
      return
    }

    setIsGeneratingRetrofitGuidance(true)
    setRetrofitError(null)
    setRetrofitGuidanceResults([])

    try {
      const provinceProfile = provinceRisk[locationProvince] ?? provinceRisk.Punjab
      const riskProfile = `EQ:${provinceProfile.earthquake}, Flood:${provinceProfile.flood}, Landslide:${provinceProfile.landslide}`
      const guidanceResults: RetrofitGuidanceResult[] = []

      for (let index = 0; index < retrofitImageSeriesFiles.length; index += 1) {
        const file = retrofitImageSeriesFiles[index]
        const analysis = await analyzeBuildingWithVision({
          image: file,
          structureType,
          province: locationProvince,
          location: `${locationCity}, ${locationProvince}, Pakistan`,
          riskProfile,
        })

        const recommendations = [
          ...analysis.priorityActions,
          ...analysis.retrofitPlan.immediate,
          ...analysis.retrofitPlan.shortTerm,
        ]
        const uniqueRecommendations = Array.from(new Set(recommendations.map((item) => item.trim()).filter(Boolean))).slice(0, 8)

        guidanceResults.push({
          id: `guidance-${Date.now()}-${index}`,
          fileName: file.name || `Image ${index + 1}`,
          summary: analysis.summary,
          safetyNote: analysis.safetyNote,
          visibility: analysis.imageQuality.visibility,
          recommendations: uniqueRecommendations,
        })
      }

      setRetrofitGuidanceResults(guidanceResults)
    } finally {
      setIsGeneratingRetrofitGuidance(false)
    }
  }

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
    if (!retrofitFinalEstimate) {
      setRetrofitError('Calculate retrofit estimate first, then download the report.')
      return
    }

    const doc = new jsPDF()
    const provinceProfile = provinceRisk[retrofitFinalEstimate.province] ?? provinceRisk.Punjab
    const defectCount = retrofitImageSeriesResults.reduce((sum, item) => sum + item.defectCount, 0)

    doc.setFontSize(16)
    doc.text('Resilience360 Retrofit Estimate', 14, 18)
    doc.setFontSize(11)
    doc.text(`Date: ${new Date().toLocaleString()}`, 14, 28)
    doc.text(`Province: ${retrofitFinalEstimate.province}`, 14, 36)
    doc.text(`City/District: ${retrofitFinalEstimate.city}`, 14, 44)
    doc.text(`Structure Type: ${structureType}`, 14, 52)
    doc.text(`Estimate Source: ${retrofitFinalEstimate.estimateSource}`, 14, 60)
    doc.text(`Retrofit Scope: ${retrofitFinalEstimate.scope}`, 14, 68)
    doc.text(`Defect Severity: ${retrofitFinalEstimate.damageLevel}`, 14, 76)
    doc.text(`Analyzed Photos: ${retrofitFinalEstimate.imageCount}`, 14, 84)
    doc.text(`Inferred Area: ${retrofitFinalEstimate.totalAreaSqft.toLocaleString()} sq ft`, 14, 92)
    doc.text(`Estimated Duration: ${retrofitFinalEstimate.durationWeeks} weeks`, 14, 100)
    doc.text(`Location Cost Factor: ${retrofitFinalEstimate.locationFactor.toFixed(2)}x`, 14, 108)
    doc.text(`Estimated Total: PKR ${Math.round(retrofitFinalEstimate.totalCost).toLocaleString()}`, 14, 116)
    doc.text(
      `Estimated Range: PKR ${Math.round(retrofitFinalEstimate.minTotalCost).toLocaleString()} - PKR ${Math.round(retrofitFinalEstimate.maxTotalCost).toLocaleString()}`,
      14,
      124,
    )
    doc.text(`Effective Rate: PKR ${Math.round(retrofitFinalEstimate.sqftRate).toLocaleString()}/sq ft`, 14, 132)
    doc.text(`Affected Area (average): ${Math.round(retrofitFinalEstimate.affectedAreaPercent)}%`, 14, 140)
    doc.text(`Urgency: ${retrofitFinalEstimate.urgencyLevel}`, 14, 148)

    doc.text('Hazard Profile:', 14, 160)
    doc.text(`- Earthquake: ${provinceProfile.earthquake}`, 18, 168)
    doc.text(`- Flood: ${provinceProfile.flood}`, 18, 176)
    doc.text(`- Landslide: ${provinceProfile.landslide}`, 18, 184)

    const summary =
      retrofitImageSeriesResults[0]?.summary ??
      visionAnalysis?.summary ??
      'No model summary available. Estimate based on uploaded image series and calculator inputs.'
    const clippedSummary = summary.length > 110 ? `${summary.slice(0, 107)}...` : summary
    doc.text(`Model Summary: ${clippedSummary}`, 14, 196)
    doc.text(`Detected Defects: ${defectCount}`, 14, 204)

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

  const sendLocalAdvisoryQuestion = async () => {
    const question = advisoryQuestion.trim()
    if (!question) return

    setAdvisoryError(null)
    setIsAskingAdvisory(true)
    setAdvisoryMessages((messages) => [...messages, { role: 'user', text: question }])
    setAdvisoryQuestion('')

    try {
      const result = await askLocalAdvisory({
        question,
        province: selectedProvince,
        district: selectedDistrict,
        riskLayer: mapLayer,
        riskValue,
        language: districtUiLanguage,
        districtProfile: selectedDistrictProfile,
      })

      setAdvisoryMessages((messages) => [...messages, { role: 'assistant', text: result.answer }])
    } catch (error) {
      const fallback = answerLocalAdvisory(question)
      setAdvisoryMessages((messages) => [...messages, { role: 'assistant', text: fallback }])
      setAdvisoryError(error instanceof Error ? error.message : 'AI advisory temporarily unavailable. Showing local fallback answer.')
    } finally {
      setIsAskingAdvisory(false)
    }
  }

  const downloadLatestAdvisoryAnswerPdf = () => {
    const latestAssistant = [...advisoryMessages].reverse().find((message) => message.role === 'assistant')
    const latestQuestion = [...advisoryMessages].reverse().find((message) => message.role === 'user')
    if (!latestAssistant) return

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const margin = 12
    const width = doc.internal.pageSize.getWidth() - margin * 2
    let cursorY = 18

    doc.setFontSize(14)
    doc.text('Resilience360 - Advisory Answer Snapshot', margin, cursorY)
    cursorY += 8

    doc.setFontSize(10)
    doc.text(`Province: ${selectedProvince} | District: ${selectedDistrict ?? 'Not selected'} | Layer: ${mapLayer} (${riskValue})`, margin, cursorY)
    cursorY += 7
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, cursorY)
    cursorY += 8

    if (latestQuestion) {
      const questionLines = doc.splitTextToSize(`Question: ${latestQuestion.text}`, width)
      doc.setFont('helvetica', 'bold')
      doc.text(questionLines, margin, cursorY)
      cursorY += questionLines.length * 5 + 3
      doc.setFont('helvetica', 'normal')
    }

    const answerLines = doc.splitTextToSize(`Answer: ${latestAssistant.text}`, width)
    doc.text(answerLines, margin, cursorY)

    doc.save(`resilience360-advisory-answer-${selectedProvince}-${selectedDistrict ?? 'district'}-${Date.now()}.pdf`)
  }

  const copyLatestAdvisoryAnswer = async () => {
    const latestAssistant = [...advisoryMessages].reverse().find((message) => message.role === 'assistant')
    if (!latestAssistant) return

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(latestAssistant.text)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = latestAssistant.text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      setAdvisoryCopyMsg('Answer copied.')
      window.setTimeout(() => setAdvisoryCopyMsg(null), 1800)
    } catch {
      setAdvisoryCopyMsg('Copy failed.')
      window.setTimeout(() => setAdvisoryCopyMsg(null), 1800)
    }
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
        void loadLiveClimateByCoordinates(rawLat, rawLng)

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
  }, [activeSection, detectedUserLocation, hasTriedApplyAutoLocation, loadLiveClimateByCoordinates])

  const loadCommunityIssueReports = useCallback(async () => {
    setIsLoadingCommunityIssues(true)
    try {
      const issues = await fetchCommunityIssues()
      setCommunityIssueReports(issues)
    } catch (error) {
      setDistrictProfileSavedMsg(error instanceof Error ? error.message : 'Unable to load community issues right now.')
      window.setTimeout(() => setDistrictProfileSavedMsg(null), 3200)
    } finally {
      setIsLoadingCommunityIssues(false)
    }
  }, [])

  useEffect(() => {
    if (activeSection === 'readiness' || activeSection === 'settings') {
      void loadCommunityIssueReports()
    }
  }, [activeSection, loadCommunityIssueReports])

  const submitCommunityIssueReport = async () => {
    if (!communityIssuePhoto) {
      setDistrictProfileSavedMsg('Please upload issue photo before submitting report.')
      return
    }

    setIsSubmittingCommunityIssue(true)
    try {
      let lat: number | null = detectedUserLocation?.lat ?? null
      let lng: number | null = detectedUserLocation?.lng ?? null

      if (!autoCaptureGpsOnSubmit) {
        lat = null
        lng = null
      } else if (!lat || !lng) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            })
          })
          lat = position.coords.latitude
          lng = position.coords.longitude
          setDetectedUserLocation({ lat, lng })
        } catch {
          lat = null
          lng = null
        }
      }

      const createdIssue = await submitCommunityIssue({
        image: communityIssuePhoto,
        category: communityIssueCategory,
        notes: communityIssueNotes.trim() || 'No additional notes provided.',
        lat,
        lng,
        province: selectedProvince,
        district: selectedDistrict,
      })

      setCommunityIssueReports((previous) => [createdIssue, ...previous].slice(0, 50))
      setCommunityIssueStatusDrafts((previous) => ({
        ...previous,
        [createdIssue.id]: (createdIssue.status as CommunityIssueStatus) ?? 'Submitted',
      }))
      setCommunityIssueNotes('')
      setCommunityIssuePhoto(null)
      setDistrictProfileSavedMsg('Issue submitted successfully. Status: Submitted')
      window.setTimeout(() => setDistrictProfileSavedMsg(null), 3000)
    } catch (error) {
      setDistrictProfileSavedMsg(error instanceof Error ? error.message : 'Issue submission failed.')
      window.setTimeout(() => setDistrictProfileSavedMsg(null), 3200)
    } finally {
      setIsSubmittingCommunityIssue(false)
    }
  }

  const saveCommunityIssueStatusUpdate = async (issueId: string) => {
    const adminToken = communityAdminToken.trim()
    if (!adminToken) {
      setDistrictProfileSavedMsg('Admin token required to update issue status.')
      window.setTimeout(() => setDistrictProfileSavedMsg(null), 2600)
      return
    }

    const nextStatus = communityIssueStatusDrafts[issueId] ?? 'Submitted'
    setIsUpdatingCommunityIssueId(issueId)
    try {
      const updated = await updateCommunityIssueStatus(issueId, nextStatus, adminToken)
      setCommunityIssueReports((previous) => previous.map((issue) => (issue.id === issueId ? updated : issue)))
      setDistrictProfileSavedMsg(`Issue ${issueId} updated to ${updated.status}.`)
      window.setTimeout(() => setDistrictProfileSavedMsg(null), 2600)
    } catch (error) {
      setDistrictProfileSavedMsg(error instanceof Error ? error.message : 'Status update failed.')
      window.setTimeout(() => setDistrictProfileSavedMsg(null), 3200)
    } finally {
      setIsUpdatingCommunityIssueId(null)
    }
  }

  const runSmartDrainageAlertCheck = () => {
    const hasRainSignals =
      filteredHazardAlerts.some((item) => item.type === 'Flood Warning' || item.type === 'Heavy Rain') ||
      Boolean(pmdLiveSnapshot?.warning)
    if (hasRainSignals && (riskValue === 'High' || riskValue === 'Very High')) {
      setSmartDrainageStatus(
        'Heavy rain risk detected for your zone. Avoid low-lying routes, use raised roads, and monitor PMD radar every 30 minutes.',
      )
      return
    }
    setSmartDrainageStatus('No high-severity rain blockage signal right now. Keep monitoring PMD updates.')
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

  const loadPmdLive = useCallback(async () => {
    setIsLoadingPmdLive(true)
    setPmdLiveError(null)
    try {
      const latest = await fetchPmdLiveSnapshot()
      setPmdLiveSnapshot(latest)
      localStorage.setItem('r360-pmd-live', JSON.stringify(latest))
    } catch {
      setPmdLiveError('PMD live weather/radar snapshot is temporarily unavailable. Showing last cached snapshot if available.')
    } finally {
      setIsLoadingPmdLive(false)
    }
  }, [])

  const loadGlobalEarthquakes = useCallback(async () => {
    setIsLoadingGlobalEarthquakes(true)
    setGlobalEarthquakeError(null)
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 16000)

    try {
      const fetchLiveFeed = async (feedUrl: string) => {
        const separator = feedUrl.includes('?') ? '&' : '?'
        const cacheBustedUrl = `${feedUrl}${separator}_ts=${Date.now()}`
        const response = await fetch(cacheBustedUrl, {
          signal: controller.signal,
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        })

        if (!response.ok) {
          throw new Error(`Live earthquake feed request failed with status ${response.status}.`)
        }

        return (await response.json()) as {
          features?: Array<{
            id?: string
            properties?: {
              mag?: number | null
              place?: string
              time?: number
              url?: string
            }
            geometry?: {
              coordinates?: number[]
            }
          }>
        }
      }

      const targets = [
        ...buildApiTargets('/api/global-earthquakes'),
        GLOBAL_EARTHQUAKE_FEED_URL,
        GLOBAL_EARTHQUAKE_FEED_URL_BACKUP,
        `${GLOBAL_EARTHQUAKE_PROXY_PREFIX}${encodeURIComponent(GLOBAL_EARTHQUAKE_FEED_URL)}`,
        `${GLOBAL_EARTHQUAKE_PROXY_PREFIX}${encodeURIComponent(GLOBAL_EARTHQUAKE_FEED_URL_BACKUP)}`,
      ]

      let payload: {
        features?: Array<{
          id?: string
          properties?: {
            mag?: number | null
            place?: string
            time?: number
            url?: string
          }
          geometry?: {
            coordinates?: number[]
          }
        }>
      } | null = null

      for (const target of [...new Set(targets)]) {
        try {
          const candidate = await fetchLiveFeed(target)
          if ((candidate.features?.length ?? 0) > 0) {
            payload = candidate
            break
          }
        } catch {
          // try next target
        }
      }

      if (!payload) {
        throw new Error('No live earthquake targets responded with data.')
      }

      const latest = (payload.features ?? [])
        .sort((a, b) => Number(b.properties?.time ?? 0) - Number(a.properties?.time ?? 0))
        .slice(0, 30)
        .map((feature, index) => {
          const coords = feature.geometry?.coordinates ?? []
          const lng = Number(coords[0] ?? 0)
          const lat = Number(coords[1] ?? 0)
          const depthKm = Number(coords[2] ?? 0)
          const magnitude = Number(feature.properties?.mag ?? 0)
          return {
            id: String(feature.id ?? `eq-${index}`),
            magnitude,
            place: String(feature.properties?.place ?? 'Unknown location'),
            time: new Date(Number(feature.properties?.time ?? Date.now())).toISOString(),
            depthKm,
            lat,
            lng,
            url: String(feature.properties?.url ?? 'https://earthquake.usgs.gov/earthquakes/'),
          }
        })
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))

      const syncedAt = new Date().toISOString()
      setGlobalEarthquakesSyncedAt(syncedAt)

      setGlobalEarthquakes(latest)
      localStorage.setItem('r360-global-earthquakes', JSON.stringify(latest))
      localStorage.setItem('r360-global-earthquakes-synced-at', syncedAt)

      if (latest.length > 0) {
        const stillExists = latest.some((item) => item.id === selectedGlobalEarthquakeId)
        setSelectedGlobalEarthquakeId(stillExists ? selectedGlobalEarthquakeId : latest[0].id)
        setShowGlobalEarthquakesOnMap(true)
        setGlobalEarthquakeMapFocusToken((value) => value + 1)
      }
    } catch {
      setGlobalEarthquakeError('Global live earthquake feed is temporarily unavailable. Showing last cached updates if available.')
    } finally {
      window.clearTimeout(timer)
      setIsLoadingGlobalEarthquakes(false)
    }
  }, [])

  useEffect(() => {
    if (activeSection !== 'warning' && activeSection !== 'riskMaps') return
    if (alertLog.length === 0) {
      void loadLiveAlerts()
    }
  }, [activeSection, alertLog.length, loadLiveAlerts])

  useEffect(() => {
    if (activeSection !== 'warning') return
    if (!pmdLiveSnapshot) {
      void loadPmdLive()
    }

    const timer = window.setInterval(() => {
      void loadPmdLive()
    }, 180000)

    return () => window.clearInterval(timer)
  }, [activeSection, loadPmdLive, pmdLiveSnapshot])

  useEffect(() => {
    if (activeSection !== 'riskMaps') return
    if (globalEarthquakes.length === 0) {
      void loadGlobalEarthquakes()
    }

    const timer = window.setInterval(() => {
      void loadGlobalEarthquakes()
    }, 180000)

    return () => window.clearInterval(timer)
  }, [activeSection, globalEarthquakes.length, loadGlobalEarthquakes])

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
          <div className="inline-controls best-practices-controls">
            <label className="best-practices-label">
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
              <details key={`${practice.title}-${practice.region}`} className="best-practice-item">
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
                  className="best-practice-action"
                  onClick={() => {
                    setApplyHazard(bestPracticeHazard)
                    navigateToSection('applyRegion')
                  }}
                >
                  📍 Construct in my Region
                </button>
              </details>
            )
          })}

          {bestPracticeVisibleCount < globalPracticeLibrary[bestPracticeHazard].length && (
            <button className="best-practices-load-more" onClick={() => setBestPracticeVisibleCount((value) => value + 2)}>
              ➕ Load More Global Practices
            </button>
          )}
        </div>
      )
    }

    if (activeSection === 'riskMaps') {
      return (
        <div className="panel section-panel section-risk-maps risk-zone-dashboard">
          <h2 className="risk-zone-title">
            {t.sections.riskMaps}
            <span>Explore &amp; Analyze Hazard Risk Across Pakistan</span>
          </h2>
          <div className="context-split-layout risk-zone-top-grid">
            <aside className="context-left-panel risk-zone-summary-card">
              <h3>Selection Summary</h3>
              <p>
                <strong>Province:</strong> {selectedProvince}
              </p>
              <p>
                <strong>District:</strong> {selectedDistrict ?? 'All districts'}
              </p>
              <p>
                <strong>Layer:</strong> {mapLayer === 'infraRisk' ? 'Infrastructure Risk' : mapLayer}
              </p>
              <p>
                <strong>Selected Risk:</strong> {riskValue}
              </p>
            </aside>
            <div className="context-main-panel">
              <div className="inline-controls risk-primary-controls">
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
            </div>
          </div>
          <div className="inline-controls risk-action-controls">
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
                type="checkbox"
                checked={showGlobalEarthquakesOnMap}
                onChange={(event) => setShowGlobalEarthquakesOnMap(event.target.checked)}
              />{' '}
              Show global live earthquake dots
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
          <div className="alerts risk-progress-panel">
            <p>
              Loading progress: <strong>{riskActionProgress}%</strong>
            </p>
            <progress value={riskActionProgress} max={100} />
          </div>
          <div className="map-fullscreen-actions">
            <button
              type="button"
              className="map-fullscreen-launch"
              onClick={() => {
                const fullscreenMapUrl = `${import.meta.env.BASE_URL}pakistan-risk-map-fullscreen.html#autofs=1`
                window.open(fullscreenMapUrl, '_blank', 'noopener,noreferrer')
              }}
            >
              🗺️ Fullscreen Pakistan Risk Map
            </button>
          </div>
          <RiskMap
            layer={mapLayer}
            selectedProvince={selectedProvince}
            selectedDistrict={selectedDistrict}
            riskByProvince={provinceRisk}
            districtRiskLookup={districtRiskLookup}
            alertMarkers={filteredHazardAlerts}
            globalEarthquakeMarkers={globalEarthquakes}
            historicalDisasterEvents={pakistanHistoricalDisasterEvents}
            showGlobalEarthquakeMarkers={showGlobalEarthquakesOnMap}
            globalEarthquakeFocusToken={globalEarthquakeMapFocusToken}
            userLocationMarker={detectedUserLocation}
            colorblindFriendly={colorblindFriendlyMap}
            onSelectProvince={setSelectedProvince}
            onSelectDistrict={setSelectedDistrict}
          />
          <div className="risk-source-strip">
            <p>Boundary Layer • Global Seismic Risk (ADM1 + ADM2) • Pakistan • {selectedProvince}{selectedDistrict ? ` • ${selectedDistrict}` : ''}</p>
            <p>
              Selected Risk Level: <strong>{riskValue}</strong>
            </p>
          </div>

          <div className="risk-insights-grid">
            <div className="retrofit-model-output risk-card risk-climate-card">
              <h3>
                <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('riskFloodClimateExplorer')} aria-expanded={expandedPanels.riskFloodClimateExplorer}>
                  <span>🌦️ Flood &amp; Climate Risk Explorer</span>
                  <span>{expandedPanels.riskFloodClimateExplorer ? '▾' : '▸'}</span>
                </button>
              </h3>
              {expandedPanels.riskFloodClimateExplorer && (
                <>
                  <div className="inline-controls">
                    <label>
                      Enter Location
                      <input
                        value={climateLocationInput}
                        onChange={(event) => setClimateLocationInput(event.target.value)}
                        placeholder="City / Area"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        void loadLiveClimateByCity(climateLocationInput)
                      }}
                      disabled={isLoadingLiveClimate}
                    >
                      {isLoadingLiveClimate ? 'Applying...' : 'Apply Location'}
                    </button>
                  </div>
                  {liveClimateError && <p>{liveClimateError}</p>}
                  {liveClimateSnapshot && (
                    <p>
                      Live source: <strong>{liveClimateSnapshot.source}</strong> • Updated:{' '}
                      <strong>{new Date(liveClimateSnapshot.updatedAt).toLocaleString()}</strong>
                    </p>
                  )}
                  <p>
                    Risk Score: <strong>{displayedClimateRiskScore}/100</strong>
                  </p>
                  <p>
                    Heatwave Risk Zone: <strong>{displayedHeatwaveRiskZone}</strong>
                  </p>
                  <p>
                    Air Quality Level: <strong>{displayedAirQualityLevel}</strong>
                  </p>
                  {liveClimateSnapshot && (
                    <p>
                      Temperature / Feels Like: <strong>{liveClimateSnapshot.metrics.temperatureC.toFixed(1)}°C / {liveClimateSnapshot.metrics.apparentTemperatureC.toFixed(1)}°C</strong>{' '}
                      • Rain Chance: <strong>{Math.round(liveClimateSnapshot.metrics.precipitationProbability)}%</strong> • AQI:{' '}
                      <strong>{Math.round(liveClimateSnapshot.metrics.usAqi)}</strong>
                    </p>
                  )}
                  <p>
                    Safe Shelters Nearby: <strong>{nearbyShelters.length || 'No mapped shelter in current district'}</strong>
                  </p>
                  {nearbyShelters.length > 0 && (
                    <ul>
                      {nearbyShelters.slice(0, 3).map((asset) => (
                        <li key={asset.name}>{asset.name}</li>
                      ))}
                    </ul>
                  )}
                  <h4>Precautions</h4>
                  <ul>
                    {displayedClimatePrecautions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <h4>Emergency Contacts</h4>
                  <ul>
                    {selectedDistrictContacts.map((contact) => (
                      <li key={contact}>{contact}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="risk-side-stack">
              <div className="global-earthquake-panel global-earthquake-alerts-card risk-card risk-earthquake-card">
                <div className="global-earthquake-alerts-head">
                  <h3>🌍 Live Earthquake Alerts</h3>
                </div>
                <button
                  type="button"
                  className="global-earthquake-launch-btn"
                  onClick={() => {
                    const liveAlertsUrl = `${import.meta.env.BASE_URL}live-earthquake-alerts.html`
                    window.open(liveAlertsUrl, '_blank', 'noopener,noreferrer')
                  }}
                >
                  View Live Earthquake Alerts
                </button>
              </div>

              <div className="retrofit-model-output risk-card risk-chatbot-card">
                <h3>
                  <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('riskLocalAdvisoryChatbot')} aria-expanded={expandedPanels.riskLocalAdvisoryChatbot}>
                    <span>Local Advisory Chatbot</span>
                    <span>{expandedPanels.riskLocalAdvisoryChatbot ? '▾' : '▸'}</span>
                  </button>
                </h3>
                {expandedPanels.riskLocalAdvisoryChatbot && (
                  <>
                    <p>Ask for district-level action advice, retrofit priorities, or hazard-specific guidance.</p>
                    <div className="inline-controls">
                      <input
                        type="text"
                        value={advisoryQuestion}
                        onChange={(event) => setAdvisoryQuestion(event.target.value)}
                        placeholder="e.g., What should schools in this district do before monsoon?"
                      />
                      <button onClick={() => { void sendLocalAdvisoryQuestion() }} disabled={isAskingAdvisory}>
                        {isAskingAdvisory ? '💬 Thinking...' : '💬 Ask'}
                      </button>
                    </div>
                    {advisoryError && <p>{advisoryError}</p>}
                    {advisoryMessages.length > 0 && (
                      <div>
                        {advisoryMessages.slice(-6).map((message, idx) => (
                          <p key={`${message.role}-${idx}`}>
                            <strong>{message.role === 'user' ? 'You' : 'Advisor'}:</strong> {message.text}
                          </p>
                        ))}
                        <div className="inline-controls">
                          <button onClick={downloadLatestAdvisoryAnswerPdf}>📄 Download Latest Answer (PDF)</button>
                          <button onClick={() => { void copyLatestAdvisoryAnswer() }}>📋 Copy Answer</button>
                        </div>
                        {advisoryCopyMsg && <p>{advisoryCopyMsg}</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          {selectedDistrict && (
            <div className="retrofit-model-output risk-card">
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

          <div className="retrofit-model-output risk-card">
            <h3>
              <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('riskBuildBetterMaterialsGuide')} aria-expanded={expandedPanels.riskBuildBetterMaterialsGuide}>
                <span>🧱 Build Better: Local Materials Guide</span>
                <span>{expandedPanels.riskBuildBetterMaterialsGuide ? '▾' : '▸'}</span>
              </button>
            </h3>
            {expandedPanels.riskBuildBetterMaterialsGuide && (
              <>
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
              </>
            )}
          </div>

          <div className="retrofit-model-output risk-card">
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

          <p>Recommendation: Prioritize retrofitting and emergency evacuation planning for high-risk districts.</p>
        </div>
      )
    }

    if (activeSection === 'designToolkit') {
      const materialSafetyLabel = materialSuitability.flags.length >= 3 ? 'Moderate' : materialSuitability.flags.length >= 1 ? 'Good' : 'Excellent'
      const windStatusLabel = coastalCities.has(designCity) ? 'Moderate' : 'Good'
      const slopeStatusLabel = slopeEstimator.stabilityClass === 'High Risk' ? 'Moderate' : slopeEstimator.stabilityClass === 'Moderate Risk' ? 'Good' : 'Excellent'
      const overallReadinessScore = Math.max(
        42,
        Math.min(
          96,
          Math.round(
            92 -
              designHazardOverlay.seismicZone * 3.2 -
              designHazardOverlay.floodDepth100y * 4.5 -
              (designHazardOverlay.liquefaction === 'High' ? 10 : designHazardOverlay.liquefaction === 'Medium' ? 5 : 1) -
              materialSuitability.flags.length * 3.4 -
              (slopeEstimator.stabilityClass === 'High Risk' ? 8 : slopeEstimator.stabilityClass === 'Moderate Risk' ? 4 : 1),
          ),
        ),
      )
      const scoreSweep = Math.max(32, Math.min(180, Math.round((overallReadinessScore / 100) * 180)))

      return (
        <div className="panel section-panel section-design-toolkit section-infra-models">
          <div className="design-toolkit-heading">
            <h2>{t.sections.designToolkit}</h2>
            <p>Smart resilience planning for your region.</p>
          </div>

          <div className="inline-controls design-toolkit-filters">
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

          <div className="design-toolkit-summary-strip">
            <p>
              Seismic Zone <strong>{designHazardOverlay.seismicZone}/5</strong>
            </p>
            <p>
              Flood Depth (1-in-100y) <strong>{designHazardOverlay.floodDepth100y.toFixed(1)} m</strong>
            </p>
            <p>
              Liquefaction Risk <strong>{designHazardOverlay.liquefaction}</strong>
            </p>
            <p>
              Wind Exposure <strong>{coastalCities.has(designCity) ? 'Coastal High' : 'Inland Moderate'}</strong>
            </p>
          </div>

          <div className="design-toolkit-grid">
            <div className="design-toolkit-column">
              <div className="retrofit-model-output design-toolkit-card">
                <h3>🧱 Recommended Material</h3>
                <p>
                  <strong>{materialSuitability.recommendations[0] ?? materialSuitability.recommendations.join(' | ')}</strong>
                </p>
                <p>Soil Condition: {designSoilType}</p>
                <p>
                  Risk Suitability: <strong>{materialSafetyLabel}</strong>
                </p>
                {materialSuitability.flags.length > 0 && (
                  <ul>
                    {materialSuitability.flags.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="retrofit-model-output design-toolkit-card">
                <h3>
                  <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('designSafeShelterCapacityPlanner')} aria-expanded={expandedPanels.designSafeShelterCapacityPlanner}>
                    <span>💡 Safe Shelter Capacity Planner</span>
                    <span>{expandedPanels.designSafeShelterCapacityPlanner ? '▾' : '▸'}</span>
                  </button>
                </h3>
                {expandedPanels.designSafeShelterCapacityPlanner && (
                  <>
                    <div className="inline-controls design-toolkit-compact-controls">
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
                    <p>
                      Space Per Person: <strong>{shelterCapacityPlan.areaPerPerson.toFixed(1)} sqm</strong>
                    </p>
                    <ul>
                      {shelterCapacityPlan.layout.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className="retrofit-model-output design-toolkit-card">
                <h3>
                  <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('designRecommendedFoundation')} aria-expanded={expandedPanels.designRecommendedFoundation}>
                    <span>🔩 Recommended Foundation</span>
                    <span>{expandedPanels.designRecommendedFoundation ? '▾' : '▸'}</span>
                  </button>
                </h3>
                {expandedPanels.designRecommendedFoundation && (
                  <>
                    <p>
                      <strong>{foundationRecommendation.type}</strong>
                    </p>
                    <ul>
                      {foundationRecommendation.risks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className="retrofit-model-output design-toolkit-card">
                <h3>
                  <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('windStormGuide')} aria-expanded={expandedPanels.windStormGuide}>
                    <span>📐 Wind and Storm Resistance Guide</span>
                    <span>{expandedPanels.windStormGuide ? '▾' : '▸'}</span>
                  </button>
                </h3>
                {expandedPanels.windStormGuide && (
                  <>
                    <ul>
                      <li>
                        Roof Angle: <strong>{windStormGuide.roofAngle}</strong>
                      </li>
                      <li>
                        Openings: <strong>{windStormGuide.openings}</strong>
                      </li>
                      <li>
                        Tie Beams: <strong>{windStormGuide.tieBeams}</strong>
                      </li>
                    </ul>
                    <p>{windStormGuide.note}</p>
                  </>
                )}
              </div>

              <div className="retrofit-model-output design-toolkit-card">
                <h3>
                  <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('fieldImplementationChecklist')} aria-expanded={expandedPanels.fieldImplementationChecklist}>
                    <span>🚪 Field Implementation Checklist</span>
                    <span>{expandedPanels.fieldImplementationChecklist ? '▾' : '▸'}</span>
                  </button>
                </h3>
                {expandedPanels.fieldImplementationChecklist && (
                  <ul>
                    {nonStructuralChecklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="design-toolkit-column">
              <div className="retrofit-model-output design-toolkit-card design-toolkit-score-card">
                <h3>
                  <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('overallStructuralResilience')} aria-expanded={expandedPanels.overallStructuralResilience}>
                    <span>Overall Structural Resilience</span>
                    <span>{expandedPanels.overallStructuralResilience ? '▾' : '▸'}</span>
                  </button>
                </h3>
                {expandedPanels.overallStructuralResilience && (
                  <>
                    <div className="design-toolkit-gauge-wrap">
                      <div
                        className="design-toolkit-gauge"
                        style={{
                          background: `conic-gradient(from 180deg, #2ed7f6 0deg, #30df8e ${scoreSweep * 0.5}deg, #f6d54a ${(scoreSweep * 0.72).toFixed(1)}deg, #ff9058 ${(scoreSweep * 0.88).toFixed(1)}deg, #ea4f76 ${scoreSweep}deg, rgba(54, 86, 118, 0.26) ${scoreSweep}deg 360deg)`,
                        }}
                      >
                        <div className="design-toolkit-gauge-core">
                          <strong>{overallReadinessScore}</strong>
                          <span>/100</span>
                        </div>
                      </div>
                    </div>
                    <p className="design-toolkit-score-label">Overall Readiness Score</p>
                    <div className="design-toolkit-status-list">
                      <p>
                        Material Safety <strong>{materialSafetyLabel}</strong>
                      </p>
                      <p>
                        Slope Stability <strong>{slopeStatusLabel}</strong>
                      </p>
                      <p>
                        Wind Resistance <strong>{windStatusLabel}</strong>
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="retrofit-model-output design-toolkit-card">
                <h3>
                  <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('slopeStabilityEstimator')} aria-expanded={expandedPanels.slopeStabilityEstimator}>
                    <span>📏 Slope Stability & Retaining Wall Estimator</span>
                    <span>{expandedPanels.slopeStabilityEstimator ? '▾' : '▸'}</span>
                  </button>
                </h3>
                {expandedPanels.slopeStabilityEstimator && (
                  <>
                    <div className="inline-controls design-toolkit-compact-controls">
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
                  </>
                )}
              </div>

              <div className="retrofit-model-output design-toolkit-card">
                <h3>
                  <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('designKitCostEstimator')} aria-expanded={expandedPanels.designKitCostEstimator}>
                    <span>📦 Resilient Design Kit Cost Estimator</span>
                    <span>{expandedPanels.designKitCostEstimator ? '▾' : '▸'}</span>
                  </button>
                </h3>
                {expandedPanels.designKitCostEstimator && (
                  <>
                    <div className="inline-controls design-toolkit-compact-controls">
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
                    <div className="retrofit-insights-grid design-toolkit-cost-grid">
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

                    <div className="inline-controls design-toolkit-actions">
                      <button onClick={handleEstimateTotalUpgradeCost}>📦 Estimate My Total Upgrade Cost</button>
                      <button onClick={downloadConstructionDrawings}>🧰 Download Construction Drawings</button>
                      <button onClick={generateFieldImplementationChecklist}>📋 Generate Field Implementation Checklist</button>
                      <button onClick={() => void shareDesignWithCommunity()}>🌍 Share Design with Community</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {designSummaryText && <p className="design-toolkit-summary-text">{designSummaryText}</p>}

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
            <strong>{preloadedInfraModels.length}</strong> Pakistan-focused resilience models are preloaded below. <strong>{Math.max(0, infraModels.length - preloadedInfraModels.length)}</strong> generated models are saved in this app and will appear automatically next time.
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
                  <source src={infraLayoutPlaybackSrc || infraLayoutVideoSrc} type="video/mp4" />
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
          {isLoadingSharedInfraModels && <p>Loading shared generated infra models from server...</p>}
          {infraModelsSyncMessage && <p>{infraModelsSyncMessage}</p>}

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
            <div className="infra-models-viewer">
              <aside className="infra-models-name-list" role="list" aria-label="Infra model names">
                {infraModels.map((model) => {
                  const isActive = selectedInfraModelId === model.id

                  return (
                    <button
                      key={model.id}
                      type="button"
                      role="listitem"
                      className={`infra-model-name-btn ${isActive ? 'is-active' : ''}`}
                      onClick={() => setSelectedInfraModelId(model.id)}
                    >
                      <span className="infra-model-card-head">
                        <span className="infra-model-card-icon" aria-hidden="true">
                          {getInfraModelCardIcon(model)}
                        </span>
                        <span className="infra-model-card-title">{model.title}</span>
                      </span>
                      <span className="infra-model-card-points">
                        <span>✔ {model.features[0] ?? model.description}</span>
                        <span>✔ {model.features[1] ?? model.advantagesPakistan[0] ?? 'Pakistan-adaptable design'}</span>
                      </span>
                    </button>
                  )
                })}
              </aside>

              {selectedInfraModel ? (
                <article key={selectedInfraModel.id} className="infra-model-detail-card">
                  <header className="infra-model-detail-head">
                    <p>Model Name</p>
                    <h3>{selectedInfraModel.title}</h3>
                  </header>
                  <p className="infra-model-detail-description">{selectedInfraModel.description}</p>
                  <img src={selectedInfraModel.imageDataUrl} alt={`${selectedInfraModel.title} AI visual`} className="retrofit-preview infra-model-preview-image" />
                  <div className="infra-model-insights-grid">
                    <section className="infra-model-insight-card">
                      <h4>Key Features</h4>
                      <ul>
                        {selectedInfraModel.features.map((item) => (
                          <li key={item}>✔ {item}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="infra-model-insight-card">
                      <h4>Benefits for Pakistan</h4>
                      <ul>
                        {selectedInfraModel.advantagesPakistan.map((item) => (
                          <li key={item}>✔ {item}</li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </article>
              ) : (
                <div className="retrofit-model-output infra-model-selection-hint">
                  <p>Select a model to preview its image and resilience details.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    if (activeSection === 'applyRegion') {
      return (
        <div className="panel section-panel section-apply-region">
          <header className="apply-region-head">
            <h2 className="apply-region-title">
              Construct in my Region —
              <span>{applyBestPracticeTitle}</span>
            </h2>
            <div className="apply-region-meta-pills" aria-label="Selected area and hazard">
              <span>📍 {applyCity}, {applyProvince}</span>
              <span>💧 {applyHazard}</span>
            </div>
          </header>

          <div className="apply-region-shell">
            <section className="apply-region-summary-card" aria-label="Selection Summary">
              <div className="apply-region-card-head">
                <h3>🧾 Selection Summary</h3>
                <p>Adjust your location and best-practice package before generating guidance.</p>
              </div>
              <div className="apply-region-summary-grid">
                <div className="apply-region-summary-copy">
                  <p>
                    <strong>Best Practice (Construct in my Region):</strong>
                  </p>
                  <p className="apply-region-practice-name">{applyBestPracticeTitle}</p>
                  <p>
                    📍 <strong>Area:</strong> {applyCity}, {applyProvince}
                  </p>
                  <p>
                    💧 <strong>Hazard:</strong> {applyHazard}
                  </p>
                </div>

                <div className="apply-region-controls-grid">
                  <div className="apply-region-control">
                    <label htmlFor="apply-region-province">Province</label>
                    <select
                      id="apply-region-province"
                      aria-label="Province"
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
                  </div>
                  <div className="apply-region-control">
                    <label htmlFor="apply-region-city">City</label>
                    <select id="apply-region-city" aria-label="City" value={applyCity} onChange={(event) => setApplyCity(event.target.value)}>
                      {availableApplyCities.map((city) => (
                        <option key={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div className="apply-region-control apply-region-control-wide">
                    <label htmlFor="apply-region-practice">Best Practice</label>
                    <select id="apply-region-practice" aria-label="Best Practice" value={applyBestPracticeTitle} onChange={(event) => handleApplyBestPracticeChange(event.target.value)}>
                      {availableApplyBestPractices.map((item) => (
                        <option key={item.title} value={item.title}>{item.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className="apply-region-live-card" aria-label="Live location">
                <div className="apply-region-card-head">
                <h3>📍 Live Location for Auto-Fill</h3>
                <p>Use GPS to auto-populate area context and hazard focus.</p>
                </div>
                <button className="apply-region-refresh-btn" onClick={requestCurrentUserLocation} disabled={isDetectingLocation}>
                  {isDetectingLocation ? '🔄 Detecting Live Location...' : '🔁 Refresh Live Location'}
                </button>
                {locationAccessMsg && <p className="apply-region-location-msg">{locationAccessMsg}</p>}
                {detectedUserLocation && (
                  <>
                    <p className="apply-region-location-msg">
                      Auto-filled from live location: <strong>{applyCity}, {applyProvince}</strong> | Hazard Focus: <strong>{applyHazard}</strong>
                    </p>
                    <UserLocationMiniMap location={detectedUserLocation} />
                  </>
                )}
                <p className="apply-region-inspection-note">
                  Professional Inspection advice: <strong>Strongly recommended</strong>
                </p>
            </section>

            <div className="apply-region-or-divider" aria-hidden="true">
              <span>OR</span>
            </div>

            <div className="apply-region-guidance-actions">
                <button className="apply-region-guidance-btn" onClick={() => { void generateApplyAreaGuidance('english') }} disabled={isGeneratingGuidance}>
                  <span className="apply-region-guidance-btn-main">📖 Construction Guidance in English</span>
                  <span className="apply-region-guidance-btn-sub">
                    {isGeneratingGuidance && guidanceGenerationLanguage === 'english'
                      ? 'Generating English guidance + images...'
                      : 'Generate practical steps, materials, and safety checks'}
                  </span>
                </button>
                <button className="apply-region-guidance-btn" onClick={() => { void generateApplyAreaGuidance('urdu') }} disabled={isGeneratingGuidance}>
                  <span className="apply-region-guidance-btn-main">📖 تعمیراتی ہدایات</span>
                  <span className="apply-region-guidance-btn-sub">
                    {isGeneratingGuidance && guidanceGenerationLanguage === 'urdu'
                      ? 'اردو رہنمائی اور تصاویر تیار کی جا رہی ہیں...'
                      : 'مقامی تعمیراتی مراحل، مواد اور حفاظتی نکات'}
                  </span>
                </button>
            </div>

            {guidanceError && <p>{guidanceError}</p>}

            {constructionGuidance && (
                <div className="retrofit-model-output apply-region-guidance-output">
                  {guidanceGenerationLanguage === 'english' ? (
                    <>
                      <h3>Location-Tailored Construction Guidance in English — {applyBestPracticeTitle}</h3>
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
                    </>
                  ) : (
                    <>
                      <h3>تعمیراتی رہنمائی (اردو) — {applyBestPracticeTitle}</h3>
                      <p>
                        <strong>علاقہ:</strong> {applyCity}, {applyProvince} | <strong>خطرہ:</strong> {applyHazard}
                      </p>
                      <p>{constructionGuidance.summaryUrdu}</p>

                      <h3>تجویز کردہ مواد</h3>
                      <ul>
                        {constructionGuidance.materialsUrdu.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>

                      <h3>حفاظتی ہدایات</h3>
                      <ul>
                        {constructionGuidance.safetyUrdu.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>

                      <h3>عمل درآمد کے مراحل</h3>
                      <div className="retrofit-defect-list">
                        {constructionGuidance.stepsUrdu.map((step, index) => {
                          const image = guidanceStepImages[index]
                          return (
                            <article key={`${step.title}-${index}-urdu`} className="retrofit-defect-card">
                              <h4>
                                مرحلہ {index + 1}: {step.title}
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
                    </>
                  )}
                  <div className="inline-controls">
                    <button onClick={() => { void downloadApplyGuidanceWordReport('english') }} disabled={isPreparingWordReport}>
                      {isPreparingWordReport && wordReportLanguage === 'english'
                        ? '📄 Preparing AI Images for English Word Report...'
                        : '📄 Download English Guidance Report (Word)'}
                    </button>
                    <button onClick={() => { void downloadApplyGuidanceWordReport('urdu') }} disabled={isPreparingWordReport}>
                      {isPreparingWordReport && wordReportLanguage === 'urdu'
                        ? '📄 اردو ورڈ رپورٹ کے لیے AI تصاویر تیار کی جا رہی ہیں...'
                        : '📄 اردو رہنمائی رپورٹ ڈاؤن لوڈ کریں (Word)'}
                    </button>
                  </div>
                  {isGeneratingStepImages && <p>Generating AI stepwise construction images...</p>}
                </div>
              )}
          </div>
        </div>
      )
    }

    if (activeSection === 'readiness') {
      return (
        <div className="panel section-panel section-readiness">
          <h2>{t.sections.readiness}</h2>
          <div className="readiness-layout">
            <aside className="readiness-sidebar">
              <section className="readiness-card readiness-summary-card">
                <h3>Readiness Summary</h3>
                <div className="readiness-gauge-shell" aria-label={`Readiness score ${readinessScore} out of 100`}>
                  <div className="readiness-gauge-track">
                    <span className="readiness-gauge-pointer" style={{ transform: `translateX(-50%) rotate(${readinessGaugeAngle - 90}deg)` }} />
                    <div className="readiness-gauge-hole" />
                  </div>
                  <p className="readiness-gauge-score">
                    {readinessScore}
                    <span>/100</span>
                  </p>
                  <p className="readiness-gauge-label">{readinessRiskLabel}</p>
                </div>
                <p className="readiness-recommendation">
                  Custom Recommendation: Secure and add plinth freeboard, tie beams, and emergency response drills.
                </p>
              </section>

              <section className="readiness-card">
                <h3>Building Type</h3>
                <label>
                  Building Type
                  <select value={buildingType} onChange={(event) => setBuildingType(event.target.value)}>
                    <option>Residential</option>
                    <option>Commercial</option>
                    <option>Critical Infrastructure</option>
                  </select>
                </label>
                <p className="readiness-meta">Location: {locationText}</p>
              </section>

              <section className="readiness-card">
                <h3>Lifeline Presence</h3>
                <label>
                  Lifeline Presence
                  <select value={lifeline} onChange={(event) => setLifeline(event.target.value)}>
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </label>
              </section>

              <section className="readiness-card">
                <h3>
                  <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('selfAssessment')} aria-expanded={expandedPanels.selfAssessment}>
                    <span>Is My Building Safe? Self-Assessment</span>
                    <span>{expandedPanels.selfAssessment ? '▾' : '▸'}</span>
                  </button>
                </h3>
                {expandedPanels.selfAssessment && (
                  <>
                    <label>
                      Year Built
                      <input
                        type="number"
                        min={1950}
                        max={new Date().getFullYear()}
                        value={selfAssessmentYearBuilt}
                        onChange={(event) => setSelfAssessmentYearBuilt(Number(event.target.value) || 2000)}
                      />
                    </label>
                    <label>
                      Construction Type
                      <select value={selfAssessmentConstruction} onChange={(event) => setSelfAssessmentConstruction(event.target.value)}>
                        <option>Reinforced Concrete</option>
                        <option>Steel Frame</option>
                        <option>Unreinforced Masonry</option>
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
                    <div className="readiness-advanced-grid">
                      <label>
                        Nearby Drainage
                        <select
                          value={selfAssessmentDrainage}
                          onChange={(event) => setSelfAssessmentDrainage(event.target.value as 'Good' | 'Average' | 'Poor')}
                        >
                          <option>Good</option>
                          <option>Average</option>
                          <option>Poor</option>
                        </select>
                      </label>
                      <label>
                        Seismic Zone
                        <select
                          value={selfAssessmentSeismicZone}
                          onChange={(event) => setSelfAssessmentSeismicZone(event.target.value as 'Low' | 'Medium' | 'High')}
                        >
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                        </select>
                      </label>
                      <label>
                        Foundation
                        <select
                          value={selfAssessmentFoundation}
                          onChange={(event) =>
                            setSelfAssessmentFoundation(event.target.value as 'Isolated Footing' | 'Raft' | 'Stone Masonry' | 'Unknown')
                          }
                        >
                          <option>Isolated Footing</option>
                          <option>Raft</option>
                          <option>Stone Masonry</option>
                          <option>Unknown</option>
                        </select>
                      </label>
                    </div>
                    <div className="readiness-checklist">
                      <span>✓ Seismic Zone: {selfAssessmentSeismicZone}</span>
                      <span>✓ {selfAssessmentFoundation}</span>
                    </div>
                    <p className="readiness-assessment-note">
                      Structural Safety Rating: <strong>{buildingSafetyAssessment.rating}</strong> ({buildingSafetyAssessment.score}/100)
                    </p>
                  </>
                )}
              </section>
            </aside>

            <section className="readiness-main-content">
              <article className="readiness-card readiness-image-card">
                <h3>ELEVATED FLOOD-RESILIENT HOUSING CLUSTER</h3>
                <img src={readinessFloodHousingImage} alt="Elevated flood-resilient housing cluster" />
              </article>

              <article className="readiness-card readiness-features-card">
                <h3>Key Features</h3>
                <ul>
                  <li>Elevated housing 1.5m (5ft) above flooding</li>
                  <li>Self-sufficient with rainwater harvesting, raised borewell, and kitchen garden.</li>
                </ul>
              </article>

              <article className="readiness-card readiness-reporting-card">
                <h3>Community Infrastructure Issue Reporting</h3>
                <div className="readiness-reporting-grid">
                  <label>
                    Issue Category
                    <select
                      value={communityIssueCategory}
                      onChange={(event) => setCommunityIssueCategory(event.target.value as CommunityIssueCategory)}
                    >
                      {communityIssueCategories.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setCommunityIssuePhoto(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <label className="readiness-reporting-note">
                    Describe Issue
                    <input
                      value={communityIssueNotes}
                      onChange={(event) => setCommunityIssueNotes(event.target.value)}
                      placeholder="Describe issue"
                    />
                  </label>
                </div>

                <div className="readiness-gps-row">
                  <span>
                    GPS Location:{' '}
                    {autoCaptureGpsOnSubmit
                      ? detectedUserLocation
                        ? `${detectedUserLocation.lat.toFixed(4)}, ${detectedUserLocation.lng.toFixed(4)}`
                        : 'Auto-capture on submit'
                      : 'Disabled'}
                  </span>
                  <label className="readiness-switch" aria-label="Toggle GPS auto-capture">
                    <input
                      type="checkbox"
                      checked={autoCaptureGpsOnSubmit}
                      onChange={(event) => setAutoCaptureGpsOnSubmit(event.target.checked)}
                    />
                    <span />
                  </label>
                </div>

                <div className="readiness-actions-row">
                  <button onClick={() => void submitCommunityIssueReport()} disabled={isSubmittingCommunityIssue}>
                    {isSubmittingCommunityIssue ? 'Submitting...' : 'Submit Issue'}
                  </button>
                  <button onClick={() => void loadCommunityIssueReports()} disabled={isLoadingCommunityIssues}>
                    {isLoadingCommunityIssues ? 'Refreshing...' : 'Refresh Reports'}
                  </button>
                </div>

                {communityIssueReports.length > 0 && (
                  <div className="alerts">
                    {communityIssueReports.slice(0, 5).map((report) => (
                      <p key={report.id}>
                        <strong>{report.category}</strong> • {new Date(report.submittedAt).toLocaleString()} • Status:{' '}
                        <strong>{report.status}</strong>
                        {report.district ? ` • ${report.district}` : ''}
                        {report.imageUrl ? (
                          <>
                            {' '}
                            •{' '}
                            <a href={report.imageUrl} target="_blank" rel="noreferrer">
                              Photo
                            </a>
                          </>
                        ) : null}
                      </p>
                    ))}
                  </div>
                )}
              </article>

              <button className="readiness-download-btn" onClick={downloadReport}>
                Download PDF Report
              </button>
            </section>
          </div>
        </div>
      )
    }

    if (activeSection === 'retrofit') {
      return (
        <div className="panel section-panel section-retrofit">
          <div className="retrofit-title-row">
            <h2>🏠 Retrofit Guide</h2>
          </div>

          <div className="retrofit-main-card">
            <div className="inline-controls retrofit-construction-control">
              <label>
                Construction Type
                <select value={structureType} onChange={(event) => setStructureType(event.target.value)}>
                  <option>Masonry House</option>
                  <option>RC Frame</option>
                  <option>School Block</option>
                  <option>Bridge Approach</option>
                </select>
              </label>
            </div>

            <div className="retrofit-model-output retrofit-location-card">
              <h3>Location for Labor/Material Rates</h3>
              <div className="retrofit-action-row retrofit-location-actions" role="group" aria-label="Retrofit location mode">
                <button
                  type="button"
                  className="retrofit-btn retrofit-btn-primary"
                  onClick={() => {
                    setRetrofitLocationMode('auto')
                    requestCurrentUserLocation()
                  }}
                  disabled={isDetectingLocation}
                >
                  {isDetectingLocation ? '📡 Detecting Location...' : '📍 Use My Location'}
                </button>
                <button type="button" className="retrofit-btn retrofit-btn-secondary" onClick={() => setRetrofitLocationMode('manual')}>
                  📍 Enter Location Manually
                </button>
              </div>
              {retrofitLocationMode === 'manual' ? (
                <div className="inline-controls retrofit-manual-controls">
                  <label>
                    Province (Pakistan)
                    <select
                      value={retrofitManualProvince}
                      onChange={(event) => {
                        const province = event.target.value
                        setRetrofitManualProvince(province)
                        setRetrofitManualCity((pakistanCitiesByProvince[province] ?? [])[0] ?? '')
                      }}
                    >
                      {Object.keys(provinceRisk).map((province) => (
                        <option key={province}>{province}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    City / District (Pakistan)
                    <select value={retrofitManualCity} onChange={(event) => setRetrofitManualCity(event.target.value)}>
                      {availableRetrofitManualCities.map((city) => (
                        <option key={city}>{city}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <p className="retrofit-location-target">
                  Auto Location Target: <strong>{selectedProvince}</strong> / <strong>{retrofitCity || 'Nearest city'}</strong>
                  {detectedUserLocation && (
                    <>
                      {' '}
                      (GPS: {detectedUserLocation.lat.toFixed(4)}, {detectedUserLocation.lng.toFixed(4)})
                    </>
                  )}
                </p>
              )}
              {locationAccessMsg && <p className="retrofit-location-msg">{locationAccessMsg}</p>}
            </div>

            <label className="retrofit-upload-label">
              Upload Defect Photos in Series (Image 1, 2, 3...)
              <input
                ref={retrofitUploadInputRef}
                className="retrofit-upload-input"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  handleRetrofitSeriesUpload(event.target.files)
                  event.currentTarget.value = ''
                }}
              />
            </label>

            {retrofitImageSeriesFiles.length > 0 && (
              <p className="retrofit-selected-photos">
                Selected Photos: <strong>{retrofitImageSeriesFiles.length}</strong>
              </p>
            )}

            <div className="retrofit-action-row retrofit-action-row-main" role="group" aria-label="Retrofit estimate actions">
              <button
                className="retrofit-btn retrofit-btn-primary"
                onClick={() => void generateRetrofitGuidanceFromSeries()}
                disabled={isGeneratingRetrofitGuidance}
              >
                {isGeneratingRetrofitGuidance
                  ? '🔄 Analyzing Images + Generating Guidance...'
                  : '🛠️ Retrofit Guidance'}
              </button>
              <button
                className="retrofit-btn retrofit-btn-secondary"
                onClick={openRetrofitCalculatorPage}
              >
                🧮 Calculate Retrofit Estimated Cost
              </button>
            </div>
          </div>

          {isCalculatingRetrofitEstimate && (
            <p>Deep analysis in progress: inspecting each image, deriving defect severity, and generating final cost estimate.</p>
          )}
          {retrofitError && <p>{retrofitError}</p>}

          {retrofitImageSeriesPreviewUrls.length > 0 && (
            <div className="retrofit-defect-list retrofit-upload-grid">
              {retrofitImageSeriesPreviewUrls.map((preview, index) => (
                <article
                  key={`${preview}-${index}`}
                  className="retrofit-defect-card retrofit-upload-card"
                  onClick={() => retrofitUploadInputRef.current?.click()}
                >
                  <h4>Image {index + 1}</h4>
                  <div className="retrofit-preview-wrap">
                    <img src={preview} alt={`Retrofit upload ${index + 1}`} className="retrofit-preview" />
                  </div>
                  <p>
                    <strong>Click this photo to add more images</strong>
                  </p>
                </article>
              ))}
            </div>
          )}

          {retrofitImageSeriesResults.length > 0 && (
            <div className="retrofit-model-output">
              <h3>Per-Image Cost Analysis</h3>
              <div className="retrofit-defect-list">
                {retrofitImageSeriesResults.map((item, index) => (
                  <article key={item.id} className="retrofit-defect-card">
                    <h4>
                      Image {index + 1}: {item.fileName}
                    </h4>
                    <p>
                      <strong>Summary:</strong> {item.summary}
                    </p>
                    <p>
                      <strong>Defects:</strong> {item.defectCount} | <strong>Severity Score:</strong> {item.severityScore}/100
                    </p>
                    <p>
                      <strong>Affected Area:</strong> {item.affectedAreaPercent}% | <strong>Visibility:</strong> {item.visibility}
                    </p>
                    <p>
                      <strong>Estimated Cost (image):</strong> PKR {Math.round(item.estimatedCost).toLocaleString()}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {retrofitGuidanceResults.length > 0 && (
            <div className="retrofit-model-output">
              <h3>Retrofit Guidance (Image-Based)</h3>
              <div className="retrofit-defect-list">
                {retrofitGuidanceResults.map((item, index) => (
                  <article key={item.id} className="retrofit-defect-card">
                    <h4>
                      Image {index + 1}: {item.fileName}
                    </h4>
                    <p>
                      <strong>Summary:</strong> {item.summary}
                    </p>
                    <p>
                      <strong>Image Visibility:</strong> {item.visibility}
                    </p>
                    <p>
                      <strong>Safety Note:</strong> {item.safetyNote}
                    </p>
                    <h4>Recommended Guidance</h4>
                    <ul>
                      {item.recommendations.map((recommendation) => (
                        <li key={`${item.id}-${recommendation}`}>{recommendation}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          )}

          {retrofitFinalEstimate && (
            <div className="retrofit-model-output">
              <h3>Final Estimated Retrofit Cost</h3>
              <p>
                Estimate Source: <strong>{retrofitFinalEstimate.estimateSource}</strong>
                {retrofitFinalEstimate.estimateSource === 'ML Model' && ' (AI + ML triggered from multi-image analysis)'}
              </p>
              {retrofitFinalEstimate.mlModel && (
                <p>
                  ML Model: <strong>{retrofitFinalEstimate.mlModel}</strong>
                  {typeof retrofitFinalEstimate.mlConfidence === 'number' && (
                    <>
                      {' '}
                      | Confidence: <strong>{(retrofitFinalEstimate.mlConfidence * 100).toFixed(0)}%</strong>
                    </>
                  )}
                </p>
              )}
              <div className="retrofit-insights-grid">
                <p>
                  Photos Analyzed: <strong>{retrofitFinalEstimate.imageCount}</strong>
                </p>
                <p>
                  Inferred Area from Images: <strong>{retrofitFinalEstimate.totalAreaSqft.toLocaleString()} sq ft</strong>
                </p>
                <p>
                  Final Estimated Cost: <strong>PKR {Math.round(retrofitFinalEstimate.totalCost).toLocaleString()}</strong>
                </p>
                <p>
                  Estimated Range:{' '}
                  <strong>
                    PKR {Math.round(retrofitFinalEstimate.minTotalCost).toLocaleString()} - PKR{' '}
                    {Math.round(retrofitFinalEstimate.maxTotalCost).toLocaleString()}
                  </strong>
                </p>
                <p>
                  Effective Rate: <strong>PKR {Math.round(retrofitFinalEstimate.sqftRate).toLocaleString()}/sq ft</strong>
                </p>
                <p>
                  Scope: <strong>{retrofitFinalEstimate.scope}</strong>
                </p>
                <p>
                  Damage Level: <strong>{retrofitFinalEstimate.damageLevel}</strong>
                </p>
                <p>
                  Urgency: <strong>{retrofitFinalEstimate.urgencyLevel}</strong>
                </p>
                <p>
                  Avg Affected Area: <strong>{retrofitFinalEstimate.affectedAreaPercent}%</strong>
                </p>
                <p>
                  Location Cost Factor: <strong>{retrofitFinalEstimate.locationFactor.toFixed(2)}x</strong>
                </p>
                <p>
                  Estimated Duration: <strong>{retrofitFinalEstimate.durationWeeks} weeks</strong>
                </p>
              </div>
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
              <button onClick={downloadRetrofitEstimate}>📥 Download Retrofit Estimate PDF</button>
            </div>
          )}

            </div>
          )
    }

    if (activeSection === 'warning') {
      const warningMapUpdatedAt = pmdLiveSnapshot ? new Date(pmdLiveSnapshot.updatedAt).toLocaleString() : 'Live map awaiting PMD sync'

      return (
        <div className="panel section-panel section-warning">
          <div className="warning-hero-card">
            <h2>{t.sections.warning}</h2>
            <p className="warning-hero-subtitle">Provide Real-Time Multi-Hazard Early Warning Updates for Pakistan — FMC-CDRI NEL</p>
            <div className="warning-actions-row warning-tabs-row">
              <button onClick={loadLiveAlerts} disabled={isLoadingAlerts}>
                {isLoadingAlerts ? '🔄 Refreshing Risk Alert Map...' : '🌐 Risk Alert Map View'}
              </button>
              <button onClick={loadPmdLive} disabled={isLoadingPmdLive}>
                {isLoadingPmdLive ? '🔄 Syncing FMC Details...' : '🧾 Details FMC Help'}
              </button>
              <button type="button" className="warning-search-btn" aria-label="Search warning updates">🔍</button>
            </div>
          </div>

          {alertError && <p className="warning-error-text">{alertError}</p>}
          {pmdLiveError && <p className="warning-error-text">{pmdLiveError}</p>}

          <div className="warning-map-panel">
            <div className="warning-map-head">
              <span className="warning-map-badge">FMC</span>
              <span>{warningMapUpdatedAt}</span>
            </div>
            <div className="warning-map-canvas">
              {pmdLiveSnapshot?.satellite.imageUrl ? (
                <a href={pmdLiveSnapshot.links.satellite} target="_blank" rel="noreferrer">
                  <img src={pmdLiveSnapshot.satellite.imageUrl} alt="Latest PMD satellite" className="warning-main-map" />
                </a>
              ) : (
                <p>Satellite image preview is not currently available. Tap Details FMC Help to sync PMD live map.</p>
              )}
            </div>
            {pmdLiveSnapshot && (
              <div className="warning-map-links">
                <a href={pmdLiveSnapshot.links.satellite} target="_blank" rel="noreferrer">
                  Open full satellite page
                </a>
                <a href={pmdLiveSnapshot.links.radar} target="_blank" rel="noreferrer">
                  Open PMD radar
                </a>
              </div>
            )}
          </div>

          <div className="warning-updates-card">
            <h3>PMD Updates</h3>
            {alertLog.length === 0 ? (
              <p>No alerts available yet.</p>
            ) : (
              <ul className="warning-updates-list">
                {alertLog.slice(0, 8).map((alert) => {
                  const published = alert.publishedAt ? ` • ${new Date(alert.publishedAt).toLocaleString()}` : ''
                  return (
                    <li key={alert.id}>
                      <strong>[{alert.source}]</strong>{' '}
                      {alert.source === 'PMD' && <span className="live-pmd-badge">LIVE PMD</span>}{' '}
                      <a href={alert.link} target="_blank" rel="noreferrer">
                        {alert.title}
                      </a>
                      {published}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="warning-whatnow-card">
            <h3>
              <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('warningWhatToDoNow')} aria-expanded={expandedPanels.warningWhatToDoNow}>
                <span>What To Do Now</span>
                <span>{expandedPanels.warningWhatToDoNow ? '▾' : '▸'}</span>
              </button>
            </h3>
            {expandedPanels.warningWhatToDoNow && (
              <div className="warning-toolkit-grid">
                <article className="warning-toolkit-column">
                  <h4>👜 Emergency Kit Checklist</h4>
                  <ul className="warning-toolkit-list warning-checklist-list">
                    {emergencyKitChecklistItems.map((item) => (
                      <li key={item}>
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(emergencyKitChecks[item])}
                            onChange={(event) =>
                              setEmergencyKitChecks((previous) => ({
                                ...previous,
                                [item]: event.target.checked,
                              }))
                            }
                          />{' '}
                          {item}
                        </label>
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="warning-toolkit-column">
                  <h4>
                    <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('warningEmergencyToolkit')} aria-expanded={expandedPanels.warningEmergencyToolkit}>
                      <span>🧰 Emergency Response Toolkit</span>
                      <span>{expandedPanels.warningEmergencyToolkit ? '▾' : '▸'}</span>
                    </button>
                  </h4>
                  {expandedPanels.warningEmergencyToolkit && (
                    <ul className="warning-toolkit-list">
                      <li>Move vulnerable people and critical records to safe elevation.</li>
                      <li>Follow district evacuation routes and keep emergency kits ready.</li>
                      <li>Use SMS-style alert channel for last-mile communication.</li>
                      <li>Switch off electricity and move to higher floor or designated shelter.</li>
                      <li>Drop, cover, and hold under sturdy furniture during tremors.</li>
                      {(nearestHospitalsByProvince[selectedProvince] ?? nearestHospitalsByProvince.Punjab)
                        .slice(0, 4)
                        .map((hospital) => (
                          <li key={hospital}>{hospital}</li>
                        ))}
                    </ul>
                  )}
                </article>
              </div>
            )}
          </div>

          {pmdLiveSnapshot ? (
            <div className="pmd-live-widget">
              <h3>
                <button type="button" className="section-collapsible-toggle" onClick={() => togglePanel('pmdLiveWeather')} aria-expanded={expandedPanels.pmdLiveWeather}>
                  <span>PMD Live City Weather</span>
                  <span>{expandedPanels.pmdLiveWeather ? '▾' : '▸'}</span>
                </button>
              </h3>
              {expandedPanels.pmdLiveWeather && (
                <>
                  {pmdLiveSnapshot.cities.length > 0 ? (
                    <div className="pmd-city-grid">
                      {pmdLiveSnapshot.cities.map((cityWeather) => (
                        <article key={cityWeather.city} className="pmd-city-card">
                          <strong>{cityWeather.city}</strong>
                          <span>{cityWeather.temperatureC}°C</span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p>Live city temperatures are temporarily unavailable from PMD. Satellite/radar links remain live.</p>
                  )}
                  {pmdLiveSnapshot.mode === 'rss-fallback' && (
                    <p className="pmd-live-meta">PMD web endpoints are slow/unreachable right now; showing CAP RSS fallback updates.</p>
                  )}
                  {pmdLiveSnapshot.warning && <p className="pmd-live-meta">{pmdLiveSnapshot.warning}</p>}
                  {pmdLiveSnapshot.latestAlerts && pmdLiveSnapshot.latestAlerts.length > 0 && (
                    <div className="pmd-media-card">
                      <h4>Latest PMD Updates (CAP)</h4>
                      <ul>
                        {pmdLiveSnapshot.latestAlerts.slice(0, 5).map((item) => (
                          <li key={item.id}>
                            <a href={item.link} target="_blank" rel="noreferrer">
                              {item.title}
                            </a>
                            {item.publishedAt ? ` • ${new Date(item.publishedAt).toLocaleString()}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="pmd-live-meta">Updated: {new Date(pmdLiveSnapshot.updatedAt).toLocaleString()}</p>

                  <div className="pmd-media-grid">
                    <article className="pmd-media-card">
                      <h4>PMD Satellite</h4>
                      {pmdLiveSnapshot.satellite.imageUrl ? (
                        <a href={pmdLiveSnapshot.links.satellite} target="_blank" rel="noreferrer">
                          <img src={pmdLiveSnapshot.satellite.imageUrl} alt="Latest PMD satellite" className="pmd-satellite-img" />
                        </a>
                      ) : (
                        <p>Satellite image preview is not currently available.</p>
                      )}
                    </article>

                    <article className="pmd-media-card">
                      <h4>PMD Radar</h4>
                      <a href={pmdLiveSnapshot.links.radar} target="_blank" rel="noreferrer">
                        Open latest radar imagery
                      </a>
                    </article>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="pmd-live-meta">PMD live city weather is not available right now. Use “Details FMC Help” to refresh.</p>
          )}
            <h3>🌧️ Smart Drainage & Rain Alert Notification</h3>
            <p>Reference source: Pakistan Meteorological Department (PMD) live weather + CAP alerts.</p>
            <div className="inline-controls">
              <button type="button" onClick={runSmartDrainageAlertCheck}>
                Check Smart Drainage Alert
              </button>
              <button type="button" onClick={requestCurrentUserLocation} disabled={isDetectingLocation}>
                {isDetectingLocation ? 'Detecting GPS...' : 'Use My Location for Alerts'}
              </button>
            </div>
            {smartDrainageStatus && <p>{smartDrainageStatus}</p>}
            <ul>
              <li>Alternative route suggestion: prioritize raised roads and avoid low underpasses.</li>
              <li>Flooded road warning: do not cross standing water above wheel level.</li>
              <li>High-risk users receive recommended shelter move advice before severe rain.</li>
            </ul>
        </div>
      )
    }

    if (activeSection === 'learn') {
      return (
        <div className="panel section-panel section-learn">
          <div className="learn-title-wrap">
            <h2>🎓 Learn &amp; Train</h2>
            <p>Watch IAPD training videos directly in-app. Videos are stream-only, support fullscreen, and are kept for offline use on installed builds.</p>
          </div>

          <div className="inline-controls learn-inline-controls">
            <button
              type="button"
              className="learn-enroll-btn"
              onClick={() => navigateToSection('coePortal')}
            >
              🎓 Enroll in COE lectures
            </button>
          </div>

          {!isLearnVideoVisible && (
            <div className="card-grid learn-video-grid">
              {learnTrainingVideos.map((video) => (
                <article key={video.id} className="learn-video-card">
                  <h3>
                    <span className="learn-video-icon">{learnVideoIconById[video.id] ?? '🎬'}</span>
                    <span>{video.title}</span>
                  </h3>
                  <p>{video.summary}</p>
                  <button className="learn-watch-btn" onClick={() => openLearnVideoPlayer(video.fileName)}>▶️ Watch Video</button>
                </article>
              ))}
            </div>
          )}

          {isLearnVideoVisible && activeLearnVideo && (
            <div className="infra-video-panel learn-video-player-panel">
              <h3>Now Playing: {activeLearnVideo.title}</h3>
              <video
                key={activeLearnVideo.fileName}
                ref={learnVideoRef}
                className="infra-layout-video learn-training-video"
                controls
                autoPlay
                playsInline
                controlsList="nodownload noplaybackrate noremoteplayback"
                disablePictureInPicture
                onContextMenu={(event) => event.preventDefault()}
                onError={handleLearnVideoLoadError}
                preload="metadata"
              >
                <source src={learnVideoPlaybackSrc || activeLearnVideoSrc} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="learn-video-player-actions">
                <button onClick={() => setIsLearnVideoVisible(false)}>⬅ Back to All Videos</button>
                <button onClick={openLearnVideoFullscreen}>⛶ Full Screen</button>
                <button onClick={() => setIsLearnVideoVisible(false)}>⏹️ Hide Video</button>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (activeSection === 'pgbc') {
      return (
        <div className="panel section-panel section-pgbc">
          <h2>{t.sections.pgbc}</h2>
          <div className="inline-controls">
            <a href={`${import.meta.env.BASE_URL}pgbc/index.html`} target="_blank" rel="noreferrer">
              Open PGBC in new tab
            </a>
          </div>
          <iframe
            title="PGBC Portal"
            className="pgbc-portal-frame"
            src={`${import.meta.env.BASE_URL}pgbc/index.html`}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      )
    }

    if (activeSection === 'coePortal') {
      return (
        <div className="panel section-panel section-pgbc">
          <h2>{t.sections.coePortal}</h2>
          <div className="inline-controls">
            <a href={`${import.meta.env.BASE_URL}coe-portal/#/`} target="_blank" rel="noreferrer">
              Open COE in new tab
            </a>
          </div>
          <iframe
            title="COE Training Portal"
            className="pgbc-portal-frame"
            src={`${import.meta.env.BASE_URL}coe-portal/#/`}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      )
    }

    if (activeSection === 'materialHubs') {
      return (
        <div className="panel section-panel section-pgbc">
          <h2>{t.sections.materialHubs}</h2>
          <div className="inline-controls">
            <a href={`${import.meta.env.BASE_URL}material-hubs/`} target="_blank" rel="noreferrer">
              Open Material Hubs in new tab
            </a>
          </div>
          <iframe
            title="Material Hubs Portal"
            className="pgbc-portal-frame"
            src={`${import.meta.env.BASE_URL}material-hubs/`}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      )
    }

    if (activeSection === 'retrofitCalculator') {
      return (
        <div className="panel section-panel section-pgbc">
          <h2>{t.sections.retrofitCalculator}</h2>
          <div className="inline-controls">
            <a href={`${import.meta.env.BASE_URL}retrofit-calculator/`} target="_blank" rel="noreferrer">
              Open Retrofit Calculator in new tab
            </a>
          </div>
          <iframe
            title="Retrofit Calculator"
            className="pgbc-portal-frame"
            src={`${import.meta.env.BASE_URL}retrofit-calculator/`}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
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
        <div className="retrofit-model-output">
          <h3>🗂️ Community Issues Admin Dashboard</h3>
          <div className="inline-controls">
            <label>
              Admin Token
              <input
                type="password"
                value={communityAdminToken}
                onChange={(event) => setCommunityAdminToken(event.target.value)}
                placeholder="Enter shared admin token"
              />
            </label>
            <button type="button" onClick={() => void loadCommunityIssueReports()} disabled={isLoadingCommunityIssues}>
              {isLoadingCommunityIssues ? '🔄 Loading Issues...' : '🔄 Reload Issues'}
            </button>
            <button type="button" onClick={() => void syncInfraModelsGitHubNow()} disabled={isSyncingInfraModels || !communityAdminToken.trim()}>
              {isSyncingInfraModels ? '⬆️ Syncing Infra Models...' : '⬆️ Sync Shared Infra Models to GitHub'}
            </button>
          </div>
          <p>Status updates are admin-protected and require a valid shared token.</p>
          <p>Infra models generated in the app are saved server-side for cross-device access. Use sync to commit/push the shared storage file.</p>
          {infraModelsSyncMessage && <p>{infraModelsSyncMessage}</p>}
          {communityIssueReports.length === 0 ? (
            <p>No community issue submissions yet.</p>
          ) : (
            <div className="alerts">
              {communityIssueReports.slice(0, 25).map((issue) => (
                <div key={issue.id} style={{ marginBottom: 12 }}>
                  <p>
                    <strong>{issue.category}</strong> • {new Date(issue.submittedAt).toLocaleString()} •{' '}
                    {issue.province ?? 'Pakistan'}{issue.district ? ` / ${issue.district}` : ''}
                  </p>
                  <p>{issue.notes}</p>
                  <div className="inline-controls">
                    <label>
                      Status
                      <select
                        value={communityIssueStatusDrafts[issue.id] ?? (issue.status as CommunityIssueStatus) ?? 'Submitted'}
                        onChange={(event) =>
                          setCommunityIssueStatusDrafts((previous) => ({
                            ...previous,
                            [issue.id]: event.target.value as CommunityIssueStatus,
                          }))
                        }
                      >
                        {communityIssueStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => void saveCommunityIssueStatusUpdate(issue.id)}
                      disabled={isUpdatingCommunityIssueId === issue.id || !communityAdminToken.trim()}
                    >
                      {isUpdatingCommunityIssueId === issue.id ? '🔄 Updating...' : '✅ Update Status'}
                    </button>
                    {issue.imageUrl ? (
                      <a href={issue.imageUrl} target="_blank" rel="noreferrer">
                        View Photo
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`app-shell ${!isEmbeddedPortalSection ? 'resilience-bg-shell' : ''} ${isLightweight ? 'lightweight' : ''} ${isHomeView ? 'home-shell' : ''} ${isBestPracticesView || isLearnView ? 'best-practices-view' : ''} ${isRiskMapsView ? 'risk-maps-view' : ''} ${isReadinessView ? 'readiness-view' : ''} ${isWarningView ? 'warning-view' : ''}`}
      dir={isUrdu ? 'rtl' : 'ltr'}
    >
      <header className={`navbar ${isHomeView ? 'home-navbar' : ''} ${isBestPracticesView || isLearnView ? 'best-practices-navbar' : ''} ${isRiskMapsView ? 'risk-maps-navbar' : ''} ${isReadinessView ? 'readiness-navbar' : ''} ${isWarningView ? 'warning-navbar' : ''}`}>
        <div className="brand">
          <div className="logo-badge">{t.logoText}</div>
          {isHomeView || isBestPracticesView || isLearnView || isRiskMapsView || isWarningView ? (
            <div className="hero-title-wrap">
              <h1 className="hero-title">Resilience360°</h1>
              <p className="hero-subtitle">Infrastructure Safety &amp; Disaster Engineering Toolkit</p>
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
                <button
                  key={key}
                  className={`home-card ${homeCardMeta[key].tone}`}
                  onClick={() => navigateToSection(key)}
                >
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
              <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.8 }}>Build Version: {BUILD_VERSION_LABEL}</p>
              <button onClick={() => navigateToSection('settings')}>⚙️ {t.sections.settings}</button>
            </section>
          </>
        )}
        {!isHomeView && (
          <div className={`section-back-row ${isBestPracticesView ? 'best-practices-back-row' : ''} ${isRiskMapsView ? 'risk-maps-back-row' : ''} ${isApplyRegionView ? 'apply-region-back-row' : ''} ${isLearnView ? 'learn-back-row' : ''} ${isWarningView ? 'warning-back-row' : ''}`}>
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
