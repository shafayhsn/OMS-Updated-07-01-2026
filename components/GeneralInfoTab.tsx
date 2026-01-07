import React, { useState, useCallback } from 'react';
import { Info, Image as ImageIcon, FileText, X, ChevronDown, RefreshCw, Hash, AlignLeft, Calendar, UploadCloud, Check } from 'lucide-react';
import { ColorRow, POData, SizeGroup, Buyer } from '../types';
import { SizeGroupMatrixManager } from './SizeGroupMatrixManager';

interface GeneralInfoTabProps {
  colors: ColorRow[];
  setColors: (val: ColorRow[] | ((prev: ColorRow[]) => ColorRow[])) => void;
  formData: POData;
  setFormData: (val: POData | ((prev: POData) => POData)) => void;
  sizeGroups: SizeGroup[];
  onSizeGroupsChange: (groups: SizeGroup[]) => void;
  availableBuyers: Buyer[];
  styleImage: string | null;
  setStyleImage: (val: string | null) => void;
}

export const GeneralInfoTab: React.FC<GeneralInfoTabProps> = ({ 
  colors, setColors, formData, setFormData, sizeGroups, onSizeGroupsChange, availableBuyers,
  styleImage, setStyleImage
}) => {
  const [techPackFile, setTechPackFile] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'buyerName') {
        const buyer = availableBuyers.find(b => b.name === value);
        setFormData(prev => ({ 
            ...prev, 
            [name]: value,
            incoterms: buyer?.incoterms || prev.incoterms
        }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setStyleImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTechPackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setTechPackFile(e.target.files[0].name);
      }
  };

  const handleGroupsChange = useCallback((newGroups: SizeGroup[]) => {
    onSizeGroupsChange(newGroups);
  }, [onSizeGroupsChange]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      
      {/* SECTION A: Metadata Form & Integrated Attachments */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Order Details</h2>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-8">
          
          {/* Main Form Fields (70%) */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              
              {/* Row 1 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Buyer Name</label>
                <div className="relative">
                  <select
                    name="buyerName"
                    value={formData.buyerName} 
                    onChange={handleInputChange}
                    className="w-full pr-10 pl-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-[#37352F] text-[13px] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none h-10"
                  >
                    <option value="" disabled>Select Buyer...</option>
                    {availableBuyers.map(buyer => (
                      <option key={buyer.id} value={buyer.name}>{buyer.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Merchandiser's Name</label>
                <input 
                  type="text" 
                  name="merchandiserName"
                  value={formData.merchandiserName || ''}
                  onChange={handleInputChange}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-[#37352F] text-[13px] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-10"
                />
              </div>

              {/* Row 2 - Integrated Factory Ref, Product ID, Style Number */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-10 gap-x-4 gap-y-4">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Factory Ref</label>
                  <input 
                    type="text" 
                    name="factoryRef"
                    value={formData.factoryRef}
                    onChange={handleInputChange}
                    placeholder="Ref#"
                    className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-[#37352F] text-[13px] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-10"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product ID</label>
                  <input 
                    type="text" 
                    name="productID"
                    value={formData.productID}
                    onChange={handleInputChange}
                    placeholder="Internal System ID"
                    className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-[#37352F] text-[13px] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-10"
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Style Number</label>
                  <input 
                    type="text" 
                    name="styleNumber"
                    value={formData.styleNumber}
                    onChange={handleInputChange}
                    placeholder="e.g. ZMO-CD6904D0F5"
                    className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-[#37352F] text-[13px] font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-10"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <input 
                  type="text" 
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  placeholder="Enter style description..."
                  className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-[#37352F] text-[13px] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-10"
                />
              </div>

              {/* Specific Row: PO Number, Incoterms, Ship Mode */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PO Number</label>
                  <input 
                    type="text" 
                    name="poNumber"
                    value={formData.poNumber}
                    onChange={handleInputChange}
                    placeholder="PO-998877"
                    className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-[#37352F] text-[13px] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-10"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Incoterms</label>
                  <input 
                    type="text" 
                    name="incoterms"
                    value={formData.incoterms || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. FOB"
                    className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-[#37352F] text-[13px] font-bold uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-10"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ship Mode</label>
                  <select
                    name="shipMode"
                    value={formData.shipMode}
                    onChange={handleInputChange}
                    className="w-full pr-10 pl-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-[#37352F] text-[13px] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none h-10"
                  >
                    <option value="Sea">Sea</option>
                    <option value="Air">Air</option>
                    <option value="Courier">Courier</option>
                  </select>
                </div>
              </div>

              {/* Specific Row: PO Date, Ship Date, Planned Date */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PO Date</label>
                  <input 
                    type="date" 
                    name="poDate"
                    value={formData.poDate || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-[#37352F] text-[13px] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-10 font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ship Date</label>
                  <input 
                    type="date" 
                    name="shipDate"
                    value={formData.shipDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-[#37352F] text-[13px] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-10 font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Planned Date</label>
                  <input 
                    type="date" 
                    name="plannedDate"
                    value={formData.plannedDate || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-blue-50/30 border border-blue-100 rounded-lg text-blue-700 text-[13px] font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-10 font-mono"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Attachments Sidebar (30%) */}
          <div className="w-full lg:w-64 flex flex-col gap-4 border-l border-gray-100 lg:pl-8">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-1">Assets</h3>
            
            {/* Style Image Slot */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Upload Article Picture</label>
              <div className={`relative h-28 w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all group overflow-hidden
                ${styleImage ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 hover:border-blue-300'}`}>
                {styleImage ? (
                  <div className="w-full h-full p-2 relative">
                    <img src={styleImage} alt="Style" className="w-full h-full object-contain rounded-lg" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                      <button onClick={(e) => { e.preventDefault(); setStyleImage(null); }} className="p-2 bg-white rounded-full text-red-600 shadow-sm hover:scale-110 transition-transform">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="p-2 bg-white rounded-lg shadow-sm mb-2 text-gray-400 group-hover:text-blue-500 transition-colors">
                      <ImageIcon size={20} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Upload Picture</span>
                  </>
                )}
                {styleImage && <div className="absolute top-2 right-2 p-1 bg-green-500 text-white rounded-full"><Check size={8}/></div>}
              </div>
            </div>

            {/* Tech Pack Slot */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Upload Tech Pack</label>
              <div className={`relative h-14 w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all group
                ${techPackFile ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 hover:border-blue-300'}`}>
                {techPackFile ? (
                  <div className="flex flex-col items-center gap-1 text-center animate-in zoom-in-95 p-1">
                    <div className="p-1 bg-blue-600 text-white rounded-lg shadow-md">
                      <FileText size={14} />
                    </div>
                    <p className="text-[9px] font-bold text-gray-700 line-clamp-1 w-full px-2" title={techPackFile}>{techPackFile}</p>
                    <button onClick={(e) => { e.preventDefault(); setTechPackFile(null); }} className="text-[8px] font-bold text-red-500 uppercase hover:underline">Change</button>
                  </div>
                ) : (
                  <>
                    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleTechPackUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="p-1 bg-white rounded-lg shadow-sm mb-1 text-gray-400 group-hover:text-blue-500 transition-colors">
                      <UploadCloud size={14} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Upload Tech Pack</span>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* SECTION B: Matrix Manager */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 mb-1">
           <Hash size={16} className="text-gray-400" />
           <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">PO Breakdown Matrix</h2>
        </div>
        
        <SizeGroupMatrixManager 
          groups={sizeGroups}
          onGroupsChange={handleGroupsChange}
        />
      </div>

    </div>
  );
};

// Internal icon dependency fix
const Trash2 = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
  </svg>
);