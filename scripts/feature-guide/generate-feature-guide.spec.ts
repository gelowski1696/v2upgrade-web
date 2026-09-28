import { expect, Page, Request, test } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const docsDir = resolve(process.cwd(), 'docs');
const assetsDir = resolve(docsDir, 'feature-guide-assets');
const htmlPath = resolve(docsDir, 'OWNER_DASHBOARD_FEATURE_GUIDE_PRINT.html');
const pdfPath = resolve(docsDir, 'OWNER_DASHBOARD_FEATURE_GUIDE.pdf');

const user = {
  id: 'portal-owner',
  sessionId: 'feature-guide-session',
  clientId: 'vmjam-sales',
  username: 'owner@vmjam.example',
  displayName: 'Alex Rivera',
  role: 'OWNER',
  storeIds: ['store-main', 'store-north'],
};

const stores = [
  {
    id: 'store-main',
    code: 'MAIN',
    name: 'Main LPG Store',
    timezone: 'Asia/Manila',
    activeSnapshot: {
      schemaVersion: 27,
      snapshotCreatedAt: '2026-09-28T05:45:00.000Z',
      activatedAt: '2026-09-28T05:47:00.000Z',
    },
  },
  {
    id: 'store-north',
    code: 'NORTH',
    name: 'North Branch',
    timezone: 'Asia/Manila',
    activeSnapshot: {
      schemaVersion: 27,
      snapshotCreatedAt: '2026-09-28T05:41:00.000Z',
      activatedAt: '2026-09-28T05:43:00.000Z',
    },
  },
];

interface GuideScreen {
  id: string;
  eyebrow: string;
  title: string;
  pitch: string;
  features: string[];
  pins: Array<{ number: number; x: number; y: number }>;
}

const guideScreens: GuideScreen[] = [
  {
    id: 'overview',
    eyebrow: '01 / EXECUTIVE CONTROL',
    title: 'Know the state of the business before the first question is asked.',
    pitch:
      'The overview turns synchronized POS records into an owner-ready brief: sales, recorded profit, receivables, stock risk, and period movement in one scan.',
    features: [
      'Owner KPIs surface the numbers that need attention now.',
      'Sales Trends compares the selected period with the previous period.',
      'Daily, weekly, and monthly grouping reveals momentum without changing the underlying dates.',
    ],
    pins: [
      { number: 1, x: 38, y: 31 },
      { number: 2, x: 66, y: 57 },
      { number: 3, x: 88, y: 29 },
    ],
  },
  {
    id: 'sales',
    eyebrow: '02 / SALES CONTROL',
    title: 'Move from totals to the transaction that explains them.',
    pitch:
      'Sales records give the owner a searchable, filterable ledger with read-only detail and export support—fast enough for daily review, precise enough for follow-up.',
    features: [
      'Search references and customers, then narrow by payment or status.',
      'Open a sale to inspect items, costs, discounts, cashier, notes, and payment facts.',
      'Export the exact filtered result set for external analysis.',
    ],
    pins: [
      { number: 1, x: 56, y: 28 },
      { number: 2, x: 67, y: 62 },
      { number: 3, x: 91, y: 21 },
    ],
  },
  {
    id: 'targets',
    eyebrow: '03 / PERFORMANCE',
    title: 'Turn a monthly goal into a daily operating pace.',
    pitch:
      'Sales Targets makes performance actionable. Owners see progress, the daily pace required, projected results, and profit coverage before the month is over.',
    features: [
      'Track sales and recorded gross-profit targets side by side.',
      'See remaining value and required daily pace at a glance.',
      'Cost-coverage context keeps profit claims honest.',
    ],
    pins: [
      { number: 1, x: 53, y: 37 },
      { number: 2, x: 71, y: 55 },
      { number: 3, x: 88, y: 40 },
    ],
  },
  {
    id: 'profitability',
    eyebrow: '04 / MARGIN INTELLIGENCE',
    title: 'See which products grow the business—and which only grow revenue.',
    pitch:
      'Profitability ranks products and categories by profit, margin, or revenue while comparing the prior period and exposing incomplete cost coverage.',
    features: [
      'Current and previous-period results show direction, not just totals.',
      'Category and product ranking identifies where margin is created.',
      'Coverage warnings prevent missing costs from looking like profit.',
    ],
    pins: [
      { number: 1, x: 46, y: 35 },
      { number: 2, x: 69, y: 64 },
      { number: 3, x: 89, y: 36 },
    ],
  },
  {
    id: 'inventory',
    eyebrow: '05 / STOCK VISIBILITY',
    title: 'See the full and empty cylinder position, with the prices behind it.',
    pitch:
      'Inventory joins location, cylinder state, alert level, refill and non-refill selling prices, cost, and recorded value in one operational table.',
    features: [
      'Store and warehouse counts separate full and empty stock.',
      'Refill and non-refill prices support LPG selling decisions.',
      'History links explain how the current quantity was reached.',
    ],
    pins: [
      { number: 1, x: 57, y: 62 },
      { number: 2, x: 78, y: 62 },
      { number: 3, x: 92, y: 62 },
    ],
  },
  {
    id: 'reorder',
    eyebrow: '06 / FORWARD PLANNING',
    title: 'Order from expected demand, not from memory.',
    pitch:
      'Reorder Planning converts recent sales velocity, available stock, lead time, and forecast horizon into an item-level purchase recommendation.',
    features: [
      'Risk states separate out-of-stock, reorder-now, watch, and healthy items.',
      'Suggested quantities combine forecast demand with practical lead time.',
      'Estimated reorder cost turns the plan into a cash requirement.',
    ],
    pins: [
      { number: 1, x: 51, y: 39 },
      { number: 2, x: 72, y: 64 },
      { number: 3, x: 89, y: 39 },
    ],
  },
  {
    id: 'transfers',
    eyebrow: '07 / SUPPLY CHAIN TRACEABILITY',
    title: 'Trace every transfer from cylinders received to supplier balance.',
    pitch:
      'Transfer Details mirrors the operational record: separate full and empty item tables, cost totals, invoice facts, payment history, refunds, and outstanding balance.',
    features: [
      'Full and empty cylinder movements remain visibly separate.',
      'Supplier settlement shows payments, refunds, and balance still due.',
      'Driver, encoder, invoice, notes, and confirmation facts preserve context.',
    ],
    pins: [
      { number: 1, x: 52, y: 42 },
      { number: 2, x: 77, y: 68 },
      { number: 3, x: 86, y: 25 },
    ],
  },
  {
    id: 'customers',
    eyebrow: '08 / CUSTOMER VALUE',
    title: 'Recognize the customers driving repeat revenue and receivables.',
    pitch:
      'Customer Insights ranks buyers by spend, visits, recency, or balance and connects every summary back to purchase history.',
    features: [
      'Repeat rate, spend, visits, and average purchase define customer value.',
      'Ranking makes top accounts and dormant relationships easy to spot.',
      'Outstanding balances stay visible beside purchasing behavior.',
    ],
    pins: [
      { number: 1, x: 50, y: 37 },
      { number: 2, x: 67, y: 64 },
      { number: 3, x: 88, y: 63 },
    ],
  },
  {
    id: 'cashflow',
    eyebrow: '09 / CASH CONTROL',
    title: 'Explain the movement from opening cash to closing cash.',
    pitch:
      'Cash Flow organizes operational inflows and outflows into a reconciled bridge, then lets owners open the source transactions behind each number.',
    features: [
      'Opening balance, cash received, cash paid, and closing balance reconcile.',
      'Receipts, collections, capital, expenses, salaries, and restocks remain distinct.',
      'Source-ledger drill-down supports investigation without editing POS data.',
    ],
    pins: [
      { number: 1, x: 49, y: 40 },
      { number: 2, x: 73, y: 60 },
      { number: 3, x: 89, y: 42 },
    ],
  },
  {
    id: 'business',
    eyebrow: '10 / MULTI-STORE OVERSIGHT',
    title: 'Manage the network by exception, not by opening every branch.',
    pitch:
      'All Stores & Alerts rolls authorized branches into one view and raises inventory, overdue balance, discount, sync, and backup exceptions for action.',
    features: [
      'Consolidated KPIs show business-wide scale and exposure.',
      'Store comparison highlights stale syncs and operational outliers.',
      'Actionable alerts link back to the source record when available.',
    ],
    pins: [
      { number: 1, x: 49, y: 37 },
      { number: 2, x: 64, y: 63 },
      { number: 3, x: 88, y: 60 },
    ],
  },
  {
    id: 'summary',
    eyebrow: '11 / FEATURE MOD REPORTS',
    title: 'Bring desktop-enabled operational reports into the owner portal.',
    pitch:
      'Feature Mod reports appear only when the store enables them. Summary CSV presents one selected date at a time, with previous and next controls inside the chosen range.',
    features: [
      'Opening, movement, and actual counts create an inventory audit trail.',
      'Single-date navigation keeps wide operational data readable.',
      'Financial, discount, purchase, special-receipt, and customer reports follow the same permission model.',
    ],
    pins: [
      { number: 1, x: 55, y: 63 },
      { number: 2, x: 76, y: 26 },
      { number: 3, x: 89, y: 19 },
    ],
  },
  {
    id: 'scheduled',
    eyebrow: '12 / AUTOMATION',
    title: 'Keep the owner informed even when the dashboard is closed.',
    pitch:
      'Scheduled Reports delivers daily or weekly summaries to a verified recipient and exposes delivery status, freshness warnings, and attempt history.',
    features: [
      'Daily and weekly schedules communicate their next run clearly.',
      'Recipient verification and server readiness protect delivery.',
      'Delivery history exposes stale data, quality status, and failures.',
    ],
    pins: [
      { number: 1, x: 57, y: 46 },
      { number: 2, x: 85, y: 28 },
      { number: 3, x: 71, y: 68 },
    ],
  },
  {
    id: 'activity',
    eyebrow: '13 / GOVERNANCE',
    title: 'Make access, synchronization, settings, reports, and recovery visible.',
    pitch:
      'The Portal Activity Log gives owners an understandable history of important account and platform events without exposing secrets or internal server detail.',
    features: [
      'Filter by event type or authorized store.',
      'Human-readable entries identify what happened, when, where, and by whom.',
      'Security, sync, settings, reporting, and backup events share one audit timeline.',
    ],
    pins: [
      { number: 1, x: 55, y: 30 },
      { number: 2, x: 70, y: 55 },
      { number: 3, x: 89, y: 30 },
    ],
  },
];

