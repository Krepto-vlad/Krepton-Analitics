import type { Request, Response } from 'express';
import {
  getUserWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
} from '../services/watchlistService.js';
import { AppError } from '../middleware/errorHandler.js';

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'Unauthorized');
  }
  return req.userId;
}

export async function getWatchlist(req: Request, res: Response): Promise<void> {
  const items = await getUserWatchlist(requireUserId(req));
  res.json({ success: true, data: items });
}

export async function postWatchlistItem(req: Request, res: Response): Promise<void> {
  const item = await addWatchlistItem(requireUserId(req), req.body);
  res.status(201).json({ success: true, data: item });
}

export async function deleteWatchlistItemHandler(req: Request, res: Response): Promise<void> {
  const { itemId } = req.params as { itemId: string };
  await removeWatchlistItem(requireUserId(req), itemId);
  res.status(204).send();
}
