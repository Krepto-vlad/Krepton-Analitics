import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { REQUEST_ID_HEADER_NAME, REQUEST_ID_PATTERN } from '../constants.js';
import { runWithRequestId } from '../utils/requestContext.js';

function resolveRequestId(headerValue: string | undefined): string {
  if (typeof headerValue === 'string' && REQUEST_ID_PATTERN.test(headerValue)) {
    return headerValue;
  }

  return randomUUID();
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = resolveRequestId(req.header(REQUEST_ID_HEADER_NAME));
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER_NAME, requestId);
  runWithRequestId(requestId, () => {
    next();
  });
}