test('generate the illustrated Owner Dashboard Feature Guide PDF', async ({ page }) => {
  test.setTimeout(300_000);
  await mkdir(assetsDir, { recursive: true });
  await seedSession(page);
  await mockDashboard(page);
  await page.clock.setFixedTime(new Date('2026-09-28T06:00:00.000Z'));

  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/overview')),
    page.goto('/'),
  ]);
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await preparePage(page);
  await capture(page, 'overview');

  await openView(page, 'Sales', '/sales?', 'Sales');
  await capture(page, 'sales');

  await openView(page, 'Sales targets', '/sales-targets?', 'Sales targets');
  await capture(page, 'targets');

  await openView(page, 'Profitability', '/profitability?', 'Profitability');
  await capture(page, 'profitability');

  await openView(page, 'Inventory', '/inventory?', 'Inventory');
  await capture(page, 'inventory');

  await openView(page, 'Reorder planning', '/inventory-forecast?', 'Reorder planning');
  await capture(page, 'reorder');

  await openView(page, 'Transfers', '/transfers?', 'Transfers');
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/transfers/1008')),
    page.getByRole('button', { name: 'View details for transfer TR-1008' }).click(),
  ]);
  await expect(page.getByRole('dialog', { name: 'TR-1008' })).toBeVisible();
  await capture(page, 'transfers');
  await page.getByRole('button', { name: 'Close transfer details' }).last().click();

  await openView(page, 'Customer insights', '/customer-insights?', 'Customer insights');
  await capture(page, 'customers');

  await openView(page, 'Cash flow', '/cash-flow?', 'Cash flow');
  await capture(page, 'cashflow');

  await openView(page, 'All stores & alerts', '/business-overview?', 'All stores & alerts');
  await capture(page, 'business');

  await openView(page, 'Summary CSV', '/reports/inventory-summary?', 'Summary CSV');
  await capture(page, 'summary');

  await openView(page, 'Scheduled reports', '/portal/report-schedules', 'Scheduled reports');
  await capture(page, 'scheduled');

  await openView(page, 'Activity log', '/portal/activity?', 'Activity log');
  await capture(page, 'activity');

  const imageData = new Map<string, string>();
  for (const screen of guideScreens) {
    const buffer = await readFile(resolve(assetsDir, `${screen.id}.png`));
    imageData.set(screen.id, `data:image/png;base64,${buffer.toString('base64')}`);
  }

  const html = buildGuideHtml(imageData);
  await writeFile(htmlPath, html, 'utf8');

  await page.setViewportSize({ width: 1120, height: 1584 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
});

async function seedSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ seededUser }) => {
      localStorage.setItem('posv2.portalAccessToken', 'feature-guide-access-token');
      localStorage.setItem('posv2.portalRefreshToken', 'feature-guide-refresh-token');
      localStorage.setItem('posv2.portalUser', JSON.stringify(seededUser));
    },
    { seededUser: user },
  );
}

