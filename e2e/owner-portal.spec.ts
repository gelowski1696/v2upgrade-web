import { expect, Page, Request, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const user = {
  id: 'portal-user',
  sessionId: 'session-current',
  clientId: 'client-one',
  username: 'owner@example.test',
  displayName: 'Test Owner',
  role: 'OWNER',
  storeIds: ['store-one'],
};

const store = {
  id: 'store-one',
  code: 'MAIN',
  name: 'Main LPG Store',
  timezone: 'Asia/Manila',
  activeSnapshot: {
    schemaVersion: 27,
    snapshotCreatedAt: '2026-09-30T12:00:00.000Z',
    activatedAt: '2026-09-30T12:02:00.000Z',
  },
};

test('meets the automated accessibility baseline on sign in', async ({ page }) => {
  await mockReports(page, async () => undefined);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  const results = await accessibilityScan(page);

  expect(results.violations.length, formatAccessibilityViolations(results.violations)).toBe(0);
});

test('keeps the sign-in controls keyboard reachable in order', async ({ page }) => {
  await mockReports(page, async () => undefined);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email or username')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused();
});

test('meets the automated accessibility baseline on the dashboard', async ({ page }) => {
  await seedSession(page);
  await mockReports(page, async () => undefined);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

  const results = await accessibilityScan(page);

  expect(results.violations.length, formatAccessibilityViolations(results.violations)).toBe(0);
});

test('activates a portal account and opens the synchronized overview', async ({ page }) => {
  await mockReports(page, async (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/portal/auth/web/activate')) {
      return authResult();
    }
    return undefined;
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Activate a new account' }).click();
  await page.getByLabel('Activation token').fill('one-time-activation-token');
  await page.getByLabel('Password').fill('StrongOwnerPassword123!');
  await page.getByRole('button', { name: 'Activate account' }).click();

  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.getByLabel(/^Store/)).toHaveValue(store.id);
  await expect(
    page.getByRole('region', { name: 'Period summary' }).getByText(/1,250\.00/),
  ).toBeVisible();
});

test('compares sales periods and changes trend grouping without reloading the overview', async ({
  page,
}) => {
  await seedSession(page);
  const trendGroups: string[] = [];
  let overviewRequests = 0;
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname.endsWith('/overview')) {
      overviewRequests += 1;
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/sales-trends')) {
      trendGroups.push(url.searchParams.get('group') ?? '');
    }
    return undefined;
  });

  await page.goto('/');
  const analytics = page.getByRole('region', { name: 'Sales trend' });
  await expect(analytics).toBeVisible();
  await expect(analytics.getByText('Previous period Aug 2, 2026 to Aug 31, 2026')).toBeVisible();
  await expect(analytics.getByText('25.0% higher')).toBeVisible();
  await analytics.getByRole('button', { name: 'Weekly' }).click();
  await expect(analytics.getByText('Gross sales by week')).toBeVisible();
  await expect.poll(() => trendGroups).toEqual(['day', 'week']);
  expect(overviewRequests).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('tracks monthly sales targets and saves portal-only target values', async ({ page }) => {
  await seedSession(page);
  await page.clock.setFixedTime(new Date('2026-09-28T04:00:00.000Z'));
  const targetUrls: string[] = [];
  let savedTarget: Record<string, unknown> | null = null;
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith('/sales-targets') && request.method() === 'GET') {
      targetUrls.push(request.url());
      const month = url.searchParams.get('month') ?? '2026-09';
      return {
        json: fresh({
          month,
          from: `${month}-01`,
          to: `${month}-30`,
          canEdit: true,
          target: {
            configured: true,
            sales: 1000,
            recordedGrossProfit: 600,
            updatedAt: '2026-09-20T00:00:00.000Z',
          },
          actual: {
            grossSales: 650,
            recordedGrossProfit: 550,
            transactionCount: 2,
            costCoveragePercent: 50,
            profitDataComplete: false,
            missingCostSales: 1,
          },
          progress: {
            salesPercent: 65,
            recordedGrossProfitPercent: 91.67,
          },
          pace: {
            status: 'ACTIVE',
            totalDays: 30,
            elapsedDays: 20,
            remainingDays: 10,
            expectedProgressPercent: 66.67,
            salesRemaining: 350,
            recordedGrossProfitRemaining: 50,
            salesRequiredPerDay: 35,
            recordedGrossProfitRequiredPerDay: 5,
            projectedSales: 975,
            projectedRecordedGrossProfit: 825,
          },
        }),
      };
    }
    if (url.pathname.endsWith('/sales-targets') && request.method() === 'POST') {
      savedTarget = request.postDataJSON() as Record<string, unknown>;
      return {
        json: fresh({
          month: savedTarget.month,
          from: '2026-09-01',
          to: '2026-09-30',
          canEdit: true,
          target: {
            configured: true,
            sales: savedTarget.salesTarget,
            recordedGrossProfit: savedTarget.recordedGrossProfitTarget,
            updatedAt: '2026-09-28T00:00:00.000Z',
          },
          actual: {
            grossSales: 650,
            recordedGrossProfit: 550,
            transactionCount: 2,
            costCoveragePercent: 50,
            profitDataComplete: false,
            missingCostSales: 1,
          },
          progress: {
            salesPercent: 54.17,
            recordedGrossProfitPercent: 78.57,
          },
          pace: {
            status: 'ACTIVE',
            totalDays: 30,
            elapsedDays: 20,
            remainingDays: 10,
            expectedProgressPercent: 66.67,
            salesRemaining: 550,
            recordedGrossProfitRemaining: 150,
            salesRequiredPerDay: 55,
            recordedGrossProfitRequiredPerDay: 15,
            projectedSales: 975,
            projectedRecordedGrossProfit: 825,
          },
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Sales targets');

  const workspace = page.getByRole('region', { name: /September 2026/ });
  await expect(workspace).toBeVisible();
  await expect(workspace.getByText('65%')).toBeVisible();
  await expect(workspace.getByText('91.7%')).toBeVisible();
  await expect(workspace.getByText(/1 sale/)).toBeVisible();

  await page.getByLabel('Gross sales target').fill('1200');
  await page.getByLabel('Recorded gross profit target').fill('700');
  await page.getByRole('button', { name: 'Save targets' }).click();
  await expect(page.getByText('Targets saved for September 2026.')).toBeVisible();
  expect(savedTarget).toEqual({
    month: '2026-09',
    salesTarget: 1200,
    recordedGrossProfitTarget: 700,
  });

  await page.getByLabel('Sales target month').fill('2026-10');
  await page.getByLabel('Sales target month').press('Tab');
  await expect.poll(() => targetUrls.length).toBeGreaterThanOrEqual(2);
  expect(new URL(targetUrls.at(-1)!).searchParams.get('month')).toBe('2026-10');
  await expect(page.getByRole('heading', { name: 'October 2026' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('signs in, opens sales, and changes pages without losing the store scope', async ({
  page,
}) => {
  await mockReports(page, async (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/portal/auth/web/login')) {
      return authResult();
    }
    return undefined;
  });

  await page.goto('/');
  await page.getByLabel('Email or username').fill(user.username);
  await page.getByLabel('Password').fill('StrongOwnerPassword123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

  await navigateToReport(page, 'Sales');

  await expect(page.getByRole('heading', { name: 'Sales' })).toBeVisible();
  await expect(page.getByText('SALE-PAGE-1')).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('SALE-PAGE-2')).toBeVisible();
  await expect(page.getByLabel(/^Store/)).toHaveValue(store.id);
});

test('debounces report search, resets paging, and clears sales filters', async ({ page }) => {
  await seedSession(page);
  const filteredUrls: string[] = [];
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    const search = url.searchParams.get('search');
    if (request.method() === 'GET' && url.pathname.endsWith('/sales') && search) {
      filteredUrls.push(request.url());
      const noMatch = search === 'missing sale';
      return {
        json: fresh({
          items: noMatch
            ? []
            : [
                {
                  id: 99,
                  saleDate: '2026-09-30T10:00:00.000Z',
                  reference: 'FILTERED-SALE',
                  customer: 'Filtered Customer',
                  payment: 'CASH',
                  status: 'COMPLETED',
                  totalAmount: 250,
                },
              ],
          total: noMatch ? 0 : 1,
          page: 1,
          pageSize: 25,
          filterOptions: { statuses: ['CANCELLED', 'COMPLETED'], payments: ['CASH'] },
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Sales');
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('SALE-PAGE-2')).toBeVisible();

  const search = page.getByLabel('Search Sales');
  await search.fill('Filtered Customer');
  await expect(page.getByText('FILTERED-SALE')).toBeVisible();
  await expect.poll(() => filteredUrls.length).toBe(1);
  let requested = new URL(filteredUrls.at(-1)!);
  expect(requested.searchParams.get('page')).toBe('1');
  expect(requested.searchParams.get('search')).toBe('Filtered Customer');

  await page.getByLabel('Status').selectOption('COMPLETED');
  await page.getByLabel('Payment').selectOption('CASH');
  await expect.poll(() => filteredUrls.length).toBe(3);
  requested = new URL(filteredUrls.at(-1)!);
  expect(requested.searchParams.get('status')).toBe('COMPLETED');
  expect(requested.searchParams.get('payment')).toBe('CASH');

  await search.fill('missing sale');
  await expect(page.getByText('No records match these filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear report filters' }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByLabel('Status')).toHaveValue('');
  await expect(page.getByLabel('Payment')).toHaveValue('');
  await expect(page.getByText('SALE-PAGE-1')).toBeVisible();
});

test('opens a read-only sale detail with items, notes, and totals', async ({ page }) => {
  await seedSession(page);
  await mockReports(page, async (request) => {
    if (request.method() === 'GET' && request.url().endsWith('/sales/1')) {
      return {
        json: fresh({
          sale: {
            id: 1,
            reference: 'SALE-PAGE-1',
            customer: 'Test Customer',
            payment: 'CASH',
            cashier: 'Cashier One',
            itemCount: 2,
            subtotal: 130,
            totalAmount: 125,
            creditPaid: 0,
            creditBalance: '0',
            status: 'COMPLETED',
            discount: 5,
            category: 'DELIVERY',
            paymentType: 'FULL PAYMENT',
            totalCost: 75,
            specialDiscount: 0,
            tender: 150,
            change: 25,
            saleDate: '2026-09-30T10:00:00.000Z',
          },
          items: [
            {
              id: 11,
              reference: 'SALE-PAGE-1',
              itemCode: 'LPG-11',
              description: '11 kg LPG refill',
              unit: 'PC',
              price: 65,
              total: 125,
              quantity: 2,
              discount: 5,
              status: 'SOLD',
              unitCost: 37.5,
              totalCost: 75,
              saleDate: '2026-09-30T10:00:00.000Z',
            },
          ],
          notes: 'Deliver to the side entrance.',
          attachmentStatus: 'NOT_SYNCED',
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Sales');
  await page.getByRole('button', { name: 'View details for sale SALE-PAGE-1' }).click();

  const dialog = page.getByRole('dialog', { name: 'SALE-PAGE-1' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('11 kg LPG refill')).toBeVisible();
  await expect(dialog.getByText('Cashier One')).toBeVisible();
  await expect(dialog.getByText('Deliver to the side entrance.')).toBeVisible();
  await expect(dialog.getByText('Attachment not synchronized')).toBeVisible();
  await expect(dialog.getByText(/125\.00/).first()).toBeVisible();

  await dialog.getByRole('button', { name: 'Close', exact: true }).click({ force: true });
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'View details for sale SALE-PAGE-1' }),
  ).toBeFocused();
});

test('opens a read-only transfer detail with items and supplier payments', async ({ page }) => {
  await seedSession(page);
  await mockReports(page, async (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'GET' && path.endsWith('/transfers/1')) {
      return {
        json: fresh({
          transfer: {
            id: 1,
            reference: 'TR-1',
            supplier: 'Supplier A',
            destination: 'Store',
            type: 'RESTOCK IN',
            totalQuantity: 7,
            totalAmount: 500,
            encoder: 'Owner',
            transferDate: '2026-09-15T10:00:00.000Z',
            status: 'CONFIRMED',
            restockPrice: 500,
            purchaseAmount: 500,
            notes: 'September stock',
            invoiceReference: 'DR-1001',
            confirmedAt: '2026-09-15T10:15:00.000Z',
            paidAt: '',
            paymentMethod: '',
            paymentReference: '',
            paymentStatus: 'PARTIALLY PAID',
            paidAmount: 220,
            outstandingAmount: 280,
            driverId: 4,
            driverName: 'Driver One',
          },
          lines: [
            {
              id: 1,
              itemCode: 'LPG-11',
              itemName: '11 kg LPG',
              itemSize: '11 kg',
              unit: 'FULL',
              quantity: 5,
              unitCost: 100,
              lineTotal: 500,
            },
            {
              id: 2,
              itemCode: 'LPG-EMPTY-11',
              itemName: '11 kg empty cylinder',
              itemSize: '11 kg',
              unit: 'EMPTY',
              quantity: 2,
              unitCost: 0,
              lineTotal: 0,
            },
          ],
          payments: [
            {
              id: 2,
              kind: 'REFUND',
              amount: 20,
              method: 'CASH',
              reference: 'RF-20',
              notes: 'Damaged item',
              paidAt: '2026-09-16T15:00:00.000Z',
              recordedBy: 'Owner',
            },
            {
              id: 1,
              kind: 'PAYMENT',
              amount: 240,
              method: 'BANK TRANSFER',
              reference: 'BANK-1',
              notes: '',
              paidAt: '2026-09-15T15:00:00.000Z',
              recordedBy: 'Owner',
            },
          ],
          lineItemsAvailable: true,
          paymentHistoryAvailable: true,
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/transfers')) {
      return {
        json: fresh({
          items: [
            {
              id: 1,
              reference: 'TR-1',
              supplier: 'Supplier A',
              destination: 'Store',
              type: 'RESTOCK IN',
              totalQuantity: 7,
              totalAmount: 500,
              encoder: 'Owner',
              transferDate: '2026-09-15T10:00:00.000Z',
              status: 'CONFIRMED',
              restockPrice: 500,
              notes: 'September stock',
              paymentStatus: 'PARTIALLY PAID',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 25,
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Transfers');
  await page.getByRole('button', { name: 'View details for transfer TR-1' }).click();

  const dialog = page.getByRole('dialog', { name: 'TR-1' });
  await expect(dialog).toBeVisible();
  const fillItems = dialog.getByRole('region', { name: 'Fill items' });
  const emptyItems = dialog.getByRole('region', { name: 'Empty items' });
  await expect(fillItems.getByText('11 kg LPG')).toBeVisible();
  await expect(fillItems.getByText('5 total')).toBeVisible();
  await expect(emptyItems.getByText('11 kg empty cylinder')).toBeVisible();
  await expect(emptyItems.getByText('2 total')).toBeVisible();
  await expect(dialog.getByText('Driver One')).toBeVisible();
  await expect(dialog.getByText('DR-1001')).toBeVisible();
  await expect(dialog.getByText('PARTIALLY PAID')).toBeVisible();
  await expect(dialog.getByText('Damaged item')).toBeVisible();
  await expect(dialog.getByText(/280\.00/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Close transfer details' }).click();
  await expect(dialog).toBeHidden();
});

test('shows a recoverable state when a sale detail no longer exists', async ({ page }) => {
  await seedSession(page);
  await mockReports(page, async (request) => {
    if (request.method() === 'GET' && request.url().endsWith('/sales/1')) {
      return { status: 404, json: { message: 'Sale was not found.' } };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Sales');
  await page.getByRole('button', { name: 'View details for sale SALE-PAGE-1' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Sale details unavailable')).toBeVisible();
  await expect(dialog.getByText('Sale was not found.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('exports every matching report row with the selected store and dates', async ({ page }) => {
  await seedSession(page);
  let exportUrl = '';
  let exportRequests = 0;
  await mockReports(page, async (request) => {
    if (request.method() === 'GET' && request.url().includes('/exports/sales')) {
      exportUrl = request.url();
      exportRequests += 1;
      return {
        json: fresh({
          fileName: 'main-lpg-store-sales-2026-09-01-to-2026-09-30.csv',
          content: '\uFEFFDate,Reference,Total\r\n2026-09-30,SALE-1,125\r\n',
          rowCount: 26,
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Export CSV' })).toHaveCount(0);
  await navigateToReport(page, 'Sales');

  await page.getByLabel('Search Sales').fill('Test Customer');
  await page.getByLabel('Status').selectOption('COMPLETED');
  await page.getByLabel('Payment').selectOption('CASH');
  await expect(page.getByText('SALE-PAGE-1')).toBeVisible();
  const from = await page.locator('.date-filter input[type="date"]').nth(0).inputValue();
  const to = await page.locator('.date-filter input[type="date"]').nth(1).inputValue();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('main-lpg-store-sales-2026-09-01-to-2026-09-30.csv');
  await expect(page.getByText('Exported 26 records.')).toBeVisible();
  expect(exportRequests).toBe(1);
  const requested = new URL(exportUrl);
  expect(requested.searchParams.get('from')).toBe(from);
  expect(requested.searchParams.get('to')).toBe(to);
  expect(requested.searchParams.get('search')).toBe('Test Customer');
  expect(requested.searchParams.get('status')).toBe('COMPLETED');
  expect(requested.searchParams.get('payment')).toBe('CASH');
});

test('reviews receivables aging and opens read-only customer history', async ({ page }) => {
  await seedSession(page);
  let agingUrl = '';
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname.endsWith('/receivables-aging')) {
      agingUrl = request.url();
      return {
        json: fresh({
          asOf: '2026-09-30',
          totalReceivables: 675,
          customerCount: 2,
          invoiceTotal: 675,
          reconciliationDifference: 0,
          buckets: {
            current: 100,
            oneToThirty: 275,
            thirtyOneToSixty: 200,
            sixtyOneToNinety: 0,
            overNinety: 100,
            unallocated: 0,
          },
          datedInvoiceCount: 4,
          unallocatedInvoiceCount: 0,
          highestBalances: [
            {
              id: 1,
              name: 'Customer One',
              contact: '09171234567',
              balance: 500,
              status: 'active',
            },
          ],
          recentCollections: [
            {
              id: 10,
              reference: 'SALE-2',
              customerId: 1,
              customer: 'Customer One',
              amount: 50,
              paymentDate: '2026-09-29T10:00:00.000Z',
              paymentMethod: 'CASH',
              remainingBalance: 75,
            },
          ],
          agingBasis: 'SALE_DATE',
        }),
      };
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/customer-balances')) {
      return {
        json: fresh({
          items: [
            {
              id: 1,
              name: 'Customer One',
              contact: '09171234567',
              balance: 500,
              status: 'active',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 25,
        }),
      };
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/customers/1/balance-history')) {
      return {
        json: fresh({
          customer: {
            id: 1,
            name: 'Customer One',
            contact: '09171234567',
            balance: 500,
            status: 'active',
          },
          openInvoices: [
            {
              id: 4,
              reference: 'SALE-4',
              saleDate: '2026-09-15T10:00:00.000Z',
              totalAmount: 575,
              balance: 500,
              payment: 'CREDIT',
              paymentType: 'PARTIAL PAYMENT',
            },
          ],
          payments: [
            {
              id: 10,
              reference: 'SALE-2',
              amount: 50,
              paymentDate: '2026-09-29T10:00:00.000Z',
              paymentMethod: 'CASH',
              balanceBefore: 550,
              balanceAfter: 500,
            },
          ],
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Customer balances');

  const aging = page.getByRole('region', { name: 'Receivables aging' });
  await expect(aging).toBeVisible();
  await expect(aging.getByText('Total receivables')).toBeVisible();
  await expect(aging.getByText(/675\.00/)).toBeVisible();
  await expect(aging.getByText('1-30 days')).toBeVisible();
  await expect(aging.getByText('41% of total')).toBeVisible();
  await expect(aging.getByText('Recent collections')).toBeVisible();
  await expect(aging.getByRole('button', { name: /Customer One/ })).toBeVisible();

  const selectedTo = await page.locator('.date-filter input[type="date"]').nth(1).inputValue();
  await expect.poll(() => agingUrl).not.toBe('');
  expect(new URL(agingUrl).searchParams.get('to')).toBe(selectedTo);

  const highestBalance = aging.getByRole('button', { name: /Customer One/ });
  await highestBalance.focus();
  await highestBalance.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Customer One' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Open invoices' })).toBeVisible();
  await expect(dialog.getByText('SALE-4')).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Collection history' })).toBeVisible();
  await expect(dialog.getByText('SALE-2')).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await dialog.getByRole('button', { name: 'Close customer balance history' }).click();
  await expect(dialog).toBeHidden();
});

test('loads cash flow as a date-range report without pagination parameters', async ({ page }) => {
  await seedSession(page);
  let cashFlowUrl = '';
  await mockReports(page, async (request) => {
    if (request.method() === 'GET' && request.url().includes('/cash-flow')) {
      cashFlowUrl = request.url();
      return {
        json: fresh({
          openingBalance: 1000,
          salesReceipts: 500,
          creditCollections: 100,
          capitalCashIn: 0,
          pettyCashOut: 50,
          salaryPaid: 75,
          restockPayments: 125,
          cashReceived: 600,
          cashPaid: 250,
          closingBalance: 1350,
          netCashFlow: 350,
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Cash flow');

  await expect(page.getByRole('heading', { name: 'Cash flow' })).toBeVisible();
  await expect(page.getByText(/1,350\.00/)).toBeVisible();
  const localToday = await page.evaluate(() => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  });
  await expect(page.locator('.date-filter input[type="date"]').nth(1)).toHaveValue(localToday);
  const requestedUrl = new URL(cashFlowUrl);
  expect(requestedUrl.searchParams.has('page')).toBe(false);
  expect(requestedUrl.searchParams.has('pageSize')).toBe(false);
  expect(requestedUrl.searchParams.has('from')).toBe(true);
  expect(requestedUrl.searchParams.has('to')).toBe(true);
});

test('opens a reconciled cash-flow source ledger and changes pages', async ({ page }) => {
  await seedSession(page);
  const transactionPages: number[] = [];
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname.endsWith('/cash-flow/transactions')) {
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      transactionPages.push(pageNumber);
      return {
        json: fresh({
          source: 'SALES_RECEIPTS',
          label: 'Sales receipts',
          direction: 'IN',
          items: [
            {
              id: pageNumber,
              movementDate: '2026-09-30T10:00:00.000Z',
              reference: `CASH-SALE-${pageNumber}`,
              description: 'Test Customer',
              paymentMethod: 'CASH',
              notes: '',
              amount: pageNumber === 1 ? 450 : 50,
            },
          ],
          total: 26,
          page: pageNumber,
          pageSize: 25,
          sourceTotal: 500,
          summaryTotal: 500,
          reconciliationDifference: 0,
        }),
      };
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/cash-flow')) {
      return {
        json: fresh({
          openingBalance: 1000,
          salesReceipts: 500,
          creditCollections: 100,
          capitalCashIn: 0,
          pettyCashOut: 50,
          salaryPaid: 75,
          restockPayments: 125,
          cashReceived: 600,
          cashPaid: 250,
          closingBalance: 1350,
          netCashFlow: 350,
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Cash flow');

  const sourceButton = page.getByRole('button', {
    name: 'View transactions for sales receipts',
  });
  await sourceButton.click();
  const dialog = page.getByRole('dialog', { name: 'Sales receipts' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Reconciled')).toBeVisible();
  await expect(dialog.getByText('CASH-SALE-1')).toBeVisible();
  await expect(dialog.getByText('Page 1 of 2')).toBeVisible();

  await dialog.getByRole('button', { name: 'Next cash-flow transaction page' }).click();
  await expect(dialog.getByText('CASH-SALE-2')).toBeVisible();
  await expect(dialog.getByText('Page 2 of 2')).toBeVisible();
  expect(transactionPages).toEqual([1, 2]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await dialog.getByRole('button', { name: 'Close cash-flow transactions' }).last().click();
  await expect(dialog).toBeHidden();
  await expect(sourceButton).toBeFocused();
});

test('monitors inventory, filters stock status, and opens item movement history', async ({
  page,
}) => {
  await seedSession(page);
  const inventoryUrls: string[] = [];
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname.endsWith('/inventory/1/history')) {
      return {
        json: fresh({
          item: inventoryItem(),
          items: [
            {
              id: -1,
              movementDate: '2026-09-20T09:00:00.000Z',
              reference: 'ADJ-1',
              quantity: 1,
              origin: 'STORE FULL ADJUSTMENT',
              remarks: 'Physical count - Count correction',
              quantityBefore: 1,
              quantityAfter: 2,
            },
            {
              id: 1,
              movementDate: '2026-09-10T10:00:00.000Z',
              reference: 'SALE-2',
              quantity: -2,
              origin: 'STORE',
              remarks: 'SOLD FULL ITEM',
              quantityBefore: 4,
              quantityAfter: 2,
            },
          ],
          total: 2,
          page: 1,
          pageSize: 25,
          historyAvailable: true,
        }),
      };
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/inventory')) {
      inventoryUrls.push(request.url());
      return {
        json: fresh({
          items: [inventoryItem()],
          total: 1,
          page: 1,
          pageSize: 25,
          summary: {
            trackedItems: 2,
            outOfStockItems: 0,
            criticalItems: 1,
            healthyItems: 1,
            storeFill: 12,
            storeEmpty: 3,
            warehouseFill: 7,
            warehouseEmpty: 1,
            recordedValue: 3200,
            stockBearingItems: 2,
            valuedItems: 2,
            missingCostItems: 0,
            valuationCoveragePercent: 100,
            valuationComplete: true,
          },
          filterOptions: {
            categories: ['LPG'],
            stockStatuses: ['OUT_OF_STOCK', 'CRITICAL', 'HEALTHY'],
          },
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Inventory');

  const monitoring = page.getByRole('region', { name: 'Inventory monitoring' });
  await expect(monitoring).toBeVisible();
  await expect(monitoring.getByText('Recorded inventory value')).toBeVisible();
  await expect(monitoring.getByText(/3,200\.00/)).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Refill price', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Non-refill price' })).toBeVisible();
  await expect(page.getByRole('cell', { name: /450\.00/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: /1,200\.00/ })).toBeVisible();
  const inventoryHeaders = await page.locator('.report-table-wrap thead th').allTextContents();
  expect(inventoryHeaders.map((header) => header.trim())).toEqual([
    'Item',
    'Category',
    'Status',
    'Store fill',
    'Store empty',
    'Warehouse fill',
    'Warehouse empty',
    'Refill price',
    'Non-refill price',
    'Cost',
    'Recorded value',
    'Actions',
  ]);

  await page.getByLabel('Category').selectOption('LPG');
  await page.getByLabel('Stock status').selectOption('CRITICAL');
  await expect.poll(() => inventoryUrls.length).toBeGreaterThanOrEqual(3);
  const filteredUrl = new URL(inventoryUrls.at(-1)!);
  expect(filteredUrl.searchParams.get('category')).toBe('LPG');
  expect(filteredUrl.searchParams.get('stockStatus')).toBe('CRITICAL');

  const historyRow = page.getByRole('row', {
    name: /View inventory history for 11 kg LPG/,
  });
  await historyRow.focus();
  await historyRow.press('Enter');
  const dialog = page.getByRole('dialog', { name: '11 kg LPG' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('ADJ-1')).toBeVisible();
  await expect(dialog.getByText('SALE-2')).toBeVisible();
  await expect(dialog.getByText('Physical count - Count correction')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await dialog.getByRole('button', { name: 'Close inventory history' }).last().click();
  await expect(dialog).toBeHidden();
  await expect(historyRow).toBeFocused();
});

test('forecasts inventory demand, filters reorder risk, and exports the plan', async ({ page }) => {
  await seedSession(page);
  const forecastUrls: string[] = [];
  let exportUrl = '';
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    if (
      request.method() === 'GET' &&
      path.endsWith('/inventory-forecast') &&
      !path.includes('/exports/')
    ) {
      forecastUrls.push(request.url());
      const forecastDays = Number(url.searchParams.get('forecastDays') ?? 14);
      return {
        json: fresh({
          items: [
            {
              id: 1,
              code: 'LPG-11',
              item: '11 kg LPG',
              category: 'LPG',
              storeFill: 1,
              warehouseFill: 0,
              availableStock: 1,
              alertLevel: 2,
              recordedCost: 100,
              salesQuantity: 30,
              averageDailySales: 1,
              daysRemaining: 1,
              projectedDemand: forecastDays,
              suggestedReorder: 15,
              estimatedReorderCost: 1500,
              lastSoldAt: '2026-09-30 10:00:00',
              risk: 'REORDER_NOW',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 25,
          analysisDays: 30,
          forecastDays,
          leadTimeDays: 7,
          summary: {
            availableStock: 1,
            projectedDemand: forecastDays,
            suggestedReorder: 15,
            estimatedReorderCost: 1500,
            outOfStockItems: 0,
            reorderNowItems: 1,
            watchItems: 0,
            noRecentSalesItems: 0,
            attentionItems: 1,
          },
          filterOptions: {
            categories: ['LPG', 'LPG', ' LPG '],
            risks: ['REORDER_NOW'],
          },
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/exports/inventory-forecast')) {
      exportUrl = request.url();
      return {
        json: fresh({
          fileName: 'main-lpg-store-inventory-forecast-2026-09-01-to-2026-09-30.csv',
          content: '\uFEFFCode,Item,Risk,Suggested reorder\r\nLPG-11,11 kg LPG,REORDER_NOW,15\r\n',
          rowCount: 1,
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Reorder planning');

  const forecast = page.getByRole('region', { name: 'Inventory demand forecast' });
  await expect(forecast).toBeVisible();
  await expect(forecast.getByRole('table').getByText('Reorder now', { exact: true })).toBeVisible();
  await expect(forecast.getByText('11 kg LPG')).toBeVisible();
  await expect(forecast.getByText('Next 14 days')).toBeVisible();
  await expect(page.getByLabel('Category').locator('option')).toHaveText(['All categories', 'LPG']);

  await page.getByLabel('Forecast period').selectOption({ label: 'Next 30 days' });
  await expect(forecast.getByText('Next 30 days')).toBeVisible();
  await page.getByLabel('Stock risk').selectOption('REORDER_NOW');
  await page.getByLabel('Search Reorder planning').fill('LPG-11');
  await expect.poll(() => forecastUrls.length).toBeGreaterThanOrEqual(4);
  const filteredUrl = new URL(forecastUrls.at(-1)!);
  expect(filteredUrl.searchParams.get('forecastDays')).toBe('30');
  expect(filteredUrl.searchParams.get('risk')).toBe('REORDER_NOW');
  expect(filteredUrl.searchParams.get('search')).toBe('LPG-11');

  await page.getByRole('button', { name: 'Export CSV' }).click();
  await expect(page.getByText('Exported 1 record.')).toBeVisible();
  const parsedExportUrl = new URL(exportUrl);
  expect(parsedExportUrl.searchParams.get('forecastDays')).toBe('30');
  expect(parsedExportUrl.searchParams.get('risk')).toBe('REORDER_NOW');
  expect(parsedExportUrl.searchParams.get('search')).toBe('LPG-11');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('uses zero for missing legacy costs without blocking the profit display', async ({ page }) => {
  await seedSession(page);
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname.endsWith('/overview')) {
      return {
        json: fresh({
          transactionCount: 3,
          salesWithRecordedCost: 0,
          salesMissingCostCount: 3,
          costCoveragePercent: 0,
          profitDataComplete: false,
          grossSales: 900,
          discounts: 0,
          costOfGoods: 0,
          grossProfit: 900,
          customerBalance: 0,
          customersWithBalance: 0,
          inventoryItems: 5,
          criticalItems: 0,
          transfers: 0,
        }),
      };
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/data-quality')) {
      return {
        json: fresh({
          compatibility: {
            status: 'COMPATIBLE',
            databaseSchemaVersion: 27,
            migrationVersion: 27,
            issues: [],
          },
          summary: {
            totalSales: 3,
            salesWithRecordedCost: 0,
            missingCostSales: 3,
            legacyMissingCostSales: 2,
            unexpectedMissingCostSales: 1,
            costCoveragePercent: 0,
          },
          periods: [
            {
              period: '2026-09',
              missingCostSales: 3,
              legacyMissingCostSales: 2,
              unexpectedMissingCostSales: 1,
            },
          ],
          items: [
            {
              id: 91,
              reference: 'SALE-LEGACY',
              saleDate: '2026-09-20T10:00:00.000Z',
              customer: 'Legacy Customer',
              totalAmount: 300,
              lineCount: 1,
              recordedLineCost: 0,
              classification: 'LEGACY',
            },
            {
              id: 92,
              reference: 'SALE-UNEXPECTED',
              saleDate: '2026-09-21T10:00:00.000Z',
              customer: 'Current Customer',
              totalAmount: 300,
              lineCount: 1,
              recordedLineCost: 180,
              classification: 'UNEXPECTED',
            },
          ],
          total: 3,
          page: 1,
          pageSize: 25,
        }),
      };
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/sales/91')) {
      return {
        json: fresh({
          sale: {
            id: 91,
            reference: 'SALE-LEGACY',
            customer: 'Legacy Customer',
            payment: 'CASH',
            cashier: 'Cashier One',
            itemCount: 1,
            subtotal: 300,
            totalAmount: 300,
            status: 'COMPLETED',
            discount: 0,
            totalCost: 0,
            specialDiscount: 0,
            tender: 300,
            change: 0,
            saleDate: '2026-09-20T10:00:00.000Z',
          },
          items: [],
          notes: '',
          attachmentStatus: 'NOT_SYNCED',
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await expect(page.getByText('Recorded gross profit')).toBeVisible();
  await expect(page.getByText('3 sale costs missing and treated as')).toBeVisible();
  await expect(page.getByText('Profit is unavailable for this period')).toHaveCount(0);
  await expect(page.getByText(/900\.00/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Review data quality' }).click();

  const quality = page.getByRole('dialog', { name: 'Missing recorded sale costs' });
  await expect(quality).toBeVisible();
  await expect(quality.getByText('2 legacy')).toBeVisible();
  await expect(quality.getByText('1 unexpected')).toBeVisible();
  await expect(quality.getByText('SALE-UNEXPECTED')).toBeVisible();
  await quality.getByRole('button', { name: 'View sale SALE-LEGACY' }).click();

  const sale = page.getByRole('dialog', { name: 'SALE-LEGACY' });
  await expect(sale).toBeVisible();
  await sale.getByRole('button', { name: 'Close sale details' }).first().click();
  await expect(quality).toBeVisible();
});

test('opens supplier, product, payment, and authorized-store monitoring views', async ({
  page,
}) => {
  await seedSession(page);
  let productSalesUrl = '';
  let productExportUrl = '';
  let alertSaleDetailsUrl = '';
  let dismissedAlertUrl = '';
  const dismissedAlertIds = new Set<string>();
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() === 'GET' && path.endsWith('/restock-monitoring')) {
      return {
        json: fresh({
          items: [
            {
              id: 1,
              reference: 'TR-1',
              supplier: 'Supplier A',
              transferDate: '2026-09-15 10:00:00',
              receiptStatus: 'CONFIRMED',
              paymentStatus: 'PARTIALLY PAID',
              quantity: 5,
              purchaseAmount: 500,
              payments: 240,
              refunds: 20,
              netPaid: 220,
              outstanding: 280,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 25,
          summary: {
            confirmedRestocks: 1,
            receivedQuantity: 5,
            purchaseAmount: 500,
            supplierPayments: 200,
            supplierRefunds: 20,
            netSupplierPayments: 180,
            outstandingPayables: 280,
            cashFlowRestockPayments: 180,
            reconciliationDifference: 0,
          },
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/product-performance')) {
      const product = {
        itemCode: 'LPG-11',
        item: '11 kg LPG',
        category: 'LPG',
        quantity: 8,
        revenue: 960,
        recordedCost: 640,
        recordedGrossProfit: 320,
        missingCostLines: 0,
      };
      return {
        json: fresh({
          summary: {
            quantity: 8,
            revenue: 960,
            recordedCost: 640,
            recordedGrossProfit: 320,
            missingCostLines: 0,
            costDataComplete: true,
          },
          topSelling: [product],
          slowMoving: [
            { ...product, itemCode: 'LPG-22', item: '22 kg LPG', quantity: 0, revenue: 0 },
          ],
          categories: [
            {
              category: 'LPG',
              quantity: 8,
              revenue: 960,
              recordedCost: 640,
              recordedGrossProfit: 320,
            },
          ],
        }),
      };
    }
    if (
      request.method() === 'GET' &&
      path.endsWith('/sales') &&
      !path.endsWith('/exports/sales') &&
      url.searchParams.has('itemCode')
    ) {
      productSalesUrl = request.url();
      return {
        json: fresh({
          items: [
            {
              id: 11,
              saleDate: '2026-09-20T10:00:00.000Z',
              reference: 'PRODUCT-SALE',
              customer: 'Product Customer',
              payment: 'CASH',
              status: 'COMPLETED',
              totalAmount: 120,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 25,
          filterOptions: { statuses: ['COMPLETED'], payments: ['CASH'] },
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/exports/sales')) {
      productExportUrl = request.url();
      return {
        json: fresh({
          fileName: 'main-lpg-store-sales-2026-09-01-to-2026-09-30.csv',
          content: '\uFEFFDate,Reference,Total\r\n2026-09-20,PRODUCT-SALE,120\r\n',
          rowCount: 1,
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/payment-analysis')) {
      return {
        json: fresh({
          summary: {
            paidSales: 900,
            paidSaleCount: 4,
            unpaidSales: 200,
            unpaidSaleCount: 1,
            outstandingBalance: 75,
            saleReceipts: 850,
            creditCollections: 50,
            totalReceived: 900,
            cashFlowReceipts: 900,
            reconciliationDifference: 0,
          },
          channels: [
            {
              channel: 'CASH',
              salesTotal: 900,
              saleReceipts: 850,
              creditCollections: 50,
              totalReceived: 900,
            },
          ],
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/sales/12')) {
      alertSaleDetailsUrl = request.url();
      return {
        json: fresh({
          sale: {
            id: 12,
            reference: 'SALE-HIGH-DISCOUNT',
            customer: 'Discount Customer',
            payment: 'CASH',
            cashier: 'Cashier One',
            itemCount: 1,
            subtotal: 500,
            totalAmount: 400,
            creditPaid: 0,
            creditBalance: '0',
            status: 'COMPLETED',
            discount: 100,
            category: 'STORE',
            paymentType: 'FULL PAYMENT',
            totalCost: 250,
            specialDiscount: 0,
            tender: 500,
            change: 100,
            saleDate: '2026-09-20T10:00:00.000Z',
          },
          items: [],
          notes: '',
          attachmentStatus: 'NOT_SYNCED',
        }),
      };
    }
    if (
      request.method() === 'POST' &&
      path.includes('/portal/alerts/') &&
      path.endsWith('/dismiss')
    ) {
      dismissedAlertUrl = request.url();
      const alertId = decodeURIComponent(
        path.slice(path.indexOf('/portal/alerts/') + '/portal/alerts/'.length, -'/dismiss'.length),
      );
      dismissedAlertIds.add(alertId);
      return { json: { alertId, dismissed: true } };
    }
    if (request.method() === 'GET' && path.endsWith('/business-overview')) {
      return {
        json: fresh({
          generatedAt: '2026-09-30T12:05:00Z',
          compatibleSchemaVersion: 27,
          authorizedStoreCount: 1,
          includedStoreCount: 1,
          excludedStoreCount: 0,
          summary: {
            grossSales: 1250,
            transactionCount: 4,
            recordedGrossProfit: 550,
            customerBalance: 300,
            netCashFlow: 355,
            criticalItems: 1,
            outOfStockItems: 0,
          },
          stores: [
            {
              id: store.id,
              code: store.code,
              name: store.name,
              schemaVersion: 27,
              snapshotCreatedAt: '2026-09-30T12:00:00Z',
              syncedAt: '2026-09-30T12:02:00Z',
              ageHours: 1,
              syncStatus: 'CURRENT',
              grossSales: 1250,
              transactionCount: 4,
              recordedCost: 700,
              recordedGrossProfit: 550,
              missingCostSales: 0,
              customerBalance: 300,
              criticalItems: 1,
              outOfStockItems: 0,
              overdueBalance: 75,
              overdueSaleCount: 1,
              highDiscountSaleCount: 1,
              netCashFlow: 355,
            },
          ],
          alerts: [
            {
              id: 'inventory-1',
              storeId: store.id,
              storeName: store.name,
              severity: 'MEDIUM',
              type: 'INVENTORY',
              title: 'Inventory requires attention',
              detail: '0 out of stock and 1 critical items.',
              dismissible: true,
            },
            {
              id: 'discount-1-12',
              storeId: store.id,
              storeName: store.name,
              severity: 'MEDIUM',
              type: 'DISCOUNT',
              title: 'High discount requires review',
              detail:
                'Sale SALE-HIGH-DISCOUNT was discounted 20.0%, above the 20% review threshold.',
              amount: 100,
              saleId: 12,
              reference: 'SALE-HIGH-DISCOUNT',
              saleDate: '2026-09-20T10:00:00.000Z',
              discountPercent: 20,
              dismissible: true,
            },
            {
              id: 'backup-platformBackup-2026-09-30T02:00:00.000Z',
              storeId: 'ALL',
              storeName: 'Owner platform',
              severity: 'HIGH',
              type: 'BACKUP',
              title: 'Platform backup failed',
              detail:
                'The last attempt failed at 2026-09-30T02:00:00.000Z. Review the server backup logs.',
              dismissible: false,
            },
          ].filter((alert) => !dismissedAlertIds.has(alert.id)),
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  const selectReport = async (name: string) => {
    await navigateToReport(page, name);
  };

  await selectReport('Restocks & suppliers');
  await expect(page.getByText('Payments reconcile to cash flow')).toBeVisible();
  await expect(page.getByText('Supplier A')).toBeVisible();

  await selectReport('Product performance');
  await expect(page.getByText('Top-selling products')).toBeVisible();
  await expect(page.getByText('22 kg LPG')).toBeVisible();
  await page.getByRole('button', { name: 'View sales for 11 kg LPG' }).click();
  await expect(page.getByRole('heading', { name: 'Sales' })).toBeVisible();
  await expect(page.getByText('PRODUCT-SALE')).toBeVisible();
  await expect(page.locator('.active-product-filter')).toContainText('11 kg LPG');
  expect(new URL(productSalesUrl).searchParams.get('itemCode')).toBe('LPG-11');

  await page.getByRole('button', { name: 'Export CSV' }).click();
  await expect.poll(() => productExportUrl).not.toBe('');
  expect(new URL(productExportUrl).searchParams.get('itemCode')).toBe('LPG-11');

  await selectReport('Payment analysis');
  await expect(page.getByText('Receipts reconcile to cash flow')).toBeVisible();
  await expect(page.getByText('Credit collections', { exact: true })).toBeVisible();

  await selectReport('All stores & alerts');
  await expect(page.getByText('Authorized-store overview')).toBeVisible();
  await expect(page.getByText('Inventory requires attention')).toBeVisible();
  await expect(page.getByText('High discount requires review')).toBeVisible();
  await expect(page.getByText('Platform backup failed')).toBeVisible();
  await page.getByRole('button', { name: 'View sale SALE-HIGH-DISCOUNT' }).click();
  const alertSale = page.getByRole('dialog', { name: 'SALE-HIGH-DISCOUNT' });
  await expect(alertSale).toBeVisible();
  await expect.poll(() => alertSaleDetailsUrl).toContain(`/stores/${store.id}/sales/12`);
  await alertSale.getByRole('button', { name: 'Close', exact: true }).click({ force: true });
  await expect(page.getByText('All authorized stores').first()).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss High discount requires review' }).click();
  await expect(page.getByText('High discount requires review')).toBeHidden();
  await expect.poll(() => dismissedAlertUrl).toContain('/portal/alerts/discount-1-12/dismiss');
  await expect(page.getByRole('button', { name: 'Dismiss Platform backup failed' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('ranks product profitability, compares periods, and exports matching rows', async ({
  page,
}) => {
  await seedSession(page);
  const reportUrls: string[] = [];
  let exportUrl = '';
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    if (
      request.method() === 'GET' &&
      path.endsWith('/profitability') &&
      !path.includes('/exports/')
    ) {
      reportUrls.push(request.url());
      return {
        json: fresh({
          currentRange: { from: '2026-09-01', to: '2026-09-30' },
          previousRange: { from: '2026-08-02', to: '2026-08-31' },
          rankBy: url.searchParams.get('profitabilitySort') || 'PROFIT',
          summary: {
            current: {
              quantity: 11,
              revenue: 5250,
              recordedCost: 2800,
              recordedGrossProfit: 2450,
              recordedMarginPercent: 46.67,
              lineCount: 10,
              missingCostLines: 2,
              costCoveragePercent: 80,
              costDataComplete: false,
            },
            previous: {
              quantity: 9,
              revenue: 4400,
              recordedCost: 2600,
              recordedGrossProfit: 1800,
              recordedMarginPercent: 40.91,
              lineCount: 9,
              missingCostLines: 0,
              costCoveragePercent: 100,
              costDataComplete: true,
            },
            revenueChange: 850,
            recordedGrossProfitChange: 650,
            recordedMarginPointChange: 5.76,
            recordedGrossProfitChangePercent: 36.11,
          },
          categories: [
            {
              category: 'LPG',
              quantity: 11,
              revenue: 5250,
              recordedCost: 2800,
              recordedGrossProfit: 2450,
              recordedMarginPercent: 46.67,
              lineCount: 10,
              missingCostLines: 2,
              costCoveragePercent: 80,
              costDataComplete: false,
              previousRevenue: 4400,
              previousRecordedGrossProfit: 1800,
              previousRecordedMarginPercent: 40.91,
              revenueChange: 850,
              recordedGrossProfitChange: 650,
              recordedMarginPointChange: 5.76,
            },
          ],
          items: [
            {
              itemCode: 'LPG-11',
              item: '11 kg LPG',
              category: 'LPG',
              quantity: 11,
              revenue: 5250,
              recordedCost: 2800,
              recordedGrossProfit: 2450,
              recordedMarginPercent: 46.67,
              lineCount: 10,
              missingCostLines: 2,
              costCoveragePercent: 80,
              costDataComplete: false,
              previousRevenue: 4400,
              previousRecordedGrossProfit: 1800,
              previousRecordedMarginPercent: 40.91,
              revenueChange: 850,
              recordedGrossProfitChange: 650,
              recordedMarginPointChange: 5.76,
              recordedGrossProfitChangePercent: 36.11,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 25,
          filterOptions: {
            categories: ['LPG', 'Accessories', 'LPG', ' accessories '],
          },
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/exports/profitability')) {
      exportUrl = request.url();
      return {
        json: fresh({
          fileName: 'main-lpg-store-profitability-2026-09-01-to-2026-09-30.csv',
          rowCount: 1,
          csv: 'Rank,Item code,Item\n1,LPG-11,11 kg LPG',
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Profitability');

  const workspace = page.getByRole('region', { name: 'Product and category profitability' });
  await expect(workspace).toBeVisible();
  await expect(workspace.getByText('2 sale lines missing cost')).toBeVisible();
  await expect(workspace.getByText('36.1% higher vs previous period')).toBeVisible();
  await expect(workspace.getByRole('button', { name: 'View sales for 11 kg LPG' })).toBeVisible();
  await expect(workspace.getByText('Recorded profit treats missing costs as zero.')).toBeVisible();
  await expect(page.getByLabel('Profitability category').locator('option')).toHaveText([
    'All categories',
    'Accessories',
    'LPG',
  ]);

  await page.getByLabel('Profitability category').selectOption('LPG');
  await page.getByLabel('Profitability rank').selectOption('MARGIN');
  await page.getByPlaceholder('Search product or category').fill('11 kg');
  await expect.poll(() => reportUrls.length).toBeGreaterThanOrEqual(4);
  await expect
    .poll(() => {
      const url = new URL(reportUrls.at(-1)!);
      return {
        category: url.searchParams.get('category'),
        rankBy: url.searchParams.get('profitabilitySort'),
        search: url.searchParams.get('search'),
      };
    })
    .toEqual({ category: 'LPG', rankBy: 'MARGIN', search: '11 kg' });

  await page.getByRole('button', { name: 'Export CSV' }).click();
  await expect.poll(() => exportUrl).not.toBe('');
  const exported = new URL(exportUrl);
  expect(exported.searchParams.get('category')).toBe('LPG');
  expect(exported.searchParams.get('profitabilitySort')).toBe('MARGIN');
  expect(exported.searchParams.get('search')).toBe('11 kg');
  await expect(page.getByText('Exported 1 record.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('ranks customer purchases and opens read-only purchase history', async ({ page }) => {
  await seedSession(page);
  await page.clock.setFixedTime(new Date('2026-09-28T04:00:00.000Z'));
  const insightUrls: string[] = [];
  let historyUrl = '';
  let exportUrl = '';
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    if (
      request.method() === 'GET' &&
      path.endsWith('/customer-insights') &&
      !path.includes('/exports/')
    ) {
      insightUrls.push(request.url());
      return {
        json: fresh({
          range: { from: '2026-09-01', to: '2026-09-30' },
          rankBy: url.searchParams.get('customerSort') || 'SPEND',
          summary: {
            customerCount: 2,
            repeatCustomerCount: 1,
            visitCount: 3,
            recordedSpend: 1650,
            outstandingBalance: 75,
            lastPurchaseDate: '2026-09-18T10:00:00.000Z',
            averagePurchase: 550,
          },
          items: [
            {
              id: 1,
              name: 'Customer One',
              contact: '09170000000',
              balance: 75,
              status: 'active',
              visitCount: 2,
              recordedSpend: 650,
              averagePurchase: 325,
              firstPurchaseDate: '2026-09-10T10:00:00.000Z',
              lastPurchaseDate: '2026-09-18T10:00:00.000Z',
              spendSharePercent: 39.39,
              daysSinceLastPurchase: 12,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 25,
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/customers/1/purchase-history')) {
      historyUrl = request.url();
      return {
        json: fresh({
          range: { from: '2026-09-01', to: '2026-09-30' },
          customer: {
            id: 1,
            name: 'Customer One',
            contact: '09170000000',
            balance: 75,
            status: 'active',
          },
          summary: {
            visitCount: 2,
            recordedSpend: 650,
            averagePurchase: 325,
            firstPurchaseDate: '2026-09-10T10:00:00.000Z',
            lastPurchaseDate: '2026-09-18T10:00:00.000Z',
          },
          items: [
            {
              id: 4,
              saleDate: '2026-09-18T10:00:00.000Z',
              reference: 'SALE-4',
              payment: 'CREDIT',
              status: 'UNPAID',
              itemCount: 1,
              totalAmount: 200,
              tenderBalance: 75,
            },
            {
              id: 2,
              saleDate: '2026-09-10T10:00:00.000Z',
              reference: 'SALE-2',
              payment: 'CASH',
              status: 'COMPLETED',
              itemCount: 2,
              totalAmount: 450,
              tenderBalance: 0,
            },
          ],
          total: 2,
          page: 1,
          pageSize: 25,
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/exports/customer-insights')) {
      exportUrl = request.url();
      return {
        json: fresh({
          fileName: 'main-lpg-store-customer-insights-2026-09-01-to-2026-09-30.csv',
          rowCount: 1,
          content: 'Rank,Customer,Recorded spend\n1,Customer One,650',
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Customer insights');

  const workspace = page.getByRole('region', { name: 'Customer purchase insights' });
  await expect(workspace).toBeVisible();
  await expect(workspace.getByText('Customer One')).toBeVisible();
  await expect(workspace.getByText('1 repeat customer')).toBeVisible();
  await expect(workspace.getByText('39.4% of visible spend')).toBeVisible();

  await page.getByLabel('Customer insight rank').selectOption('VISITS');
  await page.getByPlaceholder('Search customer or contact').fill('0917');
  await expect.poll(() => insightUrls.length).toBeGreaterThanOrEqual(3);
  await expect
    .poll(() => {
      const latest = new URL(insightUrls.at(-1)!);
      return {
        rankBy: latest.searchParams.get('customerSort'),
        search: latest.searchParams.get('search'),
      };
    })
    .toEqual({ rankBy: 'VISITS', search: '0917' });

  await page.getByRole('button', { name: 'Export CSV' }).click();
  await expect.poll(() => exportUrl).not.toBe('');
  const exported = new URL(exportUrl);
  expect(exported.searchParams.get('customerSort')).toBe('VISITS');
  expect(exported.searchParams.get('search')).toBe('0917');

  await workspace.getByRole('button', { name: 'View purchase history for Customer One' }).click();
  const dialog = page.getByRole('dialog', { name: 'Customer One' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('SALE-4')).toBeVisible();
  await expect(dialog.getByText('SALE-2')).toBeVisible();
  await expect.poll(() => historyUrl).not.toBe('');
  const history = new URL(historyUrl);
  expect(history.searchParams.get('from')).toBe('2026-08-30');
  expect(history.searchParams.get('to')).toBe('2026-09-28');
  await dialog.getByRole('button', { name: 'Close customer purchase history' }).click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('saves, restores, orders, deletes, and resets dashboard preferences', async ({ page }) => {
  await seedSession(page);
  await page.clock.setFixedTime(new Date('2026-09-28T04:00:00.000Z'));

  let overviewMetrics = ['CUSTOMER_BALANCE', 'GROSS_SALES'];
  let savedViews: Array<Record<string, unknown>> = [];
  let savedRequest: Record<string, unknown> | null = null;
  let updatedMetrics: string[] = [];
  let deletedViewId = '';
  let resetCount = 0;
  const salesRequests: string[] = [];

  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() === 'GET' && path.endsWith('/portal/preferences')) {
      return { json: { overviewMetrics, savedViews } };
    }
    if (request.method() === 'PUT' && path.endsWith('/portal/preferences/overview')) {
      const input = request.postDataJSON() as { overviewMetrics: string[] };
      updatedMetrics = input.overviewMetrics;
      overviewMetrics = [...updatedMetrics];
      return { json: { overviewMetrics } };
    }
    if (request.method() === 'POST' && path.endsWith('/portal/preferences/saved-views')) {
      savedRequest = request.postDataJSON() as Record<string, unknown>;
      const saved = {
        id: 'saved-view-one',
        ...savedRequest,
        storeName: store.name,
        dateFrom: null,
        dateTo: null,
        updatedAt: '2026-09-28T04:00:00.000Z',
      };
      savedViews = [saved];
      return { json: saved };
    }
    if (
      request.method() === 'DELETE' &&
      path.endsWith('/portal/preferences/saved-views/saved-view-one')
    ) {
      deletedViewId = 'saved-view-one';
      savedViews = [];
      return { status: 204 };
    }
    if (request.method() === 'DELETE' && path.endsWith('/portal/preferences')) {
      resetCount += 1;
      overviewMetrics = [
        'GROSS_SALES',
        'RECORDED_GROSS_PROFIT',
        'CUSTOMER_BALANCE',
        'INVENTORY_ALERTS',
      ];
      savedViews = [];
      return { json: { overviewMetrics, savedViews } };
    }
    if (request.method() === 'GET' && path.endsWith('/sales')) {
      salesRequests.push(request.url());
    }
    return undefined;
  });

  const navigateTo = async (name: string) => {
    await navigateToReport(page, name);
  };

  await page.goto('/');
  const visibleMetrics = page.locator('.metric-grid .metric-card:visible');
  await expect(visibleMetrics).toHaveCount(2);
  const customerBalanceMetric = visibleMetrics.filter({ hasText: 'Customer balance' });
  const grossSalesMetric = visibleMetrics.filter({ hasText: 'Gross sales' });
  await expect(customerBalanceMetric).toBeVisible();
  await expect(customerBalanceMetric).toHaveCSS('order', '0');
  await expect(grossSalesMetric).toBeVisible();
  await expect(grossSalesMetric).toHaveCSS('order', '1');

  await navigateTo('Sales');
  await page.getByPlaceholder('Search reference or customer').fill('VIP');
  await page
    .locator('.filter-select')
    .filter({ hasText: 'Status' })
    .locator('select')
    .selectOption('COMPLETED');
  await page.getByRole('button', { name: 'Save current view' }).click();

  const saveDialog = page.getByRole('dialog', { name: 'Save Sales' });
  await saveDialog.getByLabel('View name').fill('Completed sales');
  await saveDialog.getByLabel('Date preset').selectOption('LAST_7_DAYS');
  await saveDialog.getByRole('button', { name: 'Save view', exact: true }).click();
  await expect(saveDialog).toBeHidden();
  await expect.poll(() => savedRequest).not.toBeNull();
  expect(savedRequest).toMatchObject({
    name: 'Completed sales',
    report: 'sales',
    storeId: store.id,
    datePreset: 'LAST_7_DAYS',
    filters: { search: 'VIP', status: 'COMPLETED' },
  });

  await navigateTo('Preferences');
  const preferences = page.getByRole('region', { name: 'Dashboard preferences' });
  await expect(preferences).toBeVisible();
  await expect(preferences.getByText('Completed sales')).toBeVisible();
  await preferences.getByLabel('Inventory alerts').check();
  await preferences.getByRole('button', { name: 'Move Inventory alerts earlier' }).click();
  await preferences.getByRole('button', { name: 'Save overview metrics' }).click();
  await expect
    .poll(() => updatedMetrics)
    .toEqual(['CUSTOMER_BALANCE', 'INVENTORY_ALERTS', 'GROSS_SALES']);
  await expect(preferences.getByText('Overview metrics saved.')).toBeVisible();

  const savedRow = preferences.locator('.saved-view-list article').filter({
    hasText: 'Completed sales',
  });
  await savedRow.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('heading', { name: 'Sales', exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Search reference or customer')).toHaveValue('VIP');
  await expect(
    page.locator('.filter-select').filter({ hasText: 'Status' }).locator('select'),
  ).toHaveValue('COMPLETED');
  await expect.poll(() => salesRequests.length).toBeGreaterThan(0);
  const restoredSales = new URL(salesRequests.at(-1)!);
  expect(restoredSales.searchParams.get('from')).toBe('2026-09-22');
  expect(restoredSales.searchParams.get('to')).toBe('2026-09-28');
  expect(restoredSales.searchParams.get('search')).toBe('VIP');
  expect(restoredSales.searchParams.get('status')).toBe('COMPLETED');

  await navigateTo('Preferences');
  const reloadedPreferences = page.getByRole('region', { name: 'Dashboard preferences' });
  await reloadedPreferences
    .getByRole('button', { name: 'Delete saved view Completed sales' })
    .click();
  await expect.poll(() => deletedViewId).toBe('saved-view-one');
  await expect(reloadedPreferences.getByText('No saved views')).toBeVisible();

  await reloadedPreferences.getByRole('button', { name: 'Reset to defaults' }).click();
  expect(resetCount).toBe(0);
  await reloadedPreferences.getByRole('button', { name: 'Confirm reset' }).click();
  await expect.poll(() => resetCount).toBe(1);
  await expect(
    reloadedPreferences.getByText('Dashboard preferences reset to defaults.'),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('filters and pages the owner-safe portal activity log', async ({ page }) => {
  await seedSession(page);
  const activityUrls: string[] = [];
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname.endsWith('/portal/activity')) {
      activityUrls.push(request.url());
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      return {
        json: {
          items:
            pageNumber === 1
              ? [
                  {
                    id: 'activity-login',
                    occurredAt: '2026-09-28T09:00:00.000Z',
                    action: 'SECURITY',
                    status: 'SUCCESS',
                    title: 'Signed in',
                    detail: 'A portal session was opened from Google Chrome on Windows.',
                    actor: 'You',
                    storeId: null,
                    storeName: null,
                  },
                  {
                    id: 'activity-sync',
                    occurredAt: '2026-09-28T08:00:00.000Z',
                    action: 'STORE_SYNC',
                    status: 'SUCCESS',
                    title: 'Store data synchronized',
                    detail: 'A new reporting snapshot using schema 27 became active.',
                    actor: 'POS device',
                    storeId: store.id,
                    storeName: store.name,
                  },
                ]
              : [
                  {
                    id: 'activity-backup',
                    occurredAt: '2026-09-27T07:00:00.000Z',
                    action: 'BACKUP',
                    status: 'WARNING',
                    title: 'Platform backup failed',
                    detail: 'The backup did not complete. Review the protected server logs.',
                    actor: 'Platform',
                    storeId: null,
                    storeName: null,
                  },
                ],
          total: 26,
          page: pageNumber,
          pageSize: 25,
          filterOptions: {
            actions: [
              { value: 'SECURITY', label: 'Security and access' },
              { value: 'STORE_SYNC', label: 'Store synchronization' },
              { value: 'SETTINGS', label: 'Portal settings' },
              { value: 'REPORTING', label: 'Scheduled reporting' },
              { value: 'BACKUP', label: 'Backup and recovery' },
            ],
            stores: [{ id: store.id, name: store.name }],
          },
        },
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Activity log');

  const activity = page.getByRole('region', { name: 'Account and platform activity' });
  await expect(activity).toBeVisible();
  await expect(activity.getByText('Signed in', { exact: true })).toBeVisible();
  await expect(activity.getByText('Store data synchronized', { exact: true })).toBeVisible();
  await expect(
    activity.getByRole('list').getByText('Main LPG Store', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('All authorized stores').first()).toBeVisible();
  await expect(page.getByText(/token|password hash|sha256/i)).toHaveCount(0);

  await page.getByLabel('Event type').selectOption('STORE_SYNC');
  await activity.locator('.activity-controls select').nth(1).selectOption(store.id);
  await expect.poll(() => activityUrls.length).toBeGreaterThanOrEqual(3);
  const filtered = new URL(activityUrls.at(-1)!);
  expect(filtered.searchParams.get('action')).toBe('STORE_SYNC');
  expect(filtered.searchParams.get('storeId')).toBe(store.id);
  expect(filtered.searchParams.get('from')).toBeTruthy();
  expect(filtered.searchParams.get('to')).toBeTruthy();

  await activity.getByRole('button', { name: 'Next activity page' }).click();
  await expect(activity.getByText('Platform backup failed', { exact: true })).toBeVisible();
  const secondPage = new URL(activityUrls.at(-1)!);
  expect(secondPage.searchParams.get('page')).toBe('2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('shows enabled Feature Mod reports without Feature Mods settings', async ({ page }) => {
  const summaryRequests: Array<{ from: string | null; to: string | null }> = [];
  const discountPages: string[] = [];
  const purchasePages: string[] = [];
  let purchaseTransferDetailsUrl = '';
  await seedSession(page);
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() === 'GET' && path.endsWith('/report-capabilities')) {
      return {
        json: fresh({
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
      };
    }
    if (request.method() === 'GET' && path.endsWith('/reports/inventory-summary')) {
      summaryRequests.push({ from: url.searchParams.get('from'), to: url.searchParams.get('to') });
      return {
        json: fresh({
          openingSnapshotDate: '2026-08-31',
          actualSnapshotDate: url.searchParams.get('to') || '2026-09-09',
          rows: [
            {
              itemCode: 'LPG-11',
              itemName: '11 kg LPG',
              openingFilled: 4,
              openingEmpty: 1,
              deliveries: 5,
              sales: 2,
              refill: 1,
              pullOut: 0,
              defective: 0,
              backload: 0,
              actualFilled: 2,
              actualEmpty: 1,
            },
          ],
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/reports/financial')) {
      return {
        json: fresh({
          openingSnapshotDate: '2026-08-31',
          actualSnapshotDate: '2026-09-30',
          productRows: [
            {
              itemCode: 'LPG-11',
              itemName: '11 kg LPG',
              itemSize: '11 kg',
              isLpgItem: true,
              openingQuantity: 4,
              openingUnitCost: 90,
              openingTotal: 360,
              deliveredQuantity: 5,
              deliveredTotal: 500,
              closingQuantity: 2,
              computedCogsQuantity: 7,
              costOfGoods: 200,
              salesQuantity: 2,
              salesTotal: 450,
            },
          ],
          cashFlow: {
            openingBalance: 100,
            closingBalance: 425,
            netCashFlow: 325,
            salesReceipts: 450,
            creditCollections: 50,
            capitalCashIn: 100,
            pettyCashOut: 25,
            restockPayments: 180,
            salaryPaid: 70,
            cashReceived: 600,
            cashPaid: 275,
          },
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/reports/discounts')) {
      const reportPage = url.searchParams.get('page') ?? '1';
      discountPages.push(reportPage);
      return {
        json: fresh({
          totalAmount: 15,
          total: 26,
          page: Number(reportPage),
          pageSize: 25,
          items: [
            {
              salesDate: '2026-09-10T10:00:00Z',
              reference: reportPage === '1' ? 'SALE-2' : 'SALE-DISCOUNT-PAGE-2',
              customer: 'Test Customer',
              cashier: 'Cashier One',
              regularDiscount: 10,
              specialDiscount: 5,
              totalDiscount: 15,
            },
          ],
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/reports/purchases')) {
      const reportPage = url.searchParams.get('page') ?? '1';
      purchasePages.push(reportPage);
      return {
        json: fresh({
          totalAmount: 180,
          total: 26,
          page: Number(reportPage),
          pageSize: 25,
          items: [
            {
              id: reportPage === '1' ? 1 : 2,
              purchaseDate: '2026-09-15T15:00:00Z',
              reference: reportPage === '1' ? 'TR-1' : 'TR-PURCHASE-PAGE-2',
              supplier: 'Supplier A',
              driver: 'Driver One',
              purchaseType: 'RESTOCK IN',
              totalQuantity: 5,
              totalAmount: 200,
            },
          ],
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/transfers/1')) {
      purchaseTransferDetailsUrl = request.url();
      return {
        json: fresh({
          transfer: {
            id: 1,
            reference: 'TR-1',
            supplier: 'Supplier A',
            destination: 'Store',
            type: 'RESTOCK IN',
            totalQuantity: 5,
            totalAmount: 500,
            encoder: 'Owner',
            transferDate: '2026-09-15T10:00:00.000Z',
            status: 'CONFIRMED',
            restockPrice: 500,
            purchaseAmount: 500,
            notes: '',
            invoiceReference: '',
            confirmedAt: '2026-09-15T10:15:00.000Z',
            paidAt: '',
            paymentMethod: '',
            paymentReference: '',
            paymentStatus: 'UNPAID',
            paidAmount: 0,
            outstandingAmount: 500,
            driverId: 4,
            driverName: 'Driver One',
          },
          lines: [],
          payments: [],
          lineItemsAvailable: true,
          paymentHistoryAvailable: true,
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/reports/special-receipts')) {
      return {
        json: fresh({
          totalAmount: 450,
          items: [
            {
              salesId: 2,
              salesDate: '2026-09-10T10:00:00Z',
              reference: 'SALE-SPECIAL',
              customer: 'Test Customer',
              saleType: 'DELIVERY',
              itemCount: 2,
              totalAmount: 450,
              paymentMethod: 'CASH',
              cashier: 'Cashier One',
            },
          ],
        }),
      };
    }
    if (request.method() === 'GET' && path.endsWith('/reports/customers')) {
      return {
        json: fresh({
          totalAmount: 450,
          items: [
            {
              salesId: 2,
              salesDate: '2026-09-10T10:00:00Z',
              reference: 'SALE-CUSTOMER',
              customer: 'Test Customer',
              address: 'Test address',
              groupName: 'Retail',
              itemCount: 2,
              totalAmount: 450,
            },
          ],
        }),
      };
    }
    return undefined;
  });

  await page.goto('/');
  const selectReport = async (name: string) => {
    await navigateToReport(page, name);
  };

  const dateInputs = page.locator('.date-filter input[type="date"]');
  await dateInputs.nth(0).fill('2026-09-09');
  await dateInputs.nth(0).dispatchEvent('change');
  await dateInputs.nth(1).fill('2026-09-20');
  await dateInputs.nth(1).dispatchEvent('change');
  await expect(page.locator('nav').getByRole('button', { name: 'Feature mods' })).toHaveCount(0);
  await selectReport('Summary CSV');
  await expect(
    page.getByRole('heading', { name: 'Opening, movement, and actual counts' }),
  ).toBeVisible();
  await expect(page.getByText('11 kg LPG')).toBeVisible();
  await expect(page.getByText('2026-08-31')).toBeVisible();
  await expect(page.getByText('September 9, 2026')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous date' })).toBeDisabled();
  await expect
    .poll(() => summaryRequests.at(-1))
    .toEqual({
      from: '2026-09-09',
      to: '2026-09-09',
    });
  await page.getByRole('button', { name: 'Next date' }).click();
  await expect(page.getByText('September 10, 2026')).toBeVisible();
  await expect
    .poll(() => summaryRequests.at(-1))
    .toEqual({
      from: '2026-09-10',
      to: '2026-09-10',
    });

  await selectReport('Financial report');
  await expect(
    page.getByRole('heading', { name: 'Product cost and business result' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'LPG products with size' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Business result', exact: true })).toBeVisible();
  await expect(page.getByText(/250\.00/).first()).toBeVisible();

  await selectReport('Discount report');
  await expect(page.getByRole('heading', { name: 'Discount history' })).toBeVisible();
  await expect(page.getByText('SALE-2')).toBeVisible();
  await page.getByRole('button', { name: 'Next discount page' }).click();
  await expect(page.getByText('SALE-DISCOUNT-PAGE-2')).toBeVisible();
  await expect.poll(() => discountPages).toEqual(['1', '2']);

  await selectReport('Purchase report');
  await expect(page.getByRole('heading', { name: 'Purchase history' })).toBeVisible();
  await expect(page.getByText('Driver One')).toBeVisible();
  await page.getByRole('button', { name: 'View transfer TR-1' }).click();
  const transferDialog = page.getByRole('dialog', { name: 'TR-1' });
  await expect(transferDialog).toBeVisible();
  await expect.poll(() => purchaseTransferDetailsUrl).toContain('/transfers/1');
  await transferDialog.getByRole('button', { name: 'Close', exact: true }).click({ force: true });
  await page.getByRole('button', { name: 'Next purchase page' }).click();
  await expect(page.getByText('TR-PURCHASE-PAGE-2')).toBeVisible();
  await expect.poll(() => purchasePages).toEqual(['1', '2']);

  await selectReport('Special receipts');
  await expect(
    page.getByRole('heading', { name: 'Special receipts', exact: true, level: 2 }),
  ).toBeVisible();
  await expect(page.getByText('SALE-SPECIAL')).toBeVisible();

  await selectReport('Customer report');
  await expect(page.getByRole('heading', { name: 'Customer sales' })).toBeVisible();
  await expect(page.getByText('SALE-CUSTOMER')).toBeVisible();
  await expect(page.getByText('Retail')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('enables verified scheduled summaries and shows delivery health', async ({ page }) => {
  await seedSession(page);
  const scheduleUpdates: Array<{ storeId: string; frequency: string; enabled: boolean }> = [];
  await mockReports(page, async (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname.endsWith('/portal/report-schedules')) {
      return {
        json: {
          scheduledReportsEnabled: true,
          recipientEmail: user.username,
          emailVerifiedAt: '2026-09-27T01:00:00.000Z',
          emailDeliveryConfigured: true,
          deliveryTime: '07:00 store time',
          weeklyDeliveryDay: 'Monday',
          schedules: [],
          deliveries: [
            {
              id: 'delivery-one',
              storeId: store.id,
              frequency: 'WEEKLY',
              periodFrom: '2026-09-14',
              periodTo: '2026-09-20',
              status: 'DELIVERED',
              attemptCount: 1,
              snapshotAgeHours: 26,
              dataQualityStatus: 'COMPLETE',
              warning: 'Warning: synchronized data is 26 hours old.',
              providerMessageId: 'resend-email-one',
              providerStatus: 'email.delivered',
              sentAt: '2026-09-21T23:00:00.000Z',
              deliveredAt: '2026-09-21T23:00:05.000Z',
              createdAt: '2026-09-21T23:00:00.000Z',
            },
          ],
        },
      };
    }
    if (request.method() === 'POST' && url.pathname.endsWith('/portal/report-schedules')) {
      const input = request.postDataJSON() as {
        storeId: string;
        frequency: string;
        enabled: boolean;
      };
      scheduleUpdates.push(input);
      return {
        json: {
          id: 'schedule-daily',
          ...input,
          nextRunAt: '2026-09-28T23:00:00.000Z',
          lastAttemptAt: null,
          lastSuccessAt: null,
        },
      };
    }
    return undefined;
  });

  await page.goto('/');
  await navigateToReport(page, 'Scheduled reports');

  await expect(page.getByRole('heading', { name: 'Summary schedule' })).toBeVisible();
  await expect(page.locator('.recipient-status').getByText(user.username)).toBeVisible();
  await expect(page.getByText('Verified', { exact: true })).toBeVisible();
  await expect(page.getByText('Warning: synchronized data is 26 hours old.')).toBeVisible();
  await expect(page.getByText('DELIVERED', { exact: true })).toBeVisible();
  await page.getByLabel('Daily delivery').check();
  await expect(page.getByText('Daily delivery enabled.')).toBeVisible();
  await expect
    .poll(() => scheduleUpdates)
    .toEqual([{ storeId: store.id, frequency: 'DAILY', enabled: true }]);
  await expect(page.getByText('Not scheduled', { exact: true })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('rotates an expired access token and resumes the report request', async ({ page }) => {
  await seedSession(page);

  let storeRequests = 0;
  let refreshRequests = 0;
  await mockReports(page, async (request) => {
    if (request.method() === 'GET' && request.url().endsWith('/portal/stores')) {
      storeRequests += 1;
      if (storeRequests === 1) return { status: 401, json: { message: 'Expired' } };
    }
    if (request.method() === 'POST' && request.url().endsWith('/portal/auth/web/refresh')) {
      refreshRequests += 1;
      return authResult(refreshRequests === 1 ? 'expired-access-token' : 'rotated-access-token');
    }
    return undefined;
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect.poll(() => refreshRequests).toBe(2);
  await expect.poll(() => storeRequests).toBe(2);
  expect(await page.evaluate(() => localStorage.getItem('posv2.portalAccessToken'))).toBeNull();
});

test('retries session restoration when another tab has just rotated the cookie', async ({
  page,
}) => {
  await seedSession(page);
  let refreshRequests = 0;
  await mockReports(page, async (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/portal/auth/web/refresh')) {
      refreshRequests += 1;
      if (refreshRequests === 1) {
        return {
          status: 409,
          json: {
            code: 'PORTAL_REFRESH_ALREADY_ROTATED',
            message: 'The browser session was refreshed by another request.',
          },
        };
      }
      return authResult('access-token-after-concurrent-refresh');
    }
    return undefined;
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect.poll(() => refreshRequests).toBe(2);
});

test('resets a password with an administrator-issued token', async ({ page }) => {
  let resetRequests = 0;
  await mockReports(page, async (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/portal/auth/reset-password')) {
      resetRequests += 1;
      return { status: 204 };
    }
    return undefined;
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await page.getByLabel('Password reset token').fill('one-time-reset-token');
  await page.getByLabel('Password', { exact: true }).fill('NewOwnerPassword123!');
  await page.getByRole('button', { name: 'Reset password' }).click();

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('Password updated. Sign in with your new password.')).toBeVisible();
  expect(resetRequests).toBe(1);
});

test('reviews sessions and signs out other browsers', async ({ page }) => {
  await seedSession(page);
  let revokeOthers = 0;
  await mockReports(page, async (request) => {
    if (request.method() === 'GET' && request.url().endsWith('/portal/auth/sessions')) {
      return {
        json: [
          portalSession('session-current', 'Microsoft Edge on Windows', true),
          portalSession('session-other', 'Google Chrome on Android', false),
        ],
      };
    }
    if (
      request.method() === 'POST' &&
      request.url().endsWith('/portal/auth/sessions/revoke-others')
    ) {
      revokeOthers += 1;
      return { status: 204 };
    }
    return undefined;
  });

  await page.goto('/');
  const openMenu = page.getByRole('button', { name: 'Open menu' });
  if ((page.viewportSize()?.width ?? 1_000) <= 980) {
    await expect(openMenu).toBeVisible();
    await openMenu.click();
  }
  await page.getByRole('button', { name: 'Security and sessions' }).click();

  await expect(page.getByRole('dialog', { name: 'Security and sessions' })).toBeVisible();
  await expect(page.getByText('Google Chrome on Android')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out others' }).click();
  await expect(page.getByText('Other browser sessions were signed out.')).toBeVisible();
  expect(revokeOthers).toBe(1);
});

test('changes password and returns to sign in because all sessions are revoked', async ({
  page,
}) => {
  await seedSession(page);
  await mockReports(page, async (request) => {
    if (request.method() === 'GET' && request.url().endsWith('/portal/auth/sessions')) {
      return { json: [portalSession('session-current', 'Microsoft Edge on Windows', true)] };
    }
    if (request.method() === 'POST' && request.url().endsWith('/portal/auth/change-password')) {
      return { status: 204 };
    }
    return undefined;
  });

  await page.goto('/');
  const openMenu = page.getByRole('button', { name: 'Open menu' });
  if ((page.viewportSize()?.width ?? 1_000) <= 980) {
    await expect(openMenu).toBeVisible();
    await openMenu.click();
  }
  await page.getByRole('button', { name: 'Security and sessions' }).click();
  await page.getByLabel('Current password').fill('CurrentOwnerPassword123!');
  await page.getByLabel('New password', { exact: true }).fill('ChangedOwnerPassword123!');
  await page.getByLabel('Confirm new password').fill('ChangedOwnerPassword123!');
  await page.getByRole('button', { name: 'Change password' }).click();

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('posv2.portalAccessToken'))).toBeNull();
});

async function navigateToReport(page: Page, name: string): Promise<void> {
  if ((page.viewportSize()?.width ?? 1_000) <= 980) {
    const openMenu = page.getByRole('button', { name: 'Open menu' });
    await expect(openMenu).toBeVisible();
    await openMenu.click();
    await expect(page.locator('.portal-shell')).toHaveClass(/menu-open/);
  }

  await page
    .getByRole('navigation', { name: 'Business reports' })
    .getByRole('button', { name, exact: true })
    .click();
}

async function mockReports(
  page: Page,
  override: (request: Request) => Promise<MockResponse | undefined>,
): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const custom = await override(request);
    if (custom) {
      await route.fulfill(response(custom));
      return;
    }
    const url = new URL(request.url());
    if (
      request.method() === 'POST' &&
      url.pathname.endsWith('/portal/auth/web/refresh') &&
      request.headers()['cookie']?.includes('posv2-portal-refresh=')
    ) {
      await route.fulfill(response(authResult()));
      return;
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/portal/stores')) {
      await route.fulfill(response({ json: [store] }));
      return;
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/overview')) {
      await route.fulfill(
        response({
          json: fresh({
            transactionCount: 4,
            salesWithRecordedCost: 4,
            salesMissingCostCount: 0,
            costCoveragePercent: 100,
            profitDataComplete: true,
            grossSales: 1250,
            discounts: 25,
            costOfGoods: 700,
            grossProfit: 550,
            customerBalance: 300,
            customersWithBalance: 2,
            inventoryItems: 12,
            criticalItems: 1,
            transfers: 3,
          }),
        }),
      );
      return;
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/sales-trends')) {
      const group = url.searchParams.get('group') ?? 'day';
      await route.fulfill(
        response({
          json: fresh({
            grouping: group,
            current: {
              from: '2026-09-01',
              to: '2026-09-30',
              grossSales: 1250,
              transactionCount: 4,
              averageSaleValue: 312.5,
              discounts: 25,
              costOfGoods: 700,
              grossProfit: 550,
              salesWithRecordedCost: 4,
              salesMissingCostCount: 0,
              costCoveragePercent: 100,
              profitDataComplete: true,
            },
            previous: {
              from: '2026-08-02',
              to: '2026-08-31',
              grossSales: 1000,
              transactionCount: 5,
              averageSaleValue: 200,
              discounts: 30,
              costOfGoods: 620,
              grossProfit: 380,
              salesWithRecordedCost: 5,
              salesMissingCostCount: 0,
              costCoveragePercent: 100,
              profitDataComplete: true,
            },
            points:
              group === 'week'
                ? [
                    trendPoint('2026-08-31', 'Aug 31', 450, 2),
                    trendPoint('2026-09-07', 'Sep 7', 800, 2),
                  ]
                : [
                    trendPoint('2026-09-10', 'Sep 10', 450, 2),
                    trendPoint('2026-09-18', 'Sep 18', 800, 2),
                  ],
          }),
        }),
      );
      return;
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/sales')) {
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      await route.fulfill(
        response({
          json: fresh({
            items: [
              {
                id: pageNumber,
                saleDate: '2026-09-30T10:00:00.000Z',
                reference: `SALE-PAGE-${pageNumber}`,
                customer: 'Test Customer',
                payment: 'CASH',
                status: 'COMPLETED',
                totalAmount: pageNumber * 100,
              },
            ],
            total: 26,
            page: pageNumber,
            pageSize: 25,
            filterOptions: { statuses: ['CANCELLED', 'COMPLETED'], payments: ['CASH'] },
          }),
        }),
      );
      return;
    }
    await route.fulfill(response({ status: 404, json: { message: 'Unmocked endpoint' } }));
  });
}

interface MockResponse {
  status?: number;
  json?: unknown;
}

function response(value: MockResponse) {
  return {
    status: value.status ?? 200,
    contentType: 'application/json',
    body: value.status === 204 ? undefined : JSON.stringify(value.json),
  };
}

function authResult(accessToken = 'access-token'): MockResponse {
  return { json: { accessToken, user } };
}

function fresh(data: unknown) {
  return {
    storeId: store.id,
    snapshotId: 'snapshot-one',
    schemaVersion: 27,
    snapshotCreatedAt: '2026-09-30T12:00:00.000Z',
    syncedAt: '2026-09-30T12:02:00.000Z',
    data,
  };
}

function trendPoint(key: string, label: string, grossSales: number, transactionCount: number) {
  return {
    key,
    label,
    grossSales,
    transactionCount,
    discounts: 0,
    costOfGoods: grossSales * 0.6,
    grossProfit: grossSales * 0.4,
    salesMissingCostCount: 0,
  };
}

function inventoryItem() {
  return {
    id: 1,
    code: 'LPG-11',
    brand: 'Brand A',
    name: '11 kg LPG',
    size: '11 kg',
    quantity: 3,
    cost: 100,
    sellingPrice: 120,
    refillPrice: 450,
    nonRefillPrice: 1200,
    category: 'LPG',
    alertLevel: 3,
    fillQuantity: 2,
    emptyQuantity: 1,
    warehouseFill: 4,
    warehouseEmpty: 0,
    lentQuantity: 0,
    stockStatus: 'CRITICAL',
    recordedValue: 600,
  };
}

async function seedSession(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: 'posv2-portal-refresh',
      value: 'test-refresh-token',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Strict',
    },
  ]);
}

function portalSession(id: string, deviceName: string, current: boolean) {
  return {
    id,
    deviceName,
    current,
    userAgent: 'Playwright',
    ipAddress: '127.0.0.1',
    createdAt: '2026-09-30T10:00:00.000Z',
    lastUsedAt: '2026-09-30T12:00:00.000Z',
    expiresAt: '2026-10-30T12:00:00.000Z',
  };
}

function accessibilityScan(page: Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
}

function formatAccessibilityViolations(
  violations: Array<{
    id: string;
    help: string;
    nodes: Array<{ target: unknown; failureSummary?: string }>;
  }>,
): string {
  return violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help}\n${violation.nodes
          .map((node) => `  ${String(node.target)}: ${node.failureSummary ?? 'failed'}`)
          .join('\n')}`,
    )
    .join('\n');
}
