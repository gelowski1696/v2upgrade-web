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
