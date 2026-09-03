import { randomUUID } from 'node:crypto';
import type { SupportedBrokerId } from '../constants.js';
import { IMPORT_PREVIEW_TTL_MS } from '../constants.js';
import type { NormalizedTrade } from '../types/import.types.js';

interface StoredImportPreview {
  userId: string;
  broker: SupportedBrokerId;
  trades: NormalizedTrade[];
  expiresAt: number;
}

const previewStore = new Map<string, StoredImportPreview>();

function purgeExpiredPreviews(): void {
  const now = Date.now();

  for (const [importId, preview] of previewStore.entries()) {
    if (preview.expiresAt <= now) {
      previewStore.delete(importId);
    }
  }
}

export function saveImportPreview(
  userId: string,
  broker: SupportedBrokerId,
  trades: NormalizedTrade[]
): string {
  purgeExpiredPreviews();

  const importId = randomUUID();
  previewStore.set(importId, {
    userId,
    broker,
    trades,
    expiresAt: Date.now() + IMPORT_PREVIEW_TTL_MS,
  });

  return importId;
}

export function consumeImportPreview(
  importId: string,
  userId: string
): { broker: SupportedBrokerId; trades: NormalizedTrade[] } | null {
  purgeExpiredPreviews();

  const preview = previewStore.get(importId);
  if (!preview) {
    return null;
  }

  previewStore.delete(importId);

  if (preview.userId !== userId || preview.expiresAt <= Date.now()) {
    return null;
  }

  return {
    broker: preview.broker,
    trades: preview.trades,
  };
}
