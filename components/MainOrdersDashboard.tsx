
import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, AlertTriangle, CheckCircle2, Clock, 
  Plus, ArrowUpRight, Printer,
  Package, TrendingUp, AlertCircle, Copy, Trash2, Lock,
  ShoppingBag, ClipboardList, Hash, UploadCloud, RefreshCw,
  Layers, DollarSign, Eye, EyeOff, X, CheckSquare, Square, ChevronDown
} from 'lucide-react';
import { JobManagerDashboard } from './JobManagerDashboard';
import { BulkOrderImportStager } from './BulkOrderImportStager';
import { Order, JobBatch, ExportInvoice, Buyer, CompanyDetails } from '../types';
import { formatAppDate } from '../constants';

interface MainOrdersDashboardProps {
  orders: Order[];
  jobs: JobBatch[];
  buyers: Buyer[];
  companyDetails: CompanyDetails;
  onUpdateJobs: (jobs: JobBatch[]) => void;
  onUpdateOrder?: (order: Order) => void;
  onCreateOrder: () => void;
  onRowClick: (orderId: string) => void;
  onBulkImport: (data: { orders: Order[], invoices: ExportInvoice[] }) => void;
}

const STATUS_LIGHTS = {
  Cancelled: { color: 'bg-red-500', label: 'Cancelled' },
  Hold: { color: 'bg-yellow-500', label: 'On Hold' },
  Shipped: { color: 'bg-emerald-900', label: 'Shipped' },
  Booked: { color: 'bg-blue-500', label: 'Booked' },
  Active: { color: 'bg-green-500', label: 'Active' },
  Draft: { color: 'bg-gray-400', label: 'Draft' }
};

