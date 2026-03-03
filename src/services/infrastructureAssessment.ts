/**
 * Infrastructure Assessment Service
 * 
 * Estimates infrastructure located within earthquake-affected zones
 * using population density models and infrastructure-to-population ratios.
 */

import type { SeismicImpactAssessment } from './seismicImpact'

export type InfrastructureEstimate = {
  // Residential infrastructure
  buildings: {
    residential: number
    commercial: number
    industrial: number
    total: number
  }
  
  // Transportation infrastructure
  transportation: {
    roadLengthKm: number
    bridges: number
    railways: {
      lengthKm: number
      stations: number
    }
  }
  
  // Critical facilities
  criticalFacilities: {
    hospitals: number
    schools: number
    emergencyServices: number
    powerStations: number
    waterTreatmentPlants: number
  }
  
  // Utilities infrastructure
  utilities: {
    electricityLines: number
    waterPipes: number
    communicationTowers: number
  }
  
  // Overall metrics
  totalAssets: number
  estimatedValue: number // in USD
  populationAffected: number
}

export type InfrastructureImpactAssessment = {
  seismicAssessment: SeismicImpactAssessment
  
  // Infrastructure in different impact zones
  primaryZone: InfrastructureEstimate
  secondaryZone: InfrastructureEstimate
  feltZone: InfrastructureEstimate
  
  // Summary
  totalInfrastructure: InfrastructureEstimate
  
  // Risk assessment
  criticalInfraAtRisk: string[]
  estimatedEconomicLoss: {
    low: number
    medium: number
    high: number
    currency: string
  }
}

/**
 * Infrastructure density models based on global averages and regional characteristics
 * These are simplified models - production systems should use actual GIS data
 */
const INFRASTRUCTURE_RATIOS = {
  // Per 1000 people
  residentialBuildings: 250, // ~4 people per residential unit
  commercialBuildings: 15,
  industrialBuildings: 3,
  
  // Per 1000 sq km
  roadDensityPerSqKm: 150, // km of roads per sq km
  bridgesPerSqKm: 0.8,
  railwayDensityPerSqKm: 5, // km of railways per sq km
  railwayStationsPerSqKm: 0.05,
  
  // Per 100,000 people
  hospitals: 1.5,
  schools: 25,
  emergencyServices: 3,
  powerStations: 0.5,
  waterTreatmentPlants: 1,
  
  // Per 1000 people
  electricityLinesKm: 10,
  waterPipesKm: 8,
  communicationTowers: 0.2,
}

/**
 * Density multipliers based on population density
 */
function getDensityMultiplier(populationDensity: number): number {
  // High density urban: > 1000 people/sq km
  if (populationDensity > 1000) return 1.5
  
  // Moderate density suburban: 100-1000 people/sq km
  if (populationDensity > 100) return 1.0
  
  // Low density rural: < 100 people/sq km
  return 0.4
}

/**
 * Estimate infrastructure in a given area
 */
