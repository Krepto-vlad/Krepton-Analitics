jest.mock('../../../config/env.js', () => ({
  env: {
    paddleApiKey: '',
    paddleWebhookSecret: '',
    paddleEnv: 'sandbox',
    paddlePlusMonthlyPriceId: 'pri_month',
    paddlePlusAnnualPriceId: 'pri_year',
  },
  isPaddleBillingConfigured: false,
}));

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
    expect(getPaddlePriceIdForInterval('month')).toBe('pri_month');
    expect(getPaddlePriceIdForInterval('year')).toBe('pri_year');
  });
});
