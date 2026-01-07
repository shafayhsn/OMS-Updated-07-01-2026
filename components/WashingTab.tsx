import React, { useState, useEffect } from 'react';
import { Upload, X, Droplets, Image as ImageIcon, FileText, CheckCircle2 } from 'lucide-react';
import { ColorRow, WashingData } from '../types';

interface WashingTabProps {
  colors: ColorRow[];
  data: Record<string, WashingData>;
  onUpdate: (data: Record<string, WashingData>) => void;
}

export const WashingTab: React.FC<WashingTabProps> = ({ colors, data, onUpdate }) => {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  useEffect(() => {
    if (colors.length > 0 && !selectedColorId) {
      setSelectedColorId(colors[0].id);
    }
  }, [colors, selectedColorId]);

  // Helper to get data for current color or default
  const getCurrentData = (id: string): WashingData => {
    return data[id] || {
      washPictureRef: null,
      washName: '',
      washRecipeNotes: '',
      isApproved: false
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!selectedColorId) return;
    const { name, value } = e.target;
    
    onUpdate({
      ...data,
      [selectedColorId]: {
        ...getCurrentData(selectedColorId),
        [name]: value
      }
    });
  };

  const toggleApproval = () => {
    if (!selectedColorId) return;
    const current = getCurrentData(selectedColorId);
    onUpdate({
      ...data,
      [selectedColorId]: {
        ...current,
        isApproved: !current.isApproved
      }
    });
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadWashRef(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
       handleUploadWashRef(e.target.files[0]);
     }
  };

  const handleUploadWashRef = (file: File) => {
    if (!selectedColorId) return;
    onUpdate({
        ...data,
        [selectedColorId]: {
            ...getCurrentData(selectedColorId),
            washPictureRef: file.name
        }
    });
  };

  const removeFile = () => {
    if (!selectedColorId) return;
    onUpdate({
        ...data,
        [selectedColorId]: {
            ...getCurrentData(selectedColorId),
            washPictureRef: null
        }
    });
  };

  if (colors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Droplets size={48} className="mb-4 text-gray-300" />
        <p>No colors defined in General Info.</p>
        <p className="text-sm">Add colors first to define wash specifications.</p>
      </div>
    );
  }

  const currentData = selectedColorId ? getCurrentData(selectedColorId) : null;
  const selectedColorName = colors.find(c => c.id === selectedColorId)?.name || 'Unknown';

  return (
    <div className="flex h-[600px] border border-gray-200 rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Sidebar: Color List */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
           <h3 className="text-sm font-semibold text-gray-700">Select Colorway</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {colors.map(color => {
             const spec = data[color.id];
             const hasData = spec && spec.washName;
             const isApproved = spec && spec.isApproved;

             return (
              <button
                key={color.id}
                onClick={() => setSelectedColorId(color.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-all flex items-center justify-between
                  ${selectedColorId === color.id 
                    ? 'bg-white shadow-sm border border-gray-200 text-[#37352F] font-medium' 
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
              >
                <span className="truncate">{color.name}</span>
                <div className="flex items-center gap-1.5">
                   {hasData && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                   {isApproved && <CheckCircle2 size={12} className="text-green-500" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content: Wash Form for Selected Color */}
      <div className="flex-1 overflow-y-auto bg-white p-6">
        {selectedColorId && currentData ? (
          <div className="space-y-6">
             <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                   <Droplets size={18} className="text-gray-400" />
                   <h2 className="text-lg font-medium text-[#37352F]">
                     Wash Spec for <span className="text-blue-600">{selectedColorName}</span>
                   </h2>
                </div>
                <button 
                    onClick={toggleApproval}
                    title="Buyer's approval required"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-sm
                        ${currentData.isApproved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-400 border-gray-200 hover:text-green-600 hover:border-green-300'}`}
                >
                    <CheckCircle2 size={14} /> Buyer's Approval Required
                </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Reference Upload */}
                <div className="lg:col-span-1 space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    Wash Reference
                  </label>
                  
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                      relative border border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center transition-all min-h-[160px]
                      ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50'}
                      ${currentData.washPictureRef ? 'bg-white border-solid border-gray-200' : ''}
                    `}
                  >
                    {currentData.washPictureRef ? (
                      <div className="flex flex-col items-center gap-3 w-full animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                          {currentData.washPictureRef.match(/\.(jpg|jpeg|png|webp)$/i) ? 
                            <ImageIcon size={24} /> : <FileText size={24} />
                          }
                        </div>
                        <div className="space-y-0.5 max-w-full px-2">
                          <p className="text-sm font-medium text-gray-700 truncate break-all line-clamp-2">
                            {currentData.washPictureRef}
                          </p>
                          <p className="text-[10px] text-green-600 font-medium">Attached</p>
                        </div>
                        <button 
                          onClick={removeFile}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors flex items-center gap-1"
                        >
                          <X size={12} /> Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <input 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={handleFileSelect}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 text-gray-400">
                          <Upload size={18} />
                        </div>
                        <h3 className="text-sm font-medium text-gray-700">Upload Reference</h3>
                        <p className="text-[10px] text-gray-400 mt-1 mb-2 max-w-[150px]">
                          Drag & Drop Wash Standard
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Column: Details */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Wash Name / Code</label>
                    <input 
                      type="text"
                      name="washName"
                      value={currentData.washName}
                      onChange={handleInputChange}
                      placeholder="e.g. Vintage Stone Wash"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[#37352F] text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                      Recipe & Notes
                    </label>
                    <textarea 
                      name="washRecipeNotes"
                      value={currentData.washRecipeNotes}
                      onChange={handleInputChange}
                      rows={6}
                      placeholder="Enter recipe details for this specific colorway..."
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-[#37352F] text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
             Select a color to edit details
          </div>
        )}
      </div>
    </div>
  );
};