function estimateInfrastructureForZone(
  areaSqKm: number,
  population: number
): InfrastructureEstimate {
  const populationDensity = population / areaSqKm
  const densityMultiplier = getDensityMultiplier(populationDensity)
  
  // Calculate building counts
  const residentialBuildings = Math.round(
    (population / 1000) * INFRASTRUCTURE_RATIOS.residentialBuildings * densityMultiplier
  )
  const commercialBuildings = Math.round(
    (population / 1000) * INFRASTRUCTURE_RATIOS.commercialBuildings * densityMultiplier
  )
  const industrialBuildings = Math.round(
    (population / 1000) * INFRASTRUCTURE_RATIOS.industrialBuildings * densityMultiplier * 0.8
  )
  const totalBuildings = residentialBuildings + commercialBuildings + industrialBuildings
  
  // Calculate transportation infrastructure
  const roadLengthKm = Math.round(
    areaSqKm * INFRASTRUCTURE_RATIOS.roadDensityPerSqKm * densityMultiplier
  )
  const bridges = Math.round(
    areaSqKm * INFRASTRUCTURE_RATIOS.bridgesPerSqKm * densityMultiplier
  )
  const railwayLengthKm = Math.round(
    areaSqKm * INFRASTRUCTURE_RATIOS.railwayDensityPerSqKm * densityMultiplier * 0.6
  )
  const railwayStations = Math.round(
    areaSqKm * INFRASTRUCTURE_RATIOS.railwayStationsPerSqKm * densityMultiplier
  )
  
  // Calculate critical facilities
  const hospitals = Math.round(
    (population / 100000) * INFRASTRUCTURE_RATIOS.hospitals
  )
  const schools = Math.round(
    (population / 100000) * INFRASTRUCTURE_RATIOS.schools
  )
  const emergencyServices = Math.round(
    (population / 100000) * INFRASTRUCTURE_RATIOS.emergencyServices
  )
  const powerStations = Math.round(
    (population / 100000) * INFRASTRUCTURE_RATIOS.powerStations
  )
  const waterTreatmentPlants = Math.round(
    (population / 100000) * INFRASTRUCTURE_RATIOS.waterTreatmentPlants
  )
  
  // Calculate utilities
  const electricityLines = Math.round(
    (population / 1000) * INFRASTRUCTURE_RATIOS.electricityLinesKm
  )
  const waterPipes = Math.round(
    (population / 1000) * INFRASTRUCTURE_RATIOS.waterPipesKm
  )
  const communicationTowers = Math.round(
    (population / 1000) * INFRASTRUCTURE_RATIOS.communicationTowers
  )
  
  // Calculate total assets
  const totalAssets =
    totalBuildings +
    bridges +
    railwayStations +
    hospitals +
    schools +
    emergencyServices +
    powerStations +
    waterTreatmentPlants +
    communicationTowers
  
  // Estimate infrastructure value (simplified)
  // Average building value: $150,000
  // Average bridge value: $5,000,000
  // Average critical facility value: $2,000,000
  const estimatedValue =
    totalBuildings * 150000 +
    bridges * 5000000 +
    (hospitals + schools + emergencyServices + powerStations + waterTreatmentPlants) * 2000000 +
    roadLengthKm * 500000 + // $500k per km of road
    railwayLengthKm * 2000000 + // $2M per km of railway
    communicationTowers * 500000
  
  return {
    buildings: {
      residential: residentialBuildings,
      commercial: commercialBuildings,
      industrial: industrialBuildings,
      total: totalBuildings,
    },
    transportation: {
      roadLengthKm,
      bridges,
      railways: {
        lengthKm: railwayLengthKm,
        stations: railwayStations,
      },
    },
    criticalFacilities: {
      hospitals,
      schools,
      emergencyServices,
      powerStations,
      waterTreatmentPlants,
    },
    utilities: {
      electricityLines,
      waterPipes,
      communicationTowers,
    },
    totalAssets,
    estimatedValue,
    populationAffected: Math.round(population),
  }
}

/**
 * Calculate population for a circular zone
 * Uses simplified global population density model
 */
function estimatePopulationInZone(
  areaSqKm: number,
  magnitude: number,
  lat: number
): number {
  // Base population density varies by latitude (proxy for development)
  // Equatorial and mid-latitude regions tend to be more populated
  const latitudeFactor = 1 - Math.abs(lat) / 90 * 0.5
  
  // Larger magnitude earthquakes tend to occur in less populated areas (plate boundaries)
  const magnitudeFactor = magnitude > 6 ? 0.5 : magnitude > 5 ? 0.7 : 1.0
  
  // Global average: ~60 people per sq km
  const baseDensity = 60
  
  const adjustedDensity = baseDensity * latitudeFactor * magnitudeFactor
  
  return Math.round(areaSqKm * adjustedDensity)
}

/**
 * Identify critical infrastructure at risk
 */
