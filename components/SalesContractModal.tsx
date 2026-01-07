import React, { useState } from 'react';
import { X, Printer, FileText, Anchor, Truck, Landmark, ShieldCheck, Globe, User } from 'lucide-react';
import { JobBatch, SalesContractData, Order, SampleRow, CompanyDetails } from '../types';
// Fix: Import LOGO_URL to fix the reference error on line 166
import { formatAppDate, LOGO_URL } from '../constants';

interface SalesContractModalProps {
  job?: JobBatch;
  sample?: any; // UnifiedSample
  onClose: () => void;
  companyDetails?: CompanyDetails;
}

const numberToWords = (num: number, currency: string = 'USD'): string => {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

  const numToText = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + numToText(n % 100);
      if (n < 1000000) return numToText(Math.floor(n / 1000)) + 'Thousand ' + numToText(n % 1000);
      if (n < 1000000000) return numToText(Math.floor(n / 1000000)) + 'Million ' + numToText(n % 1000000);
      return 'Large Amount';
  };

  const whole = Math.floor(num);
  const decimal = Math.round((num - whole) * 100);
  let str = numToText(whole);
  str += " " + currency;
  if (decimal > 0) str += ` and ${numToText(decimal)} Cents`;
  return str.trim() + " Only.";
};

export const SalesContractModal: React.FC<SalesContractModalProps> = ({ job, sample, onClose, companyDetails }) => {
  const [data, setData] = useState<SalesContractData>({
    proformaInvoiceNo: `PINZ${Math.floor(1000 + Math.random() * 9000)}`,
    orderDate: new Date().toISOString().split('T')[0],
    buyerPoNo: job?.styles[0]?.poNumber || sample?.originalData?.poNumber || 'CD05601',
    jobNo: job?.id || sample?.parentRef || 'NZ-4723',
    shipDate: job?.exFactoryDate || sample?.deadline || '',
    shipMode: 'SEA',
    portOfLoading: 'ANY PORT IN KARACHI, PAKISTAN',
    portOfDischarge: '',
    paymentTerms: 'DP - DOCUMENTS AGAINST PAYMENT',
    incoterm: 'FOB',
    buyingAgent: 'TEXLINK BUYING SERVICES',
    buyerVatNo: '',
    advancePaymentPct: 0,
    fabricContentShell: '98% COTTON, 02% SPANDEX',
    fabricContentPocketing: '60% COTTON, 40% POLYESTER',
    insuranceTerms: 'COVERED BY BUYER',
    documentsTerms: 'INVOICE + PACKING LIST + COO + BL',
    toleranceTerms: 'PLUS/MINUS 5% IN QUANTITY, WEIGHT AND SHRINKAGE',
    inspectionTerms: "ON BUYER'S ACCOUNT",
    trimsTerms: 'LOCAL',
    testingTerms: 'NONE'
  });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // --- Prepare Table Data ---
    let items: any[] = [];
    if (job) {
        items = job.styles.map(s => ({
            styleNo: s.styleNo,
            desc: s.styleDescription || s.styleNo,
            color: s.colors?.[0]?.name || 'AS PER PO',
            sizes: s.sizeGroups?.[0]?.groupName || 'AS PER PO',
            qty: s.quantity,
            price: s.price,
            total: s.quantity * s.price
        }));
    } else if (sample) {
        items = [{
            styleNo: sample.style,
            desc: sample.type,
            color: sample.shade,
            sizes: sample.originalData?.baseSize || 'N/A',
            qty: parseFloat(sample.qty) || 0,
            price: 0,
            total: 0
        }];
    }

    const totalQty = items.reduce((a, b) => a + b.qty, 0);
    const totalValue = items.reduce((a, b) => a + b.total, 0);
    const advanceAmt = (totalValue * (data.advancePaymentPct / 100));
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${data.proformaInvoiceNo}`;

    const rowsHtml = items.map(item => `
        <tr>
            <td>${item.styleNo}</td>
            <td>${item.desc}</td>
            <td>${item.color}</td>
            <td>${item.sizes}</td>
            <td class="right">${item.qty.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td class="right">$${item.price.toFixed(2)}</td>
            <td class="right">$${item.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
    `).join('');

    const template = `
      <html>
      <head>
          <title>${data.proformaInvoiceNo} - Sales Contract</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
              body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; color: #000; font-size: 9px; line-height: 1.2; }
              .page { width: 210mm; min-height: 297mm; padding: 10mm; box-sizing: border-box; margin: auto; background: white; }
              
              .top-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px; }
              .logo { height: 35px; }
              .doc-title { font-size: 16px; font-weight: 800; text-transform: uppercase; text-align: right; }

              .grid-container { display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid #000; margin-bottom: 5px; }
              .box { border: 0.5px solid #000; padding: 4px 6px; }
              .label { font-size: 8px; font-weight: 800; text-transform: uppercase; color: #000; display: block; margin-bottom: 1px; }
              .val { font-weight: 600; }
              
              .sub-grid { display: grid; grid-template-columns: repeat(2, 1fr); border-top: 1px solid #000; margin-top: 4px; }
              .sub-box { border-right: 1px solid #000; padding: 4px; }
              .sub-box:last-child { border-right: none; }

              .cert-line { text-align: center; font-weight: 800; text-transform: uppercase; padding: 4px; background: #f0f0f0; border: 1.5px solid #000; border-top: none; margin-bottom: 5px; font-size: 8px; }

              table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; }
              th { background: #f9f9f9; text-align: left; padding: 6px; border: 1px solid #000; font-weight: 800; text-transform: uppercase; font-size: 8px; }
              td { padding: 6px; border: 1px solid #000; vertical-align: top; }
              .right { text-align: right; }
              
              .total-row { font-weight: 800; font-size: 10px; background: #fff; }
              .amount-words { border: 1.5px solid #000; border-top: none; padding: 6px; margin-bottom: 5px; }
              
              .terms-grid { display: grid; grid-template-columns: 1.5fr 1fr; border: 1.5px solid #000; margin-bottom: 5px; }
              .terms-list { padding: 8px; font-size: 8px; line-height: 1.4; border-right: 1.5px solid #000; }
              .compliance-list { padding: 0; }
              .comp-row { display: grid; grid-template-columns: 1fr 1.5fr; border-bottom: 1px solid #000; }
              .comp-row:last-child { border-bottom: none; }
              .comp-label { font-weight: 800; text-transform: uppercase; padding: 4px 6px; background: #f9f9f9; border-right: 1px solid #000; }
              .comp-val { padding: 4px 6px; font-weight: 500; text-transform: uppercase; }

              .footer-boxes { display: grid; grid-template-columns: 1.5fr 1fr 1fr; border: 1.5px solid #000; margin-bottom: 5px; }
              .origin-box { display: flex; align-items: center; gap: 8px; padding: 8px; font-weight: 800; }
              .pak-flag { width: 40px; height: 25px; background: #00401a; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; border-radius: 2px; }

              .signature-section { display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid #000; border-top: none; height: 80px; }
              .sig-box { border-right: 1px solid #000; position: relative; text-align: center; padding-top: 60px; }
              .sig-label { position: absolute; bottom: 4px; width: 100%; text-align: center; font-weight: 800; text-transform: uppercase; font-size: 8px; }
              .stamp-placeholder { position: absolute; top: 10px; left: 10%; width: 60px; height: 60px; border: 1px dashed #ccc; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 8px; }

              .qr-code { position: absolute; top: 75px; right: 15px; width: 60px; height: 60px; border: 1px solid #eee; padding: 2px; }

              @media print {
                  @page { size: A4; margin: 0; }
                  .page { box-shadow: none; border: none; }
              }
          </style>
      </head>
      <body>
          <div class="page">
              <div class="top-header">
                  <img src="${companyDetails?.logoUrl || LOGO_URL}" class="logo" />
                  <div class="doc-title">PERFORMA INVOICE AND SALE CONFIRMATION SHEET</div>
              </div>

              <div class="grid-container" style="position: relative;">
                  <div class="box">
                      <span class="label">Factory Name and Address</span>
                      <div class="val" style="font-size: 10px;">${companyDetails?.name || 'NIZAMIA APPARELS'}</div>
                      <div class="val" style="margin-top: 2px; font-weight: 400;">
                         ${companyDetails?.address || 'PLOT NO RCC14, SHED NO 02, ESTATE AVENUE ROAD, SITE AREA, KARACHI 75700, PAKISTAN'}
                      </div>
                      <div style="margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 8px;">
                          <div><strong>REX NUMBER:</strong> PKREXPK10367292</div>
                          <div><strong>NTN / VAT #:</strong> 1036729-2</div>
                          <div><strong>EXPORT REG #:</strong> 012618</div>
                          <div><strong>SALES TAX #:</strong> 11-00-2800-135-91</div>
                      </div>
                  </div>
                  <div class="box" style="padding: 0;">
                      <div style="display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #000;">
                          <div class="box" style="border:none; border-right: 1px solid #000;">
                              <span class="label">Order Date</span>
                              <div class="val">${formatAppDate(data.orderDate)}</div>
                          </div>
                          <div class="box" style="border:none;">
                              <span class="label">Buyer's P.O Number</span>
                              <div class="val">${data.buyerPoNo}</div>
                          </div>
                      </div>
                      <div class="box" style="border:none; border-bottom: 1px solid #000;">
                          <span class="label">Factory's Job Number</span>
                          <div class="val">${data.jobNo}</div>
                      </div>
                      <div style="display: grid; grid-template-columns: 1fr 1fr;">
                          <div class="box" style="border:none; border-right: 1px solid #000;">
                              <span class="label">Shipment Date</span>
                              <div class="val">${formatAppDate(data.shipDate)}</div>
                          </div>
                          <div class="box" style="border:none;">
                              <span class="label">Shipment Mode</span>
                              <div class="val">${data.shipMode}</div>
                          </div>
                      </div>
                  </div>
                  
                  <div class="box">
                      <span class="label">Customer Name and Address</span>
                      <div class="val" style="font-size: 10px;">${job?.styles[0]?.buyer || sample?.buyer || 'CLIENT NAME'}</div>
                      <div class="val" style="margin-top: 2px; font-weight: 400; min-height: 30px;">
                          ${job?.styles[0]?.buyer === 'BoohooMAN' ? '49-51 Dale Street, Manchester, M1 2HF' : 'CLIENT REGISTERED ADDRESS ON FILE'}
                      </div>
                      <div style="margin-top: 4px;"><strong>VAT #:</strong> ${data.buyerVatNo || 'IT000000000000'}</div>
                  </div>

                  <div class="box" style="padding: 0;">
                      <div style="display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #000;">
                          <div class="box" style="border:none; border-right: 1px solid #000;">
                              <span class="label">Port of Loading</span>
                              <div class="val">${data.portOfLoading}</div>
                          </div>
                          <div class="box" style="border:none;">
                              <span class="label">Port of Discharge</span>
                              <div class="val">${data.portOfDischarge || 'DESTINATION PORT'}</div>
                          </div>
                      </div>
                      <div style="display: grid; grid-template-columns: 1.5fr 1fr;">
                          <div class="box" style="border:none; border-right: 1px solid #000;">
                              <span class="label">Payment Terms</span>
                              <div class="val">${data.paymentTerms}</div>
                          </div>
                          <div class="box" style="border:none;">
                              <span class="label">Incoterm</span>
                              <div class="val">${data.incoterm}</div>
                          </div>
                      </div>
                  </div>

                  <div class="box">
                      <span class="label">Buying Agent</span>
                      <div class="val">${data.buyingAgent}</div>
                  </div>

                  <div class="box">
                      <span class="label">Banking Details of Factory</span>
                      <div style="font-size: 8px; line-height: 1.4;">
                          <strong>BANK NAME:</strong> HABIB METROPOLITAN BANK LIMITED<br/>
                          <strong>BRANCH:</strong> SITE AREA BRANCH<br/>
                          <strong>ACCOUNT TITLE:</strong> NIZAMIA APPARELS<br/>
                          <strong>ACCOUNT NUMBER:</strong> 6-1-23-20311-714-101219<br/>
                          <strong>IBAN NUMBER:</strong> PK16MPBL0123027140101219<br/>
                          <strong>BRANCH ADDRESS:</strong> SITE BRANCH, SITE AREA, ESTATE AVENUE ROAD, KARACHI 75700, PAKISTAN
                      </div>
                  </div>

                  <!-- Proforma Box top right -->
                  <div style="position: absolute; top: 12px; right: 12px; text-align: right;">
                      <span style="font-size: 8px; font-weight: 800;">PERFORMA INVOICE NUMBER</span>
                      <div style="font-size: 24px; font-weight: 900; line-height: 1;">${data.proformaInvoiceNo}</div>
                      <div style="font-size: 8px; font-weight: 800; margin-top: 2px;">${new Date().toLocaleDateString('en-GB', {day:'2-digit', month:'long', year:'numeric'}).toUpperCase()}</div>
                  </div>

                  <img src="${qrUrl}" class="qr-code" />
              </div>

              <div class="cert-line">
                  WE HEREBY CERTIFY HAVING SOLD TO YOU FOLLOWING GOODS ON TERMS & CONDITION MENTIONED IN THIS DOCUMENT
              </div>

              <table>
                  <thead>
                      <tr>
                          <th width="15%">Style Number</th>
                          <th width="20%">Description</th>
                          <th width="15%">Color / Wash</th>
                          <th width="20%">SIZR RANGE</th>
                          <th width="10%" class="right">Quantity</th>
                          <th width="10%" class="right">Price</th>
                          <th width="10%" class="right">Total Value</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${rowsHtml}
                      <tr class="total-row">
                          <td colspan="4">TOTAL</td>
                          <td class="right">${totalQty.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td></td>
                          <td class="right">$${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                  </tbody>
              </table>

              <div class="amount-words">
                  <span class="label">Amount in Words</span>
                  <div class="val" style="text-transform: uppercase;">${numberToWords(totalValue)}</div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; border: 1.5px solid #000; border-top: none; margin-bottom: 5px;">
                  <div class="box" style="border:none; border-right: 1px solid #000;">
                      <span class="label">Advance Payment Percentage (if any)</span>
                      <div class="val">${data.advancePaymentPct.toFixed(2)}%</div>
                      <span class="label" style="margin-top: 4px;">Advance Payment Amount</span>
                      <div class="val">$${advanceAmt.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                  </div>
                  <div class="box" style="border:none;">
                      <span class="label">Amount in Words</span>
                      <div class="val" style="text-transform: uppercase;">${advanceAmt > 0 ? numberToWords(advanceAmt) : 'ZERO USD ONLY.'}</div>
                  </div>
              </div>

              <div class="terms-grid">
                  <div class="terms-list">
                      <span class="label" style="margin-bottom: 6px;">Terms and Condition of Business</span>
                      <ul style="margin: 0; padding-left: 12px; list-style-type: disc;">
                          <li>No changes in fabric, styling, specs, trims will be accepted after issuance of P.O</li>
                          <li>In case of a force majeure situation, a revised delivery date will be advised by the factory in advance.</li>
                          <li>Delay caused by buyer/importer will cause delivery date to change.</li>
                          <li>Debit note, claims will not be accepted unless discussed in writing and confirmed by factory prior to shipment.</li>
                          <li>All banking charges outside exporting country (Pakistan) will be paid by buyer/importer.</li>
                          <li>Validity 15 days, allowing 10 days for the negotiations of documents.</li>
                          <li>Stale bill of lading acceptable.</li>
                          <li>05% tolerance in quality, stitching & packing be acceptable.</li>
                          <li>Bill of lading to the order of any authorized dealer in foreign exchange or to the negotiating bank in Pakistan acceptable.</li>
                          <li>Draft should be payable at negotiating bank's counter in Pakistan.</li>
                          <li>Shipment to only 01 destination is allowed.</li>
                      </ul>
                  </div>
                  <div class="compliance-list">
                      <div class="comp-row">
                          <div class="comp-label">Insurance</div>
                          <div class="comp-val">${data.insuranceTerms}</div>
                      </div>
                      <div class="comp-row">
                          <div class="comp-label">Documents</div>
                          <div class="comp-val">${data.documentsTerms}</div>
                      </div>
                      <div class="comp-row">
                          <div class="comp-label">Tolerance</div>
                          <div class="comp-val">${data.toleranceTerms}</div>
                      </div>
                      <div class="comp-row">
                          <div class="comp-label">Inspection</div>
                          <div class="comp-val">${data.inspectionTerms}</div>
                      </div>
                      <div class="comp-row">
                          <div class="comp-label">Trims</div>
                          <div class="comp-val">${data.trimsTerms}</div>
                      </div>
                      <div class="comp-row">
                          <div class="comp-label">Testing</div>
                          <div class="comp-val">${data.testingTerms}</div>
                      </div>
                  </div>
              </div>

              <div class="footer-boxes">
                  <div class="box" style="border:none; border-right: 1.5px solid #000;">
                      <span class="label">Fabric Content:</span>
                      <div class="val" style="font-size: 8px;">SHELL: ${data.fabricContentShell}</div>
                      <div class="val" style="font-size: 8px;">POCKETING: ${data.fabricContentPocketing}</div>
                  </div>
                  <div class="origin-box">
                      <div class="pak-flag">★</div>
                      <div>WE HEREBY CERTIFY THAT THE GOODS ARE OF PAKISTAN ORIGIN</div>
                  </div>
                  <div class="sig-box" style="border-right:none; padding-top: 10px;">
                      <div class="stamp-placeholder">STAMP</div>
                  </div>
              </div>

              <div class="signature-section">
                  <div class="sig-box">
                      <div class="sig-label">FOR NIZAMIA APPARELS</div>
                  </div>
                  <div class="sig-box" style="border-right:none;">
                      <div class="sig-label">FOR THE ${job?.styles[0]?.buyer.toUpperCase() || 'CUSTOMER'}</div>
                  </div>
              </div>
              
              <div style="text-align: center; font-size: 7px; color: #888; margin-top: 10px;">
                  www.nizamia.com | marketing@nizamia.com
              </div>
          </div>
          <script>window.onload = function() { setTimeout(() => window.print(), 800); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(template);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Form Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-600 text-white rounded-lg"><FileText size={20} /></div>
             <div>
                <h2 className="text-xl font-bold text-[#37352F]">Sales Contract Configuration</h2>
                <p className="text-xs text-gray-500">Provide missing details to generate proforma invoice.</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={24}/></button>
        </div>

        {/* Configuration Form */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* Section 1: References */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} /> Document References
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Proforma Invoice #</label>
                  <input type="text" value={data.proformaInvoiceNo} onChange={e => setData({...data, proformaInvoiceNo: e.target.value})} className="w-full px-3 py-2 border rounded text-sm focus:border-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Order Date</label>
                  <input type="date" value={data.orderDate} onChange={e => setData({...data, orderDate: e.target.value})} className="w-full px-3 py-2 border rounded text-sm focus:border-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Buyer P.O. #</label>
                  <input type="text" value={data.buyerPoNo} onChange={e => setData({...data, buyerPoNo: e.target.value})} className="w-full px-3 py-2 border rounded text-sm focus:border-indigo-500 outline-none" />
                </div>
              </div>
            </div>

            {/* Section 2: Shipment */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Anchor size={14} /> Shipping & Logistics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Port of Discharge</label>
                  <input type="text" value={data.portOfDischarge} onChange={e => setData({...data, portOfDischarge: e.target.value})} placeholder="e.g. BARCELONA, SPAIN" className="w-full px-3 py-2 border rounded text-sm focus:border-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Shipment Mode</label>
                  <select value={data.shipMode} onChange={e => setData({...data, shipMode: e.target.value})} className="w-full px-3 py-2 border rounded text-sm bg-white outline-none">
                    <option value="SEA">SEA</option>
                    <option value="AIR">AIR</option>
                    <option value="COURIER">COURIER</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Commercial */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Landmark size={14} /> Commercial Terms
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Incoterm</label>
                  <input type="text" value={data.incoterm} onChange={e => setData({...data, incoterm: e.target.value})} placeholder="e.g. FOB" className="w-full px-3 py-2 border rounded text-sm focus:border-indigo-500 outline-none" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Payment Terms</label>
                  <input type="text" value={data.paymentTerms} onChange={e => setData({...data, paymentTerms: e.target.value})} placeholder="e.g. DP - AT SIGHT" className="w-full px-3 py-2 border rounded text-sm focus:border-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-500 uppercase">Advance Payment %</label>
                   <input type="number" value={data.advancePaymentPct} onChange={e => setData({...data, advancePaymentPct: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border rounded text-sm focus:border-indigo-500 outline-none" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Buying Agent</label>
                  <input type="text" value={data.buyingAgent} onChange={e => setData({...data, buyingAgent: e.target.value})} className="w-full px-3 py-2 border rounded text-sm focus:border-indigo-500 outline-none" />
                </div>
              </div>
            </div>

            {/* Section 4: Technical & Compliance */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} /> Compliance & Content
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Fabric Content (Shell)</label>
                  <input type="text" value={data.fabricContentShell} onChange={e => setData({...data, fabricContentShell: e.target.value})} className="w-full px-3 py-2 border rounded text-sm focus:border-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Fabric Content (Pocketing)</label>
                  <input type="text" value={data.fabricContentPocketing} onChange={e => setData({...data, fabricContentPocketing: e.target.value})} className="w-full px-3 py-2 border rounded text-sm focus:border-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Tolerance</label>
                  <input type="text" value={data.toleranceTerms} onChange={e => setData({...data, toleranceTerms: e.target.value})} className="w-full px-3 py-2 border rounded text-sm focus:border-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Inspection</label>
                  <input type="text" value={data.inspectionTerms} onChange={e => setData({...data, inspectionTerms: e.target.value})} className="w-full px-3 py-2 border rounded text-sm focus:border-indigo-500 outline-none" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors">Cancel</button>
           <button 
              onClick={handlePrint}
              className="px-8 py-2 bg-indigo-600 text-white text-sm font-bold rounded shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
           >
              <Printer size={18} /> Generate Proforma Invoice
           </button>
        </div>
      </div>
    </div>
  );
};
