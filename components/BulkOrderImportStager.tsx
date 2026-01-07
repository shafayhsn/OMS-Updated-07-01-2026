import React, { useState, useRef, useMemo } from 'react';
import { 
  UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle2, 
  X, ArrowRight, Download, FileText, CheckSquare, Square,
  AlertCircle, DollarSign, Loader2, ArrowLeft, Save
} from 'lucide-react';
import { Order, ExportInvoice } from '../types';
import { parseCSVDate } from '../constants';

interface BulkOrderImportStagerProps {
  onClose: () => void;
  onCommit: (data: { orders: Order[], invoices: ExportInvoice[] }) => void;
}

type ValidationStatus = 'READY' | 'DRAFT' | 'REJECTED';

interface StagedRow {
  id: string;
  data: Record<string, string>;
  status: ValidationStatus;
  errors: string[];
  selected: boolean;
}

// Updated headers including Buyer and Factory Ref
const TEMPLATE_HEADERS = [
  'BUYER', 'FACTORY REF', 'STYLE NUMBER', 'PO NUMBER', 'PRODUCT ID', 'FIT NAME', 'WASH', 
  'PO DATE', 'SHIP DATE', 'SHIP MODE', 'PRICE', 'ORDER QTY'
];

export const BulkOrderImportStager: React.FC<BulkOrderImportStagerProps> = ({ onClose, onCommit }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stagedData, setStagedData] = useState<StagedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // --- CSV Parsing Logic ---

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    // Normalize headers: remove quotes, trim, uppercase, remove newlines
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').replace(/\n/g, ' ').toUpperCase());
    
    return lines.slice(1).map(line => {
        const values: string[] = [];
        let current = '';
        let inQuote = false;
        
        // Robust parser for quoted CSV values
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        
        const row: Record<string, string> = {};
        // Map extracted values to our internal headers
        TEMPLATE_HEADERS.forEach((header) => {
            // Fuzzy match logic for headers if they are slightly different
            const fileHeaderIdx = headers.findIndex(h => h.includes(header) || header.includes(h));
            let val = '';
            if (fileHeaderIdx !== -1) {
                val = values[fileHeaderIdx] || '';
            }
            
            // Format dates immediately upon parsing to standard YYYY-MM-DD
            if (header === 'PO DATE' || header === 'SHIP DATE') {
                val = parseCSVDate(val);
            }
            
            row[header] = val;
        });
        return row;
    });
  };

  // --- Step 1: Upload Logic ---

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + TEMPLATE_HEADERS.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "order_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateRow = (data: Record<string, string>): { status: ValidationStatus, errors: string[] } => {
      const errors: string[] = [];
      const hasStyle = !!data['STYLE NUMBER'];
      const qtyVal = parseFloat(data['ORDER QTY']);
      const hasQty = !isNaN(qtyVal) && qtyVal > 0;
      
      if (!hasStyle) errors.push('Missing Style Number');
      if (!hasQty) errors.push('Invalid Quantity');

      if (errors.length > 0) return { status: 'REJECTED', errors };

      // Optional fields that trigger Draft status if missing
      const priceVal = parseFloat(data['PRICE']);
      const hasPrice = !isNaN(priceVal) && priceVal >= 0;
      const hasPoDate = !!data['PO DATE'];
      const hasShipDate = !!data['SHIP DATE'];

      if (!hasPrice || !hasPoDate || !hasShipDate) {
          if (!hasPrice) errors.push('Check Price');
          if (!hasPoDate) errors.push('Missing PO Date');
          if (!hasShipDate) errors.push('Missing Ship Date');
          return { status: 'DRAFT', errors };
      }

      return { status: 'READY', errors: [] };
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = parseCSV(text);
        
        const processedRows: StagedRow[] = rows.map((data, idx) => {
            const { status, errors } = validateRow(data);
            return {
                id: `row-${idx}`,
                data,
                status,
                errors,
                selected: status !== 'REJECTED'
            };
        });

        setStagedData(processedRows);
        setStep(2);
        setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // --- Step 2: Validation & Editing Logic ---

  const handleCellChange = (rowId: string, field: string, value: string) => {
      setStagedData(prev => prev.map(row => {
          if (row.id !== rowId) return row;
          
          let newData = { ...row.data, [field]: value };
          
          // Re-validate dates if user edits them manually
          if (field === 'PO DATE' || field === 'SHIP DATE') {
             if (!value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                 newData = { ...row.data, [field]: parseCSVDate(value) };
             }
          }

          const { status, errors } = validateRow(newData);
          
          return {
              ...row,
              data: newData,
              status,
              errors,
              selected: status !== 'REJECTED'
          };
      }));
  };

  const toggleSelection = (id: string) => {
    setStagedData(prev => prev.map(row => {
        if (row.id === id && row.status !== 'REJECTED') {
            return { ...row, selected: !row.selected };
        }
        return row;
    }));
  };

  const selectedRows = stagedData.filter(r => r.selected);
  const totalReceivable = selectedRows.reduce((acc, row) => {
      const price = parseFloat(row.data['PRICE']) || 0;
      const qty = parseFloat(row.data['ORDER QTY']) || 0;
      return acc + (price * qty);
  }, 0);

  // --- Step 3: Commit Logic ---

  const handleImport = () => {
      const newOrders: Order[] = [];
      const newInvoices: ExportInvoice[] = [];

      selectedRows.forEach(row => {
          const isReady = row.status === 'READY';
          const qty = parseFloat(row.data['ORDER QTY']) || 0;
          const price = parseFloat(row.data['PRICE']) || 0;
          
          // Format ID: NZ-000-YY
          const yearShort = new Date().getFullYear().toString().slice(-2);
          const seq = Math.floor(100 + Math.random() * 900);
          const fallbackJobId = `NZ-${seq}-${yearShort}`;

          const jobId = row.data['PRODUCT ID'] || fallbackJobId;
          const poNumber = row.data['PO NUMBER'] || `DRAFT-${Math.random().toString(36).substr(2,5)}`;

          newOrders.push({
              id: jobId,
              orderID: poNumber,
              poNumber: row.data['PO NUMBER'],
              styleNo: row.data['STYLE NUMBER'],
              buyer: row.data['BUYER'] || 'Unknown', 
              quantity: qty,
              price: price,
              amount: qty * price,
              deliveryDate: row.data['SHIP DATE'],
              status: isReady ? 'Pending' : 'Draft', 
              currentStage: isReady ? 'Costing Required' : 'Pending Commercial Data',
              factoryRef: row.data['FACTORY REF'] || '', 
              styleName: row.data['STYLE NUMBER'],
              styleDescription: `${row.data['FIT NAME'] || ''} ${row.data['WASH'] || ''}`.trim(),
              poDate: row.data['PO DATE'],
              cpRiskCount: 0,
              cpNextDueDate: isReady ? new Date().toISOString().split('T')[0] : '-',
              fabricStatus: 'Pending',
              fabricName: 'TBD',
              fabricDescription: '',
              approvalsCompleted: 0,
              approvalsTotal: 5
          });

          if (isReady && price > 0 && qty > 0) {
              newInvoices.push({
                  id: `INV-PLAN-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                  jobId: poNumber,
                  styleNumber: row.data['STYLE NUMBER'],
                  invoiceAmount: price * qty,
                  currency: 'USD',
                  shipDate: row.data['SHIP DATE'],
                  paymentTerms: 30
              });
          }
      });

      onCommit({ orders: newOrders, invoices: newInvoices });
      setStep(3);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/20 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-[95vw] h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-[#37352F]">Bulk Order Import</h2>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className={`px-2 py-0.5 rounded ${step === 1 ? 'bg-[#37352F] text-white' : 'bg-gray-200'}`}>1. Upload</span>
                        <ArrowRight size={12} />
                        <span className={`px-2 py-0.5 rounded ${step === 2 ? 'bg-[#37352F] text-white' : 'bg-gray-200'}`}>2. Validate & Edit</span>
                        <ArrowRight size={12} />
                        <span className={`px-2 py-0.5 rounded ${step === 3 ? 'bg-[#37352F] text-white' : 'bg-gray-200'}`}>3. Finish</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/30">
                
                {step === 1 && (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center"
                         onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                    >
                        <div className={`p-10 border-2 border-dashed rounded-xl transition-all max-w-2xl w-full flex flex-col items-center
                            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}>
                            
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                {isProcessing ? <Loader2 size={32} className="animate-spin" /> : <UploadCloud size={32} />}
                            </div>
                            
                            <h3 className="text-lg font-bold text-gray-800">
                                {isProcessing ? "Processing File..." : "Upload Order Data (.csv)"}
                            </h3>
                            <p className="text-sm text-gray-500 mt-2 mb-6 max-w-md">
                                Drag and drop your populated template file here, or click to browse.
                                Ensure you use the standard template format.
                            </p>
                            
                            <input 
                                type="file" 
                                id="file-upload"
                                accept=".csv" 
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isProcessing}
                            />
                            
                            {!isProcessing && (
                                <div className="flex gap-4">
                                    <label htmlFor="file-upload" className="px-6 py-2.5 bg-[#37352F] text-white rounded-md cursor-pointer hover:bg-black transition-colors font-medium text-sm flex items-center gap-2">
                                        <FileSpreadsheet size={16} /> Select File
                                    </label>
                                    <button onClick={handleDownloadTemplate} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium text-sm flex items-center gap-2">
                                        <Download size={16} /> Download Template
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-6 py-3 bg-white border-b border-gray-200 flex justify-between items-center shrink-0">
                            <div className="flex gap-4 text-sm">
                                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
                                    <CheckCircle2 size={14} /> {stagedData.filter(r => r.status === 'READY').length} Ready
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-100">
                                    <AlertTriangle size={14} /> {stagedData.filter(r => r.status === 'DRAFT').length} Drafts
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full border border-red-100">
                                    <AlertCircle size={14} /> {stagedData.filter(r => r.status === 'REJECTED').length} Errors
                                </div>
                            </div>
                            <div className="text-sm text-gray-500">
                                Total Receivable: <span className="font-bold text-gray-800">${totalReceivable.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-[#F7F7F5] font-bold text-gray-500 uppercase sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 w-10 text-center bg-[#F7F7F5]">
                                            <input type="checkbox" checked={selectedRows.length === stagedData.length && stagedData.length > 0} readOnly />
                                        </th>
                                        <th className="p-3 w-24 bg-[#F7F7F5]">Status</th>
                                        {TEMPLATE_HEADERS.map(h => (
                                            <th key={h} className="p-3 border-l border-gray-200 min-w-[120px] whitespace-nowrap bg-[#F7F7F5]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {stagedData.map(row => (
                                        <tr key={row.id} className={`group hover:bg-gray-50 ${row.selected ? 'bg-blue-50/30' : ''}`}>
                                            <td className="p-3 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={row.selected} 
                                                    disabled={row.status === 'REJECTED'}
                                                    onChange={() => toggleSelection(row.id)}
                                                    className="cursor-pointer"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase
                                                    ${row.status === 'READY' ? 'bg-green-100 text-green-700 border-green-200' : 
                                                      row.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
                                                      'bg-red-100 text-red-700 border-red-200'}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            {TEMPLATE_HEADERS.map(header => (
                                                <td key={header} className="p-1 border-l border-gray-100">
                                                    <input 
                                                        type="text" 
                                                        value={row.data[header]} 
                                                        onChange={(e) => handleCellChange(row.id, header, e.target.value)}
                                                        className={`w-full h-full px-2 py-2 bg-transparent outline-none text-gray-700 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all
                                                            ${!row.data[header] && (header === 'STYLE NUMBER' || header === 'ORDER QTY') ? 'bg-red-50' : ''}`}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-between items-center shrink-0">
                            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-2">
                                <ArrowLeft size={16} /> Back to Upload
                            </button>
                            <button 
                                onClick={handleImport}
                                disabled={selectedRows.length === 0}
                                className="px-6 py-2 bg-[#37352F] text-white rounded shadow-sm hover:bg-black transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={16} /> Import {selectedRows.length} Orders
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-[#37352F]">Import Successful!</h2>
                        <p className="text-gray-500 mt-2 mb-8 max-w-md">
                            Your orders have been successfully imported. Draft items can be updated later in the Orders Dashboard.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={onClose} className="px-6 py-2.5 bg-[#37352F] text-white rounded-md hover:bg-black transition-colors font-medium">
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};