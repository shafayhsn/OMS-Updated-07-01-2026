
import React, { useState, useMemo } from 'react';
import { 
  Palette, AlertTriangle, CheckCircle2, 
  RefreshCw, X, Box, ImageIcon, Info, Target
} from 'lucide-react';
import { JobBatch, WorkOrderRequest, EmbellishmentRecord } from '../types';

interface EmbellishmentPlanGeneratorProps {
  job: JobBatch;
  onClose: () => void;
  onIssue: (workOrderRequests: WorkOrderRequest[]) => void;
}

interface ConsolidatedEmb {
    key: string; // ArtworkId-Type-Location
    record: EmbellishmentRecord;
    baseRequiredQty: number;
    usageBreakdown: { label: string, styleNo: string, buyer: string, qty: number }[];
}

export const EmbellishmentPlanGenerator: React.FC<EmbellishmentPlanGeneratorProps> = ({ job, onClose, onIssue }) => {
  const [safetyBufferPct, setSafetyBufferPct] = useState<Record<string, number>>({});
  const [isIssuing, setIsIssuing] = useState(false);

  // --- CONSOLIDATION LOGIC ---
  const consolidatedItems: ConsolidatedEmb[] = useMemo(() => {
      const map = new Map<string, ConsolidatedEmb>();

      job.styles.forEach(style => {
          style.embellishments?.forEach(emb => {
              const key = `${emb.artworkId}-${emb.type}-${emb.location}`;
              
              let totalForStyle = 0;
              const styleBreakdown: { label: string, styleNo: string, buyer: string, qty: number }[] = [];

              if (emb.usageRule === 'Generic') {
                  totalForStyle = style.quantity;
                  styleBreakdown.push({ label: 'All Units', styleNo: style.styleNo, buyer: style.buyer, qty: style.quantity });
              } else if (emb.usageRule === 'By Size Group') {
                  style.sizeGroups?.forEach(sg => {
                      const groupQty: number = (Object.values(sg.breakdown) as Record<string, string>[]).reduce<number>((s, row) => {
                          const rowSum = (Object.values(row) as string[]).reduce<number>((ss, q) => ss + (Number(q) || 0), 0);
                          return s + rowSum;
                      }, 0);
                      if (groupQty > 0) {
                          totalForStyle += groupQty;
                          styleBreakdown.push({ label: `Group: ${sg.groupName}`, styleNo: style.styleNo, buyer: style.buyer, qty: groupQty });
                      }
                  });
              } else if (emb.usageRule === 'By Individual Sizes') {
                  const sizeQtys: Record<string, number> = {};
                  style.sizeGroups?.forEach(sg => {
                      Object.values(sg.breakdown).forEach(row => {
                          Object.entries(row).forEach(([sz, q]) => sizeQtys[sz] = (sizeQtys[sz] || 0) + (Number(q) || 0));
                      });
                  });
                  Object.keys(emb.dimensionsData).forEach(sz => {
                      if (sizeQtys[sz]) {
                          totalForStyle += sizeQtys[sz];
                          styleBreakdown.push({ label: `Size: ${sz}`, styleNo: style.styleNo, buyer: style.buyer, qty: sizeQtys[sz] });
                      }
                  });
              }

              if (map.has(key)) {
                  const existing = map.get(key)!;
                  existing.baseRequiredQty += totalForStyle;
                  existing.usageBreakdown.push(...styleBreakdown);
              } else {
                  map.set(key, {
                      key,
                      record: emb,
                      baseRequiredQty: totalForStyle,
                      usageBreakdown: styleBreakdown
                  });
              }
          });
      });

      return Array.from(map.values());
  }, [job]);

  const handleBufferChange = (key: string, val: string) => {
      setSafetyBufferPct(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const handleIssuePlan = () => {
      setIsIssuing(true);
      const requests: WorkOrderRequest[] = consolidatedItems.map(item => {
          const buffer = safetyBufferPct[item.key] || 0;
          const finalQty = Math.ceil(item.baseRequiredQty * (1 + buffer / 100));
          
          return {
              id: `REQ-EMB-${Date.now()}-${Math.floor(Math.random()*1000)}`,
              jobId: job.id,
              serviceName: `${item.record.type}: ${item.record.artworkId}`,
              qty: finalQty,
              unit: 'pcs',
              status: 'Pending',
              dateRequested: new Date().toISOString().split('T')[0],
              targetDate: job.exFactoryDate,
              specs: `Loc: ${item.record.location} | Colors: ${item.record.colorInfo}`,
              stage: 'Embellishment',
              breakdown: item.usageBreakdown.map(u => `${u.styleNo}: ${u.qty}`).join(', ')
          };
      });

      setTimeout(() => {
          onIssue(requests);
          setIsIssuing(false);
      }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center shrink-0">
           <div>
              <div className="flex items-center gap-2">
                 <Palette size={20} className="text-purple-600" />
                 <h2 className="text-lg font-bold text-[#37352F]">Embellishment Production Plan</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">Consolidated artwork execution for Job: <span className="font-mono font-bold">{job.id}</span></p>
           </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
           {consolidatedItems.length > 0 ? (
               <div className="space-y-6">
                   {consolidatedItems.map(item => {
                       const buffer = safetyBufferPct[item.key] || 0;
                       const finalQty = Math.ceil(item.baseRequiredQty * (1 + buffer / 100));
                       
                       return (
                           <div key={item.key} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row">
                               {/* Artwork Preview */}
                               <div className="w-full md:w-48 bg-gray-100 border-r border-gray-200 flex items-center justify-center p-4">
                                   {item.record.artworkFile ? (
                                       <img src={item.record.artworkFile} alt="Artwork" className="max-h-32 object-contain rounded shadow-sm" />
                                   ) : (
                                       <div className="flex flex-col items-center text-gray-300 gap-1">
                                           <ImageIcon size={32} />
                                           <span className="text-[10px] font-bold">No Visual</span>
                                       </div>
                                   )}
                               </div>

                               <div className="flex-1 p-5 space-y-4">
                                   <div className="flex justify-between items-start">
                                       <div>
                                           <h3 className="font-bold text-lg text-[#37352F]">{item.record.type}</h3>
                                           <div className="flex gap-4 mt-1 text-xs text-gray-500 font-medium">
                                               <span>ID: <strong className="text-gray-700 font-mono">{item.record.artworkId}</strong></span>
                                               <span>Placement: <strong className="text-gray-700">{item.record.location}</strong></span>
                                               <span>Colours: <strong className="text-gray-700">{item.record.colorInfo}</strong></span>
                                           </div>
                                       </div>
                                       <div className="flex items-center gap-4">
                                           <div className="text-right">
                                               <span className="text-[10px] font-bold text-gray-400 uppercase block">Buffer %</span>
                                               <div className="flex items-center border rounded px-2 py-1 mt-1 bg-white focus-within:ring-1 ring-purple-500">
                                                   <input type="number" min="0" value={buffer} onChange={(e) => handleBufferChange(item.key, e.target.value)} className="w-10 text-center outline-none text-sm font-bold" />
                                                   <span className="text-xs text-gray-400">%</span>
                                               </div>
                                           </div>
                                           <div className="text-right bg-purple-50 px-4 py-2 rounded-lg border border-purple-100">
                                               <span className="text-[10px] font-bold text-purple-400 uppercase block">Plan Total</span>
                                               <span className="text-xl font-bold text-purple-700 font-mono">{finalQty.toLocaleString()}</span>
                                           </div>
                                       </div>
                                   </div>

                                   <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                       <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                                           <Target size={12} /> Execution Breakdown
                                       </h4>
                                       <div className="flex flex-wrap gap-2">
                                           {item.usageBreakdown.map((u, i) => (
                                               <div key={i} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs flex items-center gap-2">
                                                   <span className="text-gray-400 font-mono">{u.styleNo}</span>
                                                   <span className="font-bold text-gray-700">{u.qty}</span>
                                                   <span className="text-[10px] text-gray-400 italic">({u.label})</span>
                                               </div>
                                           ))}
                                       </div>
                                   </div>
                               </div>
                           </div>
                       );
                   })}
               </div>
           ) : (
               <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Box size={48} className="mb-4 opacity-20" />
                  <p>No embellishments found in the style specs for this job.</p>
               </div>
           )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
           <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertTriangle size={14} className="text-purple-600" />
              <span>Issuing plan generates production tickets for internal departments or external vendors.</span>
           </div>
           <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors">Cancel</button>
              <button onClick={handleIssuePlan} disabled={consolidatedItems.length === 0 || isIssuing} className="px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50">
                 {isIssuing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                 Issue Embellishment Plan
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
