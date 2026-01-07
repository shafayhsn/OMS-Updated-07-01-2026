
import React from 'react';
import { Plus, Download, FileText, Activity, Eye, Edit2 } from 'lucide-react';
import { Order } from '../types';

interface OrdersViewProps {
  orders: Order[];
  onCreateOrder: () => void;
  onViewSummary: (order: Order) => void;
  onEditOrder: (order: Order) => void;
}

const getWeekNumber = (dateString?: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return `Week # ${Math.ceil((day + 1) / 7)}`;
};

const getDaysLeft = (dateString?: string) => {
  if (!dateString) return null;
  const target = new Date(dateString);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
};

export const OrdersView: React.FC<OrdersViewProps> = ({ orders, onCreateOrder, onViewSummary, onEditOrder }) => {
  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#37352F]">All Orders</h1>
          <p className="text-sm text-gray-500">Manage production styles, approvals, and shipment schedules.</p>
        </div>
        <button 
          onClick={onCreateOrder}
          className="flex items-center gap-2 px-4 py-2 bg-[#37352F] text-white rounded-md hover:bg-black transition-colors shadow-sm"
        >
          <Plus size={16} /> New Order
        </button>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead className="bg-[#F7F7F5] text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
              <tr>
                <th className="px-4 py-4 w-[120px]">Picture</th>
                <th className="px-4 py-4 w-[240px]">Style Information</th>
                <th className="px-4 py-4 w-[200px]">Fabric Detail</th>
                <th className="px-4 py-4 w-[140px]">PP Meeting</th>
                <th className="px-4 py-4 w-[140px]">Sourcing</th>
                <th className="px-4 py-4 w-[100px]">Approvals</th>
                <th className="px-4 py-4 w-[140px]">Current Stage</th>
                <th className="px-4 py-4 w-[160px]">Ship Date</th>
                <th className="px-4 py-4 w-[180px] text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => {
                const daysLeft = getDaysLeft(order.deliveryDate);
                const isLate = daysLeft !== null && daysLeft < 0;
                const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft < 20;

                return (
                  <tr key={order.id} className="group hover:bg-gray-50 transition-colors">
                    
                    {/* Picture */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-2">
                         <div className="w-20 h-20 bg-gray-100 rounded-md border border-gray-200 overflow-hidden relative">
                           {order.imageUrl ? (
                             <img src={order.imageUrl} alt={order.styleNo} className="w-full h-full object-cover" />
                           ) : (
                             <div className="flex items-center justify-center h-full text-gray-300">No Img</div>
                           )}
                         </div>
                         <span className="text-[10px] text-gray-400 italic cursor-pointer hover:text-blue-600">Add Tags:</span>
                      </div>
                    </td>

                    {/* Style Info */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                           <span className={`w-2 h-2 rounded-full ${order.status === 'In Production' ? 'bg-green-500' : order.status === 'Delayed' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                           <span className="text-xs font-bold text-[#37352F]">{order.factoryRef || 'No Ref'}</span>
                           <span className="text-[10px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              {order.status === 'Pending' ? 'New' : 'WIP'}
                           </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{order.buyer}</span>
                        <div className="flex flex-col">
                           <span className="text-sm text-gray-600">{order.styleName || order.styleNo}</span>
                           <span className="text-xs text-gray-400 line-clamp-2">{order.styleDescription || 'No description available'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Fabric Detail */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-[#37352F]">{order.fabricName || 'Fabric TBD'}</span>
                        <span className="text-xs text-gray-500">{order.fabricDescription || '-'}</span>
                      </div>
                    </td>

                    {/* PP Meeting */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-[#37352F]">{formatDate(order.ppMeetingDate)}</span>
                        <span className="text-xs text-gray-500">{getWeekNumber(order.ppMeetingDate)}</span>
                        {order.ppMeetingStatus && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block w-max mt-1
                            ${order.ppMeetingStatus === 'Completed' ? 'bg-green-100 text-green-700' : 
                              order.ppMeetingStatus === 'Delayed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            {order.ppMeetingStatus}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Sourcing */}
                    <td className="px-4 py-4 align-top">
                       <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-[#37352F]">{formatDate(order.sourcingDate)}</span>
                        <span className="text-xs text-gray-500">{getWeekNumber(order.sourcingDate)}</span>
                      </div>
                    </td>

                    {/* Approvals */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col items-start gap-1">
                         <span className="text-sm font-bold text-[#37352F]">
                           {order.approvalsCompleted || 0}/{order.approvalsTotal || 0}
                         </span>
                         <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full" 
                              style={{ width: `${((order.approvalsCompleted || 0) / (order.approvalsTotal || 1)) * 100}%` }}
                            ></div>
                         </div>
                      </div>
                    </td>

                    {/* Current Stage */}
                    <td className="px-4 py-4 align-top">
                       <span className="text-sm font-bold text-[#37352F]">{order.currentStage || order.status}</span>
                    </td>

                    {/* Ship Date */}
                    <td className="px-4 py-4 align-top">
                       <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-[#37352F]">{formatDate(order.deliveryDate)}</span>
                        <span className="text-xs text-gray-500">{getWeekNumber(order.deliveryDate)}</span>
                        
                        {daysLeft !== null && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium inline-block w-max mt-1
                            ${isLate ? 'bg-red-100 text-red-700' : 
                              isUrgent ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                            {isLate ? 'Overdue' : `${daysLeft} Days Left`}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Quick Actions */}
                    <td className="px-4 py-4 align-top text-right">
                       <div className="flex flex-col gap-2 items-end">
                          <button 
                            onClick={() => onEditOrder(order)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#D3E4CD] text-[#2C4A25] text-xs font-medium rounded hover:bg-[#C1D6BB] transition-colors w-full justify-center"
                          >
                            <Edit2 size={12} /> Edit PO
                          </button>
                          <button 
                            onClick={() => onViewSummary(order)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#FFE6A5] text-[#5A4510] text-xs font-medium rounded hover:bg-[#FDD880] transition-colors w-full justify-center"
                          >
                            <Eye size={12} /> View Order Summary
                          </button>
                          <button className="flex items-center gap-2 px-3 py-1.5 bg-[#BFD7ED] text-[#1C3A56] text-xs font-medium rounded hover:bg-[#A8C6E3] transition-colors w-full justify-center">
                            <Activity size={12} /> Log an Update
                          </button>
                       </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between text-xs text-gray-500">
           <span>Showing {orders.length} orders</span>
           <div className="flex gap-2">
             <span className="cursor-pointer hover:text-gray-900">Previous</span>
             <span className="cursor-pointer hover:text-gray-900">1</span>
             <span className="cursor-pointer hover:text-gray-900">Next</span>
           </div>
        </div>
      </div>
    </div>
  );
};
