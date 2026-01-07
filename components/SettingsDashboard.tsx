
import React, { useState } from 'react';
import { 
  RefreshCw, ShieldAlert, Lock, Unlock, User, Database, Plus, Trash2, Key, Globe, 
  LayoutTemplate, Building, CreditCard, ChevronRight, Upload, X, Image as ImageIcon,
  Target, DollarSign, BarChart3, Clipboard
} from 'lucide-react';
import { CurrencyAutoUpdaterSettings } from './CurrencyAutoUpdaterSettings';
import { CompanyDetails, MonthlyTarget } from '../types';
import { LOGO_URL } from '../constants';

interface SystemUser {
  id: string;
  name: string;
  username: string;
  role: string;
  lastActive: string;
}

const INITIAL_USERS: SystemUser[] = [
  { id: 'u1', name: 'ShafayH', username: 'shafay.h', role: 'Administrator', lastActive: 'Now' },
];

const AVAILABLE_CITIES = [
  'London', 'New York', 'Los Angeles', 'Barcelona', 'Dubai', 'Istanbul', 'Melbourne', 'Tokyo', 'Paris'
];

interface SettingsDashboardProps {
  taxRate: number;
  onUpdateTaxRate: (rate: number) => void;
  currencyRates: { USD: number; EUR: number; GBP: number; lastUpdated: string };
  onUpdateCurrencyRates: (rates: { USD: number; EUR: number; GBP: number; lastUpdated: string }) => void;
  cottonRate: number;
  onUpdateCottonRate: (rate: number) => void;
  enabledCities: string[];
  onUpdateEnabledCities: (cities: string[]) => void;
  companyDetails: CompanyDetails;
  onUpdateCompanyDetails: (details: CompanyDetails) => void;
  monthlyTargets: MonthlyTarget[];
  onUpdateMonthlyTargets: (targets: MonthlyTarget[]) => void;
}

type SettingSection = 'General' | 'Localization' | 'Users' | 'Finance' | 'Targets';

