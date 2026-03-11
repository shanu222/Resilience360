export interface MaterialHub {
  id: string;
  name: string;
  location: string;
  district: string;
  coordinates: [number, number];
  capacity: number; // homes that can be reconstructed
  status: 'ready' | 'moderate' | 'critical';
  stockPercentage: number;
  damagePercentage: number;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  opening: number;
  received: number;
  issued: number;
  closing: number;
  damaged: number;
  percentageRemaining: number;
}

export interface HubInventory {
  hubId: string;
  hubName: string;
  materials: Material[];
  lastUpdated: string;
}

export interface IssuanceRequest {
  id: string;
  requestNumber: string;
  pdmaOffice: string;
  district: string;
  assessmentType: string;
  requestedMaterials: { materialId: string; materialName: string; quantity: number }[];
  status: 'pending' | 'approved' | 'dispatched' | 'completed' | 'rejected';
  requestDate: string;
  approvalDate?: string;
  dispatchDate?: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface DamageReport {
  id: string;
  hubId: string;
  hubName: string;
  materialId: string;
  materialName: string;
  damagedCount: number;
  totalCount: number;
  reason: string;
  reportDate: string;
  photos?: string[];
  financialLoss: number;
  urgencyLevel: 'high' | 'medium' | 'low';
}

export interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  duration: string;
  location: string;
  startDate: string;
  capacity: number;
  enrolled: number;
  topics: string[];
}

export interface Partner {
  id: string;
  name: string;
  type: 'CSR' | 'NGO' | 'Government' | 'International';
  contribution: string;
  logo?: string;
}

// Mock Data
export const mockHubs: MaterialHub[] = [
  {
    id: 'gb1',
    name: 'Gilgit Material Hub',
    location: 'Gilgit',
    district: 'Gilgit-Baltistan',
    coordinates: [35.9208, 74.3080],
    capacity: 200,
    status: 'ready',
    stockPercentage: 92,
    damagePercentage: 2,
  },
  {
    id: 'mzg1',
    name: 'Muzaffargarh Material Hub',
    location: 'Muzaffargarh',
    district: 'Muzaffargarh',
    coordinates: [30.0704, 71.1932],
    capacity: 200,
    status: 'moderate',
    stockPercentage: 68,
    damagePercentage: 12,
  },
  {
    id: 'sukkur1',
    name: 'Sukkur Material Hub',
    location: 'Sukkur',
    district: 'Sukkur',
    coordinates: [27.7052, 68.8574],
    capacity: 200,
    status: 'critical',
    stockPercentage: 54,
    damagePercentage: 18,
  },
];

