
import React, { useState } from 'react';
import { 
  Calculator, Plus, Search, Filter, ArrowUpRight, 
  DollarSign, Calendar, FileText, X, TrendingUp 
} from 'lucide-react';
import { CostingSheetGenerator } from './CostingSheetGenerator';

interface CostingRecord {
  costingId: string;
  buyerName: string;
  styleNumber: string;
  revision: number;
  finalPrice: number;
  marginPct: number;
  dateCreated: string;
  status: 'Draft' | 'Approved' | 'Pending';
}

const MOCK_COSTING_RECORDS: CostingRecord[] = [];

export const CostingDashboard: React.FC = () => {
  const [costingRecords, setCostingRecords] = useState<CostingRecord[]>(MOCK_COSTING_RECORDS);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleNewCosting = () => {
    setIsGeneratorOpen(true);
  };

  const filteredRecords = costingRecords.filter(r => 
    r.styleNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.costingId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- RENDER TOGGLE ---
  
  if (isGeneratorOpen) {
    return <CostingSheetGenerator onBack={() => setIsGeneratorOpen(false)} />;
  }

  return (
    <div className="flex flex-col h-full space-y-6 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#37352F]">Costing Dashboard</h1>
          <p className="text-sm text-gray-500">Manage garment pre-costing, margin analysis, and price quotes.</p>
        </div>
        <button 
          onClick={handleNewCosting}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={16} /> New Costing
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-start justify-between">
           <div>
             <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg. Margin</p>
             <h3 className="text-2xl font-bold text-[#37352F] mt-1">0%</h3>
             <span className="text-xs text-gray-400 flex items-center gap-1 mt-2 font-medium">
               <TrendingUp size={12} /> No data
             </span>
           </div>
           <div className="p-2 bg-green-50 rounded-lg text-green-600">
             <ArrowUpRight size={20} />
           </div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-start justify-between">
           <div>
             <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending Approvals</p>
             <h3 className="text-2xl font-bold text-[#37352F] mt-1">0</h3>
             <span className="text-xs text-gray-400 mt-2 block">Requires Manager Review</span>
           </div>
           <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
             <FileText size={20} />
           </div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-start justify-between">
           <div>
             <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quotes Issued</p>
             <h3 className="text-2xl font-bold text-[#37352F] mt-1">0</h3>
             <span className="text-xs text-gray-400 mt-2 block">This Month</span>
           </div>
           <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
             <DollarSign size={20} />
           </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by Style, ID, or Buyer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
            />
         </div>
         <button className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-500">
            <Filter size={16} />
         </button>
      </div>

      {/* Costing Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-sm border-collapse min-w-[900px]">
             <thead className="bg-[#F7F7F5] text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200 sticky top-0 z-10">
                <tr>
                   <th className="px-6 py-4">Costing ID</th>
                   <th className="px-6 py-4">Buyer Name</th>
                   <th className="px-6 py-4">Style Number</th>
                   <th className="px-6 py-4 w-24 text-center">Rev</th>
                   <th className="px-6 py-4 text-right">Final Price ($)</th>
                   <th className="px-6 py-4 text-right">Margin (%)</th>
                   <th className="px-6 py-4">Date Created</th>
                   <th className="px-6 py-4">Status</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {filteredRecords.map(record => (
                  <tr key={record.costingId} className="group hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-mono font-medium text-gray-600">
                       {record.costingId}
                    </td>
                    <td className="px-6 py-4 font-medium text-[#37352F]">
                       {record.buyerName}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                       {record.styleNumber}
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                         {record.revision}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">
                       ${record.finalPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <span className={`text-xs font-bold px-2 py-1 rounded 
                          ${record.marginPct >= 18 ? 'bg-green-100 text-green-700' : 
                            record.marginPct >= 12 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {record.marginPct.toFixed(1)}%
                       </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 flex items-center gap-2">
                       <Calendar size={14} className="text-gray-400" />
                       {record.dateCreated}
                    </td>
                    <td className="px-6 py-4">
                       <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border
                          ${record.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                            record.status === 'Draft' ? 'bg-gray-50 text-gray-500 border-gray-200' :
                            'bg-blue-50 text-blue-600 border-blue-200'}`}>
                          {record.status}
                       </span>
                    </td>
                  </tr>
                ))}
             </tbody>
          </table>
          {filteredRecords.length === 0 && (
             <div className="p-10 text-center text-gray-400">
               No costing records found. Click "New Costing" to start.
             </div>
          )}
        </div>
      </div>

    </div>
  );
};