function identifyCriticalInfraAtRisk(
  seismicAssessment: SeismicImpactAssessment,
  primaryInfra: InfrastructureEstimate
): string[] {
  const criticalItems: string[] = []
  
  const { criticalFacilities, transportation } = primaryInfra
  const { riskLevel } = seismicAssessment
  
  if (riskLevel === 'High' || riskLevel === 'Very High' || riskLevel === 'Extreme') {
    if (criticalFacilities.hospitals > 0) {
      criticalItems.push(`${criticalFacilities.hospitals} hospital(s) in severe shaking zone`)
    }
    if (criticalFacilities.schools > 0) {
      criticalItems.push(`${criticalFacilities.schools} school(s) in severe shaking zone`)
    }
    if (criticalFacilities.emergencyServices > 0) {
      criticalItems.push(`${criticalFacilities.emergencyServices} emergency service(s) potentially affected`)
    }
    if (criticalFacilities.powerStations > 0) {
      criticalItems.push(`${criticalFacilities.powerStations} power station(s) at risk`)
    }
    if (criticalFacilities.waterTreatmentPlants > 0) {
      criticalItems.push(`${criticalFacilities.waterTreatmentPlants} water treatment plant(s) at risk`)
    }
    if (transportation.bridges > 5) {
      criticalItems.push(`${transportation.bridges} bridges in impact zone`)
    }
  }
  
  if (criticalItems.length === 0) {
    criticalItems.push('No critical infrastructure in high-risk zone')
  }
  
  return criticalItems
}

/**
 * Estimate economic losses
 */
function estimateEconomicLoss(
  seismicAssessment: SeismicImpactAssessment,
  primaryInfra: InfrastructureEstimate,
  secondaryInfra: InfrastructureEstimate
): InfrastructureImpactAssessment['estimatedEconomicLoss'] {
  const { riskLevel } = seismicAssessment
  
  // Damage factors based on risk level
  let primaryDamageFactor = 0
  let secondaryDamageFactor = 0
  
  switch (riskLevel) {
    case 'Extreme':
      primaryDamageFactor = 0.5 // 50% damage in primary zone
      secondaryDamageFactor = 0.15 // 15% damage in secondary zone
      break
    case 'Very High':
      primaryDamageFactor = 0.3
      secondaryDamageFactor = 0.08
      break
    case 'High':
      primaryDamageFactor = 0.15
      secondaryDamageFactor = 0.04
      break
    case 'Moderate':
      primaryDamageFactor = 0.05
      secondaryDamageFactor = 0.01
      break
    default:
      primaryDamageFactor = 0.01
      secondaryDamageFactor = 0
  }
  
  const primaryLoss = primaryInfra.estimatedValue * primaryDamageFactor
  const secondaryLoss = secondaryInfra.estimatedValue * secondaryDamageFactor
  
  const totalLoss = primaryLoss + secondaryLoss
  
  // Provide range estimates
  return {
    low: Math.round(totalLoss * 0.5),
    medium: Math.round(totalLoss),
    high: Math.round(totalLoss * 2),
    currency: 'USD',
  }
}

/**
 * Combine infrastructure estimates
 */
