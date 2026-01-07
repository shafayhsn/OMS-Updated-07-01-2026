import React, { useMemo, useState, useEffect } from 'react';
import { 
  Search, Scissors, X, Printer,
  ChevronRight, RefreshCw, Shirt,
  Info, List, FileSpreadsheet,
  FlaskConical, CheckCircle2, Eye,
  Image as ImageIcon, Plus, Upload, Trash2, Tag, Layers, Palette,
  Ruler, FileText
} from 'lucide-react';
import { JobBatch, DevelopmentSample, Parcel, SampleRow, Buyer, CompanyDetails, BOMItem, EmbellishmentRecord } from '../types';
import { formatAppDate } from '../constants';
import { SampleSummaryView } from './SampleSummaryView';

// --- Types & Interfaces ---

const WIP_STAGES = [
    'Not Started',
    'Pattern Making',
    'Sample Cut',
    'Stitching',
    'Washing',
    'Finishing',
    'Ready for Dispatch'
] as const;

interface UnifiedSample {
    id: string;
    samId: string;
    source: 'Job' | 'Development';
    parentRef: string; 
    buyer: string;
    style: string;
    type: string;
    fabric: string;
    shade: string;
    qty: string;
    deadline: string;
    status: string;
    currentStage: string;
    lastUpdated?: string;
    originalData: any; 
    sentOn?: string;
    deliveredOn?: string;
}

interface SamplingDashboardProps {
  jobs?: JobBatch[];
  onUpdateJob?: (job: JobBatch) => void; 
  developmentSamples?: DevelopmentSample[];
  onUpdateDevSample?: (sample: DevelopmentSample) => void;
  onAddDevSample?: (sample: DevelopmentSample) => void;
  parcels: Parcel[];
  availableBuyers?: Buyer[];
  companyDetails?: CompanyDetails;
}

const SAMPLE_TYPES = [
    "Development Sample",
    "Proto Sample",
    "Fit Sample",
    "Salesman Sample (SMS)",
    "Size Set",
    "Pre-Production (PP)",
    "Top of Production (TOP)",
    "Photo Sample",
    "Shipment Sample"
];

// --- NEW DEVELOPMENT SAMPLE MODAL COMPONENT ---

