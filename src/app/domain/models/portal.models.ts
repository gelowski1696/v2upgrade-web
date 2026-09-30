export type PortalRole = 'OWNER' | 'MANAGER' | 'VIEWER';

export interface PortalUser {
  id: string;
  sessionId: string;
  clientId: string;
  username: string;
  displayName: string;
  role: PortalRole;
  storeIds: string[];
}

export interface PortalStore {
  id: string;
  code: string;
  name: string;
  timezone: string;
  activeSnapshot: {
    schemaVersion: number;
    snapshotCreatedAt: string;
    activatedAt: string;
  } | null;
}

export interface FreshResponse<T> {
  storeId: string;
  snapshotId: string;
  schemaVersion: number;
  snapshotCreatedAt: string;
  syncedAt: string;
  data: T;
}

export interface PortalSession {
  id: string;
  deviceName: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export interface AuthResult {
  accessToken: string;
  user: PortalUser;
}

export type WebAnalyticsEventType =
  'PAGE_VIEW' | 'FEATURE_USED' | 'FRONTEND_ERROR' | 'API_FAILURE' | 'WEB_VITAL';

export type WebAnalyticsFeature =
  | 'REPORT_OPENED'
  | 'REPORT_EXPORTED'
  | 'STORE_CHANGED'
  | 'DATE_RANGE_CHANGED'
  | 'FILTER_APPLIED'
  | 'SAVED_VIEW_USED';

export type WebVitalName = 'LCP' | 'INP' | 'CLS';

export interface WebAnalyticsConfiguration {
  enabled: boolean;
  maximumBatchSize: number;
  retentionDays: number;
}

export interface WebAnalyticsEvent {
  eventId: string;
  type: WebAnalyticsEventType;
  occurredAt: string;
  route: string;
  storeId?: string;
  feature?: WebAnalyticsFeature;
  errorCode?: string;
  metricName?: WebVitalName;
  metricValue?: number;
  appRelease: string;
}
