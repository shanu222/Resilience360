# Earthquake Impact Assessment Feature

## Overview
The Earthquake Live Monitor now includes a comprehensive seismic impact assessment system that analyzes the affected area and infrastructure when users click on earthquake events.

## Features

### 🌍 Seismic Impact Analysis
When clicking on an earthquake marker on the globe, the system:

1. **Calculates Intensity Attenuation**
   - Uses Ground Motion Prediction Equations (GMPE)
   - Implements Modified Mercalli Intensity (MMI) scale
   - Accounts for magnitude, depth, and distance from epicenter

2. **Defines Impact Zones**
   - **Primary Zone**: Severe shaking (MMI ≥ 7) - likely structural damage
   - **Secondary Zone**: Moderate shaking (MMI 5-7) - noticeable effects
   - **Felt Radius**: Perceptible shaking (MMI ≥ 3) - felt by people

3. **Estimates Population Exposure**
   - Calculates affected population in each zone
   - Adjusts for regional population density patterns

### 🏗️ Infrastructure Assessment
The system quantifies infrastructure in the affected zones:

#### Building Inventory
- Residential buildings
- Commercial structures
- Industrial facilities

#### Transportation Infrastructure
- Road network length (km)
- Number of bridges
- Railway infrastructure (length and stations)

#### Critical Facilities
- Hospitals
- Schools
- Emergency services
- Power stations
- Water treatment plants

#### Utilities
- Electricity transmission lines
- Water distribution pipes
- Communication towers

### 💰 Economic Impact Estimation
- Provides low, medium, and high loss estimates
- Accounts for risk level and damage potential
- Calculates infrastructure replacement values

### ⚠️ Risk Assessment
- Identifies critical infrastructure at risk
- Highlights hospitals, schools, and emergency services in danger zones
- Provides actionable risk information

## Technical Implementation

### Files Created
1. **`src/services/seismicImpact.ts`**
   - Implements intensity attenuation models
   - Calculates shake radii for different intensity thresholds
   - Determines risk levels and impact zones

2. **`src/services/infrastructureAssessment.ts`**
   - Estimates infrastructure density based on population models
   - Calculates asset counts using infrastructure-to-population ratios
   - Provides economic loss estimates

3. **`src/components/EarthquakeImpactDetails.tsx`**
   - Modal component displaying assessment results
   - Interactive visualization of impact zones
   - Detailed infrastructure breakdown

4. **`src/components/EarthquakeImpactDetails.css`**
   - Styled modal interface
   - Responsive design for all screen sizes
   - Print-friendly layout

### Updated Files
- **`src/components/GlobalEarthquakeGlobe.tsx`**
  - Integrated impact calculation on earthquake click
  - Added modal state management
  - Enhanced click handlers for both globe and list views

## Scientific Models Used

### Intensity Attenuation Model
The system uses a simplified GMPE based on the Gutenberg-Richter relationship:

```
MMI = a + b*M - c*log10(R + depth_factor)
```

Where:
- **MMI**: Modified Mercalli Intensity
- **M**: Earthquake magnitude
- **R**: Distance from epicenter (km)
- **depth_factor**: Depth correction factor
- **a, b, c**: Calibrated attenuation parameters

### Infrastructure Density Models
Infrastructure estimates use:
- Population density models
- Infrastructure-to-population ratios (based on global averages)
- Regional development multipliers
- Critical facility distribution patterns

### Damage Assessment
Economic loss calculations incorporate:
- MMI-based damage curves
- Risk level modifiers
- Infrastructure replacement costs
- Uncertainty ranges (low/medium/high estimates)

## Usage

### For End Users
1. Open the Earthquake Live Monitor
2. Click on any earthquake marker on the globe OR click on an event in the Recent Activity list
3. View the comprehensive impact assessment modal showing:
   - Event overview (magnitude, depth, intensity, risk level)
   - Impact zone details with radii and affected populations
   - Complete infrastructure inventory
   - Critical facilities at risk
   - Economic loss estimates
   - Intensity attenuation details

