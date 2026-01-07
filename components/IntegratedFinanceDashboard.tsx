
import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Calendar, 
  Filter, Plus, Trash2, ArrowUpRight, ArrowDownRight,
  Search, X, FileText, CheckCircle2, AlertCircle, Landmark
} from 'lucide-react';
import { 
  Bar, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart 
} from 'recharts';
import { ExportInvoice } from '../types';
import { formatAppDate } from '../constants';

// --- Global Props ---
interface IntegratedFinanceDashboardProps {
  currencyRates: {
    USD: number;
    EUR: number;
    GBP: number;
    lastUpdated: string;
  };
  exportInvoicesData?: ExportInvoice[];
}

// --- Data Models ---

interface FixedOverhead {
  id: string;
  name: string;
  amountPKR: number;
  recurrence: 'Monthly' | 'Quarterly' | 'Yearly';
  startDate: string; // YYYY-MM-DD
}

interface ManualTransaction {
  id: string;
  type: 'Income' | 'Expense';
  category: string;
  description: string;
  amountPKR: number;
  transactionDate: string; // YYYY-MM-DD
}

// Source: Supplier POs (Simulated Database)
interface SupplierPO {
  id: string;
  jobId: string;
  styleNumber: string;
  poAmount: number;
  currency: 'PKR' | 'USD' | 'EUR' | 'GBP'; 
  poIssueDate: string;
  paymentTerms: number; // Days
  supplierName: string; 
}

interface CashFlowEvent {
  id: string;
  date: string;
  type: 'Inflow' | 'Outflow';
  sourceType: 'Invoice' | 'PO' | 'Manual' | 'Overhead';
  description: string;
  amountPKR: number;
  originalAmount?: number;
  currency?: string;
  jobId?: string;
}

// --- Mock Data ---

const INITIAL_OVERHEADS: FixedOverhead[] = [];

const INITIAL_POS: SupplierPO[] = [];

const INITIAL_MANUAL: ManualTransaction[] = [];

// --- Helpers ---

