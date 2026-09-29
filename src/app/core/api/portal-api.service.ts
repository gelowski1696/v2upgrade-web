import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AuthResult,
  FreshResponse,
  PortalSession,
  PortalStore,
  PortalUser,
} from '../../domain/models/portal.models';
import {
  ReportFilters,
  SalesTrendGrouping,
  ScheduledReportFrequency,
  ScheduledReportsData,
} from '../../domain/models/report.models';

@Injectable({ providedIn: 'root' })
export class PortalApiService {
  private readonly baseUrl = (isLocalDevelopmentHost()
    ? localStorage.getItem('posv2.portalApiUrl') || defaultPortalApiUrl()
    : defaultPortalApiUrl()
  ).replace(/\/$/, '');
  private accessToken = '';
  private refreshPromise: Promise<void> | null = null;
  user: PortalUser | null = null;
  webRelease = 'development';
  apiRelease = 'unavailable';

  constructor(private readonly http: HttpClient) {
    this.removeLegacySession();
    void this.loadReleaseInfo();
  }

  private async loadReleaseInfo(): Promise<void> {
    const [web, api] = await Promise.allSettled([
      firstValueFrom(this.http.get<{ release?: string }>('/build-info.json')),
      firstValueFrom(this.http.get<{ release?: string }>(`${this.baseUrl}/health`)),
    ]);
    if (web.status === 'fulfilled' && web.value.release) {
      this.webRelease = web.value.release;
    }
    if (api.status === 'fulfilled' && api.value.release) {
      this.apiRelease = api.value.release;
    }
  }