const NewDevSampleModal = ({ 
    isOpen, 
    onClose, 
    buyers, 
    onSave,
    nextSamNumber
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    buyers: Buyer[], 
    onSave: (sample: DevelopmentSample) => void,
    nextSamNumber: string
}) => {
    const [formData, setFormData] = useState<Partial<DevelopmentSample>>({
        samNumber: nextSamNumber,
        buyer: '',
        styleNo: '',
        description: '',
        wash: '',
        shade: '',
        quantity: '1',
        deadline: '',
        baseSize: 'M',
        fitName: '',
        type: 'Development Sample', // Default changed to Development Sample
        status: 'Pending',
        currentStage: 'Not Started',
        isTestingRequired: false,
        bom: [],
        embellishments: []
    });

    const [styleImage, setStyleImage] = useState<string | null>(null);
    const [specsFile, setSpecsFile] = useState<string | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => setStyleImage(ev.target?.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const addBOMItem = (group: string) => {
        const newItem: BOMItem = {
            id: `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            processGroup: group,
            componentName: '',
            itemDetail: '',
            supplierRef: '',
            vendor: '',
            sourcingStatus: 'Pending',
            leadTimeDays: 0,
            usageRule: 'Generic',
            usageData: { 'generic': 0 },
            wastagePercent: 0,
            isTestingRequired: false,
            uom: group === 'Fabric' ? 'Meters' : 'Pieces',
            unitsPerPack: 1,
            packingUnit: 'Pack'
        };
        setFormData(prev => ({ ...prev, bom: [...(prev.bom || []), newItem] }));
    };

    const updateBOMItem = (id: string, field: keyof BOMItem, value: any) => {
        setFormData(prev => ({
            ...prev,
            bom: (prev.bom || []).map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const removeBOMItem = (id: string) => {
        setFormData(prev => ({
            ...prev,
            bom: (prev.bom || []).filter(item => item.id !== id)
        }));
    };

    const handleSave = () => {
        if (!formData.buyer || !formData.styleNo) {
            alert("Buyer and Style Number are required.");
            return;
        }
        const finalSample: DevelopmentSample = {
            ...formData as DevelopmentSample,
            id: `dev-${Date.now()}`,
            imageUrl: styleImage || undefined,
            specsFile: specsFile || undefined,
            lastUpdated: new Date().toISOString(),
            fabric: formData.bom?.find(i => i.processGroup === 'Fabric')?.componentName || 'TBD',
            threadColor: formData.bom?.find(i => i.componentName.toLowerCase().includes('thread'))?.componentName || 'Match',
            zipperColor: formData.bom?.find(i => i.componentName.toLowerCase().includes('zipper'))?.componentName || 'Match',
            lining: formData.bom?.find(i => i.componentName.toLowerCase().includes('lining'))?.componentName || '-'
        };
        onSave(finalSample);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-6xl h-[92vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-8 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#1a1a1a] text-white rounded-xl flex items-center justify-center shadow-lg">
                            <Plus size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#37352F]">New Development Sample Setup</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Create R&D samples for library or concept development.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Sample Number</div>
                            <div className="text-lg font-mono font-black text-blue-600 leading-none mt-1">{formData.samNumber}</div>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors ml-4"><X size={24}/></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar space-y-10">
                    
                    {/* SECTION 1: GENERAL INFO */}
                    <div className="flex flex-col lg:flex-row gap-10">
                        {/* Image Upload Area */}
                        <div className="w-full lg:w-72 shrink-0 space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">Article Visual</label>
                            <div className={`relative h-56 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all group overflow-hidden
                                ${styleImage ? 'border-green-200 bg-green-50/20' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-indigo-300'}`}>
                                {styleImage ? (
                                    <div className="w-full h-full p-2 relative">
                                        <img src={styleImage} alt="Article" className="w-full h-full object-contain rounded-xl" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <button onClick={() => setStyleImage(null)} className="p-2 bg-white rounded-full text-red-600 shadow-sm"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <ImageIcon size={32} className="text-gray-300 mb-2" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase">Upload Reference</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Buyer / Client Account *</label>
                                <select 
                                    value={formData.buyer} 
                                    onChange={e => setFormData({...formData, buyer: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:border-indigo-500"
                                >
                                    <option value="">Select Buyer...</option>
                                    {buyers.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Style Number *</label>
                                <input 
                                    type="text" 
                                    value={formData.styleNo} 
                                    onChange={e => setFormData({...formData, styleNo: e.target.value})}
                                    placeholder="e.g. RND-001"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold outline-none"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sample Type</label>
                                <select 
                                    value={formData.type} 
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:border-indigo-500 font-bold"
                                >
                                    {SAMPLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Wash / Color</label>
                                <input 
                                    type="text" 
                                    value={formData.shade} 
                                    onChange={e => setFormData({...formData, shade: e.target.value})}
                                    placeholder="Indigo / Black etc."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none font-medium text-blue-600 uppercase"
                                />
                            </div>
                            <div className="md:col-span-3 space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Article Description</label>
                                <input 
                                    type="text" 
                                    value={formData.description} 
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    placeholder="Enter item description..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</label>
                                <input 
                                    type="number" 
                                    value={formData.quantity} 
                                    onChange={e => setFormData({...formData, quantity: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Date</label>
                                <input 
                                    type="date" 
                                    value={formData.deadline} 
                                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: FITTING & SPECS */}
                    <div className="space-y-4 pt-6 border-t border-gray-100">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                           <Ruler size={16} /> Fit & Measurement Setup
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Base Size</label>
                                <input type="text" value={formData.baseSize} onChange={e => setFormData({...formData, baseSize: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Fit Name</label>
                                <input type="text" value={formData.fitName} onChange={e => setFormData({...formData, fitName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Slim, Regular..." />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Upload Specs (PDF/XLS)</label>
                                <div className="relative h-10 border border-gray-300 rounded-lg bg-gray-50 hover:bg-white transition-colors flex items-center px-3 cursor-pointer">
                                    <FileText size={16} className="text-gray-400 mr-2" />
                                    <span className="text-xs text-gray-500 truncate">{specsFile || "Click to upload specs..."}</span>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setSpecsFile(e.target.files?.[0]?.name || null)} />
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* SECTION 3: BILL OF MATERIALS (BOM) */}
                    <div className="space-y-4 pt-6 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Layers size={16} /> Bill of Materials (R&D)
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={() => addBOMItem('Fabric')} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase border border-blue-100">+ Fabric</button>
                                <button onClick={() => addBOMItem('Stitching Trims')} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase border border-blue-100">+ Stitching Trim</button>
                                <button onClick={() => addBOMItem('Packing Trims')} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase border border-blue-100">+ Packing Trim</button>
                            </div>
                        </div>
                        
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 font-black text-gray-400 uppercase tracking-tighter w-32">Section</th>
                                        <th className="px-4 py-3 font-black text-gray-400 uppercase tracking-tighter">Item Name / Material</th>
                                        <th className="px-4 py-3 font-black text-gray-400 uppercase tracking-tighter">Detail / Finish</th>
                                        <th className="px-4 py-3 font-black text-gray-400 uppercase tracking-tighter w-40">Supplier (R&D)</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(formData.bom || []).map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2 font-bold text-blue-600 uppercase text-[10px]">{item.processGroup}</td>
                                            <td className="px-2 py-2">
                                                <input value={item.componentName} onChange={e => updateBOMItem(item.id, 'componentName', e.target.value)} className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="e.g. 12oz Denim" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input value={item.itemDetail} onChange={e => updateBOMItem(item.id, 'itemDetail', e.target.value)} className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Specs..." />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input value={item.vendor} onChange={e => updateBOMItem(item.id, 'vendor', e.target.value)} className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 font-medium" placeholder="Source..." />
                                            </td>
                                            <td className="px-4 py-2">
                                                <button onClick={() => removeBOMItem(item.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(formData.bom || []).length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-300 italic font-medium">Click add above to start building the BOM.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SECTION 4: EMBELLISHMENTS */}
                    <div className="space-y-4 pt-6 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Palette size={16} /> Embellishments & Artwork
                            </h3>
                            <button onClick={() => {
                                const newEmb: EmbellishmentRecord = {
                                    id: `emb-${Date.now()}`,
                                    artworkFile: null,
                                    type: 'Screen Print',
                                    location: '',
                                    artworkId: '',
                                    usageRule: 'Generic',
                                    dimensionsData: {},
                                    colorInfo: '',
                                    status: 'Pending',
                                    approvalDate: '',
                                    instructions: '',
                                    isTestingRequired: false
                                };
                                setFormData(prev => ({ ...prev, embellishments: [...(prev.embellishments || []), newEmb] }));
                            }} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase border border-indigo-100">+ Add Artwork</button>
                        </div>
                        
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 font-black text-gray-400 uppercase tracking-tighter w-40">Type</th>
                                        <th className="px-4 py-3 font-black text-gray-400 uppercase tracking-tighter">Placement</th>
                                        <th className="px-4 py-3 font-black text-gray-400 uppercase tracking-tighter">Colors / Detail</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(formData.embellishments || []).map(emb => (
                                        <tr key={emb.id} className="hover:bg-gray-50">
                                            <td className="px-2 py-2">
                                                <select value={emb.type} onChange={e => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        embellishments: (prev.embellishments || []).map(item => item.id === emb.id ? { ...item, type: e.target.value } : item)
                                                    }));
                                                }} className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none font-bold">
                                                    <option>Screen Print</option>
                                                    <option>Embroidery</option>
                                                    <option>Heat Transfer</option>
                                                    <option>Applique</option>
                                                </select>
                                            </td>
                                            <td className="px-2 py-2">
                                                <input value={emb.location} onChange={e => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        embellishments: (prev.embellishments || []).map(item => item.id === emb.id ? { ...item, location: e.target.value } : item)
                                                    }));
                                                }} className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none" placeholder="e.g. Chest Left" />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input value={emb.colorInfo} onChange={e => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        embellishments: (prev.embellishments || []).map(item => item.id === emb.id ? { ...item, colorInfo: e.target.value } : item)
                                                    }));
                                                }} className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 outline-none" placeholder="Color codes..." />
                                            </td>
                                            <td className="px-4 py-2">
                                                <button onClick={() => setFormData(prev => ({ ...prev, embellishments: (prev.embellishments || []).filter(e => e.id !== emb.id) }))} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(formData.embellishments || []).length === 0 && (
                                        <tr><td colSpan={4} className="p-6 text-center text-gray-300 italic font-medium">No embellishments added.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                <div className="px-10 py-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                    <button 
                        onClick={handleSave}
                        className="px-12 py-2.5 bg-[#1a1a1a] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-xl shadow-gray-200"
                    >
                        Save R&D Sample
                    </button>
                </div>
            </div>
        </div>
    );
};

export const SamplingDashboard: React.FC<SamplingDashboardProps> = ({ 
    jobs = [], 
    onUpdateJob,
    developmentSamples = [],
    onUpdateDevSample,
    onAddDevSample,
    parcels,
    availableBuyers = []
}) => {
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Summary View State
  const [summarySample, setSummarySample] = useState<UnifiedSample | null>(null);

  // Modal for QC validation
  const [qcModalSample, setQcModalSample] = useState<UnifiedSample | null>(null);
  const [qcChecked, setQcChecked] = useState(false);

  // New Dev Sample Modal State
  const [isDevSampleModalOpen, setIsDevSampleModalOpen] = useState(false);

  // --- Data Consolidation ---
  const unifiedData: UnifiedSample[] = useMemo(() => {
    const list: UnifiedSample[] = [];
    const findParcelDates = (samNumber: string) => {
        const p = parcels.find(p => p.samples.some(s => s.samNumber === samNumber));
        return { sentOn: p?.sentDate, deliveredOn: p?.receivedDate };
    };
    jobs.forEach(job => {
        job.styles.forEach(style => {
            style.samplingDetails?.forEach(s => {
                const dates = findParcelDates(s.samNumber);
                list.push({
                    id: s.id, samId: s.samNumber, source: 'Job', parentRef: job.id, buyer: style.buyer, style: style.styleNo,
                    type: s.type, shade: s.shade, qty: s.quantity, fabric: s.fabric, deadline: s.deadline || 'TBD',
                    status: s.status, currentStage: s.currentStage || 'Not Started', lastUpdated: s.lastUpdated,
                    originalData: { ...s, parentJob: job, parentStyleId: style.id, factoryRef: style.factoryRef, parentStyle: style },
                    sentOn: dates.sentOn, deliveredOn: dates.deliveredOn
                });
            });
        });
    });
    developmentSamples.forEach(s => {
        const dates = findParcelDates(s.samNumber);
        list.push({
            id: s.id, samId: s.samNumber, source: 'Development', parentRef: 'R&D', buyer: s.buyer, style: s.styleNo,
            type: s.type, shade: s.shade, qty: s.quantity, fabric: s.fabric, deadline: s.deadline || 'TBD',
            status: s.status, currentStage: s.currentStage || 'Not Started', lastUpdated: s.lastUpdated, originalData: s,
            sentOn: dates.sentOn, deliveredOn: dates.deliveredOn
        });
    });
    return list.sort((a, b) => {
        const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return dateB - dateA;
    });
  }, [jobs, developmentSamples, parcels]);

  const wipSamples = useMemo(() => {
    return unifiedData.filter(s => {
        const isHistorical = ['Received', 'Closed-Revised', 'Closed-Approved'].includes(s.currentStage);
        if (isHistorical) return false;

        const matchesStage = selectedStageFilter === 'All' 
            ? s.currentStage !== 'Dispatched' 
            : s.currentStage === selectedStageFilter;
            
        const s_term = searchTerm.toLowerCase();
        const matchesSearch = (s.buyer?.toLowerCase() || '').includes(s_term) || 
                             (s.style?.toLowerCase() || '').includes(s_term) || 
                             (s.samId?.toLowerCase() || '').includes(s_term);
        return matchesStage && matchesSearch;
    });
  }, [unifiedData, searchTerm, selectedStageFilter]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { All: 0, Dispatched: 0 };
    WIP_STAGES.forEach(s => { counts[s] = 0; });
    unifiedData.forEach(s => {
        if (!['Received', 'Closed-Revised', 'Closed-Approved'].includes(s.currentStage)) {
            if (s.currentStage === 'Dispatched') {
                counts['Dispatched']++;
            } else {
                counts['All']++;
                if (counts[s.currentStage] !== undefined) {
                    counts[s.currentStage]++;
                }
            }
        }
    });
    return counts;
  }, [unifiedData]);

  const nextDevSamNumber = useMemo(() => {
      const devSamples = developmentSamples.filter(s => s.samNumber.startsWith('DEV-'));
      if (devSamples.length === 0) return 'DEV-001';
      const maxSerial = devSamples.reduce((max, s) => {
          const serial = parseInt(s.samNumber.split('-')[1]);
          return isNaN(serial) ? max : Math.max(max, serial);
      }, 0);
      return `DEV-${String(maxSerial + 1).padStart(3, '0')}`;
  }, [developmentSamples]);

  // --- Handlers ---
  const commitStageUpdate = (sample: UnifiedSample, nextStage: string, forceStatus?: string, meta?: any) => {
      const now = new Date();
      const timestamp = `${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      if (sample.source === 'Job') {
          const { parentJob, parentStyleId } = sample.originalData;
          const updatedStyles = parentJob.styles.map((style: any) => {
              if (style.id !== parentStyleId) return style;
              const updatedSampling = style.samplingDetails?.map((s: any) => 
                  s.id === sample.id ? { ...s, currentStage: nextStage, status: forceStatus || s.status, lastUpdated: timestamp, ...(meta || {}) } : s
              );
              return { ...style, samplingDetails: updatedSampling };
          });
          onUpdateJob?.({ ...parentJob, styles: updatedStyles });
      } else {
          onUpdateDevSample?.({ ...sample.originalData, currentStage: nextStage, status: forceStatus || sample.originalData.status, lastUpdated: timestamp, ...(meta || {}) });
      }
  };

  const handleStageSelect = (sample: UnifiedSample, stage: string) => {
      if (stage === 'Ready for Dispatch') {
          setQcModalSample(sample);
          setQcChecked(false);
      } else {
          commitStageUpdate(sample, stage);
      }
  };

  const handleQCPass = () => {
      if (qcModalSample && qcChecked) {
          commitStageUpdate(qcModalSample, 'Ready for Dispatch');
          setQcModalSample(null);
      }
  };

  if (summarySample) {
      return <SampleSummaryView sample={summarySample} onClose={() => setSummarySample(null)} />;
  }

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#37352F]">Sample Room Control</h1>
          <p className="text-sm text-gray-500 mt-1">Track development stages, production gates, and dispatch readiness.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
              onClick={() => setIsDevSampleModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1a1a1a] text-white rounded-lg hover:bg-black transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] font-bold text-sm whitespace-nowrap"
          >
              <Plus size={18} /> New Development Sample
          </button>
          <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search styles..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full outline-none focus:border-indigo-500 transition-all bg-white shadow-sm" 
              />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => setSelectedStageFilter('All')} 
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border shadow-sm
                        ${selectedStageFilter === 'All' ? 'bg-[#37352F] text-white border-[#37352F]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                  >
                    All WIP ({stageCounts['All']})
                  </button>
                  {WIP_STAGES.map(stage => (
                      <button 
                        key={stage} 
                        onClick={() => setSelectedStageFilter(stage)} 
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border shadow-sm
                            ${selectedStageFilter === stage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                      >
                        {stage} ({stageCounts[stage] || 0})
                      </button>
                  ))}
                  <button 
                    onClick={() => setSelectedStageFilter('Dispatched')} 
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border shadow-sm
                        ${selectedStageFilter === 'Dispatched' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                  >
                    Dispatched ({stageCounts['Dispatched'] || 0})
                  </button>
              </div>
          </div>

          <div className="flex-1 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
                      <thead className="bg-[#F7F7F5] border-b border-gray-200 sticky top-0 z-10 text-xs uppercase font-semibold text-gray-500 tracking-wider">
                          <tr>
                            <th className="px-6 py-4">JOB ID</th>
                            <th className="px-6 py-4">SAM#</th>
                            <th className="px-6 py-4">FACTORY REF#</th>
                            <th className="px-6 py-4">BUYER</th>
                            <th className="px-6 py-4">SAMPLE TYPE</th>
                            <th className="px-6 py-4">FABRIC & WASH</th>
                            <th className="px-6 py-4 text-center">QTY</th>
                            <th className="px-6 py-4">TARGET DATE</th>
                            <th className="px-6 py-4">CURRENT STAGE</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {wipSamples.map(s => (
                              <tr 
                                key={s.id} 
                                onClick={() => setSummarySample(s)}
                                className="group hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                  <td className="px-6 py-4 font-mono font-bold text-blue-700 text-xs truncate max-w-[100px]">
                                    {s.parentRef}
                                  </td>
                                  <td className="px-6 py-4 font-mono text-gray-500 font-bold text-xs truncate max-w-[120px]">
                                    {s.samId}
                                  </td>
                                  <td className="px-6 py-4 text-gray-500 font-bold text-xs uppercase">
                                    {s.originalData.factoryRef || s.style}
                                  </td>
                                  <td className="px-6 py-4 font-bold text-gray-900 uppercase text-sm tracking-tight">
                                    {s.buyer}
                                  </td>
                                  <td className="px-6 py-4 font-medium text-gray-600">
                                    {s.type}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-[13px] text-gray-900 font-bold truncate max-w-[150px]">{s.fabric}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{s.shade}</div>
                                  </td>
                                  <td className="px-6 py-4 text-center font-mono font-bold text-gray-800 text-base">
                                    {s.qty}
                                  </td>
                                  <td className="px-6 py-4 font-mono text-xs font-bold text-red-600">
                                    {formatAppDate(s.deadline)}
                                  </td>
                                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                    <select 
                                      value={s.currentStage} 
                                      onChange={(e) => handleStageSelect(s, e.target.value)} 
                                      disabled={s.currentStage === 'Dispatched'}
                                      className={`px-3 py-1.5 rounded text-[11px] font-bold uppercase border transition-all outline-none cursor-pointer
                                        ${s.currentStage === 'Ready for Dispatch' ? 'bg-green-50 border-green-200 text-green-700' : 
                                          s.currentStage === 'Dispatched' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 opacity-80 cursor-default font-black' :
                                          'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                    >
                                      {WIP_STAGES.map(stage => (
                                          <option key={stage} value={stage}>{stage}</option>
                                      ))}
                                      {s.currentStage === 'Dispatched' && (
                                          <option value="Dispatched">Dispatched</option>
                                      )}
                                    </select>
                                  </td>
                              </tr>
                          ))}
                          {wipSamples.length === 0 && (
                            <tr><td colSpan={9} className="p-20 text-center text-gray-300 italic font-medium">No samples found matching active filters.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* QC VALIDATION MODAL */}
      {qcModalSample && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><CheckCircle2 size={20} /></div>
                        <h3 className="text-lg font-bold text-[#37352F]">Quality Audit Clearance</h3>
                    </div>
                    <button onClick={() => setQcModalSample(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded flex items-center justify-center text-blue-600 font-black font-mono shadow-sm">SAM</div>
                        <div>
                            <div className="font-bold text-blue-900">{qcModalSample.style}</div>
                            <div className="text-xs text-blue-600 font-medium">{qcModalSample.samId} • {qcModalSample.buyer}</div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                            <input 
                              type="checkbox" 
                              id="qc-passed-check"
                              checked={qcChecked} 
                              onChange={e => setQcChecked(e.target.checked)} 
                              className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                        />
                            <div>
                                <span className="text-sm font-bold text-gray-800 block">Quality Check Passed?</span>
                                <span className="text-xs text-gray-500 leading-tight">I confirm this sample matches the construction and wash specs provided in the Tech Pack.</span>
                            </div>
                        </label>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                    <button onClick={() => setQcModalSample(null)} className="px-6 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded transition-colors">Cancel</button>
                    <button 
                        disabled={!qcChecked} 
                        onClick={handleQCPass} 
                        className="px-8 py-2 bg-blue-600 text-white rounded text-sm font-bold shadow-md hover:bg-black disabled:opacity-50 transition-all uppercase tracking-widest"
                    >
                        Release for Dispatch
                    </button>
                  </div>
              </div>
          </div>
      )}

      {/* NEW DEVELOPMENT SAMPLE MODAL */}
      <NewDevSampleModal 
        isOpen={isDevSampleModalOpen} 
        onClose={() => setIsDevSampleModalOpen(false)}
        buyers={availableBuyers}
        onSave={(sample) => onAddDevSample?.(sample)}
        nextSamNumber={nextDevSamNumber}
      />

    </div>
  );
};

const ImageIcon = ({ size, className }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);