
import React, { useState, useMemo } from 'react';
import { 
  Calendar, CheckCircle2, RefreshCw, X, AlertTriangle, 
  Shirt, ClipboardList 
} from 'lucide-react';
import { JobBatch, Order, SampleRow } from '../types';

interface SamplingPlanGeneratorProps {
  job: JobBatch;
  onClose: () => void;
  onIssue: (updatedJob: JobBatch) => void;
}

interface ConsolidatedSample {
  id: string; // Sample ID
  styleNo: string;
  type: string;
  fabric: string;
  shade: string;
  qty: string;
  deadline: string;
  status: string;
  orderId: string; // Parent order ID
}

export const SamplingPlanGenerator: React.FC<SamplingPlanGeneratorProps> = ({ job, onClose, onIssue }) => {
  const [isIssuing, setIsIssuing] = useState(false);

  // 1. Consolidate Data for Display
  const samples: ConsolidatedSample[] = useMemo(() => {
    const list: ConsolidatedSample[] = [];
    
    job.styles.forEach(style => {
        // Use existing samples from order data
        if (style.samplingDetails && style.samplingDetails.length > 0) {
            style.samplingDetails.forEach(s => {
                list.push({
                    id: s.id,
                    styleNo: style.styleNo,
                    type: s.type,
                    fabric: s.fabric,
                    shade: s.shade,
                    qty: s.quantity,
                    deadline: s.deadline || 'TBD',
                    status: s.status,
                    orderId: style.id
                });
            });
        } else {
            // Fallback if no samples defined: suggest based on stage
            list.push({
                id: `s-gen-${style.id}`,
                styleNo: style.styleNo,
                type: style.currentStage?.includes('Sample') ? style.currentStage : 'Proto Sample',
                fabric: style.fabricName || 'TBD',
                shade: 'Base',
                qty: '1',
                deadline: style.ppMeetingDate || 'TBD',
                status: 'Pending',
                orderId: style.id
            });
        }
    });
    
    return list;
  }, [job]);

  const handleIssue = () => {
      setIsIssuing(true);
      
      // Create a deep copy of the job to update
      const updatedJob = { ...job };
      
      // Update plan status
      updatedJob.plans.sampling = 'Approved';

      // Update sample statuses in the linked styles
      updatedJob.styles = updatedJob.styles.map(style => {
          let updatedSamples: SampleRow[] = [];

          if (style.samplingDetails && style.samplingDetails.length > 0) {
              // Update existing samples to 'In Progress'
              updatedSamples = style.samplingDetails.map(s => ({
                  ...s,
                  status: s.status === 'Pending' ? 'In Progress' : s.status
              }));
          } else {
              // Create default sample row if none existed (persist the suggestion)
              const defaultSample: SampleRow = {
                  id: `SAM-${Math.floor(Math.random() * 10000)}`,
                  samNumber: `SAM-${style.styleNo.substring(0, 4)}-01`,
                  type: style.currentStage?.includes('Sample') ? style.currentStage : 'Proto Sample',
                  fabric: style.fabricName || 'TBD',
                  shade: 'Base',
                  wash: 'Standard',
                  baseSize: 'M',
                  threadColor: 'Match',
                  zipperColor: 'Match',
                  lining: 'Match',
                  quantity: '1',
                  deadline: style.ppMeetingDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
                  status: 'In Progress', // Activate immediately
                  isTestingRequired: false
              };
              updatedSamples = [defaultSample];
          }

          return {
              ...style,
              samplingDetails: updatedSamples
          };
      });

      setTimeout(() => {
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
                 <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                    <Calendar size={20} />
                 </div>
                 <h2 className="text-lg font-bold text-[#37352F]">Sampling Schedule & Plan</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                 Review and issue sample requests for Job: <span className="font-mono font-bold">{job.id}</span>
              </p>
           </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
           
           <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                 <Shirt size={16} className="text-gray-400" />
                 <h3 className="text-sm font-bold text-gray-700">Consolidated Sampling Requirements</h3>
              </div>
              <table className="w-full text-left text-sm border-collapse">
                 <thead className="bg-white text-xs uppercase font-bold text-gray-500 border-b border-gray-100">
                    <tr>
                       <th className="px-6 py-3">Style No</th>
                       <th className="px-6 py-3">Sample Type</th>
                       <th className="px-6 py-3">Fabric / Shade</th>
                       <th className="px-6 py-3 text-center">Req Qty</th>
                       <th className="px-6 py-3">Target Date</th>
                       <th className="px-6 py-3">Current Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {samples.map((sample, idx) => (
                       <tr key={`${sample.id}-${idx}`} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-[#37352F]">{sample.styleNo}</td>
                          <td className="px-6 py-3">
                             <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                                {sample.type}
                             </span>
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-500">
                             {sample.fabric} <span className="text-gray-300">|</span> {sample.shade}
                          </td>
                          <td className="px-6 py-3 text-center font-mono font-medium">{sample.qty}</td>
                          <td className="px-6 py-3">
                             <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">{sample.deadline}</span>
                                {sample.deadline !== 'TBD' && new Date(sample.deadline) < new Date() && (
                                   <AlertTriangle size={12} className="text-red-500" title="Overdue based on current date" />
                                )}
                             </div>
                          </td>
                          <td className="px-6 py-3">
                             <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border
                                ${sample.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                  sample.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                {sample.status}
                             </span>
                          </td>
                       </tr>
                    ))}
                    {samples.length === 0 && (
                       <tr><td colSpan={6} className="p-8 text-center text-gray-400">No samples found for this job.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>

           <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
              <ClipboardList size={20} className="text-blue-600 mt-0.5" />
              <div>
                 <h4 className="text-sm font-bold text-blue-800">Plan Execution Note</h4>
                 <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                    Issuing this plan will generate official sample requests for all styles.
                    <br/>
                    Styles with no predefined samples will have a default <strong>Proto Sample</strong> request created automatically.
                 </p>
              </div>
           </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors">Cancel</button>
           <button 
              onClick={handleIssue}
              disabled={isIssuing}
              className="px-5 py-2 bg-pink-600 text-white text-sm font-medium rounded hover:bg-pink-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
           >
              {isIssuing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Issue Sampling Plan
           </button>
        </div>

      </div>
    </div>
  );
};
