/**
 * Seismic Impact Assessment Service
 * 
 * Implements intensity attenuation models and shake radius calculations
 * to estimate affected areas from earthquake events.
 */

export type SeismicIntensityZone = {
  intensityLevel: number // MMI (Modified Mercalli Intensity)
  radiusKm: number
  description: string
  damageLevel: 'None' | 'Minimal' | 'Moderate' | 'Severe' | 'Catastrophic'
  shakeIntensity: 'Not Felt' | 'Weak' | 'Light' | 'Moderate' | 'Strong' | 'Very Strong' | 'Violent' | 'Extreme'
}

export type SeismicImpactAssessment = {
  epicenterLat: number
  epicenterLng: number
  magnitude: number
  depthKm: number
  
  // Primary impact zone (most severe shaking)
  primaryImpactRadiusKm: number
  primaryImpactAreaSqKm: number
  
  // Secondary impact zone (moderate shaking)
  secondaryImpactRadiusKm: number
  secondaryImpactAreaSqKm: number
  
  // Felt radius (perceptible shaking)
  feltRadiusKm: number
  feltAreaSqKm: number
  
  // Detailed intensity zones (from epicenter outward)
  intensityZones: SeismicIntensityZone[]
  
  // Overall assessment
  maxIntensity: number // MMI at epicenter
  estimatedPopulationExposed: number
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme'
}

/**
 * Calculate seismic intensity using attenuation model
 * Based on simplified GMPE (Ground Motion Prediction Equation)
 * 
 * Uses a modified Gutenberg-Richter attenuation relationship:
 * MMI = a + b*M - c*log10(R + depth_factor)
 * 
 * Where:
 * - MMI = Modified Mercalli Intensity
 * - M = Magnitude
 * - R = Distance from epicenter (km)
 * - depth_factor = Depth correction factor
 */
function calculateIntensityAtDistance(
  magnitude: number,
  depthKm: number,
  distanceKm: number
): number {
  // Attenuation parameters (calibrated for general use)
  const a = 1.5
  const b = 1.5
  const c = 3.5
  
  // Depth correction factor (deeper earthquakes attenuate more slowly at surface)
  const depthFactor = Math.max(1, depthKm * 0.3)
  
  // Calculate MMI using attenuation equation
  const mmi = a + b * magnitude - c * Math.log10(distanceKm + depthFactor)
  
  // Clamp to valid MMI range (1-12)
  return Math.max(1, Math.min(12, mmi))
}

/**
 * Get shake intensity description from MMI value
 */
function getShakeIntensity(mmi: number): SeismicIntensityZone['shakeIntensity'] {
  if (mmi < 2) return 'Not Felt'
  if (mmi < 3) return 'Weak'
  if (mmi < 4.5) return 'Light'
  if (mmi < 6) return 'Moderate'
  if (mmi < 7) return 'Strong'
  if (mmi < 8.5) return 'Very Strong'
  if (mmi < 10) return 'Violent'
  return 'Extreme'
}

/**
 * Get damage level from MMI value
 */
function getDamageLevel(mmi: number): SeismicIntensityZone['damageLevel'] {
  if (mmi < 4) return 'None'
  if (mmi < 6) return 'Minimal'
  if (mmi < 7.5) return 'Moderate'
  if (mmi < 9) return 'Severe'
  return 'Catastrophic'
}

/**
 * Get MMI description
 */
function getMMIDescription(mmi: number): string {
  const roundedMMI = Math.round(mmi)
  
  const descriptions: Record<number, string> = {
    1: 'Not felt except by very few under especially favorable conditions',
    2: 'Felt only by a few persons at rest, especially on upper floors',
    3: 'Felt quite noticeably indoors; many people do not recognize it as earthquake',
    4: 'Felt indoors by many, outdoors by few; dishes, windows, doors disturbed',
    5: 'Felt by nearly everyone; some dishes, windows broken; cracked plaster',
    6: 'Felt by all; many frightened; some heavy furniture moved; some plaster falls',
    7: 'Most people alarmed; damage to poorly built structures; slight damage elsewhere',
    8: 'Damage slight in specially designed structures; considerable in ordinary buildings',
    9: 'Damage considerable in specially designed structures; buildings shifted off foundations',
    10: 'Some well-built wooden structures destroyed; most masonry structures destroyed',
    11: 'Few, if any, masonry structures remain standing; bridges destroyed; rails bent greatly',
    12: 'Damage total; waves seen on ground surfaces; objects thrown upward into air',
  }
  
  return descriptions[roundedMMI] || 'Unknown intensity'
}

/**
 * Calculate radius for a given MMI threshold
 */
function calculateRadiusForMMI(
  magnitude: number,
  depthKm: number,
  targetMMI: number
): number {
  // Binary search for radius where MMI equals target
  let minR = 0
  let maxR = 2000 // Max search radius in km
  let iterations = 0
  const maxIterations = 50
  
  while (iterations < maxIterations && (maxR - minR) > 0.1) {
    const midR = (minR + maxR) / 2
    const mmi = calculateIntensityAtDistance(magnitude, depthKm, midR)
    
    if (mmi > targetMMI) {
      minR = midR
    } else {
      maxR = midR
    }
    
    iterations++
  }
  
  return (minR + maxR) / 2
}

