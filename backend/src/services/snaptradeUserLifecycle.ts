import { logger } from '../utils/logger.js';
import {
  deleteSnaptradeUserByUserId,
  findSnaptradeUserByUserId,
} from '../repositories/snaptradeRepository.js';
import { getSnaptradeClient } from './snaptradeClient.js';

/**
 * Best-effort remote SnapTrade user delete, then drop local credentials.
 * Account erasure must not fail if SnapTrade is down.
 */
export async function deleteRemoteSnaptradeUserIfPresent(userId: string): Promise<void> {
  const snaptradeUser = await findSnaptradeUserByUserId(userId);
  if (!snaptradeUser) {
    return;
  }

  const client = getSnaptradeClient();
  if (client) {
    try {
      await client.authentication.deleteSnapTradeUser({
        userId: snaptradeUser.snaptrade_user_id,
      });
    } catch (error) {
      logger.warn({ err: error, userId }, 'SnapTrade remote user delete failed');
    }
  }

  await deleteSnaptradeUserByUserId(userId);
}