function combineInfrastructureEstimates(
  estimates: InfrastructureEstimate[]
): InfrastructureEstimate {
  const combined: InfrastructureEstimate = {
    buildings: {
      residential: 0,
      commercial: 0,
      industrial: 0,
      total: 0,
    },
    transportation: {
      roadLengthKm: 0,
      bridges: 0,
      railways: {
        lengthKm: 0,
        stations: 0,
      },
    },
    criticalFacilities: {
      hospitals: 0,
      schools: 0,
      emergencyServices: 0,
      powerStations: 0,
      waterTreatmentPlants: 0,
    },
    utilities: {
      electricityLines: 0,
      waterPipes: 0,
      communicationTowers: 0,
    },
    totalAssets: 0,
    estimatedValue: 0,
    populationAffected: 0,
  }
  
  for (const estimate of estimates) {
    combined.buildings.residential += estimate.buildings.residential
    combined.buildings.commercial += estimate.buildings.commercial
    combined.buildings.industrial += estimate.buildings.industrial
    combined.buildings.total += estimate.buildings.total
    
    combined.transportation.roadLengthKm += estimate.transportation.roadLengthKm
    combined.transportation.bridges += estimate.transportation.bridges
    combined.transportation.railways.lengthKm += estimate.transportation.railways.lengthKm
    combined.transportation.railways.stations += estimate.transportation.railways.stations
    
    combined.criticalFacilities.hospitals += estimate.criticalFacilities.hospitals
    combined.criticalFacilities.schools += estimate.criticalFacilities.schools
    combined.criticalFacilities.emergencyServices += estimate.criticalFacilities.emergencyServices
    combined.criticalFacilities.powerStations += estimate.criticalFacilities.powerStations
    combined.criticalFacilities.waterTreatmentPlants += estimate.criticalFacilities.waterTreatmentPlants
    
    combined.utilities.electricityLines += estimate.utilities.electricityLines
    combined.utilities.waterPipes += estimate.utilities.waterPipes
    combined.utilities.communicationTowers += estimate.utilities.communicationTowers
    
    combined.totalAssets += estimate.totalAssets
    combined.estimatedValue += estimate.estimatedValue
    combined.populationAffected += estimate.populationAffected
  }
  
  return combined
}

/**
 * Assess infrastructure impact from earthquake
 */
export function assessInfrastructureImpact(
  seismicAssessment: SeismicImpactAssessment
): InfrastructureImpactAssessment {
  const { epicenterLat, magnitude } = seismicAssessment
  
  // Estimate population in each zone
  const primaryPopulation = estimatePopulationInZone(
    seismicAssessment.primaryImpactAreaSqKm,
    magnitude,
    epicenterLat
  )
  const secondaryPopulation = estimatePopulationInZone(
    seismicAssessment.secondaryImpactAreaSqKm - seismicAssessment.primaryImpactAreaSqKm,
    magnitude,
    epicenterLat
  )
  const feltPopulation = estimatePopulationInZone(
    seismicAssessment.feltAreaSqKm - seismicAssessment.secondaryImpactAreaSqKm,
    magnitude,
    epicenterLat
  )
  
  // Estimate infrastructure for each zone
  const primaryInfra = estimateInfrastructureForZone(
    seismicAssessment.primaryImpactAreaSqKm,
    primaryPopulation
  )
  
  const secondaryInfra = estimateInfrastructureForZone(
    seismicAssessment.secondaryImpactAreaSqKm - seismicAssessment.primaryImpactAreaSqKm,
    secondaryPopulation
  )
  
  const feltInfra = estimateInfrastructureForZone(
    seismicAssessment.feltAreaSqKm - seismicAssessment.secondaryImpactAreaSqKm,
    feltPopulation
  )
  
  // Combine all zones
  const totalInfra = combineInfrastructureEstimates([primaryInfra, secondaryInfra, feltInfra])
  
  // Identify critical infrastructure at risk
  const criticalInfraAtRisk = identifyCriticalInfraAtRisk(seismicAssessment, primaryInfra)
  
  // Estimate economic losses
  const estimatedEconomicLoss = estimateEconomicLoss(seismicAssessment, primaryInfra, secondaryInfra)
  
  return {
    seismicAssessment,
    primaryZone: primaryInfra,
    secondaryZone: secondaryInfra,
    feltZone: feltInfra,
    totalInfrastructure: totalInfra,
    criticalInfraAtRisk,
    estimatedEconomicLoss,
  }
}

/**
 * Format infrastructure count for display
 */
export function formatInfrastructureCount(count: number, unit: string): string {
  if (count === 0) return `0 ${unit}s`
  if (count === 1) return `1 ${unit}`
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M ${unit}s`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K ${unit}s`
  return `${count} ${unit}s`
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B ${currency}`
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ${currency}`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K ${currency}`
  }
  return `${value.toFixed(0)} ${currency}`
}
