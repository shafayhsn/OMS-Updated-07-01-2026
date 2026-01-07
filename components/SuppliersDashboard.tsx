
import React, { useState } from 'react';
import { Plus, Trash2, Truck, Phone, MapPin, Receipt, Search, CheckSquare, Square, Filter } from 'lucide-react';
import { Supplier } from '../types';

interface SuppliersDashboardProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
}

const PRODUCT_LINES = [
  'Fabric', 
  'Stitching Trims', 
  'Packing Trims', 
  'Washing', 
  'Embellishment', 
  'Stitching', 
  'General / Misc'
];

const TABS = ['All', 'Fabric', 'Trims', 'Washing', 'Embellishment', 'Stitching', 'Misc'];

const INITIAL_FORM_STATE = {
  name: '',
  contactPerson: '',
  phone: '',
  address: '',
  salesTaxId: '',
  creditTerms: '30 Days',
  productLine: [] as string[]
};

export const SuppliersDashboard: React.FC<SuppliersDashboardProps> = ({ suppliers, onAddSupplier, onDeleteSupplier }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'Fabric') {
        matchesTab = s.productLine.includes('Fabric');
    } else if (activeTab === 'Trims') {
        matchesTab = s.productLine.some(p => p.includes('Trims'));
    } else if (activeTab === 'Washing') {
        matchesTab = s.productLine.includes('Washing');
    } else if (activeTab === 'Embellishment') {
        matchesTab = s.productLine.includes('Embellishment');
    } else if (activeTab === 'Stitching') {
        matchesTab = s.productLine.includes('Stitching');
    } else if (activeTab === 'Misc') {
        matchesTab = s.productLine.some(p => p.includes('Misc') || p.includes('General'));
    }

    return matchesSearch && matchesTab;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.productLine.length === 0) {
        alert("Please select at least one product line.");
        return;
    }

    const newSupplier: Supplier = {
      id: `SUP-${Date.now()}`,
      name: formData.name,
      contactPerson: formData.contactPerson,
      phone: formData.phone,
      address: formData.address,
      salesTaxId: formData.salesTaxId,
      productLine: formData.productLine,
      creditTerms: formData.creditTerms,
      rating: 5, // Default new supplier rating
      category: formData.productLine[0], // Default primary category
      location: formData.address.split(',').pop()?.trim() || 'Unknown' // Simple extraction
    };
    onAddSupplier(newSupplier);
    setFormData(INITIAL_FORM_STATE);
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleProductLine = (item: string) => {
    setFormData(prev => {
        const exists = prev.productLine.includes(item);
        if (exists) {
            return { ...prev, productLine: prev.productLine.filter(p => p !== item) };
        } else {
            return { ...prev, productLine: [...prev.productLine, item] };
        }
    });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#37352F]">Supplier Database</h1>
          <p className="text-sm text-gray-500">Manage vendors, raw material providers, and production partners.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#37352F] text-white rounded-md hover:bg-black transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={16} /> Add New Supplier
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar shrink-0">
          {TABS.map(tab => (
              <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                      ${activeTab === tab ? 'border-[#37352F] text-[#37352F]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                  {tab}
              </button>
          ))}
      </div>

      {/* Search */}
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm shrink-0">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
            <thead className="bg-[#F7F7F5] text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-4">Supplier Name</th>
                <th className="px-6 py-4">Product Lines</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Sales Tax ID</th>
                <th className="px-6 py-4">Credit Terms</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSuppliers.map(supplier => (
                <tr key={supplier.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#37352F]">{supplier.name}</td>
                  <td className="px-6 py-4">
                     <div className="flex flex-wrap gap-1">
                        {supplier.productLine?.map(p => (
                            <span key={p} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                                {p}
                            </span>
                        ))}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <div className="flex flex-col gap-0.5">
                       <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{supplier.contactPerson}</span>
                       </div>
                       <div className="flex items-center gap-2 text-xs">
                          <Phone size={12} className="text-gray-400" />
                          {supplier.phone}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={supplier.address}>
                    <div className="flex items-center gap-2">
                       <MapPin size={14} className="text-gray-400" />
                       {supplier.address}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">
                    {supplier.salesTaxId}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <div className="flex items-center gap-2">
                       <Receipt size={14} className="text-gray-400" />
                       {supplier.creditTerms}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onDeleteSupplier(supplier.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors"
                      title="Delete Supplier"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                   <td colSpan={7} className="p-8 text-center text-gray-400">No {activeTab !== 'All' ? activeTab : ''} suppliers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 space-y-6">
              <h2 className="text-lg font-bold text-[#37352F]">Register New Supplier</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                 
                 {/* Basic Info */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500 uppercase">Supplier Name</label>
                       <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none" placeholder="Company Name" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500 uppercase">Sales Tax ID</label>
                       <input required name="salesTaxId" value={formData.salesTaxId} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none" placeholder="Tax / VAT ID" />
                    </div>
                 </div>

                 {/* Contact */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500 uppercase">Contact Person</label>
                       <input required name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none" placeholder="Full Name" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
                       <input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none" placeholder="Phone Number" />
                    </div>
                 </div>

                 {/* Address & Terms */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500 uppercase">Full Address</label>
                       <input required name="address" value={formData.address} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none" placeholder="Street, City, Country" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500 uppercase">Credit Terms</label>
                       <select name="creditTerms" value={formData.creditTerms} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:border-blue-500 outline-none bg-white">
                          <option value="Cash">Cash</option>
                          <option value="15 Days">15 Days</option>
                          <option value="30 Days">30 Days</option>
                          <option value="45 Days">45 Days</option>
                          <option value="60 Days">60 Days</option>
                          <option value="90 Days">90 Days</option>
                       </select>
                    </div>
                 </div>

                 {/* Product Lines Checkboxes */}
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Product Lines / Categories</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded border border-gray-200 max-h-40 overflow-y-auto custom-scrollbar">
                        {PRODUCT_LINES.map(item => {
                            const isSelected = formData.productLine.includes(item);
                            return (
                                <div 
                                    key={item} 
                                    onClick={() => toggleProductLine(item)}
                                    className={`flex items-center gap-2 cursor-pointer p-2 rounded border transition-all select-none
                                        ${isSelected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                >
                                    {isSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-gray-300" />}
                                    <span className="text-xs font-medium">{item}</span>
                                </div>
                            );
                        })}
                    </div>
                 </div>
                 
                 <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm bg-[#37352F] text-white rounded hover:bg-black">Register Supplier</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
