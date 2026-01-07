
import { Order, Buyer, Supplier, Tab, MasterBOMItem, BuyingAgency, BOMItem, ColorRow, SizeGroup, FittingData } from './types';
import { 
  LayoutDashboard, ShoppingBag, Layers, Calculator, ShoppingCart, 
  Factory, Users, Truck, Package, DollarSign, Settings, FileSpreadsheet,
  Scissors, ClipboardList, BookOpen, CalendarRange, Activity, Tag, Box, Scale, Palette, Image, GanttChartSquare
} from 'lucide-react';

export const LOGO_URL = "https://cdn-icons-png.flaticon.com/512/25/25694.png";

export const NAV_ITEMS = [
  { id: Tab.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
  { id: Tab.ORDERS, icon: ShoppingBag, label: 'Order Management' },
  { id: Tab.PLANNING, icon: GanttChartSquare, label: 'Pre-Production Hub' },
  { id: Tab.SAMPLING, icon: Layers, label: 'Sample Room' },
  { id: Tab.COSTING, icon: Calculator, label: 'Costing' },
  { id: Tab.PURCHASING, icon: ShoppingCart, label: 'Purchasing' },
  { id: Tab.PRODUCTION, icon: Factory, label: 'Production' },
  { id: Tab.BUYERS, icon: Users, label: 'Buyers' },
  { id: Tab.SUPPLIERS, icon: Truck, label: 'Suppliers' },
  { id: Tab.BOM, icon: FileSpreadsheet, label: 'BOM' },
  { id: Tab.FINANCE, icon: DollarSign, label: 'Finance' },
  { id: Tab.SHIPPING, icon: Package, label: 'Shipping' },
  { id: Tab.RESOURCES, icon: BookOpen, label: 'Resources' },
  { id: Tab.SETTINGS, icon: Settings, label: 'Settings' },
];

export const PRODUCTION_TOOLS = [
  {
    id: "costing-generator",
    title: "Costing Sheet",
    icon: Calculator,
    color: "text-green-600",
    bg: "bg-green-50"
  },
  {
    id: "parcel-dispatch",
    title: "Parcel Dispatch",
    icon: Truck,
    color: "text-indigo-600",
    bg: "bg-indigo-50"
  },
  {
    id: "fabric-consumption",
    title: "Fabric Consumption",
    icon: Layers,
    color: "text-blue-600",
    bg: "bg-blue-50"
  },
  {
    id: "sewing-thread",
    title: "Sewing Thread",
    icon: Activity,
    color: "text-pink-600",
    bg: "bg-pink-50"
  },
  {
    id: "trims",
    title: "Accessories / Trims",
    icon: Tag,
    color: "text-orange-600",
    bg: "bg-orange-50"
  },
  {
    id: "cbm",
    title: "CBM Calc",
    icon: Box,
    color: "text-teal-600",
    bg: "bg-teal-50"
  },
  {
    id: "gsm",
    title: "Fabric GSM",
    icon: Scale,
    color: "text-red-600",
    bg: "bg-red-50"
  },
  {
    id: "pantone-converter",
    title: "Pantone Converter",
    icon: Palette,
    color: "text-rose-600",
    bg: "bg-rose-50"
  },
  {
    id: "catalogue-maker",
    title: "Catalogue Maker",
    icon: Image,
    color: "text-amber-600",
    bg: "bg-amber-50"
  }
];

export const formatAppDate = (dateString?: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
};

export const parseCSVDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const cleanStr = dateStr.trim();
  if (cleanStr.match(/^\d{4}-\d{2}-\d{2}$/)) return cleanStr;
  
  const parts = cleanStr.split(/[-/ ]/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    let monthStr = parts[1];
    let year = parts[2];
    
    const monthNames: Record<string, string> = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
      'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };

    let month = '01';
    if (!isNaN(Number(monthStr))) {
      month = monthStr.padStart(2, '0');
    } else {
      const upperMonth = monthStr.toUpperCase().substring(0, 3);
      month = monthNames[upperMonth] || '01';
    }

    if (year.length === 2) {
      year = '20' + year;
    }

    return `${year}-${month}-${day}`;
  }
  return cleanStr;
};

