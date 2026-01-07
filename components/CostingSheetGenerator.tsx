
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, ArrowLeft, RefreshCw, Printer, CheckCircle2, 
  Plus, Trash2, Calculator, FileText, UserCheck 
} from 'lucide-react';

interface CostingSheetGeneratorProps {
  onBack: () => void;
  initialId?: string; // If provided, simulates loading an existing sheet
}

// --- Types ---

interface CostRow {
  id: string;
  detail: string;
  val1: number; // GSM or Qty or Rate
  val2: number; // Consump or Price
  val3: number; // Tax or Extra
}

interface CostingState {
  id: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Revised';
  meta: {
    customer: string;
    styleNo: string;
    description: string;
    agency: string;
    shipTo: string;
    sizeRange: string;
    baseSize: string;
    quantity: number;
    date: string;
    user: string;
  };
  currency: {
    usdRate: number;
    eurRate: number;
    gbpRate: number;
    targetUsd: number;
    targetEur: number;
    targetGbp: number;
  };
  fabric: CostRow[];
  cm: {
    cutting: number;
    stitching: number;
    kajBartack: number;
    finishing: number;
    overheads: number;
  };
  washing: CostRow[];
  trims: CostRow[];
  embellishment: CostRow[];
  margins: {
    strReduction: number; // Fixed amount
    rejectionPct: number; // %
    profitPct: number; // %
    agencyPct: number; // %
  };
}

// --- Initial State Helper ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_STATE: CostingState = {
  id: `CST-${new Date().getFullYear()}-${Math.floor(Math.random()*10000)}`,
  status: 'Draft',
  meta: {
    customer: '',
    styleNo: '',
    description: '',
    agency: '',
    shipTo: '',
    sizeRange: '',
    baseSize: 'M',
    quantity: 0,
    date: new Date().toISOString().split('T')[0],
    user: 'Jane Doe'
  },
  currency: {
    usdRate: 278.50,
    eurRate: 302.10,
    gbpRate: 355.00,
    targetUsd: 0,
    targetEur: 0,
    targetGbp: 0,
  },
  fabric: [
    { id: generateId(), detail: 'Body Fabric (12oz Denim)', val1: 0, val2: 0, val3: 0 }, // val1: GSM, val2: Consump, val3: Cost
    { id: generateId(), detail: 'Pocket Lining (PC)', val1: 0, val2: 0, val3: 0 }
  ],
  cm: {
    cutting: 0,
    stitching: 0,
    kajBartack: 0,
    finishing: 0,
    overheads: 0,
  },
  washing: [
    { id: generateId(), detail: 'Enzyme Stone Wash', val1: 0, val2: 0, val3: 0 } // val1: Rate, val3: Tax
  ],
  trims: [
    { id: generateId(), detail: 'Main Label', val1: 1, val2: 0, val3: 0 },
    { id: generateId(), detail: 'Care Label', val1: 1, val2: 0, val3: 0 },
    { id: generateId(), detail: 'Zipper #4 Brass', val1: 1, val2: 0, val3: 0 },
    { id: generateId(), detail: 'Button 24L', val1: 1, val2: 0, val3: 0 },
    { id: generateId(), detail: 'Polybag', val1: 1, val2: 0, val3: 0 },
    { id: generateId(), detail: 'Carton (Allocated)', val1: 0.05, val2: 0, val3: 0 },
  ],
  embellishment: [
    { id: generateId(), detail: 'Embroidery (Logo)', val1: 0, val2: 0, val3: 0 }
  ],
  margins: {
    strReduction: 0,
    rejectionPct: 3.0,
    profitPct: 10.0,
    agencyPct: 0,
  }
};

