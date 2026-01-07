
import React, { useState, useMemo } from 'react';
import { 
  Ship, Package, FileText, CheckSquare, Plus, 
  Calendar, MapPin, Anchor, ArrowRight, Printer, 
  UploadCloud, CheckCircle2, AlertTriangle, X, Eye, 
  DollarSign, Truck, Search, Box, MoreHorizontal, Lock
} from 'lucide-react';
import { JobBatch } from '../types';

// --- Types ---

interface ExportBooking {
  id: string;
  bookingRef: string;
  carrier: string;
  vessel: string;
  etd: string;
  port: string;
  containerType: '20GP' | '40GP' | '40HQ' | 'LCL';
  containerNo: string;
  jobs: JobBatch[]; // Changed to use JobBatch directly
  status: 'BOOKED' | 'LOADED' | 'SHIPPED';
  documents: {
    plGenerated: boolean;
    ciGenerated: boolean;
    blUploaded: boolean;
    gspUploaded: boolean;
    cooUploaded: boolean;
  };
  shippedDate?: string;
}

interface ExportLogisticsControllerProps {
  jobs?: JobBatch[];
  onUpdateJob?: (job: JobBatch) => void;
}

// --- Mock Data ---

const INITIAL_BOOKINGS: ExportBooking[] = [];

// --- Sub-Components ---

const DocumentStatusBadge = ({ label, status, type }: { label: string, status: boolean, type: 'gen' | 'up' }) => (
  <div className={`flex items-center justify-between p-3 border rounded-lg ${status ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-full ${status ? 'bg-green-100 text-green-600' : 'bg-white text-gray-400 border border-gray-200'}`}>
        <FileText size={16} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-[10px] text-gray-500">{status ? (type === 'gen' ? 'Generated' : 'Uploaded') : 'Pending'}</p>
      </div>
    </div>
    {status ? (
        <CheckCircle2 size={18} className="text-green-600" />
    ) : (
        type === 'gen' ? (
            <button className="text-xs font-medium text-blue-600 hover:underline">Generate</button>
        ) : (
            <button className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
                <UploadCloud size={12} /> Upload
            </button>
        )
    )}
  </div>
);

