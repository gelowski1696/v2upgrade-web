export type ReportView =
  | 'overview'
  | 'sales'
  | 'sales-targets'
  | 'inventory'
  | 'inventory-forecast'
  | 'transfers'
  | 'balances'
  | 'customer-insights'
  | 'cash-flow'
  | 'restocks'
  | 'products'
  | 'profitability'
  | 'payments'
  | 'business'
  | 'inventory-summary'
  | 'financial-report'
  | 'discount-report'
  | 'purchase-report'
  | 'special-receipts'
  | 'customer-report'
  | 'scheduled-reports'
  | 'activity'
  | 'preferences';

export type PortalActivityAction = 'SECURITY' | 'STORE_SYNC' | 'SETTINGS' | 'REPORTING' | 'BACKUP';

export interface PortalActivityData {
  items: Array<{
    id: string;
    occurredAt: string;
    action: PortalActivityAction;
    status: 'SUCCESS' | 'INFO' | 'WARNING';
    title: string;
    detail: string;
    actor: string;
    storeId: string | null;
    storeName: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  filterOptions: {
    actions: Array<{ value: PortalActivityAction; label: string }>;
    stores: Array<{ id: string; name: string }>;
  };
}

export type ScheduledReportFrequency = 'DAILY' | 'WEEKLY';

export interface ScheduledReportsData {
  scheduledReportsEnabled: boolean;
  recipientEmail: string;
  emailVerifiedAt: string | null;
  emailDeliveryConfigured: boolean;
  deliveryTime: string;
  weeklyDeliveryDay: string;
  schedules: Array<{
    id: string;
    storeId: string;
    frequency: ScheduledReportFrequency;
    enabled: boolean;
    nextRunAt: string | null;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
  }>;
  deliveries: Array<{
    id: string;
    storeId: string;
    frequency: ScheduledReportFrequency;
    periodFrom: string;
    periodTo: string;
    status:
      | 'PENDING'
      | 'PROCESSING'
      | 'SENT'
      | 'DELAYED'
      | 'DELIVERED'
      | 'BOUNCED'
      | 'COMPLAINED'
      | 'FAILED'
      | 'SKIPPED';
    attemptCount: number;
    snapshotAgeHours: number | null;
    dataQualityStatus: string | null;
    warning: string | null;
    providerMessageId: string | null;
    providerStatus: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    createdAt: string;
  }>;
}

export interface ReportCapabilitiesData {
  available: boolean;
  reports: Array<
    | 'inventory-summary'
    | 'financial-report'
    | 'discount-report'
    | 'purchase-report'
    | 'special-receipts'
    | 'customer-report'
  >;
}

export interface ModuleReportData<T> {
  items: T[];
  totalAmount: number;
}

export interface PagedModuleReportData<T> extends ModuleReportData<T> {
  total: number;
  page: number;
  pageSize: number;
}

export interface DiscountReportRecord {
  salesDate: string;
  reference: string;
  customer: string;
  cashier: string;
  regularDiscount: number;
  specialDiscount: number;
  totalDiscount: number;
}

export interface PurchaseReportRecord {
  id: number;
  purchaseDate: string;
  reference: string;
  supplier: string;
  driver: string;
  purchaseType: string;
  totalQuantity: number;
  totalAmount: number;
}

export interface SpecialReceiptReportRecord {
  salesId: number;
  salesDate: string;
  reference: string;
  customer: string;
  saleType: string;
  itemCount: number;
  totalAmount: number;
  paymentMethod: string;
  cashier: string;
}

export interface CustomerReportRecord {
  salesId: number;
  salesDate: string;
  reference: string;
  customer: string;
  address: string;
  groupName: string;
  itemCount: number;
  totalAmount: number;
}

export interface InventorySummaryReportRow {
  itemCode: string;
  itemName: string;
  openingFilled: number;
  openingEmpty: number;
  deliveries: number;
  sales: number;
  refill: number;
  pullOut: number;
  defective: number;
  backload: number;
  actualFilled: number;
  actualEmpty: number;
}

export interface InventorySummaryReportData {
  openingSnapshotDate: string;
  actualSnapshotDate: string;
  rows: InventorySummaryReportRow[];
}

export interface FinancialProductReportRow {
  itemCode: string;
  itemName: string;
  itemSize: string;
  isLpgItem: boolean;
  openingQuantity: number;
  openingUnitCost: number;
  openingTotal: number;
  deliveredQuantity: number;
  deliveredTotal: number;
  closingQuantity: number;
  computedCogsQuantity: number;
  costOfGoods: number;
  salesQuantity: number;
  salesTotal: number;
}

export interface FinancialReportData {
  openingSnapshotDate: string;
  actualSnapshotDate: string;
  productRows: FinancialProductReportRow[];
  cashFlow: CashFlowData;
}

export interface OverviewData {
  transactionCount: number;
  salesWithRecordedCost: number;
  salesMissingCostCount: number;
  costCoveragePercent: number;
  profitDataComplete: boolean;
  grossSales: number;
  discounts: number;
  costOfGoods: number;
  grossProfit: number;
  customerBalance: number;
  customersWithBalance: number;
  inventoryItems: number;
  criticalItems: number;
  transfers: number;
}

export interface DataQualitySale {
  id: number;
  reference: string;
  saleDate: string;
  customer: string;
  totalAmount: number;
  lineCount: number;
  recordedLineCost: number;
  classification: 'LEGACY' | 'UNEXPECTED';
}

export interface DataQualityData extends PagedReportData<DataQualitySale> {
  compatibility: {
    status: 'COMPATIBLE' | 'PARTIAL' | 'INCOMPATIBLE';
    databaseSchemaVersion: number;
    migrationVersion: number | null;
    issues: string[];
  };
  summary: {
    totalSales: number;
    salesWithRecordedCost: number;
    missingCostSales: number;
    legacyMissingCostSales: number;
    unexpectedMissingCostSales: number;
    costCoveragePercent: number;
  };
  periods: Array<{
    period: string;
    missingCostSales: number;
    legacyMissingCostSales: number;
    unexpectedMissingCostSales: number;
  }>;
}

export type SalesTrendGrouping = 'day' | 'week' | 'month';

export interface SalesTrendPeriod {
  from: string;
  to: string;
  grossSales: number;
  transactionCount: number;
  averageSaleValue: number;
  discounts: number;
  costOfGoods: number;
  grossProfit: number;
  salesWithRecordedCost: number;
  salesMissingCostCount: number;
  costCoveragePercent: number;
  profitDataComplete: boolean;
}

export interface SalesTrendPoint {
  key: string;
  label: string;
  grossSales: number;
  transactionCount: number;
  discounts: number;
  costOfGoods: number;
  grossProfit: number;
  salesMissingCostCount: number;
}

export interface SalesTrendData {
  grouping: SalesTrendGrouping;
  current: SalesTrendPeriod;
  previous: SalesTrendPeriod;
  points: SalesTrendPoint[];
}

export interface CashFlowData {
  openingBalance: number;
  closingBalance: number;
  netCashFlow: number;
  salesReceipts: number;
  creditCollections: number;
  capitalCashIn: number;
  pettyCashOut: number;
  restockPayments: number;
  salaryPaid: number;
  cashReceived: number;
  cashPaid: number;
}

export type CashFlowSource =
  | 'SALES_RECEIPTS'
  | 'CREDIT_COLLECTIONS'
  | 'CAPITAL_CASH_IN'
  | 'PETTY_CASH_OUT'
  | 'SALARY_PAID'
  | 'RESTOCK_PAYMENTS';

export interface CashFlowTransaction {
  id: number;
  movementDate: string;
  reference: string;
  description: string;
  paymentMethod: string;
  notes: string;
  amount: number;
}

export interface CashFlowTransactionsData {
  source: CashFlowSource;
  label: string;
  direction: 'IN' | 'OUT';
  items: CashFlowTransaction[];
  total: number;
  page: number;
  pageSize: number;
  sourceTotal: number;
  summaryTotal: number;
  reconciliationDifference: number;
}

export interface PagedReportData<T = Record<string, unknown>> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  filterOptions?: {
    statuses?: string[];
    payments?: string[];
    categories?: string[];
    stockStatuses?: string[];
    risks?: InventoryForecastRisk[];
  };
}

