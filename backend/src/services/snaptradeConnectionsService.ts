import {
  SNAPTRADE_AUTHORIZATION_ID_PATTERN,
  SNAPTRADE_INVALID_CONNECTION_ID_MESSAGE,
  SNAPTRADE_NOT_CONNECTED_MESSAGE,
} from '../constants.js';
import { isSnaptradeConfigured } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { findSnaptradeUserByUserId } from '../repositories/snaptradeRepository.js';
import { requireSnaptradeClient, rethrowSnaptradeFailure } from './snaptradeClient.js';
import { deleteRemoteSnaptradeUserIfPresent } from './snaptradeUserLifecycle.js';
import type {
  BrokerageConnectionSummary,
  PortfolioExportBrokerageConnection,
  SnaptradeConnectionAccessType,
} from '../types/snaptrade.types.js';

export function parseSnaptradeAuthorizationId(raw: unknown): string {
  if (typeof raw !== 'string' || !SNAPTRADE_AUTHORIZATION_ID_PATTERN.test(raw.trim())) {
    throw new AppError(400, SNAPTRADE_INVALID_CONNECTION_ID_MESSAGE);
  }

  return raw.trim();
}

function asAuthorizationList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: unknown[] }).data;
  }

  return [];
}

function readIsoTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapAuthorizationToSummary(payload: unknown): BrokerageConnectionSummary | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : null;
  if (!id || !SNAPTRADE_AUTHORIZATION_ID_PATTERN.test(id)) {
    return null;
  }

  const brokerage =
    record.brokerage && typeof record.brokerage === 'object'
      ? (record.brokerage as Record<string, unknown>)
      : {};
  const brokerageSlug =
    typeof brokerage.slug === 'string' && brokerage.slug.length > 0 ? brokerage.slug : 'UNKNOWN';
  const brokerageName =
    (typeof brokerage.display_name === 'string' && brokerage.display_name) ||
    (typeof brokerage.name === 'string' && brokerage.name) ||
    (typeof record.name === 'string' && record.name) ||
    brokerageSlug;
  const logoUrl =
    typeof brokerage.aws_s3_square_logo_url === 'string' ? brokerage.aws_s3_square_logo_url : null;
  const accessType: SnaptradeConnectionAccessType = record.type === 'trade' ? 'trade' : 'read';

  return {
    id,
    brokerageName,
    brokerageSlug,
    logoUrl,
    connectedAt: readIsoTimestamp(record.created_date),
    disabled: record.disabled === true,
    accessType,
  };
}

async function fetchBrokerageAuthorizations(
  userId: string,
  userSecret: string
): Promise<BrokerageConnectionSummary[]> {
  const client = requireSnaptradeClient();

  try {
    const response = await client.connections.listBrokerageAuthorizations({
      userId,
      userSecret,
    });
    return asAuthorizationList(response.data)
      .map(mapAuthorizationToSummary)
      .filter((connection): connection is BrokerageConnectionSummary => connection !== null);
  } catch (error) {
    rethrowSnaptradeFailure(error);
  }
}

export async function listBrokerSyncConnections(
  userId: string
): Promise<BrokerageConnectionSummary[]> {
  const snaptradeUser = await findSnaptradeUserByUserId(userId);
  if (!snaptradeUser || !isSnaptradeConfigured) {
    return [];
  }

  return fetchBrokerageAuthorizations(snaptradeUser.snaptrade_user_id, snaptradeUser.user_secret);
}

export async function listBrokerSyncConnectionsForExport(
  userId: string
): Promise<PortfolioExportBrokerageConnection[]> {
  try {
    const connections = await listBrokerSyncConnections(userId);
    return connections.map((connection) => ({
      brokerageName: connection.brokerageName,
      brokerageSlug: connection.brokerageSlug,
      connectedAt: connection.connectedAt,
      disabled: connection.disabled,
      accessType: connection.accessType,
    }));
  } catch (error) {
    logger.warn({ err: error, userId }, 'SnapTrade connection list skipped for portfolio export');
    return [];
  }
}

export async function disconnectBrokerSyncConnection(
  userId: string,
  authorizationId: string
): Promise<void> {
  const snaptradeUser = await findSnaptradeUserByUserId(userId);
  if (!snaptradeUser) {
    throw new AppError(404, SNAPTRADE_NOT_CONNECTED_MESSAGE);
  }

  const client = requireSnaptradeClient();

  try {
    await client.connections.deleteConnection({
      connectionId: authorizationId,
      userId: snaptradeUser.snaptrade_user_id,
      userSecret: snaptradeUser.user_secret,
    });
  } catch (error) {
    rethrowSnaptradeFailure(error);
  }

  const remaining = await fetchBrokerageAuthorizations(
    snaptradeUser.snaptrade_user_id,
    snaptradeUser.user_secret
  );
  const stillConnected = remaining.filter((connection) => connection.id !== authorizationId);
  if (stillConnected.length === 0) {
    await deleteRemoteSnaptradeUserIfPresent(userId);
  }
}
