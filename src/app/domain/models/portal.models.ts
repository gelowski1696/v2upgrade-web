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
  client: {
    id: string;
    code: string;
    businessName: string;
    group: {
      id: string;
      code: string;
      name: string;
    } | null;
  };
  activeSnapshot: {
    schemaVersion: number;
    snapshotCreatedAt: string;
    activatedAt: string;
  } | null;
}

export interface ProvisionedPortalStore {
  id: string;
  clientId: string;
  code: string;
  name: string;
  timezone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

export interface PortalTenantUser {
  id: string;
  username: string;
  displayName: string;
  role: PortalRole;
  status: 'INVITED' | 'ACTIVE' | 'DISABLED';
  lastLoginAt: string | null;
  storeAccess: Array<{
    storeId: string;
    store: { code: string; name: string };
  }>;
}

export interface PortalInvitationResult {
  mode: 'INVITATION_CREATED';
  invitation: {
    id: string;
    username: string;
    displayName: string;
    role: PortalRole;
    storeIds: string[];
    expiresAt: string;
    activationToken: string;
  };
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

export type WebAnalyticsOperation =
  'SESSION_RESTORE' | 'LOAD_STORES' | 'LOAD_REPORT' | 'EXPORT_REPORT' | 'UPDATE_PREFERENCE';

export interface WebAnalyticsConfiguration {
  enabled: boolean;
  realUserMonitoringEnabled: boolean;
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
  operation?: WebAnalyticsOperation;
  errorCode?: string;
  httpStatus?: number;
  metricName?: WebVitalName;
  metricValue?: number;
  appRelease: string;
}
