import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  CheckCircle2, 
  CheckSquare,
  Search,
  Plus,
  Package,
  MessageSquare,
  Truck,
  Scissors,
  X,
  Calendar,
  Trash2,
  Edit2,
  FileText,
  FlaskConical,
  Shirt,
  Users,
  Clipboard,
  Send,
  ArrowRight,
  Printer,
  Eye,
  Lock,
  ThumbsUp,
  RotateCcw,
  Beaker,
  FileDown,
  Save,
  ClipboardList,
  Layers,
  ChevronRight,
  Droplets,
  Palette,
  Filter,
  AlertTriangle,
  AlertCircle,
  FileSearch,
  History,
  MapPin,
  Phone,
  User,
  ExternalLink,
  Target,
  Info,
  Square,
  Bell
} from 'lucide-react';
import { JobBatch, Tab, Parcel, DevelopmentSample, SampleRow, ParcelOtherItem, Buyer, CompanyDetails, BOMItem, Order, PPMeetingNotes, PPMeetingSection, WorkOrderRequest, IssuedWorkOrder } from '../types';
import { formatAppDate, LOGO_URL } from '../constants';
import { SampleSummaryView } from './SampleSummaryView';

// --- Sub-Components and Helpers ---

type MainTab = 'Parcels and Approvals' | 'PP Meetings' | 'Work Orders';
type SubTab = 'Approval Items' | 'Parcels' | 'Comments';
type WorkOrderSubTab = 'Planning Demand' | 'Issued Work Orders';

interface UnifiedTrackable {
    id: string;
    refId: string;
    source: 'Job' | 'Development';
    parentRef: string; 
    buyer: string;
    style: string;
    factoryRef: string;
    type: string;
    detail: string;
    category: 'Sample' | 'Material' | 'Embellishment';
    status: string;
    labStatus?: string;
    currentStage: string;
    lastUpdated?: string;
    originalData: any; 
    sentOn?: string;
    deliveredOn?: string;
    commentsReceivedDate?: string;
    commentsSentBy?: string;
    emailAttachmentRef?: string;
    isLabEntry?: boolean;
    parcelNo?: string;
    courier?: string;
    trackingNo?: string;
    feedbackText?: string;
}

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

