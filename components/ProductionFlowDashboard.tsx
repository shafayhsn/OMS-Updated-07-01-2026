
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Scissors, Palette, Shirt, Layers, Droplets, 
  CheckCircle2, Box, Activity, 
  TrendingUp, AlertTriangle,
  LayoutDashboard, FileBarChart, Plus, Lock, Unlock, X, Search, Settings, Trash2, Calendar, Download, Truck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { JobBatch, ProductionLog } from '../types';
import { formatAppDate } from '../constants';

interface ProductionFlowDashboardProps {
  jobs: JobBatch[];
  onUpdateJob: (job: JobBatch) => void;
}

// 1. Defined Sequential Gates
const STAGES = [
  { id: 'Cutting', label: 'Cutting', icon: Scissors, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'Embellishment', label: 'Embellishment', icon: Palette, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'Stitching', label: 'Stitching', icon: Shirt, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'Prep for Wash', label: 'Prep for Wash', icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { id: 'Washing', label: 'Washing', icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  { id: 'Finishing', label: 'Finishing', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { id: 'Packing', label: 'Packing', icon: Box, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
] as const;

type StageId = typeof STAGES[number]['id'];
type ViewTab = 'Overview' | 'Reports' | StageId;

// --- Helper Functions ---

const getJobCurrentStage = (job: JobBatch): string => {
    if (job.status === 'Completed' || job.status === 'Ready to Ship' || job.status === 'Booked' || job.status === 'Shipped') return 'Completed';
    for (const stage of STAGES) {
        const completed = job.productionProgress?.[stage.id] || 0;
        if (completed < job.totalQty) return stage.label;
    }
    return 'Packing';
};

const isJobReadyForStage = (job: JobBatch, stageId: StageId) => {
  const stageIndex = STAGES.findIndex(s => s.id === stageId);
  
  if (stageIndex === 0) {
    const cutQty = job.productionProgress?.['Cutting'] || 0;
    return cutQty < job.totalQty; // Cutting is always ready if not finished
  }

  const prevStage = STAGES[stageIndex - 1].id;
  const prevQty = job.productionProgress?.[prevStage] || 0;
  const currentQty = job.productionProgress?.[stageId] || 0;

  // Ready if we have inventory from previous stage waiting to be processed
  // OR if we are in the middle of processing (current < prev)
  return prevQty > currentQty; 
};

// --- SUB-COMPONENT: Production Entry Modal ---

interface ProductionEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: JobBatch[];
  onSaveBatch: (entries: {jobId: string, qty: number, stage: StageId, date: string, lineId?: string}[]) => void;
  availableLines: string[];
  onUpdateLines: (lines: string[]) => void;
}

const ProductionEntryModal: React.FC<ProductionEntryModalProps> = ({ 
  isOpen, onClose, jobs, onSaveBatch, availableLines, onUpdateLines
}) => {
  const [activeStage, setActiveStage] = useState<StageId>('Cutting');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [isBackdateUnlocked, setIsBackdateUnlocked] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  
  // Standard Staging: { [jobId]: quantity }
  const [inputs, setInputs] = useState<Record<string, string>>({});
  
  // Stitching Staging: { [jobId]: { [lineName]: quantity } }
  const [stitchingInputs, setStitchingInputs] = useState<Record<string, Record<string, string>>>({});

  // Line Management UI
  const [showLineManager, setShowLineManager] = useState(false);
  const [newLineName, setNewLineName] = useState('');

  // Reset inputs when stage changes
  useEffect(() => {
    setInputs({});
    setStitchingInputs({});
  }, [activeStage]);

  if (!isOpen) return null;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const today = new Date().toISOString().split('T')[0];
    
    if (newDate < today && !isBackdateUnlocked) {
       setShowPasswordPrompt(true);
    } else {
       setEntryDate(newDate);
    }
  };

  const verifyPassword = () => {
    if (passwordInput === 'admin') {
       setIsBackdateUnlocked(true);
       setShowPasswordPrompt(false);
    } else {
       alert("Incorrect Password");
    }
    setPasswordInput('');
  };

  const handleAddLine = () => {
      if (newLineName && !availableLines.includes(newLineName)) {
          onUpdateLines([...availableLines, newLineName]);
          setNewLineName('');
      }
  };

  const handleDeleteLine = (line: string) => {
      onUpdateLines(availableLines.filter(l => l !== line));
  };

  const handleSave = () => {
    const entries: {jobId: string, qty: number, stage: StageId, date: string, lineId?: string}[] = [];
    
    if (activeStage === 'Stitching') {
        Object.entries(stitchingInputs).forEach(([jobId, lineData]) => {
            Object.entries(lineData).forEach(([line, qtyStr]) => {
                const qty = parseInt(qtyStr);
                if (!isNaN(qty) && qty > 0) {
                    entries.push({
                        jobId,
                        qty,
                        stage: activeStage,
                        date: entryDate,
                        lineId: line
                    });
                }
            });
        });
    } else {
        Object.entries(inputs).forEach(([jobId, qtyStr]) => {
           const qty = parseInt(qtyStr as string);
           if (!isNaN(qty) && qty > 0) {
              entries.push({ 
                  jobId, 
                  qty, 
                  stage: activeStage, 
                  date: entryDate
              });
           }
        });
    }

    if (entries.length === 0) {
       alert("No quantities entered.");
       return;
    }

    onSaveBatch(entries);
    setInputs({});
    setStitchingInputs({});
    onClose(); 
  };

  const eligibleJobs = jobs.filter(j => isJobReadyForStage(j, activeStage));

  const totalInputsCount = activeStage === 'Stitching' 
    ? Object.values(stitchingInputs).reduce((acc: number, lines) => acc + Object.keys(lines).length, 0)
    : Object.keys(inputs).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
             <div>
                <h2 className="text-xl font-bold text-[#37352F]">Record Production Output</h2>
                <p className="text-xs text-gray-500">Bulk entry mode</p>
             </div>
             <div className="flex items-center gap-4">
                
                {/* Manage Lines Toggle (Only for Stitching) */}
                {activeStage === 'Stitching' && (
                    <div className="relative">
                        <button 
                            onClick={() => setShowLineManager(!showLineManager)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm transition-colors text-xs font-bold uppercase
                                ${showLineManager ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <Settings size={14} /> Manage Lines
                        </button>
                        
                        {/* Popover */}
                        {showLineManager && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-4 animate-in fade-in zoom-in-95">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Active Production Lines</h4>
                                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                                    {availableLines.map(line => (
                                        <div key={line} className="flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded border border-gray-100">
                                            <span className="text-sm font-medium text-gray-700">{line}</span>
                                            <button onClick={() => handleDeleteLine(line)} className="text-gray-400 hover:text-red-500">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="New Line Name" 
                                        value={newLineName}
                                        onChange={(e) => setNewLineName(e.target.value)}
                                        className="flex-1 text-xs border rounded px-2 py-1.5 outline-none focus:border-blue-500"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
                                    />
                                    <button onClick={handleAddLine} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700">Add</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Date Picker */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${isBackdateUnlocked ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-300'}`}>
                   {isBackdateUnlocked ? <Unlock size={16} className="text-orange-600"/> : <Lock size={16} className="text-gray-400"/>}
                   <input 
                      type="date" 
                      value={entryDate}
                      onChange={handleDateChange}
                      className="text-sm bg-transparent outline-none font-medium text-gray-700"
                   />
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20}/></button>
             </div>
          </div>

          {/* Department Tabs */}
          <div className="flex border-b border-gray-200 bg-white overflow-x-auto no-scrollbar shrink-0">
             {STAGES.map(stage => (
                <button
                   key={stage.id}
                   onClick={() => setActiveStage(stage.id)}
                   className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 
                      ${activeStage === stage.id ? `border-${stage.color.split('-')[1]}-600 ${stage.color}` : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                >
                   {stage.label}
                </button>
             ))}
          </div>

          {/* Content: Job Table */}
          <div className="flex-1 overflow-auto p-0 bg-gray-50/50">
             <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-100 text-xs text-gray-500 uppercase font-semibold sticky top-0 z-10 shadow-sm">
                   <tr>
                      <th className="px-4 py-3 border-b border-gray-200 bg-gray-100">Job Context</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-right bg-gray-100 w-24">Order Qty</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-right bg-gray-100 w-24">Completed</th>
                      <th className="px-4 py-3 border-b border-gray-200 text-right bg-gray-100 w-24">Remaining</th>
                      
                      {activeStage === 'Stitching' ? (
                          // Dynamic Line Columns for Stitching
                          availableLines.map(line => (
                              <th key={line} className="px-2 py-3 border-b border-gray-200 text-center bg-blue-50/50 text-blue-700 min-w-[100px]">
                                  {line}
                              </th>
                          ))
                      ) : (
                          // Single Output Column for others
                          <th className="px-6 py-3 border-b border-gray-200 w-40 text-center bg-gray-100">Output Today</th>
                      )}
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                   {eligibleJobs.map(job => {
                      const completed = job.productionProgress?.[activeStage] || 0;
                      const prevStageIndex = STAGES.findIndex(s => s.id === activeStage) - 1;
                      const prevStageId = prevStageIndex >= 0 ? STAGES[prevStageIndex].id : null;
                      
                      // Cap output based on available input from previous stage (unless Cutting)
                      const availableInput = prevStageId ? (job.productionProgress?.[prevStageId] || 0) : job.totalQty;
                      const maxEntry = availableInput - completed;

                      // Calculate current row total input for display
                      let rowInputTotal = 0;
                      if (activeStage === 'Stitching') {
                          const jobInputs: Record<string, string> = stitchingInputs[job.id] || {};
                          rowInputTotal = Object.values(jobInputs).reduce((sum: number, val: string) => sum + (parseInt(val) || 0), 0);
                      } else {
                          rowInputTotal = parseInt(inputs[job.id] || '0');
                      }

                      const isOverLimit = rowInputTotal > maxEntry;

                      return (
                         <tr key={job.id} className="group hover:bg-gray-50">
                            <td className="px-4 py-3">
                               <div className="font-mono font-bold text-blue-700 text-xs">{job.id}</div>
                               <div className="font-medium text-[#37352F] truncate max-w-[150px]">{job.styles[0]?.styleNo}</div>
                               <div className="text-[10px] text-gray-500">{job.styles[0]?.buyer}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-600">{job.totalQty.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-medium text-green-600">{completed.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-gray-500 bg-gray-50/50">
                                {maxEntry.toLocaleString()}
                                {rowInputTotal > 0 && (
                                    <div className={`text-[10px] font-bold mt-1 ${isOverLimit ? 'text-red-500' : 'text-blue-600'}`}>
                                        -{rowInputTotal} {isOverLimit ? '(!)' : ''}
                                    </div>
                                )}
                            </td>

                            {activeStage === 'Stitching' ? (
                                // Render Input Cell per Line
                                availableLines.map(line => (
                                    <td key={line} className="px-2 py-3 text-center border-l border-gray-50">
                                        <input 
                                            type="number"
                                            min="0"
                                            placeholder="-"
                                            value={stitchingInputs[job.id]?.[line] || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setStitchingInputs(prev => ({
                                                    ...prev,
                                                    [job.id]: {
                                                        ...(prev[job.id] || {}),
                                                        [line]: val
                                                    }
                                                }));
                                            }}
                                            className={`w-full text-center border rounded py-1.5 px-1 outline-none text-xs focus:ring-1 focus:ring-blue-500 transition-all
                                                ${stitchingInputs[job.id]?.[line] ? 'border-blue-500 bg-blue-50 font-bold' : 'border-gray-200'}`}
                                        />
                                    </td>
                                ))
                            ) : (
                                // Single Input
                                <td className="px-6 py-3">
                                   <input 
                                      type="number"
                                      min="0"
                                      max={maxEntry}
                                      placeholder="0"
                                      value={inputs[job.id] || ''}
                                      onChange={(e) => {
                                         setInputs({...inputs, [job.id]: e.target.value});
                                      }}
                                      className={`w-full text-center border rounded py-1.5 px-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all
                                         ${inputs[job.id] ? 'border-blue-500 bg-blue-50 font-bold' : 'border-gray-200'}`}
                                   />
                                </td>
                            )}
                         </tr>
                      );
                   })}
                   {eligibleJobs.length === 0 && (
                      <tr><td colSpan={activeStage === 'Stitching' ? availableLines.length + 4 : 5} className="p-8 text-center text-gray-400 italic">No jobs pending for {activeStage}.</td></tr>
                   )}
                </tbody>
             </table>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-between items-center shrink-0">
             <div className="text-xs text-gray-500">
                <span className="font-bold">{totalInputsCount}</span> entries pending save
             </div>
             <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors">Cancel</button>
                <button 
                   onClick={handleSave}
                   className="px-6 py-2 bg-[#37352F] text-white text-sm font-medium rounded hover:bg-black transition-colors shadow-sm"
                >
                   Save Production Log
                </button>
             </div>
          </div>

          {/* Password Prompt Overlay */}
          {showPasswordPrompt && (
             <div className="absolute inset-0 bg-white/90 z-20 flex items-center justify-center p-6">
                <div className="w-full max-w-sm text-center space-y-4">
                   <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                      <Lock size={24} />
                   </div>
                   <h3 className="text-lg font-bold text-gray-800">Admin Authentication</h3>
                   <p className="text-sm text-gray-500">Enter password to enable backdated entries.</p>
                   <input 
                      type="password"
                      autoFocus
                      placeholder="Enter Password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                      className="w-full text-center border border-gray-300 rounded px-3 py-2 outline-none focus:border-orange-500"
                   />
                   <div className="flex justify-center gap-2">
                      <button onClick={() => setShowPasswordPrompt(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                      <button onClick={verifyPassword} className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-700">Unlock</button>
                   </div>
                </div>
             </div>
          )}
       </div>
    </div>
  );
};

// --- SUB-COMPONENT: Report Download Modal ---

const ReportDownloadModal = ({ isOpen, onClose, jobs }: { isOpen: boolean, onClose: () => void, jobs: JobBatch[] }) => {
    const [department, setDepartment] = useState<string>('All');
    const [period, setPeriod] = useState<string>('All Time');
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

    const handleDownload = () => {
        setIsGenerating(true);

        setTimeout(() => {
            const today = new Date();
            let startDate = new Date(0); // Epoch for 'All Time'
            
            if (period === 'Today') {
                startDate = new Date();
                startDate.setHours(0,0,0,0);
            } else if (period === 'Last 7 Days') {
                startDate.setDate(today.getDate() - 7);
            } else if (period === 'This Month') {
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            }

            const startStr = startDate.toISOString().split('T')[0];
            const rows = [['Date', 'Job ID', 'Style', 'Buyer', 'Department', 'Line/Ref', 'Quantity']];

            jobs.forEach(job => {
                job.dailyLogs?.forEach(log => {
                    const logDate = log.date;
                    if (logDate >= startStr && (department === 'All' || log.stage === department)) {
                        rows.push([
                            log.date,
                            job.id,
                            job.styles[0]?.styleNo || '-',
                            job.styles[0]?.buyer || '-',
                            log.stage,
                            log.lineId || '-',
                            log.quantity.toString()
                        ]);
                    }
                });
            });

            const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `production_report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setIsGenerating(false);
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-[#37352F]">Export Production Report</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Department</label>
                        <select 
                            value={department} 
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                        >
                            <option value="All">All Departments</option>
                            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase">Time Period</label>
                        <select 
                            value={period} 
                            onChange={(e) => setPeriod(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-indigo-500 outline-none"
                        >
                            <option value="All Time">All Time</option>
                            <option value="Today">Today</option>
                            <option value="Last 7 Days">Last 7 Days</option>
                            <option value="This Month">This Month</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                    <button 
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="flex-1 px-4 py-2 bg-[#37352F] text-white text-sm font-medium rounded hover:bg-black flex justify-center items-center gap-2"
                    >
                        {isGenerating ? 'Generating...' : <><Download size={16} /> Download CSV</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

export const ProductionFlowDashboard: React.FC<ProductionFlowDashboardProps> = ({ jobs, onUpdateJob }) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('Overview');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  // Persisted Lines Configuration (Could be moved to global settings in real app)
  const [productionLines, setProductionLines] = useState<string[]>(['Line 1', 'Line 2', 'Line 3']);

  // Reports State
  const [reportPeriod, setReportPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');

  // --- REPORT: KPI Calculations (Top Cards) ---
  const reportData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];

    let todayOutput = 0;
    let weekOutput = 0;
    let totalPacked = 0;
    let totalOrderQty = 0;
    let overdueCount = 0;

    jobs.forEach(job => {
        totalOrderQty += job.totalQty;
        totalPacked += (job.productionProgress?.['Packing'] || 0);

        if (job.status !== 'Completed' && job.exFactoryDate < today) {
            overdueCount++;
        }

        job.dailyLogs?.forEach(log => {
            if (log.date === today) {
                todayOutput += log.quantity;
            }
            if (log.date >= sevenDaysStr && log.date <= today) {
                weekOutput += log.quantity;
            }
        });
    });

    const completionPct = totalOrderQty > 0 ? (totalPacked / totalOrderQty) * 100 : 0;

    return { todayOutput, weekOutput, completionPct, overdueCount };
  }, [jobs]);

  // --- ACTIVE JOBS FILTER ---
  const activeJobs = useMemo(() => {
    if (activeTab === 'Overview' || activeTab === 'Reports') return [];
    return jobs.filter(job => isJobReadyForStage(job, activeTab as StageId));
  }, [jobs, activeTab]);

  const activeStageConfig = STAGES.find(s => s.id === activeTab);

  // --- ANALYTICS ---
  const analyticsData = useMemo(() => {
      if (activeTab !== 'Reports') return { chartData: [], logs: [] };

      const today = new Date();
      let startDate = new Date();
      
      if (reportPeriod === 'Weekly') startDate.setDate(today.getDate() - 7);
      if (reportPeriod === 'Monthly') startDate.setMonth(today.getMonth() - 1);
      if (reportPeriod === 'Daily') startDate = today;

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = today.toISOString().split('T')[0];

      const logs: (ProductionLog & { jobName: string, style: string })[] = [];
      const stageTotals: Record<string, number> = {};
      STAGES.forEach(s => stageTotals[s.id] = 0);

      jobs.forEach(job => {
          job.dailyLogs?.forEach(log => {
              if (log.date >= startStr && log.date <= endStr) {
                  logs.push({
                      ...log,
                      jobName: job.batchName,
                      style: job.styles[0]?.styleNo || 'N/A'
                  });
                  if (stageTotals[log.stage] !== undefined) {
                      stageTotals[log.stage] += log.quantity;
                  }
              }
          });
      });

      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const chartData = STAGES.map(s => ({
          name: s.label,
          output: stageTotals[s.id],
          color: s.color.replace('text-', '')
      }));

      return { chartData, logs };
  }, [jobs, activeTab, reportPeriod]);

  // --- BATCH SAVE HANDLER ---
  const handleBatchSave = (entries: {jobId: string, qty: number, stage: StageId, date: string, lineId?: string}[]) => {
      entries.forEach(entry => {
          const job = jobs.find(j => j.id === entry.jobId);
          if (!job) return;

          const currentQty = job.productionProgress?.[entry.stage] || 0;
          const newQty = currentQty + entry.qty;
          
          const newLog: ProductionLog = {
              id: `log-${Date.now()}-${Math.random()}`,
              date: entry.date,
              stage: entry.stage,
              quantity: entry.qty,
              lineId: entry.lineId
          };

          const updatedJob: JobBatch = {
              ...job,
              productionProgress: {
                  ...job.productionProgress,
                  [entry.stage]: newQty
              },
              dailyLogs: [...(job.dailyLogs || []), newLog],
              // Only mark completed if explicitly handled or leave for Handover
              status: (entry.stage === 'Packing' && newQty >= job.totalQty) ? 'Completed' : job.status
          };

          onUpdateJob(updatedJob);
      });

      setSaveMessage(`Successfully recorded ${entries.length} entries.`);
      setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleHandoverToShipping = (job: JobBatch) => {
      onUpdateJob({
          ...job,
          status: 'Ready to Ship'
      });
      setSaveMessage(`${job.id} moved to Ready to Ship Queue`);
      setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* HEADER SECTION (Fixed Height) */}
      <div className="flex-none space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold text-[#37352F]">Production Flow Control</h1>
              <p className="text-sm text-gray-500">Sequential gate tracking: Cutting to Packing.</p>
            </div>
            <button 
              onClick={() => setIsEntryModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-all shadow-sm font-medium"
            >
              <Plus size={18} /> Record Output
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Today's Output</span>
                    <Activity size={16} className="text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-[#37352F]">{reportData.todayOutput.toLocaleString()} <span className="text-sm font-normal text-gray-400">pcs</span></div>
             </div>
             <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">7 Day Trend</span>
                    <TrendingUp size={16} className="text-green-500" />
                </div>
                <div className="text-2xl font-bold text-[#37352F]">{reportData.weekOutput.toLocaleString()} <span className="text-sm font-normal text-gray-400">pcs</span></div>
             </div>
             <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Overall Completion</span>
                    <CheckCircle2 size={16} className="text-indigo-500" />
                </div>
                <div className="text-2xl font-bold text-[#37352F]">{reportData.completionPct.toFixed(1)}%</div>
             </div>
             <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Overdue Jobs</span>
                    <AlertTriangle size={16} className="text-red-500" />
                </div>
                <div className={`text-2xl font-bold ${reportData.overdueCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>{reportData.overdueCount}</div>
             </div>
          </div>

          {/* NAVIGATION TABS (Sticky Logic Fix) */}
          <div className="flex overflow-x-auto border-b border-gray-200 no-scrollbar gap-6 px-2 sticky top-0 bg-white z-10">
            <button
                onClick={() => setActiveTab('Overview')}
                className={`pb-3 flex items-center gap-2 transition-all whitespace-nowrap
                    ${activeTab === 'Overview' ? 'border-b-2 border-[#37352F] text-[#37352F]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                <LayoutDashboard size={16} />
                <span className="text-sm font-bold">Overview</span>
            </button>

            {STAGES.map(stage => {
                const count = jobs.filter(j => isJobReadyForStage(j, stage.id)).length;
                return (
                    <button
                        key={stage.id}
                        onClick={() => setActiveTab(stage.id)}
                        className={`pb-3 flex items-center gap-2 transition-all whitespace-nowrap
                            ${activeTab === stage.id ? 'border-b-2 border-[#37352F] text-[#37352F]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        <stage.icon size={16} />
                        <span className="text-sm font-bold">{stage.label}</span>
                        {count > 0 && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-600 font-medium">{count}</span>}
                    </button>
                );
            })}

            <button
                onClick={() => setActiveTab('Reports')}
                className={`pb-3 flex items-center gap-2 transition-all whitespace-nowrap
                    ${activeTab === 'Reports' ? 'border-b-2 border-[#37352F] text-[#37352F]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                <FileBarChart size={16} />
                <span className="text-sm font-bold">Reports</span>
            </button>
          </div>
      </div>

      {/* CONTENT AREA (Scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'Overview' && (
             <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                   <h3 className="text-sm font-bold text-gray-700">Production Floor Status</h3>
                   <div className="flex gap-2">
                      <div className="relative">
                         <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
                         <input type="text" placeholder="Search job..." className="pl-8 pr-3 py-1.5 text-xs border rounded-md outline-none focus:border-indigo-500" />
                      </div>
                   </div>
                </div>
                <div className="overflow-auto custom-scrollbar">
                   <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-white text-xs text-gray-500 uppercase font-semibold sticky top-0 z-10 shadow-sm">
                         <tr>
                            <th className="px-6 py-4">Job Number</th>
                            <th className="px-6 py-4">Style</th>
                            <th className="px-6 py-4">Buyer</th>
                            <th className="px-6 py-4 text-right">Total Qty</th>
                            <th className="px-6 py-4">Current Department</th>
                            <th className="px-6 py-4 w-40">Progress</th>
                            <th className="px-6 py-4 text-right">Ex-Factory</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                         {[...jobs]
                            .sort((a, b) => {
                               const stageA = STAGES.findIndex(s => s.label === getJobCurrentStage(a));
                               const stageB = STAGES.findIndex(s => s.label === getJobCurrentStage(b));
                               return stageA - stageB;
                            })
                            .map(job => {
                               const stageLabel = getJobCurrentStage(job);
                               const stageConfig = STAGES.find(s => s.label === stageLabel);
                               const completed = job.productionProgress?.[stageConfig?.id || 'Cutting'] || 0;
                               const pct = (completed / job.totalQty) * 100;
                               
                               return (
                                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                     <td className="px-6 py-4 font-mono font-medium text-[#37352F]">{job.id}</td>
                                     <td className="px-6 py-4 text-gray-600">{job.styles[0]?.styleNo}</td>
                                     <td className="px-6 py-4 text-gray-600">{job.styles[0]?.buyer}</td>
                                     <td className="px-6 py-4 text-right font-mono">{job.totalQty.toLocaleString()}</td>
                                     <td className="px-6 py-4">
                                        {stageConfig ? (
                                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${stageConfig.bg} ${stageConfig.color} ${stageConfig.border}`}>
                                              <stageConfig.icon size={12} /> {stageLabel}
                                           </span>
                                        ) : (
                                           <span className="text-gray-500">{stageLabel}</span>
                                        )}
                                     </td>
                                     <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                           <div className="flex justify-between text-[10px] text-gray-400">
                                              <span>{completed} / {job.totalQty}</span>
                                              <span>{Math.round(pct)}%</span>
                                           </div>
                                           <div className="w-full bg-gray-100 rounded-full h-1.5">
                                              <div className={`h-1.5 rounded-full ${stageConfig ? stageConfig.color.replace('text', 'bg') : 'bg-gray-400'}`} style={{width: `${pct}%`}}></div>
                                           </div>
                                        </div>
                                     </td>
                                     <td className="px-6 py-4 text-right text-xs font-mono text-gray-600">{formatAppDate(job.exFactoryDate)}</td>
                                  </tr>
                               );
                            })}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {/* 2. REPORTS TAB */}
          {activeTab === 'Reports' && (
             <div className="flex flex-col space-y-6 h-full pb-4">
                
                {/* Toolbar */}
                <div className="flex justify-between items-center shrink-0">
                   <button 
                        onClick={() => setIsDownloadModalOpen(true)}
                        className="px-4 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                   >
                        <Download size={14} /> Download Reports
                   </button>

                   <div className="flex items-center gap-3">
                       <span className="text-sm text-gray-500 font-medium">Time Period:</span>
                       <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                          {['Daily', 'Weekly', 'Monthly'].map(p => (
                             <button
                                key={p}
                                onClick={() => setReportPeriod(p as any)}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all
                                   ${reportPeriod === p ? 'bg-[#37352F] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                             >
                                {p}
                             </button>
                          ))}
                       </div>
                   </div>
                </div>

                {/* Charts Section */}
                <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm h-80 shrink-0">
                   <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <TrendingUp size={16} /> Production Output by Department ({reportPeriod})
                   </h3>
                   <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={analyticsData.chartData} margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                         <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                         <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                            cursor={{fill: '#F9FAFB'}}
                         />
                         <Bar dataKey="output" radius={[4, 4, 0, 0]} barSize={40}>
                            {analyticsData.chartData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4F46E5' : '#818CF8'} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </div>

                {/* Logs Table */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1">
                   <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                      <Activity size={16} className="text-gray-400" />
                      <h3 className="text-sm font-bold text-gray-700">Detailed Production Logs ({analyticsData.logs.length})</h3>
                   </div>
                   <div className="overflow-auto custom-scrollbar h-full">
                      <table className="w-full text-left text-sm border-collapse">
                         <thead className="bg-white text-xs text-gray-500 uppercase font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                               <th className="px-6 py-3">Date</th>
                               <th className="px-6 py-3">Job No</th>
                               <th className="px-6 py-3">Style</th>
                               <th className="px-6 py-3">Stage</th>
                               <th className="px-6 py-3">Line/Ref</th>
                               <th className="px-6 py-3 text-right">Output Qty</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {analyticsData.logs.map((log) => (
                               <tr key={log.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-3 font-mono text-gray-600 text-xs">{formatAppDate(log.date)}</td>
                                  <td className="px-6 py-3 font-medium text-[#37352F]">{log.jobName}</td>
                                  <td className="px-6 py-3 text-gray-600">{log.style}</td>
                                  <td className="px-6 py-3">
                                     <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600">
                                        {log.stage}
                                     </span>
                                  </td>
                                  <td className="px-6 py-3 text-gray-500 text-xs">{log.lineId || '-'}</td>
                                  <td className="px-6 py-3 text-right font-mono font-bold text-green-700">+{log.quantity}</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          )}

          {/* 3. STAGE TABS */}
          {activeTab !== 'Overview' && activeTab !== 'Reports' && activeStageConfig && (
             <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                    <h3 className="text-sm font-bold text-gray-700">Work In Progress: {activeStageConfig.label}</h3>
                </div>
                
                <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-white text-xs text-gray-500 uppercase font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 border-b border-gray-100">Job Number</th>
                                <th className="px-6 py-3 border-b border-gray-100">Style Number</th>
                                <th className="px-6 py-3 border-b border-gray-100 text-right">Order Qty</th>
                                <th className="px-6 py-3 border-b border-gray-100">Ex-Factory</th>
                                <th className="px-6 py-3 border-b border-gray-100 text-right">Completed</th>
                                <th className="px-6 py-3 border-b border-gray-100 text-right">Remaining</th>
                                <th className="px-6 py-3 border-b border-gray-100 w-48">Progress</th>
                                {activeTab === 'Packing' && <th className="px-6 py-3 border-b border-gray-100 w-24">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {activeJobs.map(job => {
                                const completed = job.productionProgress?.[activeTab as StageId] || 0;
                                const remaining = job.totalQty - completed;
                                const progress = (completed / job.totalQty) * 100;
                                const isReadyToShip = activeTab === 'Packing' && completed >= job.totalQty && job.status !== 'Ready to Ship' && job.status !== 'Booked' && job.status !== 'Shipped';

                                return (
                                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="font-mono font-bold text-blue-700">{job.id}</div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-medium text-[#37352F]">{job.styles[0]?.styleNo}</div>
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono">{job.totalQty.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-gray-600 text-xs">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} /> {formatAppDate(job.exFactoryDate)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-green-600">{completed.toLocaleString()}</td>
                                        <td className="px-6 py-3 text-right text-gray-500">{remaining.toLocaleString()}</td>
                                        <td className="px-6 py-3">
                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{width: `${progress}%`}}></div>
                                            </div>
                                        </td>
                                        {activeTab === 'Packing' && (
                                            <td className="px-6 py-3">
                                                {isReadyToShip && (
                                                    <button 
                                                        onClick={() => handleHandoverToShipping(job)}
                                                        className="flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded text-xs font-bold hover:bg-green-100 transition-colors whitespace-nowrap"
                                                    >
                                                        <Truck size={12} /> Handover
                                                    </button>
                                                )}
                                                {job.status === 'Ready to Ship' && <span className="text-xs text-blue-600 font-bold">In Shipping Queue</span>}
                                                {job.status === 'Booked' && <span className="text-xs text-orange-600 font-bold">Booked</span>}
                                                {job.status === 'Shipped' && <span className="text-xs text-gray-400 font-bold">Shipped</span>}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {activeJobs.length === 0 && (
                                <tr><td colSpan={activeTab === 'Packing' ? 8 : 7} className="p-8 text-center text-gray-400 italic">No jobs pending for {activeStageConfig.label}.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
          )}
      </div>

      {/* Success Toast */}
      {saveMessage && (
         <div className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in z-50">
            <CheckCircle2 size={20} />
            <span className="font-medium">{saveMessage}</span>
         </div>
      )}

      {/* Production Entry Modal */}
      <ProductionEntryModal 
         isOpen={isEntryModalOpen}
         onClose={() => setIsEntryModalOpen(false)}
         jobs={jobs}
         onSaveBatch={handleBatchSave}
         availableLines={productionLines}
         onUpdateLines={setProductionLines}
      />

      {/* Report Download Modal */}
      <ReportDownloadModal 
         isOpen={isDownloadModalOpen}
         onClose={() => setIsDownloadModalOpen(false)}
         jobs={jobs}
      />

    </div>
  );
};
