import { Injectable, OnDestroy } from '@angular/core';
import { PortalApiService } from '../api/portal-api.service';
import {
  type WebAnalyticsEvent,
  type WebAnalyticsFeature,
  type WebVitalName,
} from '../../domain/models/portal.models';

const flushIntervalMs = 10_000;
const maximumQueueSize = 50;

@Injectable({ providedIn: 'root' })
export class WebAnalyticsCollector implements OnDestroy {
  private enabled = false;
  private started = false;
  private flushing = false;
  private currentRoute = '/dashboard/overview';
  private currentStoreId = '';
  private maximumBatchSize = 25;
  private queue: WebAnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private observers: PerformanceObserver[] = [];
  private latestLcp: number | null = null;
  private latestInp: number | null = null;
  private cumulativeCls = 0;
  private readonly handlePageHide = () => {
    this.captureWebVitals();
    void this.flush();
  };
  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') this.handlePageHide();
  };

  constructor(private readonly api: PortalApiService) {}

  async start(route: string, storeId = ''): Promise<void> {
    this.currentRoute = normalizeRoute(route);
    this.currentStoreId = storeId;
    if (this.started) {
      this.pageView(route, storeId);
      return;
    }

    this.started = true;
    try {
      const configuration = await this.api.analyticsConfiguration();
      this.enabled = configuration.enabled;
      this.maximumBatchSize = Math.min(25, Math.max(1, configuration.maximumBatchSize || 25));
      if (!this.enabled) return;
      this.observeWebVitals();
      window.addEventListener('pagehide', this.handlePageHide);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.flushTimer = setInterval(() => void this.flush(), flushIntervalMs);
      this.pageView(this.currentRoute, this.currentStoreId);
    } catch {
      this.enabled = false;
    }
  }

  stop(): void {
    this.captureWebVitals();
    void this.flush();
    this.enabled = false;
    this.started = false;
    this.queue = [];
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    for (const observer of this.observers) observer.disconnect();
    this.observers = [];
    window.removeEventListener('pagehide', this.handlePageHide);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  pageView(route: string, storeId = ''): void {
    this.currentRoute = normalizeRoute(route);
    this.currentStoreId = storeId;
    this.enqueue('PAGE_VIEW');
  }

  feature(
    feature: WebAnalyticsFeature,
    route = this.currentRoute,
    storeId = this.currentStoreId,
  ): void {
    this.currentRoute = normalizeRoute(route);
    this.currentStoreId = storeId;
    this.enqueue('FEATURE_USED', { feature });
  }

  frontendError(): void {
    this.enqueue('FRONTEND_ERROR', { errorCode: 'UNHANDLED_FRONTEND_ERROR' });
  }

  private enqueue(type: WebAnalyticsEvent['type'], detail: Partial<WebAnalyticsEvent> = {}): void {
    if (!this.enabled) return;
    this.queue.push({
      eventId: crypto.randomUUID(),
      type,
      occurredAt: new Date().toISOString(),
      route: this.currentRoute,
      ...(this.currentStoreId ? { storeId: this.currentStoreId } : {}),
      appRelease: safeRelease(this.api.webRelease),
      ...detail,
    });
    if (this.queue.length > maximumQueueSize) {
      this.queue.splice(0, this.queue.length - maximumQueueSize);
    }
    if (this.queue.length >= this.maximumBatchSize) void this.flush();
  }

  private async flush(): Promise<void> {
    if (!this.enabled || this.flushing || !this.queue.length) return;
    const events = this.queue.splice(0, this.maximumBatchSize);
    this.flushing = true;
    try {
      const result = await this.api.submitAnalyticsEvents(events);
      if (!result.enabled) {
        this.enabled = false;
        this.queue = [];
      }
    } catch {
      this.queue = [...events, ...this.queue].slice(-maximumQueueSize);
    } finally {
      this.flushing = false;
    }
  }

  private observeWebVitals(): void {
    this.observe('largest-contentful-paint', (entries) => {
      this.latestLcp = entries.at(-1)?.startTime ?? this.latestLcp;
    });
    this.observe(
      'event',
      (entries) => {
        for (const entry of entries) {
          const timing = entry as PerformanceEntry & { duration?: number; interactionId?: number };
          if (!timing.interactionId) continue;
          this.latestInp = Math.max(this.latestInp ?? 0, timing.duration ?? 0);
        }
      },
      { durationThreshold: 40 },
    );
    this.observe('layout-shift', (entries) => {
      for (const entry of entries) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput) this.cumulativeCls += shift.value ?? 0;
      }
    });
  }

  private observe(
    type: string,
    callback: (entries: PerformanceEntry[]) => void,
    extra: Record<string, unknown> = {},
  ): void {
    if (!('PerformanceObserver' in window)) return;
    try {
      const observer = new PerformanceObserver((list) => callback(list.getEntries()));
      observer.observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
      this.observers.push(observer);
    } catch {
      /* Unsupported performance entry types are intentionally ignored. */
    }
  }

  private captureWebVitals(): void {
    if (this.latestLcp !== null) this.webVital('LCP', this.latestLcp);
    if (this.latestInp !== null) this.webVital('INP', this.latestInp);
    if (this.cumulativeCls > 0) this.webVital('CLS', this.cumulativeCls);
    this.latestLcp = null;
    this.latestInp = null;
    this.cumulativeCls = 0;
  }

  private webVital(metricName: WebVitalName, metricValue: number): void {
    this.enqueue('WEB_VITAL', {
      metricName,
      metricValue: Number(metricValue.toFixed(metricName === 'CLS' ? 4 : 0)),
    });
  }
}

function normalizeRoute(value: string): string {
  const normalized = value
    .toLowerCase()
    .split(/[?#]/, 1)[0]
    .replace(/[^a-z0-9/-]+/g, '-');
  const segments = normalized.split('/').filter(Boolean);
  return `/${segments.join('/')}`.slice(0, 120) || '/';
}

function safeRelease(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .slice(0, 64);
  return normalized || 'development';
}