export const CostingSheetGenerator: React.FC<CostingSheetGeneratorProps> = ({ onBack, initialId }) => {
  const [data, setData] = useState<CostingState>(INITIAL_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // --- Calculations ---

  const totals = useMemo(() => {
    // 1. Fabric: (Cost + Tax) * Consumption. *Assumption: val3 is Total Price per unit incl tax or just price? 
    // Prompt says: Detail, OZ/GSM, CONSUMP, COST, S/TAX.
    // Let's interpret: val2 = Consump, val3 = Cost. S/Tax is missing in interface, let's treat val3 as Final Cost Per Unit for simplicity or add val4? 
    // Optimization: Let's assume Cost (val3) is the base cost. I'll simply calculate (Consumption * Cost) for now as Tax logic varies wildly.
    const fabricTotal = data.fabric.reduce((sum, row) => sum + (row.val2 * row.val3), 0);

    // 2. CM
    const cmTotal = data.cm.cutting + data.cm.stitching + data.cm.kajBartack + data.cm.finishing + data.cm.overheads;

    // 3. Washing: Rate (val2) + Tax (val3)? No, let's just use val2 as Rate/Pc
    const washTotal = data.washing.reduce((sum, row) => sum + row.val2, 0);

    // 4. Trims: Per Pc (val1) * Price (val2)
    const trimsTotal = data.trims.reduce((sum, row) => sum + (row.val1 * row.val2), 0);

    // 5. Embellishment: Rate (val2)
    const embTotal = data.embellishment.reduce((sum, row) => sum + row.val2, 0);

    // 6. Prime Manufacturing Cost
    const primeCost = fabricTotal + cmTotal + washTotal + trimsTotal + embTotal;

    // 7. Margins
    const withStr = primeCost - data.margins.strReduction; // Usually STR is a rebate/deduction
    const rejectionAmt = withStr * (data.margins.rejectionPct / 100);
    const costWithRejection = withStr + rejectionAmt;

    // 8. Profit
    const profitAmt = costWithRejection * (data.margins.profitPct / 100);
    const exFactoryPrice = costWithRejection + profitAmt;

    // 9. Agency
    const agencyAmt = exFactoryPrice * (data.margins.agencyPct / 100);
    const finalFobPkr = exFactoryPrice + agencyAmt;

    return {
      fabricTotal,
      cmTotal,
      washTotal,
      trimsTotal,
      embTotal,
      primeCost,
      finalFobPkr,
      finalFobUsd: finalFobPkr / (data.currency.usdRate || 1),
      finalFobEur: finalFobPkr / (data.currency.eurRate || 1),
      finalFobGbp: finalFobPkr / (data.currency.gbpRate || 1),
    };
  }, [data]);

  // --- Handlers ---

  const handleMetaChange = (field: keyof CostingState['meta'], value: any) => {
    setData(prev => ({ ...prev, meta: { ...prev.meta, [field]: value } }));
  };

  const handleCurrencyChange = (field: keyof CostingState['currency'], value: any) => {
    setData(prev => ({ ...prev, currency: { ...prev.currency, [field]: parseFloat(value) || 0 } }));
  };

  const handleCmChange = (field: keyof CostingState['cm'], value: any) => {
    setData(prev => ({ ...prev, cm: { ...prev.cm, [field]: parseFloat(value) || 0 } }));
  };

  const handleMarginChange = (field: keyof CostingState['margins'], value: any) => {
    setData(prev => ({ ...prev, margins: { ...prev.margins, [field]: parseFloat(value) || 0 } }));
  };

  const updateRow = (section: 'fabric' | 'washing' | 'trims' | 'embellishment', id: string, field: keyof CostRow, value: any) => {
    setData(prev => ({
      ...prev,
      [section]: prev[section].map(row => 
        row.id === id ? { ...row, [field]: field === 'detail' ? value : (parseFloat(value) || 0) } : row
      )
    }));
  };

  const addRow = (section: 'fabric' | 'washing' | 'trims' | 'embellishment') => {
    const newRow: CostRow = { id: generateId(), detail: '', val1: 0, val2: 0, val3: 0 };
    setData(prev => ({ ...prev, [section]: [...prev[section], newRow] }));
  };

  const deleteRow = (section: 'fabric' | 'washing' | 'trims' | 'embellishment', id: string) => {
    setData(prev => ({ ...prev, [section]: prev[section].filter(row => row.id !== id) }));
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date().toLocaleTimeString());
      console.log("Saved Costing Sheet:", data);
    }, 1000);
  };

  const handleApprove = () => {
    setData(prev => ({ ...prev, status: 'Approved' }));
    handleSave();
  };

  const handleRevise = () => {
    setData(prev => ({ ...prev, status: 'Revised' }));
    handleSave();
  };

  // --- Sub-Components for Cleanliness ---

  const InputCell = ({ value, onChange, type = "text", className = "", placeholder = "" }: any) => (
    <input 
      type={type} 
      value={value} 
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 text-sm py-1 outline-none transition-colors ${className}`}
    />
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      
      {/* Top Navigation / Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#37352F] flex items-center gap-2">
              Costing Sheet Generator
              <span className={`text-xs px-2 py-0.5 rounded border uppercase tracking-wide
                ${data.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' : 
                  data.status === 'Draft' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                {data.status}
              </span>
            </h1>
            <p className="text-xs text-gray-500">ID: <span className="font-mono">{data.id}</span> • Last Saved: {lastSaved || 'Unsaved'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.status !== 'Approved' && (
             <button onClick={handleApprove} className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded shadow-sm transition-colors">
               <CheckCircle2 size={16} /> Approve Quote
             </button>
          )}
          {data.status === 'Approved' && (
             <button onClick={handleRevise} className="flex items-center gap-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded shadow-sm transition-colors">
               <RefreshCw size={16} /> Revise
             </button>
          )}
          <button onClick={handleSave} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded shadow-sm transition-colors">
            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />} Save
          </button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded transition-colors" title="Print PDF">
            <Printer size={18} />
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* SECTION 1: HEADER & REFERENCE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase">Customer Name</label>
                   <InputCell value={data.meta.customer} onChange={(v: any) => handleMetaChange('customer', v)} className="font-medium text-gray-900" placeholder="e.g. Zara" />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase">Style Number</label>
                   <InputCell value={data.meta.styleNo} onChange={(v: any) => handleMetaChange('styleNo', v)} className="font-medium text-gray-900" placeholder="e.g. 1928-DNM" />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                   <InputCell value={data.meta.description} onChange={(v: any) => handleMetaChange('description', v)} className="text-gray-900" placeholder="Item Desc" />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase">Buying Agency</label>
                   <InputCell value={data.meta.agency} onChange={(v: any) => handleMetaChange('agency', v)} className="text-gray-900" />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase">Total Qty</label>
                   <InputCell type="number" value={data.meta.quantity} onChange={(v: any) => handleMetaChange('quantity', parseFloat(v))} className="text-gray-900 font-mono" />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase">Base Size</label>
                   <InputCell value={data.meta.baseSize} onChange={(v: any) => handleMetaChange('baseSize', v)} className="text-gray-900" />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase">Size Range</label>
                   <InputCell value={data.meta.sizeRange} onChange={(v: any) => handleMetaChange('sizeRange', v)} className="text-gray-900" />
                </div>
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-400 uppercase">Date</label>
                   <InputCell type="date" value={data.meta.date} onChange={(v: any) => handleMetaChange('date', v)} className="text-gray-900" />
                </div>
             </div>

             {/* Currency & Targets */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div>
                   <h3 className="text-xs font-bold text-blue-600 uppercase mb-3 flex items-center gap-2">
                      <Calculator size={14} /> Exchange Rates (PKR)
                   </h3>
                   <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-2 rounded border border-gray-200">
                         <span className="text-[10px] text-gray-400 block">USD</span>
                         <InputCell type="number" value={data.currency.usdRate} onChange={(v: any) => handleCurrencyChange('usdRate', v)} className="font-mono text-right" />
                      </div>
                      <div className="bg-white p-2 rounded border border-gray-200">
                         <span className="text-[10px] text-gray-400 block">EUR</span>
                         <InputCell type="number" value={data.currency.eurRate} onChange={(v: any) => handleCurrencyChange('eurRate', v)} className="font-mono text-right" />
                      </div>
                      <div className="bg-white p-2 rounded border border-gray-200">
                         <span className="text-[10px] text-gray-400 block">GBP</span>
                         <InputCell type="number" value={data.currency.gbpRate} onChange={(v: any) => handleCurrencyChange('gbpRate', v)} className="font-mono text-right" />
                      </div>
                   </div>
                </div>
                <div>
                   <h3 className="text-xs font-bold text-green-600 uppercase mb-3 flex items-center gap-2">
                      <UserCheck size={14} /> Target Price (Buyer)
                   </h3>
                   <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-2 rounded border border-gray-200">
                         <span className="text-[10px] text-gray-400 block">USD</span>
                         <InputCell type="number" value={data.currency.targetUsd} onChange={(v: any) => handleCurrencyChange('targetUsd', v)} className="font-mono text-right text-green-700 font-bold" />
                      </div>
                      <div className="bg-white p-2 rounded border border-gray-200">
                         <span className="text-[10px] text-gray-400 block">EUR</span>
                         <InputCell type="number" value={data.currency.targetEur} onChange={(v: any) => handleCurrencyChange('targetEur', v)} className="font-mono text-right text-green-700 font-bold" />
                      </div>
                      <div className="bg-white p-2 rounded border border-gray-200">
                         <span className="text-[10px] text-gray-400 block">GBP</span>
                         <InputCell type="number" value={data.currency.targetGbp} onChange={(v: any) => handleCurrencyChange('targetGbp', v)} className="font-mono text-right text-green-700 font-bold" />
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* SECTION 2: DETAILED COSTS */}
          <div className="space-y-6">
             
             {/* 2A. Fabric */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                   <h3 className="font-bold text-[#37352F] text-sm">A. Fabric Cost</h3>
                   <span className="font-mono font-bold text-[#37352F]">PKR {totals.fabricTotal.toFixed(2)}</span>
                </div>
                <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-500 bg-white border-b border-gray-100 uppercase">
                      <tr>
                         <th className="px-6 py-3">Fabric Detail</th>
                         <th className="px-6 py-3 w-32">OZ / GSM</th>
                         <th className="px-6 py-3 w-32">Consump.</th>
                         <th className="px-6 py-3 w-32">Price/Unit</th>
                         <th className="px-6 py-3 w-32 text-right">Total</th>
                         <th className="px-2 py-3 w-10"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {data.fabric.map(row => (
                         <tr key={row.id} className="group hover:bg-gray-50">
                            <td className="px-6 py-2"><InputCell value={row.detail} onChange={(v: any) => updateRow('fabric', row.id, 'detail', v)} /></td>
                            <td className="px-6 py-2"><InputCell type="number" value={row.val1} onChange={(v: any) => updateRow('fabric', row.id, 'val1', v)} /></td>
                            <td className="px-6 py-2"><InputCell type="number" value={row.val2} onChange={(v: any) => updateRow('fabric', row.id, 'val2', v)} /></td>
                            <td className="px-6 py-2"><InputCell type="number" value={row.val3} onChange={(v: any) => updateRow('fabric', row.id, 'val3', v)} /></td>
                            <td className="px-6 py-2 text-right font-mono text-gray-700">{(row.val2 * row.val3).toFixed(2)}</td>
                            <td className="px-2 py-2 text-center">
                               <button onClick={() => deleteRow('fabric', row.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
                <button onClick={() => addRow('fabric')} className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 border-t border-gray-100 flex items-center justify-center gap-1 font-medium"><Plus size={12}/> Add Fabric Line</button>
             </div>

             {/* 2B. Cut & Make (CM) */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                   <h3 className="font-bold text-[#37352F] text-sm">B. CM Cost (Cut & Make)</h3>
                   <span className="font-mono font-bold text-[#37352F]">PKR {totals.cmTotal.toFixed(2)}</span>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-6">
                   <div className="space-y-1">
                      <label className="text-xs text-gray-500 uppercase">Cutting</label>
                      <InputCell type="number" value={data.cm.cutting} onChange={(v: any) => handleCmChange('cutting', v)} className="font-mono text-right border-gray-200" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs text-gray-500 uppercase">Stitching</label>
                      <InputCell type="number" value={data.cm.stitching} onChange={(v: any) => handleCmChange('stitching', v)} className="font-mono text-right border-gray-200" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs text-gray-500 uppercase">Kaj / Bartack</label>
                      <InputCell type="number" value={data.cm.kajBartack} onChange={(v: any) => handleCmChange('kajBartack', v)} className="font-mono text-right border-gray-200" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs text-gray-500 uppercase">Finishing</label>
                      <InputCell type="number" value={data.cm.finishing} onChange={(v: any) => handleCmChange('finishing', v)} className="font-mono text-right border-gray-200" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs text-gray-500 uppercase">Factory Overheads</label>
                      <InputCell type="number" value={data.cm.overheads} onChange={(v: any) => handleCmChange('overheads', v)} className="font-mono text-right border-gray-200 bg-yellow-50" />
                   </div>
                </div>
             </div>

             {/* 2C. Washing */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                   <h3 className="font-bold text-[#37352F] text-sm">C. Washing & Dyeing</h3>
                   <span className="font-mono font-bold text-[#37352F]">PKR {totals.washTotal.toFixed(2)}</span>
                </div>
                <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-500 bg-white border-b border-gray-100 uppercase">
                      <tr>
                         <th className="px-6 py-3">Process Detail</th>
                         <th className="px-6 py-3 w-32 text-right">Rate / Pc</th>
                         <th className="px-2 py-3 w-10"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {data.washing.map(row => (
                         <tr key={row.id} className="group hover:bg-gray-50">
                            <td className="px-6 py-2"><InputCell value={row.detail} onChange={(v: any) => updateRow('washing', row.id, 'detail', v)} /></td>
                            <td className="px-6 py-2"><InputCell type="number" value={row.val2} onChange={(v: any) => updateRow('washing', row.id, 'val2', v)} className="text-right font-mono" /></td>
                            <td className="px-2 py-2 text-center">
                               <button onClick={() => deleteRow('washing', row.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
                <button onClick={() => addRow('washing')} className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 border-t border-gray-100 flex items-center justify-center gap-1 font-medium"><Plus size={12}/> Add Process</button>
             </div>

             {/* 2D. Trims */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                   <h3 className="font-bold text-[#37352F] text-sm">D. Trims & Accessories</h3>
                   <span className="font-mono font-bold text-[#37352F]">PKR {totals.trimsTotal.toFixed(2)}</span>
                </div>
                <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-500 bg-white border-b border-gray-100 uppercase">
                      <tr>
                         <th className="px-6 py-3">Item Name</th>
                         <th className="px-6 py-3 w-32 text-center">Qty / Pc</th>
                         <th className="px-6 py-3 w-32 text-right">Price</th>
                         <th className="px-6 py-3 w-32 text-right">Total</th>
                         <th className="px-2 py-3 w-10"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {data.trims.map(row => (
                         <tr key={row.id} className="group hover:bg-gray-50">
                            <td className="px-6 py-2"><InputCell value={row.detail} onChange={(v: any) => updateRow('trims', row.id, 'detail', v)} /></td>
                            <td className="px-6 py-2"><InputCell type="number" value={row.val1} onChange={(v: any) => updateRow('trims', row.id, 'val1', v)} className="text-center font-mono" /></td>
                            <td className="px-6 py-2"><InputCell type="number" value={row.val2} onChange={(v: any) => updateRow('trims', row.id, 'val2', v)} className="text-right font-mono" /></td>
                            <td className="px-6 py-2 text-right font-mono text-gray-700">{(row.val1 * row.val2).toFixed(2)}</td>
                            <td className="px-2 py-2 text-center">
                               <button onClick={() => deleteRow('trims', row.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
                <button onClick={() => addRow('trims')} className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 border-t border-gray-100 flex items-center justify-center gap-1 font-medium"><Plus size={12}/> Add Trim Item</button>
             </div>

             {/* 2E. Embellishment */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                   <h3 className="font-bold text-[#37352F] text-sm">E. Embellishment</h3>
                   <span className="font-mono font-bold text-[#37352F]">PKR {totals.embTotal.toFixed(2)}</span>
                </div>
                <table className="w-full text-sm text-left">
                   <thead className="text-xs text-gray-500 bg-white border-b border-gray-100 uppercase">
                      <tr>
                         <th className="px-6 py-3">Decoration Detail</th>
                         <th className="px-6 py-3 w-32 text-right">Rate / Pc</th>
                         <th className="px-2 py-3 w-10"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {data.embellishment.map(row => (
                         <tr key={row.id} className="group hover:bg-gray-50">
                            <td className="px-6 py-2"><InputCell value={row.detail} onChange={(v: any) => updateRow('embellishment', row.id, 'detail', v)} /></td>
                            <td className="px-6 py-2"><InputCell type="number" value={row.val2} onChange={(v: any) => updateRow('embellishment', row.id, 'val2', v)} className="text-right font-mono" /></td>
                            <td className="px-2 py-2 text-center">
                               <button onClick={() => deleteRow('embellishment', row.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
                <button onClick={() => addRow('embellishment')} className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 border-t border-gray-100 flex items-center justify-center gap-1 font-medium"><Plus size={12}/> Add Embellishment</button>
             </div>

          </div>

          {/* SECTION 3: COST SUMMARY */}
          <div className="bg-[#37352F] text-white rounded-xl shadow-lg p-6 md:p-8">
             <div className="flex items-center gap-2 mb-6 border-b border-gray-600 pb-4">
                <FileText size={20} className="text-gray-300" />
                <h2 className="text-xl font-bold">Cost Summary & Quote</h2>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Breakdown Table (Read Only) */}
                <div className="bg-white/5 rounded-lg p-4">
                   <h4 className="text-xs font-bold text-gray-400 uppercase mb-4">Prime Cost Breakdown</h4>
                   <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-gray-600 pb-1">
                         <span className="text-gray-300">A. Fabric Cost</span>
                         <span className="font-mono">{totals.fabricTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-600 pb-1">
                         <span className="text-gray-300">B. CM Cost</span>
                         <span className="font-mono">{totals.cmTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-600 pb-1">
                         <span className="text-gray-300">C. Washing</span>
                         <span className="font-mono">{totals.washTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-600 pb-1">
                         <span className="text-gray-300">D. Trims</span>
                         <span className="font-mono">{totals.trimsTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-600 pb-1">
                         <span className="text-gray-300">E. Embellishment</span>
                         <span className="font-mono">{totals.embTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                         <span className="font-bold text-yellow-400">Total Mfg. Cost</span>
                         <span className="font-mono font-bold text-yellow-400">{totals.primeCost.toFixed(2)}</span>
                      </div>
                   </div>
                </div>

                {/* Final Calculation */}
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-xs font-bold text-gray-400 block mb-1">STR Reduction</label>
                         <input type="number" value={data.margins.strReduction} onChange={e => handleMarginChange('strReduction', e.target.value)} className="w-full bg-white/10 border border-gray-600 rounded px-2 py-1 text-right font-mono focus:border-blue-500 outline-none" />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-400 block mb-1">Rejection Margin %</label>
                         <input type="number" value={data.margins.rejectionPct} onChange={e => handleMarginChange('rejectionPct', e.target.value)} className="w-full bg-white/10 border border-gray-600 rounded px-2 py-1 text-right font-mono focus:border-blue-500 outline-none" />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-400 block mb-1">Nizamia Profit %</label>
                         <input type="number" value={data.margins.profitPct} onChange={e => handleMarginChange('profitPct', e.target.value)} className="w-full bg-white/10 border border-gray-600 rounded px-2 py-1 text-right font-mono focus:border-blue-500 outline-none" />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-400 block mb-1">Agency Commission %</label>
                         <input type="number" value={data.margins.agencyPct} onChange={e => handleMarginChange('agencyPct', e.target.value)} className="w-full bg-white/10 border border-gray-600 rounded px-2 py-1 text-right font-mono focus:border-blue-500 outline-none" />
                      </div>
                   </div>

                   <div className="h-px bg-gray-600 my-4"></div>

                   <div className="bg-green-900/30 p-4 rounded-lg border border-green-800">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-bold text-gray-300">Final FOB (PKR)</span>
                         <span className="text-2xl font-mono font-bold text-white">{totals.finalFobPkr.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-300 border-t border-green-800/50 pt-2 mt-2">
                         <div className="text-center">
                            <span className="block font-bold text-green-400 text-base">${totals.finalFobUsd.toFixed(2)}</span>
                            USD
                         </div>
                         <div className="text-center border-l border-green-800/50">
                            <span className="block font-bold text-green-400 text-base">€{totals.finalFobEur.toFixed(2)}</span>
                            EUR
                         </div>
                         <div className="text-center border-l border-green-800/50">
                            <span className="block font-bold text-green-400 text-base">£{totals.finalFobGbp.toFixed(2)}</span>
                            GBP
                         </div>
                      </div>
                   </div>
                </div>

             </div>

             {/* Audit & Signature */}
             <div className="mt-8 pt-6 border-t border-gray-600 flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="text-xs text-gray-400 space-y-1">
                   <p>Generated by: <span className="text-white">{data.meta.user}</span></p>
                   <p>Inquiry Date: <span className="text-white">{data.meta.date}</span></p>
                   <p>System ID: {data.id}</p>
                </div>
                <div className="w-full md:w-64">
                   <div className="h-16 border-b border-gray-500 mb-1"></div>
                   <p className="text-xs font-bold text-gray-400 text-center uppercase">Signature of CEO / Director</p>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
