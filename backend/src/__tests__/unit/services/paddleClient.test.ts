import { BILLING_NOT_CONFIGURED_MESSAGE } from '../../../constants.js';
import {
  getPaddleClient,
  getPaddlePriceIdForInterval,
  requirePaddleClient,
} from '../../../services/paddleClient.js';

describe('paddleClient', () => {
  it('returns null when Paddle keys are not configured', () => {
    expect(getPaddleClient()).toBeNull();
  });

  it('throws 503 when checkout requires a missing Paddle client', () => {
    expect.assertions(1);
    try {
      requirePaddleClient();
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 503,
        message: BILLING_NOT_CONFIGURED_MESSAGE,
      });
    }
  });

  it('maps checkout intervals to the configured price ids', () => {
    expect(getPaddlePriceIdForInterval('month')).toBe('');
    expect(getPaddlePriceIdForInterval('year')).toBe('');
  });
});