async function preparePage(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
      html { scroll-behavior: auto !important; }
    `,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function openView(
  page: Page,
  label: string,
  responseMarker: string,
  heading: string,
): Promise<void> {
  const button = page.locator('nav').getByRole('button', { name: label, exact: true });
  await expect(button).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes(responseMarker)),
    button.click(),
  ]);
  await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
  await preparePage(page);
}

async function capture(page: Page, id: string): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: resolve(assetsDir, `${id}.png`), fullPage: false });
}

async function mockDashboard(page: Page): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (request.method() !== 'GET') {
      await route.fulfill(jsonResponse({ message: 'Not required by the feature guide' }, 200));
      return;
    }
    if (path.endsWith('/portal/stores')) {
      await route.fulfill(jsonResponse(stores));
      return;
    }
    if (path.endsWith('/portal/preferences')) {
      await route.fulfill(
        jsonResponse({
          overviewMetrics: [
            'GROSS_SALES',
            'RECORDED_GROSS_PROFIT',
            'CUSTOMER_BALANCE',
            'INVENTORY_ALERTS',
          ],
          savedViews: [],
        }),
      );
      return;
    }
    if (path.endsWith('/report-capabilities')) {
      await route.fulfill(
        jsonResponse(
          fresh({
            available: true,
            reports: [
              'discount-report',
              'purchase-report',
              'special-receipts',
              'customer-report',
              'inventory-summary',
              'financial-report',
            ],
          }),
        ),
      );
      return;
    }
    if (path.endsWith('/overview')) {
      await route.fulfill(
        jsonResponse(
          fresh({
            transactionCount: 286,
            salesWithRecordedCost: 281,
            salesMissingCostCount: 5,
            costCoveragePercent: 98.3,
            profitDataComplete: false,
            grossSales: 212480,
            discounts: 3650,
            costOfGoods: 139220,
            grossProfit: 73260,
            customerBalance: 28450,
            customersWithBalance: 14,
            inventoryItems: 48,
            criticalItems: 4,
            transfers: 12,
          }),
        ),
      );
      return;
    }
    if (path.endsWith('/sales-trends')) {
      await route.fulfill(jsonResponse(fresh(salesTrend(url.searchParams.get('group') ?? 'day'))));
      return;
    }
    if (path.endsWith('/sales-targets')) {
      await route.fulfill(jsonResponse(fresh(salesTargets())));
      return;
    }
    if (path.endsWith('/sales')) {
      await route.fulfill(jsonResponse(fresh(salesData())));
      return;
    }
    if (path.endsWith('/inventory-forecast')) {
      await route.fulfill(jsonResponse(fresh(inventoryForecast())));
      return;
    }
    if (path.endsWith('/inventory')) {
      await route.fulfill(jsonResponse(fresh(inventoryData())));
      return;
    }
    if (path.endsWith('/profitability')) {
      await route.fulfill(jsonResponse(fresh(profitabilityData())));
      return;
    }
    if (path.endsWith('/transfers/1008')) {
      await route.fulfill(jsonResponse(fresh(transferDetails())));
      return;
    }
    if (path.endsWith('/transfers')) {
      await route.fulfill(jsonResponse(fresh(transfersData())));
      return;
    }
    if (path.endsWith('/customer-insights')) {
      await route.fulfill(jsonResponse(fresh(customerInsights())));
      return;
    }
    if (path.endsWith('/cash-flow')) {
      await route.fulfill(jsonResponse(fresh(cashFlow())));
      return;
    }
    if (path.endsWith('/portal/business-overview')) {
      await route.fulfill(jsonResponse(fresh(businessOverview())));
      return;
    }
    if (path.endsWith('/reports/inventory-summary')) {
      await route.fulfill(jsonResponse(fresh(inventorySummaryReport(url))));
      return;
    }
    if (path.endsWith('/portal/report-schedules')) {
      await route.fulfill(jsonResponse(reportSchedules()));
      return;
    }
    if (path.endsWith('/portal/activity')) {
      await route.fulfill(jsonResponse(activityLog()));
      return;
    }

    await route.fulfill(jsonResponse({ message: `Unmocked endpoint: ${path}` }, 404));
  });
}

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

function fresh(data: unknown) {
  return {
    storeId: stores[0].id,
    snapshotId: 'feature-guide-snapshot',
    schemaVersion: 27,
    snapshotCreatedAt: '2026-09-28T05:45:00.000Z',
    syncedAt: '2026-09-28T05:47:00.000Z',
    data,
  };
}

function salesTrend(grouping: string) {
  const points = [
    ['Sep 22', 25100, 34],
    ['Sep 23', 28600, 39],
    ['Sep 24', 27280, 37],
    ['Sep 25', 31800, 42],
    ['Sep 26', 34600, 46],
    ['Sep 27', 30100, 41],
    ['Sep 28', 35000, 47],
  ].map(([label, sales, count], index) => ({
    key: `2026-09-${22 + index}`,
    label,
    grossSales: sales,
    transactionCount: count,
    discounts: Math.round(Number(sales) * 0.017),
    costOfGoods: Math.round(Number(sales) * 0.655),
    grossProfit: Math.round(Number(sales) * 0.345),
    salesMissingCostCount: index === 4 ? 2 : 0,
  }));
  return {
    grouping,
    current: {
      from: '2026-09-22',
      to: '2026-09-28',
      grossSales: 212480,
      transactionCount: 286,
      averageSaleValue: 742.94,
      discounts: 3650,
      costOfGoods: 139220,
      grossProfit: 73260,
      salesWithRecordedCost: 281,
      salesMissingCostCount: 5,
      costCoveragePercent: 98.3,
      profitDataComplete: false,
    },
    previous: {
      from: '2026-09-15',
      to: '2026-09-21',
      grossSales: 193200,
      transactionCount: 267,
      averageSaleValue: 723.6,
      discounts: 3420,
      costOfGoods: 129640,
      grossProfit: 63560,
      salesWithRecordedCost: 267,
      salesMissingCostCount: 0,
      costCoveragePercent: 100,
      profitDataComplete: true,
    },
    points,
  };
}

function salesData() {
  return {
    items: [
      sale(
        4108,
        'INV-04108',
        'Rivera Eatery',
        'CASH',
        'COMPLETED',
        2350,
        '2026-09-28T13:42:00.000Z',
      ),
      sale(
        4107,
        'INV-04107',
        'Northside Bakery',
        'BANK',
        'COMPLETED',
        4680,
        '2026-09-28T13:19:00.000Z',
      ),
      sale(
        4106,
        'INV-04106',
        'Walk-in Customer',
        'E_WALLET',
        'COMPLETED',
        980,
        '2026-09-28T12:51:00.000Z',
      ),
      sale(4105, 'INV-04105', 'Mila Store', 'CREDIT', 'UNPAID', 3250, '2026-09-28T12:04:00.000Z'),
      sale(
        4104,
        'INV-04104',
        'Walk-in Customer',
        'CASH',
        'COMPLETED',
        1210,
        '2026-09-28T11:48:00.000Z',
      ),
    ],
    total: 286,
    page: 1,
    pageSize: 25,
    filterOptions: {
      statuses: ['COMPLETED', 'UNPAID', 'CANCELLED'],
      payments: ['CASH', 'BANK', 'E_WALLET', 'CREDIT'],
    },
  };
}

function sale(
  id: number,
  reference: string,
  customer: string,
  payment: string,
  status: string,
  totalAmount: number,
  saleDate: string,
) {
  return { id, reference, customer, payment, status, totalAmount, saleDate };
}

function salesTargets() {
  return {
    month: '2026-09',
    from: '2026-09-01',
    to: '2026-09-30',
    canEdit: true,
    target: {
      configured: true,
      sales: 750000,
      recordedGrossProfit: 250000,
      updatedAt: '2026-09-01T01:00:00.000Z',
    },
    actual: {
      grossSales: 682480,
      recordedGrossProfit: 229260,
      transactionCount: 918,
      costCoveragePercent: 98.6,
      profitDataComplete: false,
      missingCostSales: 13,
    },
    progress: { salesPercent: 91, recordedGrossProfitPercent: 91.7 },
    pace: {
      status: 'ACTIVE',
      totalDays: 30,
      elapsedDays: 28,
      remainingDays: 2,
      expectedProgressPercent: 93.3,
      salesRemaining: 67520,
      recordedGrossProfitRemaining: 20740,
      salesRequiredPerDay: 33760,
      recordedGrossProfitRequiredPerDay: 10370,
      projectedSales: 731229,
      projectedRecordedGrossProfit: 245636,
    },
  };
}

function inventoryData() {
  return {
    items: [
      inventoryItem(1, 'LPG-11', '11 kg LPG', '11 kg', 5, 4, 8, 2, 980, 1150, 2850, 'CRITICAL'),
      inventoryItem(2, 'LPG-22', '22 kg LPG', '22 kg', 14, 6, 10, 3, 1840, 2150, 5300, 'HEALTHY'),
      inventoryItem(
        3,
        'LPG-50',
        '50 kg LPG',
        '50 kg',
        0,
        3,
        4,
        1,
        4210,
        4850,
        11800,
        'OUT_OF_STOCK',
      ),
      inventoryItem(
        4,
        'ACC-REG',
        'Gas regulator',
        'Standard',
        19,
        0,
        12,
        0,
        410,
        650,
        650,
        'HEALTHY',
      ),
    ],
    total: 48,
    page: 1,
    pageSize: 25,
    summary: {
      trackedItems: 48,
      outOfStockItems: 2,
      criticalItems: 4,
      healthyItems: 42,
      storeFill: 183,
      storeEmpty: 64,
      warehouseFill: 127,
      warehouseEmpty: 31,
      recordedValue: 418650,
      stockBearingItems: 46,
      valuedItems: 45,
      missingCostItems: 1,
      valuationCoveragePercent: 97.8,
      valuationComplete: false,
    },
    filterOptions: {
      categories: ['LPG', 'Accessories'],
      stockStatuses: ['OUT_OF_STOCK', 'CRITICAL', 'HEALTHY'],
    },
  };
}

function inventoryItem(
  id: number,
  code: string,
  name: string,
  size: string,
  fillQuantity: number,
  emptyQuantity: number,
  warehouseFill: number,
  warehouseEmpty: number,
  cost: number,
  refillPrice: number,
  nonRefillPrice: number,
  stockStatus: string,
) {
  return {
    id,
    code,
    brand: 'VMJAM Select',
    name,
    size,
    quantity: fillQuantity + emptyQuantity,
    cost,
    sellingPrice: nonRefillPrice,
    refillPrice,
    nonRefillPrice,
    category: code.startsWith('LPG') ? 'LPG' : 'Accessories',
    alertLevel: code === 'LPG-50' ? 2 : 5,
    fillQuantity,
    emptyQuantity,
    warehouseFill,
    warehouseEmpty,
    lentQuantity: 0,
    stockStatus,
    recordedValue: (fillQuantity + warehouseFill) * cost,
  };
}

function inventoryForecast() {
  return {
    items: [
      forecastItem(3, 'LPG-50', '50 kg LPG', 0, 4, 1.8, 25, 21, 88410, 'OUT_OF_STOCK'),
      forecastItem(1, 'LPG-11', '11 kg LPG', 5, 8, 2.7, 38, 33, 32340, 'REORDER_NOW'),
      forecastItem(5, 'LPG-2.7', '2.7 kg LPG', 12, 7, 2.1, 29, 17, 10710, 'WATCH'),
      forecastItem(2, 'LPG-22', '22 kg LPG', 14, 10, 1.1, 15, 0, 0, 'HEALTHY'),
    ],
    total: 48,
    page: 1,
    pageSize: 25,
    analysisDays: 30,
    forecastDays: 14,
    leadTimeDays: 7,
    summary: {
      availableStock: 310,
      projectedDemand: 426,
      suggestedReorder: 96,
      estimatedReorderCost: 146280,
      outOfStockItems: 2,
      reorderNowItems: 6,
      watchItems: 8,
      noRecentSalesItems: 3,
      attentionItems: 19,
    },
    filterOptions: {
      categories: ['LPG', 'Accessories'],
      risks: ['OUT_OF_STOCK', 'REORDER_NOW', 'WATCH', 'HEALTHY', 'NO_RECENT_SALES'],
    },
  };
}

function forecastItem(
  id: number,
  code: string,
  item: string,
  storeFill: number,
  warehouseFill: number,
  averageDailySales: number,
  projectedDemand: number,
  suggestedReorder: number,
  estimatedReorderCost: number,
  risk: string,
) {
  const availableStock = storeFill + warehouseFill;
  return {
    id,
    code,
    item,
    category: 'LPG',
    storeFill,
    warehouseFill,
    availableStock,
    alertLevel: 5,
    recordedCost: suggestedReorder ? estimatedReorderCost / suggestedReorder : 1840,
    salesQuantity: Math.round(averageDailySales * 30),
    averageDailySales,
    daysRemaining: averageDailySales ? availableStock / averageDailySales : null,
    projectedDemand,
    suggestedReorder,
    estimatedReorderCost,
    lastSoldAt: '2026-09-28T04:20:00.000Z',
    risk,
  };
}

function profitabilityData() {
  const current = profitMetrics(382, 212480, 139220, 73260, 34.48, 286, 5, 98.3, false);
  const previous = profitMetrics(349, 193200, 129640, 63560, 32.9, 267, 0, 100, true);
  return {
    currentRange: { from: '2026-09-22', to: '2026-09-28' },
    previousRange: { from: '2026-09-15', to: '2026-09-21' },
    rankBy: 'PROFIT',
    summary: {
      current,
      previous,
      revenueChange: 19280,
      recordedGrossProfitChange: 9700,
      recordedMarginPointChange: 1.58,
      recordedGrossProfitChangePercent: 15.26,
    },
    categories: [
      profitCategory('LPG', 326, 194280, 128450, 65830, 33.88),
      profitCategory('Accessories', 56, 18200, 10770, 7430, 40.82),
    ],
    items: [
      profitItem('LPG-11', '11 kg LPG', 142, 84120, 51260, 32860, 39.06),
      profitItem('LPG-22', '22 kg LPG', 86, 69240, 48120, 21120, 30.5),
      profitItem('LPG-50', '50 kg LPG', 31, 42160, 29630, 12530, 29.72),
      profitItem('ACC-REG', 'Gas regulator', 43, 12570, 6810, 5760, 45.82),
    ],
    total: 48,
    page: 1,
    pageSize: 25,
    filterOptions: { categories: ['LPG', 'Accessories'] },
  };
}

function profitMetrics(
  quantity: number,
  revenue: number,
  recordedCost: number,
  recordedGrossProfit: number,
  recordedMarginPercent: number,
  lineCount: number,
  missingCostLines: number,
  costCoveragePercent: number,
  costDataComplete: boolean,
) {
  return {
    quantity,
    revenue,
    recordedCost,
    recordedGrossProfit,
    recordedMarginPercent,
    lineCount,
    missingCostLines,
    costCoveragePercent,
    costDataComplete,
  };
}

function profitCategory(
  category: string,
  quantity: number,
  revenue: number,
  recordedCost: number,
  recordedGrossProfit: number,
  recordedMarginPercent: number,
) {
  return {
    category,
    ...profitMetrics(
      quantity,
      revenue,
      recordedCost,
      recordedGrossProfit,
      recordedMarginPercent,
      10,
      0,
      100,
      true,
    ),
    previousRevenue: revenue * 0.9,
    previousRecordedGrossProfit: recordedGrossProfit * 0.86,
    previousRecordedMarginPercent: recordedMarginPercent - 1.4,
    revenueChange: revenue * 0.1,
    recordedGrossProfitChange: recordedGrossProfit * 0.14,
    recordedMarginPointChange: 1.4,
  };
}

function profitItem(
  itemCode: string,
  item: string,
  quantity: number,
  revenue: number,
  recordedCost: number,
  recordedGrossProfit: number,
  recordedMarginPercent: number,
) {
  return {
    itemCode,
    item,
    category: itemCode.startsWith('LPG') ? 'LPG' : 'Accessories',
    ...profitMetrics(
      quantity,
      revenue,
      recordedCost,
      recordedGrossProfit,
      recordedMarginPercent,
      quantity,
      0,
      100,
      true,
    ),
    previousRevenue: revenue * 0.9,
    previousRecordedGrossProfit: recordedGrossProfit * 0.85,
    previousRecordedMarginPercent: recordedMarginPercent - 1.2,
    revenueChange: revenue * 0.1,
    recordedGrossProfitChange: recordedGrossProfit * 0.15,
    recordedMarginPointChange: 1.2,
    recordedGrossProfitChangePercent: 15,
  };
}

function transfersData() {
  return {
    items: [
      {
        id: 1008,
        reference: 'TR-1008',
        supplier: 'PrimeGas Supply Corp.',
        destination: 'Main LPG Store',
        type: 'RESTOCK IN',
        totalQuantity: 58,
        totalAmount: 118600,
        encoder: 'Alex Rivera',
        transferDate: '2026-09-27T08:30:00.000Z',
        status: 'CONFIRMED',
        restockPrice: 118600,
        notes: 'Weekly cylinder replenishment',
        paymentStatus: 'PARTIALLY PAID',
      },
      {
        id: 1007,
        reference: 'TR-1007',
        supplier: 'North Branch',
        destination: 'Main LPG Store',
        type: 'BRANCH TRANSFER',
        totalQuantity: 12,
        totalAmount: 0,
        encoder: 'Store Manager',
        transferDate: '2026-09-26T04:10:00.000Z',
        status: 'CONFIRMED',
        restockPrice: 0,
        notes: 'Emergency 11 kg transfer',
        paymentStatus: 'NOT APPLICABLE',
      },
    ],
    total: 12,
    page: 1,
    pageSize: 25,
  };
}

function transferDetails() {
  return {
    transfer: {
      ...transfersData().items[0],
      invoiceReference: 'DR-2026-0927',
      confirmedAt: '2026-09-27T08:42:00.000Z',
      paidAt: '',
      paymentMethod: 'BANK TRANSFER',
      paymentReference: 'BPI-88421',
      purchaseAmount: 118600,
      paidAmount: 80000,
      outstandingAmount: 38600,
      driverId: 12,
      driverName: 'Marco Santos',
    },
    lines: [
      transferLine(1, 'LPG-11', '11 kg LPG', '11 kg', 'FULL', 30, 980),
      transferLine(2, 'LPG-22', '22 kg LPG', '22 kg', 'FULL', 16, 1840),
      transferLine(3, 'LPG-50', '50 kg LPG', '50 kg', 'FULL', 6, 4210),
      transferLine(4, 'CYL-11-E', '11 kg cylinder', '11 kg', 'EMPTY', 4, 0),
      transferLine(5, 'CYL-22-E', '22 kg cylinder', '22 kg', 'EMPTY', 2, 0),
    ],
    payments: [
      {
        id: 1,
        kind: 'PAYMENT',
        amount: 50000,
        method: 'BANK TRANSFER',
        reference: 'BPI-88421',
        notes: 'Initial settlement',
        paidAt: '2026-09-27T10:00:00.000Z',
        recordedBy: 'Alex Rivera',
      },
      {
        id: 2,
        kind: 'PAYMENT',
        amount: 30000,
        method: 'BANK TRANSFER',
        reference: 'BPI-88903',
        notes: 'Second payment',
        paidAt: '2026-09-28T02:15:00.000Z',
        recordedBy: 'Alex Rivera',
      },
    ],
    lineItemsAvailable: true,
    paymentHistoryAvailable: true,
  };
}

function transferLine(
  id: number,
  itemCode: string,
  itemName: string,
  itemSize: string,
  unit: 'FULL' | 'EMPTY',
  quantity: number,
  unitCost: number,
) {
  return {
    id,
    itemCode,
    itemName,
    itemSize,
    unit,
    quantity,
    unitCost,
    lineTotal: quantity * unitCost,
  };
}

function customerInsights() {
  return {
    range: { from: '2026-09-01', to: '2026-09-28' },
    rankBy: 'SPEND',
    summary: {
      customerCount: 128,
      repeatCustomerCount: 74,
      visitCount: 296,
      recordedSpend: 212480,
      outstandingBalance: 28450,
      lastPurchaseDate: '2026-09-28T13:42:00.000Z',
      averagePurchase: 717.84,
    },
    items: [
      customer(1, 'Northside Bakery', '0917 321 8890', 0, 18, 28750, 9.2, 1),
      customer(2, 'Rivera Eatery', '0918 845 1102', 4250, 14, 23180, 7.4, 0),
      customer(3, 'Mila Store', '0920 118 7734', 8150, 11, 18420, 5.9, 2),
      customer(4, 'Corner Grill', '0916 774 2055', 0, 9, 15180, 4.8, 4),
    ],
    total: 128,
    page: 1,
    pageSize: 25,
  };
}

function customer(
  id: number,
  name: string,
  contact: string,
  balance: number,
  visitCount: number,
  recordedSpend: number,
  spendSharePercent: number,
  daysSinceLastPurchase: number,
) {
  return {
    id,
    name,
    contact,
    balance,
    status: 'active',
    visitCount,
    recordedSpend,
    averagePurchase: recordedSpend / visitCount,
    firstPurchaseDate: '2026-01-12T08:00:00.000Z',
    lastPurchaseDate: `2026-09-${String(28 - daysSinceLastPurchase).padStart(2, '0')}T08:00:00.000Z`,
    spendSharePercent,
    daysSinceLastPurchase,
  };
}

function cashFlow() {
  return {
    openingBalance: 184200,
    salesReceipts: 180380,
    creditCollections: 24600,
    capitalCashIn: 0,
    pettyCashOut: 11850,
    salaryPaid: 32600,
    restockPayments: 80000,
    cashReceived: 204980,
    cashPaid: 124450,
    closingBalance: 264730,
    netCashFlow: 80530,
  };
}

function businessOverview() {
  return {
    generatedAt: '2026-09-28T06:00:00.000Z',
    compatibleSchemaVersion: 27,
    authorizedStoreCount: 2,
    includedStoreCount: 2,
    excludedStoreCount: 0,
    summary: {
      grossSales: 348750,
      transactionCount: 472,
      recordedGrossProfit: 118320,
      customerBalance: 43620,
      netCashFlow: 126880,
      criticalItems: 7,
      outOfStockItems: 3,
    },
    stores: [
      businessStore(stores[0], 212480, 286, 139220, 73260, 28450, 4, 2, 80530, 'CURRENT'),
      businessStore(stores[1], 136270, 186, 91210, 45060, 15170, 3, 1, 46350, 'CURRENT'),
    ],
    alerts: [
      {
        id: 'inventory-main',
        storeId: stores[0].id,
        storeName: stores[0].name,
        severity: 'HIGH',
        type: 'INVENTORY',
        title: '2 items are out of stock',
        detail: '50 kg LPG and commercial regulator need replenishment.',
        dismissible: true,
      },
      {
        id: 'balance-north',
        storeId: stores[1].id,
        storeName: stores[1].name,
        severity: 'MEDIUM',
        type: 'BALANCE',
        title: 'Overdue receivables require review',
        detail: '3 customer balances are more than 30 days old.',
        amount: 6840,
        dismissible: true,
      },
      {
        id: 'discount-main',
        storeId: stores[0].id,
        storeName: stores[0].name,
        severity: 'MEDIUM',
        type: 'DISCOUNT',
        title: 'High discount requires review',
        detail: 'Invoice INV-04086 exceeded the configured review threshold.',
        amount: 750,
        saleId: 4086,
        reference: 'INV-04086',
        saleDate: '2026-09-27T09:20:00.000Z',
        discountPercent: 22,
        dismissible: true,
      },
    ],
  };
}

function businessStore(
  store: (typeof stores)[number],
  grossSales: number,
  transactionCount: number,
  recordedCost: number,
  recordedGrossProfit: number,
  customerBalance: number,
  criticalItems: number,
  outOfStockItems: number,
  netCashFlow: number,
  syncStatus: string,
) {
  return {
    id: store.id,
    code: store.code,
    name: store.name,
    schemaVersion: 27,
    snapshotCreatedAt: store.activeSnapshot.snapshotCreatedAt,
    syncedAt: store.activeSnapshot.activatedAt,
    ageHours: 0.3,
    syncStatus,
    grossSales,
    transactionCount,
    recordedCost,
    recordedGrossProfit,
    missingCostSales: 2,
    customerBalance,
    criticalItems,
    outOfStockItems,
    overdueBalance: customerBalance * 0.24,
    overdueSaleCount: 3,
    highDiscountSaleCount: 1,
    netCashFlow,
  };
}

function inventorySummaryReport(url: URL) {
  return {
    openingSnapshotDate: '2026-09-21',
    actualSnapshotDate: url.searchParams.get('to') || '2026-09-28',
    rows: [
      summaryRow('LPG-2.7', '2.7 kg LPG', 21, 8, 12, 18, 6, 0, 0, 0, 15, 12),
      summaryRow('LPG-11', '11 kg LPG', 38, 16, 30, 42, 18, 2, 0, 4, 24, 22),
      summaryRow('LPG-22', '22 kg LPG', 24, 11, 16, 19, 8, 0, 1, 2, 18, 13),
      summaryRow('LPG-50', '50 kg LPG', 8, 3, 6, 10, 2, 0, 0, 1, 3, 5),
    ],
  };
}

function summaryRow(
  itemCode: string,
  itemName: string,
  openingFilled: number,
  openingEmpty: number,
  deliveries: number,
  sales: number,
  refill: number,
  pullOut: number,
  defective: number,
  backload: number,
  actualFilled: number,
  actualEmpty: number,
) {
  return {
    itemCode,
    itemName,
    openingFilled,
    openingEmpty,
    deliveries,
    sales,
    refill,
    pullOut,
    defective,
    backload,
    actualFilled,
    actualEmpty,
  };
}

function reportSchedules() {
  return {
    scheduledReportsEnabled: true,
    recipientEmail: 'owner@vmjam.example',
    emailVerifiedAt: '2026-09-01T01:00:00.000Z',
    emailDeliveryConfigured: true,
    deliveryTime: '07:00 store time',
    weeklyDeliveryDay: 'Monday',
    schedules: [
      {
        id: 'schedule-daily',
        storeId: stores[0].id,
        frequency: 'DAILY',
        enabled: true,
        nextRunAt: '2026-09-28T23:00:00.000Z',
        lastAttemptAt: '2026-09-27T23:00:00.000Z',
        lastSuccessAt: '2026-09-27T23:00:04.000Z',
      },
      {
        id: 'schedule-weekly',
        storeId: stores[0].id,
        frequency: 'WEEKLY',
        enabled: true,
        nextRunAt: '2026-10-04T23:00:00.000Z',
        lastAttemptAt: '2026-09-27T23:00:00.000Z',
        lastSuccessAt: '2026-09-27T23:00:05.000Z',
      },
    ],
    deliveries: [
      {
        id: 'delivery-0927',
        storeId: stores[0].id,
        frequency: 'DAILY',
        periodFrom: '2026-09-27',
        periodTo: '2026-09-27',
        status: 'DELIVERED',
        attemptCount: 1,
        snapshotAgeHours: 1,
        dataQualityStatus: 'COMPLETE',
        warning: null,
        providerMessageId: 'resend-guide-0927',
        providerStatus: 'email.delivered',
        sentAt: '2026-09-27T23:00:00.000Z',
        deliveredAt: '2026-09-27T23:00:04.000Z',
        createdAt: '2026-09-27T23:00:00.000Z',
      },
      {
        id: 'delivery-0926',
        storeId: stores[0].id,
        frequency: 'DAILY',
        periodFrom: '2026-09-26',
        periodTo: '2026-09-26',
        status: 'DELIVERED',
        attemptCount: 1,
        snapshotAgeHours: 2,
        dataQualityStatus: 'PARTIAL',
        warning: '5 sales are missing recorded cost.',
        providerMessageId: 'resend-guide-0926',
        providerStatus: 'email.delivered',
        sentAt: '2026-09-26T23:00:00.000Z',
        deliveredAt: '2026-09-26T23:00:05.000Z',
        createdAt: '2026-09-26T23:00:00.000Z',
      },
    ],
  };
}

function activityLog() {
  return {
    items: [
      activity(
        'security',
        '2026-09-28T05:58:00.000Z',
        'SECURITY',
        'SUCCESS',
        'Signed in',
        'A portal session was opened from Chrome on Windows.',
        'Alex Rivera',
        null,
        null,
      ),
      activity(
        'sync-main',
        '2026-09-28T05:47:00.000Z',
        'STORE_SYNC',
        'SUCCESS',
        'Store data synchronized',
        'A new reporting snapshot using schema 27 became active.',
        'POS device',
        stores[0].id,
        stores[0].name,
      ),
      activity(
        'report',
        '2026-09-27T23:00:05.000Z',
        'REPORTING',
        'SUCCESS',
        'Scheduled report delivered',
        'The daily owner summary was delivered successfully.',
        'Platform',
        stores[0].id,
        stores[0].name,
      ),
      activity(
        'preference',
        '2026-09-27T10:14:00.000Z',
        'SETTINGS',
        'SUCCESS',
        'Dashboard preferences updated',
        'The overview metric order was changed.',
        'Alex Rivera',
        null,
        null,
      ),
      activity(
        'backup',
        '2026-09-27T02:00:00.000Z',
        'BACKUP',
        'WARNING',
        'Platform backup needs review',
        'The backup completed with a retention warning.',
        'Platform',
        null,
        null,
      ),
    ],
    total: 37,
    page: 1,
    pageSize: 25,
    filterOptions: {
      actions: [
        { value: 'SECURITY', label: 'Security and access' },
        { value: 'STORE_SYNC', label: 'Store synchronization' },
        { value: 'SETTINGS', label: 'Portal settings' },
        { value: 'REPORTING', label: 'Scheduled reporting' },
        { value: 'BACKUP', label: 'Backup and recovery' },
      ],
      stores: stores.map((store) => ({ id: store.id, name: store.name })),
    },
  };
}

function activity(
  id: string,
  occurredAt: string,
  action: string,
  status: string,
  title: string,
  detail: string,
  actor: string,
  storeId: string | null,
  storeName: string | null,
) {
  return { id, occurredAt, action, status, title, detail, actor, storeId, storeName };
}

function buildGuideHtml(imageData: Map<string, string>): string {
  const coverImage = imageData.get('overview') ?? '';
  const featurePages = guideScreens
    .map((screen, index) => featurePage(screen, imageData.get(screen.id) ?? '', index + 3))
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Owner Dashboard Feature Guide</title>
  <style>${guideCss()}</style>
</head>
<body>
  <section class="page cover">
    <img class="cover-image" src="${coverImage}" alt="Owner Dashboard overview" />
    <div class="cover-shade"></div>
    <header class="cover-brand">
      <span class="brand-mark">VMJAM</span>
      <span>SALES</span>
    </header>
    <div class="cover-copy">
      <p class="kicker light">PRODUCT GUIDE / 2026</p>
      <h1>Owner Dashboard<br />Feature Guide</h1>
      <p class="cover-deck">See the business clearly. Act from evidence. Stay connected to every store.</p>
    </div>
    <footer class="cover-footer">
      <span>Web owner portal for POSv2</span>
      <span>Representative demo data</span>
    </footer>
  </section>

  <section class="page contents">
    ${pageHeader('GUIDE MAP', '02')}
    <div class="contents-intro">
      <p class="kicker">THE OWNER PROMISE</p>
      <h2>One trusted place to understand sales, stock, cash, customers, and every store.</h2>
      <p>The portal extends the synchronized POS record into a read-only management experience built for decisions—not data entry.</p>
    </div>
    <div class="chapter-grid">
      ${chapter('01', 'Executive control', 'Overview · Sales Trends · Period comparison')}
      ${chapter('02', 'Revenue performance', 'Sales · Targets · Product performance · Profitability')}
      ${chapter('03', 'Stock operations', 'Inventory · Reorder planning · Transfers · Restocks')}
      ${chapter('04', 'Customer and cash', 'Balances · Aging · Customer insights · Cash flow')}
      ${chapter('05', 'Multi-store reporting', 'All stores · Alerts · Feature Mod reports · CSV export')}
      ${chapter('06', 'Trust and governance', 'Schedules · Preferences · Security · Data quality · Activity')}
    </div>
    <aside class="guide-note">
      <strong>How to read this guide</strong>
      <span>Numbered markers connect each real dashboard screenshot to the business value described below it. All figures shown are representative demo data.</span>
    </aside>
    ${pageFooter(2)}
  </section>

  ${featurePages}

  <section class="page final-page">
    ${pageHeader('COMPLETE CAPABILITY MAP', String(guideScreens.length + 3).padStart(2, '0'))}
    <div class="final-heading">
      <p class="kicker">THE COMPLETE OWNER VIEW</p>
      <h2>From a morning check-in to a month-end review.</h2>
      <p>Every feature is designed to shorten the distance between a business question and a trustworthy answer.</p>
    </div>
    <div class="feature-index">
      ${featureColumn('Revenue', ['Overview', 'Sales Records', 'Sales Trends', 'Sales Targets', 'Product Performance', 'Profitability', 'Payment Analysis'])}
      ${featureColumn('Operations', ['Inventory', 'Reorder Planning', 'Transfers', 'Transfer Details', 'Restocks & Suppliers', 'Search, Filters & CSV'])}
      ${featureColumn('Customers & cash', ['Balances', 'Receivables Aging', 'Customer Insights', 'Cash Flow', 'All Stores & Alerts'])}
      ${featureColumn('Reports & trust', ['Summary CSV', 'Financial Report', 'Discount Report', 'Purchase Report', 'Special Receipts', 'Customer Report', 'Scheduled Reports', 'Preferences', 'Security', 'Data Quality', 'Sync & Backup', 'Activity Log'])}
    </div>
    <blockquote>
      “The dashboard is not a second POS. It is the owner’s evidence layer: synchronized, read-only, and organized for action.”
    </blockquote>
    <div class="closing-brand"><span class="brand-mark">VMJAM</span><span>SALES</span></div>
    ${pageFooter(guideScreens.length + 3)}
  </section>
</body>
</html>`;
}

