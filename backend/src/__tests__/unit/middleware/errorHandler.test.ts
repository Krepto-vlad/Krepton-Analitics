import multer from 'multer';
import type { NextFunction } from 'express';
import { AppError, errorHandler } from '../../../middleware/errorHandler.js';
import { asResponse, createMockRequest, createMockResponse } from '../controllers/httpMocks.js';

describe('errorHandler', () => {
  const next = jest.fn() as NextFunction;

  it('serializes AppError with the original status', () => {
    const res = createMockResponse();

    errorHandler(new AppError(404, 'Missing'), createMockRequest(), asResponse(res), next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Missing' });
  });

  it('maps a multer size limit to 400', () => {
    const res = createMockResponse();

    errorHandler(
      new multer.MulterError('LIMIT_FILE_SIZE'),
      createMockRequest(),
      asResponse(res),
      next
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'File exceeds the maximum upload size',
    });
  });

  it('maps other multer errors to 400 with the library message', () => {
    const res = createMockResponse();

    errorHandler(
      new multer.MulterError('LIMIT_UNEXPECTED_FILE'),
      createMockRequest(),
      asResponse(res),
      next
    );

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: expect.any(String),
    });
  });

  it('maps spreadsheet validation messages to 400', () => {
    const res = createMockResponse();

    errorHandler(
      new Error('Only .xlsx files are allowed'),
      createMockRequest(),
      asResponse(res),
      next
    );

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('hides unexpected errors behind 500', () => {
    const res = createMockResponse();

    errorHandler(new Error('boom'), createMockRequest(), asResponse(res), next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
  });
});
