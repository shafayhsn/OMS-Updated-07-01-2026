
import React, { useState, useMemo, useEffect } from 'react';
import { 
  CalendarRange, Plus, ChevronLeft, ChevronRight, 
  MapPin, Clock, Tag, X, List, Calendar as CalendarIcon, 
  CheckCircle2, AlertTriangle, Truck
} from 'lucide-react';
import { Order, JobBatch, CalendarEvent } from '../types';
import { formatAppDate } from '../constants';

interface EventsDashboardProps {
  orders: Order[];
  jobs: JobBatch[];
  customEvents: CalendarEvent[];
  onUpdateCustomEvents: (events: CalendarEvent[]) => void;
  onClose?: () => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const EventsDashboard: React.FC<EventsDashboardProps> = ({ 
  orders, jobs, customEvents, onUpdateCustomEvents, onClose 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'Calendar' | 'Table'>('Calendar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Event Form State
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
      type: 'Custom',
      color: 'bg-gray-100 text-gray-700'
  });

  // --- Data Aggregation ---
  const allEvents = useMemo(() => {
      const events: CalendarEvent[] = [];

      // 1. Order Shipments
      orders.forEach(order => {
          if (order.deliveryDate) {
              events.push({
                  id: `ship-${order.id}`,
                  title: `Shipment: ${order.styleNo}`,
                  date: order.deliveryDate,
                  type: 'Shipment',
                  color: 'bg-red-100 text-red-700',
                  context: order.buyer
              });
          }
          if (order.ppMeetingDate) {
              events.push({
                  id: `pp-${order.id}`,
                  title: `PP Meeting: ${order.styleNo}`,
                  date: order.ppMeetingDate,
                  type: 'Meeting',
                  color: 'bg-purple-100 text-purple-700',
                  context: order.buyer
              });
          }
          // CP Tasks
          order.criticalPath?.schedule.forEach(task => {
              if (task.status !== 'Complete') {
                  events.push({
                      id: `cp-${order.id}-${task.id}`,
                      title: `${task.milestone}`,
                      date: task.calculatedDueDate,
                      type: 'CP Task',
                      color: 'bg-orange-50 text-orange-700',
                      context: order.orderID
                  });
              }
          });
      });

      // 2. Job Milestones
      jobs.forEach(job => {
          if (job.exFactoryDate) {
              events.push({
                  id: `job-ex-${job.id}`,
                  title: `Job Ex-Factory`,
                  date: job.exFactoryDate,
                  type: 'Job Milestone',
                  color: 'bg-blue-100 text-blue-700',
                  context: job.id
              });
          }
      });

      // 3. Custom Events
      events.push(...customEvents);

      return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [orders, jobs, customEvents]);

  // --- Calendar Logic ---
  const daysInMonth = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const date = new Date(year, month, 1);
      const days: (Date | null)[] = []; 
      
      // Adjust to Monday start
      let firstDayIndex = date.getDay(); 
      firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

      for (let i = 0; i < firstDayIndex; i++) {
          days.push(null);
      }

      while (date.getMonth() === month) {
          days.push(new Date(date));
          date.setDate(date.getDate() + 1);
      }
      return days;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
      const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
      setCurrentDate(new Date(newDate));
  };

  const handleAddEvent = () => {
      if (!newEvent.title || !newEvent.date) return;
      const event: CalendarEvent = {
          id: `cust-${Date.now()}`,
          title: newEvent.title!,
          date: newEvent.date!,
          type: newEvent.type as any,
          color: newEvent.type === 'Meeting' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700',
          context: 'Manual',
          isCustom: true
      };
      onUpdateCustomEvents([...customEvents, event]);
      setIsModalOpen(false);
      setNewEvent({ type: 'Custom', color: 'bg-gray-100 text-gray-700' });
  };

  const deleteCustomEvent = (id: string) => {
      onUpdateCustomEvents(customEvents.filter(e => e.id !== id));
  };

  const eventsForDay = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      return allEvents.filter(e => e.date === dateStr);
  };

  const groupedEventsByMonth: Record<string, CalendarEvent[]> = useMemo(() => {
      const groups: Record<string, CalendarEvent[]> = {};
      allEvents.forEach(e => {
          const monthKey = new Date(e.date).toLocaleString('default', { month: 'long', year: 'numeric' });
          if (!groups[monthKey]) groups[monthKey] = [];
          groups[monthKey].push(e);
      });
      return groups;
  }, [allEvents]);

