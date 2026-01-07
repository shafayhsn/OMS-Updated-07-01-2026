
import React, { useState, useMemo } from 'react';
import { 
  DollarSign, AlertTriangle, Calendar, CheckCircle2, 
  Search, ShoppingCart, Clock, AlertCircle,
  FileText, X, Receipt, Filter, Eye, Hash,
  Link, Printer, CheckSquare, Square, FileStack,
  Layers, Package as PackageIcon, ArrowRightLeft, ChevronDown,
  Inbox, ArrowUpRight, BarChart
} from 'lucide-react';
import { MOCK_SUPPLIERS, LOGO_URL } from '../constants';
import { Order, JobBatch, PurchasingRequest, CompanyDetails, IssuedPurchaseOrder, POLineItem, POItemVariant, MaterialReception } from '../types';
import { formatAppDate } from '../constants';

// --- Types & Interfaces ---

type MaterialStatus = 'Unpurchased' | 'PO Issued' | 'Received';
type DisplayMode = 'Base' | 'Pack';

interface MaterialDemandItem {
  id: string;        
  bomItemId: string; 
  jobId: string;     
  materialName: string;
  itemDetail: string; // From BOM
  specification: string;
  category: string;
  requiredQty: number;
  unit: string;
  unitPrice: number;
  supplierName: string;
  inHouseDueDate: string;
  status: MaterialStatus;
  poNumber?: string;
  breakdown?: string; 
  variantMap?: Record<string, number>; 
  unitsPerPack: number; 
  packingUnit: string;
}

interface DraftItemVariant {
  id: string;
  usage: string; 
  note: string; 
  qty: number | string; // Always stored in Base UOM in memory
  rate: number | string; // Always stored in Base UOM in memory
  unit: string;
}

interface DraftItem {
  id: string;
  sourceIds: string[]; 
  materialName: string;
  itemDetail: string; // From BOM
  specification: string;
  unitsPerPack: number; 
  packingUnit: string;
  variants: DraftItemVariant[];
}

interface DraftPOState {
  poNumber: string;
  supplierName: string;
  currency: string;
  taxRate: number;
  applyTax: boolean; 
  creditTerms: string;
  deliveryDate: string;
  supplierNote: string;
  displayMode: DisplayMode; 
  items: DraftItem[];
}

interface PurchasingDashboardProps {
  orders?: Order[];
  jobs: JobBatch[]; 
  taxRate?: number; 
  companyDetails?: CompanyDetails;
  currentUser?: string;
  issuedPOs: IssuedPurchaseOrder[];
  onUpdateIssuedPOs: (pos: IssuedPurchaseOrder[]) => void;
  onUpdateJobs?: (jobs: JobBatch[]) => void; 
}

interface PrintOptions {
  original: boolean;
  merchandiser: boolean;
  accounts: boolean;
  store: boolean;
}

const CREDIT_TERMS_OPTIONS = [
  "Cash", "15 Days", "30 Days", "45 Days", "60 Days", "75 Days", "90 Days", "120 Days"
];

const numberToWords = (num: number, currency: string = 'PKR'): string => {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

  const numToText = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + numToText(n % 100);
      if (n < 1000000) return numToText(Math.floor(n / 1000)) + 'Thousand ' + numToText(n % 1000);
      if (n < 1000000000) return numToText(Math.floor(n / 1000000)) + 'Million ' + numToText(n % 1000000);
      return 'Lots of';
  };

  const whole = Math.floor(num);
  const decimal = Math.round((num - whole) * 100);
  let str = numToText(whole);
  str += " " + currency;
  if (decimal > 0) str += ` and ${numToText(decimal)} Cents/Paisa`;
  return str + " Only";
};