export const MOCK_BUYERS: Buyer[] = [
  { 
    id: 'b1', 
    name: 'BoohooMAN', 
    website: 'www.boohooman.com',
    country: 'UK', 
    totalOrders: 42,
    paymentTerms: '60 Days OA',
    incoterms: 'FOB',
    addresses: [
      { id: 'a1', type: 'HQ', fullAddress: '49-51 Dale Street', city: 'Manchester', country: 'UK', isDefault: true },
      { id: 'a2', type: 'Warehouse', fullAddress: 'Logicorp Park, Unit 5', city: 'Burnley', country: 'UK', isDefault: false }
    ],
    contacts: [
      { id: 'c1', name: 'James Mahon', designation: 'Senior Buyer', department: 'Buyer', phone: '+44 161 236 5656', email: 'james.m@boohooman.com', isDefault: true },
      { id: 'c2', name: 'Sarah Finch', designation: 'Technical Manager', department: 'Technical', phone: '+44 161 236 5657', email: 'sarah.f@boohooman.com', isDefault: false }
    ]
  },
  { 
    id: 'b2', 
    name: 'True Religion', 
    website: 'www.truereligion.com',
    country: 'USA', 
    totalOrders: 15,
    paymentTerms: '30 Days LC',
    incoterms: 'CIF',
    agentName: 'Zetex Sourcing',
    agentCommission: 5,
    addresses: [
      { id: 'a3', type: 'HQ', fullAddress: '1888 Rosecrans Ave', city: 'Manhattan Beach', country: 'USA', isDefault: true }
    ],
    contacts: [
      { id: 'c3', name: 'Michael Buckley', designation: 'Head of Buying', department: 'Buyer', phone: '+1 866-878-3735', email: 'mbuckley@truereligion.com', isDefault: true }
    ]
  }
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Elite Denim', category: 'Fabric', location: 'Karachi', rating: 4.8, contactPerson: 'Arshad Ali', phone: '+92 300 8273645', address: 'Industrial Area, Karachi', salesTaxId: '123-456-789', productLine: ['Fabric'], creditTerms: '30 Days' },
  { id: 's2', name: 'Union Denim', category: 'Fabric', location: 'Karachi', rating: 4.7, contactPerson: 'Zeeshan Malik', phone: '+92 321 4455667', address: 'Site Area, Karachi', salesTaxId: '987-654-321', productLine: ['Fabric'], creditTerms: '60 Days' },
  { id: 's3', name: 'Pak Denim', category: 'Fabric', location: 'Lahore', rating: 4.5, contactPerson: 'Imran Khan', phone: '+92 333 1122334', address: 'Sundar Estate, Lahore', salesTaxId: '456-789-123', productLine: ['Fabric'], creditTerms: '30 Days' },
  { id: 's4', name: 'Karim Denim', category: 'Fabric', location: 'Karachi', rating: 4.6, contactPerson: 'Khurram Shahzad', phone: '+92 345 6677889', address: 'Site Area, Karachi', salesTaxId: '147-258-369', productLine: ['Fabric'], creditTerms: '45 Days' },
  { id: 's5', name: 'Azul Denim', category: 'Fabric', location: 'Karachi', rating: 4.4, contactPerson: 'Amir Aziz', phone: '+92 301 9988776', address: 'Korangi Industrial Area, Karachi', salesTaxId: '369-258-147', productLine: ['Fabric'], creditTerms: '30 Days' },
  { id: 's6', name: 'Tauseef Denim', category: 'Fabric', location: 'Faisalabad', rating: 4.2, contactPerson: 'Tauseef Ahmed', phone: '+92 344 5566778', address: 'Millat Road, Faisalabad', salesTaxId: '258-147-369', productLine: ['Fabric'], creditTerms: '15 Days' },
  { id: 's7', name: 'Abdul Qadir Rajwani', category: 'Fabric', location: 'Karachi', rating: 4.8, contactPerson: 'Qadir Rajwani', phone: '+92 300 1122112', address: 'Site Area, Karachi', salesTaxId: '321-654-987', productLine: ['Fabric'], creditTerms: '30 Days' },
  { id: 's8', name: 'Rehmani Thread', category: 'Trims', location: 'Karachi', rating: 4.5, contactPerson: 'Aslam Rehmani', phone: '+92 333 2233445', address: 'Federal B Area, Karachi', salesTaxId: '789-456-123', productLine: ['Stitching Trims'], creditTerms: 'Cash' },
  { id: 's9', name: 'HRK Enterprises', category: 'Trims', location: 'Karachi', rating: 4.3, contactPerson: 'Haris Khan', phone: '+92 302 3344556', address: 'DHA, Karachi', salesTaxId: '654-321-789', productLine: ['Packing Trims'], creditTerms: '30 Days' },
  { id: 's10', name: 'SBS', category: 'Trims', location: 'Karachi', rating: 4.7, contactPerson: 'Sarah Chen', phone: '+92 21 35001122', address: 'Korangi, Karachi', salesTaxId: '159-753-486', productLine: ['Stitching Trims'], creditTerms: '60 Days' },
  { id: 's11', name: 'Khurram Brothers', category: 'Trims', location: 'Faisalabad', rating: 4.4, contactPerson: 'Khurram Riaz', phone: '+92 345 8899001', address: 'Ghanta Ghar, Faisalabad', salesTaxId: '753-159-486', productLine: ['Packing Trims', 'Stitching Trims'], creditTerms: '30 Days' },
  { id: 's12', name: 'Kashif Lace', category: 'Trims', location: 'Lahore', rating: 4.1, contactPerson: 'Kashif Ali', phone: '+92 321 0099112', address: 'Azam Market, Lahore', salesTaxId: '486-159-753', productLine: ['Stitching Trims'], creditTerms: '15 Days' },
  { id: 's13', name: 'Best Packages', category: 'Trims', location: 'Karachi', rating: 4.6, contactPerson: 'Bilal Ahmed', phone: '+92 300 4455667', address: 'Industrial Zone 4, Karachi', salesTaxId: '123-789-456', productLine: ['Packing Trims'], creditTerms: '30 Days' },
  { id: 's14', name: 'Capital Packages', category: 'Trims', location: 'Lahore', rating: 4.5, contactPerson: 'Salman Ghouri', phone: '+92 333 5566778', address: 'Quaid-e-Azam Industrial Estate, Lahore', salesTaxId: '456-123-789', productLine: ['Packing Trims'], creditTerms: '30 Days' },
  { id: 's15', name: 'Hanif Embroidery', category: 'Embellishment', location: 'Karachi', rating: 4.7, contactPerson: 'Hanif Khan', phone: '+92 322 1122334', address: 'Landhi, Karachi', salesTaxId: '951-753-852', productLine: ['Embellishment'], creditTerms: '15 Days' },
  { id: 's16', name: 'Sajid Print', category: 'Embellishment', location: 'Karachi', rating: 4.4, contactPerson: 'Sajid Mehmood', phone: '+92 301 2233445', address: 'Orangi, Karachi', salesTaxId: '852-753-951', productLine: ['Embellishment'], creditTerms: '15 Days' },
  { id: 's17', name: 'Kinza Embroidery', category: 'Embellishment', location: 'Lahore', rating: 4.8, contactPerson: 'Kinza Ahmed', phone: '+92 333 9988776', address: 'Garden Town, Lahore', salesTaxId: '159-357-486', productLine: ['Embellishment'], creditTerms: '15 Days' },
  { id: 's18', name: 'Nadeem Print', category: 'Embellishment', location: 'Karachi', rating: 4.3, contactPerson: 'Nadeem Abbas', phone: '+92 345 6677889', address: 'Federal B Area, Karachi', salesTaxId: '486-357-159', productLine: ['Embellishment'], creditTerms: 'Cash' },
  { id: 's19', name: 'TextilFort', category: 'Washing', location: 'Karachi', rating: 4.9, contactPerson: 'Faisal Jamil', phone: '+92 300 0011223', address: 'Site Area, Karachi', salesTaxId: '357-159-486', productLine: ['Washing'], creditTerms: '30 Days' },
  { id: 's20', name: 'SF Dyeing', category: 'Washing', location: 'Lahore', rating: 4.6, contactPerson: 'Sohail Farooq', phone: '+92 321 8877665', address: 'Kot Lakhpat, Lahore', salesTaxId: '123-321-456', productLine: ['Washing'], creditTerms: '30 Days' },
  { id: 's21', name: 'Meerub', category: 'Stitching', location: 'Karachi', rating: 4.5, contactPerson: 'Meerub Aziz', phone: '+92 304 1122334', address: 'Korangi, Karachi', salesTaxId: '789-987-654', productLine: ['Stitching'], creditTerms: '30 Days' }
];