  return (
    <div className="flex flex-col h-full bg-white relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold text-[#37352F] flex items-center gap-2">
                   <CalendarRange size={20} /> Events & Schedule
                </h1>
                <p className="text-xs text-gray-500">Master schedule for shipments and milestones.</p>
            </div>
            
            <div className="flex items-center gap-3">
                {/* View Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('Calendar')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all
                            ${viewMode === 'Calendar' ? 'bg-white text-[#37352F] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <CalendarIcon size={14} /> Calendar
                    </button>
                    <button 
                        onClick={() => setViewMode('Table')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all
                            ${viewMode === 'Table' ? 'bg-white text-[#37352F] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <List size={14} /> List View
                    </button>
                </div>

                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#37352F] text-white rounded-md hover:bg-black transition-colors shadow-sm text-xs font-medium"
                >
                    <Plus size={14} /> New Event
                </button>

                {onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                )}
            </div>
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
            
            {viewMode === 'Calendar' && (
                <>
                    {/* Calendar Navigation */}
                    <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h2>
                        <div className="flex items-center gap-2">
                            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><ChevronLeft size={16}/></button>
                            <button onClick={() => setCurrentDate(new Date())} className="text-xs font-medium px-2 py-1 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100">Today</button>
                            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><ChevronRight size={16}/></button>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="flex-1 overflow-auto bg-white">
                        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase sticky top-0 z-10">
                            {WEEKDAYS.map(day => (
                                <div key={day} className="py-2 text-center border-r border-gray-100 last:border-r-0">{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 auto-rows-fr min-h-0">
                            {daysInMonth.map((date, idx) => {
                                if (!date) return <div key={`empty-${idx}`} className="bg-gray-50/20 border-b border-r border-gray-100 min-h-[100px]"></div>;
                                
                                const dayEvents = eventsForDay(date);
                                const isToday = new Date().toDateString() === date.toDateString();

                                return (
                                    <div key={date.toString()} className={`border-b border-r border-gray-100 p-2 min-h-[100px] transition-colors hover:bg-gray-50 group flex flex-col gap-1 ${isToday ? 'bg-blue-50/20' : ''}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                                                ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                                                {date.getDate()}
                                            </span>
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-[80px]">
                                            {dayEvents.map(event => (
                                                <div 
                                                    key={event.id}
                                                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium border truncate cursor-pointer hover:opacity-80 transition-opacity ${event.color} border-transparent`}
                                                    title={`${event.type}: ${event.title}`}
                                                >
                                                    {event.title}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {viewMode === 'Table' && (
                <div className="flex-1 overflow-auto custom-scrollbar bg-white p-6">
                    {Object.entries(groupedEventsByMonth).map(([month, events]) => (
                        <div key={month} className="mb-8">
                            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2 mb-3 sticky top-0 bg-white z-10">{month}</h3>
                            <table className="w-full text-left text-sm border-collapse">
                                <tbody className="divide-y divide-gray-100">
                                    {events.map(event => (
                                        <tr key={event.id} className="hover:bg-gray-50 group">
                                            <td className="px-3 py-3 w-32 font-mono text-gray-500 text-xs">
                                                {formatAppDate(event.date)}
                                            </td>
                                            <td className="px-3 py-3 font-medium text-[#37352F]">
                                                {event.title}
                                            </td>
                                            <td className="px-3 py-3 w-32">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${event.color}`}>
                                                    {event.type}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-gray-500 text-xs w-48 truncate">
                                                {event.context || '-'}
                                            </td>
                                            <td className="px-3 py-3 text-right w-10">
                                                {event.isCustom && (
                                                    <button 
                                                        onClick={() => deleteCustomEvent(event.id)}
                                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                    {allEvents.length === 0 && (
                        <div className="p-12 text-center text-gray-400 text-sm">No upcoming events found.</div>
                    )}
                </div>
            )}

        </div>

        {/* New Event Modal */}
        {isModalOpen && (
            <div className="absolute inset-0 z-[160] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px]">
                <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-5 space-y-4 animate-in zoom-in-95 duration-200 border border-gray-200">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <h3 className="text-sm font-bold text-[#37352F]">Add Event</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
                    </div>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Event Title</label>
                            <input 
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none" 
                                placeholder="e.g. Team Lunch"
                                value={newEvent.title || ''}
                                onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Date</label>
                            <input 
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none" 
                                value={newEvent.date || ''}
                                onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Type</label>
                            <select 
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white outline-none"
                                value={newEvent.type}
                                onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
                            >
                                <option value="Custom">General Reminder</option>
                                <option value="Meeting">Meeting</option>
                                <option value="Deadline">Deadline</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button onClick={handleAddEvent} className="px-4 py-2 text-xs bg-[#37352F] text-white rounded hover:bg-black font-bold">Save Event</button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};
