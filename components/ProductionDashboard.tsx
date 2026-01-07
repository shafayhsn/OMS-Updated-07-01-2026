
import React from 'react';
import { Scissors, Shirt, Box, CheckCircle2, AlertTriangle, Clock, Activity } from 'lucide-react';
import { JobBatch } from '../types';

interface ProductionDashboardProps {
  jobs?: JobBatch[];
}

export const ProductionDashboard: React.FC<ProductionDashboardProps> = ({ jobs = [] }) => {
  
  // --- Cutting Department Logic ---
  const activeCuttingJobs = jobs.filter(j => j.plans.cutting === 'Approved');
  const totalCuttingTarget = activeCuttingJobs.reduce((sum, job) => {
      const daily = job.cuttingPlanDetails?.reduce((acc, d) => acc + d.dailyTarget, 0) || 0;
      return sum + daily;
  }, 0);

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#37352F]">Production Execution</h1>
          <p className="text-sm text-gray-500">Live floor status: Cutting, Sewing, Washing, and Finishing.</p>
        </div>
        <div className="flex gap-2">
           <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
              <Activity size={12} /> Floor Live
           </span>
        </div>
      </div>

      {/* Department Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Cutting Department */}
         <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-orange-50/30">
               <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                     <Scissors size={18} />
                  </div>
                  <h3 className="font-bold text-[#37352F]">Cutting Dept.</h3>
               </div>
               <span className="text-xs font-mono text-gray-500">{activeCuttingJobs.length} Active Plans</span>
            </div>
            <div className="p-5 flex-1 space-y-4">
               <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Daily Output</span>
                  <span className="font-bold text-[#37352F]">{totalCuttingTarget.toLocaleString()} pcs</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Efficiency</span>
                  <span className="font-bold text-green-600">94%</span>
               </div>
               <div className="h-px bg-gray-100 my-2"></div>
               <div className="space-y-2 overflow-y-auto max-h-32 custom-scrollbar">
                  {activeCuttingJobs.length > 0 ? (
                      activeCuttingJobs.map(job => (
                        <div key={job.id} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded border border-gray-100">
                            <span className="font-medium">{job.id}</span>
                            <span className="text-orange-600 font-bold">
                                {job.cuttingPlanDetails?.[0]?.dailyTarget.toLocaleString()} / day
                            </span>
                        </div>
                      ))
                  ) : (
                      <div className="text-xs text-gray-400 italic text-center py-2">No approved cutting plans.</div>
                  )}
               </div>
            </div>
         </div>

         {/* Sewing / Process */}
         <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/30">
               <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                     <Shirt size={18} />
                  </div>
                  <h3 className="font-bold text-[#37352F]">Sewing & Process</h3>
               </div>
               <span className="text-xs font-mono text-gray-500">5 Lines Running</span>
            </div>
            <div className="p-5 flex-1 space-y-4">
               <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Line Output (Avg)</span>
                  <span className="font-bold text-[#37352F]">650 pcs/line</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">DHU Rate</span>
                  <span className="font-bold text-red-600">4.2%</span>
               </div>
               <div className="h-px bg-gray-100 my-2"></div>
               <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded border border-gray-100">
                     <span className="font-medium">Line 01 (Denim)</span>
                     <span className="text-green-600 font-bold">On Target</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded border border-gray-100">
                     <span className="font-medium">Line 02 (Chino)</span>
                     <span className="text-red-500 font-bold">Machine Down</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Finishing */}
         <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-green-50/30">
               <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                     <Box size={18} />
                  </div>
                  <h3 className="font-bold text-[#37352F]">Finishing & Pack</h3>
               </div>
               <span className="text-xs font-mono text-gray-500">2 Shipments Due</span>
            </div>
            <div className="p-5 flex-1 space-y-4">
               <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Packed Today</span>
                  <span className="font-bold text-[#37352F]">1,200 pcs</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">QA Pass Rate</span>
                  <span className="font-bold text-green-600">98.5%</span>
               </div>
               <div className="h-px bg-gray-100 my-2"></div>
               <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded border border-gray-100">
                     <span className="font-medium">PO-BMM-98207</span>
                     <span className="text-blue-600 font-bold">Scanning...</span>
                  </div>
               </div>
            </div>
         </div>

      </div>

      {/* Production Schedule Gantt Placeholder */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex-1 flex flex-col justify-center items-center text-center space-y-3">
         <div className="bg-gray-50 p-4 rounded-full">
            <Clock size={32} className="text-gray-300" />
         </div>
         <h3 className="text-lg font-medium text-gray-700">Master Production Schedule</h3>
         <p className="text-sm text-gray-500 max-w-md">
            Detailed Gantt charts and resource loading views will appear here once enough data is collected from the Job Plans.
         </p>
      </div>

    </div>
  );
};
