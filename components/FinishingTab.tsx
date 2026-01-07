
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, Box, Plus, Trash2, Edit2, CheckCircle2, 
  Layers, Palette, Ruler, ArrowRight, RefreshCw, X, AlertCircle
} from 'lucide-react';
import { FinishingData, PackingInstruction, SizeGroup } from '../types';

interface FinishingTabProps {
  data: FinishingData;
  onUpdate: (data: FinishingData) => void;
  sizeGroups?: SizeGroup[]; 
}

// Default state for a new instruction
const INITIAL_INSTRUCTION: PackingInstruction = {
  id: '',
  name: '',
  method: 'Flat Pack',
  polybagSpec: '',
  cartonMarkings: '',
  maxPiecesPerCarton: '',
  tagPlacement: '',
  assortmentMethod: 'Solid Size / Solid Color',
  packagingSpecSheetRef: null,
  foldingInstructions: '',
  packingNotes: '',
  allocation: {},
  totalAllocated: 0,
  blisterType: 'By Ratio',
  pcsPerBlister: '',
  blisterPerCarton: '',
  cartonSize: '',
  maxCartonWeightAllowed: '',
  cartonNetWeight: '',
  cartonGrossWeight: '',
};

type AllocationMode = 'Generic' | 'ByColor' | 'BySizeGroup' | 'Manual';