function featurePage(screen: GuideScreen, image: string, pageNumber: number): string {
  const pins = screen.pins
    .map((pin) => `<span class="pin" style="left:${pin.x}%;top:${pin.y}%">${pin.number}</span>`)
    .join('');
  const explanations = screen.features
    .map((feature, index) => `<li><span>${index + 1}</span><p>${escapeHtml(feature)}</p></li>`)
    .join('');
  return `<section class="page feature-page">
    ${pageHeader(screen.eyebrow, String(pageNumber).padStart(2, '0'))}
    <div class="feature-heading">
      <h2>${escapeHtml(screen.title)}</h2>
      <p>${escapeHtml(screen.pitch)}</p>
    </div>
    <figure class="screen-frame">
      <img src="${image}" alt="${escapeHtml(screen.title)}" />
      ${pins}
    </figure>
    <ol class="callout-list">${explanations}</ol>
    ${pageFooter(pageNumber)}
  </section>`;
}

function pageHeader(section: string, page: string): string {
  return `<header class="page-header"><div><span class="brand-mark">VMJAM</span><span>SALES</span></div><p>${section}</p><b>${page}</b></header>`;
}

function pageFooter(page: number): string {
  return `<footer class="page-footer"><span>OWNER DASHBOARD FEATURE GUIDE</span><b>${String(page).padStart(2, '0')}</b></footer>`;
}

