import type { Request, Response } from 'express';

export function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  };
}

export type MockResponse = ReturnType<typeof createMockResponse>;

export function createMockRequest(overrides: Record<string, unknown> = {}): Request {
  return {
    userId: 'user-1',
    params: {},
    query: {},
    body: {},
    cookies: {},
    headers: {},
    file: undefined,
    originalUrl: '/test',
    method: 'GET',
    ...overrides,
  } as unknown as Request;
}

export function asResponse(res: MockResponse): Response {
  return res as unknown as Response;
}
