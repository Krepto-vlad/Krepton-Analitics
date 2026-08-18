import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { LOG_EVENT, OPENAPI_SPEC_CONTENT_TYPE, OPENAPI_SPEC_FILENAME } from '../constants.js';

export async function getOpenApiDocument(_req: Request, res: Response): Promise<void> {
  const specPath = path.join(process.cwd(), OPENAPI_SPEC_FILENAME);

  try {
    const document = await readFile(specPath, 'utf8');
    res.status(200).type(OPENAPI_SPEC_CONTENT_TYPE).send(document);
  } catch (error) {
    logger.error(
      { event: LOG_EVENT.OPENAPI_SPEC_MISSING, specPath, err: error },
      'OpenAPI spec not found'
    );
    throw new AppError(500, 'API specification is unavailable');
  }
}
