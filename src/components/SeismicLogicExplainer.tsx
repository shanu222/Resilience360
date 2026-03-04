import './SeismicLogicExplainer.css'

type SeismicLogicExplainerProps = {
  onClose: () => void
}

export default function SeismicLogicExplainer({ onClose }: SeismicLogicExplainerProps) {
  return (
    <div className="logic-explainer-overlay" onClick={onClose}>
      <div className="logic-explainer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logic-explainer-header">
          <h3>📐 Seismic Calculation Logic</h3>
          <button className="logic-explainer-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="logic-explainer-content">
          {/* Intensity Calculation */}
          <section className="logic-section">
            <h4>🌊 Ground Motion Intensity (GMPE)</h4>
            <div className="logic-formula">
              <code>MMI = a + b×M - c×log₁₀(R + depth_factor)</code>
            </div>
            <p className="logic-description">
              Modified Gutenberg-Richter attenuation model calculates Modified Mercalli Intensity (MMI) at any distance from epicenter.
            </p>
            <ul className="logic-params">
              <li><strong>a = 1.5</strong> – Baseline intensity coefficient</li>
              <li><strong>b = 1.5</strong> – Magnitude scaling factor</li>
              <li><strong>c = 3.5</strong> – Distance attenuation coefficient</li>
              <li><strong>M</strong> – Earthquake magnitude</li>
              <li><strong>R</strong> – Distance from epicenter (km)</li>
              <li><strong>depth_factor = max(1, depth × 0.3)</strong> – Depth correction</li>
            </ul>
          </section>

          {/* Impact Zones */}
          <section className="logic-section">
            <h4>📍 Impact Zone Thresholds</h4>
            <ul className="logic-zones">
              <li>
                <strong>Primary Zone:</strong> MMI ≥ 7 (Building damage begins)
              </li>
              <li>
                <strong>Secondary Zone:</strong> MMI ≥ 5 (Widely felt, minor damage)
              </li>
              <li>
                <strong>Felt Zone:</strong> MMI ≥ 3 (Perceptible shaking)
              </li>
            </ul>
            <p className="logic-description">
              Radius calculated via binary search to find distance where intensity equals threshold.
            </p>
          </section>

          {/* Area Calculation */}
          <section className="logic-section">
            <h4>📏 Impact Area Calculation</h4>
            <div className="logic-formula">
              <code>Area = π × radius²</code>
            </div>
            <p className="logic-description">
              Each impact zone is modeled as a circular area centered on epicenter. All measurements in square kilometers.
            </p>
          </section>

          {/* Population Estimation */}
          <section className="logic-section">
            <h4>👥 Population Exposure Estimation</h4>
            <div className="logic-formula">
              <code>Population = Felt Area (km²) × Density</code>
            </div>
            <ul className="logic-params">
              <li><strong>Global average density:</strong> 60 people/km²</li>
              <li><strong>Magnitude ≥ 6:</strong> 30 people/km² (larger events in less populated areas)</li>
              <li>Applied only to felt radius area (MMI ≥ 3)</li>
            </ul>
          </section>

          {/* Infrastructure Counting */}
          <section className="logic-section">
            <h4>🏢 Infrastructure Estimation Method</h4>
            <div className="logic-subsection">
              <strong>Residential Buildings</strong>
              <code>Buildings = Population ÷ 4 persons/unit × 250 units/1000 people</code>
            </div>
            <div className="logic-subsection">
              <strong>Transportation Infrastructure</strong>
              <code>Roads (km) = Area × 150 km/km²</code>
              <code>Bridges = Area × 0.8 bridges/km²</code>
            </div>
            <div className="logic-subsection">
              <strong>Critical Facilities per 100,000 people</strong>
              <ul>
                <li>Hospitals: 1.5</li>
                <li>Schools: 25</li>
                <li>Emergency Services: 3</li>
              </ul>
            </div>
          </section>

          {/* Risk Level */}
          <section className="logic-section">
            <h4>⚠️ Risk Level Determination</h4>
            <ul className="logic-risk">
              <li><strong>Extreme:</strong> M ≥ 7.0 or MMI ≥ 9</li>
              <li><strong>Very High:</strong> M ≥ 6.0 or MMI ≥ 7.5</li>
              <li><strong>High:</strong> M ≥ 5.0 or MMI ≥ 6.0</li>
              <li><strong>Moderate:</strong> M ≥ 4.0 or MMI ≥ 4.5</li>
              <li><strong>Low:</strong> M &lt; 4.0</li>
            </ul>
          </section>

          {/* Assumptions */}
          <section className="logic-section logic-section-last">
            <h4>📋 Assumptions & Limitations</h4>
            <ul className="logic-assumptions">
              <li>Circular impact zones centered on epicenter</li>
              <li>Uniform population and infrastructure distribution</li>
              <li>Global average density used (not actual regional data)</li>
              <li>Linear infrastructure density ratios applied</li>
              <li>No topographic or geological considerations</li>
              <li>Infrastructure ratios based on global averages</li>
              <li>Simplified attenuation model for general use</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