### Interpreting Results

#### Risk Levels
- **Extreme**: Major damage expected, immediate emergency response required
- **Very High**: Significant damage likely, prepare emergency services
- **High**: Notable damage possible, monitor situation closely
- **Moderate**: Minor damage possible, limited response needed
- **Low**: Minimal impact expected

#### Modified Mercalli Intensity (MMI)
- **I-II**: Not felt or barely perceptible
- **III-IV**: Felt indoors, hanging objects swing
- **V-VI**: Felt by everyone, slight damage to weak structures
- **VII-VIII**: Damage to ordinary buildings, chimneys fall
- **IX-X**: Most structures destroyed, ground cracks
- **XI-XII**: Total destruction, waves in ground

## Limitations and Disclaimers

### Model Assumptions
1. **Simplified Attenuation**: Uses generalized GMPE; actual ground motion varies by:
   - Local geology and soil conditions
   - Topography and basin effects
   - Fault rupture characteristics

2. **Statistical Infrastructure Estimates**: Counts based on:
   - Global population density averages
   - Standard infrastructure-to-population ratios
   - Simplified urban/suburban/rural classifications
   - NOT actual GIS or census data

3. **Population Estimates**: Uses simplified density models; actual populations vary significantly by region

4. **Economic Valuations**: Based on global average construction costs; regional variations can be substantial

### Recommendations for Production Use
For more accurate assessments:
- Integrate real GIS infrastructure databases (OpenStreetMap, local government data)
- Use region-specific Ground Motion Prediction Equations
- Incorporate actual population census data
- Apply local construction cost databases
- Add soil amplification models
- Include building vulnerability functions based on construction types
- Integrate with real-time ShakeMap data from seismic networks

## Future Enhancements

### Planned Features
- [ ] Integration with real-time ShakeMap data
- [ ] Building vulnerability assessment by construction type
- [ ] Casualty estimation models
- [ ] Liquefaction susceptibility mapping
- [ ] Landslide trigger analysis
- [ ] Aftershock probability forecasting
- [ ] Historical comparison with past events
- [ ] Export reports as PDF/Word documents
- [ ] Social media sharing of assessments
- [ ] Mobile push notifications for high-risk events

### Data Source Integration Possibilities
- OpenStreetMap for real infrastructure data
- NASA SEDAC for population density
- USGS ShakeMap for empirical ground motion
- Global Earthquake Model (GEM) for vulnerability functions
- World Bank data for economic valuations

## API Reference

### `calculateSeismicImpact(magnitude, depthKm, lat, lng)`
Calculates seismic impact zones and intensity distribution.

**Parameters:**
- `magnitude` (number): Earthquake magnitude (Richter/moment magnitude)
- `depthKm` (number): Focal depth in kilometers
- `lat` (number): Epicenter latitude
- `lng` (number): Epicenter longitude

**Returns:** `SeismicImpactAssessment` object with zones, intensities, and risk levels

### `assessInfrastructureImpact(seismicAssessment)`
Estimates infrastructure in affected zones.

**Parameters:**
- `seismicAssessment` (SeismicImpactAssessment): Output from `calculateSeismicImpact()`

**Returns:** `InfrastructureImpactAssessment` object with building counts, critical facilities, and economic estimates

## Credits

### Scientific References
- Modified Mercalli Intensity Scale (USGS)
- Ground Motion Prediction Equations (GMPE) literature
- Gutenberg-Richter attenuation relationships
- Infrastructure resilience research

### Development
- Seismic impact models: GitHub Copilot
- Infrastructure assessment algorithms: Based on global averages and research
- UI/UX design: Modern responsive modal interface

## License
Part of Resilience360 project - Disaster resilience and preparedness platform

---

**Note**: This feature provides rapid, automated estimates for situational awareness. For detailed engineering analysis and emergency response planning, consult with professional seismologists, structural engineers, and local authorities.
