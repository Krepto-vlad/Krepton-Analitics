import type { Request, Response } from 'express';
import {
  getUserPositions,
  getUserPositionsPaginated,
  getUserTransactionsPaginated,
  getPortfolioEquityHistory,
  getInvestmentSummary,
  getBuyTransactionsForTicker,
  createPosition,
  editPosition,
  removePosition,
  removeBuyTransaction,
  closePosition,
  getUserPortfolioNews,
  getUserPortfolioDividendCalendar,
} from '../services/portfolioService.js';
import { AppError } from '../middleware/errorHandler.js';

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new AppError(401, 'Unauthorized');
  }
  return req.userId;
}

export async function getPositions(req: Request, res: Response): Promise<void> {
  const { limit, offset, displayCurrency } = req.query;

  if (limit !== undefined || offset !== undefined) {
    const paginated = await getUserPositionsPaginated(
      requireUserId(req),
      limit,
      offset,
      displayCurrency
    );
    res.json({ success: true, data: paginated });
    return;
  }

  const positions = await getUserPositions(requireUserId(req), displayCurrency);
  res.json({ success: true, data: positions });
}

export async function getTransactions(req: Request, res: Response): Promise<void> {
  const { limit, offset, displayCurrency } = req.query;
  const paginated = await getUserTransactionsPaginated(
    requireUserId(req),
    limit,
    offset,
    displayCurrency
  );
  res.json({ success: true, data: paginated });
}

export async function getEquityHistory(req: Request, res: Response): Promise<void> {
  const { displayCurrency } = req.query;
  const equityHistory = await getPortfolioEquityHistory(requireUserId(req), displayCurrency);
  res.json({ success: true, data: equityHistory });
}

export async function getInvestmentSummaryHandler(req: Request, res: Response): Promise<void> {
  const { displayCurrency } = req.query;
  const summary = await getInvestmentSummary(requireUserId(req), displayCurrency);
  res.json({ success: true, data: summary });
}

export async function getPortfolioNewsHandler(req: Request, res: Response): Promise<void> {
  const news = await getUserPortfolioNews(requireUserId(req));
  res.json({ success: true, data: news });
}

export async function getPortfolioDividendsHandler(req: Request, res: Response): Promise<void> {
  const { displayCurrency } = req.query;
  const calendar = await getUserPortfolioDividendCalendar(requireUserId(req), displayCurrency);
  res.json({ success: true, data: calendar });
}

export async function getBuyTransactions(req: Request, res: Response): Promise<void> {
  const { ticker } = req.params as { ticker: string };
  const buys = await getBuyTransactionsForTicker(requireUserId(req), ticker);
  res.json({ success: true, data: buys });
}

export async function postPosition(req: Request, res: Response): Promise<void> {
  const position = await createPosition(requireUserId(req), req.body);
  res.status(201).json({ success: true, data: position });
}

export async function patchPosition(req: Request, res: Response): Promise<void> {
  const { positionId } = req.params as { positionId: string };
  const position = await editPosition(requireUserId(req), positionId, req.body);
  res.json({ success: true, data: position });
}

export async function deletePosition(req: Request, res: Response): Promise<void> {
  const { positionId } = req.params as { positionId: string };
  await removePosition(requireUserId(req), positionId);
  res.status(204).send();
}

export async function deleteTransaction(req: Request, res: Response): Promise<void> {
  const { transactionId } = req.params as { transactionId: string };
  await removeBuyTransaction(requireUserId(req), transactionId);
  res.status(204).send();
}

export async function postClosePosition(req: Request, res: Response): Promise<void> {
  const { positionId } = req.params as { positionId: string };
  const updatedPosition = await closePosition(requireUserId(req), positionId, req.body);

  if (updatedPosition === null) {
    // Full close — position deleted
    res.status(200).json({ success: true, data: null, closed: true });
  } else {
    // Partial close — position updated with reduced shares
    res.status(200).json({ success: true, data: updatedPosition, closed: false });
  }
}
