jest.mock('../../../config/env.js', () => ({
  env: {
    snaptradeClientId: '',
    snaptradeConsumerKey: '',
  },
  isSnaptradeConfigured: false,
}));

import { SNAPTRADE_NOT_CONFIGURED_MESSAGE } from '../../../constants.js';
import { getSnaptradeClient, requireSnaptradeClient } from '../../../services/snaptradeClient.js';

describe('snaptradeClient', () => {
  it('returns null when SnapTrade keys are not configured', () => {
    expect(getSnaptradeClient()).toBeNull();
  });

  it('throws 503 when a SnapTrade client is required', () => {
    expect.assertions(1);
    try {
      requireSnaptradeClient();
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 503,
        message: SNAPTRADE_NOT_CONFIGURED_MESSAGE,
      });
    }
  });
});