const TrafficLight = ({ status }: { status: { color: string, label: string } }) => {
    const colors: Record<string, string> = {
        red: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
        yellow: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]',
        orange: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]',
        green: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
        gray: 'bg-gray-200'
    };
    if (status.color === 'gray') return null;
    return (
        <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[status.color]}`} />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">{status.label}</span>
        </div>
    );
};

const getLightStatus = (type: 'app' | 'lab', item: any) => {
    const isApproved = type === 'app' ? item.status === 'Approved' : item.labStatus === 'Approved';
    const isDelivered = !!item.deliveredOn;
    
    if (type === 'app') {
        if (!item.approvalRequired) return { color: 'gray', label: '(N/A)' };
        if (isApproved) return { color: 'green', label: '(APPROVED)' };
        if (isDelivered) return { color: 'orange', label: '(WAITING FEEDBACK)' };
        const isSent = !!item.sentOn || item.status === 'Submitted';
        if (isSent) return { color: 'yellow', label: '(SENT)' };
        return { color: 'red', label: '(PENDING)' };
    } else {
        if (!item.labRequired) return { color: 'gray', label: '(N/A)' };
        if (isApproved) return { color: 'green', label: '(APPROVED)' };
        if (isDelivered && item.labStatus === 'Testing') return { color: 'orange', label: '(WAITING FEEDBACK)' };
        const isSent = item.labStatus === 'Testing' || item.labStatus === 'Sent';
        if (isSent) return { color: 'yellow', label: '(SENT)' };
        return { color: 'red', label: '(PENDING)' };
    }
};

// --- Main PlanningDashboard Component ---

interface PlanningDashboardProps {
  jobs: JobBatch[];
  onNavigate: (tab: Tab) => void;
  onManageJobPlans: (job: JobBatch) => void;
  onUpdateJobs: (jobs: JobBatch[]) => void;
  developmentSamples: DevelopmentSample[];
  onAddDevSample: (sample: DevelopmentSample) => void;
  onUpdateDevSample: (sample: DevelopmentSample) => void;
  parcels: Parcel[];
  onUpdateParcels: (parcels: Parcel[]) => void;
  availableBuyers: Buyer[];
  companyDetails: CompanyDetails;
  issuedWorkOrders: IssuedWorkOrder[];
  onUpdateWorkOrders: (orders: IssuedWorkOrder[]) => void;
}

export const PlanningDashboard: React.FC<PlanningDashboardProps> = ({ 
  jobs, onNavigate, onManageJobPlans, onUpdateJobs,
  developmentSamples, onAddDevSample, onUpdateDevSample,
  parcels, onUpdateParcels, availableBuyers, companyDetails,
  issuedWorkOrders, onUpdateWorkOrders
}) => {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('Parcels and Approvals');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('Approval Items');
  const [activeWorkOrderSubTab, setActiveWorkOrderSubTab] = useState<WorkOrderSubTab>('Planning Demand');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [commentStatusFilter, setCommentStatusFilter] = useState<'All' | 'Pending' | 'Feedback received'>('All');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'All' | 'Pending' | 'Send' | 'Received' | 'Approved'>('All');
  
  // Selection States
  const [selectedApprovalIds, setSelectedApprovalIds] = useState<Set<string>>(new Set());
  const [selectedParcelIds, setSelectedParcelIds] = useState<Set<string>>(new Set());
  const [selectedCommentIds, setSelectedCommentIds] = useState<Set<string>>(new Set());
  const [selectedPPIds, setSelectedPPIds] = useState<Set<string>>(new Set());
  const [selectedWorkOrderDemandIds, setSelectedWorkOrderDemandIds] = useState<Set<string>>(new Set());

  // Modal States
  const [isParcelModalOpen, setIsParcelModalOpen] = useState(false);
  const [isPPModalOpen, setIsPPModalOpen] = useState(false);
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isTrackingUpdateModalOpen, setIsTrackingUpdateModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [commentItem, setCommentItem] = useState<UnifiedTrackable | null>(null);

  // Form States
  const [parcelDetails, setParcelDetails] = useState({ courier: 'DHL', tracking: '', buyerId: '', recipientName: '', address: '', phone: '' });
  const [skipShipmentInfo, setSkipShipmentInfo] = useState(false);
  const [trackingUpdateForm, setTrackingUpdateForm] = useState({ courier: 'DHL', tracking: '' });
  const [tempOtherItems, setTempOtherItems] = useState<ParcelOtherItem[]>([]);
  const [otherItemInput, setOtherItemInput] = useState<Omit<ParcelOtherItem, 'id'>>({ name: '', type: 'Swatch', purpose: 'Reference', qty: 1, unitValue: 5 });

  const [ppEditingOrder, setPPEditingOrder] = useState<Order | null>(null);
  const [ppForm, setPPForm] = useState<PPMeetingNotes>({ inspectionDate: '', poBreakdown: '', sections: {} });
  const [woVendor, setWoVendor] = useState('');
  const [woNotes, setWoNotes] = useState('');
  const [woTargetDate, setWoTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Comment Form State
  const [commentForm, setCommentForm] = useState({
      receivedDate: new Date().toISOString().split('T')[0],
      sentBy: '',
      feedback: '',
      status: 'Commented'
  });

  // Data Aggregations
  const unifiedData: UnifiedTrackable[] = useMemo(() => {
    const list: UnifiedTrackable[] = [];
    const findParcelDetails = (ref: string) => {
        const p = parcels.find(p => p.samples.some(s => s.samNumber === ref) || p.otherItems.some(o => o.name === ref));
        return { sentOn: p?.sentDate, deliveredOn: p?.receivedDate, parcelNo: p?.parcelNo, courier: p?.courier, trackingNo: p?.trackingNo, parcelStatus: p?.status };
    };
    
    jobs.forEach(job => {
        job.styles.forEach(style => {
            style.samplingDetails?.forEach(s => {
                const pInfo = findParcelDetails(s.samNumber);
                list.push({
                    id: `sam-${s.id}`, refId: s.samNumber, source: 'Job', parentRef: job.id, buyer: style.buyer, style: style.styleNo, factoryRef: style.factoryRef || '',
                    type: s.type, detail: `${s.baseSize} | ${s.quantity} pcs`, category: 'Sample',
                    status: s.status, labStatus: s.labStatus, currentStage: s.currentStage || 'Not Started', lastUpdated: s.lastUpdated,
                    originalData: { ...s, parentJob: job, parentStyleId: style.id, factoryRef: style.factoryRef },
                    ...pInfo, feedbackText: s.feedbackText, commentsReceivedDate: s.commentsReceivedDate, commentsSentBy: s.commentsSentBy
                });
            });
            style.bom?.forEach(item => {
                const pInfo = findParcelDetails(item.supplierRef || item.componentName);
                list.push({
                    id: `bom-${item.id}`, refId: item.supplierRef || '-', source: 'Job', parentRef: job.id, buyer: style.buyer, style: style.styleNo, factoryRef: style.factoryRef || '',
                    type: item.componentName, detail: item.itemDetail || '-', category: 'Material',
                    status: item.sourcingStatus, labStatus: item.labStatus, currentStage: item.labStatus === 'Testing' ? 'Testing' : (item.sourcingStatus === 'Submitted' ? 'Submitted' : 'Received'),
                    originalData: { ...item, parentJob: job, parentStyleId: style.id },
                    ...pInfo
                });
            });
        });
    });

    developmentSamples.forEach(s => {
        const pInfo = findParcelDetails(s.samNumber);
        list.push({
            id: `sam-${s.id}`, refId: s.samNumber, source: 'Development', parentRef: 'R&D', buyer: s.buyer, style: s.styleNo, factoryRef: s.styleNo,
            type: s.type, detail: `${s.baseSize} | ${s.quantity} pcs`, category: 'Sample',
            status: s.status, labStatus: s.labStatus, currentStage: s.currentStage || 'Not Started', lastUpdated: s.lastUpdated, originalData: s,
            ...pInfo, feedbackText: s.feedbackText, commentsReceivedDate: s.commentsReceivedDate, commentsSentBy: s.commentsSentBy
        });
    });

    return list;
  }, [jobs, developmentSamples, parcels]);

  const approvalTrackerData = useMemo(() => {
    let list: any[] = [];
    
    // 1. Process Job-linked items
    jobs.forEach(job => {
        job.styles.forEach(style => {
            if (job.plans.fabric === 'Approved') {
                style.bom?.filter(item => item.processGroup === 'Fabric').forEach(item => {
                    if (item.isApproved || item.isTestingRequired) {
                        const unified = unifiedData.find(u => u.id === `bom-${item.id}`);
                        list.push({ id: `bom-${item.id}`, jobId: job.id, factoryRef: style.factoryRef || '-', itemRef: item.supplierRef || '-', itemType: 'Fabric', itemDetail: item.componentName, approvalRequired: !!item.isApproved, labRequired: !!item.isTestingRequired, deadline: style.deliveryDate || '-', status: item.sourcingStatus || 'Pending', labStatus: item.labStatus || 'Pending', buyer: style.buyer, originalId: item.id, parentJobId: job.id, parentStyleId: style.id, sentOn: unified?.sentOn, deliveredOn: unified?.deliveredOn });
                    }
                });
            }
            if (job.plans.sampling === 'Approved') {
                style.samplingDetails?.forEach(s => {
                    if (s.isApproved || s.isTestingRequired) {
                        const unified = unifiedData.find(u => u.id === `sam-${s.id}`);
                        list.push({ id: `sam-${s.id}`, jobId: job.id, factoryRef: style.factoryRef || '-', itemRef: s.samNumber, itemType: 'Sampling', itemDetail: s.type, approvalRequired: !!s.isApproved, labRequired: !!s.isTestingRequired, deadline: s.deadline || '-', status: s.status, labStatus: s.labStatus || 'Pending', currentStage: s.currentStage || 'Not Started', buyer: style.buyer, originalId: s.id, parentJobId: job.id, parentStyleId: style.id, sentOn: unified?.sentOn, deliveredOn: unified?.deliveredOn });
                    }
                });
            }
        });
    });

    // 2. Process Development Samples (R&D)
    developmentSamples.forEach(s => {
        const unified = unifiedData.find(u => u.id === `sam-${s.id}`);
        list.push({
            id: `sam-${s.id}`,
            jobId: 'R&D',
            factoryRef: s.styleNo,
            itemRef: s.samNumber,
            itemType: 'R&D Sampling',
            itemDetail: s.type,
            approvalRequired: true, 
            labRequired: s.isTestingRequired,
            deadline: s.deadline || '-',
            status: s.status,
            labStatus: s.labStatus || 'Pending',
            currentStage: s.currentStage || 'Not Started',
            buyer: s.buyer,
            originalId: s.id,
            parentJobId: 'R&D',
            parentStyleId: s.id,
            sentOn: unified?.sentOn,
            deliveredOn: unified?.deliveredOn
        });
    });

    // Apply Status Filter
    if (approvalStatusFilter !== 'All') {
        list = list.filter(item => {
            const status = getLightStatus(item.approvalRequired ? 'app' : 'lab', item);
            if (approvalStatusFilter === 'Pending') return status.color === 'red';
            if (approvalStatusFilter === 'Send') return status.color === 'yellow';
            if (approvalStatusFilter === 'Received') return status.color === 'orange';
            if (approvalStatusFilter === 'Approved') return status.color === 'green';
            return true;
        });
    }

    return list.filter(item => 
        (item.jobId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (item.itemRef?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (item.buyer?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [jobs, searchTerm, unifiedData, developmentSamples, approvalStatusFilter]);

  const commentsTrackerData = useMemo(() => {
      // LOGIC: Show samples that have been sent AND parcel marked as 'Received'
      // OR items that already have feedback logged (persistent)
      return unifiedData.filter(u => u.category === 'Sample' && (u.deliveredOn || u.feedbackText))
          .filter(u => {
              if (commentStatusFilter === 'Pending') return !u.feedbackText;
              if (commentStatusFilter === 'Feedback received') return !!u.feedbackText;
              return true;
          })
          .filter(u => 
              (u.parentRef?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
              (u.refId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
              (u.buyer?.toLowerCase() || '').includes(searchTerm.toLowerCase())
          );
  }, [unifiedData, searchTerm, commentStatusFilter]);

  const workOrderDemandItems: WorkOrderRequest[] = useMemo(() => {
    const list: WorkOrderRequest[] = [];
    jobs.forEach(job => {
        if (job.plans.cutting === 'Approved' && job.cuttingPlanDetails) {
            job.cuttingPlanDetails.forEach(d => {
                if (!issuedWorkOrders.some(wo => wo.items.some(it => it.id === `wo-dem-cut-${d.id}`))) {
                    list.push({
                        id: `wo-dem-cut-${d.id}`, jobId: job.id, serviceName: `Bulk Cutting: ${d.materialName}`, stage: 'Cutting',
                        qty: job.totalQty, unit: 'pcs', status: 'Pending', dateRequested: new Date().toISOString().split('T')[0],
                        targetDate: job.exFactoryDate, specs: `Shrink: L${d.shrinkageLengthPct}% W${d.shrinkageWidthPct}% | Extra: ${d.extraCuttingPct}%`
                    });
                }
            });
        }
        if (job.workOrderRequests) {
            job.workOrderRequests.forEach(req => {
                if (!issuedWorkOrders.some(wo => wo.items.some(it => it.id === req.id))) {
                    list.push(req);
                }
            });
        }
    });
    return list.filter(item => 
        (item.jobId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (item.serviceName?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [jobs, searchTerm, issuedWorkOrders]);

  const ppMeetingsItems = useMemo(() => {
    const list: any[] = [];
    jobs.forEach(job => {
        job.styles.forEach(style => {
            list.push({
                jobId: job.id, buyer: style.buyer, poNumber: style.poNumber || '-', id: style.id, factoryRef: style.factoryRef || '-', 
                orderDate: style.poDate || '-', shipDate: style.deliveryDate || '-', plannedDate: style.plannedDate || style.deliveryDate || '-', 
                quantity: style.quantity, ppMeetingDate: style.ppMeetingDate || '-', status: style.ppMeetingStatus || 'Pending', original: style
            });
        });
    });
    return list.filter(item => 
        (item.jobId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
        (item.buyer?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [jobs, searchTerm]);

  // Handlers
  const handleIssueWorkOrder = () => {
    if (selectedWorkOrderDemandIds.size === 0 || !woVendor) return;
    const items = workOrderDemandItems.filter(i => selectedWorkOrderDemandIds.has(i.id));
    const woNumber = `WO-${items[0].stage.substring(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const newWO: IssuedWorkOrder = {
        id: `WO-${Date.now()}`, woNumber, vendorName: woVendor, stage: items[0].stage, dateIssued: new Date().toISOString().split('T')[0],
        targetDate: woTargetDate, status: 'Issued', items: items, totalQty: items.reduce((a,b) => a + b.qty, 0), notes: woNotes
    };
    onUpdateWorkOrders([newWO, ...issuedWorkOrders]);
    setIsWorkOrderModalOpen(false);
    setSelectedWorkOrderDemandIds(new Set());
    setSuccessToast(`Work Order ${woNumber} issued.`);
  };

  const handleOpenPPLog = (styleId: string) => {
    const item = ppMeetingsItems.find(i => i.id === styleId);
    if (!item) return;
    setPPEditingOrder(item.original);
    const plannedDate = item.original.plannedDate || item.original.deliveryDate || '';
    setPPForm(item.original.ppMeetingNotes || { inspectionDate: plannedDate || new Date().toISOString().split('T')[0], poBreakdown: '', sections: {} });
    setIsPPModalOpen(true);
  };

  const handleOpenCommentModal = (item: UnifiedTrackable) => {
      setCommentItem(item);
      setCommentForm({
          receivedDate: item.commentsReceivedDate || new Date().toISOString().split('T')[0],
          sentBy: item.commentsSentBy || '',
          feedback: item.feedbackText || '',
          status: (item.status as any) || 'Commented'
      });
      setIsCommentModalOpen(true);
  };

  const handleOpenHistoryModal = (item: UnifiedTrackable) => {
      setCommentItem(item);
      setIsHistoryModalOpen(true);
  };

  const handleSaveFeedback = () => {
      if (!commentItem) return;
      
      const meta = {
          commentsReceivedDate: commentForm.receivedDate,
          commentsSentBy: commentForm.sentBy,
          feedbackText: commentForm.feedback,
          status: commentForm.status,
          lastUpdated: new Date().toISOString()
      };

      if (commentItem.source === 'Job') {
          const { parentJob, parentStyleId } = commentItem.originalData;
          const updatedStyles = parentJob.styles.map((style: any) => {
              if (style.id !== parentStyleId) return style;
              const updatedSampling = style.samplingDetails?.map((s: any) => 
                  s.id === commentItem.id.split('-')[1] ? { ...s, ...meta } : s
              );
              return { ...style, samplingDetails: updatedSampling };
          });
          onUpdateJobs(jobs.map(j => j.id === parentJob.id ? { ...j, styles: updatedStyles } : j));
      } else {
          onUpdateDevSample({ ...commentItem.originalData, ...meta });
      }

      setIsCommentModalOpen(false);
      setSuccessToast(`Feedback recorded for ${commentItem.refId}`);
  };

  const handlePrintHistory = () => {
      if (selectedCommentIds.size === 0) return;
      
      const selectedItemsList = commentsTrackerData.filter(i => selectedCommentIds.has(i.id));
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const itemsHtml = selectedItemsList.map(item => `
          <div style="margin-bottom: 40px; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
              <h2 style="font-size: 18px; font-weight: 800; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 15px;">Lifecycle History: ${item.refId}</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                  <div>
                      <p style="font-size: 10px; color: #888; text-transform: uppercase; font-weight: 800; margin: 0;">Buyer / Account</p>
                      <p style="font-size: 14px; font-weight: 700; margin: 2px 0 0 0;">${item.buyer}</p>
                  </div>
                  <div>
                      <p style="font-size: 10px; color: #888; text-transform: uppercase; font-weight: 800; margin: 0;">Sample Type</p>
                      <p style="font-size: 14px; font-weight: 700; margin: 2px 0 0 0;">${item.type}</p>
                  </div>
              </div>
              
              <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                  <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px;">Logistics Details</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                      <div>
                          <p style="font-size: 9px; color: #999; font-weight: 700; margin: 0;">Sent On</p>
                          <p style="font-size: 11px; font-weight: 600; margin: 0;">${formatAppDate(item.sentOn)}</p>
                      </div>
                      <div>
                          <p style="font-size: 9px; color: #999; font-weight: 700; margin: 0;">Courier / Tracking</p>
                          <p style="font-size: 11px; font-weight: 600; margin: 0;">${item.courier || '-'} • ${item.trackingNo || '-'}</p>
                      </div>
                      <div>
                          <p style="font-size: 9px; color: #999; font-weight: 700; margin: 0;">Marked Received On</p>
                          <p style="font-size: 11px; font-weight: 600; margin: 0;">${formatAppDate(item.deliveredOn) || 'Pending'}</p>
                      </div>
                  </div>
              </div>

              <div style="border-top: 1px solid #eee; pt: 15px;">
                  <h3 style="font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px;">Buyer Feedback</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 10px;">
                      <div>
                          <p style="font-size: 9px; color: #999; font-weight: 700; margin: 0;">Feedback Date</p>
                          <p style="font-size: 11px; font-weight: 600; margin: 0;">${formatAppDate(item.commentsReceivedDate) || '-'}</p>
                      </div>
                      <div>
                          <p style="font-size: 9px; color: #999; font-weight: 700; margin: 0;">Feedback By</p>
                          <p style="font-size: 11px; font-weight: 600; margin: 0;">${item.commentsSentBy || '-'}</p>
                      </div>
                  </div>
                  <div style="background: #fff8e1; border: 1px solid #ffe082; padding: 12px; border-radius: 4px;">
                      <p style="font-size: 9px; color: #b58500; font-weight: 800; text-transform: uppercase; margin: 0 0 5px 0;">Feedback Narrative</p>
                      <p style="font-size: 12px; line-height: 1.5; margin: 0;">${item.feedbackText || 'No comments recorded yet.'}</p>
                  </div>
              </div>
          </div>
      `).join('');

      printWindow.document.write(`
          <html>
              <head><title>Sample History Report</title></head>
              <body style="font-family: sans-serif; padding: 40px; color: #111;">
                  <h1 style="text-align: center; text-transform: uppercase; letter-spacing: 2px;">Nizamia Technical Feedback Report</h1>
                  <p style="text-align: center; color: #999; font-size: 12px; margin-bottom: 40px;">Consolidated Audit Trail for Selected Samples</p>
                  ${itemsHtml}
                  <script>window.onload = () => { window.print(); window.close(); }</script>
              </body>
          </html>
      `);
      printWindow.document.close();
  };

  const handleCreateReminder = () => {
    if (selectedCommentIds.size === 0) return;
    
    const selectedItemsList = commentsTrackerData.filter(i => selectedCommentIds.has(i.id));
    
    // Validate same buyer
    const firstBuyer = selectedItemsList[0].buyer;
    const sameBuyer = selectedItemsList.every(i => i.buyer === firstBuyer);
    
    if (!sameBuyer) {
        alert("Error: Only items sent to the same buyer can be combined for a reminder report.");
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const today = new Date();
    const companyName = companyDetails?.name || "Nizamia";

    const itemsHtml = selectedItemsList.map(item => {
        const receivedDate = item.deliveredOn ? new Date(item.deliveredOn) : null;
        const daysAgo = receivedDate ? Math.ceil((today.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        return `
            <div style="border-bottom: 1px solid #eee; padding: 15px 0; display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 20px; align-items: start;">
                <div>
                    <div style="font-weight: 800; font-size: 11px; color: #1e3a8a; margin-bottom: 2px;">${item.refId}</div>
                    <div style="font-size: 9px; color: #6b7280; font-weight: 700; text-transform: uppercase;">${item.type}</div>
                </div>
                <div style="font-size: 10px; color: #374151; line-height: 1.4;">
                    Delivered on <strong>${formatAppDate(item.deliveredOn)}</strong> via <strong>${item.courier || 'Courier'}</strong> 
                    with tracking number <strong style="font-family: monospace;">${item.trackingNo || '---'}</strong>.
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; font-weight: 900; color: #ef4444;">${daysAgo} DAYS AGO</div>
                    <div style="font-size: 8px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Since Receipt</div>
                </div>
            </div>
        `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Feedback Reminder - ${firstBuyer}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 50px; color: #111; }
            .container { max-width: 800px; margin: auto; }
            .header { border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .content { font-size: 13px; line-height: 1.6; color: #333; }
            .footer { margin-top: 60px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; font-size: 10px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
                <div>
                    <h1 class="text-2xl font-black uppercase tracking-tight">${companyName}</h1>
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Technical Support Department</p>
                </div>
                <div class="text-right">
                    <div class="text-[9px] font-black text-gray-400 uppercase">Reminder Notice</div>
                    <div class="text-sm font-bold">${today.toLocaleDateString('en-GB', {day:'2-digit', month:'long', year:'numeric'})}</div>
                </div>
            </div>

            <div class="content">
                <p style="margin-bottom: 20px;">Attn: <strong>Buying Team / Technical Manager</strong><br/>
                Company: <strong>${firstBuyer}</strong></p>

                <p style="margin-bottom: 15px; font-size: 16px; font-weight: 700; color: #111;">Subject: Feedback Request for Samples Delivered to your office</p>
                
                <p>Dear Partners,</p>
                <p style="margin-top: 10px;">We would like to gently remind you that the following items were delivered at your office. We are eager to proceed with the next stages of development/production and would appreciate your quick comments or feedback on these samples at your earliest convenience.</p>

                <div style="margin: 30px 0; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000;">
                    ${itemsHtml}
                </div>

                <p>Timely feedback is critical for maintaining our production timelines and ensuring on-time delivery of your orders. Please let us know if you require any further information or alternative versions of these items.</p>
                
                <p style="margin-top: 30px;">Best Regards,</p>
                <p style="margin-top: 5px;"><strong>Merchandising Department</strong><br/>${companyName}</p>
            </div>

            <div class="footer">
                <p class="uppercase tracking-widest font-bold">This is a system-generated follow-up notification regarding technical sample approvals.</p>
            </div>
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 800); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

  const handlePrintPPMFormat = () => {
      // Placeholder for print logic
      alert("Generating PPM Print Format...");
  };

  const handleIssueTesting = () => {
    if (selectedApprovalIds.size === 0) return;
    alert(`Issuing testing requests for ${selectedApprovalIds.size} items.`);
    setSelectedApprovalIds(new Set());
  };

  const handleMarkReceived = () => {
    if (selectedParcelIds.size === 0) return;
    
    const nextParcels = parcels.map(p => {
        if (selectedParcelIds.has(p.id)) {
            return { ...p, status: 'Received' as const, receivedDate: new Date().toISOString().split('T')[0] };
        }
        return p;
    });
    onUpdateParcels(nextParcels);
    setSelectedParcelIds(new Set());
    setSuccessToast("Parcels marked as received.");
  };

  // --- Parcel Creation Logic ---

  const handleOpenParcelModal = () => {
    // Selection is optional now
    const selectedItemsList = approvalTrackerData.filter(i => selectedApprovalIds.has(i.id));
    const firstBuyer = selectedItemsList[0]?.buyer;
    const allSameBuyer = selectedItemsList.length > 0 && selectedItemsList.every(i => i.buyer === firstBuyer);
    
    const buyerObj = availableBuyers.find(b => b.name === firstBuyer);
    const defaultAddress = buyerObj?.addresses.find(a => a.isDefault)?.fullAddress || buyerObj?.addresses[0]?.fullAddress || '';
    const defaultContact = buyerObj?.contacts.find(c => c.isDefault)?.name || buyerObj?.contacts[0]?.name || '';
    const defaultPhone = buyerObj?.contacts.find(c => c.isDefault)?.phone || buyerObj?.contacts[0]?.phone || '';

    setParcelDetails({
        courier: 'DHL',
        tracking: '',
        buyerId: allSameBuyer ? (buyerObj?.id || '') : '',
        recipientName: allSameBuyer ? defaultContact : '',
        address: allSameBuyer ? defaultAddress : '',
        phone: allSameBuyer ? defaultPhone : ''
    });

    // Populate table with selected items
    const initialLineItems: ParcelOtherItem[] = selectedItemsList.map(item => ({
        id: item.id,
        name: `${item.itemType}: ${item.itemRef} (${item.itemDetail})`,
        type: 'Sample',
        purpose: 'Approval',
        qty: 1,
        unitValue: 10
    }));

    setTempOtherItems(initialLineItems);
    setSkipShipmentInfo(false);
    setIsParcelModalOpen(true);
  };

  const handleAddOtherItem = () => {
      if (!otherItemInput.name) return;
      setTempOtherItems([...tempOtherItems, { ...otherItemInput, id: `oi-${Date.now()}` }]);
      setOtherItemInput({ name: '', type: 'Swatch', purpose: 'Reference', qty: 1, unitValue: 5 });
  };

  const handleConfirmParcel = () => {
    if (!parcelDetails.buyerId || !parcelDetails.address) {
        alert("Consignee and address are required.");
        return;
    }

    const buyerObj = availableBuyers.find(b => b.id === parcelDetails.buyerId);
    
    // Filter out which items were originally sampling/bom items to update their status
    const originalSamplingIds = new Set(approvalTrackerData.map(i => i.id));
    const selectedOriginalIds = tempOtherItems
        .filter(i => originalSamplingIds.has(i.id))
        .map(i => i.id);

    // Create SampleRow placeholders from unified data for the parcel object
    const parcelSamples: SampleRow[] = tempOtherItems
        .filter(i => originalSamplingIds.has(i.id))
        .map(item => {
            const trackerItem = approvalTrackerData.find(at => at.id === item.id);
            return {
                id: trackerItem?.originalId || item.id,
                samNumber: trackerItem?.itemRef || item.name,
                type: trackerItem?.itemType || 'Sample',
                fabric: '', shade: '', wash: '', baseSize: '', threadColor: '', zipperColor: '', lining: '', quantity: item.qty.toString(), deadline: '', status: 'Pending', isTestingRequired: false
            };
        });

    const otherItems = tempOtherItems.filter(i => !originalSamplingIds.has(i.id));

    const newParcel: Parcel = {
        id: `PRC-${Date.now()}`,
        parcelNo: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
        buyer: buyerObj?.name || 'Unknown',
        recipientName: parcelDetails.recipientName,
        recipientPhone: parcelDetails.phone,
        address: parcelDetails.address,
        courier: skipShipmentInfo ? 'TBD' : parcelDetails.courier,
        trackingNo: skipShipmentInfo ? 'PENDING' : parcelDetails.tracking,
        sentDate: new Date().toISOString().split('T')[0],
        status: 'Sent',
        samples: parcelSamples,
        otherItems: otherItems,
        isTrackingPending: skipShipmentInfo || !parcelDetails.tracking
    };

    onUpdateParcels([newParcel, ...parcels]);
    
    // Update statuses of the items being sent
    const updatedJobs = jobs.map(job => {
        let jobUpdated = false;
        const nextStyles = job.styles.map(style => {
            let styleUpdated = false;
            const nextSampling = style.samplingDetails?.map(s => {
                if (selectedOriginalIds.includes(`sam-${s.id}`)) {
                    styleUpdated = true;
                    jobUpdated = true;
                    return { ...s, status: 'Submitted' as const, lastUpdated: new Date().toISOString() };
                }
                return s;
            });
            const nextBOM = style.bom?.map(item => {
                if (selectedOriginalIds.includes(`bom-${item.id}`)) {
                    styleUpdated = true;
                    jobUpdated = true;
                    return { ...item, sourcingStatus: 'Submitted' as const };
                }
                return item;
            });
            return styleUpdated ? { ...style, samplingDetails: nextSampling, bom: nextBOM } : style;
        });
        return jobUpdated ? { ...job, styles: nextStyles } : job;
    });
    onUpdateJobs(updatedJobs);

    // Update Dev Samples
    selectedOriginalIds.forEach(id => {
        if (id.startsWith('sam-')) {
            const trackerItem = approvalTrackerData.find(at => at.id === id);
            if (trackerItem?.jobId === 'R&D') {
                const original = developmentSamples.find(ds => ds.id === trackerItem.originalId);
                if (original) {
                    onUpdateDevSample({ ...original, status: 'Submitted', lastUpdated: new Date().toISOString() });
                }
            }
        }
    });

    setIsParcelModalOpen(false);
    setSelectedApprovalIds(new Set());
    setSuccessToast(`Parcel ${newParcel.parcelNo} created successfully.`);
  };

  const handleUpdateTracking = () => {
    if (selectedParcelIds.size !== 1) return;
    const parcelId = Array.from(selectedParcelIds)[0];
    const updatedParcels = parcels.map(p => {
        if (p.id === parcelId) {
            return {
                ...p,
                courier: trackingUpdateForm.courier,
                trackingNo: trackingUpdateForm.tracking,
                isTrackingPending: false
            };
        }
        return p;
    });
    onUpdateParcels(updatedParcels);
    setIsTrackingUpdateModalOpen(false);
    setSelectedParcelIds(new Set());
    setSuccessToast("Tracking information updated.");
  };

  const handlePrintShipmentAdvice = () => {
    if (selectedParcelIds.size !== 1) return;
    const parcelId = Array.from(selectedParcelIds)[0];
    const parcel = parcels.find(p => p.id === parcelId);
    if (!parcel) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const companyName = companyDetails?.name || "Nizamia";
    const companyLogo = companyDetails?.logoUrl || LOGO_URL;

    const itemsHtml = [
        ...parcel.samples.map(s => `<tr><td>${s.samNumber}</td><td>Sample: ${s.type}</td><td style="text-align:right; font-weight:800;">${s.quantity}</td></tr>`),
        ...parcel.otherItems.map(o => `<tr><td>-</td><td>${o.name} (${o.type})</td><td style="text-align:right; font-weight:800;">${o.qty}</td></tr>`)
    ].join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Shipment Advice - ${parcel.parcelNo}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 2px solid #000; }
            th { background: #f3f4f6; text-align: left; padding: 10px; border: 1.5px solid #000; font-size: 10px; text-transform: uppercase; font-weight: 900; }
            td { padding: 10px; border: 1px solid #000; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="flex items-center gap-4">
              <img src="${companyLogo}" class="h-12" />
              <div>
                <h1 class="text-2xl font-black uppercase">${companyName}</h1>
                <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">Shipment Advice Notice</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs font-black text-gray-400 uppercase">Advice Ref</div>
              <div class="text-xl font-black font-mono">${parcel.parcelNo}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-12 mb-8">
            <div>
              <h3 class="text-[10px] font-black uppercase text-gray-400 mb-2">Consignee (Recipient)</h3>
              <p class="font-black text-xl uppercase">${parcel.buyer}</p>
              <p class="text-sm font-bold text-blue-700 mt-1">ATTN: ${parcel.recipientName}</p>
              <p class="text-xs text-gray-600 mt-3 leading-relaxed font-medium">${parcel.address}</p>
              ${parcel.recipientPhone ? `<p class="text-xs text-gray-400 mt-2">TEL: ${parcel.recipientPhone}</p>` : ''}
            </div>
            <div class="bg-gray-50 p-8 rounded-2xl border border-gray-200 shadow-sm">
              <h3 class="text-[10px] font-black uppercase text-gray-400 mb-6">Logistics Snapshot</h3>
              <div class="space-y-5">
                <div>
                  <span class="text-[9px] font-black text-gray-400 uppercase block tracking-tighter">Courier Company</span>
                  <span class="text-sm font-black text-blue-700 uppercase">${parcel.courier}</span>
                </div>
                <div>
                  <span class="text-[9px] font-black text-gray-400 uppercase block tracking-tighter">Master AWB / Tracking</span>
                  <span class="text-2xl font-mono font-black text-gray-900">${parcel.trackingNo || 'PENDING DISPATCH'}</span>
                </div>
                <div>
                  <span class="text-[9px] font-black text-gray-400 uppercase block tracking-tighter">Sent On Date</span>
                  <span class="text-sm font-black text-gray-700 font-mono">${formatAppDate(parcel.sentDate)}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-12">
            <h3 class="text-[10px] font-black uppercase text-gray-400 mb-3 flex items-center gap-2">
                <div class="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Parcel Manifest (Itemized List)
            </h3>
            <table>
                <thead>
                <tr>
                    <th width="20%">Reference</th>
                    <th width="60%">Item Description</th>
                    <th width="20%" style="text-align:right;">Quantity</th>
                </tr>
                </thead>
                <tbody>
                ${itemsHtml}
                </tbody>
            </table>
          </div>

          <div class="mt-24 pt-8 border-t-2 border-gray-100 flex justify-between items-end">
            <div>
                <p class="text-[10px] font-black uppercase text-gray-400 mb-10 tracking-widest">Authorized Dispatch Signature</p>
                <div class="w-48 h-px bg-black"></div>
            </div>
            <div class="text-right">
                <p class="text-[8px] font-black text-[#111] uppercase tracking-[0.4em] opacity-80">${companyName} Global Merchandising Ecosystem</p>
                <p class="text-[7px] text-gray-400 mt-1 uppercase tracking-widest font-bold">This is an automated shipment notification for client reference.</p>
            </div>
          </div>

          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 800); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintParcelInvoice = () => {
    if (selectedParcelIds.size !== 1) return;
    const parcelId = Array.from(selectedParcelIds)[0];
    const parcel = parcels.find(p => p.id === parcelId);
    if (!parcel) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const companyName = companyDetails?.name || "Nizamia";
    const companyLogo = companyDetails?.logoUrl || LOGO_URL;
    const companyAddress = companyDetails?.address || "Plot# RCC14, Shed Nr 02, Estate Avenue Road, SITE Area, Karachi 75700, Pakistan";

    const itemsHtml = [
        ...parcel.samples.map(s => `<tr><td style="text-align:center;">1</td><td>${s.samNumber}</td><td>Sample: ${s.type}</td><td style="text-align:center;">${s.quantity}</td><td style="text-align:right;">$10.00</td><td style="text-align:right;">$${(10 * parseFloat(s.quantity)).toFixed(2)}</td></tr>`),
        ...parcel.otherItems.map(o => `<tr><td style="text-align:center;">1</td><td>-</td><td>${o.name} (${o.type})</td><td style="text-align:center;">${o.qty}</td><td style="text-align:right;">$${o.unitValue.toFixed(2)}</td><td style="text-align:right;">$${(o.qty * o.unitValue).toFixed(2)}</td></tr>`)
    ].join('');

    const totalVal = parcel.samples.reduce((a, s) => a + (10 * parseFloat(s.quantity)), 0) + parcel.otherItems.reduce((a, o) => a + (o.qty * o.unitValue), 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Non-Commercial Invoice - ${parcel.parcelNo}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 2px solid #000; }
            th { background: #f3f4f6; text-align: left; padding: 10px; border: 1.5px solid #000; font-size: 10px; text-transform: uppercase; font-weight: 800; }
            td { padding: 8px; border: 1px solid #000; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="flex items-center gap-4">
              <img src="${companyLogo}" class="h-10" />
              <div>
                <h1 class="text-xl font-black uppercase">${companyName}</h1>
                <p class="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Non-Commercial Customs Invoice</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-[9px] font-black text-gray-400 uppercase">Invoice Ref</div>
              <div class="text-lg font-black font-mono">${parcel.parcelNo}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-10 mb-8">
            <div>
              <h3 class="text-[9px] font-black uppercase text-gray-400 mb-2">Shipper / Exporter</h3>
              <p class="font-bold text-sm uppercase">${companyName}</p>
              <p class="text-[10px] text-gray-600 mt-1 leading-relaxed">${companyAddress}</p>
            </div>
            <div>
              <h3 class="text-[9px] font-black uppercase text-gray-400 mb-2">Consignee / Importer</h3>
              <p class="font-bold text-sm uppercase">${parcel.buyer}</p>
              <p class="text-[10px] text-gray-700 mt-1">ATTN: ${parcel.recipientName}</p>
              <p class="text-[10px] text-gray-600 mt-2 leading-relaxed">${parcel.address}</p>
            </div>
          </div>

          <div class="bg-gray-50 p-4 border border-gray-200 rounded-lg mb-6">
            <div class="grid grid-cols-3 gap-4 text-[10px]">
               <div><span class="font-bold text-gray-400 uppercase">Courier:</span> <span class="font-bold">${parcel.courier}</span></div>
               <div><span class="font-bold text-gray-400 uppercase">Tracking:</span> <span class="font-bold font-mono">${parcel.trackingNo}</span></div>
               <div><span class="font-bold text-gray-400 uppercase">Origin:</span> <span class="font-bold">Pakistan</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th width="5%" style="text-align:center;">HS</th>
                <th width="15%">REF</th>
                <th width="45%">DESCRIPTION OF GOODS</th>
                <th width="10%" style="text-align:center;">QTY</th>
                <th width="12%" style="text-align:right;">UNIT VALUE</th>
                <th width="13%" style="text-align:right;">TOTAL VALUE</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr style="font-weight: 800; background: #fafafa;">
                <td colspan="5" style="text-align:right;">INVOICE TOTAL VALUE (USD)</td>
                <td style="text-align:right;">$${totalVal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="mt-8 p-4 border border-dashed border-gray-300 rounded-lg">
            <p class="text-[10px] text-gray-600 font-medium leading-relaxed italic">
              "THE GOODS ARE OF NO COMMERCIAL VALUE AND ARE BEING SENT AS SAMPLES FOR TESTING AND APPROVAL PURPOSES ONLY. NO FOREIGN EXCHANGE IS INVOLVED. VALUE SHOWN FOR CUSTOMS DECLARATION ONLY."
            </p>
          </div>

          <div class="mt-20 flex justify-between items-end">
            <div>
                <p class="text-[9px] font-black uppercase text-gray-400 mb-10 tracking-widest">Authorized Signature & Stamp</p>
                <div class="w-48 h-px bg-black"></div>
            </div>
            <div class="text-right">
                <p class="text-[8px] font-black text-[#111] uppercase tracking-[0.4em] opacity-80">${companyName}</p>
            </div>
          </div>

          <script>window.onload = () => { setTimeout(() => { window.print(); }, 800); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const updateTempItem = (id: string, field: keyof ParcelOtherItem, value: any) => {
      setTempOtherItems(prev => prev.map(item => 
          item.id === id ? { ...item, [field]: value } : item
      ));
  };

  const toggleParcelId = (id: string) => {
    const next = new Set(selectedParcelIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedParcelIds(next);
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-300 pb-10">
      
      {/* Main Tab Navigation */}
      <div className="flex items-center gap-8 border-b border-gray-100 px-2 shrink-0">
        {(['Parcels and Approvals', 'PP Meetings', 'Work Orders'] as const).map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveMainTab(tab)} 
            className={`pb-3 text-sm font-bold transition-all flex items-center gap-2.5 
              ${activeMainTab === tab ? 'border-b-2 border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            {tab === 'Parcels and Approvals' && <Package size={18} />}
            {tab === 'PP Meetings' && <Users size={18} />}
            {tab === 'Work Orders' && <FileText size={18} />}
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
         {activeMainTab === 'Parcels and Approvals' && (
             <div className="flex-1 flex flex-col min-h-0 space-y-3">
                 {/* 1. Sub-Tab Header Row */}
                 <div className="px-2 shrink-0 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        {(['Approval Items', 'Parcels', 'Comments'] as const).map(sub => (
                            <button 
                                key={sub} 
                                onClick={() => setActiveSubTab(sub)} 
                                className={`pb-3 text-xs font-black uppercase tracking-widest transition-all 
                                    ${activeSubTab === sub ? 'text-black border-b-2 border-black' : 'text-gray-400 border-b-2 border-transparent hover:text-gray-600'}`}
                            >
                                {sub}
                            </button>
                        ))}
                    </div>
                 </div>

                 {/* 2. Consolidated Toolbar Row */}
                 <div className="px-2 flex items-center gap-3 shrink-0">
                    
                    {/* LEFT-ALIGNED: Pill Status Filters Inspired by Sample Room */}
                    {activeSubTab === 'Approval Items' && (
                        <div className="flex gap-2">
                            {(['All', 'Pending', 'Send', 'Received', 'Approved'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setApprovalStatusFilter(f)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all border shadow-sm whitespace-nowrap
                                        ${approvalStatusFilter === f 
                                            ? (f === 'All' ? 'bg-[#37352F] text-white border-[#37352F]' : 'bg-blue-600 text-white border-blue-600') 
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeSubTab === 'Comments' && (
                        <div className="flex gap-2">
                            {(['All', 'Pending', 'Feedback received'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setCommentStatusFilter(f)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all border shadow-sm whitespace-nowrap
                                        ${commentStatusFilter === f 
                                            ? (f === 'All' ? 'bg-[#37352F] text-white border-[#37352F]' : 'bg-blue-600 text-white border-blue-600') 
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* LEFT-ALIGNED: Parcel Batch Actions (When in Parcels tab) */}
                    {activeSubTab === 'Parcels' && (
                        <div className={`flex items-center bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden h-9 transition-all ${selectedParcelIds.size === 0 ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                            <button 
                                onClick={() => {
                                    const p = parcels.find(p => selectedParcelIds.has(p.id));
                                    if (p) setTrackingUpdateForm({ courier: p.courier !== 'TBD' ? p.courier : 'DHL', tracking: p.trackingNo !== 'PENDING' ? p.trackingNo : '' });
                                    setIsTrackingUpdateModalOpen(true);
                                }}
                                disabled={selectedParcelIds.size !== 1}
                                className="px-3 h-full text-[9px] font-black text-gray-500 uppercase hover:bg-gray-50 hover:text-blue-600 border-r border-gray-100 disabled:opacity-40 transition-all flex items-center gap-2"
                            >
                                <Truck size={14} /> Add Tracking
                            </button>
                            <button 
                                onClick={handlePrintParcelInvoice}
                                disabled={selectedParcelIds.size !== 1}
                                className="px-3 h-full text-[9px] font-black text-gray-500 uppercase hover:bg-gray-50 hover:text-blue-600 border-r border-gray-100 disabled:opacity-40 transition-all flex items-center gap-2"
                            >
                                <Printer size={14} /> Parcel Invoice
                            </button>
                            <button 
                                onClick={handlePrintShipmentAdvice}
                                disabled={selectedParcelIds.size !== 1}
                                className="px-3 h-full text-[9px] font-black text-gray-500 uppercase hover:bg-gray-50 hover:text-blue-600 border-r border-gray-100 disabled:opacity-40 transition-all flex items-center gap-2"
                            >
                                <Send size={14} /> Inform Buyer
                            </button>
                            <button 
                                onClick={handleMarkReceived}
                                disabled={selectedParcelIds.size === 0}
                                className="px-4 h-full text-[9px] font-black text-white bg-green-600 uppercase hover:bg-green-700 disabled:bg-green-200 transition-all flex items-center gap-2"
                            >
                                <CheckCircle2 size={14} /> Mark Received
                            </button>
                        </div>
                    )}

                    {/* Spacer to push group to far right */}
                    <div className="flex-1"></div>

                    {/* RIGHT-ALIGNED GROUP */}
                    <div className="flex items-center gap-2">
                        
                        {/* APPROVAL ITEMS: [Send for Testing] [Create Parcel] */}
                        {activeSubTab === 'Approval Items' && (
                            <>
                                <button 
                                    onClick={handleIssueTesting}
                                    disabled={selectedApprovalIds.size === 0}
                                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all h-9"
                                >
                                    <FlaskConical size={14} className="text-purple-600" /> Send for Testing
                                </button>
                                <button 
                                    onClick={handleOpenParcelModal}
                                    className="flex items-center gap-2 px-5 py-2 bg-[#1a1a1a] text-white rounded-lg text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all h-9 whitespace-nowrap"
                                >
                                    <Plus size={14} /> Create Parcel
                                </button>
                            </>
                        )}

                        {/* PARCELS: [Create Parcel] */}
                        {activeSubTab === 'Parcels' && (
                            <button 
                                onClick={handleOpenParcelModal}
                                className="flex items-center gap-2 px-5 py-2 bg-[#1a1a1a] text-white rounded-lg text-[10px] font-black uppercase shadow-lg hover:bg-black transition-all h-9 whitespace-nowrap"
                            >
                                <Plus size={14} /> Create Parcel
                            </button>
                        )}

                        {/* COMMENTS: [Record Feedback] [Download History] [Create Reminder] */}
                        {activeSubTab === 'Comments' && (
                            <>
                                <button 
                                    disabled={selectedCommentIds.size !== 1} 
                                    onClick={() => handleOpenCommentModal(commentsTrackerData.find(i => selectedCommentIds.has(i.id)) as any)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#888888] text-white rounded-lg text-[10px] font-black uppercase shadow-sm hover:bg-[#666666] disabled:opacity-40 transition-all h-9"
                                >
                                    <MessageSquare size={14} /> Record Feedback
                                </button>
                                <button 
                                    disabled={selectedCommentIds.size === 0}
                                    onClick={handlePrintHistory}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[10px] font-black uppercase shadow-sm hover:bg-gray-50 disabled:opacity-40 transition-all h-9"
                                >
                                    <History size={14} /> Download History
                                </button>
                                <button 
                                    disabled={selectedCommentIds.size === 0}
                                    onClick={handleCreateReminder}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-indigo-600 rounded-lg text-[10px] font-black uppercase shadow-sm hover:bg-indigo-50 disabled:opacity-40 transition-all h-9"
                                >
                                    <Bell size={14} /> Create Reminder
                                </button>
                            </>
                        )}

                        {/* COMMON: [Search Bar] [Filter] */}
                        <div className="relative w-64 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm h-9 ml-1">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full h-full pl-8 pr-3 py-1 text-xs bg-transparent border-none outline-none font-medium placeholder:text-gray-300" 
                            />
                        </div>
                        <button className="h-9 w-9 flex items-center justify-center bg-white border border-gray-200 text-gray-400 rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
                            <Filter size={16} />
                        </button>
                    </div>
                 </div>

                 {/* 3. Table Area */}
                 <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col mx-2">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {activeSubTab === 'Approval Items' && (
                            <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
                                <thead className="bg-[#fbfbf9] border-b border-gray-200 sticky top-0 z-10 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-4 py-4 w-12 text-center bg-[#fbfbf9]">
                                            <input 
                                                type="checkbox" 
                                                onChange={(e) => setSelectedApprovalIds(e.target.checked ? new Set(approvalTrackerData.map(i => i.id)) : new Set())} 
                                                className="rounded border-gray-300 text-black focus:ring-black" 
                                            />
                                        </th>
                                        <th className="px-4 py-4">Job ID</th>
                                        <th className="px-4 py-4">Ref #</th>
                                        <th className="px-4 py-4">Details</th>
                                        <th className="px-4 py-4 text-center">App Status</th>
                                        <th className="px-4 py-4 text-center">Lab Status</th>
                                        <th className="px-4 py-4">Deadline</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {approvalTrackerData.map((item: any) => (
                                        <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${selectedApprovalIds.has(item.id) ? 'bg-blue-50/40' : ''}`}>
                                            <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedApprovalIds.has(item.id)} 
                                                    onChange={() => { const next = new Set(selectedApprovalIds); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); setSelectedApprovalIds(next); }} 
                                                    className="rounded border-gray-300 text-black" 
                                                />
                                            </td>
                                            <td className="px-4 py-4 font-mono font-bold text-xs uppercase text-gray-500">{item.jobId}</td>
                                            <td className="px-4 py-4 font-mono text-blue-700 font-bold">{item.itemRef}</td>
                                            <td className="px-4 py-4 truncate text-xs font-medium text-gray-700">{item.itemDetail}</td>
                                            <td className="px-4 py-4 text-center"><TrafficLight status={getLightStatus('app', item)} /></td>
                                            <td className="px-4 py-4 text-center"><TrafficLight status={getLightStatus('lab', item)} /></td>
                                            <td className="px-4 py-4 font-mono text-xs text-gray-400">{formatAppDate(item.deadline)}</td>
                                        </tr>
                                    ))}
                                    {approvalTrackerData.length === 0 && (
                                        <tr><td colSpan={7} className="p-32 text-center text-gray-300 italic font-medium">No items found matching the selected filters.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                        {activeSubTab === 'Parcels' && (
                             <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
                                <thead className="bg-[#fbfbf9] border-b border-gray-200 sticky top-0 z-10 text-[10px] uppercase font-black text-gray-400">
                                    <tr>
                                        <th className="px-6 py-4 w-12 text-center bg-[#fbfbf9]">
                                            <input 
                                                type="checkbox" 
                                                onChange={(e) => setSelectedParcelIds(e.target.checked ? new Set(parcels.map(p => p.id)) : new Set())}
                                                checked={parcels.length > 0 && selectedParcelIds.size === parcels.length}
                                                className="rounded border-gray-300 text-black" 
                                            />
                                        </th>
                                        <th className="px-6 py-4">Parcel #</th>
                                        <th className="px-6 py-4">Consignee</th>
                                        <th className="px-6 py-4">Courier</th>
                                        <th className="px-6 py-4">Sent Date</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {parcels.map(p => (
                                        <tr key={p.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedParcelIds.has(p.id) ? 'bg-blue-50/40' : ''}`} onClick={() => toggleParcelId(p.id)}>
                                            <td className="px-6 py-4 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedParcelIds.has(p.id)} 
                                                    readOnly
                                                    className="rounded border-gray-300 text-black pointer-events-none" 
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-xs text-blue-700">{p.parcelNo}</td>
                                            <td className="px-6 py-4 font-bold text-gray-900 uppercase text-xs">{p.buyer}</td>
                                            <td className="px-6 py-4">
                                                {p.courier === 'TBD' ? (
                                                    <span className="text-orange-500 font-bold text-[10px] uppercase tracking-tighter">Tracking Pending</span>
                                                ) : (
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-800">{p.courier}</span>
                                                        <span className="text-[10px] font-mono text-gray-400">{p.trackingNo}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-400">{formatAppDate(p.sentDate)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${p.status === 'Received' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {parcels.length === 0 && <tr><td colSpan={6} className="p-20 text-center text-gray-300 italic">No parcels recorded yet.</td></tr>}
                                </tbody>
                             </table>
                        )}
                        {activeSubTab === 'Comments' && (
                             <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
                                <thead className="bg-[#fbfbf9] border-b border-gray-200 sticky top-0 z-10 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 w-14 text-center bg-[#fbfbf9]">
                                            <input 
                                                type="checkbox" 
                                                onChange={(e) => setSelectedCommentIds(e.target.checked ? new Set(commentsTrackerData.map(i => i.id)) : new Set())} 
                                                className="rounded border-gray-300 text-black focus:ring-black" 
                                            />
                                        </th>
                                        <th className="px-6 py-4">JOB ID</th>
                                        <th className="px-6 py-4">SAM #</th>
                                        <th className="px-6 py-4">TYPE</th>
                                        <th className="px-6 py-4">SENT DATE</th>
                                        <th className="px-6 py-4">RECEIVED DATE</th>
                                        <th className="px-6 py-4">STATUS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {commentsTrackerData.map((item: any) => {
                                        const receivedDate = item.deliveredOn ? new Date(item.deliveredOn) : null;
                                        const daysAgo = receivedDate ? Math.ceil((new Date().getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

                                        return (
                                        <tr 
                                            key={item.id} 
                                            className={`hover:bg-gray-50 transition-colors cursor-pointer group ${selectedCommentIds.has(item.id) ? 'bg-blue-50/40' : ''}`}
                                            onClick={() => handleOpenHistoryModal(item)}
                                        >
                                            <td className="px-6 py-5 text-center" onClick={(e) => { e.stopPropagation(); const next = new Set(selectedCommentIds); if(next.has(item.id)) next.delete(item.id); else next.add(item.id); setSelectedCommentIds(next); }}>
                                                <input type="checkbox" checked={selectedCommentIds.has(item.id)} readOnly className="rounded border-gray-300 text-black pointer-events-none" />
                                            </td>
                                            <td className="px-6 py-5 font-mono font-bold text-xs uppercase text-gray-400">{item.parentRef}</td>
                                            <td className="px-6 py-5 font-mono text-blue-700 font-bold tracking-tight">{item.refId}</td>
                                            <td className="px-6 py-5 font-bold text-xs uppercase text-gray-800">{item.type}</td>
                                            <td className="px-6 py-5 font-mono text-[10px] text-gray-500 uppercase">{formatAppDate(item.sentOn)}</td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col leading-tight">
                                                    <span className="font-mono text-[10px] text-blue-600 uppercase font-bold">{formatAppDate(item.deliveredOn) || '-'}</span>
                                                    {daysAgo !== null && !item.feedbackText && (
                                                        <span className="text-[10px] text-orange-500 font-black mt-0.5 uppercase tracking-tighter">
                                                            {daysAgo} Days Ago
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-tighter 
                                                    ${item.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-100' : 
                                                      item.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' : 
                                                      item.status === 'Commented' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                      'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )})}
                                    {commentsTrackerData.length === 0 && <tr><td colSpan={7} className="p-32 text-center text-gray-300 italic font-medium">No samples found matching the selected filters.</td></tr>}
                                </tbody>
                             </table>
                        )}
                    </div>
                 </div>
             </div>
         )}

         {activeMainTab === 'PP Meetings' && (
             <div className="flex-1 flex flex-col min-h-0 space-y-4 animate-in fade-in duration-300">
                {/* Actions & Filters Bar */}
                <div className="flex items-center justify-between px-4 shrink-0 border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-3">
                        <button 
                            disabled={selectedPPIds.size !== 1} 
                            onClick={handlePrintPPMFormat} 
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-black uppercase shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all"
                        >
                            <FileDown size={14} /> Download PPM Format
                        </button>
                        <button 
                            disabled={selectedPPIds.size !== 1} 
                            onClick={() => handleOpenPPLog(Array.from(selectedPPIds)[0] as string)} 
                            className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-2 text-white rounded-lg text-[10px] font-black uppercase shadow-md hover:bg-black disabled:opacity-50 transition-all"
                        >
                            <Edit2 size={14} /> Log PP Meeting Notes
                        </button>
                        <button 
                            disabled={selectedPPIds.size !== 1 || !ppMeetingsItems.find(i => i.id === (Array.from(selectedPPIds)[0] as string))?.original.ppMeetingNotes} 
                            onClick={() => handleOpenPPLog(Array.from(selectedPPIds)[0] as string)} 
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-indigo-600 rounded-lg text-[10px] font-black uppercase shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all"
                        >
                            <Eye size={14} /> View PP Meeting Notes
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative w-64 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search orders..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full pl-8 pr-3 py-2 text-xs bg-transparent border-none outline-none font-medium placeholder:text-gray-300" 
                            />
                        </div>
                        <button className="p-2 bg-white border border-gray-200 text-gray-400 rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
                            <Filter size={14} />
                        </button>
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mx-2 flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
                            <thead className="bg-[#fbfbf9] border-b border-gray-200 sticky top-0 z-10 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                                <tr>
                                    <th className="px-4 py-4 w-12 text-center bg-[#fbfbf9]">
                                        <input 
                                            type="checkbox" 
                                            checked={ppMeetingsItems.length > 0 && selectedPPIds.size === ppMeetingsItems.length} 
                                            onChange={(e) => setSelectedPPIds(e.target.checked ? new Set(ppMeetingsItems.map(i => i.id)) : new Set())} 
                                            className="rounded border-gray-300 text-black focus:ring-black cursor-pointer" 
                                        />
                                    </th>
                                    <th className="px-4 py-4">Job #</th>
                                    <th className="px-4 py-4">Buyer</th>
                                    <th className="px-4 py-4">PO#</th>
                                    <th className="px-4 py-4">Factory #</th>
                                    <th className="px-4 py-4 text-right">Quantity</th>
                                    <th className="px-4 py-4">PP Date</th>
                                    <th className="px-4 py-4 text-center">Status</th>
                                    <th className="px-4 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {ppMeetingsItems.map((item: any) => (
                                    <tr key={item.id} onClick={() => { const next = new Set(selectedPPIds); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); setSelectedPPIds(next); }} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedPPIds.has(item.id) ? 'bg-blue-50/40' : ''}`}>
                                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={selectedPPIds.has(item.id)} readOnly className="rounded border-gray-300 text-black pointer-events-none" />
                                        </td>
                                        <td className="px-4 py-4 font-mono font-bold text-xs uppercase text-blue-700">{item.jobId}</td>
                                        <td className="px-4 py-4 font-bold text-gray-900 uppercase text-xs">{item.buyer}</td>
                                        <td className="px-4 py-4 font-mono font-bold text-gray-500 text-xs">{item.poNumber}</td>
                                        <td className="px-4 py-4 font-bold text-gray-700 text-xs uppercase">{item.factoryRef}</td>
                                        <td className="px-4 py-4 text-right font-mono font-bold text-gray-800 text-xs">{item.quantity.toLocaleString()}</td>
                                        <td className="px-4 py-4 font-mono text-[10px] text-gray-600 uppercase">{formatAppDate(item.ppMeetingDate)}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-tighter ${item.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenPPLog(item.id); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors">
                                                <Edit2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {ppMeetingsItems.length === 0 && <tr><td colSpan={9} className="p-20 text-center text-gray-300 italic">No production jobs found for technical review.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
             </div>
         )}

         {activeMainTab === 'Work Orders' && (
             <div className="flex-1 flex flex-col min-h-0 space-y-4 animate-in fade-in duration-300 mx-2">
                {/* Work Orders Sub-tabs & Actions */}
                <div className="flex items-center justify-between px-4 shrink-0 border-b border-gray-100">
                    <div className="flex items-center gap-8">
                        {(['Planning Demand', 'Issued Work Orders'] as const).map(sub => (
                            <button 
                                key={sub} 
                                onClick={() => setActiveWorkOrderSubTab(sub)} 
                                className={`pb-3 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 
                                    ${activeWorkOrderSubTab === sub ? 'text-black border-b-2 border-black' : 'text-gray-400 border-b-2 border-transparent hover:text-gray-600'}`}
                            >
                                {sub === 'Planning Demand' ? <Layers size={14} /> : <ClipboardList size={14} />}
                                {sub}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 pb-2">
                        {activeWorkOrderSubTab === 'Planning Demand' && (
                            <button 
                                onClick={() => setIsWorkOrderModalOpen(true)} 
                                disabled={selectedWorkOrderDemandIds.size === 0} 
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm 
                                    ${selectedWorkOrderDemandIds.size > 0 ? 'bg-[#1a1a1a] text-white hover:bg-black shadow-lg' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                            >
                                <Plus size={14} /> Issue Work Order
                            </button>
                        )}

                        <div className="relative w-48 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full pl-8 pr-3 py-2 text-xs bg-transparent border-none outline-none font-medium" 
                            />
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col mx-2">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {activeWorkOrderSubTab === 'Planning Demand' ? (
                            <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
                                <thead className="bg-[#fbfbf9] border-b border-gray-200 sticky top-0 z-10 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-4 py-4 w-12 text-center bg-[#fbfbf9]">
                                            <input 
                                                type="checkbox" 
                                                onChange={(e) => setSelectedWorkOrderDemandIds(e.target.checked ? new Set(workOrderDemandItems.map(i => i.id)) : new Set())} 
                                                className="rounded border-gray-300 text-black" 
                                            />
                                        </th>
                                        <th className="px-6 py-4">Job ID</th>
                                        <th className="px-6 py-4">Service Demand</th>
                                        <th className="px-6 py-4">Department</th>
                                        <th className="px-6 py-4 text-right">Quantity</th>
                                        <th className="px-6 py-4">Specs / Notes</th>
                                        <th className="px-6 py-4 text-right">Target Date</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {workOrderDemandItems.map(item => (
                                        <tr key={item.id} onClick={() => { const next = new Set(selectedWorkOrderDemandIds); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); setSelectedWorkOrderDemandIds(next); }} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedWorkOrderDemandIds.has(item.id) ? 'bg-blue-50/40' : ''}`}>
                                            <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" checked={selectedWorkOrderDemandIds.has(item.id)} readOnly className="rounded border-gray-300 text-black pointer-events-none" />
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-blue-700 text-xs">{item.jobId}</td>
                                            <td className="px-6 py-4 font-bold text-gray-900">{item.serviceName}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[9px] font-black uppercase tracking-widest border border-gray-200">
                                                    {item.stage}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-700">
                                                {item.qty.toLocaleString()} <span className="text-[9px] text-gray-400 font-normal">{item.unit}</span>
                                            </td>
                                            <td className="px-6 py-4 text-[11px] text-gray-500 italic max-w-xs truncate" title={item.specs}>{item.specs}</td>
                                            <td className="px-6 py-4 text-right font-mono text-xs font-bold text-orange-600">{formatAppDate(item.targetDate)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-widest ${item.status === 'WO Issued' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {workOrderDemandItems.length === 0 && (
                                        <tr><td colSpan={8} className="p-20 text-center text-gray-300 italic font-medium">No active service demands found from Job Plans.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
                                <thead className="bg-[#fbfbf9] border-b border-gray-200 sticky top-0 z-10 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">WO Number</th>
                                        <th className="px-6 py-4">Vendor / Dept</th>
                                        <th className="px-6 py-4">Module</th>
                                        <th className="px-6 py-4 text-right">Total Qty</th>
                                        <th className="px-6 py-4">Date Issued</th>
                                        <th className="px-6 py-4 text-right">Deadline</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {issuedWorkOrders.map(wo => (
                                        <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-mono font-black text-blue-700 text-xs">{wo.woNumber}</td>
                                            <td className="px-6 py-4 font-bold text-gray-800 uppercase text-xs">{wo.vendorName}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[9px] font-black uppercase border border-gray-200">
                                                    {wo.stage}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-black text-gray-700">{wo.totalQty.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-xs text-gray-400">{formatAppDate(wo.dateIssued)}</td>
                                            <td className="px-6 py-4 text-right font-mono text-xs font-bold text-red-600">{formatAppDate(wo.targetDate)}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded text-[9px] font-black border uppercase tracking-widest ${wo.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                    {wo.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 text-gray-400 hover:text-blue-600 bg-white border border-gray-100 rounded shadow-sm transition-colors">
                                                    <Printer size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {issuedWorkOrders.length === 0 && (
                                        <tr><td colSpan={8} className="p-20 text-center text-gray-300 italic font-medium">No work orders issued yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
             </div>
         )}
      </div>

      {/* --- MODALS --- */}

      {isParcelModalOpen && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 max-h-[92vh]">
                  <div className="px-8 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><Package size={24} /></div>
                        <div>
                            <h2 className="text-xl font-bold text-[#37352F]">Dispatch & Parcel Management</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Creating shipment for {selectedApprovalIds.size} selected tracker items.</p>
                        </div>
                      </div>
                      <button onClick={() => setIsParcelModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar space-y-10">
                    {/* SECTION 1: CONSIGNEE & COURIER */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Consignee */}
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <User size={14} className="text-blue-500" /> Consignee (Recipient)
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Select Buyer Account</label>
                                    <select 
                                        value={parcelDetails.buyerId}
                                        onChange={(e) => {
                                            const buyer = availableBuyers.find(b => b.id === e.target.value);
                                            setParcelDetails({
                                                ...parcelDetails, 
                                                buyerId: e.target.value,
                                                recipientName: buyer?.contacts[0]?.name || '',
                                                address: buyer?.addresses[0]?.fullAddress || '',
                                                phone: buyer?.contacts[0]?.phone || ''
                                            });
                                        }}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white"
                                    >
                                        <option value="">Choose Account...</option>
                                        {availableBuyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Attention Person</label>
                                        <input type="text" value={parcelDetails.recipientName} onChange={e => setParcelDetails({...parcelDetails, recipientName: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" placeholder="Name" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Contact Phone</label>
                                        <input type="text" value={parcelDetails.phone} onChange={e => setParcelDetails({...parcelDetails, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono" placeholder="+..." />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Shipping Address</label>
                                    <textarea rows={3} value={parcelDetails.address} onChange={e => setParcelDetails({...parcelDetails, address: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Full street address, city, country" />
                                </div>
                            </div>
                        </div>

                        {/* Courier */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Truck size={14} className="text-blue-500" /> Shipment Details
                                </h3>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div 
                                        onClick={() => setSkipShipmentInfo(!skipShipmentInfo)}
                                        className="flex items-center gap-2"
                                    >
                                        {skipShipmentInfo ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-gray-300" />}
                                        <span className="text-[10px] font-black text-gray-500 uppercase group-hover:text-blue-600 transition-colors">Skip to Add later</span>
                                    </div>
                                </label>
                            </div>
                            <div className={`space-y-4 transition-opacity ${skipShipmentInfo ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Courier Service</label>
                                    <select value={parcelDetails.courier} onChange={e => setParcelDetails({...parcelDetails, courier: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                                        <option>DHL</option>
                                        <option>FedEx</option>
                                        <option>UPS</option>
                                        <option>Aramex</option>
                                        <option>Self Handover</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Tracking Number (Awb)</label>
                                    <input type="text" value={parcelDetails.tracking} onChange={e => setParcelDetails({...parcelDetails, tracking: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono uppercase" placeholder="Enter if already booked" />
                                    {!skipShipmentInfo && <p className="text-[9px] text-gray-400 italic mt-1">If left blank, status will be 'Booking Pending'.</p>}
                                </div>
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="flex items-center gap-3 text-blue-700 mb-2">
                                        <Info size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-tight">Consolidation Alert</span>
                                    </div>
                                    <p className="text-[11px] text-blue-600 leading-tight">
                                        All selected items will be grouped under this single AWB and their status will be updated to 'Submitted'.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: CONSOLIDATED ITEMS TABLE */}
                    <div className="space-y-4 pt-6 border-t border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="md:col-span-4 space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase">Item Description</label>
                                <input type="text" value={otherItemInput.name} onChange={e => setOtherItemInput({...otherItemInput, name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" placeholder="e.g. Extra Fabric Swatches" />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase">Category</label>
                                <select value={otherItemInput.type} onChange={e => setOtherItemInput({...otherItemInput, type: e.target.value as any})} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm bg-white">
                                    <option>Swatch</option>
                                    <option>Trim</option>
                                    <option>Pattern</option>
                                    <option>Document</option>
                                    <option>Sample</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase">Quantity</label>
                                <input type="number" value={otherItemInput.qty} onChange={e => setOtherItemInput({...otherItemInput, qty: parseInt(e.target.value) || 0})} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-right" />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase">Unit Value ($)</label>
                                <input type="number" value={otherItemInput.unitValue} onChange={e => setOtherItemInput({...otherItemInput, unitValue: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-right" />
                            </div>
                            <div className="md:col-span-2">
                                <button onClick={handleAddOtherItem} className="w-full py-2 bg-[#37352F] text-white text-xs font-bold rounded hover:bg-black transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                                    <Plus size={14} /> Add Item
                                </button>
                            </div>
                        </div>

                        {tempOtherItems.length > 0 && (
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-2 font-black text-gray-400 uppercase w-64">Item Description</th>
                                            <th className="px-4 py-2 font-black text-gray-400 uppercase">Category</th>
                                            <th className="px-4 py-2 font-black text-gray-400 uppercase text-right w-32">Quantity</th>
                                            <th className="px-4 py-2 font-black text-gray-400 uppercase text-right w-32">Unit Value ($)</th>
                                            <th className="px-4 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {tempOtherItems.map((oi, idx) => (
                                            <tr key={oi.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-gray-800">
                                                    <input 
                                                        type="text" 
                                                        value={oi.name} 
                                                        onChange={(e) => updateTempItem(oi.id, 'name', e.target.value)}
                                                        className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 font-bold"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    <select 
                                                        value={oi.type}
                                                        onChange={(e) => updateTempItem(oi.id, 'type', e.target.value)}
                                                        className="bg-transparent border-none outline-none focus:ring-0 p-0 text-gray-500"
                                                    >
                                                        <option>Sample</option>
                                                        <option>Swatch</option>
                                                        <option>Trim</option>
                                                        <option>Pattern</option>
                                                        <option>Document</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <input 
                                                        type="number" 
                                                        value={oi.qty} 
                                                        onChange={(e) => updateTempItem(oi.id, 'qty', parseInt(e.target.value) || 0)}
                                                        className="w-full text-right bg-transparent border-none outline-none focus:ring-0 p-0 font-mono font-bold text-blue-600"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-gray-400">$</span>
                                                        <input 
                                                            type="number" 
                                                            value={oi.unitValue} 
                                                            onChange={(e) => updateTempItem(oi.id, 'unitValue', parseFloat(e.target.value) || 0)}
                                                            className="w-20 text-right bg-transparent border-none outline-none focus:ring-0 p-0 font-mono text-gray-700"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => setTempOtherItems(tempOtherItems.filter(item => item.id !== oi.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                  </div>

                  <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                    <div className="flex gap-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Line Items</span>
                            <span className="text-lg font-bold text-indigo-600">{tempOtherItems.length}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Customs Value</span>
                            <span className="text-lg font-bold text-gray-900">
                                ${tempOtherItems.reduce((a, b) => a + (b.qty * b.unitValue), 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsParcelModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                        <button 
                            onClick={handleConfirmParcel}
                            className="px-12 py-2.5 bg-indigo-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-xl shadow-indigo-100"
                        >
                            Confirm Dispatch
                        </button>
                    </div>
                  </div>
              </div>
          </div>
      )}

      {/* TRACKING UPDATE MODAL */}
      {isTrackingUpdateModalOpen && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-sm rounded-xl shadow-2xl p-6 space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Truck size={18} className="text-blue-600" />
                        <h3 className="text-lg font-bold">Update Tracking</h3>
                      </div>
                      <button onClick={() => setIsTrackingUpdateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Courier Service</label>
                          <select 
                            value={trackingUpdateForm.courier} 
                            onChange={e => setTrackingUpdateForm({...trackingUpdateForm, courier: e.target.value})} 
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                          >
                              <option>DHL</option>
                              <option>FedEx</option>
                              <option>UPS</option>
                              <option>Aramex</option>
                              <option>Self Handover</option>
                          </select>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Tracking Number (Awb)</label>
                          <input 
                            type="text" 
                            value={trackingUpdateForm.tracking} 
                            onChange={e => setTrackingUpdateForm({...trackingUpdateForm, tracking: e.target.value})} 
                            placeholder="MSKU..." 
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono uppercase" 
                          />
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                      <button onClick={() => setIsTrackingUpdateModalOpen(false)} className="px-4 py-2 text-sm text-gray-500 font-bold uppercase">Cancel</button>
                      <button onClick={handleUpdateTracking} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold uppercase text-xs shadow-lg">Save Tracking</button>
                  </div>
              </div>
          </div>
      )}

      {isWorkOrderModalOpen && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                  <div className="px-8 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg"><Plus size={24} /></div>
                        <div><h2 className="text-xl font-bold text-[#37352F]">Issue Service Work Order</h2><p className="text-xs text-gray-500 mt-0.5">Formal request for {selectedWorkOrderDemandIds.size} production task(s).</p></div>
                      </div>
                      <button onClick={() => setIsWorkOrderModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6 bg-white">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assign Vendor / Dept</label>
                            <input type="text" value={woVendor} onChange={e => setWoVendor(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:border-indigo-500 outline-none" placeholder="Vendor or Dept Name" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Completion Deadline</label>
                            <input type="date" value={woTargetDate} onChange={e => setWoTargetDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none" />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Additional Instructions</label>
                            <textarea rows={4} value={woNotes} onChange={e => setWoNotes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none resize-none bg-gray-50/20" placeholder="Technical specs or handling notes..." />
                        </div>
                      </div>
                  </div>
                  <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsWorkOrderModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                      <button onClick={handleIssueWorkOrder} disabled={!woVendor} className="px-10 py-2.5 bg-[#1a1a1a] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-black disabled:opacity-50 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.4)]">Generate WO</button>
                  </div>
              </div>
          </div>
      )}

      {isPPModalOpen && ppEditingOrder && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
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
                                            <input type="text" value={sec.concernedPerson} onChange={e => sec.concernedPerson} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500" placeholder="Name" />
                                        </div>
                                    </div>
                                );
                            })}
                         </div>
                      </div>
                  </div>
                  <div className="px-8 py-5 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsPPModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                      <button onClick={handleSavePPNotes} className="px-10 py-2.5 bg-[#1a1a1a] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg flex items-center gap-2"><Save size={18} /> Save Analysis</button>
                  </div>
              </div>
          </div>
      )}

      {/* Comment / Feedback Modal */}
      {isCommentModalOpen && commentItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                  <div className="px-8 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><MessageSquare size={24} /></div>
                        <div><h2 className="text-xl font-bold text-[#37352F]">Log Buyer Feedback</h2><p className="text-xs text-gray-500 mt-0.5">{commentItem.refId} • {commentItem.buyer}</p></div>
                      </div>
                      <button onClick={() => setIsCommentModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-6 bg-white">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Received</label>
                            <input type="date" value={commentForm.receivedDate} onChange={e => setCommentForm({...commentForm, receivedDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Feedback By (Name)</label>
                            <input type="text" value={commentForm.sentBy} onChange={e => setCommentForm({...commentForm, sentBy: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:border-indigo-500 outline-none" placeholder="e.g. Sarah Finch" />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Feedback Narrative</label>
                            <textarea rows={6} value={commentForm.feedback} onChange={e => setCommentForm({...commentForm, feedback: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 outline-none resize-none bg-gray-50/20" placeholder="Paste buyer email or summarize comments..." />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outcome Status</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Approved', 'Rejected', 'Commented'].map(s => (
                                    <button 
                                        key={s} 
                                        onClick={() => setCommentForm({...commentForm, status: s})}
                                        className={`py-2 rounded-lg text-xs font-bold border transition-all
                                            ${commentForm.status === s ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                      </div>
                  </div>
                  <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsCommentModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all">Cancel</button>
                      <button onClick={handleSaveFeedback} className="px-10 py-2.5 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg">Save Feedback</button>
                  </div>
              </div>
          </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && commentItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
                  <div className="px-8 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 text-blue-700 rounded-lg"><History size={24} /></div>
                        <div><h2 className="text-xl font-bold text-[#37352F]">Detailed Lifecycle History</h2><p className="text-xs text-gray-500 mt-0.5">Ref: {commentItem.refId}</p></div>
                      </div>
                      <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-8 bg-white max-h-[70vh] overflow-y-auto custom-scrollbar">
                      {/* Section 1: Despatch Information */}
                      <div className="space-y-4">
                          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-2">
                             <Truck size={14} /> Despatch & Logistics
                          </h3>
                          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                             <div>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase block">Sent On Date</span>
                                 <span className="text-sm font-bold text-gray-900">{formatAppDate(commentItem.sentOn)}</span>
                             </div>
                             <div>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase block">Marked Received On</span>
                                 <span className="text-sm font-bold text-blue-600">{formatAppDate(commentItem.deliveredOn) || 'In-Transit'}</span>
                             </div>
                             <div>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase block">Courier / Service</span>
                                 <span className="text-sm font-bold text-gray-900">{commentItem.courier || '-'}</span>
                             </div>
                             <div>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase block">Master Tracking (AWB)</span>
                                 <span className="text-sm font-mono font-bold text-gray-700">{commentItem.trackingNo || '-'}</span>
                             </div>
                          </div>
                      </div>

                      {/* Section 2: Technical Feedback */}
                      <div className="space-y-4">
                          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-2">
                             <MessageSquare size={14} /> Technical Feedback Audit
                          </h3>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                             <div>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase block">Feedback Date</span>
                                 <span className="text-sm font-bold text-gray-900">{formatAppDate(commentItem.commentsReceivedDate) || '-'}</span>
                             </div>
                             <div>
                                 <span className="text-[10px] font-bold text-gray-400 uppercase block">Feedback Provided By</span>
                                 <span className="text-sm font-bold text-gray-900">{commentItem.commentsSentBy || '-'}</span>
                             </div>
                          </div>
                          <div className="bg-amber-50/30 p-5 rounded-xl border border-amber-100">
                             <span className="text-[10px] font-bold text-amber-600 uppercase block mb-2">Narrative Summary</span>
                             <p className="text-sm text-gray-800 leading-relaxed font-medium">
                                {commentItem.feedbackText || <span className="text-gray-400 italic">No feedback has been recorded for this item yet.</span>}
                             </p>
                          </div>
                      </div>
                  </div>
                  <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsHistoryModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-all">Close History</button>
                      <button 
                        onClick={() => {
                            const p = document.createElement('div');
                            handlePrintHistory();
                        }}
                        className="px-8 py-2.5 bg-[#1a1a1a] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg flex items-center gap-2"
                      >
                         <Printer size={16} /> Print Report
                      </button>
                  </div>
              </div>
          </div>
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