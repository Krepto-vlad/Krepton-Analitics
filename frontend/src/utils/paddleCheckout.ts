import { ERROR_MESSAGES } from '../constants';

const PADDLE_SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN ?? '';
const PADDLE_ENV = import.meta.env.VITE_PADDLE_ENV === 'production' ? 'production' : 'sandbox';

export interface PaddleCheckoutEvent {
  name: string;
}

type PaddleCheckoutListener = (event: PaddleCheckoutEvent) => void;

interface PaddleCheckoutApi {
  Initialize: (options: {
    token: string;
    eventCallback?: (event: PaddleCheckoutEvent) => void;
  }) => void;
  Environment: { set: (environment: 'sandbox' | 'production') => void };
  Checkout: { open: (options: { transactionId: string }) => void };
}

declare global {
  interface Window {
    Paddle?: PaddleCheckoutApi;
  }
}

const paddleCheckoutListeners = new Set<PaddleCheckoutListener>();
let paddleInitializePromise: Promise<PaddleCheckoutApi> | null = null;

export function subscribeToPaddleCheckoutEvents(listener: PaddleCheckoutListener): () => void {
  paddleCheckoutListeners.add(listener);
  return () => {
    paddleCheckoutListeners.delete(listener);
  };
}

export function handlePaddleCheckoutEvent(event: PaddleCheckoutEvent): void {
  for (const listener of paddleCheckoutListeners) {
    listener(event);
  }
}

function loadPaddleScript(): Promise<void> {
  if (document.querySelector(`script[src="${PADDLE_SCRIPT_URL}"]`)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PADDLE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(ERROR_MESSAGES.BILLING_PADDLE_UNAVAILABLE));
    document.head.appendChild(script);
  });
}

export async function openPaddleCheckout(transactionId: string): Promise<void> {
  if (!PADDLE_CLIENT_TOKEN) {
    throw new Error(ERROR_MESSAGES.BILLING_PADDLE_UNAVAILABLE);
  }

  if (!paddleInitializePromise) {
    paddleInitializePromise = loadPaddleScript()
      .then(() => {
        const paddle = window.Paddle;
        if (!paddle) {
          throw new Error(ERROR_MESSAGES.BILLING_PADDLE_UNAVAILABLE);
        }

        // CDN Paddle.js rejects `environment` on Initialize; sandbox is set separately.
        if (PADDLE_ENV === 'sandbox') {
          paddle.Environment.set('sandbox');
        }

        paddle.Initialize({
          token: PADDLE_CLIENT_TOKEN,
          eventCallback: handlePaddleCheckoutEvent,
        });
        return paddle;
      })
      .catch((error: unknown) => {
        paddleInitializePromise = null;
        throw error;
      });
  }

  const paddle = await paddleInitializePromise;
  paddle.Checkout.open({ transactionId });
}
