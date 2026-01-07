
import React, { useState, useEffect } from 'react';
import { 
  Shirt, CheckCircle2, RefreshCw, X, Calendar, 
  ArrowDown, Truck, Settings
} from 'lucide-react';
import { JobBatch } from '../types';

interface ProcessPlanGeneratorProps {
  job: JobBatch;
  onClose: () => void;
  onIssue: (schedules: Record<string, { startDate: string; endDate: string }>) => void;
}

interface ProcessStep {
    id: string;
    stage: string;
    type: 'Internal' | 'External';
    vendor?: string;
    startDate: string;
    endDate: string;
    notes?: string;
}

const DEFAULT_STEPS: ProcessStep[] = [
    { id: '1', stage: 'Cutting', type: 'Internal', startDate: '', endDate: '' },
    { id: '3', stage: 'Stitching', type: 'Internal', startDate: '', endDate: '' },
    { id: '5', stage: 'Finishing', type: 'Internal', startDate: '', endDate: '' },
    { id: '6', stage: 'Packing', type: 'Internal', startDate: '', endDate: '' },
];

export const ProcessPlanGenerator: React.FC<ProcessPlanGeneratorProps> = ({ job, onClose, onIssue }) => {
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [isIssuing, setIsIssuing] = useState(false);

  // Initialize steps based on job requirements
  useEffect(() => {
      const newSteps = [...DEFAULT_STEPS];
      
      // Check for Embellishments
      const hasEmb = job.styles.some(s => s.embellishments && s.embellishments.length > 0);
      if (hasEmb) {
          // Insert after Cutting
          newSteps.splice(1, 0, { 
              id: '2', stage: 'Embellishment', type: 'External', vendor: 'Select Vendor...', startDate: '', endDate: '' 
          });
      }

      // Check for Wash
      const hasWash = job.styles.some(s => s.washing && Object.keys(s.washing).length > 0);
      if (hasWash) {
          // Insert before Finishing
          const stitchIdx = newSteps.findIndex(s => s.stage === 'Stitching');
          newSteps.splice(stitchIdx + 1, 0, { 
              id: '4', stage: 'Washing', type: 'External', vendor: 'Select Vendor...', startDate: '', endDate: '' 
          });
      }

      setSteps(newSteps);
  }, [job]);

  const updateStep = (id: string, field: keyof ProcessStep, value: string) => {
      setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleIssue = () => {
      setIsIssuing(true);
      
      const schedules: Record<string, { startDate: string; endDate: string }> = {};
      steps.forEach(step => {
          if (step.startDate && step.endDate) {
              schedules[step.stage] = { startDate: step.startDate, endDate: step.endDate };
          }
      });

      setTimeout(() => {
          onIssue(schedules);
          setIsIssuing(false);
      }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center shrink-0">
           <div>
              <div className="flex items-center gap-2">
                 <Shirt size={20} className="text-indigo-600" />
                 <h2 className="text-lg font-bold text-[#37352F]">Process Routing & Schedule</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                 Define execution sequence for Job: <span className="font-mono font-bold">{job.id}</span>
              </p>
           </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
           <div className="max-w-3xl mx-auto space-y-4">
              
              {steps.map((step, index) => (
                 <div key={step.id} className="relative">
                    {/* Connector Line */}
                    {index < steps.length - 1 && (
                        <div className="absolute left-6 top-10 bottom-[-20px] w-0.5 bg-gray-200 z-0"></div>
                    )}

                    <div className="relative z-10 flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm
                            ${step.type === 'External' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {step.type === 'External' ? <Truck size={20} /> : <Settings size={20} />}
                        </div>

                        {/* Details */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h3 className="font-bold text-[#37352F]">{step.stage}</h3>
                                <p className="text-xs text-gray-500 mb-2">{step.type} Process</p>
                                
                                {step.type === 'External' && (
                                    <input 
                                        type="text" 
                                        value={step.vendor}
                                        onChange={(e) => updateStep(step.id, 'vendor', e.target.value)}
                                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-indigo-500 outline-none"
                                        placeholder="Vendor Name"
                                    />
                                )}
                            </div>

                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Start</label>
                                    <input 
                                        type="date" 
                                        value={step.startDate}
                                        onChange={(e) => updateStep(step.id, 'startDate', e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">End</label>
                                    <input 
                                        type="date" 
                                        value={step.endDate}
                                        onChange={(e) => updateStep(step.id, 'endDate', e.target.value)}
                                        className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {index < steps.length - 1 && (
                        <div className="flex justify-center py-1">
                            <ArrowDown size={16} className="text-gray-300" />
                        </div>
                    )}
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
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
           >
              {isIssuing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Confirm Routing
           </button>
        </div>

      </div>
    </div>
  );
};
