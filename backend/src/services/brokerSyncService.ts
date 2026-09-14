import {
  SNAPTRADE_BROKER_ID,
  SNAPTRADE_CONFIRM_FILE_PREVIEW_MESSAGE,
  SNAPTRADE_CONNECTABLE_BROKERS,
  SNAPTRADE_CONNECTION_TYPE,
  SNAPTRADE_INVALID_BROKER_MESSAGE,
  SNAPTRADE_NO_ACCOUNTS_MESSAGE,
  SNAPTRADE_NOT_CONNECTED_MESSAGE,
  SNAPTRADE_PORTAL_REDIRECT_PATH,
  SNAPTRADE_PREVIEW_WARNING,
  SNAPTRADE_RETURN_CONNECTED,
  SNAPTRADE_RETURN_QUERY,
  SNAPTRADE_SKIP_EXISTING_TICKER_REASON,
  SNAPTRADE_UNAVAILABLE_MESSAGE,
  TRANSACTION_SOURCE_SNAPTRADE,
  type SnaptradeConnectableBrokerId,
} from '../constants.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { computePortfolioOwnerToken } from '../utils/portfolioOwnerToken.js';
import { getTodayIsoDate } from '../utils/displayCurrency.js';
import {
  findOrCreatePortfolioAccount,
  getAllTransactionsForDedup,
} from '../repositories/portfolioRepository.js';
import {
  findSnaptradeUserByUserId,
  upsertSnaptradeUser,
} from '../repositories/snaptradeRepository.js';
import { consumeImportPreview, saveImportPreview } from './importPreviewStore.js';
import { confirmSnaptradeHoldings } from './portfolioService.js';
import { requireSnaptradeClient, rethrowSnaptradeFailure } from './snaptradeClient.js';
import {
  mapSnaptradePositionsToTrades,
  type SnaptradePositionLike,
} from './snaptradeHoldingsMapper.js';
import type { ImportConfirmResponse, ImportPreviewResponse } from '../types/import.types.js';
import type { SnaptradeConnectResult } from '../types/snaptrade.types.js';

const CONNECTABLE_BROKER_IDS = new Set<string>(
  SNAPTRADE_CONNECTABLE_BROKERS.map((broker) => broker.id)
);

function readRedirectUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const redirectUrl = record.redirectURI ?? record.redirectUri ?? record.redirect_uri;
  return typeof redirectUrl === 'string' && redirectUrl.startsWith('https://') ? redirectUrl : null;
}

function readUserSecret(payload: unknown): { userId: string; userSecret: string } | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const userId = typeof record.userId === 'string' ? record.userId : null;
  const userSecret = typeof record.userSecret === 'string' ? record.userSecret : null;
  if (!userId || !userSecret) {
    return null;
  }

  return { userId, userSecret };
}

function asPositionList(payload: unknown): SnaptradePositionLike[] {
  if (Array.isArray(payload)) {
    return payload as SnaptradePositionLike[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.positions)) {
    return record.positions as SnaptradePositionLike[];
  }

  if (Array.isArray(record.results)) {
    return record.results as SnaptradePositionLike[];
  }

  return [];
}

function asAccountIds(payload: unknown): string[] {
  const accounts = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? ((payload as { data: unknown[] }).data ?? [])
      : [];

  return accounts
    .map((account) => {
      if (!account || typeof account !== 'object') {
        return null;
      }

      const id = (account as { id?: unknown }).id;
      return typeof id === 'string' && id.length > 0 ? id : null;
    })
    .filter((accountId): accountId is string => accountId !== null);
}

export function parseSnaptradeBroker(raw: unknown): SnaptradeConnectableBrokerId {
  if (typeof raw !== 'string' || !CONNECTABLE_BROKER_IDS.has(raw)) {
    throw new AppError(400, SNAPTRADE_INVALID_BROKER_MESSAGE);
  }

  return raw as SnaptradeConnectableBrokerId;
}

async function loadOrRegisterSnaptradeUser(userId: string): Promise<{
  snaptradeUserId: string;
  userSecret: string;
}> {
  const existing = await findSnaptradeUserByUserId(userId);
  if (existing) {
    return {
      snaptradeUserId: existing.snaptrade_user_id,
      userSecret: existing.user_secret,
    };
  }

  const client = requireSnaptradeClient();

  try {
    const registered = await client.authentication.registerSnapTradeUser({ userId });
    const credentials = readUserSecret(registered.data);
    if (!credentials) {
      throw new AppError(502, SNAPTRADE_UNAVAILABLE_MESSAGE);
    }

    await upsertSnaptradeUser(userId, credentials.userId, credentials.userSecret);
    return {
      snaptradeUserId: credentials.userId,
      userSecret: credentials.userSecret,
    };
  } catch (error) {
    rethrowSnaptradeFailure(error);
  }
}

