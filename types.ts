
export enum Tab {
  DASHBOARD = 'DASHBOARD',
  ORDERS = 'ORDERS',
  PLANNING = 'PLANNING',
  SAMPLING = 'SAMPLING',
  COSTING = 'COSTING',
  PURCHASING = 'PURCHASING',
  PRODUCTION = 'PRODUCTION',
  BUYERS = 'BUYERS',
  SUPPLIERS = 'SUPPLIERS',
  BOM = 'BOM',
  FINANCE = 'FINANCE',
  SHIPPING = 'SHIPPING',
  RESOURCES = 'RESOURCES',
  SETTINGS = 'SETTINGS'
}

export interface BuyerAddress {
  id: string;
  type: string;
  fullAddress: string;
  city: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface BuyerContact {
  id: string;
  name: string;
  designation: string;
  department: 'Buyer' | 'Technical' | 'Quality' | 'Accounts' | 'Logistics' | 'Other';
  phone: string;
  email: string;
  isDefault: boolean;
}

export interface Buyer {
  id: string;
  name: string;
  logoUrl?: string | null;
  website?: string;
  country: string;
  companyPhone?: string;
  totalOrders: number;
  paymentTerms?: string;
  incoterms?: string;
  agentName?: string;
  agentCommission?: number;
  addresses: BuyerAddress[];
  contacts: BuyerContact[];
}

export interface BuyingAgency {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  linkedBuyers: string[];
  activeOrdersCount: number;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  rating: number;
  location: string;
  contactPerson: string;
  phone: string;
  address: string;
  salesTaxId: string;
  productLine: string[];
  creditTerms: string;
}

export interface ColorRow {
  id: string;
  name: string;
}

export interface SizeGroup {
  id: string;
  groupName: string;
  unitPrice: string;
  currency: string;
  sizes: string[];
  colors: ColorRow[];
  breakdown: Record<string, Record<string, string>>;
  ratios?: Record<string, string>;
}

export interface BOMItem {
  id: string;
  processGroup: string;
  componentName: string;
  itemDetail: string;
  supplierRef: string;
  vendor: string;
  sourcingStatus: 'Pending' | 'Sourced' | 'Ordered' | 'Received' | 'Testing' | 'Submitted' | 'Approved';
  labStatus?: 'Pending' | 'Testing' | 'Approved' | 'Rejected';
  leadTimeDays: number;
  usageRule: string;
  usageData: Record<string, number>;
  wastagePercent: number;
  isTestingRequired: boolean;
  isApproved?: boolean;
  uom: string;
  unitsPerPack: number;
  packingUnit: string;
}

export interface SampleRow {
  id: string;
  samNumber: string;
  type: string;
  fabric: string;
  shade: string;
  wash: string;
  baseSize: string;
  threadColor: string;
  zipperColor: string;
  lining: string;
  quantity: string;
  deadline: string;
  status: 'Pending' | 'In Progress' | 'Approved' | 'Rejected' | 'Commented' | 'Testing' | 'Submitted';
  labStatus?: 'Pending' | 'Testing' | 'Approved' | 'Rejected';
  isTestingRequired: boolean;
  isApproved?: boolean;
  currentStage?: string; 
  lastUpdated?: string; 
  commentsReceivedDate?: string;
  commentsSentBy?: string;
  emailAttachmentRef?: string;
  feedbackText?: string;
}

export interface WashingData {
  washName: string;
  washPictureRef: string | null;
  washRecipeNotes: string;
  isApproved?: boolean;
}

export interface ScheduleTask {
  id: string;
  processGroup: string;
  milestone: string;
  leadTimeDays: number;
  calculatedDueDate: string;
  status: 'Pending' | 'In Progress' | 'Complete' | 'At Risk';
  owner: string;
}

export interface CapacityInput {
  totalOrderQty: number;
  fabricLeadTime: number;
  trimsLeadTime: number;
  cuttingOutput: number;
  sewingLines: number;
  sewingOutputPerLine: number;
  finishingOutput: number;
}

export interface CriticalPath {
  capacity: CapacityInput;
  schedule: ScheduleTask[];
}

export interface FittingData {
  id: string;
  fileName: string | null;
  fitName: string;
  sizeRange: string;
  patternCutter?: string;
  specsDate: string;
  specsDescription: string;
}

export interface PackingInstruction {
  id: string;
  name: string;
  method: string;
  blisterType?: 'By Ratio' | 'By Size' | 'By Artwork';
  pcsPerBlister?: string;
  blisterPerCarton?: string;
  polybagSpec: string;
  cartonMarkings: string;
  maxPiecesPerCarton: string;
  cartonSize: string;
  maxCartonWeightAllowed: string;
  cartonNetWeight: string;
  cartonGrossWeight: string;
  tagPlacement: string;
  assortmentMethod: string;
  foldingInstructions?: string;
  packingNotes: string;
  packagingSpecSheetRef: string | null;
  allocation: Record<string, number>; 
  totalAllocated: number;
}

export interface FinishingData {
  finalInspectionStatus: string;
  packingList: PackingInstruction[];
}

export interface EmbellishmentRecord {
  id: string;
  artworkFile: string | null;
  type: string;
  location: string;
  artworkId: string;
  usageRule: 'Generic' | 'By Size Group' | 'By Individual Sizes';
  dimensionsData: Record<string, string>;
  colorInfo: string;
  status: string;
  labStatus?: 'Pending' | 'Testing' | 'Approved' | 'Rejected';
  approvalDate: string;
  instructions: string;
  isTestingRequired: boolean;
  isApproved?: boolean;
}

export interface PPMeetingSection {
    startDate: string;
    finishDate: string;
    criticalArea: string;
    preventiveMeasure: string;
    concernedPerson: string;
}

export interface PPMeetingNotes {
    inspectionDate: string;
    poBreakdown: string;
    sections: Record<string, PPMeetingSection>;
}

export interface Order {
  id: string;
  orderID: string;
  poNumber: string;
  styleNo: string;
  buyer: string;
  merchandiserName?: string;
  quantity: number;
  deliveryDate: string;
  plannedDate?: string;
  status: 'Draft' | 'Active' | 'Booked' | 'Shipped' | 'Hold' | 'Cancelled' | 'Pending' | 'Delayed' | 'In Production';
  amount: number;
  price: number;
  factoryRef: string;
  styleName: string;
  styleDescription: string;
  fabricName: string;
  fabricDescription: string;
  incoterms?: string;
  shipMode?: string;
  ppMeetingDate?: string;
  ppMeetingStatus?: string;
  poDate?: string;
  sourcingDate?: string;
  approvalsCompleted?: number;
  approvalsTotal?: number;
  currentStage?: string;
  imageUrl?: string;
  cpNextDueDate?: string;
  cpRiskCount?: number;
  fabricStatus?: string;
  bomStatus?: 'Draft' | 'Released';
  planningNotes?: string;
  skippedStages?: string[];
  sizeGroups?: SizeGroup[];
  colors?: ColorRow[];
  bom?: BOMItem[];
  samplingDetails?: SampleRow[];
  criticalPath?: CriticalPath;
  washing?: Record<string, WashingData>;
  finishing?: FinishingData;
  fitting?: FittingData[];
  embellishments?: EmbellishmentRecord[];
  linkedJobId?: string;
  createdBy?: string;
  penaltyType?: 'Fixed' | 'PerPiece' | 'Percentage';
  penaltyValue?: number;
  statusReason?: string;
  ppMeetingNotes?: PPMeetingNotes;
}

export interface POData {
  jobNumber: string;
  buyerName: string;
  merchandiserName: string;
  factoryRef: string;
  styleNumber: string;
  productID: string;
  poNumber: string;
  poDate: string;
  shipDate: string;
  plannedDate: string;
  shipMode: string;
  description: string;
  incoterms: string;
}

export interface NewOrderState {
  generalInfo: {
    formData: POData;
    styleImage: string | null;
    colors: ColorRow[];
    sizeGroups: SizeGroup[];
  };
  fitting: FittingData[];
  sampling: SampleRow[];
  embellishments: EmbellishmentRecord[];
  washing: Record<string, WashingData>;
  finishing: FinishingData;
  criticalPath: CriticalPath;
  bom: BOMItem[];
  bomStatus: 'Draft' | 'Released';
  planningNotes: string;
  skippedStages: string[];
}

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  role: string;
  lastActive: string;
}