export const mockInventory: HubInventory[] = [
  {
    hubId: 'gb1',
    hubName: 'Gilgit Material Hub',
    lastUpdated: '2026-03-11',
    materials: [
      { id: 'm1', name: 'Bamboos (for Joist)', unit: 'pieces', opening: 1070, received: 0, issued: 0, closing: 1070, damaged: 0, percentageRemaining: 100 },
      { id: 'm2', name: 'Bamboo (for Purlins & Walls)', unit: 'pieces', opening: 2540, received: 0, issued: 0, closing: 2540, damaged: 0, percentageRemaining: 100 },
      { id: 'm3', name: 'Bamboo (for Ring Beams)', unit: 'pieces', opening: 1070, received: 0, issued: 0, closing: 1070, damaged: 0, percentageRemaining: 100 },
      { id: 'm4', name: 'Wooden Stick Chick Mat', unit: 'mats', opening: 870, received: 0, issued: 0, closing: 870, damaged: 0, percentageRemaining: 100 },
      { id: 'm5', name: 'Polythene Sheet', unit: 'sheets', opening: 140, received: 0, issued: 0, closing: 140, damaged: 0, percentageRemaining: 100 },
      { id: 'm6', name: 'Cotton Rope (KG)', unit: 'kg', opening: 13, received: 0, issued: 0, closing: 13, damaged: 0, percentageRemaining: 100 },
      { id: 'm7', name: 'Steel Girder (H Beam)', unit: 'beams', opening: 35, received: 0, issued: 0, closing: 35, damaged: 0, percentageRemaining: 100 },
      { id: 'm8', name: 'CGI Sheets', unit: 'sheets', opening: 400, received: 0, issued: 0, closing: 400, damaged: 0, percentageRemaining: 100 },
      { id: 'm9', name: 'Wooden Planks 1', unit: 'planks', opening: 170, received: 0, issued: 0, closing: 170, damaged: 0, percentageRemaining: 100 },
      { id: 'm10', name: 'Wooden Planks 2', unit: 'planks', opening: 170, received: 0, issued: 0, closing: 170, damaged: 0, percentageRemaining: 100 },
      { id: 'm11', name: 'EPS Panels', unit: 'panels', opening: 340, received: 0, issued: 0, closing: 340, damaged: 0, percentageRemaining: 100 },
      { id: 'm12', name: 'Pallets', unit: 'pallets', opening: 200, received: 0, issued: 0, closing: 200, damaged: 0, percentageRemaining: 100 },
    ],
  },
  {
    hubId: 'mzg1',
    hubName: 'Muzaffargarh Material Hub',
    lastUpdated: '2026-03-11',
    materials: [
      { id: 'm1', name: 'Bamboos (for Joist)', unit: 'pieces', opening: 1070, received: 0, issued: 0, closing: 1070, damaged: 0, percentageRemaining: 100 },
      { id: 'm2', name: 'Bamboo (for Purlins & Walls)', unit: 'pieces', opening: 2530, received: 0, issued: 0, closing: 2530, damaged: 0, percentageRemaining: 100 },
      { id: 'm3', name: 'Bamboo (for Ring Beams)', unit: 'pieces', opening: 1070, received: 0, issued: 0, closing: 1070, damaged: 0, percentageRemaining: 100 },
      { id: 'm4', name: 'Wooden Stick Chick Mat', unit: 'mats', opening: 870, received: 0, issued: 0, closing: 870, damaged: 0, percentageRemaining: 100 },
      { id: 'm5', name: 'Polythene Sheet', unit: 'sheets', opening: 130, received: 0, issued: 0, closing: 130, damaged: 0, percentageRemaining: 100 },
      { id: 'm6', name: 'Cotton Rope (KG)', unit: 'kg', opening: 14, received: 0, issued: 0, closing: 14, damaged: 0, percentageRemaining: 100 },
      { id: 'm7', name: 'Steel Girder (H Beam)', unit: 'beams', opening: 30, received: 0, issued: 0, closing: 30, damaged: 0, percentageRemaining: 100 },
      { id: 'm8', name: 'CGI Sheets', unit: 'sheets', opening: 200, received: 0, issued: 0, closing: 200, damaged: 0, percentageRemaining: 100 },
      { id: 'm9', name: 'Wooden Planks 1', unit: 'planks', opening: 170, received: 0, issued: 0, closing: 170, damaged: 0, percentageRemaining: 100 },
      { id: 'm10', name: 'Wooden Planks 2', unit: 'planks', opening: 170, received: 0, issued: 0, closing: 170, damaged: 0, percentageRemaining: 100 },
      { id: 'm11', name: 'EPS Panels', unit: 'panels', opening: 330, received: 0, issued: 0, closing: 330, damaged: 0, percentageRemaining: 100 },
      { id: 'm12', name: 'Pallets', unit: 'pallets', opening: 200, received: 0, issued: 0, closing: 200, damaged: 0, percentageRemaining: 100 },
    ],
  },
  {
    hubId: 'sukkur1',
    hubName: 'Sukkur Material Hub',
    lastUpdated: '2026-03-11',
    materials: [
      { id: 'm1', name: 'Bamboos (for Joist)', unit: 'pieces', opening: 1060, received: 0, issued: 0, closing: 1060, damaged: 0, percentageRemaining: 100 },
      { id: 'm2', name: 'Bamboo (for Purlins & Walls)', unit: 'pieces', opening: 2530, received: 0, issued: 0, closing: 2530, damaged: 0, percentageRemaining: 100 },
      { id: 'm3', name: 'Bamboo (for Ring Beams)', unit: 'pieces', opening: 1060, received: 0, issued: 0, closing: 1060, damaged: 0, percentageRemaining: 100 },
      { id: 'm4', name: 'Wooden Stick Chick Mat', unit: 'mats', opening: 860, received: 0, issued: 0, closing: 860, damaged: 0, percentageRemaining: 100 },
      { id: 'm5', name: 'Polythene Sheet', unit: 'sheets', opening: 130, received: 0, issued: 0, closing: 130, damaged: 0, percentageRemaining: 100 },
      { id: 'm6', name: 'Cotton Rope (KG)', unit: 'kg', opening: 13, received: 0, issued: 0, closing: 13, damaged: 0, percentageRemaining: 100 },
      { id: 'm7', name: 'Steel Girder (H Beam)', unit: 'beams', opening: 35, received: 0, issued: 0, closing: 35, damaged: 0, percentageRemaining: 100 },
      { id: 'm8', name: 'CGI Sheets', unit: 'sheets', opening: 0, received: 0, issued: 0, closing: 0, damaged: 0, percentageRemaining: 100 },
      { id: 'm9', name: 'Wooden Planks 1', unit: 'planks', opening: 160, received: 0, issued: 0, closing: 160, damaged: 0, percentageRemaining: 100 },
      { id: 'm10', name: 'Wooden Planks 2', unit: 'planks', opening: 160, received: 0, issued: 0, closing: 160, damaged: 0, percentageRemaining: 100 },
      { id: 'm11', name: 'EPS Panels', unit: 'panels', opening: 330, received: 0, issued: 0, closing: 330, damaged: 0, percentageRemaining: 100 },
      { id: 'm12', name: 'Pallets', unit: 'pallets', opening: 200, received: 0, issued: 0, closing: 200, damaged: 0, percentageRemaining: 100 },
    ],
  },
];

