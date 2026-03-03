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
    const errorMessage = error.message || 'NEAT analysis failed';
    console.error('NEAT API Error:', errorMessage);
    
    // Check if this is a file not found error
    const isFileError = errorMessage.includes('not found') || errorMessage.includes('not available');
    const statusCode = isFileError ? 503 : 500;
    const responseStatus = isFileError ? 'unavailable' : 'error';
    
    return res.status(statusCode).json({
      ok: false,
      status: responseStatus,
      error: errorMessage,
      ...(isFileError && {
        message: 'NEAT service is not available in this deployment. The Excel file is missing.',
        suggestion: 'Contact administrator to ensure the Network Exposure and Assessment Tool files are deployed.'
      })
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
    const errorMessage = error.message || 'Failed to retrieve NEAT metadata';
    console.error('NEAT Metadata Error:', errorMessage);
    
    // Check if this is a file not found error
    const isFileError = errorMessage.includes('not found') || errorMessage.includes('not available');
    const statusCode = isFileError ? 503 : 500;
    
    return res.status(statusCode).json({
      ok: false,
      status: isFileError ? 'unavailable' : 'error',
      error: errorMessage,
      ...(isFileError && {
        message: 'NEAT service is not available in this deployment.',
        available: false
      })
    });
  }
};

export default {
  handleNEATAnalyze,
  handleNEATMetadata
};
