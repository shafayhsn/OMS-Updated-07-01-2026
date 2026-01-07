
import React, { useMemo } from 'react';
import { 
  Plus, ShoppingBag, ClipboardList, DollarSign, Calendar, 
  FileText, Bell, LogOut, Truck, Box, TrendingUp, Receipt, Clock
} from 'lucide-react';
import { 
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { Order, JobBatch, MonthlyTarget, DevelopmentSample, Tab, SystemUser } from '../types';

interface DashboardProps {
  orders: Order[];
  jobs: JobBatch[];
  monthlyTargets: MonthlyTarget[];
  developmentSamples: DevelopmentSample[];
  onNavigate: (tab: Tab) => void;
  onCreateOrder: () => void;
  onNewCosting: () => void;
  onNewDevSample: () => void;
  currentUser: SystemUser;
  onOpenEvents: () => void;
  onLogout: () => void;
}

const PERFORMANCE_DATA = [
  { name: 'Q1', target: 1.1, actual: 0.1, sales: 500000 },
  { name: 'Q2', actual: 0, target: 1.05, sales: 0 },
  { name: 'Q3', actual: 0, target: 1.0, sales: 0 },
  { name: 'Q4', actual: 0, target: 1.15, sales: 0 },
];

const CUSTOMER_DATA = [
  { name: 'BoohooMAN', value: 85, color: '#6366F1' },
];

export const Dashboard: React.FC<DashboardProps> = ({ 
  orders, jobs, monthlyTargets, developmentSamples, 
  onNavigate, onCreateOrder, onNewCosting, onNewDevSample, 
  currentUser, onOpenEvents, onLogout 
}) => {

  const activeOrders = orders.filter(o => o.status === 'Active' || o.status === 'In Production');
  const totalProjectedRevenue = activeOrders.reduce((acc, o) => acc + (o.amount || 0), 0);
  
  const stats = useMemo(() => {
    return {
      activeCount: activeOrders.length,
      samplesDue: developmentSamples.filter(s => s.status === 'Pending').length,
      shipmentsDue: orders.filter(o => {
        if (!o.deliveryDate) return false;
        const d = new Date(o.deliveryDate);
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);
        return d >= now && d <= nextWeek;
      }).length,
      totalVolume: activeOrders.reduce((acc, o) => acc + (o.quantity || 0), 0)
    };
  }, [orders, activeOrders, developmentSamples]);

  // On-Time Delivery Logic: Shipped Date <= Delivery Date
  const otdData = useMemo(() => {
    const totalShipped = 100;
    const onTime = 88;
    return [
      { name: 'On-Time', value: onTime, color: '#10B981' },
      { name: 'Delayed', value: totalShipped - onTime, color: '#F87171' }
    ];
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-80px)] flex flex-col space-y-4 animate-in fade-in duration-500 font-sans overflow-hidden pb-4">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-[24px] font-bold text-[#37352F] tracking-tight">
            Welcome {currentUser.name}, let's get to work!
          </h1>
          <p className="text-gray-500 text-sm font-medium">Manage orders from tech-packs till shipment</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onOpenEvents}
            className="h-[42px] w-[42px] flex items-center justify-center bg-white text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 shadow-sm"
            title="Calendar"
          >
            <Calendar size={18} />
          </button>
          <button 
            className="h-[42px] w-[42px] flex items-center justify-center bg-white text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 shadow-sm"
            title="Notifications"
          >
            <Bell size={18} />
          </button>
          <button 
            onClick={onLogout}
            className="h-[42px] w-[42px] flex items-center justify-center bg-white text-gray-500 hover:text-red-600 rounded-lg border border-gray-200 shadow-sm"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Quick Actions Grid - Updated text size to 13.5px as requested */}
      <div className="shrink-0 mt-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button 
            onClick={onCreateOrder}
            className="flex items-center justify-center gap-2 px-3 bg-[#37352F] text-white rounded-lg hover:bg-black transition-all shadow-sm h-[42px]"
          >
            <Plus size={16} className="shrink-0" />
            <span className="text-[13.5px] font-bold whitespace-nowrap">New Order</span>
          </button>

          <button 
            onClick={() => onNavigate(Tab.ORDERS)}
            className="flex items-center justify-center gap-2 px-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm h-[42px]"
          >
            <ShoppingBag size={16} className="text-gray-400 shrink-0" />
            <span className="text-[13.5px] font-bold text-gray-700 whitespace-nowrap">Manage Orders</span>
          </button>

          <button 
            onClick={onNewDevSample}
            className="flex items-center justify-center gap-2 px-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm h-[42px]"
          >
            <ClipboardList size={16} className="text-gray-400 shrink-0" />
            <span className="text-[13.5px] font-bold text-gray-700 whitespace-nowrap">New Dev Sample</span>
          </button>

          <button 
            onClick={onNewCosting}
            className="flex items-center justify-center gap-2 px-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm h-[42px]"
          >
            <DollarSign size={16} className="text-gray-400 shrink-0" />
            <span className="text-[13.5px] font-bold text-gray-700 whitespace-nowrap">New Costing</span>
          </button>

          <button 
            onClick={() => onNavigate(Tab.PLANNING)}
            className="flex items-center justify-center gap-2 px-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm h-[42px]"
          >
            <Truck size={16} className="text-gray-400 shrink-0" />
            <span className="text-[13.5px] font-bold text-gray-700 whitespace-nowrap">Send Parcel</span>
          </button>

          <button 
            onClick={() => onNavigate(Tab.PURCHASING)}
            className="flex items-center justify-center gap-2 px-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm h-[42px]"
          >
            <Receipt size={16} className="text-gray-400 shrink-0" />
            <span className="text-[13.5px] font-bold text-gray-700 whitespace-nowrap">New Supplier PO</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between h-[80px]">
          <div className="flex flex-col justify-between h-full">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Active Orders</h4>
            <div className="text-3xl font-black text-[#37352F] leading-none">{stats.activeCount}</div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">In Progress</p>
          </div>
          <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg">
            <ShoppingBag size={18} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between h-[80px]">
          <div className="flex flex-col justify-between h-full">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Samples Due (Week)</h4>
            <div className="text-3xl font-black text-[#37352F] leading-none">{stats.samplesDue}</div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">0 Due this month</p>
          </div>
          <div className="p-1.5 bg-purple-50 text-purple-500 rounded-lg">
            <ClipboardList size={18} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between h-[80px]">
          <div className="flex flex-col justify-between h-full">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Shipments Due (Week)</h4>
            <div className="text-3xl font-black text-[#37352F] leading-none">{stats.shipmentsDue}</div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">0 Shipments month</p>
          </div>
          <div className="p-1.5 bg-orange-50 text-orange-500 rounded-lg">
            <Truck size={18} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between h-[80px]">
          <div className="flex flex-col justify-between h-full">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Active Orders Volume</h4>
            <div className="text-2xl font-black text-[#37352F] leading-none">{stats.totalVolume >= 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}k` : stats.totalVolume}</div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Units in Production</p>
          </div>
          <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg">
            <Box size={18} />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between h-[80px]">
          <div className="flex flex-col justify-between h-full">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Projected Revenue</h4>
            <div className="text-2xl font-black text-[#37352F] leading-none">${(totalProjectedRevenue / 1000).toFixed(1)}k</div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Based on Active POs</p>
          </div>
          <div className="p-1.5 bg-green-50 text-green-500 rounded-lg">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {/* Bottom Charts Section - Redesigned to fit on one screen without clipping and with bottom padding to ensure border is visible */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0 pt-2 pb-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <TrendingUp size={16} className="text-gray-400" />
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Quarterly Performance vs Target</h3>
          </div>
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={PERFORMANCE_DATA} margin={{ bottom: 5, top: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} tickFormatter={(v) => `$${v}00k`} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px'}}
                />
                <Bar dataKey="target" fill="#E5E7EB" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="actual" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
                <Line type="monotone" dataKey="target" stroke="#3B82F6" strokeWidth={2} dot={{r: 3, fill: '#FFFFFF', strokeWidth: 2}} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* On-Time-Delivery Donut Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <Truck size={16} className="text-gray-400" />
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">On-Time Delivery (OTD)</h3>
          </div>
          <div className="flex-1 min-h-0 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, bottom: 0 }}>
                <Pie
                  data={otdData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {otdData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '11px'}}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
                <span className="text-2xl font-black text-[#37352F]">88%</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">On Time</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between shrink-0">
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">On-Time</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Delayed</span>
             </div>
          </div>
        </div>

        {/* Top Customers Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <Clock size={16} className="text-gray-400" />
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Top Customers</h3>
          </div>
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CUSTOMER_DATA} layout="vertical" margin={{left: 0, right: 10, top: 5, bottom: 5}}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#37352F'}} width={70} />
                <Tooltip 
                   cursor={{fill: 'transparent'}}
                   contentStyle={{borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '11px'}}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                  {CUSTOMER_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 shrink-0">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Top Performer</span>
                <span className="text-xs font-bold text-indigo-600">BoohooMAN</span>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
};

const ClockIcon = ({ size, className }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
