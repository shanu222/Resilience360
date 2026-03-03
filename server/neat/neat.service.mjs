import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'import.meta.url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEAT_FILE_PATH = path.join(__dirname, '../../Network Exposure and Assesment Tool/07.04 Neat+ 08-12-v6 (Excel Data Entry) English.xlsm');

/**
 * Parse hazard types from user input
 * Maps common hazard names to NEAT expected format
 */
const parseHazardType = (hazardInput) => {
  const hazardMap = {
    'earthquake': 'Earthquake',
    'flood': 'Flood',
    'typhoon': 'Typhoon/Cyclone',
    'cyclone': 'Typhoon/Cyclone',
    'landslide': 'Landslide',
    'drought': 'Drought',
    'heatwave': 'Heat',
    'cold': 'Cold',
    'wind': 'High Wind'
  };
  
  return hazardMap[String(hazardInput).toLowerCase().trim()] || String(hazardInput);
};

/**
 * Parse infrastructure types
 */
const parseInfrastructureType = (infraInput) => {
  const infraMap = {
    'road': 'Road',
    'bridge': 'Bridge',
    'water': 'Water',
    'power': 'Power/Energy',
    'communication': 'Communication',
    'health': 'Health',
    'education': 'Education',
    'shelter': 'Shelter'
  };
  
  return infraMap[String(infraInput).toLowerCase().trim()] || String(infraInput);
};

/**
 * Load NEAT Excel workbook
 */
const loadNEATWorkbook = async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(NEAT_FILE_PATH);
    return workbook;
  } catch (error) {
    console.error('Failed to load NEAT Excel file:', error.message);
    throw new Error(`Cannot load NEAT tool: ${error.message}`);
  }
};

/**
 * Map input fields to Excel cell references
 * This maps to the standard NEAT input worksheet
 */
const getInputCellMapping = () => {
  return {
    // Assessment metadata
    assessmentDate: 'B2',
    district: 'B3',
    location: 'B4',
    
    // Hazard information
    hazardType: 'B6',
    hazardSeverity: 'B7', // Low, Medium, High
    hazardFrequency: 'B8', // Rare, Sometimes, Often
    
    // Infrastructure details
    infrastructureType: 'B10',
    infrastructureName: 'B11',
    infrastructureLength: 'B12', // in km
    infrastructureArea: 'B13', // in km² or units
    
    // Population exposure
    populationExposed: 'B15',
    dependentPopulation: 'B16', // Children, elderly, disabled
    
    // Asset exposure
    assetValue: 'B18', // in currency
    assetsAtRisk: 'B19',
    
    // Service exposure
    populationServed: 'B21',
    serviceType: 'B22',
    
    // Vulnerability factors
    vulnerabilityScore: 'B24', // 0-100
    coping_capacity: 'B25', // 0-100
    adaptive_capacity: 'B26' // 0-100
  };
};

/**
 * Get output cell references from NEAT
 */
const getOutputCellMapping = () => {
  return {
    // Results sheet (usually a separate worksheet)
    totalExposure: 'Results!B5',
    exposureLevel: 'Results!B6', // Low, Medium, High, Critical
    
    populationRisk: 'Results!B8',
    assetRisk: 'Results!B9',
    serviceRisk: 'Results!B10',
    
    vulnerabilityLevel: 'Results!B12',
    riskScore: 'Results!B13', // 0-100
    riskCategory: 'Results!B14', // Low, Medium, High, Critical
    
    recommendations: 'Results!B16' // Mitigation recommendations
  };
};

/**
 * Insert data into NEAT workbook
 */
const insertInputsToWorkbook = async (workbook, inputs) => {
  const worksheet = workbook.getWorksheet('Data Entry') || workbook.worksheets[0];
  
  if (!worksheet) {
    throw new Error('NEAT Data Entry worksheet not found');
  }
  
  const cellMapping = getInputCellMapping();
  
  // Insert each input into corresponding cell
  if (inputs.assessmentDate) {
    worksheet.getCell(cellMapping.assessmentDate).value = new Date(inputs.assessmentDate);
  }
  
  if (inputs.district) {
    worksheet.getCell(cellMapping.district).value = inputs.district;
  }
  
  if (inputs.location) {
    worksheet.getCell(cellMapping.location).value = inputs.location;
  }
  
  if (inputs.hazardType) {
    worksheet.getCell(cellMapping.hazardType).value = parseHazardType(inputs.hazardType);
  }
  
  if (inputs.hazardSeverity) {
    worksheet.getCell(cellMapping.hazardSeverity).value = inputs.hazardSeverity;
  }
  
  if (inputs.hazardFrequency) {
    worksheet.getCell(cellMapping.hazardFrequency).value = inputs.hazardFrequency;
  }
  
  if (inputs.infrastructureType) {
    worksheet.getCell(cellMapping.infrastructureType).value = parseInfrastructureType(inputs.infrastructureType);
  }
  
  if (inputs.infrastructureName) {
    worksheet.getCell(cellMapping.infrastructureName).value = inputs.infrastructureName;
  }
  
  if (inputs.infrastructureLength) {
    worksheet.getCell(cellMapping.infrastructureLength).value = Number(inputs.infrastructureLength) || 0;
  }
  
  if (inputs.infrastructureArea) {
    worksheet.getCell(cellMapping.infrastructureArea).value = Number(inputs.infrastructureArea) || 0;
  }
  
  if (inputs.populationExposed) {
    worksheet.getCell(cellMapping.populationExposed).value = Number(inputs.populationExposed) || 0;
  }
  
  if (inputs.dependentPopulation) {
    worksheet.getCell(cellMapping.dependentPopulation).value = Number(inputs.dependentPopulation) || 0;
  }
  
  if (inputs.assetValue) {
    worksheet.getCell(cellMapping.assetValue).value = Number(inputs.assetValue) || 0;
  }
  
  if (inputs.assetsAtRisk) {
    worksheet.getCell(cellMapping.assetsAtRisk).value = inputs.assetsAtRisk;
  }
  
  if (inputs.populationServed) {
    worksheet.getCell(cellMapping.populationServed).value = Number(inputs.populationServed) || 0;
  }
  
  if (inputs.serviceType) {
    worksheet.getCell(cellMapping.serviceType).value = inputs.serviceType;
  }
  
  if (inputs.vulnerabilityScore !== undefined) {
    worksheet.getCell(cellMapping.vulnerabilityScore).value = Number(inputs.vulnerabilityScore) || 0;
  }
  
  if (inputs.coping_capacity !== undefined) {
    worksheet.getCell(cellMapping.coping_capacity).value = Number(inputs.coping_capacity) || 0;
  }
  
  if (inputs.adaptive_capacity !== undefined) {
    worksheet.getCell(cellMapping.adaptive_capacity).value = Number(inputs.adaptive_capacity) || 0;
  }
};

