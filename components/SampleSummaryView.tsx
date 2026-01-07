import React, { useMemo } from 'react';
import { 
  ArrowLeft, Shirt, Scissors, Droplets, 
  CheckCircle2, FlaskConical, Hash, Ruler, Tag,
  Layers, Package, Info, Calendar, Printer, Clock, User,
  FileText
} from 'lucide-react';
import { formatAppDate } from '../constants';
import { BOMItem, Order, FittingData } from '../types';

interface SampleSummaryViewProps {
    sample: any; // UnifiedSample
    onClose: () => void;
}

export const SampleSummaryView: React.FC<SampleSummaryViewProps> = ({ sample, onClose }) => {
    // --- Derived Data Logic ---
    const parentStyle: Order | undefined = sample.originalData?.parentStyle;
    
    // Filter BOM items relevant to this sample's shade/color
    const variantBOM: BOMItem[] = useMemo(() => {
        if (!parentStyle?.bom) return [];
        const colorName = sample.shade;
        return parentStyle.bom.filter(item => {
            if (item.usageRule === 'Generic') return true;
            if (item.usageRule === 'By Color/Wash' && (item.usageData[colorName] || 0) > 0) return true;
            return false;
        });
    }, [parentStyle, sample.shade]);

    // Find applicable fitting spec
    const applicableFit = useMemo(() => {
        if (!parentStyle?.fitting) return 'Standard';
        const fit = parentStyle.fitting.find(f => f.sizeRange === 'Generic' || f.sizeRange?.includes(sample.baseSize));
        return fit ? fit.fitName : 'Standard';
    }, [parentStyle, sample.baseSize]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex flex-col h-full bg-[#F7F7F5] animate-in fade-in duration-300 overflow-hidden print:bg-white">
            {/* Action Bar (No Print) */}
            <div className="px-6 py-4 flex items-center justify-between shrink-0 no-print">
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-white rounded-full text-gray-500 transition-colors shadow-sm bg-white/50"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded hover:bg-gray-50 transition-all shadow-sm text-sm font-bold"
                    >
                        <Printer size={16} /> Print Technical Sheet
                    </button>
                </div>
            </div>

            {/* Report Content Container */}
            <div className="flex-1 overflow-y-auto px-4 md:px-12 pb-12 custom-scrollbar print:p-0 printable-content">
                <div className="max-w-6xl mx-auto bg-white border-2 border-[#3b82f6] shadow-2xl relative print:border-4 print:shadow-none min-h-[1120px] flex flex-col">
                    
                    {/* Header Strip */}
                    <div className="p-8 border-b border-gray-100 flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-[#1a1a1a] tracking-tight uppercase">{sample.style}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Technical Spec Sheet •</span>
                                <span className="text-xs font-mono text-blue-600 font-black uppercase tracking-tight">{sample.samId}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                             <div className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 text-[11px] font-black uppercase tracking-widest shadow-sm">
                                {sample.source === 'Job' ? `JOB: ${sample.parentRef}` : 'R&D DEVELOPMENT'}
                             </div>
                             <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded border border-gray-100">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase text-gray-600 tracking-tighter">IN PROGRESS</span>
                             </div>
                        </div>
                    </div>

                    {/* Image Section - Main Centerpiece */}
                    <div className="px-8 py-6 flex-none h-[450px] bg-gray-50/30">
                        <div className="w-full h-full border border-gray-200 bg-white rounded-lg flex items-center justify-center overflow-hidden relative shadow-inner">
                            {parentStyle?.imageUrl ? (
                                <img src={parentStyle.imageUrl} alt="Sample Style" className="w-full h-full object-contain p-4" />
                            ) : (
                                <div className="flex flex-col items-center gap-3 text-gray-300">
                                    <ImageIcon size={64} className="opacity-10" />
                                    <span className="text-xs font-black uppercase tracking-[0.2em]">No Visual Asset Uploaded</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Data Grid Section - Report Style */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-200 border-y border-gray-200">
                        {/* Box 1: Core Details */}
                        <div className="bg-white p-8 space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2 mb-4">
                                <Info size={14} className="text-blue-600" /> Identity Matrix
                            </h3>
                            <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Buyer Account</label>
                                    <div className="text-sm font-black text-gray-900 uppercase">{sample.buyer}</div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Target Date</label>
                                    <div className="text-sm font-mono font-black text-red-600 flex items-center gap-1.5">
                                        <Calendar size={14} /> {formatAppDate(sample.deadline)}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Base Pattern Size</label>
                                    <div className="text-lg font-black text-gray-900 font-mono">{sample.originalData.baseSize}</div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Sample Purpose</label>
                                    <div className="text-xs font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 w-fit">{sample.type}</div>
                                </div>
                            </div>
                            
                            <div className="pt-6 border-t border-gray-50 grid grid-cols-2 gap-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Pattern Name</label>
                                    <div className="text-sm font-bold text-gray-700">{applicableFit}</div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Testing Compliance</label>
                                    <div className={`text-[10px] font-black uppercase flex items-center gap-2 ${sample.originalData.isTestingRequired ? 'text-red-500' : 'text-gray-400'}`}>
                                        <FlaskConical size={14} /> {sample.originalData.isTestingRequired ? 'MANDATORY' : 'NOT REQUIRED'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Box 2: Construction Matrix */}
                        <div className="bg-white p-8 space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2 mb-4">
                                <Scissors size={14} className="text-blue-600" /> Engineering Specs
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-[10px] text-gray-400 font-black uppercase">Laundry Wash</span>
                                    <span className="text-xs font-black text-blue-700 uppercase">{sample.originalData.wash || 'Standard Rinse'}</span>
                                </div>
                                <div className="flex justify-between items-start py-2 border-b border-gray-50">
                                    <span className="text-[10px] text-gray-400 font-black uppercase shrink-0">Thread Spec</span>
                                    <span className="text-xs font-bold text-gray-800 text-right whitespace-pre-line leading-tight">{sample.originalData.threadColor}</span>
                                </div>
                                <div className="flex justify-between items-start py-2 border-b border-gray-50">
                                    <span className="text-[10px] text-gray-400 font-black uppercase shrink-0">Zipper Ref</span>
                                    <span className="text-xs font-bold text-gray-800 text-right whitespace-pre-line leading-tight">{sample.originalData.zipperColor}</span>
                                </div>
                                <div className="flex justify-between items-start py-2">
                                    <span className="text-[10px] text-gray-400 font-black uppercase shrink-0">Lining Spec</span>
                                    <span className="text-xs font-bold text-gray-800 text-right whitespace-pre-line leading-tight">{sample.originalData.lining}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOM Table Section - Compact */}
                    <div className="p-8 flex-none bg-white">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2 mb-6">
                            <Layers size={14} className="text-blue-600" /> Variant Bill of Materials
                        </h3>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 text-[10px] text-gray-500 font-black uppercase border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3">Component / Supplier Reference</th>
                                        <th className="px-4 py-3 text-right">Consumption</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {variantBOM.length > 0 ? (
                                        variantBOM.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 align-top">
                                                    <span className="text-[9px] font-bold uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                        {item.processGroup}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-black text-[#1a1a1a]">{item.componentName}</div>
                                                    <div className="text-[10px] text-gray-500 font-medium mt-0.5 uppercase tracking-tighter">{item.itemDetail}</div>
                                                    <div className="text-[9px] text-gray-400 font-mono mt-1 font-bold">REF: {item.supplierRef}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-black text-gray-700">
                                                    {item.usageData[sample.shade] || item.usageData['generic']} {item.uom}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={3} className="p-8 text-center text-gray-400 italic">No variant items mapped.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Spacer to push watermark to bottom */}
                    <div className="flex-1"></div>

                    {/* Bottom Watermark - Signature Footer */}
                    <div className="p-8 pt-20 border-t border-gray-100 flex flex-col items-center">
                        <div className="w-full grid grid-cols-3 gap-12 mb-10">
                            <div className="border-t border-black text-center pt-2">
                                <span className="text-[9px] font-black uppercase text-gray-400">Merchandiser Signature</span>
                            </div>
                            <div className="border-t border-black text-center pt-2">
                                <span className="text-[9px] font-black uppercase text-gray-400">QA Controller</span>
                            </div>
                            <div className="border-t border-black text-center pt-2">
                                <span className="text-[9px] font-black uppercase text-gray-400">Production Master</span>
                            </div>
                        </div>
                        <div className="text-center text-[#3b82f6] text-[10px] font-black uppercase tracking-[0.5em] opacity-80">
                            NIZAMIA GLOBAL MERCHANDISING ECOSYSTEM — SAMPLING EXECUTION SHEET
                        </div>
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
