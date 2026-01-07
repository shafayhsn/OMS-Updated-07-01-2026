
import React, { useState } from 'react';
import { Upload, FileText, X, FileSpreadsheet, Ruler, Type, Info, Calendar, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { FittingData, SizeGroup } from '../types';

interface FittingTabProps {
  data: FittingData[];
  onUpdate: (data: FittingData[]) => void;
  sizeGroups: SizeGroup[];
}

export const FittingTab: React.FC<FittingTabProps> = ({ data, onUpdate, sizeGroups }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);

  const addSpec = () => {
    const newSpec: FittingData = {
      id: `fit-${Date.now()}`,
      fileName: null,
      fitName: '',
      sizeRange: 'Generic',
      patternCutter: '',
      specsDate: new Date().toISOString().split('T')[0],
      specsDescription: ''
    };
    onUpdate([...data, newSpec]);
  };

  const removeSpec = (id: string) => {
    onUpdate(data.filter(item => item.id !== id));
  };

  const updateSpec = (id: string, field: keyof FittingData, value: any) => {
    onUpdate(data.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setIsDragging(true);
    setDragTargetId(id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setIsDragging(false);
    setDragTargetId(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(id, e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(id, e.target.files[0]);
    }
  };

  const handleFileUpload = (id: string, file: File) => {
    // Simulate upload logic
    updateSpec(id, 'fileName', file.name);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler size={18} className="text-gray-400" />
          <h2 className="text-lg font-medium text-[#37352F]">Specification Sheets & Fit Details</h2>
        </div>
        <button 
          onClick={addSpec}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-[#37352F] hover:bg-black rounded shadow-sm transition-all"
        >
          <Plus size={14} /> Add Spec Sheet
        </button>
      </div>

      <div className="space-y-6">
        {data.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 flex flex-col items-center justify-center text-center bg-gray-50/50">
             <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 text-gray-300">
                <Ruler size={24} />
             </div>
             <h3 className="text-sm font-medium text-gray-900">No Specifications Added</h3>
             <p className="text-xs text-gray-500 mt-1 mb-4 max-w-xs">
               Add fit details, measurements, and upload spec sheets for different size ranges.
             </p>
             <button 
                onClick={addSpec}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
             >
                + Add First Spec
             </button>
          </div>
        ) : (
          data.map((spec, index) => (
            <div key={spec.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="bg-gray-50/80 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                        </span>
                        <input 
                            type="text" 
                            className="bg-transparent font-semibold text-[#37352F] text-sm focus:outline-none focus:border-b focus:border-blue-500 w-48"
                            placeholder="Fit Name (e.g. Base)" 
                            value={spec.fitName}
                            onChange={(e) => updateSpec(spec.id, 'fitName', e.target.value)}
                        />
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-500">
                            {spec.sizeRange || 'Generic'}
                        </span>
                    </div>
                    <button 
                        onClick={() => removeSpec(spec.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                        title="Remove Spec"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: File Upload */}
                    <div className="lg:col-span-1 space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                            Spec Sheet File
                        </label>
                        
                        <div 
                            onDragOver={(e) => handleDragOver(e, spec.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, spec.id)}
                            className={`
                            relative border border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center transition-all min-h-[140px]
                            ${isDragging && dragTargetId === spec.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50'}
                            ${spec.fileName ? 'bg-white border-solid border-gray-200' : ''}
                            `}
                        >
                            {spec.fileName ? (
                            <div className="flex flex-col items-center gap-2 w-full animate-in zoom-in-95 duration-200">
                                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                    {spec.fileName.endsWith('.xlsx') || spec.fileName.endsWith('.xls') ? 
                                    <FileSpreadsheet size={20} /> : <FileText size={20} />
                                    }
                                </div>
                                <div className="space-y-0.5 max-w-full px-2">
                                <p className="text-sm font-medium text-gray-700 truncate break-all line-clamp-2">{spec.fileName}</p>
                                <p className="text-[10px] text-green-600 font-medium">Upload Complete</p>
                                </div>
                                <button 
                                onClick={() => updateSpec(spec.id, 'fileName', null)}
                                className="mt-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center gap-1"
                                title="Remove File"
                                >
                                <X size={12} /> Remove
                                </button>
                            </div>
                            ) : (
                            <>
                                <input 
                                type="file" 
                                accept=".pdf,.xlsx,.xls"
                                onChange={(e) => handleFileSelect(e, spec.id)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 text-gray-400">
                                <Upload size={16} />
                                </div>
                                <h3 className="text-sm font-medium text-gray-700">Upload File</h3>
                                <p className="text-[10px] text-gray-400 mt-1 mb-2 max-w-[150px]">
                                Drag and drop PDF or Excel
                                </p>
                            </>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Metadata Form */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Pattern Cutter */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                    Pattern Cutter
                                </label>
                                <div className="relative">
                                    <Type size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                    <input 
                                        type="text"
                                        value={spec.patternCutter || ''}
                                        onChange={(e) => updateSpec(spec.id, 'patternCutter', e.target.value)}
                                        placeholder="e.g. Master Ali"
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded text-[#37352F] text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Specs Date */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                    Date of Specs
                                </label>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                    <input 
                                        type="date"
                                        value={spec.specsDate}
                                        onChange={(e) => updateSpec(spec.id, 'specsDate', e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded text-[#37352F] text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Usage */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                    Usage (Scope)
                                </label>
                                <div className="relative">
                                    <Ruler size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                    <select 
                                        value={spec.sizeRange}
                                        onChange={(e) => updateSpec(spec.id, 'sizeRange', e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded text-[#37352F] text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="Generic">Generic (All Sizes)</option>
                                        {sizeGroups.map(g => (
                                            <option key={g.id} value={g.groupName}>{g.groupName}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Specs Description */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                Notes & Tolerances
                            </label>
                            <div className="relative">
                                <Info size={14} className="absolute left-3 top-3 text-gray-400" />
                                <textarea 
                                    value={spec.specsDescription}
                                    onChange={(e) => updateSpec(spec.id, 'specsDescription', e.target.value)}
                                    rows={2}
                                    placeholder="Enter specific fit notes..."
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded text-[#37352F] text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