  async restoreSession(): Promise<boolean> {
    try {
      await this.refresh();
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  async login(username: string, password: string): Promise<PortalUser> {
    const result = await firstValueFrom(
      this.webPost<AuthResult>('/portal/auth/web/login', { username, password }),
    );
    this.saveSession(result);
    return result.user;
  }

  async activate(token: string, password: string): Promise<PortalUser> {
    const result = await firstValueFrom(
      this.webPost<AuthResult>('/portal/auth/web/activate', { token, password }),
    );
    this.saveSession(result);
    return result.user;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/portal/auth/reset-password`, {
        token,
        newPassword,
      }),
    );
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.authorized<void>('POST', '/portal/auth/change-password', {
      currentPassword,
      newPassword,
    });
    await this.logout();
  }

  sessions(): Promise<PortalSession[]> {
    return this.get<PortalSession[]>('/portal/auth/sessions');
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.authorized<void>('DELETE', `/portal/auth/sessions/${encodeURIComponent(sessionId)}`);
    if (sessionId === this.user?.sessionId) await this.logout();
  }

  async revokeOtherSessions(): Promise<void> {
    await this.authorized<void>('POST', '/portal/auth/sessions/revoke-others');
  }

  async logout(): Promise<void> {
    this.clearSession();
    try {
      await firstValueFrom(this.webPost<void>('/portal/auth/web/logout', {}));
    } catch {
      /* Local logout is complete. */
    }
  }

  stores(): Promise<PortalStore[]> {
    return this.get<PortalStore[]>('/portal/stores');
  }
  overview<T>(storeId: string, from: string, to: string): Promise<FreshResponse<T>> {
    return this.get(`/portal/stores/${storeId}/overview?from=${from}&to=${to}`);
  }
  dataQuality<T>(storeId: string, from: string, to: string, page = 1): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({
      from,
      to,
      page: String(page),
      pageSize: '25',
    });
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/data-quality?${query.toString()}`,
    );
  }
  businessOverview<T>(from: string, to: string): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({ from, to });
    return this.get(`/portal/business-overview?${query.toString()}`);
  }
  dismissAlert(
    alertId: string,
    from: string,
    to: string,
  ): Promise<{ alertId: string; dismissed: boolean }> {
    const query = new URLSearchParams({ from, to });
    return this.authorized(
      'POST',
      `/portal/alerts/${encodeURIComponent(alertId)}/dismiss?${query.toString()}`,
    );
  }
  reportSchedules(): Promise<ScheduledReportsData> {
    return this.get('/portal/report-schedules');
  }
  updateReportSchedule(
    storeId: string,
    frequency: ScheduledReportFrequency,
    enabled: boolean,
  ): Promise<ScheduledReportsData['schedules'][number]> {
    return this.authorized('POST', '/portal/report-schedules', {
      storeId,
      frequency,
      enabled,
    });
  }
  async requestReportEmailVerification(): Promise<void> {
    await this.authorized('POST', '/portal/report-schedules/email-verification/request');
  }
  async confirmReportEmailVerification(code: string): Promise<void> {
    await this.authorized('POST', '/portal/report-schedules/email-verification/confirm', { code });
  }
  reportCapabilities<T>(storeId: string): Promise<FreshResponse<T>> {
    return this.get(`/portal/stores/${encodeURIComponent(storeId)}/report-capabilities`);
  }
  inventorySummaryReport<T>(storeId: string, from: string, to: string): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({ from, to });
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/reports/inventory-summary?${query.toString()}`,
    );
  }
  financialReport<T>(storeId: string, from: string, to: string): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({ from, to });
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/reports/financial?${query.toString()}`,
    );
  }
  moduleReport<T>(
    storeId: string,
    report: string,
    from: string,
    to: string,
    page?: number,
    pageSize = 25,
  ): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({ from, to });
    if (page !== undefined) {
      query.set('page', String(page));
      query.set('pageSize', String(pageSize));
    }
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/reports/${encodeURIComponent(report)}?${query.toString()}`,
    );
  }
  restockMonitoring<T>(
    storeId: string,
    from: string,
    to: string,
    page = 1,
    search = '',
  ): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({
      from,
      to,
      page: String(page),
      pageSize: '25',
    });
    if (search.trim()) query.set('search', search.trim());
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/restock-monitoring?${query.toString()}`,
    );
  }
  productPerformance<T>(storeId: string, from: string, to: string): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({ from, to });
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/product-performance?${query.toString()}`,
    );
  }
  paymentAnalysis<T>(storeId: string, from: string, to: string): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({ from, to });
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/payment-analysis?${query.toString()}`,
    );
  }
  salesTrends<T>(
    storeId: string,
    from: string,
    to: string,
    group: SalesTrendGrouping,
  ): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({ from, to, group });
    return this.get(`/portal/stores/${storeId}/sales-trends?${query.toString()}`);
  }
  receivablesAging<T>(storeId: string, asOf: string): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({ to: asOf });
    return this.get(`/portal/stores/${storeId}/receivables-aging?${query.toString()}`);
  }
  customerBalanceHistory<T>(storeId: string, customerId: number): Promise<FreshResponse<T>> {
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/customers/${encodeURIComponent(String(customerId))}/balance-history`,
    );
  }
  customerInsights<T>(
    storeId: string,
    from: string,
    to: string,
    page = 1,
    filters: ReportFilters = {},
  ): Promise<FreshResponse<T>> {
    const query = this.reportQuery(from, to, filters);
    query.set('page', String(page));
    query.set('pageSize', '25');
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/customer-insights?${query.toString()}`,
    );
  }
  customerPurchaseHistory<T>(
    storeId: string,
    customerId: number,
    from: string,
    to: string,
    page = 1,
  ): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({
      from,
      to,
      page: String(page),
      pageSize: '25',
    });
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/customers/${encodeURIComponent(String(customerId))}/purchase-history?${query.toString()}`,
    );
  }
  cashFlow<T>(storeId: string, from: string, to: string): Promise<FreshResponse<T>> {
    return this.get(`/portal/stores/${storeId}/cash-flow?from=${from}&to=${to}`);
  }
  cashFlowTransactions<T>(
    storeId: string,
    source: string,
    from: string,
    to: string,
    page = 1,
  ): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({
      source,
      from,
      to,
      page: String(page),
      pageSize: '25',
    });
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/cash-flow/transactions?${query.toString()}`,
    );
  }
  inventoryHistory<T>(
    storeId: string,
    itemId: number,
    from: string,
    to: string,
    page = 1,
  ): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({
      from,
      to,
      page: String(page),
      pageSize: '25',
    });
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/inventory/${encodeURIComponent(String(itemId))}/history?${query.toString()}`,
    );
  }
  inventoryForecast<T>(
    storeId: string,
    from: string,
    to: string,
    page = 1,
    filters: ReportFilters = {},
  ): Promise<FreshResponse<T>> {
    const query = this.reportQuery(from, to, filters);
    query.set('page', String(page));
    query.set('pageSize', '25');
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/inventory-forecast?${query.toString()}`,
    );
  }
  profitability<T>(
    storeId: string,
    from: string,
    to: string,
    page = 1,
    filters: ReportFilters = {},
  ): Promise<FreshResponse<T>> {
    const query = this.reportQuery(from, to, filters);
    query.set('page', String(page));
    query.set('pageSize', '25');
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/profitability?${query.toString()}`,
    );
  }
  salesTarget<T>(storeId: string, month: string): Promise<FreshResponse<T>> {
    const query = new URLSearchParams({ month });
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/sales-targets?${query.toString()}`,
    );
  }
  updateSalesTarget<T>(
    storeId: string,
    month: string,
    salesTarget: number,
    recordedGrossProfitTarget: number,
  ): Promise<FreshResponse<T>> {
    return this.authorized('POST', `/portal/stores/${encodeURIComponent(storeId)}/sales-targets`, {
      month,
      salesTarget,
      recordedGrossProfitTarget,
    });
  }
  report<T>(
    storeId: string,
    report: string,
    from: string,
    to: string,
    page = 1,
    filters: ReportFilters = {},
  ): Promise<FreshResponse<T>> {
    const query = this.reportQuery(from, to, filters);
    query.set('page', String(page));
    query.set('pageSize', '25');
    return this.get(`/portal/stores/${storeId}/${report}?${query.toString()}`);
  }
  preferences<T>(): Promise<T> {
    return this.get('/portal/preferences');
  }
  activityLog<T>(from: string, to: string, page: number, action = '', storeId = ''): Promise<T> {
    const query = new URLSearchParams({
      from,
      to,
      page: String(page),
      pageSize: '25',
    });
    if (action) query.set('action', action);
    if (storeId) query.set('storeId', storeId);
    return this.get(`/portal/activity?${query.toString()}`);
  }
  updateOverviewPreferences<T>(overviewMetrics: string[]): Promise<T> {
    return this.authorized('PUT', '/portal/preferences/overview', { overviewMetrics });
  }
  saveView<T>(input: Record<string, unknown>): Promise<T> {
    return this.authorized('POST', '/portal/preferences/saved-views', input);
  }
  deleteSavedView<T>(viewId: string): Promise<T> {
    return this.authorized(
      'DELETE',
      `/portal/preferences/saved-views/${encodeURIComponent(viewId)}`,
    );
  }
  resetPreferences<T>(): Promise<T> {
    return this.authorized('DELETE', '/portal/preferences');
  }
  saleDetails<T>(storeId: string, saleId: number): Promise<FreshResponse<T>> {
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/sales/${encodeURIComponent(String(saleId))}`,
    );
  }
  transferDetails<T>(storeId: string, transferId: number): Promise<FreshResponse<T>> {
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/transfers/${encodeURIComponent(String(transferId))}`,
    );
  }
  exportReport<T>(
    storeId: string,
    report: string,
    from: string,
    to: string,
    filters: ReportFilters = {},
  ): Promise<FreshResponse<T>> {
    const query = this.reportQuery(from, to, filters);
    return this.get(
      `/portal/stores/${encodeURIComponent(storeId)}/exports/${encodeURIComponent(report)}?${query.toString()}`,
    );
  }

  private reportQuery(from: string, to: string, filters: ReportFilters): URLSearchParams {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    if (filters.search?.trim()) query.set('search', filters.search.trim());
    if (filters.status?.trim()) query.set('status', filters.status.trim());
    if (filters.payment?.trim()) query.set('payment', filters.payment.trim());
    if (filters.itemCode?.trim()) query.set('itemCode', filters.itemCode.trim());
    if (filters.category?.trim()) query.set('category', filters.category.trim());
    if (filters.stockStatus?.trim()) query.set('stockStatus', filters.stockStatus.trim());
    if (filters.forecastDays) query.set('forecastDays', String(filters.forecastDays));
    if (filters.risk?.trim()) query.set('risk', filters.risk.trim());
    if (filters.profitabilitySort) query.set('profitabilitySort', filters.profitabilitySort);
    if (filters.customerSort) query.set('customerSort', filters.customerSort);
    return query;
  }

  private async get<T>(path: string, retry = true): Promise<T> {
    return this.authorized<T>('GET', path, undefined, retry);
  }

  private async authorized<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    retry = true,
  ): Promise<T> {
    try {
      return await firstValueFrom(
        this.http.request<T>(method, `${this.baseUrl}${path}`, {
          body,
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }),
      );
    } catch (error) {
      if (retry && error instanceof HttpErrorResponse && error.status === 401) {
        try {
          await this.refreshOnce();
          return this.authorized<T>(method, path, body, false);
        } catch (refreshError) {
          this.clearSession();
          throw refreshError;
        }
      }
      throw error;
    }
  }

  private async refresh(concurrentRetries = 2): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.webPost<AuthResult>('/portal/auth/web/refresh', {}),
      );
      this.saveSession(result);
    } catch (error) {
      if (
        concurrentRetries > 0 &&
        error instanceof HttpErrorResponse &&
        error.status === 409
      ) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return this.refresh(concurrentRetries - 1);
      }
      throw error;
    }
  }
  private refreshOnce(): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.refresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }
  private saveSession(result: AuthResult): void {
    this.accessToken = result.accessToken;
    this.user = result.user;
  }
  private clearSession(): void {
    this.accessToken = '';
    this.user = null;
    this.removeLegacySession();
  }
  private removeLegacySession(): void {
    localStorage.removeItem('posv2.portalAccessToken');
    localStorage.removeItem('posv2.portalRefreshToken');
    localStorage.removeItem('posv2.portalUser');
  }
  private webPost<T>(path: string, body: unknown) {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, {
      withCredentials: true,
      headers: { 'X-POSV2-CSRF': '1' },
    });
  }
}

function defaultPortalApiUrl(): string {
  return isLocalDevelopmentHost() ? `http://${window.location.hostname}:3100/api/v1` : '/api/v1';
}

function isLocalDevelopmentHost(): boolean {
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
}
