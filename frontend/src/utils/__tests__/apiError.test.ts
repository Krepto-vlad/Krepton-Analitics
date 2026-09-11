import axios, { type AxiosError } from 'axios';
import { ERROR_MESSAGES } from '../../constants';
import { ApiRequestError, getRejectedMessage, toApiRequestError } from '../apiError';

function asAxiosError(partial: Partial<AxiosError>): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Request failed',
    toJSON: () => ({}),
    ...partial,
  } as AxiosError;
}

describe('apiError', () => {
  it('returns an existing ApiRequestError unchanged', () => {
    const original = new ApiRequestError('Already wrapped', 400, 'client');
    expect(toApiRequestError(original)).toBe(original);
  });

  it('maps a network timeout to the timeout message', () => {
    const timeout = toApiRequestError(
      asAxiosError({ code: 'ECONNABORTED', response: undefined, message: 'timeout' })
    );

    expect(timeout.kind).toBe('timeout');
    expect(timeout.message).toBe(ERROR_MESSAGES.TIMEOUT);
  });

  it('maps a network error without a response', () => {
    const network = toApiRequestError(
      asAxiosError({ response: undefined, message: 'Network Error' })
    );
    expect(network.kind).toBe('network');
    expect(network.message).toBe(ERROR_MESSAGES.NETWORK);
  });

  it('keeps a safe 4xx backend message', () => {
    const error = toApiRequestError(
      asAxiosError({
        response: { status: 400, data: { error: 'Ticker is required' } } as AxiosError['response'],
      })
    );
    expect(error.message).toBe('Ticker is required');
    expect(error.kind).toBe('client');
  });

  it('maps 401 without a safe body to the unauthorized fallback', () => {
    const error = toApiRequestError(
      asAxiosError({
        response: { status: 401, data: {} } as AxiosError['response'],
      })
    );
    expect(error.message).toBe(ERROR_MESSAGES.UNAUTHORIZED);
  });

  it('rejects unsafe 500 messages', () => {
    const error = toApiRequestError(
      asAxiosError({
        response: {
          status: 500,
          data: { error: 'ECONNREFUSED postgres' },
        } as AxiosError['response'],
      })
    );
    expect(error.message).toBe(ERROR_MESSAGES.SERVER);
    expect(error.kind).toBe('server');
  });

  it('allows an explicit safe 500 AI message', () => {
    const error = toApiRequestError(
      asAxiosError({
        response: {
          status: 503,
          data: { error: 'AI service is temporarily busy. Please try again later.' },
        } as AxiosError['response'],
      })
    );
    expect(error.message).toBe('AI service is temporarily busy. Please try again later.');
  });

  it('keeps the Paddle-not-configured 503 message', () => {
    const error = toApiRequestError(
      asAxiosError({
        response: {
          status: 503,
          data: { error: ERROR_MESSAGES.BILLING_NOT_CONFIGURED },
        } as AxiosError['response'],
      })
    );
    expect(error.message).toBe(ERROR_MESSAGES.BILLING_NOT_CONFIGURED);
  });

  it('unwraps generic Error messages and unknown values', () => {
    expect(axios.isAxiosError(new Error('nope'))).toBe(false);
    expect(toApiRequestError(new Error('Boom')).message).toBe('Boom');
    expect(toApiRequestError(123, 'fallback').message).toBe('fallback');
    expect(getRejectedMessage('custom', 'fallback')).toBe('custom');
    expect(getRejectedMessage({}, 'fallback')).toBe('fallback');
  });
});