export const MOCK_MASTER_BOM_ITEMS: MasterBOMItem[] = [
  // --- FABRICS ---
  { id: 'f1', type: 'Fabric', category: 'Denim', supplier: 'Union Denim', code: '11062', construction: '3x1 RHT', content: '100% Cotton', weight: 12.00, shade: 'Blue', warpShrinkage: 2, weftShrinkage: 2, width: '62"', uom: 'Meters', price: 850, brand: 'Generic', isNominated: false },
  { id: 'f2', type: 'Fabric', category: 'Denim', supplier: 'Union Denim', code: '11062', construction: '3x1 RHT', content: '100% Cotton', weight: 12.00, shade: 'Black', warpShrinkage: 2, weftShrinkage: 2, width: '62"', uom: 'Meters', price: 870, brand: 'Generic', isNominated: false },
  { id: 'f3', type: 'Fabric', category: 'Denim', supplier: 'Karim Denim', code: '52924', construction: '3x1 RHT', content: '98% Cotton, 02% Spandex', weight: 11.15, shade: 'Blue', warpShrinkage: 2, weftShrinkage: 16, width: '68"', uom: 'Meters', price: 920, brand: 'Generic', isNominated: false },
  { id: 'f4', type: 'Fabric', category: 'Denim', supplier: 'Karim Denim', code: '52924', construction: '3x1 RHT', content: '98% Cotton, 02% Spandex', weight: 11.15, shade: 'Black OD', warpShrinkage: 2, weftShrinkage: 16, width: '68"', uom: 'Meters', price: 940, brand: 'Generic', isNominated: false },
  { id: 'f5', type: 'Fabric', category: 'Denim', supplier: 'Azul Denim', code: '3744', construction: '3x1 RHT', content: '80% Cotton, 18% Polyester, 2% Spandex', weight: 10.15, shade: 'Blue', warpShrinkage: 2, weftShrinkage: 12, width: '62"', uom: 'Meters', price: 780, brand: 'Generic', isNominated: false },
  { id: 'f6', type: 'Fabric', category: 'Denim', supplier: 'Azul Denim', code: '3744', construction: '3x1 RHT', content: '80% Cotton, 18% Polyester, 2% Spandex', weight: 10.15, shade: 'Black OD', warpShrinkage: 2, weftShrinkage: 12, width: '62"', uom: 'Meters', price: 800, brand: 'Generic', isNominated: false },
  { id: 'f7', type: 'Fabric', category: 'Denim', supplier: 'Elite Denim', code: '1022', construction: '3x1 RHT', content: '99% Cotton, 1% Spandex', weight: 11.50, shade: 'Blue', warpShrinkage: 2, weftShrinkage: 2, width: '67"', uom: 'Meters', price: 880, brand: 'Generic', isNominated: false },
  { id: 'f8', type: 'Fabric', category: 'Denim', supplier: 'Elite Denim', code: '1022', construction: '3x1 RHT', content: '99% Cotton, 1% Spandex', weight: 11.50, shade: 'Black', warpShrinkage: 2, weftShrinkage: 2, width: '67"', uom: 'Meters', price: 900, brand: 'Generic', isNominated: false },
  { id: 'f9', type: 'Fabric', category: 'Lining', supplier: 'Abdul Qadir Rajwani', code: 'PL-WHT', construction: '60% Polyester, 40% Cotton', weight: 120, shade: 'White', warpShrinkage: 2, weftShrinkage: 2, width: '60"', uom: 'Meters', price: 210, brand: 'Generic', isNominated: false },
  { id: 'f10', type: 'Fabric', category: 'Lining', supplier: 'Abdul Qadir Rajwani', code: 'PL-BLK', construction: '60% Polyester, 40% Cotton', weight: 120, shade: 'Black', warpShrinkage: 2, weftShrinkage: 2, width: '60"', uom: 'Meters', price: 210, brand: 'Generic', isNominated: false },

  // --- TRIMS ---
  { id: 't1', type: 'Trim', category: 'Stitching Trims', itemName: 'Stitching Thread - 20/2', supplier: 'Rehmani Thread', code: 'THR-202', uom: 'Pieces', price: 120, brand: 'Generic', isNominated: false },
  { id: 't2', type: 'Trim', category: 'Stitching Trims', itemName: 'Stitching Thread - 20/3', supplier: 'Rehmani Thread', code: 'THR-203', uom: 'Pieces', price: 140, brand: 'Generic', isNominated: false },
  { id: 't3', type: 'Trim', category: 'Stitching Trims', itemName: 'Stitching Thread - 50/3', supplier: 'Rehmani Thread', code: 'THR-503', uom: 'Pieces', price: 110, brand: 'Generic', isNominated: false },
  { id: 't4', type: 'Trim', category: 'Stitching Trims', itemName: 'Stitching Thread - 30/2', supplier: 'Rehmani Thread', code: 'THR-302', uom: 'Pieces', price: 115, brand: 'Generic', isNominated: false },
  { id: 't5', type: 'Trim', category: 'Stitching Trims', itemName: 'Stitching Thread - 30/3', supplier: 'Rehmani Thread', code: 'THR-303', uom: 'Pieces', price: 125, brand: 'Generic', isNominated: false },
  { id: 't6', type: 'Trim', category: 'Stitching Trims', itemName: 'Zipper', supplier: 'SBS', code: 'ZIP-SBS-4', uom: 'Pieces', price: 45, brand: 'Generic', isNominated: false },
  { id: 't7', type: 'Trim', category: 'Stitching Trims', itemName: 'Button', supplier: 'Khurram Brothers', code: 'BTN-24L', uom: 'Pieces', price: 15, brand: 'Generic', isNominated: false },
  { id: 't8', type: 'Trim', category: 'Stitching Trims', itemName: 'Rivet', supplier: 'Khurram Brothers', code: 'RVT-STD', uom: 'Pieces', price: 8, brand: 'Generic', isNominated: false },
  { id: 't9', type: 'Trim', category: 'Packing Trims', itemName: 'Hangtag', supplier: 'HRK Enterprises', code: 'HT-001', uom: 'Pieces', price: 12, brand: 'Generic', isNominated: false },
  { id: 't10', type: 'Trim', category: 'Packing Trims', itemName: 'Price Tag', supplier: 'HRK Enterprises', code: 'PT-001', uom: 'Pieces', price: 8, brand: 'Generic', isNominated: false },
  { id: 't11', type: 'Trim', category: 'Packing Trims', itemName: 'Joker Tag', supplier: 'HRK Enterprises', code: 'JT-001', uom: 'Pieces', price: 5, brand: 'Generic', isNominated: false },
  { id: 't12', type: 'Trim', category: 'Packing Trims', itemName: 'Leather Patch', supplier: 'Khurram Brothers', code: 'LP-DNM', uom: 'Pieces', price: 45, brand: 'Generic', isNominated: false },
  { id: 't13', type: 'Trim', category: 'Stitching Trims', itemName: 'Main Label', supplier: 'Kashif Lace', code: 'ML-001', uom: 'Pieces', price: 18, brand: 'Generic', isNominated: false },
  { id: 't14', type: 'Trim', category: 'Stitching Trims', itemName: 'Size Label', supplier: 'Kashif Lace', code: 'SL-001', uom: 'Pieces', price: 6, brand: 'Generic', isNominated: false },
  { id: 't15', type: 'Trim', category: 'Stitching Trims', itemName: 'Care Label', supplier: 'Kashif Lace', code: 'CL-001', uom: 'Pieces', price: 6, brand: 'Generic', isNominated: false },
  { id: 't16', type: 'Trim', category: 'Packing Trims', itemName: 'Barcode Sticker', supplier: 'Best Packages', code: 'BCS-001', uom: 'Pieces', price: 4, brand: 'Generic', isNominated: false },
  { id: 't17', type: 'Trim', category: 'Packing Trims', itemName: 'Polybag', supplier: 'HRK Enterprises', code: 'PB-2436', uom: 'Pieces', price: 15, brand: 'Generic', isNominated: false },
  { id: 't18', type: 'Trim', category: 'Packing Trims', itemName: 'Master Polybag', supplier: 'HRK Enterprises', code: 'MPB-STD', uom: 'Pieces', price: 45, brand: 'Generic', isNominated: false },
  { id: 't19', type: 'Trim', category: 'Packing Trims', itemName: 'Carton', supplier: 'Capital Packages', code: 'CTN-604030', uom: 'Pieces', price: 280, brand: 'Generic', isNominated: false },
  { id: 't20', type: 'Trim', category: 'Packing Trims', itemName: 'Carton Sticker', supplier: 'Best Packages', code: 'CS-001', uom: 'Pieces', price: 5, brand: 'Generic', isNominated: false },
  { id: 't21', type: 'Trim', category: 'Packing Trims', itemName: 'Hanger', supplier: 'Khurram Brothers', code: 'HGR-STD', uom: 'Pieces', price: 35, brand: 'Generic', isNominated: false },
  { id: 't22', type: 'Trim', category: 'Packing Trims', itemName: 'Hanger Size Tab', supplier: 'Khurram Brothers', code: 'HST-001', uom: 'Pieces', price: 3, brand: 'Generic', isNominated: false },
  { id: 't23', type: 'Trim', category: 'Packing Trims', itemName: 'Slica Gel', supplier: 'HRK Enterprises', code: 'SG-1G', uom: 'Pieces', price: 2, brand: 'Generic', isNominated: false }
];

