jest.mock('../../../services/billingCheckoutService.js', () => ({
  createPlusCheckout: jest.fn(),
  createCustomerPortalSession: jest.fn(),
}));

jest.mock('../../../services/paddleWebhookService.js', () => ({
  verifyAndProcessPaddleWebhook: jest.fn(),
}));

import {
  createCustomerPortalSession,
  createPlusCheckout,
} from '../../../services/billingCheckoutService.js';
import { verifyAndProcessPaddleWebhook } from '../../../services/paddleWebhookService.js';
import {
  postBillingCheckout,
  postBillingPortal,
  postPaddleWebhook,
} from '../../../controllers/billingController.js';
import { asResponse, createMockRequest, createMockResponse } from './httpMocks.js';

const mockedCheckout = createPlusCheckout as jest.MockedFunction<typeof createPlusCheckout>;
const mockedPortal = createCustomerPortalSession as jest.MockedFunction<
  typeof createCustomerPortalSession
>;
const mockedWebhook = verifyAndProcessPaddleWebhook as jest.MockedFunction<
  typeof verifyAndProcessPaddleWebhook
>;

describe('billingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a checkout transaction for the signed-in user', async () => {
    mockedCheckout.mockResolvedValue({ transactionId: 'txn_1' });
    const res = createMockResponse();

    await postBillingCheckout(createMockRequest({ body: { interval: 'month' } }), asResponse(res));

    expect(mockedCheckout).toHaveBeenCalledWith('user-1', 'month');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { transactionId: 'txn_1' },
    });
  });

  it('opens a customer portal session', async () => {
    mockedPortal.mockResolvedValue({ url: 'https://paddle.example/portal' });
    const res = createMockResponse();

    await postBillingPortal(createMockRequest(), asResponse(res));

    expect(mockedPortal).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { url: 'https://paddle.example/portal' },
    });
  });

  it('rejects checkout without an authenticated user', async () => {
    await expect(
      postBillingCheckout(
        createMockRequest({ userId: undefined }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects a webhook without a Paddle signature', async () => {
    await expect(
      postPaddleWebhook(
        createMockRequest({ headers: {}, body: Buffer.from('{}') }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('verifies a signed webhook body', async () => {
    mockedWebhook.mockResolvedValue(undefined);
    const res = createMockResponse();

    await postPaddleWebhook(
      createMockRequest({
        headers: { 'paddle-signature': 'ts=1;h1=abc' },
        body: Buffer.from('{"event_type":"subscription.updated"}'),
      }),
      asResponse(res)
    );

    expect(mockedWebhook).toHaveBeenCalledWith(
      '{"event_type":"subscription.updated"}',
      'ts=1;h1=abc'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects an empty signed webhook body', async () => {
    await expect(
      postPaddleWebhook(
        createMockRequest({
          headers: { 'paddle-signature': 'ts=1;h1=abc' },
          body: Buffer.from(''),
        }),
        asResponse(createMockResponse())
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