export const FinishingTab: React.FC<FinishingTabProps> = ({ data, onUpdate, sizeGroups = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState<PackingInstruction>(INITIAL_INSTRUCTION);
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('Generic');
  
  // Temporary selection states for "By Color" and "By Size Group" modes
  const [selectedScopeIds, setSelectedScopeIds] = useState<Set<string>>(new Set());

  // --- Calculations ---

  // 1. Total PO Matrix (What the customer ordered)
  const poTotalMatrix = useMemo((): { matrix: Record<string, number>; total: number } => {
    const matrix: Record<string, number> = {}; // Key: `${colorId}-${size}`
    let total: number = 0;
    sizeGroups.forEach(group => {
      group.colors.forEach(color => {
        group.sizes.forEach(size => {
          const key = `${color.id}-${size}`;
          const qtyVal = group.breakdown[color.id]?.[size];
          const qty: number = parseInt(qtyVal || '0', 10) || 0;
          matrix[key] = qty;
          total += qty;
        });
      });
    });
    return { matrix, total };
  }, [sizeGroups]);

  // 2. Used Matrix (What is already assigned to *other* instructions)
  const usedMatrix = useMemo((): { matrix: Record<string, number>; total: number } => {
    const matrix: Record<string, number> = {};
    let total: number = 0;
    
    (data.packingList || []).forEach(inst => {
      // If we are editing, exclude the current instruction's previous values from "used"
      // so we can re-allocate them.
      if (isEditing && inst.id === currentInstruction.id) return;

      Object.entries(inst.allocation).forEach(([key, qty]) => {
        const quantity: number = Number(qty as any) || 0;
        matrix[key] = (matrix[key] || 0) + quantity;
        total += quantity;
      });
    });
    return { matrix, total };
  }, [data.packingList, isEditing, currentInstruction.id]);

  // 3. Available Matrix (PO - Used)
  const availableMatrix = useMemo((): Record<string, number> => {
    const matrix: Record<string, number> = {};
    Object.entries(poTotalMatrix.matrix).forEach(([key, totalQty]: [string, number]) => {
      const usedQty = Number(usedMatrix.matrix[key] || 0);
      matrix[key] = Math.max(0, totalQty - usedQty);
    });
    return matrix;
  }, [poTotalMatrix, usedMatrix]);

  // --- Effects ---

  // Auto-fill allocation based on mode and selection
  useEffect(() => {
    if (!isEditing) return;

    let newAllocation: Record<string, number> = {};

    if (allocationMode === 'Generic') {
       // Take everything currently available
       newAllocation = { ...availableMatrix };
    } 
    else if (allocationMode === 'ByColor') {
       sizeGroups.forEach(group => {
          group.colors.forEach(color => {
             if (selectedScopeIds.has(color.id)) {
                group.sizes.forEach(size => {
                   const key = `${color.id}-${size}`;
                   if (availableMatrix[key] !== undefined) {
                      newAllocation[key] = availableMatrix[key];
                   }
                });
             }
          });
       });
    }
    else if (allocationMode === 'BySizeGroup') {
       sizeGroups.forEach(group => {
          if (selectedScopeIds.has(group.id)) {
             group.colors.forEach(c => {
                group.sizes.forEach(s => {
                   const key = `${c.id}-${s}`;
                   if (availableMatrix[key]) newAllocation[key] = availableMatrix[key];
                });
             });
          }
       });
    }
    else if (allocationMode === 'Manual') {
       newAllocation = currentInstruction.allocation;
    }

    if (allocationMode !== 'Manual') {
        setCurrentInstruction(prev => ({ ...prev, allocation: newAllocation }));
    }

  }, [allocationMode, selectedScopeIds, availableMatrix, isEditing, sizeGroups]);


  // --- Handlers ---

  const handleAddNew = () => {
    const newId = `pack-${Date.now()}`;
    const initialAlloc = { ...availableMatrix };
    
    setCurrentInstruction({
      ...INITIAL_INSTRUCTION,
      id: newId,
      name: `Packing Model #${(data.packingList || []).length + 1}`,
      allocation: initialAlloc, 
      totalAllocated: Object.values(initialAlloc).reduce((a: number, b: number) => a + b, 0)
    });
    setAllocationMode('Generic');
    setSelectedScopeIds(new Set());
    setIsEditing(true);
  };

  const handleEdit = (e: React.MouseEvent, inst: PackingInstruction) => {
    e.stopPropagation();
    setCurrentInstruction({ ...inst });
    setAllocationMode('Manual'); 
    setSelectedScopeIds(new Set());
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this packing model?')) return;
    
    // Use an immediate state update approach by filtering the list
    const newList = (data.packingList || []).filter(i => i.id !== id);
    onUpdate({ ...data, packingList: newList });
  };

  const handleSaveInstruction = () => {
    // Strictly re-calculate total from the allocation object to prevent drift
    const calculatedTotal = Object.values(currentInstruction.allocation).reduce((acc: number, val) => acc + (Number(val) || 0), 0);
    
    if (calculatedTotal === 0) {
        alert("Please allocate at least 1 item.");
        return;
    }

    // Safety Check: Overall balance across all instructions
    const otherAllocatedTotal = (data.packingList || [])
        .filter(i => i.id !== currentInstruction.id)
        .reduce((sum: number, i) => sum + i.totalAllocated, 0);
    
    if (otherAllocatedTotal + calculatedTotal > poTotalMatrix.total) {
        alert(`Error: Cannot allocate ${calculatedTotal} units. Total allocated (${otherAllocatedTotal + calculatedTotal}) would exceed PO total (${poTotalMatrix.total}).`);
        return;
    }

    const toSave = { ...currentInstruction, totalAllocated: calculatedTotal };
    let newList = [...(data.packingList || [])];
    const existingIdx = newList.findIndex(i => i.id === toSave.id);
    
    if (existingIdx >= 0) {
      newList[existingIdx] = toSave;
    } else {
      newList.push(toSave);
    }

    onUpdate({ ...data, packingList: newList });
    setIsEditing(false);
  };

  const updateCurrentField = (field: keyof PackingInstruction, value: any) => {
    setCurrentInstruction(prev => ({ ...prev, [field]: value }));
  };

  const handleManualAllocationChange = (key: string, val: string) => {
    const num: number = parseInt(val) || 0;
    const maxVal: number = Number(availableMatrix[key] || 0);

    if (num > maxVal) {
        // Cap input to what is actually available for this variant
        setManualAllocation(key, maxVal);
    } else {
        setManualAllocation(key, num);
    }
  };

  const setManualAllocation = (key: string, num: number) => {
    setCurrentInstruction(prev => ({
      ...prev,
      allocation: { ...prev.allocation, [key]: num }
    }));
  };

  const toggleScope = (id: string) => {
      const next = new Set(selectedScopeIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedScopeIds(next);
  };

  // --- Render Helpers ---

  const totalAllocated = (data.packingList || []).reduce((acc: number, curr) => acc + curr.totalAllocated, 0);
  const totalRemaining = Math.max(0, poTotalMatrix.total - totalAllocated);
  const progress = poTotalMatrix.total > 0 ? (totalAllocated / poTotalMatrix.total) * 100 : 0;

  const currentAllocationTotal = Object.values(currentInstruction.allocation).reduce<number>((a: number, b: unknown) => a + (Number(b) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      
      {/* 1. PROGRESS STATUS BAR */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
         <div className="flex justify-between items-end mb-2">
            <div>
                <h3 className="text-sm font-bold text-[#37352F]">Allocation Status</h3>
                <p className="text-xs text-gray-500">Total Order Volume: {poTotalMatrix.total.toLocaleString()} pcs</p>
            </div>
            <div className="text-right">
                <span className={`text-2xl font-bold ${totalRemaining === 0 ? 'text-green-600' : 'text-orange-500'}`}>
                    {Math.round(progress)}%
                </span>
                <span className="text-xs text-gray-400 block">Allocated</span>
            </div>
         </div>
         <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex border border-gray-200">
            <div className="h-full bg-green-500 transition-all duration-500 shadow-inner" style={{ width: `${Math.min(100, progress)}%` }}></div>
            {isEditing && currentAllocationTotal > 0 && poTotalMatrix.total > 0 && (
                <div className="h-full bg-blue-400 opacity-50 striped-bar" style={{ width: `${Math.min(100 - progress, (currentAllocationTotal / poTotalMatrix.total) * 100)}%` }}></div>
            )}
         </div>
         <div className="flex justify-between mt-2 text-xs font-medium">
             <span className="text-gray-400">0</span>
             <span className="text-green-600 font-bold">{totalAllocated.toLocaleString()} Allocated</span>
             <span className={`${totalRemaining > 0 ? 'text-orange-500' : 'text-gray-400'}`}>{totalRemaining.toLocaleString()} Remaining</span>
         </div>
      </div>

      {/* 2. INSTRUCTION LIST */}
      {!isEditing && (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-[#37352F]">Packing Models</h3>
                  <button 
                      onClick={handleAddNew}
                      disabled={totalRemaining <= 0}
                      className="flex items-center gap-2 px-4 py-2 bg-[#37352F] text-white text-sm font-medium rounded hover:bg-black transition-colors disabled:opacity-50"
                  >
                      <Plus size={16} /> Add Packing Model
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(data.packingList || []).map((inst, idx) => {
                      const totalCartons = inst.maxPiecesPerCarton ? Math.ceil(inst.totalAllocated / (parseInt(inst.maxPiecesPerCarton) || 1)) : 0;

                      return (
                        <div key={inst.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow group relative">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <button 
                                    type="button"
                                    onClick={(e) => handleEdit(e, inst)} 
                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded bg-white border border-gray-100 shadow-sm"
                                    title="Edit"
                                >
                                    <Edit2 size={16}/>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleDelete(inst.id)} 
                                    className="p-1.5 hover:bg-red-50 text-red-600 rounded bg-white border border-gray-100 shadow-sm"
                                    title="Delete"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600 font-bold border border-gray-100">
                                    {idx + 1}
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#37352F]">{inst.name}</h4>
                                    <div className="flex gap-2 text-[10px] text-gray-500 uppercase font-medium mt-0.5">
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">{inst.method}</span>
                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">{inst.assortmentMethod}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs border-t border-gray-100 pt-3">
                                <div className="flex-1">
                                    <span className="text-gray-400 block mb-1 uppercase font-bold text-[9px]">Quantity</span>
                                    <span className="font-bold text-xl text-blue-600">{inst.totalAllocated.toLocaleString()}</span>
                                </div>
                                
                                <div className="w-px h-8 bg-gray-100 mx-2"></div>

                                <div className="flex gap-2">
                                    <div className="w-14 h-14 border border-blue-200 rounded flex flex-col items-center justify-center bg-blue-50/20">
                                        <span className="text-[8px] font-bold text-blue-500 uppercase text-center leading-tight">Total<br/>Cartons</span>
                                        <span className="text-sm font-bold text-blue-800">{totalCartons > 0 ? totalCartons.toLocaleString() : '-'}</span>
                                    </div>
                                </div>

                                <div className="flex-1 pl-2">
                                    <span className="text-gray-400 block mb-0.5 uppercase font-bold text-[9px]">Spec</span>
                                    <span className="text-gray-700 block truncate font-medium text-[11px]" title={inst.polybagSpec}>{inst.polybagSpec || 'No Polybag'}</span>
                                    <span className="text-gray-500 block text-[10px]">{inst.maxPiecesPerCarton ? `${inst.maxPiecesPerCarton} pcs/ctn` : 'Bulk'}</span>
                                </div>
                            </div>
                        </div>
                      );
                  })}
                  
                  {(data.packingList || []).length === 0 && (
                      <div className="col-span-2 text-center py-12 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 bg-gray-50/50">
                          <Package size={32} className="mx-auto mb-2 opacity-30" />
                          <p>No packing models defined yet.</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* 3. EDITOR */}
      {isEditing && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95">
              {/* Header */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><Box size={20} /></div>
                      <div>
                          <h3 className="font-bold text-[#37352F]">{currentInstruction.name || 'New Packing Instruction'}</h3>
                          <p className="text-xs text-gray-500">Configure packing method and quantity allocation.</p>
                      </div>
                  </div>
                  <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
              </div>

              <div className="flex flex-col lg:flex-row h-[700px]">
                  
                  {/* LEFT: SETTINGS FORM */}
                  <div className="w-full lg:w-1/3 p-6 border-r border-gray-200 overflow-y-auto bg-white space-y-6">
                      
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Instruction Name</label>
                              <input 
                                  type="text" 
                                  value={currentInstruction.name} 
                                  onChange={e => updateCurrentField('name', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                  placeholder="e.g. US Retail - Flat Pack"
                              />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Packing Method</label>
                                  <select 
                                      value={currentInstruction.method} 
                                      onChange={e => updateCurrentField('method', e.target.value)}
                                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                                  >
                                      <option>Flat Pack</option>
                                      <option>Hanger Pack</option>
                                      <option>Roll Pack</option>
                                      <option>Blister Pack</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Assortment</label>
                                  <select 
                                      value={currentInstruction.assortmentMethod} 
                                      onChange={e => updateCurrentField('assortmentMethod', e.target.value)}
                                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                                  >
                                      <option>Solid Size / Solid Color</option>
                                      <option>Ratio Pack</option>
                                      <option>Mixed Color</option>
                                  </select>
                              </div>
                          </div>

                          {currentInstruction.method === 'Blister Pack' && (
                              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-4 animate-in slide-in-from-top-2">
                                  <h4 className="text-xs font-bold text-orange-700 uppercase">Blister Pack Specification</h4>
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-bold text-gray-500 uppercase block">Blister Configuration</label>
                                      <select 
                                          value={currentInstruction.blisterType} 
                                          onChange={e => updateCurrentField('blisterType', e.target.value)}
                                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                                      >
                                          <option>By Ratio</option>
                                          <option>By Size</option>
                                          <option>By Artwork</option>
                                      </select>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="text-[10px] font-bold text-gray-500 uppercase block">Pcs Per Blister</label>
                                          <input 
                                              type="number" 
                                              value={currentInstruction.pcsPerBlister} 
                                              onChange={e => updateCurrentField('pcsPerBlister', e.target.value)}
                                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                          />
                                      </div>
                                      <div>
                                          <label className="text-[10px] font-bold text-gray-500 uppercase block">Blisters/Carton</label>
                                          <input 
                                              type="number" 
                                              value={currentInstruction.blisterPerCarton} 
                                              onChange={e => updateCurrentField('blisterPerCarton', e.target.value)}
                                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                                          />
                                      </div>
                                  </div>
                              </div>
                          )}

                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Polybag Spec</label>
                              <input 
                                  type="text" 
                                  value={currentInstruction.polybagSpec} 
                                  onChange={e => updateCurrentField('polybagSpec', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                  placeholder="e.g. Self-adhesive with Warning"
                              />
                          </div>

                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tag Placement</label>
                              <input 
                                  type="text" 
                                  value={currentInstruction.tagPlacement} 
                                  onChange={e => updateCurrentField('tagPlacement', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                  placeholder="e.g. Back pocket"
                              />
                          </div>

                          <div className="border-t border-gray-100 pt-4 space-y-4">
                              <h4 className="text-xs font-bold text-gray-600 uppercase">Carton Details</h4>
                              
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Pcs / Carton</label>
                                      <input 
                                          type="number" 
                                          value={currentInstruction.maxPiecesPerCarton} 
                                          onChange={e => updateCurrentField('maxPiecesPerCarton', e.target.value)}
                                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                      />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Carton Size (LxWxH)</label>
                                      <input 
                                          type="text" 
                                          value={currentInstruction.cartonSize} 
                                          onChange={e => updateCurrentField('cartonSize', e.target.value)}
                                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                          placeholder="60x40x30 cm"
                                      />
                                  </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                  <div>
                                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Max Wt</label>
                                      <input 
                                          type="number" 
                                          value={currentInstruction.maxCartonWeightAllowed} 
                                          onChange={e => updateCurrentField('maxCartonWeightAllowed', e.target.value)}
                                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
                                          placeholder="kg"
                                      />
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Net Wt</label>
                                      <input 
                                          type="number" 
                                          value={currentInstruction.cartonNetWeight} 
                                          onChange={e => updateCurrentField('cartonNetWeight', e.target.value)}
                                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
                                          placeholder="kg"
                                      />
                                  </div>
                                  <div>
                                      <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Gross Wt</label>
                                      <input 
                                          type="number" 
                                          value={currentInstruction.cartonGrossWeight} 
                                          onChange={e => updateCurrentField('cartonGrossWeight', e.target.value)}
                                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
                                          placeholder="kg"
                                      />
                                  </div>
                              </div>

                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Carton Markings</label>
                                  <textarea 
                                      rows={2}
                                      value={currentInstruction.cartonMarkings} 
                                      onChange={e => updateCurrentField('cartonMarkings', e.target.value)}
                                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none"
                                      placeholder="Side marks, Main marks..."
                                  />
                              </div>

                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Packing notes</label>
                                  <textarea 
                                      rows={2}
                                      value={currentInstruction.packingNotes} 
                                      onChange={e => updateCurrentField('packingNotes', e.target.value)}
                                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none"
                                      placeholder="Special instructions..."
                                  />
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* RIGHT: ALLOCATION WIZARD */}
                  <div className="flex-1 flex flex-col bg-gray-50">
                      <div className="p-6 pb-4 border-b border-gray-200 bg-white">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <h4 className="text-sm font-bold text-gray-700">Allocation Strategy</h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                      Total for this model: <span className="text-blue-600 font-bold ml-1">{currentAllocationTotal.toLocaleString()} pcs</span>
                                  </p>
                              </div>
                              <button 
                                  onClick={handleSaveInstruction}
                                  disabled={currentAllocationTotal === 0}
                                  className="px-6 py-2 bg-[#37352F] text-white text-sm font-medium rounded hover:bg-black transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                              >
                                  <CheckCircle2 size={16} /> Save Model
                              </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <button 
                                onClick={() => setAllocationMode('Generic')}
                                className={`p-3 rounded-lg border text-left transition-all ${allocationMode === 'Generic' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                              >
                                <span className="block font-bold text-[10px] uppercase mb-1 text-gray-500">Auto</span>
                                <div className="text-sm font-bold text-gray-800">Remaining</div>
                              </button>

                              <button 
                                onClick={() => setAllocationMode('ByColor')}
                                className={`p-3 rounded-lg border text-left transition-all ${allocationMode === 'ByColor' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                              >
                                <span className="block font-bold text-[10px] uppercase mb-1 text-gray-500">Filter</span>
                                <div className="text-sm font-bold text-gray-800 flex items-center gap-1"><Palette size={14}/> By Color</div>
                              </button>

                              <button 
                                onClick={() => setAllocationMode('BySizeGroup')}
                                className={`p-3 rounded-lg border text-left transition-all ${allocationMode === 'BySizeGroup' ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                              >
                                <span className="block font-bold text-[10px] uppercase mb-1 text-gray-500">Filter</span>
                                <div className="text-sm font-bold text-gray-800 flex items-center gap-1"><Ruler size={14}/> By Group</div>
                              </button>

                              <button 
                                onClick={() => setAllocationMode('Manual')}
                                className={`p-3 rounded-lg border text-left transition-all ${allocationMode === 'Manual' ? 'bg-gray-100 border-gray-400 ring-1 ring-gray-400' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                              >
                                <span className="block font-bold text-[10px] uppercase mb-1 text-gray-500">Custom</span>
                                <div className="text-sm font-bold text-gray-800 flex items-center gap-1"><Edit2 size={14}/> Manual</div>
                              </button>
                          </div>
                      </div>

                      <div className="flex-1 overflow-y-auto px-6 py-6">
                          
                          {allocationMode === 'Generic' && (
                              <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 flex flex-col items-center justify-center text-center h-full">
                                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                                      <CheckCircle2 size={24} />
                                  </div>
                                  <h4 className="text-lg font-bold text-blue-900">Auto-Allocating {currentAllocationTotal.toLocaleString()} Units</h4>
                                  <p className="text-sm text-blue-700 max-w-sm mt-2">
                                      This model will capture every remaining unit not yet assigned to another packing instruction.
                                  </p>
                              </div>
                          )}

                          {allocationMode === 'ByColor' && (
                              <div className="space-y-3">
                                  <label className="text-xs font-bold text-gray-500 uppercase">Select Colors</label>
                                  <div className="space-y-2">
                                      {sizeGroups.flatMap(g => g.colors).filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i).map(color => {
                                          let remainingForColor = 0;
                                          Object.entries(availableMatrix).forEach(([key, qty]) => {
                                              if (key.startsWith(`${color.id}-`)) remainingForColor += Number(qty);
                                          });

                                          const isSelected = selectedScopeIds.has(color.id);
                                          
                                          return (
                                              <div 
                                                  key={color.id}
                                                  onClick={() => toggleScope(color.id)}
                                                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                                                      ${isSelected ? 'bg-purple-50 border-purple-500 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                              >
                                                  <div className="flex items-center gap-3">
                                                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                                                          {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                                      </div>
                                                      <span className="font-medium text-sm text-gray-700">{color.name}</span>
                                                  </div>
                                                  <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-gray-100 text-gray-500">
                                                      {remainingForColor} avail
                                                  </span>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          )}

                          {allocationMode === 'BySizeGroup' && (
                              <div className="space-y-3">
                                  <label className="text-xs font-bold text-gray-500 uppercase">Select Size Groups</label>
                                  <div className="space-y-2">
                                      {sizeGroups.map(group => {
                                          let remainingForGroup = 0;
                                          group.colors.forEach(c => group.sizes.forEach(s => {
                                              const qty = Number(availableMatrix[`${c.id}-${s}`] || 0);
                                              remainingForGroup += qty;
                                          }));

                                          const isSelected = selectedScopeIds.has(group.id);

                                          return (
                                              <div 
                                                  key={group.id}
                                                  onClick={() => toggleScope(group.id)}
                                                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                                                      ${isSelected ? 'bg-orange-50 border-orange-500 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                              >
                                                  <div className="flex items-center gap-3">
                                                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-orange-600 border-orange-600' : 'border-gray-300'}`}>
                                                          {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                                      </div>
                                                      <div>
                                                          <span className="font-medium text-sm text-gray-700 block">{group.groupName}</span>
                                                          <span className="text-[10px] text-gray-400">{group.sizes.join(', ')}</span>
                                                      </div>
                                                  </div>
                                                  <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-gray-100 text-gray-500">
                                                      {remainingForGroup} avail
                                                  </span>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          )}

                          {allocationMode === 'Manual' && (
                              <div className="space-y-6">
                                  {sizeGroups.map(group => (
                                      <div key={group.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-600 uppercase">
                                              {group.groupName}
                                          </div>
                                          <table className="w-full text-center text-sm">
                                              <thead>
                                                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                                                      <th className="p-2 text-left w-32 font-medium">Color</th>
                                                      {group.sizes.map(size => <th key={size} className="p-2 font-medium">{size}</th>)}
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-50">
                                                  {group.colors.map(color => (
                                                      <tr key={color.id}>
                                                          <td className="p-2 text-left text-xs font-bold text-gray-700 border-r border-gray-50 bg-gray-50/30">
                                                              {color.name}
                                                          </td>
                                                          {group.sizes.map(size => {
                                                              const key = `${color.id}-${size}`;
                                                              const available = availableMatrix[key] || 0;
                                                              const current = currentInstruction.allocation[key] || 0;
                                                              const isAssigned = current > 0;

                                                              return (
                                                                  <td key={size} className="p-1">
                                                                      <input 
                                                                          type="number" 
                                                                          min="0"
                                                                          max={available + (isEditing ? current : 0)} 
                                                                          value={current === 0 ? '' : current}
                                                                          onChange={(e) => handleManualAllocationChange(key, e.target.value)}
                                                                          placeholder={available > 0 ? '0' : '-'}
                                                                          disabled={available === 0 && current === 0}
                                                                          className={`w-full text-center border rounded py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500
                                                                              ${isAssigned ? 'border-blue-500 bg-blue-50 font-bold text-blue-700' : 'border-gray-200'}
                                                                              ${available === 0 && !isAssigned ? 'bg-gray-50 placeholder:text-gray-200' : ''}`}
                                                                      />
                                                                  </td>
                                                              );
                                                          })}
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      </div>
                                  ))}
                              </div>
                          )}

                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