/**
 * Extract results from NEAT workbook
 */
const extractResults = async (workbook) => {
  const resultsWorksheet = workbook.getWorksheet('Results');
  
  if (!resultsWorksheet) {
    console.warn('Results worksheet not found, attempting first worksheet');
  }
  
  const worksheet = resultsWorksheet || workbook.worksheets[0];
  const cellMapping = getOutputCellMapping();
  
  const results = {
    totalExposure: 0,
    exposureLevel: 'Unknown',
    populationRisk: 0,
    assetRisk: 0,
    serviceRisk: 0,
    vulnerabilityLevel: 'Unknown',
    riskScore: 0,
    riskCategory: 'Unknown',
    recommendations: ''
  };
  
  try {
    // Try to extract from Results sheet first, then fallback to Data Entry sheet
    results.totalExposure = worksheet.getCell('B5')?.value || 0;
    results.exposureLevel = worksheet.getCell('B6')?.value || 'Unknown';
    results.populationRisk = worksheet.getCell('B8')?.value || 0;
    results.assetRisk = worksheet.getCell('B9')?.value || 0;
    results.serviceRisk = worksheet.getCell('B10')?.value || 0;
    results.vulnerabilityLevel = worksheet.getCell('B12')?.value || 'Unknown';
    results.riskScore = worksheet.getCell('B13')?.value || 0;
    results.riskCategory = worksheet.getCell('B14')?.value || 'Unknown';
    results.recommendations = worksheet.getCell('B16')?.value || '';
  } catch (error) {
    console.error('Error extracting results:', error.message);
  }
  
  return results;
};

/**
 * Main NEAT analysis function
 * Accepts user inputs and returns risk assessment results
 */
export const analyzeNEAT = async (inputs) => {
  if (!inputs || typeof inputs !== 'object') {
    throw new Error('Input data must be a valid object');
  }
  
  // Validate required fields
  if (!inputs.district) {
    throw new Error('District is required');
  }
  
  if (!inputs.hazardType) {
    throw new Error('Hazard type is required');
  }
  
  if (!inputs.infrastructureType) {
    throw new Error('Infrastructure type is required');
  }
  
  try {
    // Load workbook
    const workbook = await loadNEATWorkbook();
    
    // Insert user inputs
    await insertInputsToWorkbook(workbook, inputs);
    
    // Force recalculation of formulas
    workbook.recalculate();
    
    // Extract results
    const results = await extractResults(workbook);
    
    // Return structured response
    return {
      ok: true,
      assessmentId: `NEAT_${Date.now()}`,
      timestamp: new Date().toISOString(),
      inputs: {
        district: inputs.district,
        location: inputs.location || 'Not specified',
        hazardType: parseHazardType(inputs.hazardType),
        infrastructureType: parseInfrastructureType(inputs.infrastructureType),
        infrastructureName: inputs.infrastructureName || 'Not specified'
      },
      results: {
        exposure: {
          total: results.totalExposure,
          level: results.exposureLevel,
          population: results.populationRisk,
          assets: results.assetRisk,
          services: results.serviceRisk
        },
        vulnerability: {
          level: results.vulnerabilityLevel,
          score: results.vulnerabilityScore || 0
        },
        risk: {
          score: results.riskScore,
          category: results.riskCategory
        },
        recommendations: results.recommendations ? String(results.recommendations).split('\n') : []
      }
    };
  } catch (error) {
    console.error('NEAT analysis error:', error);
    throw new Error(`NEAT Analysis Failed: ${error.message}`);
  }
};

/**
 * Get NEAT metadata and available options
 */
export const getNEATMetadata = () => {
  return {
    ok: true,
    version: '8.12-v6',
    toolName: 'Network Exposure and Assessment Tool',
    description: 'Evaluates exposure and risk of infrastructure networks to natural hazards',
    supportedHazards: [
      'Earthquake',
      'Flood',
      'Typhoon/Cyclone',
      'Landslide',
      'Drought',
      'Heat',
      'Cold',
      'High Wind'
    ],
    supportedInfrastructure: [
      'Road',
      'Bridge',
      'Water',
      'Power/Energy',
      'Communication',
      'Health',
      'Education',
      'Shelter'
    ],
    hazardSeverityLevels: ['Low', 'Medium', 'High', 'Critical'],
    hazardFrequencyLevels: ['Rare', 'Sometimes', 'Often'],
    riskCategories: ['Low', 'Medium', 'High', 'Critical'],
    requiredFields: [
      'district',
      'hazardType',
      'infrastructureType'
    ]
  };
};

export default {
  analyzeNEAT,
  getNEATMetadata
};
