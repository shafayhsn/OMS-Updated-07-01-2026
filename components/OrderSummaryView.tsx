import React from 'react';
import { 
  Download, Edit2, Info, Layers, ArrowLeft, ImageIcon, Hash
} from 'lucide-react';
import { NewOrderState, FittingData, WashingData } from '../types';
import { formatAppDate } from '../constants';

interface OrderSummaryViewProps {
  orderData: NewOrderState;
  onEdit?: () => void;
  onGeneratePDF?: () => void;
  onClose?: () => void;
}

// Helper for Ratio Calculation
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
const calculateRatio = (nums: number[]): string => {
  const nonZero = nums.filter(n => n > 0);
  if (nonZero.length === 0) return "-";
  let d = nonZero[0];
  for (let i = 1; i < nonZero.length; i++) d = gcd(d, nonZero[i]);
  return nums.map(n => n / d).join(":");
};

export const OrderSummaryView: React.FC<OrderSummaryViewProps> = ({ orderData, onEdit, onGeneratePDF, onClose }) => {
  const { generalInfo, bom, sampling, finishing, fitting, embellishments, washing } = orderData;
  const { formData, sizeGroups } = generalInfo;

  const getTotalQty = () => {
    let total = 0;
    sizeGroups.forEach(group => {
      Object.values(group.breakdown).forEach(row => {
        Object.values(row).forEach(qty => total += Number(qty) || 0);
      });
    });
    return total;
  };

  const fittingList: FittingData[] = Array.isArray(fitting) ? fitting : (fitting ? [fitting] : []);

  const handlePrintPO = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    
    // --- 1. Prepare Data ---
    const buyer = formData.buyerName || '';
    const agent = formData.incoterms || '-'; 
    const merchandiser = formData.merchandiserName || '';
    const poNumber = formData.poNumber || '';
    const styleNumber = formData.styleNumber || '';
    const productID = formData.productID || '';
    const factoryRef = formData.factoryRef || '';
    const poDate = formatAppDate(formData.poDate);
    const shipDate = formatAppDate(formData.shipDate);
    const plannedDate = formatAppDate(formData.plannedDate);

    // --- 2. PO Breakdown Matrices ---
    const breakdownHtml = sizeGroups.map(group => {
        const fitObj = fittingList.find(f => f.sizeRange === group.groupName) || fittingList.find(f => f.sizeRange === 'Generic');
        const fitName = fitObj ? fitObj.fitName : '-';
        
        const headerRow = `
            <tr class="br-header">
                <td style="text-align:left; font-weight:bold; border-bottom: 2px solid #000; width: 140px;">${group.groupName} (${fitName})</td>
                ${group.sizes.map(s => `<td style="border-bottom: 2px solid #000;">${s}</td>`).join('')}
                <td style="border-bottom: 2px solid #000; font-weight: bold;">TOTAL</td>
                <td style="border-bottom: 2px solid #000; font-weight: bold;">RATIO</td>
            </tr>
        `;
        
        const colorRows = group.colors.map(color => {
            const qtys = group.sizes.map(s => parseInt(group.breakdown[color.id]?.[s] || '0') || 0);
            const rowTotal = qtys.reduce((a, b) => a + b, 0);
            const ratio = calculateRatio(qtys);
            return `
                <tr class="br-row">
                    <td style="text-align:left; font-weight:bold;">${color.name}</td>
                    ${qtys.map(q => `<td>${q || '-'}</td>`).join('')}
                    <td style="font-weight:bold; background: #fcfcfc;">${rowTotal}</td>
                    <td style="font-size: 8px; font-weight:bold;">${ratio}</td>
                </tr>
            `;
        }).join('');

        return `<table class="br-table">${headerRow}${colorRows}</table>`;
    }).join('<div style="margin-top:4px;"></div>');

    // --- 3. Body Sections Configuration ---
    const checkIcon = '&#9745;'; // ☑
    const boxIcon = '&#9744;';   // ☐

    const getRows = (cat: string, list: any[], renderer: (i: any) => string) => {
        const items = list.length > 0 ? list : [{}];
        const first = renderer(items[0]);
        const rest = items.slice(1).map(i => `<tr>${renderer(i)}</tr>`).join('');
        return `
            <tr class="category-block">
                <td rowspan="${items.length}" class="v-cat"><span>${cat}</span></td>
                ${first}
            </tr>
            ${rest}
        `;
    };

    const samplingRows = getRows('Sampling', sampling, (s) => `
        <td>${s.samNumber || ''} ${s.type || ''}</td>
        <td>${s.fabric || ''} | ${s.shade || ''}</td>
        <td class="center">X</td>
        <td class="center">X</td>
        <td class="center">${s.quantity || ''}</td>
        <td class="center" style="font-size: 14px;">${s.isApproved ? checkIcon : boxIcon}</td>
        <td class="center" style="font-size: 14px;">${s.isTestingRequired ? checkIcon : boxIcon}</td>
        <td>${s.status || ''}</td>
    `);

    const fabricationRows = getRows('Fabrication', bom.filter(i => i.processGroup === 'Fabric'), (i) => `
        <td>${i.componentName || ''}</td>
        <td>${i.itemDetail || ''}</td>
        <td class="center">Generic</td>
        <td class="center">${i.usageData?.['generic'] || ''}</td>
        <td class="center">${i.usageData ? Math.ceil(i.usageData['generic'] * getTotalQty()).toLocaleString() : ''}</td>
        <td class="center" style="font-size: 14px;">${i.isApproved ? checkIcon : boxIcon}</td>
        <td class="center" style="font-size: 14px;">${i.isTestingRequired ? checkIcon : boxIcon}</td>
        <td>${i.sourcingStatus || ''}</td>
    `);

    const stitchTrimsRows = getRows('Stitching Trims', bom.filter(i => i.processGroup === 'Stitching Trims'), (i) => `
        <td>${i.componentName || ''}</td>
        <td>${i.itemDetail || ''}</td>
        <td class="center">${i.usageRule || 'Generic'}</td>
        <td class="center">${i.usageData ? Object.values(i.usageData)[0] : ''}</td>
        <td class="center">${i.usageData ? Math.ceil((Number(Object.values(i.usageData)[0]) || 0) * getTotalQty()).toLocaleString() : ''}</td>
        <td class="center" style="font-size: 14px;">${i.isApproved ? checkIcon : boxIcon}</td>
        <td class="center" style="font-size: 14px;">${i.isTestingRequired ? checkIcon : boxIcon}</td>
        <td>${i.sourcingStatus || ''}</td>
    `);

    const packingTrimsRows = getRows('Packing Trims', bom.filter(i => i.processGroup === 'Packing Trims'), (i) => `
        <td>${i.componentName || ''}</td>
        <td>${i.itemDetail || ''}</td>
        <td class="center">Generic</td>
        <td class="center">${i.usageData ? Object.values(i.usageData)[0] : ''}</td>
        <td class="center">${i.usageData ? Math.ceil((Number(Object.values(i.usageData)[0]) || 0) * getTotalQty()).toLocaleString() : ''}</td>
        <td class="center" style="font-size: 14px;">${i.isApproved ? checkIcon : boxIcon}</td>
        <td class="center" style="font-size: 14px;">${i.isTestingRequired ? checkIcon : boxIcon}</td>
        <td>${i.sourcingStatus || ''}</td>
    `);

    const washRows = getRows('Wash', Object.values(washing || {}), (w) => `
        <td>${w.washName || ''}</td>
        <td>${w.washRecipeNotes || ''}</td>
        <td class="center">X</td>
        <td class="center">X</td>
        <td class="center">X</td>
        <td class="center" style="font-size: 14px;">${w.isApproved ? checkIcon : boxIcon}</td>
        <td class="center" style="font-size: 14px;">${boxIcon}</td>
        <td>${w.washName ? 'Approved' : ''}</td>
    `);

    const printRows = getRows('Print Emb', embellishments, (e) => `
        <td>${e.artworkId || ''} (${e.type || ''})</td>
        <td>${e.location || ''} | ${e.colorInfo || ''}</td>
        <td class="center">Generic</td>
        <td class="center">1</td>
        <td class="center">${getTotalQty().toLocaleString() || ''}</td>
        <td class="center" style="font-size: 14px;">${e.isApproved ? checkIcon : boxIcon}</td>
        <td class="center" style="font-size: 14px;">${e.isTestingRequired ? checkIcon : boxIcon}</td>
        <td>${e.status || ''}</td>
    `);

    const packingMethodRows = getRows('Packing Method', finishing.packingList || [], (p) => `
        <td>${p.name || ''}</td>
        <td>${p.method || ''} | ${p.polybagSpec || ''}</td>
        <td class="center">Generic</td>
        <td class="center">1</td>
        <td class="center">${p.totalAllocated?.toLocaleString() || ''}</td>
        <td class="center" style="font-size: 14px;">${boxIcon}</td>
        <td class="center" style="font-size: 14px;">${boxIcon}</td>
        <td>Approved</td>
    `);

    printWindow.document.write(`
      <html>
      <head>
        <title>PO SUMMARY - ${styleNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 15px; margin: 0; color: #000; -webkit-print-color-adjust: exact; font-size: 8.5px; }
            .report-container { width: 210mm; margin: auto; border: 2px solid #000; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            td, th { border: 1px solid #000; padding: 3px 5px; vertical-align: top; word-wrap: break-word; }

            .title-strip td { height: 32px; font-size: 12px; font-weight: bold; background: #fff; vertical-align: middle; text-transform: uppercase; border-bottom: 2.5px solid #000; }
            
            .meta-grid { border-top: none; }
            .meta-grid td { padding: 8px 10px; border: none; border-bottom: 1.5px solid #000; vertical-align: top; }
            .meta-grid td.col-sep { border-right: 1.5px solid #000; }
            .meta-label { font-weight: bold; text-transform: uppercase; width: 80px; display: inline-block; font-size: 8px; color: #333; }
            .meta-value { font-weight: normal; font-size: 9px; color: #000; }

            .id-box { border: 3px solid #000; text-align: center; font-size: 20px; font-weight: bold; padding: 10px; background: #f5f5f5; margin-bottom: 5px; }
            .photo-frame { width: 110px; height: 130px; border: 1.5px solid #000; margin-left: auto; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fff; }
            .photo-frame img { max-width: 100%; max-height: 100%; object-fit: contain; }

            .date-strip td { font-size: 9px; font-weight: bold; background: #fcfcfc; padding: 6px 12px; border-top: none; border-bottom: 1.5px solid #000; }
            .date-strip .dv { font-weight: normal; margin-left: 5px; font-family: monospace; }

            .breakdown-section td { padding: 10px; vertical-align: top; border: none; border-bottom: 2px solid #000; }
            .br-table { border: none; font-size: 8.5px; }
            .br-table td { border: none; text-align: center; padding: 1px 4px; height: auto; }
            .br-header td { font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #000 !important; }

            .main-body-table { border-top: none; border-bottom: 1.5px solid #000; }
            .main-body-table th { background: #f2f2f2; font-weight: bold; font-size: 8.5px; text-transform: uppercase; text-align: left; height: 30px; border: 1px solid #000; }
            .main-body-table td { font-size: 8.5px; border: 1px solid #000; height: 22px; vertical-align: middle; }
            .v-cat { width: 30px; text-align: center; background: #fff; border-right: 2px solid #000 !important; }
            .v-cat span { writing-mode: vertical-rl; transform: rotate(180deg); font-weight: bold; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; padding: 8px 0; }
            .center { text-align: center; }

            .footer-strip { margin-top: 30px; display: flex; justify-content: space-between; padding: 0 40px; }
            .sig-area { width: 180px; border-top: 1.5px solid #000; text-align: center; padding-top: 6px; font-weight: bold; font-size: 8.5px; text-transform: uppercase; }

            @media print {
                body { padding: 0; }
                .report-container { border-width: 2.5px; }
            }
        </style>
      </head>
      <body>
        <div class="report-container">
            <!-- Header Section -->
            <table class="title-strip">
                <tr>
                    <td width="30%">STYLE SUMMARY SHEET</td>
                    <td width="35%">Fty Ref: ${factoryRef}</td>
                    <td width="20%">Date: ${today}</td>
                    <td width="15%" style="text-align:right;">Page 1</td>
                </tr>
            </table>

            <!-- High Density Meta Grid -->
            <table class="meta-grid">
                <tr>
                    <td width="38%" class="col-sep">
                        <div style="margin-bottom:4px;"><span class="meta-label">Buyer</span>: <span class="meta-value" style="font-weight:bold;">${buyer}</span></div>
                        <div style="margin-bottom:4px;"><span class="meta-label">Agent</span>: <span class="meta-value">${agent}</span></div>
                        <div style="margin-bottom:4px;"><span class="meta-label">Merchandiser</span>: <span class="meta-value">${merchandiser}</span></div>
                    </td>
                    <td width="37%" class="col-sep">
                        <div style="margin-bottom:4px;"><span class="meta-label">PO #</span>: <span class="meta-value" style="font-weight:bold; font-family:monospace;">${poNumber}</span></div>
                        <div style="margin-bottom:4px;"><span class="meta-label">Style #</span>: <span class="meta-value">${styleNumber}</span></div>
                        <div style="margin-bottom:4px;"><span class="meta-label">Product ID</span>: <span class="meta-value">${productID}</span></div>
                    </td>
                    <td width="25%" style="text-align:right; border-bottom: 1.5px solid #000;">
                        <div class="id-box">NZ-001-25</div>
                        <div class="photo-frame">
                            ${generalInfo.styleImage ? `<img src="${generalInfo.styleImage}" />` : '<span style="color:#ddd; font-weight:bold; font-size:7px;">PICTURE</span>'}
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Timeline Ribbon -->
            <table class="date-strip">
                <tr>
                    <td width="33.3%">PO DATE: <span class="dv">${poDate}</span></td>
                    <td width="33.3%">PP MEETING: <span class="dv">${plannedDate}</span></td>
                    <td width="33.3%">SHIP DATE: <span class="dv" style="font-weight:bold; color:red;">${shipDate}</span></td>
                </tr>
            </table>

            <!-- Optimized PO Breakdown -->
            <table class="breakdown-section">
                <tr>
                    <td width="100%">
                        <div style="font-weight:bold; text-transform:uppercase; margin-bottom:6px; font-size:10px; border-bottom: 1.5px solid #000; padding-bottom: 2px;">PO Breakdown & Ratios</div>
                        ${breakdownHtml || '<div style="color:#ccc; font-style:italic; padding: 10px 0;">No matrix defined in system.</div>'}
                    </td>
                </tr>
            </table>

            <!-- Detailed Requirements Table -->
            <table class="main-body-table">
                <thead>
                    <tr>
                        <th width="4%">Type</th>
                        <th width="18%">Item Name / Material</th>
                        <th width="28%">Detail Specification</th>
                        <th width="9%" class="center">Usage</th>
                        <th width="7%" class="center">Cons</th>
                        <th width="9%" class="center">Req Qty</th>
                        <th width="6%" class="center">Buyer App</th>
                        <th width="6%" class="center">Lab Test</th>
                        <th width="13%">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${samplingRows}
                    ${fabricationRows}
                    ${stitchTrimsRows}
                    ${packingTrimsRows}
                    ${washRows}
                    ${printRows}
                    ${packingMethodRows}
                </tbody>
            </table>
        </div>

        <div class="footer-strip">
            <div class="sig-area">Merchandiser Signature</div>
            <div class="sig-area">QA Manager Signature</div>
            <div class="sig-area">Director Approval</div>
        </div>

        <script>
            window.onload = () => {
                setTimeout(() => { window.print(); }, 1000);
            };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8 bg-white min-h-screen print:p-0 print:max-w-none animate-in fade-in zoom-in-95 duration-200">
      
      {/* --- SCREEN HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200 print:hidden">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <h1 className="text-3xl font-bold text-[#37352F]">Order Summary</h1>
             <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 uppercase tracking-wide">
               {formData.poNumber ? 'PO CONFIRMED' : 'DRAFT ORDER'}
             </span>
           </div>
           <p className="text-sm text-gray-500">
             Job #: <span className="font-mono text-gray-700 font-medium">{formData.jobNumber}</span> • Style: {formData.styleNumber}
           </p>
        </div>
        <div className="flex items-center gap-3 no-print">
          {onClose && (
            <button 
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors shadow-sm"
            >
                <ArrowLeft size={16} /> Back to Orders
            </button>
          )}
          <button 
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            <Edit2 size={16} /> Edit Order
          </button>
          <button 
            onClick={handlePrintPO}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#37352F] rounded hover:bg-black transition-colors"
          >
            <Download size={16} /> Print / Save PO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* General Info Card */}
           <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row">
              <div className="w-full md:w-48 h-48 bg-gray-100 border-r border-gray-200 relative flex-shrink-0">
                 {generalInfo.styleImage ? (
                    <img src={generalInfo.styleImage} alt="Style" className="w-full h-full object-cover" />
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
                       <ImageIcon size={24} className="mb-2 opacity-50" />
                       No Image
                    </div>
                 )}
              </div>

              <div className="flex-1">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                    <Info size={18} className="text-gray-400" />
                    <h2 className="text-sm font-bold text-[#37352F] uppercase tracking-wide">Order Metadata</h2>
                </div>
                <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs text-gray-500 block">Buyer</label>
                        <span className="text-sm font-medium text-gray-900">{formData.buyerName}</span>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block">Merchandiser</label>
                        <span className="text-sm font-medium text-gray-900">{formData.merchandiserName || '-'}</span>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block">Factory Ref</label>
                        <span className="text-sm font-medium text-gray-900">{formData.factoryRef || '-'}</span>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block">Style Number</label>
                        <span className="text-sm font-medium text-gray-900">{formData.styleNumber}</span>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block">PO Number</label>
                        <span className="text-sm font-medium text-gray-900">{formData.poNumber || '-'}</span>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block">PO Date</label>
                        <span className="text-sm font-medium text-gray-900">{formatAppDate(formData.poDate)}</span>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block">Ship Date</label>
                        <span className="text-sm font-medium text-gray-900">{formatAppDate(formData.shipDate)}</span>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block">Ship Mode</label>
                        <span className="text-sm font-medium text-gray-900">{formData.shipMode}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-3 pt-2 border-t border-gray-100 mt-2">
                        <label className="text-xs text-gray-500 block">Total Quantity</label>
                        <span className="text-lg font-bold text-blue-600">{getTotalQty().toLocaleString()} pcs</span>
                    </div>
                </div>
              </div>
           </div>

           {/* PO Breakdown Matrix */}
           <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                 <Hash size={18} className="text-gray-400" />
                 <h2 className="text-sm font-bold text-[#37352F] uppercase tracking-wide">Size Breakdown</h2>
              </div>
              <div className="p-5 space-y-6">
                {sizeGroups.length > 0 ? (
                    sizeGroups.map(group => (
                    <div key={group.id} className="border border-gray-100 rounded-lg overflow-hidden">
                        <div className="bg-gray-50/50 px-3 py-2 text-xs font-bold text-gray-600 uppercase border-b border-gray-100 flex justify-between">
                            <span>{group.groupName}</span>
                            <span>{group.unitPrice} {group.currency}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500">
                                    <th className="px-3 py-2 font-medium">Color</th>
                                    {group.sizes.map(size => (
                                        <th key={size} className="px-2 py-2 text-center font-medium">{size}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {group.colors.map(color => (
                                    <tr key={color.id}>
                                        <td className="px-3 py-2 font-medium text-gray-800">{color.name}</td>
                                        {group.sizes.map(size => (
                                        <td key={size} className="px-2 py-2 text-center text-gray-600">
                                            {group.breakdown[color.id]?.[size] || '-'}
                                        </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                    ))
                ) : (
                    <div className="text-sm text-gray-400 text-center py-4">No breakdown defined.</div>
                )}
              </div>
           </div>

           {/* BOM Summary Table */}
           <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Layers size={18} className="text-gray-400" />
                    <h2 className="text-sm font-bold text-[#37352F] uppercase tracking-wide">Bill of Materials</h2>
                 </div>
                 <span className="text-xs text-gray-500">{bom.length} items</span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                       <tr>
                          <th className="px-5 py-2 font-medium">Type</th>
                          <th className="px-5 py-2 font-medium">Component</th>
                          <th className="px-5 py-2 font-medium">Supplier</th>
                          <th className="px-5 py-2 font-medium text-center">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {bom.map(item => (
                          <tr key={item.id}>
                             <td className="px-5 py-2 text-xs text-gray-500">{item.processGroup}</td>
                             <td className="px-5 py-2 font-medium text-gray-800">{item.componentName || 'Untitled'}</td>
                             <td className="px-5 py-2 text-gray-500">{item.vendor || '-'}</td>
                             <td className="px-5 py-2 text-center">
                                <span className="text-[10px] uppercase font-bold text-gray-700">
                                   {item.sourcingStatus}
                                </span>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
           <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-4">
              <div className="flex items-center gap-2 mb-3">
                 <Hash size={18} className="text-gray-400" />
                 <h2 className="text-sm font-bold text-[#37352F] uppercase tracking-wide">PO Breakdown</h2>
              </div>
              <div className="text-xs text-gray-500 italic">Screen view breakdown logic persistent. Use "Print" for full paper report.</div>
           </div>
        </div>
      </div>
    </div>
  );
};

const ImageIcon = ({ size, className }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);
