import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler<P = Record<string, string>> = (
  req: Request<P>,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function asyncHandler<P = Record<string, string>>(
  handler: AsyncRequestHandler<P>
): RequestHandler {
  return (req, res, next) => {
    (handler as AsyncRequestHandler)(req, res, next).catch(next);
  };
}
