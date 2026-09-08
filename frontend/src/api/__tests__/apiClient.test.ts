import axios from 'axios';
import { HTTP_UNAUTHORIZED_STATUS } from '../../constants';
import { assertSuccess, createApiClient } from '../apiClient';
import { ApiRequestError } from '../../utils/apiError';

jest.mock('../unauthorizedSession', () => ({
  isExpiredSessionUnauthorized: jest.fn(() => true),
  notifyUnauthorized: jest.fn(),
}));

describe('apiClient', () => {
  it('returns payload data on success', () => {
    expect(assertSuccess({ success: true, data: { ok: true } })).toEqual({ ok: true });
  });

  it('throws when the envelope is unsuccessful', () => {
    expect(() => assertSuccess({ success: false, error: 'nope' })).toThrow(ApiRequestError);
    expect(() => assertSuccess({ success: false, error: 'nope' })).toThrow('nope');
  });

  it('notifies on expired-session 401s through the interceptor', async () => {
    const { isExpiredSessionUnauthorized, notifyUnauthorized } = jest.requireMock(
      '../unauthorizedSession'
    ) as { isExpiredSessionUnauthorized: jest.Mock; notifyUnauthorized: jest.Mock };

    const handlers: Array<(error: unknown) => unknown> = [];
    jest.spyOn(axios, 'create').mockReturnValue({
      interceptors: {
        response: {
          use: (_success: unknown, onRejected: (error: unknown) => unknown) => {
            handlers.push(onRejected);
          },
        },
      },
    } as never);

    createApiClient('http://localhost:3001');
    const axiosError = {
      isAxiosError: true,
      response: { status: HTTP_UNAUTHORIZED_STATUS },
    };
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    await expect(handlers[0]?.(axiosError)).rejects.toBeInstanceOf(ApiRequestError);
    expect(isExpiredSessionUnauthorized).toHaveBeenCalled();
    expect(notifyUnauthorized).toHaveBeenCalled();
  });
});
