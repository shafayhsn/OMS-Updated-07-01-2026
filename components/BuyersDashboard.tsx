import React, { useState } from 'react';
import { 
  Plus, Trash2, User, Users, Phone, MapPin, Search, 
  ExternalLink, CreditCard, Building, Mail, X, Filter, 
  Image as ImageIcon, CheckCircle2, ShieldAlert,
  Star, Info, Square, Briefcase, Globe, Hash, ShoppingBag
} from 'lucide-react';
import { Buyer, BuyerAddress, BuyerContact, BuyingAgency } from '../types';
import { MOCK_AGENCIES } from '../constants';

interface BuyersDashboardProps {
  buyers: Buyer[];
  onAddBuyer: (buyer: Buyer) => void;
  onDeleteBuyer: (id: string) => void;
}

export const BuyersDashboard: React.FC<BuyersDashboardProps> = ({ buyers, onAddBuyer, onDeleteBuyer }) => {
  const [activeTab, setActiveTab] = useState<'Buyers' | 'Agencies'>('Buyers');
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingBuyer, setViewingBuyer] = useState<Buyer | null>(null);

  // Management state for local agencies (to reflect added ones immediately)
  const [localAgencies, setLocalAgencies] = useState<BuyingAgency[]>(MOCK_AGENCIES);

  // Agency Form State - Only necessary fields as per request
  const [agencyForm, setAgencyForm] = useState<Partial<BuyingAgency>>({
    name: '',
    contactPerson: '',
    phone: '',
    address: '',
    linkedBuyers: [],
    activeOrdersCount: 0
  });

  // Buyer Form State
  const [buyerForm, setBuyerForm] = useState<Partial<Buyer>>({
    name: '', website: '', country: '', companyPhone: '', logoUrl: null,
    agentName: '', agentCommission: 0, paymentTerms: '', incoterms: '',
    contacts: [], addresses: []
  });

  const filteredBuyers = buyers.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAgencies = localAgencies.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAddModal = () => {
    if (activeTab === 'Buyers') {
      setBuyerForm({
        name: '', website: '', country: '', companyPhone: '',
        logoUrl: null, agentName: '', agentCommission: 0,
        paymentTerms: '', incoterms: '', 
        contacts: [{ id: `c-${Date.now()}-1`, name: '', designation: '', email: '', phone: '', department: 'Buyer', isDefault: true }],
        addresses: [{ id: `a-${Date.now()}-1`, type: 'Head Office', fullAddress: '', city: '', country: '', phone: '', isDefault: true }]
      });
      setIsBuyerModalOpen(true);
    } else {
      setAgencyForm({
        name: '', contactPerson: '', phone: '', address: '', linkedBuyers: [], activeOrdersCount: 0
      });
      setIsAgencyModalOpen(true);
    }
  };

  const handleSaveAgency = () => {
    if (!agencyForm.name) return;
    const newAgency: BuyingAgency = {
        ...agencyForm as BuyingAgency,
        id: `AG-${Date.now()}`,
        linkedBuyers: typeof agencyForm.linkedBuyers === 'string' 
            ? (agencyForm.linkedBuyers as string).split(',').map(s => s.trim()) 
            : agencyForm.linkedBuyers || []
    };
    setLocalAgencies([newAgency, ...localAgencies]);
    setIsAgencyModalOpen(false);
  };

  const handleSaveBuyer = () => {
    if (!buyerForm.name || !buyerForm.country) {
      alert("Company Name and Country are required.");
      return;
    }
    const newBuyer: Buyer = {
      ...buyerForm as Buyer,
      id: `BUY-${Date.now()}`,
      totalOrders: 0,
      contacts: buyerForm.contacts || [],
      addresses: buyerForm.addresses || []
    };
    onAddBuyer(newBuyer);
    setIsBuyerModalOpen(false);
  };

  // Dynamic Row Handlers for Buyer Form
  const addContactRow = () => {
    const newContact: BuyerContact = { id: `c-${Date.now()}`, name: '', designation: '', email: '', phone: '', department: 'Buyer', isDefault: false };
    setBuyerForm(prev => ({ ...prev, contacts: [...(prev.contacts || []), newContact] }));
  };
  const updateContactRow = (id: string, field: keyof BuyerContact, value: any) => {
    setBuyerForm(prev => ({ ...prev, contacts: (prev.contacts || []).map(c => c.id === id ? { ...c, [field]: value } : c) }));
  };
  const removeContactRow = (id: string) => {
    setBuyerForm(prev => ({ ...prev, contacts: (prev.contacts || []).filter(c => c.id !== id) }));
  };

  const addLocationRow = () => {
    const newLoc: BuyerAddress = { id: `a-${Date.now()}`, type: 'Head Office', fullAddress: '', city: '', country: '', isDefault: false };
    setBuyerForm(prev => ({ ...prev, addresses: [...(prev.addresses || []), newLoc] }));
  };
  const updateLocationRow = (id: string, field: keyof BuyerAddress, value: any) => {
    setBuyerForm(prev => ({ ...prev, addresses: (prev.addresses || []).map(a => a.id === id ? { ...a, [field]: value } : a) }));
  };
  const removeLocationRow = (id: string) => {
    setBuyerForm(prev => ({ ...prev, addresses: (prev.addresses || []).filter(a => a.id !== id) }));
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-3xl font-bold text-[#37352F]">{activeTab === 'Buyers' ? 'Buyer Profiles' : 'Buying Agencies'}</h1>
          <p className="text-sm text-gray-500 mt-1">Consolidated customer relationship and data hub.</p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#1a1a1a] text-white rounded-lg hover:bg-black transition-colors shadow-lg text-sm font-bold"
        >
          <Plus size={18} /> Add {activeTab === 'Buyers' ? 'Buyer' : 'Agency'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-8 border-b border-gray-100 px-2 shrink-0">
        <button
          onClick={() => setActiveTab('Buyers')}
          className={`pb-3 text-sm font-bold transition-all flex items-center gap-2.5 
            ${activeTab === 'Buyers' ? 'border-b-2 border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <Users size={18} /> Buyer Profiles
        </button>
        <button
          onClick={() => setActiveTab('Agencies')}
          className={`pb-3 text-sm font-bold transition-all flex items-center gap-2.5 
            ${activeTab === 'Agencies' ? 'border-b-2 border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <Briefcase size={18} /> Buying Agency
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#f7f7f5] p-2 rounded-xl shadow-inner border border-gray-200/50 flex flex-col md:flex-row gap-2 items-center">
        <div className="relative w-full md:w-80 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 text-sm bg-transparent border-none rounded-md focus:ring-0 outline-none placeholder:text-gray-300"
            />
        </div>
        <div className="flex gap-2 ml-auto shrink-0 items-center">
            <button className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400 shadow-sm transition-colors">
              <Filter size={20} />
            </button>
        </div>
      </div>

      {/* Tables View */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          {activeTab === 'Buyers' ? (
            <table className="w-full text-left text-sm border-collapse table-fixed">
              <colgroup>
                <col className="w-20" />
                <col className="w-56" />
                <col className="w-32" />
                <col className="w-56" />
                <col className="w-48" />
                <col className="w-24" />
                <col className="w-40" />
              </colgroup>
              <thead className="bg-[#fbfbf9] text-[11px] font-black uppercase tracking-[0.1em] text-gray-400 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-5">LOGO</th>
                    <th className="px-6 py-5">COMPANY NAME</th>
                    <th className="px-6 py-5">COUNTRY</th>
                    <th className="px-6 py-5">WEBSITE</th>
                    <th className="px-6 py-5">PAYMENT TERMS</th>
                    <th className="px-6 py-5 text-right">ORDERS</th>
                    <th className="px-6 py-5 text-center">STATUS</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {filteredBuyers.map(buyer => {
                    const isMissingFinancials = !buyer.paymentTerms || !buyer.incoterms;
                    return (
                      <tr 
                          key={buyer.id} 
                          onClick={() => setViewingBuyer(buyer)}
                          className="group hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                          <td className="px-6 py-6">
                              <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden flex items-center justify-center">
                                  {buyer.logoUrl ? (
                                      <img src={buyer.logoUrl} alt="" className="w-full h-full object-contain" />
                                  ) : (
                                      <span className="text-xs font-black text-gray-300 uppercase">{buyer.name.charAt(0)}</span>
                                  )}
                              </div>
                          </td>
                          <td className="px-6 py-6 font-bold text-gray-900 uppercase text-sm tracking-tight truncate">
                            {buyer.name}
                          </td>
                          <td className="px-6 py-6 text-gray-600 font-medium">
                            {buyer.country}
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-1.5 text-blue-600 text-xs truncate">
                                <ExternalLink size={12} className="shrink-0" />
                                <span className="truncate">{buyer.website || '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-gray-600 font-medium truncate">
                            {buyer.paymentTerms || <span className="text-red-400 italic">Not Defined</span>}
                          </td>
                          <td className="px-6 py-6 text-right font-mono font-bold text-indigo-600">
                            {buyer.totalOrders}
                          </td>
                          <td className="px-6 py-6 text-center">
                              {isMissingFinancials ? (
                                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase border border-red-100">
                                      <ShieldAlert size={10} /> MISSING DATA
                                  </div>
                              ) : (
                                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-[9px] font-black uppercase border border-green-100">
                                      <CheckCircle2 size={10} /> COMPLETE
                                  </div>
                              )}
                          </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm border-collapse table-fixed">
              <colgroup>
                <col className="w-64" />
                <col className="w-56" />
                <col className="w-48" />
                <col className="w-64" />
                <col className="w-56" />
                <col className="w-32" />
              </colgroup>
              <thead className="bg-[#fbfbf9] text-[11px] font-black uppercase tracking-[0.1em] text-gray-400 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-5">AGENT NAME</th>
                    <th className="px-6 py-5">CONTACT PERSON</th>
                    <th className="px-6 py-5">PHONE NUMBER</th>
                    <th className="px-6 py-5">ADDRESS</th>
                    <th className="px-6 py-5">BUYERS LINKED</th>
                    <th className="px-6 py-5 text-right">ACTIVE ORDERS</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {filteredAgencies.map(agency => (
                    <tr key={agency.id} className="group hover:bg-gray-50 transition-colors cursor-pointer">
                        <td className="px-6 py-6 font-bold text-gray-900 uppercase text-sm tracking-tight truncate">
                          {agency.name}
                        </td>
                        <td className="px-6 py-6 text-gray-700 font-medium">
                          {agency.contactPerson}
                        </td>
                        <td className="px-6 py-6 font-mono text-gray-600">
                          {agency.phone}
                        </td>
                        <td className="px-6 py-6 text-gray-500 truncate">
                          {agency.address}
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex flex-wrap gap-1">
                             {agency.linkedBuyers.map(b => (
                               <span key={b} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold border border-indigo-100 uppercase">
                                  {b}
                               </span>
                             ))}
                          </div>
                        </td>
                        <td className="px-6 py-6 text-right font-mono font-bold text-indigo-600">
                          {agency.activeOrdersCount}
                        </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="bg-gray-50/30 px-6 py-4 border-t border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
           Displaying {activeTab === 'Buyers' ? filteredBuyers.length : filteredAgencies.length} profiles
        </div>
      </div>

      {/* CREATE AGENCY MODAL - BASIC & CLEAN (MATCHES SCREENSHOT REQ) */}
      {isAgencyModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                  <div className="px-8 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#1a1a1a] text-white rounded-lg flex items-center justify-center">
                            <Briefcase size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#37352F]">Register Buying Agency</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Commercial sourcing partner details.</p>
                        </div>
                      </div>
                      <button onClick={() => setIsAgencyModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <div className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent Name</label>
                            <input 
                                type="text"
                                value={agencyForm.name}
                                onChange={e => setAgencyForm({...agencyForm, name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:border-indigo-500 outline-none"
                                placeholder="Legal Entity Name"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Person</label>
                            <input 
                                type="text"
                                value={agencyForm.contactPerson}
                                onChange={e => setAgencyForm({...agencyForm, contactPerson: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                placeholder="Primary Representative"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                            <input 
                                type="text"
                                value={agencyForm.phone}
                                onChange={e => setAgencyForm({...agencyForm, phone: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:border-indigo-500 outline-none"
                                placeholder="+92..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Address / Location</label>
                            <input 
                                type="text"
                                value={agencyForm.address}
                                onChange={e => setAgencyForm({...agencyForm, address: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                placeholder="City, Country"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Buyers Linked</label>
                            <input 
                                type="text"
                                value={typeof agencyForm.linkedBuyers === 'string' ? agencyForm.linkedBuyers : agencyForm.linkedBuyers?.join(', ')}
                                onChange={e => setAgencyForm({...agencyForm, linkedBuyers: e.target.value as any})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                placeholder="Comma separated list"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Orders</label>
                            <input 
                                type="number"
                                value={agencyForm.activeOrdersCount}
                                onChange={e => setAgencyForm({...agencyForm, activeOrdersCount: parseInt(e.target.value) || 0})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:border-indigo-500 outline-none"
                            />
                        </div>
                      </div>
                  </div>

                  <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsAgencyModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                      <button 
                        onClick={handleSaveAgency}
                        className="px-10 py-2.5 bg-[#1a1a1a] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-xl shadow-gray-200"
                      >
                        Save Agency
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* CREATE BUYER MODAL - HIGH DENSITY AS PER SCREENSHOT */}
      {isBuyerModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-6xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                  <div className="px-8 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#1a1a1a] text-white rounded-xl flex items-center justify-center">
                            <Plus size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#37352F]">Create Buyer Profile</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Corporate identity and commercial framework.</p>
                        </div>
                      </div>
                      <button onClick={() => setIsBuyerModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 bg-white custom-scrollbar space-y-10">
                      
                      {/* Integrated High-Density Top Section */}
                      <div className="flex gap-10 items-start">
                          {/* Compact Logo Container */}
                          <div className="space-y-2 shrink-0">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center">Buyer Logo</label>
                              <div className="relative group w-16 h-16 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center bg-gray-50 hover:bg-indigo-50/30 hover:border-indigo-300 transition-all cursor-pointer overflow-hidden">
                                  {buyerForm.logoUrl ? (
                                      <img src={buyerForm.logoUrl} className="w-full h-full object-contain p-2" alt="Buyer Logo" />
                                  ) : (
                                      <div className="flex flex-col items-center text-gray-300 group-hover:text-indigo-500">
                                          <ImageIcon size={16} className="mb-1 opacity-50" />
                                          <span className="text-[7px] font-bold uppercase">Upload</span>
                                      </div>
                                  )}
                                  <input 
                                    type="file" 
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={e => {
                                        if (e.target.files?.[0]) {
                                            const r = new FileReader();
                                            r.onload = ev => setBuyerForm({...buyerForm, logoUrl: ev.target?.result as string});
                                            r.readAsDataURL(e.target.files[0]);
                                        }
                                    }}
                                  />
                              </div>
                          </div>

                          {/* Unified Grid: Identity + Commercial/Agent (4 Columns) */}
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-5">
                               <div className="md:col-span-4 space-y-1">
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Buyer Name *</label>
                                   <input type="text" value={buyerForm.name} onChange={e => setBuyerForm({...buyerForm, name: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-bold outline-none" placeholder="Legal Entity Name" />
                               </div>
                               <div className="md:col-span-2 space-y-1">
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Country *</label>
                                   <input type="text" value={buyerForm.country} onChange={e => setBuyerForm({...buyerForm, country: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none" placeholder="e.g. UK" />
                               </div>
                               <div className="md:col-span-2 space-y-1">
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</label>
                                   <input type="text" value={buyerForm.companyPhone} onChange={e => setBuyerForm({...buyerForm, companyPhone: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono outline-none" placeholder="Contact #" />
                               </div>
                               
                               <div className="md:col-span-4 space-y-1">
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Website URL</label>
                                   <input type="url" value={buyerForm.website} onChange={e => setBuyerForm({...buyerForm, website: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-blue-600 outline-none" placeholder="https://www.example.com" />
                               </div>

                               <div className="md:col-span-2 space-y-1">
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Standard Incoterms</label>
                                   <input type="text" value={buyerForm.incoterms} onChange={e => setBuyerForm({...buyerForm, incoterms: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm uppercase outline-none" placeholder="FOB, CIF..." />
                               </div>
                               <div className="md:col-span-2 space-y-1">
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Terms</label>
                                   <input type="text" value={buyerForm.paymentTerms} onChange={e => setBuyerForm({...buyerForm, paymentTerms: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none" placeholder="e.g. 60 Days OA" />
                               </div>

                               <div className="md:col-span-2 space-y-1">
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent Name (Dropdown)</label>
                                   <select 
                                       value={buyerForm.agentName} 
                                       onChange={e => setBuyerForm({...buyerForm, agentName: e.target.value})} 
                                       className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm outline-none bg-white"
                                   >
                                       <option value="">Direct (No Agent)</option>
                                       {localAgencies.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                                   </select>
                               </div>
                               <div className="md:col-span-2 space-y-1">
                                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comm. %</label>
                                   <div className="relative">
                                       <input type="number" value={buyerForm.agentCommission} onChange={e => setBuyerForm({...buyerForm, agentCommission: parseFloat(e.target.value) || 0})} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-bold text-right pr-8 outline-none" />
                                       <span className="absolute right-3 top-1.5 text-gray-400 font-bold text-xs">%</span>
                                   </div>
                               </div>
                          </div>
                      </div>

                      {/* DYNAMIC TABLES FOR CONTACTS AND LOCATIONS */}
                      <div className="grid grid-cols-1 gap-10 pt-6 border-t border-gray-100">
                          
                          {/* CONTACT PERSONS */}
                          <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <User size={14} className="text-indigo-500" /> Contact Directory
                                </h3>
                                <button onClick={addContactRow} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-100 transition-colors">+ Add Contact</button>
                             </div>
                             <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-tighter w-48">Full Name</th>
                                            <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-tighter">Designation</th>
                                            <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-tighter">Email Address</th>
                                            <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-tighter w-40">Phone / Mobile</th>
                                            <th className="px-4 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(buyerForm.contacts || []).map(contact => (
                                            <tr key={contact.id} className="group hover:bg-indigo-50/20 transition-colors">
                                                <td className="px-3 py-1"><input value={contact.name} onChange={e => updateContactRow(contact.id, 'name', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:bg-white rounded px-2 py-1 font-bold outline-none" placeholder="Name" /></td>
                                                <td className="px-3 py-1"><input value={contact.designation} onChange={e => updateContactRow(contact.id, 'designation', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:bg-white rounded px-2 py-1 outline-none" placeholder="Senior Buyer" /></td>
                                                <td className="px-3 py-1"><input value={contact.email} onChange={e => updateContactRow(contact.id, 'email', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:bg-white rounded px-2 py-1 outline-none font-medium" placeholder="mail@example.com" /></td>
                                                <td className="px-3 py-1"><input value={contact.phone} onChange={e => updateContactRow(contact.id, 'phone', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:bg-white rounded px-2 py-1 outline-none font-mono" placeholder="+00..." /></td>
                                                <td className="px-3 py-1 text-center">
                                                    <button onClick={() => removeContactRow(contact.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                          </div>

                          {/* LOCATIONS */}
                          <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <MapPin size={14} className="text-indigo-500" /> Logistic Sites
                                </h3>
                                <button onClick={addLocationRow} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-100 transition-colors">+ Add Site</button>
                             </div>
                             <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-tighter w-48">Type</th>
                                            <th className="px-4 py-2 font-black text-gray-400 uppercase tracking-tighter">Physical Full Address</th>
                                            <th className="px-4 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(buyerForm.addresses || []).map(loc => (
                                            <tr key={loc.id} className="group hover:bg-indigo-50/20 transition-colors">
                                                <td className="px-3 py-1">
                                                    <select value={loc.type} onChange={e => updateLocationRow(loc.id, 'type', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:bg-white rounded px-2 py-1 font-bold outline-none appearance-none">
                                                        <option>Head Office</option>
                                                        <option>Warehouse</option>
                                                        <option>Other</option>
                                                    </select>
                                                </td>
                                                <td className="px-3 py-1"><input value={loc.fullAddress} onChange={e => updateLocationRow(loc.id, 'fullAddress', e.target.value)} className="w-full bg-transparent border border-transparent hover:border-gray-300 focus:bg-white rounded px-2 py-1 outline-none font-medium" placeholder="Unit, Street, City, ZIP" /></td>
                                                <td className="px-3 py-1 text-center">
                                                    <button onClick={() => removeLocationRow(loc.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                          </div>
                      </div>

                  </div>

                  <div className="px-10 py-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsBuyerModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                      <button onClick={handleSaveBuyer} className="px-10 py-2.5 bg-[#1a1a1a] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)]">Save Profile</button>
                  </div>
              </div>
          </div>
      )}

      {/* VIEW MODAL (Notion Inspired Summary) */}
      {viewingBuyer && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                  <div className="px-8 py-5 border-b border-gray-100 bg-white flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center overflow-hidden">
                            {viewingBuyer.logoUrl ? (
                                <img src={viewingBuyer.logoUrl} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-xl font-black text-gray-300">{viewingBuyer.name.charAt(0)}</span>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{viewingBuyer.name}</h2>
                            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">{viewingBuyer.id}</p>
                        </div>
                      </div>
                      <button onClick={() => setViewingBuyer(null)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 bg-white custom-scrollbar space-y-12">
                      <div className="flex flex-col lg:flex-row gap-12">
                          <div className="w-full lg:w-1/3 space-y-6">
                              <div className="space-y-4">
                                  <div>
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Website</label>
                                      <a href={viewingBuyer.website} target="_blank" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-2">
                                          <Globe size={14} /> {viewingBuyer.website || 'No website provided'}
                                      </a>
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Order History</label>
                                      <div className="text-2xl font-black text-gray-900">{viewingBuyer.totalOrders} <span className="text-sm font-normal text-gray-400">Units</span></div>
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Region</label>
                                      <div className="text-sm font-bold text-gray-800 flex items-center gap-2"><MapPin size={14} className="text-gray-400"/> {viewingBuyer.country}</div>
                                  </div>
                              </div>
                          </div>

                          <div className="flex-1 bg-[#F7F7F5] rounded-2xl p-8 border border-gray-200/50">
                              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                  <CreditCard size={14} /> Financial Framework
                              </h3>
                              <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Payment Terms</label>
                                      <div className="text-sm font-bold text-gray-800">{viewingBuyer.paymentTerms || 'Not Defined'}</div>
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Incoterms</label>
                                      <div className="text-sm font-bold text-gray-800">{viewingBuyer.incoterms || 'FOB'}</div>
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Agent Name</label>
                                      <div className="text-sm font-bold text-blue-700 uppercase tracking-tight">{viewingBuyer.agentName || 'DIRECT'}</div>
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Agent Commission</label>
                                      <div className="text-sm font-bold text-gray-800">{viewingBuyer.agentCommission ? `${viewingBuyer.agentCommission}%` : '0%'}</div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              <User size={14} /> Personnel & Contacts
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {viewingBuyer.contacts.map(contact => (
                                  <div key={contact.id} className="p-4 border border-gray-200 rounded-xl flex items-center gap-4 bg-white hover:bg-gray-50 transition-all shadow-sm">
                                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 shrink-0 border border-gray-200">
                                          {contact.name.charAt(0)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="text-sm font-bold text-gray-900 truncate">{contact.name}</div>
                                          <div className="text-[9px] text-blue-600 font-black uppercase tracking-tight leading-none mt-1">{contact.designation}</div>
                                      </div>
                                      {contact.isDefault && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                              <MapPin size={14} /> Site Locations
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {viewingBuyer.addresses.map(addr => (
                                  <div key={addr.id} className="p-5 border border-gray-200 rounded-xl flex items-start gap-4 bg-white group">
                                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:text-blue-600 transition-colors">
                                          <Building size={18} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">{addr.type}</div>
                                          <div className="text-sm text-gray-800 font-medium leading-relaxed">{addr.fullAddress}</div>
                                          <div className="text-xs text-gray-500 mt-2 font-mono">{addr.city}, {addr.country}</div>
                                      </div>
                                      {addr.isDefault && <CheckCircle2 size={14} className="text-blue-600" />}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                      <button 
                          onClick={() => { onDeleteBuyer(viewingBuyer.id); setViewingBuyer(null); }}
                          className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold uppercase transition-all"
                      >
                          <Trash2 size={14} className="inline mr-2"/> Delete Profile
                      </button>
                      <button 
                        onClick={() => setViewingBuyer(null)} 
                        className="px-10 py-2 bg-[#1a1a1a] text-white text-sm font-bold rounded-lg hover:bg-black transition-all shadow-md"
                      >
                        Close
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