/**
 * Estimate population exposed based on event location and magnitude
 * This is a simplified model - in production, use actual population density data
 */
function estimatePopulationExposure(
  magnitude: number,
  feltAreaSqKm: number
): number {
  // Global average population density: ~60 people/sq km
  // Adjust based on magnitude (larger events typically occur in less populated areas)
  const basePopulationDensity = magnitude > 6 ? 30 : 60
  
  return Math.round(feltAreaSqKm * basePopulationDensity)
}

/**
 * Determine overall risk level
 */
function getRiskLevel(magnitude: number, maxIntensity: number): SeismicImpactAssessment['riskLevel'] {
  if (magnitude >= 7 || maxIntensity >= 9) return 'Extreme'
  if (magnitude >= 6 || maxIntensity >= 7.5) return 'Very High'
  if (magnitude >= 5 || maxIntensity >= 6) return 'High'
  if (magnitude >= 4 || maxIntensity >= 4.5) return 'Moderate'
  return 'Low'
}

/**
 * Calculate comprehensive seismic impact assessment
 */
export function calculateSeismicImpact(
  magnitude: number,
  depthKm: number,
  lat: number,
  lng: number
): SeismicImpactAssessment {
  // Calculate max intensity at epicenter
  const maxIntensity = calculateIntensityAtDistance(magnitude, depthKm, 0.1)
  
  // Define intensity thresholds for different zones
  const primaryThreshold = 7 // MMI VII - Damage begins
  const secondaryThreshold = 5 // MMI V - Widely felt
  const feltThreshold = 3 // MMI III - Felt by people at rest
  
  // Calculate radii for different impact zones
  const primaryRadius = calculateRadiusForMMI(magnitude, depthKm, primaryThreshold)
  const secondaryRadius = calculateRadiusForMMI(magnitude, depthKm, secondaryThreshold)
  const feltRadius = calculateRadiusForMMI(magnitude, depthKm, feltThreshold)
  
  // Calculate areas (π * r²)
  const primaryArea = Math.PI * primaryRadius * primaryRadius
  const secondaryArea = Math.PI * secondaryRadius * secondaryRadius
  const feltArea = Math.PI * feltRadius * feltRadius
  
  // Generate detailed intensity zones (every 20km outward)
  const intensityZones: SeismicIntensityZone[] = []
  const maxRadius = feltRadius
  const numZones = 8
  const stepSize = maxRadius / numZones
  
  for (let i = 0; i < numZones; i++) {
    const radiusKm = (i + 1) * stepSize
    const mmi = calculateIntensityAtDistance(magnitude, depthKm, radiusKm)
    
    if (mmi >= 2) { // Only include zones with perceptible shaking
      intensityZones.push({
        intensityLevel: Math.round(mmi * 10) / 10,
        radiusKm: Math.round(radiusKm * 10) / 10,
        description: getMMIDescription(mmi),
        damageLevel: getDamageLevel(mmi),
        shakeIntensity: getShakeIntensity(mmi),
      })
    }
  }
  
  // Estimate population exposure
  const estimatedPopulation = estimatePopulationExposure(magnitude, feltArea)
  
  // Determine risk level
  const riskLevel = getRiskLevel(magnitude, maxIntensity)
  
  return {
    epicenterLat: lat,
    epicenterLng: lng,
    magnitude,
    depthKm,
    primaryImpactRadiusKm: Math.round(primaryRadius * 10) / 10,
    primaryImpactAreaSqKm: Math.round(primaryArea),
    secondaryImpactRadiusKm: Math.round(secondaryRadius * 10) / 10,
    secondaryImpactAreaSqKm: Math.round(secondaryArea),
    feltRadiusKm: Math.round(feltRadius * 10) / 10,
    feltAreaSqKm: Math.round(feltArea),
    intensityZones: intensityZones.sort((a, b) => a.radiusKm - b.radiusKm),
    maxIntensity: Math.round(maxIntensity * 10) / 10,
    estimatedPopulationExposed: estimatedPopulation,
    riskLevel,
  }
}

/**
 * Format intensity zone for display
 */
export function formatIntensityZone(zone: SeismicIntensityZone): string {
  return `MMI ${zone.intensityLevel.toFixed(1)} at ${zone.radiusKm} km - ${zone.shakeIntensity} shaking, ${zone.damageLevel} damage`
}

/**
 * Get color for intensity level
 */
export function getIntensityColor(mmi: number): string {
  if (mmi >= 9) return '#7f1d1d' // Very dark red
  if (mmi >= 7.5) return '#b91c1c' // Dark red
  if (mmi >= 6) return '#dc2626' // Red
  if (mmi >= 5) return '#ea580c' // Orange-red
  if (mmi >= 4) return '#f59e0b' // Amber
  if (mmi >= 3) return '#eab308' // Yellow
  return '#84cc16' // Green
}