export const MOCK_AGENCIES: BuyingAgency[] = [
  { id: 'ag-1', name: 'Zetex Sourcing', contactPerson: 'Nauman Zara', phone: '+92 333 3185768', address: 'Karachi, Pakistan', linkedBuyers: ['True Religion'], activeOrdersCount: 5 },
  { id: 'ag-2', name: 'Smart Sourcing', contactPerson: 'Zeeshan Yousuf', phone: '+92 308 8472345', address: 'Lahore, Pakistan', linkedBuyers: ['BoohooMAN'], activeOrdersCount: 12 },
  { id: 'ag-3', name: 'TexLink Sourcing', contactPerson: 'David Miller', phone: '+44 20 7123 4567', address: 'London, UK', linkedBuyers: ['BoohooMAN', 'Minoti'], activeOrdersCount: 15 }
];

const MOCK_COLORS: ColorRow[] = [
  { id: 'c1', name: 'Indigo Blast' },
  { id: 'c2', name: 'Black Overdye' }
];

const MOCK_SIZE_GROUPS: SizeGroup[] = [
  {
    id: 'sg1', groupName: 'Main Range', unitPrice: '12.50', currency: 'USD', sizes: ['28', '30', '32', '34', '36'], colors: MOCK_COLORS,
    breakdown: {
      'c1': { '28': '50', '30': '100', '32': '150', '34': '100', '36': '50' },
      'c2': { '28': '30', '30': '60', '32': '90', '34': '60', '36': '30' }
    }
  },
  {
    id: 'sg2', groupName: 'Plus Range', unitPrice: '14.00', currency: 'USD', sizes: ['38', '40', '42', '44'], colors: MOCK_COLORS,
    breakdown: {
      'c1': { '38': '25', '40': '50', '42': '50', '44': '25' },
      'c2': { '38': '15', '40': '30', '42': '30', '44': '15' }
    }
  }
];