export interface ReportFilters {
  search?: string;
  status?: string;
  payment?: string;
  itemCode?: string;
  category?: string;
  stockStatus?: string;
  forecastDays?: number;
  risk?: string;
  profitabilitySort?: ProfitabilitySort;
  customerSort?: CustomerInsightsSort;
}

export type OverviewMetricKey =
  'GROSS_SALES' | 'RECORDED_GROSS_PROFIT' | 'CUSTOMER_BALANCE' | 'INVENTORY_ALERTS';

export type SavedViewDatePreset = 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM';

export interface SavedDashboardView {
  id: string;
  name: string;
  report: Exclude<ReportView, 'preferences' | 'activity' | 'scheduled-reports' | 'sales-targets'>;
  storeId: string;
  storeName: string;
  datePreset: SavedViewDatePreset;
  dateFrom: string | null;
  dateTo: string | null;
  filters: ReportFilters;
  updatedAt: string;
}

export interface DashboardPreferencesData {
  overviewMetrics: OverviewMetricKey[];
  savedViews: SavedDashboardView[];
}

export type InventoryStockStatus = 'OUT_OF_STOCK' | 'CRITICAL' | 'HEALTHY';

export interface InventoryRecord {
  id: number;
  code: string | null;
  brand: string | null;
  name: string | null;
  size: string | null;
  quantity: number | null;
  cost: number | null;
  sellingPrice: number | null;
  refillPrice: number | null;
  nonRefillPrice: number | null;
  category: string | null;
  alertLevel: number | null;
  fillQuantity: number | null;
  emptyQuantity: number | null;
  warehouseFill: number | null;
  warehouseEmpty: number | null;
  lentQuantity: number | null;
  stockStatus: InventoryStockStatus;
  recordedValue: number;
}