export const MainOrdersDashboard: React.FC<MainOrdersDashboardProps> = ({ 
  orders, jobs, buyers, companyDetails, onUpdateJobs, onUpdateOrder, onCreateOrder, onRowClick, onBulkImport
}) => {
  const [currentView, setCurrentView] = useState<'orders' | 'jobs'>('orders');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); 

  // Selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Visibility state for sensitive data
  const [isSensitiveDataVisible, setIsSensitiveDataVisible] = useState(true);
  const [isViewPasswordModalOpen, setIsViewPasswordModalOpen] = useState(false);
  const [viewPassword, setViewPassword] = useState('');
  const [viewPasswordError, setViewPasswordError] = useState('');

  // Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
  
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Penalty Modal Form State
  const [penaltyForm, setPenaltyForm] = useState<{
    status: Order['status'];
    penaltyType: Order['penaltyType'];
    penaltyValue: number;
    reason: string;
  }>({
    status: 'Active',
    penaltyType: 'Fixed',
    penaltyValue: 0,
    reason: ''
  });

  // --- Helper: Date Calculation ---
  const getDaysLeft = (dateString?: string) => {
    if (!dateString) return null;
    const target = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // --- KPI Calculations ---
  const kpis = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // This Month Range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // This Week Range (Next 7 Days)
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const totalCount = orders.length;
    const totalQty = orders.reduce((acc, o) => acc + (o.quantity || 0), 0);

    const dueMonth = orders.filter(o => {
      if (!o.deliveryDate) return false;
      const d = new Date(o.deliveryDate);
      return d >= startOfMonth && d <= endOfMonth;
    }).length;

    const dueWeek = orders.filter(o => {
      if (!o.deliveryDate) return false;
      const d = new Date(o.deliveryDate);
      return d >= today && d <= sevenDaysLater;
    }).length;

    return { totalCount, totalQty, dueMonth, dueWeek };
  }, [orders]);

  // --- Filtering Logic ---
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const s = searchTerm.toLowerCase();
      const matchesSearch = 
        (order.orderID || '').toLowerCase().includes(s) ||
        (order.styleName || '').toLowerCase().includes(s) ||
        (order.buyer || '').toLowerCase().includes(s);
      
      const matchesBuyer = buyerFilter === 'All' || order.buyer === buyerFilter;
      
      // Determine effective status for filter
      const assignedJob = jobs.find(j => j.styles.some(s => s.id === order.id));
      let effectiveStatus = order.status;
      if (order.status !== 'Hold' && order.status !== 'Cancelled') {
        if (!assignedJob) effectiveStatus = 'Draft';
        else {
          if (assignedJob.status === 'Shipped' || assignedJob.status === 'Completed') effectiveStatus = 'Shipped';
          else if (assignedJob.status === 'Booked' || assignedJob.status === 'Ready to Ship') effectiveStatus = 'Booked';
          else effectiveStatus = 'Active';
        }
      }

      const matchesStatus = statusFilter === 'All' || effectiveStatus === statusFilter;

      return matchesSearch && matchesBuyer && matchesStatus;
    });
  }, [orders, searchTerm, buyerFilter, statusFilter, jobs]);

  // --- Selection Logic ---
  const allFilteredSelected = useMemo(() => {
    return filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.has(o.id));
  }, [filteredOrders, selectedOrderIds]);

  // --- KPI Calculations for Table Footer ---
  const totalOrdersTable = filteredOrders.length;
  const totalUnitsTable = filteredOrders.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totalValueTable = filteredOrders.reduce((acc, curr) => acc + (curr.amount || (curr.price * curr.quantity)), 0);

  const uniqueBuyers = Array.from(new Set(orders.map(o => o.buyer))).sort();

  // --- Selection Handlers ---
  const toggleSelectOrder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedOrderIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOrderIds(next);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = new Set(selectedOrderIds);
    if (allFilteredSelected) {
      filteredOrders.forEach(o => next.delete(o.id));
    } else {
      filteredOrders.forEach(o => next.add(o.id));
    }
    setSelectedOrderIds(next);
  };

  const handleApplyPenalty = () => {
    if (selectedOrderIds.size === 0 || !onUpdateOrder) return;
    
    orders.forEach(order => {
      if (selectedOrderIds.has(order.id)) {
        onUpdateOrder({
          ...order,
          status: penaltyForm.status,
          penaltyType: penaltyForm.penaltyType,
          penaltyValue: penaltyForm.penaltyValue,
          statusReason: penaltyForm.reason
        });
      }
    });

    setIsPenaltyModalOpen(false);
    setPenaltyForm({ status: 'Active', penaltyType: 'Fixed', penaltyValue: 0, reason: '' });
  };

  const handlePrintTable = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Report - ${new Date().toLocaleDateString()}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background-color: #f7f7f5; text-align: left; padding: 12px 10px; border: 1px solid #e0e0e0; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
            td { padding: 10px; border: 1px solid #e0e0e0; font-size: 12px; color: #37352f; }
            .total-row { font-weight: 800; background-color: #fdfdfd; font-size: 13px; }
            .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #37352f; padding-bottom: 15px; margin-bottom: 20px; }
            .brand { font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.02em; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Nizamia</div>
              <h1 class="text-xl font-semibold mt-1">Order Management Report</h1>
              <p class="text-sm text-gray-500">Inventory Status and Purchase Orders</p>
            </div>
            <div class="text-right text-[10px] text-gray-400 font-medium uppercase tracking-widest">
              <p>Generated: ${new Date().toLocaleString()}</p>
              <p>Reference: OMS-V2-AUTO</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-8 my-8">
             <div class="p-4 border rounded">
                <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Orders</p>
                <div class="text-xl font-bold">${totalOrdersTable}</div>
             </div>
             <div class="p-4 border rounded">
                <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Quantity</p>
                <div class="text-xl font-bold">${totalUnitsTable.toLocaleString()}</div>
             </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Job Number</th>
                <th>Buyer</th>
                <th>PO#/ID</th>
                <th>Ref / Style / Desc</th>
                <th>Ship Date</th>
                <th>Merchandiser</th>
                <th class="text-right">Inv. Value</th>
                <th class="text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${filteredOrders.map(o => `
                <tr>
                  <td class="font-mono font-medium">${o.orderID || 'UNASSIGNED'}</td>
                  <td>${isSensitiveDataVisible ? o.buyer : '••••••••'}</td>
                   <td class="font-mono">
                    <div class="font-bold text-blue-700">${o.poNumber || '-'}</div>
                    <div class="text-[10px] text-gray-400">ID: ${o.id}</div>
                  </td>
                  <td>
                    <strong>${o.factoryRef || '-'}</strong><br/>
                    <span style="font-weight: 500;">${o.styleName || o.styleNo}</span><br/>
                    <em style="font-size: 10px; color: #666;">${o.styleDescription || '-'}</em>
                  </td>
                  <td>${formatAppDate(o.deliveryDate)}</td>
                  <td>${o.merchandiserName || '-'}</td>
                  <td class="text-right font-mono">${isSensitiveDataVisible ? `$${(o.amount || (o.price * o.quantity)).toLocaleString()}` : '$ ••••.••'}</td>
                  <td class="text-right font-mono font-bold">${o.quantity.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="7" class="text-right py-4">Total Outstanding Quantity</td>
                <td class="text-right py-4 font-mono">${totalUnitsTable.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="mt-20 flex justify-between">
            <div class="w-48 border-t border-black pt-2 text-[10px] font-bold uppercase text-center">Merchandiser Signature</div>
            <div class="w-48 border-t border-black pt-2 text-[10px] font-bold uppercase text-center">Authorized Approval</div>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDuplicateSelected = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedOrderIds.size === 0) return;
    alert(`Duplicating ${selectedOrderIds.size} selected orders...`);
  };

  const initiateDeleteSelected = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedOrderIds.size === 0) return;
    setDeletePassword('');
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (deletePassword === 'admin') {
        alert(`${selectedOrderIds.size} orders deleted.`);
        setSelectedOrderIds(new Set());
        setIsDeleteModalOpen(false);
    } else {
        setDeleteError('Incorrect password. Try "admin"');
    }
  };

  const handleBulkCommit = (data: { orders: Order[], invoices: ExportInvoice[] }) => {
    onBulkImport(data);
    setIsBulkImportOpen(false);
  };

  const handleToggleVisibility = () => {
    if (isSensitiveDataVisible) {
      setIsSensitiveDataVisible(false);
    } else {
      setViewPassword('');
      setViewPasswordError('');
      setIsViewPasswordModalOpen(true);
    }
  };

  const confirmViewVisibility = () => {
    if (viewPassword === 'admin') {
      setIsSensitiveDataVisible(true);
      setIsViewPasswordModalOpen(false);
    } else {
      setViewPasswordError('Incorrect password.');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 relative">
      
      {/* Sub-Tab Navigation - Styled to match current UI */}
      <div className="flex items-center gap-8 border-b border-gray-100 px-2 shrink-0">
        <button
          onClick={() => setCurrentView('orders')}
          className={`pb-3 text-sm font-bold transition-all flex items-center gap-2.5 
            ${currentView === 'orders' ? 'border-b-2 border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <ShoppingBag size={18} /> Purchase Orders
        </button>
        <button
          onClick={() => setCurrentView('jobs')}
          className={`pb-3 text-sm font-bold transition-all flex items-center gap-2.5 
            ${currentView === 'jobs' ? 'border-b-2 border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <ClipboardList size={18} /> Production Jobs
        </button>
      </div>

      {currentView === 'orders' ? (
        <>
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-10">
              <div>
                <h1 className="text-2xl font-bold text-[#37352F]">Order Management</h1>
                <p className="text-sm text-gray-500 mt-1">Production status and delivery tracking.</p>
              </div>

              {/* KPI Section */}
              <div className="hidden xl:flex items-center gap-3">
                 {/* Card 1: Total Orders */}
                 <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm min-w-[140px] h-[54px] flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-none">Total Orders</span>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-gray-900 leading-none">{kpis.totalCount}</span>
                        <span className="text-[10px] text-gray-500 font-bold opacity-70">({kpis.totalQty.toLocaleString()} qty)</span>
                    </div>
                 </div>

                 {/* Card 2: Due This Month */}
                 <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm min-w-[120px] h-[54px] flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-none">Due This Month</span>
                    <span className="text-xl font-bold text-indigo-600 leading-none">{kpis.dueMonth}</span>
                 </div>

                 {/* Card 3: Due This Week */}
                 <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm min-w-[120px] h-[54px] flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-none">Due This Week</span>
                    <span className="text-xl font-bold text-orange-600 leading-none">{kpis.dueWeek}</span>
                 </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button 
                onClick={handlePrintTable}
                className="p-2 bg-white border border-gray-200 text-gray-500 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                title="Print Summary"
              >
                <Printer size={20} />
              </button>
              <button 
                onClick={() => setIsBulkImportOpen(true)}
                className="p-2 bg-white border border-gray-200 text-gray-500 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                title="Import Order"
              >
                <UploadCloud size={20} />
              </button>
              
              <button 
                onClick={() => setCurrentView('jobs')}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm font-bold ml-1"
              >
                <ClipboardList size={18} /> Job Management
              </button>
              
              <button 
                onClick={onCreateOrder}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-white rounded-md hover:bg-black transition-colors shadow-sm text-sm font-bold"
              >
                <Plus size={18} /> New Order
              </button>
            </div>
          </div>

          {/* Filters Toolbar - Matches Screenshot UI */}
          <div className="bg-[#f7f7f5] p-2 rounded-xl shadow-inner border border-gray-200/50 flex flex-col md:flex-row gap-2 items-center">
            <div className="relative w-full md:w-80 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input 
                  type="text" 
                  placeholder="Search job number, style, or buyer"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 text-sm bg-transparent border-none rounded-md focus:ring-0 outline-none placeholder:text-gray-300"
                />
            </div>
            <div className="flex gap-2 ml-auto shrink-0 items-center">
                <select 
                  value={buyerFilter}
                  onChange={(e) => setBuyerFilter(e.target.value)}
                  className="px-5 py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                >
                  <option value="All">All Buyers</option>
                  {uniqueBuyers.map(b => <option key={b} value={b}>{b}</option>)}
                </select>

                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-5 py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                >
                  <option value="All">Status: All</option>
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Booked">Booked</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Hold">Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                
                <button 
                  onClick={handleToggleVisibility}
                  className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400 shadow-sm transition-colors"
                  title={isSensitiveDataVisible ? 'Hide Data' : 'View Data'}
                >
                  {isSensitiveDataVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>

                <button className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400 shadow-sm transition-colors">
                  <Filter size={20} />
                </button>

                {/* Vertical Separator */}
                <div className="w-px h-6 bg-gray-300 mx-2"></div>

                {/* Quick Actions in Filter Bar */}
                <button 
                  onClick={() => setIsPenaltyModalOpen(true)}
                  disabled={selectedOrderIds.size === 0}
                  className={`p-2.5 rounded-lg border shadow-sm transition-all
                    ${selectedOrderIds.size > 0 ? 'bg-white border-gray-200 text-orange-600 hover:bg-orange-50' : 'bg-gray-50 border-transparent text-gray-300 cursor-not-allowed'}`}
                  title="Apply Penalty / Change Status"
                >
                  <AlertTriangle size={20} />
                </button>

                <button 
                  onClick={handleDuplicateSelected}
                  disabled={selectedOrderIds.size === 0}
                  className={`p-2.5 rounded-lg border shadow-sm transition-all
                    ${selectedOrderIds.size > 0 ? 'bg-white border-gray-200 text-blue-600 hover:bg-blue-50' : 'bg-gray-50 border-transparent text-gray-300 cursor-not-allowed'}`}
                  title="Duplicate Selected"
                >
                  <Copy size={20} />
                </button>

                <button 
                  onClick={initiateDeleteSelected}
                  disabled={selectedOrderIds.size === 0}
                  className={`p-2.5 rounded-lg border shadow-sm transition-all
                    ${selectedOrderIds.size > 0 ? 'bg-white border-gray-200 text-red-600 hover:bg-red-50' : 'bg-gray-50 border-transparent text-gray-300 cursor-not-allowed'}`}
                  title="Delete Selected"
                >
                  <Trash2 size={20} />
                </button>
            </div>
          </div>

          {/* Orders Table - Fixed Layout and Re-adjusted widths */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar flex-1">
              <table className="w-full text-left text-sm border-collapse table-fixed">
                <colgroup>
                  <col className="w-12" />
                  <col className="w-16" />
                  <col className="w-44" />
                  <col className="w-36" />
                  <col className="w-32" />
                  <col className="w-64" />
                  <col className="w-36" />
                  <col className="w-36" />
                  <col className="w-40" />
                  <col className="w-24" />
                </colgroup>
                <thead className="bg-[#fbfbf9] text-[11px] font-black uppercase tracking-[0.1em] text-gray-400 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-4 w-12 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-black focus:ring-black"
                          onChange={handleSelectAll}
                          checked={allFilteredSelected}
                        />
                      </th>
                      <th className="px-3 py-4">IMAGE</th>
                      <th className="px-3 py-4">JOB / STATUS</th>
                      <th className="px-3 py-4">BUYER</th>
                      <th className="px-3 py-4">PO#/ID</th>
                      <th className="px-3 py-4">REF / STYLE / DESC</th>
                      <th className="px-3 py-4">SHIP DATE</th>
                      <th className="px-3 py-4">MERCH.</th>
                      <th className="px-3 py-4 text-right">INV. VALUE</th>
                      <th className="px-3 py-4 text-right pr-4">QTY</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredOrders.length > 0 ? (
                      <>
                        {filteredOrders.map(order => {
                          const assignedJob = jobs.find(j => j.styles.some(s => s.id === order.id));
                          const isAssigned = !!assignedJob;
                          const invValue = order.amount || (order.price * order.quantity);
                          const daysLeft = getDaysLeft(order.deliveryDate);
                          
                          // Determine light status
                          let lightConfig = STATUS_LIGHTS.Draft;
                          if (order.status === 'Cancelled') lightConfig = STATUS_LIGHTS.Cancelled;
                          else if (order.status === 'Hold') lightConfig = STATUS_LIGHTS.Hold;
                          else if (!isAssigned) lightConfig = STATUS_LIGHTS.Draft;
                          else {
                            if (assignedJob.status === 'Shipped' || assignedJob.status === 'Completed') lightConfig = STATUS_LIGHTS.Shipped;
                            else if (assignedJob.status === 'Booked' || assignedJob.status === 'Ready to Ship') lightConfig = STATUS_LIGHTS.Booked;
                            else lightConfig = STATUS_LIGHTS.Active;
                          }

                          return (
                            <tr 
                                key={order.orderID} 
                                onClick={() => onRowClick(order.orderID)}
                                className={`group hover:bg-gray-50 transition-colors cursor-pointer ${selectedOrderIds.has(order.id) ? 'bg-blue-50/40' : ''}`}
                            >
                                <td className="px-3 py-6 text-center" onClick={(e) => toggleSelectOrder(order.id, e)}>
                                  <input 
                                    type="checkbox" 
                                    checked={selectedOrderIds.has(order.id)}
                                    readOnly
                                    className="rounded border-gray-300 text-black focus:ring-black pointer-events-none"
                                  />
                                </td>
                                <td className="px-3 py-6">
                                  <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                                      {order.imageUrl ? (
                                        <img src={order.imageUrl} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                                          <Package size={22} />
                                        </div>
                                      )}
                                  </div>
                                </td>
                                <td className="px-3 py-6">
                                  <div className="flex items-center gap-3">
                                     <div 
                                        className={`w-3.5 h-3.5 rounded-full shadow-sm flex-shrink-0 border border-white ${lightConfig.color}`} 
                                        title={lightConfig.label}
                                     ></div>
                                     <div className="flex flex-col">
                                        {isAssigned ? (
                                            <span className="text-blue-700 font-bold font-mono text-sm tracking-tight truncate">{assignedJob?.id}</span>
                                        ) : (
                                            <span className="text-gray-400 italic text-xs font-medium">Unassigned</span>
                                        )}
                                        <span className="text-[9px] font-black uppercase text-gray-400 leading-none mt-1">{lightConfig.label}</span>
                                     </div>
                                  </div>
                                </td>
                                <td className="px-3 py-6 font-bold text-gray-900 uppercase text-sm tracking-tight truncate" title={order.buyer}>
                                  {isSensitiveDataVisible ? order.buyer : '••••••••'}
                                </td>
                                <td className="px-3 py-6">
                                   <div className="flex flex-col leading-tight overflow-hidden">
                                      <span className="text-blue-700 font-bold font-mono text-sm tracking-tight truncate">{order.poNumber || '-'}</span>
                                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-1 truncate">ID: {order.id}</span>
                                   </div>
                                </td>
                                <td className="px-3 py-6">
                                   <div className="flex flex-col leading-tight overflow-hidden">
                                      <span className="font-bold text-gray-900 uppercase text-sm truncate">{order.factoryRef || '-'}</span>
                                      <span className="text-sm text-gray-600 font-medium truncate">{order.styleName || order.styleNo}</span>
                                      <span className="text-[11px] text-gray-400 italic font-medium truncate mt-0.5" title={order.styleDescription}>
                                         {order.styleDescription || '-'}
                                      </span>
                                   </div>
                                </td>
                                <td className="px-3 py-6">
                                  <div className="flex flex-col leading-tight">
                                      <span className="font-mono text-sm text-gray-600">{formatAppDate(order.deliveryDate)}</span>
                                      {daysLeft !== null && (
                                          <span className={`text-[10px] font-bold mt-1 whitespace-nowrap uppercase tracking-tighter ${daysLeft < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                                              {daysLeft < 0 ? `${Math.abs(daysLeft)} days ago` : `${daysLeft} days left`}
                                          </span>
                                      )}
                                  </div>
                                </td>
                                <td className="px-3 py-6 text-gray-500 text-sm truncate" title={order.merchandiserName}>
                                  {order.merchandiserName || '-'}
                                </td>
                                <td className="px-3 py-6 text-right font-mono text-sm text-gray-600 font-medium">
                                  {isSensitiveDataVisible ? `$${invValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$ ••••.••'}
                                </td>
                                <td className="px-3 py-6 text-right pr-4 font-mono font-bold text-gray-900 text-base">
                                  {order.quantity.toLocaleString()}
                                </td>
                            </tr>
                          );
                        })}
                      </>
                    ) : (
                      <tr>
                        <td colSpan={10} className="p-32 text-center text-gray-300">
                          <div className="flex flex-col items-center gap-3">
                             <Layers size={48} className="opacity-10" />
                             <p className="font-medium">No orders found. Add a new order to get started.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer */}
            <div className="bg-gray-50/30 px-6 py-5 border-t border-gray-100 text-xs font-bold uppercase tracking-widest text-gray-400 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <span className="text-gray-900">Displaying {filteredOrders.length} active orders</span>
                <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                    <button className="hover:text-black transition-colors">Previous</button>
                    <button className="hover:text-black transition-colors">Next</button>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                      <span className="text-gray-400">Total Value:</span>
                      <span className="text-gray-900 font-mono text-sm">
                        {isSensitiveDataVisible 
                          ? `$${totalValueTable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                          : '$ •••,•••.••'}
                      </span>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="text-gray-400">Total Qty:</span>
                      <span className="text-gray-900 font-mono text-sm">
                        {totalUnitsTable.toLocaleString()}
                      </span>
                  </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="h-full">
           <JobManagerDashboard 
               availableOrders={orders} 
               jobs={jobs} 
               availableBuyers={buyers}
               companyDetails={companyDetails}
               onUpdateJobs={onUpdateJobs}
               onBack={() => setCurrentView('orders')}
           />
        </div>
      )}

      {/* Penalty / Status Modal */}
      {isPenaltyModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-sm p-8 space-y-5 border border-gray-100 animate-in zoom-in-95 overflow-hidden flex flex-col">
                <div className="px-8 py-5 border-b border-gray-100 bg-orange-50 flex justify-between items-center shrink-0 -mx-8 -mt-8 mb-6">
                    <div className="flex items-center gap-3 text-orange-700">
                        <AlertTriangle size={24} />
                        <div>
                            <h3 className="text-lg font-bold">Status & Penalty Management</h3>
                            <p className="text-[10px] uppercase font-black opacity-70">Update {selectedOrderIds.size} Selected Orders</p>
                        </div>
                    </div>
                    <button onClick={() => setIsPenaltyModalOpen(false)} className="p-2 hover:bg-orange-100 rounded-full transition-colors text-orange-400"><X size={20}/></button>
                </div>
                
                <div className="space-y-6 flex-1 overflow-y-auto">
                    {/* Status Override */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Update Lifecycle Status</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Active', 'Hold', 'Cancelled'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setPenaltyForm({...penaltyForm, status: s as any})}
                                    className={`py-3 rounded-xl border text-sm font-bold transition-all
                                        ${penaltyForm.status === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Discount / Penalty Section */}
                    <div className="pt-6 border-t border-gray-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Discount / Penalty Application</h4>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {['Fixed', 'PerPiece', 'Percentage'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setPenaltyForm({...penaltyForm, penaltyType: type as any})}
                                        className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all
                                            ${penaltyForm.penaltyType === type ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Penalty Value</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-2.5 text-gray-400 font-bold text-xs">
                                        {penaltyForm.penaltyType === 'Percentage' ? '%' : '$'}
                                    </div>
                                    <input 
                                        type="number"
                                        value={penaltyForm.penaltyValue || ''}
                                        onChange={e => setPenaltyForm({...penaltyForm, penaltyValue: parseFloat(e.target.value) || 0})}
                                        className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:border-indigo-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col justify-end">
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[10px] text-gray-500 font-medium italic">
                                    {penaltyForm.penaltyType === 'Fixed' && "Applied once as a lump sum deduction."}
                                    {penaltyForm.penaltyType === 'PerPiece' && "Deducted from unit price per item."}
                                    {penaltyForm.penaltyType === 'Percentage' && "Calculated from total PO value."}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reason Field */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Action Reason / Remark</label>
                        <textarea 
                            rows={3}
                            value={penaltyForm.reason}
                            onChange={e => setPenaltyForm({...penaltyForm, reason: e.target.value})}
                            placeholder="State why this status change or penalty is applied..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 outline-none resize-none bg-gray-50/30"
                        />
                    </div>
                </div>

                <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 -mx-8 -mb-8 mt-6">
                    <button onClick={() => setIsPenaltyModalOpen(false)} className="px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                    <button 
                        onClick={handleApplyPenalty}
                        className="px-8 py-2 bg-[#1a1a1a] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg"
                    >
                        Apply Updates
                    </button>
                </div>
             </div>
          </div>
      )}

      {/* View Sensitive Data Password Modal */}
      {isViewPasswordModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl w-full max-sm p-6 space-y-4 m-4 border border-gray-100">
            <div className="flex items-center gap-2 text-indigo-600">
              <Lock size={20} />
              <h3 className="text-lg font-bold">Authenticate View</h3>
            </div>
            <p className="text-sm text-gray-600">
              Please enter admin credentials to reveal customer names and financial data.
            </p>
            <div className="space-y-1">
              <input 
                type="password"
                autoFocus
                placeholder="••••••••"
                value={viewPassword}
                onChange={(e) => setViewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && confirmViewVisibility()}
              />
              {viewPasswordError && <p className="text-xs text-red-500 font-medium">{viewPasswordError}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setIsViewPasswordModalOpen(false)}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={confirmViewVisibility}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold"
              >
                Reveal Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-sm p-8 space-y-5 border border-gray-100">
              <div className="flex items-center gap-3 text-red-600">
                 <div className="p-2 bg-red-50 rounded-lg"><Lock size={24} /></div>
                 <h3 className="text-xl font-bold">Secure Access</h3>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Deleting selected orders is restricted. Please provide admin credentials to continue.
              </p>
              
              <input 
                type="password"
                placeholder="••••••••"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && confirmDelete()}
              />
              
              {deleteError && (
                 <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg text-center">{deleteError}</p>
              )}

              <div className="flex flex-col gap-3 pt-2">
                 <button 
                   onClick={confirmDelete}
                   className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                 >
                   Confirm Deletion
                 </button>
                 <button 
                   onClick={() => setIsDeleteModalOpen(false)}
                   className="w-full py-3 text-sm text-gray-400 font-bold hover:text-gray-600 transition-colors"
                 >
                   Cancel
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
          <BulkOrderImportStager 
             onClose={() => setIsBulkImportOpen(false)}
             onCommit={handleBulkCommit}
          />
      )}

    </div>
  );
};
