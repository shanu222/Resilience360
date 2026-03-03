import { analyzeNEAT, getNEATMetadata } from './neat.service.mjs';

/**
 * Validate NEAT input data
 */
const validateNEATInput = (body) => {
  const errors = [];
  
  // Check required fields
  if (!body.district) {
    errors.push('district is required');
  }
  
  if (!body.hazardType) {
    errors.push('hazardType is required');
  }
  
  if (!body.infrastructureType) {
    errors.push('infrastructureType is required');
  }
  
  // Validate numeric fields if provided
  if (body.populationExposed && isNaN(Number(body.populationExposed))) {
    errors.push('populationExposed must be a valid number');
  }
  
  if (body.assetValue && isNaN(Number(body.assetValue))) {
    errors.push('assetValue must be a valid number');
  }
  
  if (body.infrastructureLength && isNaN(Number(body.infrastructureLength))) {
    errors.push('infrastructureLength must be a valid number');
  }
  
  if (body.vulnerabilityScore && (isNaN(Number(body.vulnerabilityScore)) || Number(body.vulnerabilityScore) < 0 || Number(body.vulnerabilityScore) > 100)) {
    errors.push('vulnerabilityScore must be a number between 0 and 100');
  }
  
  return errors;
};

/**
 * POST /api/neat/analyze
 * Analyzes infrastructure network exposure to hazards
 * 
 * Request body:
 * {
 *   district: string (required)
 *   hazardType: string (required) - e.g., "earthquake", "flood", "typhoon"
 *   infrastructureType: string (required) - e.g., "road", "bridge", "water"
 *   location?: string
 *   infrastructureName?: string
 *   infrastructureLength?: number (km)
 *   infrastructureArea?: number (km²)
 *   populationExposed?: number
 *   dependentPopulation?: number
 *   assetValue?: number (currency)
 *   assetsAtRisk?: string
 *   populationServed?: number
 *   serviceType?: string
 *   vulnerabilityScore?: number (0-100)
 *   coping_capacity?: number (0-100)
 *   adaptive_capacity?: number (0-100)
 * }
 * 
 * Response:
 * {
 *   ok: boolean
 *   assessmentId: string
 *   timestamp: string
 *   inputs: {...}
 *   results: {
 *     exposure: {...}
 *     vulnerability: {...}
 *     risk: {...}
 *     recommendations: string[]
 *   }
 * }
 */
export const handleNEATAnalyze = async (req, res) => {
  try {
    const body = req.body || {};
    
    // Validate input
    const validationErrors = validateNEATInput(body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid input',
        details: validationErrors
      });
    }
    
    // Perform analysis
    const result = await analyzeNEAT(body);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('NEAT API Error:', error);
    
    return res.status(500).json({
      ok: false,
      error: error.message || 'NEAT analysis failed',
      suggestion: 'Ensure all required fields are provided and the Excel file is properly configured'
    });
  }
};

/**
 * GET /api/neat/metadata
 * Returns available options and metadata for NEAT tool
 */
export const handleNEATMetadata = async (_req, res) => {
  try {
    const metadata = getNEATMetadata();
    return res.status(200).json(metadata);
  } catch (error) {
    console.error('NEAT Metadata Error:', error);
    
    return res.status(500).json({
      ok: false,
      error: 'Failed to retrieve NEAT metadata'
    });
  }
};

export default {
  handleNEATAnalyze,
  handleNEATMetadata
};
