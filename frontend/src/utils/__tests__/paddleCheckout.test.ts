import { ERROR_MESSAGES } from '../../constants';
import {
  handlePaddleCheckoutEvent,
  openPaddleCheckout,
  subscribeToPaddleCheckoutEvents,
} from '../paddleCheckout';

describe('paddleCheckout', () => {
  it('throws when the Paddle client token is missing', async () => {
    await expect(openPaddleCheckout('txn_1')).rejects.toThrow(
      ERROR_MESSAGES.BILLING_PADDLE_UNAVAILABLE
    );
  });

  it('notifies subscribers of overlay events', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToPaddleCheckoutEvents(listener);

    handlePaddleCheckoutEvent({ name: 'checkout.completed' });
    expect(listener).toHaveBeenCalledWith({ name: 'checkout.completed' });

    unsubscribe();
    handlePaddleCheckoutEvent({ name: 'checkout.closed' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