export const mockIssuanceRequests: IssuanceRequest[] = [
  {
    id: 'req1',
    requestNumber: 'PDMA/GB/2026/001',
    pdmaOffice: 'PDMA Gilgit-Baltistan',
    district: 'Ghizer',
    assessmentType: 'Flood Assessment',
    requestedMaterials: [
      { materialId: 'm1', materialName: 'Bamboo Poles', quantity: 500 },
      { materialId: 'm3', materialName: 'CGI Sheets', quantity: 300 },
    ],
    status: 'approved',
    requestDate: '2026-02-10',
    approvalDate: '2026-02-12',
    urgency: 'high',
  },
  {
    id: 'req2',
    requestNumber: 'PDMA/MZG/2026/015',
    pdmaOffice: 'PDMA Punjab',
    district: 'Muzaffargarh',
    assessmentType: 'Earthquake Relief',
    requestedMaterials: [
      { materialId: 'm2', materialName: 'EPS Panels', quantity: 400 },
      { materialId: 'm4', materialName: 'Chick Mats', quantity: 250 },
    ],
    status: 'pending',
    requestDate: '2026-02-20',
    urgency: 'medium',
  },
  {
    id: 'req3',
    requestNumber: 'PDMA/SKR/2026/008',
    pdmaOffice: 'PDMA Sindh',
    district: 'Sukkur',
    assessmentType: 'Monsoon Damage',
    requestedMaterials: [
      { materialId: 'm1', materialName: 'Bamboo Poles', quantity: 800 },
      { materialId: 'm5', materialName: 'Tarpaulin', quantity: 200 },
    ],
    status: 'dispatched',
    requestDate: '2026-02-05',
    approvalDate: '2026-02-08',
    dispatchDate: '2026-02-15',
    urgency: 'high',
  },
];