function buildPortalReturnUrl(): string {
  return `${env.frontendUrl}${SNAPTRADE_PORTAL_REDIRECT_PATH}&${SNAPTRADE_RETURN_QUERY}=${SNAPTRADE_RETURN_CONNECTED}`;
}

export async function createBrokerSyncPortalUrl(
  userId: string,
  broker: SnaptradeConnectableBrokerId
): Promise<SnaptradeConnectResult> {
  const client = requireSnaptradeClient();
  const snaptradeUser = await loadOrRegisterSnaptradeUser(userId);

  try {
    const login = await client.authentication.loginSnapTradeUser({
      userId: snaptradeUser.snaptradeUserId,
      userSecret: snaptradeUser.userSecret,
      broker,
      connectionType: SNAPTRADE_CONNECTION_TYPE,
      customRedirect: buildPortalReturnUrl(),
      immediateRedirect: true,
      darkMode: true,
    });

    const redirectUrl = readRedirectUrl(login.data);
    if (!redirectUrl) {
      throw new AppError(502, SNAPTRADE_UNAVAILABLE_MESSAGE);
    }

    return { redirectUrl };
  } catch (error) {
    rethrowSnaptradeFailure(error);
  }
}

async function fetchConnectedPositions(
  userId: string,
  userSecret: string
): Promise<SnaptradePositionLike[]> {
  const client = requireSnaptradeClient();

  try {
    const accountsResponse = await client.accountInformation.listUserAccounts({
      userId,
      userSecret,
    });
    const accountIds = asAccountIds(accountsResponse.data);
    if (accountIds.length === 0) {
      throw new AppError(400, SNAPTRADE_NO_ACCOUNTS_MESSAGE);
    }

    const positions: SnaptradePositionLike[] = [];
    for (const accountId of accountIds) {
      const holdings = await client.accountInformation.getUserHoldings({
        accountId,
        userId,
        userSecret,
      });
      positions.push(...asPositionList(holdings.data));
    }

    return positions;
  } catch (error) {
    rethrowSnaptradeFailure(error);
  }
}

export async function previewBrokerSyncHoldings(userId: string): Promise<ImportPreviewResponse> {
  const snaptradeUser = await findSnaptradeUserByUserId(userId);
  if (!snaptradeUser) {
    throw new AppError(400, SNAPTRADE_NOT_CONNECTED_MESSAGE);
  }

  const snapshotDate = getTodayIsoDate();
  const mapped = mapSnaptradePositionsToTrades(
    await fetchConnectedPositions(snaptradeUser.snaptrade_user_id, snaptradeUser.user_secret),
    snapshotDate
  );

  const ownerToken = computePortfolioOwnerToken(userId);
  const portfolioId = await findOrCreatePortfolioAccount(ownerToken);
  const existingTransactions = await getAllTransactionsForDedup(portfolioId);
  const blockedTickers = new Set(
    existingTransactions
      .filter((transaction) => transaction.source !== TRANSACTION_SOURCE_SNAPTRADE)
      .map((transaction) => transaction.ticker)
  );

  const trades = [];
  const skipped = [...mapped.skipped];

  for (const trade of mapped.trades) {
    if (blockedTickers.has(trade.ticker)) {
      skipped.push({
        rowNumber: trade.rowNumber,
        sourceType: 'snaptrade',
        reason: SNAPTRADE_SKIP_EXISTING_TICKER_REASON,
      });
      continue;
    }

    trades.push(trade);
  }

  const importId = saveImportPreview(userId, SNAPTRADE_BROKER_ID, trades);

  return {
    importId,
    broker: SNAPTRADE_BROKER_ID,
    parserMode: 'broker_sync',
    confidence: 1,
    warning: SNAPTRADE_PREVIEW_WARNING,
    columnMapping: null,
    trades,
    skipped,
    summary: {
      totalRows: mapped.trades.length + mapped.skipped.length,
      tradeCount: trades.length,
      buyCount: trades.length,
      sellCount: 0,
      skippedCount: skipped.length,
      duplicateCount: skipped.filter((row) => row.reason === SNAPTRADE_SKIP_EXISTING_TICKER_REASON)
        .length,
    },
  };
}

export async function confirmBrokerSyncHoldings(
  userId: string,
  importId: string
): Promise<ImportConfirmResponse> {
  const preview = consumeImportPreview(importId, userId);
  if (!preview) {
    throw new AppError(404, 'Import preview expired or not found. Connect the broker again.');
  }

  if (preview.broker !== SNAPTRADE_BROKER_ID) {
    throw new AppError(400, SNAPTRADE_CONFIRM_FILE_PREVIEW_MESSAGE);
  }

  return confirmSnaptradeHoldings(userId, preview.trades);
}
