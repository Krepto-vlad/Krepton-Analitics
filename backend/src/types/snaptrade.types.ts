import type { SnaptradeConnectableBrokerId } from '../constants.js';
import type { ImportConfirmResponse, ImportPreviewResponse } from './import.types.js';

export interface SnaptradeUserRow {
  user_id: string;
  snaptrade_user_id: string;
  user_secret: string;
  created_at: Date;
  updated_at: Date;
}

export interface SnaptradeConnectResult {
  redirectUrl: string;
}

export interface SnaptradeConnectDto {
  broker: SnaptradeConnectableBrokerId;
}

export type SnaptradeConnectionAccessType = 'read' | 'trade';

export interface BrokerageConnectionSummary {
  id: string;
  brokerageName: string;
  brokerageSlug: string;
  logoUrl: string | null;
  connectedAt: string | null;
  disabled: boolean;
  accessType: SnaptradeConnectionAccessType;
}

export interface PortfolioExportBrokerageConnection {
  brokerageName: string;
  brokerageSlug: string;
  connectedAt: string | null;
  disabled: boolean;
  accessType: SnaptradeConnectionAccessType;
}

export type SnaptradePreviewResponse = ImportPreviewResponse;
export type SnaptradeConfirmResponse = ImportConfirmResponse;
