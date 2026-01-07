import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Trash2, X, CheckCircle2, 
  FlaskConical, Search, CheckSquare, Square, Copy,
  ArrowRight, FileText,
  Info,
  AlertCircle,
  Calculator,
  ChevronDown
} from 'lucide-react';
import { SizeGroup, BOMItem, Supplier, MasterBOMItem, BOMPreset, POData } from '../types';

interface OrderBreakdownData {
  totalPOQuantity: number;
  colorQuantities: Record<string, number>;
  sizeQuantities: Record<string, number>;
}

interface BOMTabProps {
  orderBreakdownData: OrderBreakdownData;
  sizeGroups: SizeGroup[];
  data: BOMItem[];
  onUpdate: (data: BOMItem[]) => void;
  availableSuppliers: Supplier[];
  bomStatus: 'Draft' | 'Released';
  onReleaseBOM: () => void;
  masterItems: MasterBOMItem[];
  bomPresets?: BOMPreset[];
  formData?: POData;
}

const UOM_OPTIONS = ['Meters', 'Yards', 'Kgs', 'Pieces', 'Sets', 'Dozen', 'Packs'];
const PACKING_UNIT_OPTIONS = ['Roll', 'Pack', 'Cone', 'Box', 'Gross', 'Bundle', 'Drum', 'Bag'];