export type PlanStatus = 'Pending Creation' | 'Drafting' | 'In Progress' | 'Approved';

export interface ProductionLog {
  id: string;
  date: string;
  stage: string;
  quantity: number;
  lineId?: string;
}

export interface PurchasingRequest {
  id: string;
  jobId: string;
  materialName: string;
  qty: number;
  unit: string;
  supplier: string;
  status: 'Pending' | 'PO Issued' | 'Received';
  dateRequested: string;
  specs: string;
  itemDetail?: string;
  breakdown?: string;
  poNumber?: string;
  variantMap?: Record<string, number>;
  unitPrice?: number;
  unitsPerPack?: number; 
  packingUnit?: string;
}

export interface WorkOrderRequest {
  id: string;
  jobId: string;
  serviceName: string; 
  stage: 'Cutting' | 'Embellishment' | 'Stitching' | 'Washing' | 'Finishing';
  qty: number;
  unit: string;
  status: 'Pending' | 'WO Issued' | 'Received';
  dateRequested: string;
  targetDate: string;
  specs: string;
  itemDetail?: string;
  breakdown?: string;
  woNumber?: string;
}

export interface IssuedWorkOrder {
  id: string;
  woNumber: string;
  vendorName: string;
  stage: string;
  dateIssued: string;
  targetDate: string;
  status: 'Issued' | 'In Progress' | 'Completed';
  items: WorkOrderRequest[];
  notes?: string;
  totalQty: number;
}

export interface CuttingPlanDetail {
  id: string;
  materialName: string;
  shrinkageLengthPct: number;
  shrinkageWidthPct: number;
  extraCuttingPct: number;
  startDate: string;
  finishDate: string;
  dailyTarget: number;
  sizeBreakdown: Record<string, Record<string, { base: number, final: number }>>;
  allocatedQty?: number;
  unit?: string;
  plannedConsumption?: number;
}

