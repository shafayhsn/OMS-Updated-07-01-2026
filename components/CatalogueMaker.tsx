
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, X, FileText, CheckSquare, Square, 
  Settings, Download, Trash2, Plus, Image as ImageIcon,
  Printer, ArrowLeft, Save, GripVertical, Columns
} from 'lucide-react';

// --- Types ---

export interface LineSheetEntry {
  id: string;
  photo: string; // Base64 or URL
  styleCode: string;
  color: string;
  fit: string;
  fabric: string;
  description: string;
  unitPrice: number | '';
  moq: number | '';
  sortOrder: number;
}

export interface PDFExportSettings {
  showStyleCode: boolean;
  showColor: boolean;
  showFabric: boolean;
  showFit: boolean;
  showDescription: boolean;
  showUnitPrice: boolean;
  showMOQ: boolean;
  // New Fields
  orientation: 'portrait' | 'landscape';
  productsPerPage: number;
  attnPerson: string;
  companyName: string;
}

interface CatalogueMakerProps {
  onClose: () => void;
}

const DEFAULT_SETTINGS: PDFExportSettings = {
  showStyleCode: true,
  showColor: true,
  showFabric: true,
  showFit: true,
  showDescription: true,
  showUnitPrice: true,
  showMOQ: true,
  orientation: 'portrait',
  productsPerPage: 6,
  attnPerson: '',
  companyName: '',
};

