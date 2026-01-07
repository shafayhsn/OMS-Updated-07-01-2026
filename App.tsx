
import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MainOrdersDashboard } from './components/MainOrdersDashboard';
import { PlanningDashboard } from './components/PlanningDashboard';
import { CostingDashboard } from './components/CostingDashboard';
import { SamplingDashboard } from './components/SamplingDashboard';
import { PurchasingDashboard } from './components/PurchasingDashboard';
import { SettingsDashboard } from './components/SettingsDashboard';
import { BuyersDashboard } from './components/BuyersDashboard';
import { SuppliersDashboard } from './components/SuppliersDashboard';
import { BOMManagerDashboard } from './components/BOMManagerDashboard';
import { AIAssistant } from './components/AIAssistant';
import { NewOrderModal } from './components/NewOrderModal';
import { OrderSummaryView } from './components/OrderSummaryView';
import { ProductionFlowDashboard } from './components/ProductionFlowDashboard';
import { IntegratedFinanceDashboard } from './components/IntegratedFinanceDashboard';
import { ExportLogisticsController } from './components/ExportLogisticsController';
import { 
  ResourcesDashboard, 
  ConsumptionCalculatorModal, 
  CBMCalculatorModal, 
  ThreadConsumptionModal, 
  FabricGSMModal, 
  PantoneConverterModal 
} from './components/ResourcesDashboard';
import { CatalogueMaker } from './components/CatalogueMaker';
import { CostingSheetGenerator } from './components/CostingSheetGenerator';
import { EventsDashboard } from './components/EventsDashboard';
import { TopBar } from './components/TopBar';
import { Login } from './components/Login';
import { Tab, Buyer, Supplier, Order, NewOrderState, SystemUser, JobBatch, ExportInvoice, MasterBOMItem, DevelopmentSample, CalendarEvent, CompanyDetails, IssuedPurchaseOrder, MonthlyTarget, FittingData, Parcel, BOMPreset, IssuedWorkOrder } from './types';
import { MOCK_BUYERS, MOCK_SUPPLIERS, MOCK_MASTER_BOM_ITEMS, MOCK_ORDERS } from './constants';

const INITIAL_USERS: SystemUser[] = [
  { id: 'u1', name: 'ShafayH', username: 'shafay.h', role: 'Administrator', lastActive: 'Now' },
];

const INITIAL_MONTHLY_TARGETS: MonthlyTarget[] = [
  { month: 'January', salesTarget: 150000, volumeTarget: 12000 },
  { month: 'February', salesTarget: 140000, volumeTarget: 11000 },
  { month: 'March', salesTarget: 160000, volumeTarget: 13000 },
  { month: 'April', salesTarget: 170000, volumeTarget: 14000 },
  { month: 'May', salesTarget: 180000, volumeTarget: 15000 },
  { month: 'June', salesTarget: 155000, volumeTarget: 12500 },
  { month: 'July', salesTarget: 145000, volumeTarget: 11500 },
  { month: 'August', salesTarget: 150000, volumeTarget: 12000 },
  { month: 'September', salesTarget: 190000, volumeTarget: 16000 },
  { month: 'October', salesTarget: 200000, volumeTarget: 17000 },
  { month: 'November', salesTarget: 210000, volumeTarget: 18000 },
  { month: 'December', salesTarget: 130000, volumeTarget: 10000 },
];

const DEFAULT_SALES_TERMS = `1. PRODUCTION START: Lead times begin only after (a) receipt of deposit/LC and (b) written approval of all Pre-Production (PP) samples and lab dips.

2. DELAYS: Any delay in Buyer approvals or payment will result in an automatic day-for-day extension of the shipment date. Factory is not liable for delays caused by the Buyer.

3. TOLERANCE: A quantity tolerance of +/- 5% is reserved. The Buyer agrees to accept and pay for the actual quantity produced within this range.

4. PRICE VALIDITY: Prices are based on current material costs. Factory reserves the right to renegotiate unit prices if the Buyer delays production by more than 45 days.

5. AIR FREIGHT: If shipment is delayed due to Buyer’s late approvals, any resulting air freight or expedited shipping costs shall be paid by the Buyer.

6. CLAIMS: Quality/quantity claims must be submitted within 15 days of port arrival. No claims accepted after goods are processed or sold. Total liability for any claim shall not exceed the original invoice value of the goods.

7. OWNERSHIP: Goods remain Factory property until full payment is received. Factory reserves the right to resell de-branded goods in the event of non-payment or cancellation.

8. FORCE MAJEURE: Factory is not liable for delays caused by strikes, power shortages, natural disasters, or other events beyond its reasonable control.

9. JURISDICTION: This contract is governed by the laws of Karachi, Pakistan.`;

