import { asyncHandler } from '../../../utils/asyncHandler.js';
import type { Request, Response, NextFunction } from 'express';

describe('asyncHandler', () => {
  it('should call next with error when async handler throws', async () => {
    const error = new Error('test error');
    const handler = asyncHandler(async () => {
      throw error;
    });

    const req = {} as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should not call next when handler resolves', async () => {
    const handler = asyncHandler(async (_req, res) => {
      (res as unknown as { json: jest.Mock }).json({ ok: true });
    });

    const req = {} as Request;
    const res = { json: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await handler(req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});