export const CatalogueMaker: React.FC<CatalogueMakerProps> = ({ onClose }) => {
  const [entries, setEntries] = useState<LineSheetEntry[]>([]);
  const [settings, setSettings] = useState<PDFExportSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [referenceNo, setReferenceNo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Generate Reference Number on mount
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    setReferenceNo(`LS-${dateStr}-${random}`);
  }, []);

  // --- Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);

    const fileArray = Array.from(files).slice(0, 50 - entries.length) as File[]; // Limit total to 50
    const newEntries: LineSheetEntry[] = [];
    let processedCount = 0;

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        newEntries.push({
          id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          photo: base64,
          styleCode: file.name.split('.')[0].replace(/[-_]/g, ' '), // Auto-guess style from filename
          color: '',
          fit: '',
          fabric: '',
          description: '',
          unitPrice: '',
          moq: '',
          sortOrder: entries.length + newEntries.length + 1
        });

        processedCount++;
        if (processedCount === fileArray.length) {
          setEntries((prev) => [...prev, ...newEntries]);
          setIsProcessing(false);
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file as Blob);
    });
  };

  const updateEntry = (id: string, field: keyof LineSheetEntry, value: any) => {
    setEntries((prev) => prev.map((entry) => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const deleteEntry = (id: string) => {
    if (window.confirm('Remove this item?')) {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    }
  };

  const toggleSetting = (key: keyof PDFExportSettings) => {
    // Only toggle boolean settings
    if (typeof settings[key] === 'boolean') {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const setAllSettings = (val: boolean) => {
    setSettings(prev => ({
      ...prev,
      showStyleCode: val,
      showColor: val,
      showFabric: val,
      showFit: val,
      showDescription: val,
      showUnitPrice: val,
      showMOQ: val,
    }));
  };

  // --- PDF Generation Logic (Print Proxy) ---
  const handleGeneratePDF = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      alert('Please allow popups to generate the PDF.');
      return;
    }

    // Determine Grid Columns
    let columns = 3; // Default portrait
    if (settings.orientation === 'landscape') columns = 4;
    // Adjust for density
    if (settings.productsPerPage <= 2) columns = 1;
    else if (settings.productsPerPage <= 4 && settings.orientation === 'portrait') columns = 2;
    else if (settings.productsPerPage <= 6 && settings.orientation === 'landscape') columns = 3;

    // Chunk entries based on Products Per Page
    const chunkedEntries = [];
    for (let i = 0; i < entries.length; i += settings.productsPerPage) {
        chunkedEntries.push(entries.slice(i, i + settings.productsPerPage));
    }

    const pagesHtml = chunkedEntries.map((chunk, pageIndex) => `
      <div class="page">
        
        <!-- Header -->
        <div class="header">
           <div class="brand">
              <h1>Nizamia Apparels</h1>
           </div>
           <div class="meta">
              ${settings.companyName ? `<div>${settings.companyName}</div>` : ''}
              ${settings.attnPerson ? `<div>Attn: ${settings.attnPerson}</div>` : ''}
              <div>Date: ${new Date().toLocaleDateString()}</div>
           </div>
        </div>

        <!-- Grid -->
        <div class="grid">
        ${chunk.map(entry => `
            <div class="card">
                <div class="img-wrapper">
                    <img src="${entry.photo}" />
                </div>
                <div class="info">
                    ${settings.showStyleCode ? `
                        <div class="info-row">
                            <span class="label">Style</span>
                            <span class="val">${entry.styleCode}</span>
                        </div>
                    ` : ''}
                    
                    ${settings.showColor ? `
                        <div class="info-row">
                            <span class="label">Color</span>
                            <span class="val">${entry.color}</span>
                        </div>
                    ` : ''}

                    ${settings.showFabric ? `
                        <div class="info-row">
                            <span class="label">Fabric</span>
                            <span class="val">${entry.fabric}</span>
                        </div>
                    ` : ''}

                    ${settings.showFit ? `
                        <div class="info-row">
                            <span class="label">Fit</span>
                            <span class="val">${entry.fit}</span>
                        </div>
                    ` : ''}
                    
                    ${settings.showDescription && entry.description ? `
                        <div class="desc">${entry.description}</div>
                    ` : ''}

                    <div class="price-tag">
                        ${settings.showMOQ ? `<span style="font-weight:400; color:#666;">MOQ: ${entry.moq}</span>` : '<span></span>'}
                        ${settings.showUnitPrice ? `<span>$${entry.unitPrice}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('')}
        </div>

        <!-- Footer -->
        <div class="footer">
            <div>Ref: ${referenceNo}</div>
            <div>Page ${pageIndex + 1} of ${chunkedEntries.length}</div>
        </div>
      </div>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${referenceNo} - Nizamia Apparels</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
          @page { 
            size: A4 ${settings.orientation}; 
            margin: 0;
          }
          body { 
            font-family: 'Inter', sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #111; 
            background: #fff;
            -webkit-print-color-adjust: exact; 
          }
          
          .page {
            width: 100vw;
            height: 100vh;
            padding: 40px; 
            box-sizing: border-box;
            position: relative;
            display: flex;
            flex-direction: column;
            page-break-after: always;
          }

          .page:last-child {
            page-break-after: avoid;
          }

          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 20px;
            border-bottom: 2px solid #111;
            margin-bottom: 20px;
          }

          .brand h1 {
            font-size: 24px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            margin: 0;
          }

          .meta {
            text-align: right;
            font-size: 10px;
            line-height: 1.4;
            color: #444;
            font-weight: 500;
          }

          /* Grid */
          .grid {
            display: grid;
            grid-template-columns: repeat(${columns}, 1fr);
            gap: 20px; 
            flex-grow: 1;
            align-content: start; 
          }

          /* Product Card */
          .card {
            border: 1px solid #eee;
            padding: 12px;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            background: #fff;
            break-inside: avoid;
          }

          .img-wrapper {
            width: 100%;
            aspect-ratio: 1/1; 
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
            background: #fcfcfc;
            border-radius: 2px;
            border: 1px solid #f5f5f5;
            overflow: hidden;
          }

          .img-wrapper img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            mix-blend-mode: multiply; 
          }

          .info {
            font-size: 10px;
            line-height: 1.4;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            border-bottom: 1px dashed #f0f0f0;
            padding-bottom: 2px;
          }
          
          .label { color: #888; font-weight: 500; }
          .val { font-weight: 600; color: #000; text-align: right; }

          .desc {
            margin-top: 8px;
            color: #555;
            font-size: 9px;
            height: 3em; 
            overflow: hidden;
            font-style: italic;
          }

          .price-tag {
            margin-top: auto; 
            padding-top: 10px;
            font-size: 12px;
            font-weight: 700;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }

          /* Footer */
          .footer {
            margin-top: auto;
            padding-top: 10px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #999;
          }

        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          setTimeout(() => { window.print(); }, 800);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setIsSettingsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[95vw] h-[95vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#37352F]">Catalogue & Line Sheet Maker</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                 <span>{entries.length} items</span>
                 <span className="text-gray-300">|</span>
                 <span className="font-mono bg-gray-100 px-1 rounded">{referenceNo}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium"
            >
              {isProcessing ? 'Processing...' : <><Upload size={16} /> Add Images</>}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              accept="image/*" 
              onChange={handleFileUpload}
            />
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              disabled={entries.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#37352F] text-white rounded-md hover:bg-black transition-colors shadow-sm text-sm font-medium disabled:opacity-50"
            >
              <Printer size={16} /> Export PDF
            </button>
            
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full hover:text-red-500 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Main Content (Tabular View) */}
        <div className="flex-1 overflow-auto bg-white">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 bg-gray-50/30">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-sm border-2 border-dashed border-gray-300 cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all group"
              >
                <ImageIcon size={48} className="text-gray-300 group-hover:text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-700">Start by Uploading Images</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                  Upload up to 25 product photos. They will be auto-formatted into a line sheet table.
                </p>
              </div>
            </div>
          ) : (
            <div className="min-w-[1200px]">
               <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#F7F7F5] text-xs font-semibold text-gray-500 uppercase sticky top-0 z-10 shadow-sm">
                     <tr>
                        <th className="px-4 py-3 w-16 text-center border-r border-gray-200">#</th>
                        <th className="px-4 py-3 w-24 border-r border-gray-200">Photo</th>
                        <th className="px-4 py-3 w-40 border-r border-gray-200">Style Code</th>
                        <th className="px-4 py-3 w-32 border-r border-gray-200">Color</th>
                        <th className="px-4 py-3 w-32 border-r border-gray-200">Fabric</th>
                        <th className="px-4 py-3 w-32 border-r border-gray-200">Fit</th>
                        <th className="px-4 py-3 border-r border-gray-200">Description</th>
                        <th className="px-4 py-3 w-28 text-right border-r border-gray-200">Price ($)</th>
                        <th className="px-4 py-3 w-24 text-right border-r border-gray-200">MOQ</th>
                        <th className="px-4 py-3 w-12 text-center"></th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {entries.map((entry, index) => (
                        <tr key={entry.id} className="group hover:bg-gray-50">
                           <td className="px-4 py-3 text-center text-gray-400 font-medium border-r border-gray-100 bg-gray-50/30">
                              {index + 1}
                           </td>
                           <td className="px-4 py-3 border-r border-gray-100">
                              <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                                 <img src={entry.photo} alt="" className="w-full h-full object-cover" />
                              </div>
                           </td>
                           <td className="px-4 py-3 border-r border-gray-100">
                              <input 
                                 type="text" 
                                 value={entry.styleCode}
                                 onChange={(e) => updateEntry(entry.id, 'styleCode', e.target.value)}
                                 className="w-full bg-transparent outline-none font-medium text-[#37352F] placeholder-gray-300"
                                 placeholder="Style #"
                              />
                           </td>
                           <td className="px-4 py-3 border-r border-gray-100">
                              <input 
                                 type="text" 
                                 value={entry.color}
                                 onChange={(e) => updateEntry(entry.id, 'color', e.target.value)}
                                 className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-300"
                                 placeholder="Color"
                              />
                           </td>
                           <td className="px-4 py-3 border-r border-gray-100">
                              <input 
                                 type="text" 
                                 value={entry.fabric}
                                 onChange={(e) => updateEntry(entry.id, 'fabric', e.target.value)}
                                 className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-300"
                                 placeholder="Fabric"
                              />
                           </td>
                           <td className="px-4 py-3 border-r border-gray-100">
                              <input 
                                 type="text" 
                                 value={entry.fit}
                                 onChange={(e) => updateEntry(entry.id, 'fit', e.target.value)}
                                 className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-300"
                                 placeholder="Fit"
                              />
                           </td>
                           <td className="px-4 py-3 border-r border-gray-100">
                              <textarea 
                                 rows={2}
                                 value={entry.description}
                                 onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                                 className="w-full bg-transparent outline-none text-gray-600 text-xs resize-none placeholder-gray-300"
                                 placeholder="Product details..."
                              />
                           </td>
                           <td className="px-4 py-3 text-right border-r border-gray-100">
                              <input 
                                 type="number" 
                                 value={entry.unitPrice}
                                 onChange={(e) => updateEntry(entry.id, 'unitPrice', e.target.value)}
                                 className="w-full bg-transparent outline-none text-right font-mono font-medium text-gray-800 placeholder-gray-300"
                                 placeholder="0.00"
                              />
                           </td>
                           <td className="px-4 py-3 text-right border-r border-gray-100">
                              <input 
                                 type="number" 
                                 value={entry.moq}
                                 onChange={(e) => updateEntry(entry.id, 'moq', e.target.value)}
                                 className="w-full bg-transparent outline-none text-right font-mono text-gray-600 placeholder-gray-300"
                                 placeholder="0"
                              />
                           </td>
                           <td className="px-4 py-3 text-center">
                              <button 
                                 onClick={() => deleteEntry(entry.id)}
                                 className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1.5"
                              >
                                 <Trash2 size={16} />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-[#37352F] flex items-center gap-2">
                <Settings size={18} /> Export Configuration
              </h3>
              <button onClick={() => setIsSettingsOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600"/></button>
            </div>

            <div className="space-y-6">
                
                {/* Section: Client Info */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Recipient Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Attention To</label>
                            <input 
                                type="text"
                                placeholder="e.g. John Doe"
                                value={settings.attnPerson}
                                onChange={(e) => setSettings({...settings, attnPerson: e.target.value})}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-amber-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Company Name</label>
                            <input 
                                type="text"
                                placeholder="e.g. Zara Home"
                                value={settings.companyName}
                                onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-amber-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Layout */}
                <div className="space-y-3 border-t border-gray-100 pt-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Layout & Format</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Page Orientation</label>
                            <div className="flex bg-gray-100 p-1 rounded">
                                <button 
                                    onClick={() => setSettings({...settings, orientation: 'portrait'})}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded ${settings.orientation === 'portrait' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                                >
                                    Portrait
                                </button>
                                <button 
                                    onClick={() => setSettings({...settings, orientation: 'landscape'})}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded ${settings.orientation === 'landscape' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                                >
                                    Landscape
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">Products Per Page</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number"
                                    min="1" max="12"
                                    value={settings.productsPerPage}
                                    onChange={(e) => setSettings({...settings, productsPerPage: parseInt(e.target.value) || 1})}
                                    className="w-20 border border-gray-300 rounded px-3 py-2 text-sm text-center font-mono"
                                />
                                <span className="text-xs text-gray-400">items</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Fields */}
                <div className="space-y-3 border-t border-gray-100 pt-4">
                    <div className="flex justify-between items-center text-xs mb-2">
                        <span className="font-bold text-gray-500 uppercase">Visible Columns</span>
                        <div className="flex gap-2">
                            <button onClick={() => setAllSettings(true)} className="text-blue-600 hover:underline">All</button>
                            <button onClick={() => setAllSettings(false)} className="text-gray-400 hover:text-gray-600 hover:underline">None</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {Object.keys(DEFAULT_SETTINGS).filter(k => k.startsWith('show')).map((key) => {
                        const settingKey = key as keyof PDFExportSettings;
                        const label = key.replace('show', '').replace(/([A-Z])/g, ' $1').trim();
                        // @ts-ignore
                        const val = settings[settingKey];
                        return (
                            <div 
                            key={key} 
                            onClick={() => toggleSetting(settingKey)}
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-all text-xs select-none
                                ${val ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                            {val ? <CheckSquare size={14} className="text-amber-600" /> : <Square size={14} className="text-gray-300" />}
                            {label}
                            </div>
                        );
                        })}
                    </div>
                </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button 
                onClick={handleGeneratePDF}
                className="w-full py-3 bg-[#37352F] text-white rounded-md hover:bg-black transition-colors font-medium flex items-center justify-center gap-2 shadow-sm"
              >
                <Download size={18} /> Generate PDF Line Sheet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
