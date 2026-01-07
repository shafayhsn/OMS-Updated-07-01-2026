
import React, { useState, useMemo } from 'react';
import { 
  FlaskConical, AlertTriangle, CheckCircle2, 
  X, RefreshCw
} from 'lucide-react';
import { JobBatch } from '../types';

interface TestingPlanGeneratorProps {
  job: JobBatch;
  onClose: () => void;
  onIssue: () => void;
}

interface TestItem {
  id: string;
  category: 'Material' | 'Sample' | 'Embellishment';
  name: string;
  detail: string;
  sourceStyle: string;
}

export const TestingPlanGenerator: React.FC<TestingPlanGeneratorProps> = ({ job, onClose, onIssue }) => {
  const [isIssuing, setIsIssuing] = useState(false);

  // Consolidate all items requiring testing
  const testItems: TestItem[] = useMemo(() => {
    const items: TestItem[] = [];

    job.styles.forEach(style => {
      // 1. Check BOM Items
      style.bom?.forEach(item => {
        if (item.isTestingRequired) {
          items.push({
            id: item.id,
            category: 'Material',
            name: item.componentName || 'Unnamed Material',
            detail: `${item.processGroup} - ${item.supplierRef}`,
            sourceStyle: style.styleNo
          });
        }
      });

      // 2. Check Sampling Stages
      style.samplingDetails?.forEach(sample => {
        if (sample.isTestingRequired) {
          items.push({
            id: sample.id,
            category: 'Sample',
            name: sample.type,
            detail: `${sample.fabric} - ${sample.shade}`,
            sourceStyle: style.styleNo
          });
        }
      });

      // 3. Check Embellishments
      style.embellishments?.forEach(emb => {
        if (emb.isTestingRequired) {
          items.push({
            id: emb.id,
            category: 'Embellishment',
            name: emb.type,
            detail: `${emb.location}`,
            sourceStyle: style.styleNo
          });
        }
      });
    });

    return items;
  }, [job]);

  const handleConfirm = () => {
    setIsIssuing(true);
    setTimeout(() => {
      onIssue();
      setIsIssuing(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center">
           <div>
              <div className="flex items-center gap-2">
                 <FlaskConical size={20} className="text-purple-600" />
                 <h2 className="text-lg font-bold text-[#37352F]">Lab Testing Program</h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                 Aggregated testing requirements for Job: <span className="font-mono font-bold">{job.id}</span>
              </p>
           </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
           {testItems.length > 0 ? (
             <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-[#F7F7F5] text-xs uppercase font-bold text-gray-500">
                      <tr>
                         <th className="px-6 py-3 border-b border-gray-200">Category</th>
                         <th className="px-6 py-3 border-b border-gray-200">Item Name</th>
                         <th className="px-6 py-3 border-b border-gray-200">Details / Spec</th>
                         <th className="px-6 py-3 border-b border-gray-200">Source Style</th>
                         <th className="px-6 py-3 border-b border-gray-200 text-center">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {testItems.map(item => (
                         <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3">
                               <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold
                                  ${item.category === 'Material' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                    item.category === 'Sample' ? 'bg-green-50 text-green-700 border-green-100' : 
                                    'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                  {item.category}
                               </span>
                            </td>
                            <td className="px-6 py-3 font-medium text-[#37352F]">{item.name}</td>
                            <td className="px-6 py-3 text-gray-500 text-xs">{item.detail}</td>
                            <td className="px-6 py-3 text-gray-600 font-mono text-xs">{item.sourceStyle}</td>
                            <td className="px-6 py-3 text-center text-xs text-gray-400">Pending Lab Issue</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FlaskConical size={48} className="mb-4 opacity-20" />
                <p>No testing requirements found for this job.</p>
                <p className="text-xs mt-1">Enable "Testing Required" in the Order BOM, Sampling, or Embellishment tabs.</p>
             </div>
           )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
           <div className="flex items-center gap-2 text-xs text-gray-500">
              <AlertTriangle size={14} className="text-purple-500" />
              <span>Confirming will generate Lab Request Forms for all listed items.</span>
           </div>
           <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors">Cancel</button>
              <button 
                 onClick={handleConfirm}
                 disabled={testItems.length === 0 || isIssuing}
                 className="px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
              >
                 {isIssuing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                 Issue Testing Program
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};
