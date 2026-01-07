
import React, { useState } from 'react';
import { Calendar, Settings, AlertCircle, CheckCircle2, Circle, Calculator } from 'lucide-react';
import { CapacityInput, ScheduleTask, SampleRow } from '../types';

interface CriticalPathTabProps {
  shipDate: string;
  poDate: string;
  capacity: CapacityInput;
  schedule: ScheduleTask[];
  samplingData: SampleRow[]; // Added prop for dynamic sampling integration
  onUpdateCapacity: (data: CapacityInput) => void;
  onUpdateSchedule: (data: ScheduleTask[]) => void;
}

export const CriticalPathTab: React.FC<CriticalPathTabProps> = ({ 
  shipDate, 
  poDate,
  capacity,
  schedule,
  samplingData,
  onUpdateCapacity,
  onUpdateSchedule
}) => {
  const [isInputRequired, setIsInputRequired] = useState(schedule.length === 0);

  // Helper: Subtract days from a date string
  const subDays = (dateStr: string, days: number): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };
  
  // Helper: Add days to date string
  const addDays = (dateStr: string, days: number): string => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
  };

  const handleCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onUpdateCapacity({ ...capacity, [name]: parseInt(value) || 0 });
  };

  const generateBackwardSchedule = () => {
    if (!shipDate) {
      alert("Please set a Ship Date in the General Info tab first.");
      return;
    }

    const { totalOrderQty, finishingOutput, sewingLines, sewingOutputPerLine, cuttingOutput, fabricLeadTime } = capacity;
    
    // --- 1. Logistics ---
    const exFactoryDate = shipDate;

    // --- 2. Finishing ---
    const finishingDays = Math.ceil(totalOrderQty / finishingOutput);
    const finishEndDate = subDays(exFactoryDate, 1); // 1 day buffer before ex-factory
    const finishStartDate = subDays(finishEndDate, finishingDays);

    // --- 3. Sewing ---
    const dailySewingOutput = sewingLines * sewingOutputPerLine;
    const sewingDays = Math.ceil(totalOrderQty / dailySewingOutput);
    const sewingEndDate = subDays(finishStartDate, 0); // Feeding directly into finishing
    const sewingStartDate = subDays(sewingEndDate, sewingDays);

    // --- 4. Cutting ---
    const cuttingDays = Math.ceil(totalOrderQty / cuttingOutput);
    const cutEndDate = subDays(sewingStartDate, 2); // 2 days buffer stock before sewing starts
    const cutStartDate = subDays(cutEndDate, cuttingDays);

    // --- 5. Materials ---
    const fabricInHouseDate = subDays(cutStartDate, 3); // 3 days for relaxing/inspection
    const fabricOrderDate = subDays(fabricInHouseDate, fabricLeadTime);

    // --- 6. Dynamic Sampling (Integration) ---
    // We take the actual sampling stages defined by the user and map them to the schedule
    const samplingTasks: ScheduleTask[] = samplingData.map((sample, index) => {
        // Basic logic: If deadline exists use it, otherwise estimate based on stage type relative to cutting
        let dueDate = sample.deadline;
        if (!dueDate) {
            // Fallback logic
            if (sample.type.includes('Proto')) dueDate = poDate ? addDays(poDate, 10) : subDays(cutStartDate, 45);
            else if (sample.type.includes('Fit')) dueDate = subDays(cutStartDate, 30);
            else if (sample.type.includes('PP')) dueDate = subDays(cutStartDate, 10); // Critical: PP before cut
            else dueDate = subDays(cutStartDate, 20);
        }

        return {
            id: `sam-task-${index}`,
            processGroup: 'Sampling',
            milestone: `${sample.type} Approval`,
            leadTimeDays: 0, // Could be calculated if start dates tracked
            calculatedDueDate: dueDate,
            status: sample.status === 'Approved' ? 'Complete' : sample.status === 'In Progress' ? 'In Progress' : 'Pending',
            owner: 'Merchandiser'
        };
    });

    // If no sampling data exists, add a placeholder to warn user
    if (samplingTasks.length === 0) {
        samplingTasks.push({
            id: 'sam-warn',
            processGroup: 'Sampling',
            milestone: 'No Sampling Stages Defined',
            leadTimeDays: 0,
            calculatedDueDate: subDays(cutStartDate, 10),
            status: 'At Risk',
            owner: 'Merchandiser'
        });
    }

    const newSchedule: ScheduleTask[] = [
      // Pre-Production (Dynamic)
      ...samplingTasks,
      
      // Materials
      { id: '4', processGroup: 'Materials', milestone: 'Fabric Order Placement', leadTimeDays: 0, calculatedDueDate: fabricOrderDate, status: 'Complete', owner: 'Purchasing' },
      { id: '5', processGroup: 'Materials', milestone: 'Fabric In-House (Relaxed)', leadTimeDays: fabricLeadTime, calculatedDueDate: fabricInHouseDate, status: 'Pending', owner: 'Store' },

      // Cutting
      { id: '6', processGroup: 'Cutting', milestone: 'Bulk Cutting Start', leadTimeDays: 0, calculatedDueDate: cutStartDate, status: 'Pending', owner: 'Cutting Mgr' },
      { id: '7', processGroup: 'Cutting', milestone: 'Bulk Cutting Complete', leadTimeDays: cuttingDays, calculatedDueDate: cutEndDate, status: 'Pending', owner: 'Cutting Mgr' },

      // Sewing
      { id: '8', processGroup: 'Sewing', milestone: 'Sewing Input Start', leadTimeDays: 0, calculatedDueDate: sewingStartDate, status: 'Pending', owner: 'Floor Mgr' },
      { id: '9', processGroup: 'Sewing', milestone: 'Sewing Output Complete', leadTimeDays: sewingDays, calculatedDueDate: sewingEndDate, status: 'Pending', owner: 'Floor Mgr' },

      // Finishing
      { id: '10', processGroup: 'Finishing', milestone: 'Finishing & Pack Start', leadTimeDays: 0, calculatedDueDate: finishStartDate, status: 'Pending', owner: 'Finishing Mgr' },
      { id: '11', processGroup: 'Finishing', milestone: 'Final QC Inspection', leadTimeDays: finishingDays, calculatedDueDate: finishEndDate, status: 'Pending', owner: 'QA Head' },

      // Shipping
      { id: '12', processGroup: 'Shipping', milestone: 'Ex-Factory / Handover', leadTimeDays: 0, calculatedDueDate: exFactoryDate, status: 'Pending', owner: 'Logistics' },
    ];

    // Sort schedule by date
    newSchedule.sort((a, b) => new Date(a.calculatedDueDate).getTime() - new Date(b.calculatedDueDate).getTime());

    onUpdateSchedule(newSchedule);
    setIsInputRequired(false);
  };

  const getStatusColor = (task: ScheduleTask) => {
    if (task.status === 'Complete') return 'bg-green-100 text-green-700';
    if (task.status === 'In Progress') return 'bg-blue-100 text-blue-700';
    
    // Check overdue
    const today = new Date().toISOString().split('T')[0];
    if (task.calculatedDueDate < today) {
       return 'bg-red-100 text-red-700 font-semibold'; // At Risk
    }

    return 'bg-gray-100 text-gray-500';
  };

  const groups = ['Sampling', 'Materials', 'Cutting', 'Sewing', 'Finishing', 'Shipping'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium text-[#37352F]">Critical Path Schedule</h2>
          <p className="text-sm text-gray-500">
            Backward scheduling based on capacity, ship date, and dynamic sampling stages.
          </p>
        </div>
        {!isInputRequired && (
           <button 
             onClick={() => setIsInputRequired(true)}
             className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
           >
             <Settings size={14} /> Adjust Capacity Inputs
           </button>
        )}
      </div>

      {/* Capacity Input Form */}
      {isInputRequired && (
        <div className="bg-gray-50/80 border border-gray-200 rounded-lg p-6 space-y-6 animate-in zoom-in-95 duration-200">
           <div className="flex items-center gap-2 mb-2">
              <Calculator size={18} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Capacity Parameters</h3>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                 <label className="text-xs font-medium text-gray-500">Total Order Qty</label>
                 <input type="number" name="totalOrderQty" value={capacity.totalOrderQty} onChange={handleCapacityChange} className="p-2 border rounded text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                 <label className="text-xs font-medium text-gray-500">Fabric Lead Time (Days)</label>
                 <input type="number" name="fabricLeadTime" value={capacity.fabricLeadTime} onChange={handleCapacityChange} className="p-2 border rounded text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                 <label className="text-xs font-medium text-gray-500">Cutting Output (pcs/day)</label>
                 <input type="number" name="cuttingOutput" value={capacity.cuttingOutput} onChange={handleCapacityChange} className="p-2 border rounded text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                 <label className="text-xs font-medium text-gray-500">Finishing Output (pcs/day)</label>
                 <input type="number" name="finishingOutput" value={capacity.finishingOutput} onChange={handleCapacityChange} className="p-2 border rounded text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                 <label className="text-xs font-medium text-gray-500">Allocated Sewing Lines</label>
                 <input type="number" name="sewingLines" value={capacity.sewingLines} onChange={handleCapacityChange} className="p-2 border rounded text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                 <label className="text-xs font-medium text-gray-500">Avg Output / Line (pcs)</label>
                 <input type="number" name="sewingOutputPerLine" value={capacity.sewingOutputPerLine} onChange={handleCapacityChange} className="p-2 border rounded text-sm" />
              </div>
           </div>

           <div className="flex justify-end pt-2">
              <button 
                onClick={generateBackwardSchedule}
                className="px-4 py-2 bg-[#37352F] text-white text-sm font-medium rounded hover:bg-black transition-colors shadow-sm"
              >
                Generate Schedule
              </button>
           </div>
        </div>
      )}

      {/* Results Table */}
      {!isInputRequired && schedule.length > 0 && (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
           <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-[#F7F7F5] text-xs uppercase tracking-wider text-gray-500">
                <tr>
                   <th className="px-4 py-3 border-b border-gray-200">Milestone</th>
                   <th className="px-4 py-3 border-b border-gray-200 w-32">Lead Time</th>
                   <th className="px-4 py-3 border-b border-gray-200 w-40">Due Date</th>
                   <th className="px-4 py-3 border-b border-gray-200 w-32">Status</th>
                   <th className="px-4 py-3 border-b border-gray-200 w-32">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups.map(group => {
                   const groupTasks = schedule.filter(t => t.processGroup === group);
                   if (groupTasks.length === 0) return null;

                   return (
                     <React.Fragment key={group}>
                        {/* Process Group Header */}
                        <tr className="bg-gray-50/80">
                           <td colSpan={5} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide border-t border-b border-gray-200/50">
                              {group} Phase
                           </td>
                        </tr>
                        {/* Tasks */}
                        {groupTasks.map(task => {
                           // Check risk for row styling
                           const today = new Date().toISOString().split('T')[0];
                           const isOverdue = task.calculatedDueDate < today && task.status !== 'Complete';
                           
                           return (
                             <tr key={task.id} className={`hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}>
                               <td className="px-4 py-3 font-medium text-[#37352F]">
                                  <div className="flex items-center gap-2">
                                     {isOverdue && <AlertCircle size={14} className="text-red-500" />}
                                     {task.status === 'Complete' && <CheckCircle2 size={14} className="text-green-500" />}
                                     {task.status === 'Pending' && <Circle size={14} className="text-gray-300" />}
                                     {task.milestone}
                                  </div>
                               </td>
                               <td className="px-4 py-3 text-gray-500">
                                 {task.leadTimeDays > 0 ? `${task.leadTimeDays} days` : '-'}
                               </td>
                               <td className="px-4 py-3 font-mono text-gray-700">
                                  {task.calculatedDueDate}
                               </td>
                               <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${getStatusColor(task)}`}>
                                     {isOverdue ? 'At Risk' : task.status}
                                  </span>
                               </td>
                               <td className="px-4 py-3 text-gray-500 text-xs">
                                  {task.owner}
                               </td>
                             </tr>
                           );
                        })}
                     </React.Fragment>
                   );
                })}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
};