const MOCK_BOM: BOMItem[] = [
  { id: 'b1', processGroup: 'Fabric', componentName: '12oz Indigo Stretch Denim', itemDetail: 'Slub Texture', supplierRef: 'ED-12OZ-IND', vendor: 'Elite Denim', sourcingStatus: 'Pending', leadTimeDays: 45, usageRule: 'Generic', usageData: { 'generic': 1.45 }, wastagePercent: 3, isTestingRequired: true, isApproved: true, uom: 'Meters', unitsPerPack: 1, packingUnit: 'Roll' },
  { id: 'b2', processGroup: 'Fabric', componentName: 'PC Pocketing White', itemDetail: 'T/C 65/35', supplierRef: 'PL-WHT', vendor: 'Abdul Qadir Rajwani', sourcingStatus: 'Pending', leadTimeDays: 15, usageRule: 'Generic', usageData: { 'generic': 0.25 }, wastagePercent: 2, isTestingRequired: false, isApproved: false, uom: 'Meters', unitsPerPack: 1, packingUnit: 'Roll' },
  { id: 'b3', processGroup: 'Stitching Trims', componentName: '20/2 Stitching Thread', itemDetail: 'Match Shell', supplierRef: 'THR-202', vendor: 'Rehmani Thread', sourcingStatus: 'Pending', leadTimeDays: 7, usageRule: 'By Color/Wash', usageData: { 'Indigo Blast': 2, 'Black Overdye': 1.5 }, wastagePercent: 5, isTestingRequired: false, isApproved: false, uom: 'Pieces', unitsPerPack: 5000, packingUnit: 'Cone' },
  { id: 'b5', processGroup: 'Stitching Trims', componentName: 'Antique Brass Zipper', itemDetail: '4.5" Length', supplierRef: 'ZIP-SBS-4', vendor: 'SBS', sourcingStatus: 'Pending', leadTimeDays: 21, usageRule: 'By Size Group', usageData: { 'Main Range': 1, 'Plus Range': 1 }, wastagePercent: 1, isTestingRequired: false, isApproved: true, uom: 'Pieces', unitsPerPack: 1, packingUnit: 'Pack' }
];