const DEFAULT_PO_TERMS = `1. Deliveries must be made between 09:00 AM and 05:00 PM (Mon-Sat).
2. Items must strictly adhere to the approved quality samples.
3. Payment will be processed as per credit terms days after GRN.
4. Partial shipments are accepted only with prior written approval.
5. We reserve the right to return non-compliant goods.`;

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  
  const [buyers, setBuyers] = useState<Buyer[]>(MOCK_BUYERS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS); 
  const [users, setUsers] = useState<SystemUser[]>(INITIAL_USERS);
  const [jobs, setJobs] = useState<JobBatch[]>([]); 
  const [taxRate, setTaxRate] = useState<number>(18.0); 
  const [masterBOMItems, setMasterBOMItems] = useState<MasterBOMItem[]>(MOCK_MASTER_BOM_ITEMS); 
  const [bomPresets, setBomPresets] = useState<BOMPreset[]>([]);
  const [developmentSamples, setDevelopmentSamples] = useState<DevelopmentSample[]>([]);
  const [issuedPOs, setIssuedPOs] = useState<IssuedPurchaseOrder[]>([]); 
  const [issuedWorkOrders, setIssuedWorkOrders] = useState<IssuedWorkOrder[]>([]);
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyTarget[]>(INITIAL_MONTHLY_TARGETS);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    name: 'Nizamia',
    address: 'Plot# RCC14, Shed Nr 02, Estate Avenue Road, SITE Area, Karachi 75700, Pakistan',
    phone: '+92 21 32564717',
    website: 'www.nizamia.com',
    logoUrl: null,
    salesTerms: DEFAULT_SALES_TERMS,
    poTerms: DEFAULT_PO_TERMS
  });

  const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);
  
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  
  const [exportInvoices, setExportInvoices] = useState<ExportInvoice[]>([]);

  const [currencyRates, setCurrencyRates] = useState({
    USD: 278.50,
    EUR: 302.10,
    GBP: 355.00,
    lastUpdated: new Date().toISOString()
  });
  const [cottonRate, setCottonRate] = useState<number>(95.50); 
  const [enabledCities, setEnabledCities] = useState<string[]>(['London', 'New York', 'Dubai']);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrderData, setEditingOrderData] = useState<NewOrderState | null>(null);
  const [summaryData, setSummaryData] = useState<NewOrderState | null>(null);

  const [activeJobForConsole, setActiveJobForConsole] = useState<JobBatch | null>(null);

  const mapOrderToDeepState = (order: Order): NewOrderState => {
      let fittingData: FittingData[] = [];
      if (Array.isArray(order.fitting)) {
          fittingData = order.fitting;
      } else if (order.fitting) {
          fittingData = [{ ...(order.fitting as any), id: 'legacy-fit' }];
      }

      return {
          generalInfo: {
            formData: {
              jobNumber: order.orderID || '',
              buyerName: order.buyer || '',
              merchandiserName: order.merchandiserName || '',
              factoryRef: order.factoryRef || '',
              styleNumber: order.styleNo || '',
              productID: order.id || '',
              poNumber: order.poNumber || '',
              poDate: order.poDate || '', 
              shipDate: order.deliveryDate || '',
              plannedDate: order.plannedDate || '', 
              shipMode: order.shipMode || 'Sea',
              description: order.styleDescription || '',
              incoterms: order.incoterms || '',
            },
            styleImage: order.imageUrl || null,
            colors: order.colors || [],
            sizeGroups: order.sizeGroups || []
          },
          fitting: fittingData,
          sampling: order.samplingDetails || [],
          embellishments: order.embellishments || [],
          washing: order.washing || {},
          finishing: order.finishing || {
            finalInspectionStatus: 'Pending',
            packingList: []
          },
          criticalPath: order.criticalPath || {
            capacity: {
              totalOrderQty: order.quantity,
              fabricLeadTime: 0,
              trimsLeadTime: 0,
              cuttingOutput: 0,
              sewingLines: 0,
              sewingOutputPerLine: 0,
              finishingOutput: 0,
            },
            schedule: []
          },
          bom: order.bom || [],
          bomStatus: order.bomStatus || 'Draft',
          planningNotes: order.planningNotes || '',
          skippedStages: order.skippedStages || []
      };
  };

  const handleCreateOrder = () => {
    setEditingOrderData(null);
    setIsOrderModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrderData(mapOrderToDeepState(order));
    setIsOrderModalOpen(true);
  };

  const handleViewSummary = (order: Order) => {
    setSummaryData(mapOrderToDeepState(order));
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const handleSaveOrder = (newOrderState: NewOrderState, shouldClose: boolean = true) => {
    const isNew = !orders.some(o => o.orderID === newOrderState.generalInfo.formData.jobNumber);
    
    let existingOrder: Order | undefined;
    if (!isNew) {
        existingOrder = orders.find(o => o.orderID === newOrderState.generalInfo.formData.jobNumber);
    }

    let calculatedTotalQty = 0;
    let calculatedTotalAmt = 0;
    newOrderState.generalInfo.sizeGroups.forEach(group => {
      let groupQty = 0;
      Object.values(group.breakdown).forEach(colorRow => {
        Object.values(colorRow).forEach(qtyStr => {
          groupQty += (parseInt(qtyStr) || 0);
        });
      });
      calculatedTotalQty += groupQty;
      calculatedTotalAmt += groupQty * (parseFloat(group.unitPrice) || 0);
    });

    const finalPrice = calculatedTotalQty > 0 ? (calculatedTotalAmt / calculatedTotalQty) : 0;

    const newOrder: Order = {
        id: newOrderState.generalInfo.formData.productID || `ord-${Date.now()}`,
        orderID: newOrderState.generalInfo.formData.jobNumber,
        poNumber: newOrderState.generalInfo.formData.poNumber,
        poDate: newOrderState.generalInfo.formData.poDate,
        styleNo: newOrderState.generalInfo.formData.styleNumber,
        buyer: newOrderState.generalInfo.formData.buyerName,
        merchandiserName: newOrderState.generalInfo.formData.merchandiserName,
        quantity: calculatedTotalQty,
        deliveryDate: newOrderState.generalInfo.formData.shipDate,
        plannedDate: newOrderState.generalInfo.formData.plannedDate,
        status: existingOrder?.status || 'Active',
        amount: calculatedTotalAmt, 
        price: finalPrice, 
        factoryRef: newOrderState.generalInfo.formData.factoryRef,
        styleName: newOrderState.generalInfo.formData.styleNumber,
        styleDescription: newOrderState.generalInfo.formData.description, 
        fabricName: newOrderState.bom.find(i => i.processGroup === 'Fabric')?.componentName || 'TBD',
        fabricDescription: '',
        incoterms: newOrderState.generalInfo.formData.incoterms,
        shipMode: newOrderState.generalInfo.formData.shipMode,
        imageUrl: newOrderState.generalInfo.styleImage || undefined,
        colors: newOrderState.generalInfo.colors,
        sizeGroups: newOrderState.generalInfo.sizeGroups,
        bom: newOrderState.bom,
        samplingDetails: newOrderState.sampling,
        criticalPath: {
            ...newOrderState.criticalPath,
            capacity: {
                ...newOrderState.criticalPath.capacity,
                totalOrderQty: calculatedTotalQty 
            }
        },
        washing: newOrderState.washing,
        finishing: newOrderState.finishing,
        fitting: newOrderState.fitting,
        embellishments: newOrderState.embellishments,
        // Fix: Use correct property from newOrderState instead of undefined variable newOrderStatus
        bomStatus: newOrderState.bomStatus || 'Draft',
        planningNotes: newOrderState.planningNotes,
        skippedStages: newOrderState.skippedStages,
        createdBy: existingOrder?.createdBy || users[0].name
    };

    if (isNew) {
        setOrders([newOrder, ...orders]);
    } else {
        setOrders(orders.map(o => o.orderID === newOrder.orderID ? newOrder : o));
    }
    
    if (shouldClose) {
        setIsOrderModalOpen(false);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
      setOrders(orders.filter(o => o.orderID !== orderId));
      setIsOrderModalOpen(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleOpenTool = (toolId: string) => {
    if (toolId === 'parcel-dispatch') {
      setActiveTab(Tab.PLANNING);
      return;
    }
    setActiveTool(toolId);
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case Tab.DASHBOARD:
        return <Dashboard 
                  orders={orders} 
                  jobs={jobs} 
                  monthlyTargets={monthlyTargets}
                  developmentSamples={developmentSamples}
                  onNavigate={setActiveTab}
                  onCreateOrder={handleCreateOrder}
                  onNewCosting={() => setActiveTool('costing-generator')}
                  onNewDevSample={() => setActiveTab(Tab.SAMPLING)}
                  currentUser={users[0]}
                  onOpenEvents={() => setIsEventsModalOpen(true)}
                  onLogout={handleLogout}
               />;
      case Tab.ORDERS:
        return <MainOrdersDashboard 
            orders={orders} 
            jobs={jobs} 
            buyers={buyers}
            companyDetails={companyDetails}
            onUpdateJobs={setJobs}
            onUpdateOrder={handleUpdateOrder}
            onCreateOrder={handleCreateOrder} 
            onRowClick={(id) => {
                const order = orders.find(o => o.orderID === id);
                if(order) handleViewSummary(order);
            }}
            onBulkImport={(data) => {
                setOrders([...data.orders, ...orders]);
                setExportInvoices([...data.invoices, ...exportInvoices]);
            }}
        />;
      case Tab.PLANNING:
        return <PlanningDashboard 
            jobs={jobs} 
            onNavigate={setActiveTab} 
            onUpdateJobs={setJobs}
            onManageJobPlans={(job) => setActiveJobForConsole(job)}
            developmentSamples={developmentSamples}
            onAddDevSample={(s) => setDevelopmentSamples(prev => [...prev, s])}
            onUpdateDevSample={(s) => setDevelopmentSamples(prev => prev.map(ds => ds.id === s.id ? s : ds))}
            parcels={parcels}
            onUpdateParcels={setParcels}
            availableBuyers={buyers}
            companyDetails={companyDetails}
            issuedWorkOrders={issuedWorkOrders}
            onUpdateWorkOrders={setIssuedWorkOrders}
        />;
      case Tab.COSTING:
        return <CostingDashboard />;
      case Tab.SAMPLING:
        return <SamplingDashboard 
            jobs={jobs}
            onUpdateJob={(updatedJob) => setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j))}
            developmentSamples={developmentSamples}
            onAddDevSample={(s) => setDevelopmentSamples(prev => [...prev, s])}
            onUpdateDevSample={(s) => setDevelopmentSamples(prev => prev.map(ds => ds.id === s.id ? s : ds))}
            parcels={parcels}
            availableBuyers={buyers}
            companyDetails={companyDetails}
        />;
      case Tab.PURCHASING:
        return <PurchasingDashboard 
            orders={orders} 
            jobs={jobs} 
            onUpdateJobs={setJobs}
            taxRate={taxRate}
            companyDetails={companyDetails}
            issuedPOs={issuedPOs}
            onUpdateIssuedPOs={setIssuedPOs}
        />;
      case Tab.PRODUCTION:
        return <ProductionFlowDashboard jobs={jobs} onUpdateJob={(j) => setJobs(prev => prev.map(job => job.id === j.id ? j : job))} />;
      case Tab.BUYERS:
        return <BuyersDashboard buyers={buyers} onAddBuyer={(b) => setBuyers([...buyers, b])} onDeleteBuyer={(id) => setBuyers(buyers.filter(b => b.id !== id))} />;
      case Tab.SUPPLIERS:
        return <SuppliersDashboard suppliers={suppliers} onAddSupplier={(s) => setSuppliers([...suppliers, s])} onDeleteSupplier={(id) => setSuppliers(suppliers.filter(s => s.id !== id))} />;
      case Tab.BOM:
        // Fix: Use correct state setter setMasterBOMItems instead of undefined variable setMasterItems
        return <BOMManagerDashboard masterItems={masterBOMItems} setMasterItems={setMasterBOMItems} bomPresets={bomPresets} setBomPresets={setBomPresets} buyers={buyers} suppliers={suppliers} />;
      case Tab.FINANCE:
        return <IntegratedFinanceDashboard currencyRates={currencyRates} exportInvoicesData={exportInvoices} />;
      case Tab.SHIPPING:
        return <ExportLogisticsController jobs={jobs} onUpdateJob={(j) => setJobs(prev => prev.map(job => job.id === j.id ? j : job))} />;
      case Tab.RESOURCES:
        return <ResourcesDashboard onOpenTool={handleToolClick} />;
      case Tab.SETTINGS:
        return <SettingsDashboard 
            taxRate={taxRate} 
            onUpdateTaxRate={setTaxRate} 
            currencyRates={currencyRates}
            onUpdateCurrencyRates={setCurrencyRates}
            cottonRate={cottonRate}
            onUpdateCottonRate={setCottonRate}
            enabledCities={enabledCities}
            onUpdateEnabledCities={setEnabledCities}
            companyDetails={companyDetails}
            onUpdateCompanyDetails={setCompanyDetails}
            monthlyTargets={monthlyTargets}
            onUpdateMonthlyTargets={setMonthlyTargets}
        />;
      default:
        return <div className="p-8 text-gray-500">Section under construction.</div>;
    }
  };

  const handleToolClick = (toolId: string) => {
    if (toolId === 'parcel-dispatch') {
      setActiveTab(Tab.PLANNING);
      return;
    }
    setActiveTool(toolId);
  };

  return (
    <div className="flex h-screen bg-[#F7F7F5] font-sans text-[#37352F] overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => {
            setActiveTab(tab);
            setSummaryData(null);
        }}
        onOpenEvents={() => setIsEventsModalOpen(true)}
        onOpenTool={handleOpenTool}
        onLogout={handleLogout}
        companyLogo={companyDetails.logoUrl}
      />
      
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <TopBar 
          currencyRates={currencyRates} 
          cottonRate={cottonRate} 
          enabledCities={enabledCities} 
          onOpenAI={() => setIsAIOpen(true)}
        />
        
        <main className="flex-1 overflow-auto p-6 relative">
          {summaryData ? (
             <OrderSummaryView 
                orderData={summaryData} 
                onClose={() => setSummaryData(null)}
                onEdit={() => {
                    setEditingOrderData(summaryData);
                    setSummaryData(null);
                    setIsOrderModalOpen(true);
                }}
             />
          ) : (
             renderContent()
          )}
        </main>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />

      {isOrderModalOpen && (
        <NewOrderModal 
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          onSave={handleSaveOrder}
          onDelete={handleDeleteOrder}
          initialData={editingOrderData}
          availableBuyers={buyers}
          availableSuppliers={suppliers}
          masterBOMItems={masterBOMItems}
          bomPresets={bomPresets}
          currentUser={users[0]}
        />
      )}

      {activeJobForConsole && (
          <div className="fixed inset-0 z-[150] flex items-col bg-white overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <MainOrdersDashboard 
                 orders={orders} 
                 jobs={jobs} 
                 buyers={buyers}
                 companyDetails={companyDetails}
                 onUpdateJobs={setJobs}
                 onCreateOrder={handleCreateOrder} 
                 onRowClick={(id) => {}}
                 onBulkImport={() => {}}
              />
              <button 
                onClick={() => setActiveJobForConsole(null)}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-indigo-600 text-white rounded-full shadow-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all"
              >
                 <ArrowLeft size={16} /> Return to Planning
              </button>
          </div>
      )}

      {isEventsModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                 <EventsDashboard 
                    orders={orders} 
                    jobs={jobs} 
                    customEvents={customEvents} 
                    onUpdateCustomEvents={setCustomEvents}
                    onClose={() => setIsEventsModalOpen(false)}
                 />
             </div>
          </div>
      )}

      {activeTool === 'costing-generator' && (
         <div className="fixed inset-0 z-[150] bg-white flex flex-col">
            <CostingSheetGenerator onBack={() => setActiveTool(null)} />
         </div>
      )}
      
      {activeTool === 'catalogue-maker' && (
         <CatalogueMaker onClose={() => setActiveTool(null)} />
      )}

      {activeTool === 'fabric-consumption' && <ConsumptionCalculatorModal onClose={() => setActiveTool(null)} />}
      {/* Fix: Use correct state setter setActiveTool instead of undefined variable setActiveCalculator */}
      {activeTool === 'cbm' && <CBMCalculatorModal onClose={() => setActiveTool(null)} />}
      {activeTool === 'sewing-thread' && <ThreadConsumptionModal onClose={() => setActiveTool(null)} />}
      {activeTool === 'gsm' && <FabricGSMModal onClose={() => setActiveTool(null)} />}
      {activeTool === 'pantone-converter' && <PantoneConverterModal onClose={() => setActiveTool(null)} />}

    </div>
  );
};