export const SettingsDashboard: React.FC<SettingsDashboardProps> = ({
  taxRate, onUpdateTaxRate,
  currencyRates, onUpdateCurrencyRates,
  cottonRate, onUpdateCottonRate,
  enabledCities, onUpdateEnabledCities,
  companyDetails, onUpdateCompanyDetails,
  monthlyTargets, onUpdateMonthlyTargets
}) => {
  const [activeSection, setActiveSection] = useState<SettingSection>('General');
  const [users, setUsers] = useState<SystemUser[]>(INITIAL_USERS);
  const [newUser, setNewUser] = useState({ name: '', username: '', role: 'Merchandiser' });
  const [isTermsUnlocked, setIsTermsUnlocked] = useState(false);

  // ... handlers ...
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdateCompanyDetails({ ...companyDetails, logoUrl: event.target?.result as string });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const toggleCity = (city: string) => {
    if (enabledCities.includes(city)) {
      onUpdateEnabledCities(enabledCities.filter(c => c !== city));
    } else {
      onUpdateEnabledCities([...enabledCities, city]);
    }
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.username) return;
    setUsers([...users, { ...newUser, id: `u-${Date.now()}`, lastActive: 'Never' }]);
    setNewUser({ name: '', username: '', role: 'Merchandiser' });
  };

  const handleTargetChange = (index: number, field: 'salesTarget' | 'volumeTarget', value: string) => {
    const numValue = parseFloat(value) || 0;
    const newTargets = [...monthlyTargets];
    newTargets[index] = { ...newTargets[index], [field]: numValue };
    onUpdateMonthlyTargets(newTargets);
  };

  const handlePasteTerms = async (field: 'salesTerms' | 'poTerms') => {
    if (!isTermsUnlocked) return;
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            onUpdateCompanyDetails({ ...companyDetails, [field]: text });
        }
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
    }
  };

  const handleUnlockTerms = () => {
    if (isTermsUnlocked) {
        setIsTermsUnlocked(false);
        return;
    }
    const password = prompt("Enter admin password to unlock terms editing:");
    if (password === 'admin') {
        setIsTermsUnlocked(true);
    } else if (password !== null) {
        alert("Incorrect password.");
    }
  };

  const totalSalesTarget = monthlyTargets.reduce((acc, curr) => acc + curr.salesTarget, 0);
  const totalVolumeTarget = monthlyTargets.reduce((acc, curr) => acc + curr.volumeTarget, 0);

  return (
    <div className="flex h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-[#37352F]">System Settings</h2>
                <p className="text-xs text-gray-500 mt-1">Configure global preferences</p>
            </div>
            <nav className="flex-1 p-2 space-y-1">
                {[
                    { id: 'General', icon: Building, label: 'Company Profile' },
                    { id: 'Localization', icon: Globe, label: 'Top Bar' },
                    { id: 'Finance', icon: CreditCard, label: 'Finance & Tax' },
                    { id: 'Targets', icon: Target, label: 'Monthly Targets' },
                    { id: 'Users', icon: User, label: 'User Management' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id as SettingSection)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors
                            ${activeSection === item.id ? 'bg-white text-[#37352F] shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                    >
                        <item.icon size={18} />
                        {item.label}
                    </button>
                ))}
            </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
            
            {/* General Section */}
            {activeSection === 'General' && (
                <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <div>
                        <h3 className="text-lg font-bold text-[#37352F] mb-4">Company Identity</h3>
                        <div className="flex items-start gap-6">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                                    {companyDetails.logoUrl ? (
                                        <img src={companyDetails.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <ImageIcon size={24} className="text-gray-400" />
                                    )}
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg">
                                    Change
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </label>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company Name</label>
                                    <input 
                                        type="text" 
                                        value={companyDetails.name} 
                                        onChange={(e) => onUpdateCompanyDetails({...companyDetails, name: e.target.value})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                                    <input 
                                        type="text" 
                                        value={companyDetails.address} 
                                        onChange={(e) => onUpdateCompanyDetails({...companyDetails, address: e.target.value})}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none" 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-6">
                        <h3 className="text-lg font-bold text-[#37352F] mb-4">Contact Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                                <input 
                                    type="text" 
                                    value={companyDetails.phone} 
                                    onChange={(e) => onUpdateCompanyDetails({...companyDetails, phone: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Website</label>
                                <input 
                                    type="text" 
                                    value={companyDetails.website} 
                                    onChange={(e) => onUpdateCompanyDetails({...companyDetails, website: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-[#37352F]">Default Sales Terms</h3>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleUnlockTerms}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors border
                                        ${isTermsUnlocked ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                                >
                                    {isTermsUnlocked ? <Unlock size={14} /> : <Lock size={14} />} {isTermsUnlocked ? 'Lock' : 'Unlock to Edit'}
                                </button>
                                <button 
                                    onClick={() => handlePasteTerms('salesTerms')}
                                    disabled={!isTermsUnlocked}
                                    className={`flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold transition-colors border border-blue-100
                                        ${!isTermsUnlocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-100'}`}
                                >
                                    <Clipboard size={14} /> Paste
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                            These terms will be automatically used in the "Standard Terms & Conditions" section of the Sales Confirmation Sheet.
                        </p>
                        <textarea 
                            rows={6}
                            value={companyDetails.salesTerms || ''}
                            onChange={(e) => onUpdateCompanyDetails({...companyDetails, salesTerms: e.target.value})}
                            readOnly={!isTermsUnlocked}
                            placeholder="Enter or paste legal terms and conditions for sales confirmations..."
                            className={`w-full px-4 py-3 border rounded-xl text-sm outline-none resize-none 
                                ${isTermsUnlocked ? 'border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white' : 'border-gray-300 bg-gray-50/20 cursor-not-allowed'}`}
                        />
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-[#37352F]">Purchase Order (PO) Terms</h3>
                            <button 
                                onClick={() => handlePasteTerms('poTerms')}
                                disabled={!isTermsUnlocked}
                                className={`flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold transition-colors border border-blue-100
                                    ${!isTermsUnlocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-blue-100'}`}
                            >
                                <Clipboard size={14} /> Paste
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                            These terms will be printed at the bottom of every new Purchase Order issued to suppliers.
                        </p>
                        <textarea 
                            rows={6}
                            value={companyDetails.poTerms || ''}
                            onChange={(e) => onUpdateCompanyDetails({...companyDetails, poTerms: e.target.value})}
                            readOnly={!isTermsUnlocked}
                            placeholder="Enter standard procurement terms for POs..."
                            className={`w-full px-4 py-3 border rounded-xl text-sm outline-none resize-none 
                                ${isTermsUnlocked ? 'border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white' : 'border-gray-300 bg-gray-50/20 cursor-not-allowed'}`}
                        />
                    </div>
                </div>
            )}

            {/* Localization Section */}
            {activeSection === 'Localization' && (
                <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-bold text-[#37352F] mb-4">Live Market Rates</h3>
                            <CurrencyAutoUpdaterSettings 
                                currentRates={currencyRates} 
                                onUpdateRates={onUpdateCurrencyRates}
                                cottonRate={cottonRate}
                                onUpdateCottonRate={onUpdateCottonRate}
                            />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#37352F] mb-4">World Clock Cities</h3>
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="space-y-2">
                                    {AVAILABLE_CITIES.map(city => (
                                        <label key={city} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={enabledCities.includes(city)}
                                                onChange={() => toggleCity(city)}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">{city}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Targets Section */}
            {activeSection === 'Targets' && (
                <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-[#37352F]">Monthly Sales & Volume Targets</h3>
                            <p className="text-sm text-gray-500">Set annual goals broken down by month for dashboard tracking.</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-right">
                                <span className="text-xs text-gray-500 uppercase block">Total Sales Target</span>
                                <span className="text-lg font-bold text-green-600">${totalSalesTarget.toLocaleString()}</span>
                            </div>
                            <div className="text-right border-l pl-4 border-gray-200">
                                <span className="text-xs text-gray-500 uppercase block">Total Volume Target</span>
                                <span className="text-lg font-bold text-blue-600">{totalVolumeTarget.toLocaleString()} units</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Month</th>
                                    <th className="px-6 py-4">Sales Target ($)</th>
                                    <th className="px-6 py-4">Volume Target (Units)</th>
                                    <th className="px-6 py-4 text-right">Avg Price (Est)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {monthlyTargets.map((target, index) => {
                                    const avgPrice = target.volumeTarget > 0 ? target.salesTarget / target.volumeTarget : 0;
                                    return (
                                        <tr key={target.month} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-gray-700">{target.month}</td>
                                            <td className="px-6 py-3">
                                                <div className="relative max-w-[200px]">
                                                    <DollarSign size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        value={target.salesTarget || ''}
                                                        onChange={(e) => handleTargetChange(index, 'salesTarget', e.target.value)}
                                                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-md focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="relative max-w-[200px]">
                                                    <BarChart3 size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        value={target.volumeTarget || ''}
                                                        onChange={(e) => handleTargetChange(index, 'volumeTarget', e.target.value)}
                                                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono text-gray-500">
                                                ${avgPrice.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-gray-50 font-bold border-t border-gray-200">
                                    <td className="px-6 py-4 text-gray-900">TOTAL</td>
                                    <td className="px-6 py-4 text-green-700">${totalSalesTarget.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-blue-700">{totalVolumeTarget.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-gray-500">-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Finance Section */}
            {activeSection === 'Finance' && (
                <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <div>
                        <h3 className="text-lg font-bold text-[#37352F] mb-4">Tax Configuration</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Standard Sales Tax / VAT Rate (%)</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        value={taxRate} 
                                        onChange={(e) => onUpdateTaxRate(parseFloat(e.target.value) || 0)}
                                        className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 outline-none" 
                                    />
                                    <span className="text-sm text-gray-500">%</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">This rate is applied by default to all new Purchase Orders.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Users Section */}
            {activeSection === 'Users' && (
                <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-[#37352F]">User Management</h3>
                        </div>
                        
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">Username</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3 text-right">Last Active</th>
                                        <th className="px-4 py-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium">{user.name}</td>
                                            <td className="px-4 py-3 text-gray-600">{user.username}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-500 text-xs">{user.lastActive}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button className="text-gray-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="text-sm font-bold text-gray-700 mb-3">Add New User</h4>
                            <div className="grid grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                                    <input 
                                        type="text" 
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                                    <input 
                                        type="text" 
                                        value={newUser.username}
                                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                        placeholder="j.doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                                    <select 
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none bg-white"
                                    >
                                        <option>Administrator</option>
                                        <option>Merchandiser</option>
                                        <option>Production Manager</option>
                                        <option>Accountant</option>
                                    </select>
                                </div>
                                <button 
                                    onClick={handleAddUser}
                                    className="bg-[#37352F] text-white px-4 py-2 rounded text-sm font-bold hover:bg-black transition-colors"
                                >
                                    Add User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