export const ExportLogisticsController: React.FC<ExportLogisticsControllerProps> = ({ jobs = [], onUpdateJob }) => {
  const [bookings, setBookings] = useState<ExportBooking[]>(INITIAL_BOOKINGS);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  
  // UI State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  
  // Booking Form State
  const [newBookingData, setNewBookingData] = useState({
    carrier: '', vessel: '', etd: '', port: '', containerType: '40HQ', containerNo: ''
  });

  // --- Derived State ---
  const activeBooking = bookings.find(b => b.id === activeBookingId);
  const readyJobs = jobs.filter(j => j.status === 'Ready to Ship');
  
  // Calculate potential booking summary
  const selectedJobsList = jobs.filter(j => selectedJobIds.has(j.id));
  
  // Helper to calculate mock volume/weight based on qty (approx)
  const calculateMetrics = (qty: number) => {
      // Mock logic: 20 pcs per carton
      const cartons = Math.ceil(qty / 20);
      const grossWeight = cartons * 12; // 12kg per carton
      const volume = cartons * 0.05; // 0.05 cbm per carton
      return { cartons, grossWeight, volume };
  };

  const consolidationSummary = useMemo(() => {
      let units = 0;
      let cartons = 0;
      let gw = 0;
      let cbm = 0;

      selectedJobsList.forEach(j => {
          units += j.totalQty;
          const m = calculateMetrics(j.totalQty);
          cartons += m.cartons;
          gw += m.grossWeight;
          cbm += m.volume;
      });

      return { units, cartons, gw, cbm };
  }, [selectedJobsList]);

  // --- Handlers ---

  const toggleJobSelection = (id: string) => {
    const next = new Set(selectedJobIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedJobIds(next);
  };

  const handleCreateBooking = () => {
    if (selectedJobIds.size === 0) return;

    const newBooking: ExportBooking = {
      id: `BK-${Date.now().toString().slice(-6)}`,
      bookingRef: `REF-${Math.floor(Math.random() * 10000)}`,
      carrier: newBookingData.carrier,
      vessel: newBookingData.vessel,
      etd: newBookingData.etd,
      port: newBookingData.port,
      containerType: newBookingData.containerType as any,
      containerNo: newBookingData.containerNo,
      jobs: selectedJobsList,
      status: 'BOOKED',
      documents: {
        plGenerated: false,
        ciGenerated: false,
        blUploaded: false,
        gspUploaded: false,
        cooUploaded: false,
      }
    };

    setBookings([newBooking, ...bookings]);
    
    // Update Jobs Status via prop
    if (onUpdateJob) {
        selectedJobsList.forEach(j => {
            onUpdateJob({ ...j, status: 'Booked' });
        });
    }
    
    // Reset
    setIsBookingModalOpen(false);
    setSelectedJobIds(new Set());
    setNewBookingData({ carrier: '', vessel: '', etd: '', port: '', containerType: '40HQ', containerNo: '' });
    setActiveBookingId(newBooking.id);
  };

  const updateBookingStatus = (id: string, status: ExportBooking['status']) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const handleMarkShipped = (booking: ExportBooking) => {
    if (!window.confirm("Confirm Final Shipment? This will generate the Financial Invoice.")) return;

    const finalDate = new Date().toISOString().split('T')[0];
    
    // 1. Update Booking
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'SHIPPED', shippedDate: finalDate } : b));
    
    // 2. Update Jobs via prop
    if (onUpdateJob) {
        booking.jobs.forEach(j => {
            onUpdateJob({ ...j, status: 'Shipped' });
        });
    }

    // 3. Simulate Finance Link
    console.log("Creating Export Invoice...", {
       bookingRef: booking.bookingRef,
       amount: booking.jobs.reduce((acc, j) => acc + (j.totalQty * (j.styles[0]?.price || 0)), 0),
       date: finalDate
    });
    alert(`Success! Booking ${booking.bookingRef} marked as SHIPPED. Invoice generated in Finance.`);
  };

  const toggleDocument = (bookingId: string, docKey: keyof ExportBooking['documents']) => {
    setBookings(prev => prev.map(b => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        documents: { ...b.documents, [docKey]: !b.documents[docKey] }
      };
    }));
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#37352F]">Export Logistics Controller</h1>
          <p className="text-sm text-gray-500">Consolidate production jobs, manage bookings, and execute shipments.</p>
        </div>
        <div className="flex gap-2">
           <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1 border border-blue-100">
              <Package size={14} /> Ready: {readyJobs.length}
           </div>
           <div className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-bold flex items-center gap-1 border border-orange-100">
              <Ship size={14} /> Booked: {bookings.filter(b => b.status === 'BOOKED' || b.status === 'LOADED').length}
           </div>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex flex-col lg:flex-row gap-6 h-full">
         
         {/* LEFT COLUMN: Queue & List */}
         <div className="flex-1 flex flex-col gap-6">
            
            {/* 1. Shipping Queue */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[400px]">
               <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-[#37352F] text-sm flex items-center gap-2">
                     <Package size={16} className="text-gray-400" /> 
                     Ready to Ship Queue
                  </h3>
                  <button 
                    onClick={() => setIsBookingModalOpen(true)}
                    disabled={selectedJobIds.size === 0}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center gap-2
                       ${selectedJobIds.size > 0 ? 'bg-[#37352F] text-white hover:bg-black' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                     <Plus size={14} /> Consolidate ({selectedJobIds.size})
                  </button>
               </div>
               <div className="overflow-auto custom-scrollbar">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-white text-xs text-gray-500 uppercase font-semibold sticky top-0 z-10 shadow-sm">
                        <tr>
                           <th className="px-4 py-3 w-10 text-center"><CheckSquare size={14}/></th>
                           <th className="px-4 py-3">Job ID</th>
                           <th className="px-4 py-3">Style</th>
                           <th className="px-4 py-3">Buyer</th>
                           <th className="px-4 py-3 text-right">Units</th>
                           <th className="px-4 py-3 text-right">CBM (Est)</th>
                           <th className="px-4 py-3 text-right">Ship Date</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {readyJobs.map(job => {
                           const m = calculateMetrics(job.totalQty);
                           return (
                               <tr key={job.id} className={`hover:bg-gray-50 transition-colors ${selectedJobIds.has(job.id) ? 'bg-blue-50/50' : ''}`}>
                                  <td className="px-4 py-3 text-center">
                                     <input 
                                        type="checkbox" 
                                        checked={selectedJobIds.has(job.id)}
                                        onChange={() => toggleJobSelection(job.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                     />
                                  </td>
                                  <td className="px-4 py-3 font-medium text-gray-800">{job.id}</td>
                                  <td className="px-4 py-3 text-gray-600">{job.styles[0]?.styleNo}</td>
                                  <td className="px-4 py-3 text-gray-600">{job.styles[0]?.buyer}</td>
                                  <td className="px-4 py-3 text-right font-mono">{job.totalQty.toLocaleString()}</td>
                                  <td className="px-4 py-3 text-right font-mono">{m.volume.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right text-xs text-orange-600 font-bold">{job.exFactoryDate}</td>
                               </tr>
                           );
                        })}
                        {readyJobs.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-400 italic">No jobs ready for shipping. Finish packing in Production first.</td></tr>}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* 2. Active Bookings List */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1">
               <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-bold text-[#37352F] text-sm flex items-center gap-2">
                     <Ship size={16} className="text-gray-400" /> 
                     Active Bookings
                  </h3>
               </div>
               <div className="divide-y divide-gray-100 overflow-y-auto max-h-[400px]">
                  {bookings.map(booking => (
                     <div 
                        key={booking.id} 
                        onClick={() => setActiveBookingId(booking.id)}
                        className={`p-4 cursor-pointer transition-all hover:bg-gray-50 flex justify-between items-center
                           ${activeBookingId === booking.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
                     >
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-[#37352F]">{booking.bookingRef}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                 booking.status === 'SHIPPED' ? 'bg-green-100 text-green-700 border-green-200' : 
                                 booking.status === 'LOADED' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                 'bg-blue-100 text-blue-700 border-blue-200'
                              }`}>
                                 {booking.status}
                              </span>
                           </div>
                           <div className="text-xs text-gray-500 flex gap-3">
                              <span className="flex items-center gap-1"><Anchor size={10}/> {booking.port}</span>
                              <span className="flex items-center gap-1"><Calendar size={10}/> ETD: {booking.etd}</span>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-xs font-bold text-gray-700">{booking.jobs.length} Jobs</div>
                           <div className="text-[10px] text-gray-400">{booking.carrier}</div>
                        </div>
                     </div>
                  ))}
                  {bookings.length === 0 && <div className="p-8 text-center text-gray-400 italic">No active bookings created.</div>}
               </div>
            </div>

         </div>

         {/* RIGHT COLUMN: Shipment Console (The Heart) */}
         <div className="w-full lg:w-[450px] flex flex-col gap-6">
            
            {activeBooking ? (
               <div className="bg-white border border-gray-200 rounded-xl shadow-lg flex flex-col h-full overflow-hidden animate-in slide-in-from-right-4 duration-300">
                  {/* Console Header */}
                  <div className="bg-[#37352F] text-white p-6">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                           <h2 className="text-lg font-bold">{activeBooking.bookingRef}</h2>
                           <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <MapPin size={12} /> {activeBooking.port}
                           </p>
                        </div>
                        <div className="text-right">
                           <div className="text-2xl font-bold font-mono">{activeBooking.containerNo || 'PENDING'}</div>
                           <p className="text-xs text-gray-400 uppercase">{activeBooking.containerType}</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4 text-xs border-t border-gray-600 pt-4">
                        <div>
                           <span className="text-gray-400 block">Total Qty</span>
                           <span className="font-bold">{activeBooking.jobs.reduce((a,j)=>a+j.totalQty,0).toLocaleString()} pcs</span>
                        </div>
                        <div>
                           <span className="text-gray-400 block">Est. Weight</span>
                           <span className="font-bold">
                                {activeBooking.jobs.reduce((a,j)=>a+calculateMetrics(j.totalQty).grossWeight,0).toLocaleString()} kg
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/50">
                     
                     {/* Section A: Documentation */}
                     <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">A. Documentation</h4>
                        <div className="space-y-2">
                           <div onClick={() => toggleDocument(activeBooking.id, 'plGenerated')} className="cursor-pointer">
                              <DocumentStatusBadge label="Packing List (PL)" status={activeBooking.documents.plGenerated} type="gen" />
                           </div>
                           <div onClick={() => toggleDocument(activeBooking.id, 'ciGenerated')} className="cursor-pointer">
                              <DocumentStatusBadge label="Commercial Invoice (CI)" status={activeBooking.documents.ciGenerated} type="gen" />
                           </div>
                        </div>
                     </div>

                     {/* Section B: Compliance Uploads */}
                     <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">B. Compliance & Originals</h4>
                        <div className="space-y-2">
                           <div onClick={() => toggleDocument(activeBooking.id, 'blUploaded')} className="cursor-pointer">
                              <DocumentStatusBadge label="Bill of Lading (B/L)" status={activeBooking.documents.blUploaded} type="up" />
                           </div>
                           <div onClick={() => toggleDocument(activeBooking.id, 'gspUploaded')} className="cursor-pointer">
                              <DocumentStatusBadge label="GSP Certificate" status={activeBooking.documents.gspUploaded} type="up" />
                           </div>
                           <div onClick={() => toggleDocument(activeBooking.id, 'cooUploaded')} className="cursor-pointer">
                              <DocumentStatusBadge label="Certificate of Origin" status={activeBooking.documents.cooUploaded} type="up" />
                           </div>
                        </div>
                     </div>

                     {/* Section C: Workflow Actions */}
                     <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">C. Workflow Actions</h4>
                        <div className="flex gap-2">
                           {activeBooking.status === 'BOOKED' && (
                              <button 
                                 onClick={() => updateBookingStatus(activeBooking.id, 'LOADED')}
                                 className="flex-1 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors flex items-center justify-center gap-2"
                              >
                                 <Truck size={16} /> Mark Loaded
                              </button>
                           )}
                           {activeBooking.status !== 'SHIPPED' ? (
                              <button 
                                 onClick={() => handleMarkShipped(activeBooking)}
                                 disabled={!activeBooking.documents.ciGenerated}
                                 className={`flex-1 py-3 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2
                                    ${activeBooking.documents.ciGenerated ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
                              >
                                 <Ship size={16} /> Mark SHIPPED
                              </button>
                           ) : (
                              <div className="w-full py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                                 <CheckCircle2 size={16} /> Shipment Closed
                              </div>
                           )}
                        </div>
                        {activeBooking.status !== 'SHIPPED' && !activeBooking.documents.ciGenerated && (
                           <p className="text-[10px] text-red-500 text-center flex items-center justify-center gap-1">
                              <AlertTriangle size={10} /> Commercial Invoice must be generated first.
                           </p>
                        )}
                     </div>

                  </div>
               </div>
            ) : (
               <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl border-dashed flex flex-col items-center justify-center text-center p-8">
                  <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                     <Anchor size={32} className="text-gray-300" />
                  </div>
                  <h3 className="text-gray-600 font-medium">No Booking Selected</h3>
                  <p className="text-gray-400 text-sm mt-2">Select a booking from the list or create a new one to manage logistics.</p>
               </div>
            )}

         </div>

      </div>

      {/* Booking Wizard Modal */}
      {isBookingModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-[#37352F]">Consolidate Shipment</h2>
                  <button onClick={() => setIsBookingModalOpen(false)}><X size={20} className="text-gray-400"/></button>
               </div>
               
               <div className="p-6 space-y-6">
                  {/* Summary Strip */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                     <div>
                        <span className="text-[10px] text-blue-500 font-bold uppercase block">Selected Jobs</span>
                        <span className="text-lg font-bold text-blue-800">{selectedJobIds.size}</span>
                     </div>
                     <div>
                        <span className="text-[10px] text-blue-500 font-bold uppercase block">Total Units</span>
                        <span className="text-lg font-bold text-blue-800">{consolidationSummary.units.toLocaleString()}</span>
                     </div>
                     <div>
                        <span className="text-[10px] text-blue-500 font-bold uppercase block">Est. Weight</span>
                        <span className="text-lg font-bold text-blue-800">{consolidationSummary.gw.toLocaleString()} kg</span>
                     </div>
                     <div>
                        <span className="text-[10px] text-blue-500 font-bold uppercase block">Est. Volume</span>
                        <span className="text-lg font-bold text-blue-800">{consolidationSummary.cbm.toFixed(2)} cbm</span>
                     </div>
                  </div>

                  {/* Form */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Shipping Line</label>
                        <input className="w-full px-3 py-2 border rounded text-sm" placeholder="e.g. Maersk" value={newBookingData.carrier} onChange={e => setNewBookingData({...newBookingData, carrier: e.target.value})} />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Vessel / Voyage</label>
                        <input className="w-full px-3 py-2 border rounded text-sm" placeholder="e.g. OCEAN GIANT v.001" value={newBookingData.vessel} onChange={e => setNewBookingData({...newBookingData, vessel: e.target.value})} />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Destination Port</label>
                        <input className="w-full px-3 py-2 border rounded text-sm" placeholder="e.g. Barcelona" value={newBookingData.port} onChange={e => setNewBookingData({...newBookingData, port: e.target.value})} />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">ETD (Estimated Departure)</label>
                        <input type="date" className="w-full px-3 py-2 border rounded text-sm" value={newBookingData.etd} onChange={e => setNewBookingData({...newBookingData, etd: e.target.value})} />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Container Type</label>
                        <select className="w-full px-3 py-2 border rounded text-sm bg-white" value={newBookingData.containerType} onChange={e => setNewBookingData({...newBookingData, containerType: e.target.value})}>
                           <option value="20GP">20' GP</option>
                           <option value="40GP">40' GP</option>
                           <option value="40HQ">40' HQ</option>
                           <option value="LCL">LCL (Less than Container)</option>
                        </select>
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Container Number (Optional)</label>
                        <input className="w-full px-3 py-2 border rounded text-sm" placeholder="MSKU..." value={newBookingData.containerNo} onChange={e => setNewBookingData({...newBookingData, containerNo: e.target.value})} />
                     </div>
                  </div>
               </div>

               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                  <button onClick={() => setIsBookingModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
                  <button 
                     onClick={handleCreateBooking}
                     disabled={!newBookingData.carrier || !newBookingData.port}
                     className="px-6 py-2 bg-[#37352F] text-white text-sm font-medium rounded hover:bg-black disabled:opacity-50"
                  >
                     Finalize Booking
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};
