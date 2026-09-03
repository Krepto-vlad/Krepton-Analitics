import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getOpenApiDocument } from '../controllers/docsController.js';

const router = Router();

router.get('/openapi.yaml', asyncHandler(getOpenApiDocument));

export default router;