export interface InventorySummaryData {
  trackedItems: number;
  outOfStockItems: number;
  criticalItems: number;
  healthyItems: number;
  storeFill: number;
  storeEmpty: number;
  warehouseFill: number;
  warehouseEmpty: number;
  recordedValue: number;
  stockBearingItems: number;
  valuedItems: number;
  missingCostItems: number;
  valuationCoveragePercent: number;
  valuationComplete: boolean;
}

export interface InventoryReportData extends PagedReportData<InventoryRecord> {
  summary: InventorySummaryData;
}

export type InventoryForecastRisk =
  'OUT_OF_STOCK' | 'REORDER_NOW' | 'WATCH' | 'HEALTHY' | 'NO_RECENT_SALES';

export interface InventoryForecastRecord {
  id: number;
  code: string;
  item: string;
  category: string;
  storeFill: number;
  warehouseFill: number;
  availableStock: number;
  alertLevel: number;
  recordedCost: number;
  salesQuantity: number;
  averageDailySales: number;
  daysRemaining: number | null;
  projectedDemand: number;
  suggestedReorder: number;
  estimatedReorderCost: number;
  lastSoldAt: string | null;
  risk: InventoryForecastRisk;
}

export interface InventoryForecastData extends PagedReportData<InventoryForecastRecord> {
  analysisDays: number;
  forecastDays: number;
  leadTimeDays: number;
  summary: {
    availableStock: number;
    projectedDemand: number;
    suggestedReorder: number;
    estimatedReorderCost: number;
    outOfStockItems: number;
    reorderNowItems: number;
    watchItems: number;
    noRecentSalesItems: number;
    attentionItems: number;
  };
}

