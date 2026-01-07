
import React from 'react';
import { ClipboardList, MessageSquare } from 'lucide-react';

interface PlanningTabProps {
  notes: string;
  onUpdate: (notes: string) => void;
}

export const PlanningTab: React.FC<PlanningTabProps> = ({ notes, onUpdate }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList size={18} className="text-gray-400" />
        <h2 className="text-lg font-medium text-[#37352F]">Production Planning</h2>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
         <div className="p-3 bg-white rounded-full shadow-sm">
            <MessageSquare size={24} className="text-gray-400" />
         </div>
         <div className="max-w-md space-y-1">
            <h3 className="text-sm font-bold text-gray-700">Planning & Remarks</h3>
            <p className="text-xs text-gray-500">
               Use this space to note down initial production strategies, capacity allocation requests, or special handling requirements before generating the Critical Path.
            </p>
         </div>
         
         <textarea 
            className="w-full max-w-2xl mt-4 p-4 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
            rows={6}
            placeholder="Enter planning notes here..."
            value={notes}
            onChange={(e) => onUpdate(e.target.value)}
         ></textarea>
      </div>

    </div>
  );
};
