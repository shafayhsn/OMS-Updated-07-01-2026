import React, { useState, useMemo } from 'react';
import { 
  Plus, ArrowLeft, Search, Filter, 
  Calendar, Layers, CheckCircle2, AlertCircle, Trash2, Edit2, AlertTriangle, 
  ClipboardList, X, ChevronRight, FileText, Printer, Play, Shirt, Droplets, Tag, Palette,
  Scissors, CheckSquare, ListChecks, Settings2, Briefcase, Hash, Info, Package, Lock, Square, MapPin, CreditCard, Truck, Eye,
  Save, CircleDashed, GitMerge
} from 'lucide-react';
import { Order, JobBatch, PurchasingRequest, CuttingPlanDetail, BOMItem, EmbellishmentRecord, Buyer, CompanyDetails, WorkOrderRequest, PPMeetingSection, PPMeetingNotes } from '../types';
import { formatAppDate, LOGO_URL } from '../constants';
import { FabricPlanGenerator } from './FabricPlanGenerator';
import { TrimsPlanGenerator } from './TrimsPlanGenerator';
import { EmbellishmentPlanGenerator } from './EmbellishmentPlanGenerator';
import { CuttingPlanGenerator } from './CuttingPlanGenerator';
import { FinishingPlanGenerator } from './FinishingPlanGenerator';
import { SamplingPlanGenerator } from './SamplingPlanGenerator';
import { TestingPlanGenerator } from './TestingPlanGenerator';
import { ProcessPlanGenerator } from './ProcessPlanGenerator';
import { SalesContractModal } from './SalesContractModal';

interface JobManagerDashboardProps {
  availableOrders: Order[];
  jobs: JobBatch[];
  availableBuyers: Buyer[];
  companyDetails: CompanyDetails;
  onUpdateJobs: (jobs: JobBatch[]) => void;
  onBack?: () => void;
}

const INITIAL_JOB_STATE: Partial<JobBatch> = {
  batchName: '',
  status: 'Planning',
  exFactoryDate: ''
};

const PLAN_MODULES = [
    { id: 'Fabric', label: 'FABRIC PLAN', desc: 'Consumption & Sourcing', icon: Layers, color: 'blue', route: 'Purchasing' },
    { id: 'Trims', label: 'TRIMS PLAN', desc: 'Accessories Buying', icon: Tag, color: 'amber', route: 'Purchasing' },
    { id: 'Testing', label: 'LAB TEST', desc: 'Quality Compliance', icon: AlertCircle, color: 'purple', route: 'Purchasing' },
    { id: 'Cutting', label: 'CUTTING PLAN', desc: 'Markers & Lay Plans', icon: Scissors, color: 'orange', route: 'Planning' },
    { id: 'Embellishment', label: 'EMBELLISHMENT PLAN', desc: 'Artwork & Prints', icon: Palette, color: 'indigo', route: 'Planning' },
    { id: 'Process', label: 'PROCESS ROUTE', desc: 'Execution Flow', icon: GitMerge, color: 'cyan', route: 'Planning' },
    { id: 'Stitching', label: 'STITCHING PLAN', desc: 'Line Allocation', icon: CheckSquare, color: 'blue', route: 'Planning' },
    { id: 'Washing', label: 'WASHING PLAN', desc: 'Laundry Processing', icon: Droplets, color: 'cyan', route: 'Planning' },
    { id: 'Finishing', label: 'FINISHING PLAN', desc: 'Packing & Cartons', icon: CheckCircle2, color: 'green', route: 'Planning' },
    { id: 'Sampling', label: 'SAMPLING PLAN', desc: 'Development Schedule', icon: ClipboardList, color: 'pink', route: 'Sample Room' },
];

const PPM_OPERATIONS = [
    'Sampling Pattern',
    'Fabric / Lining',
    'Trims & Accessories',
    'Cutting',
    'Stitching',
    'Embellishment',
    'Washing',
    'Packing / Finishing',
    'Testing'
] as const;

