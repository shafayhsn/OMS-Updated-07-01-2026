import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Layers, Settings, X, PieChart, CheckSquare, Square, Calculator } from 'lucide-react';
import { SizeGroup } from '../types';

interface SizeGroupMatrixManagerProps {
  groups: SizeGroup[];
  onGroupsChange: (groups: SizeGroup[]) => void;
}

// Updated to standard Waist Sizes for Denim
const PREDEFINED_SIZES = ['28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42', '44'];

// Helper for GCD
const gcd = (a: number, b: number): number => {
  return b === 0 ? a : gcd(b, a % b);
};

const calculateRowRatio = (quantities: number[]): string => {
  const nonZero = quantities.filter(q => q > 0);
  if (nonZero.length === 0) return '';

  let divisor = nonZero[0];
  for (let i = 1; i < nonZero.length; i++) {
    divisor = gcd(nonZero[i], divisor);
  }

  return quantities.map(q => q / divisor).join(':');
};

export const SizeGroupMatrixManager: React.FC<SizeGroupMatrixManagerProps> = ({ 
  groups,
  onGroupsChange
}) => {
  
  const [managingSizesGroupId, setManagingSizesGroupId] = useState<string | null>(null);
  const [customSizeInput, setCustomSizeInput] = useState('');

  // --- Ratio Configuration State ---
  const [ratioPanelGroupId, setRatioPanelGroupId] = useState<string | null>(null);
  const [ratioValues, setRatioValues] = useState<Record<string, number>>({});
  const [targetTotalQty, setTargetTotalQty] = useState<number>(0);
  const [selectedRatioColors, setSelectedRatioColors] = useState<Set<string>>(new Set());

  // --- Group Actions ---

  const addGroup = () => {
    const newGroup: SizeGroup = {
      id: `group-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      groupName: 'New Size Group',
      unitPrice: '',
      currency: 'USD',
      sizes: ['30', '32', '34', '36'],
      colors: [{ id: `c-${Date.now()}`, name: 'New Color' }],
      breakdown: {},
      ratios: {}
    };
    onGroupsChange([...groups, newGroup]);
  };

  const removeGroup = (e: React.MouseEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onGroupsChange(groups.filter(g => g.id !== groupId));
  };

  const updateGroupField = (groupId: string, field: keyof SizeGroup, value: string) => {
    onGroupsChange(groups.map(g => g.id === groupId ? { ...g, [field]: value } : g));
  };

  // --- Size Management ---

  const toggleSize = (groupId: string, size: string) => {
    const updated = groups.map(g => {
      if (g.id !== groupId) return g;
      const exists = g.sizes.includes(size);
      let newSizes;
      if (exists) {
        newSizes = g.sizes.filter(s => s !== size);
      } else {
        const combined = [...g.sizes, size];
        newSizes = combined.sort((a, b) => {
           const numA = parseInt(a);
           const numB = parseInt(b);
           if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
           return a.localeCompare(b);
        });
      }
      return { ...g, sizes: newSizes };
    });
    onGroupsChange(updated);
  };

  const removeSize = (groupId: string, size: string) => {
    const updated = groups.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, sizes: g.sizes.filter(s => s !== size) };
    });
    onGroupsChange(updated);
  };

  const addCustomSize = (groupId: string) => {
    if (!customSizeInput.trim()) return;
    const updated = groups.map(g => {
        if (g.id !== groupId) return g;
        if (g.sizes.includes(customSizeInput.trim())) return g;
        return { ...g, sizes: [...g.sizes, customSizeInput.trim()] };
    });
    onGroupsChange(updated);
    setCustomSizeInput('');
  };

  // --- Ratio Logic ---

  const openRatioPanel = (group: SizeGroup) => {
      setRatioPanelGroupId(group.id);
      setManagingSizesGroupId(null);
      
      let foundData = false;
      let initialRatios: Record<string, number> = {};
      let initialQty = 100;

      for (const color of group.colors) {
          const quantities = group.sizes.map(s => parseInt(group.breakdown[color.id]?.[s] || '0') || 0);
          const total = quantities.reduce((a, b) => a + b, 0);
          
          if (total > 0) {
              if (group.ratios && group.ratios[color.id]) {
                  const savedParts = group.ratios[color.id].split(':').map(Number);
                  if (savedParts.length === group.sizes.length) {
                      group.sizes.forEach((s, idx) => { initialRatios[s] = savedParts[idx]; });
                      initialQty = total;
                      foundData = true;
                      break;
                  }
              }

              const nonZero = quantities.filter(q => q > 0);
              let divisor = nonZero[0];
              for (let i = 1; i < nonZero.length; i++) { divisor = gcd(nonZero[i], divisor); }
              group.sizes.forEach((s, idx) => { initialRatios[s] = quantities[idx] / divisor; });
              initialQty = total;
              foundData = true;
              break;
          }
      }

      if (!foundData) { group.sizes.forEach(s => initialRatios[s] = 1); }
      setRatioValues(initialRatios);
      setSelectedRatioColors(new Set(group.colors.map(c => c.id)));
      setTargetTotalQty(initialQty);
  };

  const handleApplyRatio = (groupId: string) => {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      let totalRatio = 0;
      const ratios = { ...ratioValues };
      const ratioArray: number[] = [];
      group.sizes.forEach(size => {
          const val = Number(ratios[size]) || 0;
          totalRatio += val;
          ratioArray.push(val);
      });

      if (totalRatio === 0) {
          alert("Total ratio cannot be zero.");
          return;
      }

      const ratioString = ratioArray.join(':');
      const newBreakdown = { ...group.breakdown };
      const newRatios = { ...(group.ratios || {}) };

      selectedRatioColors.forEach(colorId => {
          if (!newBreakdown[colorId]) newBreakdown[colorId] = {};
          let distributedQty = 0;
          group.sizes.forEach((size, index) => {
              const ratio = Number(ratios[size]) || 0;
              let qty = Math.floor((ratio / totalRatio) * targetTotalQty);
              if (index === group.sizes.length - 1) { qty = targetTotalQty - distributedQty; }
              newBreakdown[colorId][size] = qty.toString();
              distributedQty += qty;
          });
          newRatios[colorId] = ratioString;
      });

      onGroupsChange(groups.map(g => g.id === groupId ? { ...g, breakdown: newBreakdown, ratios: newRatios } : g));
      setRatioPanelGroupId(null);
  };

  const updateColorName = (groupId: string, colorId: string, name: string) => {
    onGroupsChange(groups.map(g => g.id === groupId ? { ...g, colors: g.colors.map(c => c.id === colorId ? { ...c, name } : c) } : g));
  };

  const removeColor = (groupId: string, colorId: string) => {
    onGroupsChange(groups.map(g => {
      if (g.id !== groupId) return g;
      const newBreakdown = { ...g.breakdown };
      delete newBreakdown[colorId];
      const newRatios = { ...(g.ratios || {}) };
      delete newRatios[colorId];
      return { ...g, colors: g.colors.filter(c => c.id !== colorId), breakdown: newBreakdown, ratios: newRatios };
    }));
  };

  const updateQty = (groupId: string, colorId: string, size: string, value: string) => {
    onGroupsChange(groups.map(g => {
      if (g.id !== groupId) return g;
      const prevRow = g.breakdown[colorId] || {};
      const newRatios = { ...(g.ratios || {}) };
      delete newRatios[colorId];
      return { ...g, breakdown: { ...g.breakdown, [colorId]: { ...prevRow, [size]: value } }, ratios: newRatios };
    }));
  };

  const getGroupTotalQty = (group: SizeGroup) => {
    let total = 0;
    Object.values(group.breakdown).forEach(row => {
      Object.values(row).forEach(qty => { total += (Number(qty) || 0); });
    });
    return total;
  };

  const getGroupTotalValue = (group: SizeGroup) => {
    const qty = getGroupTotalQty(group);
    const price = parseFloat(group.unitPrice) || 0;
    return qty * price;
  };

  return (
    <div className="space-y-8">
      {groups.length === 0 && (
         <div className="text-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 text-sm mb-2">No size groups defined for this order.</p>
         </div>
      )}

      {groups.map((group, index) => (
        <div key={group.id} className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex items-center gap-3 flex-1">
               <div className="p-2 bg-gray-50 rounded-lg">
                 <Layers size={18} className="text-gray-400" />
               </div>
               <div className="flex items-center gap-2">
                 <input 
                   type="text" 
                   value={group.groupName}
                   onChange={(e) => updateGroupField(group.id, 'groupName', e.target.value)}
                   className="bg-transparent border-none focus:ring-0 font-bold text-[#37352F] text-lg px-0 py-0 min-w-[120px]"
                   placeholder="Group Name"
                 />
                 <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wider">Group {index + 1}</span>
               </div>
               <div className="h-4 w-px bg-gray-200 mx-2 hidden sm:block"></div>
               <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                  <div className="bg-white border-r border-gray-300 px-3 py-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-gray-50/50">Unit Price</div>
                  <div className="flex items-center bg-white px-2 py-1.5">
                     <span className="text-sm text-gray-400 font-mono">$</span>
                     <input 
                       type="number"
                       min="0"
                       step="0.01"
                       value={group.unitPrice}
                       onChange={(e) => updateGroupField(group.id, 'unitPrice', e.target.value)}
                       className="w-16 outline-none text-sm font-bold text-[#37352F] text-right"
                       placeholder="0.00"
                     />
                     <span className="text-[10px] text-gray-400 font-black ml-1 uppercase">USD</span>
                  </div>
               </div>
               <button 
                  type="button"
                  onClick={(e) => removeGroup(e, group.id)}
                  className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={18} />
               </button>
             </div>
          </div>

          {/* Toolbar */}
          <div className="px-4 py-2 border-b border-gray-50 flex items-center justify-between bg-white">
            <div className="flex gap-2">
              <button type="button" onClick={() => onGroupsChange(groups.map(g => g.id === group.id ? { ...g, colors: [...g.colors, { id: `c-${Date.now()}`, name: 'New Color' }] } : g))} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all uppercase tracking-tight"><Plus size={14} /> Add Color</button>
              <button type="button" onClick={() => setManagingSizesGroupId(managingSizesGroupId === group.id ? null : group.id)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all uppercase tracking-tight"><Settings size={14} /> Manage Sizes</button>
              <button type="button" onClick={() => openRatioPanel(group)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all uppercase tracking-tight"><PieChart size={14} /> Configure Ratio</button>
            </div>
            <div className="flex gap-6 text-[11px] font-black uppercase tracking-wider">
               <span className="text-gray-400">Total Qty: <span className="text-gray-900">{getGroupTotalQty(group).toLocaleString()}</span></span>
               <span className="text-gray-400">Total Value: <span className="text-gray-900">${getGroupTotalValue(group).toLocaleString()}</span></span>
            </div>
          </div>

          {/* Size Manager Panel */}
          {managingSizesGroupId === group.id && (
            <div className="bg-gray-50 border-b border-gray-200 p-4">
               <div className="flex items-center justify-between mb-3"><h4 className="text-xs font-bold uppercase text-gray-500">Configure Sizes</h4><button onClick={() => setManagingSizesGroupId(null)}><X size={14}/></button></div>
               <div className="flex flex-wrap gap-2 mb-4">
                  {PREDEFINED_SIZES.map(size => (
                      <button key={size} onClick={() => toggleSize(group.id, size)} className={`px-3 py-1.5 text-xs font-medium rounded border ${group.sizes.includes(size) ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-600 border-gray-200'}`}>{size}</button>
                  ))}
               </div>
            </div>
          )}

          {/* Ratio Panel */}
          {ratioPanelGroupId === group.id && (
             <div className="bg-blue-50/50 border-b border-blue-100 p-5">
                <div className="flex justify-between items-start mb-4"><h4 className="text-sm font-bold text-blue-900 flex items-center gap-2"><Calculator size={16}/> Calculate by Ratio</h4><button onClick={() => setRatioPanelGroupId(null)}><X size={16}/></button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Ratio Values</label>
                      <div className="flex flex-wrap gap-2">
                         {group.sizes.map(size => (
                            <div key={size} className="flex flex-col items-center">
                               <span className="text-[10px] text-gray-500 mb-1">{size}</span>
                               <input type="number" min="0" className="w-10 text-center border border-gray-300 rounded p-1 text-sm outline-none" value={ratioValues[size] || ''} onChange={(e) => setRatioValues({...ratioValues, [size]: parseInt(e.target.value) || 0})} />
                            </div>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Target Total</label>
                      <div className="flex gap-2">
                         <input type="number" className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm outline-none font-bold" placeholder="Total pcs" value={targetTotalQty || ''} onChange={(e) => setTargetTotalQty(parseInt(e.target.value) || 0)} />
                         <button onClick={() => handleApplyRatio(group.id)} className="px-6 bg-blue-600 text-white text-xs font-bold rounded shadow-sm">Apply</button>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse table-fixed">
              <thead>
                <tr className="bg-[#fbfbf9] border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-4 py-3 w-[20%] sticky left-0 bg-[#fbfbf9] z-10 border-r border-gray-100">Color Name</th>
                  {group.sizes.map(size => (
                    <th key={size} className="px-1 py-3 text-center border-r border-gray-50">{size}</th>
                  ))}
                  <th className="px-2 py-3 text-center w-[12%] bg-gray-50 border-l border-gray-100 font-bold">Total</th>
                  <th className="w-10 border-l border-gray-100"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {group.colors.map(color => {
                  const rowQtys = group.sizes.map(s => parseInt(group.breakdown[color.id]?.[s] || '0') || 0);
                  const rowTotal = rowQtys.reduce((a, b) => a + b, 0);
                  const ratioStr = group.ratios?.[color.id] || calculateRowRatio(rowQtys);

                  return (
                    <tr key={color.id} className="group hover:bg-gray-50">
                      <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r border-gray-100 align-top">
                        <div className="flex items-start gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-200 border border-gray-300 mt-1 shrink-0"></div>
                          <div className="flex-1 min-w-0">
                              <input 
                                type="text" 
                                value={color.name}
                                onChange={(e) => updateColorName(group.id, color.id, e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 outline-none font-bold text-gray-800 text-sm p-0 leading-tight"
                                placeholder="New Color"
                              />
                              {ratioStr && (
                                  <div className="text-[10px] font-mono text-indigo-500 font-bold tracking-tighter mt-1">
                                      Ratio: {ratioStr}
                                  </div>
                              )}
                          </div>
                        </div>
                      </td>
                      {group.sizes.map(size => (
                        <td key={`${color.id}-${size}`} className="px-1 py-3 border-r border-gray-50 align-middle">
                          <input 
                            type="number" 
                            min="0"
                            value={group.breakdown[color.id]?.[size] || ''}
                            onChange={(e) => updateQty(group.id, color.id, size, e.target.value)}
                            className="w-full text-center bg-transparent border-none focus:ring-0 outline-none font-mono text-[#37352F] text-sm font-medium"
                            placeholder="-"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-3 text-center font-bold text-[#37352F] bg-gray-50/30 border-l border-gray-100 align-middle">
                        {rowTotal.toLocaleString()}
                      </td>
                      <td className="px-1 py-3 text-center border-l border-gray-100 align-middle">
                         <button type="button" onClick={() => removeColor(group.id, color.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <button 
        type="button"
        onClick={addGroup}
        className="w-full py-6 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs"
      >
        <Plus size={20} /> Add New Size Group
      </button>
    </div>
  );
};