export interface JobBatch {
  id: string;
  batchName: string;
  styles: Order[];
  totalQty: number;
  status: 'Planning' | 'Ready to Ship' | 'Booked' | 'Shipped' | 'Completed';
  exFactoryDate: string;
  plans: {
    fabric: PlanStatus;
    cutting: PlanStatus;
    trims: PlanStatus;
    embellishment: PlanStatus;
    stitching: PlanStatus;
    washing: PlanStatus;
    process: PlanStatus;
    finishing: PlanStatus;
    sampling: PlanStatus;
    testing: PlanStatus;
  };
  purchasingRequests?: PurchasingRequest[];
  workOrderRequests?: WorkOrderRequest[];
  cuttingPlanDetails?: CuttingPlanDetail[];
  dailyLogs?: ProductionLog[];
  productionProgress?: Record<string, number>;
  stageSchedules?: Record<string, { startDate: string; endDate: string }>;
}

export interface ExportInvoice {
  id: string;
  jobId: string;
  styleNumber: string;
  invoiceAmount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  shipDate: string;
  paymentTerms: number;
}

export interface DevelopmentSample {
  id: string;
  samNumber: string;
  buyer: string;
  styleNo: string;
  type: string;
  fabric: string;
  shade: string;
  wash: string;
  baseSize: string;
  threadColor: string;
  zipperColor: string;
  lining: string;
  quantity: string;
  deadline: string;
  status: 'Pending' | 'In Progress' | 'Approved' | 'Rejected' | 'Commented' | 'Testing' | 'Submitted';
  labStatus?: 'Pending' | 'Testing' | 'Approved' | 'Rejected';
  isTestingRequired: boolean;
  season?: string;
  notes?: string;
  currentStage?: string; 
  lastUpdated?: string; 
  commentsReceivedDate?: string;
  commentsSentBy?: string;
  emailAttachmentRef?: string;
  // Enhanced for R&D
  imageUrl?: string;
  description?: string;
  fitName?: string;
  specsFile?: string;
  bom?: BOMItem[];
  embellishments?: EmbellishmentRecord[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'Shipment' | 'Meeting' | 'CP Task' | 'Job Milestone' | 'Custom';
  color: string;
  context?: string;
  isCustom?: boolean;
}

export interface CompanyDetails {
  name: string;
  address: string;
  phone: string;
  website: string;
  logoUrl: string | null;
  salesTerms?: string;
  poTerms?: string;
}

export interface POItemVariant {
  id: string;
  usage: string;
  note: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface POLineItem {
  id: string;
  materialName: string;
  description: string;
  itemDetail?: string;
  variants: POItemVariant[];
  unitsPerPack?: number; 
  packingUnit?: string;
}

export interface MaterialReception {
  id: string;
  date: string;
  challanNo: string;
  quantity: number;
  lineItemId: string;
  variantId: string;
}

export interface IssuedPurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  dateIssued: string;
  currency: string;
  taxRate: number;
  applyTax: boolean; 
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  itemCount: number;
  status: 'Issued' | 'Sent' | 'Closed';
  creditTerms: string;
  deliveryDate: string;
  supplierNote?: string;
  displayMode?: 'Base' | 'Pack';
  lines?: POLineItem[];
  receptions?: MaterialReception[];
}

export interface MonthlyTarget {
  month: string;
  salesTarget: number;
  volumeTarget: number;
}

export interface MasterBOMItem {
  id: string;
  type: 'Fabric' | 'Trim';
  category: string;
  supplier: string;
  brand: string;
  uom: string;
  isNominated: boolean;
  price: number;
  code: string;
  construction?: string;
  content?: string;
  weight?: number;
  width?: string;
  shade?: string;
  warpShrinkage?: number;
  weftShrinkage?: number;
  itemName?: string;
  details?: string;
}

export interface BOMPreset {
  id: string;
  name: string;
  buyerName: string;
  items: MasterBOMItem[];
}

export interface ParcelOtherItem {
  id: string;
  name: string;
  type: string;
  purpose: string;
  qty: number;
  unitValue: number;
}

export interface Parcel {
  id: string;
  parcelNo: string;
  buyer: string;
  recipientName: string;
  recipientPhone?: string;
  address: string;
  courier: string;
  trackingNo: string;
  sentDate: string;
  receivedDate?: string;
  status: 'Sent' | 'Received';
  samples: SampleRow[]; 
  otherItems: ParcelOtherItem[];
  isTrackingPending?: boolean;
}

export interface SalesContractData {
  proformaInvoiceNo: string;
  orderDate: string;
  buyerPoNo: string;
  jobNo: string;
  shipDate: string;
  shipMode: string;
  portOfLoading: string;
  portOfDischarge: string;
  paymentTerms: string;
  incoterm: string;
  buyingAgent: string;
  buyerVatNo: string;
  advancePaymentPct: number;
  fabricContentShell: string;
  fabricContentPocketing: string;
  insuranceTerms: string;
  documentsTerms: string;
  toleranceTerms: string;
  inspectionTerms: string;
  trimsTerms: string;
  testingTerms: string;
}