export interface SalesTargetData {
  month: string;
  from: string;
  to: string;
  canEdit: boolean;
  target: {
    configured: boolean;
    sales: number;
    recordedGrossProfit: number;
    updatedAt: string | null;
  };
  actual: {
    grossSales: number;
    recordedGrossProfit: number;
    transactionCount: number;
    costCoveragePercent: number;
    profitDataComplete: boolean;
    missingCostSales: number;
  };
  progress: {
    salesPercent: number;
    recordedGrossProfitPercent: number;
  };
  pace: {
    status: 'UPCOMING' | 'ACTIVE' | 'COMPLETE';
    totalDays: number;
    elapsedDays: number;
    remainingDays: number;
    expectedProgressPercent: number;
    salesRemaining: number;
    recordedGrossProfitRemaining: number;
    salesRequiredPerDay: number;
    recordedGrossProfitRequiredPerDay: number;
    projectedSales: number;
    projectedRecordedGrossProfit: number;
  };
}

export interface InventoryMovement {
  id: number;
  movementDate: string;
  reference: string;
  quantity: number;
  origin: string;
  remarks: string;
  quantityBefore: number | null;
  quantityAfter: number | null;
}

export interface InventoryHistoryData {
  item: InventoryRecord;
  items: InventoryMovement[];
  total: number;
  page: number;
  pageSize: number;
  historyAvailable: boolean;
}

export interface ReportExportData {
  fileName: string;
  content: string;
  rowCount: number;
}

export interface CustomerBalanceRecord {
  id: number;
  name: string | null;
  contact: string | null;
  balance: number | null;
  status: string | null;
}

export interface ReceivablesAgingData {
  asOf: string;
  totalReceivables: number;
  customerCount: number;
  invoiceTotal: number;
  reconciliationDifference: number;
  buckets: {
    current: number;
    oneToThirty: number;
    thirtyOneToSixty: number;
    sixtyOneToNinety: number;
    overNinety: number;
    unallocated: number;
  };
  datedInvoiceCount: number;
  unallocatedInvoiceCount: number;
  highestBalances: CustomerBalanceRecord[];
  recentCollections: Array<{
    id: number;
    reference: string;
    customerId: number;
    customer: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    remainingBalance: number;
  }>;
  agingBasis: 'SALE_DATE';
}

export interface CustomerBalanceHistoryData {
  customer: CustomerBalanceRecord;
  openInvoices: Array<{
    id: number;
    reference: string;
    saleDate: string;
    totalAmount: number;
    balance: number;
    payment: string;
    paymentType: string;
  }>;
  payments: Array<{
    id: number;
    reference: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    balanceBefore: number;
    balanceAfter: number;
  }>;
}

export type CustomerInsightsSort = 'SPEND' | 'VISITS' | 'RECENT' | 'BALANCE';

export interface CustomerInsightRecord {
  id: number;
  name: string;
  contact: string;
  balance: number;
  status: string;
  visitCount: number;
  recordedSpend: number;
  averagePurchase: number;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  spendSharePercent: number;
  daysSinceLastPurchase: number | null;
}

export interface CustomerInsightsData extends PagedReportData<CustomerInsightRecord> {
  range: { from: string; to: string };
  rankBy: CustomerInsightsSort;
  summary: {
    customerCount: number;
    repeatCustomerCount: number;
    visitCount: number;
    recordedSpend: number;
    outstandingBalance: number;
    lastPurchaseDate: string;
    averagePurchase: number;
  };
}

