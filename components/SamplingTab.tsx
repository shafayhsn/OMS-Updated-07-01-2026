import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Hash, FlaskConical, Printer, FileText, CheckSquare, X, CheckCircle2 } from 'lucide-react';
import { SampleRow, ColorRow, BOMItem, WashingData, SizeGroup, FittingData, EmbellishmentRecord } from '../types';
import { LOGO_URL } from '../constants';

interface SamplingTabProps {
  data: SampleRow[];
  onUpdate: (data: SampleRow[]) => void;
  colors: ColorRow[];
  bom: BOMItem[];
  washing: Record<string, WashingData>;
  sizeGroups: SizeGroup[];
  // Metadata for print
  factoryRef?: string;
  styleNo?: string;
  styleImage?: string | null;
  fitting?: FittingData[];
  embellishments?: EmbellishmentRecord[];
}

export const SamplingTab: React.FC<SamplingTabProps> = ({ 
    data, onUpdate, colors, bom, washing, sizeGroups,
    factoryRef, styleNo, styleImage, fitting = [], embellishments = []
}) => {
  // --- Form State ---
  const [formType, setFormType] = useState('Proto Sample');
  const [formColorId, setFormColorId] = useState<string>(''); // For Variant Selection
  const [formSize, setFormSize] = useState('');
  const [formQty, setFormQty] = useState(1);
  const [formDeadline, setFormDeadline] = useState('');
  const [formLabTest, setFormLabTest] = useState(false);

  const sampleTypes = [
    "Proto Sample", "Fit Sample", "Salesman Sample (SMS)", "Size Set",
    "Pre-Production (PP)", "Top of Production (TOP)", "Photo Sample", "Shipment Sample"
  ];

  // Derive available sizes from ALL size groups
  const availableSizes = useMemo(() => {
      const sizes: { group: string, size: string }[] = [];
      sizeGroups.forEach(group => {
          group.sizes.forEach(s => {
              sizes.push({ group: group.groupName, size: s });
          });
      });
      return sizes;
  }, [sizeGroups]);

  // --- Handlers ---

  const handleAddSample = () => {
    // 1. Resolve Data Sources
    const selectedColor = colors.find(c => c.id === formColorId);
    const colorName = selectedColor ? selectedColor.name : (colors.length === 1 ? colors[0].name : 'All Colors');
    
    // Auto-resolve Fabric (First Fabric in BOM)
    const mainFabric = bom.find(i => i.processGroup === 'Fabric');
    const fabricText = mainFabric ? `${mainFabric.componentName}\n${mainFabric.itemDetail || ''}` : 'TBD';

    // 2. Pull Lining information from Order Setup > BOM
    const liningItem = bom.find(i => 
      (i.processGroup === 'Fabric' || i.processGroup === 'Lining') && 
      (i.componentName.toLowerCase().includes('lining') || i.componentName.toLowerCase().includes('pocketing')) &&
      (i.usageRule === 'Generic' || (i.usageRule === 'By Color/Wash' && (i.usageData[colorName] || 0) > 0))
    );
    const liningText = liningItem ? `${liningItem.componentName}\n${liningItem.itemDetail || ''}` : '-';

    // 3. Pull Thread & Zipper information from BOM (all items linked to variant)
    const getTrimsText = (keyword: string, vName: string) => {
        const matches = bom.filter(i => 
            i.processGroup === 'Stitching Trims' && 
            i.componentName.toLowerCase().includes(keyword.toLowerCase()) &&
            (i.usageRule === 'Generic' || (i.usageRule === 'By Color/Wash' && (i.usageData[vName] || 0) > 0))
        );
        
        if (matches.length === 0) return 'Match Shell';
        
        return matches.map(item => 
            `${item.componentName}\n${item.itemDetail || 'Standard'}`
        ).join('\n');
    };

    const threadText = getTrimsText('thread', colorName);
    const zipperText = getTrimsText('zipper', colorName);

    const washInfo = colorName; 

    // 4. Generate SAM ID (SAMMMYY-000)
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    
    const monthKey = `${mm}${yy}`;
    const monthlySamples = data.filter(s => s.samNumber.startsWith(`SAM${monthKey}`));
    const nextSerial = String(monthlySamples.length + 1).padStart(3, '0');
    const samNumber = `SAM${monthKey}-${nextSerial}`;

    const newRow: SampleRow = {
        id: Math.random().toString(36).substr(2, 9),
        samNumber,
        type: formType,
        fabric: fabricText,
        shade: colorName, 
        wash: washInfo,
        baseSize: formSize || 'M',
        threadColor: threadText,
        zipperColor: zipperText,
        lining: liningText,
        quantity: formQty.toString(),
        deadline: formDeadline,
        status: 'Pending',
        isTestingRequired: formLabTest,
        isApproved: false,
        currentStage: 'Not Started',
        lastUpdated: new Date().toISOString()
    };

    onUpdate([...data, newRow]);
    
    setFormQty(1);
    setFormLabTest(false);
  };

  const handlePrintCheckSheet = () => {
      const printWindow = window.open('', '_blank', 'width=1200,height=900');
      if (!printWindow) return;

      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      // Local date formatter for DD-MM-YY
      const formatDateShort = (d: string) => {
          if (!d || d === 'TBD') return 'TBD';
          const parts = d.split('-');
          if (parts.length !== 3) return d;
          const [y, m, day] = parts;
          return `${day}-${m}-${y.slice(2)}`;
      };

      // Build rows with detailed metadata integration
      const rowsHtml = data.map((row, idx) => {
          // Resolve fitting for this specific row's size
          const sizeInfo = availableSizes.find(s => s.size === row.baseSize);
          const matchedFitting = fitting.find(f => f.sizeRange === sizeInfo?.group) || fitting.find(f => f.sizeRange === 'Generic');
          const fittingLabel = matchedFitting ? matchedFitting.fitName : 'Standard';

          // Resolve relevant embellishments for this row's style context
          const styleEmbs = embellishments.length > 0 
            ? embellishments.map(e => `<div style="margin-bottom:2px;">${e.artworkId} @ ${e.location}</div>`).join('') 
            : '-';

          return `
            <tr style="border-bottom: 1px solid #d1d5db;">
                <td style="padding: 6px; border-right: 1px solid #d1d5db; text-align: center; font-weight: 800; font-size: 11px;">${idx + 1}</td>
                <td style="padding: 4px; border-right: 1px solid #d1d5db; text-align: center; vertical-align: middle;">
                    ${styleImage ? `<img src="${styleImage}" style="width: 48px; height: 48px; object-fit: contain; border: 1px solid #eee; background: #fff;" />` : '<div style="font-size:7px; color:#ccc;">NO PIC</div>'}
                </td>
                <td style="padding: 6px; border-right: 1px solid #d1d5db; vertical-align: middle;">
                    <div style="font-weight: 900; font-size: 10px; color: #000; text-transform: uppercase;">${factoryRef || 'N/A'}</div>
                    <div style="font-size: 9px; color: #666; font-weight: 600;">${styleNo || '-'}</div>
                </td>
                <td style="padding: 6px; border-right: 1px solid #d1d5db; font-weight: 700; font-size: 9px; color: #1e3a8a; vertical-align: middle;">${row.type}</td>
                <td style="padding: 6px; border-right: 1px solid #d1d5db; font-weight: 800; font-size: 11px; text-align: center; vertical-align: middle;">${row.baseSize}</td>
                <td style="padding: 6px; border-right: 1px solid #d1d5db; text-align: center; font-weight: 900; font-size: 13px; vertical-align: middle;">${row.quantity}</td>
                <td style="padding: 6px; border-right: 1px solid #d1d5db; font-size: 9px; vertical-align: middle;">${fittingLabel}</td>
                <td style="padding: 6px; border-right: 1px solid #d1d5db; vertical-align: top;">
                    <div style="margin-bottom: 4px;">
                        <div style="font-weight: 800; font-size: 9px; white-space: pre-line; line-height: 1.1;">${row.fabric}</div>
                        <div style="font-size: 8px; color: #2563eb; font-weight: 900; margin-top: 2px; text-transform: uppercase;">SHADE: ${row.shade}</div>
                    </div>
                    <div style="border-top: 1px dashed #e5e7eb; padding-top: 2px; margin-top: 2px;">
                        <span style="display:block; font-size: 7px; font-weight: 800; color: #9ca3af; text-transform: uppercase;">Lining / Pocketing</span>
                        <div style="font-size: 8px; font-weight: 600; color: #4b5563; white-space: pre-line;">${row.lining === '-' ? 'None' : row.lining}</div>
                    </div>
                </td>
                <td style="padding: 6px; border-right: 1px solid #d1d5db; font-weight: 800; font-size: 9px; color: #000; text-transform: uppercase; vertical-align: middle;">${row.wash}</td>
                <td style="padding: 6px; border-right: 1px solid #d1d5db; vertical-align: top;">
                    <div style="margin-bottom: 2px;">
                        <div style="font-size: 6px; font-weight: 900; color: #3b82f6; text-transform: uppercase;">Thread</div>
                        <div style="font-size: 8px; white-space: pre-line; font-weight: 600; line-height: 1.1;">${row.threadColor}</div>
                    </div>
                    <div style="border-top: 1px solid #f3f4f6; padding-top: 2px; margin-top: 2px;">
                        <div style="font-size: 6px; font-weight: 900; color: #3b82f6; text-transform: uppercase;">Zipper</div>
                        <div style="font-size: 8px; white-space: pre-line; font-weight: 600; line-height: 1.1;">${row.zipperColor}</div>
                    </div>
                </td>
                <td style="padding: 6px; border-right: 1px solid #d1d5db; font-size: 8px; line-height: 1.2; color: #4b5563; vertical-align: middle;">${styleEmbs}</td>
                <td style="padding: 6px; border-right: 1px solid #d1d5db; font-family: monospace; font-weight: 800; font-size: 10px; text-align: center; vertical-align: middle; color: #b91c1c;">${formatDateShort(row.deadline)}</td>
                <td style="padding: 6px; vertical-align: middle; text-align: center;">
                    <div style="display: inline-flex; flex-direction: column; gap: 6px; align-items: flex-start; text-align: left;">
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <div style="width: 12px; height: 12px; border: 1.5px solid #111; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; flex-shrink: 0;">
                                ${row.isTestingRequired ? '✓' : ''}
                            </div>
                            <span style="font-size: 8px; font-weight: 900; color: #111;">LAB</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <div style="width: 12px; height: 12px; border: 1.5px solid #111; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; flex-shrink: 0;">
                                ${row.isApproved ? '✓' : ''}
                            </div>
                            <span style="font-size: 8px; font-weight: 900; color: #111;">BUYER</span>
                        </div>
                    </div>
                </td>
            </tr>
          `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sample Check Sheet - ${styleNo}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                body { font-family: 'Inter', sans-serif; padding: 15px; color: #111; line-height: 1.2; background: #fff; }
                .main-container { border: 2px solid #000; min-height: 270mm; position: relative; }
                
                /* Compact Header */
                .header-top { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 2px solid #000; background: #fff; }
                .header-logo { height: 28px; }
                .header-title { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
                
                /* Small Meta Strip */
                .meta-strip { display: flex; justify-content: space-between; align-items: center; padding: 6px 15px; border-bottom: 2px solid #000; background: #f9fafb; font-size: 9px; font-weight: 700; }
                .meta-item { display: flex; gap: 5px; }
                .meta-label { color: #6b7280; text-transform: uppercase; }
                .meta-val { color: #111; }
                
                /* Refined Table Theme */
                table { width: 100%; border-collapse: collapse; }
                th { background: #f3f4f6; color: #374151; padding: 10px 8px; font-size: 8px; font-weight: 900; text-transform: uppercase; text-align: left; border-bottom: 2px solid #000; border-right: 1px solid #d1d5db; }
                th:last-child { border-right: none; }
                td { vertical-align: top; }
                
                .page-footer { padding: 10px 20px; display: flex; justify-content: space-between; align-items: flex-end; position: absolute; bottom: 0; width: 100%; box-sizing: border-box; background: #fff; border-top: 1px solid #eee; }
                .sig-box { border-top: 1px solid #000; width: 180px; padding-top: 5px; font-size: 9px; font-weight: 800; text-transform: uppercase; text-align: center; }
                
                @media print { 
                    body { padding: 0; } 
                    .main-container { border: 2px solid #000; }
                }
            </style>
        </head>
        <body>
            <div class="main-container">
                <div class="header-top">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${LOGO_URL}" class="header-logo" />
                        <div class="header-title">Sample Execution Check Sheet</div>
                    </div>
                    <div style="font-size: 8px; font-weight: 800; color: #6b7280; text-align: right; line-height: 1;">
                        NIZAMIA OMS v6.5<br/>
                        ${dateStr}
                    </div>
                </div>

                <div class="meta-strip">
                    <div class="meta-item">
                        <span class="meta-label">Bulk Job:</span>
                        <span class="meta-val">${data[0]?.samNumber.split('-')[0] || 'NZ-POOL'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Total Sample Units:</span>
                        <span class="meta-val">${data.reduce((acc, r) => acc + (parseInt(r.quantity) || 0), 0)} PCS</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Dept Route:</span>
                        <span class="meta-val" style="color:#2563eb;">SAMPLING UNIT</span>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th width="3%" style="text-align:center;">#</th>
                            <th width="8%" style="text-align:center;">Article</th>
                            <th width="12%">Factory Ref / Style</th>
                            <th width="10%">Type</th>
                            <th width="4%" style="text-align:center;">Size</th>
                            <th width="4%" style="text-align:center;">Qty</th>
                            <th width="10%">Fit Mode</th>
                            <th width="20%">Fabric & Lining Tech Spec</th>
                            <th width="7%">Wash</th>
                            <th width="10%">Thread / Zipper</th>
                            <th width="12%">Embellishments</th>
                            <th width="8%" style="text-align:center;">Deadline</th>
                            <th width="5%" style="text-align:center;">QA</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="page-footer">
                    <div class="sig-box">Merchandising Manager</div>
                    <div class="sig-box">Quality Controller</div>
                    <div class="sig-box">Sampling In-Charge</div>
                </div>
            </div>
            
            <script>setTimeout(() => { window.print(); window.close(); }, 1200);</script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
  };

  const updateRowField = (id: string, field: keyof SampleRow, value: any) => {
    onUpdate(data.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleDeleteRow = (id: string) => {
    onUpdate(data.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      
      {/* 1. Program New Sample Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
         <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
            <Plus size={18} className="text-gray-400" />
            <h3 className="text-sm font-bold text-[#37352F] uppercase tracking-wide">Program New Sample</h3>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            
            <div className="md:col-span-1 space-y-1.5">
               <label className="text-xs font-medium text-gray-500 uppercase">Sample Type</label>
               <select 
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer"
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
               >
                  {sampleTypes.map(t => <option key={t} value={t}>{t}</option>)}
               </select>
            </div>

            <div className="md:col-span-1 space-y-1.5">
               <label className="text-xs font-medium text-gray-500 uppercase">Variant / Color</label>
               <select 
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer"
                  value={formColorId}
                  onChange={e => setFormColorId(e.target.value)}
               >
                  <option value="">-- Select --</option>
                  {colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
            </div>

            <div className="md:col-span-1 space-y-1.5">
               <label className="text-xs font-medium text-gray-500 uppercase">Base Size</label>
               <select
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer"
                  value={formSize}
                  onChange={e => setFormSize(e.target.value)}
               >
                  <option value="">-- Select Size --</option>
                  {availableSizes.map((s, idx) => (
                      <option key={`${s.group}-${s.size}-${idx}`} value={s.size}>
                          {s.size} ({s.group})
                      </option>
                  ))}
               </select>
            </div>

            <div className="md:col-span-1 space-y-1.5">
               <label className="text-xs font-medium text-gray-500 uppercase">Qty</label>
               <input 
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  value={formQty}
                  onChange={e => setFormQty(parseInt(e.target.value) || 1)}
                  min={1}
               />
            </div>

            <div className="md:col-span-1 space-y-1.5">
               <label className="text-xs font-medium text-gray-500 uppercase">Deadline</label>
               <input 
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all"
                  value={formDeadline}
                  onChange={e => setFormDeadline(e.target.value)}
               />
            </div>

            <div className="md:col-span-1 flex flex-col gap-2">
                <div 
                   onClick={() => setFormLabTest(!formLabTest)}
                   className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-all select-none text-xs font-medium
                      ${formLabTest ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-gray-200 text-gray-500'}`}
                >
                   {formLabTest ? <CheckSquare size={14} /> : <div className="w-3.5 h-3.5 border rounded border-gray-300"></div>}
                   Lab Test
                </div>
            </div>

         </div>
         
         <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
            <button 
               onClick={handleAddSample}
               disabled={!formType || !formSize}
               className="px-6 py-2 bg-[#37352F] text-white text-sm font-medium rounded hover:bg-black transition-colors shadow-sm disabled:opacity-50"
            >
               Generate Plan & Pull Data
            </button>
         </div>
      </div>

      {/* 2. Actions & Table */}
      {data.length > 0 && (
         <div className="space-y-4">
            <div className="flex justify-between items-center">
               <h2 className="text-lg font-medium text-[#37352F]">Planned Sampling Matrix</h2>
               <button 
                  onClick={handlePrintCheckSheet}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium"
               >
                  <Printer size={16} /> Sample Check Sheet
               </button>
            </div>

            <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden flex flex-col">
               <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-sm border-collapse min-w-[1400px]">
                     <thead className="bg-[#F7F7F5] text-xs uppercase tracking-wider text-gray-500 font-semibold sticky top-0 z-10">
                        <tr>
                           <th className="p-3 border-b border-r border-gray-200 w-12 text-center bg-[#F7F7F5]">#</th>
                           <th className="p-3 border-b border-gray-200 w-32">Type</th>
                           <th className="p-3 border-b border-gray-200 w-20 text-center">Size</th>
                           <th className="p-3 border-b border-gray-200 w-48">Fabric / Shade</th>
                           <th className="p-3 border-b border-gray-200 w-48">Lining</th>
                           <th className="p-3 border-b border-gray-200 w-32">Wash</th>
                           <th className="p-3 border-b border-gray-200 w-48">Thread</th>
                           <th className="p-3 border-b border-gray-200 w-48">Zipper</th>
                           <th className="p-3 border-b border-gray-200 w-16 text-center">Qty</th>
                           <th className="p-3 border-b border-gray-200 w-24">Deadline</th>
                           <th className="p-3 border-b border-gray-200 text-center">Action</th>
                           <th className="p-3 border-b border-gray-200 w-10"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {data.map((row, index) => (
                           <tr key={row.id} className="group hover:bg-gray-50 transition-colors align-top">
                              <td className="p-3 text-center text-gray-400 text-xs border-r border-gray-100 pt-5">{index + 1}</td>
                              
                              <td className="p-2 pt-4"><input type="text" value={row.type} onChange={(e) => updateRowField(row.id, 'type', e.target.value)} className="w-full bg-transparent outline-none border-b border-transparent focus:border-blue-500 font-medium text-[#37352F]" /></td>
                              
                              <td className="p-2 pt-4"><input type="text" value={row.baseSize} onChange={(e) => updateRowField(row.id, 'baseSize', e.target.value)} className="w-full text-center bg-transparent outline-none border-b border-transparent focus:border-blue-500" /></td>
                              
                              <td className="p-2 pt-4">
                                 <div className="flex flex-col gap-1">
                                    <textarea value={row.fabric} onChange={(e) => updateRowField(row.id, 'fabric', e.target.value)} className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 font-bold p-0 resize-none h-10 leading-tight" placeholder="Fabric" />
                                    <input type="text" value={row.shade} onChange={(e) => updateRowField(row.id, 'shade', e.target.value)} className="w-full text-[10px] text-gray-500 font-bold uppercase p-0 outline-none border-none bg-transparent" placeholder="Shade" />
                                 </div>
                              </td>

                              <td className="p-2 pt-4">
                                 <div className="flex flex-col gap-0.5">
                                    {row.lining.split('\n').map((line, lIdx) => (
                                        <input 
                                            key={lIdx}
                                            type="text" 
                                            value={line} 
                                            onChange={(e) => {
                                                const parts = row.lining.split('\n');
                                                parts[lIdx] = e.target.value;
                                                updateRowField(row.id, 'lining', parts.join('\n'));
                                            }}
                                            className={`w-full text-[10px] bg-transparent outline-none border-b border-transparent focus:border-blue-500 ${lIdx === 0 ? 'font-bold text-gray-800' : 'text-gray-400 font-medium italic'}`} 
                                        />
                                    ))}
                                 </div>
                              </td>

                              <td className="p-2 pt-4"><input type="text" value={row.wash} onChange={(e) => updateRowField(row.id, 'wash', e.target.value)} className="w-full text-xs bg-transparent outline-none border-b border-transparent focus:border-blue-500 font-bold uppercase" /></td>
                              
                              <td className="p-2 pt-4">
                                 <div className="flex flex-col gap-0.5">
                                    {row.threadColor.split('\n').map((line, lIdx) => (
                                        <input 
                                            key={lIdx}
                                            type="text" 
                                            value={line} 
                                            onChange={(e) => {
                                                const parts = row.threadColor.split('\n');
                                                parts[lIdx] = e.target.value;
                                                updateRowField(row.id, 'threadColor', parts.join('\n'));
                                            }}
                                            className={`w-full text-[10px] bg-transparent outline-none border-b border-transparent focus:border-blue-500 ${lIdx % 2 === 0 ? 'font-bold text-blue-600' : 'text-gray-400 font-medium italic'}`} 
                                        />
                                    ))}
                                 </div>
                              </td>

                              <td className="p-2 pt-4">
                                 <div className="flex flex-col gap-0.5">
                                    {row.zipperColor.split('\n').map((line, lIdx) => (
                                        <input 
                                            key={lIdx}
                                            type="text" 
                                            value={line} 
                                            onChange={(e) => {
                                                const parts = row.zipperColor.split('\n');
                                                parts[lIdx] = e.target.value;
                                                updateRowField(row.id, 'zipperColor', parts.join('\n'));
                                            }}
                                            className={`w-full text-[10px] bg-transparent outline-none border-b border-transparent focus:border-blue-500 ${lIdx % 2 === 0 ? 'font-bold text-blue-600' : 'text-gray-400 font-medium italic'}`} 
                                        />
                                    ))}
                                 </div>
                              </td>
                              
                              <td className="p-2 pt-4"><input type="number" value={row.quantity} onChange={(e) => updateRowField(row.id, 'quantity', e.target.value)} className="w-full text-center bg-transparent outline-none border-b border-transparent focus:border-blue-500 font-black text-base" /></td>
                              
                              <td className="p-2 pt-4"><input type="date" value={row.deadline} onChange={(e) => updateRowField(row.id, 'deadline', e.target.value)} className="w-full text-xs bg-transparent outline-none font-mono font-bold" /></td>
                              
                              <td className="p-2 pt-4">
                                 <div className="flex items-center justify-center gap-3">
                                    <button 
                                        onClick={() => updateRowField(row.id, 'isTestingRequired', !row.isTestingRequired)} 
                                        className={`p-1 rounded transition-colors ${row.isTestingRequired ? 'text-purple-600 bg-purple-50' : 'text-gray-300 hover:text-purple-400'}`}
                                        title="Lab Test Required"
                                    >
                                        <FlaskConical size={16} />
                                    </button>
                                    <button 
                                        onClick={() => updateRowField(row.id, 'isApproved', !row.isApproved)} 
                                        className={`p-1 rounded transition-colors ${row.isApproved ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-green-500'}`}
                                        title="Buyer's approval required"
                                    >
                                        <CheckCircle2 size={16} />
                                    </button>
                                 </div>
                              </td>

                              <td className="p-2 text-center pt-4">
                                 <button onClick={() => handleDeleteRow(row.id)} className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};