const MOCK_FITTING: FittingData[] = [
  { id: 'fit1', fileName: 'MainRangeSpec.pdf', fitName: 'Slim Fit', sizeRange: 'Main Range', patternCutter: 'Master Jamil', specsDate: '2024-12-01', specsDescription: 'Tapered leg with standard waist rise' },
  { id: 'fit2', fileName: 'PlusRangeSpec.pdf', fitName: 'Comfort Fit', sizeRange: 'Plus Range', patternCutter: 'Master Jamil', specsDate: '2024-12-02', specsDescription: 'Extra thigh room and comfort waist' }
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-001', orderID: 'PO-BMM-98207', poNumber: '98207', styleNo: 'M-DNM-2025', buyer: 'BoohooMAN', quantity: 1200, deliveryDate: '2025-03-15', status: 'In Production', amount: 15600, price: 13, factoryRef: 'NZ-8890', styleName: 'Slim Tapered Jean', styleDescription: '5-Pocket Denim with stretch, enzyme wash', fabricName: '12oz Indigo Stretch', fabricDescription: '98/2 Cotton Elastane', currentStage: 'Stitching', imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=200', colors: MOCK_COLORS, sizeGroups: MOCK_SIZE_GROUPS, bom: MOCK_BOM, fitting: MOCK_FITTING, approvalsCompleted: 3, approvalsTotal: 5
  }
];
