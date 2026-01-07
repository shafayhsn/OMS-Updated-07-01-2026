
import React, { useState } from 'react';
import { Box, CheckCircle2, RefreshCw, X, AlertTriangle, Package, Info } from 'lucide-react';
import { JobBatch } from '../types';

interface FinishingPlanGeneratorProps {
  job: JobBatch;
  onClose: () => void;
  onIssue: (updatedJob: JobBatch) => void;
}

export const FinishingPlanGenerator: React.FC<FinishingPlanGeneratorProps> = ({ job, onClose, onIssue }) => {
  const [isIssuing, setIsIssuing] = useState(false);

  const handleIssue = () => {
    setIsIssuing(true);
    // Simulate API
    setTimeout(() => {
      const updatedJob = { ...job };
      updatedJob.plans.finishing = 'Approved';
      onIssue(updatedJob);
      setIsIssuing(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center">
           <div>
              <div className="flex items-center gap-2">
                 <Box size={20} className="text-green-600" />
                 <h2 className="text-lg font-bold text-[#37352F]">Finishing & Packing Plan</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                 Approved packing models for Job: <span className="font-mono font-bold">{job.id}</span>
              </p>
           </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
           <div className="space-y-8">
              {job.styles.map((style) => (
                  <div key={style.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                          <div>
                              <h3 className="font-bold text-[#37352F]">{style.styleNo}</h3>
                              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{style.buyer}</p>
                          </div>
                          <div className="text-xs font-mono font-bold text-blue-600">
                              {style.quantity.toLocaleString()} PCS TOTAL
                          </div>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        {style.finishing?.packingList && style.finishing.packingList.length > 0 ? (
                            style.finishing.packingList.map((inst, idx) => (
                                <div key={inst.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/30 relative">
                                    <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded border border-gray-200 text-[10px] font-bold">
                                        MODEL {idx + 1}: {inst.totalAllocated} PCS
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Package size={14} className="text-gray-400" /> {inst.name}
                                    </h4>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
                                        <div className="space-y-2">
                                            <div>
                                                <span className="text-gray-400 block font-medium">Method</span>
                                                <span className="font-bold text-gray-700">{inst.method}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block font-medium">Assortment</span>
                                                <span className="font-bold text-gray-700">{inst.assortmentMethod}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div>
                                                <span className="text-gray-400 block font-medium">Polybag Spec</span>
                                                <span className="font-bold text-gray-700">{inst.polybagSpec || 'Standard'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block font-medium">Tag Placement</span>
                                                <span className="font-bold text-gray-700">{inst.tagPlacement || 'None'}</span>
                                            </div>
                                        </div>

                                        {inst.method === 'Blister Pack' ? (
                                            <div className="space-y-2 col-span-1 bg-orange-50/50 p-2 rounded border border-orange-100">
                                                <div>
                                                    <span className="text-orange-500 block font-bold text-[9px] uppercase">Blister Info</span>
                                                    <span className="font-bold text-orange-900">{inst.blisterType}</span>
                                                </div>
                                                <div className="flex gap-4">
                                                    <div>
                                                        <span className="text-orange-400 block text-[9px]">Pcs/Blister</span>
                                                        <span className="font-bold text-orange-800">{inst.pcsPerBlister}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-orange-400 block text-[9px]">Blisters/Ctn</span>
                                                        <span className="font-bold text-orange-800">{inst.blisterPerCarton}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <span className="text-gray-400 block font-medium">Pcs / Carton</span>
                                                <span className="font-bold text-gray-700">{inst.maxPiecesPerCarton || 'Bulk'}</span>
                                            </div>
                                        )}

                                        <div className="space-y-2 bg-blue-50/30 p-2 rounded border border-blue-100">
                                            <div>
                                                <span className="text-blue-500 block font-bold text-[9px] uppercase">Carton Spec</span>
                                                <span className="font-bold text-blue-900">{inst.cartonSize || 'Standard'}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="text-blue-400 block text-[9px]">Net Wt</span>
                                                    <span className="font-bold text-blue-800">{inst.cartonNetWeight}kg</span>
                                                </div>
                                                <div>
                                                    <span className="text-blue-400 block text-[9px]">Gross Wt</span>
                                                    <span className="font-bold text-blue-800">{inst.cartonGrossWeight}kg</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-gray-400 text-xs italic bg-gray-50 rounded-lg">
                                No packing models defined for this style.
                            </div>
                        )}
                      </div>
                  </div>
              ))}
           </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors">Cancel</button>
           <button 
              onClick={handleIssue}
              disabled={isIssuing}
              className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
           >
              {isIssuing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Approve Packing Plan
           </button>
        </div>
      </div>
    </div>
  );
};
