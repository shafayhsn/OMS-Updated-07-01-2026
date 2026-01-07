import React, { useState, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, Save, X, Search, Layers, Scissors, Tag, CheckSquare, Square, DollarSign, Bookmark
} from 'lucide-react';
import { MasterBOMItem, Supplier, Buyer, BOMPreset } from '../types';

interface BOMManagerDashboardProps {
  masterItems: MasterBOMItem[];
  setMasterItems: (items: MasterBOMItem[]) => void;
  bomPresets: BOMPreset[];
  setBomPresets: (presets: BOMPreset[]) => void;
  buyers: Buyer[];
  suppliers: Supplier[];
}

const UOM_OPTIONS = ['Pieces', 'Meters', 'Yards', 'Kgs', 'Oz', 'Dozen'];

export const BOMManagerDashboard: React.FC<BOMManagerDashboardProps> = ({ 
  masterItems, setMasterItems, bomPresets, setBomPresets, buyers, suppliers 
}) => {
  const [activeTab, setActiveTab] = useState<'Fabric' | 'Trims' | 'Presets'>('Fabric');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterBOMItem | null>(null);

  // Preset Modal State
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<BOMPreset | null>(null);
  const [presetForm, setPresetForm] = useState<Partial<BOMPreset>>({ name: '', buyerName: '', items: [] });
  const [presetSearchTerm, setPresetSearchTerm] = useState('');

  // Form State
  const initialFormState: Partial<MasterBOMItem> = {
    type: activeTab === 'Fabric' ? 'Fabric' : 'Trim',
    category: '',
    supplier: '',
    brand: 'Generic',
    code: '',
    uom: 'Pieces',
    isNominated: false,
    price: 0,
    // Fabric specifics
    construction: '',
    content: '',
    warpShrinkage: 0,
    weftShrinkage: 0,
    weight: 0,
    width: '',
    shade: '',
    // Trim specifics
    itemName: '',
    details: ''
  };

  const [formData, setFormData] = useState<Partial<MasterBOMItem>>(initialFormState);

  // --- Handlers ---

  const handleOpenModal = (item?: MasterBOMItem) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({ ...initialFormState, type: activeTab === 'Fabric' ? 'Fabric' : 'Trim' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    if (editingItem) {
      setMasterItems(masterItems.map(i => i.id === editingItem.id ? { ...i, ...formData } as MasterBOMItem : i));
    } else {
      const newItem: MasterBOMItem = {
        ...formData,
        id: `bom-${Date.now()}`,
        type: activeTab === 'Fabric' ? 'Fabric' : 'Trim'
      } as MasterBOMItem;
      setMasterItems([...masterItems, newItem]);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this item from the Master Library?")) {
      setMasterItems(masterItems.filter(i => i.id !== id));
    }
  };

  // --- Preset Handlers ---

  const handleOpenPresetModal = (preset?: BOMPreset) => {
    if (preset) {
        setEditingPreset(preset);
        setPresetForm(preset);
    } else {
        setEditingPreset(null);
        setPresetForm({ name: '', buyerName: '', items: [] });
    }
    setIsPresetModalOpen(true);
  };

  const handleSavePreset = () => {
      if (!presetForm.name || !presetForm.buyerName) {
          alert("Please provide a name and link a buyer.");
          return;
      }
      if (editingPreset) {
          setBomPresets(bomPresets.map(p => p.id === editingPreset.id ? { ...p, ...presetForm } as BOMPreset : p));
      } else {
          setBomPresets([...bomPresets, { ...presetForm, id: `pre-${Date.now()}` } as BOMPreset]);
      }
      setIsPresetModalOpen(false);
  };

  const toggleItemInPreset = (item: MasterBOMItem) => {
      const currentItems = presetForm.items || [];
      const exists = currentItems.some(i => i.id === item.id);
      if (exists) {
          setPresetForm({ ...presetForm, items: currentItems.filter(i => i.id !== item.id) });
      } else {
          setPresetForm({ ...presetForm, items: [...currentItems, item] });
      }
  };

  const handleDeletePreset = (id: string) => {
      if (window.confirm("Delete this Brand Preset?")) {
          setBomPresets(bomPresets.filter(p => p.id !== id));
      }
  };

  // --- Filtering ---
  const filteredItems = masterItems.filter(item => {
    if (item.type !== (activeTab === 'Fabric' ? 'Fabric' : 'Trim')) return false;
    const s = searchTerm.toLowerCase();
    return (
      (item.category || '').toLowerCase().includes(s) ||
      (item.itemName || '').toLowerCase().includes(s) ||
      (item.code || '').toLowerCase().includes(s) ||
      (item.supplier || '').toLowerCase().includes(s) ||
      (item.shade || '').toLowerCase().includes(s)
    );
  });

  const filteredPresets = bomPresets.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableItemsForPreset = useMemo(() => {
    const s = presetSearchTerm.toLowerCase();
    return masterItems.filter(item => 
        (item.itemName || item.category || '').toLowerCase().includes(s) || 
        (item.code || '').toLowerCase().includes(s) ||
        (item.supplier || '').toLowerCase().includes(s)
    );
  }, [masterItems, presetSearchTerm]);

  return (
    <div className="flex flex-col h-full space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#37352F]">BOM Master Library</h1>
          <p className="text-sm text-gray-500">Manage standard fabrics, trims, and brand presets for order creation.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
           <button 
             onClick={() => setActiveTab('Fabric')}
             className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 
               ${activeTab === 'Fabric' ? 'border-[#37352F] text-[#37352F]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
           >
             <Layers size={18} /> Fabric Library
           </button>
           <button 
             onClick={() => setActiveTab('Trims')}
             className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 
               ${activeTab === 'Trims' ? 'border-[#37352F] text-[#37352F]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
           >
             <Scissors size={18} /> Trims Library
           </button>
           <button 
             onClick={() => setActiveTab('Presets')}
             className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 
               ${activeTab === 'Presets' ? 'border-[#37352F] text-[#37352F]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
           >
             <Bookmark size={18} /> Brand Presets
           </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input 
               type="text" 
               placeholder={`Search ${activeTab}...`}
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
         </div>
         {activeTab !== 'Presets' ? (
           <button 
             onClick={() => handleOpenModal()}
             className="flex items-center gap-2 px-3 py-1.5 bg-[#37352F] text-white rounded-md hover:bg-black transition-colors shadow-sm text-xs font-medium"
           >
             <Plus size={14} /> Add {activeTab} Item
           </button>
         ) : (
           <button 
             onClick={() => handleOpenPresetModal()}
             className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm text-xs font-medium"
           >
             <Plus size={14} /> Create New Preset
           </button>
         )}
      </div>

      {/* Tables */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
         <div className="flex-1 overflow-auto custom-scrollbar">
            {activeTab === 'Presets' ? (
                <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-[#F7F7F5] text-[11px] font-semibold text-gray-500 uppercase sticky top-0 z-10 shadow-sm">
                      <tr>
                         <th className="px-6 py-4">Preset Name</th>
                         <th className="px-6 py-4">Linked Buyer</th>
                         <th className="px-6 py-4 text-center">Material Count</th>
                         <th className="px-6 py-4 text-center w-32">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {filteredPresets.map(preset => (
                         <tr key={preset.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4 font-bold text-[#37352F]">{preset.name}</td>
                            <td className="px-6 py-4 font-medium text-blue-600">{preset.buyerName}</td>
                            <td className="px-6 py-4 text-center">
                                <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold">
                                    {preset.items.length} Items
                                </span>
                            </td>
                            <td className="px-6 py-4">
                               <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleOpenPresetModal(preset)} className="text-gray-400 hover:text-blue-600" title="Edit Preset">
                                     <Edit2 size={16} />
                                  </button>
                                  <button onClick={() => handleDeletePreset(preset.id)} className="text-gray-400 hover:text-red-500" title="Delete Preset">
                                     <Trash2 size={16} />
                                  </button>
                               </div>
                            </td>
                         </tr>
                      ))}
                      {filteredPresets.length === 0 && (
                         <tr><td colSpan={4} className="p-10 text-center text-gray-400 italic">No presets found.</td></tr>
                      )}
                   </tbody>
                </table>
            ) : (
                <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-[#F7F7F5] text-[11px] font-semibold text-gray-500 uppercase sticky top-0 z-10 shadow-sm">
                      <tr>
                         {activeTab === 'Fabric' ? (
                           <>
                             <th className="px-4 py-3">Category</th>
                             <th className="px-4 py-3">Code</th>
                             <th className="px-4 py-3">Construction</th>
                             <th className="px-4 py-3">Content</th>
                             <th className="px-4 py-3 text-center">Weight</th>
                             <th className="px-4 py-3 text-center">Width</th>
                             <th className="px-4 py-3">Shade</th>
                             <th className="px-4 py-3 text-center">Shrinkage (L x W)</th>
                             <th className="px-4 py-3">Supplier</th>
                             <th className="px-4 py-3 text-right">Price (PKR)</th>
                           </>
                         ) : (
                           <>
                             <th className="px-4 py-3">Category</th>
                             <th className="px-4 py-3">Item Name</th>
                             <th className="px-4 py-3">Code</th>
                             <th className="px-4 py-3">Shade</th>
                             <th className="px-4 py-3">Details</th>
                             <th className="px-4 py-3">UOM</th>
                             <th className="px-4 py-3">Supplier</th>
                             <th className="px-4 py-3 text-right">Price (PKR)</th>
                           </>
                         )}
                         <th className="px-4 py-3 text-center w-20">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {filteredItems.map(item => (
                         <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                            {activeTab === 'Fabric' ? (
                              <>
                                <td className="px-4 py-3 font-medium text-[#37352F]">{item.category}</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.code}</td>
                                <td className="px-4 py-3">{item.construction}</td>
                                <td className="px-4 py-3 text-gray-600">{item.content}</td>
                                <td className="px-4 py-3 text-center">{item.weight}</td>
                                <td className="px-4 py-3 text-center text-gray-600 font-mono text-xs">{item.width || '-'}</td>
                                <td className="px-4 py-3 text-gray-600 italic">{item.shade || '-'}</td>
                                <td className="px-4 py-3 text-center text-xs text-gray-500 font-mono">{item.warpShrinkage}% x {item.weftShrinkage}%</td>
                                <td className="px-4 py-3 text-blue-600 font-medium">{item.supplier}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">{item.price?.toLocaleString()}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 font-medium text-[#37352F]">{item.category}</td>
                                <td className="px-4 py-3">{item.itemName}</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.code}</td>
                                <td className="px-4 py-3 text-gray-600 italic">{item.shade || '-'}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[150px]" title={item.details}>{item.details}</td>
                                <td className="px-4 py-3 text-xs">{item.uom}</td>
                                <td className="px-4 py-3 text-blue-600 font-medium">{item.supplier}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">{item.price?.toLocaleString()}</td>
                              </>
                            )}
                            <td className="px-4 py-3 text-center">
                               <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleOpenModal(item)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50">
                                     <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50">
                                     <Trash2 size={14} />
                                  </button>
                               </div>
                            </td>
                         </tr>
                      ))}
                      {filteredItems.length === 0 && (
                         <tr><td colSpan={activeTab === 'Fabric' ? 10 : 9} className="p-10 text-center text-gray-400 italic">No items found in the library.</td></tr>
                      )}
                   </tbody>
                </table>
            )}
         </div>
      </div>

      {/* ITEM MODAL (Fabric/Trims) */}
      {isModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl flex flex-col overflow-hidden">
               
               <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-[#37352F]">
                     {editingItem ? 'Edit' : 'Add'} {activeTab} Item
                  </h2>
                  <button onClick={handleCloseModal}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
               </div>

               <div className="p-6 overflow-y-auto max-h-[70vh]">
                  <div className="grid grid-cols-2 gap-6">
                     
                     {/* Common Fields */}
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Category</label>
                        <input className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Denim, Zipper" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Item Code / Ref</label>
                        <input className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="Internal or Supplier Code" />
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Supplier</label>
                        <select className="w-full px-3 py-2 border rounded text-sm bg-white focus:border-blue-500 outline-none" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})}>
                           <option value="">Select Supplier...</option>
                           {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Unit (UOM)</label>
                        <select className="w-full px-3 py-2 border rounded text-sm bg-white focus:border-blue-500 outline-none" value={formData.uom} onChange={e => setFormData({...formData, uom: e.target.value})}>
                           {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Price (PKR)</label>
                        <div className="relative">
                           <DollarSign size={14} className="absolute left-3 top-2.5 text-gray-400" />
                           <input type="number" className="w-full pl-9 pr-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} placeholder="0.00" />
                        </div>
                     </div>

                     {/* FABRIC SPECIFIC */}
                     {activeTab === 'Fabric' && (
                        <>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Construction</label>
                              <input className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.construction} onChange={e => setFormData({...formData, construction: e.target.value})} placeholder="e.g. 3x1 RHT" />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Content</label>
                              <input className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="e.g. 98% Cotton 2% Elastane" />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Weight (GSM/Oz)</label>
                              <input type="number" className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.weight} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})} placeholder="0" />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Width</label>
                              <input type="text" className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.width} onChange={e => setFormData({...formData, width: e.target.value})} placeholder='e.g. 58"' />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Shade / Colorway</label>
                              <input className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.shade} onChange={e => setFormData({...formData, shade: e.target.value})} placeholder="e.g. Vintage Blue" />
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1.5">
                                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Warp Shrink %</label>
                                 <input type="number" className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.warpShrinkage} onChange={e => setFormData({...formData, warpShrinkage: parseFloat(e.target.value)})} />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Weft Shrink %</label>
                                 <input type="number" className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.weftShrinkage} onChange={e => setFormData({...formData, weftShrinkage: parseFloat(e.target.value)})} />
                              </div>
                           </div>
                        </>
                     )}

                     {/* TRIMS SPECIFIC */}
                     {activeTab === 'Trims' && (
                        <>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Item Name</label>
                              <input className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} placeholder="e.g. Main Button" />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Shade / Colorway</label>
                              <input className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.shade} onChange={e => setFormData({...formData, shade: e.target.value})} placeholder="e.g. Antique Brass" />
                           </div>
                           <div className="col-span-2 space-y-1.5">
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Details / Specs</label>
                              <textarea rows={2} className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} placeholder="Size, Finish, Color..." />
                           </div>
                        </>
                     )}

                  </div>
               </div>

               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                  <button onClick={handleCloseModal} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                  <button 
                     onClick={handleSave}
                     className="px-6 py-2 bg-[#37352F] text-white text-sm font-bold rounded hover:bg-black transition-colors"
                  >
                     Save Item
                  </button>
               </div>

            </div>
         </div>
      )}

      {/* PRESET MODAL */}
      {isPresetModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-[90vw] h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold text-[#37352F]">
                        {editingPreset ? 'Edit Brand Preset' : 'Define New Brand Preset'}
                    </h2>
                    <button onClick={() => setIsPresetModalOpen(false)}><X size={20} className="text-gray-400"/></button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Form Left Side */}
                    <div className="w-full md:w-1/4 p-6 border-r border-gray-100 space-y-6 overflow-y-auto">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Preset Name</label>
                            <input 
                                className="w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none" 
                                value={presetForm.name} 
                                onChange={e => setPresetForm({...presetForm, name: e.target.value})} 
                                placeholder="e.g. Boohoo Denim Template" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Link Buyer</label>
                            <select 
                                className="w-full px-3 py-2 border rounded text-sm bg-white focus:border-blue-500 outline-none" 
                                value={presetForm.buyerName} 
                                onChange={e => setPresetForm({...presetForm, buyerName: e.target.value})}
                            >
                                <option value="">Select Buyer...</option>
                                {buyers.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                            </select>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Selected Materials ({presetForm.items?.length})</h4>
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {presetForm.items?.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-xs border border-gray-100 group">
                                        <div className="truncate pr-2 flex-1">
                                            <span className="font-bold text-[#37352F]">{item.itemName || item.category}</span>
                                            <span className="text-gray-400 ml-2 font-mono">[{item.code}]</span>
                                        </div>
                                        <button onClick={() => toggleItemInPreset(item)} className="text-gray-300 hover:text-red-500">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {(!presetForm.items || presetForm.items.length === 0) && (
                                    <p className="text-xs text-gray-400 italic text-center py-4">No items selected. Use the browser on the right.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Expanded Material Browser Right Side */}
                    <div className="flex-1 flex flex-col bg-gray-50/50 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Browse library by Name, Code, or Supplier..." 
                                    value={presetSearchTerm}
                                    onChange={e => setPresetSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 text-sm border rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="text-xs text-gray-400 font-medium">
                                {availableItemsForPreset.length} items found in library
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-white border-b border-gray-100 sticky top-0 font-bold uppercase text-gray-500 shadow-sm z-10">
                                    <tr>
                                        <th className="px-4 py-3 w-16">Type</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3">Item Detail / Construction</th>
                                        <th className="px-4 py-3">Code</th>
                                        <th className="px-4 py-3">Shade</th>
                                        <th className="px-4 py-3">Supplier</th>
                                        <th className="px-4 py-3 text-right">Price</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {availableItemsForPreset.map(item => {
                                        const isSelected = presetForm.items?.some(i => i.id === item.id);
                                        return (
                                            <tr key={item.id} className={`hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                                                <td className="px-4 py-3 uppercase text-[9px] font-black text-gray-400">{item.type}</td>
                                                <td className="px-4 py-3 font-medium text-gray-600">{item.category}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-[#37352F]">
                                                        {item.itemName || item.category}
                                                    </div>
                                                    {item.type === 'Fabric' && (
                                                        <div className="text-[10px] text-gray-500 mt-0.5">
                                                            {item.construction} • {item.content}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-gray-500">{item.code}</td>
                                                <td className="px-4 py-3 text-gray-600 italic">{item.shade || '-'}</td>
                                                <td className="px-4 py-3 text-blue-600 font-medium">{item.supplier}</td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-gray-700">{item.price?.toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    <button 
                                                        onClick={() => toggleItemInPreset(item)}
                                                        className={`p-1.5 rounded transition-all shadow-sm
                                                            ${isSelected ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300'}`}
                                                    >
                                                        {isSelected ? <CheckSquare size={16} /> : <Plus size={16} />}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                    <div className="text-xs text-gray-500 italic">
                        All quantities and specific consumptions will be set to zero upon import into an order.
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsPresetModalOpen(false)} className="px-6 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-all">Cancel</button>
                        <button 
                            onClick={handleSavePreset}
                            className="px-10 py-2 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 shadow-lg transition-all"
                        >
                            {editingPreset ? 'Update Preset' : 'Save Brand Preset'}
                        </button>
                    </div>
                </div>
             </div>
          </div>
      )}

    </div>
  );
};