export interface CustomerPurchaseHistoryData extends PagedReportData<{
  id: number;
  saleDate: string;
  reference: string;
  payment: string;
  status: string;
  itemCount: number;
  totalAmount: number;
  tenderBalance: number;
}> {
  range: { from: string; to: string };
  customer: {
    id: number;
    name: string;
    contact: string;
    balance: number;
    status: string;
  };
  summary: {
    visitCount: number;
    recordedSpend: number;
    averagePurchase: number;
    firstPurchaseDate: string;
    lastPurchaseDate: string;
  };
}

export interface SaleRecord {
  id: number;
  reference: string | null;
  customer: string | null;
  payment: string | null;
  cashier: string | null;
  itemCount: number | null;
  subtotal: number | null;
  totalAmount: number | null;
  creditPaid: number | null;
  creditBalance: string | null;
  status: string | null;
  discount: number | null;
  category: string | null;
  customerId: number | null;
  paymentType: string | null;
  totalCost: number | null;
  specialDiscount: number | null;
  tender: number | null;
  change: number | null;
  saleDate: string | null;
}

export interface SaleLineRecord {
  id: number;
  reference: string | null;
  itemCode: string | null;
  description: string | null;
  unit: string | null;
  price: number | null;
  total: number | null;
  quantity: number | null;
  discount: number | null;
  status: string | null;
  unitCost: number | null;
  totalCost: number | null;
  saleDate: string | null;
}

export interface SaleDetailsData {
  sale: SaleRecord;
  items: SaleLineRecord[];
  notes: string;
  attachmentStatus: 'NOT_SYNCED' | 'NONE';
}

export interface TransferRecord {
  id: number;
  reference: string | null;
  supplier: string | null;
  destination: string | null;
  type: string | null;
  totalQuantity: number | null;
  totalAmount: number | null;
  encoder: string | null;
  transferDate: string | null;
  status: string | null;
  restockPrice: number | null;
  notes: string | null;
  paymentStatus: string | null;
}

export interface TransferDetailRecord extends TransferRecord {
  invoiceReference: string;
  confirmedAt: string;
  paidAt: string;
  paymentMethod: string;
  paymentReference: string;
  purchaseAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  driverId: number | null;
  driverName: string;
}