const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  if(isNaN(date.getTime())) return dateStr;
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const getMonthKey = (dateStr: string): string => {
  const date = new Date(dateStr);
  if(isNaN(date.getTime())) return 'Unknown';
  return `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
};

const getWeekNumber = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return Math.ceil((day + 1) / 7);
};

export const IntegratedFinanceDashboard: React.FC<IntegratedFinanceDashboardProps> = ({ currencyRates, exportInvoicesData = [] }) => {
  const [activeTab, setActiveTab] = useState<'Projection' | 'Audit' | 'Management'>('Projection');
  
  // Data State
  const [overheads, setOverheads] = useState<FixedOverhead[]>(INITIAL_OVERHEADS);
  const [manualTransactions, setManualTransactions] = useState<ManualTransaction[]>(INITIAL_MANUAL);
  
  // Use passed prop or default empty array (though parent passes default)
  const exportInvoices = exportInvoicesData; 
  const supplierPOs = INITIAL_POS;

  // UI State
  const [selectedJobId, setSelectedJobId] = useState<string>('All');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState<Partial<ManualTransaction>>({ type: 'Expense', category: 'General' });

  // --- Calculations ---

  const cashFlowEvents: CashFlowEvent[] = useMemo(() => {
    const events: CashFlowEvent[] = [];

    // 1. Inflows from Export Invoices
    exportInvoices.forEach(inv => {
      if(!inv.shipDate) return;
      const dueDate = addDays(inv.shipDate, inv.paymentTerms);
      const rate = currencyRates[inv.currency] || 1;
      events.push({
        id: inv.id,
        date: dueDate,
        type: 'Inflow',
        sourceType: 'Invoice',
        description: `Export Inv (${inv.jobId})`,
        amountPKR: inv.invoiceAmount * rate,
        originalAmount: inv.invoiceAmount,
        currency: inv.currency,
        jobId: inv.jobId
      });
    });

    // 2. Outflows from Supplier POs
    supplierPOs.forEach(po => {
      const dueDate = addDays(po.poIssueDate, po.paymentTerms);
      let rate = 1;
      if (po.currency !== 'PKR') rate = currencyRates[po.currency as keyof typeof currencyRates] || 1;
      
      events.push({
        id: po.id,
        date: dueDate,
        type: 'Outflow',
        sourceType: 'PO',
        description: `PO: ${po.supplierName}`,
        amountPKR: po.poAmount * rate,
        originalAmount: po.poAmount,
        currency: po.currency,
        jobId: po.jobId
      });
    });

    // 3. Manual Transactions
    manualTransactions.forEach(tx => {
      events.push({
        id: tx.id,
        date: tx.transactionDate,
        type: tx.type === 'Income' ? 'Inflow' : 'Outflow',
        sourceType: 'Manual',
        description: `${tx.category}: ${tx.description}`,
        amountPKR: tx.amountPKR,
        currency: 'PKR'
      });
    });

    // 4. Overheads (Projected)
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const currentMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
      overheads.forEach(oh => {
        let shouldAdd = false;
        if (oh.recurrence === 'Monthly') shouldAdd = true;
        if (oh.recurrence === 'Quarterly' && currentMonth.getMonth() % 3 === 0) shouldAdd = true;
        if (oh.recurrence === 'Yearly' && currentMonth.getMonth() === 0) shouldAdd = true;

        if (shouldAdd) {
           events.push({
             id: `${oh.id}-${i}`,
             date: currentMonth.toISOString().split('T')[0],
             type: 'Outflow',
             sourceType: 'Overhead',
             description: oh.name,
             amountPKR: oh.amountPKR,
             currency: 'PKR'
           });
        }
      });
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [currencyRates, overheads, manualTransactions, exportInvoices, supplierPOs]);

  // Snapshots Calculation
  const snapshots = useMemo(() => {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let weekIn = 0, weekOut = 0, monthIn = 0, monthOut = 0;

    cashFlowEvents.forEach(e => {
        const d = new Date(e.date);
        
        // Month Match
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            if (e.type === 'Inflow') monthIn += e.amountPKR;
            else monthOut += e.amountPKR;
        }

        // Week Match (Simple check)
        if (getWeekNumber(d) === currentWeek && d.getFullYear() === currentYear) {
            if (e.type === 'Inflow') weekIn += e.amountPKR;
            else weekOut += e.amountPKR;
        }
    });

    return { weekIn, weekOut, monthIn, monthOut };
  }, [cashFlowEvents]);

  // Chart Data
  const chartData = useMemo(() => {
    const grouped: Record<string, { month: string, inflows: number, outflows: number, balance: number }> = {};
    
    cashFlowEvents.forEach(e => {
       const month = getMonthKey(e.date);
       if (!grouped[month]) {
         grouped[month] = { month, inflows: 0, outflows: 0, balance: 0 };
       }
       if (e.type === 'Inflow') grouped[month].inflows += e.amountPKR;
       else grouped[month].outflows += e.amountPKR;
    });

    // Sort chronologically
    const sortedMonths = Object.values(grouped).sort((a, b) => {
        return new Date(a.month).getTime() - new Date(b.month).getTime();
    });

    let runningBal = 0;
    return sortedMonths.map(m => {
        runningBal += (m.inflows - m.outflows);
        return { ...m, balance: runningBal };
    });
  }, [cashFlowEvents]);

  // Audit Data Filtering
  const auditJobs = Array.from(new Set([...exportInvoices.map(i => i.jobId), ...supplierPOs.map(p => p.jobId)]));
  const filteredInvoices = exportInvoices.filter(i => selectedJobId === 'All' || i.jobId === selectedJobId);
  const filteredPOs = supplierPOs.filter(p => selectedJobId === 'All' || p.jobId === selectedJobId);

  // --- Handlers ---

  const handleManualSubmit = () => {
    if (!manualForm.amountPKR || !manualForm.description) return;
    
    setManualTransactions(prev => [...prev, {
        id: `man-${Date.now()}`,
        type: manualForm.type as any,
        category: manualForm.category || 'General',
        description: manualForm.description || '',
        amountPKR: Number(manualForm.amountPKR),
        transactionDate: manualForm.transactionDate || new Date().toISOString().split('T')[0]
    }]);
    setIsManualModalOpen(false);
    setManualForm({ type: 'Expense', category: 'General' });
  };

  const addOverhead = (overhead: FixedOverhead) => {
      setOverheads(prev => [...prev, overhead]);
  };

  const deleteOverhead = (id: string) => {
      setOverheads(prev => prev.filter(o => o.id !== id));
  };

  // --- Render Components ---

  const SnapshotCard = ({ label, value, type }: { label: string, value: number, type: 'in' | 'out' }) => (
    <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
       <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
       <div className="flex items-center justify-between mt-2">
          <span className={`text-xl font-bold ${type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
             ₨ {value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <div className={`p-1.5 rounded-full ${type === 'in' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
             {type === 'in' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
          </div>
       </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#37352F]">Cash Flow Controller</h1>
          <p className="text-sm text-gray-500">Transactional projections based on Invoices, POs, and Manual Entries.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
           {['Projection', 'Audit', 'Management'].map((tab) => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2
                 ${activeTab === tab ? 'bg-white text-[#37352F] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               {tab}
             </button>
           ))}
        </div>
      </div>

      {/* Snapshot Cards (Always Visible) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <SnapshotCard label="This Week Incoming" value={snapshots.weekIn} type="in" />
         <SnapshotCard label="This Week Outgoing" value={snapshots.weekOut} type="out" />
         <SnapshotCard label="This Month Incoming" value={snapshots.monthIn} type="in" />
         <SnapshotCard label="This Month Outgoing" value={snapshots.monthOut} type="out" />
      </div>

      {/* TAB 1: PROJECTION */}
      {activeTab === 'Projection' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
           
           <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-80 relative">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold text-gray-700">6-Month Net Cash Flow Forecast (PKR)</h3>
                 <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> Inflows</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Outflows</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> Net Balance</div>
                 </div>
              </div>
              <ResponsiveContainer width="100%" height="90%">
                 <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} />
                    <Tooltip 
                        formatter={(value: number) => `₨ ${value.toLocaleString()}`} 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="inflows" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="outflows" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={3} dot={{r:3}} />
                 </ComposedChart>
              </ResponsiveContainer>
           </div>

           <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                 <h3 className="text-sm font-bold text-gray-700">Consolidated Transaction Ledger</h3>
                 <button 
                   onClick={() => setIsManualModalOpen(true)}
                   className="flex items-center gap-2 px-3 py-1.5 bg-[#37352F] text-white text-xs font-medium rounded hover:bg-black transition-colors"
                 >
                    <Plus size={14} /> Log Manual Transaction
                 </button>
              </div>
              <div className="overflow-auto custom-scrollbar max-h-96">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold sticky top-0 z-10">
                       <tr>
                          <th className="px-6 py-3">Due Date</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3">Source</th>
                          <th className="px-6 py-3">Description</th>
                          <th className="px-6 py-3 text-right">Source Amount</th>
                          <th className="px-6 py-3 text-right">PKR Equivalent</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {cashFlowEvents.map(e => (
                          <tr key={e.id} className="hover:bg-gray-50">
                             <td className="px-6 py-3 font-mono text-gray-600">{formatAppDate(e.date)}</td>
                             <td className="px-6 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                                   ${e.type === 'Inflow' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                   {e.type}
                                </span>
                             </td>
                             <td className="px-6 py-3 text-xs text-gray-500">{e.sourceType}</td>
                             <td className="px-6 py-3 font-medium text-gray-800">{e.description}</td>
                             <td className="px-6 py-3 text-right font-mono text-gray-500">
                                {e.originalAmount ? `${e.currency} ${e.originalAmount.toLocaleString()}` : '-'}
                             </td>
                             <td className={`px-6 py-3 text-right font-bold font-mono ${e.type === 'Inflow' ? 'text-green-700' : 'text-red-700'}`}>
                                {e.amountPKR.toLocaleString()}
                             </td>
                          </tr>
                       ))}
                       {cashFlowEvents.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No transactions recorded.</td></tr>}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* TAB 2: AUDIT */}
      {activeTab === 'Audit' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
           <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
              <Filter size={18} className="text-gray-400" />
              <label className="text-xs font-bold text-gray-500 uppercase">Filter by Job:</label>
              <select 
                value={selectedJobId} 
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
              >
                 <option value="All">All Active Jobs</option>
                 {auditJobs.map(job => <option key={job} value={job}>{job}</option>)}
              </select>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Receivables */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-[500px]">
                 <div className="px-6 py-4 border-b border-gray-200 bg-green-50/50 flex items-center gap-2">
                    <TrendingUp size={18} className="text-green-600" />
                    <h3 className="font-bold text-green-900 text-sm">Receivables (Export Invoices)</h3>
                 </div>
                 <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                          <tr>
                             <th className="px-4 py-2">Job / Style</th>
                             <th className="px-4 py-2">Invoice Amt</th>
                             <th className="px-4 py-2 text-right">PKR Equiv.</th>
                             <th className="px-4 py-2 text-right">Due Date</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {filteredInvoices.map(inv => {
                             const pkr = inv.invoiceAmount * (currencyRates[inv.currency] || 1);
                             const due = addDays(inv.shipDate, inv.paymentTerms);
                             return (
                                <tr key={inv.id}>
                                   <td className="px-4 py-3">
                                      <div className="font-bold text-xs">{inv.jobId}</div>
                                      <div className="text-xs text-gray-500">{inv.styleNumber}</div>
                                   </td>
                                   <td className="px-4 py-3 font-mono text-xs">{inv.currency} {inv.invoiceAmount.toLocaleString()}</td>
                                   <td className="px-4 py-3 text-right font-mono font-bold text-green-700">{pkr.toLocaleString()}</td>
                                   <td className="px-4 py-3 text-right text-xs text-gray-600">{formatAppDate(due)}</td>
                                </tr>
                             );
                          })}
                          {filteredInvoices.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">No invoices found.</td></tr>}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* Payables */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-[500px]">
                 <div className="px-6 py-4 border-b border-gray-200 bg-red-50/50 flex items-center gap-2">
                    <TrendingDown size={18} className="text-red-600" />
                    <h3 className="font-bold text-red-900 text-sm">Payables (Supplier POs)</h3>
                 </div>
                 <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                          <tr>
                             <th className="px-4 py-2">Supplier / Job</th>
                             <th className="px-4 py-2">PO Amt</th>
                             <th className="px-4 py-2 text-right">PKR Equiv.</th>
                             <th className="px-4 py-2 text-right">Due Date</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          {filteredPOs.map(po => {
                             let rate = 1;
                             if(po.currency !== 'PKR') rate = currencyRates[po.currency as keyof typeof currencyRates] || 1;
                             const pkr = po.poAmount * rate;
                             const due = addDays(po.poIssueDate, po.paymentTerms);
                             return (
                                <tr key={po.id}>
                                   <td className="px-4 py-3">
                                      <div className="font-bold text-xs">{po.supplierName}</div>
                                      <div className="text-xs text-gray-500">{po.jobId}</div>
                                   </td>
                                   <td className="px-4 py-3 font-mono text-xs">{po.currency} {po.poAmount.toLocaleString()}</td>
                                   <td className="px-4 py-3 text-right font-mono font-bold text-red-700">{pkr.toLocaleString()}</td>
                                   <td className="px-4 py-3 text-right text-xs text-gray-600">{formatAppDate(due)}</td>
                                </tr>
                             );
                          })}
                          {filteredPOs.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">No POs found.</td></tr>}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* TAB 3: MANAGEMENT (Overheads + Manual Log) */}
      {activeTab === 'Management' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Fixed Overheads */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
               <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <Landmark size={20} className="text-orange-600" />
                  <h2 className="text-lg font-bold text-[#37352F]">Fixed Overheads</h2>
               </div>
               
               <div className="flex-1 overflow-auto mb-4 border border-gray-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr>
                           <th className="px-3 py-2">Name</th>
                           <th className="px-3 py-2">Recurrence</th>
                           <th className="px-3 py-2 text-right">Amount (PKR)</th>
                           <th className="w-8"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {overheads.map(oh => (
                           <tr key={oh.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">{oh.name}</td>
                              <td className="px-3 py-2 text-xs text-gray-500">{oh.recurrence}</td>
                              <td className="px-3 py-2 text-right font-mono">{oh.amountPKR.toLocaleString()}</td>
                              <td className="px-3 py-2 text-center">
                                 <button onClick={() => deleteOverhead(oh.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
               <button 
                 onClick={() => {
                    const name = prompt("Enter Overhead Name");
                    if (!name) return;
                    const amount = Number(prompt("Enter Amount in PKR"));
                    if (!amount) return;
                    addOverhead({
                        id: `oh-${Date.now()}`,
                        name,
                        amountPKR: amount,
                        recurrence: 'Monthly',
                        startDate: new Date().toISOString().split('T')[0]
                    });
                 }}
                 className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700 text-sm font-medium transition-colors"
               >
                  + Add Recurring Expense
               </button>
            </div>

            {/* Manual Transaction Audit */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
               <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <FileText size={20} className="text-blue-600" />
                  <h2 className="text-lg font-bold text-[#37352F]">Manual Log Audit</h2>
               </div>
               <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr>
                           <th className="px-3 py-2">Date</th>
                           <th className="px-3 py-2">Type</th>
                           <th className="px-3 py-2">Description</th>
                           <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {manualTransactions.map(tx => (
                           <tr key={tx.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-xs text-gray-500">{formatAppDate(tx.transactionDate)}</td>
                              <td className="px-3 py-2">
                                 <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${tx.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {tx.type}
                                 </span>
                              </td>
                              <td className="px-3 py-2 truncate max-w-[150px]" title={tx.description}>{tx.description}</td>
                              <td className="px-3 py-2 text-right font-mono text-xs">{tx.amountPKR.toLocaleString()}</td>
                           </tr>
                        ))}
                        {manualTransactions.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400 text-xs">No manual records.</td></tr>}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      )}

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
               <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-[#37352F]">Log Manual Transaction</h3>
                  <button onClick={() => setIsManualModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
               </div>
               
               <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
                        <select 
                           value={manualForm.type}
                           onChange={e => setManualForm({...manualForm, type: e.target.value as any})}
                           className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white"
                        >
                           <option value="Income">Income</option>
                           <option value="Expense">Expense</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Date</label>
                        <input 
                           type="date"
                           value={manualForm.transactionDate || new Date().toISOString().split('T')[0]}
                           onChange={e => setManualForm({...manualForm, transactionDate: e.target.value})}
                           className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Amount (PKR)</label>
                     <input 
                        type="number"
                        placeholder="0.00"
                        value={manualForm.amountPKR || ''}
                        onChange={e => setManualForm({...manualForm, amountPKR: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                     />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                     <select 
                        value={manualForm.category}
                        onChange={e => setManualForm({...manualForm, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white"
                     >
                        <option value="General">General</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Salary Adjustment">Salary Adjustment</option>
                        <option value="One-Off Sale">One-Off Sale</option>
                        <option value="Misc">Misc</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                     <textarea 
                        rows={2}
                        value={manualForm.description}
                        onChange={e => setManualForm({...manualForm, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none"
                        placeholder="Details..."
                     />
                  </div>
               </div>

               <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setIsManualModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                  <button 
                     onClick={handleManualSubmit}
                     className="px-4 py-2 text-sm bg-[#37352F] text-white rounded hover:bg-black"
                  >
                     Save Entry
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};
