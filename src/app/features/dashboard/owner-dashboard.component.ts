import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideActivity,
  LucideArrowRight,
  LucideBanknote,
  LucideBookmark,
  LucideBoxes,
  LucideBuilding2,
  LucideCalendarDays,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleAlert,
  LucideDownload,
  LucideEye,
  LucideHistory,
  LucideLogOut,
  LucideMenu,
  LucideRefreshCw,
  LucideSearch,
  LucideSettings,
  LucideShieldCheck,
  LucideShoppingCart,
  LucideTruck,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { PortalApiService } from '../../core/api/portal-api.service';
import { WebAnalyticsCollector } from '../../core/analytics/web-analytics.collector';
import { FreshResponse, PortalStore } from '../../domain/models/portal.models';
import {
  BusinessOverviewData,
  CashFlowData,
  CashFlowSource,
  CashFlowTransactionsData,
  CustomerBalanceHistoryData,
  CustomerBalanceRecord,
  CustomerInsightRecord,
  CustomerInsightsData,
  CustomerInsightsSort,
  CustomerPurchaseHistoryData,
  CustomerReportRecord,
  DashboardPreferencesData,
  DataQualityData,
  DataQualitySale,
  DiscountReportRecord,
  FinancialProductReportRow,
  FinancialReportData,
  InventoryHistoryData,
  InventoryForecastData,
  InventoryForecastRisk,
  InventoryRecord,
  InventoryReportData,
  InventorySummaryReportData,
  ModuleReportData,
  OverviewData,
  OverviewMetricKey,
  PagedModuleReportData,
  PagedReportData,
  PaymentAnalysisData,
  PortalActivityAction,
  PortalActivityData,
  ProfitabilityData,
  ProfitabilityRecord,
  ProfitabilitySort,
  ProductPerformanceData,
  ProductPerformanceRecord,
  PurchaseReportRecord,
  ReportCapabilitiesData,
  ReportExportData,
  ReportFilters,
  ReportView,
  ReceivablesAgingData,
  RestockMonitoringData,
  SaleDetailsData,
  SaleRecord,
  SalesTrendData,
  SalesTrendGrouping,
  SalesTrendPoint,
  SalesTargetData,
  ScheduledReportFrequency,
  ScheduledReportsData,
  SavedDashboardView,
  SavedViewDatePreset,
  SpecialReceiptReportRecord,
  TransferDetailsData,
  TransferRecord,
} from '../../domain/models/report.models';
import { AccountSecurityComponent } from '../security/account-security.component';