export const mockDamageReports: DamageReport[] = [
  {
    id: 'dmg1',
    hubId: 'mzg1',
    hubName: 'Muzaffargarh Material Hub',
    materialId: 'm1',
    materialName: 'Bamboo Poles',
    damagedCount: 450,
    totalCount: 5000,
    reason: 'Deterioration due to humidity and poor storage conditions',
    reportDate: '2026-02-15',
    financialLoss: 45000,
    urgencyLevel: 'high',
  },
  {
    id: 'dmg2',
    hubId: 'sukkur1',
    hubName: 'Sukkur Material Hub',
    materialId: 'm4',
    materialName: 'Chick Mats',
    damagedCount: 350,
    totalCount: 2000,
    reason: 'Water damage and pest infestation',
    reportDate: '2026-02-14',
    financialLoss: 28000,
    urgencyLevel: 'high',
  },
  {
    id: 'dmg3',
    hubId: 'sukkur1',
    hubName: 'Sukkur Material Hub',
    materialId: 'm1',
    materialName: 'Bamboo Poles',
    damagedCount: 600,
    totalCount: 4000,
    reason: 'Termite infestation and weathering',
    reportDate: '2026-02-13',
    financialLoss: 60000,
    urgencyLevel: 'high',
  },
];

export const mockTrainingPrograms: TrainingProgram[] = [
  {
    id: 'tr1',
    title: 'Bamboo Frame Installation Training',
    description: 'Comprehensive training on proper bamboo frame construction techniques for disaster-resilient housing.',
    duration: '3 days',
    location: 'Gilgit Material Hub',
    startDate: '2026-03-05',
    capacity: 30,
    enrolled: 18,
    topics: ['Bamboo selection', 'Frame assembly', 'Foundation preparation', 'Structural integrity'],
  },
  {
    id: 'tr2',
    title: 'EPS Panel Fitting Workshop',
    description: 'Hands-on workshop for installing EPS panels in bamboo structures.',
    duration: '2 days',
    location: 'Muzaffargarh Material Hub',
    startDate: '2026-03-12',
    capacity: 25,
    enrolled: 22,
    topics: ['Panel sizing', 'Installation methods', 'Insulation techniques', 'Quality control'],
  },
  {
    id: 'tr3',
    title: 'CGI Sheet Roofing Certification',
    description: 'Professional certification program for CGI sheet roofing installation.',
    duration: '4 days',
    location: 'Sukkur Material Hub',
    startDate: '2026-03-18',
    capacity: 20,
    enrolled: 15,
    topics: ['Roof design', 'Sheet installation', 'Weatherproofing', 'Safety measures'],
  },
  {
    id: 'tr4',
    title: 'Complete Disaster-Resilient Housing',
    description: 'Full course covering all aspects of building disaster-resilient structures.',
    duration: '7 days',
    location: 'All Hubs (Rotating)',
    startDate: '2026-04-01',
    capacity: 50,
    enrolled: 12,
    topics: ['Site assessment', 'Material selection', 'Construction techniques', 'Maintenance'],
  },
];

export const mockPartners: Partner[] = [
  {
    id: 'p1',
    name: 'National Disaster Management Authority (NDMA)',
    type: 'Government',
    contribution: 'Primary coordination and funding',
  },
  {
    id: 'p2',
    name: 'Provincial Disaster Management Authorities',
    type: 'Government',
    contribution: 'Regional coordination and assessment',
  },
  {
    id: 'p3',
    name: 'World Bank',
    type: 'International',
    contribution: 'Financial support and technical expertise',
  },
  {
    id: 'p4',
    name: 'UNDP Pakistan',
    type: 'International',
    contribution: 'Capacity building and training programs',
  },
  {
    id: 'p5',
    name: 'Local CSR Partners',
    type: 'CSR',
    contribution: 'Material donations and logistics support',
  },
];
