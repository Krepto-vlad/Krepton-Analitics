import { AppError } from '../../middleware/errorHandler.js';
import { SUPPORTED_BROKER_IDS, type SupportedBrokerId } from '../../constants.js';
import type { SafeSheetData } from '../../utils/excelSafeReader.js';
import { parseRevolutStatement, type RevolutParseResult } from './revolutParser.js';

export function assertSupportedBrokerId(value: string): SupportedBrokerId {
  const normalized = value.trim().toUpperCase();

  if (!SUPPORTED_BROKER_IDS.includes(normalized as SupportedBrokerId)) {
    throw new AppError(
      400,
      `Unsupported broker. Supported brokers: ${SUPPORTED_BROKER_IDS.join(', ')}`
    );
  }

  return normalized as SupportedBrokerId;
}

export function parseBrokerStatement(
  brokerId: SupportedBrokerId,
  sheetData: SafeSheetData
): RevolutParseResult {
  switch (brokerId) {
    case 'REVOLUT':
      return parseRevolutStatement(sheetData);
    default:
      throw new AppError(400, 'Unsupported broker parser');
  }
}