@Component({
  selector: 'app-owner-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    AccountSecurityComponent,
    LucideActivity,
    LucideArrowRight,
    LucideBanknote,
    LucideBookmark,
    LucideBoxes,
    LucideBuilding2,
    LucideCalendarDays,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleAlert,
    LucideDownload,
    LucideEye,
    LucideHistory,
    LucideLogOut,
    LucideMenu,
    LucideRefreshCw,
    LucideSearch,
    LucideSettings,
    LucideShieldCheck,
    LucideShoppingCart,
    LucideTruck,
    LucideUsers,
    LucideX,
  ],
  templateUrl: './owner-dashboard.component.html',
  styleUrls: [
    './owner-dashboard.component.css',
    './cash-flow-details.css',
    './inventory-monitoring.css',
    './business-analytics.css',
    './data-quality.css',
    './transfer-details.css',
    './module-reports.css',
    './scheduled-reports.css',
  ],
})
export class OwnerDashboardComponent implements OnInit, OnDestroy {
  private readonly baseNavigation: Array<{ key: ReportView; label: string; icon: string }> = [
    { key: 'overview', label: 'Overview', icon: 'overview' },
    { key: 'sales', label: 'Sales', icon: 'sales' },
    { key: 'sales-targets', label: 'Sales targets', icon: 'sales' },
    { key: 'products', label: 'Product performance', icon: 'inventory' },
    { key: 'profitability', label: 'Profitability', icon: 'cash' },
    { key: 'payments', label: 'Payment analysis', icon: 'cash' },
    { key: 'inventory', label: 'Inventory', icon: 'inventory' },
    { key: 'inventory-forecast', label: 'Reorder planning', icon: 'inventory' },
    { key: 'transfers', label: 'Transfers', icon: 'transfers' },
    { key: 'restocks', label: 'Restocks & suppliers', icon: 'transfers' },
    { key: 'balances', label: 'Customer balances', icon: 'balances' },
    { key: 'customer-insights', label: 'Customer insights', icon: 'balances' },
    { key: 'cash-flow', label: 'Cash flow', icon: 'cash' },
    { key: 'business', label: 'All stores & alerts', icon: 'overview' },
    { key: 'scheduled-reports', label: 'Scheduled reports', icon: 'calendar' },
    { key: 'activity', label: 'Activity log', icon: 'history' },
    { key: 'preferences', label: 'Preferences', icon: 'settings' },
  ];
  authMode: 'login' | 'activate' | 'reset' = 'login';
  sessionInitializing = true;
  username = '';
  password = '';
  activationToken = '';
  resetToken = '';
  authBusy = false;
  authError = '';
  authSuccess = '';
  stores: PortalStore[] = [];
  selectedStoreId = '';
  activeView: ReportView = 'overview';
  sidebarOpen = false;
  securityOpen = false;
  loading = false;
  error = '';
  exporting = false;
  exportError = '';
  exportStatus = '';
  dismissingAlertId = '';
  alertDismissError = '';
  scheduledReports: ScheduledReportsData | null = null;
  scheduleBusy = '';
  scheduleError = '';
  scheduleStatus = '';
  verificationCode = '';
  verificationRequested = false;
  activityLog: PortalActivityData | null = null;
  activityAction: PortalActivityAction | '' = '';
  activityStoreId = '';
  search = '';
  salesStatus = '';
  salesPayment = '';
  salesItemCode = '';
  salesItemName = '';
  inventoryCategory = '';
  inventoryStockStatus = '';
  inventoryForecastCategory = '';
  inventoryForecastRisk = '';
  forecastDays = 14;
  profitabilityCategory = '';
  profitabilitySort: ProfitabilitySort = 'PROFIT';
  customerSort: CustomerInsightsSort = 'SPEND';
  dashboardPreferences: DashboardPreferencesData = {
    overviewMetrics: [
      'GROSS_SALES',
      'RECORDED_GROSS_PROFIT',
      'CUSTOMER_BALANCE',
      'INVENTORY_ALERTS',
    ],
    savedViews: [],
  };
  overviewMetricDraft: OverviewMetricKey[] = [...this.dashboardPreferences.overviewMetrics];
  preferenceBusy = false;
  preferenceError = '';
  preferenceStatus = '';
  resetPreferencesConfirming = false;
  saveViewOpen = false;
  saveViewName = '';
  saveViewDatePreset: SavedViewDatePreset = 'CUSTOM';
  saveViewBusy = false;
  saveViewError = '';
  readonly overviewMetricOptions: Array<{ key: OverviewMetricKey; label: string; detail: string }> =
    [
      { key: 'GROSS_SALES', label: 'Gross sales', detail: 'Sales value and transaction count' },
      {
        key: 'RECORDED_GROSS_PROFIT',
        label: 'Recorded gross profit',
        detail: 'Revenue less synchronized recorded costs',
      },
      {
        key: 'CUSTOMER_BALANCE',
        label: 'Customer balance',
        detail: 'Receivables and accounts with balance',
      },
      {
        key: 'INVENTORY_ALERTS',
        label: 'Inventory alerts',
        detail: 'Critical items and tracked inventory',
      },
    ];
  targetMonth = this.dateOffset(0).slice(0, 7);
  salesTargetDraft = 0;
  profitTargetDraft = 0;
  targetSaving = false;
  targetError = '';
  targetStatus = '';
  response: FreshResponse<any> | null = null;
  reportCapabilities: ReportCapabilitiesData | null = null;
  salesTrendResponse: FreshResponse<SalesTrendData> | null = null;
  trendGrouping: SalesTrendGrouping = 'day';
  trendLoading = false;
  trendError = '';
  receivablesResponse: FreshResponse<ReceivablesAgingData> | null = null;
  receivablesLoading = false;
  receivablesError = '';
  balanceHistoryOpen = false;
  balanceHistoryLoading = false;
  balanceHistoryError = '';
  balanceHistoryResponse: FreshResponse<CustomerBalanceHistoryData> | null = null;
  selectedCustomerId: number | null = null;
  purchaseHistoryOpen = false;
  purchaseHistoryLoading = false;
  purchaseHistoryError = '';
  purchaseHistoryResponse: FreshResponse<CustomerPurchaseHistoryData> | null = null;
  selectedPurchaseCustomerId: number | null = null;
  purchaseHistoryPage = 1;
  saleDetailsOpen = false;
  saleDetailsLoading = false;
  saleDetailsError = '';
  saleDetailsResponse: FreshResponse<SaleDetailsData> | null = null;
  selectedSaleId: number | null = null;
  selectedSaleStoreId = '';
  transferDetailsOpen = false;
  transferDetailsLoading = false;
  transferDetailsError = '';
  transferDetailsResponse: FreshResponse<TransferDetailsData> | null = null;
  selectedTransferId: number | null = null;
  cashFlowDetailsOpen = false;
  cashFlowDetailsLoading = false;
  cashFlowDetailsError = '';
  cashFlowDetailsResponse: FreshResponse<CashFlowTransactionsData> | null = null;
  selectedCashFlowSource: CashFlowSource | null = null;
  selectedCashFlowLabel = '';
  cashFlowDetailsPage = 1;
  inventoryHistoryOpen = false;
  inventoryHistoryLoading = false;
  inventoryHistoryError = '';
  inventoryHistoryResponse: FreshResponse<InventoryHistoryData> | null = null;
  selectedInventoryItemId: number | null = null;
  inventoryHistoryPage = 1;
  dataQualityOpen = false;
  dataQualityLoading = false;
  dataQualityError = '';
  dataQualityResponse: FreshResponse<DataQualityData> | null = null;
  dataQualityPage = 1;
  page = 1;
  from = this.dateOffset(-29);
  to = this.dateOffset(0);
  inventorySummaryDate = this.from;
  private readonly moneyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  });
  private saleDetailsRequest = 0;
  private saleDetailsTrigger: HTMLElement | null = null;
  private transferDetailsRequest = 0;
  private transferDetailsTrigger: HTMLElement | null = null;
  private filterTimer: ReturnType<typeof setTimeout> | null = null;
  private reportRequest = 0;
  private trendRequest = 0;
  private receivablesRequest = 0;
  private balanceHistoryRequest = 0;
  private balanceHistoryTrigger: HTMLElement | null = null;
  private purchaseHistoryRequest = 0;
  private purchaseHistoryTrigger: HTMLElement | null = null;
  private cashFlowDetailsRequest = 0;
  private cashFlowDetailsTrigger: HTMLElement | null = null;
  private inventoryHistoryRequest = 0;
  private inventoryHistoryTrigger: HTMLElement | null = null;
  private dataQualityRequest = 0;
  private dataQualityTrigger: HTMLElement | null = null;
  private documentScrollLocked = false;
  private lockedScrollY = 0;
  private bodyStyleBeforeLock: string | null = null;
  private htmlStyleBeforeLock: string | null = null;

  constructor(
    readonly api: PortalApiService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly analytics: WebAnalyticsCollector,
  ) {}
  async ngOnInit(): Promise<void> {
    const restored = await this.api.restoreSession();
    this.sessionInitializing = false;
    if (restored) {
      await this.loadStores();
      void this.analytics.start(this.analyticsRoute(), this.selectedStoreId);
    }
    this.changeDetector.detectChanges();
  }
  ngOnDestroy(): void {
    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.trendRequest += 1;
    this.receivablesRequest += 1;
    this.balanceHistoryRequest += 1;
    this.purchaseHistoryRequest += 1;
    this.cashFlowDetailsRequest += 1;
    this.inventoryHistoryRequest += 1;
    this.dataQualityRequest += 1;
    this.transferDetailsRequest += 1;
    this.analytics.stop();
    this.unlockDocumentScroll();
  }
  get selectedStore(): PortalStore | null {
    return this.stores.find((store) => store.id === this.selectedStoreId) ?? null;
  }
  get navigation(): Array<{ key: ReportView; label: string; icon: string }> {
    const reports = [...this.baseNavigation];
    const insertAt = reports.findIndex((item) => item.key === 'business');
    const enabledReports: Array<{ key: ReportView; label: string; icon: string }> = [];
    if (this.reportEnabled('discount-report')) {
      enabledReports.push({ key: 'discount-report', label: 'Discount report', icon: 'cash' });
    }
    if (this.reportEnabled('purchase-report')) {
      enabledReports.push({ key: 'purchase-report', label: 'Purchase report', icon: 'transfers' });
    }
    if (this.reportEnabled('special-receipts')) {
      enabledReports.push({ key: 'special-receipts', label: 'Special receipts', icon: 'sales' });
    }
    if (this.reportEnabled('customer-report')) {
      enabledReports.push({ key: 'customer-report', label: 'Customer report', icon: 'balances' });
    }
    if (this.reportEnabled('inventory-summary')) {
      enabledReports.push({ key: 'inventory-summary', label: 'Summary CSV', icon: 'inventory' });
    }
    if (this.reportEnabled('financial-report')) {
      enabledReports.push({ key: 'financial-report', label: 'Financial report', icon: 'cash' });
    }
    reports.splice(insertAt, 0, ...enabledReports);
    return reports;
  }
  get overview(): OverviewData | null {
    return this.activeView === 'overview' ? (this.response?.data as OverviewData) : null;
  }
  get salesTrends(): SalesTrendData | null {
    return this.activeView === 'overview' ? (this.salesTrendResponse?.data ?? null) : null;
  }
  get trendMaximum(): number {
    return Math.max(1, ...(this.salesTrends?.points.map((point) => point.grossSales) ?? [0]));
  }
  get hasTrendActivity(): boolean {
    return Boolean(this.salesTrends?.points.some((point) => point.transactionCount > 0));
  }
  get receivables(): ReceivablesAgingData | null {
    return this.activeView === 'balances' ? (this.receivablesResponse?.data ?? null) : null;
  }
  get customerInsights(): CustomerInsightsData | null {
    return this.activeView === 'customer-insights'
      ? (this.response?.data as CustomerInsightsData)
      : null;
  }
  get inventoryReport(): InventoryReportData | null {
    return this.activeView === 'inventory' ? (this.response?.data as InventoryReportData) : null;
  }
  get inventoryForecast(): InventoryForecastData | null {
    return this.activeView === 'inventory-forecast'
      ? (this.response?.data as InventoryForecastData)
      : null;
  }
  get salesTarget(): SalesTargetData | null {
    return this.activeView === 'sales-targets' ? (this.response?.data as SalesTargetData) : null;
  }
  get restockReport(): RestockMonitoringData | null {
    return this.activeView === 'restocks' ? (this.response?.data as RestockMonitoringData) : null;
  }
  get productPerformance(): ProductPerformanceData | null {
    return this.activeView === 'products' ? (this.response?.data as ProductPerformanceData) : null;
  }
  get profitability(): ProfitabilityData | null {
    return this.activeView === 'profitability' ? (this.response?.data as ProfitabilityData) : null;
  }
  get paymentAnalysis(): PaymentAnalysisData | null {
    return this.activeView === 'payments' ? (this.response?.data as PaymentAnalysisData) : null;
  }
  get businessOverview(): BusinessOverviewData | null {
    return this.activeView === 'business' ? (this.response?.data as BusinessOverviewData) : null;
  }
  get selectedStoreSchedules(): ScheduledReportsData['schedules'] {
    return (
      this.scheduledReports?.schedules.filter(
        (schedule) => schedule.storeId === this.selectedStoreId,
      ) ?? []
    );
  }
  get selectedStoreDeliveries(): ScheduledReportsData['deliveries'] {
    return (
      this.scheduledReports?.deliveries.filter(
        (delivery) => delivery.storeId === this.selectedStoreId,
      ) ?? []
    );
  }
  get inventorySummaryReport(): InventorySummaryReportData | null {
    return this.activeView === 'inventory-summary'
      ? (this.response?.data as InventorySummaryReportData)
      : null;
  }
  get canViewPreviousInventorySummaryDate(): boolean {
    return this.inventorySummaryDate > this.from;
  }
  get canViewNextInventorySummaryDate(): boolean {
    return this.inventorySummaryDate < this.to;
  }
  get financialReport(): FinancialReportData | null {
    return this.activeView === 'financial-report'
      ? (this.response?.data as FinancialReportData)
      : null;
  }
  get discountReport(): PagedModuleReportData<DiscountReportRecord> | null {
    return this.activeView === 'discount-report'
      ? (this.response?.data as PagedModuleReportData<DiscountReportRecord>)
      : null;
  }
  get purchaseReport(): PagedModuleReportData<PurchaseReportRecord> | null {
    return this.activeView === 'purchase-report'
      ? (this.response?.data as PagedModuleReportData<PurchaseReportRecord>)
      : null;
  }
  get specialReceiptReport(): ModuleReportData<SpecialReceiptReportRecord> | null {
    return this.activeView === 'special-receipts'
      ? (this.response?.data as ModuleReportData<SpecialReceiptReportRecord>)
      : null;
  }
  get customerReport(): ModuleReportData<CustomerReportRecord> | null {
    return this.activeView === 'customer-report'
      ? (this.response?.data as ModuleReportData<CustomerReportRecord>)
      : null;
  }
  get financialLpgRows(): FinancialProductReportRow[] {
    return this.financialReport?.productRows.filter((row) => row.isLpgItem) ?? [];
  }
  get financialAssetRows(): FinancialProductReportRow[] {
    return this.financialReport?.productRows.filter((row) => !row.isLpgItem) ?? [];
  }
  get financialLpgGrossAmount(): number {
    return this.financialLpgRows.reduce(
      (total, row) => total + row.salesTotal - row.costOfGoods,
      0,
    );
  }
  get financialAssetGrossAmount(): number {
    return this.financialAssetRows.reduce(
      (total, row) => total + row.salesTotal - row.costOfGoods,
      0,
    );
  }
  get financialAddOn(): number {
    const cash = this.financialReport?.cashFlow;
    return Number(cash?.capitalCashIn ?? 0) + Number(cash?.creditCollections ?? 0);
  }
  get financialExpenses(): number {
    return Number(this.financialReport?.cashFlow.pettyCashOut ?? 0);
  }
  get financialNetAmount(): number {
    return (
      this.financialLpgGrossAmount +
      this.financialAssetGrossAmount +
      this.financialAddOn -
      this.financialExpenses -
      Number(this.financialReport?.cashFlow.salaryPaid ?? 0)
    );
  }
  get pagedData(): PagedReportData<any> | null {
    return ['sales', 'inventory', 'transfers', 'balances', 'restocks'].includes(this.activeView)
      ? (this.response?.data ?? null)
      : null;
  }
  get pagedModuleData(): PagedModuleReportData<unknown> | null {
    if (this.activeView === 'discount-report') return this.discountReport;
    if (this.activeView === 'purchase-report') return this.purchaseReport;
    return null;
  }
  get pageCount(): number {
    const data =
      this.pagedData ??
      this.pagedModuleData ??
      this.inventoryForecast ??
      this.profitability ??
      this.customerInsights ??
      this.activityLog;
    return data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  }
  get hasActiveFilters(): boolean {
    return Boolean(
      this.search.trim() ||
      this.salesStatus ||
      this.salesPayment ||
      this.salesItemCode ||
      this.inventoryCategory ||
      this.inventoryStockStatus ||
      this.inventoryForecastCategory ||
      this.inventoryForecastRisk ||
      this.profitabilityCategory,
    );
  }
  get showReportFilters(): boolean {
    return [
      'sales',
      'inventory',
      'inventory-forecast',
      'profitability',
      'customer-insights',
      'transfers',
      'balances',
      'restocks',
    ].includes(this.activeView);
  }
  get canExport(): boolean {
    return [
      'sales',
      'inventory',
      'inventory-forecast',
      'profitability',
      'customer-insights',
      'transfers',
      'balances',
      'cash-flow',
      'inventory-summary',
      'financial-report',
      'discount-report',
      'purchase-report',
      'special-receipts',
      'customer-report',
    ].includes(this.activeView);
  }
  get canSaveCurrentView(): boolean {
    return !['preferences', 'activity', 'scheduled-reports', 'sales-targets'].includes(
      this.activeView,
    );
  }

  async authenticate(): Promise<void> {
    const credential =
      this.authMode === 'login'
        ? this.username
        : this.authMode === 'activate'
          ? this.activationToken
          : this.resetToken;
    if (!this.password || !credential) return;
    this.authBusy = true;
    this.authError = '';
    this.authSuccess = '';
    try {
      if (this.authMode === 'reset') {
        await this.api.resetPassword(this.resetToken, this.password);
        this.password = '';
        this.resetToken = '';
        this.authMode = 'login';
        this.authSuccess = 'Password updated. Sign in with your new password.';
        return;
      }
      if (this.authMode === 'login') {
        await this.api.login(this.username, this.password);
      } else {
        await this.api.activate(this.activationToken, this.password);
      }
      this.password = '';
      await this.loadStores();
      void this.analytics.start(this.analyticsRoute(), this.selectedStoreId);
    } catch (error) {
      this.authError = this.message(
        error,
        'Sign in failed. Check the account details and server connection.',
      );
    } finally {
      this.authBusy = false;
      this.changeDetector.detectChanges();
    }
  }
  switchAuthMode(mode: 'login' | 'activate' | 'reset'): void {
    this.authMode = mode;
    this.authError = '';
    this.authSuccess = '';
    this.password = '';
  }
  async logout(): Promise<void> {
    this.analytics.stop();
    this.reportRequest += 1;
    this.trendRequest += 1;
    this.receivablesRequest += 1;
    this.balanceHistoryRequest += 1;
    this.purchaseHistoryRequest += 1;
    this.resetFilters();
    await this.api.logout();
    this.stores = [];
    this.selectedStoreId = '';
    this.response = null;
    this.activityLog = null;
    this.reportCapabilities = null;
    this.salesTrendResponse = null;
    this.receivablesResponse = null;
    this.dashboardPreferences = {
      overviewMetrics: [
        'GROSS_SALES',
        'RECORDED_GROSS_PROFIT',
        'CUSTOMER_BALANCE',
        'INVENTORY_ALERTS',
      ],
      savedViews: [],
    };
    this.overviewMetricDraft = [...this.dashboardPreferences.overviewMetrics];
    this.closeSaveView();
    this.dismissBalanceHistory(false);
    this.dismissPurchaseHistory(false);
    this.dismissCashFlowDetails(false);
    this.dismissInventoryHistory(false);
    this.dismissDataQuality(false);
    this.dismissTransferDetails(false);
    this.securityOpen = false;
    this.changeDetector.detectChanges();
  }
  async handleSessionEnded(): Promise<void> {
    this.securityOpen = false;
    await this.logout();
  }
  async loadStores(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.stores = await this.api.stores();
      this.selectedStoreId = this.stores[0]?.id ?? '';
      if (this.selectedStoreId) {
        await this.loadReportCapabilities();
        await this.loadDashboardPreferences();
        await this.loadView();
      }
    } catch (error) {
      this.error = this.message(error, 'Stores could not be loaded.');
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }
  async selectView(view: ReportView): Promise<void> {
    this.trendRequest += 1;
    this.receivablesRequest += 1;
    this.dismissSaleDetails(false);
    this.dismissBalanceHistory(false);
    this.dismissPurchaseHistory(false);
    this.dismissCashFlowDetails(false);
    this.dismissInventoryHistory(false);
    this.dismissDataQuality(false);
    this.dismissTransferDetails(false);
    this.clearExportFeedback();
    this.clearTargetFeedback();
    this.clearPreferenceFeedback();
    this.activeView = view;
    this.resetFilters();
    this.page = 1;
    if (view === 'inventory-summary') this.ensureInventorySummaryDate(true);
    this.sidebarOpen = false;
    this.response = null;
    if (view !== 'activity') this.activityLog = null;
    if (view !== 'overview') this.salesTrendResponse = null;
    if (view !== 'balances') this.receivablesResponse = null;
    await this.loadView();
    this.analytics.feature('REPORT_OPENED', this.analyticsRoute(), this.selectedStoreId);
    this.analytics.pageView(this.analyticsRoute(), this.selectedStoreId);
  }
  async changeStore(): Promise<void> {
    this.trendRequest += 1;
    this.receivablesRequest += 1;
    this.dismissSaleDetails(false);
    this.dismissBalanceHistory(false);
    this.dismissPurchaseHistory(false);
    this.dismissCashFlowDetails(false);
    this.dismissInventoryHistory(false);
    this.dismissDataQuality(false);
    this.dismissTransferDetails(false);
    this.clearExportFeedback();
    this.clearTargetFeedback();
    this.page = 1;
    this.response = null;
    this.salesTrendResponse = null;
    this.receivablesResponse = null;
    await this.loadReportCapabilities();
    if (!this.navigation.some((item) => item.key === this.activeView)) {
      this.activeView = 'overview';
    }
    await this.loadView();
    this.analytics.feature('STORE_CHANGED', this.analyticsRoute(), this.selectedStoreId);
    this.analytics.pageView(this.analyticsRoute(), this.selectedStoreId);
  }
  async changePage(direction: number): Promise<void> {
    const next = this.page + direction;
    if (next < 1 || next > this.pageCount) return;
    this.page = next;
    this.response = null;
    await this.loadView();
  }
  async changeDateRange(): Promise<void> {
    this.page = 1;
    if (this.activeView === 'inventory-summary') this.ensureInventorySummaryDate(true);
    await this.loadView();
    this.analytics.feature('DATE_RANGE_CHANGED', this.analyticsRoute(), this.selectedStoreId);
  }
  async changeActivityFilter(): Promise<void> {
    this.page = 1;
    this.activityLog = null;
    await this.loadView();
  }
  async changeTargetMonth(): Promise<void> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(this.targetMonth)) return;
    this.page = 1;
    this.clearTargetFeedback();
    this.response = null;
    await this.loadView();
  }
  async changeInventorySummaryDate(direction: -1 | 1): Promise<void> {
    const nextDate = this.shiftIsoDate(this.inventorySummaryDate, direction);
    if (nextDate < this.from || nextDate > this.to) return;
    this.inventorySummaryDate = nextDate;
    this.page = 1;
    this.response = null;
    await this.loadView();
  }
  formatSummaryDate(value: string, month: 'long' | 'short' = 'long'): string {
    const [year, monthNumber, day] = value.split('-').map(Number);
    if (!year || !monthNumber || !day) return value || 'Not set';
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month,
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, monthNumber - 1, day)));
  }
  scheduleFilterReload(): void {
    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      this.filterTimer = null;
      void this.applyFilters();
    }, 300);
  }
  async applyFilters(): Promise<void> {
    if (this.filterTimer) {
      clearTimeout(this.filterTimer);
      this.filterTimer = null;
    }
    this.page = 1;
    await this.loadView();
    this.analytics.feature('FILTER_APPLIED', this.analyticsRoute(), this.selectedStoreId);
  }
  async clearFilters(): Promise<void> {
    this.resetFilters();
    this.page = 1;
    await this.loadView();
  }
  isOverviewMetricVisible(metric: OverviewMetricKey): boolean {
    return this.dashboardPreferences.overviewMetrics.includes(metric);
  }
  overviewMetricOrder(metric: OverviewMetricKey): number {
    const index = this.dashboardPreferences.overviewMetrics.indexOf(metric);
    return index < 0 ? 99 : index;
  }
  isOverviewMetricDraftSelected(metric: OverviewMetricKey): boolean {
    return this.overviewMetricDraft.includes(metric);
  }
  toggleOverviewMetric(metric: OverviewMetricKey, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked && !this.overviewMetricDraft.includes(metric)) {
      this.overviewMetricDraft = [...this.overviewMetricDraft, metric];
    } else if (!checked && this.overviewMetricDraft.length > 1) {
      this.overviewMetricDraft = this.overviewMetricDraft.filter((item) => item !== metric);
    } else if (!checked) {
      (event.target as HTMLInputElement).checked = true;
      this.preferenceError = 'Keep at least one overview metric selected.';
    }
  }
  moveOverviewMetric(metric: OverviewMetricKey, direction: -1 | 1): void {
    const from = this.overviewMetricDraft.indexOf(metric);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= this.overviewMetricDraft.length) return;
    const metrics = [...this.overviewMetricDraft];
    [metrics[from], metrics[to]] = [metrics[to], metrics[from]];
    this.overviewMetricDraft = metrics;
  }
  async saveOverviewPreferences(): Promise<void> {
    if (this.preferenceBusy || !this.overviewMetricDraft.length) return;
    this.preferenceBusy = true;
    this.clearPreferenceFeedback();
    try {
      const response = await this.api.updateOverviewPreferences<{
        overviewMetrics: OverviewMetricKey[];
      }>(this.overviewMetricDraft);
      this.dashboardPreferences = {
        ...this.dashboardPreferences,
        overviewMetrics: response.overviewMetrics,
      };
      this.overviewMetricDraft = [...response.overviewMetrics];
      this.preferenceStatus = 'Overview metrics saved.';
    } catch (error) {
      this.preferenceError = this.message(error, 'Overview preferences could not be saved.');
    } finally {
      this.preferenceBusy = false;
      this.changeDetector.detectChanges();
    }
  }
  openSaveView(): void {
    if (!this.canSaveCurrentView) return;
    this.saveViewName = '';
    this.saveViewDatePreset = 'CUSTOM';
    this.saveViewError = '';
    this.saveViewOpen = true;
    this.lockDocumentScroll();
  }
  closeSaveView(): void {
    this.saveViewOpen = false;
    this.saveViewBusy = false;
    this.saveViewError = '';
    this.unlockDocumentScroll();
  }
  async saveCurrentView(): Promise<void> {
    if (!this.selectedStoreId || !this.saveViewName.trim() || this.saveViewBusy) return;
    this.saveViewBusy = true;
    this.saveViewError = '';
    try {
      const saved = await this.api.saveView<SavedDashboardView>({
        name: this.saveViewName.trim(),
        report: this.activeView,
        storeId: this.selectedStoreId,
        datePreset: this.saveViewDatePreset,
        dateFrom: this.saveViewDatePreset === 'CUSTOM' ? this.from : undefined,
        dateTo: this.saveViewDatePreset === 'CUSTOM' ? this.to : undefined,
        filters: this.reportFilters(),
      });
      this.dashboardPreferences = {
        ...this.dashboardPreferences,
        savedViews: [
          saved,
          ...this.dashboardPreferences.savedViews.filter((view) => view.name !== saved.name),
        ],
      };
      this.closeSaveView();
      this.exportStatus = `Saved view “${saved.name}”.`;
    } catch (error) {
      this.saveViewError = this.message(error, 'The current view could not be saved.');
    } finally {
      this.saveViewBusy = false;
      this.changeDetector.detectChanges();
    }
  }
  async applySavedView(view: SavedDashboardView): Promise<void> {
    this.preferenceBusy = true;
    this.clearPreferenceFeedback();
    try {
      this.selectedStoreId = view.storeId;
      await this.loadReportCapabilities();
      if (!this.navigation.some((item) => item.key === view.report)) {
        throw new Error('This report is no longer available for the saved store.');
      }
      this.activeView = view.report;
      this.resetFilters();
      this.applySavedReportFilters(view.filters);
      this.applySavedDatePreset(view);
      this.page = 1;
      this.sidebarOpen = false;
      this.response = null;
      window.scrollTo(0, 0);
      await this.loadView();
      this.analytics.feature('SAVED_VIEW_USED', this.analyticsRoute(), this.selectedStoreId);
      this.analytics.pageView(this.analyticsRoute(), this.selectedStoreId);
    } catch (error) {
      this.preferenceError = this.message(error, 'The saved view could not be opened.');
    } finally {
      this.preferenceBusy = false;
      this.changeDetector.detectChanges();
    }
  }
  async deleteSavedView(view: SavedDashboardView): Promise<void> {
    if (this.preferenceBusy) return;
    this.preferenceBusy = true;
    this.clearPreferenceFeedback();
    try {
      await this.api.deleteSavedView(view.id);
      this.dashboardPreferences = {
        ...this.dashboardPreferences,
        savedViews: this.dashboardPreferences.savedViews.filter((item) => item.id !== view.id),
      };
      this.preferenceStatus = `Deleted “${view.name}”.`;
    } catch (error) {
      this.preferenceError = this.message(error, 'The saved view could not be deleted.');
    } finally {
      this.preferenceBusy = false;
      this.changeDetector.detectChanges();
    }
  }
  async resetDashboardPreferences(): Promise<void> {
    if (!this.resetPreferencesConfirming) {
      this.resetPreferencesConfirming = true;
      this.preferenceStatus = 'Select Confirm reset to remove all saved views.';
      return;
    }
    this.preferenceBusy = true;
    this.clearPreferenceFeedback();
    try {
      this.dashboardPreferences = await this.api.resetPreferences<DashboardPreferencesData>();
      this.overviewMetricDraft = [...this.dashboardPreferences.overviewMetrics];
      this.resetPreferencesConfirming = false;
      this.preferenceStatus = 'Dashboard preferences reset to defaults.';
    } catch (error) {
      this.preferenceError = this.message(error, 'Dashboard preferences could not be reset.');
    } finally {
      this.preferenceBusy = false;
      this.changeDetector.detectChanges();
    }
  }
  reportLabel(report: ReportView): string {
    return this.navigation.find((item) => item.key === report)?.label ?? report;
  }
  savedViewPresetLabel(view: SavedDashboardView): string {
    if (view.datePreset === 'LAST_7_DAYS') return 'Last 7 days';
    if (view.datePreset === 'LAST_30_DAYS') return 'Last 30 days';
    if (view.datePreset === 'THIS_MONTH') return 'This month';
    return `${this.formatSummaryDate(view.dateFrom ?? '', 'short')} to ${this.formatSummaryDate(view.dateTo ?? '', 'short')}`;
  }
  async openProductSales(
    row: Pick<ProductPerformanceRecord | ProfitabilityRecord, 'itemCode' | 'item'>,
  ): Promise<void> {
    this.resetFilters();
    this.activeView = 'sales';
    this.salesItemCode = row.itemCode;
    this.salesItemName = row.item;
    this.page = 1;
    this.response = null;
    this.sidebarOpen = false;
    window.scrollTo(0, 0);
    await this.loadView();
  }
  async openDataQuality(): Promise<void> {
    if (!this.selectedStoreId) return;
    this.dataQualityTrigger = document.activeElement as HTMLElement | null;
    this.lockDocumentScroll();
    this.dataQualityOpen = true;
    this.dataQualityPage = 1;
    await this.loadDataQuality();
  }
  async changeDataQualityPage(direction: number): Promise<void> {
    const data = this.dataQualityResponse?.data;
    if (!data) return;
    const nextPage = this.dataQualityPage + direction;
    if (nextPage < 1 || nextPage > this.dataQualityPageCount(data)) return;
    this.dataQualityPage = nextPage;
    await this.loadDataQuality();
  }
  dataQualityPageCount(data: DataQualityData): number {
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }
  async retryDataQuality(): Promise<void> {
    await this.loadDataQuality();
  }
  closeDataQuality(): void {
    this.dismissDataQuality(true);
  }
  openDataQualitySale(row: Pick<DataQualitySale, 'id'>): void {
    void this.openSaleDetails(row);
  }
  openBusinessAlertSale(alert: BusinessOverviewData['alerts'][number]): void {
    if (!alert.saleId) return;
    void this.openSaleDetails({ id: alert.saleId }, alert.storeId);
  }
  async dismissBusinessAlert(alert: BusinessOverviewData['alerts'][number]): Promise<void> {
    if (!alert.dismissible || this.dismissingAlertId) return;
    this.dismissingAlertId = alert.id;
    this.alertDismissError = '';
    try {
      await this.api.dismissAlert(alert.id, this.from, this.to);
      const current = this.businessOverview;
      if (current) {
        this.response = {
          ...this.response!,
          data: {
            ...current,
            alerts: current.alerts.filter((candidate) => candidate.id !== alert.id),
          },
        };
      }
    } catch (error) {
      this.alertDismissError = this.message(error, 'The alert could not be dismissed.');
    } finally {
      this.dismissingAlertId = '';
      this.changeDetector.detectChanges();
    }
  }
  dataQualitySnapshotStale(): boolean {
    const snapshot = this.dataQualityResponse?.snapshotCreatedAt;
    if (!snapshot) return false;
    return Date.now() - new Date(snapshot).getTime() >= 86_400_000;
  }
  searchPlaceholder(): string {
    if (this.activeView === 'sales') return 'Search reference or customer';
    if (this.activeView === 'inventory') return 'Search item, code, or category';
    if (this.activeView === 'inventory-forecast') return 'Search reorder plan';
    if (this.activeView === 'profitability') return 'Search product or category';
    if (this.activeView === 'customer-insights') return 'Search customer or contact';
    if (this.activeView === 'transfers') return 'Search reference, supplier, or type';
    if (this.activeView === 'restocks') return 'Search reference or supplier';
    return 'Search customer or contact';
  }
  categoryOptions(values: string[] | undefined): string[] {
    const options = new Map<string, string>();
    for (const value of values ?? []) {
      const label = value.trim();
      if (!label) continue;
      const key = label.toLocaleLowerCase();
      if (!options.has(key)) options.set(key, label);
    }
    return [...options.values()].sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' }),
    );
  }
  async loadView(): Promise<void> {
    if (!this.selectedStoreId) return;
    this.clearExportFeedback();
    this.loading = true;
    this.error = '';
    this.alertDismissError = '';
    this.scheduleError = '';
    const requestId = ++this.reportRequest;
    const storeId = this.selectedStoreId;
    const view = this.activeView;
    const page = this.page;
    const filters = this.reportFilters();
    try {
      if (view === 'preferences') {
        await this.loadDashboardPreferences();
        if (requestId !== this.reportRequest) return;
        this.response = null;
        return;
      }
      if (view === 'activity') {
        const activity = await this.api.activityLog<PortalActivityData>(
          this.from,
          this.to,
          page,
          this.activityAction,
          this.activityStoreId,
        );
        if (requestId !== this.reportRequest) return;
        this.activityLog = activity;
        this.response = null;
        return;
      }
      if (view === 'scheduled-reports') {
        const schedules = await this.api.reportSchedules();
        if (requestId !== this.reportRequest) return;
        this.scheduledReports = schedules;
        this.response = null;
        return;
      }
      const response =
        view === 'business'
          ? await this.api.businessOverview<BusinessOverviewData>(this.from, this.to)
          : view === 'sales-targets'
            ? await this.api.salesTarget<SalesTargetData>(storeId, this.targetMonth)
            : view === 'inventory-summary'
              ? await this.loadInventorySummaryReport(storeId)
              : view === 'financial-report'
                ? await this.api.financialReport<FinancialReportData>(storeId, this.from, this.to)
                : this.isSimpleModuleReport(view)
                  ? await this.api.moduleReport<ModuleReportData<unknown>>(
                      storeId,
                      this.moduleReportEndpoint(view),
                      this.from,
                      this.to,
                      this.isPagedModuleReport(view) ? page : undefined,
                    )
                  : view === 'overview'
                    ? await this.api.overview(storeId, this.from, this.to)
                    : view === 'cash-flow'
                      ? await this.api.cashFlow(storeId, this.from, this.to)
                      : view === 'restocks'
                        ? await this.api.restockMonitoring<RestockMonitoringData>(
                            storeId,
                            this.from,
                            this.to,
                            page,
                            this.search,
                          )
                        : view === 'products'
                          ? await this.api.productPerformance<ProductPerformanceData>(
                              storeId,
                              this.from,
                              this.to,
                            )
                          : view === 'profitability'
                            ? await this.api.profitability<ProfitabilityData>(
                                storeId,
                                this.from,
                                this.to,
                                page,
                                filters,
                              )
                            : view === 'customer-insights'
                              ? await this.api.customerInsights<CustomerInsightsData>(
                                  storeId,
                                  this.from,
                                  this.to,
                                  page,
                                  filters,
                                )
                              : view === 'inventory-forecast'
                                ? await this.api.inventoryForecast<InventoryForecastData>(
                                    storeId,
                                    this.from,
                                    this.to,
                                    page,
                                    filters,
                                  )
                                : view === 'payments'
                                  ? await this.api.paymentAnalysis<PaymentAnalysisData>(
                                      storeId,
                                      this.from,
                                      this.to,
                                    )
                                  : await this.api.report(
                                      storeId,
                                      view === 'balances' ? 'customer-balances' : view,
                                      this.from,
                                      this.to,
                                      page,
                                      filters,
                                    );
      if (requestId !== this.reportRequest) return;
      this.response = response;
      if (view === 'sales-targets') this.syncSalesTargetDraft(response.data as SalesTargetData);
      if (view === 'overview') await this.loadSalesTrends();
      if (view === 'balances') await this.loadReceivablesAging();
    } catch (error) {
      if (requestId !== this.reportRequest) return;
      this.response = null;
      this.error = this.message(error, 'The selected report could not be loaded.');
    } finally {
      if (requestId === this.reportRequest) {
        this.loading = false;
        this.changeDetector.detectChanges();
      }
    }
  }
  async saveSalesTarget(): Promise<void> {
    if (!this.selectedStoreId || this.targetSaving || !this.salesTarget?.canEdit) return;
    const salesTarget = Number(this.salesTargetDraft);
    const profitTarget = Number(this.profitTargetDraft);
    if (
      !Number.isFinite(salesTarget) ||
      !Number.isFinite(profitTarget) ||
      salesTarget < 0 ||
      profitTarget < 0
    ) {
      this.targetError = 'Targets must be valid non-negative amounts.';
      return;
    }
    this.targetSaving = true;
    this.clearTargetFeedback();
    try {
      const response = await this.api.updateSalesTarget<SalesTargetData>(
        this.selectedStoreId,
        this.targetMonth,
        salesTarget,
        profitTarget,
      );
      this.response = response;
      this.syncSalesTargetDraft(response.data);
      this.targetStatus = `Targets saved for ${this.formatTargetMonth(this.targetMonth)}.`;
    } catch (error) {
      this.targetError = this.message(error, 'The sales targets could not be saved.');
    } finally {
      this.targetSaving = false;
      this.changeDetector.detectChanges();
    }
  }
  targetProgressWidth(value: number): number {
    return Math.min(100, Math.max(0, Number(value) || 0));
  }
  formatTargetMonth(value: string): string {
    const [year, month] = value.split('-').map(Number);
    if (!year || !month) return value;
    return new Intl.DateTimeFormat('en-PH', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  }
  targetPeriodLabel(status: SalesTargetData['pace']['status']): string {
    if (status === 'ACTIVE') return 'Month in progress';
    if (status === 'COMPLETE') return 'Month complete';
    return 'Upcoming month';
  }
  reportScheduleEnabled(frequency: ScheduledReportFrequency): boolean {
    return Boolean(
      this.selectedStoreSchedules.find((schedule) => schedule.frequency === frequency)?.enabled,
    );
  }
  reportScheduleNextRun(frequency: ScheduledReportFrequency): string | null {
    return (
      this.selectedStoreSchedules.find((schedule) => schedule.frequency === frequency)?.nextRunAt ??
      null
    );
  }
  async updateReportSchedule(frequency: ScheduledReportFrequency, enabled: boolean): Promise<void> {
    if (!this.selectedStoreId || this.scheduleBusy) return;
    this.scheduleBusy = frequency;
    this.scheduleError = '';
    this.scheduleStatus = '';
    try {
      const schedule = await this.api.updateReportSchedule(
        this.selectedStoreId,
        frequency,
        enabled,
      );
      if (this.scheduledReports) {
        this.scheduledReports = {
          ...this.scheduledReports,
          schedules: [
            ...this.scheduledReports.schedules.filter(
              (candidate) =>
                candidate.storeId !== schedule.storeId ||
                candidate.frequency !== schedule.frequency,
            ),
            schedule,
          ],
        };
      }
      this.scheduleStatus = `${frequency === 'DAILY' ? 'Daily' : 'Weekly'} delivery ${
        enabled ? 'enabled' : 'disabled'
      }.`;
    } catch (error) {
      this.scheduleError = this.message(error, 'The report schedule could not be updated.');
    } finally {
      this.scheduleBusy = '';
      this.changeDetector.detectChanges();
    }
  }
  async requestReportEmailVerification(): Promise<void> {
    if (this.scheduleBusy) return;
    this.scheduleBusy = 'verification';
    this.scheduleError = '';
    this.scheduleStatus = '';
    try {
      await this.api.requestReportEmailVerification();
      this.verificationRequested = true;
      this.scheduleStatus = `A six-digit code was sent to ${this.scheduledReports?.recipientEmail}.`;
    } catch (error) {
      this.scheduleError = this.message(error, 'The verification code could not be sent.');
    } finally {
      this.scheduleBusy = '';
      this.changeDetector.detectChanges();
    }
  }
  async confirmReportEmailVerification(): Promise<void> {
    if (this.scheduleBusy || this.verificationCode.length !== 6) return;
    this.scheduleBusy = 'verification';
    this.scheduleError = '';
    this.scheduleStatus = '';
    try {
      await this.api.confirmReportEmailVerification(this.verificationCode);
      this.verificationCode = '';
      this.verificationRequested = false;
      this.scheduledReports = await this.api.reportSchedules();
      this.scheduleStatus = 'Email address verified. Scheduled delivery is now available.';
    } catch (error) {
      this.scheduleError = this.message(error, 'The verification code could not be confirmed.');
    } finally {
      this.scheduleBusy = '';
      this.changeDetector.detectChanges();
    }
  }
  async changeTrendGrouping(grouping: SalesTrendGrouping): Promise<void> {
    if (this.trendGrouping === grouping) return;
    this.trendGrouping = grouping;
    await this.loadSalesTrends();
  }
  async loadSalesTrends(): Promise<void> {
    if (!this.selectedStoreId || this.activeView !== 'overview') return;
    const requestId = ++this.trendRequest;
    const storeId = this.selectedStoreId;
    const from = this.from;
    const to = this.to;
    const grouping = this.trendGrouping;
    this.trendLoading = true;
    this.trendError = '';
    try {
      const response = await this.api.salesTrends<SalesTrendData>(storeId, from, to, grouping);
      if (requestId !== this.trendRequest || this.activeView !== 'overview') return;
      this.salesTrendResponse = response;
    } catch (error) {
      if (requestId !== this.trendRequest || this.activeView !== 'overview') return;
      this.trendError = this.message(error, 'Sales trends could not be loaded.');
    } finally {
      if (requestId === this.trendRequest) {
        this.trendLoading = false;
        this.changeDetector.detectChanges();
      }
    }
  }
  trendBarHeight(point: SalesTrendPoint): number {
    if (point.grossSales <= 0) return 0;
    return Math.max(4, Math.round((point.grossSales / this.trendMaximum) * 100));
  }
  agingPercent(value: number, total: number): number {
    if (total <= 0 || value <= 0) return 0;
    return Math.min(100, Math.round((value / total) * 100));
  }
  comparisonPercent(current: number, previous: number): number | null {
    if (previous === 0) return current === 0 ? 0 : null;
    return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
  }
  comparisonText(current: number, previous: number): string {
    const percent = this.comparisonPercent(current, previous);
    if (percent === null) return 'New activity';
    if (percent === 0) return 'No change';
    return `${Math.abs(percent).toFixed(1)}% ${percent > 0 ? 'higher' : 'lower'}`;
  }
  comparisonDirection(current: number, previous: number): 'up' | 'down' | 'same' {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'same';
  }
  profitabilityChangeText(value: number | null): string {
    if (value === null) return 'New activity';
    if (value === 0) return 'No change';
    return `${Math.abs(value).toFixed(1)}% ${value > 0 ? 'higher' : 'lower'}`;
  }
  signedMoney(value: number): string {
    if (value === 0) return this.formatMoney(0);
    return `${value > 0 ? '+' : '−'}${this.formatMoney(Math.abs(value))}`;
  }
  signedPoints(value: number): string {
    if (value === 0) return '0.0 pts';
    return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)} pts`;
  }
  async loadReceivablesAging(): Promise<void> {
    if (!this.selectedStoreId || this.activeView !== 'balances') return;
    const requestId = ++this.receivablesRequest;
    const storeId = this.selectedStoreId;
    const asOf = this.to;
    this.receivablesLoading = true;
    this.receivablesError = '';
    try {
      const response = await this.api.receivablesAging<ReceivablesAgingData>(storeId, asOf);
      if (requestId !== this.receivablesRequest || this.activeView !== 'balances') return;
      this.receivablesResponse = response;
    } catch (error) {
      if (requestId !== this.receivablesRequest || this.activeView !== 'balances') return;
      this.receivablesError = this.message(error, 'Receivables aging could not be loaded.');
    } finally {
      if (requestId === this.receivablesRequest) {
        this.receivablesLoading = false;
        this.changeDetector.detectChanges();
      }
    }
  }
  async openCustomerBalance(row: Pick<CustomerBalanceRecord, 'id'>): Promise<void> {
    if (!this.selectedStoreId || !Number.isInteger(Number(row.id))) return;
    this.balanceHistoryTrigger = document.activeElement as HTMLElement | null;
    this.lockDocumentScroll();
    this.balanceHistoryOpen = true;
    this.selectedCustomerId = Number(row.id);
    this.balanceHistoryLoading = true;
    this.balanceHistoryError = '';
    this.balanceHistoryResponse = null;
    const requestId = ++this.balanceHistoryRequest;
    const storeId = this.selectedStoreId;
    try {
      const response = await this.api.customerBalanceHistory<CustomerBalanceHistoryData>(
        storeId,
        this.selectedCustomerId,
      );
      if (requestId !== this.balanceHistoryRequest || !this.balanceHistoryOpen) return;
      this.balanceHistoryResponse = response;
    } catch (error) {
      if (requestId !== this.balanceHistoryRequest || !this.balanceHistoryOpen) return;
      this.balanceHistoryError = this.message(
        error,
        'Customer balance history could not be loaded.',
      );
    } finally {
      if (requestId === this.balanceHistoryRequest) {
        this.balanceHistoryLoading = false;
        this.changeDetector.detectChanges();
      }
    }
  }
  openReportRow(row: Record<string, any>, event?: Event): void {
    if (this.activeView === 'sales') {
      event?.preventDefault();
      void this.openSaleDetails(row as SaleRecord);
      return;
    }
    if (this.activeView === 'balances') {
      event?.preventDefault();
      void this.openCustomerBalance(row as CustomerBalanceRecord);
      return;
    }
    if (this.activeView === 'inventory') {
      event?.preventDefault();
      void this.openInventoryHistory(row as InventoryRecord);
      return;
    }
    if (this.activeView === 'transfers') {
      event?.preventDefault();
      void this.openTransferDetails(row as TransferRecord);
    }
  }
  async retryCustomerBalanceHistory(): Promise<void> {
    if (this.selectedCustomerId === null) return;
    await this.openCustomerBalance({ id: this.selectedCustomerId });
  }
  closeCustomerBalanceHistory(): void {
    this.dismissBalanceHistory(true);
  }
  async openCustomerPurchaseHistory(row: Pick<CustomerInsightRecord, 'id'>): Promise<void> {
    if (!this.selectedStoreId || !Number.isInteger(Number(row.id))) return;
    this.purchaseHistoryTrigger = document.activeElement as HTMLElement | null;
    this.lockDocumentScroll();
    this.purchaseHistoryOpen = true;
    this.selectedPurchaseCustomerId = Number(row.id);
    this.purchaseHistoryPage = 1;
    await this.loadCustomerPurchaseHistory();
  }
  async changeCustomerPurchaseHistoryPage(direction: number): Promise<void> {
    const data = this.purchaseHistoryResponse?.data;
    if (!data) return;
    const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
    const nextPage = this.purchaseHistoryPage + direction;
    if (nextPage < 1 || nextPage > pageCount) return;
    this.purchaseHistoryPage = nextPage;
    await this.loadCustomerPurchaseHistory();
  }
  customerPurchaseHistoryPageCount(data: CustomerPurchaseHistoryData): number {
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }
  async retryCustomerPurchaseHistory(): Promise<void> {
    await this.loadCustomerPurchaseHistory();
  }
  closeCustomerPurchaseHistory(): void {
    this.dismissPurchaseHistory(true);
  }
  async exportCurrentReport(): Promise<void> {
    if (!this.selectedStoreId || !this.canExport || this.exporting) return;
    this.exporting = true;
    let exportSucceeded = false;
    this.clearExportFeedback();
    const report = this.activeView === 'balances' ? 'customer-balances' : this.activeView;
    try {
      if (this.activeView === 'inventory-summary' && this.inventorySummaryReport) {
        const data = this.inventorySummaryReport;
        const rows: Array<Array<string | number>> = [
          ['Inventory monitoring summary'],
          [`Date from: ${this.from}`, `Date to: ${this.to}`],
          [`Report date: ${this.inventorySummaryDate}`],
          [`Opening count: ${data.openingSnapshotDate || 'Not recorded'}`],
          [`Actual count: ${data.actualSnapshotDate || 'Not recorded'}`],
          [],
          [
            'Item code',
            'Item',
            'Opening filled',
            'Opening empty',
            'Opening total',
            'Deliveries',
            'Sales',
            'Refill',
            'Pull out',
            'Defective',
            'Backload',
            'Actual filled',
            'Actual empty',
            'Actual total',
          ],
          ...data.rows.map((row) => [
            row.itemCode,
            row.itemName,
            row.openingFilled,
            row.openingEmpty,
            row.openingFilled + row.openingEmpty,
            row.deliveries,
            row.sales,
            row.refill,
            row.pullOut,
            row.defective,
            row.backload,
            row.actualFilled,
            row.actualEmpty,
            row.actualFilled + row.actualEmpty,
          ]),
        ];
        this.downloadLocalCsv(`inventory-summary-${this.inventorySummaryDate}.csv`, rows);
        this.exportStatus = `Exported ${data.rows.length} ${data.rows.length === 1 ? 'record' : 'records'}.`;
        exportSucceeded = true;
        return;
      }
      if (this.activeView === 'financial-report' && this.financialReport) {
        const data = this.financialReport;
        const productRows = (label: string, items: FinancialProductReportRow[]) => [
          [label],
          [
            'Product',
            'Opening qty',
            'Opening cost',
            'Delivery qty',
            'Delivery cost',
            'Closing qty',
            'COGS qty',
            'COGS amount',
            'Actual sales qty',
            'Actual sales',
          ],
          ...items.map((row) => [
            `${row.itemCode} ${row.itemName}`.trim(),
            row.openingQuantity,
            row.openingTotal,
            row.deliveredQuantity,
            row.deliveredTotal,
            row.closingQuantity,
            row.computedCogsQuantity,
            row.costOfGoods,
            row.salesQuantity,
            row.salesTotal,
          ]),
          [],
        ];
        const rows: Array<Array<string | number>> = [
          ['Financial report'],
          [`Date from: ${this.from}`, `Date to: ${this.to}`],
          [`Opening count: ${data.openingSnapshotDate || 'Not recorded'}`],
          [`Actual count: ${data.actualSnapshotDate || 'Not recorded'}`],
          [],
          ...productRows('LPG products with size', this.financialLpgRows),
          ...productRows('Assets and products without size', this.financialAssetRows),
          ['Main layout', 'Amount'],
          ['Gross amount', this.financialLpgGrossAmount],
          ['Gross amount asset', this.financialAssetGrossAmount],
          ['Add-on', this.financialAddOn],
          ['Expenses', this.financialExpenses],
          ['Total salary', data.cashFlow.salaryPaid],
          ['Net amount', this.financialNetAmount],
        ];
        this.downloadLocalCsv(`financial-report-${this.from}-to-${this.to}.csv`, rows);
        this.exportStatus = `Exported ${data.productRows.length} ${data.productRows.length === 1 ? 'product' : 'products'}.`;
        exportSucceeded = true;
        return;
      }
      if (this.activeView === 'discount-report' && this.discountReport) {
        const data = this.discountReport;
        const items = await this.loadAllPagedModuleItems('discount-report', data);
        this.downloadLocalCsv(`discount-report-${this.from}-to-${this.to}.csv`, [
          ['Discount history'],
          [`Date from: ${this.from}`, `Date to: ${this.to}`],
          [],
          ['Date', 'Reference', 'Customer', 'Cashier', 'Regular', 'Special', 'Total'],
          ...items.map((row) => [
            row.salesDate,
            row.reference,
            row.customer,
            row.cashier,
            row.regularDiscount,
            row.specialDiscount,
            row.totalDiscount,
          ]),
        ]);
        this.exportStatus = `Exported ${items.length} ${items.length === 1 ? 'record' : 'records'}.`;
        exportSucceeded = true;
        return;
      }
      if (this.activeView === 'purchase-report' && this.purchaseReport) {
        const data = this.purchaseReport;
        const items = await this.loadAllPagedModuleItems('purchase-report', data);
        this.downloadLocalCsv(`purchase-report-${this.from}-to-${this.to}.csv`, [
          ['Purchase history'],
          [`Date from: ${this.from}`, `Date to: ${this.to}`],
          [],
          ['Date', 'Reference', 'Supplier', 'Driver', 'Type', 'Items', 'Purchase amount'],
          ...items.map((row) => [
            row.purchaseDate,
            row.reference,
            row.supplier,
            row.driver,
            row.purchaseType,
            row.totalQuantity,
            row.totalAmount,
          ]),
        ]);
        this.exportStatus = `Exported ${items.length} ${items.length === 1 ? 'record' : 'records'}.`;
        exportSucceeded = true;
        return;
      }
      if (this.activeView === 'special-receipts' && this.specialReceiptReport) {
        const data = this.specialReceiptReport;
        this.downloadLocalCsv(`special-receipts-${this.from}-to-${this.to}.csv`, [
          ['Special receipts'],
          [`Date from: ${this.from}`, `Date to: ${this.to}`],
          [],
          ['Date', 'Reference', 'Customer', 'Sale type', 'Items', 'Payment', 'Cashier', 'Total'],
          ...data.items.map((row) => [
            row.salesDate,
            row.reference,
            row.customer,
            row.saleType,
            row.itemCount,
            row.paymentMethod,
            row.cashier,
            row.totalAmount,
          ]),
        ]);
        this.exportStatus = `Exported ${data.items.length} ${data.items.length === 1 ? 'record' : 'records'}.`;
        exportSucceeded = true;
        return;
      }
      if (this.activeView === 'customer-report' && this.customerReport) {
        const data = this.customerReport;
        this.downloadLocalCsv(`customer-report-${this.from}-to-${this.to}.csv`, [
          ['Customer sales'],
          [`Date from: ${this.from}`, `Date to: ${this.to}`],
          [],
          ['Date', 'Reference', 'Customer', 'Address', 'Group', 'Items', 'Net sales'],
          ...data.items.map((row) => [
            row.salesDate,
            row.reference,
            row.customer,
            row.address,
            row.groupName,
            row.itemCount,
            row.totalAmount,
          ]),
        ]);
        this.exportStatus = `Exported ${data.items.length} ${data.items.length === 1 ? 'record' : 'records'}.`;
        exportSucceeded = true;
        return;
      }
      const response = await this.api.exportReport<ReportExportData>(
        this.selectedStoreId,
        report,
        this.from,
        this.to,
        this.reportFilters(),
      );
      this.downloadCsv(response.data);
      this.exportStatus = `Exported ${response.data.rowCount} ${
        response.data.rowCount === 1 ? 'record' : 'records'
      }.`;
      exportSucceeded = true;
    } catch (error) {
      this.exportError = this.message(error, 'The CSV export could not be created.');
    } finally {
      if (exportSucceeded) {
        this.analytics.feature('REPORT_EXPORTED', this.analyticsRoute(), this.selectedStoreId);
      }
      this.exporting = false;
      this.changeDetector.detectChanges();
    }
  }
  async openSaleDetails(
    row: Pick<SaleRecord, 'id'>,
    storeId = this.selectedStoreId,
  ): Promise<void> {
    if (!storeId || !Number.isInteger(Number(row.id))) return;
    this.saleDetailsTrigger = document.activeElement as HTMLElement | null;
    this.lockDocumentScroll();
    this.saleDetailsOpen = true;
    this.selectedSaleId = Number(row.id);
    this.selectedSaleStoreId = storeId;
    this.saleDetailsLoading = true;
    this.saleDetailsError = '';
    this.saleDetailsResponse = null;
    const requestId = ++this.saleDetailsRequest;
    try {
      const response = await this.api.saleDetails<SaleDetailsData>(storeId, this.selectedSaleId);
      if (requestId !== this.saleDetailsRequest || !this.saleDetailsOpen) return;
      this.saleDetailsResponse = response;
    } catch (error) {
      if (requestId !== this.saleDetailsRequest || !this.saleDetailsOpen) return;
      this.saleDetailsError = this.message(error, 'Sale details could not be loaded.');
    } finally {
      if (requestId === this.saleDetailsRequest) {
        this.saleDetailsLoading = false;
        this.changeDetector.detectChanges();
      }
    }
  }
  async retrySaleDetails(): Promise<void> {
    if (this.selectedSaleId === null || !this.selectedSaleStoreId) return;
    await this.openSaleDetails({ id: this.selectedSaleId }, this.selectedSaleStoreId);
  }
  closeSaleDetails(): void {
    this.dismissSaleDetails(true);
  }
  async openTransferDetails(row: Pick<TransferRecord, 'id'>): Promise<void> {
    if (!this.selectedStoreId || !Number.isInteger(Number(row.id))) return;
    this.transferDetailsTrigger = document.activeElement as HTMLElement | null;
    this.lockDocumentScroll();
    this.transferDetailsOpen = true;
    this.selectedTransferId = Number(row.id);
    this.transferDetailsLoading = true;
    this.transferDetailsError = '';
    this.transferDetailsResponse = null;
    const requestId = ++this.transferDetailsRequest;
    const storeId = this.selectedStoreId;
    try {
      const response = await this.api.transferDetails<TransferDetailsData>(
        storeId,
        this.selectedTransferId,
      );
      if (requestId !== this.transferDetailsRequest || !this.transferDetailsOpen) return;
      this.transferDetailsResponse = response;
    } catch (error) {
      if (requestId !== this.transferDetailsRequest || !this.transferDetailsOpen) return;
      this.transferDetailsError = this.message(error, 'Transfer details could not be loaded.');
    } finally {
      if (requestId === this.transferDetailsRequest) {
        this.transferDetailsLoading = false;
        this.changeDetector.detectChanges();
      }
    }
  }
  async retryTransferDetails(): Promise<void> {
    if (this.selectedTransferId === null) return;
    await this.openTransferDetails({ id: this.selectedTransferId });
  }
  closeTransferDetails(): void {
    this.dismissTransferDetails(true);
  }
  transferIsInboundRestock(type: string | null | undefined): boolean {
    return type === 'RESTOCK IN' || type === 'W.RESTOCK IN';
  }
  transferUsesSplitTables(type: string | null | undefined): boolean {
    return Boolean(type) && type !== 'IN' && type !== 'OUT';
  }
  transferLinesByUnit(data: TransferDetailsData, unit: 'FULL' | 'EMPTY') {
    return data.lines.filter((line) => line.unit === unit);
  }
  transferUnitTotal(data: TransferDetailsData, unit: 'FULL' | 'EMPTY'): number {
    return this.transferLinesByUnit(data, unit).reduce(
      (total, line) => total + Number(line.quantity || 0),
      0,
    );
  }
  @HostListener('document:keydown.escape')
  closeSaleDetailsOnEscape(): void {
    if (this.saveViewOpen) {
      this.closeSaveView();
    } else if (this.purchaseHistoryOpen) {
      this.closeCustomerPurchaseHistory();
    } else if (this.transferDetailsOpen) {
      this.closeTransferDetails();
    } else if (this.inventoryHistoryOpen) {
      this.closeInventoryHistory();
    } else if (this.cashFlowDetailsOpen) {
      this.closeCashFlowDetails();
    } else if (this.balanceHistoryOpen) {
      this.closeCustomerBalanceHistory();
    } else if (this.saleDetailsOpen) {
      this.closeSaleDetails();
    } else if (this.dataQualityOpen) {
      this.closeDataQuality();
    }
  }
  saleDiscountTotal(sale: SaleRecord): number {
    return this.numberValue(sale.discount) + this.numberValue(sale.specialDiscount);
  }
  saleRecordedProfit(sale: SaleRecord): number {
    return this.numberValue(sale.totalAmount) - this.numberValue(sale.totalCost);
  }
  formatMoney(value: unknown): string {
    return this.moneyFormatter.format(this.numberValue(value));
  }
  paymentChannelLabel(channel: string): string {
    const labels: Record<string, string> = {
      CASH: 'Cash',
      BANK: 'Bank',
      E_WALLET: 'E-wallet',
      CREDIT: 'Credit',
      OTHER: 'Other',
    };
    return labels[channel] ?? channel;
  }
  cashInTotal(cash: CashFlowData): number {
    return (
      Number(cash.salesReceipts || 0) +
      Number(cash.creditCollections || 0) +
      Number(cash.capitalCashIn || 0)
    );
  }
  cashOutTotal(cash: CashFlowData): number {
    return (
      Number(cash.pettyCashOut || 0) +
      Number(cash.restockPayments || 0) +
      Number(cash.salaryPaid || 0)
    );
  }
  async openCashFlowDetails(source: CashFlowSource, label: string): Promise<void> {
    if (!this.selectedStoreId) return;
    this.cashFlowDetailsTrigger = document.activeElement as HTMLElement | null;
    this.lockDocumentScroll();
    this.cashFlowDetailsOpen = true;
    this.selectedCashFlowSource = source;
    this.selectedCashFlowLabel = label;
    this.cashFlowDetailsPage = 1;
    await this.loadCashFlowDetails();
  }
  async changeCashFlowDetailsPage(direction: number): Promise<void> {
    const data = this.cashFlowDetailsResponse?.data;
    if (!data) return;
    const pageCount = Math.max(1, Math.ceil(data.total / data.pageSize));
    const nextPage = this.cashFlowDetailsPage + direction;
    if (nextPage < 1 || nextPage > pageCount) return;
    this.cashFlowDetailsPage = nextPage;
    await this.loadCashFlowDetails();
  }
  async retryCashFlowDetails(): Promise<void> {
    await this.loadCashFlowDetails();
  }
  closeCashFlowDetails(): void {
    this.dismissCashFlowDetails(true);
  }
  cashFlowDetailsPageCount(data: CashFlowTransactionsData): number {
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }
  cashFlowReconciled(data: CashFlowTransactionsData): boolean {
    return Math.abs(Number(data.reconciliationDifference || 0)) < 0.005;
  }
  async openInventoryHistory(row: Pick<InventoryRecord, 'id'>): Promise<void> {
    if (!this.selectedStoreId || !Number.isInteger(Number(row.id))) return;
    this.inventoryHistoryTrigger = document.activeElement as HTMLElement | null;
    this.lockDocumentScroll();
    this.inventoryHistoryOpen = true;
    this.selectedInventoryItemId = Number(row.id);
    this.inventoryHistoryPage = 1;
    await this.loadInventoryHistory();
  }
  async changeInventoryHistoryPage(direction: number): Promise<void> {
    const data = this.inventoryHistoryResponse?.data;
    if (!data) return;
    const nextPage = this.inventoryHistoryPage + direction;
    if (nextPage < 1 || nextPage > this.inventoryHistoryPageCount(data)) return;
    this.inventoryHistoryPage = nextPage;
    await this.loadInventoryHistory();
  }
  inventoryHistoryPageCount(data: InventoryHistoryData): number {
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }
  async retryInventoryHistory(): Promise<void> {
    await this.loadInventoryHistory();
  }
  closeInventoryHistory(): void {
    this.dismissInventoryHistory(true);
  }
  inventoryStatusLabel(status: string | null | undefined): string {
    if (status === 'OUT_OF_STOCK') return 'Out of stock';
    if (status === 'CRITICAL') return 'Critical';
    return 'Healthy';
  }
  inventoryForecastRiskLabel(risk: InventoryForecastRisk): string {
    if (risk === 'OUT_OF_STOCK') return 'Out of stock';
    if (risk === 'REORDER_NOW') return 'Reorder now';
    if (risk === 'WATCH') return 'Watch';
    if (risk === 'NO_RECENT_SALES') return 'No recent sales';
    return 'Healthy';
  }
  title(): string {
    return this.navigation.find((item) => item.key === this.activeView)?.label ?? 'Overview';
  }
  private reportEnabled(report: ReportCapabilitiesData['reports'][number]): boolean {
    return Boolean(
      this.reportCapabilities?.available && this.reportCapabilities.reports.includes(report),
    );
  }
  private isSimpleModuleReport(
    view: ReportView,
  ): view is 'discount-report' | 'purchase-report' | 'special-receipts' | 'customer-report' {
    return ['discount-report', 'purchase-report', 'special-receipts', 'customer-report'].includes(
      view,
    );
  }
  private isPagedModuleReport(view: ReportView): view is 'discount-report' | 'purchase-report' {
    return view === 'discount-report' || view === 'purchase-report';
  }
  private moduleReportEndpoint(
    view: 'discount-report' | 'purchase-report' | 'special-receipts' | 'customer-report',
  ): string {
    return {
      'discount-report': 'discounts',
      'purchase-report': 'purchases',
      'special-receipts': 'special-receipts',
      'customer-report': 'customers',
    }[view];
  }
  private async loadAllPagedModuleItems<T>(
    view: 'discount-report' | 'purchase-report',
    current: PagedModuleReportData<T>,
  ): Promise<T[]> {
    if (current.page === 1 && current.items.length >= current.total) return current.items;
    if (!this.selectedStoreId) return [];
    const pageSize = 100;
    const first = await this.api.moduleReport<PagedModuleReportData<T>>(
      this.selectedStoreId,
      this.moduleReportEndpoint(view),
      this.from,
      this.to,
      1,
      pageSize,
    );
    const items = [...first.data.items];
    const pages = Math.ceil(first.data.total / first.data.pageSize);
    for (let page = 2; page <= pages; page += 1) {
      const response = await this.api.moduleReport<PagedModuleReportData<T>>(
        this.selectedStoreId,
        this.moduleReportEndpoint(view),
        this.from,
        this.to,
        page,
        pageSize,
      );
      items.push(...response.data.items);
    }
    return items;
  }
  private async loadReportCapabilities(): Promise<void> {
    this.reportCapabilities = null;
    if (!this.selectedStoreId) return;
    try {
      const response = await this.api.reportCapabilities<ReportCapabilitiesData>(
        this.selectedStoreId,
      );
      this.reportCapabilities = response.data;
    } catch {
      this.reportCapabilities = null;
    }
  }
  private async loadDashboardPreferences(): Promise<void> {
    try {
      const preferences = await this.api.preferences<DashboardPreferencesData>();
      this.dashboardPreferences = preferences;
      this.overviewMetricDraft = [...preferences.overviewMetrics];
    } catch (error) {
      if (this.activeView === 'preferences') {
        this.preferenceError = this.message(error, 'Dashboard preferences could not be loaded.');
      }
    }
  }
  freshnessAge(): string {
    if (!this.response?.snapshotCreatedAt) return 'No synchronized data';
    const hours = Math.max(
      0,
      Math.floor((Date.now() - new Date(this.response.snapshotCreatedAt).getTime()) / 3_600_000),
    );
    return hours < 1
      ? 'Updated within the hour'
      : hours === 1
        ? 'Updated 1 hour ago'
        : `Updated ${hours} hours ago`;
  }
  private dateOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  private dismissSaleDetails(restoreFocus: boolean): void {
    const trigger = this.saleDetailsTrigger;
    this.saleDetailsRequest += 1;
    this.saleDetailsOpen = false;
    this.saleDetailsLoading = false;
    this.saleDetailsError = '';
    this.saleDetailsResponse = null;
    this.selectedSaleId = null;
    this.selectedSaleStoreId = '';
    this.saleDetailsTrigger = null;
    if (
      !this.balanceHistoryOpen &&
      !this.cashFlowDetailsOpen &&
      !this.inventoryHistoryOpen &&
      !this.transferDetailsOpen &&
      !this.dataQualityOpen
    )
      this.unlockDocumentScroll();
    if (restoreFocus && trigger) queueMicrotask(() => trigger.focus());
  }
  private dismissTransferDetails(restoreFocus: boolean): void {
    const trigger = this.transferDetailsTrigger;
    this.transferDetailsRequest += 1;
    this.transferDetailsOpen = false;
    this.transferDetailsLoading = false;
    this.transferDetailsError = '';
    this.transferDetailsResponse = null;
    this.selectedTransferId = null;
    this.transferDetailsTrigger = null;
    if (
      !this.saleDetailsOpen &&
      !this.balanceHistoryOpen &&
      !this.cashFlowDetailsOpen &&
      !this.inventoryHistoryOpen &&
      !this.dataQualityOpen
    )
      this.unlockDocumentScroll();
    if (restoreFocus && trigger) queueMicrotask(() => trigger.focus());
  }
  private dismissBalanceHistory(restoreFocus: boolean): void {
    const trigger = this.balanceHistoryTrigger;
    this.balanceHistoryRequest += 1;
    this.balanceHistoryOpen = false;
    this.balanceHistoryLoading = false;
    this.balanceHistoryError = '';
    this.balanceHistoryResponse = null;
    this.selectedCustomerId = null;
    this.balanceHistoryTrigger = null;
    if (
      !this.saleDetailsOpen &&
      !this.cashFlowDetailsOpen &&
      !this.inventoryHistoryOpen &&
      !this.transferDetailsOpen &&
      !this.dataQualityOpen
    )
      this.unlockDocumentScroll();
    if (restoreFocus && trigger) queueMicrotask(() => trigger.focus());
  }
  private async loadCustomerPurchaseHistory(): Promise<void> {
    if (!this.selectedStoreId || this.selectedPurchaseCustomerId === null) return;
    const requestId = ++this.purchaseHistoryRequest;
    this.purchaseHistoryLoading = true;
    this.purchaseHistoryError = '';
    try {
      const response = await this.api.customerPurchaseHistory<CustomerPurchaseHistoryData>(
        this.selectedStoreId,
        this.selectedPurchaseCustomerId,
        this.from,
        this.to,
        this.purchaseHistoryPage,
      );
      if (requestId !== this.purchaseHistoryRequest || !this.purchaseHistoryOpen) return;
      this.purchaseHistoryResponse = response;
    } catch (error) {
      if (requestId !== this.purchaseHistoryRequest || !this.purchaseHistoryOpen) return;
      this.purchaseHistoryResponse = null;
      this.purchaseHistoryError = this.message(
        error,
        'Customer purchase history could not be loaded.',
      );
    } finally {
      if (requestId === this.purchaseHistoryRequest) {
        this.purchaseHistoryLoading = false;
        this.changeDetector.detectChanges();
      }
    }
  }
  private dismissPurchaseHistory(restoreFocus: boolean): void {
    const trigger = this.purchaseHistoryTrigger;
    this.purchaseHistoryRequest += 1;
    this.purchaseHistoryOpen = false;
    this.purchaseHistoryLoading = false;
    this.purchaseHistoryError = '';
    this.purchaseHistoryResponse = null;
    this.selectedPurchaseCustomerId = null;
    this.purchaseHistoryPage = 1;
    this.purchaseHistoryTrigger = null;
    if (
      !this.saleDetailsOpen &&
      !this.balanceHistoryOpen &&
      !this.cashFlowDetailsOpen &&
      !this.inventoryHistoryOpen &&
      !this.transferDetailsOpen &&
      !this.dataQualityOpen
    )
      this.unlockDocumentScroll();
    if (restoreFocus && trigger) queueMicrotask(() => trigger.focus());
  }
  private async loadCashFlowDetails(): Promise<void> {
    if (!this.selectedStoreId || !this.selectedCashFlowSource) return;
    const requestId = ++this.cashFlowDetailsRequest;
    this.cashFlowDetailsLoading = true;
    this.cashFlowDetailsError = '';
    try {
      const response = await this.api.cashFlowTransactions<CashFlowTransactionsData>(
        this.selectedStoreId,
        this.selectedCashFlowSource,
        this.from,
        this.to,
        this.cashFlowDetailsPage,
      );
      if (requestId !== this.cashFlowDetailsRequest || !this.cashFlowDetailsOpen) return;
      this.cashFlowDetailsResponse = response;
    } catch (error) {
      if (requestId !== this.cashFlowDetailsRequest || !this.cashFlowDetailsOpen) return;
      this.cashFlowDetailsError = this.message(
        error,
        'Cash-flow transactions could not be loaded.',
      );
    } finally {
      if (requestId === this.cashFlowDetailsRequest) {
        this.cashFlowDetailsLoading = false;
        this.changeDetector.detectChanges();
      }
    }
  }
  private dismissCashFlowDetails(restoreFocus: boolean): void {
    const trigger = this.cashFlowDetailsTrigger;
    this.cashFlowDetailsRequest += 1;
    this.cashFlowDetailsOpen = false;
    this.cashFlowDetailsLoading = false;
    this.cashFlowDetailsError = '';
    this.cashFlowDetailsResponse = null;
    this.selectedCashFlowSource = null;
    this.selectedCashFlowLabel = '';
    this.cashFlowDetailsPage = 1;
    this.cashFlowDetailsTrigger = null;
    if (
      !this.saleDetailsOpen &&
      !this.balanceHistoryOpen &&
      !this.inventoryHistoryOpen &&
      !this.transferDetailsOpen &&
      !this.dataQualityOpen
    )
      this.unlockDocumentScroll();
    if (restoreFocus && trigger) queueMicrotask(() => trigger.focus());
  }
  private async loadInventoryHistory(): Promise<void> {
    if (!this.selectedStoreId || this.selectedInventoryItemId === null) return;
    const requestId = ++this.inventoryHistoryRequest;
    this.inventoryHistoryLoading = true;
    this.inventoryHistoryError = '';
    try {
      const response = await this.api.inventoryHistory<InventoryHistoryData>(
        this.selectedStoreId,
        this.selectedInventoryItemId,
        this.from,
        this.to,
        this.inventoryHistoryPage,
      );
      if (requestId !== this.inventoryHistoryRequest || !this.inventoryHistoryOpen) return;
      this.inventoryHistoryResponse = response;
    } catch (error) {
      if (requestId !== this.inventoryHistoryRequest || !this.inventoryHistoryOpen) return;
      this.inventoryHistoryError = this.message(error, 'Inventory history could not be loaded.');
    } finally {
      if (requestId === this.inventoryHistoryRequest) {
        this.inventoryHistoryLoading = false;
        this.changeDetector.detectChanges();
      }
    }
  }
  private dismissInventoryHistory(restoreFocus: boolean): void {
    const trigger = this.inventoryHistoryTrigger;
    this.inventoryHistoryRequest += 1;
    this.inventoryHistoryOpen = false;
    this.inventoryHistoryLoading = false;
    this.inventoryHistoryError = '';
    this.inventoryHistoryResponse = null;
    this.selectedInventoryItemId = null;
    this.inventoryHistoryPage = 1;
    this.inventoryHistoryTrigger = null;
    if (
      !this.saleDetailsOpen &&
      !this.balanceHistoryOpen &&
      !this.cashFlowDetailsOpen &&
      !this.transferDetailsOpen &&
      !this.dataQualityOpen
    )
      this.unlockDocumentScroll();
    if (restoreFocus && trigger) queueMicrotask(() => trigger.focus());
  }
  private async loadDataQuality(): Promise<void> {
    if (!this.selectedStoreId || !this.dataQualityOpen) return;
    const requestId = ++this.dataQualityRequest;
    this.dataQualityLoading = true;
    this.dataQualityError = '';
    try {
      const response = await this.api.dataQuality<DataQualityData>(
        this.selectedStoreId,
        this.from,
        this.to,
        this.dataQualityPage,
      );
      if (requestId !== this.dataQualityRequest || !this.dataQualityOpen) return;
      this.dataQualityResponse = response;
    } catch (error) {
      if (requestId !== this.dataQualityRequest || !this.dataQualityOpen) return;
      this.dataQualityResponse = null;
      this.dataQualityError = this.message(error, 'Data-quality details could not be loaded.');
    } finally {
      if (requestId === this.dataQualityRequest) {
        this.dataQualityLoading = false;
        this.changeDetector.detectChanges();
      }
    }
  }
  private dismissDataQuality(restoreFocus: boolean): void {
    const trigger = this.dataQualityTrigger;
    this.dataQualityRequest += 1;
    this.dataQualityOpen = false;
    this.dataQualityLoading = false;
    this.dataQualityError = '';
    this.dataQualityResponse = null;
    this.dataQualityPage = 1;
    this.dataQualityTrigger = null;
    if (
      !this.saleDetailsOpen &&
      !this.balanceHistoryOpen &&
      !this.cashFlowDetailsOpen &&
      !this.inventoryHistoryOpen &&
      !this.transferDetailsOpen
    )
      this.unlockDocumentScroll();
    if (restoreFocus && trigger) queueMicrotask(() => trigger.focus());
  }
  private lockDocumentScroll(): void {
    if (this.documentScrollLocked) return;
    this.documentScrollLocked = true;
    this.lockedScrollY = window.scrollY;
    this.bodyStyleBeforeLock = document.body.getAttribute('style');
    this.htmlStyleBeforeLock = document.documentElement.getAttribute('style');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.lockedScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }
  private unlockDocumentScroll(): void {
    if (!this.documentScrollLocked) return;
    const scrollY = this.lockedScrollY;
    this.documentScrollLocked = false;
    this.restoreStyle(document.body, this.bodyStyleBeforeLock);
    this.restoreStyle(document.documentElement, this.htmlStyleBeforeLock);
    this.bodyStyleBeforeLock = null;
    this.htmlStyleBeforeLock = null;
    window.scrollTo(0, scrollY);
  }
  private restoreStyle(element: HTMLElement, value: string | null): void {
    if (value === null) element.removeAttribute('style');
    else element.setAttribute('style', value);
  }
  private downloadCsv(exportData: ReportExportData): void {
    const fileName = exportData.fileName.replace(/[\\/:*?"<>|]/g, '-');
    const url = URL.createObjectURL(
      new Blob([exportData.content], { type: 'text/csv;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  private downloadLocalCsv(fileName: string, rows: Array<Array<string | number>>): void {
    const content = `\uFEFF${rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\r\n')}`;
    this.downloadCsv({ fileName, content, rowCount: Math.max(0, rows.length - 1) });
  }
  private clearExportFeedback(): void {
    this.exportError = '';
    this.exportStatus = '';
  }
  private loadInventorySummaryReport(
    storeId: string,
  ): Promise<FreshResponse<InventorySummaryReportData>> {
    this.ensureInventorySummaryDate();
    return this.api.inventorySummaryReport<InventorySummaryReportData>(
      storeId,
      this.inventorySummaryDate,
      this.inventorySummaryDate,
    );
  }
  private ensureInventorySummaryDate(reset = false): void {
    if (!this.from || !this.to) return;
    if (
      reset ||
      !this.inventorySummaryDate ||
      this.inventorySummaryDate < this.from ||
      this.inventorySummaryDate > this.to
    ) {
      this.inventorySummaryDate = this.from;
    }
  }
  private shiftIsoDate(value: string, days: number): string {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
  private reportFilters(): ReportFilters {
    return {
      search: this.search,
      status: this.activeView === 'sales' ? this.salesStatus : '',
      payment: this.activeView === 'sales' ? this.salesPayment : '',
      itemCode: this.activeView === 'sales' ? this.salesItemCode : '',
      category: this.activeView === 'inventory' ? this.inventoryCategory : '',
      stockStatus: this.activeView === 'inventory' ? this.inventoryStockStatus : '',
      forecastDays: this.activeView === 'inventory-forecast' ? this.forecastDays : undefined,
      risk: this.activeView === 'inventory-forecast' ? this.inventoryForecastRisk : '',
      ...(this.activeView === 'inventory-forecast'
        ? { category: this.inventoryForecastCategory }
        : {}),
      ...(this.activeView === 'profitability'
        ? {
            category: this.profitabilityCategory,
            profitabilitySort: this.profitabilitySort,
          }
        : {}),
      ...(this.activeView === 'customer-insights' ? { customerSort: this.customerSort } : {}),
    };
  }
  private applySavedReportFilters(filters: ReportFilters): void {
    this.search = filters.search ?? '';
    this.salesStatus = filters.status ?? '';
    this.salesPayment = filters.payment ?? '';
    this.salesItemCode = filters.itemCode ?? '';
    this.salesItemName = filters.itemCode ?? '';
    this.inventoryCategory = filters.category ?? '';
    this.inventoryStockStatus = filters.stockStatus ?? '';
    this.inventoryForecastCategory = filters.category ?? '';
    this.inventoryForecastRisk = filters.risk ?? '';
    this.forecastDays = filters.forecastDays ?? 14;
    this.profitabilityCategory = filters.category ?? '';
    this.profitabilitySort = filters.profitabilitySort ?? 'PROFIT';
    this.customerSort = filters.customerSort ?? 'SPEND';
  }
  private applySavedDatePreset(view: SavedDashboardView): void {
    if (view.datePreset === 'CUSTOM' && view.dateFrom && view.dateTo) {
      this.from = view.dateFrom;
      this.to = view.dateTo;
      return;
    }
    this.to = this.dateOffset(0);
    if (view.datePreset === 'LAST_7_DAYS') this.from = this.dateOffset(-6);
    if (view.datePreset === 'LAST_30_DAYS') this.from = this.dateOffset(-29);
    if (view.datePreset === 'THIS_MONTH') this.from = `${this.to.slice(0, 7)}-01`;
  }
  private resetFilters(): void {
    if (this.filterTimer) {
      clearTimeout(this.filterTimer);
      this.filterTimer = null;
    }
    this.search = '';
    this.salesStatus = '';
    this.salesPayment = '';
    this.salesItemCode = '';
    this.salesItemName = '';
    this.inventoryCategory = '';
    this.inventoryStockStatus = '';
    this.inventoryForecastCategory = '';
    this.inventoryForecastRisk = '';
    this.profitabilityCategory = '';
    this.profitabilitySort = 'PROFIT';
    this.customerSort = 'SPEND';
  }
  private syncSalesTargetDraft(data: SalesTargetData): void {
    this.salesTargetDraft = Number(data.target.sales ?? 0);
    this.profitTargetDraft = Number(data.target.recordedGrossProfit ?? 0);
  }
  private clearTargetFeedback(): void {
    this.targetError = '';
    this.targetStatus = '';
  }
  private clearPreferenceFeedback(): void {
    this.preferenceError = '';
    this.preferenceStatus = '';
    this.resetPreferencesConfirming = false;
  }
  private analyticsRoute(view: ReportView = this.activeView): string {
    return `/dashboard/${view}`;
  }
  private numberValue(value: unknown): number {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
  }
  private message(error: unknown, fallback: string): string {
    const value = (error as { error?: { message?: string | string[] } })?.error?.message;
    if (Array.isArray(value)) return value.join(' ');
    if (value) return value;
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
