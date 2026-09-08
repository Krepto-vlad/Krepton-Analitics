import { flattenLegalDocumentLines } from '../legal.types';
import {
  getLegalPdfDocumentById,
  getLegalPdfPlainText,
  LEGAL_PDF_DOCUMENTS,
} from '../legalDocuments';

describe('legalDocuments', () => {
  it('finds documents by id and flattens their lines', () => {
    const privacy = getLegalPdfDocumentById('privacy-policy');
    expect(privacy?.title).toBe('Privacy Policy');
    expect(getLegalPdfDocumentById('missing')).toBeNull();
    expect(getLegalPdfPlainText(LEGAL_PDF_DOCUMENTS[0])).toEqual(
      flattenLegalDocumentLines(LEGAL_PDF_DOCUMENTS[0].content, LEGAL_PDF_DOCUMENTS[0].lastUpdated)
    );
    expect(getLegalPdfPlainText(LEGAL_PDF_DOCUMENTS[0]).length).toBeGreaterThan(0);
  });
});
