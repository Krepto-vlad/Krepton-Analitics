import type { Request, Response, NextFunction } from 'express';
import { REQUEST_ID_HEADER_NAME } from '../../../constants.js';
import { requestIdMiddleware } from '../../../middleware/requestIdMiddleware.js';
import { getRequestId } from '../../../utils/requestContext.js';

function createMockResponse(): { res: Response; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  const res = {
    setHeader(name: string, value: string): void {
      headers[name] = value;
    },
  } as unknown as Response;
  return { res, headers };
}

describe('requestIdMiddleware', () => {
  it('generates a request id, echoes it on the response, and stores it in ALS', () => {
    const req = {
      header: (): undefined => undefined,
    } as unknown as Request;
    const { res, headers } = createMockResponse();
    let capturedFromAls: string | undefined;

    const next = jest.fn(() => {
      capturedFromAls = getRequestId();
    }) as NextFunction;

    requestIdMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.requestId).toEqual(expect.any(String));
    expect(req.requestId?.length).toBeGreaterThan(0);
    expect(headers[REQUEST_ID_HEADER_NAME]).toBe(req.requestId);
    expect(capturedFromAls).toBe(req.requestId);
  });

  it('reuses a valid incoming x-request-id', () => {
    const incomingId = 'client-trace-1';
    const req = {
      header: (name: string): string | undefined =>
        name.toLowerCase() === REQUEST_ID_HEADER_NAME ? incomingId : undefined,
    } as unknown as Request;
    const { res, headers } = createMockResponse();

    requestIdMiddleware(req, res, jest.fn() as NextFunction);

    expect(req.requestId).toBe(incomingId);
    expect(headers[REQUEST_ID_HEADER_NAME]).toBe(incomingId);
  });
});