function chapter(number: string, title: string, detail: string): string {
  return `<article class="chapter"><b>${number}</b><div><h3>${title}</h3><p>${detail}</p></div></article>`;
}

function featureColumn(title: string, features: string[]): string {
  return `<section><h3>${title}</h3><ul>${features.map((feature) => `<li>${feature}</li>`).join('')}</ul></section>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function guideCss(): string {
  return `
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; color: #171712; background: #d8d3c8; font-family: "Segoe UI", Arial, sans-serif; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 210mm; height: 297mm; position: relative; overflow: hidden; background: #f3efe6; padding: 13mm 14mm 14mm; break-after: page; }
    .page:last-child { break-after: auto; }
    .page-header { height: 10mm; border-bottom: 0.35mm solid #bdb6a7; display: grid; grid-template-columns: 1fr auto 10mm; gap: 5mm; align-items: start; font-size: 7.2pt; letter-spacing: .12em; }
    .page-header > div, .closing-brand { display: flex; gap: 1.5mm; align-items: center; font-weight: 800; letter-spacing: .08em; }
    .brand-mark { background: #d59b28; color: #171712; padding: 1.05mm 1.5mm .8mm; line-height: 1; }
    .page-header p { margin: .4mm 0 0; font-weight: 700; color: #6c6559; }
    .page-header b { text-align: right; font-size: 8pt; }
    .page-footer { position: absolute; left: 14mm; right: 14mm; bottom: 7mm; border-top: .3mm solid #c9c2b4; padding-top: 2.2mm; display: flex; justify-content: space-between; font-size: 6.7pt; letter-spacing: .12em; color: #726b5e; }
    .kicker { margin: 0 0 3mm; color: #9b6e16; font-size: 8pt; font-weight: 800; letter-spacing: .19em; }
    .kicker.light { color: #f0b640; }
    h1, h2, h3, p { margin-top: 0; }
    .cover { padding: 0; background: #171712; color: #fff; }
    .cover-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 39% center; filter: saturate(.82) contrast(1.02); }
    .cover-shade { position: absolute; inset: 0; background: rgba(18, 18, 14, .72); }
    .cover-brand { position: absolute; top: 15mm; left: 15mm; display: flex; align-items: center; gap: 2mm; font-size: 9pt; font-weight: 800; letter-spacing: .12em; }
    .cover-copy { position: absolute; left: 15mm; right: 20mm; top: 91mm; }
    .cover h1 { margin: 0; max-width: 178mm; font-family: Georgia, "Times New Roman", serif; font-weight: 500; font-size: 40pt; line-height: .98; letter-spacing: -.035em; }
    .cover-deck { width: 128mm; margin: 10mm 0 0; font-size: 14pt; line-height: 1.45; color: #e7e1d5; }
    .cover-footer { position: absolute; left: 15mm; right: 15mm; bottom: 14mm; border-top: .35mm solid rgba(255,255,255,.38); padding-top: 3mm; display: flex; justify-content: space-between; font-size: 7pt; letter-spacing: .13em; text-transform: uppercase; color: #d6d0c4; }
    .contents-intro { margin-top: 17mm; width: 170mm; }
    .contents-intro h2, .final-heading h2 { margin-bottom: 5mm; font-family: Georgia, "Times New Roman", serif; font-size: 27pt; line-height: 1.08; font-weight: 500; letter-spacing: -.025em; }
    .contents-intro > p:last-child, .final-heading > p:last-child { width: 142mm; font-size: 11pt; line-height: 1.55; color: #5d574d; }
    .chapter-grid { margin-top: 13mm; display: grid; grid-template-columns: 1fr 1fr; border-top: .45mm solid #171712; }
    .chapter { min-height: 29mm; display: grid; grid-template-columns: 12mm 1fr; gap: 5mm; padding: 5mm 4mm 4mm 0; border-bottom: .3mm solid #bdb6a7; }
    .chapter:nth-child(odd) { border-right: .3mm solid #bdb6a7; }
    .chapter:nth-child(even) { padding-left: 6mm; }
    .chapter > b { color: #b27a12; font-size: 9pt; }
    .chapter h3 { margin-bottom: 2mm; font-family: Georgia, "Times New Roman", serif; font-size: 13pt; font-weight: 600; }
    .chapter p { margin: 0; font-size: 8.5pt; line-height: 1.45; color: #625b50; }
    .guide-note { position: absolute; left: 14mm; right: 14mm; bottom: 24mm; border-left: 1.5mm solid #d59b28; padding: 3mm 0 3mm 5mm; display: grid; grid-template-columns: 40mm 1fr; gap: 7mm; font-size: 8.5pt; line-height: 1.5; color: #5d574d; }
    .guide-note strong { color: #171712; }
    .feature-heading { height: 64mm; padding-top: 11mm; display: grid; grid-template-columns: 1.22fr .78fr; gap: 11mm; align-items: end; }
    .feature-heading h2 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: 25pt; line-height: 1.08; font-weight: 500; letter-spacing: -.025em; }
    .feature-heading p { margin: 0 0 1mm; font-size: 9.6pt; line-height: 1.55; color: #595348; }
    .screen-frame { position: relative; width: 182mm; height: 119mm; margin: 4mm 0 0; overflow: hidden; background: #e4ded1; border: .35mm solid #9e9789; box-shadow: 0 3mm 8mm rgba(30, 27, 20, .12); }
    .screen-frame img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top left; }
    .pin { position: absolute; transform: translate(-50%, -50%); width: 7.5mm; height: 7.5mm; border-radius: 50%; display: grid; place-items: center; background: #d59b28; border: .7mm solid #171712; color: #171712; font-size: 8pt; font-weight: 900; box-shadow: 0 1mm 2mm rgba(0,0,0,.25); }
    .callout-list { height: 57mm; margin: 7mm 0 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(3, 1fr); gap: 7mm; }
    .callout-list li { border-top: .5mm solid #171712; padding-top: 4mm; display: grid; grid-template-columns: 7mm 1fr; gap: 3mm; align-content: start; }
    .callout-list li > span { width: 6mm; height: 6mm; border-radius: 50%; display: grid; place-items: center; background: #d59b28; font-size: 7pt; font-weight: 900; }
    .callout-list p { margin: 0; font-size: 8.6pt; line-height: 1.48; color: #4f493f; }
    .final-heading { margin-top: 16mm; width: 175mm; }
    .feature-index { margin-top: 12mm; display: grid; grid-template-columns: 1fr 1fr; border-top: .5mm solid #171712; }
    .feature-index section { min-height: 62mm; padding: 5mm 6mm 5mm 0; border-bottom: .3mm solid #bbb3a5; }
    .feature-index section:nth-child(odd) { border-right: .3mm solid #bbb3a5; }
    .feature-index section:nth-child(even) { padding-left: 7mm; }
    .feature-index h3 { margin-bottom: 3mm; font-family: Georgia, "Times New Roman", serif; font-size: 13pt; }
    .feature-index ul { margin: 0; padding: 0; list-style: none; columns: 2; column-gap: 5mm; }
    .feature-index li { break-inside: avoid; margin: 0 0 2mm; padding-left: 3mm; border-left: .7mm solid #d59b28; font-size: 8pt; line-height: 1.35; color: #4f493f; }
    blockquote { margin: 11mm 0 0; width: 158mm; padding: 0 0 0 7mm; border-left: 1.5mm solid #d59b28; font-family: Georgia, "Times New Roman", serif; font-size: 16pt; line-height: 1.35; color: #2d2a24; }
    .closing-brand { position: absolute; right: 14mm; bottom: 21mm; font-size: 8pt; }
  `;
}
