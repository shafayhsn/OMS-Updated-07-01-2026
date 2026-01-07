import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  X, Loader2, AlertCircle, CheckCircle2, Save, Trash2, Lock, 
  ChevronRight, ChevronLeft, Info, Layers, Scissors, Droplets, 
  Palette, Package, Calendar, FileText, Check, Ban, User, Printer, Plus,
  ListChecks, ClipboardList, Ruler, Image as ImageIcon, Tag, Bookmark, Search, ArrowRight, ShoppingBag
} from 'lucide-react';
import { GeneralInfoTab } from './GeneralInfoTab';
import { FittingTab } from './FittingTab';
import { SamplingTab } from './SamplingTab';
import { EmbellishmentTab } from './EmbellishmentTab';
import { WashingTab } from './WashingTab';
import { FinishingTab } from './FinishingTab';
import { BOMTab } from './BOMTab';
import { OrderSummaryView } from './OrderSummaryView';
import { 
  NewOrderState, POData, ColorRow, SizeGroup, Buyer, Supplier, MasterBOMItem, SystemUser, BOMPreset, BOMItem 
} from '../types';
import { formatAppDate } from '../constants';

// --- PRESET SELECTOR MODAL (Moved from BOMTab) ---
const PresetSelectorModal = ({ 
    isOpen, 
    onClose, 
    presets, 
    onSelect 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    presets: BOMPreset[]; 
    onSelect: (preset: BOMPreset) => void; 
}) => {
    const [search, setSearch] = useState('');
    const filtered = presets.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.buyerName.toLowerCase().includes(search.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-150 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-[#37352F]">Import Brand Preset</h2>
                        <p className="text-xs text-gray-500">Populate BOM with pre-defined buyer standards.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={18}/></button>
                </div>
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Filter presets..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="space-y-1">
                        {filtered.map(p => (
                            <button 
                                key={p.id}
                                onClick={() => onSelect(p)}
                                className="w-full text-left p-4 rounded-lg hover:bg-blue-50 group transition-all border border-transparent hover:border-blue-100"
                            >
                                <div className="font-bold text-gray-800 flex items-center justify-between">
                                    {p.name}
                                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                                </div>
                                <div className="text-xs text-blue-600 font-medium mt-1 uppercase tracking-tight">{p.buyerName}</div>
                                <div className="text-[10px] text-gray-400 mt-2">{p.items.length} items linked</div>
                            </button>
                        ))}
                        {presets.length === 0 && (
                            <div className="p-10 text-center text-gray-400 italic text-sm">
                                No presets defined in BOM Master Library.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Initial State Configuration
const INITIAL_STATE: NewOrderState = {
  generalInfo: {
    formData: {
      jobNumber: '',
      buyerName: "",
      merchandiserName: "",
      factoryRef: '',
      styleNumber: '',
      productID: '',
      poNumber: '',
      poDate: '',
      shipDate: '',
      plannedDate: '',
      shipMode: 'Sea',
      description: '',
      incoterms: ''
    },
    colors: [],
    sizeGroups: [],
    styleImage: null
  },
  fitting: [], 
  sampling: [],
  embellishments: [],
  washing: {},
  finishing: {
    finalInspectionStatus: 'Pending',
    packingList: [] 
  },
  criticalPath: {
    capacity: {
      totalOrderQty: 0,
      fabricLeadTime: 0,
      trimsLeadTime: 0,
      cuttingOutput: 0,
      sewingLines: 0,
      sewingOutputPerLine: 0,
      finishingOutput: 0,
    },
    schedule: []
  },
  bom: [],
  bomStatus: 'Draft',
  planningNotes: '',
  skippedStages: []
};

const STEPS = [
  { id: 'General Info', label: 'General Info', canSkip: false },
  { id: 'BOM', label: 'BOM', canSkip: false },
  { id: 'Sampling', label: 'Sampling', canSkip: true },
  { id: 'Fitting', label: 'Fitting', canSkip: true },
  { id: 'Washing', label: 'Washing', canSkip: true },
  { id: 'Embellishment', label: 'Embellishment', canSkip: true },
  { id: 'Finishing', label: 'Finishing', canSkip: true },
  { id: 'New Tab', label: 'Finalize', canSkip: false },
];

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (state: NewOrderState, shouldClose?: boolean) => void;
  onDelete: (orderId: string) => void;
  initialData: NewOrderState | null;
  availableBuyers: Buyer[];
  availableSuppliers: Supplier[];
  masterBOMItems: MasterBOMItem[];
  bomPresets: BOMPreset[];
  currentUser: SystemUser;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ 
  isOpen, onClose, onSave, onDelete, initialData, availableBuyers, availableSuppliers, masterBOMItems, bomPresets, currentUser
}) => {
  // Navigation State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Initialize state once on mount
  const [newOrderData, setNewOrderData] = useState<NewOrderState>(() => {
    if (initialData) {
      const migratedData = { ...initialData };
      if (!migratedData.finishing.packingList) {
          const legacy = migratedData.finishing as any;
          migratedData.finishing.packingList = [];
          if (legacy.foldingType || legacy.polybagSpec) {
             migratedData.finishing.packingList.push({
                 id: 'legacy-pack',
                 name: 'Standard Packing',
                 method: legacy.foldingType || 'Flat Pack',
                 polybagSpec: legacy.polybagSpec || '',
                 cartonMarkings: legacy.cartonMarkings || '',
                 maxPiecesPerCarton: legacy.maxPiecesPerCarton || '',
                 tagPlacement: legacy.tagPlacement || '',
                 assortmentMethod: legacy.originalAssortmentMethod || 'Solid Size',
                 packagingSpecSheetRef: legacy.packagingSpecSheetRef,
                 foldingInstructions: legacy.foldingInstructions || '',
                 allocation: {}, 
                 totalAllocated: 0,
                 cartonSize: '',
                 maxCartonWeightAllowed: '',
                 cartonNetWeight: '',
                 cartonGrossWeight: ''
             });
          }
      }
      return migratedData;
    }
    const yearShort = new Date().getFullYear().toString().slice(-2);
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const randomId = `NZ-${randomSeq}-${yearShort}`;
    
    return {
        ...INITIAL_STATE,
        generalInfo: {
            ...INITIAL_STATE.generalInfo,
            formData: {
                ...INITIAL_STATE.generalInfo.formData,
                jobNumber: randomId
            }
        }
    };
  });

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [hasDraftBeenSaved, setHasDraftBeenSaved] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Preset Modal State (Lifted from BOMTab)
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  // --- Auto-Save Refs & Effect ---
  const orderDataRef = useRef(newOrderData);
  const onSaveRef = useRef(onSave);
  const lastAutoSavedDataRef = useRef<string>('');

  useEffect(() => {
    orderDataRef.current = newOrderData;
  }, [newOrderData]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSubmitting && hasDraftBeenSaved) {
        const currentData = orderDataRef.current;
        const currentString = JSON.stringify(currentData);
        if (currentString !== lastAutoSavedDataRef.current) {
          setIsDraftSaving(true);
          onSaveRef.current(currentData, false);
          lastAutoSavedDataRef.current = currentString;
          setLastSaved(new Date().toLocaleTimeString());
          setTimeout(() => setIsDraftSaving(false), 1000);
        }
      }
    }, 30000); // Auto-save every 30s
    return () => clearInterval(interval);
  }, [isSubmitting, hasDraftBeenSaved]);

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleFinalSave = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSave(newOrderData, true);
      setSubmitSuccess(true);
      setHasDraftBeenSaved(true);
    } catch (e) {
      setSubmitError("Failed to save order. Please check your network.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
      const stepId = STEPS[currentStepIndex].id;
      setNewOrderData(prev => ({
          ...prev,
          skippedStages: [...prev.skippedStages, stepId]
      }));
      handleNext();
  };

  const handleUnskip = (stepId: string) => {
      setNewOrderData(prev => ({
          ...prev,
          skippedStages: prev.skippedStages.filter(s => s !== stepId)
      }));
  };

  const confirmDelete = () => {
    if (deletePassword === 'admin') {
        onDelete(newOrderData.generalInfo.formData.jobNumber);
        setIsDeleteModalOpen(false);
    } else {
        setDeleteError('Incorrect password. Try "admin"');
    }
  };

  const renderStep = () => {
    const step = STEPS[currentStepIndex];
    switch (step.id) {
      case 'General Info':
        return (
          <GeneralInfoTab 
            colors={newOrderData.generalInfo.colors}
            setColors={(val) => {
                const nextColors = typeof val === 'function' ? val(newOrderData.generalInfo.colors) : val;
                setNewOrderData(prev => ({ ...prev, generalInfo: { ...prev.generalInfo, colors: nextColors }}));
            }}
            formData={newOrderData.generalInfo.formData}
            setFormData={(val) => {
                const nextForm = typeof val === 'function' ? val(newOrderData.generalInfo.formData) : val;
                setNewOrderData(prev => ({ ...prev, generalInfo: { ...prev.generalInfo, formData: nextForm }}));
            }}
            sizeGroups={newOrderData.generalInfo.sizeGroups}
            onSizeGroupsChange={(groups) => setNewOrderData(prev => ({ ...prev, generalInfo: { ...prev.generalInfo, sizeGroups: groups }}))}
            availableBuyers={availableBuyers}
            styleImage={newOrderData.generalInfo.styleImage}
            setStyleImage={(img) => setNewOrderData(prev => ({ ...prev, generalInfo: { ...prev.generalInfo, styleImage: img }}))}
          />
        );
      case 'BOM':
        // Calculate breakdown data for BOM
        const orderBreakdownData = {
            totalPOQuantity: 0,
            colorQuantities: {} as Record<string, number>,
            sizeQuantities: {} as Record<string, number>
        };
        newOrderData.generalInfo.sizeGroups.forEach(group => {
            Object.entries(group.breakdown).forEach(([colorId, sizeMap]) => {
                const colorName = group.colors.find(c => c.id === colorId)?.name || 'Unknown';
                Object.entries(sizeMap).forEach(([size, qtyStr]) => {
                    const qty = parseInt(qtyStr) || 0;
                    orderBreakdownData.totalPOQuantity += qty;
                    orderBreakdownData.colorQuantities[colorName] = (orderBreakdownData.colorQuantities[colorName] || 0) + qty;
                    orderBreakdownData.sizeQuantities[size] = (orderBreakdownData.sizeQuantities[size] || 0) + qty;
                });
            });
        });

        return (
          <BOMTab 
            data={newOrderData.bom}
            onUpdate={(bom) => setNewOrderData(prev => ({ ...prev, bom }))}
            sizeGroups={newOrderData.generalInfo.sizeGroups}
            orderBreakdownData={orderBreakdownData}
            availableSuppliers={availableSuppliers}
            bomStatus={newOrderData.bomStatus}
            onReleaseBOM={() => setNewOrderData(prev => ({ ...prev, bomStatus: 'Released' }))}
            masterItems={masterBOMItems}
            bomPresets={bomPresets}
            formData={newOrderData.generalInfo.formData}
          />
        );
      case 'Sampling':
        return (
          <SamplingTab 
            data={newOrderData.sampling}
            onUpdate={(sampling) => setNewOrderData(prev => ({ ...prev, sampling }))}
            colors={newOrderData.generalInfo.colors}
            bom={newOrderData.bom}
            washing={newOrderData.washing}
            sizeGroups={newOrderData.generalInfo.sizeGroups}
            factoryRef={newOrderData.generalInfo.formData.factoryRef}
            styleNo={newOrderData.generalInfo.formData.styleNumber}
            styleImage={newOrderData.generalInfo.styleImage}
            fitting={newOrderData.fitting}
            embellishments={newOrderData.embellishments}
          />
        );
      case 'Fitting':
        return (
          <FittingTab 
            data={newOrderData.fitting}
            onUpdate={(fitting) => setNewOrderData(prev => ({ ...prev, fitting }))}
            sizeGroups={newOrderData.generalInfo.sizeGroups}
          />
        );
      case 'Washing':
        return (
          <WashingTab 
            colors={newOrderData.generalInfo.colors}
            data={newOrderData.washing}
            onUpdate={(washing) => setNewOrderData(prev => ({ ...prev, washing }))}
          />
        );
      case 'Embellishment':
        return (
          <EmbellishmentTab 
            data={newOrderData.embellishments}
            onUpdate={(embellishments) => setNewOrderData(prev => ({ ...prev, embellishments }))}
            sizeGroups={newOrderData.generalInfo.sizeGroups}
          />
        );
      case 'Finishing':
        return (
          <FinishingTab 
            data={newOrderData.finishing}
            onUpdate={(finishing) => setNewOrderData(prev => ({ ...prev, finishing }))}
            sizeGroups={newOrderData.generalInfo.sizeGroups}
          />
        );
      case 'New Tab':
        return (
          <OrderSummaryView 
            orderData={newOrderData}
          />
        );
      default:
        return null;
    }
  };

  const isCurrentStepSkipped = newOrderData.skippedStages.includes(STEPS[currentStepIndex].id);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#F7F7F5] w-full max-w-[95vw] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border border-gray-200">
        
        {/* Header */}
        <div className="bg-white px-8 py-5 border-b border-gray-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#1a1a1a] text-white rounded-xl flex items-center justify-center shadow-lg">
                <ShoppingBag size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#37352F]">
                {initialData ? 'Modify Production Order' : 'Setup New Production Order'}
              </h2>
              <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {newOrderData.generalInfo.formData.jobNumber || 'NZ-PENDING'}
                  </span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Version 2.4.0</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lastSaved && (
                <div className="text-right hidden md:block">
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Draft Synchronized</div>
                    <div className="text-[11px] font-bold text-green-600">{lastSaved}</div>
                </div>
            )}
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              title="Discard Order"
            >
              <Trash2 size={22} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2.5 text-gray-400 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={28} />
            </button>
          </div>
        </div>

        {/* Step Progress & Navigation */}
        <div className="bg-white px-8 py-0 border-b border-gray-200 shrink-0">
           <div className="flex items-center justify-between overflow-x-auto no-scrollbar">
              <div className="flex">
                  {STEPS.map((step, idx) => {
                      const isActive = idx === currentStepIndex;
                      const isPast = idx < currentStepIndex;
                      const isSkipped = newOrderData.skippedStages.includes(step.id);
                      
                      return (
                          <button 
                            key={step.id}
                            onClick={() => setCurrentStepIndex(idx)}
                            className={`px-5 py-4 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2 border-b-2
                                ${isActive ? 'text-black border-black bg-gray-50/50' : isPast ? 'text-blue-600 border-transparent' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                          >
                            {isPast && <CheckCircle2 size={14} />}
                            {isSkipped && <Ban size={14} className="text-red-400" />}
                            {step.label}
                          </button>
                      );
                  })}
              </div>
              <div className="flex items-center gap-2 py-2">
                 <button 
                    onClick={() => setIsPresetModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase border border-blue-100 hover:bg-blue-100 transition-all"
                 >
                    <Bookmark size={14} /> Brand Library
                 </button>
              </div>
           </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-white">
           {isCurrentStepSkipped ? (
               <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-6">
                      <Ban size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">This stage is skipped.</h3>
                  <p className="text-gray-500 mt-2 max-w-sm">Information for this section will not be included in the technical reports for this order.</p>
                  <button 
                    onClick={() => handleUnskip(STEPS[currentStepIndex].id)}
                    className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
                  >
                    Restore Stage
                  </button>
               </div>
           ) : renderStep()}
        </div>

        {/* Footer Actions */}
        <div className="px-10 py-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex gap-3">
                <button 
                    onClick={handleBack}
                    disabled={currentStepIndex === 0}
                    className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                    <ChevronLeft size={20} className="inline mr-1" /> Previous
                </button>
            </div>

            <div className="flex items-center gap-4">
                {STEPS[currentStepIndex].canSkip && !isCurrentStepSkipped && (
                    <button 
                        onClick={handleSkip}
                        className="px-6 py-2.5 text-sm font-bold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                        Skip this stage
                    </button>
                )}

                {currentStepIndex === STEPS.length - 1 ? (
                    <button 
                        onClick={handleFinalSave}
                        disabled={isSubmitting}
                        className="px-12 py-2.5 bg-green-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-green-700 transition-all shadow-xl shadow-green-100 flex items-center gap-3"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        Confirm & Release PO
                    </button>
                ) : (
                    <button 
                        onClick={handleNext}
                        className="px-12 py-2.5 bg-[#1a1a1a] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center gap-3"
                    >
                        Continue <ChevronRight size={20} />
                    </button>
                )}
            </div>
        </div>

        {/* Delete Confirmation Overlay */}
        {isDeleteModalOpen && (
            <div className="absolute inset-0 z-[200] bg-white/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <Lock size={32} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Authorize Discard</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">Permanently deleting this draft is restricted. Please provide administrative credentials to proceed.</p>
                    </div>
                    <div className="space-y-4">
                        <input 
                            type="password" 
                            placeholder="Password" 
                            value={deletePassword}
                            onChange={e => setDeletePassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && confirmDelete()}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center font-mono text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-gray-50"
                        />
                        {deleteError && <p className="text-xs font-bold text-red-500 bg-red-50 py-2 rounded-lg">{deleteError}</p>}
                    </div>
                    <div className="flex flex-col gap-3">
                        <button onClick={confirmDelete} className="w-full py-3.5 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-700 shadow-lg shadow-red-100 transition-all">Destroy Draft</button>
                        <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-3.5 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                    </div>
                </div>
            </div>
        )}

        <PresetSelectorModal 
            isOpen={isPresetModalOpen}
            onClose={() => setIsPresetModalOpen(false)}
            presets={bomPresets}
            onSelect={(preset) => {
                const newItems: BOMItem[] = preset.items.map(m => ({
                    id: Math.random().toString(36).substr(2, 9),
                    processGroup: m.type === 'Fabric' ? 'Fabric' : (m.category === 'Stitching Trims' ? 'Stitching Trims' : 'Packing Trims'),
                    componentName: m.type === 'Fabric' ? `${m.shade?.toUpperCase()} - ${m.content} - ${m.weight}${m.category === 'Denim' ? ' Oz' : ' GSM'}` : m.itemName || m.category || '',
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
                setNewOrderData(prev => ({ ...prev, bom: [...prev.bom, ...newItems] }));
                setIsPresetModalOpen(false);
            }}
        />

      </div>
    </div>
  );
};

const Ban = ({ size, className }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>
  </svg>
);