// --- BULK ADD MODAL ---
const BulkItemSelectorModal = ({ 
  isOpen, 
  onClose, 
  masterItems, 
  group, 
  onConfirm 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  masterItems: MasterBOMItem[]; 
  group: string; 
  onConfirm: (items: MasterBOMItem[]) => void; 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBuyer, setFilterBuyer] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset state whenever modal is opened to prevent duplicate selections from previous sessions
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSearchTerm('');
      setFilterBuyer('All');
      setFilterCategory('All');
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    return masterItems.filter(item => {
      const isFabricSection = group === 'Fabric';
      const isFabricItem = item.type === 'Fabric';
      
      if (isFabricSection && !isFabricItem) return false;
      if (!isFabricSection && isFabricItem) return false;

      const s = searchTerm.toLowerCase();
      const matchesSearch = 
        (item.itemName || '').toLowerCase().includes(s) || 
        (item.category || '').toLowerCase().includes(s) ||
        (item.supplier || '').toLowerCase().includes(s) ||
        (item.code || '').toLowerCase().includes(s) ||
        (item.brand || '').toLowerCase().includes(s);

      const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
      const matchesBuyer = filterBuyer === 'All' || item.brand === filterBuyer;

      return matchesSearch && matchesCategory && matchesBuyer;
    });
  }, [masterItems, group, searchTerm, filterCategory, filterBuyer]);

  const availableCategories = useMemo(() => {
      const typeFiltered = masterItems.filter(i => group === 'Fabric' ? i.type === 'Fabric' : i.type !== 'Fabric');
      return Array.from(new Set(typeFiltered.map(i => i.category))).sort();
  }, [masterItems, group]);

  const availableBuyers = useMemo(() => {
      const typeFiltered = masterItems.filter(i => group === 'Fabric' ? i.type === 'Fabric' : i.type !== 'Fabric');
      return Array.from(new Set(typeFiltered.map(i => i.brand))).sort();
  }, [masterItems, group]);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirm = () => {
    const selected = masterItems.filter(i => selectedIds.has(i.id));
    onConfirm(selected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
             <div>
                <h2 className="text-lg font-bold text-[#37352F]">
                    Bulk Add {group === 'Fabric' ? 'Fabrics' : 'Trims'}
                    <span className="text-gray-400 font-normal ml-2 text-sm">to {group}</span>
                </h2>
                <p className="text-xs text-gray-500">Select items from the Master Library to import.</p>
             </div>
             <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20}/></button>
          </div>

          <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 bg-white shrink-0">
             <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search by name, code, or supplier..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                />
             </div>
             <div className="flex gap-2">
                <select 
                  value={filterCategory} 
                  onChange={e => setFilterCategory(e.target.value)}
                  className="border rounded px-3 py-2 text-sm outline-none bg-white min-w-[150px]"
                >
                    <option value="All">All Categories</option>
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select 
                  value={filterBuyer} 
                  onChange={e => setFilterBuyer(e.target.value)}
                  className="border rounded px-3 py-2 text-sm outline-none bg-white min-w-[150px]"
                >
                    <option value="All">All Buyers/Brands</option>
                    {availableBuyers.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
             </div>
          </div>

          <div className="flex-1 overflow-auto p-0 bg-gray-50/30">
             <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-100 text-xs font-bold text-gray-500 uppercase sticky top-0 z-10 shadow-sm">
                   <tr>
                      <th className="px-4 py-3 w-12 text-center bg-gray-100">
                         <input 
                           type="checkbox" 
                           onChange={(e) => {
                              if (e.target.checked) setSelectedIds(new Set(filteredItems.map(i => i.id)));
                              else setSelectedIds(new Set());
                           }}
                           checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                           className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                         />
                      </th>
                      <th className="px-4 py-3 bg-gray-100">ITEM NAME / DETAILS</th>
                      <th className="px-4 py-3 bg-gray-100">CATEGORY</th>
                      <th className="px-4 py-3 bg-gray-100">SUPPLIER</th>
                      <th className="px-4 py-3 bg-gray-100">CODE</th>
                      <th className="px-4 py-3 text-right bg-gray-100">PRICE</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                   {filteredItems.map(item => (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50' : ''}`} 
                        onClick={() => toggleSelection(item.id)}
                      >
                         <td className="px-4 py-3 text-center">
                            <input 
                                type="checkbox" 
                                checked={selectedIds.has(item.id)} 
                                readOnly 
                                className="pointer-events-none rounded border-gray-300 text-blue-600" 
                            />
                         </td>
                         <td className="px-4 py-3 font-medium text-gray-800">
                            {item.type === 'Fabric' 
                               ? `${item.shade?.toUpperCase()} - ${item.content} - ${item.weight}${item.category === 'Denim' ? ' Oz' : ' GSM'}` 
                               : item.itemName}
                         </td>
                         <td className="px-4 py-3 text-gray-600 uppercase text-xs">{item.category}</td>
                         <td className="px-4 py-3 text-blue-600 font-medium">{item.supplier}</td>
                         <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                         <td className="px-4 py-3 text-right font-mono font-bold">{item.price}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-between items-center shadow-lg z-20 shrink-0">
             <div className="text-sm text-gray-600">
                <span className="font-bold text-gray-900">{selectedIds.size}</span> items selected
             </div>
             <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">Cancel</button>
                <button 
                    onClick={handleConfirm} 
                    disabled={selectedIds.size === 0}
                    className="px-6 py-2 bg-[#37352F] text-white text-sm font-medium rounded hover:bg-black shadow-sm disabled:opacity-50 transition-colors"
                >
                    Add Selected Items
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};

export const BOMTab: React.FC<BOMTabProps> = ({ 
  orderBreakdownData, sizeGroups, data, onUpdate, availableSuppliers,
  bomStatus, onReleaseBOM, masterItems, bomPresets = [], formData
}) => {
  const [activeMatrixItemId, setActiveMatrixItemId] = useState<string | null>(null);
  const [selectedSizesForGroup, setSelectedSizesForGroup] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkModalGroup, setBulkModalGroup] = useState<BOMItem['processGroup']>('Fabric');

  const activeItem = useMemo(() => {
      return data.find(i => i.id === activeMatrixItemId) || null;
  }, [data, activeMatrixItemId]);

  const addItem = (group: BOMItem['processGroup']) => {
    const newItem: BOMItem = {
      id: Math.random().toString(36).substr(2, 9),
      processGroup: group,
      componentName: '',
      itemDetail: '',
      supplierRef: '',
      vendor: '',
      sourcingStatus: 'Pending',
      leadTimeDays: 0,
      usageRule: 'Generic',
      usageData: { 'generic': 0 },
      wastagePercent: 3,
      isTestingRequired: false,
      isApproved: false,
      uom: group === 'Fabric' ? 'Meters' : 'Pieces',
      unitsPerPack: 1,
      packingUnit: group === 'Fabric' ? 'Roll' : 'Pack'
    };
    onUpdate([...data, newItem]);
  };

  const removeItem = (id: string) => {
    onUpdate(data.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof BOMItem, value: any) => {
    onUpdate(data.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const updateUsageData = (id: string, key: string, value: number) => {
      const item = data.find(i => i.id === id);
      if (!item) return;
      const newUsageData = { ...item.usageData, [key]: value };
      updateItem(id, 'usageData', newUsageData);
  };

  const handleMasterItemSelect = (id: string, masterId: string) => {
    const selectedMaster = masterItems.find(m => m.id === masterId);
    if (!selectedMaster) return;

    onUpdate(data.map(i => {
      if (i.id !== id) return i;
      return {
        ...i,
        componentName: selectedMaster.type === 'Fabric' 
           ? `${selectedMaster.shade?.toUpperCase()} - ${selectedMaster.content} - ${selectedMaster.weight}${selectedMaster.category === 'Denim' ? ' Oz' : ' GSM'}` 
           : selectedMaster.itemName || selectedMaster.category || '',
        itemDetail: selectedMaster.details || '',
        supplierRef: selectedMaster.code || '',
        vendor: selectedMaster.supplier || '',
        uom: selectedMaster.uom || 'Pieces',
        packingUnit: selectedMaster.type === 'Fabric' ? 'Roll' : 'Pack'
      };
    }));
  };

  const openBulkModal = (group: BOMItem['processGroup']) => {
      setBulkModalGroup(group);
      setIsBulkModalOpen(true);
  };

  const handleBulkConfirm = (selectedItems: MasterBOMItem[]) => {
      const newItems: BOMItem[] = selectedItems.map(m => ({
          id: Math.random().toString(36).substr(2, 9),
          processGroup: bulkModalGroup,
          componentName: m.type === 'Fabric' 
             ? `${m.shade?.toUpperCase()} - ${m.content} - ${m.weight}${m.category === 'Denim' ? ' Oz' : ' GSM'}` 
             : m.itemName || m.category || '',
          itemDetail: m.details || '',
          supplierRef: m.code || '',
          vendor: m.supplier || '',
          sourcingStatus: 'Pending',
          leadTimeDays: 0,
          usageRule: 'Generic',
          usageData: { 'generic': 0 },
          wastagePercent: 3,
          isTestingRequired: false,
          uom: m.uom || 'Pieces',
          unitsPerPack: 1,
          packingUnit: m.type === 'Fabric' ? 'Roll' : 'Pack'
      }));
      onUpdate([...data, ...newItems]);
      setIsBulkModalOpen(false);
  };

  const getAllSizes = () => {
      const sizes = new Set<string>();
      sizeGroups.forEach(g => g.sizes.forEach(s => sizes.add(s)));
      return Array.from(sizes).sort((a,b) => {
          const numA = parseInt(a);
          const numB = parseInt(b);
          if(!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
      });
  };

  const calculateRequiredQty = (item: BOMItem) => {
    let baseQty = 0;
    const { usageRule, usageData, wastagePercent } = item;
    
    if (usageRule === 'Generic') {
      baseQty = (usageData['generic'] || 0) * orderBreakdownData.totalPOQuantity;
    } 
    else if (usageRule === 'By Color/Wash') {
      Object.entries(usageData).forEach(([colorName, consump]) => {
        baseQty += (orderBreakdownData.colorQuantities[colorName] || 0) * (consump as number);
      });
    } 
    else if (usageRule === 'By Size Group') {
      Object.entries(usageData).forEach(([sizeGroupName, consump]) => {
        const group = sizeGroups.find(g => g.groupName === sizeGroupName);
        if (group) {
           let groupTotal = 0;
           Object.values(group.breakdown).forEach(row => {
              Object.values(row).forEach(q => groupTotal += (Number(q) || 0));
           });
           baseQty += groupTotal * (consump as number);
        }
      });
    }
    else if (usageRule === 'By Individual Sizes') {
        Object.entries(usageData).forEach(([size, consump]) => {
            baseQty += (orderBreakdownData.sizeQuantities[size] || 0) * (consump as number);
        });
    }
    else if (usageRule === 'Configure your own') {
        Object.entries(usageData).forEach(([sizeKey, consump]) => {
            const sizesInGroup = sizeKey.split(',').map(s => s.trim());
            let groupQty = 0;
            sizesInGroup.forEach(s => groupQty += (orderBreakdownData.sizeQuantities[s] || 0));
            baseQty += groupQty * (consump as number);
        });
    }
    return baseQty * (1 + (wastagePercent / 100));
  };

  const handleCreateCustomGroup = () => {
      if (!activeItem || selectedSizesForGroup.size === 0) return;
      const key = Array.from(selectedSizesForGroup).sort().join(', ');
      updateUsageData(activeItem.id, key, 0);
      setSelectedSizesForGroup(new Set());
  };

  const toggleSizeSelection = (size: string) => {
      const newSet = new Set(selectedSizesForGroup);
      if (newSet.has(size)) newSet.delete(size);
      else newSet.add(size);
      setSelectedSizesForGroup(newSet);
  };

  const handlePrintMaterialSummary = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const factoryRef = formData?.factoryRef || '-';
    const styleNumber = formData?.styleNumber || '-';
    
    const sectionsList = ['Fabric', 'Stitching Trims', 'Packing Trims'];
    const tablesHtml = sectionsList.map(sec => {
        const items = data.filter(i => i.processGroup === sec);
        if (items.length === 0) return '';

        const rows = items.map(item => {
            const total = calculateRequiredQty(item);
            const packs = item.unitsPerPack > 1 ? Math.ceil(total / item.unitsPerPack) : 1;
            
            // Generate Usage Breakdown Text
            let usageHtml = '';
            if (item.usageRule === 'Generic') {
                usageHtml = `<div class="usage-pill">Generic: <strong>${item.usageData['generic'] || 0}</strong> /pc</div>`;
            } else {
                usageHtml = Object.entries(item.usageData).map(([key, val]) => {
                    if (val === 0) return '';
                    return `<div class="usage-pill"><span>${key}:</span> <strong>${val}</strong> /pc</div>`;
                }).join('');
            }

            const requiredDisplay = item.unitsPerPack > 1 
                ? `${Math.ceil(total).toLocaleString()} ${item.uom} <span class="pack-note">(${packs.toLocaleString()} ${item.packingUnit}${packs > 1 ? 's' : ''})</span>`
                : `${Math.ceil(total).toLocaleString()} ${item.uom}`;

            return `
                <tr>
                    <td class="item-cell">
                        <div class="item-name">${item.componentName}</div>
                        <div class="item-spec">${item.itemDetail}</div>
                        <div class="item-ref">REF: ${item.supplierRef || '---'}</div>
                    </td>
                    <td class="vendor-cell">${item.vendor || '---'}</td>
                    <td class="usage-cell">
                        <div class="usage-header">${item.usageRule}</div>
                        <div class="usage-list">${usageHtml || '<div class="usage-pill italic text-gray-300">No data</div>'}</div>
                    </td>
                    <td class="wastage-cell center">${item.wastagePercent}%</td>
                    <td class="total-cell right">${requiredDisplay}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="section-container">
                <h3 class="section-title">${sec.toUpperCase()} REQUIREMENTS</h3>
                <table>
                    <thead>
                        <tr>
                            <th width="28%">Item / Color Finish</th>
                            <th width="15%">Supplier</th>
                            <th width="32%">Consumption Breakdown</th>
                            <th width="8%" class="center">Wastage</th>
                            <th width="17%" class="right">Total Requirement</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }).join('');

    printWindow.document.write(`
        <html>
            <head>
                <title>Material Summary - ${styleNumber}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; line-height: 1.4; background: #fff; }
                    .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid #000; padding-bottom: 15px; margin-bottom: 30px; }
                    .brand h1 { margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px; }
                    .meta { text-align: right; font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; }
                    
                    .section-container { margin-bottom: 40px; }
                    .section-title { font-size: 11px; font-weight: 800; color: #374151; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; border-left: 5px solid #000; letter-spacing: 0.1em; }
                    
                    table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; table-layout: fixed; }
                    th { text-align: left; padding: 10px; font-size: 8px; font-weight: 800; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #000; background: #fbfbfb; }
                    td { padding: 12px 10px; font-size: 11px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
                    
                    .item-name { font-weight: 800; font-size: 12px; margin-bottom: 2px; text-transform: uppercase; }
                    .item-spec { color: #2563eb; font-size: 10px; font-weight: 600; }
                    .item-ref { color: #9ca3af; font-size: 9px; font-family: monospace; margin-top: 6px; }
                    
                    .usage-header { font-weight: 800; font-size: 8px; color: #666; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 2px; }
                    .usage-list { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
                    .usage-pill { font-size: 9px; color: #374151; background: #fff; padding: 4px 6px; border: 1px solid #e5e7eb; border-radius: 4px; display: flex; justify-content: space-between; }
                    .usage-pill span { color: #6b7280; font-weight: 500; }
                    
                    .total-cell { font-weight: 800; font-size: 14px; color: #000; text-align: right; }
                    .pack-note { display: block; font-size: 10px; color: #2563eb; font-weight: 700; margin-top: 4px; text-transform: uppercase; }
                    .right { text-align: right; }
                    .center { text-align: center; }
                    
                    @media print {
                        body { padding: 0; }
                        .header { margin-bottom: 20px; }
                        .section-container { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="brand">
                        <h1>Nizamia Apparels</h1>
                        <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Bulk Material Requirement Summary</p>
                    </div>
                    <div class="meta">
                        Style: <strong>${styleNumber}</strong> | Ref: <strong>${factoryRef}</strong><br/>
                        Total PO Qty: <strong>${orderBreakdownData.totalPOQuantity.toLocaleString()} Units</strong><br/>
                        Report Date: ${dateStr}
                    </div>
                </div>
                ${tablesHtml}
                <div style="margin-top: 50px; text-align: center; font-size: 8px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; border-top: 1px solid #eee; padding-top: 20px;">
                    Confidential Document • Generated by Nizamia Global Merchandising Ecosystem
                </div>
                <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 1200); }</script>
            </body>
        </html>
    `);
    printWindow.document.close();
  };

  const groups = ['Fabric', 'Stitching Trims', 'Packing Trims'] as const;
  const allSizesList = getAllSizes();

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-10">
      {groups.map(group => {
        const items = data.filter(d => d.processGroup === group);
        return (
          <div key={group} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <h3 className="font-bold text-[#37352F] text-[11px] uppercase tracking-wider">{group}</h3>
                 <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-black">{items.length}</span>
              </div>
              <div className="flex items-center gap-4">
                 <p className="text-[10px] text-gray-400 italic font-medium hidden md:block">
                    Click <FlaskConical size={11} className="inline align-text-bottom" /> if testing is needed, or <CheckCircle2 size={11} className="inline align-text-bottom" /> if buyer approval is required.
                 </p>
                 <div className="flex gap-2">
                    <button onClick={() => openBulkModal(group)} className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-white border border-blue-200 px-2.5 py-1 rounded transition-colors shadow-sm uppercase">
                       <Copy size={12} /> Bulk Add
                    </button>
                    <button onClick={() => addItem(group)} className="flex items-center gap-1 text-[10px] font-bold text-[#37352F] bg-white border border-gray-300 px-2.5 py-1 rounded transition-colors shadow-sm uppercase">
                       <Plus size={12} /> Add Item
                    </button>
                 </div>
              </div>
            </div>

            <div className="overflow-hidden">
              <table className="w-full text-left text-sm border-collapse table-fixed">
                <thead>
                  <tr className="bg-white text-[10px] text-gray-400 uppercase font-black border-b border-gray-200">
                    <th className="px-4 py-2 w-[22%]">Item / Supplier & Ref</th>
                    <th className="px-4 py-2 w-[25%]">Colour/Finish</th>
                    <th className="px-4 py-2 w-[11%] text-center">Consumption</th>
                    <th className="px-4 py-2 w-[18%] text-center">Unit & Packing</th>
                    <th className="px-4 py-2 w-[8%] text-center">Extra%</th>
                    <th className="px-4 py-2 w-[7%] text-left pl-4">Total Req</th>
                    <th className="px-4 py-2 w-[9%] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(item => {
                    const totalUnits = calculateRequiredQty(item);
                    const packCount = item.unitsPerPack > 1 ? Math.ceil(totalUnits / item.unitsPerPack) : null;

                    return (
                    <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors align-middle min-h-[64px]">
                      {/* Item / Supplier & Ref */}
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-0.5 leading-tight">
                          <input 
                            list={`master-list-${group}`}
                            type="text" 
                            value={item.componentName}
                            onChange={(e) => {
                               updateItem(item.id, 'componentName', e.target.value);
                               const match = masterItems.find(m => {
                                   const label = m.type === 'Fabric' ? `${m.shade?.toUpperCase()} - ${m.content} - ${m.weight}${m.category === 'Denim' ? ' Oz' : ' GSM'}` : m.itemName;
                                   return label === e.target.value;
                               });
                               if (match) handleMasterItemSelect(item.id, match.id);
                            }}
                            placeholder="Material Name"
                            className="w-full bg-transparent border-none p-0 text-[13px] font-bold text-gray-900 focus:ring-0 outline-none placeholder:text-gray-300"
                          />
                          <div className="text-xs text-gray-400 italic mt-0.5 font-medium">
                             Supplier: {item.vendor || '---'} | Ref: {item.supplierRef || '---'}
                          </div>
                        </div>
                        <datalist id={`master-list-${group}`}>
                           {masterItems.filter(m => (group === 'Fabric' ? m.type === 'Fabric' : m.type === 'Trim')).map(m => (
                               <option key={m.id} value={m.type === 'Fabric' ? `${m.shade?.toUpperCase()} - ${m.content} - ${m.weight}${m.category === 'Denim' ? ' Oz' : ' GSM'}` : m.itemName} />
                           ))}
                        </datalist>
                      </td>

                      {/* Colour/Finish (Displayed on PO) */}
                      <td className="px-4 py-2">
                         <textarea 
                            value={item.itemDetail}
                            onChange={(e) => updateItem(item.id, 'itemDetail', e.target.value)}
                            placeholder="Add Colour/Finish detail"
                            className="w-full bg-transparent border-none p-0 text-[13px] text-gray-600 font-medium focus:ring-0 outline-none placeholder:text-gray-200 resize-none h-10 leading-tight"
                         />
                      </td>

                      {/* Consumption */}
                      <td className="px-4 py-2 text-center">
                         <div className="flex flex-col items-center gap-1.5 w-full max-w-[120px] mx-auto">
                            <div className="relative w-full">
                                <select 
                                    value={item.usageRule} 
                                    onChange={(e) => updateItem(item.id, 'usageRule', e.target.value)} 
                                    className="w-full pl-2 pr-7 py-1 bg-white border border-gray-200 rounded text-[10px] font-black text-gray-700 outline-none focus:border-indigo-500 appearance-none h-7 cursor-pointer text-center shadow-sm uppercase"
                                >
                                   <option value="Generic">Generic</option>
                                   <option value="By Color/Wash">By Color</option>
                                   <option value="By Size Group">By Group</option>
                                   <option value="By Individual Sizes">By Size</option>
                                   <option value="Configure your own">Custom</option>
                                </select>
                                <ChevronDown size={12} className="absolute right-1 top-2 text-gray-400 pointer-events-none" />
                            </div>
                            {item.usageRule === 'Generic' ? (
                               <div className="relative w-full">
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    value={item.usageData['generic'] === 0 ? '' : item.usageData['generic']} 
                                    onChange={(e) => updateUsageData(item.id, 'generic', parseFloat(e.target.value))} 
                                    className="w-full border border-gray-200 rounded py-1 text-center text-[11px] outline-none focus:border-indigo-500 font-mono font-black h-7 shadow-sm text-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                    placeholder="0.00" 
                                  />
                                  <span className="absolute right-1.5 top-1.5 text-[8px] text-gray-300 font-bold">/pc</span>
                               </div>
                            ) : (
                               <button 
                                 onClick={() => { setActiveMatrixItemId(item.id); setSelectedSizesForGroup(new Set()); }} 
                                 className="w-full h-7 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100 hover:bg-blue-100 transition-colors uppercase tracking-tight"
                               >
                                 Configure
                               </button>
                            )}
                         </div>
                      </td>

                      {/* Unit & Packing */}
                      <td className="px-4 py-2 text-center">
                         <div className="flex flex-col items-center gap-1.5 w-full max-w-[150px] mx-auto">
                            <div className="relative w-full">
                                <select 
                                    value={item.uom} 
                                    onChange={(e) => updateItem(item.id, 'uom', e.target.value)} 
                                    className="w-full pl-3 pr-7 py-1 bg-white border border-gray-200 rounded text-[11px] font-black text-gray-800 outline-none focus:border-indigo-500 appearance-none h-7 cursor-pointer text-center shadow-sm"
                                >
                                    {UOM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <ChevronDown size={12} className="absolute right-1.5 top-2 text-gray-400 pointer-events-none" />
                            </div>
                            <div className="flex items-center gap-1 w-full">
                                <input 
                                    type="number" 
                                    value={item.unitsPerPack} 
                                    onChange={(e) => updateItem(item.id, 'unitsPerPack', parseFloat(e.target.value) || 1)} 
                                    className="w-20 text-center border border-gray-200 rounded py-1 outline-none focus:border-indigo-500 h-7 text-[11px] font-mono font-black text-gray-800 shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                />
                                <span className="text-gray-300 font-bold text-[10px] shrink-0">/</span>
                                <div className="relative flex-1 min-w-0">
                                    <select 
                                        value={item.packingUnit} 
                                        onChange={(e) => updateItem(item.id, 'packingUnit', e.target.value)} 
                                        className="w-full pl-2 pr-5 py-1 bg-white border border-gray-200 rounded text-[10px] font-black text-gray-700 outline-none focus:border-indigo-500 appearance-none h-7 cursor-pointer text-center shadow-sm"
                                    >
                                        {PACKING_UNIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <ChevronDown size={10} className="absolute right-0.5 top-2.5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                         </div>
                      </td>

                      {/* Extra% */}
                      <td className="px-4 py-2 text-center">
                         <div className="inline-flex items-center gap-0 border border-gray-200 rounded-lg px-1 py-1 bg-white w-full max-w-[85px] mx-auto h-7 shadow-sm">
                            <input 
                              type="number" 
                              step="0.01" 
                              value={item.wastagePercent} 
                              onChange={(e) => updateItem(item.id, 'wastagePercent', parseFloat(e.target.value))} 
                              className="w-full text-center border-none p-0 focus:ring-0 text-[11px] font-mono font-black text-gray-800 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                            <span className="text-[10px] text-gray-300 font-bold pr-1">%</span>
                         </div>
                      </td>

                      {/* Total Req */}
                      <td className="px-4 py-2 text-left pl-4">
                         <div className="flex flex-col items-start leading-tight">
                            <span className="font-mono font-black text-gray-900 text-[13px]">{Math.ceil(totalUnits).toLocaleString()} <span className="text-[8px] text-gray-400 uppercase font-normal">{item.uom}</span></span>
                            {packCount !== null && <span className="text-[10px] font-black text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100 mt-1 uppercase tracking-tighter shadow-sm">{packCount.toLocaleString()} {item.packingUnit}s</span>}
                         </div>
                      </td>

                      {/* Action Icons */}
                      <td className="px-4 py-2">
                         <div className="flex items-center justify-center gap-3">
                            <button 
                                onClick={() => updateItem(item.id, 'isTestingRequired', !item.isTestingRequired)} 
                                className={`p-1 rounded transition-colors ${item.isTestingRequired ? 'text-purple-600 bg-purple-50' : 'text-gray-300 hover:text-purple-400'}`}
                                title="Lab Test Required"
                            >
                                <FlaskConical size={16} />
                            </button>
                            <button 
                                onClick={() => updateItem(item.id, 'isApproved', !item.isApproved)} 
                                className={`p-1 rounded transition-colors ${item.isApproved ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-green-500'}`}
                                title="Buyer's approval required"
                            >
                                <CheckCircle2 size={16} />
                            </button>
                            <button 
                                onClick={() => removeItem(item.id)} 
                                className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                title="Delete Item"
                            >
                                <Trash2 size={16} />
                            </button>
                         </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {activeItem && (
         <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[85vh] flex flex-col">
               <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                  <div>
                     <h3 className="text-sm font-bold text-[#37352F]">{activeItem.componentName}</h3>
                     <p className="text-xs text-gray-500">Configuration Mode: <span className="font-bold text-blue-600">{activeItem.usageRule}</span></p>
                  </div>
                  <button onClick={() => setActiveMatrixItemId(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
               </div>
               <div className="flex-1 overflow-hidden flex">
                  {activeItem.usageRule === 'Configure your own' && (
                      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col p-4 shrink-0">
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><CheckSquare size={14} /> Available Sizes</h4>
                          <div className="flex-1 overflow-y-auto space-y-1 mb-4">
                              {allSizesList.map(size => {
                                  const isUsed = Object.keys(activeItem.usageData).some(k => k.split(', ').includes(size));
                                  const isSelected = selectedSizesForGroup.has(size);
                                  return (
                                      <div key={size} onClick={() => !isUsed && toggleSizeSelection(size)} className={`flex items-center gap-3 px-3 py-2 rounded border cursor-pointer transition-all ${isUsed ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : isSelected ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-gray-200 hover:border-blue-200'}`}>
                                          {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                          <span className="text-sm font-medium">{size}</span>
                                          {isUsed && <span className="text-[9px] ml-auto bg-gray-200 px-1 rounded">Used</span>}
                                      </div>
                                  );
                              })}
                          </div>
                          <button onClick={handleCreateCustomGroup} disabled={selectedSizesForGroup.size === 0} className="w-full py-2 bg-[#37352F] text-white text-xs font-bold rounded shadow-sm hover:bg-black disabled:opacity-50 transition-colors flex items-center justify-center gap-2"><ArrowRight size={14} /> Create Group ({selectedSizesForGroup.size})</button>
                      </div>
                  )}
                  <div className="flex-1 overflow-y-auto p-0">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-white text-xs text-gray-500 uppercase font-semibold border-b border-gray-100 sticky top-0 z-10">
                            <tr>
                               <th className="px-6 py-3 bg-white">{activeItem.usageRule === 'By Color/Wash' ? 'Colorway' : activeItem.usageRule === 'By Size Group' ? 'Size Group' : activeItem.usageRule === 'By Individual Sizes' ? 'Size' : 'Custom Size Group'}</th>
                               <th className="px-6 py-3 bg-white text-right">Applicable Qty</th>
                               <th className="px-6 py-3 bg-white text-right w-40">Consumption</th>
                               {activeItem.usageRule === 'Configure your own' && <th className="px-4 py-3 bg-white w-10"></th>}
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {activeItem.usageRule === 'By Color/Wash' && Object.entries(orderBreakdownData.colorQuantities).map(([color, qty]) => (
                               <tr key={color}>
                                  <td className="px-6 py-3 font-medium text-gray-700">{color}</td>
                                  <td className="px-6 py-3 text-right text-gray-500">{qty}</td>
                                  <td className="px-6 py-3"><input type="number" step="0.01" className="w-full border rounded px-2 py-1 text-right outline-none focus:border-blue-500" value={activeItem.usageData[color] === 0 ? '' : activeItem.usageData[color]} onChange={(e) => updateUsageData(activeItem.id, color, parseFloat(e.target.value))} /></td>
                               </tr>
                            ))}
                            {activeItem.usageRule === 'By Size Group' && sizeGroups.map(group => {
                               let groupTotal = 0;
                               Object.values(group.breakdown).forEach(row => Object.values(row).forEach(q => groupTotal += (Number(q) || 0)));
                               return (
                                  <tr key={group.id}>
                                     <td className="px-6 py-3 font-medium text-gray-700">{group.groupName}</td>
                                     <td className="px-6 py-3 text-right text-gray-500">{groupTotal}</td>
                                     <td className="px-6 py-3"><input type="number" step="0.01" className="w-full border rounded px-2 py-1 text-right outline-none focus:border-blue-500" value={activeItem.usageData[group.groupName] === 0 ? '' : activeItem.usageData[group.groupName]} onChange={(e) => updateUsageData(activeItem.id, group.groupName, parseFloat(e.target.value))} /></td>
                                  </tr>
                               );
                            })}
                            {activeItem.usageRule === 'By Individual Sizes' && allSizesList.map(size => (
                                <tr key={size}>
                                    <td className="px-6 py-3 font-medium text-gray-700">{size}</td>
                                    <td className="px-6 py-3 text-right text-gray-500">{orderBreakdownData.sizeQuantities[size] || 0}</td>
                                    <td className="px-6 py-3"><input type="number" step="0.01" className="w-full border rounded px-2 py-1 text-right outline-none focus:border-blue-500" value={activeItem.usageData[size] === 0 ? '' : activeItem.usageData[size]} onChange={(e) => updateUsageData(activeItem.id, size, parseFloat(e.target.value))} /></td>
                                </tr>
                            ))}
                            {activeItem.usageRule === 'Configure your own' && Object.entries(activeItem.usageData).map(([key, val]) => {
                                const sizesInGroup = key.split(',').map(s => s.trim());
                                let groupTotal = 0;
                                sizesInGroup.forEach(s => groupTotal += (orderBreakdownData.sizeQuantities[s] || 0));
                                return (
                                    <tr key={key}>
                                        <td className="px-6 py-3"><div className="flex flex-wrap gap-1">{sizesInGroup.map(s => (<span key={s} className="text-xs bg-gray-100 border border-gray-300 px-1.5 rounded font-medium text-gray-700">{s}</span>))}</div></td>
                                        <td className="px-6 py-3 text-right text-gray-500">{groupTotal}</td>
                                        <td className="px-6 py-3"><input type="number" step="0.01" className="w-full border rounded px-2 py-1 text-right outline-none focus:border-blue-500" value={val === 0 ? '' : val} onChange={(e) => updateUsageData(activeItem.id, key, parseFloat(e.target.value))} /></td>
                                        <td className="px-4 py-3 text-center"><button onClick={() => { const newData = { ...activeItem.usageData }; delete newData[key]; updateItem(activeItem.id, 'usageData', newData); }} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></td>
                                    </tr>
                                );
                            })}
                         </tbody>
                      </table>
                  </div>
               </div>
               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end shrink-0"><button onClick={() => setActiveMatrixItemId(null)} className="px-6 py-2 bg-[#37352F] text-white text-sm font-medium rounded hover:bg-black shadow-sm">Done</button></div>
            </div>
         </div>
      )}

      <BulkItemSelectorModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} masterItems={masterItems} group={bulkModalGroup} onConfirm={handleBulkConfirm} />

      <div className="flex items-center justify-between pt-6 border-t border-gray-200 shrink-0">
         <div className="flex items-center gap-2 text-xs text-gray-500">
            <AlertCircle size={14} className="text-orange-500" /><span>Ensure all consumptions include process loss before release.</span>
         </div>
         <div className="flex gap-3">
            <button onClick={handlePrintMaterialSummary} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2"><FileText size={16} /> Material Summary</button>
            {bomStatus === 'Draft' ? (
                <button onClick={onReleaseBOM} className="px-6 py-2 bg-[#37352F] text-white text-sm font-medium rounded shadow-sm hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50"><Calculator size={16} /> Release BOM for Costing</button>
             ) : (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded border border-green-200"><CheckSquare size={16} /><span className="text-sm font-bold">BOM Released</span></div>
             )}
         </div>
      </div>
    </div>
  );
};
