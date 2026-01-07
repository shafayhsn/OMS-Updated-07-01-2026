
import React, { useState, useMemo } from 'react';
import { 
  Tag, AlertTriangle, CheckCircle2, 
  RefreshCw, X, Box
} from 'lucide-react';
import { JobBatch, PurchasingRequest } from '../types';

interface TrimsPlanGeneratorProps {
  job: JobBatch;
  onClose: () => void;
  onIssue: (purchasingRequests: PurchasingRequest[]) => void;
}

interface ConsolidatedTrim {
    key: string;
    itemName: string;
    supplier: string;
    category: string;
    baseRequiredQty: number;
    unit: string;
    specs: string;
    itemDetail: string; // Added field
    breakdownMap: Record<string, number>;
    usageRule: string; 
    unitsPerPack: number;
    packingUnit: string;
}

export const TrimsPlanGenerator: React.FC<TrimsPlanGeneratorProps> = ({ job, onClose, onIssue }) => {
  const [safetyBufferPct, setSafetyBufferPct] = useState<Record<string, number>>({});
  const [isIssuing, setIsIssuing] = useState(false);

  // --- CONSOLIDATION LOGIC ---
  const consolidatedItems: ConsolidatedTrim[] = useMemo(() => {
      const map = new Map<string, ConsolidatedTrim>();

      job.styles.forEach(style => {
          if (style.bom) {
              const trimItems = style.bom.filter(i => 
                  ['Stitching Trims', 'Packing Trims', 'Misc Trims'].includes(i.processGroup)
              );

              trimItems.forEach(bomItem => {
                  const key = `${bomItem.componentName}-${bomItem.vendor || 'Unknown'}`;
                  
                  let itemTotal = 0;
                  const localBreakdown: Record<string, number> = {};
                  const usageRule = bomItem.usageRule;
                  const usageData = bomItem.usageData;

                  // 1. Calculate Consumption Based on Rule
                  if (usageRule === 'Generic') {
                      itemTotal = (usageData['generic'] || 0) * style.quantity;
                      localBreakdown['Generic'] = itemTotal;
                  } else if (usageRule === 'By Size Group') {
                      style.sizeGroups?.forEach(group => {
                         const consump = Number(usageData[group.groupName] || 0);
                         if(consump > 0) {
                             let groupQty = 0;
                             Object.values(group.breakdown).forEach((row: any) => {
                                 Object.values(row).forEach((q: any) => groupQty += (Number(q)||0));
                             });
                             const req = groupQty * consump;
                             itemTotal += req;
                             localBreakdown[group.groupName] = (localBreakdown[group.groupName] || 0) + req;
                         }
                      });
                  } else if (usageRule === 'By Individual Sizes') {
                      const sizeQtys: Record<string, number> = {};
                      style.sizeGroups?.forEach(group => {
                          Object.values(group.breakdown).forEach((row: any) => {
                              Object.entries(row).forEach(([size, q]) => {
                                  const val = Number(q as any);
                                  sizeQtys[size] = (sizeQtys[size] || 0) + (isNaN(val) ? 0 : val);
                              });
                          });
                      });

                      Object.entries(usageData).forEach(([size, rawConsump]) => {
                          const consump = Number(rawConsump || 0);
                          const qty = sizeQtys[size] || 0;
                          const req = qty * consump;
                          itemTotal += req;
                          localBreakdown[size] = (localBreakdown[size] || 0) + req;
                      });
                  } else if (usageRule === 'By Color/Wash') {
                      const colorQtys: Record<string, number> = {};
                      style.sizeGroups?.forEach(group => {
                          group.colors.forEach(col => {
                               const row = group.breakdown[col.id];
                               const colTotal: number = row ? (Object.values(row) as any[]).reduce((a: number, b: any) => a + (Number(b)||0), 0) : 0;
                               colorQtys[col.name] = (colorQtys[col.name] || 0) + colTotal;
                          });
                      });

                      Object.entries(usageData).forEach(([color, rawConsump]) => {
                          const consump = Number(rawConsump || 0);
                          const qty = colorQtys[color] || 0;
                          const req = qty * consump;
                          itemTotal += req;
                          localBreakdown[color] = (localBreakdown[color] || 0) + req;
                      });
                  } else if (usageRule === 'Configure your own') {
                      const sizeQtys: Record<string, number> = {};
                      style.sizeGroups?.forEach(group => {
                          Object.values(group.breakdown).forEach((row: any) => {
                              Object.entries(row).forEach(([size, q]) => {
                                  const val = Number(q);
                                  sizeQtys[size] = (sizeQtys[size] || 0) + (isNaN(val) ? 0 : val);
                              });
                          });
                      });

                      Object.entries(usageData).forEach(([key, rawConsump]) => {
                          const consump = Number(rawConsump || 0);
                          const sizesInGroup = key.split(',').map(s => s.trim());
                          let groupQty = 0;
                          sizesInGroup.forEach(s => {
                              groupQty += (sizeQtys[s] || 0);
                          });
                          const req = groupQty * consump;
                          itemTotal += req;
                          localBreakdown[key] = (localBreakdown[key] || 0) + req;
                      });
                  }

                  const wastageFactor = 1 + (bomItem.wastagePercent || 0) / 100;
                  itemTotal = itemTotal * wastageFactor;

                  if (map.has(key)) {
                      const existing = map.get(key)!;
                      existing.baseRequiredQty += itemTotal;
                      Object.entries(localBreakdown).forEach(([k, v]) => {
                          const vWithWastage = v * wastageFactor;
                          existing.breakdownMap[k] = (existing.breakdownMap[k] || 0) + vWithWastage;
                      });
                  } else {
                      const breakdownMap: Record<string, number> = {};
                      Object.entries(localBreakdown).forEach(([k, v]) => {
                          breakdownMap[k] = v * wastageFactor;
                      });

                      map.set(key, {
                          key,
                          itemName: bomItem.componentName,
                          supplier: bomItem.vendor || 'Unknown',
                          category: bomItem.processGroup,
                          baseRequiredQty: itemTotal,
                          unit: bomItem.uom || 'pcs', 
                          specs: bomItem.supplierRef || '',
                          itemDetail: bomItem.itemDetail || '', // Capture detail
                          breakdownMap,
                          usageRule,
                          unitsPerPack: bomItem.unitsPerPack || 1,
                          packingUnit: bomItem.packingUnit || 'Pack'
                      });
                  }
              });
          }
      });

      return Array.from(map.values());
  }, [job]);

  const handleBufferChange = (key: string, val: string) => {
      setSafetyBufferPct(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const generateBreakdownString = (breakdownMap: Record<string, number>, buffer: number) => {
      const parts = Object.entries(breakdownMap).map(([k, v]) => {
          if (k === 'Generic') return '';
          const finalVal = Math.ceil(v * (1 + buffer / 100));
          return `${k}: ${finalVal.toLocaleString()}`;
      }).filter(s => s);
      return parts.length > 0 ? parts.join(', ') : '';
  };

  const handleIssuePlan = () => {
      setIsIssuing(true);
      const requests: PurchasingRequest[] = consolidatedItems.map(item => {
          const buffer = safetyBufferPct[item.key] || 0;
          const finalQty = Math.ceil(item.baseRequiredQty * (1 + buffer / 100));
          const breakdownStr = generateBreakdownString(item.breakdownMap, buffer);
          
          const calculatedVariantMap: Record<string, number> = {};
          Object.entries(item.breakdownMap).forEach(([k, v]) => {
              if (k !== 'Generic') {
                  calculatedVariantMap[k] = Math.ceil(v * (1 + buffer / 100));
              }
          });

          return {
              id: `REQ-TRM-${Date.now()}-${Math.floor(Math.random()*1000)}`,
              jobId: job.id,
              materialName: item.itemName,
              qty: finalQty,
              unit: item.unit,
              supplier: item.supplier,
              status: 'Pending',
              dateRequested: new Date().toISOString().split('T')[0],
              specs: item.specs,
              itemDetail: item.itemDetail, // Pass detail
              breakdown: breakdownStr,
              variantMap: Object.keys(calculatedVariantMap).length > 0 ? calculatedVariantMap : undefined,
              unitsPerPack: item.unitsPerPack,
              packingUnit: item.packingUnit
          };
      });

      setTimeout(() => {
          onIssue(requests);
          setIsIssuing(false);
      }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center">
           <div>
              <div className="flex items-center gap-2">
                 <Tag size={20} className="text-yellow-600" />
                 <h2 className="text-lg font-bold text-[#37352F]">Trims & Accessories Plan</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">Consolidated requirements for Job: <span className="font-mono font-bold">{job.id}</span></p>
           </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
           {consolidatedItems.length > 0 ? (
               <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm border-collapse">
                     <thead className="bg-[#F7F7F5] text-xs uppercase font-bold text-gray-500">
                        <tr>
                           <th className="px-4 py-3 border-b border-gray-200 w-24">Type</th>
                           <th className="px-4 py-3 border-b border-gray-200">Item Details</th>
                           <th className="px-4 py-3 border-b border-gray-200">Supplier</th>
                           <th className="px-4 py-3 border-b border-gray-200 text-right bg-yellow-50/50">Base Need</th>
                           <th className="px-4 py-3 border-b border-gray-200 w-32 text-center">Safety %</th>
                           <th className="px-4 py-3 border-b border-gray-200 text-right bg-green-50/50 font-bold">Purchase Qty</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {consolidatedItems.map(item => {
                            const buffer = safetyBufferPct[item.key] || 0;
                            const finalQty = Math.ceil(item.baseRequiredQty * (1 + buffer / 100));
                            const breakdown = generateBreakdownString(item.breakdownMap, buffer);
                            return (
                               <tr key={item.key} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 align-top">
                                     <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600 whitespace-nowrap">
                                        {item.category === 'Stitching Trims' ? 'Sewing' : item.category === 'Packing Trims' ? 'Packing' : 'Misc'}
                                     </span>
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                     <div className="font-medium text-[#37352F]">{item.itemName}</div>
                                     <div className="text-xs text-gray-500">{item.specs}</div>
                                     {item.unitsPerPack > 1 && <div className="text-[10px] font-bold text-blue-500 uppercase mt-1">Pack: {item.unitsPerPack} {item.unit} / {item.packingUnit}</div>}
                                     {breakdown && (
                                         <div className="mt-1 text-[10px] text-gray-500 font-mono bg-gray-50 p-1 rounded border border-gray-100">
                                             {breakdown}
                                         </div>
                                     )}
                                  </td>
                                  <td className="px-4 py-3 text-blue-600 font-medium text-xs align-top">{item.supplier}</td>
                                  <td className="px-4 py-3 text-right font-mono bg-yellow-50/20 text-gray-600 align-top">{Math.ceil(item.baseRequiredQty).toLocaleString()}</td>
                                  <td className="px-4 py-3 text-center align-top">
                                     <div className="flex items-center justify-center gap-1 border rounded px-2 py-1 bg-white max-w-[80px] mx-auto focus-within:ring-1 ring-yellow-500">
                                        <input type="number" min="0" className="w-full text-center outline-none text-sm" value={buffer} onChange={(e) => handleBufferChange(item.key, e.target.value)} />
                                        <span className="text-xs text-gray-400">%</span>
                                     </div>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-green-700 bg-green-50/20 align-top">{finalQty.toLocaleString()}</td>
                               </tr>
                            );
                        })}
                     </tbody>
                  </table>
               </div>
           ) : (
               <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Box size={48} className="mb-4 opacity-20" />
                  <p>No trims found in the BOM for this job.</p>
                  <p className="text-xs mt-1">Please add items to the BOM tab in Order Management.</p>
               </div>
           )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
           <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertTriangle size={14} className="text-yellow-600" />
              <span>Generates Purchase Requests for all items. POs will list details per size/variant if applicable.</span>
           </div>
           <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors">Cancel</button>
              <button onClick={handleIssuePlan} disabled={consolidatedItems.length === 0 || isIssuing} className="px-5 py-2 bg-yellow-600 text-white text-sm font-medium rounded hover:bg-yellow-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50">
                 {isIssuing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                 Issue Trims Plan
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
