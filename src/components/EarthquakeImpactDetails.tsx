import type { InfrastructureImpactAssessment } from '../services/infrastructureAssessment'
import { formatInfrastructureCount, formatCurrency } from '../services/infrastructureAssessment'
import { getIntensityColor } from '../services/seismicImpact'
import './EarthquakeImpactDetails.css'

type EarthquakeImpactDetailsProps = {
  assessment: InfrastructureImpactAssessment
  onClose: () => void
}

export default function EarthquakeImpactDetails({
  assessment,
  onClose,
}: EarthquakeImpactDetailsProps) {
  const { seismicAssessment, primaryZone, secondaryZone, totalInfrastructure, criticalInfraAtRisk, estimatedEconomicLoss } = assessment

  const getRiskLevelColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'Extreme':
        return '#7f1d1d'
      case 'Very High':
        return '#b91c1c'
      case 'High':
        return '#dc2626'
      case 'Moderate':
        return '#f59e0b'
      default:
        return '#84cc16'
    }
  }

  return (
    <div className="earthquake-impact-overlay">
      <div className="earthquake-impact-modal">
        <div className="earthquake-impact-header">
          <h2>🌍 Seismic Impact Assessment</h2>
          <button className="earthquake-impact-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="earthquake-impact-body">
          {/* Overview Section */}
          <section className="earthquake-impact-section">
            <h3>📊 Event Overview</h3>
            <div className="earthquake-impact-grid-2">
              <div className="earthquake-impact-stat">
                <span className="stat-label">Magnitude</span>
                <span className="stat-value">M {seismicAssessment.magnitude.toFixed(1)}</span>
              </div>
              <div className="earthquake-impact-stat">
                <span className="stat-label">Depth</span>
                <span className="stat-value">{seismicAssessment.depthKm.toFixed(1)} km</span>
              </div>
              <div className="earthquake-impact-stat">
                <span className="stat-label">Max Intensity</span>
                <span
                  className="stat-value"
                  style={{ color: getIntensityColor(seismicAssessment.maxIntensity) }}
                >
                  MMI {seismicAssessment.maxIntensity.toFixed(1)}
                </span>
              </div>
              <div className="earthquake-impact-stat">
                <span className="stat-label">Risk Level</span>
                <span
                  className="stat-value stat-badge"
                  style={{ backgroundColor: getRiskLevelColor(seismicAssessment.riskLevel) }}
                >
                  {seismicAssessment.riskLevel}
                </span>
              </div>
            </div>
          </section>

          {/* Impact Zones Section */}
          <section className="earthquake-impact-section">
            <h3>📍 Impact Zones</h3>
            <div className="earthquake-impact-zones">
              <div className="impact-zone severe">
                <div className="zone-header">
                  <span className="zone-label">🔴 Primary Impact Zone</span>
                  <span className="zone-desc">Severe Shaking (MMI ≥ 7)</span>
                </div>
                <div className="zone-stats">
                  <div>
                    <strong>Radius:</strong> {seismicAssessment.primaryImpactRadiusKm} km
                  </div>
                  <div>
                    <strong>Area:</strong> {seismicAssessment.primaryImpactAreaSqKm.toLocaleString()} km²
                  </div>
                  <div>
                    <strong>Population:</strong> ~{primaryZone.populationAffected.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="impact-zone moderate">
                <div className="zone-header">
                  <span className="zone-label">🟡 Secondary Impact Zone</span>
                  <span className="zone-desc">Moderate Shaking (MMI 5-7)</span>
                </div>
                <div className="zone-stats">
                  <div>
                    <strong>Radius:</strong> {seismicAssessment.secondaryImpactRadiusKm} km
                  </div>
                  <div>
                    <strong>Area:</strong> {seismicAssessment.secondaryImpactAreaSqKm.toLocaleString()} km²
                  </div>
                  <div>
                    <strong>Population:</strong> ~{secondaryZone.populationAffected.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="impact-zone felt">
                <div className="zone-header">
                  <span className="zone-label">🟢 Felt Radius</span>
                  <span className="zone-desc">Perceptible (MMI ≥ 3)</span>
                </div>
                <div className="zone-stats">
                  <div>
                    <strong>Radius:</strong> {seismicAssessment.feltRadiusKm} km
                  </div>
                  <div>
                    <strong>Area:</strong> {seismicAssessment.feltAreaSqKm.toLocaleString()} km²
                  </div>
                  <div>
                    <strong>Total Exposed:</strong> ~{seismicAssessment.estimatedPopulationExposed.toLocaleString()} people
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Infrastructure Assessment Section */}
          <section className="earthquake-impact-section">
            <h3>🏗️ Infrastructure in Affected Area</h3>
            
            <div className="infrastructure-category">
              <h4>🏢 Buildings</h4>
              <div className="earthquake-impact-grid-3">
                <div className="infra-stat">
                  <span className="infra-label">Residential</span>
                  <span className="infra-value">
                    {formatInfrastructureCount(totalInfrastructure.buildings.residential, 'building')}
                  </span>
                </div>
                <div className="infra-stat">
                  <span className="infra-label">Commercial</span>
                  <span className="infra-value">
                    {formatInfrastructureCount(totalInfrastructure.buildings.commercial, 'building')}
                  </span>
                </div>
                <div className="infra-stat">
                  <span className="infra-label">Industrial</span>
                  <span className="infra-value">
                    {formatInfrastructureCount(totalInfrastructure.buildings.industrial, 'building')}
                  </span>
                </div>
              </div>
              <div className="infra-total">
                <strong>Total Buildings:</strong> {formatInfrastructureCount(totalInfrastructure.buildings.total, 'building')}
              </div>
            </div>

            <div className="infrastructure-category">
              <h4>🚗 Transportation</h4>
              <div className="earthquake-impact-grid-3">
                <div className="infra-stat">
                  <span className="infra-label">Roads</span>
                  <span className="infra-value">{totalInfrastructure.transportation.roadLengthKm.toLocaleString()} km</span>
                </div>
                <div className="infra-stat">
                  <span className="infra-label">Bridges</span>
                  <span className="infra-value">
                    {formatInfrastructureCount(totalInfrastructure.transportation.bridges, 'bridge')}
                  </span>
                </div>
                <div className="infra-stat">
                  <span className="infra-label">Railways</span>
                  <span className="infra-value">{totalInfrastructure.transportation.railways.lengthKm} km</span>
                </div>
              </div>
            </div>

            <div className="infrastructure-category">
              <h4>🏥 Critical Facilities</h4>
              <div className="earthquake-impact-grid-3">
                <div className="infra-stat">
                  <span className="infra-label">Hospitals</span>
                  <span className="infra-value">{totalInfrastructure.criticalFacilities.hospitals}</span>
                </div>
                <div className="infra-stat">
                  <span className="infra-label">Schools</span>
                  <span className="infra-value">{totalInfrastructure.criticalFacilities.schools}</span>
                </div>
                <div className="infra-stat">
                  <span className="infra-label">Emergency Services</span>
                  <span className="infra-value">{totalInfrastructure.criticalFacilities.emergencyServices}</span>
                </div>
                <div className="infra-stat">
                  <span className="infra-label">Power Stations</span>
                  <span className="infra-value">{totalInfrastructure.criticalFacilities.powerStations}</span>
                </div>
                <div className="infra-stat">
                  <span className="infra-label">Water Plants</span>
                  <span className="infra-value">{totalInfrastructure.criticalFacilities.waterTreatmentPlants}</span>
                </div>
              </div>
            </div>

            <div className="infrastructure-category">
              <h4>⚡ Utilities</h4>
              <div className="earthquake-impact-grid-3">
                <div className="infra-stat">
                  <span className="infra-label">Power Lines</span>
                  <span className="infra-value">{totalInfrastructure.utilities.electricityLines.toLocaleString()} km</span>
                </div>
                <div className="infra-stat">
                  <span className="infra-label">Water Pipes</span>
                  <span className="infra-value">{totalInfrastructure.utilities.waterPipes.toLocaleString()} km</span>
                </div>
                <div className="infra-stat">
                  <span className="infra-label">Cell Towers</span>
                  <span className="infra-value">{totalInfrastructure.utilities.communicationTowers}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Critical Infrastructure at Risk */}
          <section className="earthquake-impact-section">
            <h3>⚠️ Critical Infrastructure at Risk</h3>
            <div className="critical-infra-alert">
              {criticalInfraAtRisk.map((item, index) => (
                <div key={index} className="critical-infra-item">
                  <span className="critical-icon">🔴</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Economic Impact */}
          <section className="earthquake-impact-section">
            <h3>💰 Estimated Economic Loss</h3>
            <div className="economic-loss-range">
              <div className="loss-estimate">
                <span className="loss-label">Low Estimate</span>
                <span className="loss-value">{formatCurrency(estimatedEconomicLoss.low, estimatedEconomicLoss.currency)}</span>
              </div>
              <div className="loss-estimate primary">
                <span className="loss-label">Medium Estimate</span>
                <span className="loss-value">{formatCurrency(estimatedEconomicLoss.medium, estimatedEconomicLoss.currency)}</span>
              </div>
              <div className="loss-estimate">
                <span className="loss-label">High Estimate</span>
                <span className="loss-value">{formatCurrency(estimatedEconomicLoss.high, estimatedEconomicLoss.currency)}</span>
              </div>
            </div>
            <p className="economic-disclaimer">
              *Estimates based on statistical models and global averages. Actual losses may vary significantly based on local
              construction quality, preparedness, and response effectiveness.
            </p>
          </section>

          {/* Intensity Details */}
          <section className="earthquake-impact-section">
            <h3>📉 Intensity Attenuation</h3>
            <div className="intensity-zones-list">
              {seismicAssessment.intensityZones.slice(0, 6).map((zone, index) => (
                <div key={index} className="intensity-zone-item">
                  <span
                    className="intensity-badge"
                    style={{ backgroundColor: getIntensityColor(zone.intensityLevel) }}
                  >
                    MMI {zone.intensityLevel.toFixed(1)}
                  </span>
                  <div className="intensity-details">
                    <div><strong>{zone.shakeIntensity}</strong> at {zone.radiusKm} km</div>
                    <div className="intensity-desc">{zone.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Disclaimer */}
          <section className="earthquake-impact-disclaimer">
            <p>
              <strong>Note:</strong> This assessment uses simplified seismic attenuation models and statistical infrastructure density
              estimates. For precise impact analysis, consult with local seismologists and use region-specific GIS data. Infrastructure
              counts are approximate and based on global averages.
            </p>
          </section>
        </div>

        <div className="earthquake-impact-footer">
          <button className="btn-primary" onClick={onClose}>
            Close Assessment
          </button>
        </div>
      </div>
    </div>
  )
}
