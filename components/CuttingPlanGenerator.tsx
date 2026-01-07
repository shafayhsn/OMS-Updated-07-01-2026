
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Scissors, Calendar, CheckCircle2, Layers, ArrowRight, 
  RefreshCw, X, Info, FileText, Target, AlertCircle
} from 'lucide-react';
import { JobBatch, CuttingPlanDetail } from '../types';
// Fix: Added formatAppDate to imports from constants
import { MOCK_MASTER_BOM_ITEMS, formatAppDate } from '../constants';

interface CuttingPlanGeneratorProps {
  job: JobBatch;
  onClose: () => void;
  onIssue: (details: CuttingPlanDetail[]) => void;
}

// Internal type for state management of the form
interface PlanState {
  startDate: string;
  finishDate: string;
  dailyTarget: number;
  shrinkageLengthPct: number;
  shrinkageWidthPct: number;
  extraCuttingPct: number;
  // Matrix: [SizeGroupName][ShadeName][SizeName] = BaseQuantity
  quantities: Record<string, Record<string, Record<string, number>>>;
}

export const CuttingPlanGenerator: React.FC<CuttingPlanGeneratorProps> = ({ job, onClose, onIssue }) => {
  const [isIssuing, setIsIssuing] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // To switch between fabrics if multiple exist

  // --- 1. Data Preparation (Consolidated View) ---
  
  // A. CP Dates
  const cpDates = useMemo(() => {
    const dates: { date: string, label: string }[] = [];
    job.styles.forEach(style => {
      style.criticalPath?.schedule
        .filter(t => t.processGroup === 'Cutting')
        .forEach(t => {
          dates.push({ date: t.calculatedDueDate, label: t.milestone });
        });
    });
    return dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [job]);

  // B. Unique Fabrics (The primary keys for our plans)
  const fabrics = useMemo(() => {
    const uniqueFabrics = new Map<string, { 
        id: string, 
        name: string, 
        code: string, 
        desc: string,
        widthWeight: string, 
        styles: string[], 
        shades: Set<string>,
        // Map of GroupName -> Array of Sizes
        groups: Record<string, string[]>,
        avgConsumption: number // Weighted Average Consumption per garment
    }>();

    const fabricUsageAccumulator: Record<string, { totalConsump: number, totalQty: number }> = {};

    job.styles.forEach(style => {
        const styleFabrics = style.bom?.filter(i => i.processGroup === 'Fabric') || [];
        
        styleFabrics.forEach(item => {
            const key = item.componentName;
            
            // Calculate weighted consumption for this style
            let consump = 0;
            if (item.usageRule === 'Generic') {
                consump = item.usageData['generic'] || 0;
            } else {
                const vals = Object.values(item.usageData) as number[];
                consump = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
            }

            if (!fabricUsageAccumulator[key]) fabricUsageAccumulator[key] = { totalConsump: 0, totalQty: 0 };
            fabricUsageAccumulator[key].totalConsump += (consump * style.quantity);
            fabricUsageAccumulator[key].totalQty += style.quantity;

            if (!uniqueFabrics.has(key)) {
                // Pull details from Master BOM if available
                const masterItem = MOCK_MASTER_BOM_ITEMS.find(m => m.code === item.supplierRef);
                const description = masterItem 
                    ? `${masterItem.content || ''} ${masterItem.construction || ''}`.trim() 
                    : (style.fabricDescription || 'N/A');
                const widthWeight = masterItem
                    ? `58" / ${masterItem.weight ? masterItem.weight + 'oz' : 'TBD'}`
                    : 'Open Width / TBD gsm';

                uniqueFabrics.set(key, {
                    id: item.id,
                    name: item.componentName,
                    code: item.supplierRef || 'N/A',
                    desc: description,
                    widthWeight: widthWeight,
                    styles: [],
                    shades: new Set(),
                    groups: {},
                    avgConsumption: 0
                });
            }
            const entry = uniqueFabrics.get(key)!;
            if (!entry.styles.includes(style.styleNo)) entry.styles.push(style.styleNo);
            
            // Collect Shades from this style
            style.colors?.forEach(c => entry.shades.add(c.name));
            
            // Collect Size Groups from this style
            style.sizeGroups?.forEach(sg => {
                if (!entry.groups[sg.groupName]) {
                    entry.groups[sg.groupName] = [];
                }
                // Merge sizes uniquely
                sg.sizes.forEach(s => {
                    if (!entry.groups[sg.groupName].includes(s)) {
                        entry.groups[sg.groupName].push(s);
                    }
                });
            });
        });
    });

    return Array.from(uniqueFabrics.values()).map(f => ({
        ...f,
        shades: Array.from(f.shades),
        groups: Object.fromEntries(Object.entries(f.groups).map(([gName, sizes]) => [
            gName,
            sizes.sort((a, b) => {
                 const na = parseInt(a);
                 const nb = parseInt(b);
                 if (!isNaN(na) && !isNaN(nb)) return na - nb;
                 return a.localeCompare(b);
            })
        ])),
        avgConsumption: fabricUsageAccumulator[f.name]?.totalQty 
            ? (fabricUsageAccumulator[f.name].totalConsump / fabricUsageAccumulator[f.name].totalQty) 
            : 0
    }));
  }, [job]);

  // C. Initial State Initialization
  const [plans, setPlans] = useState<Record<string, PlanState>>({});

  useEffect(() => {
    const initialPlans: Record<string, PlanState> = {};
    
    fabrics.forEach(fabric => {
        // Pre-calculate Base Quantities from Orders, organized by [Group][Shade][Size]
        const initialQuantities: Record<string, Record<string, Record<string, number>>> = {};
        
        Object.keys(fabric.groups).forEach(groupName => {
            initialQuantities[groupName] = {};
            
            fabric.shades.forEach(shade => {
                initialQuantities[groupName][shade] = {};
                
                const sizesInGroup = fabric.groups[groupName];
                sizesInGroup.forEach(size => {
                    let total = 0;
                    job.styles.forEach(style => {
                        const colorId = style.colors?.find(c => c.name === shade)?.id;
                        // Find the size group in this style matching the name
                        const matchedGroup = style.sizeGroups?.find(sg => sg.groupName === groupName);
                        
                        if (colorId && matchedGroup && matchedGroup.sizes.includes(size)) {
                            total += parseInt(matchedGroup.breakdown[colorId]?.[size] || '0');
                        }
                    });
                    initialQuantities[groupName][shade][size] = total;
                });
            });
        });

        initialPlans[fabric.name] = {
            startDate: cpDates[0]?.date || new Date().toISOString().split('T')[0],
            finishDate: cpDates[cpDates.length - 1]?.date || '',
            dailyTarget: 0,
            shrinkageLengthPct: 0,
            shrinkageWidthPct: 0,
            extraCuttingPct: 3, // Default allowance
            quantities: initialQuantities
        };
    });
    setPlans(initialPlans);
  }, [fabrics, job, cpDates]);

  // --- Handlers ---

  const currentFabric = fabrics[activeTab];
  const currentPlan = currentFabric ? plans[currentFabric.name] : null;

  const updatePlanField = useCallback((field: keyof PlanState, value: any) => {
      if (!currentFabric) return;
      setPlans(prev => {
          const prevPlan = prev[currentFabric.name];
          if (prevPlan[field] === value) return prev;
          
          return {
            ...prev,
            [currentFabric.name]: {
                ...prevPlan,
                [field]: value
            }
          };
      });
  }, [currentFabric]);

  const updateQuantity = (groupName: string, shade: string, size: string, val: string) => {
      if (!currentFabric) return;
      const num = parseInt(val) || 0;
      setPlans(prev => ({
          ...prev,
          [currentFabric.name]: {
              ...prev[currentFabric.name],
              quantities: {
                  ...prev[currentFabric.name].quantities,
                  [groupName]: {
                      ...prev[currentFabric.name].quantities[groupName],
                      [shade]: {
                          ...prev[currentFabric.name].quantities[groupName][shade],
                          [size]: num
                      }
                  }
              }
          }
      }));
  };

  // --- Calculations ---

  // 1. Calculate Totals (Live) per Group
  const totals = useMemo(() => {
      if (!currentFabric || !currentPlan) return null;
      
      let grandBase = 0;
      let grandFinal = 0;
      
      const groupTotals: Record<string, {
          grandBase: number,
          grandFinal: number,
          shadeTotals: Record<string, { base: number, final: number }>,
          sizeTotals: Record<string, { base: number, final: number }>
      }> = {};

      Object.keys(currentFabric.groups).forEach(groupName => {
          const sizes = currentFabric.groups[groupName];
          const qtyMap = currentPlan.quantities[groupName];
          
          const shadeTotals: Record<string, { base: number, final: number }> = {};
          const sizeTotals: Record<string, { base: number, final: number }> = {};
          let gBase = 0;
          let gFinal = 0;

          // Init size totals
          sizes.forEach(s => sizeTotals[s] = { base: 0, final: 0 });

          currentFabric.shades.forEach(shade => {
              let sBase = 0;
              let sFinal = 0;
              sizes.forEach(size => {
                  const rawBase = qtyMap?.[shade]?.[size];
                  const base = typeof rawBase === 'number' ? rawBase : 0;
                  const final = Math.ceil(base * (1 + currentPlan.extraCuttingPct / 100));
                  
                  sBase += base;
                  sFinal += final;

                  if (sizeTotals[size]) {
                      sizeTotals[size].base += base;
                      sizeTotals[size].final += final;
                  }
              });
              shadeTotals[shade] = { base: sBase, final: sFinal };
              gBase += sBase;
              gFinal += sFinal;
          });

          groupTotals[groupName] = {
              grandBase: gBase,
              grandFinal: gFinal,
              shadeTotals,
              sizeTotals
          };
          
          grandBase += gBase;
          grandFinal += gFinal;
      });

      return { groupTotals, grandBase, grandFinal };
  }, [currentFabric, currentPlan]);

  // 2. Auto-Calculate Daily Target based on Grand Final
  useEffect(() => {
      if (currentPlan?.startDate && currentPlan?.finishDate && totals) {
          const start = new Date(currentPlan.startDate);
          const end = new Date(currentPlan.finishDate);
          const diffTime = end.getTime() - start.getTime();
          const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1); 
          
          const autoTarget = Math.ceil(totals.grandFinal / diffDays);
          
          if (autoTarget !== currentPlan.dailyTarget) {
               updatePlanField('dailyTarget', autoTarget);
          }
      }
  }, [currentPlan?.startDate, currentPlan?.finishDate, totals?.grandFinal, updatePlanField]);

  // 3. Allocation vs Planned Logic
  const allocatedQty = useMemo(() => {
      if (!currentFabric) return 0;
      // Sum approved requests for this material
      const requests = job.purchasingRequests?.filter(r => r.materialName === currentFabric.name && (r.status === 'PO Issued' || r.status === 'Received' || r.status === 'Pending')) || [];
      return requests.reduce((acc, r) => acc + r.qty, 0);
  }, [currentFabric, job.purchasingRequests]);

  const plannedFabricUsage = useMemo(() => {
      if (!totals || !currentFabric) return 0;
      // Grand Final (Garments) * Avg Consumption
      return totals.grandFinal * currentFabric.avgConsumption;
  }, [totals, currentFabric]);

  const isOverAllocated = allocatedQty > 0 && plannedFabricUsage > allocatedQty;

  const handleIssue = () => {
      setIsIssuing(true);
      const details: CuttingPlanDetail[] = fabrics.map(f => {
          const p = plans[f.name];
          
          // Recalculate planned usage for specific fabric during issue
          // We can reuse the memoized logic if we were iterating, but need to be safe
          const fabricTotalFinal = Object.values(p.quantities).reduce<number>((acc, g) => 
             acc + Object.values(g).reduce<number>((gAcc, s) => 
               gAcc + Object.values(s).reduce<number>((sAcc, q) => sAcc + Math.ceil((q as number) * (1 + p.extraCuttingPct/100)), 0)
             , 0)
          , 0);
          
          const plannedConsump = fabricTotalFinal * f.avgConsumption;
          
          // Flatten structure for export
          const sizeBreakdown: Record<string, Record<string, { base: number, final: number }>> = {};
          
          f.shades.forEach(shade => {
              sizeBreakdown[shade] = {};
              Object.keys(f.groups).forEach(groupName => {
                  const sizes = f.groups[groupName];
                  sizes.forEach(size => {
                      const base = p.quantities[groupName]?.[shade]?.[size] || 0;
                      const final = Math.ceil(base * (1 + p.extraCuttingPct / 100));
                      const uniqueSizeKey = `${size} (${groupName})`;
                      sizeBreakdown[shade][uniqueSizeKey] = { base, final };
                  });
              });
          });

          // Re-find allocated
          const alloc = job.purchasingRequests?.filter(r => r.materialName === f.name).reduce((acc, r) => acc + r.qty, 0) || 0;

          return {
              id: f.id,
              materialName: f.name,
              shrinkageLengthPct: p.shrinkageLengthPct,
              shrinkageWidthPct: p.shrinkageWidthPct,
              extraCuttingPct: p.extraCuttingPct,
              startDate: p.startDate,
              finishDate: p.finishDate,
              dailyTarget: p.dailyTarget,
              sizeBreakdown: sizeBreakdown,
              allocatedQty: alloc,
              unit: 'Mtr', // Mock unit
              plannedConsumption: plannedConsump
          };
      });

      setTimeout(() => {
          onIssue(details);
          setIsIssuing(false);
      }, 1200);
  };

  if (!currentFabric || !currentPlan || !totals) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-100 w-full max-w-[95vw] h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center shrink-0">
           <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                 <Scissors size={24} />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-[#37352F]">Cutting Execution Ticket</h2>
                 <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="font-mono font-medium bg-gray-100 px-2 py-0.5 rounded border">{job.id}</span>
                    <span>•</span>
                    <span>{fabrics.length} Fabric(s) Detected</span>
                 </div>
              </div>
           </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
        </div>

        {/* Main Split View Container - Fixed to display sidebar and content side-by-side */}
        <div className="flex-1 flex flex-row overflow-hidden">
            
            {/* Left Sidebar: Fabric Selector */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0 custom-scrollbar">
                <div className="p-4 border-b border-gray-100">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Material</h3>
                </div>
                {fabrics.map((f, idx) => (
                    <button
                        key={f.id}
                        onClick={() => setActiveTab(idx)}
                        className={`text-left px-4 py-5 border-b border-gray-50 transition-all group
                            ${activeTab === idx ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
                    >
                        <div className={`font-black text-xs mb-1 uppercase tracking-tight ${activeTab === idx ? 'text-indigo-900' : 'text-gray-700'}`}>
                            {f.name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono truncate">{f.code}</div>
                        <div className="mt-3 flex flex-col gap-1.5">
                            <span className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">Mapped Styles:</span>
                            <div className="flex gap-1 flex-wrap">
                                {f.styles.map(s => (
                                    <span key={s} className="text-[9px] px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-bold">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-gray-50/20">
                
                {/* 1. Material Context & CP Dates */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Material Specs */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm lg:col-span-2">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                            <Layers size={14} className="text-blue-500"/> Material Specifications
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1.5">Fabric Code</label>
                                <div className="text-sm font-bold text-gray-800 font-mono">{currentFabric.code}</div>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1.5">Description</label>
                                <div className="text-sm font-medium text-gray-700 truncate" title={currentFabric.desc}>{currentFabric.desc}</div>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1.5">Width / Weight</label>
                                <div className="text-sm font-bold text-gray-800">{currentFabric.widthWeight}</div>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1.5">Consumption</label>
                                <div className="text-sm font-black text-blue-600">~{currentFabric.avgConsumption.toFixed(2)} m/pc</div>
                            </div>
                        </div>
                    </div>

                    {/* CP Dates */}
                    <div className="bg-[#1a1a1a] p-6 rounded-2xl shadow-xl text-white">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Calendar size={14} className="text-blue-400"/> Critical Path Targets
                        </h4>
                        <div className="space-y-4">
                            {cpDates.length > 0 ? (
                                <>
                                    <div className="flex justify-between items-end border-b border-white/10 pb-3">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Commence Date</span>
                                        <span className="font-mono font-black text-lg text-blue-400 tracking-tighter">{formatAppDate(cpDates[0]?.date)}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Completion Deadline</span>
                                        <span className="font-mono font-black text-lg text-red-400 tracking-tighter">{formatAppDate(cpDates[cpDates.length-1]?.date)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs text-white/40 italic font-medium">No dates defined in critical path schedule.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Planning Inputs */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Target size={14} className="text-blue-500"/> Execution Parameters
                        </h4>
                        <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-widest">
                            Daily Target: {currentPlan.dailyTarget.toLocaleString()} pcs
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                        <div className="md:col-span-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase mb-1.5 block tracking-widest">Start Date</label>
                            <input 
                                type="date"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 outline-none font-mono"
                                value={currentPlan.startDate}
                                onChange={(e) => updatePlanField('startDate', e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase mb-1.5 block tracking-widest">End Date</label>
                            <input 
                                type="date"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 outline-none font-mono"
                                value={currentPlan.finishDate}
                                onChange={(e) => updatePlanField('finishDate', e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase mb-1.5 block tracking-widest">Daily Target</label>
                            <input 
                                type="number"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-500 outline-none font-bold"
                                value={currentPlan.dailyTarget}
                                onChange={(e) => updatePlanField('dailyTarget', parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase mb-1.5 block tracking-widest">Extra Cut %</label>
                            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-indigo-500 transition-colors">
                                <input 
                                    type="number"
                                    className="w-full px-3 py-2 text-sm outline-none border-none font-bold"
                                    value={currentPlan.extraCuttingPct}
                                    onChange={(e) => updatePlanField('extraCuttingPct', parseFloat(e.target.value) || 0)}
                                />
                                <span className="px-3 bg-gray-50 text-gray-400 text-[10px] font-black border-l border-gray-100">%</span>
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase mb-1.5 block tracking-widest">Shrinkage (L x W)</label>
                            <div className="flex gap-2">
                                <input 
                                    type="number"
                                    className="w-1/2 border border-gray-200 rounded-xl px-2 py-2 text-sm text-center font-bold"
                                    placeholder="L%"
                                    value={currentPlan.shrinkageLengthPct}
                                    onChange={(e) => updatePlanField('shrinkageLengthPct', parseFloat(e.target.value) || 0)}
                                />
                                <input 
                                    type="number"
                                    className="w-1/2 border border-gray-200 rounded-xl px-2 py-2 text-sm text-center font-bold"
                                    placeholder="W%"
                                    value={currentPlan.shrinkageWidthPct}
                                    onChange={(e) => updatePlanField('shrinkageWidthPct', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. The Cut Plan Matrix */}
                <div className="space-y-8">
                    {Object.keys(currentFabric.groups).map(groupName => {
                        const sizes = currentFabric.groups[groupName];
                        const groupTotal = totals.groupTotals[groupName];

                        return (
                            <div key={groupName} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                    <h5 className="font-black text-gray-700 text-[11px] uppercase tracking-widest">{groupName} Range Distribution</h5>
                                    <div className="flex gap-6">
                                        <div className="flex flex-col items-end leading-none">
                                            <span className="text-[8px] font-black text-gray-400 uppercase mb-1">Order Volume</span>
                                            <span className="text-xs font-bold text-gray-700 font-mono">{groupTotal.grandBase.toLocaleString()}</span>
                                        </div>
                                        <div className="flex flex-col items-end leading-none">
                                            <span className="text-[8px] font-black text-gray-400 uppercase mb-1">Planned Execution</span>
                                            <span className="text-xs font-bold text-indigo-700 font-mono">{groupTotal.grandFinal.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-center text-sm border-collapse">
                                        <thead>
                                            <tr className="text-[10px] font-black text-gray-400 uppercase border-b border-gray-100 bg-[#fbfbf9]">
                                                <th className="px-6 py-3 w-40 text-left border-r border-gray-100">Shade / Variant</th>
                                                <th className="px-4 py-3 w-24 bg-gray-50">Context</th>
                                                {sizes.map(size => (
                                                    <th key={size} className="px-2 py-3 border-l border-gray-50 font-black min-w-[64px]">{size}</th>
                                                ))}
                                                <th className="px-4 py-3 border-l border-gray-100 font-black bg-gray-50 w-28">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {currentFabric.shades.map(shade => {
                                                const shadeRow = groupTotal.shadeTotals[shade];
                                                
                                                return (
                                                    <React.Fragment key={shade}>
                                                        {/* Base Row */}
                                                        <tr className="bg-white">
                                                            <td className="px-6 py-3 text-left font-black text-xs text-gray-900 border-r border-gray-100" rowSpan={2}>{shade}</td>
                                                            <td className="px-4 py-3 text-[9px] text-gray-400 font-black uppercase tracking-tighter bg-gray-50/30">Order Qty</td>
                                                            {sizes.map(size => (
                                                                <td key={size} className="px-2 py-3 border-l border-gray-50 text-gray-400 font-mono text-xs">
                                                                    {currentPlan.quantities[groupName]?.[shade]?.[size] || '-'}
                                                                </td>
                                                            ))}
                                                            <td className="px-4 py-3 border-l border-gray-100 font-bold text-gray-400 bg-gray-50/50 font-mono text-xs">{shadeRow.base.toLocaleString()}</td>
                                                        </tr>
                                                        {/* Cut Row */}
                                                        <tr className="bg-indigo-50/20">
                                                            <td className="px-4 py-3 text-[9px] text-indigo-500 font-black uppercase tracking-tighter bg-indigo-50/40">Cut Target</td>
                                                            {sizes.map(size => {
                                                                const base = currentPlan.quantities[groupName]?.[shade]?.[size] || 0;
                                                                const cut = Math.ceil(base * (1 + currentPlan.extraCuttingPct / 100));
                                                                return (
                                                                    <td key={size} className="px-2 py-3 border-l border-indigo-100 font-black text-indigo-700 font-mono text-sm">
                                                                        {cut.toLocaleString()}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="px-4 py-3 border-l border-indigo-100 font-black text-indigo-800 bg-indigo-50/40 font-mono text-sm">{shadeRow.final.toLocaleString()}</td>
                                                        </tr>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                        {/* Totals Footer */}
                                        <tfoot className="border-t-2 border-gray-200 bg-gray-50 font-black text-[11px] uppercase tracking-tighter">
                                            <tr>
                                                <td className="px-6 py-4 text-left text-gray-700" colSpan={2}>Aggregate Group Totals</td>
                                                {sizes.map(size => (
                                                    <td key={size} className="px-2 py-4 border-l border-gray-200 text-gray-900 font-mono">
                                                        {groupTotal.sizeTotals[size].final.toLocaleString()}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-4 border-l border-gray-200 text-indigo-800 text-sm font-black font-mono">{groupTotal.grandFinal.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 4. Fabric Reconciliation */}
                <div className="bg-[#1a1a1a] text-white p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between shadow-2xl gap-8">
                    <div className="flex-1">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Projected Material Consumption</h4>
                        <div className="flex items-baseline gap-3">
                            <div className="text-4xl font-black font-mono tracking-tighter">
                                {Math.ceil(plannedFabricUsage).toLocaleString()}
                            </div>
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Meters Required</span>
                        </div>
                    </div>
                    <div className="w-full md:w-fit shrink-0 bg-white/5 border border-white/10 p-6 rounded-xl min-w-[280px]">
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Inventory Cover Status</h4>
                        {isOverAllocated ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-green-400">
                                    <CheckCircle2 size={24} />
                                    <div>
                                        <span className="font-black text-sm uppercase tracking-tight">Full Cover</span>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{Math.ceil(allocatedQty).toLocaleString()} Meters Allocated</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-red-400">
                                    <AlertCircle size={24} />
                                    <div>
                                        <span className="font-black text-sm uppercase tracking-tight">Material Shortage</span>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Missing {Math.ceil(plannedFabricUsage - allocatedQty).toLocaleString()} Meters</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 bg-white border-t border-gray-200 flex justify-between items-center shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
           <div className="flex items-center gap-3 text-xs text-gray-400">
              <Info size={16} className="text-indigo-400" />
              <span className="font-medium">Issuing generates a production ticket. Ensure physical fabric audit is complete.</span>
           </div>
           <div className="flex gap-4">
              <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all uppercase tracking-widest">Cancel</button>
              <button 
                 onClick={handleIssue}
                 disabled={isIssuing}
                 className="px-10 py-2.5 bg-[#1a1a1a] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center gap-3 disabled:opacity-50"
              >
                 {isIssuing ? <RefreshCw size={18} className="animate-spin" /> : <FileText size={18} />}
                 Approve & Issue Cutting Plan
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};