export const PurchasingDashboard: React.FC<PurchasingDashboardProps> = ({ 
  orders = [], jobs = [], taxRate = 18.0, companyDetails, currentUser, issuedPOs, onUpdateIssuedPOs, onUpdateJobs
}) => {
  const [activeTab, setActiveTab] = useState<'Demand' | 'POs' | 'Deliveries'>('Demand');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | MaterialStatus>('All');
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [draftPO, setDraftPO] = useState<DraftPOState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [poToPrint, setPoToPrint] = useState<IssuedPurchaseOrder | null>(null);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    original: true, merchandiser: false, accounts: false, store: false
  });

  // Selection for Deliveries
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<Set<string>>(new Set());

  // Reception State
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receivingItems, setReceivingItems] = useState<any[]>([]);
  const [receptionQtys, setReceptionQtys] = useState<Record<string, string>>({});
  const [receptionForm, setReceptionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    challanNo: '',
    qty: ''
  });

  const materialDemand: MaterialDemandItem[] = useMemo(() => {
    const allRequests: MaterialDemandItem[] = [];
    jobs.forEach(job => {
        if (job.purchasingRequests && job.purchasingRequests.length > 0) {
            job.purchasingRequests.forEach(req => {
                allRequests.push({
                    id: req.id,
                    bomItemId: '-', 
                    jobId: job.id,
                    materialName: req.materialName,
                    itemDetail: req.itemDetail || '', // Pulled from request
                    specification: req.specs || '-',
                    category: 'Material', 
                    requiredQty: Number(req.qty),
                    unit: req.unit,
                    unitPrice: req.unitPrice || 0,
                    supplierName: req.supplier || 'TBD',
                    inHouseDueDate: new Date(new Date(req.dateRequested).setDate(new Date(req.dateRequested).getDate() + 14)).toISOString().split('T')[0], 
                    status: req.status === 'PO Issued' ? 'PO Issued' : (req.status === 'Received' ? 'Received' : 'Unpurchased'),
                    poNumber: req.poNumber, 
                    breakdown: req.breakdown,
                    variantMap: req.variantMap,
                    unitsPerPack: req.unitsPerPack || 1,
                    packingUnit: req.packingUnit || 'Pack'
                });
            });
        }
    });
    return allRequests;
  }, [jobs]);

  const [localDemandState, setLocalDemandState] = useState<MaterialDemandItem[]>([]);
  useMemo(() => setLocalDemandState(materialDemand), [materialDemand]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getRiskLevel = (item: MaterialDemandItem) => {
    if (item.status !== 'Unpurchased') return 'none';
    if (item.inHouseDueDate === 'TBD') return 'none';
    const dueDate = new Date(item.inHouseDueDate);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'critical';
    if (diffDays <= 7) return 'high';
    return 'normal';
  };

  const getDaysDifference = (dateString: string) => {
    const target = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredDemand = useMemo(() => {
    return localDemandState.filter(item => {
      const s = searchTerm.toLowerCase();
      const matchesSearch = (item.materialName || '').toLowerCase().includes(s) || (item.supplierName || '').toLowerCase().includes(s) || (item.jobId || '').toLowerCase().includes(s);
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [localDemandState, searchTerm, statusFilter]);
  
  const filteredPOs = useMemo(() => {
    return issuedPOs.filter(po => {
      const s = searchTerm.toLowerCase();
      return (po.poNumber || '').toLowerCase().includes(s) || (po.supplierName || '').toLowerCase().includes(s);
    });
  }, [issuedPOs, searchTerm]);

  const expectedDeliveries = useMemo(() => {
    const list: any[] = [];
    issuedPOs.forEach(po => {
      po.lines?.forEach(line => {
        line.variants.forEach(variant => {
          const received = po.receptions?.filter(r => r.lineItemId === line.id && r.variantId === variant.id).reduce((sum, r) => sum + r.quantity, 0) || 0;
          const balance = variant.quantity - received;
          
          if (balance > 0 || received > 0) {
            list.push({
              poId: po.id,
              poNumber: po.poNumber,
              supplierName: po.supplierName,
              deliveryDate: po.deliveryDate,
              lineId: line.id,
              variantId: variant.id,
              materialName: line.materialName,
              usage: variant.usage,
              unit: variant.unit,
              ordered: variant.quantity,
              received,
              balance
            });
          }
        });
      });
    });

    return list.filter(item => {
        const s = searchTerm.toLowerCase();
        return item.poNumber.toLowerCase().includes(s) || item.supplierName.toLowerCase().includes(s) || item.materialName.toLowerCase().includes(s);
    }).sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());
  }, [issuedPOs, searchTerm]);

  // Delivery Selection Handlers
  const handleToggleDeliverySelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedDeliveryIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDeliveryIds(next);
  };

  const handleSelectAllDeliveries = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedDeliveryIds(new Set(expectedDeliveries.map(i => `${i.poId}-${i.lineId}-${i.variantId}`)));
    } else {
      setSelectedDeliveryIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const ids = filteredDemand.filter(i => i.status === 'Unpurchased').map(i => i.id);
      setSelectedItems(new Set(ids));
    } else setSelectedItems(new Set());
  };

  const handleGeneratePOClick = () => {
    if (selectedItems.size === 0) return;
    const itemsToPurchase = localDemandState.filter(item => selectedItems.has(item.id));
    const suppliers = new Set(itemsToPurchase.map(i => i.supplierName));
    if (suppliers.size > 1) {
      alert("Error: Please select items from a single supplier to generate a consolidated Purchase Order.");
      return;
    }
    const supplierName = itemsToPurchase[0].supplierName;
    const poNumber = `PO-${supplierName.substring(0,3).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const consolidatedMap = new Map<string, DraftItem>();

    itemsToPurchase.forEach(item => {
        const key = item.materialName;
        if (!consolidatedMap.has(key)) {
            consolidatedMap.set(key, {
                id: item.id, 
                sourceIds: [item.id],
                materialName: item.materialName,
                itemDetail: item.itemDetail, // From BOM
                specification: item.specification,
                unitsPerPack: item.unitsPerPack,
                packingUnit: item.packingUnit,
                variants: []
            });
        }
        const entry = consolidatedMap.get(key)!;
        entry.sourceIds.push(item.id);
        if (item.variantMap) {
            Object.entries(item.variantMap).forEach(([k, v]) => {
                const existingVariant = entry.variants.find(vr => vr.usage === k);
                if (existingVariant) existingVariant.qty = Number(existingVariant.qty) + (v as number);
                else {
                    entry.variants.push({
                        id: `var-${key}-${k}-${Math.random()}`,
                        usage: k, note: '', qty: v as number, rate: item.unitPrice || 0, unit: item.unit
                    });
                }
            });
        } else {
            const existingGeneric = entry.variants.find(vr => vr.usage === 'Generic');
            if (existingGeneric) existingGeneric.qty = Number(existingGeneric.qty) + item.requiredQty;
            else {
                entry.variants.push({
                    id: `var-${key}-gen`,
                    usage: '-', note: '', qty: item.requiredQty, rate: item.unitPrice || 0, unit: item.unit
                });
            }
        }
    });

    setDraftPO({
      poNumber, supplierName, currency: 'PKR', taxRate: taxRate || 18.0, applyTax: true, creditTerms: '30 Days',
      deliveryDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0],
      supplierNote: '',
      displayMode: 'Base', 
      items: Array.from(consolidatedMap.values())
    });
    setIsPOModalOpen(true);
  };

  const updateVariant = (itemId: string, variantId: string, field: keyof DraftItemVariant, value: string) => {
    setDraftPO(prev => {
      if (!prev) return null;
      const item = prev.items.find(i => i.id === itemId);
      if (!item) return prev;
      
      const factor = item.unitsPerPack || 1;
      let finalValue: string | number = value;

      if (prev.displayMode === 'Pack') {
          if (field === 'qty') {
              finalValue = (parseFloat(value) || 0) * factor;
          } else if (field === 'rate') {
              finalValue = (parseFloat(value) || 0) / factor;
          }
      }

      return {
        ...prev,
        items: prev.items.map(i => {
            if (i.id !== itemId) return i;
            return {
                ...i,
                variants: i.variants.map(v => {
                    if (v.id !== variantId) return v;
                    return { ...v, [field]: finalValue };
                })
            };
        })
      };
    });
  };

  const handleConfirmPO = () => {
    if (!draftPO) return;
    let subtotal = 0;
    const finalLines: POLineItem[] = [];
    draftPO.items.forEach(item => {
        const variants: POItemVariant[] = item.variants.map(v => {
            const qty = Number(v.qty) || 0;
            const rate = Number(v.rate) || 0;
            const amount = qty * rate;
            subtotal += amount;
            return {
                id: v.id, usage: v.usage, note: v.note, unit: v.unit, quantity: qty, rate: rate, amount: amount
            };
        });
        finalLines.push({
            id: item.id, 
            materialName: item.materialName, 
            description: item.specification, 
            itemDetail: item.itemDetail, // Pass detail
            variants: variants, 
            unitsPerPack: item.unitsPerPack, 
            packingUnit: item.packingUnit
        });
    });

    const taxAmount = draftPO.applyTax ? (subtotal * (draftPO.taxRate / 100)) : 0;
    const totalAmount = subtotal + taxAmount;
    const newPO: IssuedPurchaseOrder = {
      id: Math.random().toString(36).substr(2, 9),
      poNumber: draftPO.poNumber, supplierName: draftPO.supplierName, dateIssued: new Date().toISOString().split('T')[0], currency: draftPO.currency,
      taxRate: draftPO.taxRate, applyTax: draftPO.applyTax, subtotal, taxAmount, totalAmount, itemCount: draftPO.items.length, status: 'Issued',
      creditTerms: draftPO.creditTerms, deliveryDate: draftPO.deliveryDate, supplierNote: draftPO.supplierNote, displayMode: draftPO.displayMode, lines: finalLines,
      receptions: []
    };

    onUpdateIssuedPOs([newPO, ...issuedPOs]);
    const updates = new Map<string, number>(); 
    draftPO.items.forEach(item => {
        const totalVal = item.variants.reduce((acc, v) => acc + (Number(v.qty) * Number(v.rate)), 0);
        const totalQ = item.variants.reduce((acc, v) => acc + Number(v.qty), 0);
        const avgPrice = totalQ > 0 ? totalVal / totalQ : 0;
        item.sourceIds.forEach(sid => updates.set(sid, avgPrice));
    });

    setLocalDemandState(prev => prev.map(item => {
      if (selectedItems.has(item.id)) {
        return { 
          ...item, status: 'PO Issued', poNumber: draftPO.poNumber, unitPrice: updates.get(item.id) || item.unitPrice
        };
      }
      return item;
    }));

    if (onUpdateJobs) {
       const updatedJobs = jobs.map(job => {
          if (!job.purchasingRequests) return job;
          const hasUpdates = job.purchasingRequests.some(req => selectedItems.has(req.id));
          if (!hasUpdates) return job;
          const updatedRequests = job.purchasingRequests.map(req => {
             if (selectedItems.has(req.id)) {
                return { 
                    ...req, status: 'PO Issued', poNumber: draftPO.poNumber, unitPrice: updates.get(req.id) || req.unitPrice
                } as PurchasingRequest;
             }
             return req;
          });
          return { ...job, purchasingRequests: updatedRequests };
       });
       onUpdateJobs(updatedJobs);
    }
    setSuccessMessage(`Successfully created ${newPO.poNumber} and linked ${selectedItems.size} items.`);
    setTimeout(() => setSuccessMessage(null), 4000);
    setIsPOModalOpen(false); setSelectedItems(new Set()); setDraftPO(null); setActiveTab('POs');
  };

  const handleOpenBatchReception = () => {
    const selected = expectedDeliveries.filter(i => 
        selectedDeliveryIds.has(`${i.poId}-${i.lineId}-${i.variantId}`) && i.balance > 0
    );
    if (selected.length === 0) return;
    
    setReceivingItems(selected);
    const initialQtys: Record<string, string> = {};
    selected.forEach(i => {
        initialQtys[`${i.poId}-${i.lineId}-${i.variantId}`] = i.balance.toString();
    });
    setReceptionQtys(initialQtys);
    setIsReceiveModalOpen(true);
  };

  const handleConfirmReception = () => {
    if (receivingItems.length === 0 || !receptionForm.challanNo) return;
    
    let updatedPOs = [...issuedPOs];
    let totalItemsProcessed = 0;

    receivingItems.forEach(item => {
        const itemKey = `${item.poId}-${item.lineId}-${item.variantId}`;
        const qtyReceived = parseFloat(receptionQtys[itemKey]);
        
        if (!isNaN(qtyReceived) && qtyReceived > 0) {
            const newReception: MaterialReception = {
                id: `REC-${Date.now()}-${Math.random()}`,
                date: receptionForm.date,
                challanNo: receptionForm.challanNo,
                quantity: qtyReceived,
                lineItemId: item.lineId,
                variantId: item.variantId
            };

            updatedPOs = updatedPOs.map(po => {
                if (po.id !== item.poId) return po;
                const currentReceptions = po.receptions || [];
                const nextReceptions = [...currentReceptions, newReception];
                
                let allReceived = true;
                po.lines?.forEach(line => {
                    line.variants.forEach(variant => {
                        const totalVariantReceived = nextReceptions
                            .filter(r => r.lineItemId === line.id && r.variantId === variant.id)
                            .reduce((sum, r) => sum + r.quantity, 0);
                        if (totalVariantReceived < variant.quantity) allReceived = false;
                    });
                });

                return { ...po, receptions: nextReceptions, status: allReceived ? 'Closed' : po.status };
            });

            totalItemsProcessed++;
        }
    });

    onUpdateIssuedPOs(updatedPOs);
    
    // Update local demand and jobs statuses
    setLocalDemandState(prev => prev.map(d => {
        const fullyReceived = receivingItems.some(item => {
            if (d.poNumber === item.poNumber && d.materialName === item.materialName) {
                const po = updatedPOs.find(p => p.id === item.poId);
                const line = po?.lines?.find(l => l.id === item.lineId);
                const totalOrdered = line?.variants.reduce((a, b) => a + b.quantity, 0) || 0;
                const totalReceived = po?.receptions?.filter(r => r.lineItemId === item.lineId).reduce((a, b) => a + b.quantity, 0) || 0;
                return totalReceived >= totalOrdered;
            }
            return false;
        });
        return fullyReceived ? { ...d, status: 'Received' } : d;
    }));

    if (onUpdateJobs) {
        const updatedJobs = jobs.map(job => {
            if (!job.purchasingRequests) return job;
            const updatedRequests = job.purchasingRequests.map(req => {
                const matchingItem = receivingItems.find(i => i.poNumber === req.poNumber && i.materialName === req.materialName);
                if (matchingItem) {
                    const po = updatedPOs.find(p => p.id === matchingItem.poId);
                    const line = po?.lines?.find(l => l.id === matchingItem.lineId);
                    const totalOrdered = line?.variants.reduce((a, b) => a + b.quantity, 0) || 0;
                    const totalReceived = po?.receptions?.filter(r => r.lineItemId === matchingItem.lineId).reduce((a, b) => a + b.quantity, 0) || 0;
                    if (totalReceived >= totalOrdered) return { ...req, status: 'Received' } as PurchasingRequest;
                }
                return req;
            });
            return { ...job, purchasingRequests: updatedRequests };
        });
        onUpdateJobs(updatedJobs);
    }

    setSuccessMessage(`Received ${totalItemsProcessed} item(s) for Challan #${receptionForm.challanNo}`);
    setTimeout(() => setSuccessMessage(null), 3000);
    setIsReceiveModalOpen(false);
    setReceivingItems([]);
    setSelectedDeliveryIds(new Set());
    setReceptionForm({ date: new Date().toISOString().split('T')[0], challanNo: '', qty: '' });
  };

  const handlePrintDeliveryLog = () => {
    const itemsToPrint = expectedDeliveries.filter(item => 
        selectedDeliveryIds.has(`${item.poId}-${item.lineId}-${item.variantId}`)
    );
    if (itemsToPrint.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = itemsToPrint.map(item => {
        const po = issuedPOs.find(p => p.id === item.poId);
        const poDate = po?.dateIssued || '-';
        const poDeliveryDate = item.deliveryDate;
        
        const receptions = po?.receptions?.filter(r => r.lineItemId === item.lineId && r.variantId === item.variantId) || [];
        
        const deliveryDatesHtml = receptions.map(r => `<div>${formatAppDate(r.date)}</div>`).join('') || '-';
        const challansHtml = receptions.map(r => `<div>${r.challanNo}</div>`).join('') || '-';
        const qtysHtml = receptions.map(r => `<div>${r.quantity.toLocaleString()}</div>`).join('') || '-';

        let totalDays = '-';
        if (item.balance === 0 && receptions.length > 0) {
            const lastDate = new Date(receptions[receptions.length - 1].date);
            const startDate = new Date(poDate);
            if (!isNaN(lastDate.getTime()) && !isNaN(startDate.getTime())) {
                const diff = Math.ceil((lastDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                totalDays = `${diff} Days`;
            }
        }

        return `
            <tr>
                <td>
                    <div style="font-weight: 800; color: #1e3a8a;">${item.poNumber}</div>
                    <div style="font-size: 9px; color: #6b7280; text-transform: uppercase;">${item.supplierName}</div>
                </td>
                <td>
                    <div style="font-weight: 700;">${item.materialName}</div>
                    <div style="font-size: 9px; color: #9ca3af; text-transform: uppercase;">${item.usage}</div>
                </td>
                <td style="font-family: monospace; color: #4b5563;">${formatAppDate(poDate)}</td>
                <td style="font-family: monospace; font-weight: bold;">${formatAppDate(poDeliveryDate)}</td>
                <td style="padding: 0;">
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                        <tr style="border: none;">
                            <td style="border: none; width: 40%; font-family: monospace; border-right: 1px solid #e5e7eb; padding: 4px 8px;">${deliveryDatesHtml}</td>
                            <td style="border: none; width: 40%; font-weight: bold; border-right: 1px solid #e5e7eb; padding: 4px 8px;">${challansHtml}</td>
                            <td style="border: none; width: 20%; text-align: right; font-family: monospace; padding: 4px 8px;">${qtysHtml}</td>
                        </tr>
                    </table>
                </td>
                <td style="text-align: center; font-weight: 800; background: #f8fafc;">${totalDays}</td>
            </tr>
        `;
    }).join('');

    printWindow.document.write(`
        <html>
            <head>
                <title>Material Delivery Log - Nizamia</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; }
                    h1 { font-size: 24px; font-weight: 900; text-transform: uppercase; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 2px solid #000; }
                    th { background-color: #f3f4f6; text-align: left; padding: 10px 8px; border: 1.5px solid #000; font-size: 9px; text-transform: uppercase; font-weight: 800; color: #374151; letter-spacing: 0.05em; }
                    td { padding: 8px; border: 1px solid #d1d5db; font-size: 10px; border: 1px solid #000; }
                    .header-meta { margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
                </style>
            </head>
            <body>
                <h1>
                    <span>Material In-House Delivery Log</span>
                    <span style="font-size: 14px; color: #999;">Nizamia Apparels</span>
                </h1>
                <div class="header-meta">
                    <div style="font-size: 11px; font-weight: 600; color: #4b5563;">
                        Total Items Tracked: <strong>${itemsToPrint.length}</strong>
                    </div>
                    <div style="font-size: 9px; color: #9ca3af; text-transform: uppercase; font-weight: 700;">
                        Report Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th width="15%">PO # / Supplier</th>
                            <th width="20%">Material Description</th>
                            <th width="10%">PO Date</th>
                            <th width="10%">PO Delivery</th>
                            <th width="35%">Actual Deliveries (Date / Challan # / Qty)</th>
                            <th width="10%">Lead Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                <div style="margin-top: 40px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #eee; pt: 20px;">
                    This document is a system-generated audit log of material movements for Nizamia Merchandising & Supply Chain.
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
        </html>
    `);
    printWindow.document.close();
  };

  const initiatePrint = (po: IssuedPurchaseOrder) => {
    setPoToPrint(po);
    setIsPrintModalOpen(true);
  };

  const executePrint = () => {
    if (!poToPrint) return;
    const activeCopies: string[] = [];
    if (printOptions.original) activeCopies.push("ORIGINAL");
    if (printOptions.merchandiser) activeCopies.push("MERCHANDISER'S COPY");
    if (printOptions.accounts) activeCopies.push("ACCOUNTS COPY");
    if (printOptions.store) activeCopies.push("STORE COPY");
    if (activeCopies.length === 0) { alert("Please select at least one copy to print."); return; }

    const printWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) return;

    let poLines = poToPrint.lines || [];
    if (poLines.length === 0) {
        const rawItems = materialDemand.filter(item => item.poNumber === poToPrint.poNumber);
        const grouped = new Map<string, POLineItem>();
        rawItems.forEach(item => {
            if (!grouped.has(item.materialName)) {
                grouped.set(item.materialName, {
                    id: item.id, materialName: item.materialName, description: item.specification, itemDetail: item.itemDetail, variants: [], unitsPerPack: item.unitsPerPack, packingUnit: item.packingUnit
                });
            }
            const entry = grouped.get(item.materialName)!;
            entry.variants.push({
                id: item.id, usage: '-', note: '', unit: item.unit, quantity: item.requiredQty, rate: item.unitPrice, amount: item.requiredQty * item.unitPrice
            });
        });
        poLines = Array.from(grouped.values());
    }

    const supplierInfo = MOCK_SUPPLIERS.find(s => s.name === poToPrint.supplierName);
    const supplierAddress = supplierInfo?.address || 'Address on file';
    const supplierSalesTax = supplierInfo?.salesTaxId || '1234567890';
    const companyName = companyDetails?.name || "Nizamia Apparels";
    const companyAddress = companyDetails?.address || "Plot# RCC14, Shed Nr 02, Estate Avenue Road, SITE Area, Karachi 75700, Pakistan";
    const companyPhone = companyDetails?.phone || "+92 21 32564717";
    const companyLogo = companyDetails?.logoUrl || LOGO_URL;
    const linkedJob = materialDemand.find(m => m.poNumber === poToPrint.poNumber)?.jobId || 'N/A';
    const f = (n: number) => n.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const amountInWords = numberToWords(poToPrint.totalAmount, poToPrint.currency);
    const now = new Date();
    const printDate = `${now.toLocaleDateString('en-GB')} at ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    const deliveryDateFormatted = formatAppDate(poToPrint.deliveryDate);

    // Map companyDetails.poTerms to <li> elements
    const poTermsHtml = (companyDetails?.poTerms || `1. Deliveries must be made between 09:00 AM and 05:00 PM (Mon-Sat).
2. Items must strictly adhere to the approved quality samples.
3. Payment will be processed as per credit terms days after GRN.
4. Partial shipments are accepted only with prior written approval.
5. We reserve the right to return non-compliant goods.`)
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
          const cleanLine = line.replace(/^\d+[\.\)]\s*|^\-\s*/, '');
          return `<li>${cleanLine} ${line.toLowerCase().includes('payment') && poToPrint.creditTerms ? `(${poToPrint.creditTerms})` : ''}</li>`;
      })
      .join('');

    const renderTableRows = () => {
        let globalIndex = 1;
        const isPackMode = poToPrint.displayMode === 'Pack';

        return poLines.map((line) => {
            const rowCount = line.variants.length;
            const factor = line.unitsPerPack || 1;

            return line.variants.map((variant, vIndex) => {
                const displayQty = isPackMode ? (variant.quantity / factor) : variant.quantity;
                const displayRate = isPackMode ? (variant.rate * factor) : variant.rate;
                const displayUnitName = isPackMode ? (line.packingUnit || 'Pack') : variant.unit;

                return `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    ${vIndex === 0 ? `<td class="py-2 text-center text-gray-700 text-sm align-top border-r border-gray-300 font-bold" rowspan="${rowCount}">${globalIndex++}</td>` : ''}
                    ${vIndex === 0 ? `
                        <td class="py-2 text-left text-gray-800 text-sm align-top border-r border-gray-300 pl-2" rowspan="${rowCount}">
                            <span class="font-bold text-gray-900 block">${line.materialName}</span>
                            ${line.itemDetail ? `<span class="text-[11px] text-blue-600 block mt-0.5 font-bold uppercase">COLOUR/FINISH: ${line.itemDetail}</span>` : ''}
                            <span class="text-[10px] text-gray-500 italic block mt-1">${line.description}</span>
                        </td>
                    ` : ''}
                    <td class="py-2 text-left text-gray-700 text-sm align-middle border-r border-gray-200 pl-2 font-medium">${variant.usage}</td>
                    <td class="py-2 text-left text-gray-500 text-xs align-middle border-r border-gray-200 pl-2 italic">${variant.note || ''}</td>
                    <td class="py-2 text-center text-gray-600 text-xs align-middle border-r border-gray-200 uppercase font-bold">
                        <div>${displayUnitName}</div>
                        ${line.unitsPerPack && line.unitsPerPack > 1 ? `<div class="text-[8px] text-blue-600 mt-0.5 font-bold">1 ${line.packingUnit} = ${line.unitsPerPack} ${variant.unit}</div>` : ''}
                    </td>
                    <td class="py-2 text-right text-gray-800 text-sm align-middle border-r border-gray-200 font-bold pr-2">${displayQty.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                    <td class="py-2 text-right text-gray-800 text-sm align-middle border-r border-gray-200 font-medium pr-2">${f(displayRate)}</td>
                    <td class="py-2 text-right text-gray-900 text-sm align-middle font-bold pr-2 bg-transparent">${f(variant.amount)}</td>
                </tr>
                `;
            }).join('');
        }).join(``);
    };

    const pagesHtml = activeCopies.map((copyType, index) => `
        <div class="print-page ${index > 0 ? 'page-break' : ''}">
            <div class="watermark-layer">${copyType.split(' ')[0]}</div>
            <div class="content-layer">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex items-start gap-4">
                        <img src="${companyLogo}" class="h-10 object-contain" style="max-width: 80px;" />
                        <div class="pt-0">
                            <h1 class="text-2xl font-bold text-[#111] leading-none">${companyName}</h1>
                            <p class="text-[10px] text-gray-600 mt-1 max-w-sm leading-snug">${companyAddress}</p>
                            <p class="text-[10px] text-gray-600 leading-snug">${companyPhone}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <h1 class="text-4xl font-bold text-[#222] tracking-tight">Purchase Order</h1>
                        <p class="text-lg font-bold text-gray-400 uppercase tracking-widest mt-0">${copyType}</p>
                        <p class="text-[9px] text-gray-500 mt-1">Printed on ${printDate}</p>
                        <p class="text-[9px] text-gray-500">Username: ${currentUser || 'Admin'}</p>
                    </div>
                </div>
                <div class="border-b-2 border-black mb-6"></div>
                <div class="grid grid-cols-2 gap-12 mb-8 text-sm">
                    <div class="space-y-1">
                        <div class="grid grid-cols-[100px_1fr]"><span class="font-bold text-gray-900">Vendor Name</span><span class="text-gray-800">${poToPrint.supplierName}</span></div>
                        <div class="grid grid-cols-[100px_1fr]"><span class="font-bold text-gray-900">Vendor Address</span><span class="text-gray-800 leading-snug">${supplierAddress}</span></div>
                        <div class="grid grid-cols-[100px_1fr]"><span class="font-bold text-gray-900">Sales Tax #</span><span class="text-gray-800">${supplierSalesTax}</span></div>
                        <div class="grid grid-cols-[100px_1fr]"><span class="font-bold text-gray-900">Job Number</span><span class="text-gray-800 font-bold">${linkedJob}</span></div>
                    </div>
                    <div class="space-y-1">
                        <div class="grid grid-cols-[100px_1fr]"><span class="font-bold text-gray-900">PO Number</span><span class="text-gray-800 font-medium text-lg leading-none">${poToPrint.poNumber}</span></div>
                        <div class="grid grid-cols-[100px_1fr]"><span class="font-bold text-gray-900">PO Date</span><span class="text-gray-800">${formatAppDate(poToPrint.dateIssued)}</span></div>
                        <div class="grid grid-cols-[100px_1fr]"><span class="font-bold text-gray-900">Delivery Date</span><span class="text-gray-800 text-red-600 font-bold">${deliveryDateFormatted}</span></div>
                        <div class="grid grid-cols-[100px_1fr]"><span class="font-bold text-gray-900">Terms</span><span class="text-gray-800 font-bold">${poToPrint.creditTerms}</span></div>
                    </div>
                </div>
                <div class="border-b-2 border-black mb-1"></div>
                <div class="mb-4 relative z-10 flex-grow">
                    <table class="w-full border-collapse">
                        <thead>
                            <tr class="text-black">
                                <th class="py-2 text-center text-sm font-bold w-10 border-b-2 border-black">#</th>
                                <th class="py-2 text-left pl-2 text-sm font-bold border-b-2 border-black">Item Description</th>
                                <th class="py-2 text-left pl-2 text-sm font-bold w-24 border-b-2 border-black">Usage</th>
                                <th class="py-2 text-left pl-2 text-sm font-bold w-24 border-b-2 border-black">Note</th>
                                <th class="py-2 text-center text-sm font-bold w-24 border-b-2 border-black">Unit</th>
                                <th class="py-2 text-right pr-2 text-sm font-bold w-20 border-b-2 border-black">Quantity</th>
                                <th class="py-2 text-right pr-2 text-sm font-bold w-20 border-b-2 border-black">Rate</th>
                                <th class="py-2 text-right pr-2 text-sm font-bold w-28 border-b-2 border-black">Amount</th>
                            </tr>
                        </thead>
                        <tbody>${renderTableRows()}</tbody>
                    </table>
                </div>
                <div class="border-t-2 border-black mt-2"></div>
                <div class="flex justify-between items-start mt-4">
                    <div class="w-7/12 pr-8">
                        <div><p class="text-sm font-bold text-gray-900">Amount in Words</p><p class="text-sm text-gray-800 font-medium italic mt-0.5 leading-snug">${amountInWords}</p></div>
                        ${poToPrint.supplierNote ? `
                        <div class="mt-4">
                            <p class="text-[10px] font-bold text-blue-600 uppercase mb-1">Note to Supplier</p>
                            <p class="text-xs text-gray-800 font-medium leading-snug bg-blue-50/30 p-2 border border-blue-100 rounded">${poToPrint.supplierNote}</p>
                        </div>
                        ` : ''}
                        <div class="mt-6">
                            <p class="text-[10px] font-bold text-gray-900 uppercase mb-1">Terms & Conditions</p>
                            <ul class="text-[9px] text-gray-600 list-disc pl-3 space-y-0.5 leading-tight">
                                ${poTermsHtml}
                            </ul>
                        </div>
                    </div>
                    <div class="w-5/12 pl-4">
                        <table className="w-full text-sm">
                            <tr><td class="text-gray-800 py-1 text-right pr-4">Sub Total</td><td class="text-right font-mono font-medium">${poToPrint.currency} ${f(poToPrint.subtotal)}</td></tr>
                            ${poToPrint.applyTax ? `<tr><td class="text-gray-800 py-1 text-right pr-4">Tax / VAT (${poToPrint.taxRate}%)</td><td class="text-right font-mono font-medium">${poToPrint.currency} ${f(poToPrint.taxAmount)}</td></tr>` : ''}
                            <tr><td class="py-2 text-right pr-4"><span class="font-bold text-base text-black">Grand Total</span></td><td class="py-2 text-right"><span class="font-bold text-lg font-mono text-black">${poToPrint.currency} ${f(poToPrint.totalAmount)}</span></td></tr>
                        </table>
                    </div>
                </div>
                <div class="flex-grow min-h-[100px]"></div>
                <div class="mt-8 pt-4 border-t-2 border-black">
                    <div class="grid grid-cols-4 gap-8 text-left">
                        <div><p class="text-[10px] font-bold uppercase text-black mb-8">Prepared By</p><div class="text-[9px] text-gray-500">Merchandising</div></div>
                        <div><p class="text-[10px] font-bold uppercase text-black mb-8">Checked By</p><div class="text-[9px] text-gray-500">Accounts</div></div>
                        <div><p class="text-[10px] font-bold uppercase text-black mb-8">Approved By</p><div class="text-[9px] text-gray-500">Director / GM</div></div>
                        <div class="text-right"><p class="text-[10px] font-bold uppercase text-black mb-8">Supplier Acceptance</p><div class="text-[9px] text-gray-500">Sign & Stamp</div></div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>PO_${poToPrint.poNumber}</title><script src="https://cdn.tailwindcss.com"></script><style>body { font-family: sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; background: #eee; } @page { size: A4; margin: 0; } .print-page { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; padding: 10mm 15mm; position: relative; display: flex; flex-direction: column; box-shadow: 0 0 10px rgba(0,0,0,0.1); overflow: hidden; } .page-break { page-break-before: always; margin-top: 20px; } .watermark-layer { position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; z-index: 0; pointer-events: none; font-size: 130px; font-weight: 900; color: rgba(220, 220, 220, 0.4); transform: rotate(-45deg); text-transform: uppercase; user-select: none; white-space: nowrap; } .content-layer { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; } table, tr, td, th { background-color: transparent !important; } @media print { body { background: white; } .print-page { box-shadow: none; margin: 0; width: 100%; height: 100%; } .page-break { margin-top: 0; } }</style></head><body>${pagesHtml}<script>setTimeout(() => { window.print(); }, 800);</script></body></html>`;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setIsPrintModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-[#37352F]">Purchasing & Material Demand</h1>
            <p className="text-sm text-gray-500">Manage material requests generated from approved Job Plans.</p>
          </div>
        </div>
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            <button onClick={() => setActiveTab('Demand')} className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Demand' ? 'border-[#37352F] text-[#37352F]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}><ShoppingCart size={16} /> Material Demand</button>
            <button onClick={() => setActiveTab('POs')} className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'POs' ? 'border-[#37352F] text-[#37352F]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}><Receipt size={16} /> Issued Purchase Orders</button>
            <button onClick={() => setActiveTab('Deliveries')} className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'Deliveries' ? 'border-[#37352F] text-[#37352F]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}><Inbox size={16} /> Expected Deliveries</button>
          </div>
        </div>
        {successMessage && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2"><CheckCircle2 size={18} /><span className="text-sm font-medium">{successMessage}</span></div>}
        {activeTab === 'Demand' ? (
          <>
            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
               <div className="flex gap-4 w-full md:w-auto items-center">
                   <div className="relative w-full md:w-64 lg:w-80">
                      <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                      <input type="text" placeholder="Search Job, Supplier, or Item..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                   </div>
                   <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 text-sm border border-gray-200 rounded-md outline-none bg-white text-gray-600 focus:border-blue-500 hover:border-gray-300 cursor-pointer">
                      <option value="All">All Statuses</option>
                      <option value="Unpurchased">Unpurchased</option>
                      <option value="PO Issued">PO Issued</option>
                   </select>
               </div>
               <button onClick={handleGeneratePOClick} disabled={selectedItems.size === 0} className={`flex items-center gap-2 px-5 py-2 rounded-md shadow-sm text-sm font-medium transition-all ${selectedItems.size > 0 ? 'bg-[#37352F] text-white hover:bg-black hover:shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}><ShoppingCart size={16} /> Generate Purchase Order {selectedItems.size > 0 && `(${selectedItems.size})`}</button>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left text-sm border-collapse min-w-[1100px]">
                   <thead className="bg-[#F7F7F5] text-[11px] font-black uppercase tracking-[0.1em] text-gray-500 border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                         <th className="px-4 py-4 w-12 text-center"><input type="checkbox" onChange={handleSelectAll} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /></th>
                         <th className="px-4 py-4">JOB ID</th>
                         <th className="px-4 py-4 w-1/4">MATERIAL NAME & SPEC</th>
                         <th className="px-4 py-4 text-right">REQ. QTY</th>
                         <th className="px-4 py-4">SUPPLIER</th>
                         <th className="px-4 py-4">NEEDED BY</th>
                         <th className="px-4 py-4">STATUS</th>
                         <th className="px-4 py-4 text-center">LINKED PO #</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {filteredDemand.map(item => {
                         const risk = getRiskLevel(item);
                         const isSelected = selectedItems.has(item.id);
                         const isHighRisk = (risk === 'critical' || risk === 'high');
                         return (
                           <tr key={item.id} className={`group transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'} ${isHighRisk && item.status === 'Unpurchased' ? 'bg-red-50/60 hover:bg-red-100/80' : ''}`}>
                              <td className="px-4 py-3 text-center">{item.status === 'Unpurchased' && (<input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(item.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />)}</td>
                              <td className="px-4 py-3"><span className="font-medium text-gray-700 font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{item.jobId}</span></td>
                              <td className="px-4 py-3">
                                 <div className="flex flex-col">
                                    <span className="font-medium text-[#37352F]">{item.materialName}</span>
                                    {item.itemDetail && <span className="text-[10px] text-blue-600 font-bold uppercase">Col/Fin: {item.itemDetail}</span>}
                                    <span className="text-xs text-gray-500">{item.specification}</span>
                                    {item.unitsPerPack && item.unitsPerPack > 1 && <span className="text-[10px] font-bold text-blue-600 mt-1 uppercase">PACK: {item.unitsPerPack} {item.unit} / {item.packingUnit}</span>}
                                    {item.variantMap ? (<div className="mt-1 flex flex-wrap gap-1">{Object.entries(item.variantMap).map(([key, val]) => (<span key={key} className="text-[10px] text-gray-600 bg-gray-100 px-1 rounded border border-gray-200">{key}: {val}</span>))}</div>) : item.breakdown && (<div className="mt-1 text-[10px] text-gray-500 font-mono bg-gray-50 p-1 rounded border border-gray-100 w-fit">{item.breakdown}</div>)}
                                 </div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-gray-700">{item.requiredQty.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs text-gray-400">{item.unit}</span></td>
                              <td className="px-4 py-3 text-gray-600">{item.supplierName}</td>
                              <td className="px-4 py-3"><div className="flex items-center gap-2">{risk === 'critical' && item.status === 'Unpurchased' && <AlertTriangle size={14} className="text-red-500" />}{risk === 'high' && item.status === 'Unpurchased' && <AlertCircle size={14} className="text-orange-500" />}<span className={`font-medium ${risk === 'critical' && item.status === 'Unpurchased' ? 'text-red-600' : risk === 'high' && item.status === 'Unpurchased' ? 'text-orange-600' : 'text-gray-600'}`}>{item.inHouseDueDate}</span></div></td>
                              <td className="px-4 py-3"><span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${item.status === 'Received' ? 'bg-green-50 text-green-700 border-green-200' : item.status === 'PO Issued' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{item.status}</span></td>
                              <td className="px-4 py-3 text-center">{item.poNumber ? (<div className="flex items-center justify-center gap-1 text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded"><Link size={10} /><span className="text-xs font-mono font-medium">{item.poNumber}</span></div>) : (<span className="text-gray-300">-</span>)}</td>
                           </tr>
                         );
                      })}
                   </tbody>
                </table>
              </div>
            </div>
          </>
        ) : activeTab === 'POs' ? (
          <div className="flex-1 flex flex-col space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm flex gap-4 items-center">
               <div className="relative w-full md:w-80"><Search size={16} className="absolute left-3 top-2.5 text-gray-400" /><input type="text" placeholder="Search PO Number or Supplier..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" /></div>
               <button className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-500"><Filter size={16} /></button>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
                   <thead className="bg-[#F7F7F5] text-[11px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4">PO NUMBER</th>
                        <th className="px-6 py-4 text-center">PO ITEMS</th>
                        <th className="px-6 py-4">SUPPLIER</th>
                        <th className="px-6 py-4">DATE ISSUED</th>
                        <th className="px-6 py-4">DELIVERY DATE</th>
                        <th className="px-6 py-4">CREDIT TERMS</th>
                        <th className="px-6 py-4 text-right">TOTAL AMOUNT</th>
                        <th className="px-6 py-4">STATUS</th>
                        <th className="px-6 py-4 text-right">ACTIONS</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {filteredPOs.map(po => (
                        <tr key={po.id} className="group hover:bg-gray-50 transition-colors">
                           <td className="px-6 py-4 font-mono font-medium text-blue-700">{po.poNumber}</td>
                           <td className="px-6 py-4 text-center text-gray-600">{po.itemCount}</td>
                           <td className="px-6 py-4 font-medium text-gray-800">{po.supplierName}</td>
                           <td className="px-6 py-4 text-gray-600">{po.dateIssued}</td>
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                  <span className="text-gray-800 font-bold">{formatAppDate(po.deliveryDate)}</span>
                                  {(() => {
                                      const diff = getDaysDifference(po.deliveryDate);
                                      if (diff === 0) return <span className="text-[10px] text-orange-600 font-bold italic">Due Today</span>;
                                      if (diff === 1) return <span className="text-[10px] text-blue-600 italic">1 Day left</span>;
                                      if (diff > 1) return <span className="text-[10px] text-gray-400 italic">{diff} Days left</span>;
                                      return <span className="text-[10px] text-red-600 font-bold italic">{Math.abs(diff)} Days Overdue</span>;
                                  })()}
                              </div>
                           </td>
                           <td className="px-6 py-4 text-gray-600">{po.creditTerms || '-'}</td>
                           <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">{po.currency} {po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                           <td className="px-6 py-4"><span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${po.status === 'Closed' ? 'bg-green-50 text-green-700 border-green-200' : po.status === 'Sent' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>{po.status}</span></td>
                           <td className="px-6 py-4 text-right"><button onClick={() => initiatePrint(po)} className="text-gray-400 hover:text-blue-600 p-1.5 rounded transition-colors hover:bg-blue-50" title="Print PO"><Printer size={16} /></button></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-4 animate-in fade-in slide-in-from-right-4">
             <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm flex gap-4 items-center">
                <div className="relative w-full md:w-80"><Search size={16} className="absolute left-3 top-2.5 text-gray-400" /><input type="text" placeholder="Search Expected Deliveries..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 outline-none" /></div>
                <div className="ml-auto flex items-center gap-3">
                   <button 
                      disabled={selectedDeliveryIds.size === 0}
                      onClick={handleOpenBatchReception}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all shadow-sm text-xs font-bold uppercase tracking-tight disabled:opacity-50 disabled:grayscale"
                   >
                      <PackageIcon size={16} /> Mark Received
                   </button>
                   <button 
                      disabled={selectedDeliveryIds.size === 0}
                      onClick={handlePrintDeliveryLog}
                      className="p-2 bg-white border border-gray-200 text-gray-500 rounded-md hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                      title="Print Delivery Log"
                   >
                      <Printer size={20} />
                   </button>
                   <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">
                      <BarChart size={14} className="text-blue-600" />
                      <span className="text-xs font-bold text-blue-700 uppercase">In-Transit: {expectedDeliveries.length} items</span>
                   </div>
                </div>
             </div>
             <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                   <table className="w-full text-left text-sm border-collapse min-w-[1100px]">
                      <thead className="bg-[#F7F7F5] text-[11px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-200 sticky top-0 z-10">
                         <tr>
                            <th className="px-4 py-4 w-12 text-center">
                               <input 
                                  type="checkbox"
                                  checked={expectedDeliveries.length > 0 && selectedDeliveryIds.size === expectedDeliveries.length}
                                  onChange={handleSelectAllDeliveries}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                               />
                            </th>
                            <th className="px-6 py-4">PO # / SUPPLIER</th>
                            <th className="px-6 py-4">MATERIAL DESCRIPTION</th>
                            <th className="px-6 py-4 text-center">DEADLINE</th>
                            <th className="px-6 py-4 text-right">ORDERED</th>
                            <th className="px-6 py-4 text-right">RECEIVED</th>
                            <th className="px-6 py-4 text-right">BALANCE</th>
                            <th className="px-6 py-4 text-center">STATUS</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                         {expectedDeliveries.map((item, idx) => {
                           const itemKey = `${item.poId}-${item.lineId}-${item.variantId}`;
                           const isSelected = selectedDeliveryIds.has(itemKey);
                           
                           return (
                           <tr key={itemKey} className={`group hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/30' : ''}`} onClick={(e) => handleToggleDeliverySelect(itemKey, e)}>
                              <td className="px-4 py-4 text-center">
                                 <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    readOnly
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                                 />
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex flex-col">
                                    <span className="font-mono font-bold text-blue-700 text-sm">{item.poNumber}</span>
                                    <span className="text-xs text-gray-500 font-medium uppercase mt-0.5">{item.supplierName}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex flex-col">
                                    <span className="font-bold text-[#37352F]">{item.materialName}</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{item.usage}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <div className="flex flex-col items-center">
                                    <span className="font-mono text-gray-700 font-bold">{formatAppDate(item.deliveryDate)}</span>
                                    {getDaysDifference(item.deliveryDate) < 0 && <span className="text-[8px] text-red-500 font-black uppercase">OVERDUE</span>}
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-gray-500">{item.ordered.toLocaleString()} <span className="text-[10px] font-normal">{item.unit}</span></td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-green-600">{item.received.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-orange-600">{item.balance.toLocaleString()}</td>
                              <td className="px-6 py-4 text-center">
                                 <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${item.received === 0 ? 'bg-gray-50 text-gray-400' : item.balance === 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                    {item.received === 0 ? 'Pending' : item.balance === 0 ? 'In-House' : 'Partial'}
                                 </span>
                              </td>
                           </tr>
                         )})}
                         {expectedDeliveries.length === 0 && (
                           <tr><td colSpan={8} className="p-20 text-center text-gray-300 italic font-medium"><Inbox size={48} className="mx-auto mb-2 opacity-10" />No pending deliveries found.</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}

      {isReceiveModalOpen && receivingItems.length > 0 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 space-y-6 border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-3 text-blue-700">
                    <div className="p-2 bg-blue-50 rounded-lg"><PackageIcon size={24} /></div>
                    <div>
                       <h3 className="text-xl font-bold">Record Material Receipt</h3>
                       <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{receivingItems.length} Item(s) Selected</p>
                    </div>
                 </div>
                 <button onClick={() => setIsReceiveModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
              </div>

              <div className="grid grid-cols-2 gap-4 shrink-0 bg-gray-50 p-4 rounded-xl border border-gray-100">
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Receive Date</label>
                    <input type="date" value={receptionForm.date} onChange={e => setReceptionForm({...receptionForm, date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:border-blue-500 outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Challan #</label>
                    <input type="text" value={receptionForm.challanNo} onChange={e => setReceptionForm({...receptionForm, challanNo: e.target.value})} placeholder="DC-000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase font-bold focus:border-blue-500 outline-none" />
                 </div>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar border border-gray-200 rounded-xl">
                 <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 sticky top-0">
                        <tr>
                            <th className="px-4 py-2">Item Description</th>
                            <th className="px-4 py-2 text-right">Balance</th>
                            <th className="px-4 py-2 text-center w-32">Qty Received</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {receivingItems.map(item => {
                            const itemKey = `${item.poId}-${item.lineId}-${item.variantId}`;
                            return (
                                <tr key={itemKey}>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-gray-800">{item.materialName}</div>
                                        <div className="text-[10px] text-gray-400 uppercase font-bold">{item.poNumber} • {item.usage}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-500">
                                        {item.balance.toLocaleString()} {item.unit}
                                    </td>
                                    <td className="px-4 py-3">
                                        <input 
                                            type="number" 
                                            max={item.balance}
                                            value={receptionQtys[itemKey] || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setReceptionQtys(prev => ({ ...prev, [itemKey]: val }));
                                            }}
                                            className="w-full px-2 py-1.5 bg-blue-50 border border-blue-100 rounded-md text-right font-mono font-bold text-blue-700 outline-none focus:border-blue-500"
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                 </table>
              </div>

              <div className="flex flex-col gap-3 pt-4 shrink-0">
                 <button 
                    disabled={!receptionForm.challanNo || receivingItems.some(i => !receptionQtys[`${i.poId}-${i.lineId}-${i.variantId}`] || parseFloat(receptionQtys[`${i.poId}-${i.lineId}-${i.variantId}`]) <= 0)}
                    onClick={handleConfirmReception}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:grayscale"
                 >
                    Confirm In-House (Batch)
                 </button>
                 <button 
                    onClick={() => setIsReceiveModalOpen(false)}
                    className="w-full py-2 text-sm text-gray-400 font-bold hover:text-gray-600 transition-colors"
                 >
                    Cancel
                 </button>
              </div>
           </div>
        </div>
      )}

      {isPOModalOpen && draftPO && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center shadow-sm text-gray-700"><FileText size={20} /></div>
                    <div>
                        <h2 className="text-lg font-bold text-[#37352F]">Generate Purchase Order</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">PO #: <span className="text-blue-600 font-mono">{draftPO.poNumber}</span></span>
                        </div>
                    </div>
                 </div>
                 
                 <div className="flex bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
                    <button 
                        onClick={() => setDraftPO({...draftPO, displayMode: 'Base'})}
                        className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-all flex items-center gap-2
                            ${draftPO.displayMode === 'Base' ? 'bg-[#37352F] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Layers size={14} /> Base UOM
                    </button>
                    <button 
                        onClick={() => setDraftPO({...draftPO, displayMode: 'Pack'})}
                        className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-all flex items-center gap-2
                            ${draftPO.displayMode === 'Pack' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <PackageIcon size={14} /> Packing Units
                    </button>
                 </div>

                 <button onClick={() => setIsPOModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="space-y-1.5"><label className="text-xs font-black text-gray-500 uppercase tracking-widest">SUPPLIER</label><select value={draftPO.supplierName} onChange={(e) => setDraftPO({ ...draftPO, supplierName: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm">{MOCK_SUPPLIERS.map(sup => (<option key={sup.id} value={sup.name}>{sup.name}</option>))}{!MOCK_SUPPLIERS.find(s => s.name === draftPO.supplierName) && (<option value={draftPO.supplierName}>{draftPO.supplierName}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-xs font-black text-gray-500 uppercase tracking-widest">CREDIT TERMS</label><div className="relative"><input list="credit-terms" value={draftPO.creditTerms} onChange={(e) => setDraftPO({ ...draftPO, creditTerms: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm" placeholder="Select or Type..." /><datalist id="credit-terms">{CREDIT_TERMS_OPTIONS.map(opt => <option key={opt} value={opt} />)}</datalist></div></div>
                    <div className="space-y-1.5"><label className="text-xs font-black text-gray-500 uppercase tracking-widest">CURRENCY</label><select value={draftPO.currency} onChange={(e) => setDraftPO({ ...draftPO, currency: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"><option value="PKR">PKR (Rs)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option><option value="CNY">CNY (¥)</option></select></div>
                    <div className="space-y-1.5"><label className="text-xs font-black text-gray-500 uppercase tracking-widest">DELIVERY DATE</label><div className="relative"><Calendar size={14} className="absolute left-3 top-2.5 text-gray-400" /><input type="date" value={draftPO.deliveryDate} onChange={(e) => setDraftPO({ ...draftPO, deliveryDate: e.target.value })} className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm" /></div></div>
                 </div>

                 {draftPO.displayMode === 'Pack' && (
                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3 mb-6 animate-in slide-in-from-top-2">
                        <ArrowRightLeft size={18} className="text-blue-600" />
                        <p className="text-xs text-blue-700 font-medium">
                            <strong>Packing Mode Active:</strong> Quantities are shown in specific packing units defined in BOM. Rates are per Unit.
                        </p>
                     </div>
                 )}

                 <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-6">
                    <table className="w-full text-left text-sm border-collapse table-fixed">
                       <thead className="bg-gray-100 text-xs font-black text-gray-500 uppercase border-b border-gray-200 tracking-widest">
                          <tr>
                            <th className="px-4 py-3 border-r border-gray-200 w-1/4">ITEM / DESCRIPTION</th>
                            <th className="px-4 py-3 border-r border-gray-200 w-48">NOTE (EDIT)</th>
                            <th className="px-4 py-3 border-r border-gray-200 w-24 text-center">UNIT</th>
                            <th className="px-4 py-3 text-right border-r border-gray-200 w-32">QTY (EDIT)</th>
                            <th className="px-4 py-3 text-right border-r border-gray-200 w-32">RATE (EDIT)</th>
                            <th className="px-4 py-3 text-right w-40">TOTAL ({draftPO.currency})</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {draftPO.items.map((item) => (
                             <React.Fragment key={item.id}>
                                {item.variants.map((variant, vIndex) => {
                                    const factor = item.unitsPerPack || 1;
                                    const isPackMode = draftPO.displayMode === 'Pack';
                                    
                                    const displayQty = isPackMode ? (Number(variant.qty) / factor) : variant.qty;
                                    const displayRate = isPackMode ? (Number(variant.rate) * factor) : variant.rate;
                                    const displayUnit = isPackMode ? item.packingUnit : variant.unit;
                                    const lineTotal = (Number(variant.qty) * Number(variant.rate));

                                    return (
                                        <tr key={variant.id} className="group hover:bg-gray-50">
                                            {vIndex === 0 && (
                                                <td className="px-4 py-3 align-top bg-white border-r border-gray-200" rowSpan={item.variants.length}>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-bold text-gray-900 block text-sm">{item.materialName}</span>
                                                        {item.itemDetail && <span className="text-[11px] text-blue-600 block font-bold uppercase">COLOUR/FINISH: {item.itemDetail}</span>}
                                                        <span className="text-xs text-gray-500 italic block">{item.specification}</span>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-2 py-2 align-middle border-r border-gray-200"><input type="text" value={variant.note} onChange={(e) => updateVariant(item.id, variant.id, 'note', e.target.value)} placeholder="e.g. Finish..." className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none bg-white shadow-inner" /></td>
                                            <td className="px-4 py-3 text-gray-700 align-middle border-r border-gray-200 text-xs text-center uppercase font-bold">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span>{displayUnit}</span>
                                                    {item.unitsPerPack && item.unitsPerPack > 1 && (
                                                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter leading-tight">
                                                            1 {item.packingUnit} = {item.unitsPerPack} {variant.unit}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 align-middle text-right border-r border-gray-200">
                                                <div className="flex flex-col">
                                                    <input 
                                                        type="number" 
                                                        value={isPackMode ? (Math.round(Number(displayQty) * 100) / 100) : displayQty} 
                                                        onChange={(e) => updateVariant(item.id, variant.id, 'qty', e.target.value)} 
                                                        className={`w-full text-right text-xs border rounded px-2 py-1.5 outline-none font-mono font-bold shadow-inner
                                                            ${isPackMode ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'}`} 
                                                    />
                                                    {isPackMode && <span className="text-[9px] text-gray-400 font-mono mt-0.5">= {Number(variant.qty).toLocaleString()} {variant.unit}</span>}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 align-middle text-right border-r border-gray-200">
                                                <div className="flex flex-col">
                                                    <input 
                                                        type="number" 
                                                        value={isPackMode ? (Math.round(Number(displayRate) * 100) / 100) : displayRate} 
                                                        onChange={(e) => updateVariant(item.id, variant.id, 'rate', e.target.value)} 
                                                        step="0.01" 
                                                        className={`w-full text-right text-xs border rounded px-2 py-1.5 outline-none font-mono font-bold shadow-inner
                                                            ${isPackMode ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'}`} 
                                                    />
                                                    {isPackMode && <span className="text-[9px] text-gray-400 font-mono mt-0.5">per {item.packingUnit}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-800 align-middle font-mono text-sm bg-gray-50/50">{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    );
                                })}
                             </React.Fragment>
                          ))}
                       </tbody>
                    </table>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest">NOTE TO SUPPLIER</label>
                        <textarea 
                            rows={3} 
                            value={draftPO.supplierNote} 
                            onChange={(e) => setDraftPO({...draftPO, supplierNote: e.target.value})} 
                            placeholder="Add specific instructions for this supplier..." 
                            className="w-full border border-gray-300 rounded-md p-3 text-sm focus:border-blue-500 outline-none resize-none bg-white shadow-sm"
                        />
                    </div>
                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-3">{(() => { const totalAmount = draftPO.items.reduce((acc, item) => acc + item.variants.reduce((vAcc, v) => vAcc + (Number(v.qty) * Number(v.rate)), 0) , 0); return (<><div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div><div className="flex justify-between items-center text-sm text-gray-600"><label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={draftPO.applyTax} onChange={(e) => setDraftPO({ ...draftPO, applyTax: e.target.checked })} className="rounded text-blue-600 focus:ring-blue-500" /><span>Apply Tax ({draftPO.taxRate}%)</span></label><span className={draftPO.applyTax ? 'text-gray-800' : 'text-gray-300 line-through'}>{(totalAmount * (draftPO.taxRate / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div><div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-200"><span>Total</span><span>{draftPO.currency} {(totalAmount * (1 + (draftPO.applyTax ? draftPO.taxRate : 0) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div></>); })()}<button onClick={handleConfirmPO} className="w-full mt-4 py-3 bg-[#37352F] text-white font-bold text-sm rounded-md hover:bg-black transition-colors shadow-md uppercase tracking-widest">Confirm & Send PO</button></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isPrintModalOpen && poToPrint && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3"><h3 className="text-lg font-bold text-[#37352F]">Print Options</h3><button onClick={() => setIsPrintModalOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button></div>
              <div className="space-y-3"><p className="text-xs font-bold text-gray-500 uppercase">Select Copies to Print</p><label className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"><input type="checkbox" checked={printOptions.original} onChange={e => setPrintOptions({...printOptions, original: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" /><span className="text-sm font-medium text-gray-700">Original Copy</span></label><label className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"><input type="checkbox" checked={printOptions.merchandiser} onChange={e => setPrintOptions({...printOptions, merchandiser: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" /><span className="text-sm font-medium text-gray-700">Merchandiser's Copy</span></label><label className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"><input type="checkbox" checked={printOptions.accounts} onChange={e => setPrintOptions({...printOptions, accounts: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" /><span className="text-sm font-medium text-gray-700">Accounts Copy</span></label><label className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"><input type="checkbox" checked={printOptions.store} onChange={e => setPrintOptions({...printOptions, store: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" /><span className="text-sm font-medium text-gray-700">Store Copy</span></label></div>
              <div className="flex justify-end gap-2 pt-2"><button onClick={() => setIsPrintModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button><button onClick={executePrint} className="px-6 py-2 bg-[#37352F] text-white rounded text-sm font-bold hover:bg-black flex items-center gap-2"><Printer size={16} /> Print Selected</button></div>
           </div>
        </div>
      )}
    </div>
  );
};
