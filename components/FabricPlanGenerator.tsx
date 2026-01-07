
import React, { useState, useMemo } from 'react';
import { 
  Scissors, AlertTriangle, Calendar, CheckCircle2, 
  ArrowRight, Calculator, RefreshCw, Truck, X, Layers,
  ChevronDown, ChevronRight, Info, Package, Shirt, Droplets
} from 'lucide-react';
import { JobBatch, PurchasingRequest, BOMItem, Order } from '../types';

interface FabricPlanGeneratorProps {
  job: JobBatch;
  onClose: () => void;
  onIssue: (purchasingRequests: PurchasingRequest[]) => void;
}

interface StyleShadeBreakdown {
    styleNo: string;
    buyer: string;
    shade: string; // The Wash or Color
    consumption: number;
    orderQty: number;
    requiredQty: number;
}

interface ConsolidatedItem {
    key: string; // Unique key (material name + vendor)
    materialName: string;
    supplier: string;
    baseRequiredQty: number; // Aggregate requirement before loss/buffer
    unit: string; 
    specs: string;
    itemDetail: string; // Added field
    unitsPerPack: number;
    packingUnit: string;
    breakdown: StyleShadeBreakdown[];
}

interface PlanningInput {
    consumptionLossPct: number;
    markerEfficiencyPct: number;
    safetyStockPct: number;
}