export const JobManagerDashboard: React.FC<JobManagerDashboardProps> = ({ 
  availableOrders, jobs, availableBuyers, companyDetails, onUpdateJobs, onBack 
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [newJobData, setNewJobData] = useState(INITIAL_JOB_STATE);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  const [planningJob, setPlanningJob] = useState<JobBatch | null>(null);
  const [activePlanGenerator, setActivePlanGenerator] = useState<string | null>(null);

  // Summary Modal State
  const [summaryJob, setSummaryJob] = useState<JobBatch | null>(null);

  // Selection State for Jobs
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  // Delete State for whole Job
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [jobToDeleteId, setJobToDeleteId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Delete State for specific Plan
  const [planToDelete, setPlanToDelete] = useState<{ id: string, label: string } | null>(null);
  const [planDeletePassword, setPlanDeletePassword] = useState('');
  const [planDeleteError, setPlanDeleteError] = useState('');

  // PP Meeting Modal State
  const [isPPModalOpen, setIsPPModalOpen] = useState(false);
  const [ppEditingOrder, setPPEditingOrder] = useState<Order | null>(null);
  const [ppForm, setPPForm] = useState<PPMeetingNotes>({ inspectionDate: '', poBreakdown: '', sections: {} });

  // Sales Contract State
  const [isSalesContractOpen, setIsSalesContractOpen] = useState(false);

  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Logic for Unassigned Orders Alert Box
  const unassignedOrdersCount = useMemo(() => {
    return availableOrders.filter(o => o.status !== 'Draft' && !jobs.some(j => j.styles.some(s => s.id === o.id))).length;
  }, [availableOrders, jobs]);

  // --- Handlers ---

  const handleOpenCreate = () => {
    setEditingJobId(null);
    setNewJobData(INITIAL_JOB_STATE);
    setSelectedOrderIds(new Set());
    setIsCreateModalOpen(true);
  };

  const handleCreateJob = () => {
    if (!newJobData.batchName || selectedOrderIds.size === 0) {
        alert("Batch Name and at least one order are required.");
        return;
    }

    const selectedStyles = availableOrders.filter(o => selectedOrderIds.has(o.id));
    const totalQty = selectedStyles.reduce((acc, o) => acc + o.quantity, 0);

    const newJob: JobBatch = {
        id: editingJobId || `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
        batchName: newJobData.batchName!,
        styles: selectedStyles,
        totalQty,
        status: 'Planning',
        exFactoryDate: newJobData.exFactoryDate || '',
        plans: {
            fabric: 'Pending Creation',
            cutting: 'Pending Creation',
            trims: 'Pending Creation',
            embellishment: 'Pending Creation',
            stitching: 'Pending Creation',
            washing: 'Pending Creation',
            process: 'Pending Creation',
            finishing: 'Pending Creation',
            sampling: 'Pending Creation',
            testing: 'Pending Creation',
        }
    };

    if (editingJobId) {
        onUpdateJobs(jobs.map(j => j.id === editingJobId ? newJob : j));
    } else {
        onUpdateJobs([newJob, ...jobs]);
    }

    setIsCreateModalOpen(false);
  };

  const initiateDeleteJob = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setJobToDeleteId(id);
    setDeletePassword('');
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteJob = () => {
    if (deletePassword === 'admin') {
        onUpdateJobs(jobs.filter(j => j.id !== jobToDeleteId));
        setIsDeleteModalOpen(false);
    } else {
        setDeleteError('Incorrect password. Try "admin"');
    }
  };

  const initiateDeletePlan = (id: string, label: string) => {
    setPlanToDelete({ id, label });
    setPlanDeletePassword('');
    setPlanDeleteError('');
  };

  const confirmDeletePlan = () => {
    if (!planningJob || !planToDelete) return;
    
    if (planDeletePassword === 'admin') {
      const moduleKey = planToDelete.id.toLowerCase() as keyof typeof planningJob.plans;
      const updatedJob = {
        ...planningJob,
        plans: {
          ...planningJob.plans,
          [moduleKey]: 'Pending Creation' as const
        }
      };
      onUpdateJobs(jobs.map(j => j.id === planningJob.id ? updatedJob : j));
      setPlanningJob(updatedJob);
      setPlanToDelete(null);
      setSuccessToast(`Plan deleted.`);
    } else {
      setPlanDeleteError('Incorrect password. Try "admin"');
    }
  };

  const handleIssueFabric = (reqs: PurchasingRequest[]) => {
      if (!planningJob) return;
      const updatedJob = { 
          ...planningJob, 
          plans: { ...planningJob.plans, fabric: 'Approved' as const },
          purchasingRequests: [...(planningJob.purchasingRequests || []), ...reqs]
      };
      onUpdateJobs(jobs.map(j => j.id === planningJob.id ? updatedJob : j));
      setPlanningJob(updatedJob);
      setActivePlanGenerator(null);
  };

  const handleIssueTrims = (reqs: PurchasingRequest[]) => {
      if (!planningJob) return;
      const updatedJob = { 
          ...planningJob, 
          plans: { ...planningJob.plans, trims: 'Approved' as const },
          purchasingRequests: [...(planningJob.purchasingRequests || []), ...reqs]
      };
      onUpdateJobs(jobs.map(j => j.id === planningJob.id ? updatedJob : j));
      setPlanningJob(updatedJob);
      setActivePlanGenerator(null);
  };

  const handleIssueEmbellishment = (reqs: WorkOrderRequest[]) => {
      if (!planningJob) return;
      const updatedJob = { 
          ...planningJob, 
          plans: { ...planningJob.plans, embellishment: 'Approved' as const },
          workOrderRequests: [...(planningJob.workOrderRequests || []), ...reqs]
      };
      onUpdateJobs(jobs.map(j => j.id === planningJob.id ? updatedJob : j));
      setPlanningJob(updatedJob);
      setActivePlanGenerator(null);
  };

  const handleIssueCutting = (details: CuttingPlanDetail[]) => {
      if (!planningJob) return;
      const updatedJob = { 
          ...planningJob, 
          plans: { ...planningJob.plans, cutting: 'Approved' as const },
          cuttingPlanDetails: details
      };
      onUpdateJobs(jobs.map(j => j.id === planningJob.id ? updatedJob : j));
      setPlanningJob(updatedJob);
      setActivePlanGenerator(null);
  };

  const handleIssueFinishing = (updated: JobBatch) => {
      onUpdateJobs(jobs.map(j => j.id === updated.id ? updated : j));
      setPlanningJob(updated);
      setActivePlanGenerator(null);
  };

  const handleIssueSampling = (updated: JobBatch) => {
      onUpdateJobs(jobs.map(j => j.id === updated.id ? updated : j));
      setPlanningJob(updated);
      setActivePlanGenerator(null);
  };

  const handleIssueTesting = () => {
      if (!planningJob) return;
      const updatedJob = { ...planningJob, plans: { ...planningJob.plans, testing: 'Approved' as const } };
      onUpdateJobs(jobs.map(j => j.id === planningJob.id ? updatedJob : j));
      setPlanningJob(updatedJob);
      setActivePlanGenerator(null);
  };

  const handleIssueProcess = (schedules: Record<string, { startDate: string; endDate: string }>) => {
      if (!planningJob) return;
      const updatedJob = { 
          ...planningJob, 
          plans: { ...planningJob.plans, process: 'Approved' as const },
          stageSchedules: schedules
      };
      onUpdateJobs(jobs.map(j => j.id === planningJob.id ? updatedJob : j));
      setPlanningJob(updatedJob);
      setActivePlanGenerator(null);
  };

  const handleOpenPPLog = (styleId: string) => {
      const jobWithStyle = jobs.find(j => j.styles.some(s => s.id === styleId));
      if (!jobWithStyle) return;
      const style = jobWithStyle.styles.find(s => s.id === styleId)!;
      setPPEditingOrder(style);
      const plannedDate = style.plannedDate || style.deliveryDate || '';
      setPPForm(style.ppMeetingNotes || { inspectionDate: plannedDate || new Date().toISOString().split('T')[0], poBreakdown: '', sections: {} });
      setIsPPModalOpen(true);
  };

  const updatePPSection = (op: string, field: keyof PPMeetingSection, value: string) => {
    setPPForm(prev => ({
        ...prev,
        sections: { ...prev.sections, [op]: { ...(prev.sections[op] || { startDate: '', finishDate: '', criticalArea: '', preventiveMeasure: '', concernedPerson: '' }), [field]: value } }
    }));
  };

  const handleSavePPNotes = () => {
    if (!ppEditingOrder) return;
    const updatedJobs = jobs.map(j => {
        const styleToUpdate = j.styles.find(s => s.id === ppEditingOrder.id);
        if (!styleToUpdate) return j;
        const updatedStyles = j.styles.map(style => {
            if (style.id === ppEditingOrder.id) {
                return { ...style, ppMeetingStatus: 'Completed', ppMeetingDate: ppForm.inspectionDate, ppMeetingNotes: ppForm };
            }
            return style;
        });
        return { ...j, styles: updatedStyles };
    });
    onUpdateJobs(updatedJobs);
    setIsPPModalOpen(false);
    setSuccessToast(`PP Meeting notes saved.`);
  };

  const handlePrintPlan = (moduleId: string) => {
      if (!planningJob) return;
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const companyLogo = companyDetails?.logoUrl || LOGO_URL;
      const companyName = companyDetails?.name || "Nizamia";

      let contentHtml = '';

      if (moduleId === 'Fabric') {
          const reqs = planningJob.purchasingRequests?.filter(r => r.materialName.toLowerCase().includes('denim') || r.materialName.toLowerCase().includes('fabric')) || [];
          contentHtml = `
            <h2 style="text-transform:uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">Fabric Execution Plan</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #f3f4f6;">
                        <th style="border: 1px solid #000; padding: 8px; text-align: left;">Material / Spec</th>
                        <th style="border: 1px solid #000; padding: 8px; text-align: left;">Supplier</th>
                        <th style="border: 1px solid #000; padding: 8px; text-align: right;">Total Req Qty</th>
                        <th style="border: 1px solid #000; padding: 8px; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${reqs.map(r => `
                        <tr>
                            <td style="border: 1px solid #000; padding: 8px;">
                                <strong>${r.materialName}</strong><br/>
                                <span style="font-size: 10px; color: #666;">${r.specs}</span>
                            </td>
                            <td style="border: 1px solid #000; padding: 8px;">${r.supplier}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${r.qty.toLocaleString()} ${r.unit}</td>
                            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${r.status}</td>
                        </tr>
                    `).join('')}
                    ${reqs.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">No approved fabric requests found for this job.</td></tr>' : ''}
                </tbody>
            </table>
          `;
      } else if (moduleId === 'Cutting') {
          const details = planningJob.cuttingPlanDetails || [];
          contentHtml = `
            <h2 style="text-transform:uppercase; border-bottom: 2px solid #000; padding-bottom: 5px;">Cutting Execution Ticket</h2>
            ${details.map(d => `
                <div style="margin-top: 20px; border: 1px solid #000; padding: 15px;">
                    <h3 style="margin-top: 0;">${d.materialName}</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px; margin-bottom: 15px;">
                        <div><strong>Start Date:</strong> ${formatAppDate(d.startDate)}</div>
                        <div><strong>End Date:</strong> ${formatAppDate(d.finishDate)}</div>
                        <div><strong>Daily Target:</strong> ${d.dailyTarget} pcs</div>
                        <div><strong>Extra Cut:</strong> ${d.extraCuttingPct}%</div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                        <thead>
                            <tr style="background: #f3f4f6;">
                                <th style="border: 1px solid #ccc; padding: 4px; text-align: left;">Shade / Color</th>
                                ${Object.keys(Object.values(d.sizeBreakdown)[0] || {}).map(size => `<th style="border: 1px solid #ccc; padding: 4px; text-align: center;">${size}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(d.sizeBreakdown).map(([shade, sizes]) => `
                                <tr>
                                    <td style="border: 1px solid #ccc; padding: 4px; font-weight: bold;">${shade}</td>
                                    ${Object.values(sizes).map((q: any) => `<td style="border: 1px solid #ccc; padding: 4px; text-align: center;">${q.final}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
            ${details.length === 0 ? '<p style="text-align:center; padding:20px; color:#999;">No cutting details recorded.</p>' : ''}
          `;
      } else {
          contentHtml = `<p style="text-align:center; padding: 50px; color: #999;">Print layout for ${moduleId} Plan is currently under development.</p>`;
      }

      printWindow.document.write(`
        <html>
            <head>
                <title>${moduleId} Plan - ${planningJob.id}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.4; }
                    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; border-bottom: 4px solid #000; padding-bottom: 15px; }
                    th { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #444; }
                    td { font-size: 11px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="${companyLogo}" style="height: 45px; max-width: 100px; object-fit: contain;" />
                        <div>
                            <h1 style="margin: 0; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px;">${companyName}</h1>
                            <p style="margin: 2px 0 0 0; font-size: 10px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Production Execution Document</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 900; font-size: 22px; color: #1e3a8a;">${planningJob.id}</div>
                        <div style="font-size: 10px; color: #666; font-weight: 700; text-transform: uppercase;">Generated: ${dateStr}</div>
                    </div>
                </div>
                ${contentHtml}
                <div style="margin-top: 60px; display: flex; justify-content: space-between;">
                    <div style="border-top: 1.5px solid #000; width: 180px; text-align: center; padding-top: 8px; font-size: 9px; font-weight: 800; text-transform: uppercase;">Prepared By</div>
                    <div style="border-top: 1.5px solid #000; width: 180px; text-align: center; padding-top: 8px; font-size: 9px; font-weight: 800; text-transform: uppercase;">Dept. Head</div>
                    <div style="border-top: 1.5px solid #000; width: 180px; text-align: center; padding-top: 8px; font-size: 9px; font-weight: 800; text-transform: uppercase;">Approved By</div>
                </div>
                <div style="margin-top: 40px; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #eee; pt: 10px;">
                    This is an automated production output from Nizamia Global Merchandising Ecosystem.
                </div>
                <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 800); }</script>
            </body>
        </html>
      `);
      printWindow.document.close();
  };

  const filteredJobs = jobs.filter(j => 
    j.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    j.batchName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const issuedPlansCount = planningJob ? Object.values(planningJob.plans).filter(v => v === 'Approved').length : 0;

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      
      {/* 1. MAIN LIST VIEW */}
      <div className="flex flex-col h-full space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold text-[#37352F]">Production Job Batches</h1>
                  <p className="text-sm text-gray-500">Group purchase orders into manageable factory jobs.</p>
              </div>
              <div className="flex items-center gap-3">
                  <button onClick={onBack} className="p-2.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft size={20}/></button>
                  <button onClick={handleOpenCreate} className="flex items-center gap-2 px-6 py-2.5 bg-[#1a1a1a] text-white rounded-lg hover:bg-black transition-colors shadow-lg text-sm font-bold">
                      <Plus size={18} /> Create New Job
                  </button>
              </div>
          </div>

          {/* Action Required: Unassigned Orders Alert Box */}
          {unassignedOrdersCount > 0 && (
            <div className="bg-[#FFF4E5] border border-[#FFD5A1] rounded-xl p-4 flex items-center justify-between shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#FFD5A1]/30 rounded-full flex items-center justify-center text-[#B25E09]">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-[#663C00]">Action Required: {unassignedOrdersCount} Unassigned Orders</h4>
                  <p className="text-sm text-[#B25E09]">These orders have been approved but are not yet linked to a Production Job.</p>
                </div>
              </div>
              <button 
                onClick={handleOpenCreate}
                className="px-6 py-2 bg-white border border-[#B25E09] text-[#B25E09] rounded-lg text-sm font-bold hover:bg-[#B25E09] hover:text-white transition-all shadow-sm"
              >
                Assign to Job
              </button>
            </div>
          )}

          {/* List */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex gap-4 items-center">
                  <div className="relative w-80 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="Search jobs..." className="w-full pl-10 pr-4 py-2 text-sm outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
              </div>
              <div className="overflow-auto custom-scrollbar">
                  <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-[#fbfbf9] text-[10px] uppercase font-black text-gray-400 border-b border-gray-200 sticky top-0">
                          <tr>
                              <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded border-gray-300"/></th>
                              <th className="px-6 py-4">JOB ID / BATCH NAME</th>
                              <th className="px-6 py-4">LINKED STYLES</th>
                              <th className="px-6 py-4 text-right">TOTAL QTY</th>
                              <th className="px-6 py-4">SHIP DATE</th>
                              <th className="px-6 py-4">STATUS</th>
                              <th className="px-6 py-4 text-center">ACTION</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredJobs.map(job => (
                              <tr key={job.id} className="group hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4"><input type="checkbox" className="rounded border-gray-300"/></td>
                                  <td className="px-6 py-4">
                                      <div className="font-mono font-bold text-blue-700 text-xs mb-0.5">{job.id}</div>
                                      <div className="font-bold text-[#37352F]">{job.batchName}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex flex-wrap gap-1">
                                          {job.styles.map(s => (
                                              <span key={s.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-black uppercase border border-gray-200">{s.styleNo}</span>
                                          ))}
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono font-bold">{job.totalQty.toLocaleString()}</td>
                                  <td className="px-6 py-4 text-xs text-orange-600 font-bold">{formatAppDate(job.exFactoryDate)}</td>
                                  <td className="px-6 py-4">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-tighter
                                          ${job.status === 'Ready to Ship' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                          {job.status}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center justify-center gap-2">
                                          <button 
                                              onClick={() => setPlanningJob(job)}
                                              className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg shadow-sm hover:bg-black transition-all text-[11px] font-black uppercase tracking-tight whitespace-nowrap"
                                          >
                                              Manage Plans
                                          </button>
                                          <button 
                                              onClick={(e) => initiateDeleteJob(job.id, e)}
                                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                              title="Delete Job Batch"
                                          >
                                              <Trash2 size={18} />
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredJobs.length === 0 && <tr><td colSpan={7} className="p-20 text-center text-gray-300 italic">No production jobs found. Create one to start planning.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* --- MODALS --- */}

      {/* 2. PLANNING CONSOLE MODAL */}
      {planningJob && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-[1200px] h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                  
                  {/* Modal Header */}
                  <div className="px-10 py-6 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                      <div>
                          <h2 className="text-2xl font-black text-[#1a1a1a] tracking-tight">Planning Console</h2>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-bold text-gray-500">Total Volume: <span className="text-[#1a1a1a]">{planningJob.totalQty.toLocaleString()} units</span></span>
                              <span className="h-3 w-px bg-gray-200 mx-1"></span>
                              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{planningJob.id}</span>
                          </div>
                      </div>
                      <button 
                        onClick={() => setPlanningJob(null)}
                        className="p-3 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <X size={28}/>
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 bg-gray-50/20 custom-scrollbar space-y-12">
                      
                      {/* AVAILABLE MODULES GRID */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Available Modules</h3>
                            <span className="text-[10px] italic text-gray-400">Click a stage to launch planning</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {PLAN_MODULES.map(module => (
                                <button 
                                    key={module.id}
                                    onClick={() => setActivePlanGenerator(module.id)}
                                    className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all text-left group hover:border-blue-300"
                                >
                                    <div className={`p-1.5 rounded-lg shrink-0 transition-colors
                                        ${module.color === 'blue' ? 'bg-blue-50 text-blue-600' : 
                                          module.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                          module.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                                          module.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                                          module.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                                          module.color === 'cyan' ? 'bg-cyan-50 text-cyan-600' :
                                          module.color === 'green' ? 'bg-green-50 text-green-700' :
                                          module.color === 'pink' ? 'bg-pink-50 text-pink-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <module.icon size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black text-gray-900 uppercase tracking-tighter truncate leading-none">{module.label}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                      </div>

                      {/* ISSUED EXECUTION PLANS TABLE */}
                      <div className="space-y-6">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Issued Execution Plans</h3>
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-[#fbfbf9] text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Department / Module</th>
                                        <th className="px-6 py-4">Target Route</th>
                                        <th className="px-6 py-4">Plan Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {issuedPlansCount > 0 ? (
                                        PLAN_MODULES.map(module => {
                                            const status = planningJob.plans[module.id.toLowerCase() as keyof typeof planningJob.plans];
                                            if (status !== 'Approved') return null;
                                            
                                            return (
                                                <tr key={module.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <module.icon size={16} className="text-gray-400" />
                                                            <span className="font-bold text-[#1a1a1a]">{module.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">{module.route}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[9px] font-black uppercase border border-green-100">Approved & Active</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setActivePlanGenerator(module.id)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-colors" title="Edit Plan"><Edit2 size={14} /></button>
                                                            <button onClick={() => handlePrintPlan(module.id)} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded transition-colors" title="Print Plan"><Printer size={14} /></button>
                                                            <button onClick={() => initiateDeletePlan(module.id, module.label)} className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors" title="Delete Plan"><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="p-24 text-center">
                                                <div className="flex flex-col items-center gap-4 text-gray-300">
                                                    <CircleDashed size={40} className="animate-spin duration-[4s]" />
                                                    <p className="text-sm font-medium">No plans have been created for this job yet.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                      </div>

                  </div>

                  {/* Modal Footer */}
                  <div className="px-10 py-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                          <button onClick={() => setIsSalesContractOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black uppercase border border-indigo-100 hover:bg-indigo-100 transition-all">
                              <FileText size={16} /> Proforma Invoice
                          </button>
                          <button className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-black uppercase hover:bg-gray-50 transition-all">
                              <Printer size={16} /> Bulk Technical Sheet
                          </button>
                      </div>
                      <button 
                        onClick={() => setPlanningJob(null)}
                        className="px-8 py-2.5 bg-[#1a1a1a] text-white text-sm font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all shadow-xl shadow-gray-200"
                      >
                        Return to Dashboard
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* PLAN DELETE MODAL */}
      {planToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-sm p-8 space-y-6 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 text-red-600">
                      <div className="p-3 bg-red-50 rounded-xl"><Lock size={24} /></div>
                      <div>
                        <h3 className="text-xl font-bold">Revoke Plan</h3>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Admin Access Required</p>
                      </div>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">Enter administrator password to delete the <strong>{planToDelete.label}</strong> for this job batch.</p>
                  <div className="space-y-4">
                      <input 
                          type="password" 
                          autoFocus
                          placeholder="••••••••"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center font-mono text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all" 
                          value={planDeletePassword}
                          onChange={e => setPlanDeletePassword(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && confirmDeletePlan()}
                      />
                      {planDeleteError && <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg text-center animate-in shake duration-300">{planDeleteError}</p>}
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                      <button onClick={confirmDeletePlan} className="w-full py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-700 shadow-lg shadow-red-100 transition-all">Revoke Plan Entry</button>
                      <button onClick={() => setPlanToDelete(null)} className="w-full py-3 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      {/* JOB DELETE MODAL */}
      {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-sm p-8 space-y-6 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 text-red-600">
                      <div className="p-3 bg-red-50 rounded-xl"><Lock size={24} /></div>
                      <div>
                        <h3 className="text-xl font-bold">Secure Deletion</h3>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Admin Access Required</p>
                      </div>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">Enter administrator password to permanently delete this job batch and unlink all styles.</p>
                  <div className="space-y-4">
                      <input 
                          type="password" 
                          autoFocus
                          placeholder="••••••••"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center font-mono text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all" 
                          value={deletePassword}
                          onChange={e => setDeletePassword(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && confirmDeleteJob()}
                      />
                      {deleteError && <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg text-center animate-in shake duration-300">{deleteError}</p>}
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                      <button onClick={confirmDeleteJob} className="w-full py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-700 shadow-lg shadow-red-100 transition-all">Delete Job Batch</button>
                      <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-3 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      {isCreateModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                <div className="px-8 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                   <h2 className="text-xl font-bold text-[#37352F]">Define Production Job</h2>
                   <button onClick={() => setIsCreateModalOpen(false)}><X size={24} className="text-gray-400"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 bg-white custom-scrollbar space-y-10">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Batch Reference Name</label>
                            <input 
                                type="text" 
                                value={newJobData.batchName} 
                                onChange={e => setNewJobData({...newJobData, batchName: e.target.value})} 
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none" 
                                placeholder="e.g. Summer 25 - Drop 01"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Ex-Factory Date</label>
                            <input 
                                type="date" 
                                value={newJobData.exFactoryDate} 
                                onChange={e => setNewJobData({...newJobData, exFactoryDate: e.target.value})} 
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono focus:border-indigo-500 outline-none" 
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Purchase Orders to Consolidate</h3>
                            <span className="text-xs font-bold text-indigo-600">{selectedOrderIds.size} Orders selected</span>
                        </div>
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-inner bg-gray-50">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-white border-b border-gray-200 text-[9px] font-black uppercase text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3 w-10"></th>
                                        <th className="px-4 py-3">Style / ID</th>
                                        <th className="px-4 py-3">Buyer</th>
                                        <th className="px-4 py-3 text-right">Quantity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {availableOrders.filter(o => o.status !== 'Draft' && !jobs.some(j => j.styles.some(s => s.id === o.id))).map(order => (
                                        <tr 
                                            key={order.id} 
                                            onClick={() => { const n = new Set(selectedOrderIds); if(n.has(order.id)) n.delete(order.id); else n.add(order.id); setSelectedOrderIds(n); }}
                                            className={`cursor-pointer hover:bg-indigo-50/20 transition-all ${selectedOrderIds.has(order.id) ? 'bg-indigo-50/50' : ''}`}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                {selectedOrderIds.has(order.id) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-gray-300" />}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-[#1a1a1a] uppercase text-xs">{order.styleNo}</div>
                                                <div className="text-[9px] font-mono text-gray-400">{order.orderID}</div>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-gray-500 uppercase text-[10px]">{order.buyer}</td>
                                            <td className="px-4 py-3 text-right font-mono font-bold">{order.quantity.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                    <button onClick={handleCreateJob} className="px-12 py-2.5 bg-[#1a1a1a] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-xl shadow-gray-200">Finalize Job</button>
                </div>
             </div>
          </div>
      )}

      {/* PLAN GENERATORS */}
      {activePlanGenerator === 'Fabric' && planningJob && (
          <FabricPlanGenerator job={planningJob} onClose={() => setActivePlanGenerator(null)} onIssue={handleIssueFabric} />
      )}
      {activePlanGenerator === 'Trims' && planningJob && (
          <TrimsPlanGenerator job={planningJob} onClose={() => setActivePlanGenerator(null)} onIssue={handleIssueTrims} />
      )}
      {activePlanGenerator === 'Embellishment' && planningJob && (
          <EmbellishmentPlanGenerator job={planningJob} onClose={() => setActivePlanGenerator(null)} onIssue={handleIssueEmbellishment} />
      )}
      {activePlanGenerator === 'Cutting' && planningJob && (
          <CuttingPlanGenerator job={planningJob} onClose={() => setActivePlanGenerator(null)} onIssue={handleIssueCutting} />
      )}
      {activePlanGenerator === 'Finishing' && planningJob && (
          <FinishingPlanGenerator job={planningJob} onClose={() => setActivePlanGenerator(null)} onIssue={handleIssueFinishing} />
      )}
      {activePlanGenerator === 'Sampling' && planningJob && (
          <SamplingPlanGenerator job={planningJob} onClose={() => setActivePlanGenerator(null)} onIssue={handleIssueSampling} />
      )}
      {activePlanGenerator === 'Testing' && planningJob && (
          <TestingPlanGenerator job={planningJob} onClose={() => setActivePlanGenerator(null)} onIssue={handleIssueTesting} />
      )}
      {activePlanGenerator === 'Process' && planningJob && (
          <ProcessPlanGenerator job={planningJob} onClose={() => setActivePlanGenerator(null)} onIssue={handleIssueProcess} />
      )}

      {/* PP MODAL */}
      {isPPModalOpen && ppEditingOrder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-6xl h-[92vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                  <div className="px-8 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><Clipboard size={24} /></div>
                        <div><h2 className="text-xl font-bold text-[#37352F]">Technical Review & PP Meeting Entry</h2><p className="text-xs text-gray-500 mt-0.5">Style: {ppEditingOrder.styleNo} • {ppEditingOrder.buyer}</p></div>
                      </div>
                      <button onClick={() => setIsPPModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-gray-50/20 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inspection Date</label>
                            <input type="date" value={ppForm.inspectionDate} onChange={e => setPPForm({...ppForm, inspectionDate: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                          </div>
                      </div>
                      <div className="space-y-6">
                         <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Execution Control Matrix</h3>
                         <div className="grid grid-cols-1 gap-4">
                            {PPM_OPERATIONS.map(op => {
                                const sec = (ppForm.sections[op] || { startDate: '', finishDate: '', criticalArea: '', preventiveMeasure: '', concernedPerson: '' }) as PPMeetingSection;
                                return (
                                    <div key={op} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-start hover:shadow-md transition-shadow">
                                        <div className="md:col-span-2">
                                            <span className="text-xs font-black text-indigo-700 uppercase tracking-tight block mb-3">{op}</span>
                                            <div className="space-y-2">
                                                <input type="date" value={sec.startDate} onChange={e => updatePPSection(op, 'startDate', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-[10px] outline-none focus:border-blue-400" />
                                                <input type="date" value={sec.finishDate} onChange={e => updatePPSection(op, 'finishDate', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1.5 text-[10px] outline-none focus:border-blue-400" />
                                            </div>
                                        </div>
                                        <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Critical Area (CA)</label>
                                                <textarea value={sec.criticalArea} onChange={e => updatePPSection(op, 'criticalArea', e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-indigo-500 resize-none bg-gray-50/30" placeholder="Risks..." />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Preventive Measure (PM)</label>
                                                <textarea value={sec.preventiveMeasure} onChange={e => updatePPSection(op, 'preventiveMeasure', e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg p-2 text-xs outline-none focus:border-indigo-500 resize-none bg-gray-50/30" placeholder="Solutions..." />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Owner</label>
                                            <input type="text" value={sec.concernedPerson} onChange={e => updatePPSection(op, 'concernedPerson', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500" placeholder="Name" />
                                        </div>
                                    </div>
                                );
                            })}
                         </div>
                      </div>
                  </div>
                  <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsPPModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                      <button onClick={handleSavePPNotes} className="px-10 py-2.5 bg-[#1a1a1a] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg flex items-center gap-2">
                        <Save size={18} /> Save Analysis
                      </button>
                  </div>
              </div>
          </div>
      )}

      {isSalesContractOpen && (
          <SalesContractModal job={planningJob || undefined} onClose={() => setIsSalesContractOpen(false)} companyDetails={companyDetails} />
      )}

      {/* Success Toast */}
      {successToast && (
         <div className="fixed bottom-8 right-8 bg-black text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 transition-all z-[300] border border-gray-800">
            <CheckCircle2 size={20} className="text-green-500" />
            <span className="text-sm font-bold tracking-tight">{successToast}</span>
         </div>
      )}

    </div>
  );
};
