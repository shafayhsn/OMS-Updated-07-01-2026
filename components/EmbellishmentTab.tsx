import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Palette, Layers, FlaskConical, Image as ImageIcon, Settings, X, Upload, CheckCircle2 } from 'lucide-react';
import { EmbellishmentRecord, SizeGroup } from '../types';

interface EmbellishmentTabProps {
  data: EmbellishmentRecord[];
  onUpdate: (data: EmbellishmentRecord[]) => void;
  sizeGroups: SizeGroup[];
}

export const EmbellishmentTab: React.FC<EmbellishmentTabProps> = ({ data, onUpdate, sizeGroups }) => {
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);

  // --- Helpers ---
  const getAllSizes = useMemo(() => {
      const sizes = new Set<string>();
      sizeGroups.forEach(g => g.sizes.forEach(s => sizes.add(s)));
      return Array.from(sizes).sort((a,b) => {
          const numA = parseInt(a);
          const numB = parseInt(b);
          if(!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
      });
  }, [sizeGroups]);

  // --- Handlers ---

  const addEmbellishment = () => {
    const newRecord: EmbellishmentRecord = {
      id: Math.random().toString(36).substr(2, 9),
      artworkFile: null,
      type: 'Screen Print', 
      location: '',
      artworkId: '',
      colorInfo: '',
      status: 'Pending',
      approvalDate: '',
      instructions: '',
      isTestingRequired: false,
      isApproved: false,
      usageRule: 'Generic',
      dimensionsData: { 'Generic': '' }
    };
    onUpdate([...data, newRecord]);
  };

  const removeEmbellishment = (id: string) => {
    onUpdate(data.filter(record => record.id !== id));
  };

  const updateField = (id: string, field: keyof EmbellishmentRecord, value: any) => {
    onUpdate(data.map(record => 
      record.id === id ? { ...record, [field]: value } : record
    ));
  };

  const handleImageUpload = (id: string, file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          updateField(id, 'artworkFile', reader.result as string);
      };
      reader.readAsDataURL(file);
  };

  const updateDimension = (id: string, key: string, value: string) => {
      const record = data.find(r => r.id === id);
      if (!record) return;
      const newDims = { ...record.dimensionsData, [key]: value };
      updateField(id, 'dimensionsData', newDims);
  };

  // --- Render ---

  const activeRecord = data.find(r => r.id === activeConfigId);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Palette size={18} className="text-gray-400" />
           <h2 className="text-lg font-medium text-[#37352F]">Embellishment Details</h2>
        </div>
      </div>

      {/* Tabular View */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
               <thead className="bg-[#F7F7F5] text-xs font-semibold text-gray-500 uppercase sticky top-0 z-10 shadow-sm">
                  <tr>
                     <th className="px-4 py-3 w-16 text-center border-r border-gray-200">Artwork</th>
                     <th className="px-4 py-3 w-28 border-r border-gray-200">Type</th>
                     <th className="px-4 py-3 w-28 border-r border-gray-200">Placement</th>
                     <th className="px-4 py-3 w-20 border-r border-gray-200">Ref ID</th>
                     <th className="px-4 py-3 w-40 border-r border-gray-200">Dimensions / Usage</th>
                     <th className="px-4 py-3 w-28 border-r border-gray-200">Color Info</th>
                     <th className="px-4 py-3 w-24 border-r border-gray-200">Status</th>
                     <th className="px-4 py-3 w-24 text-center border-r border-gray-200">Action</th>
                     <th className="px-4 py-3 w-10 text-center"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {data.map((record) => (
                     <tr key={record.id} className="group hover:bg-gray-50 transition-colors">
                        {/* Artwork Upload */}
                        <td className="px-2 py-2 text-center border-r border-gray-100">
                           <div className="w-12 h-12 mx-auto bg-gray-50 border border-gray-200 rounded flex items-center justify-center relative overflow-hidden group/img cursor-pointer">
                              {record.artworkFile ? (
                                 <img src={record.artworkFile} alt="Art" className="w-full h-full object-cover" />
                              ) : (
                                 <ImageIcon size={16} className="text-gray-300" />
                              )}
                              <input 
                                 type="file" 
                                 accept=".jpg, .jpeg, .png" 
                                 className="absolute inset-0 opacity-0 cursor-pointer"
                                 onChange={(e) => {
                                    if(e.target.files?.[0]) handleImageUpload(record.id, e.target.files[0]);
                                 }}
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                                 <Upload size={12} className="text-white" />
                              </div>
                           </div>
                        </td>

                        {/* Type */}
                        <td className="px-2 py-2 border-r border-gray-100">
                           <select 
                              value={record.type}
                              onChange={(e) => updateField(record.id, 'type', e.target.value)}
                              className="w-full bg-transparent border border-transparent hover:border-gray-200 rounded px-2 py-1.5 focus:border-blue-500 outline-none text-sm"
                           >
                              <option value="Screen Print">Screen Print</option>
                              <option value="Embroidery">Embroidery</option>
                              <option value="Heat Transfer">Heat Transfer</option>
                              <option value="Applique">Applique</option>
                              <option value="Sequin">Sequin</option>
                              <option value="Foil Print">Foil Print</option>
                              <option value="Other">Other</option>
                           </select>
                        </td>

                        {/* Placement */}
                        <td className="px-2 py-2 border-r border-gray-100">
                           <input 
                              type="text" 
                              value={record.location}
                              onChange={(e) => updateField(record.id, 'location', e.target.value)}
                              className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-1 py-1"
                              placeholder="Location"
                           />
                        </td>

                        {/* Ref ID */}
                        <td className="px-2 py-2 border-r border-gray-100">
                           <input 
                              type="text" 
                              value={record.artworkId}
                              onChange={(e) => updateField(record.id, 'artworkId', e.target.value)}
                              className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-1 py-1 font-mono text-xs"
                              placeholder="Ref #"
                           />
                        </td>

                        {/* Usage / Dimensions */}
                        <td className="px-2 py-2 border-r border-gray-100 align-top">
                           <div className="flex flex-col gap-1.5">
                              <select 
                                 value={record.usageRule}
                                 onChange={(e) => updateField(record.id, 'usageRule', e.target.value)}
                                 className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 rounded px-1 py-0.5 border border-transparent hover:border-gray-300 cursor-pointer outline-none w-full"
                              >
                                 <option value="Generic">Generic (All Sizes)</option>
                                 <option value="By Size Group">By Size Group</option>
                                 <option value="By Individual Sizes">By Indiv. Sizes</option>
                              </select>
                              
                              {record.usageRule === 'Generic' ? (
                                 <input 
                                    type="text" 
                                    value={record.dimensionsData['Generic'] || ''}
                                    onChange={(e) => updateDimension(record.id, 'Generic', e.target.value)}
                                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 font-mono placeholder:text-gray-300"
                                    placeholder="L x W x H"
                                 />
                              ) : (
                                 <button 
                                    onClick={() => setActiveConfigId(record.id)}
                                    className="w-full border border-blue-200 bg-blue-50 text-blue-700 rounded px-2 py-1 text-xs font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                                 >
                                    <Settings size={12} /> Configure Dims
                                 </button>
                              )}
                           </div>
                        </td>

                        {/* Color Info */}
                        <td className="px-2 py-2 border-r border-gray-100">
                           <input 
                              type="text" 
                              value={record.colorInfo}
                              onChange={(e) => updateField(record.id, 'colorInfo', e.target.value)}
                              className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-1 py-1"
                              placeholder="Colors"
                           />
                        </td>

                        {/* Status */}
                        <td className="px-2 py-2 border-r border-gray-100">
                           <select 
                              value={record.status}
                              onChange={(e) => updateField(record.id, 'status', e.target.value)}
                              className={`w-full text-xs px-2 py-1.5 border rounded outline-none cursor-pointer
                                 ${record.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                                   record.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                                   'bg-white border-gray-200'}`}
                           >
                              <option value="Pending">Pending</option>
                              <option value="Submitted">Submitted</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                              <option value="Commented">Commented</option>
                           </select>
                        </td>

                        {/* Action Toggle Button */}
                        <td className="px-2 py-2 text-center border-r border-gray-100">
                           <div className="flex items-center justify-center gap-3">
                              <button 
                                 onClick={() => updateField(record.id, 'isTestingRequired', !record.isTestingRequired)}
                                 className={`p-1 rounded transition-colors ${record.isTestingRequired ? 'text-purple-600 bg-purple-50' : 'text-gray-300 hover:text-purple-400'}`}
                                 title="Lab Test Required"
                              >
                                 <FlaskConical size={16} />
                              </button>
                              <button 
                                 onClick={() => updateField(record.id, 'isApproved', !record.isApproved)}
                                 className={`p-1 rounded transition-colors ${record.isApproved ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-green-500'}`}
                                 title="Buyer's approval required"
                              >
                                 <CheckCircle2 size={16} />
                              </button>
                           </div>
                        </td>

                        {/* Delete */}
                        <td className="px-2 py-2 text-center">
                           <button 
                              onClick={() => removeEmbellishment(record.id)}
                              className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                              <Trash2 size={16} />
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
            
            {data.length === 0 && (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Layers size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No embellishments added.</p>
                    <button 
                        onClick={addEmbellishment}
                        className="mt-2 text-blue-600 font-medium text-sm hover:underline"
                    >
                        Add First Record
                    </button>
                </div>
            )}
         </div>
         
         {data.length > 0 && (
            <button 
               onClick={addEmbellishment}
               className="w-full py-2 bg-gray-50 text-gray-500 text-xs font-medium border-t border-gray-200 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
            >
               <Plus size={14} /> Add Another Row
            </button>
         )}
      </div>

      {/* DIMENSION CONFIG MODAL */}
      {activeRecord && activeConfigId && (
         <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
               <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <div>
                     <h3 className="text-sm font-bold text-[#37352F]">Configure Dimensions</h3>
                     <p className="text-xs text-gray-500">Mode: {activeRecord.usageRule}</p>
                  </div>
                  <button onClick={() => setActiveConfigId(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
               </div>
               
               <div className="flex-1 overflow-auto p-0">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-white text-xs text-gray-500 uppercase font-semibold border-b border-gray-100">
                        <tr>
                           <th className="px-6 py-3">
                              {activeRecord.usageRule === 'By Size Group' ? 'Size Group' : 'Size'}
                           </th>
                           <th className="px-6 py-3">Dimensions (L x W x H)</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {activeRecord.usageRule === 'By Size Group' && sizeGroups.map(group => (
                           <tr key={group.id}>
                              <td className="px-6 py-3 font-medium text-gray-700">{group.groupName}</td>
                              <td className="px-6 py-3">
                                 <input 
                                    type="text" 
                                    value={activeRecord.dimensionsData[group.groupName] || ''}
                                    onChange={(e) => updateDimension(activeRecord.id, group.groupName, e.target.value)}
                                    className="w-full border border-gray-200 rounded px-3 py-1.5 outline-none focus:border-blue-500 font-mono text-xs"
                                    placeholder="e.g. 10x10"
                                 />
                              </td>
                           </tr>
                        ))}

                        {activeRecord.usageRule === 'By Individual Sizes' && getAllSizes.map(size => (
                           <tr key={size}>
                              <td className="px-6 py-3 font-medium text-gray-700">{size}</td>
                              <td className="px-6 py-3">
                                 <input 
                                    type="text" 
                                    value={activeRecord.dimensionsData[size] || ''}
                                    onChange={(e) => updateDimension(activeRecord.id, size, e.target.value)}
                                    className="w-full border border-gray-200 rounded px-3 py-1.5 outline-none focus:border-blue-500 font-mono text-xs"
                                    placeholder="e.g. 10x10"
                                 />
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                  <button 
                     onClick={() => setActiveConfigId(null)}
                     className="px-6 py-2 bg-[#37352F] text-white text-sm font-medium rounded hover:bg-black shadow-sm"
                  >
                     Done
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};