export interface TransferLineRecord {
  id: number;
  itemCode: string;
  itemName: string;
  itemSize: string;
  unit: 'FULL' | 'EMPTY';
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface TransferPaymentRecord {
  id: number;
  kind: 'PAYMENT' | 'REFUND';
  amount: number;
  method: string;
  reference: string;
  notes: string;
  paidAt: string;
  recordedBy: string;
}

export interface TransferDetailsData {
  transfer: TransferDetailRecord;
  lines: TransferLineRecord[];
  payments: TransferPaymentRecord[];
  lineItemsAvailable: boolean;
  paymentHistoryAvailable: boolean;
}

export interface RestockRecord {
  id: number;
  reference: string;
  supplier: string;
  transferDate: string;
  receiptStatus: string;
  paymentStatus: string;
  quantity: number;
  purchaseAmount: number;
  payments: number;
  refunds: number;
  netPaid: number;
  outstanding: number;
}

export interface RestockMonitoringData extends PagedReportData<RestockRecord> {
  summary: {
    confirmedRestocks: number;
    receivedQuantity: number;
    purchaseAmount: number;
    supplierPayments: number;
    supplierRefunds: number;
    netSupplierPayments: number;
    outstandingPayables: number;
    cashFlowRestockPayments: number;
    reconciliationDifference: number;
  };
}

export interface ProductPerformanceRecord {
  itemCode: string;
  item: string;
  category: string;
  quantity: number;
  revenue: number;
  recordedCost: number;
  recordedGrossProfit: number;
  missingCostLines: number;
}

export interface ProductPerformanceData {
  summary: {
    quantity: number;
    revenue: number;
    recordedCost: number;
    recordedGrossProfit: number;
    missingCostLines: number;
    costDataComplete: boolean;
  };
  topSelling: ProductPerformanceRecord[];
  slowMoving: ProductPerformanceRecord[];
  categories: Array<{
    category: string;
    quantity: number;
    revenue: number;
    recordedCost: number;
    recordedGrossProfit: number;
  }>;
}

export type ProfitabilitySort = 'PROFIT' | 'MARGIN' | 'REVENUE';

export interface ProfitabilityMetricSummary {
  quantity: number;
  revenue: number;
  recordedCost: number;
  recordedGrossProfit: number;
  recordedMarginPercent: number;
  lineCount: number;
  missingCostLines: number;
  costCoveragePercent: number;
  costDataComplete: boolean;
}

export interface ProfitabilityRecord extends ProfitabilityMetricSummary {
  itemCode: string;
  item: string;
  category: string;
  previousRevenue: number;
  previousRecordedGrossProfit: number;
  previousRecordedMarginPercent: number;
  revenueChange: number;
  recordedGrossProfitChange: number;
  recordedMarginPointChange: number;
  recordedGrossProfitChangePercent: number | null;
}

export interface ProfitabilityCategory extends ProfitabilityMetricSummary {
  category: string;
  previousRevenue: number;
  previousRecordedGrossProfit: number;
  previousRecordedMarginPercent: number;
  revenueChange: number;
  recordedGrossProfitChange: number;
  recordedMarginPointChange: number;
}

export interface ProfitabilityData extends PagedReportData<ProfitabilityRecord> {
  currentRange: { from: string; to: string };
  previousRange: { from: string; to: string };
  rankBy: ProfitabilitySort;
  summary: {
    current: ProfitabilityMetricSummary;
    previous: ProfitabilityMetricSummary;
    revenueChange: number;
    recordedGrossProfitChange: number;
    recordedMarginPointChange: number;
    recordedGrossProfitChangePercent: number | null;
  };
  categories: ProfitabilityCategory[];
}

export interface PaymentAnalysisData {
  summary: {
    paidSales: number;
    paidSaleCount: number;
    unpaidSales: number;
    unpaidSaleCount: number;
    outstandingBalance: number;
    saleReceipts: number;
    creditCollections: number;
    totalReceived: number;
    cashFlowReceipts: number;
    reconciliationDifference: number;
  };
  channels: Array<{
    channel: 'CASH' | 'BANK' | 'E_WALLET' | 'CREDIT' | 'OTHER';
    salesTotal: number;
    saleReceipts: number;
    creditCollections: number;
    totalReceived: number;
  }>;
}

export interface BusinessOverviewData {
  generatedAt: string;
  compatibleSchemaVersion: number | null;
  authorizedStoreCount: number;
  includedStoreCount: number;
  excludedStoreCount: number;
  summary: {
    grossSales: number;
    transactionCount: number;
    recordedGrossProfit: number;
    customerBalance: number;
    netCashFlow: number;
    criticalItems: number;
    outOfStockItems: number;
  };
  stores: Array<{
    id: string;
    code: string;
    name: string;
    schemaVersion: number;
    snapshotCreatedAt: string;
    syncedAt: string | null;
    ageHours: number;
    syncStatus: 'CURRENT' | 'STALE';
    grossSales: number;
    transactionCount: number;
    recordedCost: number;
    recordedGrossProfit: number;
    missingCostSales: number;
    customerBalance: number;
    criticalItems: number;
    outOfStockItems: number;
    overdueBalance: number;
    overdueSaleCount: number;
    highDiscountSaleCount: number;
    netCashFlow: number;
  }>;
  alerts: Array<{
    id: string;
    storeId: string;
    storeName: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    type: 'SYNC' | 'INVENTORY' | 'RECEIVABLE' | 'DISCOUNT' | 'BACKUP';
    title: string;
    detail: string;
    dismissible: boolean;
    amount?: number;
    saleId?: number;
    reference?: string;
    saleDate?: string;
    discountPercent?: number;
  }>;
}
