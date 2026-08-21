import type { AxiosError } from 'axios';
import { HTTP_UNAUTHORIZED_STATUS } from '../../constants';
import {
  isExpiredSessionUnauthorized,
  isPublicAuthRequestUrl,
  resolveAxiosRequestUrl,
} from '../unauthorizedSession';

function axiosUnauthorized(
  url: string,
  message: string | undefined
): AxiosError<{ error: string } | undefined> {
  return {
    config: { baseURL: 'http://localhost:3001', url },
    response: {
      status: HTTP_UNAUTHORIZED_STATUS,
      data: message ? { error: message } : undefined,
    },
  } as AxiosError<{ error: string } | undefined>;
}

describe('unauthorizedSession', () => {
  it('treats login and register 401s as public auth failures', () => {
    expect(isPublicAuthRequestUrl('http://localhost:3001/api/auth/login')).toBe(true);
    expect(isPublicAuthRequestUrl('http://localhost:3001/api/auth/register')).toBe(true);
    expect(isPublicAuthRequestUrl('http://localhost:3001/api/auth/google')).toBe(true);
  });

  it('treats authenticated API 401s as session expiry', () => {
    expect(isPublicAuthRequestUrl('http://localhost:3001/api/auth/me')).toBe(false);
    expect(isPublicAuthRequestUrl('http://localhost:3001/api/portfolio/positions')).toBe(false);
  });

  it('joins axios baseURL and path without dropping /api/auth', () => {
    const error = {
      config: {
        baseURL: 'http://localhost:3001/api/auth',
        url: '/login',
      },
    } as AxiosError;

    expect(resolveAxiosRequestUrl(error)).toBe('http://localhost:3001/api/auth/login');
  });

  it('expires the SPA session on JWT Unauthorized, not on a failed step-up password', () => {
    expect(isExpiredSessionUnauthorized(axiosUnauthorized('/api/auth/me', 'Unauthorized'))).toBe(
      true
    );
    expect(
      isExpiredSessionUnauthorized(axiosUnauthorized('/api/auth/password', 'Invalid password'))
    ).toBe(false);
    expect(
      isExpiredSessionUnauthorized(
        axiosUnauthorized('/api/auth/login', 'Invalid email or password')
      )
    ).toBe(false);
  });
});
