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
  getUserPortfolioRebalancingAnalysis,
  updateUserPortfolioRebalancingStrategy,
  getRebalancingStrategyCatalog,
  deleteUserPortfolioData,
  exportUserPortfolioData,
} from '../services/portfolioService.js';
import { generateUserNewsSummary, getNewsSummaryQuota } from '../services/newsSummaryService.js';
import {
  generateAlignmentExplanation,
  getAlignmentExplanationQuota,
} from '../services/alignmentExplainService.js';
import { buildPortfolioExportXlsxBuffer } from '../utils/portfolioExportWorkbook.js';
import {
  DEFAULT_PORTFOLIO_EXPORT_FORMAT,
  PORTFOLIO_EXPORT_FORMATS,
  PORTFOLIO_EXPORT_XLSX_CONTENT_TYPE,
  type PortfolioExportFormat,
} from '../constants.js';
import { AppError } from '../middleware/errorHandler.js';

function parsePortfolioExportFormat(rawFormat: unknown): PortfolioExportFormat {
  if (rawFormat === undefined || rawFormat === null || rawFormat === '') {
    return DEFAULT_PORTFOLIO_EXPORT_FORMAT;
  }

  if (
    typeof rawFormat === 'string' &&
    (PORTFOLIO_EXPORT_FORMATS as readonly string[]).includes(rawFormat)
  ) {
    return rawFormat as PortfolioExportFormat;
  }

  throw new AppError(400, `format must be one of: ${PORTFOLIO_EXPORT_FORMATS.join(', ')}`);
}

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

export async function getNewsSummaryQuotaHandler(req: Request, res: Response): Promise<void> {
  const quota = await getNewsSummaryQuota(requireUserId(req));
  res.json({ success: true, data: quota });
}

export async function postNewsSummaryHandler(req: Request, res: Response): Promise<void> {
  const summary = await generateUserNewsSummary(requireUserId(req), req.body);
  res.json({ success: true, data: summary });
}

export async function getAlignmentExplanationQuotaHandler(
  req: Request,
  res: Response
): Promise<void> {
  const quota = await getAlignmentExplanationQuota(requireUserId(req));
  res.json({ success: true, data: quota });
}

export async function postAlignmentExplanationHandler(req: Request, res: Response): Promise<void> {
  const { displayCurrency } = req.query;
  const explanation = await generateAlignmentExplanation(requireUserId(req), displayCurrency);
  res.json({ success: true, data: explanation });
}

export async function getPortfolioDividendsHandler(req: Request, res: Response): Promise<void> {
  const { displayCurrency } = req.query;
  const calendar = await getUserPortfolioDividendCalendar(requireUserId(req), displayCurrency);
  res.json({ success: true, data: calendar });
}

export async function getPortfolioRebalancingHandler(req: Request, res: Response): Promise<void> {
  const { displayCurrency } = req.query;
  const analysis = await getUserPortfolioRebalancingAnalysis(requireUserId(req), displayCurrency);
  res.json({ success: true, data: analysis });
}

export async function getRebalancingStrategiesHandler(_req: Request, res: Response): Promise<void> {
  const strategies = getRebalancingStrategyCatalog();
  res.json({ success: true, data: strategies });
}

export async function updatePortfolioRebalancingHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { displayCurrency } = req.query;
  const analysis = await updateUserPortfolioRebalancingStrategy(
    requireUserId(req),
    req.body,
    displayCurrency
  );
  res.json({ success: true, data: analysis });
}

export async function getBuyTransactions(req: Request, res: Response): Promise<void> {
  const { ticker } = req.params as { ticker: string };
  const buys = await getBuyTransactionsForTicker(requireUserId(req), ticker);
  res.json({ success: true, data: buys });
}

export async function deletePortfolioDataHandler(req: Request, res: Response): Promise<void> {
  const result = await deleteUserPortfolioData(requireUserId(req), req.body?.confirm);
  res.json({ success: true, data: result });
}

export async function exportPortfolioDataHandler(req: Request, res: Response): Promise<void> {
  const exportFormat = parsePortfolioExportFormat(req.body?.format);
  const exportPayload = await exportUserPortfolioData(requireUserId(req), req.body?.password);
  const dateStamp = exportPayload.exportedAt.slice(0, 10);

  res.setHeader('Cache-Control', 'no-store');

  if (exportFormat === 'xlsx') {
    const workbookBuffer = buildPortfolioExportXlsxBuffer(exportPayload);
    res.json({
      success: true,
      data: {
        format: 'xlsx' as const,
        fileName: `krepton-portfolio-export-${dateStamp}.xlsx`,
        contentType: PORTFOLIO_EXPORT_XLSX_CONTENT_TYPE,
        contentBase64: workbookBuffer.toString('base64'),
      },
    });
    return;
  }

  res.json({ success: true, data: exportPayload });
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