export const FabricPlanGenerator: React.FC<FabricPlanGeneratorProps> = ({ job, onClose, onIssue }) => {
  const [inputs, setInputs] = useState<Record<string, PlanningInput>>({});
  const [isIssuing, setIsIssuing] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // --- CONSOLIDATION LOGIC WITH DETAILED BREAKDOWN ---
  const consolidatedItems: ConsolidatedItem[] = useMemo(() => {
      const map = new Map<string, ConsolidatedItem>();

      job.styles.forEach(style => {
          if (!style.bom) return;
          
          // Filter for Fabrics only
          const fabricItems = style.bom.filter(i => i.processGroup === 'Fabric');

          fabricItems.forEach(bomItem => {
              const key = `${bomItem.componentName}-${bomItem.vendor || 'Unknown'}`;
              const localBreakdown: StyleShadeBreakdown[] = [];

              // Calculate Breakdown per Color/Wash (Shade)
              // 1. Determine base consumption for this material on this style
              let baseConsump = 0;
              if (bomItem.usageRule === 'Generic') {
                  baseConsump = bomItem.usageData['generic'] || 0;
              }

              // 2. Loop through colors defined in the style
              style.colors?.forEach(color => {
                  let colorQty = 0;
                  // Sum quantity for this color across all size groups
                  style.sizeGroups?.forEach(sg => {
                      const row = sg.breakdown[color.id];
                      if (row) {
                          Object.values(row).forEach(q => colorQty += (Number(q) || 0));
                      }
                  });

                  if (colorQty > 0) {
                      // Specific consumption logic if the rule is 'By Color/Wash'
                      let specificConsump = baseConsump;
                      if (bomItem.usageRule === 'By Color/Wash') {
                          specificConsump = Number(bomItem.usageData[color.name]) || 0;
                      }

                      localBreakdown.push({
                          styleNo: style.styleNo,
                          buyer: style.buyer,
                          shade: color.name,
                          consumption: specificConsump,
                          orderQty: colorQty,
                          requiredQty: colorQty * specificConsump
                      });
                  }
              });

              // If the rule was something else (e.g., Size Group) and didn't result in color breakdown, 
              // provide a fallback Style Total row
              if (localBreakdown.length === 0) {
                  let totalStyleReq = 0;
                  const values = Object.values(bomItem.usageData) as number[];
                  const avg = values.length ? values.reduce((a,b) => a+b, 0) / values.length : 0;
                  totalStyleReq = avg * style.quantity;

                  localBreakdown.push({
                      styleNo: style.styleNo,
                      buyer: style.buyer,
                      shade: 'Mixed / All',
                      consumption: avg,
                      orderQty: style.quantity,
                      requiredQty: totalStyleReq
                  });
              }

              const totalStyleReqSum = localBreakdown.reduce((s, b) => s + b.requiredQty, 0);

              if (map.has(key)) {
                  const existing = map.get(key)!;
                  existing.baseRequiredQty += totalStyleReqSum;
                  existing.breakdown.push(...localBreakdown);
              } else {
                  map.set(key, {
                      key,
                      materialName: bomItem.componentName,
                      supplier: bomItem.vendor || 'Unknown',
                      baseRequiredQty: totalStyleReqSum,
                      unit: bomItem.uom || 'Mtr',
                      specs: bomItem.supplierRef || '',
                      itemDetail: bomItem.itemDetail || '', // Capture detail
                      unitsPerPack: bomItem.unitsPerPack || 1,
                      packingUnit: bomItem.packingUnit || 'Roll',
                      breakdown: localBreakdown
                  });
              }
          });
      });

      return Array.from(map.values());
  }, [job]);

  const calculateOutput = (item: ConsolidatedItem) => {
      const input = inputs[item.key] || { consumptionLossPct: 0, markerEfficiencyPct: 100, safetyStockPct: 0 };
      const base = item.baseRequiredQty;
      const withLoss = base * (1 + input.consumptionLossPct / 100);
      const effDecimal = input.markerEfficiencyPct / 100;
      const withMarker = effDecimal > 0 ? withLoss / effDecimal : withLoss;
      const finalQty = withMarker * (1 + input.safetyStockPct / 100);

      return { base, finalQty, variance: finalQty - base };
  };

  const handleInputChange = (key: string, field: keyof PlanningInput, value: any) => {
      setInputs(prev => ({
          ...prev,
          [key]: {
              ...(prev[key] || { consumptionLossPct: 0, markerEfficiencyPct: 100, safetyStockPct: 0 }),
              [field]: parseFloat(value) || 0
          }
      }));
  };

  const toggleExpand = (key: string) => {
      const next = new Set(expandedKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setExpandedKeys(next);
  };

  const handleIssuePlan = () => {
      setIsIssuing(true);
      const requests: PurchasingRequest[] = consolidatedItems.map(item => {
          const calc = calculateOutput(item);
          return {
              id: `REQ-FAB-${Date.now()}-${Math.floor(Math.random()*1000)}`,
              jobId: job.id,
              materialName: item.materialName,
              qty: Math.ceil(calc.finalQty),
              unit: item.unit,
              supplier: item.supplier,
              status: 'Pending',
              dateRequested: new Date().toISOString().split('T')[0],
              specs: item.specs,
              itemDetail: item.itemDetail, // Pass detail
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/20 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-7xl h-[92vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center">
           <div>
              <div className="flex items-center gap-2">
                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Layers size={22} />
                 </div>
                 <h2 className="text-xl font-bold text-[#37352F]">Fabric Planning & Aggregation</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">Consolidated requirements per Wash/Color for Job: <span className="font-mono font-bold">{job.id}</span></p>
           </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
           <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                 <thead className="bg-[#F7F7F5] text-[10px] uppercase font-bold text-gray-400 border-b border-gray-200">
                    <tr>
                       <th className="px-4 py-3 w-12 text-center"></th>
                       <th className="px-4 py-3 border-r border-gray-200">Fabric Description</th>
                       <th className="px-4 py-3 text-right border-r border-gray-200 bg-yellow-50/30 w-32">Base Agg. Req.</th>
                       <th className="px-4 py-3 border-r border-gray-200 w-24 text-center">Loss %</th>
                       <th className="px-4 py-3 border-r border-gray-200 w-24 text-center">Marker %</th>
                       <th className="px-4 py-3 border-r border-gray-200 w-24 text-center">Safety %</th>
                       <th className="px-4 py-3 text-right bg-green-50/30 w-40 font-bold">Final Purchase</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {consolidatedItems.map(item => {
                        const calc = calculateOutput(item);
                        const input = inputs[item.key] || { consumptionLossPct: 0, markerEfficiencyPct: 100, safetyStockPct: 0 };
                        const isExpanded = expandedKeys.has(item.key);
                        const packsNeeded = item.unitsPerPack > 1 ? Math.ceil(calc.finalQty / item.unitsPerPack) : null;

                        return (
                           <React.Fragment key={item.key}>
                              <tr className={`transition-colors group ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
                                 <td className="px-4 py-4 text-center">
                                    <button 
                                        onClick={() => toggleExpand(item.key)}
                                        className="p-1 hover:bg-white rounded transition-colors text-gray-400 hover:text-blue-600"
                                    >
                                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    </button>
                                 </td>
                                 <td className="px-4 py-4 border-r border-gray-100">
                                    <div className="font-bold text-[#37352F]">{item.materialName}</div>
                                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                        <span className="font-medium">{item.supplier}</span>
                                        <span className="text-gray-300">|</span>
                                        <span>{item.specs}</span>
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-gray-400">UNIT: {item.unit.toUpperCase()}</span>
                                        {item.unitsPerPack > 1 && (
                                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-bold uppercase flex items-center gap-1">
                                                <Package size={10} /> 1 {item.packingUnit} = {item.unitsPerPack} {item.unit}
                                            </span>
                                        )}
                                    </div>
                                 </td>
                                 <td className="px-4 py-4 text-right font-mono border-r border-gray-100 bg-yellow-50/10">
                                    <div className="text-gray-800 font-bold">{item.baseRequiredQty.toLocaleString(undefined, {maximumFractionDigits: 1})}</div>
                                    <div className="text-[10px] text-gray-400 uppercase">{item.unit}</div>
                                 </td>
                                 <td className="px-4 py-4 border-r border-gray-100">
                                    <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 bg-white focus-within:ring-1 ring-blue-500 mx-auto w-20">
                                       <input type="number" className="w-full outline-none text-xs text-center font-bold" value={input.consumptionLossPct} onChange={(e) => handleInputChange(item.key, 'consumptionLossPct', e.target.value)} />
                                       <span className="text-[10px] text-gray-400">%</span>
                                    </div>
                                 </td>
                                 <td className="px-4 py-4 border-r border-gray-100">
                                    <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 bg-white focus-within:ring-1 ring-blue-500 mx-auto w-20">
                                       <input type="number" className="w-full outline-none text-xs text-center font-bold" value={input.markerEfficiencyPct} onChange={(e) => handleInputChange(item.key, 'markerEfficiencyPct', e.target.value)} />
                                       <span className="text-[10px] text-gray-400">%</span>
                                    </div>
                                 </td>
                                 <td className="px-4 py-4 border-r border-gray-100">
                                    <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 bg-white focus-within:ring-1 ring-blue-500 mx-auto w-20">
                                       <input type="number" className="w-full outline-none text-xs text-center font-bold" value={input.safetyStockPct} onChange={(e) => handleInputChange(item.key, 'safetyStockPct', e.target.value)} />
                                       <span className="text-[10px] text-gray-400">%</span>
                                    </div>
                                 </td>
                                 <td className="px-4 py-4 text-right bg-green-50/10">
                                    <div className="text-green-800 font-bold text-lg leading-none">{Math.ceil(calc.finalQty).toLocaleString()}</div>
                                    <div className="text-[10px] text-green-600 mt-1 uppercase font-medium">{item.unit}</div>
                                    {packsNeeded && (
                                        <div className="text-[9px] text-blue-600 font-bold uppercase mt-1">
                                            Est. {packsNeeded} {item.packingUnit}s
                                        </div>
                                    )}
                                 </td>
                              </tr>

                              {/* Granular Breakdown per Style & Wash/Color */}
                              {isExpanded && (
                                  <tr className="bg-gray-50/80">
                                      <td colSpan={7} className="px-0 py-0">
                                          <div className="p-6 pl-14 animate-in slide-in-from-top-2 duration-300">
                                              <div className="bg-white border border-gray-200 rounded-xl shadow-inner overflow-hidden">
                                                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                                                      <Info size={14} className="text-blue-500" />
                                                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Requirement Breakdown per Style & Wash/Colour</span>
                                                  </div>
                                                  <table className="w-full text-left text-xs">
                                                      <thead>
                                                          <tr className="text-gray-400 border-b border-gray-100 bg-white">
                                                              <th className="px-4 py-2 font-bold uppercase">Style & Buyer</th>
                                                              <th className="px-4 py-2 font-bold uppercase">Wash / Shade</th>
                                                              <th className="px-4 py-2 text-right font-bold uppercase">Consump (BOM)</th>
                                                              <th className="px-4 py-2 text-right font-bold uppercase">Order Pcs</th>
                                                              <th className="px-4 py-2 text-right font-bold uppercase">Base Req ({item.unit})</th>
                                                          </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-gray-50">
                                                          {item.breakdown.map((row, idx) => (
                                                              <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                                                                  <td className="px-4 py-2.5">
                                                                      <div className="flex items-center gap-2">
                                                                          <Shirt size={12} className="text-gray-300" />
                                                                          <div>
                                                                              <div className="font-bold text-gray-800">{row.styleNo}</div>
                                                                              <div className="text-[10px] text-gray-400">{row.buyer}</div>
                                                                          </div>
                                                                      </div>
                                                                  </td>
                                                                  <td className="px-4 py-2.5">
                                                                      <div className="flex items-center gap-2">
                                                                          <Droplets size={12} className="text-cyan-400" />
                                                                          <span className="font-medium text-[#37352F]">{row.shade}</span>
                                                                      </div>
                                                                  </td>
                                                                  <td className="px-4 py-2.5 text-right font-mono text-gray-500">${row.consumption.toFixed(4)}</td>
                                                                  <td className="px-4 py-2.5 text-right font-mono text-gray-700 font-medium">${row.orderQty.toLocaleString()}</td>
                                                                  <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-700">
                                                                      {row.requiredQty.toLocaleString(undefined, {maximumFractionDigits: 2})}
                                                                  </td>
                                                              </tr>
                                                          ))}
                                                      </tbody>
                                                      <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                                                          <tr>
                                                              <td className="px-4 py-2.5 text-gray-500" colSpan={3}>Aggregate Style Subtotal</td>
                                                              <td className="px-4 py-2.5 text-right">${item.breakdown.reduce((s,b)=>s+b.orderQty,0).toLocaleString()}</td>
                                                              <td className="px-4 py-2.5 text-right text-indigo-800">
                                                                  {item.baseRequiredQty.toLocaleString(undefined, {maximumFractionDigits: 2})} {item.unit}
                                                              </td>
                                                          </tr>
                                                      </tfoot>
                                                  </table>
                                              </div>
                                          </div>
                                      </td>
                                  </tr>
                              )}
                           </React.Fragment>
                        );
                    })}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
           <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertTriangle size={14} className="text-orange-500" />
              <span>Issuing plan generates Purchase Requests. All breakdown details are preserved for Cut Plan mapping.</span>
           </div>
           <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors">Cancel</button>
              <button onClick={handleIssuePlan} disabled={consolidatedItems.length === 0 || isIssuing} className="px-6 py-2 bg-green-700 text-white text-sm font-bold rounded hover:bg-green-800 shadow-md transition-all flex items-center gap-2 disabled:opacity-50">
                 {isIssuing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                 Approve & Issue Fabric Plan
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
